import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');
const htmlFiles=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
 const path=join(dir,entry.name);
 return entry.isDirectory()?htmlFiles(path):entry.isFile()&&entry.name.endsWith('.html')?[path]:[];
});

test('1 — chaque formulaire HTML déclare POST, même si JavaScript ne démarre pas',()=>{
 for(const file of htmlFiles('public')){
  const source=read(file);
  for(const match of source.matchAll(/<form\b[^>]*>/gi))
   assert.match(match[0],/\bmethod=["']post["']/i,`${file}: ${match[0].slice(0,100)}`);
 }
});

test('2 — la CSP générale est complète et une politique plus stricte est observée en Report-Only',()=>{
 const worker=read('src/worker.js');
 const security=worker.slice(worker.indexOf('const CSP_PUBLIQUE'),worker.indexOf('/* ───────── Migration'));
 for(const directive of ['default-src','script-src','style-src','img-src','font-src','connect-src','media-src','frame-src','worker-src','manifest-src','object-src','base-uri','frame-ancestors','form-action','upgrade-insecure-requests'])
  assert.ok(security.includes(directive),directive);
 assert.ok(security.includes('content-security-policy-report-only'));
});

test('3 — les points publics de collecte affichent une notice et la politique complète dans le formulaire',()=>{
 const pages=['academy.html','communaute.html','connexion-unifiee.html','formulaire.html','gouvernance.html','missions-humanitaires.html','newsletter.html','prieres.html','rejoindre.html','reseau.html','soldiers-voice.html','soutenir.html','temoignages.html'];
 for(const name of pages){
  const doc=new JSDOM(read('public/vitrine/'+name)).window.document;
  for(const form of doc.querySelectorAll('form')){
   assert.ok(form.querySelector('.sde-privacy-note'),`${name} #${form.id||'(sans id)'}: notice absente`);
   assert.ok(form.querySelector('a[href="/confidentialite"]'),`${name} #${form.id||'(sans id)'}: lien absent`);
  }
 }
});

test('4 — les actifs versionnés sont immuables et les pages simples ne téléchargent plus React',()=>{
 const worker=read('src/worker.js');
 assert.match(worker,/public, max-age=31536000, immutable/);
 const lightweight=['portail.html','mouvement.html','programmes.html','projets.html','prieres.html','rejoindre.html','temoignages.html','soldiers-voice.html','soldiers-award.html','missions-humanitaires.html','boutique.html','plus.html'];
 for(const name of lightweight){
  const source=read('public/vitrine/'+name);
  assert.doesNotMatch(source,/sde-experience\.js/,name);
  assert.match(source,/sde-public-ui-lite\.js\?v=/,name);
 }
 assert.ok(read('public/vitrine/sde-public-ui-lite.js').length<12000,'le contrôleur public doit rester léger');
});

test('5 — les cibles tactiles et la recette 360/390 px sont explicites',()=>{
 const css=read('public/vitrine/sde-sitewide-2026.css');
 assert.match(css,/\.sde-privacy-note[\s\S]*color:\s*#f5f0e4/i);
 assert.match(css,/@media\s*\(max-width:\s*390px\)/i);
 assert.match(css,/min-(?:block-size|height):\s*44px/i);
 const audit=read('scripts/audit-public-mobile.mjs');
 assert.match(audit,/\[360,\s*390\]/);
 assert.match(audit,/touchTargets/);
});

test('6 — chaque URL indexée expose canonical, Open Graph, Twitter et WebPage JSON-LD',()=>{
 const sitemap=read('public/sitemap.xml');
 const routes=[...sitemap.matchAll(/<loc>https:\/\/mouvement-sde\.org(\/[^<]*)?<\/loc>/g)].map(x=>x[1]||'/');
 const worker=read('src/worker.js');
 const routeBlock=worker.match(/const pagesPubliques = \{([\s\S]*?)\n      \};/)?.[1]||'';
 const mapping=Object.fromEntries([...routeBlock.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map(x=>[x[1],'public'+x[2]]));
 mapping['/']='public/vitrine/portail.html';
 for(const route of routes){
  const file=mapping[route];
  assert.ok(file,`route non mappée: ${route}`);
  const doc=new JSDOM(read(file)).window.document;
  assert.ok(doc.title&&doc.title.length<=70,`${route}: title absent ou trop long`);
  assert.ok(doc.querySelector('meta[name="description"]')?.content,`${route}: description`);
  assert.equal(doc.querySelector('link[rel="canonical"]')?.href,`https://mouvement-sde.org${route==='/'?'/':route}`,`${route}: canonical`);
  assert.equal(doc.querySelector('meta[property="og:url"]')?.content,`https://mouvement-sde.org${route==='/'?'/':route}`,`${route}: og:url`);
  for(const selector of ['meta[property="og:title"]','meta[property="og:description"]','meta[property="og:image"]','meta[name="twitter:card"]','meta[name="twitter:title"]','meta[name="twitter:description"]','meta[name="twitter:image"]'])
   assert.ok(doc.querySelector(selector)?.content,`${route}: ${selector}`);
  const schemas=[...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(x=>{try{const value=JSON.parse(x.textContent);return value['@graph']||[value]}catch{return[]}});
  assert.ok(schemas.some(x=>x['@type']==='WebPage'||x['@type']==='WebSite')||doc.documentElement.getAttribute('itemtype')==='https://schema.org/WebPage',`${route}: données structurées WebPage`);
 }
});
