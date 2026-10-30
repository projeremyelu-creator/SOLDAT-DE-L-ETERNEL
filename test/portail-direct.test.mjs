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
async function create(path,level,origin="https://mouvement-sde.org"){
 const dom=new JSDOM("<!doctype html><html><head></head><body><button id='btn-reglages' type='button'>Ouvrir réglages natifs</button><nav id='nav'></nav><main id='main'>Prêt</main></body></html>",{
  url:origin+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,nav=w.document.getElementById("nav"),main=w.document.getElementById("main"),opened=[];
 w.document.addEventListener("sde:open",event=>opened.push(event.detail.module));
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
 assert.equal(ctx.opened[0],"espace-soldat");
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
 assert.ok(!direct.includes("iframe"));
});

test("Le sous-domaine app initialise le portail connecté et sa navigation premium",async()=>{
 const ctx=await create("/administration",3,"https://app.mouvement-sde.org");
 try {
  assert.ok(ctx.tabs,"la navigation privée doit être montée sur app");
  assert.equal(ctx.w.SDEPortal?.compte?.connecte,true);
  assert.equal(typeof ctx.w.SDEPortal?.selectionner,"function");
  assert.equal(ctx.w.document.querySelector('#sde-direct-top a[href="https://mouvement-sde.org/"]')?.textContent,"Site public");
  ctx.w.SDEPortal.selectionner("membres");
  await tick();
  assert.ok(ctx.opened.includes("membres"));
  assert.equal(ctx.w.location.origin,"https://app.mouvement-sde.org");
  assert.equal(ctx.w.location.pathname,"/administration");
 } finally {ctx.dom.window.close()}
});

test("Mobile SDE : les rubriques sont repliables, accessibles et pilotables au clavier",async()=>{
  const ctx=await create("/mon-espace",0);
  try {
    const toggle=ctx.w.document.querySelector("#sde-direct-menu-toggle");
    assert.ok(toggle,"Le bouton des rubriques doit exister sur la page privée");
    assert.equal(toggle.type,"button");
    assert.equal(toggle.getAttribute("aria-controls"),"sde-direct-tabs");
    assert.equal(toggle.getAttribute("aria-expanded"),"false");
    assert.equal(ctx.tabs.classList.contains("sde-direct-tabs-open"),false);
    assert.equal(toggle.textContent,"Afficher les rubriques");
    toggle.click();
    assert.equal(toggle.getAttribute("aria-expanded"),"true");
    assert.equal(ctx.tabs.classList.contains("sde-direct-tabs-open"),true);
    assert.equal(ctx.w.document.activeElement,ctx.tabs.querySelector("button"));
    ctx.tabs.querySelector("button").dispatchEvent(
      new ctx.w.KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})
    );
    assert.equal(toggle.getAttribute("aria-expanded"),"false");
    assert.equal(ctx.tabs.classList.contains("sde-direct-tabs-open"),false);
    assert.equal(ctx.w.document.activeElement,toggle);
  }finally{ctx.dom.window.close()}
});
test("Mobile SDE : choisir une rubrique replie le menu et conserve la navigation directe",async()=>{
  const ctx=await create("/mon-espace",0);
  try {
    ctx.w.matchMedia=query=>({matches:query.includes("760px")});
    const toggle=ctx.w.document.querySelector("#sde-direct-menu-toggle");
    toggle.click();
    assert.equal(toggle.getAttribute("aria-expanded"),"true");
    ctx.tabs.querySelector('[data-module="agenda"]').click();
    await tick();
    assert.equal(ctx.main.textContent,"Module : agenda");
    assert.equal(ctx.w.location.pathname,"/mon-espace");
    assert.equal(toggle.getAttribute("aria-expanded"),"false");
    assert.equal(ctx.tabs.classList.contains("sde-direct-tabs-open"),false);
  }finally{ctx.dom.window.close()}
});
test("Mobile SDE : grille repliée uniquement en petit écran, zones tactiles et focus visibles",()=>{
  const css=readFileSync("public/vitrine/portail-direct.css","utf8");
  assert.match(css,/#sde-direct-menu-toggle\{display:none\}/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/body\.sde-direct #sde-direct-tabs:not\(\.sde-direct-tabs-open\)\{display:none!important\}/);
  assert.match(css,/#sde-direct-menu-toggle:focus-visible/);
  assert.match(css,/min-height:48px/);
});
