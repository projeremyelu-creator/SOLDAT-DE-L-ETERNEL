import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read = path => readFileSync(path, "utf8");
const script = read("public/vitrine/sde-citadelle-reference-v4.js");
const shell = read("frontend/reference-shell.jsx");
const css = read("public/vitrine/sde-reference-maquette-2026.css");

function session(permissions){
 const items=permissions.map(route=>'<button data-vue="'+route+'"></button>').join("");
 const html='<!doctype html><html lang="fr"><body class="sde-direct sde-direct-member">'+
  '<nav id="nav">'+items+'</nav><main id="main"><div class="view">'+
  '<div id="sde-personal-card">Fiche du membre autorisé</div></div></main></body></html>';
 const dom=new JSDOM(html,{url:"https://app.mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true});
 dom.window.eval(script);
 dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
 return dom;
}

test("SDE privé : six espaces de la maquette reliés aux vues autorisées et aux missions publiques",()=>{
 const routes=["academie","rendezvous","espace","priere","bibliotheque"];
 const dom=session(routes);
 try{
  const doc=dom.window.document;
  const cards=[...doc.querySelectorAll(".sde-ref-member-shortcuts-grid > *")];
  assert.equal(cards.length,6);
  assert.deepEqual(cards.filter(x=>x.dataset.vue).map(x=>x.dataset.vue),routes);
  assert.equal(cards.at(-1).getAttribute("href"),"/missions");
  const navigations=[];
  dom.window.SDEPortal={selectionner:(route,options)=>navigations.push({route,options})};
  doc.querySelector('.sde-ref-member-shortcuts [data-vue="academie"]').click();
  assert.deepEqual(navigations,[{route:"academie",options:{userInitiated:true}}],"le bouton ouvre réellement le module authentifié");
  assert.equal(doc.querySelector(".sde-ref-member-event")?.getAttribute("href"),"/programmes");
  assert.ok(doc.querySelector("#sde-personal-card"),"le vrai profil n'est pas remplacé");
  assert.equal(doc.querySelectorAll(".sde-ref-member-shortcuts").length,1);
 }finally{dom.window.close();}
});

test("Les raccourcis non autorisés n'apparaissent pas et les comptes ne sont pas modifiés",()=>{
 const dom=session(["espace","priere"]);
 try{
  const doc=dom.window.document;
  assert.deepEqual([...doc.querySelectorAll(".sde-ref-member-shortcuts [data-vue]")].map(x=>x.dataset.vue),["espace","priere"]);
  assert.equal(doc.querySelectorAll(".sde-ref-member-shortcuts").length,1);
  assert.equal(doc.querySelectorAll('[data-vue="finance-direction"]').length,0);
 }finally{dom.window.close();}
});

test("Mobile : cinq accès visibles dont Plus, sans supprimer la navigation métier",()=>{
 assert.ok(shell.includes("['espace-soldat','Accueil','home'],['academie','Academy','academy'],['rendezvous','Agenda','mission'],['espace','Profil','members']"));
 assert.ok(shell.includes("<span>Plus</span>"));
 assert.ok(shell.includes("['contributions','Mes cotisations','money']"));
 assert.ok(shell.includes("['bibliotheque','Ressources','mission']"));
 assert.match(css,/sde-ref-member-event/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(script,/\b(?:421|156|87)\b.*(?:membres|apprenants|intercessions)/i);
});

test("Site public : la maquette conserve les routes réelles, le verset et les albums",()=>{
 const home=read("public/vitrine/portail.html");
 for(const route of ["/academy","/soldiers-tv","/missions-humanitaires","/priere","/album-infire","/portail"])
  assert.ok(home.includes('href="'+route+'"'),"Accès absent : "+route);
 assert.match(home,/Ézéchiel 37/i);
 assert.match(home,/SOLDATS DE L’ÉTERNEL/);
 assert.match(read("scripts/build-experience.mjs"),/integrerToutesPages\('public'\)/);
});
