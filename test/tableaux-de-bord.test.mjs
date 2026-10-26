import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import worker from "../src/worker.js";

const js=readFileSync("public/vitrine/tableaux-de-bord.js","utf8");
const html=(name)=>readFileSync("public/vitrine/tableau-"+name+".html","utf8");
const fakeRole=(role)=>({
  PROPRIETAIRES:"",
  ASSETS:{fetch:async req=>new Response(new URL(req.url).pathname)},
  DB:{prepare:(sql)=>({
    bind(){return this},
    first:async()=>sql.includes("FROM sessions s")&&role ? {
      email:"membre@sde.example",expire:Date.now()+3600000,id:"abc",nom:"Soldat Essai",
      role,membreId:"m1",matricule:"123456"
    }:null,
    all:async()=>({results:[]}),
    run:async()=>({})
  }),batch:async()=>[]}
});
const request=(path,role,opts={})=>worker.fetch(new Request("https://mouvement-sde.org"+path,{
  ...opts,headers:{...(role?{cookie:"sde_s=test"}:{}),...(opts.headers||{})},redirect:"manual"
}),fakeRole(role),{waitUntil(){}});
test("Tableaux privés : rôles, réponses no-store et sources réelles",async()=>{
  for(const [path,role,expected] of [
    ["/mon-espace","soldat","/index.html"],
    ["/mon-espace/outils","soldat","/index.html"],
    ["/administration","contributeur","/index.html"],
    ["/administration/outils","admin","/index.html"]
  ]){
    const response=await request(path,role);
    assert.equal(response.status,200,path);
    assert.equal(await response.text(),expected);
    assert.match(response.headers.get("cache-control"),/no-store/);
    assert.match(response.headers.get("x-robots-tag"),/noindex/);
  }
  assert.equal((await request("/administration/outils","soldat")).status,403);
  assert.equal((await request("/administration/outils")).status,302);
});
test("Indicateurs admin : jamais accessibles au simple membre ni anonymes",async()=>{
  const denied=await request("/api/tableau-de-bord","soldat");
  assert.equal(denied.status,403);
  assert.equal((await request("/api/tableau-de-bord")).status,403);
  const allowed=await request("/api/tableau-de-bord","contributeur");
  assert.equal(allowed.status,200);
  assert.deepEqual((await allowed.json()).total,{membres:0,evenements:0,projets:0,annonces:0});
  assert.match(allowed.headers.get("cache-control"),/no-store/);
});
function ui(kind,niveau) {
 const file=kind==="membre"?"membre":"administration";
 const dom=new JSDOM(html(file),{url:"https://mouvement-sde.org/"+(kind==="membre"?"mon-espace":"administration"),runScripts:"outside-only",pretendToBeVisual:true});
 const w=dom.window,calls=[];
 const mocked={
  "/api/moi":{connecte:true,nom:"Soldat Essai",role:niveau>=1?"contributeur":"soldat",niveau,libRole:niveau>=1?"Contributeur":"Soldat",email:"membre@sde.example"},
  "/api/mon-espace":{membre:{nom:"ESSAI",prenoms:"Soldat",matricule:"123456",telephone:"0700000000",email:"membre@sde.example",statut:"Membre actif",quartier:"Cocody",situation:"Célibataire"}},
  "/api/mon-historique":{presences:[{titre:"Réunion",date:"2026-10-20",etat:"P"},{titre:"Formation",date:"2026-10-22",etat:"E"}],prieres:[{sujet:"Prière personnelle",date:"2026-10-25",statut:"En prière"}]},
  "/api/tableau-de-bord":{total:{membres:33,evenements:5,projets:4,annonces:7}},
  "/api/public":{evenements:[{titre:"Conférence IN FIRE",date:"2026-10-31",heure:"08:00",lieu:"Abidjan"}]}
 };
 w.fetch=async(path,opts={})=>{
   calls.push({path,opts});
   return {ok:true,status:200,json:async()=>opts.method==="POST"||opts.method==="PATCH"?{ok:true}:mocked[path]||{}};
 };
 w.eval(js);
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 return {dom,w,d:w.document,calls};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
test("Membre : profil, présences, prières et navigation sur une même page",async()=>{
 const {dom,w,d,calls}=ui("membre",0);
 await settle();
 assert.match(d.getElementById("sde-heading").textContent,/Soldat ESSAI/);
 assert.equal(d.getElementById("m-matricule").textContent,"123456");
 assert.equal(d.getElementById("m-presences").textContent,"1");
 assert.equal(d.getElementById("m-prieres").textContent,"1");
 assert.ok(!calls.some(c=>c.path==="/api/tableau-de-bord"));
 w.location.hash="#prieres";
 w.dispatchEvent(new w.Event("hashchange"));
 assert.equal(d.querySelector('[data-section="prieres"]').hidden,false);
 assert.equal(d.querySelector('[data-section="profil"]').hidden,true);
 const form=d.getElementById("priere-form");
 form.elements.sujet.value="Prions pour les familles";
 form.dispatchEvent(new w.Event("submit",{cancelable:true,bubbles:true}));
 await settle();
 const sent=calls.find(c=>c.path==="/api/priere");
 assert.ok(sent);
 assert.equal(JSON.parse(sent.opts.body).sujet,"Prions pour les familles");
 assert.match(d.getElementById("priere-feedback").textContent,/enregistrée/);
 dom.window.close();
});
test("Direction : indicateurs réels et permissions financières/pastorales",async()=>{
 const {dom,w,d,calls}=ui("administration",1);
 await settle();
 assert.equal(d.getElementById("a-membres").textContent,"33");
 assert.equal(d.getElementById("a-projets").textContent,"4");
 assert.ok(d.getElementById("liste-agenda").textContent.includes("IN FIRE"));
 assert.equal(d.querySelector('[data-view="finances"]').hidden,true);
 assert.equal(d.querySelector('[data-view="pastoral"]').hidden,true);
 assert.ok(calls.some(c=>c.path==="/api/tableau-de-bord"));
 dom.window.close();
 const admin=ui("administration",2);await settle();
 assert.equal(admin.d.querySelector('[data-view="finances"]').hidden,false);
 assert.equal(admin.d.querySelector('[data-view="pastoral"]').hidden,true);
 admin.dom.window.close();
 const owner=ui("administration",3);await settle();
 assert.equal(owner.d.querySelector('[data-view="pastoral"]').hidden,false);
 owner.dom.window.close();
});
test("Aucun écran ne contient de données personnelles codées en dur",()=>{
 for(const name of ["membre","administration"]){
   const s=html(name);
   assert.match(s,/noindex,nofollow/);
   assert.match(s,/\/vitrine\/tableaux-de-bord\.js/);
   assert.match(s,/href="\/"/);
   assert.ok(!s.includes("123456"),"Aucune fausse donnée");
 }
 assert.ok(!js.includes("localStorage"));
 assert.ok(!js.includes("sessionStorage"));
});