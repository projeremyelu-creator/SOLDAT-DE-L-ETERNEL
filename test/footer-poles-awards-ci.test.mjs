import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8');

test('Le CSS commun reste strictement identique au style de la vitrine après les pôles détaillés',()=>{
  const document=new JSDOM(read('public/vitrine/index.html')).window.document;
  assert.equal(read('public/vitrine/mpa-base.css'),document.querySelector('style')?.textContent);
});

test('Le fond du pied de page n’hérite plus du sélecteur ID transparent',()=>{
  const css=read('public/vitrine/ivoire-pages.css');
  assert.ok(!css.includes(':is(main,#contenu,.site-footer,.pied)'));
  assert.match(css,/html body\.sde-ivoire :is\(main,#contenu\)/);
  assert.match(css,/background:#172b25!important/);
  const global=read('public/vitrine/sde-sitewide-2026.css');
  const foot=global.slice(global.indexOf('Correction structurelle du pied de page public.'));
  assert.ok(foot.length>1900);
  assert.match(foot,/background:#172b25!important;background-color:#172b25!important/);
  assert.match(foot,/color:#f7f3e8!important/);
  assert.match(foot,/color:#f6d58e!important/);
  assert.match(foot,/footer\.site-footer> :is\(section,div\)/);
});

test('Les pages publiques chargent toutes les nouvelles versions du CSS',()=>{
  const pages=['portail','mouvement','programmes','projets','rejoindre','ressources','plus',
    'academy','boutique','prieres','missions-humanitaires','soldiers-voice',
    'temoignages','404','formulaire','soldiers-award',
    'soutenir','transparence','gouvernance','reseau','communaute',
    'calendrier','newsletter','rechercher'];
  for(const page of pages){
    const html=read('public/vitrine/'+page+'.html');
    assert.ok(/sde-sitewide-2026\.css\?v=[^"'\s<>]+/.test(html),page);
    if(html.includes('ivoire-pages.css'))
      assert.ok(/ivoire-pages\.css\?v=[^"'\s<>]+/.test(html),page);
  }
});

test('Les cinq pôles officiels et leurs critères restent présents',()=>{
  const html=read('public/vitrine/index.html');
  assert.ok(html.includes('Département Évangélisation de rue'));
  assert.ok(html.includes('100 intercesseurs réguliers'));
  assert.ok(html.includes('Département Intercession et réveil'));
  const doc=new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('[data-pole]').length>=5,true);
});

test('SOLDIER’S AWARD : page publique, quatre catégories et jury conservés',()=>{
  const doc=new JSDOM(read('public/vitrine/soldiers-award.html')).window.document;
  const text=doc.body.textContent;
  for(const name of ['Soldat d’Or','Soldat du Réveil','Soldat Compatissant','Soldat de l’Année',
    'Jérémy Octave','Amy Berté','Daniel DO BI','à désigner'])assert.ok(text.includes(name),name);
  assert.match(text,/une fois par an/);
  assert.match(read('src/worker.js'),/\/soldiers-award/);
  assert.match(read('public/sitemap.xml'),/\/soldiers-award/);
});
