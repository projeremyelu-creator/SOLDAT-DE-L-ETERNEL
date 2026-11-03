import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {JSDOM} from "jsdom";
import {academyContenusApi} from "../src/academy-contenus.js";

const base="/api/soldiers-academy/contenus";
const users={
 admin:{connecte:true,id:"admin1",niveau:2,nom:"Direction"},
 teacher:{connecte:true,id:"teacher1",niveau:0,nom:"Enseignant"},
 coach:{connecte:true,id:"coach1",niveau:0,nom:"Coach"},
 student:{connecte:true,id:"student1",niveau:0,nom:"Apprenant"},
 student2:{connecte:true,id:"student2",niveau:0,nom:"Apprenant 2"},
 anonymous:{connecte:false,id:null,niveau:0}
};
function world(){
 const db=new DatabaseSync(":memory:");
 db.exec(readFileSync(new URL("../schema.sql",import.meta.url),"utf8"));
 for(const [id,nom] of [["admin1","Direction"],["teacher1","Enseignant"],["coach1","Coach"],["student1","Apprenant"],["student2","Apprenant 2"]])
  db.prepare("INSERT INTO comptes(email,id,nom,role) VALUES(?,?,?,?)").run(id+"@sde.test",id,nom,"membre");
 const values=new Map();
 const storage={put:async(k,v)=>values.set(k,v),get:async k=>values.get(k)||null,delete:async k=>values.delete(k)};
 const env={DB:{prepare(sql){return{bind(...args){this.args=args;return this},
   async first(){return db.prepare(sql).get(...(this.args||[]))||null},
   async all(){return{results:db.prepare(sql).all(...(this.args||[]))}},
   async run(){const v=db.prepare(sql).run(...(this.args||[]));return{success:true,meta:{changes:v.changes}}}
 }}},FICHIERS:storage};
 async function call(who,path="",method="GET",payload,headers={}){
  let body=undefined;
  if(payload instanceof ArrayBuffer||payload instanceof Uint8Array)body=payload;
  else if(payload!==undefined){body=JSON.stringify(payload);headers["content-type"]="application/json";}
  const req=new Request("https://mouvement-sde.org"+base+path,{method,body,headers});
  const res=await academyContenusApi(req,env,users[who],base+path.split("?")[0]);
  const ct=res.headers.get("content-type")||"";
  return{status:res.status,headers:res.headers,result:ct.includes("application/json")?await res.json():await res.arrayBuffer()};
 }
 return{env,db,storage,values,call};
}
const rich="Analyse des Écritures, exemples de mise en pratique et questions de réflexion pour les apprenants Soldiers Academy.";
test("Droits : publication interdite aux comptes non habilités et anonymes",async()=>{
 const {call}=world();
 assert.equal((await call("anonymous")).status,401);
 assert.equal((await call("student","/studio")).status,403);
 assert.equal((await call("student","","POST",{courseId:"SA-01",kind:"lecon",title:"Cours du jour",text:rich,published:true})).status,403);
 assert.equal((await call("coach","/equipe","POST",{account:"coach1",role:"coach",courses:["SA-01"]})).status,403);
 assert.equal((await call("student","/nonexistent/fichier")).status,404);
});
test("Direction : habilitation limitée aux cours choisis, suspension et changements autorisés",async()=>{
 const {call}=world();
 assert.equal((await call("admin","/equipe","POST",{account:"inconnu",role:"enseignant",courses:["SA-01"]})).status,404);
 assert.equal((await call("admin","/equipe","POST",{account:"teacher1",role:"enseignant",courses:["SA-99"]})).status,400);
 assert.equal((await call("admin","/equipe","POST",{account:"teacher1",role:"enseignant",courses:["SA-01"]})).status,200);
 assert.equal((await call("admin","/equipe","POST",{account:"coach1",role:"coach",courses:["SA-02"]})).status,200);
 const st=(await call("teacher","/studio")).result;
 assert.equal(st.role,"enseignant");assert.deepEqual(st.assigned,["SA-01"]);
 assert.equal(st.staff,undefined,"L'enseignant ne doit pas voir la liste des habilitations");
 const denied=await call("teacher","","POST",{courseId:"SA-02",kind:"lecon",title:"Mauvais cours",text:rich,published:true});
 assert.equal(denied.status,403);
 const c=await call("teacher","","POST",{courseId:"SA-01",kind:"lecon",title:"Identité et service",text:rich,published:true});
 assert.equal(c.status,201);
 assert.equal((await call("coach","/"+c.result.id,"PATCH",{title:"Intrusion"})).status,403);
 assert.equal((await call("admin","/equipe","POST",{account:"teacher1",role:"enseignant",courses:["SA-01"],active:false})).status,200);
 assert.equal((await call("teacher","/studio")).status,403);
 assert.equal((await call("teacher","/"+c.result.id,"PATCH",{title:"Après retrait"})).status,403);
});
test("Publications : les deux apprenants voient immédiatement la même ressource, mais lectures séparées",async()=>{
 const {call}=world();
 await call("admin","/equipe","POST",{account:"teacher1",role:"enseignant",courses:["SA-03"]});
 const create=await call("teacher","","POST",{courseId:"SA-03",lesson:2,kind:"lecon",title:"Croissance dans la foi",description:"Atelier complémentaire",text:rich,published:true});
 assert.equal(create.status,201);
 const first=(await call("student")).result.resources,second=(await call("student2")).result.resources;
 assert.equal(first.length,1);assert.equal(second.length,1);
 assert.equal(first[0].id,create.result.id);assert.equal(first[0].seen,false);assert.equal(first[0].lesson,2);
 assert.equal((await call("anonymous")).status,401);
 assert.equal((await call("student","/"+create.result.id+"/consulte","POST")).status,200);
 assert.equal((await call("student")).result.resources[0].seen,true);
 assert.equal((await call("student2")).result.resources[0].seen,false);
 assert.equal((await call("student","?cours=SA-08")).result.resources.length,0);
 assert.equal((await call("student","?cours=SA-03")).result.resources.length,1);
 assert.equal((await call("student","?cours=INVALID")).status,400);
});
test("Brouillon et vidéo : une ressource non publiée reste privée ; HTTPS et fournisseurs limités",async()=>{
 const {call}=world();
 await call("admin","/equipe","POST",{account:"coach1",role:"coach",courses:["SA-04"]});
 const draft=await call("coach","","POST",{courseId:"SA-04",kind:"video",title:"Présentation du cours",published:false});
 assert.equal(draft.status,201);
 assert.equal((await call("student")).result.resources.length,0);
 assert.equal((await call("student","/"+draft.result.id+"/consulte","POST")).status,403);
 assert.equal((await call("coach","/"+draft.result.id,"PATCH",{published:true})).status,400);
 assert.equal((await call("coach","/"+draft.result.id,"PATCH",{url:"http://youtube.com/watch?v=xxxxxxxxxxx",published:true})).status,400);
 assert.equal((await call("coach","/"+draft.result.id,"PATCH",{url:"https://evil.example/video",published:true})).status,400);
 assert.equal((await call("coach","/"+draft.result.id,"PATCH",{url:"https://youtu.be/abcdefghijk",published:true})).status,200);
 assert.equal((await call("student")).result.resources[0].url,"https://youtu.be/abcdefghijk");
 assert.equal((await call("coach","/"+draft.result.id,"DELETE")).status,200);
 assert.equal((await call("student")).result.resources.length,0);
});
test("Fichiers : PDF privé, signature requise, interdiction de lire un brouillon",async()=>{
 const {call,values}=world();
 await call("admin","/equipe","POST",{account:"teacher1",role:"enseignant",courses:["SA-02"]});
 const created=await call("teacher","","POST",{courseId:"SA-02",kind:"document",title:"Support PDF",published:false});
 assert.equal(created.status,201);
 const url="/"+created.result.id+"/fichier";
 assert.equal((await call("student",url)).status,403);
 assert.equal((await call("teacher",url,"POST",new TextEncoder().encode("erreur"),{"content-type":"application/pdf","x-sde-filename":"cours.pdf"})).status,415);
 const pdf=new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
 const uploaded=await call("teacher",url,"POST",pdf,{"content-type":"application/pdf","x-sde-filename":encodeURIComponent("cours-sde.pdf")});
 assert.equal(uploaded.status,200);assert.equal(values.size,1);
 assert.equal((await call("student",url)).status,403);
 assert.equal((await call("teacher","/"+created.result.id,"PATCH",{published:true})).status,200);
 const file=await call("student",url);
 assert.equal(file.status,200);assert.equal(file.headers.get("cache-control"),"private, no-store");
 assert.equal(file.headers.get("x-content-type-options"),"nosniff");
 assert.ok(new TextDecoder().decode(file.result).startsWith("%PDF-"));
 assert.equal((await call("anonymous",url)).status,401);
});
test("Navigation : les nouveaux onglets et la page studio utilisent les routes privées",()=>{
 const worker=readFileSync(new URL("../src/worker.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../public/vitrine/sde-academy-parcours.html",import.meta.url),"utf8");
 const studio=readFileSync(new URL("../public/vitrine/sde-academy-studio.html",import.meta.url),"utf8");
 assert.match(worker,/academyContenusApi\(req, env, u, p\)/);
 assert.match(worker,/\/mon-espace\/academy\/studio/);
 assert.match(worker,/\/administration\/academy\/studio/);
 assert.match(page,/data-academy-tab="ressources"/);assert.match(page,/data-academy-tab="parcours"/);
 assert.match(page,/id="resourcesCards"/);
 assert.match(studio,/id="resourceForm"/);assert.match(studio,/id="staffForm"/);
 assert.match(studio,/\/vitrine\/sde-premium-public\.css/);
});

