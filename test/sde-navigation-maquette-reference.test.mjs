import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync('public/vitrine/sde-shell-public.js','utf8');
const css=readFileSync('public/vitrine/sde-maquettes-integrales.css','utf8');
test('le menu de la maquette garde six rubriques publiques aux destinations correctes',()=>{
 for(const pair of [
  '["/","Accueil"]','["/mouvement","Le Mouvement"]','["/programmes","Programmes"]',
  '["/#poles-accueil","Nos 5 Pôles"]','["/missions-humanitaires","Missions"]',
  '["/soutenir","Soutenir"]'
 ])assert.ok(shell.includes(pair),pair);
 assert.ok(shell.includes('make("span","sde-shell-portal-label","Portail")'));
 assert.ok(shell.includes('link("/portail"'));
});
test('le portail doré ne disparaît pas sur ordinateur, le mobile conserve une navigation priorisée',()=>{
 const i=css.lastIndexOf('Navigation de la maquette de référence : 6 rubriques');
 assert.ok(i>0,'nouvelle règle finale absente');
 const last=css.slice(i);
 assert.ok(last.includes('body.sde-premium-home.sde-shell-mounted .sde-shell-portal'));
 assert.ok(last.includes('display:inline-flex!important'));
 assert.ok(last.includes('background:linear-gradient(180deg,#ffe081,#ecac29)!important'));
 assert.ok(last.includes('@media(max-width:800px)'));
 assert.ok(last.includes('display:none!important'));
});
