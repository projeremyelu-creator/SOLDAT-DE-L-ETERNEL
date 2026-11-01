import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");

test("Les deux adresses Plus et Rubriques aboutissent à la même page publique canonique",()=>{
 const worker=read("src/worker.js");
 assert.match(worker,/if \(p === "\/plus" && \(req\.method === "GET" \|\| req\.method === "HEAD"\)\)/);
 assert.match(worker,/location:url\.origin\+"\/rubriques"\+url\.search/);
 assert.match(worker,/"\/rubriques": "\/vitrine\/plus\.html"/);
 const doc=new JSDOM(read("public/vitrine/plus.html")).window.document;
 assert.equal(doc.querySelector('link[rel="canonical"]')?.href,"https://mouvement-sde.org/rubriques");
 assert.match(doc.title,/Rubriques/);
});

test("Le menu sur ordinateur compact reste ouvert de 901 à 1800 px",()=>{
 const dom=new JSDOM(read("public/vitrine/portail.html"),{
  url:"https://mouvement-sde.org/",runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window;
 Object.defineProperty(w,"innerWidth",{value:1200,configurable:true});
 w.eval(read("public/vitrine/portail-unifie.js"));
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 const btn=w.document.querySelector(".site-header .site-burger");
 const menu=w.document.querySelector(".site-header .site-menu");
 assert.ok(btn&&menu);
 const links=[...menu.querySelectorAll('a[href="/rubriques"]')];
 assert.equal(links.length,1);
 assert.match(links[0].textContent,/Toutes les rubriques/);
 btn.click();
 assert.equal(menu.dataset.open,"true");
 Object.defineProperty(w,"innerWidth",{value:1600,configurable:true});
 w.dispatchEvent(new w.Event("resize"));
 assert.equal(menu.dataset.open,"true","Le menu reste ouvert en mode compact");
 Object.defineProperty(w,"innerWidth",{value:1900,configurable:true});
 w.dispatchEvent(new w.Event("resize"));
 assert.equal(menu.dataset.open,"false","Le menu se ferme à l'affichage desktop intégral");
 dom.window.close();
});

test("Les options de confidentialité et les références de cinq pôles restent disponibles",()=>{
 const noms=[
  ["pole-reveil","Réveil, évangélisation & missions"],
  ["pole-social","Impact social & humanitaire"],
  ["pole-logistique","Logistique & organisation"],
  ["pole-medias","Communication, médias & digital"],
  ["pole-formation","Formation & développement intégral"]
 ];
 for(const [slug,reference] of noms){
  const dom=new JSDOM(read("public/vitrine/"+slug+".html"));
  const doc=dom.window.document;
  assert.equal(doc.querySelector("form[data-pole-engager]")?.dataset.poleReference,reference);
  assert.ok(doc.querySelector('form[data-pole-engager] a[href="/confidentialite"]'));
  dom.window.close();
 }
});
