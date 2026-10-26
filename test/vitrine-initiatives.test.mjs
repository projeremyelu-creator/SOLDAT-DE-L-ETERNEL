import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const { JSDOM } = createRequire(import.meta.url)("jsdom");
const read = (name) => readFileSync("public/vitrine/" + name, "utf8");
const pages = ["prieres", "temoignages", "soldiers-voice", "missions-humanitaires"];
const scripts = ["portal.js", "mpa-nav.js", "initiatives.js"].map(read);

const init = (page) => {
  const dom = new JSDOM(read(page + ".html"), {
    url: "https://mouvement-sde.org/vitrine/" + page,
    runScripts: "outside-only", pretendToBeVisual: true
  });
  const window = dom.window;
  scripts.forEach(code => window.eval(code));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return dom;
};

test("quatre pages autonomes avec URLs uniques, SEO et formulaire", () => {
  for(const page of pages) {
    const html = read(page + ".html");
    const dom = init(page), d = dom.window.document;
    assert.equal(d.body.dataset.sdePage, page);
    assert.ok(d.querySelector("h1"));
    assert.ok(d.querySelector('link[rel="manifest"]'));
    assert.equal(d.querySelector('link[rel="canonical"]')?.href, "https://mouvement-sde.org/vitrine/" + page);
    assert.equal(d.querySelectorAll("form[data-sde-contact]").length, 1);
    assert.ok(html.includes("/vitrine/initiatives.css"));
    assert.ok(html.includes("/vitrine/pwa-public.js"));
    assert.ok(d.querySelector("#contenu"));
    dom.window.close();
  }
});
test("bottom bar mobile et mega menu PC présents sur les quatre nouvelles pages", () => {
  for(const page of pages) {
    const dom=init(page),d=dom.window.document;
    const tabs=[...d.querySelectorAll(".sde-global-nav a")].map(a=>a.textContent.trim());
    assert.deepEqual(tabs, ["Accueil","Membres","Agenda","Prière","Plus"]);
    assert.equal(d.querySelectorAll(".sde-mega-nav details").length,4);
    for(const p of pages) assert.ok(d.querySelector('.sde-mega-nav a[href="/vitrine/'+p+'"]'),p);
    dom.window.close();
  }
});
test("formulaires : confirmation du serveur indispensable ; aucune publication de témoignage", async () => {
  for(const page of pages) {
    const dom=init(page),w=dom.window,d=w.document;
    let calls=[];
    w.fetch=async(url,options)=>{
      calls.push({url,options});
      return {ok:true,json:async()=>({ok:true})};
    };
    const form=d.querySelector("form[data-sde-contact]");
    form.elements.nom.value="Personne exemple";
    form.elements.contact.value="contact@example.org";
    form.elements.accord.checked=true;
    form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
    await new Promise(done=>setTimeout(done,10));
    assert.equal(calls.length,1,page);
    assert.equal(calls[0].url,"/api/engager");
    const payload=JSON.parse(calls[0].options.body);
    assert.equal(payload.nom,"Personne exemple");
    assert.equal(payload.email,"contact@example.org");
    assert.equal(payload.source,"mouvement-sde.org/vitrine/"+page);
    assert.ok(!Object.hasOwn(payload,"publier"),"aucune publication automatique");
    assert.equal(form.querySelector(".sde-form-feedback").dataset.state,"ok");
    dom.window.close();
  }
});
test("formulaires : refuser contact invalide et consentement absent",async()=>{
  const dom=init("prieres"),w=dom.window,d=w.document;
  let sent=0;
  w.fetch=async()=>{sent++;return {ok:true,json:async()=>({ok:true})};};
  const form=d.querySelector("form");
  form.elements.nom.value="Exemple";
  form.elements.contact.value="incorrect";
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(done=>setTimeout(done,5));
  assert.equal(sent,0);
  assert.equal(form.querySelector(".sde-form-feedback").dataset.state,"error");
  dom.window.close();
});
test("liens dans Plus, accueil, mega menu et sitemap",()=>{
  const plus=read("plus.html"),home=read("index.html"),nav=read("mpa-nav.js");
  const map=readFileSync("public/sitemap.xml","utf8");
  for(const page of pages){
    assert.ok(plus.includes("/vitrine/"+page));
    assert.ok(home.includes("/vitrine/"+page));
    assert.ok(nav.includes("/vitrine/"+page));
    assert.ok(map.includes("/vitrine/"+page+"</loc>"));
  }
});
test("manifeste public PWA séparé de l'application privée",()=>{
  const config=JSON.parse(read("manifest.webmanifest"));
  assert.equal(config.scope,"/");
  assert.equal(config.start_url,"/");
  assert.equal(config.display,"standalone");
  assert.ok(config.icons.length>=2);
  assert.ok(!read("pwa-public.js").includes('serviceWorker.register("/sw.js"'));
});
