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
