import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/vitrine/tableau-membre.html','utf8');
const js=readFileSync('public/vitrine/sde-maquettes-integrales.js','utf8');
const css=readFileSync('public/vitrine/sde-maquettes-integrales.css','utf8');

test('quatre indicateurs membres, sans nombres inventés dans le HTML',()=>{
 const section=html.match(/<div class="sde-dash-metrics">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((section.match(/<article>/g)||[]).length,4);
 for(const id of ['m-matricule','m-presences','m-prieres','m-modules-valides']){
  assert.ok(section.includes('id="'+id+'"'),id);
 }
 assert.match(section,/<strong id="m-modules-valides">—<\/strong>/);
});
test('modules validés provenant de l API Academy sous session et non de nombres de maquette',()=>{
 assert.ok(js.includes('"/api/mon-parcours-academy"'),"API Academy existante");
 assert.ok(js.includes('if(!auth?.connecte)return'),"Aucune donnée hors session");
 assert.ok(js.includes('const modulesMetric=$("#m-modules-valides")'));
 assert.ok(js.includes('Number.isFinite(complete)&&complete>=0?String(complete):"—"'));
 assert.ok(!js.includes('id="m-modules-valides">12'),"Aucun nombre fictif inscrit");
});
test('quatre colonnes ordinateur et deux colonnes mobile',()=>{
 const at=css.lastIndexOf('Quatre indicateurs membre comme la maquette');
 assert.ok(at>0);
 const block=css.slice(at);
 assert.match(block,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(block,/@media\(max-width:760px\)/);
 assert.match(block,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.ok(block.includes('article:nth-child(4)'));
});
