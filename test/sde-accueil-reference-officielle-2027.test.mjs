import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");
const html=read("public/vitrine/portail.html");
const css=read("public/vitrine/sde-accueil-officiel-2027.css");
const tpa=JSON.parse(read("public/vitrine/evenement-phare.json"));
const missions=read("public/vitrine/missions-humanitaires.html");
const page=()=>new JSDOM(html,{url:"https://mouvement-sde.org/"}).window.document;

test("La capture officielle remplace les anciens panneaux sans doublon",()=>{
 const d=page();
 assert.ok(d.body.classList.contains("sde-2027-reference"));
 assert.equal(d.querySelectorAll(".ap-hero").length,1);
 assert.equal(d.querySelectorAll("h1").length,1);
 assert.equal(d.querySelectorAll(".sde-premium-pillars").length,1);
 assert.equal(d.querySelectorAll(".sde-tpa-hero-card").length,1);
 assert.equal(d.querySelectorAll(".sde-rv").length,0,"ancienne scène immersive supprimée");
 assert.equal(d.querySelectorAll(".sde-master-access").length,0,"ancien panneau d'accès supprimé");
 assert.equal(d.querySelectorAll(".sde-rv-phone").length,0,"faux aperçu smartphone supprimé");
 assert.equal(d.querySelectorAll("[data-sde-real-map]").length,0,"carte géographique réelle dédiée à Missions");
 assert.equal(d.querySelectorAll('a[href="/academy"].sde-2027-academy-feature').length,1);
 assert.equal(d.querySelectorAll("#digital-universe").length,1,"les services existants restent accessibles en dessous");
 assert.ok(d.getElementById("reveil-des-nations"),"ancien lien d'ancrage fonctionne encore");
});

test("Nouvel accueil : deux actions, texte biblique, film et TPA 2026 vérifiés",()=>{
 const d=page(),hero=d.querySelector(".ap-hero");
 assert.match(hero.querySelector("h1").textContent,/UNE ARMÉE\s+VIVANTE\s+POUR LES NATIONS/i);
 assert.match(hero.querySelector(".sde-citadel-verse").textContent,/Exode 33:14/);
 assert.deepEqual([...hero.querySelectorAll(".sde-citadel-actions a")].map(a=>a.getAttribute("href")),["/mouvement","/contact#rejoindre","/programmes#agenda","/portail"]);
 assert.equal(hero.querySelector('a[data-film-link]').getAttribute("href"),"/mouvement#film");
 assert.equal(hero.querySelector(".sde-tpa-hero-card time").getAttribute("datetime"),tpa.debut);
 assert.equal(hero.querySelector(".sde-shell-event-register").getAttribute("href"),tpa.inscription);
 assert.equal(hero.querySelector("#sde-tpa-calendar").getAttribute("target"),"_blank");
 assert.ok(hero.querySelector("#ap-countdown"),"compte à rebours réel conservé");
 assert.doesNotMatch(hero.textContent,/\b(?:3[,.]7\s?k|visiteurs en ligne)\b/i);
});

test("Refonte 2+3 : quatre portes d'engagement explicites et la palette SDE restent vérifiables",()=>{
 const d=page();
 const acces=[...d.querySelectorAll(".sde-citadelle-quicknav-items a")];
 assert.deepEqual(acces.map(a=>a.getAttribute("href")),["/mouvement","/contact#rejoindre","/programmes#agenda","/portail"]);
 assert.deepEqual(acces.map(a=>a.querySelector("strong")?.textContent.trim()),["Découvrir","Rejoindre","Programmes","Portail"]);
 const refonte=read("public/vitrine/sde-shell-public.css");
 for(const token of ["--sde23-night:#0D1B38","--sde23-ivory:#FAF7F0","--sde23-gold:#D9A72E","--sde23-earth:#B74624","--sde23-green:#00644F","Cormorant Garamond","Manrope"])
  assert.ok(refonte.includes(token),token);
});

test("Refonte 2+3 : les pages autonomes et le dernier calque d'accueil reçoivent la même direction",()=>{
 const shell=read("public/vitrine/sde-shell-public.css");
 const finalLayer=read("public/vitrine/sde-hybride-integral-2027.css");
 const script=read("public/vitrine/sde-shell-public.js");
 for(const page of ["gouvernance","calendrier","reseau","transparence","soutenir"])
  assert.ok(read("public/vitrine/"+page+".html").includes("sde-shell-public.css"),page);
 assert.ok(shell.includes("body:has(.sde-hub-head)"));
 assert.ok(script.includes("sde-2plus3-fonts"));
 assert.match(finalLayer,/background:#0D1B38!important/);
 assert.match(finalLayer,/Cormorant Garamond/);
});

test("Prier Organiser Agir : trois cartes accessibles et toutes les destinations officielles",()=>{
 const d=page(),p=d.querySelector(".sde-2027-expressions");
 assert.match(p.querySelector("h2").textContent,/Prier\.\s*Organiser\.\s*Agir\./);
 const items=[...p.querySelectorAll(".sde-2027-pillar-link")];
 assert.deepEqual(items.map(a=>a.getAttribute("href")),["/priere","/gouvernance","/missions-humanitaires"]);
 for(const item of items){
  assert.ok(item.querySelector(".sde-2027-pillar-icon[aria-hidden] .sde-pillar-icon"));
  assert.ok(item.querySelector(".sde-2027-pillar-copy strong"));
  assert.ok(item.querySelector(".sde-2027-pillar-copy>span"));
 }
 const mapDoc=new JSDOM(missions).window.document;
 assert.ok(mapDoc.getElementById("sde-carte-missions"),"carte OpenStreetMap réelle maintenue sur Missions");
 assert.ok(mapDoc.querySelector("[data-sde-real-map]"));
 assert.ok(d.querySelector('a[href="/missions-humanitaires"]'));
});

test("Responsive PC/tablette/mobile, contraste, mouvement réduit et navigation partagée",()=>{
 const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(links.some(link=>/^\/vitrine\/sde-accueil-officiel-2027\.css\?v=[a-zA-Z0-9]+$/.test(link)),"charte officielle conservée");
 assert.match(links.at(-1),/^\/vitrine\/sde-hybride-integral-2027\.css\?v=[a-zA-Z0-9]+$/,"couche responsive chargée en dernier avec versionnement automatique");
 for(const required of [
  "@media(max-width:1000px)","@media(max-width:650px)","@media(max-width:800px)","@media(max-width:365px)",
  "@media(prefers-reduced-motion:reduce)","grid-template-columns:repeat(3,minmax(0,1fr))",
  "sde-shell-bottom","sde-shell-header","min-height:44px","-webkit-text-fill-color","#f9f2e7"
 ])assert.ok(css.includes(required),required);
 assert.ok(html.includes('sde-shell-public.js'),"menu mobile interactif réellement monté");
 assert.ok(!html.includes('sde-visuels-premium.js'),"ancien script carte/immersion inutile retiré");
 assert.ok(!html.includes('sde-reveil-immersif.js'),"ancien script Academy/film supprimé de l'accueil");
 assert.ok(!html.includes('sde-cartes-reelles.js'),"fonds cartographique chargé uniquement sur page Missions");
});