test("Accessibilité : les trois onglets sont liés aux panneaux du même espace membre",()=>{
 const html=readFileSync(new URL("../public/vitrine/sde-academy-parcours.html",import.meta.url),"utf8");
 const doc=new JSDOM(html).window.document;
 assert.ok(doc.querySelector("#studentPage"));
 for(const [tab,id] of [["cours","coursPanel"],["ressources","resourcesSection"],["parcours","parcoursPanel"]]){
  const b=doc.querySelector('[data-academy-tab="'+tab+'"]');
  assert.ok(b,'Onglet '+tab+' présent');
  assert.equal(b.getAttribute("aria-controls"),id);
  assert.ok(doc.querySelector("#"+id),"Panneau "+id+" présent");
  assert.ok(doc.querySelector("#studentPage").contains(doc.querySelector("#"+id)),"Panneau privé dans l'espace apprenant");
 }
 const studio=readFileSync(new URL("../public/vitrine/sde-academy-studio.html",import.meta.url),"utf8");
 const d=new JSDOM(studio).window.document;
 assert.equal(d.querySelectorAll("#resourceForm").length,1);
 assert.equal(d.querySelectorAll("#staffForm").length,1);
 assert.ok(d.querySelector('script[src*="sde-academy-studio.js"]'));
});
