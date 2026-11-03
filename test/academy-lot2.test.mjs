import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import worker from "../src/worker.js";
import {SOLDIERS_ACADEMY_2027 as PROG} from "../src/soldiers-academy-2027.js";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";
import {rappelsCohortes,typeRappel,texteRappel,pilotageAcademy} from "../src/academy-extras.js";

const ORIGINE="https://mouvement-sde.org";
function monde(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(readFileSync("schema.sql","utf8"));
  const stmt=(q,args=[])=>({
    bind:(...a)=>stmt(q,a),
    first:async()=>sql.prepare(q).get(...args)??null,
    all:async()=>({results:sql.prepare(q).all(...args)}),
    run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
    _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
  });
  const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec("BEGIN");try{const o=l.map(s=>s._exec());sql.exec("COMMIT");return o}catch(e){sql.exec("ROLLBACK");throw e}}};
  const env={DB,ASSETS:{fetch:async()=>new Response("x")},PROPRIETAIRES:"chef@exemple.test"};
  let n=0;
  const appel=async(chemin,{methode="GET",corps,cookie}={})=>{
    const h={"content-type":"application/json","cf-connecting-ip":"10.1.0."+(++n%200+1)};
    if(cookie)h.cookie=cookie;
    const r=await worker.fetch(new Request(ORIGINE+chemin,{method:methode,headers:h,body:corps===undefined?undefined:JSON.stringify(corps)}),env,{waitUntil(){}});
    let j=null;try{j=await r.clone().json()}catch{}
    return {statut:r.status,json:j,entetes:r.headers};
  };
  return {sql,env,appel};
}
const BON={prenoms:"Awa",nom:"Koné",email:"awa.kone@exemple.test",telephone:"+225 07 78 68 95 73",pays:"Côte d'Ivoire",ville:"Abidjan",motDePasse:"MotDePasse-2027",consentement:true};

test("Inscription aux cours ouverte à tous : compte apprenant limité à l'Academy",async()=>{
  const {sql,env,appel}=monde();
  sql.exec("CREATE TABLE preinscriptions_academy (id INTEGER PRIMARY KEY AUTOINCREMENT,nom TEXT,prenom TEXT,email TEXT,telephone TEXT,date_naissance TEXT,ville TEXT,pays TEXT,niveau_souhaite TEXT,motivation TEXT,experience TEXT,eglise_origine TEXT,statut TEXT DEFAULT 'nouvelle',created_at INTEGER DEFAULT 0)");
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,consentement:false}})).statut,400);
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,motDePasse:"court"}})).statut,400);
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,email:"pas-un-mail"}})).statut,400);
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,nom:""}})).statut,400);
  const ok=await appel("/api/academy-inscription",{methode:"POST",corps:BON});
  assert.equal(ok.statut,200);assert.equal(ok.json.retour,"/mon-espace/academy");
  const cookie=ok.entetes.get("set-cookie").split(";")[0];
  const c=sql.prepare("SELECT role,nom,matricule,membreId FROM comptes WHERE email=?").get(BON.email);
  assert.equal(c.role,"attente");assert.equal(c.nom,"Awa KONÉ");assert.ok(!c.membreId&&!c.matricule,"aucune fiche de membre créée");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM docs WHERE parent='membres'").get().n,0);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM preinscriptions_academy WHERE email=?").get(BON.email).n,1,"trace pour la direction");
  const cours=await appel("/api/soldiers-academy",{cookie});
  assert.equal(cours.statut,200);assert.equal(cours.json.courses.length,24);assert.equal(cours.json.admin,false);
  const refuse=await appel("/api/comptes",{cookie});
  assert.ok(refuse.statut===403||refuse.statut===401,"pas d'accès à la gestion des comptes : "+refuse.statut);
  const admin=await appel("/api/soldiers-academy/gestion",{cookie});assert.equal(admin.statut,403);
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:BON})).statut,409,"e-mail déjà utilisé");
  assert.equal((await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,email:"chef@exemple.test"}})).statut,409,"adresse propriétaire protégée");
  const connexion=await appel("/api/connexion",{methode:"POST",corps:{email:BON.email,motDePasse:BON.motDePasse}});
  assert.equal(connexion.statut,200,"le compte créé peut se reconnecter");
});

