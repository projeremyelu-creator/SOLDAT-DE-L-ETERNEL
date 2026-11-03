import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SOLDIERS_ACADEMY_2027 as CATALOGUE} from "../src/soldiers-academy-2027.js";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";
test("24 cours et 192 heures : contenu complet sans corrigés",()=>{
  const cs=CATALOGUE.courses;
  assert.equal(cs.length,24);assert.equal(CATALOGUE.durationHours,192);
  assert.equal(cs.reduce((a,c)=>a+c.units.length,0),96);
  assert.equal(cs.reduce((a,c)=>a+c.quiz.length,0),120);
  assert.equal(cs.reduce((a,c)=>a+c.exam.length,0),72);
  assert.deepEqual(cs.map(c=>c.id),Array.from({length:24},(_,i)=>"SA-"+String(i+1).padStart(2,"0")));
  for(const c of cs){
    assert.equal(c.durationHours,8);assert.equal(c.goals.length,3);assert.equal(c.units.length,4);
    assert.equal(c.exercises.length,2);assert.equal(c.quiz.length,5);assert.equal(c.exam.length,3);
    assert.equal(c.exam.reduce((n,e)=>n+e.points,0),100);
    assert.ok(c.units.every(x=>x.body.length>90));
    assert.ok(c.quiz.every(q=>q.reponse===undefined&&q.points===20));
  }
});
class FakeDB {
 constructor(){this.subs=new Map();this.att=new Map();this.certs=new Map();this.autorisations=new Set(CATALOGUE.courses.map(c=>c.id));}
 prepare(sql){
  const d=this;
  return {values:[],bind(...v){this.values=v;return this},
    async run(){
      const v=this.values;
      if(sql.startsWith("INSERT INTO academy_2027_submissions"))d.subs.set(v[0],{id:v[0],compte:v[1],cours:v[2],type:v[3],reponses:v[4],statut:"en_attente",score:null,commentaire:"",date_soumission:v[5]});
      if(sql.startsWith("UPDATE academy_2027_submissions")){const a=d.subs.get(v[4]);if(a&&a.statut==="en_attente"){a.statut="note";a.score=v[0];a.commentaire=v[1];}}
      if(sql.startsWith("INSERT INTO academy_2027_suivi"))d.att.set(v[0]+":"+v[1],{compte:v[0],cours:v[1],presence:v[2],participation:v[3]});
      if(sql.startsWith("INSERT OR IGNORE INTO academy_2027_attestations")){const k=v[0]+":"+v[1];if(!d.certs.has(k))d.certs.set(k,{compte:v[0],niveau:v[1],code:v[2],delivree_le:v[3]});}
      return {success:true};
    },
    async first(){
      const v=this.values;
      if(sql.startsWith("SELECT id FROM academy_2027_submissions"))return [...d.subs.values()].find(s=>s.compte===v[0]&&s.cours===v[1]&&s.type===v[2]&&s.statut==="en_attente")||null;
      if(sql.startsWith("SELECT id,compte,statut FROM academy_2027_submissions"))return d.subs.get(v[0])||null;
      if(sql.startsWith("SELECT statut FROM academy_2027_acces"))return v[0]==="student-2027"&&d.autorisations.has(v[1])?{statut:"approuve"}:null;
      return null;
    },
    async all(){
      const v=this.values;
      if(sql.startsWith("SELECT id,cours,type,statut,score,commentaire,date_soumission"))return {results:[...d.subs.values()].filter(s=>s.compte===v[0])};
      if(sql.startsWith("SELECT cours,statut,demande_le,decision_le,commentaire FROM academy_2027_acces"))return {results:v[0]==="student-2027"?[...d.autorisations].map(cours=>({cours,statut:"approuve",demande_le:1,decision_le:1,commentaire:""})):[]};
      if(sql.startsWith("SELECT cours,presence,participation"))return {results:[...d.att.values()].filter(s=>s.compte===v[0])};
      if(sql.startsWith("SELECT niveau,code,delivree_le"))return {results:[...d.certs.values()].filter(s=>s.compte===v[0])};
      if(sql.startsWith("SELECT a.id,a.compte"))return {results:[...d.subs.values()].filter(s=>s.statut==="en_attente").map(s=>({...s,nom:s.compte}))};
      if(sql.startsWith("SELECT DISTINCT compte,cours"))return {results:[...d.subs.values()].map(s=>({compte:s.compte,cours:s.cours}))};
      return {results:[]};
    }
  }
 }
}
const env={DB:new FakeDB()};
const student={connecte:true,id:"student-2027",nom:"Soldat Étudiant",niveau:0};
const other={connecte:true,id:"other-2027",nom:"Autre membre",niveau:0};
const trainer={connecte:true,id:"trainer-2027",nom:"Formateur",niveau:2};
async function call(path,user=student,body,method=body?"POST":"GET"){
  const url="https://mouvement-sde.org"+path;
  const req=new Request(url,{method,headers:body?{"content-type":"application/json"}:{},body:body===undefined?undefined:JSON.stringify(body)});
  const resp=await soldiersAcademyApi(req,env,user,new URL(url).pathname);
  return {status:resp.status,result:await resp.json()};
}
test("Droits : authentification, corrections privées, progression isolée et niveaux verrouillés",async()=>{
  assert.equal((await call("/api/soldiers-academy",{connecte:false})).status,401);
  const s=await call("/api/soldiers-academy");
  assert.equal(s.result.courses.length,24);
  assert.equal(s.result.progress.passed,0);
  assert.equal(s.result.courses[8].locked,true);
  assert.equal((await call("/api/soldiers-academy/cours/SA-09")).status,403);
  assert.equal((await call("/api/soldiers-academy/cours/SA-01")).status,200);
  assert.equal((await call("/api/soldiers-academy/gestion")).status,403);
  assert.equal((await call("/api/soldiers-academy/attestation?niveau=1")).status,403);
  assert.equal((await call("/api/soldiers-academy/corrections")).status,404);
});
async function passOne(id){
  const c=CATALOGUE.courses.find(x=>x.id===id);
  for(const type of ["quiz","exercises","exam"]){
    const items=c[type];
    const answers=items.map((_,i)=>"Analyse biblique contextualisée et application concrète, réponse "+(i+1)+".");
    const submit=await call("/api/soldiers-academy/soumettre",student,{courseId:id,type,answers});
    assert.equal(submit.status,201);
    assert.equal((await call("/api/soldiers-academy/soumettre",student,{courseId:id,type,answers})).status,409);
    assert.equal((await call("/api/soldiers-academy/noter",student,{id:submit.result.id,score:95,comment:"Validé."},"PATCH")).status,403);
    assert.equal((await call("/api/soldiers-academy/noter",trainer,{id:submit.result.id,score:90,comment:"Travail sérieux et clair."},"PATCH")).status,200);
  }
  assert.equal((await call("/api/soldiers-academy/assiduite",trainer,{compte:student.id,courseId:id,attendance:90,participation:90},"PATCH")).status,200);
}
test("Notation et attestation du niveau 1 après huit cours",async()=>{
  await passOne("SA-01");
  let p=(await call("/api/soldiers-academy")).result;
  assert.equal(p.progress.passed,1);
  assert.equal(p.courses[0].average,90);
  assert.equal(p.courses[0].feedback.length,3,"Les corrections des trois évaluations doivent être consultables par leur apprenant");
  assert.equal(p.courses[8].locked,true);
  assert.equal((await call("/api/soldiers-academy",other)).result.progress.passed,0);
  for(let i=2;i<=8;i++)await passOne("SA-"+String(i).padStart(2,"0"));
  p=(await call("/api/soldiers-academy")).result;
  assert.equal(p.progress.passed,8);
  assert.equal(p.courses[8].locked,false);
  assert.equal(p.certificates.length,1);
  assert.match(p.certificates[0].code,/^SDE-ACA-2027-N1-[A-F0-9-]{8}$/);
  assert.equal((await call("/api/soldiers-academy/attestation?niveau=1")).status,200);
  assert.equal((await call("/api/soldiers-academy/attestation?niveau=2")).status,403);
});
test("Liens et route publique du nouveau programme",()=>{
  const worker=readFileSync(new URL("../src/worker.js",import.meta.url),"utf8");
  const app=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
  const academy=readFileSync(new URL("../public/vitrine/academy.html",import.meta.url),"utf8");
  const page=readFileSync(new URL("../public/vitrine/sde-academy-parcours.html",import.meta.url),"utf8");
  const parcoursJs=readFileSync(new URL("../public/vitrine/sde-academy-parcours.js",import.meta.url),"utf8");
  assert.match(parcoursJs,/Retours de correction/);
  assert.match(parcoursJs,/aide\?\.consignes/);
  assert.match(worker,/soldiersAcademyApi\(req, env, u, p\)/);
  assert.match(worker,/\/academy-programme-24/);
  assert.match(app,/Ouvrir le poste pédagogique|Ouvrir mes cours et mon parcours/);
  assert.match(app,/academy27-levels/);
  assert.doesNotMatch(app.slice(app.indexOf("  VUES.academie = function () {"),app.indexOf("  /* ── Préinscriptions Academy (admin) ── */")),/ajout-formation|renderNiveaux/);
  assert.match(academy,/Accéder à mes 24 cours/);
  assert.match(page,/192 heures/);
  assert.doesNotMatch(page,/12 cours/);
});
