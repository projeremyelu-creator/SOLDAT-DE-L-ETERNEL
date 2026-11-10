import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");
const home=read("public/vitrine/portail.html");
const academy=read("public/vitrine/academy.html");
const css=read("public/vitrine/sde-visuels-premium.css");
const js=read("public/vitrine/sde-visuels-premium.js");

test("Références SDE : accueil, missions et Academy utilisent la feuille commune sans rompre l'ordre des styles",()=>{
 for(const doc of [home,academy]){
  assert.match(doc,/sde-visuels-premium\.css\?v=20261110v1/);
  const sheets=[...doc.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  const current=sheets.findIndex(x=>x.includes("sde-visuels-premium.css"));
  assert.ok(current>0,"surcouche identifiée");
  assert.ok(sheets.slice(current+1).some(x=>x.includes("sde-shell-public.css")),"charte du shell conserve son ordre");
 }
 assert.match(home,/sde-visuels-premium\.js\?v=20261110v1/);
 assert.ok(home.includes('id="sde-rv-immersive-stage"'));
 assert.ok(home.includes('data-sde-rv-immersive'));
 assert.ok(home.includes('data-sde-mission-view="carte"'));
 assert.ok(home.includes('data-sde-mission-view="projets"'));
 assert.ok(home.includes('data-sde-mission-panel="projets"'));
 assert.ok(home.includes("Aucun point ne représente une implantation vérifiée"));
 assert.doesNotMatch(css,/\b3[,.]7\s?[Kk]\b/,"ne pas afficher un faux nombre de participants");
});

test("Soldiers Academy public : trois panneaux réels et aucune fausse progression",()=>{
 const dom=new JSDOM(academy);
 const d=dom.window.document;
 const preview=d.querySelector(".sa-premium-preview");
 assert.ok(preview);
 assert.equal(preview.querySelectorAll(".sa-premium-card").length,3);
 for(const href of ["/mon-espace/academy","/academy-programme-24","/soldiers-tv","/verifier-attestation"]){
  assert.ok(preview.querySelector('a[href="'+href+'"]'),href);
 }
 assert.equal(d.querySelectorAll("h1").length,1);
 assert.match(preview.textContent,/Aucune progression fictive/);
 assert.ok(!preview.querySelector("[data-progress]"));
 dom.window.close();
});

test("Contrôles visuels réels : mode immersion, Escape et bascule Missions",()=>{
 const dom=new JSDOM(home,{url:"https://mouvement-sde.org/",runScripts:"outside-only"});
 const w=dom.window;
 w.eval(js);
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 const root=w.document.getElementById("reveil-des-nations");
 const immersive=root.querySelector("[data-sde-rv-immersive]");
 const projects=root.querySelector('[data-sde-mission-panel="projets"]');
 const projectButton=root.querySelector('[data-sde-mission-view="projets"]');
 const mapButton=root.querySelector('[data-sde-mission-view="carte"]');
 assert.equal(immersive.getAttribute("aria-pressed"),"false");
 immersive.click();
 assert.equal(immersive.getAttribute("aria-pressed"),"true");
 assert.ok(root.classList.contains("sde-rv-immersive"));
 immersive.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
 assert.equal(immersive.getAttribute("aria-pressed"),"false");
 assert.ok(!root.classList.contains("sde-rv-immersive"));
 assert.ok(projects.hidden);
 projectButton.click();
 assert.equal(projectButton.getAttribute("aria-pressed"),"true");
 assert.ok(!projects.hidden);
 mapButton.click();
 assert.equal(mapButton.getAttribute("aria-pressed"),"true");
 assert.ok(projects.hidden);
 dom.window.close();
});

test("Mobile et accessibilité : actions tactiles, contrastes et réduction des mouvements",()=>{
 for(const piece of ["@media(max-width:780px)","@media(max-width:490px)","min-height:44px","-webkit-text-fill-color","@media(prefers-reduced-motion:reduce)"]){
  assert.ok(css.includes(piece),piece);
 }
 assert.ok(css.includes(".sa-premium-preview :is(a,summary):focus-visible"));
 assert.ok(css.includes(".sde-rv-immersive .sde-rv-stage"));
 assert.ok(js.includes("prefers-reduced-motion: reduce"));
 assert.ok(!js.includes("fetch("),"les contrôles n'accèdent à aucune API");
});
