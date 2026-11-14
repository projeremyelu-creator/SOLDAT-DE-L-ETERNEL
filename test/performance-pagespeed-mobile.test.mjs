import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync('public/vitrine/portail.html','utf8');
const doc=new JSDOM(html).window.document;
const css=readFileSync('public/vitrine/sde-citadelle-celeste-2027.css','utf8');
const audit=readFileSync('scripts/audit-public-mobile.mjs','utf8');

test("PageSpeed : afficher une affiche TPA compacte sur mobile sans casser l'affiche officielle",()=>{
 assert.ok(doc.querySelector('.sde-shell-event a[href="/programmes#tpa-2026"]'),'bandeau compact vers la fiche officielle');
 assert.equal(doc.querySelectorAll('img[src="/vitrine/illus/tpa-2026.webp"]').length,0,'l’affiche lourde est évitée sur l’accueil');
 const preload=doc.querySelector('link[rel="preload"][as="image"]');
 assert.equal(preload,null);
 const old='public/vitrine/illus/tpa-2026.webp';
 assert.ok(existsSync(old));
 const mobile='public/vitrine/illus/tpa-2026-mobile.webp';
 if(existsSync(mobile))assert.ok(statSync(mobile).size<=statSync(old).size);
 assert.ok(doc.querySelector('#prochain-rendez-vous time[datetime]'));
});

test('Le thème est découvert directement, sans @import en cascade après les autres CSS',()=>{
 const link=[...doc.querySelectorAll('head link[rel=stylesheet]')].map(x=>x.getAttribute('href'));
 const premium=link.findIndex(x=>x.includes('/vitrine/sde-premium-public.css'));
 const accueil=link.findIndex(x=>x.includes('/vitrine/sde-accueil-premium.css'));
 assert.ok(premium>=0&&premium<accueil);
 assert.ok(link.includes(link.find(x=>x.includes('sde-shell-public.css'))),'navigation commune conservée');
 assert.ok(link.at(-1).includes('sde-citadelle-celeste-2027.css'),'thème 2+3 responsive découvert en dernier');
 for(const legacy of ['sde-maquette-hero.css','sde-six-maquettes-2027.css','sde-fusion.css'])assert.ok(!link.some(x=>x.includes(legacy)),'ancien style '+legacy);
 assert.doesNotMatch(html,/<style>[^<]*@import[^<]*sde-premium-public\.css/i);
});

test('Le contraste des cartes est explicite et les images de fond mobiles ne bloquent plus l’affichage',()=>{
 for(const name of ['ap-next','ap-upcoming','ap-mission','ap-panel','ap-indicateurs']){
  assert.ok(css.includes('.'+name),name);
 }
 assert.ok(css.includes('-webkit-text-fill-color:#0D1B38!important'));
 assert.ok(css.includes('background:#FAF7F0!important'));
 assert.match(css,/@media\(max-width:860px\)/);
 assert.ok(css.includes('.ap-hero .ap-hero-bg'));
 assert.ok(css.includes('hero-sde-640.webp'),'photo mobile optimisée de la direction cinématique 2+3');
 assert.ok(audit.includes('homepageTextContrast'));
 assert.ok(audit.includes('posterImageSource'));
 assert.ok(audit.includes('x.ratio<4.5'));
});

test('Le format mobile est produit par le pipeline sans dépendance réseau tierce',()=>{
 const packageJson=JSON.parse(readFileSync('package.json','utf8'));
 assert.ok(packageJson.scripts['prebuild:experience'].startsWith('node scripts/optimiser-affiche-mobile.mjs'));
 assert.ok(packageJson.scripts['prebuild:experience'].includes('node scripts/optimiser-archives-sde.mjs'));
 const generator=readFileSync('scripts/optimiser-affiche-mobile.mjs','utf8');
 assert.ok(generator.includes('libwebp'));
 assert.ok(generator.includes("copyFileSync(source,cible)"));
 assert.ok(generator.includes('480:-2'));
});
