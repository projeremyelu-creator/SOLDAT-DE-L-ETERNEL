import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const html=read('public/vitrine/portail.html');
const style=read('public/vitrine/sde-maquettes-integrales.css');
const pwa=read('public/vitrine/pwa-public.js');
const audit=read('scripts/audit-public-mobile.mjs');

test('Citadelle : vue panoramique recadrée de la maquette PNG originale, sans entête incrustée',()=>{
 assert.match(html,/<svg class="sde-pixel-city-layer" viewBox="645 113 530 282"/);
 assert.match(html,/<image href="\/vitrine\/maquettes\/citadelle-celeste-sde\.png"/);
 assert.doesNotMatch(html,/<div class="sde-pixel-city-layer"/);
 assert.match(style,/\.sde-pixel-city-layer image/);
 assert.match(style,/background:none!important;background-image:none!important/);
 assert.match(audit,/heroInlineSource/);
});
test('SDE mobile : vrais raccourcis compacts, sans supprimer les modules',()=>{
 for(const token of ['.sdu-grid .sdu-card','.sdu-card .sdu-art','.sde-page-actions a','.sde-privacy-note','#presence .carte-monde']) assert.ok(style.includes(token),token);
 assert.match(html,/id="digital-universe"/);
 assert.match(html,/id="poles-accueil"/);
 assert.match(html,/id="titre-accueil"/);
});
test('Le bouton d’installation est disponible dans Plus et les données de connexion restent hors du code',()=>{
 assert.match(pwa,/document\.querySelector\("\.sde-shell-quick"\)/);
 assert.match(pwa,/installEvent\.prompt\(\)/);
 assert.match(pwa,/button\.remove\(\)/);
 assert.doesNotMatch(pwa,/SDE_QA_(ADMIN|MEMBER)_PASSWORD/);
});


test('Régression audit 360/390 : filtres tactiles et stabilité du header pré-montage',()=>{
 const css=read('public/vitrine/sde-maquettes-integrales.css');
 const shell=read('public/vitrine/sde-shell-public.css');
 assert.match(css,/\.sdu-filters button\{[\s\S]*?min-height:46px!important/);
 assert.ok(shell.includes('STABILITÉ PRE-MONTAGE DESKTOP'));
 assert.ok(shell.includes('height:66px!important;min-height:66px!important;max-height:66px!important'));
});
