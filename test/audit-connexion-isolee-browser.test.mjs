import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');

test('Connexion : aucun header public ni maquette ne sont présents dans le HTML livré',()=>{
 const doc=new JSDOM(read('public/vitrine/connexion-unifiee.html')).window.document;
 assert.equal(doc.querySelector('.site-header'),null);
 assert.equal(doc.querySelector('.ref-login-art'),null);
 assert.equal(doc.querySelector('.infire-takeover'),null);
 assert.ok(doc.querySelector('#form-connexion'));
 assert.ok(doc.querySelector('#form-inscription'));
});
test('Audit navigateur : élément public absent équivaut à élément non visible',()=>{
 const audit=read('scripts/audit-public-mobile.mjs');
 assert.match(audit,/const shown=selector=>\[\.\.\.document\.querySelectorAll\(selector\)\]\.some\(el=>/);
 assert.match(audit,/if\(visible\.header\|\|visible\.reference\)/);
 assert.doesNotMatch(audit,/visible\.header!=='none'/);
 assert.doesNotMatch(audit,/visible\.reference!=='none'/);
});
