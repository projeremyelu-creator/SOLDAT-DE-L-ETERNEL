import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";
import {SOLDIERS_ACADEMY_2027} from "../src/soldiers-academy-2027.js";
import {LOVE_SCHOOL} from "../src/love-school.js";

const ROOT="/api/soldiers-academy",DYN=ROOT+"/dynamique";
const apprenant={connecte:true,id:"apprenant",nom:"Élève",niveau:0};
const autre={connecte:true,id:"autre",nom:"Autre",niveau:0};
const prof={connecte:true,id:"prof",nom:"Coach",niveau:0};
const admin={connecte:true,id:"admin",nom:"Direction",niveau:2};
const ORIGIN="https://app.mouvement-sde.org";
function world(){
 const sql=new DatabaseSync(":memory:");
 sql.exec(readFileSync("schema.sql","utf8"));
 for(const [id,email] of [["apprenant","apprenant@exemple.test"],["autre","autre@exemple.test"],["prof","prof@exemple.test"],["admin","admin@exemple.test"]])
  sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run(email,id,id,"attente",1);
 const stmt=(query,args=[])=>({
  bind:(...vals)=>stmt(query,vals),
  first:async()=>sql.prepare(query).get(...args)??null,
  all:async()=>({results:sql.prepare(query).all(...args)}),
  run:async()=>{const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}
 });
 const env={DB:{prepare:q=>stmt(q)},PROPRIETAIRES:"admin@exemple.test"};
 const call=async(u,method,path,body)=>{
   const r=await soldiersAcademyApi(new Request(ORIGIN+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)}),env,u,path.split("?")[0]);
   return {status:r.status,json:await r.json()};
 };
 return {sql,env,call};
}
const future=()=>new Date(Date.now()+86400e3).toISOString();
async function autoriser(w,cours="SA-01",eleve=apprenant){
 let r=await w.call(eleve,"POST",ROOT+(cours.startsWith("LS")?"/love-school/acces/demander":"/acces/demander"),{cours});
 assert.equal(r.status,201,JSON.stringify(r.json));
 r=await w.call(admin,"PATCH",ROOT+(cours.startsWith("LS")?"/love-school/acces/decision":"/acces/decision"),{cours,compte:eleve.id,decision:"approuve"});
 assert.equal(r.status,200,JSON.stringify(r.json));
}
test("Phase 1 : progression de lecture par compte et cours autorisé, non comptée comme note",async()=>{
 const w=world();
 assert.equal((await w.call({connecte:false,id:""},"GET",DYN+"/tableau")).status,401);
 const t0=await w.call(apprenant,"GET",DYN+"/tableau");
 assert.equal(t0.status,200);
 assert.equal(t0.json.resume.coursAutorises,0);
 assert.equal((await w.call(apprenant,"GET",DYN+"/cours?id=SA-01")).status,403);
 assert.equal((await w.call(apprenant,"POST",DYN+"/lecon",{cours:"SA-01",lecon:1,terminee:true})).status,403);
 await autoriser(w);
 const before=await w.call(apprenant,"GET",DYN+"/cours?id=SA-01");
 assert.equal(before.status,200);assert.equal(before.json.totalLecons,4);
 assert.equal(before.json.quiz.length,0);
 assert.equal((await w.call(apprenant,"POST",DYN+"/lecon",{cours:"SA-01",lecon:5,terminee:true})).status,400);
 assert.equal((await w.call(apprenant,"POST",DYN+"/lecon",{cours:"SA-01",lecon:1,terminee:true})).status,200);
 assert.equal((await w.call(autre,"POST",DYN+"/lecon",{cours:"SA-01",lecon:1,terminee:true})).status,403);
 const after=await w.call(apprenant,"GET",DYN+"/tableau");
 assert.equal(after.json.resume.leconsEtudiees,1);
 assert.equal(after.json.resume.reprendre,"SA-01");
 assert.equal(after.json.progressions["SA-01"],1);
 const main=await w.call(apprenant,"GET",ROOT);
 assert.equal(main.json.progress.passed,0);
 assert.equal(main.json.courses[0].average,null);
 assert.equal((await w.call(apprenant,"POST",DYN+"/lecon",{cours:"SA-01",lecon:1,terminee:false})).status,200);
 assert.equal((await w.call(apprenant,"GET",DYN+"/tableau")).json.resume.leconsEtudiees,0);
 assert.equal((await w.call(autre,"GET",DYN+"/cours?id=SA-01")).status,403);
});

