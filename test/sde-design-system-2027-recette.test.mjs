import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8');

test('Charte SDE 2027 : identité cohérente et bandeaux réduits sur mobile',()=>{
 const css=read('public/vitrine/sde-shell-public.css');
 for(const name of ['navy','ivory','gold','violet','green'])
  assert.ok(css.includes('--sde-2027-'+name+':'),name);
 assert.ok(css.includes('.sde-shell-context-cta'));
 assert.ok(css.includes('body:not(.sde-2027-reference) #sde-event-root'));
 assert.ok(css.includes('max-width:800px'));
});
test('TPA 2026 : date accessible sans chargement JavaScript',()=>{
 const d=new JSDOM(read('public/vitrine/programmes.html'));
 const clock=d.window.document.querySelector('.event-clock');
 assert.ok(clock.querySelector('time[datetime="2026-12-18T20:00:00Z"]'));
 assert.doesNotMatch(clock.textContent,/--/);
 assert.match(read('public/vitrine/sde-shell-public.js'),/Date.UTC\(2026,11,18,20,0,0\)/);
 d.window.close();
});
test('Connexion : aucune navigation publique, formulaires membres préservés',()=>{
 const d=new JSDOM(read('public/vitrine/connexion-unifiee.html'));
 const doc=d.window.document;
 assert.equal(doc.querySelectorAll('.site-header,.infire-takeover,.sde-auth-nav').length,0);
 assert.ok(doc.querySelector('#form-connexion'));
 assert.ok(doc.querySelector('#form-inscription'));
 assert.ok(doc.querySelector('.sde-auth-return'));
 assert.ok(read('public/vitrine/sde-marque.js').includes('document.body.classList.contains("sde-reference-login")'));
 d.window.close();
});
test('Soldiers Academy, TV et Quest : cartes et interactions natives',()=>{
 const academy=new JSDOM(read('public/vitrine/academy.html'));
 const tv=new JSDOM(read('public/vitrine/soldiers-tv.html'));
 const quest=new JSDOM(read('public/vitrine/soldier-quest.html'));
 assert.equal(academy.window.document.querySelectorAll('.sa-premium-quick a').length,3);
 assert.ok(academy.window.document.querySelector('.sa-premium-quick a[href="/academy-programme-24"]'));
 assert.ok(tv.window.document.querySelector('#sdu-tv-player[controls]'));
 assert.ok(tv.window.document.querySelectorAll('.sdu-playlist-item').length>=2);
 assert.ok(quest.window.document.querySelector('[data-sdu-filter-group]'));
 assert.ok(quest.window.document.querySelector('.sdu-hero-actions a[href="#missions"]'));
 for(const d of [academy,tv,quest])d.window.close();
});
test('Recettes navigateur : cinq formats de 360 à 1600 px',()=>{
 const pub=read('scripts/audit-public-mobile.mjs');
 const pri=read('scripts/audit-prive-authentifie.mjs');
 for(const width of [360,390,768,1280,1600]){
  assert.ok(pub.includes('width:'+width),width);
  assert.ok(pri.includes(String(width)),width);
 }
 assert.ok(pri.includes('report.length!==10'));
});
