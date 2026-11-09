import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const objet="Traversée Prophétique Annuelle — TPA 2026";
const invitation="/contact?objet="+encodeURIComponent(objet)+"#rejoindre";

test("Premier affichage : la structure TPA précède React sur la page Programmes, et l’accueil porte la fiche centrale",()=>{
  for(const page of ["programmes"]){
    const dom=new JSDOM(read("public/vitrine/"+page+".html"));
    const root=dom.window.document.getElementById("sde-event-root");
    assert.ok(root,page+" a un bandeau");
    assert.ok(root.querySelector(".event-bar-inner.upcoming"),page+" a déjà le conteneur final");
    assert.equal(root.querySelectorAll(".event-clock span").length,4);
    assert.ok(root.querySelector('a[href="/programmes#tpa-2026"]'));
    assert.doesNotMatch(root.textContent,/IN FIRE 2026/);
    dom.window.close();
  }
  const accueil=new JSDOM(read("public/vitrine/portail.html")).window.document;
  assert.ok(accueil.querySelector("#prochain-rendez-vous time[datetime='2026-12-18T20:00:00+00:00']"),"accueil : fiche TPA statique avant JavaScript");
  assert.ok(accueil.querySelector('.sde-shell-event a[href="/programmes#tpa-2026"]'));
  assert.doesNotMatch(accueil.querySelector("main").textContent,/IN FIRE 2026/);
  const js=read("public/vitrine/portail-unifie.js");
  assert.match(js,/if\(bandeau\.querySelector\("\.event-bar-inner"\)\)return/);
});

test("La TPA présente une inscription préremplie sans fausse promesse de réservation",()=>{
  const agenda=new JSDOM(read("public/vitrine/programmes.html")).window.document;
  const home=new JSDOM(read("public/vitrine/portail.html")).window.document;
  assert.equal(agenda.querySelector("#tpa-2026 .rdv-actions a[href*='objet=']")?.getAttribute("href"),invitation);
  assert.equal(agenda.querySelector("#tpa-affiche .sde-tpa-inscription")?.getAttribute("href"),invitation);
  assert.ok(home.querySelector('a[href*="objet="]'));
  const html=read("public/vitrine/rejoindre.html");
  const contact=new JSDOM(html).window.document;
  assert.ok([...contact.querySelectorAll("#f-objet option")].some(x=>x.textContent===objet));
});

test("Le formulaire de contact sélectionne la TPA et enregistre une demande dans l'API existante",async()=>{
  const dom=new JSDOM(read("public/vitrine/rejoindre.html"),{
    url:"https://mouvement-sde.org"+invitation,
    runScripts:"outside-only",pretendToBeVisual:true
  });
  const {window:w}=dom;
  let demande=null;
  w.fetch=async (path,opts={})=>{
    if(path==="/api/engager"){
      demande=JSON.parse(opts.body);
      return {ok:true,json:async()=>({ok:true})};
    }
    return {ok:false,json:async()=>({})};
  };
  w.eval(read("public/vitrine/subpage.js"));
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  const form=w.document.getElementById("form-rejoindre");
  assert.equal(form.querySelector("#f-objet").value,objet);
  form.querySelector('[name="nom"]').value="Participant Démonstration";
  form.querySelector('[name="tel"]').value="+2250700112233";
  form.querySelector('[name="ville"]').value="Abidjan";
  form.querySelector('[name="accord"]').checked=true;
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(demande?.objet,objet);
  assert.equal(demande?.nom,"Participant Démonstration");
  assert.ok(w.document.getElementById("envoi-titre").textContent.includes("transmise"));
  dom.window.close();
});

test("La bannière ne propose plus une ancienne conférence après décembre 2026",()=>{
  const jsx=read("frontend/experience.jsx");
  assert.match(jsx,/infire\.phase==='finished'&&tpa\.phase==='hidden'/);
  assert.match(jsx,/Retrouvez nos prochains rendez-vous et formations/);
  assert.match(jsx,/href="\/programmes#tpa-2026"/);
});
