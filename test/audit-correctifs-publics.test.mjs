import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const lire=f=>readFileSync(f,"utf8");
const script=lire("public/vitrine/portail-unifie.js");
const correctifs=script.slice(script.indexOf("/* Correctifs transversaux : actualité"));
assert.ok(correctifs.length>1000,"Le script d'actualisation est présent");

function page(){
  const dom=new JSDOM('<!doctype html><body class="sde-unifie"><aside class="infire-takeover"><a href="/programmes#infire">IN FIRE 2026</a></aside><header class="site-header"><button class="site-burger" type="button"></button><nav id="site-menu" data-open="false"><a href="/programmes">Programmes</a></nav></header><div class="iv-band"><div class="iv-frame"><img src="/vitrine/illus/infire-banniere.webp" alt="IN FIRE"></div></div><section id="agenda"><div class="enveloppe"><div id="agenda-liste"><article class="programme rdv revele" data-type="Rencontre"><h3>IN FIRE 2026</h3><button data-ics="infire">Calendrier</button></article><article class="programme rdv" id="tpa-2026"><h3>Traversée Prophétique Annuelle</h3></article></div></div></section></body>',{
    url:"https://mouvement-sde.org/programmes",runScripts:"outside-only",pretendToBeVisual:true
  });
  dom.window.Date=class extends Date {static now(){return Date.parse("2026-11-01T12:00:00Z")}};
  dom.window.eval(correctifs);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return dom;
}
test("La TPA remplace IN FIRE en bandeau et en visuel après le 31 octobre",()=>{
  const dom=page(),doc=dom.window.document;
  assert.equal(doc.querySelector(".infire-takeover a").getAttribute("href"),"/programmes#tpa-2026");
  assert.match(doc.querySelector(".infire-takeover").textContent,/18 décembre/);
  assert.match(doc.querySelector(".iv-band img").getAttribute("src"),/tpa-2026\.webp/);
  assert.equal(doc.querySelector(".sde-hero-cta").getAttribute("href"),"/programmes#tpa-2026");
  dom.window.close();
});
test("L'événement passé reste consultable en archives sans nouvelle inscription calendrier",()=>{
  const dom=page(),doc=dom.window.document;
  assert.equal(doc.querySelector("#agenda-liste > .programme.rdv")?.id,"tpa-2026");
  assert.match(doc.querySelector(".sde-archives summary").textContent,/Événements passés/);
  assert.match(doc.querySelector(".sde-archives h3").textContent,/IN FIRE/);
  assert.equal(doc.querySelector(".sde-archives [data-ics]"),null);
  dom.window.close();
});
test("Le menu mobile bloque le défilement pendant son ouverture",async()=>{
  const dom=page(),{window}=dom,doc=window.document;
  Object.defineProperty(window,"innerWidth",{value:390,configurable:true});
  doc.querySelector("#site-menu").dataset.open="true";
  await new Promise(resolve=>window.queueMicrotask(resolve));
  assert.ok(doc.body.classList.contains("sde-menu-mobile-ouvert"));
  doc.querySelector("#site-menu").dataset.open="false";
  await new Promise(resolve=>window.queueMicrotask(resolve));
  assert.ok(!doc.body.classList.contains("sde-menu-mobile-ouvert"));
  window.close();
});
test("Le bilan public a une page, une route et des liens de compatibilité",()=>{
  const worker=lire("src/worker.js");
  assert.match(worker,/["']\/formulaire["']:\s*["']\/vitrine\/formulaire\.html["']/);
  for(const slug of ["/formulaire/","/bilan-2026","/bilan-2026-projets-2027","/sondage-2027"])assert.ok(worker.includes(slug));
  assert.match(lire("public/vitrine/formulaire.html"),/\/api\/formulaire/);
});
test("Le calendrier charge les événements futurs et conserve l'affiche TPA",()=>{
  const agenda=lire("public/vitrine/subpage.js");
  assert.match(agenda,/e\.date>=jourAbidjan/);
  assert.match(agenda,/list\.prepend\(tpaOfficielle\)/);
  assert.doesNotMatch(agenda,/href="\/vitrine\/rejoindre#rejoindre"/);
  assert.match(lire("public/vitrine/portail.html"),/href="\/programmes#tpa-2026"/);
});
