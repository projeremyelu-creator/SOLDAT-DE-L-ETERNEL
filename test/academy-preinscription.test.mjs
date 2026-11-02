import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

test("Academy : absence du bouton thème historique ne désactive pas la préinscription",()=>{
 const html=readFileSync("public/vitrine/academy.html","utf8");
 const dom=new JSDOM(html,{url:"https://mouvement-sde.org/academy",runScripts:"outside-only",pretendToBeVisual:true});
 const {window:w}=dom;
 const legacy=[...w.document.querySelectorAll("script")].find(s=>s.textContent.includes("/* Thème */"));
 assert.ok(legacy,"script de la préinscription introuvable");
 assert.equal(w.document.getElementById("btnTheme"),null,"la page utilise le thème global");
 assert.doesNotThrow(()=>w.eval(legacy.textContent),"aucune erreur JavaScript lors de l’initialisation");
 const form=w.document.getElementById("formulaire");
 const toast=w.document.getElementById("toast");
 assert.ok(form&&toast);
 const ev=new w.Event("submit",{bubbles:true,cancelable:true});
 assert.equal(form.dispatchEvent(ev),false,"soumission interceptée par le gestionnaire");
 assert.match(toast.textContent,/Veuillez remplir le champ/,"le contrôle de formulaire est actif");
 dom.window.close();
});
