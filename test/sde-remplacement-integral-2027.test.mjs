import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=path=>readFileSync(path,"utf8");
const home=read("public/vitrine/portail.html");
const academy=read("public/vitrine/academy.html");
const privateAcademy=read("public/vitrine/sde-academy-parcours.html");
const missions=read("public/vitrine/missions-humanitaires.html");
const css=read("public/vitrine/sde-v5-complet.css");

test("Refonte officielle : une scène Réveil, une carte et aucun ancien titre d'accueil",()=>{
 const doc=new JSDOM(home).window.document;
 assert.equal(doc.querySelectorAll(".ap-hero").length,1);
 assert.equal(doc.querySelectorAll(".sde-rv .sde-v5-map-stage").length,1);
 assert.equal(doc.querySelectorAll("h1").length,1);
 assert.match(doc.querySelector(".ap-hero h1")?.textContent||"",/LE RÉVEIL\s+SPIRITUEL\s+DES NATIONS/i);
 assert.ok(!/La présence de Dieu,\s*notre force et notre repos/i.test(doc.querySelector(".ap-hero h1").textContent));
 const ctas=[...doc.querySelectorAll(".sde-citadel-actions a")];
 assert.equal(ctas.length,2,"la maquette récente limite les actions principales à deux");
 assert.deepEqual(ctas.map(a=>a.getAttribute("href")),["/mouvement","/contact#rejoindre"]);
 assert.equal(doc.querySelectorAll(".sde-tpa-hero-card").length,1);
 assert.ok(doc.querySelector("#ap-countdown"));
 assert.ok(doc.querySelector("[data-sde-rv-motion]"));
 assert.ok(doc.querySelector("[data-sde-rv-immersive]"));
});
test("Atlas : illustration sans fausses implantations, navigation vers les activités réellement publiées",()=>{
 const doc=new JSDOM(home).window.document;
 const atlas=doc.querySelector(".sde-v5-map-stage");
 assert.ok(atlas);
 assert.equal(atlas.querySelectorAll(".sde-v5-light-points circle").length,12);
 assert.match(atlas.querySelector(".sde-v5-map-disclaimer").textContent,/uniquement décoratifs/);
 assert.ok(atlas.querySelector('a[href="/missions-humanitaires"]'));
 assert.ok(atlas.querySelector('a[href="/transparence"]'));
 assert.equal(atlas.querySelectorAll("[data-mission-location]").length,0);
 const page=new JSDOM(missions).window.document;
 assert.ok(page.querySelector(".sde-v5-missions-art"));
 assert.ok(page.querySelector('form[method="post"][data-sde-contact="missions-humanitaires"]'));
 assert.ok(page.querySelector('input[name="accord"][required]'));
});
test("Academy : ancienne double introduction remplacée par une seule vitrine et cours conservés",()=>{
 const doc=new JSDOM(academy).window.document;
 assert.equal(doc.querySelectorAll(".hero-acad").length,0,"ancien hero supprimé");
 assert.equal(doc.querySelectorAll(".sdu-campus-strip").length,0,"ancien panneau campus dupliqué supprimé");
 assert.equal(doc.querySelectorAll("h1").length,1);
 assert.equal(doc.querySelectorAll(".sa-premium-preview").length,1);
 assert.equal(doc.querySelectorAll(".sa-premium-card").length,3);
 assert.ok(doc.querySelector("#sa-programme-2027"),"catalogue réel préservé");
 assert.ok(doc.querySelector('a[href="/mon-espace/academy"]'));
});
test("Academy privée : accès, notes et progression non modifiés ; nouveaux raccourcis pilotent les vrais onglets",()=>{
 const doc=new JSDOM(privateAcademy).window.document;
 assert.ok(doc.querySelector('body.sde-v5-campus-private'));
 assert.ok(doc.querySelector('link[href*="sde-v5-complet.css"]'));
 assert.ok(doc.querySelector('script[src*="sde-v5-campus-controls.js"]'));
 assert.ok(doc.querySelector("#studentPage[hidden]"));
 for(const id of ["statPassed","statPercent","statCert","progressBar","catalogue","mainTabs","pane-parcours","pane-love"]){
  assert.ok(doc.getElementById(id),id+" doit être conservé");
 }
 assert.equal(doc.querySelectorAll(".sde-v5-campus-rail [data-v5-tab-target]").length,3);
 assert.ok(privateAcademy.includes("sde-academy-parcours.js"));
 assert.ok(privateAcademy.includes("sde-academy-dynamique.js"));
});
test("Responsive : réutiliser la même expérience sur petit écran et désactiver les mouvements",()=>{
 for(const x of ["@media(max-width:780px)","@media(max-width:490px)","@media(prefers-reduced-motion:reduce)","sde-v5-map-stage","sde-v5-campus-private","sde-v5-academy-public","-webkit-text-fill-color","min-height:44px"]){
  assert.ok(css.includes(x),x);
 }
 assert.ok(!/https?:\/\/[^"'\s]+\.(?:woff2?|ttf|png|jpg|mp4)/i.test(css),"pas de média distant ajouté");
});
