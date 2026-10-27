import {checkPublicRegistration} from './helpers/pwa.mjs';
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const {JSDOM} = createRequire(import.meta.url)("jsdom");
const read = name => readFileSync(name,"utf8");
const path = name => "public/vitrine/"+name;
const pages = [
  "index","mouvement","programmes","ressources","rejoindre","projets","plus",
  "prieres","temoignages","soldiers-voice","missions-humanitaires","academy","formulaire"
];
const shell = read(path("sde-app-shell.js"));
const portal = read(path("portal.js"));
const mega = read(path("mpa-nav.js"));
const directory = read(path("sde-public-directory.js"));
function open(name) {
  const html = read(path(name+".html"));
  const url="https://mouvement-sde.org/"+(name==="index"?"":"vitrine/"+name);
  const dom=new JSDOM(html,{url,runScripts:"outside-only",pretendToBeVisual:true});
  for(const script of dom.window.document.querySelectorAll('script[src]')){
    const src=new URL(script.src).pathname;
    const name=src.split('/').at(-1);
    if(['portal.js','mpa-nav.js','sde-public-directory.js','sde-app-shell.js','portail-unifie.js'].includes(name))dom.window.eval(read(path(name)));
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return dom;
}
test("interface publique : 13 pages chargent la navigation commune sans passerelle privée",()=>{
  for(const name of pages) {
    const html=read(path(name+".html"));
    assert.ok(html.includes("/vitrine/"+(name==="index"?"sde-app-shell":"portail-unifie")+".css"),name+" CSS");
    assert.ok(html.includes("/vitrine/"+(name==="index"?"sde-app-shell":"portail-unifie")+".js"),name+" JS");
    if(name!=="index")assert.ok(html.includes('href="/mon-espace"'),name+" accès membre");
    assert.ok(!html.includes('src="/sde-bridge.js'),name+" ne charge pas la passerelle privée");
    assert.ok(!html.includes('href="/sde-unified.css'),name+" CSS local obligatoire");
    if(name!=="index")assert.ok(html.includes('href="/administration"'),name+" accès administrateur");
  }
});
test("interface publique : commandes, onglets mobiles, menu PC et annuaire de rubriques",()=>{
  const dom=open("index"),doc=dom.window.document;
  assert.equal(doc.querySelectorAll(".sde-global-nav a[data-sde-tab]").length,5);
  assert.equal(doc.querySelectorAll(".sde-mega-nav details").length,4);
  assert.ok(doc.querySelector(".sde-shell-search-btn"));
  assert.ok(doc.querySelector(".sde-shell-public-tag"));
  const toolbar=doc.querySelector(".sde-shell-toolbar");
  assert.equal(toolbar.querySelectorAll("a").length,6);
  assert.ok(toolbar.querySelector('a[href="/os-v31/"]'),"accès SDE OS privé depuis le site public");
  assert.ok(toolbar.querySelector('a[href="https://app.mouvement-sde.org/#connexion"]'));
  assert.ok(doc.querySelector("form#form-rejoindre"),"formulaire d'adhésion conservé");
  assert.ok(doc.querySelector("form#f-venue"),"formulaire IN FIRE conservé");
  dom.window.close();
});
test("recherche globale : filtrage accessible sans requête aux données privées",()=>{
  const dom=open("index"),d=dom.window.document,w=dom.window;
  const openBtn=d.querySelector(".sde-shell-search-btn");
  openBtn.click();
  const dialog=d.querySelector(".sde-shell-search-dialog");
  assert.ok(dialog.hasAttribute("open"));
  const input=dialog.querySelector("input");
  input.value="témoignage";
  input.dispatchEvent(new w.Event("input",{bubbles:true}));
  const links=[...dialog.querySelectorAll(".sde-shell-search-results a")].map(a=>a.getAttribute("href"));
  assert.deepEqual(links,["/vitrine/temoignages"]);
  assert.equal(dialog.querySelector('[role="status"]').textContent,"1 rubrique disponible");
  dialog.querySelector(".sde-search-close").click();
  assert.equal(dialog.hasAttribute("open"),false);
  const directoryDom=open("plus");assert.ok(directoryDom.window.document.querySelector(".sde-directory-search input"),"annuaire filtrable conservé");directoryDom.window.close();
  dom.window.close();
});
test("thème public : basculement sans toucher l'application privée",()=>{
  const dom=open("plus"),d=dom.window.document,w=dom.window;
  const theme=d.querySelector(".site-theme-toggle");
  assert.ok(theme);
  theme.click();
  assert.equal(d.documentElement.dataset.theme,"light");
  assert.equal(w.localStorage.getItem("sde-theme"),"light");
  dom.window.close();
});
test("PWA publique : page d'accueil installable et service worker d'origine isolée",async()=>{
  const publicManifest=JSON.parse(read(path("manifest.webmanifest")));
  assert.equal(publicManifest.scope,"/");
  assert.equal(publicManifest.start_url,"/");
  assert.equal(publicManifest.display,"standalone");
  const privateManifest=JSON.parse(read("public/manifest.webmanifest"));
  assert.ok(privateManifest.name.includes("MPA SDE"));
  const pwa=read(path("pwa-public.js"));
  const publicSW=read("public/sw-public.js");
  const worker=read("src/worker.js");
  await checkPublicRegistration();
  assert.ok(pwa.includes('"/vitrine/sw-public.js"'),"migration de l'ancien service worker public");
  assert.ok(worker.includes("sw-public\\.js$"),"route Cloudflare réservée au worker public");
  for(const marker of ["/api/","/_blob/","/m/","/engagements","/formulaire"])
    assert.ok(publicSW.includes(marker),"hors cache privé : "+marker);
  assert.ok(!publicSW.includes('"/api/public"'));
  assert.ok(publicSW.includes('PAGES.has(path)'));
});
test("accessibilité et performance : mouvement réduit et cache limité",()=>{
  const css=read(path("sde-app-shell.css"));
  assert.ok(css.includes("prefers-reduced-motion:reduce"));
  assert.ok(css.includes("@media (max-width:1024px)"));
  assert.ok(css.includes("@media (min-width:1025px)"));
  assert.ok(css.includes("sde-shell-search-dialog"));
  assert.ok(css.includes("sde-shell-toolbar"));
  const publicSW=read("public/sw-public.js");
  assert.ok(publicSW.includes('req.method !== "GET"'));
  assert.ok(publicSW.includes('url.origin !== self.location.origin'));
  assert.ok(publicSW.includes("PAGES"));
});
