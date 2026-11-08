import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/d1.mjs';

const nouveau=(email='nouveau@example.org')=>({
 nom:'KOUADIO',prenoms:'Mariam',email,telephone:'+2250700000000',
 motDePasse:'motDePasseUniqueLong2026'
});

test('Inscription : refus de toute création sans consentement explicite',async()=>{
 const f=fixture();
 try{
  for(const valeur of [undefined,false,'non',null,0]){
   const donnees={...nouveau()};
   if(valeur!==undefined)donnees.consentement=valeur;
   const res=await f.call('/api/inscription',null,'POST',donnees);
   assert.equal(res.status,400,'consentement '+String(valeur));
   assert.equal(res.body.erreur,'consentement_requis');
  }
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes').get().n,0);
  assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM docs WHERE parent='membres'").get().n,0);
 }finally{f.close()}
});

test('Inscription : données malformées signalées sans HTTP 500',async()=>{
 const f=fixture();
 try{
  for(const donnees of [null,[],42,'texte']){
   const r=await f.call('/api/inscription',null,'POST',donnees);
   assert.equal(r.status,400);
   assert.equal(r.body.erreur,'invalid_argument');
  }
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes').get().n,0);
 }finally{f.close()}
});

test('Inscription membre valide : compte, matricule, consentement daté et cookie sécurisé',async()=>{
 const f=fixture();
 try{
  const r=await f.call('/api/inscription',null,'POST',{...nouveau(),consentement:'oui'});
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.ok,true);
  assert.match(r.body.matricule,/^\d{6}$/);
  const cookie=r.headers.get('set-cookie')||'';
  assert.match(cookie,/sde_s=/);
  assert.match(cookie,/HttpOnly/i);
  assert.match(cookie,/Secure/i);
  assert.match(cookie,/SameSite=Lax/i);
  const account=f.sql.prepare('SELECT email,role,membreId,matricule,mdp FROM comptes WHERE email=?').get('nouveau@example.org');
  assert.ok(account);
  assert.equal(account.role,'soldat');
  assert.equal(account.matricule,r.body.matricule);
  assert.notEqual(account.mdp,nouveau().motDePasse,'ne jamais stocker un secret en clair');
  const doc=f.sql.prepare('SELECT data FROM docs WHERE path=?').get('membres/'+account.membreId);
  assert.ok(doc);
  const fiche=JSON.parse(doc.data);
  assert.equal(fiche.source,'inscription');
  assert.equal(fiche.statut,'Nouveau venu');
  assert.equal(fiche.matricule,r.body.matricule);
  assert.match(fiche.consentementConfidentialiteLe,/^\d{4}-\d{2}-\d{2}T/);
  const duplicate=await f.call('/api/inscription',null,'POST',{...nouveau(),consentement:'oui'});
  assert.equal(duplicate.status,409,'ne pas créer un deuxième compte pour la même adresse');
 }finally{f.close()}
});
