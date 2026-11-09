import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
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


test('Accueil premium : hero immersif, deux actions et bandeau TPA compact',()=>{
 const html=file('public/vitrine/portail.html');
 const css=file('public/vitrine/sde-accueil-premium.css');
 const hero=html.slice(html.indexOf('class="ap-hero"'),html.indexOf('id="programmes-accueil"'));
 assert.ok(hero.length>500,'Le hero précède l’agenda');
 assert.equal((html.match(/<img[^>]+src="\/vitrine\/illus\/tpa-2026\.webp"/g)||[]).length,0,'pas de grande affiche dans l’accueil compact');
 assert.ok(html.includes('href="/programmes#tpa-2026"'));
 assert.ok(html.includes('datetime="2026-12-18T20:00:00+00:00"'));
 assert.ok(hero.includes('class="ap-actions"'));
 for(const link of ['/contact#rejoindre','/mouvement#film'])assert.ok(hero.includes('href="'+link+'"'),'Action manquante '+link);
 assert.match(css,/\.ap-hero-inner\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
test('Tableaux SDE : données réelles pour les barres, formations, rendez-vous, sans contenu simulé',()=>{
 const jsx=file('frontend/business-mosaic.jsx'),css=file('frontend/business-mosaic.css');
 assert.ok(jsx.includes("data.frequentation"));
 assert.ok(jsx.includes("data.activites"));
 assert.ok(jsx.includes("data.evenements"));
 assert.ok(jsx.includes("data.formations"));
 assert.ok(jsx.includes("source.error"));
 assert.ok(jsx.includes("source.loading"));
 assert.ok(jsx.includes("role=\"progressbar\""));
 assert.ok(jsx.includes("portal.selectionner(module)"));
 assert.ok(css.includes(".sde-mosaic-insights"));
 assert.ok(css.includes(".sde-mosaic-bar-track"));
 assert.ok(css.includes(".sde-mosaic-course-list"));
});


test('Références tactiques SDE : trois écrans fonctionnels et styles responsives compilables',()=>{
 const ops=file('frontend/operations.jsx'),tac=file('frontend/tactical-panels.jsx');
 const css=file('frontend/tactical-panels.css'),entry=file('frontend/experience.css');
 assert.ok(entry.includes('@import "./tactical-panels.css"'));
 assert.ok(ops.includes("from './tactical-panels.jsx'"));
 for(const tag of ['TacticalCommandPanel dashboard={d}','TacticalAcademyPanel academy={d}','TacticalMemberPanel academy={acad.data}'])assert.ok(ops.includes(tag),tag);
 for(const tag of ['export function TacticalCommandPanel','export function TacticalAcademyPanel','export function TacticalMemberPanel'])assert.ok(tac.includes(tag),tag);
 assert.match(css,/sde-tactical-command-grid/);
 assert.match(css,/sde-tactical-academy-grid/);
 assert.match(css,/sde-tactical-member-grid/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
test('Terminal tactique : agrégats API, aucun GPS ni biométrie artificielle',()=>{
 const tac=file('frontend/tactical-panels.jsx');
 const ops=file('frontend/operations.jsx');
 const backend=file('src/dashboard-metrics.js');
 for(const key of ['d.frequentation','d.indicateurs?.presence?.taux','missions.tachesTotal','d.indicateurs?.demandesAdhesion','d.actualiseLe'])assert.ok(tac.includes(key),key);
 for(const key of ['d.progression','d.formations','d.prets','d.modulesTotal'])assert.ok(tac.includes(key),'Donnée Academy absente : '+key);
 assert.ok(tac.includes('qrSrc'), 'Carte existante réutilisée, sans recréer de QR');
 assert.ok(tac.includes('aucune géolocalisation'), 'Avertissement cartographique requis');
 assert.ok(tac.includes('Aucun contrôle biométrique'));
 assert.ok(ops.includes("useData('/api/tableau-de-bord'"));
 assert.ok(ops.includes("useData('/api/pilotage-academy'"));
 assert.ok(ops.includes("useData('/api/mon-parcours-academy'"));
 assert.ok(backend.includes('dashboardMetrics'));
});


test('Priorité 01 : accueil sans double affiche TPA, vision et trois actions maintenues',()=>{
 const home=file('public/vitrine/portail.html');
 const sitecss=file('public/vitrine/sde-sitewide-2026.css');
 assert.match(home,/class="ap-hero"/);
 assert.match(home,/class="sde-shell-event sde-tpa-hero-card"/);
 assert.ok(!home.includes('sde-community-band'),'plus de second bandeau');
 assert.equal((home.match(/<img[^>]+src="\/vitrine\/illus\/tpa-2026\.webp"/g)||[]).length,0);
 for(const href of ['/contact#rejoindre','/mouvement#film']){
  const bloc=home.slice(home.indexOf('class="ap-hero"'),home.indexOf('id="programmes-accueil"'));
  assert.ok(bloc.includes('href="'+href+'"'),href);
 }
 assert.ok(home.includes('class="sde-shell-event sde-tpa-hero-card"')&&home.includes('href="/programmes#tpa-2026"'));
 assert.ok(sitecss.includes('Refonte structurée 03/11/2026'));
 assert.ok(sitecss.includes('.sde-rail{'));
 assert.ok(sitecss.includes('display:none!important'));
 assert.ok(sitecss.includes('site-mega-panel'));
});
test('Priorité 02 : onglets privés cohérents et registres accessibles sur mobile',()=>{
 const nav=file('frontend/reference-shell.jsx');
 const css=file('frontend/reference.css');
 assert.ok(nav.includes("['rendezvous','Agenda & inscriptions','mission']"));
 assert.ok(nav.includes("['carteqr','Ma carte QR','qr']"));
 assert.ok(nav.includes("['academie','Academy','academy']"));
 assert.ok(nav.includes("['rendezvous','Mon agenda','mission']"));
 assert.ok(css.includes('Étape 2, tableaux de bord privés'));
 assert.ok(css.includes('data-sde-module=annuaire'));
 assert.ok(css.includes('overflow-x:auto!important'));
 assert.ok(css.includes('repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('prefers-reduced-motion'));
});
test('Priorité 03 : galerie, soutien et pages publiques partagent les principes de navigation',()=>{
 const album=file('public/vitrine/album-infire.html');
 const don=file('public/vitrine/soutenir.html');
 const extras=file('public/vitrine/sde-standalone-clarte.css');
 const global=file('public/vitrine/sde-sitewide-2026.css');
 for(const page of [album,don]){
  assert.match(page,/sde-standalone-clarte\.css\?v=/);
  assert.match(page,/class="sde-standalone-bottom"/);
  for(const href of ['/','/contact#rejoindre','/programmes#agenda','/soutenir','/rubriques'])
   assert.ok(page.includes('href="'+href+'"'),href);
 }
 assert.match(album,/class="tab" type="button" role="tab" data-year="2024"/);
 assert.match(album,/class="tab" type="button" role="tab" data-year="2025"/);
 assert.match(album,/class="tab" type="button" role="tab" data-year="2026"/);
 assert.match(don,/Paiement en ligne en préparation/);
 assert.match(don,/data-sde-form/);
 assert.match(extras,/\.sde-standalone-bottom/);
 assert.match(extras,/@media\(max-width:900px\)/);
 for(const term of ['ressources-grille','hub-grid','sde-initiative-section','sde-public-bottom-nav'])assert.ok(global.includes(term));
});


test('Nouvelle étape : cinq pôles accessibles avec onglets, liens directs et sections existantes',()=>{
 const names=['pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation'];
 for(const name of names){
  const doc=new JSDOM(file('public/vitrine/'+name+'.html')).window.document;
  const switcher=doc.querySelector('nav.sde-poles-switcher');
  const jumps=doc.querySelector('nav.sde-section-jumps');
  assert.ok(switcher,name+' sélecteur des pôles manquant');
  assert.ok(jumps,name+' accès directs manquants');
  assert.equal(switcher.querySelectorAll('a').length,5);
  assert.equal(switcher.querySelectorAll('a[aria-current="page"]').length,1);
  assert.equal(switcher.querySelector('a[aria-current="page"]').getAttribute('href'),'/'+name);
  for(const slug of names)assert.ok(switcher.querySelector('a[href="/'+slug+'"]'),slug);
  for(const a of jumps.querySelectorAll('a[href^="#"]')){
   const id=a.getAttribute('href').slice(1);
   assert.ok(doc.getElementById(id),name+' ancre absente : '+id);
  }
  assert.ok(jumps.querySelector('a.sde-section-jumps-cta[href="#engager"]'));
 }
});
test('Nouvelle étape : prières, missions et bibliothèque ont des raccourcis sans actions fictives',()=>{
 const paths=['prieres','missions-humanitaires','ressources'];
 for(const page of paths){
  const doc=new JSDOM(file('public/vitrine/'+page+'.html')).window.document;
  const nav=doc.querySelector('nav.sde-section-jumps');
  assert.ok(nav,page+' navigation absente');
  for(const a of nav.querySelectorAll('a[href^="#"]')){
   const anchor=a.getAttribute('href').slice(1);
   assert.ok(doc.getElementById(anchor),page+' ancre introuvable : '+anchor);
  }
  assert.ok(nav.querySelectorAll('a').length>=3);
  assert.ok(nav.querySelector('a.sde-section-jumps-cta'));
 }
 const prayer=file('public/vitrine/prieres.html');
 assert.ok(prayer.includes('data-sde-anonymous-prayer'),'Anonymat de prière préservé');
 const resources=file('public/vitrine/ressources.html');
 assert.ok(resources.includes('ressources-grille'),'Bibliothèque existante préservée');
});
test('Nouvelle étape : palette publique et poste de commandement premium accessibles sur mobile',()=>{
 const site=file('public/vitrine/sde-sitewide-2026.css');
 const admin=file('frontend/reference.css'),ops=file('frontend/operations.jsx');
 for(const token of ['.sde-poles-switcher','.sde-section-jumps','[aria-current="page"]','data-sde-page="pole-social"','prefers-reduced-motion:reduce'])
  assert.ok(site.includes(token),'CSS public '+token);
 assert.ok(site.includes('@media(max-width:800px)'));
 assert.ok(site.includes('overflow-x:auto'));
 for(const token of ['Finition premium du poste de commandement','.ref-command-focus .ref-priority','.ref-command-focus-status','@media(max-width:650px)','outline:3px'])
  assert.ok(admin.includes(token),'CSS commande '+token);
 for(const target of ['adhesions','scanner','academy-direction','rendezvous','suivi-poles','finance-direction'])
  assert.ok(ops.includes("portal.selectionner('"+target+"')"),'Module '+target);
 assert.ok(ops.includes('portal.compte.niveau>=2'),'Finances direction toujours conditionnelles');
});
