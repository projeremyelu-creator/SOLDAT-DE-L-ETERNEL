import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";

const get=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const publicCss=get("public/vitrine/sde-sitewide-2026.css");
const memberAdminCss=get("public/vitrine/tableaux-de-bord.css");
const privateCss=get("public/vitrine/ivoire-app.css");
const spec=get("docs/refonte-sde-hybride-integrale-2026.md");
const publicHome=get("public/vitrine/portail.html");
const privateHome=get("public/index.html");
const memberDash=get("public/vitrine/tableau-membre.html");
const adminDash=get("public/vitrine/tableau-administration.html");
const worker=get("src/worker.js");

test("Soldier House: univers public impérial chargé depuis l'accueil",()=>{
  assert.match(publicHome,/sde-sitewide-2026\.css/);
  assert.match(publicCss,/Soldier House Premium · Lot A/);
  assert.match(publicCss,/#101a2f/i);
  assert.match(publicCss,/#dfbe77/i);
  assert.match(publicCss,/\.site-header/);
  assert.match(publicCss,/\.sde-intro/);
});
test("Soldier House: espace membre lumière et poste admin Command séparés",()=>{
  assert.match(memberDash,/data-dashboard="membre"/);
  assert.match(adminDash,/data-dashboard="administration"/);
  assert.match(memberAdminCss,/\[data-dashboard="membre"\]/);
  assert.match(memberAdminCss,/\[data-dashboard="administration"\]/);
  assert.match(memberAdminCss,/#f7f3eb/i);
  assert.match(memberAdminCss,/#101e19/i);
});
test("Soldier House: application native conserve sa feuille de personnalisation",()=>{
  assert.match(privateHome,/\/vitrine\/ivoire-app\.css/);
  assert.match(privateCss,/:root\[data-sde-palette="ivoire"\]/);
  assert.match(worker,/p\.startsWith\("\/administration"\) && u\.niveau < 1/);
  assert.match(worker,/const fichier = p\.endsWith\("\/os-v31"\)\?"\/os-v31\/index\.html":"\/index\.html"/);
});
test("Soldier House: la charte décrit 32 vues et tous les contrôles",()=>{
  const rows=spec.match(/^\|\s*\d{2}\s*\|/gm)||[];
  assert.equal(rows.length,32);
  for(const term of ["Impérial","Lumière","Command","QR","Finances","Gouvernance","IN FIRE","accessibilité","32 vues"]){
    assert.ok(spec.includes(term),term);
  }
});
test("Soldier House: responsive, focus clavier et mouvement réduit",()=>{
  assert.match(publicCss,/@media\(max-width:600px\)/);
  assert.match(memberAdminCss,/@media\(max-width:880px\)/);
  assert.match(privateCss,/@media\(max-width:600px\)/);
  for(const css of [publicCss,memberAdminCss,privateCss]){
    assert.match(css,/:focus-visible/);
    assert.match(css,/prefers-reduced-motion/);
  }
});
