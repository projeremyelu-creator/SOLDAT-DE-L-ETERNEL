import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const mediaHtml=read("public/vitrine/mediatheque-publique.html");
const mediaJS=read("public/vitrine/sde-public-media.js");
const mediaCSS=read("public/vitrine/sde-public-media.css");
const galleryJS=read("public/vitrine/sde-media-archives.js");
const homepage=read("public/vitrine/portail.html");
const worker=read("src/worker.js");
const sitemap=read("public/sitemap.xml");
const recipe=read("scripts/recette-production.mjs");

test("2. Cache : HTML public revalidé, cache CDN désactivé, purge conditionnée par les autorisations",()=>{
 assert.match(worker,/Cloudflare-CDN-Cache-Control", "no-store"/);
 assert.match(worker,/CDN-Cache-Control", "no-store"/);
 assert.match(worker,/no-cache, must-revalidate/);
 const purge=read("scripts/purge-cloudflare.mjs");
 assert.match(purge,/CLOUDFLARE_CACHE_PURGE_TOKEN/);
 assert.match(purge,/CLOUDFLARE_ZONE_ID/);
 assert.match(purge,/Cache Cloudflare invalidé/);
 assert.match(read("docs/audit-cache-cloudflare-sde-20261110.md"),/permission.*purge|purge.*permission/i);
});
test("3. Médiathèque : zone réservée et pied de page stable pendant le chargement asynchrone",()=>{
 const doc=new JSDOM(mediaHtml).window.document;
 const content=doc.querySelector("#sde-published-content");
 assert.ok(content);
 assert.ok(content.classList.contains("sde-public-media-loading"));
 assert.equal(content.getAttribute("aria-busy"),"true");
 assert.ok(content.querySelector(".sde-public-media-loading-text"));
 assert.ok(doc.querySelector("footer.sde-shell-footer .sde-shell-footer-grid"));
 assert.ok(mediaCSS.includes("min-height:1100px"));
 assert.ok(mediaCSS.includes("aspect-ratio:4/3"));
 assert.ok(mediaJS.includes("sdePublicMediaRunning"));
 assert.ok(mediaJS.includes('target.setAttribute("aria-busy","false")'));
 assert.ok(mediaJS.includes('finally{'));
});
test("4. Harmonisation : suppression des imports CSS bloquants et scripts médias en double",()=>{
 for(const path of ["public/vitrine/boutique.html","public/vitrine/missions-humanitaires.html"]){
  const html=read(path);
  const css=[...html.matchAll(/sde-public-media\.css/g)];
  const js=[...html.matchAll(/sde-public-media\.js/g)];
  assert.equal(css.length,1,path+" CSS dupliqué");
  assert.equal(js.length,1,path+" JS dupliqué");
  assert.ok(!html.includes('@import url("/vitrine/sde-premium-public.css'),path+" import inline");
  assert.match(html,/sde-public-media\.js\?v=[A-Za-z0-9_-]+/,path+" URL de script versionnée");
 }
 const premium=read("public/vitrine/sde-six-maquettes-2027.css");
 assert.ok(premium.includes("Audit 2026-11-10"));
 assert.ok(premium.includes("sde-v5-home .ap-hero h1"));
 assert.ok(premium.includes("min-height:44px!important"));
});
test("5. Performances : vignettes optimisées, originaux préservés, aucun préchargement des vidéos",()=>{
 const optimizer=read("scripts/optimiser-archives-sde.mjs");
 for(const media of ["action-humanitaire","polos-sde-vert-blanc","polos-sde-or-blanc","tenues-sde-portees"]){
  assert.ok(optimizer.includes(media+"-optimise.webp"),media);
 }
 assert.ok(galleryJS.includes("-optimise.webp"));
 assert.ok(galleryJS.includes("item.preview||item.src"));
 assert.ok(galleryJS.includes('m.preload="none"'));
 assert.ok(read("package.json").includes("node scripts/optimiser-archives-sde.mjs"));
});
test("6. Référencement : métadonnées officielles, canonique et sitemap complet",()=>{
 const doc=new JSDOM(homepage).window.document;
 assert.match(doc.title,/Réveil Spirituel des Nations/);
 assert.match(doc.querySelector('meta[property="og:title"]')?.content||"",/Réveil Spirituel des Nations/);
 assert.match(doc.querySelector('meta[property="og:image"]')?.content||"",/hero-sde-1280.webp/);
 assert.equal(doc.querySelector('link[rel="canonical"]')?.href,"https://mouvement-sde.org/");
 for(const route of ["/mediatheque","/soldiers-tv","/soldier-quest"]){
  assert.ok(sitemap.includes("<loc>https://mouvement-sde.org"+route+"</loc>"),route);
 }
 assert.ok(sitemap.includes("<lastmod>2026-11-10</lastmod>"));
 const seo=read("scripts/harmoniser-seo.mjs");
 for(const route of ["mediatheque-publique.html","soldiers-tv.html","soldier-quest.html"]){
  assert.ok(seo.includes(route),route);
 }
});
test("7. Recette : nouvelle vérification WebP et pages complémentaires sur les deux domaines",()=>{
 for(const route of ["/mediatheque","/soldiers-tv","/soldier-quest"]){
  assert.ok(recipe.includes("path:'"+route+"'"),route);
 }
 const wf=read(".github/workflows/deployer.yml");
 assert.match(wf,/node scripts\/verifier-archives-sde-publiees\.mjs/);
 assert.match(wf,/node scripts\/attendre-publication-sde\.mjs/);
 assert.match(read("scripts/audit-public-mobile.mjs"),/c\.name==='mediatheque-390'/);
 assert.match(read("scripts/verifier-archives-sde-publiees.mjs"),/originaux/);
});

test("CLS final : verset réservé sur la page Mouvement et en-têtes stables sur tablette",()=>{
 const page=read("public/vitrine/mouvement.html");
 const doc=new JSDOM(page).window.document;
 assert.ok(doc.querySelector("header.site-header + .sde-versets-slot"),"réserve immédiatement après l'en-tête");
 const styles=read("public/vitrine/sde-six-maquettes-2027.css");
 assert.ok(styles.includes('data-sde-page="mouvement"] .sde-versets-slot'));
 assert.ok(styles.includes("max-width:860px"));
 assert.ok(styles.includes("height:63px!important"));
 assert.ok(styles.includes("height:72px!important"));
 const audit=read("scripts/audit-public-mobile.mjs");
 assert.ok(audit.includes("c.name==='accueil-tablette'"));
 assert.ok(audit.includes("c.name==='mouvement-desktop'"));
});
