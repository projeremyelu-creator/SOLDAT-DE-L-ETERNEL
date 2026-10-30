import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const source=readFileSync('public/sw.js','utf8');
function workerHarness(){
 const handlers=new Map(),writes=[],deleted=[],notices=[];
 const origin='https://app.mouvement-sde.org';
 const cache={
  put:async(req,response)=>writes.push({url:typeof req==='string'?req:req.url,status:response.status}),
  match:async()=>null,
  keys:async()=>[]
 };
 const caches={
  open:async()=>cache,match:async()=>null,
  keys:async()=>['sde-v11','sde-v12-public-only-20261030'],
  delete:async key=>{deleted.push(key);return true;}
 };
 const self={
  location:{origin},
  addEventListener:(name,cb)=>handlers.set(name,cb),
  skipWaiting:async()=>{},
  clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async u=>u},
  registration:{showNotification:async(_title,options)=>{notices.push(options);}}
 };
 const fetch=async req=>{
  const path=new URL(typeof req==='string'?req:req.url,origin).pathname;
  return new Response(path==='/programmes'?'<html><body>Public</body></html>':'static',{
   status:200,headers:{'content-type':path==='/programmes'?'text/html':'text/css'}
  });
 };
 vm.runInNewContext(source,{self,caches,fetch,Response,URL,console});
 const event=(path,mode='navigate')=>{
  let promise;
  handlers.get('fetch')({
   request:{url:origin+path,method:'GET',mode},
   respondWith:p=>{promise=p;}
  });
  return promise;
 };
 return {handlers,writes,deleted,notices,event};
}

test('Le cache PWA privé refuse explicitement tous les accès personnels',()=>{
 const sw=workerHarness();
 for(const path of ['/', '/connexion','/mon-espace','/mon-espace/outils','/administration','/administration/os-v31',
   '/api/moi','/api/notifications-status','/formulaire','/pastoral/notes']){
  assert.equal(sw.event(path),undefined,'route non interceptée : '+path);
 }
 assert.equal(sw.writes.length,0);
});

test('La PWA ne conserve que des pages publiques explicitement autorisées',async()=>{
 const sw=workerHarness();
 const promise=sw.event('/programmes');
 assert.ok(promise,'la page programmes publique est interceptée');
 const response=await promise;
 assert.equal(response.status,200);
 assert.deepEqual(sw.writes.map(x=>new URL(x.url).pathname),['/programmes']);
});

test('Mise à jour PWA : effacement du cache historique potentiellement sensible',async()=>{
 const sw=workerHarness();
 let promise;
 sw.handlers.get('activate')({waitUntil:p=>{promise=p;}});
 await promise;
 assert.ok(sw.deleted.includes('sde-v11'));
 assert.equal(sw.deleted.includes('sde-v12-public-only-20261030'),false);
});

test('Notification : une destination extérieure ne peut être ouverte',async()=>{
 const sw=workerHarness();
 let promise;
 sw.handlers.get('push')({
  data:{json:()=>({title:'Notification SDE',body:'Information',url:'https://example.com/private'})},
  waitUntil:p=>{promise=p;}
 });
 await promise;
 assert.equal(sw.notices.length,1);
 assert.equal(sw.notices[0].data.url,'/mon-espace');
});
