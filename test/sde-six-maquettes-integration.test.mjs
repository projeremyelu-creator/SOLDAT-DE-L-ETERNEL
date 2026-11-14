import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const homepage=()=>new JSDOM(read("public/vitrine/portail.html"),{
 url:"https://mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true
});
test("Public 01 · Citadelle : vision 2027, Exode 33:14 et deux accès réels",()=>{
 const dom=homepage(),doc=dom.window.document;
 try{
  const hero=doc.querySelector(".ap-hero");
  assert.ok(hero);
  assert.match(hero.querySelector("h1")?.textContent||"",/LA CITADELLE\s+CÉLESTE/i);
  assert.match(hero.querySelector(".sde-citadel-verse")?.textContent||"",/Exode 33:14/);
  const actions=[...hero.querySelectorAll(".sde-citadel-actions a")];
  assert.deepEqual(actions.map(a=>a.getAttribute("href")),["/contact#rejoindre","/mouvement"]);
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
  assert.ok(doc.querySelector('link[href*="sde-citadelle-celeste-2027.css"]'),"charte SDE 2+3 active");
   assert.equal(doc.querySelectorAll('link[href*="sde-six-maquettes-2027.css"]').length,0,"ancien CSS Six Maquettes retiré");
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
 assert.match(source,/S\.D\.E · GOUVERNANCE & SERVICE/);
 assert.match(source,/\/api\/tableau-de-bord/);
 assert.match(source,/\['finance-direction','Finances & missions'\]/);
 assert.match(shell,/account\.niveau>=2\?\['finance-direction','Finances','money'\]:\['scanner','Pointages','qr'\]/);
 assert.match(shell,/<span>Plus<\/span>/);
 assert.match(read("frontend/reference.css"),/sde-campus-admin-hero/);
 assert.match(read("frontend/reference.css"),/sde-command-center/);
});


test("SDE 2027 · les six interfaces actives chargent la même charte desktop/mobile",()=>{
 const paths=[
  "public/vitrine/portail.html",        // accueil public réellement rendu
  "public/vitrine/academy.html",        // présentation publique Academy
  "public/index.html",                  // /mon-espace et /administration protégés
  "public/vitrine/sde-academy-parcours.html", // campus authentifié
  "public/vitrine/academy-enseignants.html",  // studio authentifié
  "public/vitrine/connexion-unifiee.html"     // /portail -> connexion
 ];
 for(const path of paths){
  const html=read(path);
  assert.match(html,/\/vitrine\/sde-citadelle-celeste-2027\.css\?v=[a-zA-Z0-9]+/,
   "charte absente : "+path);
  assert.equal((html.match(/sde-citadelle-celeste-2027\.css/g)||[]).length,1,
   "une seule feuille de design : "+path);
 }
 const css=read("public/vitrine/sde-citadelle-celeste-2027.css");
 for(const scope of [
  "body.sde-2027-reference", "body.sde-reference-login",
  "body.sde-v5-academy-public", "body.sde-campus-student",
  "body.sde-direct", "body.sde-direct-admin"
 ])assert.ok(css.includes(scope), "portée absente : "+scope);
 assert.match(css,/@media\(max-width:699px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css, /\[hidden\]\{display:none!important\}/);
});
test("SDE 2027 · la charte vise les vraies routes sans ouvrir les espaces protégés",()=>{
 const worker=read("src/worker.js");
 assert.match(worker,/return assetPortail\("\/vitrine\/portail\.html"\)/);
 assert.match(worker,/const fichier = p\.endsWith\("\/os-v31"\)\?"\/os-v31\/index\.html":"\/index\.html"/);
 assert.match(worker,/const fichierAcademy = p\.endsWith\("\/academy"\)\?"\/vitrine\/sde-academy-parcours\.html"/);
 assert.match(worker,/if \(!u\.connecte\)/);
 assert.match(worker,/if \(p\.startsWith\("\/administration"\) && u\.niveau < 1\)/);
 const app=read("public/index.html");
 assert.match(app,/\/vitrine\/sde-citadelle-celeste-2027\.css/);
 const academy=read("public/vitrine/sde-academy-parcours.html");
 assert.match(academy,/progression affichée ci-dessous provient de vos résultats réels/i);
});


test("Citadelle v2 · l'accueil possède quatre accès visibles et la devise fondatrice",()=>{
 const doc=new JSDOM(read("public/vitrine/portail.html")).window.document;
 const hero=doc.querySelector(".ap-hero");
 assert.ok(hero.querySelector(".sde-vision-wordmark"));
 assert.match(hero.querySelector(".sde-vision-wordmark").textContent,/SOLDATS DE L’ÉTERNEL/);
 assert.match(hero.querySelector(".sde-citadelle-foundation").textContent,/ÉZÉCHIEL 37/);
 const nav=doc.querySelector('.sde-citadelle-quicknav[data-sde-visible-revision="citadelle-2027-v2"]');
 assert.ok(nav);
 assert.deepEqual([...nav.querySelectorAll("a")].map(a=>a.getAttribute("href")),[
  "/mouvement","/contact#rejoindre","/programmes#agenda","/portail"
 ]);
 assert.equal(hero.querySelectorAll(".sde-citadel-actions a").length,2,"deux CTA Citadelle fidèlement appliqués");
});
test("Citadelle v2 · Campus, connexion, membre et commandement rendent des compositions distinctes",()=>{
 const school=new JSDOM(read("public/vitrine/academy.html")).window.document;
 assert.ok(school.querySelector('.sa-premium-preview[data-sde-visible-revision="citadelle-2027-v2"]'));
 const login=new JSDOM(read("public/vitrine/connexion-unifiee.html")).window.document;
 assert.match(login.querySelector('.sde-citadelle-login-badge')?.textContent||"",/SDE DIGITAL 2027/);
 assert.ok(login.querySelector("#form-connexion"),"formulaire de connexion original conservé");
 const code=read("frontend/operations.jsx");
 assert.match(code,/className="sde-citadelle-member-cover"/);
 assert.match(code,/className="sde-citadelle-command-launch sde23-command-access"/);
 assert.match(code,/portal\.compte\.niveau>=2&&<button type="button" onClick=\{\(\)=>portal\.selectionner\('finance-direction'\)\}/);
 assert.match(code,/portal\.selectionner\('academie'\)/);
 assert.match(code,/portal\.selectionner\('rendezvous'\)/);
 const styles=read("public/vitrine/sde-citadelle-celeste-2027.css");
 for(const name of [".sde-vision-wordmark",".sde-citadelle-quicknav-items",".sde-citadelle-member-cover",".sde-citadelle-command-launch",".sde-citadelle-login-badge"]){
  assert.ok(styles.includes(name),"règles visuelles absentes: "+name);
 }
 assert.match(styles,/@media\(max-width:699px\)/);
});


test("Recette 2027 · contrastes réels et contrôles mobiles corrigés",()=>{
 const css=read("public/vitrine/sde-citadelle-celeste-2027.css");
 const shell=read("public/vitrine/sde-shell-public.js");
 const sw=read("public/sw-public.js");
 const audit=read("scripts/audit-public-mobile.mjs");
 assert.match(css,/\.sa-premium-grid \.sa-premium-card summary strong\{/);
 assert.match(css,/-webkit-text-fill-color:#142641!important/);
 assert.match(css,/\.ref-access-targets button\[aria-pressed="true"\]\{/);
 assert.match(css,/-webkit-text-fill-color:#132139!important/);
 assert.match(css,/\.sde-shell-portal-label/);
 assert.match(css,/\.sde-reader-tools\{\s*bottom:calc\(84px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(shell,/sde-shell-portal-label","Mon Portail S\.D\.E"/);
 assert.match(sw,/sde-public-shell-20261113-unique-source-v3/);
 assert.match(audit,/CONTRASTE_NAV_SDE/);
 assert.match(audit,/visualQA\.contrast<4\.5/);
});


test("Citadelle mobile · illustration officielle sans photographie d'album en couverture",()=>{
 const css=read("public/vitrine/sde-citadelle-celeste-2027.css");
 const audit=read("scripts/audit-public-mobile.mjs");
 const svg=read("public/vitrine/illus/citadelle-celeste.svg");
 const mobile=readFileSync("public/vitrine/photos/hero-sde-640.webp");
 const desktop=readFileSync("public/vitrine/photos/hero-sde-1280.webp");
 assert.match(css,/--sde-citadel-art:url\("\/vitrine\/illus\/citadelle-celeste\.svg"\)/);
 assert.match(css,/background:linear-gradient\(90deg,[^;]*var\(--sde-citadel-art\)/);
 assert.match(audit,/row\.heroBgMobile\|\|''\)\.includes\('citadelle-celeste-cinema\.avif'\)/);
 assert.match(svg,/<svg[^>]+viewBox="0 0 1600 900"/);
 assert.match(svg,/fortress/);
 assert.ok(mobile.length<48000,"ancienne vignette mobile préservée");
 assert.ok(mobile.length<desktop.length,"les fichiers anciens restent optimisés pour les albums");
});


test("Doctrine SDE 2027 · six axes exacts dans leur ordre officiel",()=>{
 const doc=new JSDOM(read("public/vitrine/mouvement.html")).window.document;
 const labels=[...doc.querySelectorAll('#axes ol.six-axes > li h3')].map(x=>x.textContent.trim());
 const descriptions=[...doc.querySelectorAll('#axes ol.six-axes > li p')].map(x=>x.textContent.trim());
 assert.deepEqual(labels,[
  "Rassembler et Unir","Former","Réveiller","Restaurer","Équiper","Envoyer"
 ]);
 assert.deepEqual(descriptions,[
  "Enraciner dans la Parole","Ranimer la flamme de l'Esprit",
  "Guérir, relever, rétablir","Armer pour le combat","Partir vers les nations"
 ]);
 assert.match(doc.querySelector("#titre-axes").textContent,/Six axes pour former un soldat/);
 assert.ok(!doc.querySelector(".pg-tabs")?.textContent.includes("Cinq axes"));
 assert.equal(doc.querySelectorAll('link[href*="sde-citadelle-celeste-2027.css"]').length,1);
 const main=read("public/index.html");
 assert.match(main,/Rassembler et Unir · Former · Réveiller · Restaurer · Équiper · Envoyer/);
 assert.doesNotMatch(main,/Réveiller · Restaurer · Former · Équiper · Envoyer/);
});

test("Captures SDE · corrections réelles chargées sur les bons écrans",()=>{
 const page=read("public/index.html");
 const css=read("public/vitrine/sde-citadelle-celeste-2027.css");
 // Vérifier l'en-tête réel du portail, pas la chaîne HTML de copie hors ligne.
 const head=page.slice(0,page.indexOf('<script>/* Palette des espaces privés'));
 const position=head.indexOf('/vitrine/sde-citadelle-celeste-2027.css');
 const old=head.indexOf('/vitrine/sde-command-v4.css');
 assert.ok(position>old&&old>0,"feuille correctrice chargée APRÈS les styles du portail");
 for(const selector of [
  "#axes ol.six-axes","#axes ol.six-axes > li",
  ".sde-citadelle-command-launch > button > svg",
  ".sde-citadelle-command-launch > button > span",
  "#main .view .list .row .row-t",
  "#main .view .list .row .row-m",
  "#main .view .stat-v",
  "#main .view .card .bar-top",
  "#main .view .seg button",
  "#sheet .sheet-b .vy-t"
 ]){
  assert.ok(css.includes(selector),"contraste/cadrage absent: "+selector);
 }
 assert.match(css,/max-width:700px/);
 assert.match(css,/max-width:540px/);
 assert.match(css,/max-width:640px/);
 assert.match(css,/webkit-text-fill-color:/);
 assert.match(css,/min-height:44px!important/);
});
