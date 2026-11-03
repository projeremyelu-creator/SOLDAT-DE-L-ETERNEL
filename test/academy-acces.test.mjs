import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "../src/soldiers-academy-2027.js";
import {mediaAcademyAutorise} from "../src/soldiers-academy-acces.js";
import {mediaLoveAutorise} from "../src/love-school-acces.js";
const ORIGIN="https://mouvement-sde.org";
const compte=id=>({connecte:true,id,nom:id,niveau:0});
const apprenant=compte("new-student"),autre=compte("autre-student"),prof=compte("prof-id"),direction={connecte:true,id:"direction",nom:"Direction",niveau:2};
function environnement(){
 const sql=new DatabaseSync(":memory:");
 sql.exec(readFileSync("schema.sql","utf8"));
 for(const [id,email] of [["new-student","new@test.local"],["autre-student","autre@test.local"],["prof-id","prof@test.local"],["direction","direction@test.local"]])
   sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run(email,id,id,"attente",1);
 const stmt=(query,params=[])=>({
   bind:(...args)=>stmt(query,args),
   first:async()=>sql.prepare(query).get(...params)??null,
   all:async()=>({results:sql.prepare(query).all(...params)}),
   run:async()=>{const result=sql.prepare(query).run(...params);return {meta:{changes:result.changes}}}
 });
 return {env:{DB:{prepare:q=>stmt(q)},PROPRIETAIRES:"direction@test.local"},sql};
}
async function appel(env,user,method,path,payload){
 const r=await soldiersAcademyApi(new Request(ORIGIN+path,{method,headers:{"content-type":"application/json"},body:payload===undefined?undefined:JSON.stringify(payload)}),env,user,path.split("?")[0]);
 return {status:r.status,body:await r.json()};
}
const get=(env,user,p)=>appel(env,user,"GET",p);
const post=(env,user,p,b)=>appel(env,user,"POST",p,b);
const patch=(env,user,p,b)=>appel(env,user,"PATCH",p,b);
const ROOT="/api/soldiers-academy";
const requestCourse=(env,id,user=apprenant)=>post(env,user,ROOT+"/acces/demander",{cours:id});
const decide=(env,id,user=direction,compteId=apprenant.id,decision="approuve")=>patch(env,user,ROOT+"/acces/decision",{cours:id,compte:compteId,decision});
const submit=(env,id,user=apprenant)=>post(env,user,ROOT+"/soumettre",{courseId:id,type:"quiz",answers:Array.from({length:PROGRAMME.courses.find(c=>c.id===id)?.quiz.length||0},()=> "Une réponse biblique argumentée et respectueuse.")});

test("Soldiers Academy : les 24 fiches affichent objectifs, conditions et restrictions, sans contenu avant accord",async()=>{
 const {env}=environnement();
 const anonyme=await get(env,{connecte:false,id:null},ROOT);
 assert.equal(anonyme.status,401);
 const r=await get(env,apprenant,ROOT);
 assert.equal(r.status,200);
 assert.equal(r.body.courses.length,24);
 assert.deepEqual(r.body.courses.map(x=>x.id),PROGRAMME.courses.map(x=>x.id));
 assert.equal(r.body.programme.durationHours,192);
 assert.equal(r.body.progress.passed,0);
 for(const course of r.body.courses){
   assert.equal(course.locked,true,course.id);
   assert.equal(course.acces.statut,"verrouille",course.id);
   assert.equal(course.acces.autorise,false);
   assert.ok(course.objectifs.length>=2&&course.conditions.length>=4&&course.restrictions.length>=5,course.id);
   assert.equal(course.units,undefined,course.id);
   assert.equal(course.exam,null,course.id+' : seul le score, pas les consignes');
   assert.equal((await get(env,apprenant,ROOT+"/cours/"+course.id)).status,403,course.id);
 }
 const denied=await submit(env,"SA-01");assert.equal(denied.status,403);
 const other=await get(env,autre,ROOT);assert.equal(other.body.courses[0].locked,true);
});

test("Soldiers Academy : demande, validation limitée au formateur désigné et accès isolé",async()=>{
 const {env}=environnement();
 const demande=await requestCourse(env,"SA-01");
 assert.equal(demande.status,201);assert.equal(demande.body.statut,"en_attente");
 assert.equal((await requestCourse(env,"SA-01")).body.statut,"en_attente");
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,403);
 assert.equal((await decide(env,"SA-01",prof)).status,403);
 assert.equal((await post(env,direction,ROOT+"/formateurs",{compte:"prof@test.local",fonction:"coach",portees:["SA-01"]})).status,201);
 assert.equal((await decide(env,"SA-02",prof)).status,403);
 assert.equal((await decide(env,"SA-01",prof)).status,200);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,200);
 assert.equal((await submit(env,"SA-01")).status,201,"Le quiz s'ouvre seulement après accord");
 assert.equal((await get(env,autre,ROOT+"/cours/SA-01")).status,403,"L'accord n'est pas collectif");
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-02")).status,403,"L'accord n'ouvre pas un autre cours");
 const gestion=await get(env,prof,ROOT+"/acces/gestion");
 assert.equal(gestion.status,200);
 assert.ok(gestion.body.demandes.some(x=>x.cours==="SA-01"&&x.compte===apprenant.id));
 assert.ok(!gestion.body.autorisees.includes("SA-02"));
 assert.equal((await decide(env,"SA-01",prof)).status,409,"La décision ne se double pas");
 const journal=(await env.DB.prepare("SELECT * FROM academy_2027_acces_journal WHERE compte=?").bind(apprenant.id).all()).results;
 assert.ok(journal.some(x=>x.apres==="en_attente")&&journal.some(x=>x.apres==="approuve"),"Historique des décisions");
});

