import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import worker from "../src/worker.js";

const script=readFileSync("public/vitrine/portail-direct.js","utf8");
const wait=()=>new Promise(r=>setTimeout(r,30));
function vue(path,role,hasMember=true){
 const dom=new JSDOM("<!doctype html><html><head></head><body><div class='shell'><nav id='nav'></nav><main id='main'>Accueil natif</main></div><button id='btn-reglages'></button></body></html>",{
  url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,main=w.document.getElementById("main"),nav=w.document.getElementById("nav");
 const appels=[],ouvert=[];
 const modules=["accueil","espace","agenda","academie","arsenal","chambre","portevoix","membres","garnisons","projets","secretariat","finances"];
 for(const nom of modules){
  const b=w.document.createElement("button");b.dataset.vue=nom;
  if(nom==="accueil")b.setAttribute("aria-current","page");
  b.addEventListener("click",()=>{
   for(const n of nav.querySelectorAll("button"))n.removeAttribute("aria-current");
   b.setAttribute("aria-current","page");
   main.textContent="Module : "+nom;ouvert.push(nom);
  });
  nav.append(b);
 }
 w.fetch=async(url,opts={})=>{
  appels.push({url,opts});
  if(url==="/api/moi")return{ok:true,status:200,json:async()=>({connecte:true,role,niveau:role==="soldat"?0:role==="contributeur"?1:2,membreId:hasMember?"m1":null,libRole:role})};
  if(url==="/api/mon-historique")return{ok:true,status:200,json:async()=>({presences:[],prieres:[{date:"2026-10-26",sujet:"Prière <script>alert(1)</script>",statut:"En prière"}]})};
  if(url==="/api/priere")return{ok:true,status:200,json:async()=>({ok:true})};
  throw Error("API inattendue : "+url);
 };
 w.eval(script);w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 return {dom,w,nav,main,appels,ouvert};
}
test("Le membre voit Prière, Formation et Enseignements en premier, sur un seul écran",async()=>{
 const c=vue("/mon-espace","soldat");await wait();
 const d=c.w.document,tabs=d.querySelectorAll("#sde-direct-tabs [data-module]");
 assert.deepEqual([...tabs].slice(0,3).map(x=>x.dataset.module),["priere","academie","arsenal"]);
 assert.ok(d.querySelector(".sde-direct-title").textContent.includes("Mon espace membre"));
 assert.equal(d.querySelector("[data-quick=priere]").textContent,"Déposer une prière");
 d.querySelector("[data-module=priere]").click();
 assert.equal(c.w.location.pathname,"/mon-espace");
 assert.equal(d.getElementById("sde-priere-panel").hidden,false);
 assert.equal(c.main.hidden,true);
 await wait();
 const list=d.querySelector(".sde-priere-historique");
 assert.ok(list.textContent.includes("Prière <script>alert(1)</script>"));
 assert.equal(list.querySelector("script"),null,"Pas d'interprétation HTML du sujet privé");
 const form=d.querySelector(".sde-priere-form");
 form.querySelector("textarea").value="Priez pour la famille.";
 form.dispatchEvent(new c.w.Event("submit",{bubbles:true,cancelable:true}));
 await wait();
 const sent=c.appels.find(x=>x.url==="/api/priere");
 assert.equal(sent.opts.method,"POST");
 assert.equal(sent.opts.credentials,"same-origin");
 assert.deepEqual(JSON.parse(sent.opts.body),{sujet:"Priez pour la famille."});
 assert.match(d.querySelector(".sde-priere-feedback").textContent,/enregistrée/);
 d.querySelector("[data-module=academie]").click();
 assert.equal(c.main.hidden,false);
 assert.equal(d.getElementById("sde-priere-panel").hidden,true);
 assert.equal(c.main.textContent,"Module : academie");
 c.dom.window.close();
});
test("Le lien direct ?module=priere ouvre la vue réelle sans seconde page",async()=>{
 const c=vue("/mon-espace?module=priere","soldat");await wait();
 assert.equal(c.w.document.getElementById("sde-priere-panel").hidden,false);
 assert.equal(c.w.location.pathname,"/mon-espace");
 assert.ok(c.w.document.querySelector('[data-module=priere]').getAttribute("aria-current")==="page");
 c.dom.window.close();
});
test("Fiche membre absente : empêcher l'envoi et expliquer le blocage",async()=>{
 const c=vue("/mon-espace?module=priere","soldat",false);await wait();
 assert.equal(c.w.document.querySelector(".sde-priere-submit").disabled,true);
 assert.match(c.w.document.querySelector(".sde-priere-feedback").textContent,/fiche membre/);
 assert.ok(!c.appels.some(x=>x.url==="/api/priere"));
 c.dom.window.close();
});
test("Direction : intercession, Academy et enseignements accessibles sans changer de site",async()=>{
 const c=vue("/administration","admin");await wait();
 const d=c.w.document;
 assert.deepEqual([...d.querySelectorAll(".sde-spirit-quick")].slice(0,3).map(x=>x.dataset.quick),["chambre","academie","arsenal"]);
 assert.equal(d.querySelector("#sde-direct-tabs .sde-direct-group").textContent,"Vie spirituelle et communication");
 assert.equal(d.querySelector('[data-module=priere]'),null);
 d.querySelector("[data-quick=chambre]").click();
 assert.equal(c.main.textContent,"Module : chambre");
 assert.equal(c.w.location.pathname,"/administration");
 c.dom.window.close();
});
test("Les règles serveur protègent les dossiers d'accompagnement confidentiel",()=>{
 const src=readFileSync("src/worker.js","utf8");
 assert.match(src,/\{ path: "prieres_conf", read: "owner", write: "owner" \}/);
 assert.match(src,/\{ path: "suivi", read: "owner", write: "owner" \}/);
 assert.match(src,/if \(!u.connecte \|\| !u.membreId\) return erreur\("refuse", "Aucune fiche reliée à ce compte\.", 403\)/);
 assert.match(src,/async function apiPriere/);
});
