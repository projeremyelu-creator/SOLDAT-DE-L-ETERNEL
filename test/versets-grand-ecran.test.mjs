import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("Entre 901 et 1800 px : menu compact pour éviter le débordement",()=>{
 const css=read("public/vitrine/sde-sitewide-2026.css");
 assert.match(css,/@media\(min-width:901px\) and \(max-width:1800px\)/);
 assert.match(css,/@media\(min-width:1801px\)/);
 const compact=css.slice(css.indexOf("@media(min-width:901px) and (max-width:1800px)"));
 assert.match(compact,/\.site-header \.site-menu\s*\{[\s\S]*?display:none!important/);
 assert.match(compact,/\.site-header \.site-menu\[data-open="true"\]\s*\{[\s\S]*?display:flex!important/);
});
test("Le bandeau des versets conserve le défilement et la réduction du mouvement",()=>{
 const css=read("public/vitrine/sde-versets.css");
 assert.match(css,/\.sde-versets-piste\s*\{[^}]*animation:sde-versets/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/Mode bureau large : la piste répétée/);
});
