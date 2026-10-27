import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import worker from "../src/worker.js";

const lire=path=>readFileSync(path,"utf8");
const accueil=lire("public/vitrine/portail.html");
const dynamique=lire("public/vitrine/portail-unifie.js");
const direct=lire("public/vitrine/portail-direct.js");
const style=lire("public/vitrine/portail-direct.css");

test("Accueil SDE : deux accès privés réellement visibles sans ouvrir le menu",()=>{
 const d=new JSDOM(accueil).window.document;
 const liens=[...d.querySelectorAll(".site-access-top a")];
 assert.deepEqual(liens.map(a=>a.textContent.trim()),["Espace membre","Espace administrateur"]);
 assert.deepEqual(liens.map(a=>a.getAttribute("href")),["/mon-espace","/administration"]);
 assert.equal(d.querySelectorAll(".private-access-card").length,2);
 assert.equal(d.querySelector(".private-member").getAttribute("href"),"/mon-espace");
 assert.equal(d.querySelector(".private-admin").getAttribute("href"),"/administration");
 assert.ok(d.querySelector(".private-admin").textContent.includes("membres"));
 assert.ok(d.querySelector(".private-admin").textContent.includes("finances"));
 assert.match(dynamique,/site-access-top/);
 assert.match(dynamique,/Espace administrateur/);
});
function interfacePrivee(path,niveau){
 const dom=new JSDOM('<!doctype html><html><head></head><body><div class="shell"><nav id="nav"></nav><main id="main">Chargement</main></div><button id="btn-reglages"></button></body></html>',{
  url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,nav=w.document.querySelector("#nav"),main=w.document.querySelector("#main");
 const clicks=[];
 const noms=["accueil","espace","membres","agenda","finances","assistant","garnisons","academie","portevoix","chambre","arsenal","mediatheque","projets","secretariat"];
 for(const nom of noms){
  const b=w.document.createElement("button");b.dataset.vue=nom;
  if(nom==="accueil")b.setAttribute("aria-current","page");
  b.addEventListener("click",()=>{
   for(const a of nav.querySelectorAll("button"))a.removeAttribute("aria-current");
   b.setAttribute("aria-current","page");clicks.push(nom);main.textContent=nom;
  });nav.append(b);
 }
 w.fetch=async()=>({ok:true,json:async()=>({connecte:true,role:niveau>=2?"admin":niveau?"contributeur":"soldat",niveau,libRole:"Compte test"})});
 w.eval(direct);w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 return {dom,w,clicks,main,nav};
}
const tick=()=>new Promise(r=>setTimeout(r,20));
test("Espace membre : parcours et titres accessibles dans la même surface",async()=>{
 const ctx=interfacePrivee("/mon-espace",0);await tick();
 const d=ctx.w.document;
 assert.equal(d.querySelector("h1.sde-direct-title").textContent,"Mon espace membre");
 const menu=d.querySelector("#sde-direct-tabs");
 assert.equal(menu.parentElement.className,"shell");
 assert.ok([...menu.querySelectorAll(".sde-direct-group")].some(x=>x.textContent==="Mon parcours"));
 assert.ok([...menu.querySelectorAll("button")].some(x=>x.dataset.module==="academie"));
 assert.ok(![...menu.querySelectorAll("button")].some(x=>x.dataset.module==="finances"));
 menu.querySelector('[data-module="academie"]').click();
 assert.equal(ctx.main.textContent,"academie");
 assert.equal(ctx.w.location.pathname,"/mon-espace");
 assert.ok(style.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
 ctx.dom.window.close();
});
test("Administration : tous les titres de pilotage et les accès liés au rôle",async()=>{
 const ctx=interfacePrivee("/administration",2);await tick();
 const d=ctx.w.document,menu=d.querySelector("#sde-direct-tabs");
 assert.equal(d.querySelector("h1.sde-direct-title").textContent,"Poste de commandement administratif");
 const groupes=[...menu.querySelectorAll(".sde-direct-group")].map(x=>x.textContent);
 assert.deepEqual(groupes,["Pilotage et organisation","Vie spirituelle et communication","Finances et administration"]);
 const modules=[...menu.querySelectorAll("button")].map(x=>x.dataset.module);
 for(const nom of ["accueil","membres","agenda","garnisons","projets","secretariat","academie","portevoix","chambre","finances"])
   assert.ok(modules.includes(nom),nom);
 menu.querySelector('[data-module="membres"]').click();
 assert.equal(ctx.main.textContent,"membres");
 assert.equal(ctx.w.location.pathname,"/administration");
 ctx.dom.window.close();
 const niveau1=interfacePrivee("/administration",1);await tick();
 assert.ok(![...niveau1.w.document.querySelectorAll("#sde-direct-tabs button")].some(b=>b.dataset.module==="finances"));
 niveau1.dom.window.close();
});
const fakeEnv=role=>({
 PROPRIETAIRES:"",
 ASSETS:{fetch:async req=>new Response(new URL(req.url).pathname)},
 DB:{prepare:sql=>({bind(){return this},first:async()=>sql.includes("FROM sessions s")&&role?{id:"u",email:"e@example.org",role,nom:"Essai",membreId:"m",expire:Date.now()+999999}:null,all:async()=>({results:[]}),run:async()=>({})}),batch:async()=>[]}
});
test("Sécurité serveur : accès direct protégé par connexion et par rôle",async()=>{
 for(const [path,role,code] of [["/mon-espace",null,302],["/administration",null,302],["/administration","soldat",403],["/administration","admin",200]]){
  const res=await worker.fetch(new Request("https://mouvement-sde.org"+path,{headers:role?{cookie:"sde_s=test"}:{},redirect:"manual"}),fakeEnv(role),{waitUntil(){}});
  assert.equal(res.status,code,path);
 }
});