test("Phase 2 : coach délégué crée un QCM et l'apprenant reçoit un retour formatif sans corrigé avant réponse",async()=>{
 const w=world();
 await autoriser(w);
 const data={cours:"SA-01",question:"Quelle proposition exprime le mieux la grâce ?",choix:["Elle est un don","Elle s'achète","Elle est une performance"],reponse:0,explication:"La grâce est un don gratuit et non un mérite personnel."};
 assert.equal((await w.call(apprenant,"POST",DYN+"/studio/quiz",data)).status,403);
 assert.equal((await w.call(prof,"POST",DYN+"/studio/quiz",data)).status,403,"pas de rôle d'enseignant autoproclamé");
 assert.equal((await w.call(admin,"POST",ROOT+"/formateurs",{compte:"prof@exemple.test",fonction:"coach",portees:["SA-01","LS-01"]})).status,201);
 assert.equal((await w.call(prof,"POST",DYN+"/studio/quiz",{...data,cours:"SA-02"})).status,403);
 const added=await w.call(prof,"POST",DYN+"/studio/quiz",data);
 assert.equal(added.status,201);
 const lesson=(await w.call(apprenant,"GET",DYN+"/cours?id=SA-01")).json;
 assert.equal(lesson.quiz.length,1);
 assert.equal(lesson.quiz[0].question,data.question);
 assert.equal(lesson.quiz[0].reponse,undefined,"correction absente avant l'entraînement");
 assert.equal(lesson.quiz[0].explication,undefined);
 const attempt=await w.call(apprenant,"POST",DYN+"/quiz/repondre",{id:added.json.id,choix:1});
 assert.equal(attempt.status,200);assert.equal(attempt.json.reussi,false);
 assert.equal(attempt.json.correction,0);
 assert.equal((await w.call(autre,"POST",DYN+"/quiz/repondre",{id:added.json.id,choix:0})).status,403);
 const correct=await w.call(apprenant,"POST",DYN+"/quiz/repondre",{id:added.json.id,choix:0});
 assert.equal(correct.json.reussi,true);
 assert.equal((await w.call(apprenant,"GET",DYN+"/tableau")).json.resume.activitesReussies,1);
 const programme=await w.call(apprenant,"GET",ROOT);
 assert.equal(programme.json.courses[0].quiz,null,"QCM d'entraînement distincts des quiz officiels");
 assert.equal(programme.json.progress.passed,0);
});

test("Phase 3 : classe Meet protégée, annulable et visible seulement pour les cours validés",async()=>{
 const w=world();await autoriser(w);
 await w.call(admin,"POST",ROOT+"/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01"]});
 const params={cours:"SA-01",titre:"Séance biblique du mardi",debut:future(),duree:60,lien:"https://meet.google.com/abc-defg-hij"};
 assert.equal((await w.call(prof,"POST",DYN+"/studio/seance",{...params,lien:"https://evil.com/abc"})).status,400);
 assert.equal((await w.call(prof,"POST",DYN+"/studio/seance",{...params,cours:"SA-02"})).status,403);
 const added=await w.call(prof,"POST",DYN+"/studio/seance",params);
 assert.equal(added.status,201);
 const dashboard=await w.call(apprenant,"GET",DYN+"/tableau");
 assert.equal(dashboard.json.seances.length,1);
 assert.equal(dashboard.json.seances[0].lien,params.lien);
 assert.equal((await w.call(autre,"GET",DYN+"/tableau")).json.seances.length,0);
 assert.equal((await w.call(apprenant,"POST",DYN+"/studio/annuler",{id:added.json.id})).status,403);
 assert.equal((await w.call(prof,"POST",DYN+"/studio/annuler",{id:added.json.id})).status,200);
 assert.equal((await w.call(apprenant,"GET",DYN+"/tableau")).json.seances.length,0);
});