test("Soldiers Academy : refus, relance, révocation et contrôle des évaluations",async()=>{
 const {env}=environnement();
 assert.equal((await requestCourse(env,"SA-01")).status,201);
 assert.equal((await decide(env,"SA-01",direction,apprenant.id,"refuse")).status,200);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,403);
 assert.equal((await requestCourse(env,"SA-01")).status,201);
 assert.equal((await decide(env,"SA-01")).status,200);
 assert.equal((await decide(env,"SA-01",direction,apprenant.id,"revoque")).status,200);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,403);
 assert.equal((await submit(env,"SA-01")).status,403);
 assert.equal((await requestCourse(env,"SA-01")).status,201,"L'apprenant peut redemander");
 assert.equal((await decide(env,"SA-01")).status,200);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,200);
});

test("Soldiers Academy : les niveaux II et III conservent leur prérequis et le verrou individuel",async()=>{
 const {env}=environnement();
 for(const id of ["SA-09","SA-17"])assert.equal((await requestCourse(env,id)).status,403);
 const before=await get(env,apprenant,ROOT);
 assert.equal(before.body.courses.find(x=>x.id==="SA-09").acces.prerequisNiveau,false);
 assert.equal(before.body.courses.find(x=>x.id==="SA-17").acces.prerequisNiveau,false);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-09")).status,403);
});

test("Soldiers Academy : ressources numériques et médias fermés jusqu'à validation",async()=>{
 const {env,sql}=environnement();
 assert.equal((await post(env,direction,ROOT+"/formateurs",{compte:"prof@test.local",fonction:"enseignant",portees:["SA-01","SA-02"]})).status,201);
 const created=await post(env,prof,ROOT+"/ressources",{portee:"SA-01",type:"note",titre:"Support exclusif",texte:"La grâce et la foi sont expliquées dans ce support."});
 assert.equal(created.status,201);
 let state=await get(env,apprenant,ROOT);
 assert.equal(state.body.ressources.parCours["SA-01"],undefined);
 let etat=await get(env,apprenant,ROOT+"/ressources/etat");
 assert.equal(etat.body.ressources.parCours["SA-01"],undefined);
 await requestCourse(env,"SA-01");await decide(env,"SA-01");
 state=await get(env,apprenant,ROOT);
 assert.equal(state.body.ressources.parCours["SA-01"],1);
 const detail=await get(env,apprenant,ROOT+"/cours/SA-01");
 assert.equal(detail.body.ressources[0].titre,"Support exclusif");
 assert.equal((await get(env,autre,ROOT)).body.ressources.parCours["SA-01"],undefined);
 const mediaId="abcdefghij0123456789";
 sql.prepare("INSERT INTO academy_2027_ressources(id,portee,type,titre,description,url,media,genre,texte,auteur,auteur_nom,publie,cree,maj) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .run("test-media-1","SA-02","fichier","Support test","","/m/"+mediaId+"/support.pdf",mediaId,"pdf","",prof.id,prof.nom,1,1,1);
 assert.equal((await mediaAcademyAutorise(env,apprenant,mediaId)).autorise,false);
 assert.equal((await mediaAcademyAutorise(env,direction,mediaId)).autorise,true);
 await requestCourse(env,"SA-02");await decide(env,"SA-02");
 assert.equal((await mediaAcademyAutorise(env,apprenant,mediaId)).autorise,true);
 assert.equal((await mediaAcademyAutorise(env,autre,mediaId)).autorise,false);
});

test("Soldiers Academy : conserver l'accès déjà entamé sans déverrouiller les autres",async()=>{
 const {env,sql}=environnement();
 await get(env,apprenant,ROOT); // Initialise les tables de suivi sans modifier les archives
 sql.prepare("INSERT INTO academy_2027_submissions(id,compte,cours,type,reponses,statut,date_soumission) VALUES(?,?,?,?,?,?,?)")
   .run("historique1",apprenant.id,"SA-01","quiz","[]","en_attente",1);
 const r=await get(env,apprenant,ROOT);
 const sa1=r.body.courses.find(x=>x.id==="SA-01");
 assert.equal(sa1.acces.anterieurementCommence,true);
 assert.equal(sa1.locked,false);
 assert.equal(r.body.courses.find(x=>x.id==="SA-02").locked,true);
 assert.equal((await get(env,apprenant,ROOT+"/cours/SA-01")).status,200);
 assert.equal((await get(env,autre,ROOT+"/cours/SA-01")).status,403);
});
