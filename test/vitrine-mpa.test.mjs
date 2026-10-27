import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {test} from "node:test";
import assert from "node:assert/strict";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const read=p=>readFileSync(p,"utf8");
const home=read("public/vitrine/index.html");
const scripts=["portail-unifie.js","subpage.js","discovery.js"].map(s=>[s,read("public/vitrine/"+s)]);
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
    assert.ok(document.querySelector(".site-menu"));
    assert.equal(document.querySelectorAll(".site-menu").length,1);
    const url=document.querySelector('link[rel="canonical"]')?.href;
    assert.equal(url,"https://mouvement-sde.org/"+({mouvement:"mouvement",programmes:"programmes",ressources:"enseignements",rejoindre:"contact",projets:"missions",plus:"rubriques"})[page]);
    canonical.add(url);
    d.window.close();
  }
  assert.equal(canonical.size,6);
});
test("MPA: navigation commune et accès directs aux espaces privés",()=>{
 const d=dom("rejoindre"),doc=d.window.document;
 for(const route of ["/","/mouvement","/programmes","/academy","/enseignements","/missions","/priere","/mon-espace","/administration"])
   assert.ok(doc.querySelector('.site-menu a[href="'+route+'"]'),route);
 const btn=doc.querySelector('.site-burger');assert.equal(btn.getAttribute('aria-controls'),'site-menu');
 btn.click();assert.equal(btn.getAttribute('aria-expanded'),'true');
 doc.querySelector('.site-menu a').click();assert.equal(btn.getAttribute('aria-expanded'),'false');d.window.close();
});
test("MPA: les sections éditoriales existantes sont reprises sans altérer leurs textes",()=>{
  const source=new JSDOM(home).window.document;
  for(const [name,ids] of Object.entries(pages)){
    const target=new JSDOM(read("public/vitrine/"+name+".html")).window.document;
    for(const id of ids){
      const a=source.getElementById(id),b=target.getElementById(id);
      assert.ok(a&&b,name+"/"+id);
      if(id==='membres'){
        // Les coordonnées sont désormais regroupées dans le pied de page Contact.
        assert.ok(normalize(a.textContent).startsWith(normalize(b.textContent)));
        assert.ok(target.querySelector('a[href="mailto:infosoldat@gmail.com"]'));
      }else assert.equal(normalize(b.textContent),normalize(a.textContent),name+"/"+id);
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
test("Enseignements : les ressources publiées sont téléchargeables directement",async()=>{
  const d=new JSDOM(read("public/vitrine/ressources.html"),{url:"https://mouvement-sde.org/enseignements",runScripts:"outside-only",pretendToBeVisual:true});
  d.window.fetch=async()=>({ok:true,json:async()=>({ressources:[{id:"livre",titre:"Livre SDE",type:"livre",auteur:"Jérémy l’Élu",description:"Enseignement",telechargement:"/api/ressources-publiques/livre/telecharger",lien:""}]})});
  d.window.eval(read("public/vitrine/ressources-public.js"));d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));await new Promise(done=>setTimeout(done,5));
  const card=d.window.document.querySelector("#ressources-grille .ressource-carte");assert.equal(card.querySelector("h3").textContent,"Livre SDE");
  assert.equal(card.querySelector(".res-download").getAttribute("href"),"/api/ressources-publiques/livre/telecharger");assert.match(d.window.document.getElementById("res-compteur").textContent,/1 ressource/);d.window.close();
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
    assert.ok(html.includes("/vitrine/portail-subpage.css"),name);
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
  for(const page of Object.keys(pages))assert.ok(map.includes("/"+({mouvement:"mouvement",programmes:"programmes",ressources:"enseignements",rejoindre:"contact",projets:"missions",plus:"rubriques"})[page]+"</loc>"),page);
  assert.ok(!map.includes("/vitrine/engagements"));
  assert.ok(!map.includes("app.mouvement-sde.org"));
  assert.ok(!map.includes("/vitrine/formulaire"));
});
test("MPA: les pages historiques continuent à charger la nouvelle navigation",()=>{
  for(const p of ["index","academy","formulaire","engagements"]){
    const h=read("public/vitrine/"+p+".html");
    assert.ok(h.includes(p==="index"?"mpa-nav.js":"portail-unifie.js"),p);
    assert.ok(h.includes(p==="index"?"mpa.css":"portail-unifie.css"),p);
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
test("MPA: le menu commun répond à Échap et rend le focus au bouton",()=>{
 const d=dom("mouvement"),w=d.window,doc=w.document,btn=doc.querySelector('.site-burger');
 btn.click();assert.equal(doc.getElementById('site-menu').dataset.open,'true');
 doc.querySelector('.site-menu a').focus();
 doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(doc.getElementById('site-menu').dataset.open,'false');assert.equal(doc.activeElement,btn);d.window.close();
});
