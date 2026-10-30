import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
test('Graphiques : dégradé de marque, animation calme, polices de marque',()=>{
 const js=read('frontend/operations.jsx');
 assert.match(js,/animation:calm\(\)\?false:\{duration:950,easing:'easeOutQuart'\}/);
 assert.match(js,/createLinearGradient\(0,chartArea\.top,0,chartArea\.bottom\)/);
 assert.doesNotMatch(js,/font:\{family:'Arial'/);
 assert.match(js,/tooltip:\{backgroundColor/);
});
test('Cadres translucides pour laisser passer l’ambiance',()=>{
 const css=read('frontend/reference.css');
 assert.match(css,/\.sde-reference-admin \.shell\{background:linear-gradient\(103deg,#0d1a30e8/);
});
