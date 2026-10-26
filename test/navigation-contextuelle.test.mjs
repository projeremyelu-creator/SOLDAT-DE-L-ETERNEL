import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import worker from "../src/worker.js";

const bridge=readFileSync("public/vitrine/portail-espace.js","utf8");
function env(role){
 return {
  PROPRIETAIRES:"",
  ASSETS:{fetch:async req=>new Response(new URL(req.url).pathname)},
  DB:{prepare:(sql)=>({
   bind(){return this},
   first:async()=>sql.includes("FROM sessions s")&&role?
     {email:"essai@example.org",expire:Date.now()+100000,id:"test",role,membreId:"m1",nom:"Essai"}:
     sql.includes("SELECT data, version FROM docs")?{data:JSON.stringify({sujet:"Privé"}),version:1}:null,
   run:async()=>({}),all:async()=>({results:[]})
  }),batch:async()=>[]}
 };
}
const get=(path,role,method="GET",data)=>worker.fetch(new Request("https://mouvement-sde.org"+path,{
 method,headers:{...(role?{cookie:"sde_s=session"}:{}),...(data?{"content-type":"application/json"}:{})},
 body:data?JSON.stringify(data):undefined,redirect:"manual"
}),env(role),{waitUntil(){}});
test("SDE OS reste sur le même domaine dans chacun des deux espaces",async()=>{
 const personne=await get("/mon-espace/os-v31","soldat");
 assert.equal(personne.status,200);
 assert.equal(await personne.text(),"/os-v31/index.html");
 assert.match(personne.headers.get("cache-control"),/no-store/);
 assert.match(personne.headers.get("x-robots-tag"),/noindex/);
 assert.match(personne.headers.get("content-security-policy"),/frame-ancestors 'none'/);
 const admin=await get("/administration/os-v31","contributeur");
 assert.equal(admin.status,200);
 assert.equal(await admin.text(),"/os-v31/index.html");
 assert.equal((await get("/administration/os-v31","soldat")).status,403);
 const visitor=await get("/mon-espace/os-v31");
 assert.equal(visitor.status,302);
 assert.ok(visitor.headers.get("location").includes("/connexion?retour=%2Fmon-espace"));
 const legacy=await get("/os-v31/");
 assert.equal(legacy.status,302);
 assert.equal(legacy.headers.get("location"),"https://mouvement-sde.org/mon-espace/os-v31");
});
test("Ressources SDE OS et pont d'interface restent locaux et non indexables",async()=>{
 const js=await get("/os-v31/sde-os.js");
 assert.equal(js.status,200);
 assert.equal(await js.text(),"/os-v31/sde-os.js");
 assert.match(js.headers.get("content-type"),/text\/javascript/);
 assert.match(js.headers.get("cache-control"),/no-store/);
 const css=await get("/os-v31/sde-os.css");
 assert.match(css.headers.get("content-type"),/text\/css/);
 assert.match(readFileSync("public/os-v31/index.html","utf8"),/portail-espace.js/);
});
test("Dossiers pastoraux et suivi : propriétaire exclusivement côté API",async()=>{
 for(const collection of ["prieres_conf","suivi"]){
  const getPath={op:"get",path:collection+"/dossier"};
  const queryPath={op:"query",path:collection};
  const nonOwner=await get("/api/db","admin","POST",getPath);
  assert.equal(nonOwner.status,200);
  assert.deepEqual(await nonOwner.json(),{exists:false},collection+" get");
  const rows=await get("/api/db","admin","POST",queryPath);
  assert.deepEqual(await rows.json(),{docs:[]},collection+" query");
  const owner=await get("/api/db","proprietaire","POST",getPath);
  assert.equal(owner.status,200);
  const data=await owner.json();
  assert.equal(data.exists,true,collection+" owner");
  const edit=await get("/api/db","admin","POST",{op:"set",path:collection+"/dossier",data:{sujet:"Non autorisé"}});
  assert.equal(edit.status,403);
 }
});
async function ui(path,role,level,moduleName){
 const dom=new JSDOM("<!doctype html><html><head></head><body><nav id='nav'></nav><main id='main'></main></body></html>",{
  url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,opened=[];
 w.fetch=async()=>({ok:true,json:async()=>({connecte:true,role,niveau:level})});
 w.eval(bridge);
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 await new Promise(r=>setTimeout(r,0));
 if(moduleName){
  const nav=w.document.querySelector("#nav");
  const btn=w.document.createElement("button");btn.dataset.vue=moduleName;
  btn.addEventListener("click",()=>opened.push(moduleName));
  nav.append(btn);
  await new Promise(r=>setTimeout(r,0));
 }
 return {dom,d:w.document,opened};
}
test("Raccourcis natifs : le membre accède directement à l'Academy",async()=>{
 const {dom,d,opened}=await ui("/mon-espace/outils?module=academie","soldat",0,"academie");
 assert.deepEqual(opened,["academie"]);
 assert.equal(d.querySelector("#sde-module-etat").textContent,"Soldiers Academy");
 assert.equal(d.querySelector(".sde-espace-retour").href,"https://mouvement-sde.org/mon-espace");
 dom.window.close();
});
test("Un membre ne peut forcer les modules finance ou de direction par l'URL",async()=>{
 for(const name of ["finances","membres"]){
  const {dom,d,opened}=await ui("/mon-espace/outils?module="+name,"soldat",0,name);
  assert.deepEqual(opened,[]);
  assert.match(d.querySelector("#sde-module-etat").textContent,/non autorisé/);
  dom.window.close();
 }
});
test("Finances : seuls administrateurs habilités peuvent ouvrir l'onglet",async()=>{
 const contributor=await ui("/administration/outils?module=finances","contributeur",1,"finances");
 assert.deepEqual(contributor.opened,[]);
 contributor.dom.window.close();
 const admin=await ui("/administration/outils?module=finances","admin",2,"finances");
 assert.deepEqual(admin.opened,["finances"]);
 assert.equal(admin.d.querySelector(".sde-espace-retour").href,"https://mouvement-sde.org/administration");
 admin.dom.window.close();
});
test("Raccourcis des deux tableaux ciblent précisément les modules et SDE OS",()=>{
 const member=readFileSync("public/vitrine/tableau-membre.html","utf8");
 const admin=readFileSync("public/vitrine/tableau-administration.html","utf8");
 for(const module of ["academie","espace","arsenal","mediatheque"])assert.ok(member.includes("/mon-espace/outils?module="+module));
 for(const module of ["agenda","membres","projets","portevoix","finances"])assert.ok(admin.includes("/administration/outils?module="+module));
 assert.ok(member.includes("/mon-espace/os-v31#integral"));
 assert.ok(admin.includes("/administration/os-v31#gouvernance"));
});
