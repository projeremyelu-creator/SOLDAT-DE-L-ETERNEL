import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
test("les médias IN FIRE publiés sont affichés uniquement dans leur année",()=>{
 const js=readFileSync("public/vitrine/sde-public-media.js","utf8");
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.ok(js.includes('if(page==="/album-infire")'));
 assert.ok(js.includes('document.querySelectorAll(".tab[data-year]")'));
 assert.ok(js.includes('getAttribute("aria-selected")==="true"'));
 assert.ok(js.includes('cards[i].style.display=match?"":"none"'));
 assert.ok(js.includes('section.style.display=count?"":"none"'));
 assert.ok(js.includes('queueMicrotask(update)'));
});
test("les publications utilisent exclusivement les médias publics achevés",()=>{
 const js=readFileSync("public/vitrine/sde-public-media.js","utf8");
 assert.ok(js.includes('m.visibilite==="public"'));
 assert.ok(js.includes('"/api/medias"'));
 assert.ok(js.includes('page==="/album-infire"'));
});
