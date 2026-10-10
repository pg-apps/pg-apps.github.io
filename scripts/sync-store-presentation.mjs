import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(path.join(root, 'data/public-apps.json'), 'utf8'));
const statuses = JSON.parse(await readFile(path.join(root, 'data/app-store-status.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const released = catalog.apps.filter(app => {
  const status = statuses.apps[app.slug];
  if (status?.status !== 'published') return false;
  if (status.bundleId !== app.bundleId || status.sellerName !== 'Philipp Graef' || status.artistId !== 6807551307) throw new Error(`Unconfirmed developer for ${app.slug}`);
  const url = new URL(status.trackViewUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com') throw new Error('Invalid store link');
  return true;
}).sort((a, b) => ['funkle', 'rynolo', 'nadumo', 'pond-sparks', 'recht-medizinisch'].indexOf(a.slug) - ['funkle', 'rynolo', 'nadumo', 'pond-sparks', 'recht-medizinisch'].indexOf(b.slug));

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

let home = await readFile(path.join(root, 'index.html'), 'utf8');
const cards = released.map(app => {
  const status = statuses.apps[app.slug];
  if (!app.summary) throw new Error(`Missing reviewed description for ${app.slug}`);
  return `<article class="app-card"><a href="apps/${escape(app.slug)}/"><span class="app-icon"><img src="assets/${escape(app.icon)}" alt="${escape(app.name)} App-Icon" width="384" height="384"></span><h3>${escape(app.name)}</h3></a><span class="publication-status is-published" data-store-status="${escape(app.slug)}" data-submission-status="published">Im App Store</span><p>${escape(app.summary)}</p><div class="card-meta"><a class="store-cta" data-store-link="${escape(app.slug)}" href="${escape(status.trackViewUrl)}" rel="noreferrer">Im App Store öffnen ↗</a><a href="apps/${escape(app.slug)}/">Support &amp; Recht →</a></div></article>`;
});
const coming = catalog.apps.length - released.length;
for (let i = 0; i < coming; i++) cards.push('<article class="app-card is-coming-soon"><span class="coming-art" aria-hidden="true"></span><span class="publication-status is-unpublished">Coming soon</span><h3>Etwas Neues entsteht.</h3><p>Mehr zu dieser App erfährst du zum Launch.</p></article>');
home = replaceElement(home, 'div', '<div class="app-grid">', `<div class="app-grid">${cards.join('\n')}</div>`);
home = replaceElement(home, 'aside', '<aside class="hero-note">', `<aside class="hero-note"><strong>Jetzt im App Store</strong><p>${released.map(app => escape(app.name)).join(', ')} sind veröffentlicht. Entdecke die Apps und ihre Support- und Rechtsinformationen.</p></aside>`);
home = home.replace('Hier findest du Informationen, Support und Rechtliches zu unseren Apps. Bei Apps in Vorbereitung zeigen wir transparent, dass sie noch nicht im App Store verfügbar sind.', 'Entdecke unsere veröffentlichten Apps. Datenschutz, Nutzungsbedingungen und Support findest du für jede App auf ihrer eigenen Seite.');
home = home.replace('Der öffentliche Status wird getrennt vom technischen Vorbereitungsstand ausgewiesen.', 'Direkt zu den Apps im Store oder zu Support und Rechtlichem. Weitere Apps folgen.');
await writeFile(path.join(root, 'index.html'), home);

for (const app of released) {
  const status = statuses.apps[app.slug];
  const file = path.join(root, 'apps', app.slug, 'index.html');
  let html = await readFile(file, 'utf8');
  html = html.replace(new RegExp(`<span\\b[^>]*data-store-status="${app.slug}"[^>]*>[^<]*<\\/span>`, 'g'), `<span class="${app.slug === 'recht-medizinisch' ? 'badge ' : ''}publication-status is-published" data-store-status="${app.slug}" data-submission-status="published">Im App Store</span>`);
  html = html.replace(new RegExp(`<p\\b[^>]*data-store-detail="${app.slug}"[^>]*>[^<]*<\\/p>`, 'g'), `<p data-store-detail="${app.slug}">${escape(app.name)} ist im deutschen App Store verfügbar (Version ${escape(status.version)}).</p>`);
  html = html.replace(new RegExp(`<dd\\b[^>]*data-store-checked="${app.slug}"[^>]*>[^<]*<\\/dd>`, 'g'), `<dd data-store-checked="${app.slug}">${escape(status.checkedAt.slice(0,10))}</dd>`);
  html = html.replace(/(<dt>Version<\/dt><dd>)[^<]+(<\/dd>)/g, `$1${escape(status.version)}$2`);
  html = html.replace(new RegExp(`<a\\b[^>]*data-store-link="${app.slug}"[^>]*>[^<]*<\\/a>`, 'g'), `<a data-store-link="${app.slug}" href="${escape(status.trackViewUrl)}" rel="noreferrer">Im App Store öffnen ↗</a>`);
  if (!html.includes(`data-store-link="${app.slug}"`)) html = html.replace('</main>', `<p class="shell"><a data-store-link="${app.slug}" href="${escape(status.trackViewUrl)}" rel="noreferrer">${escape(app.name)} im App Store öffnen ↗</a></p></main>`);
  await writeFile(file, html);
}
console.log(`Updated homepage and detail pages for ${released.length} confirmed releases.`);
