import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/d1.mjs';
const setup=()=>{const f=fixture();f.account('alice');f.account('bob');f.account('admin','admin');return f};
const publish=async(f,data={})=>(await f.call('/api/mur-priere','alice','POST',{sujet:'Paix dans notre communauté',anonyme:true,consentement:true,...data}));
test('Mur : accès authentifié et consentement explicite avant tout partage',async()=>{const f=setup();try{
 assert.equal((await f.call('/api/mur-priere')).status,401);
 assert.equal((await publish(f,{consentement:false})).status,400);
 assert.equal((await publish(f,{sujet:' '})).status,400);
 assert.equal((await publish(f,{sujet:'x'.repeat(601)})).status,400);
}finally{f.close()}});
test('Mur : modération obligatoire et anonymat sans fuite d’identité',async()=>{const f=setup();try{
 const created=await publish(f);assert.equal(created.status,200);const id=created.body.id;
 assert.equal((await f.call('/api/mur-priere','bob')).body.prieres.length,0);
 assert.equal((await f.call('/api/mur-priere/'+id+'/moderation','bob','POST',{statut:'publie'})).status,403);
 assert.equal((await f.call('/api/mur-priere/'+id+'/moderation','admin','POST',{statut:'publie'})).status,200);
 const body=(await f.call('/api/mur-priere','bob')).body;assert.equal(body.prieres.length,1);assert.equal(body.prieres[0].auteur,'Anonyme');
 for(const token of ['alice','email','Compte alice'])assert.ok(!JSON.stringify(body).includes(token),token);
 f.doc('prieres_conf/conf',{sujet:'SECRET LEADER',pourId:'alice'});
 assert.ok(!JSON.stringify((await f.call('/api/mur-priere','admin')).body).includes('SECRET LEADER'));
}finally{f.close()}});
test('Mur : une réaction par compte, notification personnelle et aucun sujet dans la notification',async()=>{const f=setup();try{
 const id=(await publish(f)).body.id;await f.call('/api/mur-priere/'+id+'/moderation','admin','POST',{statut:'publie'});
 assert.equal((await f.call('/api/mur-priere/'+id+'/prier','alice','POST',{})).status,400);
 for(let i=0;i<2;i++)assert.equal((await f.call('/api/mur-priere/'+id+'/prier','bob','POST',{})).body.total,1);
 const wall=(await f.call('/api/mur-priere','bob')).body;assert.equal(wall.prieres[0].jePrie,true);
 const alice=(await f.call('/api/mur-priere','alice')).body;assert.equal(alice.notifications.length,1);
 assert.equal(alice.notifications[0].total,1);assert.ok(!JSON.stringify(alice.notifications).includes('Paix'));
 assert.equal((await f.call('/api/mur-priere','bob')).body.notifications.length,0);
 await f.call('/api/mur-priere/'+id,'alice','DELETE');
 assert.equal((await f.call('/api/mur-priere','bob')).body.prieres.length,0);
 assert.equal((await f.call('/api/mur-priere/'+id+'/prier','bob','POST',{})).status,404);
}finally{f.close()}});
test('Mur : auteur nominatif issu du compte, retrait interdit à un autre membre',async()=>{const f=setup();try{
 const id=(await publish(f,{anonyme:false,auteur:'Faux nom'})).body.id;
 assert.equal((await f.call('/api/mur-priere/'+id,'bob','DELETE')).status,403);
 await f.call('/api/mur-priere/'+id+'/moderation','admin','POST',{statut:'publie'});
 const p=(await f.call('/api/mur-priere','bob')).body.prieres[0];assert.equal(p.auteur,'Compte alice');assert.equal(p.mien,false);
}finally{f.close()}});
test('Portail unique : destination calculée par le rôle serveur et retour membre conservé',async()=>{const f=setup();try{
 for(const [id,want]of [[null,'/connexion?retour=%2Fportail'],['alice','/mon-espace'],['admin','/administration']]){
 const r=await f.request('/portail',id);assert.equal(r.status,302);assert.equal(new URL(r.headers.get('location')).pathname+new URL(r.headers.get('location')).search,want);
 }
 const r=await f.request('/connexion','admin');assert.equal(new URL(r.headers.get('location')).pathname,'/administration');
 const explicit=await f.request('/connexion?retour=%2Fmon-espace','admin');assert.equal(new URL(explicit.headers.get('location')).pathname,'/mon-espace');
}finally{f.close()}});
test('Mur : une validation concurrente ne peut pas republier un sujet retiré',async()=>{const f=setup();try{
 const id=(await publish(f)).body.id;
 const prepare=f.env.DB.prepare;
 f.env.DB.prepare=query=>{
  const stmt=prepare(query);
  if(query==='SELECT * FROM sde_mur_prieres WHERE id=?')return {bind(...args){const bound=stmt.bind(...args);return {...bound,first:async()=>{const row=await bound.first();f.sql.prepare("UPDATE sde_mur_prieres SET statut='retire' WHERE id=?").run(id);return row}}}};
  return stmt;
 };
 const r=await f.call('/api/mur-priere/'+id+'/moderation','admin','POST',{statut:'publie'});
 assert.equal(r.status,409);
 assert.equal(f.sql.prepare('SELECT statut FROM sde_mur_prieres WHERE id=?').get(id).statut,'retire');
}finally{f.close()}});