test("Phase 3 : question pédagogique privée, réponse réservée aux coachs habilités",async()=>{
 const w=world();await autoriser(w);
 await w.call(admin,"POST",ROOT+"/formateurs",{compte:"prof@exemple.test",fonction:"coach",portees:["SA-01"]});
 assert.equal((await w.call(apprenant,"POST",DYN+"/question",{cours:"SA-01",question:"Oui"})).status,400);
 const req=await w.call(apprenant,"POST",DYN+"/question",{cours:"SA-01",question:"Comment appliquer ce texte biblique au quotidien ?"});
 assert.equal(req.status,201);
 assert.equal((await w.call(autre,"GET",DYN+"/cours?id=SA-01")).status,403);
 const list=await w.call(prof,"GET",DYN+"/studio");
 assert.equal(list.json.questions.length,1);
 assert.equal((await w.call(apprenant,"POST",DYN+"/studio/repondre",{id:req.json.id,reponse:"Appliquez ce principe dans un exercice de réflexion."})).status,403);
 assert.equal((await w.call(prof,"POST",DYN+"/studio/repondre",{id:req.json.id,reponse:"Commencez par une lecture attentive, puis réfléchissez à un exemple concret."})).status,200);
 const got=await w.call(apprenant,"GET",DYN+"/cours?id=SA-01");
 assert.ok(got.json.questions[0].reponse.includes("lecture attentive"));
 assert.equal(got.json.questions[0].repondu!==null,true);
 const alert=w.sql.prepare("SELECT COUNT(*) AS n FROM academy_2027_avis WHERE compte=?").get("apprenant");
 assert.equal(alert.n,1,"réponse notifiée à l'élève");
});

test("Phase 4 : indicateurs agrégés réservés à la direction et activités Love School non adultes",async()=>{
 const w=world();await autoriser(w);await autoriser(w,"LS-01");
 assert.equal((await w.call(apprenant,"GET",DYN+"/pilotage")).status,403);
 assert.equal((await w.call(prof,"GET",DYN+"/pilotage")).status,403);
 const love=await w.call(apprenant,"GET",DYN+"/cours?id=LS-01");
 assert.equal(love.status,200);
 assert.equal(love.json.totalLecons,LOVE_SCHOOL.courses.find(x=>x.id==="LS-01").lessons.length);
 assert.equal((await w.call(apprenant,"POST",DYN+"/lecon",{cours:"LS-01",lecon:1,terminee:true})).status,200);
 assert.equal((await w.call(apprenant,"GET",DYN+"/cours?id=LS-09")).status,404,"aucune API adulte via cet endpoint sans contrôle d'âge");
 const r=await w.call(admin,"GET",DYN+"/pilotage");
 assert.equal(r.status,200);
 assert.equal(r.json.indicateurs.leconsEtudiees,1);
 assert.ok(!JSON.stringify(r.json).includes("apprenant@exemple.test"));
 assert.equal(SOLDIERS_ACADEMY_2027.courses.length,24);
});

test("Phase 2 : publication différée respecte le jour d'ouverture",async()=>{
 const w=world();await autoriser(w);await w.call(admin,"POST",ROOT+"/formateurs",{compte:"prof@exemple.test",fonction:"coach",portees:["SA-01"]});
 const added=await w.call(prof,"POST",DYN+"/studio/quiz",{cours:"SA-01",question:"Pourquoi faut-il étudier ce texte ?",choix:["Pour comprendre","Pour confondre"],reponse:0,explication:"Comprendre le sens du passage dans son contexte.",publication:future()});
 assert.equal(added.status,201);
 assert.equal((await w.call(apprenant,"GET",DYN+"/cours?id=SA-01")).json.quiz.length,0);
 assert.equal((await w.call(apprenant,"POST",DYN+"/quiz/repondre",{id:added.json.id,choix:0})).status,404);
 const coach=await w.call(prof,"GET",DYN+"/studio");
 assert.equal(coach.json.activites.length,1,"le coach peut inspecter le contenu programmé");
});

test("UI : tableaux, cours et studio chargent réellement les nouveaux scripts",()=>{
 const student=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
 const prof=readFileSync("public/vitrine/academy-enseignants.html","utf8");
 const script=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 const style=readFileSync("public/vitrine/sde-academy-dynamique.css","utf8");
 for(const name of ["academyDynDashboard","sde-academy-dynamique.js","sde-academy-dynamique.css"])assert.ok(student.includes(name),name);
 for(const name of ["dynFormQuiz","dynFormMeet","dynStudioMessages","dynPilotageMetrics","sde-academy-studio-dynamique.js"])assert.ok(prof.includes(name),name);
 for(const name of ["data-dyn-termine","academyDynCourse","academyDynActivities","academyDynLove","SDEAcademyDyn"])assert.ok(script.includes(name),name);
 assert.match(style,/prefers-reduced-motion/);
 assert.match(style,/max-width:760px/);
});
