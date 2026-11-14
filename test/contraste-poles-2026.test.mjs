import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const css=readFileSync('public/vitrine/sde-citadelle-celeste-2027.css','utf8');
const audit=readFileSync('scripts/audit-public-mobile.mjs','utf8');
const poles=['pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation'];

test('Cinq pôles : une même carte ivoire et une correction de contraste ciblée',()=>{
 const selecteur='html body.sde23-native.sde-unifie.sde-subpage.sde-ivoire.sde-pole #contenu .sde-initiative-card';
 assert.ok(css.includes(selecteur));
 assert.match(css,/background:#FAF7F0!important/);
 assert.match(css,/-webkit-text-fill-color:#2B3851!important/);
 assert.match(css,/-webkit-text-fill-color:#0D1B38!important/);
 for(const name of poles){
  const doc=new JSDOM(readFileSync('public/vitrine/'+name+'.html','utf8')).window.document;
  assert.ok(doc.body.classList.contains('sde-pole'),name);
  assert.ok(doc.querySelector('#vision .sde-initiative-card p'),name);
  assert.equal(doc.querySelectorAll('#vision .sde-initiative-card').length,2,name);
  const links=[...doc.querySelectorAll('head link[rel=stylesheet]')].map(x=>x.getAttribute('href'));
  assert.equal(links.filter(x=>x.includes('sde-fusion.css')).length,0,name+' : style Fusion retiré');
  assert.ok(links.at(-1).includes('sde-citadelle-reference-v4.css'),name+' : thème 2+3 final');
  assert.ok(links.some(x=>x.includes('sde-shell-public.css')),name+' : navigation commune conservée');
 }
});

test('Contrôle Chromium : couleur réellement peinte et rapport de contraste AA',()=>{
 assert.ok(audit.includes('poleCardsContrast'));
 assert.ok(audit.includes('webkitTextFillColor'));
 assert.ok(audit.includes('CONTRASTE_POLE'));
 assert.ok(audit.includes('x.contrast<4.5'));
 for(const name of poles)assert.ok(audit.includes("path:'/"+name+"'"),name);
});
