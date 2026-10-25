import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const file=p=>readFileSync("public/"+p,"utf8");
const pages=["index","mouvement","programmes","ressources","rejoindre","projets","plus","prieres","temoignages","soldiers-voice","missions-humanitaires","academy","formulaire","engagements"];

test("design commun SDE servi sur vitrine ET application privée",()=>{
 const privateHtml=file("index.html");
 for(const ref of ["/app.css","/sde-unified.css","/sde-private-ui.css","/sde-bridge.js"]) assert.ok(privateHtml.includes(ref),ref);
 for(const name of pages) {
  const html=file("vitrine/"+name+".html");
  assert.ok(html.includes("/vitrine/sde-unified.css"),name);
  assert.ok(html.includes("/vitrine/modern-2026.css"),name);
  assert.ok(html.includes("/vitrine/sde-public-directory.js"),name);
 }
 assert.ok(file("sde-unified.css").includes("--sde-gold"));
 assert.ok(file("sde-private-ui.css").includes(".hdr-site"));
 assert.ok(file("vitrine/modern-2026.css").includes(".sde-global-nav"));
});
test("les domaines restent séparés par leurs privilèges, non par leur identité",()=>{
 const h=file("index.html");
 assert.ok(h.includes('href="https://mouvement-sde.org/"'));
 assert.ok(h.includes('name="robots" content="noindex"'));
 assert.ok(file("vitrine/index.html").includes("https://app.mouvement-sde.org"));
 const wrangler=readFileSync("wrangler.toml","utf8");
 assert.ok(wrangler.includes('pattern = "mouvement-sde.org"'));
 assert.ok(wrangler.includes('pattern = "app.mouvement-sde.org"'));
 const worker=readFileSync("src/worker.js","utf8");
 assert.ok(worker.includes('if (url.hostname === "mouvement-sde.org")'));
 assert.ok(worker.includes("sde-(unified"),"fichiers visuels communs autorisés sur le domaine public");
 assert.ok(worker.includes("bridge"),"passerelle JS publique explicitement autorisée");
 assert.ok(worker.includes('if (!u.connecte || u.niveau < 3)'));
});
test("passerelle de navigation privée vers les pages publiques",()=>{
 const d=new JSDOM('<header class="hdr"><div class="hdr-in"><a class="hdr-site" href="https://mouvement-sde.org/"><svg></svg></a></div></header><div id="banner"></div><div id="main"></div>',{url:"https://app.mouvement-sde.org/",runScripts:"outside-only"});
 d.window.eval(file("sde-bridge.js"));
 d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
 const nav=d.window.document.querySelector(".sde-private-links");
 assert.ok(nav);
 for(const slug of ["programmes","prieres","soldiers-voice","missions-humanitaires"]) assert.ok(nav.querySelector('a[href*="/vitrine/'+slug+'"]'));
 assert.equal(d.window.document.querySelector(".sde-public-label").textContent,"Site public");
 d.window.close();
});
test("recherche instantanée du répertoire public Plus et état vide",()=>{
 const html='<header class="entete"><div class="entete-droite"></div></header><body data-sde-page="plus"><div class="sde-simple-grid"><a href="/vitrine/prieres">Prières et intercession</a><a href="/vitrine/soldiers-voice">Soldiers Voice</a></div></body>';
 const d=new JSDOM(html,{url:"https://mouvement-sde.org/vitrine/plus",runScripts:"outside-only"});
 d.window.eval(file("sde-bridge.js"));d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
 const input=d.window.document.querySelector("#sde-rubriques-filter");
 assert.ok(input);
 input.value="soldiers";input.dispatchEvent(new d.window.Event("input",{bubbles:true}));
 assert.equal(d.window.document.querySelectorAll(".sde-simple-grid a:not([hidden])").length,1);
 input.value="aucun-resultat";input.dispatchEvent(new d.window.Event("input",{bubbles:true}));
 assert.equal(d.window.document.querySelector(".sde-search-empty").hidden,false);
 d.window.close();
});
test("PWA publique installable et strictement limitée aux ressources accessibles",()=>{
 const m=JSON.parse(file("vitrine/manifest.webmanifest"));
 assert.equal(m.scope,"/");assert.equal(m.start_url,"/");assert.equal(m.display,"standalone");
 for(const name of pages.filter(p=>!["formulaire","engagements"].includes(p))){
  const h=file("vitrine/"+name+".html");
  assert.ok(h.includes('rel="manifest"'),name);
  assert.ok(h.includes("/vitrine/pwa-public.js"),name);
 }
 const js=file("vitrine/pwa-public.js");
 assert.ok(js.includes('scope:"/"'));
 assert.ok(js.includes('location.hostname === "mouvement-sde.org"'));
 const sw=file("sw-public.js");
 assert.ok(sw.includes('req.method !== "GET"'));
 assert.ok(sw.includes('PAGES.has(path)'));
 assert.ok(sw.includes('pathname.includes("/engagements")'));
 assert.ok(sw.includes('pathname.includes("/formulaire")'));
 assert.ok(sw.includes('"/vitrine/offline-public.html"'));
});
test("reduced motion et navigation PC/mobile des deux espaces",()=>{
 const shared=file("sde-unified.css"),publicCss=file("vitrine/mpa.css");
 assert.ok(shared.includes("prefers-reduced-motion"));
 assert.ok(publicCss.includes("@media (min-width:1025px)"));
 assert.ok(publicCss.includes("@media (max-width:1024px)"));
 assert.ok(file("vitrine/modern-2026.css").includes("prefers-reduced-motion"));
 assert.ok(file("sde-private-ui.css").includes("max-width:720px"));
});
