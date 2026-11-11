import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');
const portal=read('public/vitrine/portail-direct.js');
const command=read('public/vitrine/sde-command-v4.js');
const css=read('public/vitrine/sde-command-v4.css');

async function simulate(path,level,stats=null){
 const ids=['accueil','synthese','membres','scanner','finances','garnisons','academie','portevoix','chambre','agenda','arsenal','priere'];
 const nodes=ids.map((id,i)=>'<button type="button" data-vue="'+id+'"'+(i===0?' aria-current="page" class="on"':'')+'>'+id+'</button>').join('');
 const html='<html><body><button id="btn-reglages">Réglages</button><button id="btn-compte">Mon compte</button><div class="shell"><nav id="nav">'+nodes+'</nav><main id="main" tabindex="-1"><h1>Dashboard</h1></main></div></body></html>';
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/'+path,runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async(url)=>({ok:true,json:async()=>url==='/api/tableau-de-bord'?stats||{}:({connecte:true,niveau:level,role:level?'admin':'soldat',membreId:'test'})});
 w.matchMedia=()=>({matches:true});
 w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true'};
 w.eval(portal);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(let i=0;i<20&&!w.SDEPortal;i++)await new Promise(r=>setTimeout(r,10));
 assert.ok(w.SDEPortal);
 w.eval(command);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return dom;
}
test('Administrateur : grille opérationnelle réelle, barre à 5 onglets et navigation directe',async()=>{
 const dom=await simulate('administration',2),d=dom.window.document;
 try{
  assert.equal(d.querySelectorAll('#sde-command-v4 .sde-command-v4-item').length,8);
  const bottom=d.querySelector('.sde-command-v4-bottom');
  assert.deepEqual([...bottom.querySelectorAll('button')].map(x=>x.textContent),['Accueil','Membres','Agenda','Finances','Plus']);
  const finances=d.querySelector('#sde-command-v4 [data-module="finances"]');
  assert.ok(finances);
  finances.click();
  assert.equal(new URL(dom.window.location.href).searchParams.get('module'),'finances');
  assert.equal(finances.getAttribute('aria-current'),'page');
  bottom.querySelector('[data-module="plus"]').click();
  assert.equal(d.querySelector('#sde-direct-menu-toggle').getAttribute('aria-expanded'),'true');
 }finally{dom.window.close()}
});
test('Responsable : finances invisibles, onglet Pôles et accès métier conservés',async()=>{
 const dom=await simulate('administration',1),d=dom.window.document;
 try{
  assert.equal(d.querySelector('#sde-command-v4 [data-module="finances"]'),null);
  const bottom=d.querySelector('.sde-command-v4-bottom');
  assert.ok(bottom.querySelector('[data-module="garnisons"]'));
  assert.equal(bottom.querySelectorAll('button').length,5);
  assert.equal(d.querySelectorAll('#sde-command-v4 .sde-command-v4-item').length,7);
 }finally{dom.window.close()}
});
test('Simple membre : aucun panneau de commandement administratif',async()=>{
 const dom=await simulate('mon-espace',0),d=dom.window.document;
 try{
  assert.equal(d.querySelector('#sde-command-v4'),null);
  assert.equal(d.querySelector('.sde-command-v4-bottom'),null);
 }finally{dom.window.close()}
});
test('Les assets 4.0 sont chargés une seule fois et les états responsive sont pris en charge',()=>{
 const html=read('public/index.html');
 for(const asset of ['sde-command-v4.js','sde-command-v4.css'])
  assert.equal(html.split('/vitrine/'+asset).length-1,1,asset);
 assert.ok(css.includes('grid-auto-flow:column'));
 assert.ok(css.includes('env(safe-area-inset-bottom)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('[aria-current=page]'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Maquette direction : métriques réelles visibles même sans taux de présence',async()=>{
 const stats={indicateurs:{membresActifs:21,presence:{taux:null},intercessions:4},total:{evenements:6}};
 const dom=await simulate('administration',2,stats),d=dom.window.document;
 try{
  await new Promise(resolve=>setTimeout(resolve,0));
  const panel=d.querySelector('.sde-command-v4-insights');
  assert.ok(panel,'panneau d indicateurs authentifié présent');
  assert.equal(panel.hidden,false,'les autres indicateurs restent visibles');
  assert.deepEqual([...panel.querySelectorAll('strong')].map(x=>x.textContent),['21','—','4','6']);
  assert.match(panel.textContent,/Donnée non renseignée/);
  assert.doesNotMatch(panel.textContent,/0%/,'aucune présence fictive');
 }finally{dom.window.close();}
});
test('Maquette direction : un vrai taux nul est affiché à 0 %, et membre n a jamais le panneau',async()=>{
 const stats={indicateurs:{membresActifs:0,presence:{taux:0},intercessions:0},total:{evenements:0}};
 const dom=await simulate('administration',1,stats);
 try{
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(dom.window.document.querySelectorAll('.sde-command-v4-insight').length,4);
  assert.match(dom.window.document.querySelector('.sde-command-v4-insights').textContent,/0%/);
 }finally{dom.window.close();}
 const membre=await simulate('mon-espace',0,stats);
 try{assert.equal(membre.window.document.querySelector('.sde-command-v4-insights'),null);}
 finally{membre.window.close();}
});


test('Chaque fiche individuelle du registre a le modèle accessible SDE 2027',()=>{
 const html=read('public/index.html');
 const css=read('public/vitrine/sde-command-v4.css');
 const start=html.indexOf('function ficheMembre(id) {');
 const stop=html.indexOf('const ouvrirMembre =',start);
 assert.ok(start>=0&&stop>start,'fonction réelle des fiches membres conservée');
 const profile=html.slice(start,stop);
 assert.ok(profile.includes('class="sde-member-profile"'));
 assert.ok(profile.includes('aria-label="Dossier individuel du membre"'));
 assert.ok(profile.includes('</section>'));
 for(const part of ['blocVoyants(m)','blocAssiduite(m)','blocParcours(m)','cotis','data-act="copier-val"','data-act="voir-garnison"']){
  if(part==='data-act="voir-garnison"')assert.ok(profile.includes('data-act="voir-garnison"'),part);
  else assert.ok(profile.includes(part),part);
 }
 assert.match(html,/sde-command-v4\.css\?v=[a-zA-Z0-9_-]+/,'feuille privée versionnée, même après la compilation');
 for(const token of [
  '#sheet:has(.sde-member-profile)',
  '.sde-member-profile .sde-member-phone',
  '.sde-member-profile .kv dd',
  '.sde-member-profile .cot-mois',
  '.sde-member-register .sde-member-row',
  '.sde-member-filters .sel',
  '@media(max-width:390px)',
  'prefers-reduced-motion:reduce',
  'env(safe-area-inset-bottom'
 ])assert.ok(css.includes(token),token);
 assert.ok(css.includes('background:#fffaf0!important'),'champ clair et lisible');
 assert.ok(css.includes('color:#fff9ef!important'),'texte ivoire sur fond sombre');
 assert.equal((css.match(/\\{/g)||[]).length,(css.match(/\\}/g)||[]).length,'accolades CSS équilibrées');
});
