// The public catalog contains confirmed releases only. Private launch candidates
// are checked by the local weekly maintenance task, never in this workflow.
export function confirmedRecord(app, match, storefront, checkedAt) {
  if (match.bundleId !== app.bundleId || match.sellerName !== 'Philipp Graef' ||
      match.artistId !== 6807551307 || match.trackId !== app.appleId) {
    throw new Error('Apple identity does not match the confirmed app and developer');
  }
  const url = new URL(match.trackViewUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com' ||
      !url.pathname.endsWith(`/id${app.appleId}`) || !match.version || !match.minimumOsVersion) {
    throw new Error('Incomplete or invalid Apple release metadata');
  }
  return {
    bundleId: app.bundleId, status: 'published', checkedAt, storefront,
    trackId: match.trackId, trackName: match.trackName, sellerName: match.sellerName,
    artistId: match.artistId, trackViewUrl: url.href, version: match.version,
    minimumOsVersion: match.minimumOsVersion,
    releaseDate: match.currentVersionReleaseDate ?? match.releaseDate,
  };
}

export function retainConfirmedRecord(previous, app, attemptedAt, reason, errors = []) {
  if (previous?.status !== 'published' || previous.bundleId !== app.bundleId ||
      previous.trackId !== app.appleId || previous.sellerName !== 'Philipp Graef' ||
      previous.artistId !== 6807551307) {
    throw new Error('No confirmed release available; private review required');
  }
  return { ...previous, lastAttemptAt: attemptedAt, reason,
    ...(errors.length ? { lookupErrors: errors } : {}) };
}
