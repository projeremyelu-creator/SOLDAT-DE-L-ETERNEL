import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=p=>readFileSync(p,'utf8');
test('La vitrine, les espaces privés et les modules utilisent une charte réellement compilée',()=>{
 const css=file('frontend/business-mosaic.css'),entry=file('frontend/experience.css');
 assert.ok(entry.includes('@import "./business-mosaic.css"'));
 for(const name of ['.sde-mosaic-member','.sde-mosaic-command','.sde-mosaic-grid','.sde-mosaic-module','.ref-sidebar','.ref-tabbar']){
  assert.ok(css.includes(name),name);
 }
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(existsSync('public/vitrine/photos/hero-sde-1280.webp'));
 assert.ok(existsSync('public/vitrine/logo-96.webp'));
});
test('Modules métier : catalogue, parcours et protection des droits',()=>{
 const src=file('frontend/business-mosaic.jsx');
 const ops=file('frontend/operations.jsx');
 const router=file('public/vitrine/portail-direct.js');
 const sidebar=file('frontend/reference-shell.jsx');
 for(const m of ['centre-membre','centre-command']){
  assert.ok(ops.includes("'"+m+"'"),m+' dans le moteur React');
  assert.ok(router.includes('"'+m+'"'),m+' dans le routeur');
  assert.ok(sidebar.includes("'"+m+"'"),m+' dans la navigation');
 }
 assert.ok(router.includes('if(nom==="centre-command")return mode==="direction"&&compte?.niveau>=1'));
 assert.ok(router.includes('if(nom==="centre-membre")return mode==="membre"'));
 assert.ok(src.includes("module:'finance-direction'"));
 assert.ok(src.includes("module:'site-public'"));
 assert.ok(src.includes("min:2"));
 assert.ok(src.includes("fetch(direction?'/api/tableau-de-bord':'/api/portail-resume'"));
 assert.ok(src.includes("credentials:'same-origin'"));
 assert.ok(src.includes("cache:'no-store'"));
 assert.ok(!src.includes('localStorage'));
 assert.ok(!src.includes('sessionStorage'));
 assert.ok(!src.includes('SECRET PASTORAL'));
});
test('Le centre métier permet de revenir aux vrais modules, pas de faux chiffres',()=>{
 const src=file('frontend/business-mosaic.jsx');
 for(const route of ['pilotage','annuaire','scanner','academy-direction','projets','rendezvous','portevoix','chambre','gestion','espace-soldat','carteqr','contributions','parcours','preferences','bibliotheque','mediatheque']){
  assert.ok(src.includes("module:'"+route+"'"),'module absent : '+route);
 }
 assert.ok(src.includes('portal.selectionner(module)'));
 assert.ok(src.includes("value==null?'—':value"));
 assert.ok(src.includes("source.error"));
 assert.ok(src.includes("source.reload"));
});
test('Les entrées de consultation des dossiers privés restent des routes authentifiées',()=>{
 const worker=file('src/worker.js');
 assert.ok(worker.includes('if (!u.connecte)'));
 assert.ok(worker.includes('if (p.startsWith("/administration") && u.niveau < 1)'));
 assert.ok(worker.includes('return erreur("refuse", "Accès réservé aux responsables autorisés.", 403)'));
});
