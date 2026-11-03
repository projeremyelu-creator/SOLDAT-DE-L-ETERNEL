import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");

test("Accueil : image TPA préchargée et versets présents avant l'exécution de JavaScript",()=>{
 const s=read("public/vitrine/portail.html");
 const dom=new JSDOM(s),doc=dom.window.document;
 const preload=doc.querySelector('link[rel="preload"][as="image"]');
 assert.equal(preload?.getAttribute("href"),"/vitrine/illus/tpa-2026.webp");
 assert.equal(preload?.getAttribute("fetchpriority"),"high");
 const placeholder=doc.querySelector(".sde-versets-slot");
 assert.ok(placeholder);
 assert.equal(placeholder.getAttribute("aria-label"),"Verset du jour");
 assert.equal(placeholder.previousElementSibling?.tagName,"HEADER");
 assert.equal(placeholder.nextElementSibling?.classList.contains("sde-rail"),true);
 assert.ok(doc.querySelector(".sde-hero-poster img[src='/vitrine/illus/tpa-2026.webp']"));
 assert.ok(doc.querySelector(".iv-band.sde-community-band img[src='/vitrine/photos/communion-vignette.webp']"));
 assert.equal(doc.querySelectorAll(".iv-vitrine img[src='/vitrine/illus/tpa-2026.webp']").length,0);
 assert.doesNotMatch(s,/rel="preload" as="image" href="\/vitrine\/illus\/infire-banniere\.webp"/);
 dom.window.close();
});

test("Le script de versets remplace l'emplacement réservé sans ajouter une section dans le flux",async()=>{
 const s=read("public/vitrine/portail.html");
 const dom=new JSDOM(s,{
  url:"https://mouvement-sde.org/",
  runScripts:"outside-only",
  pretendToBeVisual:true
 });
 const w=dom.window,doc=w.document;
 w.matchMedia=()=>({matches:false});
 w.fetch=async()=>({ok:false});
 const slot=doc.querySelector(".sde-versets-slot");
 const neighbor=slot.nextElementSibling;
 w.eval(read("public/vitrine/sde-versets.js"));
 doc.dispatchEvent(new w.Event("DOMContentLoaded"));
 const band=doc.querySelector(".sde-versets");
 assert.ok(band);
 assert.equal(band.previousElementSibling?.tagName,"HEADER");
 assert.strictEqual(band.nextElementSibling,neighbor);
 assert.equal(doc.querySelectorAll(".sde-versets").length,1);
 assert.equal(doc.querySelector(".sde-versets-slot"),null);
 assert.equal(band.querySelectorAll(".sde-verset").length,12);
 const pause=band.querySelector(".sde-versets-pause");
 assert.ok(pause);
 pause.click();
 assert.equal(pause.getAttribute("aria-pressed"),"true");
 dom.window.close();
});

test("Les styles conservent exactement la même hauteur avant et après insertion",()=>{
 const s=read("public/vitrine/sde-versets.css");
 assert.match(s,/body\.sde-accueil-maquette \.sde-versets-slot,\s*body\.sde-accueil-maquette \.sde-versets\s*\{[\s\S]*?height:48px;[\s\S]*?min-height:48px;[\s\S]*?max-height:48px;/);
});
