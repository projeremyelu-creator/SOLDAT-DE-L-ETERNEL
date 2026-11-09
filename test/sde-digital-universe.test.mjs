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
 assert.match(shell,/class=\\"sde-shell-consent\\"/);
 assert.match(shell,/name=\\"consentement\\"/);
 assert.match(css,/body\.sde-universe-page \.sde-shell-newsletter label\.sde-shell-consent\s*\{[^}]*min-height:48px/s);
 assert.match(css,/body\.sde-universe-page \.sdu-filterbar button\s*\{min-height:46px!important\}/);
});
test("Soldier Quest desktop : hauteur réservée à l'intro avant chargement des polices",()=>{
 const css=read("public/vitrine/sde-digital-universe.css");
 assert.match(css,/@media\(min-width:1051px\)\s*\{\s*body\.sdu-quest-page \.sdu-quest-content>\.sdu-intro-band\s*\{[^}]*height:170px;min-height:170px/s);
});
