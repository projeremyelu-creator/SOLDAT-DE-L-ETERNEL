import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const lire=f=>readFileSync(f,'utf8');
const html=lire('public/vitrine/portail.html');
const worker=lire('src/worker.js');
const phare=JSON.parse(lire('public/vitrine/evenement-phare.json'));

test('Accueil premium : sections 01 à 08 dans l’ordre demandé',()=>{
 const repères=[
  ['01 en-tête','class="site-header"'],['02 hero','class="ap-hero"'],['03 programmes','id="programmes-accueil"'],
  ['04 pôles','id="poles-accueil"'],['05 missions et impact','id="impact-accueil"'],['06 prières et témoignages','id="priere-temoignages"'],
  ['07 galerie','id="galerie-accueil"'],['08 soutenir et rejoindre','id="rejoindre-accueil"'],['pied de page','class="site-footer']
 ];
 let précédent=-1;
 for(const [nom,clé] of repères){
  const position=html.indexOf(clé);
  assert.ok(position>précédent,`${nom} absent ou hors ordre`);
  précédent=position;
 }
 for(const n of ['03','04','05','06','07','08'])assert.ok(html.includes(`<span class="ap-num">${n}</span>`),'numéro '+n);
});

test('Accueil premium : en-tête avec logo, menu compact, recherche et connexion',()=>{
 const header=html.slice(html.indexOf('<header class="site-header"'),html.indexOf('</header>'));
 for(const part of ['class="site-brand"','class="site-menu"','href="/rechercher"','class="site-portal-cta"','Connexion<span','class="site-burger"'])assert.ok(header.includes(part),part);
 assert.match(header,/Mon Portail S\.D\.E/);
});

test('Accueil premium : hero institutionnel, trois boutons, une seule affiche de programme phare',()=>{
 const hero=html.slice(html.indexOf('class="ap-hero"'),html.indexOf('id="programmes-accueil"'));
 assert.match(hero,/<h1[^>]*>Le Réveil Spirituel des Nations<\/h1>/);
 assert.ok(hero.includes('Discipline · Unité · Impact'));
 assert.ok(hero.includes('logo-sde.webp'));
 assert.equal((hero.match(/class="ap-btn[^"]*"/g)||[]).length,3,'trois boutons principaux');
 for(const libellé of ['Découvrir SDE','Rejoindre','Prochain programme'])assert.ok(hero.includes(libellé),libellé);
 assert.equal((html.match(/<img[^>]+tpa-2026\.webp/g)||[]).length,1,'affiche unique, sans répétition');
 assert.equal((html.match(/<link rel="preload" as="image" href="\/vitrine\/illus\/tpa-2026\.webp"/g)||[]).length,1);
 assert.ok(!html.includes('infire-takeover'),'plus de bandeau doublon');
 assert.ok(!html.includes('sde-event-root'),'plus de second bloc TPA à l’accueil');
});

test('Accueil premium : la fiche événement centrale alimente l’accueil sans valeur divergente',()=>{
 assert.equal(phare.id,'tpa-2026');
 assert.ok(html.includes(phare.dateLibelle),'date');
 assert.ok(html.includes(phare.lieu),'lieu');
 assert.ok(html.includes(phare.description),'description');
 assert.ok(html.includes(phare.inscription),'lien d’inscription');
 assert.ok(html.includes(phare.debut),'horodatage');
 assert.ok(existsSync('public'+phare.affiche),'affiche présente');
 assert.ok(existsSync('public/vitrine/photos/hero-sde-1280.webp'),'image de fond discrète');
});

test('Accueil premium : cinq pôles, missions, témoignages sans contenu inventé, galerie harmonisée',()=>{
 const poles=html.slice(html.indexOf('id="poles-accueil"'),html.indexOf('id="impact-accueil"'));
 assert.equal((poles.match(/class="sde-pole-officiel-lien"/g)||[]).length,5);
 const galerie=html.slice(html.indexOf('id="galerie-accueil"'),html.indexOf('id="rejoindre-accueil"'));
 assert.match(galerie,/class="ap-galerie"/);
 assert.ok((galerie.match(/<img /g)||[]).length>=3);
 assert.ok(!/class="ap-card"[^>]*>[^<]*<img[^>]*src="[^"]*(avatar|portrait)/i.test(html));
 const témoignages=html.slice(html.indexOf('id="priere-temoignages"'),html.indexOf('id="galerie-accueil"'));
 assert.ok(témoignages.includes('/temoignages'),'les témoignages renvoient à la page validée');
 const panneau=témoignages.slice(témoignages.indexOf('<h3>Témoignages</h3>'));
 assert.doesNotMatch(panneau,/<blockquote|«/,'aucun témoignage rédigé à la place des membres : seuls les textes validés sont publiés sur la page dédiée');
});

test('Accueil premium : indicateurs issus de /api/impact, agrégats seulement, aucune donnée personnelle',()=>{
 assert.match(worker,/p === "\/api\/impact" && req\.method === "GET"/);
 const fonction=worker.slice(worker.indexOf('async function apiImpact'),worker.indexOf('async function apiImpact')+1600);
 const champs=[...fonction.matchAll(/^\s+(\w+):/gm)].map(m=>m[1]);
 for(const interdit of ['email','telephone','nom','prenom','adresse','mot_de_passe','hash'])assert.ok(!champs.includes(interdit),interdit);
 for(const attendu of ['membresActifs','pays','formations','missionsEnCours','rendezVousAVenir'])assert.ok(fonction.includes(attendu),attendu);
 assert.match(fonction,/prive !== true/,'les rendez-vous privés ne sont pas comptés');
 assert.match(fonction,/cache-control/);
 const script=lire('public/vitrine/sde-accueil-premium.js');
 assert.ok(!script.includes('innerHTML'),'texte brut uniquement');
 assert.ok(script.includes('Number(d[t[0]]) > 0'),'les valeurs nulles ne sont pas affichées');
});

test('Accueil premium : charte Fusion chargée en dernier, scripts sans inline, tri des trois couleurs',()=>{
 const feuilles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(feuilles.at(-1).includes('sde-fusion.css'));
 assert.ok(feuilles.some(f=>f.includes('sde-accueil-premium.css')));
 assert.ok(html.includes('sde-accueil-premium.js'));
 const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/g)];
 assert.equal(inline.length,0,'CSP : aucun script en ligne');
 const css=lire('public/vitrine/sde-accueil-premium.css');
 for(const jeton of ['--ap-navy0','--ap-mil1','--ap-bg1','prefers-reduced-motion','max-width:620px'])assert.ok(css.includes(jeton),jeton);
 assert.ok(html.includes('ap-navy')&&html.includes('ap-mil')&&html.includes('ap-dark'),'bleu nuit, vert militaire, violet');
});

