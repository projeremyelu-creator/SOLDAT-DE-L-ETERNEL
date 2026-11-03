import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lectureDeRecetteAutorisee} from '../scripts/recette-lecture-seule.mjs';
import {configurerPurge} from '../scripts/purge-cloudflare.mjs';
import worker from '../src/worker.js';
import {fixture} from './helpers/d1.mjs';

const may=(method,pathname,body)=>lectureDeRecetteAutorisee({method,pathname,body});
test('Recette en production : n’autoriser que les lectures et le formulaire de connexion',()=>{
 assert.equal(may('GET','/api/moi'),true);
 assert.equal(may('HEAD','/administration'),true);
 assert.equal(may('POST','/api/connexion','{}'),true);
 assert.equal(may('POST','/api/sync',JSON.stringify({subs:[{type:'doc',path:'membres/recette',k:'r',rev:0}]})),true);
 assert.equal(may('POST','/api/db',JSON.stringify({op:'query',path:'membres'})),true);
 assert.equal(may('POST','/api/db',JSON.stringify({op:'get',path:'membres/recette'})),true);
 for(const op of ['set','update','delete']){
  assert.equal(may('POST','/api/db',JSON.stringify({op,path:'membres/recette',data:{nom:'test'}})),false);
 }
 assert.equal(may('POST','/api/sync','{"subs":[{"type":"doc","path":123}]}'),false);
 assert.equal(may('POST','/api/sync','not-json'),false);
 assert.equal(may('POST','/api/comptes','{}'),false);
 assert.equal(may('POST','/api/priere','{}'),false);
 assert.equal(may('POST','/api/deconnexion','{}'),false);
 assert.equal(may('PATCH','/api/mon-profil','{}'),false);
 assert.equal(may('POST','/api/db',JSON.stringify({op:'query',path:'membres',data:{payload:'interdit'}})),false);
 const browser=readFileSync('scripts/audit-prive-authentifie.mjs','utf8');
 assert.ok(browser.includes('if(u.origin!==base){blocked.push'));
 assert.ok(browser.includes('lectureDeRecetteAutorisee'));
 assert.ok(!browser.includes("if(u.origin!==base)return route.continue()"));
});
test('Cache Cloudflare : jeton de purge indépendant, zone validée et pas de secret en rapport',()=>{
 const deploy='JetonDeploySDE_Test_0123456789';
 const purge='JetonPurgeZone_Test_9876543210';
 const zone='a'.repeat(32);
 const x=configurerPurge({CLOUDFLARE_API_TOKEN:deploy,CLOUDFLARE_CACHE_PURGE_TOKEN:purge,CLOUDFLARE_ZONE_ID:zone});
 assert.equal(x.headers.authorization,'Bearer '+purge);
 assert.equal(x.zoneId,zone);
 assert.equal(x.tokenDedie,true);
 assert.equal(configurerPurge({CLOUDFLARE_API_TOKEN:deploy}).zoneId,null);
 assert.throws(()=>configurerPurge({CLOUDFLARE_API_TOKEN:deploy,CLOUDFLARE_ZONE_ID:'bad'}),/zone Cloudflare invalide/);
 const workflow=readFileSync('.github/workflows/deployer.yml','utf8');
 assert.ok(workflow.includes('secrets.CLOUDFLARE_CACHE_PURGE_TOKEN'));
 assert.ok(workflow.includes('secrets.CLOUDFLARE_ZONE_ID'));
});
test('Protection serveur : session, rôles et absence de cache des pages privées',async()=>{
 const f=fixture();
 try{
  f.account('user','soldat');f.account('staff','contributeur');f.account('admin','admin');
  const req=async(path,user)=>worker.fetch(new Request('https://mouvement-sde.org'+path,{
   headers:user?{cookie:'sde_s='+user}:{}
  }),f.env,{waitUntil(){}});
  const anon=await req('/administration');
  assert.equal(anon.status,302);
  assert.equal(new URL(anon.headers.get('location')).pathname,'/connexion');
  assert.match(anon.headers.get('cache-control')||'',/no-store/);
  assert.equal((await req('/administration','user')).status,403);
  assert.equal((await req('/administration','staff')).status,200);
  const ok=await req('/administration','admin');
  assert.equal(ok.status,200);
  assert.match(ok.headers.get('cache-control')||'',/no-store/);
  assert.match(ok.headers.get('x-robots-tag')||'',/noindex/);
 }finally{f.close()}
});
