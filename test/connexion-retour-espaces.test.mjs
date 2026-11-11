import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const loginHtml=readFileSync("public/vitrine/connexion-unifiee.html","utf8");
const loginJs=readFileSync("public/vitrine/portail-connexion.js","utf8");
function prepare(url){
 const d=new JSDOM(loginHtml,{url,runScripts:"outside-only",pretendToBeVisual:true});
 d.window.eval(loginJs);
 d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
 const m=d.window.document.querySelector('[data-access-target="/mon-espace"]');
 const a=d.window.document.querySelector('[data-access-target="/administration"]');
 assert.ok(m&&a,"Les deux espaces doivent être directement disponibles");
 return {d,m,a};
}
test("La connexion standard et le retour portail mettent le membre en évidence",()=>{
 for(const url of ["https://mouvement-sde.org/connexion","https://mouvement-sde.org/connexion?retour=%2Fportail"]){
  const {d,m,a}=prepare(url);
  assert.equal(m.getAttribute("aria-pressed"),"true");
  assert.equal(a.getAttribute("aria-pressed"),"false");
  d.window.close();
 }
});
test("La demande explicite d'administration reste sélectionnée",()=>{
 const {d,m,a}=prepare("https://mouvement-sde.org/connexion?retour=%2Fadministration");
 assert.equal(a.getAttribute("aria-pressed"),"true");
 assert.equal(m.getAttribute("aria-pressed"),"false");
 a.click();
 assert.equal(new URL(d.window.location.href).searchParams.get("retour"),"/administration");
 m.click();
 assert.equal(new URL(d.window.location.href).searchParams.get("retour"),"/mon-espace");
 assert.equal(m.getAttribute("aria-pressed"),"true");
 assert.equal(a.getAttribute("aria-pressed"),"false");
 d.window.close();
});
test("La connexion reste isolée des événements publics et conserve les espaces membre/admin",()=>{
 const d=new JSDOM(loginHtml),doc=d.window.document;
 assert.equal(doc.querySelector("#sde-event-root"),null);
 assert.equal(doc.querySelector(".site-header,.site-menu,.sde-auth-nav"),null);
 assert.ok(doc.querySelector('[data-access-target="/mon-espace"][aria-pressed="true"]'));
 assert.ok(doc.querySelector('[data-access-target="/administration"]'));
 assert.ok(doc.querySelector('#form-connexion'));
 d.window.close();
});
test("Le Worker impose authentification et habilitation pour les deux espaces",()=>{
 const s=readFileSync("src/worker.js","utf8");
 assert.match(s,/if \(p === "\/portail"\) \{/);
 assert.match(s,/if \(!u\.connecte\) \{/);
 assert.match(s,/if \(p\.startsWith\("\/administration"\) && u\.niveau < 1\)/);
 assert.match(s,/return erreur\("refuse", "Accès réservé aux responsables autorisés\.", 403\)/);
 assert.match(s,/n\.headers\.set\("cache-control","private, no-store"\)/);
});

test("Toute redirection d'un accès privé interdit cache et référencement",()=>{
 const src=readFileSync("src/worker.js","utf8");
 const blocks=[
  src.slice(src.indexOf('if (p === "/connexion")'),src.indexOf('if (p === "/os-v31"')),
  src.slice(src.indexOf('if (["/mon-espace","/administration"'),src.indexOf('if (p.startsWith("/administration") && u.niveau < 1)'))
 ];
 for(const block of blocks){
  assert.ok(block.startsWith("if ("),"Route privée introuvable");
  assert.match(block,/new Response\(null,\{status:302,headers:\{location:/);
  assert.match(block,/"cache-control":"private, no-store"/);
  assert.match(block,/"x-robots-tag":"noindex, nofollow"/);
  assert.doesNotMatch(block,/return Response\.redirect\(/);
 }
});

test("Accès direct Soldiers Academy : le retour membre/admin reste sur la rubrique demandée",()=>{
 for(const [path,target] of [["/mon-espace/academy","/mon-espace"],["/administration/academy","/administration"]]){
   const {d,m,a}=prepare("https://mouvement-sde.org/connexion?retour="+encodeURIComponent(path));
   assert.equal((target==="/administration"?a:m).getAttribute("aria-pressed"),"true");
   d.window.close();
 }
 assert.match(loginJs,/\/mon-espace\/academy/);
 assert.match(loginJs,/\/administration\/academy/);
 assert.match(loginJs,/destination\.startsWith\("\/administration"\)/);
 const worker=readFileSync("src/worker.js","utf8");
 assert.match(worker,/p\.endsWith\("\/academy"\)\?p/);
 const changePassword=readFileSync("public/vitrine/sde-mot-de-passe.js","utf8");
 assert.match(changePassword,/\/mon-espace\/academy/);
 assert.match(changePassword,/\/administration\/academy/);
});
