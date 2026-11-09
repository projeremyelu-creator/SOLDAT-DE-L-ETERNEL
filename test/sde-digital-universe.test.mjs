import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");
const home=read("public/vitrine/portail.html"),quest=read("public/vitrine/soldier-quest.html"),tv=read("public/vitrine/soldiers-tv.html");
test("SDE Digital Universe: quatre destinations visibles depuis l'accueil",()=>{
 const dom=new JSDOM(home),doc=dom.window.document;
 const section=doc.querySelector("#digital-universe");
 assert.ok(section,"section SDE Digital Universe absente");
 assert.equal(section.querySelectorAll(".sdu-card").length,4);
 assert.deepEqual(Array.from(section.querySelectorAll(".sdu-card")).map(a=>a.getAttribute("href")),["/mouvement","/academy","/soldier-quest","/soldiers-tv"]);
 assert.ok(doc.querySelector('[data-sdu-motion-toggle]'),"animation desactivable");
 assert.ok(doc.querySelector(".ap-hero .sde-tpa-hero-card"),"TPA existante preservee");
 dom.window.close();
});
test("Routes, charte et menu partages sans remplacer le Worker prive",()=>{
 const worker=read("src/worker.js"),shell=read("public/vitrine/sde-shell-public.js");
 for(const [route,page] of [["/soldier-quest","soldier-quest"],["/soldiers-tv","soldiers-tv"]]){
  assert.ok(worker.includes('"'+route+'": "/vitrine/'+page+'.html"'),route);
  const source=read("public/vitrine/"+page+".html");
  assert.match(source,/sde-digital-universe\.css/);
  assert.match(source,/sde-shell-public\.js/);
  assert.match(source,/sde-digital-universe\.js/);
  assert.match(source,/<main id="contenu">/);
  assert.match(source,/<header class="site-header">/);
  assert.match(source,/<footer class="site-footer">/);
  assert.match(shell,new RegExp(route.slice(1)));
 }
 assert.match(worker,/\/mon-espace/);
});
test("Soldier Quest : engagement et roles reels, aucun badge attribue arbitrairement",()=>{
 const doc=new JSDOM(quest).window.document;
 assert.equal(doc.querySelectorAll("#quest-cards [data-sdu-category]").length,6);
 assert.ok(doc.querySelector('a[href="/mon-espace/academy"]'));
 assert.ok(doc.querySelector('a[href="/pole-reveil"]'));
 assert.ok(doc.querySelector('a[href="/missions-humanitaires"]'));
 assert.match(quest,/aucun indicateur personnel|Aucun indicateur personnel/i);
 assert.doesNotMatch(quest,/3 240|1 287|sde-points|3240 pts/i);
});
test("Soldiers TV : deux vrais fichiers vidéo, sans faux direct",()=>{
 const doc=new JSDOM(tv).window.document;
 const videos=doc.querySelectorAll("[data-sdu-video-src]");
 assert.equal(videos.length,2);
 for(const btn of videos){const src=btn.getAttribute("data-sdu-video-src");assert.ok(src.startsWith("/vitrine/"));assert.ok(existsSync("public"+src),src);}
 assert.equal(doc.querySelectorAll("#sdu-tv-categories [data-sdu-category]").length,6);
 assert.ok(doc.querySelector('video[controls][preload="metadata"]'));
 assert.doesNotMatch(tv,/12 480|1 287|24\/7 en direct/);
});
test("Soldiers Campus : sites public et apprenant relies aux cours securises",()=>{
 const academy=read("public/vitrine/academy.html");
 const apprenant=read("public/vitrine/sde-academy-parcours.html");
 assert.match(academy,/sdu-campus-strip/);
 assert.match(academy,/24 cours/);
 assert.match(academy,/\/mon-espace\/academy/);
 assert.match(apprenant,/sde-campus-student/);
 assert.match(apprenant,/id="studentPage" hidden/);
 assert.match(apprenant,/id="academyDynDashboard"/);
 assert.match(apprenant,/id="statPercent"/);
 assert.ok(read("public/vitrine/tableau-membre.html").includes("sdu-member-universe"));
});
test("Accessibilite : filtrage et reduction du mouvement",()=>{
 const dom=new JSDOM(quest,{url:"https://mouvement-sde.org/soldier-quest",runScripts:"outside-only"});
 const w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false});
 w.eval(read("public/vitrine/sde-digital-universe.js"));
 d.dispatchEvent(new w.Event("DOMContentLoaded"));
 const filter=d.querySelector('[data-sdu-filter="priere"]');
 filter.click();
 assert.equal(filter.getAttribute("aria-pressed"),"true");
 assert.equal([...d.querySelectorAll("#quest-cards [data-sdu-category]")].filter(el=>!el.hidden).length,2);
 assert.equal(d.querySelector('[data-sdu-filter="tous"]').getAttribute("aria-pressed"),"false");
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/sdu-motion-paused/);
 dom.window.close();
});


