import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exécute les véritables fonctions de la page, pas une réimplémentation des exports.
const source=readFileSync('public/index.html','utf8');
const start=source.indexOf('  const celluleSureCSV = (v) =>');
const stop=source.indexOf('  async function telecharger(',start);
assert.ok(start>=0&&stop>start,'Fonctions de protection CSV présentes');
const common=source.slice(start,stop);
const csv=vm.runInNewContext(common+'\n({celluleSureCSV,cellCSV,versCSV})');

const exportsDebut=source.indexOf('    "export-formulaires": async () =>');
const exportsFin=source.indexOf('    "basculer-theme":',exportsDebut);
assert.ok(exportsDebut>=0&&exportsFin>exportsDebut);
const formulaire=source.slice(exportsDebut,exportsFin);
const escapeStart=formulaire.indexOf('const csvEsc = (v) =>');
const escapeStop=formulaire.indexOf('\n        const csv =',escapeStart);
assert.ok(escapeStart>=0&&escapeStop>escapeStart);
const escapeForm=vm.runInNewContext(common+'\n'+formulaire.slice(escapeStart,escapeStop)+'\ncsvEsc');

test('CSV membres, finances et présences : cellules de formule neutralisées',()=>{
  for(const valeur of ['=1+2','+SUM(A1:A2)','-cmd!','@SUM(A1)',' \t=2*3','\n@une-fonction']){
    assert.equal(csv.celluleSureCSV(valeur),"'"+valeur,valeur);
    assert.ok(csv.cellCSV(valeur).includes("'"),valeur);
  }
  assert.equal(csv.celluleSureCSV('Nom normal'),'Nom normal');
  assert.equal(csv.celluleSureCSV('1200'),'1200');
  assert.equal(csv.celluleSureCSV(''),'');
  assert.ok(csv.versCSV([['Nom','Valeur'],['Alice','=5+5']]).includes("Alice;'=5+5"));
});

test('CSV membres : séquences de champs, guillemets et retours à la ligne correctement échappés',()=>{
  assert.equal(csv.cellCSV('Texte;deuxième'),'\"Texte;deuxième\"');
  assert.equal(csv.cellCSV('Elle dit "oui"'),'\"Elle dit \"\"oui\"\"\"');
  assert.equal(csv.cellCSV('Ligne1\nLigne2'),'\"Ligne1\nLigne2\"');
  const output=csv.versCSV([['Matricule','Nom'],['SDE-1','Glazaï']]);
  assert.ok(output.startsWith('\uFEFFMatricule;Nom\r\n'));
  assert.ok(output.includes('SDE-1;Glazaï'));
});

test('CSV Bilan 2026 : cellules dangereuses et texte saisi non exécutables par un tableur',()=>{
  for(const valeur of ['=HYPERLINK("https://example.org")','+1+2','-danger','@foo',' =somme(1,2)']){
    assert.ok(escapeForm(valeur).startsWith("'")||escapeForm(valeur).startsWith("\"'"),valeur);
  }
  assert.equal(escapeForm('Message, autres mots'),'"Message, autres mots"');
  assert.equal(escapeForm('Une "citation"'),'"Une ""citation"""');
  assert.equal(escapeForm('Ligne1\rLigne2'),'"Ligne1\rLigne2"');
});

test('Export paginé du Bilan : erreur réseau, pagination invalide et succès honnête',()=>{
  assert.match(formulaire,/if \(!r\.ok\) throw new Error\(/);
  assert.match(formulaire,/!Array\.isArray\(j\.reponses\)/);
  assert.match(formulaire,/j\.pages > 500/);
  assert.match(formulaire,/await telecharger\("formulaires-sde\.csv", csv\)/);
  assert.doesNotMatch(formulaire,/toast\("Export terminé !"\)/);
});
