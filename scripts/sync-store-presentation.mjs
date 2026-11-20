import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confirmedGooglePlayRecord } from './google-play-record.mjs';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(path.join(root, 'data/public-apps.json'), 'utf8'));
const statuses = JSON.parse(await readFile(path.join(root, 'data/app-store-status.json'), 'utf8'));
const googlePlay = JSON.parse(await readFile(path.join(root, 'data/google-play-status.json'), 'utf8'));
if (googlePlay.schemaVersion !== 1 || !googlePlay.apps || Array.isArray(googlePlay.apps)) throw new Error('Invalid Google Play status file');
for (const [slug, entry] of Object.entries(googlePlay.apps)) {
  const app = catalog.apps.find(app => app.slug === slug);
  if (!app) throw new Error('Google Play status exposes a non-public app');
  confirmedGooglePlayRecord(app, entry);
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const released = catalog.apps.filter(app => {
  const status = statuses.apps[app.slug];
  if (status?.status !== 'published') return false;
  if (status.bundleId !== app.bundleId || status.trackId !== app.appleId || status.sellerName !== 'Philipp Graef' || status.artistId !== 6807551307) throw new Error(`Unconfirmed developer for ${app.slug}`);
  const url = new URL(status.trackViewUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com') throw new Error('Invalid store link');
  return true;
}).sort((a, b) => ['funkle', 'rynolo', 'nadumo', 'pond-sparks', 'recht-medizinisch', 'storyvoyage'].indexOf(a.slug) - ['funkle', 'rynolo', 'nadumo', 'pond-sparks', 'recht-medizinisch', 'storyvoyage'].indexOf(b.slug));

function replaceElement(html, tag, opener, replacement) {
  const start = html.indexOf(opener);
  if (start < 0) throw new Error(`Missing ${opener}`);
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  tokens.lastIndex = start;
  let depth = 0; let token;
  while ((token = tokens.exec(html))) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + replacement + html.slice(tokens.lastIndex);
  }
  throw new Error('Unbalanced HTML');
}

const playBadge = slug => googlePlay.apps[slug] ? `<span class="publication-status is-published" data-google-play-status="${escape(slug)}">Bei Google Play</span>` : '';
const playLink = (app, className = '') => googlePlay.apps[app.slug] ? `<a class="${className}" data-google-play-link="${escape(app.slug)}" href="${escape(googlePlay.apps[app.slug].storeUrl)}" aria-label="${escape(app.name)} bei Google Play öffnen" rel="noreferrer">Bei Google Play öffnen ↗</a>` : '';

let home = await readFile(path.join(root, 'index.html'), 'utf8');
const cards = released.map(app => {
  const status = statuses.apps[app.slug];
  if (!app.summary) throw new Error(`Missing reviewed description for ${app.slug}`);
  return `<article class="app-card"><a href="apps/${escape(app.slug)}/"><span class="app-icon"><img src="assets/${escape(app.icon)}" alt="${escape(app.name)} App-Icon" width="384" height="384"></span><h3>${escape(app.name)}</h3></a><div class="store-statuses"><span class="publication-status is-published" data-store-status="${escape(app.slug)}" data-submission-status="published">Im App Store</span>${playBadge(app.slug)}</div><p>${escape(app.summary)}</p><div class="card-meta"><a class="store-cta" data-store-link="${escape(app.slug)}" href="${escape(status.trackViewUrl)}" rel="noreferrer">Im App Store öffnen ↗</a>${playLink(app, 'store-cta')}<a href="apps/${escape(app.slug)}/">Support &amp; Recht →</a></div></article>`;
});
if (released.length !== catalog.apps.length) throw new Error('Only confirmed releases belong in the public catalog');
const coming = catalog.comingSoonCount ?? 0;
if (!Number.isInteger(coming) || coming < 0 || coming > 30) throw new Error('Invalid anonymous preview count');
for (let i = 0; i < coming; i++) cards.push('<article class="app-card is-coming-soon"><span class="coming-art" aria-hidden="true"></span><span class="publication-status is-unpublished">Coming soon</span><h3>Etwas Neues entsteht.</h3><p>Mehr zu dieser App erfährst du zum Launch.</p></article>');
home = replaceElement(home, 'div', '<div class="app-grid">', `<div class="app-grid">${cards.join('\n')}</div>`);
const androidApps = released.filter(app => googlePlay.apps[app.slug]);
home = replaceElement(home, 'aside', '<aside class="hero-note">', `<aside class="hero-note"><strong>Jetzt im App Store</strong><p>${released.map(app => escape(app.name)).join(', ')} sind veröffentlicht. Entdecke die Apps und ihre Support- und Rechtsinformationen.</p>${androidApps.length ? `<p>Auch bei Google Play: ${androidApps.map(app => escape(app.name)).join(', ')}.</p>` : ''}</aside>`);
home = home.replace('Hier findest du Informationen, Support und Rechtliches zu unseren Apps. Bei Apps in Vorbereitung zeigen wir transparent, dass sie noch nicht im App Store verfügbar sind.', 'Entdecke unsere veröffentlichten Apps. Datenschutz, Nutzungsbedingungen und Support findest du für jede App auf ihrer eigenen Seite.');
home = home.replace('Der öffentliche Status wird getrennt vom technischen Vorbereitungsstand ausgewiesen.', 'Direkt zu den Apps im Store oder zu Support und Rechtlichem. Weitere Apps folgen.');
home = home.replace(/<p class="portfolio-checked">[\s\S]*?<\/p>/, '');
home = home.replace('<div class="app-grid">', `<p class="portfolio-checked">App-Store-Stand geprüft am <time datetime="${statuses.generatedAt.slice(0,10)}">${new Intl.DateTimeFormat('de-DE', {dateStyle:'long', timeZone:'Europe/Berlin'}).format(new Date(statuses.generatedAt))}</time>.${androidApps.length ? ` Google-Play-Stand geprüft am <time datetime="${googlePlay.generatedAt.slice(0,10)}">${new Intl.DateTimeFormat('de-DE', {dateStyle:'long', timeZone:'Europe/Berlin'}).format(new Date(googlePlay.generatedAt))}</time>.` : ''}</p><div class="app-grid">`);
await writeFile(path.join(root, 'index.html'), home);

for (const app of released) {
  const status = statuses.apps[app.slug];
  const file = path.join(root, 'apps', app.slug, 'index.html');
  let html = await readFile(file, 'utf8');
  html = html.replace(/<span\b[^>]*data-google-play-status="[^"]+"[^>]*>[^<]*<\/span>/g, '');
  html = html.replace(/<a\b[^>]*data-google-play-link="[^"]+"[^>]*>[^<]*<\/a>/g, '');
  html = html.replace(new RegExp(`<span\\b[^>]*data-store-status="${app.slug}"[^>]*>[^<]*<\\/span>`, 'g'), `<span class="${app.slug === 'recht-medizinisch' ? 'badge ' : ''}publication-status is-published" data-store-status="${app.slug}" data-submission-status="published">Im App Store</span>${playBadge(app.slug)}`);
  html = html.replace(new RegExp(`<p\\b[^>]*data-store-detail="${app.slug}"[^>]*>[^<]*<\\/p>`, 'g'), `<p data-store-detail="${app.slug}">${escape(app.name)} ist im deutschen App Store verfügbar (Version ${escape(status.version)}).</p>`);
  html = html.replace(new RegExp(`<dd\\b[^>]*data-store-checked="${app.slug}"[^>]*>[^<]*<\\/dd>`, 'g'), `<dd data-store-checked="${app.slug}">${escape(status.checkedAt.slice(0,10))}</dd>`);
  html = html.replace(/(<dt>(?:iOS-)?Version<\/dt><dd>)[^<]+(<\/dd>)/g, `$1${escape(status.version)}$2`);
  html = html.replace(/<p class="release-facts">[\s\S]*?<\/p>/, '');
  const date = new Intl.DateTimeFormat('de-DE', {dateStyle:'long', timeZone:'Europe/Berlin'});
  const android = googlePlay.apps[app.slug];
  const androidFacts = android ? `<br>Bei Google Play: Version ${escape(android.version)} · Systemvoraussetzung: Android ${escape(android.minimumAndroidVersion)} oder neuer · Versionsveröffentlichung: ${date.format(new Date(android.releaseDate))} · Geprüft: ${date.format(new Date(android.checkedAt))}.` : '';
  const releaseFacts = `<p class="release-facts">Im App Store: Version ${escape(status.version)} · Systemvoraussetzung: iOS ${escape(status.minimumOsVersion)} oder neuer · Versionsveröffentlichung: ${date.format(new Date(status.releaseDate))} · Katalog geprüft: ${date.format(new Date(status.checkedAt))}.${androidFacts}</p>`;
  html = html.replace(new RegExp(`<a\\b[^>]*data-store-link="${app.slug}"[^>]*>[^<]*<\\/a>`, 'g'), `<a data-store-link="${app.slug}" href="${escape(status.trackViewUrl)}" rel="noreferrer">Im App Store öffnen ↗</a>${playLink(app)}`);
  if (!html.includes(`data-store-link="${app.slug}"`)) html = html.replace('</main>', `<p class="shell"><a data-store-link="${app.slug}" href="${escape(status.trackViewUrl)}" rel="noreferrer">Im App Store öffnen ↗</a>${playLink(app)}</p></main>`);
  html = html.replace('</main>', `${releaseFacts}</main>`);
  await writeFile(file, html);
}
console.log(`Updated homepage and detail pages for ${released.length} confirmed releases.`);
