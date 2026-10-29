import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
test('Typographie : espace membre et administration partagent les familles de marque, plus d’Arial sur le compte à rebours',()=>{
 const ref=read('frontend/reference.css');
 assert.match(ref,/body\.sde-reference-member\{--ref-title:"Saira Condensed"/);
 assert.match(ref,/body\.sde-reference-admin\{--ref-title:"Saira Condensed"/);
 assert.match(ref,/body\.sde-reference-login :is\(h1,h2,h3,h4\),body\.sde-reference-member :is\(h1,h2,h3,h4\)\{font-family:var\(--ref-title\)!important/);
 const premium=read('frontend/premium.css');
 assert.doesNotMatch(premium,/\.hero-calendar-countdown>(b|span)\{[^}]*Arial/);
});
