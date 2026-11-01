import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");

test("Confidentialité : page publique et route indexable",()=>{
 const html=read("public/vitrine/confidentialite.html"),dom=new JSDOM(html),doc=dom.window.document;
 assert.equal(doc.documentElement.lang,"fr");
 assert.match(doc.querySelector("h1").textContent,/Confidentialité/);
 assert.ok(doc.querySelector('meta[name="description"]'));
 assert.ok(doc.querySelector('a[href="mailto:infosoldat@gmail.com?subject=Confidentialit%C3%A9%20SDE"]'));
 assert.ok(doc.querySelector('a[href="/portail"]'));
 assert.ok(doc.querySelector('a[href="/formulaire"]'));
 assert.match(read("src/worker.js"),/["']\/confidentialite["']:\s*["']\/vitrine\/confidentialite\.html["']/);
 assert.ok(read("public/sitemap.xml").includes("https://mouvement-sde.org/confidentialite"));
 dom.window.close();
});
test("Confidentialité : toutes les variantes de navigation publiques pointent vers la nouvelle page",()=>{
 assert.match(read("public/vitrine/portail-unifie.js"),/a\.href="\/confidentialite"/);
 assert.match(read("public/vitrine/sde-hub.js"),/a\.href="\/confidentialite"/);
});
test("Médiathèque : chronogramme IN FIRE réellement public",()=>{
 const html=read("public/vitrine/ressources.html");
 const dom=new JSDOM(html);
 const card=dom.window.document.querySelector('[data-sde-officiel="chronogramme-infire"]');
 assert.ok(card);
 const link=card.querySelector("a[href]");
 assert.equal(link.getAttribute("href"),"/vitrine/infire-2026/chronogramme-officiel.pdf");
 assert.ok(existsSync("public"+link.getAttribute("href")));
 assert.match(card.textContent,/Disponible/);
 assert.match(read("public/vitrine/ressources-public.js"),/grid\.replaceChildren\(\.\.\.documentsOfficiels\)/);
 dom.window.close();
});
