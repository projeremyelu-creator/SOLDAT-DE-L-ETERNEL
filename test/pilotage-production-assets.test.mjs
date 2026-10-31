import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';

const read=p=>readFileSync(p,'utf8');

test('Bandeau privé : marque institutionnelle conservée dans la source et le bundle',()=>{
 const source=read('frontend/operations.jsx');
 const bundle=read('public/vitrine/operations-assets/portail-operations.js');
 assert.match(source,/SDE - MOUVEMENT/);
 assert.ok(bundle.includes('SDE - MOUVEMENT'),'Le bundle publié doit afficher la marque SDE - MOUVEMENT');
 assert.ok(!source.includes('SDE DIGITAL — MILITAIRE PREMIUM'));
});

test('Événement phare : animation effective dans la feuille CSS compilée',()=>{
 const source=read('frontend/reference.css');
 const compiled=read('public/vitrine/sde-experience.css');
 for(const token of ['sde-feature-sheen','ref-feature']){
   assert.ok(source.includes(token),token+' absent du source');
   assert.ok(compiled.includes(token),token+' absent du CSS compilé');
 }
 assert.ok(source.includes('prefers-reduced-motion:reduce'));
 assert.ok(source.includes('data-motion="paused"'));
});

test("Un ancien Worker ne sert jamais un bundle d'une nouvelle révision",async()=>{
 const res=await worker.fetch(
  new Request("https://mouvement-sde.org/_v/abcdef123456/vitrine/sde-experience.css"),
  {ASSETS:{fetch:async()=>{throw Error('La requête ne doit pas accéder aux actifs')}}},
  {waitUntil(){}}
 );
 assert.equal(res.status,404);
 assert.match(res.headers.get('cache-control'),/no-store/);
 const source=read('src/worker.js');
 const build=read('scripts/version-chemins.mjs');
 assert.ok(source.includes('m[1].toLowerCase() !== ASSET_REVISION'));
 assert.ok(build.includes("writeFileSync('src/build-revision.js'"));
 assert.ok(build.includes('String.fromCharCode(10)'));
});
