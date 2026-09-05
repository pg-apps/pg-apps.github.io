import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(await readFile(path.join(root, "data/public-apps.json"), "utf8"));
const statuses = JSON.parse(await readFile(path.join(root, "data/app-store-status.json"), "utf8"));

if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.apps)) throw new Error("Invalid public app catalog");
if (statuses.schemaVersion !== 1 || typeof statuses.apps !== "object" || statuses.apps === null) throw new Error("Invalid App Store status file");

const slugs = new Set();
const allowedBundleIDs = new Set(["com.philippgraef.rly", "de.philippgraef.foxievoyage"]);
for (const app of catalog.apps) {
  if (!app?.slug || !app?.name || !app?.bundleId || !app?.icon || slugs.has(app.slug)) throw new Error("Invalid or duplicate public app entry");
  if (!allowedBundleIDs.has(app.bundleId)) throw new Error(`Non-canonical public bundle ID for ${app.slug}`);
  slugs.add(app.slug);
}

const expected = [
  "index.html", "404.html", "README.md", ".nojekyll", "assets/styles.css", "assets/site.js",
  "impressum/index.html", "datenschutz/index.html", "data/public-apps.json", "data/app-store-status.json",
  "scripts/update-app-store-status.mjs", "scripts/verify-public-deployment.mjs",
  ...catalog.apps.flatMap((app) => [`apps/${app.slug}/index.html`, `assets/${app.icon}`]),
  ".well-known/apple-app-site-association", "assets/rly-public.js",
  "apps/rly/auth/callback/index.html", "apps/rly/claim/index.html", "apps/rly/meldeportal/index.html",
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

const aasa = JSON.parse(await readFile(path.join(root, ".well-known/apple-app-site-association"), "utf8"));
const aasaText = JSON.stringify(aasa);
if (!aasaText.includes("FL88TW28PZ.com.philippgraef.rly") || !aasaText.includes("/apps/rly/claim/*") || !aasaText.includes("/apps/rly/auth/callback/*")) {
  throw new Error("RLY Universal Link association is incomplete");
}

const callbackPage = await readFile(path.join(root, "apps/rly/auth/callback/index.html"), "utf8");
if (/access_token|refresh_token/.test(callbackPage)) throw new Error("Auth callback fallback must not embed credentials");
const noticePage = await readFile(path.join(root, "apps/rly/meldeportal/index.html"), "utf8");
if (!noticePage.includes("Meldung per E-Mail")) throw new Error("RLY notice fallback is not visible");
for (const slug of Object.keys(statuses.apps)) if (!slugs.has(slug)) throw new Error(`Status file exposes a non-public app: ${slug}`);

const home = await readFile(path.join(root, "index.html"), "utf8");
for (const app of catalog.apps) {
  if (!home.includes(`href="apps/${app.slug}/"`)) throw new Error(`Homepage link missing for ${app.slug}`);
  if (!home.includes(`src="assets/${app.icon}"`)) throw new Error(`Homepage icon path does not match the catalog for ${app.slug}`);
  if (!home.includes(`data-store-status="${app.slug}"`)) throw new Error(`Homepage status marker missing for ${app.slug}`);

  const appPagePath = path.join(root, "apps", app.slug, "index.html");
  const appPage = await readFile(appPagePath, "utf8");
  if (!appPage.includes(`data-app-page="${app.name}"`)) throw new Error(`App-page identity missing for ${app.slug}`);
  if (!appPage.includes(`data-store-status="${app.slug}"`)) throw new Error(`App-page status marker missing for ${app.slug}`);
  if (!appPage.includes(app.bundleId)) throw new Error(`App-page bundle ID missing for ${app.slug}`);
  if (!appPage.includes(`src="../../assets/${app.icon}"`)) throw new Error(`App-page icon path does not match the catalog for ${app.slug}`);

  const rawAmpersand = /&(?![A-Za-z][A-Za-z0-9]+;|#[0-9]+;|#x[0-9A-Fa-f]+;)/;
  if (rawAmpersand.test(appPage)) throw new Error(`Unescaped ampersand on app page for ${app.slug}`);
  const images = appPage.match(/<img\b[^>]*>/g) ?? [];
  if (images.some((image) => !/\balt="[^"]*"/.test(image))) throw new Error(`Image without alt text on app page for ${app.slug}`);

  const tabLinks = new Set(Array.from(appPage.matchAll(/data-tab-link="([^"]+)"/g), (match) => match[1]));
  const tabPanels = new Set(Array.from(appPage.matchAll(/data-tab-panel="([^"]+)"/g), (match) => match[1]));
  if (tabLinks.size !== tabPanels.size || [...tabLinks].some((name) => !tabPanels.has(name))) {
    throw new Error(`Tab links and panels do not match for ${app.slug}`);
  }

  const hrefs = Array.from(appPage.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
  for (const href of hrefs) {
    if (!href || href.startsWith("#") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(href)) continue;
    const relativeTarget = href.split(/[?#]/)[0];
    const resolvedTarget = path.resolve(path.dirname(appPagePath), relativeTarget);
    if (resolvedTarget !== root && !resolvedTarget.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Local link escapes the public root for ${app.slug}: ${href}`);
    }
    const fileTarget = relativeTarget.endsWith("/") ? path.join(resolvedTarget, "index.html") : resolvedTarget;
    await access(fileTarget);
  }
}

console.log(`Verified sanitized public deployment with ${catalog.apps.length} public apps.`);
