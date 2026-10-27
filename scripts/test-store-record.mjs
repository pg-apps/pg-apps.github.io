import assert from 'node:assert/strict';
import { confirmedRecord, retainConfirmedRecord } from './store-record.mjs';

const app = { bundleId: 'example.released', appleId: 123 };
const match = { bundleId: app.bundleId, trackId: 123, sellerName: 'Philipp Graef',
  artistId: 6807551307, trackViewUrl: 'https://apps.apple.com/de/app/example/id123',
  trackName: 'Released app', version: '1.1', minimumOsVersion: '17.0',
  currentVersionReleaseDate: '2026-10-16T13:54:02Z' };
const record = confirmedRecord(app, match, 'de', '2026-10-27T12:00:00Z');
assert.equal(record.status, 'published');
for (const change of [{ bundleId: 'other.app' }, { trackId: 456 },
  { sellerName: 'Someone else' }, { artistId: 42 },
  { trackViewUrl: 'https://example.com/id123' },
  { trackViewUrl: 'https://apps.apple.com/de/app/example/id456' }]) {
  assert.throws(() => confirmedRecord(app, { ...match, ...change }, 'de', record.checkedAt));
}
const renamed = confirmedRecord(app, { ...match, trackName: 'New name' }, 'de', record.checkedAt);
assert.equal(renamed.trackId, record.trackId);
assert.equal(renamed.trackName, 'New name');
for (const reason of ['lookup_incomplete', 'not_found_in_public_storefronts']) {
  const retained = retainConfirmedRecord(record, app, '2026-10-28T12:00:00Z', reason);
  assert.equal(retained.checkedAt, record.checkedAt);
  assert.equal(retained.version, record.version);
  assert.equal(retained.status, 'published');
}
assert.throws(() => retainConfirmedRecord(null, app, record.checkedAt, 'lookup_incomplete'));
console.log('Verified release identity, rename and unavailable-catalog recovery.');
