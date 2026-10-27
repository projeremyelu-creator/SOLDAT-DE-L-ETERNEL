import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {test} from "node:test";
import assert from "node:assert/strict";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const script=readFileSync("public/vitrine/sde-dynamique.js","utf8");
const accueil=readFileSync("public/vitrine/index.html","utf8");
const pages=["index","mouvement","programmes","ressources","rejoindre","projets","plus","prieres","temoignages","soldiers-voice","missions-humanitaires","academy"];

function fixture(evenements=[]) {
  const dom=new JSDOM(accueil,{url:"https://mouvement-sde.org/",pretendToBeVisual:true,runScripts:"outside-only"});
  const w=dom.window;
  w.fetch=async(url)=>{
    assert.equal(url,"/api/public");
    return {ok:true,json:async()=>({evenements})};
  };
  w.eval(script);
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  return {dom,w,d:w.document};
}
const visibles=d=>[...d.querySelectorAll("#parcours-sde .sde-parcours-card")].filter(x=>!x.hidden);

test("parcours : amélioration progressive et filtres accessibles",()=>{
  const {dom,d}=fixture();
  assert.equal(d.querySelectorAll("#parcours-sde .sde-parcours-card").length,12);
  assert.equal(visibles(d).length,4);
  const filtres=[...d.querySelectorAll(".sde-dyn-filtre")];
  assert.deepEqual(filtres.map(x=>x.textContent),["Découvrir","Grandir dans la foi","Servir et agir","Tout voir"]);
  assert.equal(filtres[0].getAttribute("aria-pressed"),"true");
  filtres[1].click();
  assert.equal(visibles(d).length,3);
  assert.equal(filtres[1].getAttribute("aria-pressed"),"true");
  filtres[2].click();
  assert.equal(visibles(d).length,5);
  filtres[3].click();
  assert.equal(visibles(d).length,12);
  dom.window.close();
});

test("recherche : couvre tous les parcours, ignore les accents et annonce l'état vide",()=>{
  const {dom,d,w}=fixture();
  const input=d.getElementById("sde-dyn-search");
  input.value="priEre";
  input.dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(visibles(d).length,1);
  assert.ok(visibles(d)[0].textContent.includes("Prières"));
  assert.equal(d.querySelector('.sde-dyn-filtre[data-categorie="tous"]').getAttribute("aria-pressed"),"true");
  input.value="aucun-parcours-xyz";
  input.dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(visibles(d).length,0);
  assert.equal(d.querySelector(".sde-dyn-vide").hidden,false);
  input.value="";
  input.dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(visibles(d).length,12);
  dom.window.close();
});

test("agenda : uniquement l'API publique, textes encodés sans insertion HTML",async()=>{
  const {dom,d}=fixture([{titre:"Conférence <IN FIRE>",date:"2026-10-31",heure:"08:30",lieu:"Abidjan"}]);
  await new Promise(resolve=>setTimeout(resolve,0));
  const encart=d.querySelector(".sde-dyn-rdv");
  assert.ok(encart);
  assert.equal(encart.querySelector("strong").textContent,"Conférence <IN FIRE>");
  assert.equal(encart.querySelector("strong").children.length,0);
  assert.ok(encart.textContent.includes("31 octobre 2026"));
  assert.equal(encart.querySelector("a").getAttribute("href"),"/vitrine/programmes#agenda");
  dom.window.close();
});

test("progression : bouton retour masqué avant défilement et accessible",()=>{
  const {dom,d}=fixture();
  assert.equal(d.querySelector(".sde-dyn-retour").hidden,true);
  assert.equal(d.querySelector(".sde-dyn-retour").getAttribute("aria-label"),"Retour en haut de page");
  assert.equal(d.querySelectorAll(".sde-dyn-progression").length,1);
  dom.window.close();
});

test("chargement : toutes les rubriques publiques disposent du design et de la navigation communs",()=>{
  for(const page of pages){
    const code=readFileSync("public/vitrine/"+page+".html","utf8");
    assert.ok(code.includes('/vitrine/'+(page==='index'?'sde-dynamique':'portail-unifie')+'.css'));
    assert.ok(code.includes('/vitrine/'+(page==='index'?'sde-dynamique':'portail-unifie')+'.js'));
  }
});

test("confidentialité : collecte en base déclarée sur l'accueil et l'inscription",()=>{
  for(const page of ["index","rejoindre"]){
    const html=readFileSync("public/vitrine/"+page+".html","utf8");
    const section=html.slice(html.indexOf('id="confidentialite"'),html.indexOf("</section>",html.indexOf('id="confidentialite"')));
    assert.match(section,/enregistrées dans la base de données/);
    assert.match(section,/demander l'accès, la rectification ou l'effacement/);
  }
});