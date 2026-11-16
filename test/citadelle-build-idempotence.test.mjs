import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Test purement visuel : ni mot de passe, ni session, ni requête vers une API.
const buildSource=readFileSync('scripts/build-experience.mjs','utf8');
const start=buildSource.indexOf('const citadelStylePath =');
const end=buildSource.indexOf('// Les déclinaisons fonctionnelles');
assert.ok(start>=0 && end>start,'L’injecteur Citadelle doit rester identifiable');
const installer=new Function('revision',buildSource.slice(start,end)+'\nreturn installerCitadelleFinale;')('qa2027');

const css=['sde-citadelle-celeste-2027.css','sde-citadelle-reference-v4.css',
 'sde-reference-maquette-2026.css','sde-maquettes-integrales.css'];
const js=['sde-citadelle-celeste-2027.js','sde-citadelle-reference-v4.js',
 'sde-reference-maquette-2026.js','sde-maquettes-integrales.js'];

function verifierRendus(nom,html){
 const premier=installer(html);
 const second=installer(premier);
 const troisieme=installer(second);
 assert.equal(second,premier,nom+': recompilation ne doit pas modifier le DOM');
 assert.equal(troisieme,premier,nom+': troisième compilation identique');
 assert.equal((premier.match(/data-sde-citadel-integral=/g)||[]).length,1);
 for(const file of [...css,...js]){
   assert.equal(premier.split(file).length-1,1,nom+': calque graphique unique '+file);
 }
 assert.equal((premier.match(/data-sde-citadel-fonts=/g)||[]).length,3,
   nom+': ne pas dupliquer les préconnexions et feuilles des polices');
 assert.ok(premier.includes('SDE contenu préservé'),nom+': contenu de la page conservé');
}

test('Site public — montage de la maquette stable après trois builds',()=>{
 verifierRendus('public','<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"></head><body><main>SDE contenu préservé</main></body></html>');
});

test('Portail privé — conserver le head implicite et son script de palette',()=>{
 const native='<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n<script>/* Palette des espaces privés */const sauvegarde="</head>";</script>\n<div class="sde-splash">SDE contenu préservé</div></html>';
 verifierRendus('privé',native);
 const html=installer(native);
 assert.equal((html.match(/<head>/g)||[]).length,1);
 assert.equal((html.match(/<body>/g)||[]).length,1);
 assert.ok(html.includes('/* Palette des espaces privés */'));
 assert.ok(html.indexOf('sde-maquettes-integrales.css')<html.indexOf('/* Palette des espaces privés */'));
});

test('Déclinaisons — le build remplace les anciennes versions compilées',()=>{
 assert.ok(buildSource.includes('integralCSSOriginal.split(declinationMarker)[0]'));
 assert.ok(buildSource.includes("readFileSync(declinationCSSFile,'utf8')"));
 assert.ok(buildSource.includes('if(integralCSSCompiled!==integralCSSOriginal)'));
});

test('Programmes — un seul en-tête, sans ancien bandeau TPA empilé',()=>{
 const page=readFileSync('public/vitrine/programmes.html','utf8');
 assert.equal(page.includes('id="sde-event-root"'),false,
   'Le doublon TPA ne doit pas être réinjecté au-dessus de la navigation');
 assert.equal(page.includes('class="infire-takeover"'),false,
   'Aucun bandeau héritage au-dessus du header');
 assert.ok(page.includes('id="tpa-2026"'),'La fiche TPA reste dans le calendrier');
 assert.ok(page.includes('href="/programmes#tpa-2026"'),'Le lien vers la TPA reste présent');
 assert.ok(page.includes('id="agenda"'),'La page conserve l’agenda');
});
