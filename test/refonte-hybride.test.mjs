import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file=(name)=>readFileSync(name,'utf8');
const html=(name)=>file('public/vitrine/'+name+'.html');
const links=(content)=>[...content.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*>/g)].map(x=>x[0]);
const publicPages=[
 'portail','programmes','mouvement','projets','rejoindre','ressources','plus','academy',
 'boutique','prieres','missions-humanitaires','soldiers-voice','soldiers-award',
 'temoignages','404','formulaire','pole-formation','pole-logistique','pole-medias',
 'pole-reveil','pole-social'
];
const hubs=['gouvernance','communaute','calendrier','reseau','soutenir','transparence','newsletter','rechercher'];
const standalone=['connexion-unifiee','espace-membre','engagements'];

test('Refonte SDE : les vingt-et-une pages institutionnelles chargent la finition sans supplanter le thème final',()=>{
 for(const page of publicPages){
  const tags=links(html(page));
  assert.equal(tags.filter(t=>t.includes('refonte-hybride-2026.css')).length,1,page);
  assert.ok(tags.at(-1).includes('sde-sitewide-2026.css'),page+' : feuille sitewide finale');
 }
});
test('Refonte SDE : services autonomes et accès privés correctement reliés',()=>{
 for(const page of hubs)assert.match(html(page),/refonte-hub-2026\.css/,page);
 for(const page of standalone)assert.match(html(page),/refonte-hybride-2026\.css/,page);
 assert.match(html('tableau-membre'),/data-dashboard="membre"/);
 assert.match(html('tableau-administration'),/data-dashboard="administration"/);
 for(const page of ['tableau-membre','tableau-administration'])
   assert.match(html(page),/refonte-hybride-2026\.css/,page);
 assert.match(file('public/index.html'),/refonte-application-2026\.css/);
 assert.match(html('index'),/refonte-hybride-2026\.css/);
 assert.match(html('album-infire'),/refonte-galerie-2026\.css/);
});
test('Refonte SDE : feuilles dédiées présentes et réductions des mouvements respectées',()=>{
 const styles=['refonte-hybride-2026.css','refonte-hub-2026.css',
 'refonte-galerie-2026.css','refonte-application-2026.css'];
 for(const name of styles){
   const css=file('public/vitrine/'+name);
   assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,name);
   assert.ok(css.length>1000,name+' : fichier vide');
 }
 const css=file('public/vitrine/refonte-hybride-2026.css');
 assert.match(css,/data-dashboard="membre"/);
 assert.match(css,/data-dashboard="administration"/);
 const app=file('public/vitrine/refonte-application-2026.css');
 assert.match(app,/data-sde-palette="ivoire"/);
});
