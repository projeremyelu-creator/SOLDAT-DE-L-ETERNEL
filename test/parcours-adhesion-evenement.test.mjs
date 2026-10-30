import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {fixture} from './helpers/d1.mjs';

test('adhésion : champs requis côté serveur, programme et motivation conservés pour le secrétariat',async()=>{
 const f=fixture();try{
  const base={objet:'Devenir membre',nom:'Awa Test',tel:'+2250700000000',email:'awa@example.org',ville:'Abidjan',pole:'Formation & développement intégral',programme:'Soldiers Academy',motivation:'Grandir dans la foi',source:'mouvement-sde.org/vitrine/rejoindre'};
  assert.equal((await f.call('/api/engager',null,'POST',{...base,email:''})).status,400);
  assert.equal((await f.call('/api/engager',null,'POST',{...base,pole:''})).status,400);
  assert.equal((await f.call('/api/engager',null,'POST',{...base,motivation:''})).status,400);
  assert.equal((await f.call('/api/engager',null,'POST',base)).status,200);
  const row=f.sql.prepare('SELECT objet,pole,message FROM engagements').get();
  assert.equal(row.pole,base.pole);assert.match(row.message,/Soldiers Academy/);assert.match(row.message,/Grandir dans la foi/);
 }finally{f.close()}
});
test('événement : un contact est demandé et le bouton annonce un enregistrement',()=>{
 const d=new JSDOM(readFileSync('public/vitrine/programmes.html','utf8')).window.document;
 assert.equal(d.querySelector('#v-tel').required,true);
 assert.equal(d.querySelector('#v-accord').required,true);
 assert.match(d.querySelector('#f-venue button[type=submit]').textContent,/Confirmer ma venue/);
 assert.match(d.querySelector('#f-venue').parentElement.textContent,/08 h 00/);
});
