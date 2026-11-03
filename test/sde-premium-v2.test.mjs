import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=path=>readFileSync(path,'utf8');

test('Accueil premium : trois univers reliés aux vraies rubriques publiques',()=>{
 const html=read('public/vitrine/portail.html');
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/'});
 try{
  const doc=dom.window.document;
  const pillars=doc.querySelectorAll('.sde-premium-pillars-grid .sde-premium-pillar');
  assert.equal(pillars.length,3);
  for(const [selector,label,path] of [
   ['.sde-premium-spiritualite','Spiritualité','/priere'],
   ['.sde-premium-commandement','Commandement','/portail'],
   ['.sde-premium-missions','Missions','/missions']
  ]){
   const panel=doc.querySelector(selector);
   assert.ok(panel,selector);
   assert.ok(panel.textContent.includes(label));
   assert.ok(panel.querySelector('a[href="'+path+'"]'),path);
  }
  const actions=doc.querySelector('.m-welcome .m-actions');
  assert.ok(actions,'Trois actions d’accueil présentes');
  assert.equal(actions.querySelectorAll('a').length,3);
  assert.ok(doc.querySelector('.sde-hero-poster img[src="/vitrine/illus/tpa-2026.webp"]'));
  assert.equal(doc.querySelectorAll('.iv-vitrine img[src="/vitrine/illus/tpa-2026.webp"]').length,0);
 }finally{dom.window.close()}
});

test('Charte publique : contraste et grilles responsive pour les trois univers',()=>{
 const css=read('public/vitrine/sde-premium-public.css');
 const site=read('public/vitrine/sde-sitewide-2026.css');
 for(const name of ['sde-premium-pillars','sde-premium-spiritualite','sde-premium-commandement','sde-premium-missions','sde-premium-pillars-grid'])assert.ok(css.includes(name),name);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const page of ['prieres','academy','ressources','missions-humanitaires','programmes','mouvement'])assert.ok(site.includes('data-sde-page="'+page+'"'),page);
 assert.ok(site.includes('--sde-page-accent'));
 assert.match(site,/@media\(max-width:680px\)/);
});

test('Poste de commandement : décisions en haut, accès autorisés et données réelles',()=>{
 const ops=read('frontend/operations.jsx');
 const start=ops.indexOf('function Command({portal})'),end=ops.indexOf('function EventCountdown(',start);
 assert.ok(start>0&&end>start);
 const command=ops.slice(start,end);
 assert.ok(command.includes('Actions immédiates'));
 assert.ok(command.includes('Données synchronisées'));
 assert.ok(command.includes('d.indicateurs?.demandesAdhesion'));
 assert.ok(command.includes('portal.compte.niveau>=2&&<button type="button" onClick={()=>portal.selectionner(\'finance-direction\')'));
 assert.ok(command.includes("portal.selectionner('scanner')"));
 assert.ok(command.includes("portal.selectionner('academy-direction')"));
 assert.ok(command.indexOf('ref-command-focus')<command.indexOf('<OfficialTpaCard/>'));
 assert.equal(command.split('className="ref-priority"').length-1,1,'Aucune duplication des accès rapides');
});

test('Navigation privée : regroupements et cinq onglets dont Plus, sans extension des rôles',()=>{
 const src=read('frontend/reference-shell.jsx'),entry=read('frontend/experience.css');
 const ui=read('frontend/sde-premium-v2.css');
 assert.ok(src.includes('const entrySections=admin?'));
 assert.ok(src.includes('ref-nav-section'));
 assert.ok(src.includes("['pilotage','Accueil','home']"));
 assert.ok(src.includes("['carteqr','Ma carte','qr']"));
 assert.ok(src.includes('<span>Plus</span>'));
 assert.ok(src.includes('account.niveau>=2'));
 assert.ok(entry.includes('@import "./sde-premium-v2.css"'));
 for(const name of ['ref-command-focus','ref-command-focus-head','ref-nav-section','sde-module-accent'])assert.ok(ui.includes(name),name);
 assert.ok(ui.includes('@media(max-width:620px)'));
 assert.ok(ui.includes('prefers-reduced-motion:reduce'));
});
