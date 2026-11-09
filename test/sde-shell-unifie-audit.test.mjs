import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");
function render(name,path){
 const dom=new JSDOM(read("public/vitrine/"+name+".html"),{url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true});
 dom.window.eval(read("public/vitrine/sde-shell-public.js"));
 dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
 return {dom,doc:dom.window.document,win:dom.window};
}
test("Navigation commune : même en-tête et menu sur accueil, contact et soutien",()=>{
 for(const [name,path] of [["portail","/"],["rejoindre","/contact"],["soutenir","/soutenir"],["plus","/rubriques"]]){
  const c=render(name,path);
  try{
   assert.equal(c.doc.querySelectorAll(".sde-shell-header").length,1,name);
   assert.equal(c.doc.querySelectorAll(".sde-shell-footer").length,1,name);
   assert.equal(c.doc.querySelectorAll(".sde-shell-bottom").length,1,name);
   assert.deepEqual([...c.doc.querySelectorAll(".sde-shell-mega-group>summary")].map(x=>x.textContent),["Le Mouvement","Programmes & Agenda","Missions & Impact","Médias & Ressources","S’engager"]);
   assert.ok(c.doc.querySelector('.sde-shell-mega-group a[href="/soutenir"]'),name);
   assert.ok(c.doc.querySelector('.sde-shell-head-actions>a[href="/portail"]'),name);
   assert.equal(c.doc.querySelectorAll('.sde-shell-bottom-item').length,5,name);
   assert.equal(c.doc.querySelectorAll('.sde-shell-footer-grid>div,.sde-shell-footer-grid>nav').length,4,name);
  }finally{c.dom.window.close();}
 }
});
test("Le tiroir Plus s'ouvre, cherche les sous-rubriques et se ferme",()=>{
 const c=render("portail","/");
 try{
  const toggle=c.doc.querySelector(".sde-shell-open"), overlay=c.doc.querySelector(".sde-shell-overlay");
  assert.ok(overlay.hidden);
  toggle.click();assert.equal(overlay.hidden,false);assert.equal(toggle.getAttribute("aria-expanded"),"true");
  const input=c.doc.querySelector(".sde-shell-filter");
  input.value="soldiers voice";input.dispatchEvent(new c.win.Event("input",{bubbles:true}));
  assert.equal(c.doc.querySelector('.sde-shell-drawer-groups a[href="/soldiers-voice"]').hidden,false);
  assert.equal(c.doc.querySelector('.sde-shell-drawer-groups a[href="/pole-reveil"]').hidden,true);
  overlay.dispatchEvent(new c.win.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(overlay.hidden,true);
 }finally{c.dom.window.close();}
});
test("Accueil : deux CTA, intitulés métiers, TPA compact et états vides cachés",()=>{
 const c=render("portail","/");
 try{
  assert.equal(c.doc.querySelectorAll(".ap-hero .ap-actions a").length,2);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/VIE SPIRITUELLE/);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/ORGANISATION & PORTAIL/);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/TERRAIN & IMPACT/);
  assert.ok(c.doc.querySelector(".ap-indicateurs").hidden);
  assert.ok(c.doc.querySelector(".sde-shell-event a[href='/programmes#tpa-2026']"));
 }finally{c.dom.window.close();}
});
test("Soutenir : formulaire immédiatement accessible, aucun canal supposé activé",()=>{
 const c=render("soutenir","/soutenir");
 try{
  const html=read("public/vitrine/soutenir.html");
  assert.ok(html.indexOf('id="formulaire"')<html.indexOf('id="reglements"'));
  assert.ok(c.doc.querySelector(".sde-donation-overview #formulaire form[method=post]"));
  assert.ok(c.doc.getElementById("pay-liste").hidden);
  assert.ok(c.doc.querySelectorAll(".hub-progress").length===3);
  assert.match(read("public/vitrine/sde-soutenir-statut.js"),/canauxActifs/);
 }finally{c.dom.window.close();}
});
test("Contact : prise de contact distincte de l'inscription ; un seul accès public",()=>{
 const c=render("rejoindre","/contact");
 try{
  assert.equal(c.doc.querySelectorAll("#membres .carte-acces").length,1);
  assert.ok(c.doc.querySelector('#membres a[href="/portail?mode=inscription"]'));
  assert.ok(c.doc.querySelector('#membres a[href="/portail"]'));
  assert.ok(c.doc.querySelector("#form-rejoindre"));
  assert.match(c.doc.querySelector("#rejoindre").textContent,/ne crée pas de compte/i);
 }finally{c.dom.window.close();}
});
test("Connexion : ni double menu, ni images de maquette, ni écran interstitiel",()=>{
 const html=read("public/vitrine/connexion-unifiee.html");
 const css=read("public/vitrine/sde-connexion-empreinte.css");
 assert.doesNotMatch(html,/reference-portail\.jpg/);
 assert.doesNotMatch(html,/id="sde-splash"/);
 assert.match(css,/\.sde-auth-nav,\.ref-login-art,\.sde-splash/);
 assert.ok(html.includes("form-inscription"));
});
test("Un seul composant de navigation chargé sur les principales pages publiques",()=>{
 const pages=["portail","rejoindre","soutenir","plus","mouvement","programmes","projets","academy","ressources","prieres","transparence","gouvernance","reseau","newsletter","communaute","calendrier","soldiers-voice","missions-humanitaires","temoignages","pole-reveil","pole-social","pole-logistique","pole-medias","pole-formation","boutique","soldiers-award","formulaire","rechercher","confidentialite"];
 for(const p of pages){
  const html=read("public/vitrine/"+p+".html");
  assert.ok(html.includes("/vitrine/sde-shell-public.js"),p+" JS");
  assert.ok(html.includes("/vitrine/sde-shell-public.css"),p+" CSS");
 }
});