test('Accueil premium : identifiants uniques et un seul h1',()=>{
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 const doublons=ids.filter((id,i)=>ids.indexOf(id)!==i);
 assert.deepEqual([...new Set(doublons)],[]);
 assert.equal((html.match(/<h1[\s>]/g)||[]).length,1);
});

test('/api/impact : totaux calculés sur de vraies fiches, doublons de pays fusionnés, rien de privé exposé',async()=>{
 const {default:app}=await import('../src/worker.js');
 const futur='2099-01-01';
 const data={
  membres:[{id:'m1',data:{nom:'Secret',email:'a@b.c',actif:true}},{id:'m2',data:{nom:'X',actif:false}},{id:'m3',data:{nom:'Y'}}],
  garnisons:[{id:'g1',data:{pays:"Côte d'Ivoire"}},{id:'g2',data:{pays:" côte d'ivoire "}},{id:'g3',data:{pays:'Bénin'}},{id:'g4',data:{}}],
  formations:[{id:'f1',data:{}}],
  projets:[{id:'p1',data:{statut:'En cours'}},{id:'p2',data:{statut:'Terminé'}}],
  evenements:[{id:'e1',data:{date:futur,type:'Conférence'}},{id:'e2',data:{date:futur,type:'Conférence',prive:true}},{id:'e3',data:{date:'2000-01-01',type:'Conférence'}},{id:'e4',data:{date:futur,type:'Réunion interne'}}]
 };
 const env={DB:{prepare:()=>({bind:(parent)=>({all:async()=>({results:(data[parent]||[]).map(x=>({id:x.id,data:JSON.stringify(x.data)}))})})})},ASSETS:{fetch:async()=>new Response('x')}};
 const res=await app.fetch(new Request('https://mouvement-sde.org/api/impact'),env,{waitUntil(){}});
 assert.equal(res.status,200);
 assert.match(res.headers.get('cache-control'),/max-age=300/);
 const body=await res.json();
 assert.deepEqual({...body,majLe:undefined},{ok:true,membresActifs:2,pays:2,formations:1,missionsEnCours:1,rendezVousAVenir:1,majLe:undefined});
 assert.ok(!JSON.stringify(body).match(/Secret|a@b\.c/));
});


test('Stabilité du titre premium à 1100 et 1280 px avant chargement de la police',()=>{
 const css=lire('public/vitrine/sde-accueil-premium.css');
 assert.ok(css.includes('@media(min-width:1000px)'));
 assert.match(css,/\.ap-hero \.ap-hero-copy h1\s*\{\s*min-height:3\.15em;/);
 assert.ok(html.includes('class="ap-hero-copy"'));
 assert.ok(html.includes('id="titre-accueil"'));
});


test('CLS premium 1024px : en-tête et affiche ancrés avant et après le chargement de Cinzel',()=>{
 const css=lire('public/vitrine/sde-accueil-premium.css');
 const marker=css.lastIndexOf('Recette Chromium 1024 px (03/11/2026)');
 assert.ok(marker>0,'Règle anti-décalage absente');
 const fix=css.slice(marker);
 assert.match(fix,/@media \(min-width:1000px\) and \(max-width:1100px\)/);
 assert.match(fix,/\.ap-hero-inner\{\s*align-items:start;\s*min-height:840px;/);
 assert.match(fix,/\.ap-poster\{\s*align-self:start;/);
 assert.match(fix,/\.ap-eyebrow\{\s*min-height:2\.7em;/);
 assert.match(fix,/@media \(max-width:999px\)/);
});
