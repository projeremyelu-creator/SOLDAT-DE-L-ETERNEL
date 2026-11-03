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

test("La bande 960–1100 px réserve 300 px et conserve quatre lignes indépendantes des polices",()=>{
 const rule=css.slice(css.indexOf("/* Tablettes 960–1100 px"));
 assert.ok(rule.startsWith("/* Tablettes 960–1100"),"Stabilisation tablette manquante");
 assert.match(rule,/@media \(min-width:960px\) and \(max-width:1100px\)/);
 assert.match(rule,/\.iv-intro \{\s*box-sizing:border-box;\s*height:300px;\s*min-height:300px;/);
 assert.match(rule,/grid-template-rows:72px 42px 52px 30px/);
 assert.match(rule,/\.iv-intro h2 \{\s*line-height:36px/);
 assert.match(rule,/\.iv-intro \.iv-cta \{\s*min-height:52px/);
 assert.match(rule,/\.iv-intro \.iv-sub \{\s*min-height:30px/);
 assert.match(html,/sde-sitewide-2026\.css\?v=[a-z0-9]+/i);
});


test("La nouvelle composition TPA garde la réserve visuelle 300/260 px de la recette Chromium",()=>{
 const premium=readFileSync("public/vitrine/sde-premium-public.css","utf8");
 const source=readFileSync("public/vitrine/portail.html","utf8");
 assert.ok(source.indexOf('class="m-welcome"')<source.indexOf('class="iv-vitrine"'));
 const fix=premium.slice(premium.lastIndexOf("Recette réelle Chromium 03/11"));
 assert.ok(fix.startsWith("Recette réelle Chromium 03/11"));
 assert.match(fix,/@media \(min-width:960px\) and \(max-width:1100px\)/);
 assert.match(fix,/height:300px!important;min-height:300px!important;max-height:300px!important/);
 assert.match(fix,/@media \(min-width:1101px\)/);
 assert.match(fix,/height:260px!important;min-height:260px!important;max-height:260px!important/);
 assert.match(fix,/@media\(max-width:959px\)/);
});
