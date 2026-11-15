import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const album=readFileSync("public/vitrine/album-infire.html","utf8");
const script=readFileSync("public/vitrine/infire-2026-publications.js","utf8");
const style=readFileSync("public/vitrine/infire-2026-publications.css","utf8");
const studio=readFileSync("public/vitrine/sde-mediatheque-admin.html","utf8");

test("l'album conserve les trois éditions et charge les publications publiques de 2026",()=>{
 for(const year of ["2024","2025","2026"])assert.ok(album.includes('data-year="'+year+'"'));
 assert.ok(album.includes('/vitrine/infire-2026-publications.css'));
 assert.ok(album.includes('/vitrine/infire-2026-publications.js'));
 assert.ok(album.includes('id="gallery"'));
});
test("l'intégration ne publie que la catégorie IN FIRE, avec année explicitement étiquetée",()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.ok(script.includes('m.categorie!=="IN FIRE"'));
 assert.ok(script.includes('m.genre'));
 assert.ok(script.includes('credentials:"omit"'));
 assert.ok(script.includes('"/api/medias"'));
 assert.ok(script.includes('2026'));
 assert.ok(script.includes('player.controls=true'));
 assert.ok(script.includes('player.playsInline=true'));
 assert.ok(script.includes('player.preload="metadata"'));
 assert.ok(script.includes('img.loading="lazy"'));
 assert.ok(script.includes('modal.classList.add("open")'));
 assert.ok(!script.includes("motDePasse"));
 assert.ok(!script.includes("/api/mon-espace"));
});
test("les mises en ligne restent conditionnées à l'administration et aux droits à l'image",()=>{
 assert.ok(studio.includes('<option value="IN FIRE">'));
 assert.ok(studio.includes('id="rights-confirm"'));
 assert.ok(studio.includes('value="public"'));
 assert.ok(style.includes('@media(max-width:560px)'));
});