test("Zones tactiles Quest et TV : consentement newsletter dans un label d’au moins 44 px",()=>{
 const shell=read("public/vitrine/sde-shell-public.js");
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(shell,/class="sde-shell-consent"/);
 assert.match(shell,/name="consentement"/);
 assert.match(css,/body\.sde-universe-page \.sde-shell-newsletter label\.sde-shell-consent\s*\{[^}]*min-height:48px/s);
 assert.match(css,/body\.sde-universe-page \.sdu-filterbar button\s*\{min-height:46px!important\}/);
});
test("Soldier Quest desktop : hauteur réservée à l'intro avant chargement des polices",()=>{
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(css,/@media\(min-width:1051px\)\s*\{\s*body\.sdu-quest-page \.sdu-quest-content>\.sdu-intro-band\s*\{[^}]*height:170px;min-height:170px/s);
});

test("Pôles, millésime et date TPA : les écrans suivent les références officielles",()=>{
 const doc=new JSDOM(home).window.document;
 const poles=[...doc.querySelectorAll("#poles-accueil .sde-pole-officiel h3")].map(x=>x.textContent.trim());
 assert.deepEqual(poles,["Réveil et Évangélisation","Impact Social et Humanitaire","Logistique et Organisation","Communication, Médias et Relations Extérieures","Formation, Développement et Entrepreneuriat"]);
 assert.match(home,/Vendredi 18 décembre 2026/);
 assert.match(home,/2026-12-18T20:00:00\+00:00/);
 assert.match(home,/© 2026–2027/);
 for(const filename of ["public/vitrine/soldier-quest.html","public/vitrine/soldiers-tv.html","public/vitrine/sde-academy-parcours.html"]){
  assert.doesNotMatch(read(filename),/Conimencer|05 au 09 mai|08 MAI|20 sept\. 2026|contact@sde-mouvement\.org|07 00 00 00 00/);
 }
 const shell=read("public/vitrine/sde-shell-public.js");
 for(const denomination of poles)assert.ok(shell.includes(denomination),"Libellé manquant dans le menu : "+denomination);
});
test("Soutenir SDE : Wave en premier et aucun paiement non vérifié",()=>{
 const doc=new JSDOM(home).window.document;
 const methods=[...doc.querySelectorAll("#sde-don-canal option")].map(x=>x.textContent.trim());
 assert.deepEqual(methods.slice(0,4),["Wave","Orange Money","MTN MoMo","Moov Money"]);
 const support=read("public/vitrine/soutenir.html");
 assert.match(support,/Les modalités Wave, Orange Money, MTN MoMo, Moov Money/);
 assert.match(support,/data-canal="Wave">Non activé/);
});
test("Une navigation de portail 2027 partagée relie Quest, Campus, membre et cinq accès PWA",()=>{
 const pages={quest,academy:read("public/vitrine/sde-academy-parcours.html"),membre:read("public/vitrine/tableau-membre.html")};
 for(const [kind,source] of Object.entries(pages)){
  const d=new JSDOM(source,{url:"https://mouvement-sde.org/"+kind,runScripts:"outside-only"});
  d.window.eval(read("public/vitrine/sde-universe-navigation.js"));
  d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
  assert.equal(d.window.document.querySelectorAll("[data-sdu-universe-nav] .sdu-cross-nav-group").length,4,kind);
  assert.ok(d.window.document.querySelector('[data-sdu-universe-nav] a[href="/mon-espace/academy"]'),kind);
  assert.ok(d.window.document.querySelector('[data-sdu-universe-nav] a[href="/soldiers-tv"]'),kind);
  if(kind==="academy")assert.equal(d.window.document.querySelectorAll(".sdu-private-bottom a").length,5);
  else assert.equal(d.window.document.querySelectorAll(".sdu-private-bottom a").length,0);
  d.window.close();
 }
});
test("Soldiers TV : retour au site et sous-navigation, agenda exportable sans direct fictif",()=>{
 const doc=new JSDOM(tv).window.document;
 const nav=doc.querySelector(".sdu-tv-subnav");
 assert.ok(nav);
 assert.ok(nav.querySelector('a[href="/"]'));
 assert.ok(nav.querySelector('a[href="/soldiers-voice"]'));
 assert.ok(nav.querySelector('a[href="#podcasts"]'));
 assert.ok(nav.querySelector('a[href="#rubriques"]'));
 assert.ok(doc.querySelector('a[href="/api/calendrier.ics"]'));
 assert.ok(read("src/worker.js").includes('p === "/api/calendrier.ics"'));
 assert.match(tv,/Aucun direct ni spectateur n.est simulé/);
});
test("Responsive PWA 2027 : carrousels tactiles, retour clavier, données Academy réelles",()=>{
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(css,/grid-auto-flow:column/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/body\.sdu-quest-page \.sdu-quest-sidebar\{display:none!important\}/);
 assert.match(css,/\.sdu-tv-subnav a/);
 assert.match(css,/\.sdu-private-bottom/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const progress=read("public/vitrine/sde-academy-parcours.js");
 assert.match(progress,/const v=snapshot\.progress/);
 assert.match(progress,/text\("statPercent",v\.percentage/);
});

test("Quest desktop : notice stable avant injection du menu, polices locales dans la fiche",()=>{
 const quest=read("public/vitrine/soldier-quest.html");
 const note=quest.indexOf("Les validations, badges et données personnelles");
 const insertion=quest.indexOf('data-sdu-universe-nav data-context="quest"');
 assert.ok(note>=0&&insertion>=0&&note<insertion,"notice avant menu pour supprimer le saut au rendu");
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(css,/body\.sdu-quest-page \.sdu-hero-aside \.sdu-title/);
 assert.match(css,/font-family:Georgia,"Times New Roman",serif!important/);
 assert.match(css,/body\.sdu-quest-page \.sdu-hero-aside :is\(ul,\.sdu-mini\)/);
});
