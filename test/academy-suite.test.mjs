import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {SOLDIERS_ACADEMY_2027 as PROG} from "../src/soldiers-academy-2027.js";
import {CORRECTIFS} from "../src/academy-correctifs.js";
import {soldiersAcademyApi,verifierAttestation} from "../src/sde-academy-api.js";
import {notifierCompte,pilotageAcademy,calendrierCohorte} from "../src/academy-extras.js";

function monde(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(readFileSync("schema.sql","utf8"));
  // Les tests historiques simulent un apprenant ayant déjà reçu ses validations.
  // Les nouveaux scénarios d'accès utilisent des comptes sans autorisation initiale.
  sql.exec("CREATE TABLE IF NOT EXISTS academy_2027_acces (compte TEXT NOT NULL,cours TEXT NOT NULL,statut TEXT NOT NULL CHECK(statut IN ('en_attente','approuve','refuse','revoque')),demande_le INTEGER NOT NULL,decision_le INTEGER,decideur TEXT,commentaire TEXT NOT NULL DEFAULT '',PRIMARY KEY(compte,cours))");
  for(const c of PROG.courses)
    sql.prepare("INSERT INTO academy_2027_acces(compte,cours,statut,demande_le) VALUES(?,?,'approuve',1)").run("m1",c.id);
  const stmt=(q,args=[])=>({
    bind:(...a)=>stmt(q,a),
    first:async()=>sql.prepare(q).get(...args)??null,
    all:async()=>({results:sql.prepare(q).all(...args)}),
    run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}}
  });
  return {sql,env:{DB:{prepare:q=>stmt(q)}}};
}
const membre={connecte:true,id:"m1",nom:"Soldat Test",niveau:0};
const autre={connecte:true,id:"m2",nom:"Autre Soldat",niveau:0};
const formateur={connecte:true,id:"f1",nom:"Formateur",niveau:2};
async function api(env,user,methode,chemin,corps){
  const r=await soldiersAcademyApi(new Request("https://mouvement-sde.org"+chemin,{method:methode,headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)}),env,user,chemin.split("?")[0]);
  return {statut:r.status,json:await r.json()};
}
const rep=n=>Array.from({length:n},(_,i)=>"Réponse argumentée numéro "+(i+1)+" fidèle aux textes.");
const jamaisCorrige=(texte)=>{for(const k of Object.values(CORRECTIFS)){for(const c of [...k.quiz,...k.exam])if(c.length>25)assert.ok(!texte.includes(c),"corrigé divulgué : "+c.slice(0,40))}};

/* Fait valider un cours : remises, correction à 100, assiduité et participation à 100. */
async function valider(env,id,note=100){
  const c=PROG.courses.find(x=>x.id===id);
  for(const [type,n] of [["quiz",c.quiz.length],["exercises",c.exercises.length],["exam",c.exam.length]]){
    const r=await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:id,type,answers:rep(n)});
    assert.equal(r.statut,201,JSON.stringify(r.json));
  }
  const g=await api(env,formateur,"GET","/api/soldiers-academy/gestion");
  for(const p of g.json.pending.filter(x=>x.cours===id)){
    const r=await api(env,formateur,"PATCH","/api/soldiers-academy/noter",{id:p.id,score:note,comment:"Très bon travail."});
    assert.equal(r.json.ok,true,JSON.stringify(r.json));
  }
  const a=await api(env,formateur,"PATCH","/api/soldiers-academy/assiduite",{compte:membre.id,courseId:id,attendance:100,participation:100});
  assert.equal(a.json.ok,true);
}

test("Corrigés : réservés aux formateurs, jamais dans les réponses apprenant",async()=>{
  const {env}=monde();
  await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"quiz",answers:rep(5)});
  await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"exam",answers:rep(3)});
  assert.equal((await api(env,membre,"GET","/api/soldiers-academy/gestion")).statut,403);
  for(const chemin of ["/api/soldiers-academy","/api/soldiers-academy/cours/SA-01"]){
    const r=await api(env,membre,"GET",chemin);jamaisCorrige(JSON.stringify(r.json));
  }
  const g=await api(env,formateur,"GET","/api/soldiers-academy/gestion");
  const quiz=g.json.pending.find(p=>p.type==="quiz"),exam=g.json.pending.find(p=>p.type==="exam");
  assert.deepEqual(quiz.aide.corriges,CORRECTIFS["SA-01"].quiz);assert.equal(quiz.aide.consignes.length,5);
  assert.deepEqual(exam.aide.corriges,CORRECTIFS["SA-01"].exam);assert.match(exam.aide.bareme,/Justesse 40/);
});

