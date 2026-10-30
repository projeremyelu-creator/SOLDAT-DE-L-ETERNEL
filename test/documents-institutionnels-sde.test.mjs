import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=p=>readFileSync(p,'utf8');
const doc=path=>new JSDOM(read('public/vitrine/'+path+'.html')).window.document;
const pole=doc('poles'),award=doc('soldiers-award');
const siteCss=read('public/vitrine/sde-sitewide-2026.css');
const ivoireCss=read('public/vitrine/ivoire-pages.css');

test('Documents institutionnels : 5 pôles avec missions et départements source',()=>{
 const cards=[...pole.querySelectorAll('.sde-doc-grid .sde-doc-card')];
 assert.equal(cards.length,5);
 const names=cards.map(c=>c.querySelector('h2')?.textContent);
 for(const term of ['Évangélisation','Œuvre Sociale','Logistique','Communication','Formation, Entrepreneuriat'])
   assert.ok(names.some(n=>n.includes(term)),term);
 assert.deepEqual(cards.map(c=>c.querySelectorAll('details:first-of-type li').length),[4,4,5,5,5]);
 assert.ok(cards.every(c=>c.querySelectorAll('details').length===2));
 assert.match(pole.textContent,/objectifs fixés par le document/i);
 assert.match(pole.textContent,/Rapports mensuels/);
 assert.match(pole.textContent,/Audits financiers annuels/);
});

test('SOLDIER’S AWARD : quatre catégories fidèles aux sources et jury',()=>{
 const cartes=[...award.querySelectorAll('#distinctions .sde-doc-card')];
 assert.equal(cartes.length,4);
 for(const name of ['Le Soldat d’Or','Le Soldat du Réveil','Le Soldat Compatissant','Le Soldat de l’Année'])
   assert.ok(cartes.some(c=>c.textContent.includes(name)),name);
 assert.equal(award.querySelectorAll('#jury .sde-doc-card').length,4);
 for(const name of ['Jérémy Octave GLAZAI','Amy Berté','Daniel DO BI','À désigner'])
   assert.ok(award.textContent.includes(name),name);
 assert.match(award.textContent,/Périodicité annuelle/);
 assert.match(award.textContent,/Aucun lauréat ni appel à candidature/);
 assert.match(award.textContent,/Certificat officiel d’honneur/);
});

test('Navigation : routes publiques, rubriques, deux pages et sitemap',()=>{
 const w=read('src/worker.js'),plus=read('public/vitrine/plus.html');
 for(const [path,target] of [['/poles','poles.html'],['/soldiers-award','soldiers-award.html']]){
   assert.ok(w.includes('"'+path+'": "/vitrine/'+target+'"'),path);
   assert.ok(plus.includes('href="'+path+'"'),path);
   assert.match(read('public/sitemap.xml'),new RegExp('mouvement-sde.org'+path));
   const d=doc(target.slice(0,-5));
   assert.equal(d.querySelector('link[rel="canonical"]')?.href,'https://mouvement-sde.org'+path);
   assert.ok(d.querySelector('main#contenu h1'));
   assert.ok(d.querySelector('link[href*="sde-institution.css"]'));
 }
 assert.ok(read('public/vitrine/mouvement.html').includes('href="/poles"'));
 assert.ok(read('public/vitrine/programmes.html').includes('href="/soldiers-award"'));
});

test('Accessibilité institutionnelle : cartes révélables et liens tactiles',()=>{
 assert.equal(pole.querySelectorAll('.sde-doc-card details summary').length,10);
 assert.equal(award.querySelectorAll('#distinctions details summary').length,4);
 const css=read('public/vitrine/sde-institution.css');
 assert.match(css,/min-height:44px/);
 assert.match(css,/summary:focus-visible/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/color:#fff8e6!important/);
});

test('Pied de page : retrait de la règle qui imposait le fond transparent',()=>{
 assert.ok(!ivoireCss.includes(':is(main,#contenu,.site-footer,.pied)'));
 assert.match(ivoireCss,/html body\.sde-ivoire :is\(main,#contenu\)/);
 assert.match(ivoireCss,/background:#172b25!important/);
 const footer=siteCss.slice(siteCss.indexOf('Correction structurelle du pied de page public'));
 assert.ok(footer.length>1800);
 assert.match(footer,/background:#172b25!important;background-color:#172b25!important/);
 assert.match(footer,/\.footer-grid>div/);
 assert.match(footer,/color:#f7f3e8!important/);
 assert.match(footer,/color:#f6d58e!important/);
 assert.match(footer, /footer\.site-footer> :is\(section,div\)/);
});

test('Toutes les pages : une nouvelle version CSS évite le style périmé en cache',()=>{
 const pages=['portail','programmes','mouvement','projets','rejoindre',
   'ressources','plus','academy','boutique','prieres','missions-humanitaires',
   'soldiers-voice','temoignages','404','formulaire','poles','soldiers-award'];
 for(const p of pages){
   let d=doc(p);
   assert.ok(d.querySelector('link[href*="sde-sitewide-2026.css?v=20261030institution"]'),p);
   if(d.querySelector('link[href*="ivoire-pages.css"]'))assert.ok(d.querySelector('link[href*="ivoire-pages.css?v=20261030footer"]'),p);
 }
});

test('Les formulaires et l’espace privé sont inchangés par les documents publics',()=>{
 assert.ok(!siteCss.includes('#sde-operations-nav'));
 assert.ok(!read('public/vitrine/sde-institution.css').includes('.ref-toolbar'));
 assert.ok(read('public/vitrine/rejoindre.html').includes('form'));
 assert.ok(read('public/vitrine/formulaire.html').includes('form'));
});
