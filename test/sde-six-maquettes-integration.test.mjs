import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const homepage=()=>new JSDOM(read("public/vitrine/portail.html"),{
 url:"https://mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true
});
test("Public 01 · Citadelle : vision 2027, Exode 33:14 et trois CTA réels",()=>{
 const dom=homepage(),doc=dom.window.document;
 try{
  const hero=doc.querySelector(".ap-hero");
  assert.ok(hero);
  assert.match(hero.querySelector("h1")?.textContent||"",/présence de Dieu/i);
  assert.match(hero.querySelector(".sde-citadel-verse")?.textContent||"",/Exode 33:14/);
  const actions=[...hero.querySelectorAll(".sde-citadel-actions a")];
  assert.deepEqual(actions.map(a=>a.getAttribute("href")),["/mouvement","/contact#rejoindre","/programmes#agenda"]);
  assert.ok(hero.querySelector(".sde-tpa-hero-card"),"le rendez-vous TPA n'est pas supprimé");
  assert.match(read("public/vitrine/sde-six-maquettes-2027.css"),/prefers-reduced-motion/);
 }finally{dom.window.close();}
});
test("Public 02 · Institution : navigation vers histoire, leadership, pôles et gouvernance",()=>{
 const dom=homepage(),doc=dom.window.document;
 try{
  const items=[...doc.querySelectorAll(".sde-institutional-links a")];
  assert.equal(items.length,4);
  assert.deepEqual(items.map(a=>a.getAttribute("href")),[
   "/mouvement#histoire","/mouvement#responsables","/mouvement#poles","/gouvernance"]);
  const mouvement=read("public/vitrine/mouvement.html");
  for(const anchor of ["histoire","responsables","poles"])assert.ok(mouvement.includes('id="'+anchor+'"'));
  assert.match(doc.querySelector("#poles-accueil")?.textContent||"",/Pôle 1 · REV/);
  assert.match(doc.querySelector("#poles-accueil")?.textContent||"",/Pôle 5 · FDE/);
 }finally{dom.window.close();}
});
test("Public 03 · Digital Universe : les huit modules utilisent les routes existantes",()=>{
 const dom=homepage(),doc=dom.window.document;
 try{
  const cards=[...doc.querySelectorAll("#sde-2027-universe-grid [data-sdu-category]")];
  assert.equal(cards.length,8);
  assert.deepEqual(cards.map(a=>a.getAttribute("href")),[
   "/mouvement","/academy","/soldier-quest","/soldiers-tv",
   "/mediatheque","/programmes#agenda","/missions-humanitaires","/priere"]);
  assert.ok(cards.every(a=>a.querySelector(".sdu-title")&&a.querySelector(".sdu-card-link")));
  assert.ok(!cards.some(a=>/\b(?:2\s?418|87\s?%|12\s?680\s?000)\b/.test(a.textContent)), "aucun KPI fictif");
 }finally{dom.window.close();}
});
test("Public 03/04 · Filtres + recherche accessibles sur mobile et ordinateur",()=>{
 const dom=homepage(),win=dom.window,doc=win.document;
 try{
  win.matchMedia=()=>({matches:true});
  win.eval(read("public/vitrine/sde-digital-universe.js"));
  doc.dispatchEvent(new win.Event("DOMContentLoaded"));
  const grid=doc.querySelector("#sde-2027-universe-grid");
  const visible=()=>[...grid.querySelectorAll(".sdu-card")].filter(a=>!a.hidden);
  const buttons=[...doc.querySelectorAll(".sdu-filters button")];
  assert.equal(buttons.length,5);
  assert.equal(visible().length,8);
  buttons.find(b=>b.dataset.sduFilter==="media").click();
  assert.equal(visible().length,2,"TV + médiathèque");
  const search=doc.querySelector("#sde-universe-search");
  search.value="priere";search.dispatchEvent(new win.Event("input",{bubbles:true}));
  assert.equal(visible().length,0,"intersection filtre/catégorie, pas OU");
  assert.match(doc.querySelector("[data-sdu-filter-status]").textContent,/Aucun espace/);
  buttons.find(b=>b.dataset.sduFilter==="tous").click();
  assert.equal(visible().length,1,"recherche sans accent");
  search.dispatchEvent(new win.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(search.value,"");
  assert.equal(visible().length,8);
  const toggle=doc.querySelector("[data-sdu-motion-toggle]");
  toggle.click();assert.equal(toggle.getAttribute("aria-pressed"),"true");
  assert.ok(doc.querySelector('link[href*="sde-six-maquettes-2027.css"]'));
 }finally{dom.window.close();}
});
test("Privé 05 · Campus : progression du membre et validations du directeur, sans droits contournés",()=>{
 const source=read("frontend/operations.jsx");
 assert.match(source,/sde-campus-member-progress/);
 assert.match(source,/<progress min="0" max="100" value=\{Math\.min\(100,Math\.max\(0,Number\(pct\)\|\|0\)\)\}/);
 assert.match(source,/SOLDIERS CAMPUS · DIRECTION PÉDAGOGIQUE/);
 assert.match(source,/\/api\/mon-parcours-academy/);
 assert.match(source,/\/api\/pilotage-academy/);
 assert.match(source,/Love School · sur validation/);
 assert.match(source,/portal\.compte\.niveau>=2/);
});
test("Privé 06 · Command Center et cinq onglets : outils réels, habilitations préservées",()=>{
 const source=read("frontend/operations.jsx"),shell=read("frontend/reference-shell.jsx");
 assert.match(source,/S\.D\.E · COMMAND CENTER/);
 assert.match(source,/\/api\/tableau-de-bord/);
 assert.match(source,/\['finance-direction','Finances & missions'\]/);
 assert.match(shell,/account\.niveau>=2\?\['finance-direction','Finances','money'\]:\['scanner','Pointages','qr'\]/);
 assert.match(shell,/<span>Plus<\/span>/);
 assert.match(read("frontend/reference.css"),/sde-campus-admin-hero/);
 assert.match(read("frontend/reference.css"),/sde-command-center/);
});
