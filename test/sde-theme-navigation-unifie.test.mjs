import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("public/vitrine/sde-shell-public.css","utf8");
const js=readFileSync("public/vitrine/sde-shell-public.js","utf8");
test("la charte SDE conserve les cinq couleurs avec leurs fonctions",()=>{
 for(const token of ["--sde-2027-night:","--sde-2027-ivory:","--sde-2027-gold:","--sde-2027-violet:","--sde-2027-green:"])assert.ok(css.includes(token),token);
 assert.match(css,/data-sde-page="prieres"/);
 assert.match(css,/data-sde-page="missions-humanitaires"/);
});
test("le menu public met en évidence la rubrique active sans changer ses routes",()=>{
 assert.match(js,/sde-shell-group-active/);
 assert.match(js,/document\.body\.dataset\.sdePage/);
 assert.match(js,/aria-current/);
 assert.match(css,/\.sde-shell-mega-group\.sde-shell-group-active>summary/);
});
test("navigation et animation respectent accessibilité et mobile",()=>{
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:55px/);
});
test("les styles privés ne sont pas ciblés par cette livraison",()=>{
 const section=css.slice(css.lastIndexOf("/* SDE 2027 — harmonisation finale"));
 assert.ok(section.startsWith("/* SDE 2027"));
 assert.doesNotMatch(section,/body\.sde-admin/);
 assert.doesNotMatch(section,/body\.sde-member/);
});

test("barre privée : cinq accès fixes sans exposition des finances administrateur",()=>{
 const shell=readFileSync("frontend/reference-shell.jsx","utf8");
 const design=readFileSync("frontend/reference.css","utf8");
 assert.match(shell,/\['espace','Membres','members'\]/);
 assert.match(shell,/\['contributions','Finances','money'\]/);
 assert.match(shell,/account\.niveau>=2\?\['finance-direction','Finances','money'\]:\['scanner','Pointages','qr'\]/);
 assert.match(shell,/\['rendezvous','Agenda','mission'\]/);
 assert.match(shell,/\['tactique','SDE officiel/);
 assert.doesNotMatch(shell,/\['fusion','Fusion/);
 assert.match(shell,/<span>Plus<\/span>/);
 assert.match(design,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(design,/prefers-reduced-motion:reduce/);
});
