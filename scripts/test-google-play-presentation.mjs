import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const fixture=await mkdtemp(path.join(tmpdir(),'pg-play-render-test-'));
const entry={status:'published',packageName:'com.philippgraef.rynolo',developerName:'Philipp Graef',track:'production',version:'1.0.0',versionCode:2,minimumAndroidVersion:'8.0',releaseDate:'2026-11-17',checkedAt:'2026-11-21T10:00:00Z',storeUrl:'https://play.google.com/store/apps/details?id=com.philippgraef.rynolo'};
const apps=[{slug:'rynolo',name:'RYNOLO',summary:'Private travel memories.',icon:'rynolo.png',bundleId:'example.ios.rynolo',appleId:123,androidPackageName:entry.packageName},{slug:'recht-medizinisch',name:'Recht Medizinisch',summary:'Learn with courses.',icon:'rm.png',bundleId:'example.ios.medical',appleId:456}];
const statuses={schemaVersion:1,generatedAt:entry.checkedAt,apps:Object.fromEntries(apps.map(a=>[a.slug,{status:'published',bundleId:a.bundleId,trackId:a.appleId,sellerName:'Philipp Graef',artistId:6807551307,trackViewUrl:`https://apps.apple.com/de/app/example/id${a.appleId}`,version:'1.2',minimumOsVersion:'18.0',releaseDate:'2026-11-18T10:00:00Z',checkedAt:entry.checkedAt}]))};
try {
 await mkdir(path.join(fixture,'scripts'));await mkdir(path.join(fixture,'data'));
 await cp(path.join(root,'scripts/sync-store-presentation.mjs'),path.join(fixture,'scripts/sync-store-presentation.mjs'));
 try {await access(path.join(root,'scripts/google-play-record.mjs'));await cp(path.join(root,'scripts/google-play-record.mjs'),path.join(fixture,'scripts/google-play-record.mjs'));}catch{}
 await writeFile(path.join(fixture,'data/public-apps.json'),JSON.stringify({schemaVersion:1,apps,comingSoonCount:5}));
 await writeFile(path.join(fixture,'data/app-store-status.json'),JSON.stringify(statuses));
 await writeFile(path.join(fixture,'data/google-play-status.json'),JSON.stringify({schemaVersion:1,generatedAt:entry.checkedAt,apps:{rynolo:entry}}));
 await writeFile(path.join(fixture,'index.html'),'<main><aside class="hero-note">Old note</aside><div class="app-grid"></div></main>');
 for(const app of apps){await mkdir(path.join(fixture,'apps',app.slug),{recursive:true});await writeFile(path.join(fixture,'apps',app.slug,'index.html'),`<main><span data-store-status="${app.slug}">Im App Store</span>${app.slug === 'rynolo' ? '' : `<a data-store-link="${app.slug}">App Store</a>`}</main>`)}
 const render=()=>execFileSync(process.execPath,[path.join(fixture,'scripts/sync-store-presentation.mjs')],{stdio:'pipe'});
 render();let home=await readFile(path.join(fixture,'index.html'),'utf8');let detail=await readFile(path.join(fixture,'apps/rynolo/index.html'),'utf8');
 assert(home.includes('data-google-play-link="rynolo"'),'Confirmed Android release needs a homepage Google Play link');
 assert(detail.includes(entry.storeUrl),'Confirmed Android release needs an app-page store link');
 assert(detail.includes('Android 8.0'),'The Android requirement must belong to the Android release');
 assert(detail.includes('Version 1.0.0'),'Android and iOS versions must remain separate');
 assert(detail.includes('Version 1.2'),'Existing iOS release facts must remain visible');
 assert.equal((home.match(/class="app-card is-coming-soon"/g)||[]).length,5);
 assert(!home.includes('data-google-play-link="recht-medizinisch"'),'No Android link without confirmed Android record');
 render();assert.equal(await readFile(path.join(fixture,'index.html'),'utf8'),home,'Daily iOS refresh must retain Android presentation without duplicates');assert.equal(await readFile(path.join(fixture,'apps/rynolo/index.html'),'utf8'),detail);
 const confirmedGoogleData=await readFile(path.join(fixture,'data/google-play-status.json'),'utf8');
 statuses.generatedAt='2026-11-22T10:00:00Z';for(const s of Object.values(statuses.apps))s.checkedAt=statuses.generatedAt;
 await writeFile(path.join(fixture,'data/app-store-status.json'),JSON.stringify(statuses));render();
 assert.equal(await readFile(path.join(fixture,'data/google-play-status.json'),'utf8'),confirmedGoogleData,'An iOS check must not change the Android check date');
 const stableHome=await readFile(path.join(fixture,'index.html'),'utf8');
 await writeFile(path.join(fixture,'data/google-play-status.json'),JSON.stringify({schemaVersion:1,generatedAt:entry.checkedAt,apps:{rynolo:{...entry,track:'internal'}}}));
 assert.throws(render);assert.equal(await readFile(path.join(fixture,'index.html'),'utf8'),stableHome,'Conflicting evidence must leave the confirmed page untouched');
 const { confirmedGooglePlayRecord }=await import('./google-play-record.mjs');
 assert.equal(confirmedGooglePlayRecord(apps[0],entry).versionCode,2);
 for(const change of [{status:'draft'},{track:'internal'},{developerName:'Other developer'},{packageName:'other.package'},{storeUrl:'https://example.com/'},{storeUrl:entry.storeUrl.replace('https:','http:')},{storeUrl:entry.storeUrl.replace('play.google.com','play.google.com:8443')},{storeUrl:entry.storeUrl+'&id=other.package'},{storeUrl:entry.storeUrl.replace(entry.packageName,'other.package')},{version:''},{versionCode:0}]) assert.throws(()=>confirmedGooglePlayRecord(apps[0],{...entry,...change}));
 assert.throws(()=>confirmedGooglePlayRecord(apps[1],entry));
 console.log('Verified Android production identity, separate platform versions, no unconfirmed links, and stable repeated iOS rendering.');
} finally {await rm(fixture,{recursive:true,force:true});}
