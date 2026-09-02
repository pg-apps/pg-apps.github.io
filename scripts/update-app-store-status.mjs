import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const statusPath = path.join(projectRoot, "data/app-store-status.json");
const publicAppsPath = path.join(projectRoot, "data/public-apps.json");
const storefronts = ["de", "us"];
const dryRun = process.argv.includes("--dry-run");

const previous = JSON.parse(await readFile(statusPath, "utf8"));
const publicCatalog = JSON.parse(await readFile(publicAppsPath, "utf8"));
if (publicCatalog.schemaVersion !== 1 || !Array.isArray(publicCatalog.apps)) {
  throw new Error("data/public-apps.json has an unsupported format");
}
const publicApps = publicCatalog.apps.map((app) => ({ ...app, bundle: app.bundleId }));
const allowedBundleIDs = new Set(["com.philippgraef.rly"]);
const checkedAt = new Date().toISOString();

const lookup = async (bundleId, storefront) => {
  const url = new URL("https://itunes.apple.com/lookup");
  url.searchParams.set("bundleId", bundleId);
  url.searchParams.set("country", storefront);
  url.searchParams.set("entity", "software");

  const response = await fetch(url, {
    headers: { "User-Agent": "Phips10-app-support-status/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Apple lookup returned HTTP ${response.status}`);

  const payload = await response.json();
  if (!Array.isArray(payload.results)) throw new Error("Apple lookup returned an unexpected payload");
  return payload.results.find((result) => result?.bundleId === bundleId) ?? null;
};

const checkApp = async (app) => {
  const previousEntry = previous.apps?.[app.slug];
  if (!allowedBundleIDs.has(app.bundle)) {
    return {
      bundleId: app.bundle,
      status: "unpublished",
      checkedAt: null,
      reason: "non_canonical_bundle_id",
    };
  }

  const failures = [];
  let successfulLookups = 0;

  for (const storefront of storefronts) {
    try {
      const match = await lookup(app.bundle, storefront);
      successfulLookups += 1;
      if (match) {
        return {
          bundleId: app.bundle,
          status: "published",
          checkedAt,
          storefront,
          trackId: match.trackId ?? null,
          trackName: match.trackName ?? app.name,
          trackViewUrl: match.trackViewUrl ?? null,
          version: match.version ?? null,
          releaseDate: match.currentVersionReleaseDate ?? match.releaseDate ?? null,
        };
      }
    } catch (error) {
      failures.push(`${storefront}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (successfulLookups === storefronts.length) {
    return {
      bundleId: app.bundle,
      status: "unpublished",
      checkedAt,
      reason: "not_found_in_public_storefronts",
    };
  }

  return {
    ...(previousEntry ?? {}),
    bundleId: app.bundle,
    status: previousEntry?.status ?? "unknown",
    lastAttemptAt: checkedAt,
    reason: "lookup_incomplete",
    lookupErrors: failures,
  };
};

const entries = await Promise.all(publicApps.map(async (app) => [app.slug, await checkApp(app)]));
const result = {
  schemaVersion: 1,
  generatedAt: publicApps.length ? checkedAt : (previous.generatedAt ?? checkedAt),
  source: "Apple public App Store catalog",
  storefronts,
  apps: Object.fromEntries(entries),
};

if (dryRun) {
  for (const [slug, entry] of entries) console.log(`${slug}: ${entry.status} (${entry.reason ?? entry.storefront ?? "matched"})`);
} else {
  await writeFile(statusPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Updated ${path.relative(projectRoot, statusPath)} for ${entries.length} public apps.`);
}
