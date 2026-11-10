import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync("public/vitrine/portail.html","utf8");
const css=readFileSync("public/vitrine/sde-reveil-immersif.css","utf8");
const js=readFileSync("public/vitrine/sde-reveil-immersif.js","utf8");
const section=html.slice(html.indexOf('<section class="sde-rv"'),html.indexOf('<section class="sde-master-access"'));
test("Maquette SDE : 7 espaces visibles et liens réels, sans chiffre de démonstration",()=>{
 assert.ok(section.length>7000,"section intégrée à l'accueil");
 for(const id of ["sde-rv-title","sde-rv-academy-title","sde-rv-agenda-title","sde-rv-media-title","sde-rv-missions-title","sde-rv-impact-title"]){
  assert.ok(section.includes('id="'+id+'"'),id);
 }
 for(const url of ["/mouvement","/contact#rejoindre","/academy","/soldiers-tv","/programmes#tpa-2026","/missions-humanitaires","/transparence","/portail"]){
  assert.ok(section.includes('href="'+url+'"'),url);
 }
 assert.ok(!/\b3[.,]7[Kk]\b/.test(section),"pas de KPI décoratif");
 assert.ok(!/autoplay/.test(section),"ni vidéo ni son lancés automatiquement");
 assert.ok(html.includes('sde-reveil-immersif.css?v=20261110r1'));
 assert.ok(html.includes('sde-reveil-immersif.js?v=20261110r1'));
});
test("Academy : trois onglets et panneaux accessibles, sans contournement des rôles",()=>{
 for(const tab of ["prophetique","parcours","videos"]){
  assert.ok(section.includes('data-sde-rv-tab="'+tab+'"'));
  assert.ok(section.includes('data-sde-rv-panel="'+tab+'"'));
  assert.ok(section.includes('aria-controls="sde-rv-panel-'+tab+'"'));
 }
 assert.ok(js.includes('ArrowRight')&&js.includes('ArrowLeft'));
 assert.ok(js.includes('tab.tabIndex=active?0:-1'));
 assert.ok(js.includes('panel.hidden='));
});
test("Médias : lecteur réel, chargement au clic et animation désactivable",()=>{
 assert.ok(section.includes('/vitrine/sde-presentation-2026.mp4'));
 assert.ok(section.includes('preload="none"'));
 assert.ok(js.includes('mediaButton?.addEventListener("click"'));
 assert.ok(js.includes('video?.pause()'));
 assert.ok(js.includes('prefers-reduced-motion: reduce'));
 assert.ok(css.includes('.sde-rv-motion-paused'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test("Agenda : source publique existante, aucun rendez-vous inventé par script",()=>{
 assert.ok(js.includes('document.querySelector("#prochain-rendez-vous")'));
 assert.ok(js.includes('#ap-next-title')&&js.includes('#ap-next-date')&&js.includes('#ap-next-time'));
 assert.ok(js.includes('new MutationObserver(syncEvent)'));
 assert.ok(js.includes('dest.origin===location.origin'));
 assert.ok(section.includes('2026-12-18T20:00:00+00:00'));
});
test("Mobile et contraste : les sections utilisent le bleu nuit, l'ivoire et l'or",()=>{
 assert.ok(css.includes('@media(max-width:760px)'));
 assert.ok(css.includes('@media(max-width:490px)'));
 assert.ok(css.includes('flex-direction:column'));
 assert.ok(css.includes('#fff5dc'));
 assert.ok(css.includes('#e2e8f2'));
 assert.ok(css.includes('-webkit-text-fill-color'));
 assert.ok(css.includes('min-height:44px'));
 assert.ok(section.includes('aria-label="Aperçu de l\\'expérience mobile SDE"'));
});
