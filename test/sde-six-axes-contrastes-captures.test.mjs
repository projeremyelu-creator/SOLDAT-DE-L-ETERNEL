import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=p=>readFileSync(p,'utf8');
const movement=new JSDOM(read('public/vitrine/mouvement.html')).window.document;
const application=new JSDOM(read('public/index.html')).window.document;
const styles=read('public/vitrine/sde-recette-captures-20261113.css');

test('Doctrine officielle · six axes, bon ordre, formulations exactes et sans axe inventé',()=>{
 const nav=movement.querySelector('nav.pg-tabs a[href="#axes"]');
 assert.equal(nav?.textContent.trim(),'Six axes');
 assert.equal(movement.querySelector('#titre-axes')?.textContent.trim(),'Six axes pour former un soldat');
 const cards=[...movement.querySelectorAll('#axes .six-axes > li')];
 assert.equal(cards.length,6);
 assert.deepEqual(cards.map(li=>li.querySelector('h3')?.textContent.trim()),[
  'Rassembler et Unir','Former','Réveiller','Restaurer','Équiper','Envoyer'
 ]);
 assert.deepEqual(cards.map(li=>li.querySelector('p')?.textContent.trim()||''),[
  '','Enraciner dans la Parole',"Ranimer la flamme de l'Esprit",
  'Guérir, relever, rétablir','Armer pour le combat','Partir vers les nations'
 ]);
 assert.equal(movement.querySelectorAll('#axes .six-axes > li svg').length,6);
});

test('Corrections réelles · la feuille de contraste est chargée sur Mouvement et le vrai portail',()=>{
 for(const [name,doc] of [['mouvement',movement],['portail privé',application]]){
  const links=[...doc.querySelectorAll('link[rel="stylesheet"]')];
  assert.ok(links.some(x=>x.getAttribute('href')?.includes('sde-recette-captures-20261113.css')),'CSS absent : '+name);
  assert.equal(links.at(-1)?.getAttribute('href'),'/vitrine/sde-recette-captures-20261113.css','CSS doit primer sur les anciennes règles : '+name);
 }
 for(const selector of [
  '#axes ol.six-axes > li',
  '#axes ol.six-axes > li :is(h3,p)',
  '.sde-citadelle-command-launch > button > svg',
  '.sde-citadelle-command-launch > button > span',
  '.view .list .row .row-t',
  '.view .list .row .row-m',
  '.view .mnav',
  '.view .card .card-t',
  '#sheet .sheet-b .vy-t',
  '#sheet .sheet-b .vy-grid',
 ]){
  assert.ok(styles.includes(selector),'Sélecteur de correction absent : '+selector);
 }
 assert.match(styles,/-webkit-text-fill-color:#fff5dc!important/);
 assert.match(styles,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(styles,/@media\(max-width:640px\)/);
});

test('Application privée · devise mise à jour sans modifier les règles métier',()=>{
 const source=read('public/index.html');
 assert.match(source,/Rassembler et Unir · Former · Réveiller · Restaurer · Équiper · Envoyer/);
 assert.doesNotMatch(source,/Réveiller · Restaurer · Former · Équiper · Envoyer/);
 assert.match(source,/function annuaireGarnison/);
 assert.match(source,/VUES\.finances = function/);
 assert.match(source,/function tuileVoyant/);
});
