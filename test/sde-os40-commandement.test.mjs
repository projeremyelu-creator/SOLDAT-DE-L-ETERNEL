import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');
const portal=read('public/vitrine/portail-direct.js');
const command=read('public/vitrine/sde-command-v4.js');
const css=read('public/vitrine/sde-command-v4.css');

async function simulate(path,level){
 const ids=['accueil','synthese','membres','scanner','finances','garnisons','academie','portevoix','chambre','agenda','arsenal','priere'];
 const nodes=ids.map((id,i)=>'<button type="button" data-vue="'+id+'"'+(i===0?' aria-current="page" class="on"':'')+'>'+id+'</button>').join('');
 const html='<html><body><button id="btn-reglages">Réglages</button><button id="btn-compte">Mon compte</button><div class="shell"><nav id="nav">'+nodes+'</nav><main id="main" tabindex="-1"><h1>Dashboard</h1></main></div></body></html>';
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/'+path,runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async()=>({ok:true,json:async()=>({connecte:true,niveau:level,role:level?'admin':'soldat',membreId:'test'})});
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
