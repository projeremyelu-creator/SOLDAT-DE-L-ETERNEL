import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './helpers/d1.mjs';
import worker from '../src/worker.js';

async function signIn(f,username,password) {
 const r=await f.request('/api/connexion',null,'POST',{email:username,motDePasse:password});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.match(/sde_s=([^;]+)/)?.[1]||''};
}
async function session(f,token,path,method='GET',body){
 return worker.fetch(new Request('https://mouvement-sde.org'+path,{
  method,headers:{cookie:'sde_s='+token,origin:'https://mouvement-sde.org','content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 }),f.env,{waitUntil(){}});
}
test('Administrateur seulement : aperçu non destructif puis accès distincts depuis les fiches',async()=>{
 const f=fixture();
 try{
  f.account('chef','admin');f.account('soldat','soldat');f.account('responsable','contributeur');
  f.doc('membres/one',{nom:'KOUASSI',prenoms:'Marie',email:'marie.sde@example.org',matricule:'SDE-CI-2026',actif:true,telephone:'0102030405',pole:'Réveil'});
  f.doc('membres/two',{nom:'KOFFI',prenoms:'Luc',email:'luc@example.org',matricule:'SDE-CI-2027',actif:true});
  assert.equal((await f.call('/api/comptes/membres',null,'POST',{simuler:true})).status,403);
  assert.equal((await f.call('/api/comptes/membres','soldat','POST',{simuler:false})).status,403);
  assert.equal((await f.call('/api/comptes/membres','responsable','POST',{simuler:false})).status,403);
  const dry=await f.call('/api/comptes/membres','chef','POST',{simuler:true});
  assert.equal(dry.status,200);assert.equal(dry.body.acreer,2);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes WHERE role=?').get('soldat').n,1);
  const result=await f.call('/api/comptes/membres','chef','POST',{simuler:false});
  assert.equal(result.status,200);assert.equal(result.body.crees.length,2);
  assert.notEqual(result.body.crees[0].motDePasse,result.body.crees[1].motDePasse);
  assert.ok(result.body.crees.every(x=>x.motDePasse.length>=12));
  const row=f.sql.prepare('SELECT mdp,membreId,matricule,role,id FROM comptes WHERE email=?').get('marie.sde@example.org');
  assert.equal(row.membreId,'one');assert.equal(row.matricule,'SDE-CI-2026');assert.equal(row.role,'soldat');
  assert.match(row.mdp,/^pbkdf2\$/);assert.equal(row.mdp.includes(result.body.crees[0].motDePasse),false);
  const member=JSON.parse(f.sql.prepare('SELECT data FROM docs WHERE path=?').get('membres/one').data);
  assert.equal(member.nom,'KOUASSI');assert.equal(member.telephone,'0102030405');assert.equal(member.pole,'Réveil');
  assert.equal(member.compteId,row.id);
  assert.equal((await f.call('/api/comptes/membres','chef','POST',{simuler:false})).body.crees.length,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes WHERE membreId=?').get('one').n,1);
 }finally{f.close()}
});
test('Une fiche sans e-mail conserve ses coordonnées et reçoit une connexion par matricule',async()=>{
 const f=fixture();
 try{
  f.account('chef','admin');
  f.doc('membres/no-mail',{nom:'ZEREOUE',prenoms:'Emmanuel',telephone:'0708070900',pole:'Formation',actif:true});
  const r=await f.call('/api/comptes/membres','chef','POST',{simuler:false});
  assert.equal(r.status,200);assert.equal(r.body.crees.length,1);
  const issued=r.body.crees[0];
  assert.equal(issued.email,'');assert.match(issued.matricule,/^\d{6}$/);
  const row=f.sql.prepare('SELECT email,membreId FROM comptes WHERE membreId=?').get('no-mail');
  assert.match(row.email,/^fiche-[0-9a-f]+@membres\.sde\.invalid$/);
  const d=JSON.parse(f.sql.prepare('SELECT data FROM docs WHERE path=?').get('membres/no-mail').data);
  assert.equal(d.email,undefined);assert.equal(d.telephone,'0708070900');assert.equal(d.pole,'Formation');
  const connected=await signIn(f,issued.matricule,issued.motDePasse);
  assert.equal(connected.status,200);assert.equal(connected.body.changerMotDePasse,true);
 }finally{f.close()}
});
test('Première connexion : les pages, fichiers et APIs privées restent fermés jusqu’au mot de passe personnel',async()=>{
 const f=fixture();
 try{
  f.account('chef','admin');
  f.doc('membres/membre',{nom:'MORIBA',prenoms:'Danielle',matricule:'SDE-CI-2099',actif:true});
  const creation=(await f.call('/api/comptes/membres','chef','POST',{simuler:false})).body.crees[0];
  const signed=await signIn(f,creation.matricule,creation.motDePasse);
  assert.equal(signed.status,200);assert.equal(signed.body.changerMotDePasse,true);assert.ok(signed.cookie);
  const moi=await (await session(f,signed.cookie,'/api/moi')).json();
  assert.equal(moi.mdpTemporaire,true);
  for(const path of ['/mon-espace','/administration','/connexion','/portail']){
   const resp=await session(f,signed.cookie,path);
   assert.equal(resp.status,302,path);
   assert.equal(new URL(resp.headers.get('location')).pathname,'/mot-de-passe',path);
  }
  const change=await session(f,signed.cookie,'/mot-de-passe');
  assert.equal(change.status,200);assert.match(change.headers.get('cache-control'),/no-store/);
  for(const path of ['/api/mon-espace','/api/mon-historique','/api/notifications-status','/api/comptes/membres']){
   assert.equal((await session(f,signed.cookie,path)).status,403,path);
  }
  assert.equal((await session(f,signed.cookie,'/api/db','POST',{op:'get',path:'membres/membre'})).status,403);
  assert.equal((await session(f,signed.cookie,'/m/any')).status,403);
  assert.equal((await session(f,signed.cookie,'/api/mot-de-passe','POST',{ancien:creation.motDePasse,nouveau:creation.motDePasse})).status,400);
  assert.equal((await session(f,signed.cookie,'/api/mot-de-passe','POST',{ancien:creation.motDePasse,nouveau:'shortpass'})).status,400);
  assert.equal((await session(f,signed.cookie,'/api/mot-de-passe','POST',{ancien:'bad-password',nouveau:'UnePhraseLongueEtPrivee2026!'})).status,401);
  const changed=await session(f,signed.cookie,'/api/mot-de-passe','POST',{ancien:creation.motDePasse,nouveau:'UnePhraseLongueEtPrivee2026!'});
  assert.equal(changed.status,200);assert.equal((await changed.json()).ok,true);
  assert.equal((await (await session(f,signed.cookie,'/api/moi')).json()).mdpTemporaire,false);
  assert.equal((await session(f,signed.cookie,'/mon-espace')).status,200);
  assert.equal((await session(f,signed.cookie,'/api/mon-espace')).status,200);
  assert.equal((await signIn(f,creation.matricule,'UnePhraseLongueEtPrivee2026!')).status,200);
  assert.equal((await signIn(f,creation.matricule,creation.motDePasse)).status,401);
 }finally{f.close()}
});
test('Pages de comptes : connexion obligatoire, permissions admin et absence de cache',async()=>{
 const f=fixture();
 try{
  f.account('chef','admin');f.account('soldat','soldat');
  const anon=await f.request('/comptes-membres');
  assert.equal(anon.status,302);
  assert.equal(new URL(anon.headers.get('location')).pathname,'/connexion');
  assert.equal((await f.request('/comptes-membres','soldat')).status,403);
  const admin=await f.request('/comptes-membres','chef');
  assert.equal(admin.status,200);assert.match(admin.headers.get('cache-control'),/no-store/);
  assert.match(admin.headers.get('x-robots-tag'),/noindex/);
  assert.equal((await f.request('/mot-de-passe',null)).status,302);
  assert.equal((await f.request('/mot-de-passe','soldat')).status,200);
 }finally{f.close()}
});
test('Doublons et fiches inactives : aucune écriture ni élévation de privilège',async()=>{
 const f=fixture();
 try{
  f.account('chef','admin');f.account('existant','soldat');
  f.doc('membres/inactive',{nom:'Inactif',email:'inactive@example.org',actif:false});
  f.doc('membres/existing',{nom:'Existant',email:'existant@example.org',actif:true});
  f.doc('membres/linked',{nom:'Lié',email:'linked@example.org',compteId:'id-ancien',actif:true});
  f.doc('membres/dupe-a',{nom:'A',email:'dupe@example.org',actif:true});
  f.doc('membres/dupe-b',{nom:'B',email:'dupe@example.org',actif:true});
  const dry=(await f.call('/api/comptes/membres','chef','POST',{simuler:true})).body;
  assert.equal(dry.apercu.length,1);
  const result=(await f.call('/api/comptes/membres','chef','POST',{simuler:false})).body;
  assert.equal(result.crees.length,1);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes WHERE email=?').get('dupe@example.org').n,1);
  assert.ok(result.ignores.some(x=>x.raison.includes('inactive')||x.raison.includes('inactive')));
  assert.equal(f.sql.prepare('SELECT role FROM comptes WHERE email=?').get('dupe@example.org').role,'soldat');
 }finally{f.close()}
});
test('Interface de connexion et sécurité du parcours',()=>{
 const native=readFileSync('public/index.html','utf8');
 const login=readFileSync('public/vitrine/portail-connexion.js','utf8');
 const html=readFileSync('public/vitrine/mot-de-passe.html','utf8');
 const backend=readFileSync('src/worker.js','utf8');
 assert.ok(native.includes('Matricule SDE ou adresse e-mail'));
 assert.ok(native.includes('r?.changerMotDePasse'));
 assert.ok(login.includes('me.mdpTemporaire'));
 assert.ok(html.includes('minlength="12"'));
 assert.ok(backend.includes('if (u.connecte && await mdpTemporaire(env,u.email))'));
 assert.ok(!readFileSync('src/comptes-membres.js','utf8').includes('Math.random()'));
});
