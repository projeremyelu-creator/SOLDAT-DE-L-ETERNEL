import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");

test("Accueil : TPA compacte sans image préchargée et versets présents avant l'exécution de JavaScript",()=>{
 const s=read("public/vitrine/portail.html");
 const dom=new JSDOM(s),doc=dom.window.document;
 const preload=doc.querySelector('link[rel="preload"][as="image"]');
 assert.equal(preload,null,"le programme compact ne précharge pas une grande affiche invisible");

 const placeholder=doc.querySelector(".sde-versets-slot");
 assert.ok(placeholder);
 assert.equal(placeholder.getAttribute("aria-label"),"Verset du jour");
 assert.ok(placeholder.previousElementSibling?.matches('.sde-shell-event'),"le bandeau TPA précède les versets");
 assert.equal(placeholder.nextElementSibling?.id,"contenu");
 assert.ok(doc.querySelector('.sde-shell-event a[href="/programmes#tpa-2026"]'),"le bandeau mène à la fiche TPA");
 assert.ok(doc.querySelector('.ap-next[data-evenement="tpa-2026"]'),"le programme phare est conservé dans l'agenda");
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
 assert.ok(band.previousElementSibling?.matches('.sde-shell-event'));
 assert.strictEqual(band.nextElementSibling,neighbor);
 assert.equal(doc.querySelectorAll(".sde-versets").length,1);
 assert.equal(doc.querySelector(".sde-versets-slot"),null);
 assert.equal(band.querySelectorAll(".sde-verset").length,1,"un seul verset visible, sans copie DOM");
 assert.equal(band.querySelectorAll(".sde-versets-piste").length,0);
 assert.ok(band.querySelector(".sde-verset q"));
 assert.ok(band.querySelector(".sde-verset cite"));
 const pause=band.querySelector(".sde-versets-pause");
 assert.ok(pause);
 pause.click();
 assert.equal(pause.getAttribute("aria-pressed"),"true");
 dom.window.close();
});

test("Les styles conservent exactement la même hauteur avant et après insertion",()=>{
 const s=read("public/vitrine/sde-versets.css");
 assert.match(s,/body\.sde-accueil-maquette \.sde-versets-slot,\s*body\.sde-accueil-maquette \.sde-versets\s*\{[\s\S]*?height:88px;[\s\S]*?min-height:88px;[\s\S]*?max-height:88px;/);
});
