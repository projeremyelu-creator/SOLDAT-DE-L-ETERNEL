import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import {definitionValide,reponsesValides,MODELES} from '../src/formulaires.js';
const ORIGINE='https://mouvement-sde.org';
function monde(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync('schema.sql','utf8'));
 const stmt=(q,args=[])=>({
  bind:(...a)=>stmt(q,a),
  first:async()=>sql.prepare(q).get(...args)??null,
  all:async()=>({results:sql.prepare(q).all(...args)}),
  run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
  _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
 });
 const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec('BEGIN');try{const o=l.map(s=>s._exec());sql.exec('COMMIT');return o}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={DB,ASSETS:{fetch:async()=>new Response('x')},PROPRIETAIRES:'chef@exemple.test'};
 const compte=(id,nom,role='soldat',email=id+'@exemple.test',matricule='M-'+id)=>{
  sql.prepare('INSERT INTO comptes(email,id,nom,role,cree,matricule) VALUES(?,?,?,?,?,?)').run(email,id,nom,role,Date.now(),matricule);
  const jeton='jeton-'+id;sql.prepare('INSERT INTO sessions(jeton,email,expire) VALUES(?,?,?)').run(jeton,email,Date.now()+864e5);return jeton;
 };
 let n=0;
 const appel=async(chemin,{methode='GET',jeton,corps,ip,extra}={})=>{
  const h={'content-type':'application/json','cf-connecting-ip':ip||'10.0.0.'+(++n%200+1)};
  if(jeton)h.cookie='sde_s='+jeton;
  Object.assign(h,extra||{});
  const r=await worker.fetch(new Request(ORIGINE+chemin,{method:methode,headers:h,body:corps===undefined?undefined:JSON.stringify(corps)}),env,{waitUntil(){}});
  let j=null;try{j=await r.clone().json()}catch{}
  return {statut:r.status,json:j,entetes:r.headers};
 };
 return {sql,env,compte,appel};
}


async function pret(){const w=monde();const admin=w.compte('adm','Admin','admin');const soldat=w.compte('sol','Soldat','soldat');return {...w,admin,soldat}}
const creer=async(w,modele='benevole')=>{const r=await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'modele',modele}});assert.equal(r.json.ok,true);return r.json.slug};
const BON={nom:'Awa Koné',telephone:'+225 07 78 68 95 73',pole:'Logistique et organisation',ville:'Abidjan, Côte d’Ivoire'};

