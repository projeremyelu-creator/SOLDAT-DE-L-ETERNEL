import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read = path => readFileSync(path,"utf8");

test("Direction artistique : palette royale et hiérarchie typographique",()=>{
 const css=read("public/vitrine/sde-shell-public.css");
 const home=read("public/vitrine/portail.html");
 for(const color of ["#0D1B38","#FAF7F0","#D9A72E","#B74624","#00644F"])assert.ok(css.includes(color),color);
 assert.match(css,/\.sde-premium-pillar-top small/);
 assert.match(css,/letter-spacing:\.2em/);
 assert.match(css,/\.ap-verset p/);
 const doc=new JSDOM(home).window.document;
 assert.equal(doc.querySelectorAll(".sde-2027-pillar-icon .sde-pillar-icon").length,3,"les trois emblèmes actifs ont un pictogramme SVG");
 assert.equal(doc.querySelectorAll(".sde-2027-pillar-icon[aria-hidden='true']").length,3);
 assert.equal(doc.querySelectorAll(".sde-premium-pillar-top").length,0,"anciens blocs remplacés");
 assert.equal(doc.querySelectorAll(".ap-hero .sde23-actions a").length,4,"quatre destinations réelles de la direction cinématique et communautaire 2+3");
});

test("Grille Bento des cinq pôles, médaillon pour les emblèmes et galerie lisible",()=>{
 const home=new JSDOM(read("public/vitrine/portail.html")).window.document;
 const css=read("public/vitrine/sde-shell-public.css");
 const logos=[...home.querySelectorAll("#poles-accueil .ap-poles img")];
 assert.equal(logos.length,5);
 assert.deepEqual(logos.map(img=>img.getAttribute("alt")),[
  "Emblème officiel du pôle REV","Emblème officiel du pôle ISH",
  "Emblème officiel du pôle LO","Emblème officiel du pôle CMR",
  "Emblème officiel du pôle FDE"
 ]);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
 assert.match(css,/nth-child\(-n\+2\)/);
 assert.match(css,/grid-column:span 3/);
 assert.match(css,/grid-column:span 2/);
 assert.match(css,/backdrop-filter:blur\(8px\)/);
 assert.match(css,/scale\(1\.04\)/);
 assert.match(css,/rgba\(7,8,12,\.96\)/);
});

test("Vidéo sans son, menus SVG, micro-interactions et réduction du mouvement",()=>{
 const doc=new JSDOM(read("public/vitrine/portail.html")).window.document;
 const css=read("public/vitrine/sde-shell-public.css");
 assert.ok(doc.querySelector(".ap-presentation-cadre video[preload='metadata'][autoplay][muted][loop][controls]"));
 assert.ok(doc.querySelector(".sde-video-label svg"));
 assert.match(doc.querySelector(".sde-video-label").textContent,/1 min 13 · sans son/);
 assert.match(css,/sde-art-pop/);
 assert.match(css,/sde-art-shimmer/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/sde-countdown-unit/);
});

test("Versets : seul un texte visible change par fondu toutes les sept secondes, la pause fonctionne",()=>{
 const dom=new JSDOM(read("public/vitrine/portail.html"),{
  url:"https://mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,doc=w.document,intervals=[],timeouts=[];
 w.matchMedia=()=>({matches:false});
 w.fetch=async()=>({ok:false});
 w.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
 w.setTimeout=(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;};
 try{
  w.eval(read("public/vitrine/sde-versets.js"));
  doc.dispatchEvent(new w.Event("DOMContentLoaded"));
  const band=doc.querySelector(".sde-versets"),verse=band?.querySelector(".sde-verset");
  assert.ok(verse);
  assert.equal(band.querySelectorAll(".sde-verset").length,1);
  assert.equal(band.querySelectorAll(".sde-versets-piste").length,0);
  const initial=verse.querySelector("q").textContent;
  const timer=intervals.find(x=>x.ms===7000);
  assert.ok(timer,"rotation toutes les 7 secondes");
  timer.fn();
  assert.ok(verse.classList.contains("sde-verset-sortie"));
  const transition=timeouts.find(x=>x.ms===350);
  assert.ok(transition);
  transition.fn();
  assert.notEqual(verse.querySelector("q").textContent,initial);
  assert.equal(verse.classList.contains("sde-verset-sortie"),false);
  const pause=band.querySelector(".sde-versets-pause");
  assert.ok(pause.querySelector("svg"));
  pause.click();
  assert.equal(pause.getAttribute("aria-pressed"),"true");
  const avant=verse.querySelector("q").textContent;
  timer.fn();
  assert.equal(verse.querySelector("q").textContent,avant,"la pause stoppe la rotation");
 }finally{dom.window.close();}
});

test("Préférence de mouvement réduit : affichage statique au chargement",()=>{
 const dom=new JSDOM(read("public/vitrine/portail.html"),{
  url:"https://mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,doc=w.document,timers=[];
 w.matchMedia=()=>({matches:true});
 w.fetch=async()=>({ok:false});
 w.setInterval=(fn,ms)=>{timers.push({fn,ms});return timers.length;};
 try{
  w.eval(read("public/vitrine/sde-versets.js"));
  doc.dispatchEvent(new w.Event("DOMContentLoaded"));
  const band=doc.querySelector(".sde-versets");
  assert.equal(band.querySelector(".sde-versets-pause").getAttribute("aria-pressed"),"true");
  const before=band.querySelector("q").textContent;
  timers.find(x=>x.ms===7000).fn();
  assert.equal(band.querySelector("q").textContent,before);
 }finally{dom.window.close();}
});
