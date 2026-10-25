import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {test} from "node:test";
import assert from "node:assert/strict";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const read=p=>readFileSync(p,"utf8");
const home=read("public/vitrine/index.html");
const scripts=["portal.js","mpa-nav.js","subpage.js","discovery.js"].map(s=>[s,read("public/vitrine/"+s)]);
const pages={
  mouvement:["mouvement","axes","histoire","presence","responsables","poles"],
  programmes:["agenda","programmes","infire"],
  ressources:["ressources","galerie"],
  rejoindre:["rejoindre","membres","faq","confidentialite"],
  projets:["engagement","projets","soutenir"],
  plus:[]
};
const normalize=t=>t.replace(/\s+/g," ").trim();
function dom(page) {
  const doc=read("public/vitrine/"+page+".html");
  const d=new JSDOM(doc,{url:"https://mouvement-sde.org/vitrine/"+page,runScripts:"outside-only",pretendToBeVisual:true});
  d.window.fetch=async()=>({ok:true,json:async()=>({evenements:[]})});
  for(const [name,code] of scripts) {
    if(name==="subpage.js"&&page==="plus")continue;
    d.window.eval(code);
  }
  d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
  return d;
}
test("MPA: 6 URLs HTML distinctes avec titre et URL canonique",()=>{
  const canonical=new Set();
  for(const page of Object.keys(pages)) {
    const d=dom(page),document=d.window.document;
    assert.equal(document.body.dataset.sdePage,page);
    assert.ok(document.querySelector("main#contenu h1"));
    assert.ok(document.querySelector(".sde-mega-nav"));
    assert.equal(document.querySelectorAll(".sde-global-nav").length,1);
    const url=document.querySelector('link[rel="canonical"]')?.href;
    assert.equal(url,"https://mouvement-sde.org/vitrine/"+page);
    canonical.add(url);
    d.window.close();
  }
  assert.equal(canonical.size,6);
});
test("MPA: menus — 5 onglets mobiles, méga-menu desktop avec liens vers 4 pages",()=>{
  const d=dom("rejoindre");
  const document=d.window.document;
  const bottom=[...document.querySelectorAll(".sde-global-nav a")];
  assert.deepEqual(bottom.map(x=>x.textContent.trim()),["Accueil","Membres","Agenda","Finances","Plus"]);
  assert.equal(bottom[1].href,"https://mouvement-sde.org/vitrine/rejoindre#membres");
  assert.equal(bottom[2].href,"https://mouvement-sde.org/vitrine/programmes#agenda");
  assert.equal(bottom[3].href,"https://app.mouvement-sde.org/#finances");
  assert.equal(bottom[4].href,"https://mouvement-sde.org/vitrine/plus");
  assert.equal(document.querySelectorAll(".sde-mega-nav details").length,4);
  const links=[...document.querySelectorAll(".sde-mega-nav .sde-mega-panel a")].map(x=>x.href);
  for(const page of ["mouvement","programmes","ressources","rejoindre","projets"])assert.ok(links.some(x=>x.includes("/vitrine/"+page)),page);
  const styles=read("public/vitrine/mpa.css");
  assert.match(styles,/@media \(min-width:1025px\)/);
  assert.match(styles,/\.sde-global-nav \{ display:none !important/);
  assert.match(styles,/@media \(max-width:1024px\)/);
  d.window.close();
});
test("MPA: les sections éditoriales existantes sont reprises sans altérer leurs textes",()=>{
  const source=new JSDOM(home).window.document;
  for(const [name,ids] of Object.entries(pages)){
    const target=new JSDOM(read("public/vitrine/"+name+".html")).window.document;
    for(const id of ids){
      const a=source.getElementById(id),b=target.getElementById(id);
      assert.ok(a&&b,name+"/"+id);
      assert.equal(normalize(b.textContent),normalize(a.textContent),name+"/"+id);
      assert.equal(b.querySelectorAll("img").length,a.querySelectorAll("img").length,name+"/"+id+" images");
      assert.equal(b.querySelectorAll("form").length,a.querySelectorAll("form").length,name+"/"+id+" forms");
    }
  }
});
test("MPA: les formulaires sont conservés et reliés à la même API",async()=>{
  const d=dom("rejoindre"),document=d.window.document;
  const form=document.querySelector("#form-rejoindre");
  assert.ok(form);
  const source=new JSDOM(home).window.document.querySelector("#form-rejoindre");
  assert.deepEqual([...form.elements].map(x=>x.getAttribute("name")),[...source.elements].map(x=>x.getAttribute("name")));
  assert.ok(read("public/vitrine/subpage.js").includes('fetch("/api/engager"'));
  d.window.close();
});
test("MPA: recherche et galerie restent utilisables sur la page ressources",()=>{
  const d=dom("ressources"),document=d.window.document;
  const input=document.querySelector("#sde-search-ressources");
  assert.ok(input);
  input.value="révélation";
  input.dispatchEvent(new d.window.Event("input",{bubbles:true}));
  assert.ok([...document.querySelectorAll("#ressources-grille .ressource-carte")].some(c=>!c.hidden));
  const first=document.querySelector(".galerie-ouvrir");
  assert.ok(first);
  first.click();
  assert.equal(document.querySelector(".sde-modal").getAttribute("aria-hidden"),"false");
  document.querySelector(".sde-modal-close").click();
  assert.equal(document.querySelector(".sde-modal").getAttribute("aria-hidden"),"true");
  d.window.close();
});
test("MPA: programmation — calendrier et confirmation existants présents",()=>{
  const d=dom("programmes"),document=d.window.document;
  assert.ok(document.querySelector("#f-venue"));
  assert.ok(document.querySelector("#agenda-liste"));
  assert.ok(document.querySelector('[data-ics="infire"]'));
  assert.ok(document.querySelector("#if-prog"));
  d.window.close();
});
test("MPA: base CSS mutualisée plutôt que dupliquée sur six HTML",()=>{
  const source=new JSDOM(home).window.document;
  const fromHome=source.querySelector("style")?.textContent;
  assert.equal(read("public/vitrine/mpa-base.css"),fromHome);
  for(const name of Object.keys(pages)){
    const html=read("public/vitrine/"+name+".html");
    assert.ok(html.includes("/vitrine/mpa-base.css"),name);
    assert.ok(!html.includes("<style>"),"CSS dupliqué sur "+name);
  }
});
test("MPA: galerie média conserve photo précédente et suivante",()=>{
  const d=dom("ressources"),document=d.window.document;
  document.querySelector(".galerie-ouvrir").click();
  const before=document.querySelector(".sde-modal img").src;
  document.querySelector(".sde-modal-next").click();
  const after=document.querySelector(".sde-modal img").src;
  assert.notEqual(before,after);
  document.querySelector(".sde-modal-prev").click();
  assert.equal(document.querySelector(".sde-modal img").src,before);
  document.querySelector(".sde-modal-close").click();
  d.window.close();
});
test("MPA: formulaire d'adhésion utilise /api/engager (simulation hors production)",async()=>{
  const d=dom("rejoindre"),document=d.window.document,w=d.window;
  let sent=null;
  w.fetch=async(path,options)=>{
    sent={path,data:JSON.parse(options.body)};
    return {ok:true,json:async()=>({ok:true})};
  };
  const form=document.querySelector("#form-rejoindre");
  form.querySelector('[name="nom"]').value="Test Usage";
  form.querySelector('[name="tel"]').value="+2250700000000";
  form.querySelector('[name="ville"]').value="Abidjan";
  form.querySelector('[name="accord"]').checked=true;
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(sent?.path,"/api/engager");
  assert.equal(sent?.data?.nom,"Test Usage");
  assert.equal(sent?.data?.ville,"Abidjan");
  assert.equal(document.querySelector("#envoi").hidden,false);
  d.window.close();
});
test("MPA: pages sensibles absentes du sitemap et pages publiques ajoutées",()=>{
  const map=read("public/sitemap.xml");
  for(const page of Object.keys(pages))assert.ok(map.includes("/vitrine/"+page+"</loc>"),page);
  assert.ok(!map.includes("/vitrine/engagements"));
  assert.ok(!map.includes("app.mouvement-sde.org"));
  assert.ok(!map.includes("/vitrine/formulaire"));
});
test("MPA: les pages historiques continuent à charger la nouvelle navigation",()=>{
  for(const p of ["index","academy","formulaire","engagements"]){
    const h=read("public/vitrine/"+p+".html");
    assert.ok(h.includes("mpa-nav.js"),p);
    assert.ok(h.includes("mpa.css"),p);
  }
});

test("MPA: la barre basse est réservée au mobile et le méga-menu au PC",()=>{
  const css=read("public/vitrine/mpa.css");
  assert.ok(css.includes("body.sde-portal .nav-mobile.sde-global-nav { display:none !important; }"),"barre mobile masquée sur grand écran");
  assert.ok(css.includes("body.sde-portal .sde-mega-nav { display:flex !important; }"),"méga-menu affiché sur PC");
  assert.ok(css.includes("body.sde-portal .sde-mega-nav { display:none !important; }"),"méga-menu masqué sur mobile");
  assert.ok(css.includes("body.sde-portal .sde-global-nav { display:block !important; }"),"barre présente sur mobile");
  assert.ok(css.includes('.sde-mega:not([open]) > .sde-mega-panel { display:none !important; }'),"panneau fermé masqué sur PC");
});
test("MPA: les méga-menus répondent au clic et à la touche Échap",()=>{
  const d=dom("mouvement"),w=d.window,document=w.document;
  const panels=[...document.querySelectorAll(".sde-mega-nav details")];
  assert.equal(panels.length,4);
  const first=panels[0],second=panels[1];
  first.open=true;
  first.dispatchEvent(new w.Event("toggle"));
  second.open=true;
  second.dispatchEvent(new w.Event("toggle"));
  assert.equal(first.open,false,"un seul méga-menu ouvert à la fois");
  const summary=second.querySelector("summary");
  summary.focus();
  second.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(second.open,false,"Échap referme le menu");
  d.window.close();
});
