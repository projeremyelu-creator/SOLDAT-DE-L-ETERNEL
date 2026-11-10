import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const css=readFileSync("public/vitrine/sde-shell-public.css","utf8");
const section=css.slice(css.lastIndexOf("/* Correctif captures mobiles 10/11/2026"));
test("liens du menu Plus contrastés sur bleu nuit",()=>{assert.match(section,/sde-shell-drawer-group \.sde-shell-submenu a/);assert.match(section,/color:#f7f0df!important/);assert.match(section,/min-height:44px/);});
test("onglets blancs utilisent une encre bleu nuit",()=>{assert.match(section,/main \.pg-tabs a/);assert.match(section,/color:#142544!important/);});
test("confidentialité sur fond violet utilise une encre claire",()=>{assert.match(section,/data-sde-page="rejoindre".*main \.confidentialite/);assert.match(section,/color:#f1eaf6!important/);});
test("navigation mobile conserve l'espace de sécurité",()=>{assert.match(section,/@media\(max-width:800px\)/);assert.match(section,/safe-area-inset-bottom/);});