test("Avis et notifications : l'apprenant est prévenu de sa note, la direction jamais via un membre",async()=>{
  const {env,sql}=monde();
  await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"quiz",answers:rep(5)});
  const id=(await api(env,formateur,"GET","/api/soldiers-academy/gestion")).json.pending[0].id;
  await api(env,formateur,"PATCH","/api/soldiers-academy/noter",{id,score:64,comment:"À reprendre sur le salut."});
  let vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.equal(vue.avis.length,1);assert.match(vue.avis[0].texte,/64\/100/);
  assert.equal((await api(env,autre,"GET","/api/soldiers-academy")).json.avis.length,0,"avis isolés par compte");
  await api(env,membre,"POST","/api/soldiers-academy/avis/lus",{});
  assert.equal((await api(env,membre,"GET","/api/soldiers-academy")).json.avis.length,0);
  // push : envoyé aux appareils du compte concerné seulement, abonnement expiré supprimé
  sql.exec("CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT,auth TEXT,cree INTEGER,PRIMARY KEY(userId,endpoint))");
  sql.prepare("INSERT INTO push_subs VALUES(?,?,?,?,?)").run("m1","https://push.exemple/a","k","a",1);
  sql.prepare("INSERT INTO push_subs VALUES(?,?,?,?,?)").run("m1","https://push.exemple/mort","k","a",1);
  sql.prepare("INSERT INTO push_subs VALUES(?,?,?,?,?)").run("m2","https://push.exemple/autre","k","a",1);
  const envoyes=[];
  await notifierCompte({...env,VAPID_PUBLIC_KEY:"x",VAPID_PRIVATE_KEY:"y"},"m1",{titre:"SDE",corps:"Test"},{send:async(sub)=>{envoyes.push(sub.endpoint);return sub.endpoint.endsWith("mort")?{ok:false,reason:"expired"}:{ok:true}}});
  assert.deepEqual(envoyes.sort(),["https://push.exemple/a","https://push.exemple/mort"]);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM push_subs WHERE userId='m1'").get().n,1);
});

test("Cohortes : création réservée à la direction, 8 semaines, niveau verrouillé, clôture",async()=>{
  const {env}=monde();
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/cohortes",{nom:"Promo",niveau:1,debut:"2026-12-01"})).statut,403);
  assert.equal((await api(env,formateur,"POST","/api/soldiers-academy/cohortes",{nom:"Promo",niveau:1,debut:"2026-02-31"})).statut,400);
  assert.equal((await api(env,formateur,"POST","/api/soldiers-academy/cohortes",{nom:"P",niveau:1,debut:"2026-12-01"})).statut,400);
  const c1=(await api(env,formateur,"POST","/api/soldiers-academy/cohortes",{nom:"Fondations — décembre",niveau:1,debut:"2026-12-01"})).json;
  const c2=(await api(env,formateur,"POST","/api/soldiers-academy/cohortes",{nom:"Équipement — janvier",niveau:2,debut:"2027-01-04"})).json;
  assert.equal(c1.calendrier.length,8);assert.equal(c1.calendrier[0].cours,"SA-01");assert.equal(c1.calendrier[7].cours,"SA-08");
  assert.equal(c1.calendrier[1].du,"2026-12-08");assert.equal(calendrierCohorte(3,"2027-01-04")[0].cours,"SA-17");
  const vue=(await api(env,membre,"GET","/api/soldiers-academy")).json.cohortes;
  assert.equal(vue.length,2);assert.equal(vue.find(c=>c.id===c1.id).peutRejoindre,true);assert.equal(vue.find(c=>c.id===c2.id).peutRejoindre,false);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:c2.id})).statut,403);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:c1.id})).json.ok,true);
  await api(env,membre,"POST","/api/soldiers-academy/cohortes/rejoindre",{id:c1.id});
  const g=(await api(env,formateur,"GET","/api/soldiers-academy/gestion")).json.cohortes.find(c=>c.id===c1.id);
  assert.equal(g.membres.length,1);
  assert.equal((await api(env,membre,"GET","/api/soldiers-academy")).json.cohortes.find(c=>c.id===c1.id).inscrit,true);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/cohortes/quitter",{id:c1.id})).json.ok,true);
  assert.equal((await api(env,membre,"PATCH","/api/soldiers-academy/cohortes/clore",{id:c1.id})).statut,403);
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/cohortes/clore",{id:c1.id})).json.ok,true);
  assert.equal((await api(env,membre,"GET","/api/soldiers-academy")).json.cohortes.length,1);
});

