import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');
const js=read('public/vitrine/portail-direct.js');
const css=read('public/vitrine/sde-poste-commandement-v2.css');
const app=read('public/index.html');

async function simulated(mode,niveau){
 const sections=['accueil','synthese','membres','chambre','agenda','academie','arsenal','espace','finances','scanner','mur','preferences'];
 const html='<html><body><button id="btn-reglages"></button><button id="btn-compte"></button><div class="shell"><nav id="nav">'+
  sections.map(id=>'<button type="button" data-vue="'+id+'"'+(id==='accueil'?' class="on" aria-current="page"':'')+'>'+id+'</button>').join('')+
  '</nav><main id="main" tabindex="-1"><h1 class="sec-title">Espace</h1></main></div></body></html>';
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/'+mode,runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async(url)=>({ok:url==='/api/moi',json:async()=>({connecte:true,niveau,membreId:'fictif',role:niveau?'Administrateur':'Membre'})});
 w.matchMedia=()=>({matches:true});
 w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true'};
 w.eval(js);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(let i=0;i<10&&!w.SDEPortal;i++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(w.SDEPortal,'Le portail doit confirmer la session de test');
 return dom;
}
test('Portail réel : liens groupés, navigation compacte et focus clavier',async()=>{
 const dom=await simulated('administration',2),w=dom.window,d=w.document;
 try{
  const nav=d.querySelector('#sde-direct-top .sde-direct-head-links');
  assert.ok(nav);
  assert.deepEqual([...nav.querySelectorAll('a')].map(x=>x.textContent),['Site public','Mon espace','Administration']);
  assert.equal(nav.querySelector('.sde-direct-admin-link').hidden,false);
  assert.ok(d.querySelector('.sde-direct-gear'));
  assert.ok(d.querySelector('.sde-direct-account'));
  const toggle=d.getElementById('sde-direct-menu-toggle');
  toggle.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.ok(d.getElementById('sde-direct-tabs').classList.contains('sde-direct-tabs-open'));
  const section=d.querySelector('#sde-direct-tabs [data-module="membres"]');
  assert.ok(section,'La rubrique Membres doit être accessible');
  section.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(w.document.activeElement.id,'main');
  assert.equal(d.getElementById('main').dataset.scrolled,'true');
  assert.equal(new URL(w.location.href).searchParams.get('module'),'membres');
 }finally{w.close();}
});
test('Membre : pas de lien actif Administration ni de rubriques de gouvernance',async()=>{
 const dom=await simulated('mon-espace',0),w=dom.window,d=w.document;
 try{
  assert.ok(d.querySelector('.sde-direct-admin-link').hidden);
  assert.equal(d.querySelector('#sde-direct-tabs [data-module="membres"]'),null);
  assert.equal(d.querySelector('#sde-direct-tabs [data-module="finances"]'),null);
  assert.ok(d.querySelector('#sde-direct-tabs [data-module="priere"]'));
 }finally{w.close();}
});
test('Le CSS du vrai portail est chargé et ne touche pas aux routes serveur',()=>{
 assert.equal(app.split('href="/vitrine/sde-poste-commandement-v2.css').length-1,1);
 assert.ok(css.includes('.sde-direct-head-links'));
 assert.ok(css.includes('.sde-direct .main'));
 assert.ok(css.includes('grid-template-areas:"logo gear account" "links links links"'));
 assert.ok(css.includes('env(safe-area-inset-bottom)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 const worker=read('src/worker.js');
 assert.ok(worker.includes('p.startsWith("/administration") && u.niveau < 1'));
});


test('Barre de menu mobile : cinq choix lisibles, icônes et Plus ouvre les rubriques',async()=>{
 const dom=await simulated('mon-espace',0),w=dom.window,d=w.document;
 try{
  const nav=d.getElementById('sde-direct-bottom-nav');
  assert.ok(nav,'barre basse montée sur le portail membre');
  assert.equal(nav.hidden,false,'affichée seulement après vérification du compte');
  const actions=[...nav.querySelectorAll('button')];
  assert.deepEqual(actions.map(x=>x.textContent),['Accueil','Prière','Academy','Agenda','Plus']);
  assert.equal(actions.length,5);
  assert.ok(actions.every(x=>x.querySelector('svg[aria-hidden=true]')),'chaque action possède son pictogramme');
  const plus=nav.querySelector('[data-bottom-more]');
  assert.equal(plus.getAttribute('aria-expanded'),'false');
  plus.click();
  assert.equal(plus.getAttribute('aria-expanded'),'true');
  assert.equal(d.getElementById('sde-direct-menu-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(d.getElementById('sde-direct-tabs').classList.contains('sde-direct-tabs-open'));
  plus.click();
  assert.equal(plus.getAttribute('aria-expanded'),'false');
  assert.equal(d.getElementById('sde-direct-tabs').classList.contains('sde-direct-tabs-open'),false);
 }finally{w.close()}
});

test('Barre membre : prière active et aucun module direction exposé',async()=>{
 const dom=await simulated('mon-espace',0),w=dom.window,d=w.document;
 try{
  const nav=d.getElementById('sde-direct-bottom-nav');
  assert.ok(!nav.textContent.includes('Finances'));
  assert.equal(nav.querySelector('[data-module="membres"]'),null);
  nav.querySelector('[data-module="priere"]').click();
  assert.equal(d.getElementById('sde-priere-panel').hidden,false);
  assert.equal(nav.querySelector('[data-module="priere"]').getAttribute('aria-current'),'page');
 }finally{w.close()}
});

test('Barre administrateur : accès Finances autorisé, Missions pour les responsables sans droit Finance',async()=>{
 const admin=await simulated('administration',2);
 const responsable=await simulated('administration',1);
 try{
  assert.deepEqual([...admin.window.document.querySelectorAll('#sde-direct-bottom-nav button')].map(b=>b.textContent),
    ['Accueil','Membres','Agenda','Finances','Plus']);
  assert.deepEqual([...responsable.window.document.querySelectorAll('#sde-direct-bottom-nav button')].map(b=>b.textContent),
    ['Accueil','Membres','Agenda','Missions','Plus']);
  const nav=admin.window.document.getElementById('sde-direct-bottom-nav');
  const membres=nav.querySelector('[data-module="membres"]');
  membres.click();
  assert.equal(membres.getAttribute('aria-current'),'page');
  assert.equal(admin.window.document.getElementById('sde-direct-menu-toggle').getAttribute('aria-expanded'),'false');
 }finally{admin.window.close();responsable.window.close()}
});

test('La barre de navigation mobile est contrôlée par CSS et respecte les zones sûres',()=>{
 const styles=read('public/vitrine/sde-poste-commandement-v2.css');
 assert.match(styles,/sde-direct-bottom-nav/);
 assert.match(styles,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(styles,/env\(safe-area-inset-bottom\)/);
 assert.match(styles,/sde-direct-bottom-nav\[hidden\]/);
 assert.match(styles,/@media\(max-width:760px\)/);
});
