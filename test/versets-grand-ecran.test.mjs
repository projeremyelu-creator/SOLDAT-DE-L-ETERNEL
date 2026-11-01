import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("public/vitrine/sde-versets.css","utf8");
test("Bureau >=1500 : affichage statique sans piste de 11 000 px",()=>{
  const section=css.slice(css.indexOf("/* Mode bureau large : la piste"));
  assert.ok(section.length>500);
  assert.match(section,/@media\(min-width:1500px\)/);
  assert.match(section,/\.sde-versets-piste\s*\{[\s\S]*?width:100%!important/);
  assert.match(section,/\.sde-versets-piste\s*\{[\s\S]*?animation:none!important/);
  assert.match(section,/\.sde-versets-groupe:first-child/);
  assert.match(section,/text-overflow:ellipsis/);
});
