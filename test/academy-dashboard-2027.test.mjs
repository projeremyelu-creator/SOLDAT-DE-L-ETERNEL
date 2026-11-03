import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SOLDIERS_ACADEMY_2027} from "../src/soldiers-academy-2027.js";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../public/app.css",import.meta.url),"utf8");
const start=html.indexOf("  VUES.academie = function () {");
const end=html.indexOf("  /* ── Préinscriptions Academy (admin) ── */",start);
const view=html.slice(start,end);
function extract(name){
 const m=html.match(new RegExp("const "+name+"=(\\[[^\\n]+\\]);"));
 assert.ok(m,name+" indisponible");
 return JSON.parse(m[1]);
}
test("Académie commandement : remplacer l'ancien parcours 4 niveaux et les listes à zéro par le vrai cursus",()=>{
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(view,/NIVEAUX_ACAD|renderNiveaux|sousOnglets\("academie"/);
 assert.doesNotMatch(view,/ajout-formation|S\.formations|aucune formation associée/i);
 assert.match(view,/Soldiers Academy/);
 assert.match(view,/academy27-levels/);
 assert.match(view,/academy27-tools/);
 assert.match(view,/\/administration\/academy/);
 assert.match(view,/\/mon-espace\/academy/);
 assert.match(view,/\/mon-espace\/enseignants/);
 assert.match(view,/\/academy-programme-24/);
 assert.ok(!html.includes("function renderNiveaux()"),"Le générateur des quatre anciennes cartes ne doit plus exister");
});
test("Référentiel affiché : exactement 24 cours officiels répartis en 3 niveaux de 8 et 64 heures",()=>{
 const cours=extract("ACADEMY_2027_COURS"),niveaux=extract("ACADEMY_2027_NIVEAUX");
 assert.equal(cours.length,24);assert.equal(niveaux.length,3);
 assert.deepEqual(cours.map(x=>x.id),SOLDIERS_ACADEMY_2027.courses.map(c=>c.id));
 for(let i=0;i<24;i++){
  assert.equal(cours[i].title,SOLDIERS_ACADEMY_2027.courses[i].title,"Le libellé "+cours[i].id+" doit reprendre le cursus officiel");
  assert.equal(cours[i].level,SOLDIERS_ACADEMY_2027.courses[i].level);
 }
 for(let level=1;level<=3;level++)assert.equal(cours.filter(x=>x.level===level).length,8);
 assert.match(view,/8 cours · 64 h/);
 assert.match(view,/192 h/);
 assert.doesNotMatch(view,/Niveau 4|Quatre niveaux|Fondations de la Foi|Combat Spirituel|Leadership & Service|Ministère Apostolique/);
});
test("Accueil et mobile : carte Académie actualisée, boutons accessibles et pas de chiffres historiques faux",()=>{
 const p=html.slice(html.indexOf("  function carteAcademie() {"),html.indexOf("  /* ════════════════════════ Porte-Voix"));
 assert.match(p,/24 cours/);assert.match(p,/192 heures/);
 assert.doesNotMatch(p,/S\.formations|Aucune formation en cours/);
 assert.match(css,/academy27-hero/);assert.match(css,/academy27-metrics/);assert.match(css,/academy27-levels/);assert.match(css,/academy27-tool/);
 assert.match(css,/@media\(max-width:770px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(html,/long: "Soldiers Academy", desc: "24 cours · 3 niveaux/);
});
