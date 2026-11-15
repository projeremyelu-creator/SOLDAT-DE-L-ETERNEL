import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(path,"utf8");

test("l'import ZIP SDE reste réservé aux administrateurs connectés",()=>{
 const html=read("public/vitrine/import-infire-2026.html");
 const js=read("public/vitrine/sde-import-infire-2026.js");
 assert.ok(html.includes('id="connecte" hidden'));
 assert.ok(html.includes('id="droits" type="checkbox"'));
 assert.ok(html.includes('id="publier" disabled'));
 assert.ok(html.includes('href="/vitrine/logo-sde.webp"'));
 assert.ok(js.includes('"/api/moi"'));
 assert.ok(js.includes('Number(me.niveau)<2'));
 assert.ok(js.includes('!$("droits").checked'));
 assert.ok(js.includes('visibilite:"public"'));
 assert.doesNotMatch(js,/(?:1991|0757126504|projeremyelu@gmail\.com)/);
 assert.doesNotMatch(html,/(?:1991|0757126504|projeremyelu@gmail\.com)/);
});
test("la grammaire JavaScript de l'import ZIP est valide et l'archive ne s'ouvre qu'en local",()=>{
 const js=read("public/vitrine/sde-import-infire-2026.js");
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.ok(js.includes('const manifestName="catalogue-a-importer.json"'));
 assert.ok(js.includes('new DecompressionStream("deflate-raw")'));
 assert.ok(js.includes('file.arrayBuffer()'));
 assert.ok(js.includes('new File([bytes],entry.nom'));
 assert.ok(js.includes('path:"public"+url'));
 assert.ok(js.includes('state.files.length'));
});
test("les 4 photos, 3 vidéos et la photo Tenues sont classées sans déplacer 2024 et 2025",()=>{
 const js=read("public/vitrine/sde-import-infire-2026.js");
 assert.ok(js.includes('manifest.photos.length!==4||manifest.videos.length!==3'));
 assert.ok(js.includes('new Set(items.map(x=>x.path)).size!==8'));
 assert.ok(js.includes('"IN FIRE"'));
 assert.ok(js.includes('"Tenues SDE"'));
 assert.ok(js.includes('existing.some(x=>x.nom===item.nom'));
 assert.doesNotMatch(js,/\/vitrine\/albums\/infire\/202[45]\//,"L'import ne doit pas modifier les albums précédents");
});
test("publication R2/KV via les API éprouvées, sans exposer de secrets",()=>{
 const js=read("public/vitrine/sde-import-infire-2026.js");
 assert.ok(js.includes('post("/api/medias"'));
 assert.ok(js.includes('request("/api/medias/"+id+"/"+n,{method:"PUT",body})'));
 assert.ok(js.includes('request("/api/medias/"+id+"/fin",{method:"POST"})'));
 assert.ok(js.includes('request("/api/medias/"+id,{method:"DELETE"})'));
 const studio=read("public/vitrine/sde-mediatheque-admin.html");
 assert.ok(studio.includes('href="/vitrine/import-infire-2026.html"'));
 assert.ok(studio.includes('id="studio" hidden'));
});


test("affichage du nombre de médias réellement publics avant et après publication",()=>{
 const html=read("public/vitrine/import-infire-2026.html");
 const js=read("public/vitrine/sde-import-infire-2026.js");
 assert.ok(html.includes('id="etat-publication"'));
 assert.ok(js.includes('function publicationStatus(items)'));
 assert.ok(js.includes('x?.visibilite==="public"'));
 assert.ok(js.includes('x.categorie==="IN FIRE"'));
 assert.ok(js.includes('x.categorie==="Tenues SDE"'));
 assert.ok(js.includes('publicationStatus(data.medias)'));
 assert.ok(js.includes('verified?.done===8'));
 assert.ok(js.includes('Réessayez uniquement les fichiers manquants'));
 assert.doesNotMatch(js,/\b(?:1991|0757126504)\b/);
});
