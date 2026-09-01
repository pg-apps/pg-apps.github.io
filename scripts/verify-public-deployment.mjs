import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(await readFile(path.join(root, "data/public-apps.json"), "utf8"));
const statuses = JSON.parse(await readFile(path.join(root, "data/app-store-status.json"), "utf8"));

if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.apps)) throw new Error("Invalid public app catalog");
if (statuses.schemaVersion !== 1 || typeof statuses.apps !== "object" || statuses.apps === null) throw new Error("Invalid App Store status file");

const slugs = new Set();
for (const app of catalog.apps) {
  if (!app?.slug || !app?.name || !app?.bundleId || !app?.icon || slugs.has(app.slug)) throw new Error("Invalid or duplicate public app entry");
  if (!app.bundleId.startsWith("com.pg-apps.")) throw new Error(`Non-canonical public bundle ID for ${app.slug}`);
  slugs.add(app.slug);
}

const expected = [
  "index.html", "404.html", "README.md", ".nojekyll", "assets/styles.css", "assets/site.js",
  "impressum/index.html", "datenschutz/index.html", "data/public-apps.json", "data/app-store-status.json",
  "scripts/update-app-store-status.mjs", "scripts/verify-public-deployment.mjs",
  ...catalog.apps.flatMap((app) => [`apps/${app.slug}/index.html`, `assets/app-icons/${app.icon}`]),
];
for (const file of expected) await access(path.join(root, file));

const appDirectory = path.join(root, "apps");
let emittedSlugs = [];
try {
  emittedSlugs = (await readdir(appDirectory, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
for (const slug of emittedSlugs) if (!slugs.has(slug)) throw new Error(`Unexpected hidden app page: ${slug}`);

for (const app of catalog.apps) {
  const entry = statuses.apps[app.slug];
  if (!entry || entry.bundleId !== app.bundleId) throw new Error(`Missing or mismatched status for ${app.slug}`);
}
for (const slug of Object.keys(statuses.apps)) if (!slugs.has(slug)) throw new Error(`Status file exposes a non-public app: ${slug}`);

const home = await readFile(path.join(root, "index.html"), "utf8");
for (const app of catalog.apps) if (!home.includes(`href="apps/${app.slug}/"`)) throw new Error(`Homepage link missing for ${app.slug}`);

console.log(`Verified sanitized public deployment with ${catalog.apps.length} public apps.`);
