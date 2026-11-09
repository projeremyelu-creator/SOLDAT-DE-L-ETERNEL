import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,statSync,readFileSync} from "node:fs";
const photoBase="public/vitrine/media/archives-2027/";
const videoBase="public/vitrine/media/videos-2027/";
const photos=["reunion-priere-01.jpg","reunion-priere-02.jpg","reunion-fraternelle.jpg",
 "action-humanitaire.jpg","tenues-sde-portees.jpg","polos-sde-vert-blanc.png",
 "polos-sde-or-blanc.jpg"];
const videos=["livre-pouvoir-femme.mp4","archives-rassemblement.mp4",
 "identite-sde-expansion.mp4"];
test("Les sept photos et les trois vidéos téléversées figurent réellement dans le dépôt public",()=>{
 for(const name of photos){
  const path=photoBase+name;
  assert.ok(existsSync(path),path);
  assert.ok(statSync(path).size>1000,path);
 }
 for(const name of videos){
  const path=videoBase+name;
  assert.ok(existsSync(path),path);
  assert.ok(statSync(path).size>10000,path);
 }
});
test("Les galeries utilisent les extensions des binaires originaux et pas de faux WebP",()=>{
 const code=readFileSync("public/vitrine/sde-media-archives.js","utf8");
 assert.match(code,/id==="polos-sde-vert-blanc"\?"\.png":"\.jpg"/);
 assert.match(code,/root\+"videos-2027\/"\+id\+"\.mp4"/);
 assert.match(code,/reunion-priere-01/);
 assert.match(code,/action-humanitaire/);
 assert.match(code,/tenues-sde-portees/);
});
test("Le pipeline confirme les médias sans ZIP et contrôle leur accessibilité finale",()=>{
 const py=readFileSync("scripts/installer-medias-sde.py","utf8");
 assert.match(py,/MEDIAS_SDE_INSTALLES_DIRECTS/);
 const verifier=readFileSync("scripts/verifier-medias-sde-publies.mjs","utf8");
 assert.match(verifier,/\.png":"\.jpg"/);
 assert.match(verifier,/MEDIAS_SDE_PUBLICATION_VERIFIEE/);
});
