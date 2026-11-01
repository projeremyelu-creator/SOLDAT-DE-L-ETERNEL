import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const hub=read("public/vitrine/sde-hub.js");
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
const boot=(markup,url,payload)=>{
 const dom=new JSDOM(markup,{url,runScripts:"outside-only",pretendToBeVisual:true});
 dom.window.fetch=async()=>({ok:true,json:async()=>payload});
 dom.window.eval(hub);
 return dom;
};

test("Calendrier : blocage des liens dangereux, échappement du HTML, HTTPS autorisé",async()=>{
 const today=new Date().toISOString().slice(0,10);
 const events=[
  {date:today,titre:'Programme <img src=x onerror=alert(1)>',lien:'javascript:alert(1)'},
  {date:today,titre:'Balise sur lien',lien:'/programmes?search=" onmouseover="alert(1)'},
  {date:today,titre:'Rencontre autorisée',lien:'https://meet.google.com/abc-defg-hij'},
  {date:today,titre:'Programme local',lien:'/programmes#tpa-2026'}
 ];
 const dom=boot('<div id="hub-calendar-title"></div><div id="hub-calendar"></div>',
  "https://mouvement-sde.org/calendrier",{evenements:events});
 await settle();
 const doc=dom.window.document;
 const links=[...doc.querySelectorAll("#hub-calendar .event a")];
 assert.equal(links.length,4);
 assert.equal(links[0].getAttribute("href"),"/programmes");
 assert.equal(links[1].getAttribute("href"),"/programmes");
 assert.equal(links[2].href,"https://meet.google.com/abc-defg-hij");
 assert.equal(links[3].getAttribute("href"),"/programmes#tpa-2026");
 assert.ok(links.every(link=>link.rel==="noopener noreferrer"));
 assert.equal(doc.querySelector("#hub-calendar img"),null,"Le titre CMS doit rester du texte sans HTML injecté");
 assert.match(links[0].textContent,/Programme <img/);
 dom.window.close();
});

test("Transparence : une publication approuvée remplace le message d'attente, sans HTML exécuté",async()=>{
 const markup=read("public/vitrine/transparence.html");
 const payload={rapports:[{periode:"2026-Q3",texte:"Bilan approuvé <img src=x onerror=alert(1)>"}]};
 const dom=boot(markup,"https://mouvement-sde.org/transparence",payload);
 await settle();
 const doc=dom.window.document;
 assert.equal(doc.querySelector("[data-sde-bilan-attente]"),null);
 const section=[...doc.querySelectorAll(".hub-section")].find(x=>/Bilans trimestriels publiés/.test(x.textContent));
 assert.ok(section);
 assert.match(section.textContent,/2026-Q3/);
 assert.match(section.textContent,/Bilan approuvé <img/);
 assert.equal(section.querySelector("img"),null);
 assert.ok(doc.querySelector('a[href="/confidentialite"]'));
 dom.window.close();
});

test("Transparence : sans données publiées, ne jamais inventer un bilan ou un montant",async()=>{
 const dom=boot(read("public/vitrine/transparence.html"),"https://mouvement-sde.org/transparence",{rapports:[]});
 await settle();
 assert.ok(dom.window.document.querySelector("[data-sde-bilan-attente]"));
 assert.equal(dom.window.document.querySelector(".hub-results"),null);
 dom.window.close();
});

test("Soutien : demande d'information et consentement, sans simulation de paiement",()=>{
 const doc=new JSDOM(read("public/vitrine/soutenir.html")).window.document;
 const note=[...doc.querySelectorAll(".hub-note")].map(e=>e.textContent).join(" ");
 assert.match(note,/Paiement en ligne en préparation/);
 assert.match(note,/Orange Money/);
 const form=doc.querySelector("form[data-sde-form]");
 assert.ok(form);
 assert.equal(form.querySelector('input[name="type"]').value,"soutien");
 assert.ok(form.querySelector('input[name="consentement"][required]'));
 assert.ok(form.querySelector('a[href="/confidentialite"]'));
 assert.equal(form.querySelector('[name="numeroCarte"],[name="numeroCompte"],[name="codeOtp"]'),null);
 assert.deepEqual([...doc.querySelectorAll("[data-projet]")].map(e=>e.dataset.projet).sort(),
 ["in-fire-2027","missions-humanitaires","soldiers-academy"]);
 assert.ok(doc.querySelector('a[href="/transparence"]'));
});
