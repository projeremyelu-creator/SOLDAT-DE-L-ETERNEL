import {test} from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/d1.mjs';
const demande={nom:'Esther',tel:'+225 07 00 00 00 00',objet:'Holy Brunch'};
test('Demandes : propriétaire seul par défaut, secrétariat désigné après activation par un administrateur',async()=>{
 const f=fixture();try{
  f.account('owner','proprietaire');f.account('bob','contributeur');f.account('admin','admin');
  assert.equal((await f.call('/api/engager','admin','POST',demande)).body.ok,true);
  assert.equal((await f.call('/api/engager-admin','bob')).status,403);
  assert.equal((await f.call('/api/engager-admin','owner')).body.engagements.length,1);
  // un contributeur ne peut ni activer ni lire les réglages
  assert.equal((await f.call('/api/db','bob','POST',{op:'set',path:'reglages_site/secretariat',data:{actif:true,emails:['bob@example.org']}})).status,403);
  assert.equal((await f.call('/api/db','bob','POST',{op:'get',path:'reglages_site/secretariat'})).body.exists,false);
  // l'administrateur désigne bob : accès accordé à lui seul
  assert.equal((await f.call('/api/db','admin','POST',{op:'set',path:'reglages_site/secretariat',data:{actif:true,emails:['bob@example.org']}})).body.ok,true);
  const lu=await f.call('/api/engager-admin','bob');assert.equal(lu.status,200);assert.equal(lu.body.engagements[0].nom,'Esther');
  assert.equal((await f.call('/api/engager-admin','admin')).status,403);
  // désactivation : l'accès est retiré immédiatement
  await f.call('/api/db','admin','POST',{op:'set',path:'reglages_site/secretariat',data:{actif:false,emails:['bob@example.org']}});
  assert.equal((await f.call('/api/engager-admin','bob')).status,403);
 }finally{f.close()}
});
test('Demandes : responsable du suivi enregistré, champ piège ignoré',async()=>{
 const f=fixture();try{
  f.account('owner','proprietaire');
  assert.equal((await f.call('/api/engager',null,'POST',{...demande,piege:'http://spam.example'})).body.ok,true);
  assert.equal((await f.call('/api/engager-admin','owner')).body.engagements.length,0);
  await f.call('/api/engager',null,'POST',demande);
  const [d]=(await f.call('/api/engager-admin','owner')).body.engagements;
  assert.equal((await f.call('/api/engager-admin','owner','PATCH',{id:d.id,traite:0,note:'',responsable:'Sœur Ruth'})).body.ok,true);
  assert.equal((await f.call('/api/engager-admin','owner')).body.engagements[0].responsable,'Sœur Ruth');
 }finally{f.close()}
});
test('Demandes : accusé de réception à la personne et alerte immédiate au secrétariat désigné',async()=>{
 const f=fixture(),envoyes=[];try{
  f.env.NOTIFICATION_FROM='no-reply@mouvement-sde.org';f.env.EMAIL={send:async m=>{envoyes.push(m)}};
  f.account('admin','admin');
  f.doc('site/contact',{email:'contact@mouvement-sde.org'});
  await f.call('/api/db','admin','POST',{op:'set',path:'reglages_site/secretariat',data:{actif:true,emails:['Secretaire@Example.org','pas-un-mail']}});
  envoyes.length=0;
  assert.equal((await f.call('/api/engager',null,'POST',{...demande,email:'esther@example.org'})).body.ok,true);
  const ack=envoyes.find(m=>m.to==='esther@example.org');
  assert.ok(ack&&/bien reçu/.test(ack.text)&&ack.text.includes('contact@mouvement-sde.org'));
  const alerte=envoyes.find(m=>m.to==='secretaire@example.org');
  assert.ok(alerte&&/Holy Brunch/.test(alerte.subject)&&alerte.text.includes('Esther'));
  assert.ok(!envoyes.some(m=>m.to==='pas-un-mail'));
 }finally{f.close()}
});
