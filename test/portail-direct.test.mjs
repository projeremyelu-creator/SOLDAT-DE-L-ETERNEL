import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import worker from "../src/worker.js";

const direct=readFileSync("public/vitrine/portail-direct.js","utf8");
const oldHtml=readFileSync("public/index.html","utf8");
const fakeEnv=role=>({
 PROPRIETAIRES:"",
 ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)},
 DB:{prepare:sql=>({
  bind(){return this},
  first:async()=>sql.includes("FROM sessions s")&&role?{id:"u-test",email:"test@example.org",role,nom:"Essai",membreId:"sde-1",expire:Date.now()+100000}:null,
  run:async()=>({}),all:async()=>({results:[]})
 }),batch:async()=>[]}
});
const get=(path,role)=>worker.fetch(new Request("https://mouvement-sde.org"+path,{
 headers:role?{cookie:"sde_s=identifiant"}:{},redirect:"manual"
}),fakeEnv(role),{waitUntil(){}});
test("L'entrée membre et l'entrée direction servent directement un seul moteur sans /outils",async()=>{
 for(const [url,role] of [["/mon-espace","soldat"],["/administration","admin"],["/mon-espace?module=academie","soldat"],["/administration?module=membres","contributeur"]]){
  const res=await get(url,role);
  assert.equal(res.status,200,url);
  assert.equal(await res.text(),"/index.html",url);
  assert.match(res.headers.get("cache-control"),/no-store/);
  assert.match(res.headers.get("x-robots-tag"),/noindex/);
 }
 assert.equal((await get("/administration","soldat")).status,403);
 assert.equal((await get("/mon-espace")).status,302);
 assert.match(oldHtml,/portail-direct\.js/);
 assert.match(oldHtml,/portail-direct\.css/);
});
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
async function create(path,level){
 const dom=new JSDOM("<!doctype html><html><head></head><body><button id='btn-reglages' type='button'>Ouvrir réglages natifs</button><div class='shell'><nav id='nav'></nav><main id='main' tabindex='-1'>Prêt</main></div></body></html>",{
  url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,nav=w.document.getElementById("nav"),main=w.document.getElementById("main"),opened=[];
 w.document.getElementById("btn-reglages").addEventListener("click",()=>opened.push("reglages"));
 w.fetch=async()=>({ok:true,json:async()=>({connecte:true,role:level>1?"admin":level===1?"contributeur":"soldat",niveau:level,libRole:"Test"})});
 for(const name of ["accueil","espace","agenda","academie","membres","portevoix","finances","projets"]){
  const btn=w.document.createElement("button");btn.dataset.vue=name;btn.textContent=name;
  if(name==="accueil")btn.setAttribute("aria-current","page");
  btn.addEventListener("click",()=>{
   for(const b of nav.querySelectorAll("button"))b.removeAttribute("aria-current");
   btn.setAttribute("aria-current","page");
   main.textContent="Module : "+name;
   opened.push(name);
  });
  nav.append(btn);
 }
 w.eval(direct);
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 await tick();
 return {dom,w,nav,main,opened,tabs:w.document.getElementById("sde-direct-tabs")};
}
test("Un membre voit les onglets utiles et change de module en un clic sans changer de page",async()=>{
 const ctx=await create("/mon-espace",0);
 assert.equal(ctx.opened[0],"espace");
 const noms=[...ctx.tabs.querySelectorAll("button")].map(x=>x.dataset.module);
 assert.ok(noms.includes("espace")&&noms.includes("agenda")&&noms.includes("academie"));
 assert.ok(!noms.includes("membres")&&!noms.includes("finances")&&!noms.includes("projets"));
 const route=ctx.tabs.querySelector('[data-module="agenda"]');
 route.click();await tick();
 assert.equal(ctx.main.textContent,"Module : agenda");
 assert.equal(ctx.w.location.pathname,"/mon-espace");
 assert.equal(new URLSearchParams(ctx.w.location.search).get("module"),"agenda");
 ctx.dom.window.close();
});
test("La direction voit le poste de commandement et les rubriques qui lui sont autorisées",async()=>{
 const contributor=await create("/administration",1);
 let noms=[...contributor.tabs.querySelectorAll("button")].map(x=>x.dataset.module);
 assert.ok(noms.includes("membres")&&noms.includes("projets")&&noms.includes("accueil"));
 assert.ok(!noms.includes("finances"));
 contributor.dom.window.close();
 const admin=await create("/administration?module=finances",2);
 noms=[...admin.tabs.querySelectorAll("button")].map(x=>x.dataset.module);
 assert.ok(noms.includes("finances"));
 assert.equal(admin.opened[0],"finances");
 admin.tabs.querySelector('[data-module="membres"]').click();await tick();
 assert.equal(admin.main.textContent,"Module : membres");
 assert.equal(admin.w.location.pathname,"/administration");
 admin.dom.window.close();
});
test("Le bouton Réglages du bandeau commun conserve le menu natif",async()=>{
 const ctx=await create("/mon-espace",0);
 ctx.w.document.querySelector(".sde-direct-settings").click();
 assert.equal(ctx.opened.at(-1),"reglages");
 ctx.dom.window.close();
});
test("Aucune page privée n'est redirigée vers une nouvelle application externe",()=>{
 const workerSource=readFileSync("src/worker.js","utf8");
 assert.match(workerSource,/const fichier = p\.endsWith\("\/os-v31"\)\?"\/os-v31\/index\.html":"\/index\.html"/);
 assert.ok(!direct.includes("app.mouvement-sde.org"));
 assert.ok(!direct.includes("iframe"));
});
