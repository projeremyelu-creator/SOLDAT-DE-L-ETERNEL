import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const worker=read("src/worker.js");
const admin=read("public/vitrine/sde-mediatheque-admin.html");
const uploader=read("public/vitrine/sde-mediatheque-admin.js");
const publicJS=read("public/vitrine/sde-public-media.js");
const publicHTML=read("public/vitrine/mediatheque-publique.html");
test("studio privé accessible seulement après authentification administrateur",()=>{
 assert.match(worker,/p === "\/administration\/medias"/);
 assert.match(worker,/if \(u\.niveau < 2\) return erreur\("refuse","Publication réservée aux administrateurs\."/);
 assert.match(worker,/assetPortail\("\/vitrine\/sde-mediatheque-admin\.html"\)/);
 assert.match(worker,/frame-ancestors 'none'/);
});
test("publications publiques réservées aux administrateurs, à la création et à l'édition",()=>{
 assert.equal((worker.match(/u\.niveau < 2 && p\.visibilite === "public"/g)||[]).length,2);
 assert.match(worker,/m\.visibilite === "public" \|\| \(m\.visibilite === "membres"/);
});
test("envoi local avec choix multi-fichiers, droits et progression",()=>{
 assert.match(admin,/type="file" multiple/);
 assert.match(admin,/id="media-category"/);
 assert.match(admin,/id="media-visibility"/);
 assert.match(admin,/id="rights-confirm"/);
 assert.match(uploader,/file\.slice\(chunk\*chunkSize/);
 assert.match(uploader,/method:"PUT"/);
 assert.match(uploader,/\/api\/medias\/".*\/fin"/);
 assert.match(uploader,/progress\.value/);
 assert.match(uploader,/confirm\(/);
});
test("affichage uniquement des fichiers publics sans injection HTML",()=>{
 assert.match(publicJS,/m\.visibilite==="public"/);
 assert.match(publicJS,/textContent=text/);
 assert.match(publicJS,/credentials:"omit"/);
 assert.match(publicHTML,/id="sde-published-content"/);
});
test("les huit rubriques publiques chargent les publications sans modifier les accès Academy",()=>{
 const pages=["soldiers-tv","ressources","album-infire","missions-humanitaires","boutique","prieres","soldiers-voice","temoignages"];
 for(const name of pages){
  const html=read("public/vitrine/"+name+".html");
  assert.match(html,/sde-public-media\.js/,name);
  assert.match(html,/sde-public-media\.css/,name);
 }
 assert.match(worker,/mediaAcademyAutorise/);
 assert.match(worker,/mediaLoveAutorise/);
});
