import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MODULES_ACADEMY,NIVEAUX_ACADEMY} from "../src/sde-academy-catalogue.js";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";

const repoRoot=new URL("../",import.meta.url);
test("Douze fiches complètes et 60 questions vérifiables",()=>{
  assert.equal(MODULES_ACADEMY.length,12);
  assert.equal(NIVEAUX_ACADEMY.length,4);
  assert.equal(new Set(MODULES_ACADEMY.map(m=>m.id)).size,12);
  assert.equal(MODULES_ACADEMY.reduce((n,m)=>n+m.quiz.length,0),60);
  const noms=["Identité en Christ","Prière et intimité","Parole de Dieu","Sainteté et maturité","Saint-Esprit et dons","Intercession","Discernement prophétique","Évangélisation","Leadership","Gouvernance","Entrepreneuriat","Impact humanitaire"];
  assert.deepEqual(MODULES_ACADEMY.map(m=>m.titre),noms);
  MODULES_ACADEMY.forEach((m,i)=>{
    assert.equal(m.numero,i+1);
    assert.equal(m.niveau,Math.floor(i/3)+1);
    assert.ok(m.objectifs.length>=3,m.titre+" objectifs");
    assert.ok(m.chapitres.length>=3,m.titre+" chapitres");
    assert.ok(m.chapitres.every(c=>c.titre.length>4&&c.contenu.length>240),m.titre+" explications");
    assert.ok(m.exercices.length>=2,m.titre+" exercices");
    assert.ok(m.exercices.every(e=>e.criteres.length>=3&&e.livrable),m.titre+" grilles");
    assert.ok(m.references.length>=3,m.titre+" textes");
    assert.equal(m.quiz.length,5);
    assert.ok(m.quiz.every(q=>q.choix.length===3&&q.reponse>=0&&q.reponse<3&&q.explication.length>20),m.titre+" quiz");
    assert.equal(m.validation.quizMinimum,80);
    assert.equal(m.validation.formateurValide,true);
  });
  NIVEAUX_ACADEMY.forEach((n,i)=>assert.deepEqual(n.modules,MODULES_ACADEMY.slice(i*3,i*3+3).map(m=>m.id)));
});
class FakeDB{
  constructor(){this.rows=new Map()}
  prepare(sql){
    const db=this;
    return {sql,values:[],bind(...values){this.values=values;return this},
      async run(){
        if(sql.startsWith("INSERT INTO academy_parcours"))db.rows.set(this.values[0],JSON.parse(this.values[1]));
        return {success:true};
      },
      async first(){
        if(sql.startsWith("SELECT data FROM academy_parcours")){const d=db.rows.get(this.values[0]);return d?{data:JSON.stringify(d)}:null}
        return null;
      },
      async all(){
        if(sql.startsWith("SELECT a.compte,a.data"))return {results:[...db.rows].map(([compte,d])=>({compte,data:JSON.stringify(d),nom:compte}))};
        return {results:[]};
      }
    }
  }
}
const env={DB:new FakeDB()};
const member={connecte:true,id:"test-member",nom:"Soldat Test",niveau:0};
const trainer={connecte:true,id:"test-admin",nom:"Formateur Test",niveau:2};
const req=(path,body,method="POST")=>new Request("https://mouvement-sde.org"+path,{method,headers:body===undefined?{}:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
async function call(path,user,body,method=body===undefined?"GET":"POST"){
  const r=await soldiersAcademyApi(req(path,body,method),env,user,path);
  return {status:r.status,body:await r.json()};
}
const keyFor=(m,i)=>{const q=m.quiz[i],rotation=(i*2+Math.floor(i/3)+m.numero)%3;return (q.reponse-rotation+3)%3};
test("Accès privé : session, cours verrouillés et clés cachées",async()=>{
  const path="/api/soldiers-academy";
  assert.equal((await call(path,{connecte:false,id:null})).status,401);
  const {body}=await call(path,member);
  assert.equal(body.resume.pourcentage,0);
  assert.equal(body.modules.length,12);
  assert.equal(body.modules[3].verrouille,true);
  assert.equal(body.modules[3].chapitres,undefined);
  assert.equal(body.modules[0].quiz[0].reponse,undefined);
  assert.equal(body.modules[0].chapitres.length,3);
  assert.equal((await call("/api/soldiers-academy/corrections",member)).status,403);
  assert.equal((await call("/api/soldiers-academy/examen",member,{niveau:1,reponses:[0,0,0,0,0]})).status,403);
});
test("Évaluation réelle : quiz + correction du travail + examen de niveau",async()=>{
  for(const m of MODULES_ACADEMY.slice(0,3)){
    const answers=m.quiz.map((q,i)=>keyFor(m,i));
    const passed=(await call("/api/soldiers-academy/quiz",member,{moduleId:m.id,reponses:answers})).body;
    assert.equal(passed.score,100);
    const text="Synthèse écrite de mon exercice pratique : j'ai relu les passages, décrit ma démarche, appliqué chaque critère et identifié une amélioration réalisable.";
    const submitted=await call("/api/soldiers-academy/exercice",member,{moduleId:m.id,texte:text});
    assert.equal(submitted.status,200);
    const pending=(await call("/api/soldiers-academy/corrections",trainer)).body.demandes;
    assert.ok(pending.some(x=>x.moduleId===m.id&&x.compte===member.id));
    const approved=await call("/api/soldiers-academy/correction",trainer,{moduleId:m.id,compte:member.id,statut:"valide",commentaire:"Travail vérifié."},"PATCH");
    assert.equal(approved.status,200);
  }
  const before=(await call("/api/soldiers-academy",member)).body;
  assert.equal(before.resume.valides,3);
  assert.equal(before.resume.pourcentage,25);
  assert.equal(before.niveaux[0].examenDisponible,true);
  assert.equal(before.niveaux[1].verrouille,true);
  const firstExam=[0,1,2,3,4].map(i=>(3-((i*2+Math.floor(i/3)+1)%3))%3);
  const exam=await call("/api/soldiers-academy/examen",member,{niveau:1,reponses:firstExam});
  assert.equal(exam.status,200);
  assert.equal(exam.body.score,100);
  assert.match(exam.body.attestation,/^SDE-ACA-\d{4}-[A-F0-9]{8}$/);
  const after=(await call("/api/soldiers-academy",member)).body;
  assert.equal(after.niveaux[0].valide,true);
  assert.equal(after.modules[3].verrouille,false);
  assert.equal(after.resume.pourcentage,25);
});
test("Page et routes intégrées dans le portail, sans modifier la vitrine publique",()=>{
  const worker=readFileSync(new URL("../src/worker.js",import.meta.url),"utf8");
  const app=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
  const academy=readFileSync(new URL("../public/vitrine/academy.html",import.meta.url),"utf8");
  assert.match(worker,/soldiersAcademyApi\(req, env, u, p\)/);
  assert.match(worker,/\/mon-espace\/academy/);
  assert.match(worker,/\/administration\/academy/);
  assert.match(app,/Ouvrir mon parcours et mes 12 cours/);
  assert.match(academy,/Accéder à mes 12 cours/);
});
