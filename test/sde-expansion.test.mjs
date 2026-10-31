import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './helpers/d1.mjs';

test('Huit pages du développement SDE 4.2 sont présentes, accessibles et documentées',()=>{
 const map=['soutenir','transparence','reseau','communaute','gouvernance','calendrier','rechercher','newsletter'];
 const code=readFileSync('src/worker.js','utf8');
 for(const p of map){
  const html=readFileSync('public/vitrine/'+p+'.html','utf8');
  assert.match(html,/<main\b/i,p);
  assert.match(html,new RegExp('href="/vitrine/sde-hub.css'),p);
  assert.ok(code.includes('"/'+p+'": "/vitrine/'+p+'.html"'),p);
 }
});
test('Soutien : pas de faux don, suivi et contrôle administrateur',async()=>{
 const f=fixture();
 try{
  const status=await f.call('/api/sde-demarches/statut');
  assert.equal(status.status,200);
  assert.equal(status.body.paiementsActifs,false);
  const invalid=await f.call('/api/sde-demarches',null,'POST',{type:'soutien',email:'x@example.org',projet:'in-fire-2027',montant:5000,message:'Je souhaite contribuer',consentement:false});
  assert.equal(invalid.status,400);
  const ok=await f.call('/api/sde-demarches',null,'POST',{type:'soutien',nom:'Test',email:'x@example.org',projet:'in-fire-2027',montant:5000,message:'Je souhaite soutenir le programme',consentement:true});
  assert.equal(ok.status,201);
  assert.equal(ok.body.paiementEffectue,false);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM sde_demarches').get().n,1);
  f.account('admin','admin');f.account('owner','proprietaire');
  assert.equal((await f.call('/api/sde-demarches/demandes')).status,403);
  assert.equal((await f.call('/api/sde-demarches/demandes','admin')).body.demandes.length,1);
 }finally{f.close()}
});
test('Confidentialité : signalement invisible aux visiteurs et responsables non propriétaires',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');f.account('owner','proprietaire');
  const x=await f.call('/api/sde-demarches',null,'POST',{type:'signalement',message:'Signalement de situation à examiner avec discrétion et suivi.',consentement:true});
  assert.equal(x.status,201);
  assert.equal((await f.call('/api/sde-demarches/demandes?type=signalement')).status,403);
  assert.equal((await f.call('/api/sde-demarches/demandes?type=signalement','admin')).status,403);
  const admin=await f.call('/api/sde-demarches/demandes','admin');
  assert.ok(!JSON.stringify(admin.body).includes('Signalement de situation'));
  const owner=await f.call('/api/sde-demarches/demandes?type=signalement','owner');
  assert.equal(owner.status,200);
  assert.equal(owner.body.demandes.length,1);
 }finally{f.close()}
});
test('Protection : tailles, origine externe et champs incorrects',async()=>{
 const f=fixture();
 try{
  const bad=await f.call('/api/sde-demarches',null,'POST',{type:'implantation',pays:'Italie',ville:'Rome',email:'bad@@',message:'Projet de rencontre et développement de point',consentement:true});
  assert.equal(bad.status,400);
  const oversized=await f.call('/api/sde-demarches',null,'POST',{type:'newsletter',email:'x@example.org',consentement:true,message:'x'.repeat(10000)});
  assert.equal(oversized.status,413);
  const response=await f.request('/api/sde-demarches',null,'GET');
  assert.equal(response.status,405);
 }finally{f.close()}
});
test('Newsletter : statut en attente de confirmation, sans envoi fictif',async()=>{
 const f=fixture();
 try{
  const r=await f.call('/api/sde-demarches',null,'POST',{type:'newsletter',email:'newsletter@example.org',consentement:true,message:'Souhait de recevoir la newsletter'});
  assert.equal(r.status,201);
  assert.equal(r.body.statut,'en_attente_confirmation');
 }finally{f.close()}
});
