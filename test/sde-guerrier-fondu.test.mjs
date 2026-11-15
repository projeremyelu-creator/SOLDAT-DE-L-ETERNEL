import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("la vignette du guerrier est une couche masquée sans rectangle visible en fond",()=>{
 const css=readFileSync("public/vitrine/sde-maquettes-integrales.css","utf8");
 const at=css.lastIndexOf("Finition photographique des maquettes");
 assert.ok(at>0);
 const end=css.slice(at);
 assert.match(end,/\.ap-hero::after\{/);
 assert.ok(end.includes('url("/vitrine/illus/guerrier-reference-sde.webp")'));
 assert.ok(end.includes("-webkit-mask-image:radial-gradient("));
 assert.ok(end.includes("mask-image:radial-gradient("));
 assert.ok(end.includes("pointer-events:none!important"),"La couche ne doit pas bloquer les clics");
 assert.ok(end.includes("z-index:1!important"),"La photo demeure derriere les liens accessibles");
 assert.match(end,/@media\(max-width:760px\)/);
 assert.match(end,/@media\(max-width:390px\)/);
 assert.doesNotMatch(end,/hero-sde-1280\.webp/,"Ne pas retablir l'ancienne photo de groupe");
});

test("le portrait de prière se fond dans la couverture privée sans masquer les textes ni données",()=>{
 const css=readFileSync("public/vitrine/sde-maquettes-integrales.css","utf8");
 const at=css.lastIndexOf("Finition du second personnage");
 assert.ok(at>0);
 const fin=css.slice(at);
 assert.ok(fin.includes(".sde-px-member-cover::after"));
 assert.ok(fin.includes("/vitrine/illus/priere-reference-sde.webp"));
 assert.ok(fin.includes("-webkit-mask-image:linear-gradient("));
 assert.ok(fin.includes("pointer-events:none!important"));
 assert.ok(fin.includes("z-index:-1!important"));
});
