import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const noms=[
 ["pole-reveil","REV","Réveil, évangélisation & missions"],
 ["pole-social","ISH","Impact social & humanitaire"],
 ["pole-logistique","LO","Logistique & organisation"],
 ["pole-medias","CMR","Communication, médias & digital"],
 ["pole-formation","FDE","Formation & développement intégral"]
];
const policy="/confidentialite";
test("Les cinq pôles partagent les identifiants de l'adhésion sans perdre leurs titres officiels",()=>{
 const contact=new JSDOM(read("public/vitrine/rejoindre.html")).window.document;
 const select=contact.querySelector("#f-pole");
 assert.equal(select.options.length,6,"Cinq pôles et un choix vide");
 for(const [slug,sigle,reference] of noms){
  const dom=new JSDOM(read("public/vitrine/"+slug+".html"));
  const d=dom.window.document;
  const form=d.querySelector("form[data-pole-engager]");
  assert.ok(form,slug);
  assert.match(d.querySelector(".sde-intro .sde-kicker").textContent,new RegExp(sigle+"$"));
  assert.equal(form.dataset.slug,slug);
  assert.equal(form.dataset.poleReference,reference);
  assert.ok(form.dataset.pole && form.dataset.pole!=="" && d.querySelector("h1"));
  assert.ok([...select.options].some(o=>o.value===reference),slug+" : valeur commune introuvable");
  assert.ok(form.querySelector('a[href="/confidentialite"]'),slug+" : lien de confidentialité absent");
  assert.ok(d.querySelector('.site-footer a[href="/confidentialite"]'),slug+" : pied de page");
  assert.equal(d.querySelector('.site-footer a[href="/contact#confidentialite"]'),null);
  dom.window.close();
 }
});
test("Chaque formulaire de pôle transmet le code reconnu par l'administration",async()=>{
 const js=read("public/vitrine/pole-page.js");
 for(const [slug,_sigle,reference] of noms){
  const dom=new JSDOM(read("public/vitrine/"+slug+".html"),{
   url:"https://mouvement-sde.org/"+slug,runScripts:"outside-only"
  });
  const w=dom.window,form=w.document.querySelector("form[data-pole-engager]");
  let sent=null;
  w.fetch=async(url,opts)=>{
   assert.equal(url,"/api/engager");
   sent=JSON.parse(opts.body);
   return {ok:true,json:async()=>({ok:true})};
  };
  w.eval(js);w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  form.elements.nom.value="Participant Exemple";
  form.elements.contact.value="participant@example.org";
  form.elements.accord.checked=true;
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,12));
  assert.equal(sent?.objet,"Servir dans un pôle",slug);
  assert.equal(sent?.pole,reference,slug);
  assert.equal(sent?.source,"mouvement-sde.org/"+slug);
  assert.match(form.querySelector(".sde-form-feedback").textContent,/enregistrée/);
  dom.window.close();
 }
});
test("Un contact invalide ou un accord absent ne déclenche pas de demande",async()=>{
 const dom=new JSDOM(read("public/vitrine/pole-reveil.html"),{runScripts:"outside-only"});
 const w=dom.window,form=w.document.querySelector("form[data-pole-engager]");
 let count=0;
 w.fetch=async()=>{count++;return {ok:true,json:async()=>({ok:true})}};
 w.eval(read("public/vitrine/pole-page.js"));w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 form.elements.nom.value="Test";
 form.elements.contact.value="invalide";
 form.elements.accord.checked=false;
 form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(count,0);
 assert.equal(form.querySelector(".sde-form-feedback").dataset.state,"error");
 dom.window.close();
});
test("La page Contact affiche la politique complète sans perdre son résumé",()=>{
 const doc=new JSDOM(read("public/vitrine/rejoindre.html")).window.document;
 assert.ok(doc.querySelector('#confidentialite a[href="/confidentialite"]'));
 assert.ok(doc.querySelector('.site-footer a[href="/confidentialite"]'));
 assert.match(doc.querySelector("#confidentialite").textContent,/rectification/);
 const worker=read("src/worker.js");
 assert.match(worker,/["']\/confidentialite["']:\s*["']\/vitrine\/confidentialite\.html["']/);
});