test("Parcours complet : 24 cours, projet intégrateur, certificat, vérification publique et pilotage",async()=>{
  const {env}=monde();
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"PROJET",type:"projet",answers:rep(5).map(x=>x.repeat(3))})).statut,403,"projet fermé");
  assert.equal((await api(env,membre,"GET","/api/soldiers-academy")).json.specialisations.ouvertes,false);
  for(const c of PROG.courses)await valider(env,c.id);
  let vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.equal(vue.progress.passed,24);assert.equal(vue.certificates.filter(c=>c.niveau<=3).length,3);
  assert.equal(vue.projet.ouvert,true);assert.equal(vue.parcoursComplet,false);assert.equal(vue.specialisations.ouvertes,true);
  assert.equal(vue.specialisations.ecoles.length,5);assert.equal(vue.specialisations.masterclass.length,6);jamaisCorrige(JSON.stringify(vue));
  const partie=n=>rep(n).map(x=>x.repeat(2));
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"PROJET",type:"projet",answers:["court"]})).statut,400);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"PROJET",type:"projet",answers:partie(5)})).statut,201);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"PROJET",type:"projet",answers:partie(5)})).statut,409,"un seul dépôt en attente");
  let g=(await api(env,formateur,"GET","/api/soldiers-academy/gestion")).json;
  const pj=g.pending.find(p=>p.cours==="PROJET");assert.match(pj.aide.bareme,/70/);assert.equal(pj.aide.consignes.length,5);
  assert.equal((await api(env,formateur,"PATCH","/api/soldiers-academy/noter",{id:pj.id,score:55,comment:"Budget à détailler."})).json.ok,true);
  vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.equal(vue.projet.acquis,false);assert.equal(vue.projet.dernier.score,55);assert.equal(vue.certificates.some(c=>c.niveau===4),false);
  assert.equal((await api(env,membre,"POST","/api/soldiers-academy/soumettre",{courseId:"PROJET",type:"projet",answers:partie(5)})).statut,201,"reprise possible");
  g=(await api(env,formateur,"GET","/api/soldiers-academy/gestion")).json;
  await api(env,formateur,"PATCH","/api/soldiers-academy/noter",{id:g.pending.find(p=>p.cours==="PROJET").id,score:82,comment:"Projet solide."});
  vue=(await api(env,membre,"GET","/api/soldiers-academy")).json;
  assert.equal(vue.parcoursComplet,true);assert.equal(vue.projet.acquis,true);
  const cert=vue.certificates.find(c=>c.niveau===4);assert.match(cert.code,/^SDE-ACA-2027-PARCOURS-[A-F0-9]{8}$/);
  const att=await api(env,membre,"GET","/api/soldiers-academy/attestation?niveau=4");assert.equal(att.json.ok,true);
  assert.equal((await api(env,autre,"GET","/api/soldiers-academy/attestation?niveau=4")).statut,403);
  // vérification publique : valide / intitulé / date, jamais d'identité ni de note
  const verif=async code=>verifierAttestation(new Request("https://mouvement-sde.org/api/academy-verification?code="+code),env);
  for(const c of vue.certificates){
    const r=await verif(c.code),j=await r.json();
    assert.equal(j.valide,true);assert.ok(j.intitule.length>10);assert.equal(typeof j.delivreeLe,"number");
    const brut=JSON.stringify(j);assert.ok(!brut.includes("Soldat Test")&&!brut.includes("m1")&&!/score|note/i.test(brut));
  }
  assert.match((await (await verif(cert.code)).json()).intitule,/Certificat de parcours/);
  assert.equal((await (await verif("SDE-ACA-2027-N1-00000000")).json()).valide,false);
  assert.equal((await verif("n-importe-quoi")).status,400);
  // pilotage : agrégats sans noms
  const p=await pilotageAcademy(env);
  assert.equal(p.apprenants,1);assert.equal(p.copiesEnAttente,0);assert.deepEqual(p.attestations,{niveau1:1,niveau2:1,niveau3:1,parcours:1});
  assert.ok(!JSON.stringify(p).includes("Soldat"));
});

test("Pages : vérification publique CSP-compatible, routes câblées, plus de mention « proposé »",()=>{
  const v=readFileSync("public/vitrine/verifier-attestation.html","utf8");
  assert.ok(!/<script>/i.test(v)&&v.includes("/vitrine/sde-verifier-attestation.js"));
  assert.ok(v.indexOf("sde-premium-public.css")>0&&v.indexOf("sde-premium-public.css")<v.indexOf("</head>"));
  const w=readFileSync("src/worker.js","utf8");
  assert.match(w,/\/api\/academy-verification/);assert.match(w,/\/verifier-attestation/);
  const m=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
  assert.ok(!/soumis à l'adoption|proposé/.test(m));assert.ok(m.includes("qrcode-generator-1.4.4.js"));
  const os=readFileSync("public/os-v31/index.html","utf8");assert.ok(os.includes('id="pilotage-academy"'));
  const js=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");assert.ok(js.includes("data-cohorte-rejoindre")&&js.includes("projetForm"));
});
