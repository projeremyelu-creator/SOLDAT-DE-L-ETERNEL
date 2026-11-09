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
test("Les versets méditatifs se fondent sans défilement horizontal",()=>{
 const css=read("public/vitrine/sde-versets.css");
 const js=read("public/vitrine/sde-versets.js");
 assert.match(css,/\.sde-verset-sortie\{opacity:0/);
 assert.match(css,/transition:opacity \.35s/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/animation:sde-versets/);
 assert.match(js,/PERIODE = 6500/);
 assert.match(js,/setTimeout\(\(\)=>avancer\(false\),restant\)/);
 assert.match(js,/suivant\.addEventListener\("click"/);
 assert.match(js,/verset\.classList/);
 assert.doesNotMatch(js,/cloneNode\(/);
});