/* ── écoles et rappels : API directe avec un faux formateur / apprenant ── */
const membre={connecte:true,id:"m1",nom:"Soldat Test",niveau:0};
const formateur={connecte:true,id:"f1",nom:"Formateur",niveau:2};
async function api(env,user,methode,chemin,corps){
  const r=await soldiersAcademyApi(new Request(ORIGINE+chemin,{method:methode,headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)}),env,user,chemin.split("?")[0]);
  return {statut:r.status,json:await r.json()};
}
const rep=n=>Array.from({length:n},(_,i)=>"Réponse argumentée numéro "+(i+1)+" fidèle aux textes.");
async function valider(env,id){
  const c=PROG.courses.find(x=>x.id===id);
  for(const [type,n] of [["quiz",c.quiz.length],["exercises",c.exercises.length],["exam",c.exam.length]])await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:id,type,answers:rep(n)});
  const g=await api(env,formateur,"GET","/api/soldiers-academy/gestion");
  for(const p of g.json.pending.filter(x=>x.cours===id))await api(env,formateur,"PATCH","/api/soldiers-academy/noter",{id:p.id,score:100,comment:"Très bon travail."});
  await api(env,formateur,"PATCH","/api/soldiers-academy/assiduite",{compte:membre.id,courseId:id,attendance:100,participation:100});
}

test("Écoles de spécialisation : inscription après le tronc commun, décision de la direction, retrait",async()=>{
  const {env}=monde();
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"REV"})).statut,403,"fermé avant les 24 cours");
  for(const c of PROG.courses)await valider(env,c.id);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"XXX"})).statut,400);
  const r=await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"REV",motivation:"Servir sur le terrain."});
  assert.equal(r.statut,201);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"REV"})).statut,409);
  await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"FDE"});
  let vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.deepEqual(vue.specialisations.mesInscriptions.map(x=>[x.ecole,x.statut]),[["REV","demande"],["FDE","demande"]]);
  const g=(await api(env,formateur,"GET","/api/soldiers-academy/gestion")).json;
  assert.equal(g.ecolesDemandes.length,2);assert.equal(g.ecolesDemandes[0].titre,"Réveil et évangélisation");assert.equal(g.ecolesDemandes[0].motivation,"Servir sur le terrain.");
  assert.equal((await api(env,membre,"PATCH","/api/soldiers-academy/ecoles/decision",{compte:"m1",ecole:"REV",statut:"acceptee"})).statut,403);
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/ecoles/decision",{compte:"m1",ecole:"FDE",statut:"refusee"})).statut,400,"motif de refus obligatoire");
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/ecoles/decision",{compte:"m1",ecole:"REV",statut:"acceptee",commentaire:"Bienvenue."})).json.ok,true);
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/ecoles/decision",{compte:"m1",ecole:"FDE",statut:"refusee",commentaire:"Complétez d'abord le dossier."})).json.ok,true);
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/ecoles/decision",{compte:"m1",ecole:"REV",statut:"refusee",commentaire:"déjà traité"})).statut,404);
  vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.deepEqual(vue.specialisations.mesInscriptions.map(x=>x.statut),["acceptee","refusee"]);
  assert.ok(vue.avis.some(a=>/acceptée/.test(a.texte))&&vue.avis.some(a=>/pas été retenue/.test(a.texte)));
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/inscrire",{ecole:"FDE"})).statut,201,"nouvelle demande possible après refus");
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/retirer",{ecole:"REV"})).json.ok,true);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/ecoles/retirer",{ecole:"REV"})).statut,404);
  const p=await pilotageAcademy(env);assert.deepEqual(p.ecoles.FDE,{demande:1,acceptee:0,refusee:0});assert.ok(!JSON.stringify(p).includes("Soldat Test"));
});

