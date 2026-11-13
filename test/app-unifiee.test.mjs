import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
test("L'application (connexion, espaces) charge la marque et l'ambiance partagées avec le même jeu de versions",()=>{
 const versions=new Set();
 for(const f of ['public/vitrine/connexion-unifiee.html','public/index.html']){
  const html=read(f),css=html.match(/sde-marque\.css\?v=(\w+)/),js=html.match(/sde-marque\.js\?v=(\w+)/);
  assert.ok(css&&js,f+' doit charger sde-marque.css et sde-marque.js');
  versions.add(css[1]);versions.add(js[1]);
 }
 assert.equal(versions.size,1);
});
test("L'ambiance respecte mouvement réduit, pause, thème clair et onglet caché",()=>{
 const js=read('public/vitrine/sde-marque.js'),css=read('public/vitrine/sde-marque.css');
 for(const motif of [/prefers-reduced-motion: reduce/,/data-motion"\) === "paused"/,/document\.hidden/,/data-theme"\) !== "light"/,/localStorage\.setItem\(KEY/])assert.match(js,motif);
 assert.match(css,/html\[data-theme="light"\] \.sde-ambiance\{display:none\}/);
 assert.match(css,/@media print\{\.sde-ambiance/);
});


test("Annuaire SDE : indicatif ivoirien 00225 normalisé à l'affichage sans modifier les contacts",async()=>{
 const {runInNewContext}=await import("node:vm");
 const source=read("public/index.html");
 const fonction=source.match(/  function telAffiche\(t\) \{[\s\S]*?\n  \}/)?.[0];
 assert.ok(fonction,"la fonction d'affichage du téléphone doit exister");
 const telAffiche=runInNewContext("("+fonction+")");
 assert.equal(telAffiche("00225 07 87 12 45 55"),"+225 07 87 12 45 55");
 assert.equal(telAffiche("+225 07 87 12 45 55"),"+225 07 87 12 45 55");
 assert.equal(telAffiche("2250787124555"),"+225 07 87 12 45 55");
 assert.equal(telAffiche("07 87 12 45 55"),"07 87 12 45 55");
 assert.equal(telAffiche("0033 6 10 20 30 40"),"0033 6 10 20 30 40");
 assert.match(source,/function telChiffres\(t\)/,"liens d'appel conservés");
});

test('Affichage privé : le bouton Animations reste dans une zone non flottante et accessible',()=>{
 const html=read('public/index.html');
 const css=read('public/vitrine/sde-mobile-correctifs-20261103.css');
 const js=read('public/vitrine/sde-marque.js');
 assert.match(html,/class="sde-private-motion-row"[^>]*role="group"/);
 assert.match(html,/class="sde-motion-slot" data-sde-motion-slot="true"/);
 assert.match(css,/\.sde-private-motion-row \.sde-ambiance-ctl\{/);
 assert.match(css,/position:static!important/);
 assert.match(css,/min-height:44px!important/);
 assert.doesNotMatch(css,/html body\.sde-direct \.sde-ambiance-ctl\s*\{\s*position:fixed!important/);
 assert.match(js,/localStorage\.setItem\(KEY, userPaused/);
});
