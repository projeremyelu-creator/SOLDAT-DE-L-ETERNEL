import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
test('Le globe interactif est chargé sur l’accueil et sur la page Mouvement, avec le même jeu de versions',()=>{
 const versions=new Set();
 for(const page of ['index','mouvement']){
  const html=read('public/vitrine/'+page+'.html');
  const js=html.match(/globe-sde\.js\?v=(\w+)/),css=html.match(/globe-sde\.css\?v=(\w+)/);
  assert.ok(js&&css,page+' doit charger globe-sde.js et globe-sde.css');
  versions.add(js[1]);versions.add(css[1]);
  assert.match(html,/id="presence"[\s\S]*class="carte-monde/,page+' garde la carte de repli sans JavaScript');
 }
 assert.equal(versions.size,1,'mêmes versions de cache partout');
});
test('Les braises du globe respectent la pause et le mouvement réduit',()=>{
 const js=read('public/vitrine/globe-sde.js'),i=js.indexOf('braises');
 assert.ok(i>0);
 assert.match(js.slice(i-40,i+260),/if \(!still\)/);
});
