import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const css=readFileSync("public/vitrine/sde-maquettes-integrales.css","utf8");
const js=readFileSync("public/vitrine/sde-maquettes-integrales.js","utf8");
const assets=[
  "public/vitrine/illus/guerrier-reference-sde.webp",
  "public/vitrine/illus/priere-reference-sde.webp",
  "public/vitrine/illus/blason-maquette-sde.webp"
];

test("trois illustrations de la maquette sont de vrais WebP autonomes",()=>{
  for(const path of assets){
    assert.ok(existsSync(path),path);
    const buf=readFileSync(path);
    assert.equal(buf.toString("ascii",0,4),"RIFF",path);
    assert.equal(buf.toString("ascii",8,12),"WEBP",path);
    assert.ok(buf.byteLength>1000&&buf.byteLength<50_000,path);
  }
});
test("les photographies des albums restent intactes tandis que les habillages utilisent les illustrations de référence",()=>{
  for(const name of ["guerrier-reference-sde.webp","priere-reference-sde.webp","blason-maquette-sde.webp"]){
    assert.ok(css.includes(name)||js.includes(name),name);
  }
  const last=css.lastIndexOf("Fidélité illustration maquette du 14 novembre");
  assert.ok(last>css.indexOf("PUBLIC PC"),"Les images de référence doivent l'emporter sur l'ancien fond de groupe");
  assert.match(css.slice(last),/background-size:cover,auto 340px,cover,cover/);
  assert.ok(js.includes("mountReferenceBranding()"));
  assert.ok(!js.includes("innerHTML"),"L'identité visuelle ne doit pas injecter du HTML non contrôlé");
});
