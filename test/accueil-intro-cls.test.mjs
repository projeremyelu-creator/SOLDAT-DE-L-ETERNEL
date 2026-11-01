import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const css=readFileSync("public/vitrine/sde-sitewide-2026.css","utf8");
const html=readFileSync("public/vitrine/portail.html","utf8");

test("La grille d'accueil réserve 260 px sur les grands écrans, sans figer le mobile",()=>{
 const rule=css.slice(css.indexOf("/* Accueil SDE : grille verticale stable sur grand écran."));
 assert.ok(rule.startsWith("/* Accueil SDE"),"Règles de stabilité introuvables");
 assert.match(rule,/@media \(min-width:1101px\)/);
 assert.match(rule,/\.iv-intro \{\s*box-sizing:border-box;\s*height:260px;\s*min-height:260px;/);
 assert.match(rule,/grid-template-rows:40px 42px 52px 30px/);
 assert.match(rule,/\.iv-intro \.iv-cta \{/);
 const doc=new JSDOM(html).window.document;
 const intro=doc.querySelector(".iv-vitrine .iv-intro");
 assert.ok(intro);
 for(const item of ["h2","p",".iv-cta",".iv-sub"])assert.ok(intro.querySelector(item),item);
 // Le build de production remplace les versions de fichiers par une empreinte.
 assert.match(html,/sde-sitewide-2026\.css\?v=[a-z0-9]+/i);
});
