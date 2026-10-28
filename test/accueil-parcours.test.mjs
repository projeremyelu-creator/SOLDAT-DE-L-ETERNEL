import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('public/vitrine/portail.html','utf8');
const script=readFileSync('public/vitrine/portail-unifie.js','utf8');
const event=(extra={})=>({id:'e1',titre:'Rencontre SDE',type:'Conférence',date:'2099-10-31',heure:'08:30',fin:'',lieu:'Abidjan',description:'',...extra});
async function page(events,{failure=false}={}){
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/',runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async()=>{if(failure)throw Error('offline');return {ok:true,json:async()=>({evenements:events})}};
 w.eval(script);
 if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,0));
 return dom;
}
// Catch missing dynamic rendering and incorrect chronological selection.
test('Accueil : la carte retient la première date à venir et renvoie à l’agenda',async()=>{
 const dom=await page([event({date:'2099-11-02',titre:'Plus tard'}),event()]);
 try{
  const d=dom.window.document;
  assert.equal(d.querySelector('#event-title')?.textContent,'Rencontre SDE');
  assert.equal(d.querySelector('#event-date')?.getAttribute('datetime'),'2099-10-31');
  assert.match(d.querySelector('#event-date').textContent,/31 octobre 2099/);
  assert.equal(d.querySelector('#event-time').textContent,'08:30');
  assert.equal(d.querySelector('#event-place').textContent,'Abidjan');
  assert.equal(d.querySelector('#event-action').getAttribute('href'),'/programmes#agenda');
 }finally{dom.window.close()}
});
// Catch stale dated events, malformed data and failure states that hide useful navigation.
for(const [name,events,options]of [
 ['dates passées',[event({date:'2020-01-01'})],{}],
 ['date impossible',[event({date:'2099-02-30'})],{}],
 ['date absente',[event({date:null})],{}],
 ['aucun événement',[],{}],
 ['entrée invalide',[null],{}],
 ['panne réseau',[],{failure:true}]
])test('Accueil : repli utile pour '+name,async()=>{
 const dom=await page(events,options);
 try{
  const d=dom.window.document;
  assert.equal(d.querySelector('#event-details')?.hidden,true);
  assert.equal(d.querySelector('#event-action')?.getAttribute('href'),'/programmes');
  assert.ok(d.querySelector('#event-status').textContent.length>10);
 }finally{dom.window.close()}
});
// Catch unsafe HTML injection and absent fields shown as undefined.
test('Accueil : les titres restent du texte et les informations manquantes sont masquées',async()=>{
 const dom=await page([event({titre:'<img src=x onerror=alert(1)>',heure:'',lieu:''})]);
 try{
  const d=dom.window.document;
  assert.equal(d.querySelector('#event-title')?.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(d.querySelector('#event-title img'),null);
  assert.equal(d.querySelector('#event-time').hidden,true);
  assert.equal(d.querySelector('#event-place').hidden,true);
 }finally{dom.window.close()}
});
