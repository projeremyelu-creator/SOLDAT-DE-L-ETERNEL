import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const css=readFileSync('public/vitrine/sde-fusion.css','utf8');
const audit=readFileSync('scripts/audit-public-mobile.mjs','utf8');
const poles=['pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation'];

test('Cinq pôles : une même carte ivoire et une correction de contraste ciblée',()=>{
 const selecteur='html body.sde-unifie.sde-subpage.sde-ivoire.sde-pole #contenu .sde-initiative-card';
 assert.ok(css.includes(selecteur));
 assert.match(css,/background:#fffaf0!important/);
 assert.match(css,/-webkit-text-fill-color:#332449!important/);
 assert.match(css,/-webkit-text-fill-color:#281549!important/);
 for(const name of poles){
  const doc=new JSDOM(readFileSync('public/vitrine/'+name+'.html','utf8')).window.document;
  assert.ok(doc.body.classList.contains('sde-pole'),name);
  assert.ok(doc.querySelector('#vision .sde-initiative-card p'),name);
  assert.equal(doc.querySelectorAll('#vision .sde-initiative-card').length,2,name);
  const links=[...doc.querySelectorAll('head link[rel=stylesheet]')].map(x=>x.getAttribute('href'));
  assert.ok(links.at(-1).includes('sde-fusion.css'),name+' : correctif chargé dans la dernière feuille');
 }
});

test('Contrôle Chromium : couleur réellement peinte et rapport de contraste AA',()=>{
 assert.ok(audit.includes('poleCardsContrast'));
 assert.ok(audit.includes('webkitTextFillColor'));
 assert.ok(audit.includes('CONTRASTE_POLE'));
 assert.ok(audit.includes('x.contrast<4.5'));
 for(const name of poles)assert.ok(audit.includes("path:'/"+name+"'"),name);
});
