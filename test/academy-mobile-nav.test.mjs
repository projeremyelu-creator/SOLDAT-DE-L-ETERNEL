import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("Android et PWA : le bouton Academy ouvre le portail pédagogique actuel via un lien direct",()=>{
 const app=readFileSync("public/index.html","utf8");
 const css=readFileSync("public/app.css","utf8");
 assert.match(app,/if \(o\.id === "academie"\) return \`<a class="\$\{classe\} nav-academy-direct" href="\/mon-espace\/academy"/,"l'onglet du menu est un lien réel");
 assert.match(app,/t\.dataset\.vue === "academie"\) \{ window\.location\.assign\("\/mon-espace\/academy"\); return;/,"les raccourcis de modules évitent l'ancienne vue");
 assert.match(app,/o\.id === "academie" \? accesRegistre\(\) \|\| S\.user !== null/,"le lien n'est pas réservé aux fiches de membres déjà attribuées");
 assert.match(app,/24 cours · 10 modules Love School · accès sur validation/,"les anciens compteurs de formations sont retirés du menu");
 assert.match(css,/\.nav-btn\.nav-academy-direct \{ text-decoration: none/,"l'onglet de lien conserve le style de la barre mobile");
 assert.match(css,/\.nav-btn\.nav-academy-direct:focus-visible/,"le clavier peut l'atteindre");
});

test("La route sécurisée Soldiers Academy existe et ne sert pas le contenu sans connexion",()=>{
 const worker=readFileSync("src/worker.js","utf8");
 const current=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
 const actual=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 assert.ok(worker.includes('"/mon-espace/academy"'));
 assert.ok(worker.includes('const fichierAcademy = p.endsWith("/academy")?"/vitrine/sde-academy-parcours.html"'));
 assert.ok(worker.includes('if (!u.connecte)'));
 assert.match(worker,/cache-control","private, no-store"/);
 assert.match(current,/Soldiers Academy/);
 assert.match(current,/pane-love/);
 assert.match(actual,/data-love-demander/);
 assert.match(actual,/data-sa-demander/);
 assert.ok(!current.includes("Aucune formation liée à votre fiche"),"l'ancien écran vide ne doit pas être la cible");
});
