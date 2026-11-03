import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {fixture} from './helpers/d1.mjs';

async function connect(f,matricule,password){
 const response=await f.request('/api/connexion',null,'POST',{email:matricule,motDePasse:password});
 const data=await response.json();
 const token=(response.headers.get('set-cookie')||'').match(/sde_s=([^;]+)/)?.[1]||'';
 return {status:response.status,data,token};
}
async function withSession(f,token,path,method='GET',data){
 const req=new Request('https://mouvement-sde.org'+path,{
  method,headers:{cookie:'sde_s='+token,origin:'https://mouvement-sde.org','content-type':'application/json'},
  ...(data===undefined?{}:{body:JSON.stringify(data)})
 });
 return worker.fetch(req,f.env,{waitUntil(){}});
}
test('Préparation des fiches : accès réservé à la direction, valeurs existantes conservées et aucune duplication',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');f.account('manager','contributeur');f.account('soldat','soldat');
  f.doc('membres/soldat-m1',{nom:'KOUASSI',prenoms:'Amani',matricule:'SDE-CI-912',email:'amani@example.org',telephone:'0700000000',pole:'Réveil',actif:true});
  assert.equal((await f.call('/api/acces-membres',null,'GET')).status,403);
  assert.equal((await f.call('/api/acces-membres','soldat','GET')).status,403);
  assert.equal((await f.call('/api/acces-membres','manager','POST',{membreId:'soldat-m1'})).status,403);
  const preview=await f.call('/api/acces-membres','admin','GET');
  assert.equal(preview.status,200);
  assert.deepEqual(preview.body.membres.map(x=>x.etat),['a_creer']);
  assert.equal(JSON.stringify(preview.body).includes('0700000000'),false);
  const created=await f.call('/api/acces-membres','admin','POST',{membreId:'soldat-m1'});
  assert.equal(created.status,200);
  assert.equal(created.body.matricule,'SDE-CI-912');
  assert.equal(created.body.premiereConnexion,true);
  assert.ok(created.body.motDePasseProvisoire.startsWith('SDE-'));
  assert.ok(created.body.motDePasseProvisoire.length>=26);
  const stored=f.sql.prepare('SELECT email,mdp,membreId,matricule,role,id FROM comptes WHERE membreId=?').get('soldat-m1');
  assert.equal(stored.email,'amani@example.org');
  assert.equal(stored.role,'soldat');assert.equal(stored.matricule,'SDE-CI-912');
  assert.ok(stored.mdp.startsWith('pbkdf2$'));
  assert.ok(!stored.mdp.includes(created.body.motDePasseProvisoire));
  assert.equal(f.sql.prepare('SELECT val FROM meta WHERE cle=?').get('mdp_provisoire:'+stored.id).val,'1');
  const profile=JSON.parse(f.sql.prepare('SELECT data FROM docs WHERE path=?').get('membres/soldat-m1').data);
  assert.equal(profile.nom,'KOUASSI');
  assert.equal(profile.telephone,'0700000000');assert.equal(profile.pole,'Réveil');
  assert.equal(profile.compteId,stored.id);
  assert.equal((await f.call('/api/acces-membres','admin','POST',{membreId:'soldat-m1'})).status,409);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM comptes WHERE membreId=?').get('soldat-m1').n,1);
  assert.equal((await f.call('/api/acces-membres','admin','GET')).body.membres[0].etat,'provisoire');
 }finally{f.close()}
});
test('Matricule sans adresse e-mail : compte interne unique, jamais une fausse adresse envoyée',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');
  f.doc('membres/m2',{nom:'KOFFI',prenoms:'Victoire',actif:true,statut:'Soldat'});
  const c=await f.call('/api/acces-membres','admin','POST',{membreId:'m2'});
  assert.equal(c.status,200);
  assert.match(c.body.matricule,/^\d{6}$/);
  const row=f.sql.prepare('SELECT email FROM comptes WHERE membreId=?').get('m2');
  assert.match(row.email,/^fiche-.+@membres\.sde\.invalid$/);
  const signed=await connect(f,c.body.matricule,c.body.motDePasseProvisoire);
  assert.equal(signed.status,200);assert.equal(signed.data.premiereConnexion,true);
 }finally{f.close()}
});
test('Changement obligatoire : navigation privée et APIs refusées avant le nouveau mot de passe',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');
  f.doc('membres/m3',{nom:'SDE',prenoms:'Luc',matricule:'SDE-CI-932',actif:true});
  const issued=(await f.call('/api/acces-membres','admin','POST',{membreId:'m3'})).body;
  const signed=await connect(f,issued.matricule,issued.motDePasseProvisoire);
  assert.equal(signed.status,200);assert.equal(signed.data.premiereConnexion,true);
  assert.ok(signed.token);
  const moi=await withSession(f,signed.token,'/api/moi');
  assert.equal((await moi.json()).premiereConnexion,true);
  const privatePage=await withSession(f,signed.token,'/mon-espace');
  assert.equal(privatePage.status,302);assert.equal(new URL(privatePage.headers.get('location')).pathname,'/premiere-connexion');
  const firstPage=await withSession(f,signed.token,'/premiere-connexion');
  assert.equal(firstPage.status,200);assert.match(firstPage.headers.get('cache-control'),/no-store/);
  assert.equal((await withSession(f,signed.token,'/api/mon-espace')).status,403);
  assert.equal((await withSession(f,signed.token,'/api/db','POST',{op:'get',path:'membres/m3'})).status,403);
  assert.equal((await withSession(f,signed.token,'/api/acces-membres')).status,403);
  assert.equal((await withSession(f,signed.token,'/api/mot-de-passe','POST',{ancien:issued.motDePasseProvisoire,nouveau:issued.motDePasseProvisoire})).status,400);
  assert.equal((await withSession(f,signed.token,'/api/mot-de-passe','POST',{ancien:issued.motDePasseProvisoire,nouveau:'TooShort'})).status,400);
  const changed=await withSession(f,signed.token,'/api/mot-de-passe','POST',
   {ancien:issued.motDePasseProvisoire,nouveau:'SdeNewPersonalPassword2026!'});
  assert.equal(changed.status,200);
  assert.equal((await changed.json()).ok,true);
  assert.equal((await (await withSession(f,signed.token,'/api/moi')).json()).premiereConnexion,false);
  assert.equal((await withSession(f,signed.token,'/mon-espace')).status,200);
  const access=await withSession(f,signed.token,'/api/mon-espace');
  assert.equal(access.status,200);
  const accessData=await access.json();assert.equal(accessData.membre.nom,'SDE');
  const newLogin=await connect(f,issued.matricule,'SdeNewPersonalPassword2026!');
  assert.equal(newLogin.status,200);assert.equal(newLogin.data.premiereConnexion,false);
  const oldLogin=await connect(f,issued.matricule,issued.motDePasseProvisoire);
  assert.equal(oldLogin.status,401);
  assert.equal((await f.call('/api/acces-membres','admin','POST',{membreId:'m3',renouveler:true})).status,403);
 }finally{f.close()}
});
test('Renouvellement : possible uniquement avant première connexion, révoque les sessions',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');
  f.doc('membres/m4',{nom:'SDE',prenoms:'Marie',matricule:'SDE-CI-934',actif:true});
  const old=(await f.call('/api/acces-membres','admin','POST',{membreId:'m4'})).body;
  const session=await connect(f,old.matricule,old.motDePasseProvisoire);assert.equal(session.status,200);
  const fresh=await f.call('/api/acces-membres','admin','POST',{membreId:'m4',renouveler:true});
  assert.equal(fresh.status,200);
  assert.notEqual(fresh.body.motDePasseProvisoire,old.motDePasseProvisoire);
  assert.equal((await (await withSession(f,session.token,'/api/moi')).json()).connecte,false);
  assert.equal((await connect(f,old.matricule,old.motDePasseProvisoire)).status,401);
  assert.equal((await connect(f,old.matricule,fresh.body.motDePasseProvisoire)).status,200);
 }finally{f.close()}
});
test('Répertoire : les comptes préexistants, fiches inactives et conflits ne sont pas écrasés',async()=>{
 const f=fixture();
 try{
  f.account('admin','admin');f.account('other','soldat','other');
  f.doc('membres/existing',{nom:'Autre',email:'other@example.org',actif:true});
  f.doc('membres/inactive',{nom:'Inactif',actif:false});
  f.doc('membres/d1',{nom:'Doublon',matricule:'SDE-555'});
  f.doc('membres/d2',{nom:'Doublon',matricule:'SDE-555'});
  const statuses=(await f.call('/api/acces-membres','admin','GET')).body.membres;
  assert.equal(statuses.find(x=>x.id==='existing').etat,'relier');
  assert.equal(statuses.find(x=>x.id==='inactive').etat,'inactif');
  assert.equal(statuses.find(x=>x.id==='d1').etat,'matricule_conflit');
  assert.equal((await f.call('/api/acces-membres','admin','POST',{membreId:'existing'})).status,409);
  assert.equal((await f.call('/api/acces-membres','admin','POST',{membreId:'inactive'})).status,409);
  assert.equal((await f.call('/api/acces-membres','admin','POST',{membreId:'d2'})).status,409);
 }finally{f.close()}
});
test('Interface : administration et première connexion sans mots de passe en dur',()=>{
 const app=readFileSync('public/index.html','utf8');
 const first=readFileSync('public/vitrine/premiere-connexion.html','utf8');
 const script=readFileSync('public/vitrine/premiere-connexion.js','utf8');
 const login=readFileSync('public/vitrine/portail-connexion.js','utf8');
 assert.match(app,/Accès individuels des fiches membres/);
 assert.match(app,/cpt-creer-tous/);
 assert.match(app,/cpt-copier-acces/);
 assert.match(app,/Matricule SDE ou adresse e-mail/);
 assert.match(login,/me\.premiereConnexion/);
 assert.match(first,/name="ancien"/);
 assert.match(first,/minlength="12"/);
 assert.match(script,/\/api\/mot-de-passe/);
 assert.match(app,/sde-acces-membres\.css/);
 assert.ok(!app.includes('motDePasseProvisoire: "1234"'));
});
