import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const file=p=>readFileSync(p,'utf8');

test('Programmes : la hauteur du shell tablette est réservée avant son montage',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 assert.match(css,/@media\(min-width:701px\) and \(max-width:800px\)/);
 assert.match(css,/data-sde-page="programmes"\]:not\(\.sde-shell-mounted\)>header\.site-header:not\(\.sde-shell-header\)/);
 assert.match(css,/height:73px!important/);
 assert.match(css,/overflow:hidden!important/);
 const page=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 assert.ok(page.querySelector('header.site-header'));
 assert.equal(page.body.getAttribute('data-sde-page'),'programmes');
 assert.ok(page.querySelector('#agenda'));
});
test('Academy : bannière redondante masquée sans supprimer les cours ni la TPA du programme',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 assert.match(css,/html body\.sde-unifie\.sde-campus-public #sde-event-root\{/);
 assert.match(css,/display:none!important/);
 const a=new JSDOM(file('public/vitrine/academy.html')).window.document;
 assert.ok(a.body.classList.contains('sde-campus-public'));
 assert.ok(a.querySelector('.sa-premium-preview'));
 assert.ok(a.querySelector('.sa-premium-quick a[href="/academy-programme-24"]'));
 const p=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 assert.ok(p.querySelector('#tpa-2026'));
 assert.ok(p.querySelector('.event-clock time[datetime="2026-12-18T20:00:00Z"]'));
});

test('Les trois pages ayant un CLS mesuré réservent leur hauteur avant montage',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 const section=css.slice(css.lastIndexOf('Réserves avant montage de la navigation partagée'));
 assert.ok(section.startsWith('Réserves avant montage'));
 for(const name of ['programmes','mouvement','academy']){
  const html=file('public/vitrine/'+name+'.html');
  const d=new JSDOM(html).window.document;
  assert.equal(d.body.getAttribute('data-sde-page'),name);
  assert.ok(d.querySelector('header.site-header'));
  assert.ok(section.includes('data-sde-page="'+name+'"'));
 }
 assert.match(section,/height:63px!important/);
 assert.match(section,/height:76px!important/);
 assert.match(section,/height:161px!important/);
 assert.match(section,/not\(\.sde-shell-mounted\)/);
});

test('Le CLS réel 11/11 pré-réserve la même intro Programmes et le même header Mouvement',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 const patch=css.slice(css.lastIndexOf('Recette navigateur réelle 11-11'));
 assert.ok(patch.startsWith('Recette navigateur réelle'));
 assert.match(patch,/data-sde-page="programmes"/);
 assert.match(patch,/padding-top:20px!important;padding-bottom:20px!important/);
 assert.match(patch,/margin-block:6px!important/);
 assert.match(patch,/data-sde-page="mouvement"/);
 assert.match(patch,/height:57px!important/);
});

test('IN FIRE expiré est déjà hors flux avant déplacement vers les archives',()=>{
 const d=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 const exp=d.querySelector('#agenda-liste > .programme[data-sde-archive-pending="2026-10-31"]');
 assert.ok(exp,'l\'archive IN FIRE est identifiée dans le HTML initial');
 assert.match(exp.textContent,/IN FIRE 2026/);
 const tpa=d.querySelector('#agenda-liste > #tpa-2026');
 assert.ok(tpa,'la TPA future reste présente dans l\'agenda');
 const css=file('public/vitrine/sde-shell-public.css');
 assert.match(css,/#agenda-liste > \.programme\[data-sde-archive-pending="2026-10-31"\]\s*\{\s*display:none!important;/);
 const js=file('public/vitrine/portail-unifie.js');
 assert.match(js,/archives\.append\(ancienne\)/,'le transfert vers les archives historiques est conservé');
});
test('Mouvement desktop : place du décompte réservée dès la première peinture',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 const section=css.slice(css.lastIndexOf('Stabilisation avant peinture, novembre 2026'));
 assert.ok(section.startsWith('Stabilisation avant peinture'));
 assert.match(section,/#sde-event-root \.event-clock/);
 assert.match(section,/flex:0 0 316px!important/);
 assert.match(section,/width:316px!important/);
 assert.match(section,/min-height:39px!important/);
 const d=new JSDOM(file('public/vitrine/mouvement.html')).window.document;
 assert.ok(d.querySelector('#sde-event-root .event-clock time'));
});

test('Le bandeau TPA stabilise les liens sans supprimer la date ni le décompte',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 const patch=css.slice(css.lastIndexOf('Dernière passe CLS 11/11/2026'));
 assert.ok(patch.startsWith('Dernière passe CLS'));
 assert.match(patch,/data-sde-page="programmes"/);
 assert.match(patch,/height:122px!important/);
 assert.match(patch,/grid-template-rows:48px 44px!important/);
 assert.match(patch,/\.event-clock\{\s*display:none!important/);
 assert.match(patch,/data-sde-page="mouvement"/);
 assert.match(patch,/grid-template-columns:minmax\\(0,1fr\\) 316px 188px!important/);
 assert.match(patch,/grid-template-rows:minmax\\(44px,auto\\)!important/);
 assert.match(patch,/\\.event-clock\\{\\s*grid-column:2!important;grid-row:1!important/);
 assert.match(patch,/\\.event-bar-action\\{\\s*grid-column:3!important;grid-row:1!important/);
 assert.match(patch,/text-overflow:ellipsis!important/);
 for(const page of ['programmes','mouvement']){
  const doc=new JSDOM(file('public/vitrine/'+page+'.html')).window.document;
  assert.ok(doc.querySelector('#sde-event-root a[href="/programmes#tpa-2026"]'));
  assert.ok(doc.querySelector('#sde-event-root .event-bar-date'));
 }
 const pg=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 assert.ok(pg.querySelector('.event-clock time[datetime="2026-12-18T20:00:00Z"]'));
});
