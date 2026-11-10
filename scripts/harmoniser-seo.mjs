import {readFileSync,writeFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const base='https://mouvement-sde.org';
const image=base+'/vitrine/fire-generation-1080.jpg';
const poleTitles={
 '/pole-reveil':'Réveil et évangélisation | SDE',
 '/pole-social':'Impact social et humanitaire | SDE',
 '/pole-logistique':'Logistique et organisation | SDE',
 '/pole-medias':'Communication, médias et relations extérieures | SDE',
 '/pole-formation':'Formation, développement et entrepreneuriat | SDE'
};
const pages={
 '/':'public/vitrine/portail.html','/mouvement':'public/vitrine/mouvement.html','/programmes':'public/vitrine/programmes.html',
 '/academy':'public/vitrine/academy.html','/academy-programme-24':'public/vitrine/academy-programme-24.html','/enseignements':'public/vitrine/ressources.html',
 '/missions':'public/vitrine/projets.html','/priere':'public/vitrine/prieres.html','/contact':'public/vitrine/rejoindre.html',
 '/temoignages':'public/vitrine/temoignages.html','/soldiers-voice':'public/vitrine/soldiers-voice.html','/soldiers-award':'public/vitrine/soldiers-award.html',
 '/missions-humanitaires':'public/vitrine/missions-humanitaires.html','/confidentialite':'public/vitrine/confidentialite.html','/formulaire':'public/vitrine/formulaire.html',
 '/rubriques':'public/vitrine/plus.html','/boutique':'public/vitrine/boutique.html','/pole-reveil':'public/vitrine/pole-reveil.html',
 '/pole-social':'public/vitrine/pole-social.html','/pole-logistique':'public/vitrine/pole-logistique.html','/pole-medias':'public/vitrine/pole-medias.html',
 '/pole-formation':'public/vitrine/pole-formation.html','/album-infire':'public/vitrine/album-infire.html','/soutenir':'public/vitrine/soutenir.html',
 '/transparence':'public/vitrine/transparence.html','/gouvernance':'public/vitrine/gouvernance.html','/reseau':'public/vitrine/reseau.html',
 '/communaute':'public/vitrine/communaute.html','/calendrier':'public/vitrine/calendrier.html','/newsletter':'public/vitrine/newsletter.html',
 '/rechercher':'public/vitrine/rechercher.html',
 '/mediatheque':'public/vitrine/mediatheque-publique.html','/soldiers-tv':'public/vitrine/soldiers-tv.html','/soldier-quest':'public/vitrine/soldier-quest.html'
};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tag=(key,value)=>`<meta ${key} content="${esc(value)}">`;
function upsert(html,pattern,replacement){return pattern.test(html)?html.replace(pattern,replacement):html.replace('</head>',replacement+'\n</head>')}

for(const [route,file] of Object.entries(pages)){
 let html=readFileSync(file,'utf8')
  .replaceAll('Mouvement Prophético-Apostolique Soldat de l’Éternel','Mouvement Prophético-Apostolique Soldats de l’Éternel')
  .replaceAll("Mouvement Prophético-Apostolique Soldat de l'Éternel","Mouvement Prophético-Apostolique Soldats de l'Éternel");
 const parsed=new JSDOM(html).window.document;
 let title=parsed.title.trim()||'Mouvement SDE — Soldats de l’Éternel';
 if(route==='/')title="SDE — Le Réveil Spirituel des Nations | Soldats de l'Éternel";
 else {
  const brand=" | Soldats de l'Éternel (SDE)";
  const prefix=title.split(/\s+[|—]\s+/)[0].trim();
  if(route.startsWith('/pole-'))title=poleTitles[route];
  else if(!/Soldats? de l['’]Éternel/.test(title))title=prefix+brand;
  if(!route.startsWith('/pole-')&&title.length>70){
   const available=70-brand.length;
   title=(prefix.length>available?prefix.slice(0,available-1).trimEnd()+'…':prefix)+brand;
  }
 }
 const description=route==='/'?"Mouvement Prophético-Apostolique Soldats de l’Éternel (SDE) : découvrir la vision 2027, Exode 33:14, les cinq pôles, les programmes, les missions et Soldiers Academy.":(parsed.querySelector('meta[name="description"]')?.content?.trim()||'Découvrez la vision, les programmes et les actions du Mouvement Prophético-Apostolique Soldats de l’Éternel (SDE).');
 const currentImage=route==='/'?base+'/vitrine/photos/hero-sde-1280.webp':(parsed.querySelector('meta[property="og:image"]')?.content?.trim()||image);
 const canonical=base+(route==='/'?'/':route);
 html=upsert(html,/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
 html=upsert(html,/<meta\b[^>]*\bname=["']description["'][^>]*>/i,tag('name="description"',description));
 html=upsert(html,/<link\b[^>]*\brel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${canonical}">`);
 const metas=[
  ['property="og:type"','website'],['property="og:title"',title],['property="og:description"',description],['property="og:url"',canonical],['property="og:image"',currentImage],
  ['name="twitter:card"','summary_large_image'],['name="twitter:title"',title],['name="twitter:description"',description],['name="twitter:image"',currentImage]
 ];
 for(const [key,value] of metas){
  const attr=key.split('=')[0],name=key.match(/"([^"]+)"/)[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  html=upsert(html,new RegExp(`<meta\\b[^>]*\\b${attr}=["']${name}["'][^>]*>`,'i'),tag(key,value));
 }
 html=html.replace(/<script id="sde-webpage-jsonld"[\s\S]*?<\/script>\s*/i,'');
 const schema={
  '@context':'https://schema.org','@type':'WebPage','@id':canonical+'#page',url:canonical,name:title,description,inLanguage:'fr-CI',
  isPartOf:{'@id':base+'/#website'},about:{'@id':base+'/#organisation'},publisher:{'@id':base+'/#organisation'}
 };
 if(route==='/newsletter'){
  // Cette page avait déjà une politique sans aucun script en ligne. Le
  // balisage Microdata conserve cette garantie tout en déclarant WebPage.
  html=html.replace(/<html\b([^>]*)>/i,(all,attrs)=>/\bitemscope\b/i.test(attrs)?all:`<html${attrs} itemscope itemtype="https://schema.org/WebPage">`);
 }else html=html.replace('</head>',`<script id="sde-webpage-jsonld" type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>\n</head>`);
 writeFileSync(file,html);
}
console.log(`SEO harmonisé sur ${Object.keys(pages).length} pages publiques.`);
