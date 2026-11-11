import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8');
test('Soldiers Voice charge le correctif de contraste après le shell historique',()=>{
 const h=read('public/vitrine/soldiers-voice.html');
 const d=new JSDOM(h).window.document;
 const sheets=[...d.querySelectorAll('link[rel="stylesheet"]')].map(el=>el.getAttribute('href'));
 assert.ok(sheets.find(s=>s.includes('sde-soldiers-voice-accessible.css')));
 assert.ok(sheets.findIndex(s=>s.includes('sde-soldiers-voice-accessible.css'))<
  sheets.findIndex(s=>s.includes('sde-shell-public.css')));
 assert.equal(d.querySelectorAll('#musique .sde-initiative-card').length,3);
 assert.ok(d.querySelector('a.sde-voice-lead-cta[href="#rejoindre-voice"]'));
 assert.ok(d.querySelector('[data-sde-contact="soldiers-voice"] input[name="accord"][required]'));
});
test('Soldiers Voice : texte foncé sur cartes ivoire, formulaire lisible et une colonne mobile',()=>{
 const css=read('public/vitrine/sde-soldiers-voice-accessible.css');
 assert.match(css,/\.sde-initiative-card\s*\{/);
 assert.match(css,/background:#fffaf1!important/);
 assert.match(css,/--voice-ink:#142138/);
 assert.match(css,/--voice-body:#354158/);
 assert.match(css,/\.sde-initiative-card :is\(p,span:not\(:first-child\)\)/);
 assert.match(css,/\.sde-initiative-form :is\(input:not\(\[type="checkbox"\]\),select,textarea\)/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
});
test('Poste de commandement : navigation compacte et jamais pleine taille',()=>{
 const css=read('public/vitrine/portail-direct.css');
 const js=read('public/vitrine/portail-direct.js');
 assert.match(css,/@media\(max-width:1100px\)/);
 assert.match(css,/sde-direct-bottom-nav:not\(\[hidden\]\)/);
 assert.match(css,/height:calc\(70px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/max-width:23px!important;max-height:23px!important/);
 assert.match(css,/sde-direct-tabs:not\(\.sde-direct-tabs-open\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(js,/svg\.setAttribute\("width","23"\)/);
 assert.match(js,/svg\.setAttribute\("height","23"\)/);
 assert.match(js,/const items=mode==="membre"\?/);
 assert.match(js,/if\(!allowed\(nom\)\)continue/);
});
