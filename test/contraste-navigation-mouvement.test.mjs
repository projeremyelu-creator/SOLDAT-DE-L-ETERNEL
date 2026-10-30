import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const css=readFileSync('public/vitrine/sde-sitewide-2026.css','utf8');
const home=readFileSync('public/vitrine/portail.html','utf8');
const mouvement=readFileSync('public/vitrine/mouvement.html','utf8');
const missions=readFileSync('public/vitrine/projets.html','utf8');
const interaction=readFileSync('public/vitrine/organigramme-interactif.js','utf8');
const dom=s=>new JSDOM(s,{url:'https://mouvement-sde.org/mouvement',runScripts:'outside-only'});

test('Lisibilité : Accueil, slogan et verset conservent des couleurs contrastées',()=>{
 assert.match(home,/class="m-welcome"/);
 const rules=css.slice(css.indexOf('Correctif de lisibilité — accueil'));
 assert.ok(rules.length>4000);
 assert.match(rules,/\.m-welcome :is\(h1,\.m-italic,p:not\(\.m-kicker\)/);
 assert.match(rules,/\.m-welcome \.m-kicker\{/);
 assert.match(rules,/color:#f8f3e7!important;-webkit-text-fill-color:#f8f3e7!important/);
 assert.match(rules,/\.m-welcome \.m-verset p\{[\s\S]*?color:#29362d!important/);
});

test('Lisibilité : citations, valeurs, axes, histoire, pôles et biographie sur le vert',()=>{
 const rules=css.slice(css.indexOf('Correctif de lisibilité — accueil'));
 for(const selector of ['#mouvement .nom-sde','#mouvement .tete-section h3','#axes .cinq-axes',
  '#histoire .frise','#poles .intro-poles','#leadership .leadership-noms',
  '#responsables .bio-invit'])assert.ok(rules.includes(selector),selector);
 assert.match(rules,/#mouvement \.nom-sde :is\(h3,blockquote\)\{[\s\S]*?color:#fff5df!important/);
 assert.match(rules,/#histoire \.frise \.frise-contenu :is\(h3,p\)\{[\s\S]*?color:#f6efdf!important/);
 assert.match(mouvement,/id="organigramme"/);
});

test('Lisibilité : le pied de page reste contrasté même sans classe de palette',()=>{
 const rules=css.slice(css.indexOf('Correctif de lisibilité — accueil'));
 assert.match(rules,/html body\.sde-unifie footer\.site-footer/);
 assert.match(rules,/html body\.sde-unifie footer\.site-footer a,/);
 assert.match(rules,/background:#172b25!important/);
 assert.match(rules,/color:#f5f0e4!important/);
 assert.match(rules,/color:#f3d18a!important/);
 for(const s of [home,mouvement,missions])assert.match(s,/class="site-footer/);
});

test('Missions : montants et message de trésorerie lisibles sur le fond vert',()=>{
 const doc=dom(missions).window.document;
 assert.equal(doc.querySelectorAll('#soutenir .montants li').length,4);
 assert.match(css,/#soutenir \.tete-section \.montants li\{/);
 assert.match(css,/color:#253429!important;-webkit-text-fill-color:#253429!important/);
 assert.match(css,/#soutenir \.enveloppe>div\[style\*="text-align:center"\]>p/);
});

test('Missions : IN FIRE et médiathèque ont des accès directs vers des pages existantes',()=>{
 const doc=dom(missions).window.document;
 const cards=[...doc.querySelectorAll('#projets .projet-carte')];
 assert.equal(cards.length,4);
 assert.equal(cards[0].querySelector('h3 a')?.getAttribute('href'),'/programmes#infire');
 assert.equal(cards[0].querySelector('.sde-projet-cta')?.getAttribute('href'),'/programmes#infire');
 assert.equal(cards[1].querySelector('h3 a')?.getAttribute('href'),'/enseignements');
 assert.equal(cards[1].querySelector('.sde-projet-cta')?.getAttribute('href'),'/enseignements');
 const worker=readFileSync('src/worker.js','utf8');
 assert.ok(worker.includes('"/programmes": "/vitrine/programmes.html"'));
 assert.ok(worker.includes('"/enseignements": "/vitrine/ressources.html"'));
 assert.match(css,/\.sde-projet-cta\{[\s\S]*?min-height:44px/);
 assert.match(css,/\.sde-projet-cta\):focus-visible/);
});

test('Organigramme : les 8 niveaux fonctionnent au clic, avec sélection unique',()=>{
 const d=dom(mouvement);try{
  const {window:w}=d,document=w.document;
  w.eval(interaction);
  document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  const nodes=[...document.querySelectorAll('#organigramme [data-org-node]')];
  assert.equal(nodes.length,8);
  assert.ok(nodes.every(n=>n.getAttribute('role')==='button'&&n.getAttribute('tabindex')==='0'));
  nodes[2].click();
  assert.equal(nodes[2].getAttribute('aria-pressed'),'true');
  assert.equal(nodes[0].getAttribute('aria-pressed'),'false');
  assert.match(document.querySelector('#sde-org-detail').textContent,/Pôle 1/);
  nodes[5].click();
  assert.equal(nodes[2].getAttribute('aria-pressed'),'false');
  assert.equal(nodes[5].getAttribute('aria-pressed'),'true');
  assert.match(document.querySelector('#sde-org-detail').textContent,/Pôle 4/);
 }finally{d.window.close()}
});

test('Organigramme : Entrée/Espace, retour vocal et mouvement réduit',()=>{
 const d=dom(mouvement);try{
  const {window:w}=d,document=w.document;
  w.eval(interaction);
  document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const node=document.querySelector('#organigramme [data-org-node]');
  for(const key of ['Enter',' ']){
   node.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
   assert.equal(node.getAttribute('aria-pressed'),'true');
  }
  assert.ok(node.hasAttribute('aria-label'));
  assert.equal(document.getElementById('sde-org-detail').getAttribute('aria-live'),'polite');
  assert.match(css,/@keyframes sde-org-sparkle/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/body\[data-motion="paused"\]/);
 }finally{d.window.close()}
});

test('Modifications isolées : ni formulaires ni permissions privées modifiés',()=>{
 assert.ok(!css.includes('#sde-operations-nav'));
 assert.ok(!css.includes('.ref-toolbar'));
 const source=readFileSync('public/vitrine/mouvement.html','utf8');
 assert.match(source,/organigramme-interactif\.js/);
 assert.ok(source.includes('aria-pressed="false"'));
 assert.ok(missions.includes('Contacter la trésorerie'));
});
