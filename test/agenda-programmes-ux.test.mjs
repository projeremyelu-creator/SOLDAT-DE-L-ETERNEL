import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync('public/vitrine/programmes.html','utf8');
const css=readFileSync('public/vitrine/ivoire-pages.css','utf8');
const js=readFileSync('public/vitrine/subpage.js','utf8');
const doc=new JSDOM(html).window.document;

test('Agenda public : cartes, titres et filtres conservés',()=>{
  const agenda=doc.querySelector('section#agenda');
  assert.ok(agenda,'section Agenda présente');
  assert.equal(agenda.querySelector('h2')?.textContent,'Les prochains rendez-vous');
  assert.equal(agenda.querySelectorAll('#agenda-filtres button[data-filtre]').length,4);
  const cards=[...agenda.querySelectorAll('#agenda-liste .programme.rdv')];
  assert.equal(cards.length,3);
  assert.deepEqual(cards.map(c=>c.dataset.type),['Rencontre','Prière','Formation']);
  assert.match(cards[0].textContent,/IN FIRE 2026/);
  assert.match(cards[1].textContent,/Traversée Prophétique Mensuelle/);
  assert.match(cards[2].textContent,/Soldiers Academy/);
  assert.equal(cards[0].querySelector('[data-ics]')?.dataset.ics,'infire');
  assert.equal(cards[0].querySelector('.rdv-actions a')?.getAttribute('href'),'#infire');
});

test('Agenda public : mêmes classes sur toutes les cartes, styles locaux',()=>{
  const cards=[...doc.querySelectorAll('#agenda-liste > article')];
  assert.ok(cards.every(c=>c.classList.contains('programme')&&c.classList.contains('rdv')&&c.classList.contains('revele')));
  const section=css.slice(css.indexOf('Page Programmes — Agenda : cartes harmonisées'));
  assert.ok(section.length>4500);
  assert.match(section,/body\.sde-ivoire\[data-sde-page="programmes"\] #agenda \.programme\.rdv/);
  assert.match(section,/body\.sde-ivoire\[data-sde-page="programmes"\] #agenda \.rdv-actions :is\(a,button\)/);
  assert.match(section,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(section,/@media\(max-width:600px\)/);
});

test('Agenda public : filtres, bouton calendrier et dates non altérés',()=>{
  assert.match(js,/function setupProgrammes\(\)/);
  assert.match(js,/buttons\?\.addEventListener\("click"/);
  assert.match(js,/list\?\.querySelectorAll\("\.rdv"\)/);
  assert.match(js,/button\.dataset\.ics/);
  assert.match(html,/Samedi · 8h30/);
  assert.match(html,/Église MADEG/);
  assert.match(html,/data-ics="infire"/);
});

test('Agenda public : navigation accessible et animations désactivables',()=>{
  const section=css.slice(css.indexOf('Page Programmes — Agenda : cartes harmonisées'));
  assert.match(section,/scroll-margin-top/);
  assert.match(section,/min-height:44px/);
  assert.match(section,/focus-visible/);
  assert.match(section,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(section,/body\[data-motion=paused\]/);
  assert.ok(doc.querySelector('a.skip[href="#contenu"]'));
});
