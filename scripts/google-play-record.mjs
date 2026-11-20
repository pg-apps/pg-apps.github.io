// Only independently verified public production releases belong in this file.
// Console IDs, test tracks and private launch candidates stay in local maintenance.
export function confirmedGooglePlayRecord(app, entry) {
  if (!app.androidPackageName || entry?.packageName !== app.androidPackageName ||
      entry.status !== 'published' || entry.track !== 'production' ||
      entry.developerName !== 'Philipp Graef') {
    throw new Error('Google Play release does not match the confirmed app and developer');
  }
  const url = new URL(entry.storeUrl);
  if (url.origin !== 'https://play.google.com' ||
      url.pathname !== '/store/apps/details' || url.searchParams.getAll('id').length !== 1 ||
      url.searchParams.get('id') !== app.androidPackageName || url.username || url.password ||
      !entry.version || !Number.isSafeInteger(entry.versionCode) || entry.versionCode < 1 ||
      !/^\d+\.\d+$/.test(entry.minimumAndroidVersion) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.releaseDate) ||
      !Number.isFinite(Date.parse(entry.releaseDate)) || !Number.isFinite(Date.parse(entry.checkedAt))) {
    throw new Error('Incomplete or invalid Google Play release metadata');
  }
  return entry;
}