test("Rappels de cohorte : J-7, veille, jour J, une seule fois, e-mail et avis, cohortes closes ignorées",async()=>{
  const {env,sql}=monde();
  sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run("m1@exemple.test","m1","Soldat Test","attente",1);
  sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run("m2@exemple.test","m2","Autre","attente",1);
  const jour=t=>new Date(t).toISOString().slice(0,10);
  const t0=Date.parse("2026-12-01T09:00:00Z"),J=n=>t0+n*864e5;
  const creer=async(nom,niveau,debut)=>(await api(env,formateur,"POST","/api/soldiers-academy/cohortes",{nom,niveau,debut})).json.id;
  const c7=await creer("Fondations — décembre",1,jour(J(7)));
  const loin=await creer("Trop loin",1,jour(J(20)));
  const close=await creer("Close",1,jour(J(3)));
  await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:c7});
  await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:loin});
  await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:close});
  await api(env,formateur,"PATCH","/api/soldiers-academy/cohortes/clore",{id:close});
  const courriels=[];const courriel=async m=>{courriels.push(m)};
  assert.deepEqual([typeRappel(8),typeRappel(7),typeRappel(2),typeRappel(1),typeRappel(0),typeRappel(-1)],[null,"j7","j7","j1","j0",null]);
  let r=await rappelsCohortes(env,{now:t0,courriel,send:async()=>({ok:true})});
  assert.equal(r.envoyes,1);assert.equal(courriels.length,1);assert.equal(courriels[0].to,"m1@exemple.test");assert.match(courriels[0].text,/dans 7 jours/);assert.match(courriels[0].text,/SA-01/);
  r=await rappelsCohortes(env,{now:t0+15*60*1000,courriel});assert.equal(r.envoyes,0,"idempotent à chaque passage du planificateur");
  r=await rappelsCohortes(env,{now:J(6),courriel});assert.equal(r.envoyes,1,"veille");assert.match(courriels[1].text,/demain/);
  r=await rappelsCohortes(env,{now:J(7),courriel});assert.equal(r.envoyes,1,"jour J");assert.match(courriels[2].text,/aujourd'hui/);
  r=await rappelsCohortes(env,{now:J(8),courriel});assert.equal(r.envoyes,0,"après le début");
  const avis=(await api(env,membre,"GET","/api/soldiers-academy")).json.avis;
  assert.equal(avis.length,3);
  assert.equal((await api(env,{...membre,id:"m2"},"GET","/api/soldiers-academy")).json.avis.length,0,"les autres apprenants ne sont pas notifiés");
  // la cohorte « trop loin » n'est rappelée qu'à partir de J-7 de son propre début
  r=await rappelsCohortes(env,{now:J(12),courriel});assert.equal(r.envoyes,0);
  r=await rappelsCohortes(env,{now:J(13),courriel});assert.equal(r.envoyes,1);assert.match(courriels.at(-1).text,/Trop loin/);
  assert.match(texteRappel("j1",{nom:"X",niveau:2,debut:"2027-01-04"},1),/SA-09/);
});

test("Câblage : planificateur, route publique, formulaire d'inscription et interface écoles",()=>{
  const w=readFileSync("src/worker.js","utf8");
  assert.match(w,/rappelsCohortes\(env/);assert.match(w,/\/api\/academy-inscription/);
  const h=readFileSync("public/vitrine/academy.html","utf8");
  assert.ok(h.includes('id="form-inscription-cours"')&&h.includes("sde-academy-inscription.js")&&h.includes("membre du mouvement ou non"));
  const js=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
  assert.ok(js.includes("data-ecole-form")&&js.includes("data-ecole-decision")&&js.includes("/ecoles/inscrire"));
  assert.ok(readFileSync("public/vitrine/sde-academy-inscription.js","utf8").includes("/api/academy-inscription"));
});