test('Formulaires : réservé aux administrateurs',async()=>{
 const w=await pret();
 assert.equal((await w.appel('/api/formulaires')).statut,403);
 assert.equal((await w.appel('/api/formulaires',{jeton:w.soldat})).statut,403);
 assert.equal((await w.appel('/api/formulaires',{methode:'POST',jeton:w.soldat,corps:{action:'modele',modele:'benevole'}})).statut,403);
 assert.equal((await w.appel('/api/formulaires',{jeton:w.admin})).statut,200);
});
test('Formulaires : un formulaire créé est fermé jusqu’à son ouverture',async()=>{
 const w=await pret(),slug=await creer(w);
 assert.equal(slug,'benevole');
 assert.equal(await creer(w),'benevole-2');
 assert.equal((await w.appel('/api/f/'+slug)).statut,404);
 assert.equal((await w.appel('/api/f/'+slug,{methode:'POST',corps:{reponses:BON,consentement:true}})).statut,404);
 await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'activer',slug,actif:true}});
 const g=await w.appel('/api/f/'+slug);
 assert.equal(g.statut,200);assert.equal(g.json.formulaire.champs.length,MODELES.benevole.champs.length);
 await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'activer',slug,actif:false}});
 assert.equal((await w.appel('/api/f/'+slug)).statut,404);
});
test('Formulaires : validation, consentement, piège anti-robot et champs inconnus',async()=>{
 const w=await pret(),slug=await creer(w);
 await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'activer',slug,actif:true}});
 const poster=corps=>w.appel('/api/f/'+slug,{methode:'POST',corps});
 assert.equal((await poster({reponses:BON})).statut,400,'sans consentement');
 assert.equal((await poster({reponses:{...BON,nom:''},consentement:true})).statut,400,'champ obligatoire');
 assert.equal((await poster({reponses:{...BON,telephone:'abc'},consentement:true})).statut,400,'téléphone');
 assert.equal((await poster({reponses:{...BON,email:'pas-un-mail'},consentement:true})).statut,400,'e-mail');
 assert.equal((await poster({reponses:{...BON,pole:'Inconnu'},consentement:true})).statut,400,'choix hors liste');
 assert.equal((await poster({reponses:BON,consentement:true,site:'http://spam'})).json.ok,true,'piège silencieux');
 assert.equal(w.sql.prepare('SELECT COUNT(*) n FROM sde_formulaires_reponses').get().n,0);
 const ok=await poster({reponses:{...BON,email:'AWA@Exemple.test',admin:true,'__proto__':'x'},consentement:true});
 assert.equal(ok.statut,200);
 const ligne=JSON.parse(w.sql.prepare('SELECT donnees FROM sde_formulaires_reponses').get().donnees);
 assert.equal(ligne.email,'awa@exemple.test');assert.equal(ligne.admin,undefined);assert.equal(Object.keys(ligne).sort().join(),'email,nom,pole,telephone,ville');
});
test('Formulaires : consultation, export CSV protégé contre les formules, aucune adresse IP conservée',async()=>{
 const w=await pret(),slug=await creer(w);
 await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'activer',slug,actif:true}});
 await w.appel('/api/f/'+slug,{methode:'POST',ip:'203.0.113.9',corps:{reponses:{...BON,nom:'=HYPERLINK("x")'},consentement:true}});
 const r=await w.appel('/api/formulaires?slug='+slug,{jeton:w.admin});
 assert.equal(r.json.total,1);assert.equal(r.json.reponses[0].donnees.nom,'=HYPERLINK("x")');
 const brut=w.sql.prepare('SELECT * FROM sde_formulaires_reponses').get();
 assert.ok(!JSON.stringify(brut).includes('203.0.113.9'));
 const csv=await worker.fetch(new Request(ORIGINE+'/api/formulaires?slug='+slug+'&csv=1',{headers:{cookie:'sde_s='+w.admin}}),w.env,{waitUntil(){}});
 assert.match(csv.headers.get('content-type'),/text\/csv/);
 const t=await csv.text();
 assert.ok(t.includes('"\'=HYPERLINK(""x"")"'),'cellule neutralisée');
 assert.equal((await w.appel('/api/formulaires?slug='+slug,{jeton:w.soldat})).statut,403);
});
test('Formulaires : limite par réseau et création sur mesure',async()=>{
 const w=await pret();
 const def={titre:'Atelier de louange',intro:'',confirmation:'',champs:[{id:'nom',etiquette:'Nom',type:'texte'},{id:'dons',etiquette:'Vos dons',type:'cases',options:['Chant','Musique','Danse'],requis:false},{id:'age',etiquette:'Âge',type:'nombre',requis:false}]};
 assert.equal((await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'enregistrer',slug:'Mauvais Slug!',formulaire:def}})).statut,400);
 assert.equal((await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'enregistrer',slug:'louange',formulaire:{...def,champs:[{id:'a',etiquette:'x',type:'inconnu'}]}}})).statut,400);
 const c=await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'enregistrer',slug:'louange',formulaire:def}});
 assert.equal(c.json.cree,true);
 await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'activer',slug:'louange',actif:true}});
 const ok=await w.appel('/api/f/louange',{methode:'POST',ip:'198.51.100.7',corps:{reponses:{nom:'Paul',dons:['Chant','Danse'],age:'27'},consentement:true}});
 assert.equal(ok.statut,200);
 assert.equal((await w.appel('/api/f/louange',{methode:'POST',corps:{reponses:{nom:'P',dons:['Cirque']},consentement:true}})).statut,400);
 let dernier;for(let i=0;i<20;i++)dernier=await w.appel('/api/f/louange',{methode:'POST',ip:'198.51.100.7',corps:{reponses:{nom:'Paul'},consentement:true}});
 assert.equal(dernier.statut,429);
 const re=await w.appel('/api/formulaires',{methode:'POST',jeton:w.admin,corps:{action:'enregistrer',slug:'louange',formulaire:{...def,titre:'Atelier de louange 2'}}});
 assert.equal(re.json.cree,false);
});
test('Formulaires : validations pures et pages',async()=>{
 assert.ok(definitionValide({titre:'Ab',champs:[]}).erreur);
 assert.ok(definitionValide({titre:'Titre ok',champs:[{id:'a',etiquette:'A',type:'texte'},{id:'a',etiquette:'B',type:'texte'}]}).erreur,'doublon');
 assert.ok(definitionValide({titre:'Titre ok',champs:[{id:'a',etiquette:'A',type:'choix',options:['seul']}]}).erreur,'choix < 2');
 assert.ok(reponsesValides([{id:'d',etiquette:'D',type:'date',requis:true}],{d:'2026-13-45'}).erreur);
 assert.ok(reponsesValides([{id:'n',etiquette:'N',type:'nombre',requis:true}],{n:'abc'}).erreur);
 assert.equal(reponsesValides([{id:'o',etiquette:'O',type:'oui_non',requis:true}],{o:'oui'}).donnees.o,'oui');
 const w=await pret();
 const page=await worker.fetch(new Request(ORIGINE+'/f/louange'),w.env,{waitUntil(){}});
 assert.equal(page.statut??page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);
 assert.equal((await worker.fetch(new Request(ORIGINE+'/formulaires'),w.env,{waitUntil(){}})).status,200);
});
