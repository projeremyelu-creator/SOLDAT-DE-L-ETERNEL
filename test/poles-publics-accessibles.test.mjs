import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=p=>readFileSync(p,'utf8');
const paths=['pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation'];
const docs=paths.map(p=>new JSDOM(read('public/vitrine/'+p+'.html'),{url:'https://mouvement-sde.org/'+p}).window.document);
const page=()=>new JSDOM(read('public/vitrine/mouvement.html')).window.document;

test('Les cinq fiches publiques officielles existent avec URL canonique unique',()=>{
  assert.equal(paths.length,5);
  docs.forEach((d,i)=>{
    assert.equal(d.querySelector('link[rel="canonical"]')?.href,'https://mouvement-sde.org/'+paths[i]);
    assert.ok(d.querySelector('main#contenu h1'),paths[i]);
    assert.ok(d.querySelector('form[data-pole-engager]'),paths[i]);
    assert.ok(d.querySelector('link[href*="pole-page.css"]'),paths[i]);
    assert.ok(d.querySelector('script[src*="pole-page.js"]'),paths[i]);
    assert.ok(d.querySelector('footer.site-footer'),paths[i]);
    assert.ok(d.querySelector('link[href*="sde-sitewide-2026.css?v="]'),paths[i]);
    assert.ok(d.querySelector('link[href*="ivoire-pages.css?v="]'),paths[i]);
  });
});

test('Mouvement : les cinq cartes mènent directement aux fiches, sans renvoi intermédiaire',()=>{
  const cards=[...page().querySelectorAll('#poles .pole')];
  assert.equal(cards.length,5);
  cards.forEach((el,i)=>{
    assert.equal(el.tagName,'A');
    assert.equal(el.getAttribute('href'),'/'+paths[i]);
    assert.equal(el.getAttribute('data-pole'),String(i+1));
    assert.ok(el.textContent.includes('Pôle '+(i+1)));
  });
});

test('Chaque fiche reprend la vision, la mission et les départements de référence',()=>{
 const count=[4,4,5,5,5];
 docs.forEach((d,i)=>{
   for(const id of ['vision','objectifs','domaines','departements','profil','engager','coordination'])
     assert.ok(d.getElementById(id),paths[i]+' #'+id);
   const dep=d.querySelectorAll('#departements .sde-initiative-card');
   assert.equal(dep.length,count[i],paths[i]);
   assert.ok([...dep].every(n=>n.querySelector('a[href="#engager"][data-dept]')),paths[i]);
   assert.ok(d.querySelectorAll('#objectifs .sde-pole-kpi').length>=4,paths[i]);
 });
});

test('Formulaires : contact, consentement et sélection de département',()=>{
 docs.forEach((d,i)=>{
   const f=d.querySelector('form[data-pole-engager]');
   assert.equal(f.dataset.slug,paths[i]);
   assert.ok(f.dataset.pole);
   for(const field of ['nom','contact','departement','message','accord','piege'])
     assert.ok(f.querySelector('[name="'+field+'"]'),paths[i]+' '+field);
   assert.ok(f.querySelector('[name="nom"]').required);
   assert.ok(f.querySelector('[name="contact"]').required);
   assert.ok(f.querySelector('[name="accord"]').required);
   assert.ok(f.querySelector('[role="status"][aria-live="polite"]'));
 });
 const js=read('public/vitrine/pole-page.js');
 assert.ok(js.includes('fetch("/api/engager"'));
 assert.ok(js.includes('objet: "Servir dans un pôle"'));
 assert.ok(js.includes('source: "mouvement-sde.org/"'));
 assert.ok(js.includes('form.elements.accord?.checked'));
});

test('Liens, routes Worker et sitemap : tous les pôles sont accessibles',()=>{
 const worker=read('src/worker.js');
 const sitemap=read('public/sitemap.xml');
 const rubriques=read('public/vitrine/plus.html');
 paths.forEach(path=>{
   assert.ok(worker.includes('"/'+path+'": "/vitrine/'+path+'.html"'),path);
   assert.ok(sitemap.includes('https://mouvement-sde.org/'+path+'</loc>'),path);
 });
 assert.ok(rubriques.includes('href="/mouvement#poles"'));
 const script=read('scripts/recette-production.mjs');
 paths.forEach(path=>assert.ok(script.includes("{path:'/"+path+"',type:'page-publique'}"),path));
});

test('Aucune page ne présente les objectifs chiffrés comme des résultats acquis',()=>{
 docs.forEach((d,i)=>{
   const objectifs=d.querySelector('#objectifs');
   assert.match(objectifs.textContent,/vise|objectifs|performance/i,paths[i]);
   assert.ok(d.querySelector('#coordination'),paths[i]);
 });
});
