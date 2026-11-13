import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync,readdirSync} from 'node:fs';
const lire=f=>readFileSync(f,'utf8');
const page=n=>lire(`public/vitrine/${n}.html`);
const PAGES={mouvement:'spi',programmes:'mis',soutenir:'cmd',temoignages:'spi',rejoindre:'cmd'};

test('Pages publiques : feuille premium chargée avant la charte Fusion, famille de couleur déclarée',()=>{
 for(const [n,fam] of Object.entries(PAGES)){
  const h=page(n),feuilles=[...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  const iF=feuilles.findIndex(f=>f.includes('sde-fusion.css')),iP=feuilles.findIndex(f=>f.includes('sde-pages-premium.css'));
  assert.ok(iP>=0&&iP<iF,n+' : feuille premium avant la charte Fusion');
  const apres=feuilles.slice(iF+1);
  assert.ok(apres.every(f=>f.includes('sde-shell-public.css')||(n==='mouvement'&&(f.includes('sde-six-maquettes-2027.css')||f.includes('sde-recette-captures-20261113.css')))||(n==='soutenir'&&(f.includes('sde-standalone-clarte.css')||f.includes('sde-maquette-hero.css')))),n+' : uniquement les surcouches visuelles approuvées après Fusion');
  assert.match(h,new RegExp(`<body[^>]*class="[^"]*sde-pages-premium[^"]*"[^>]*data-fam="${fam}"`),n+' : famille '+fam);
  assert.equal((h.match(/class="pg-tabs/g)||[]).length,1,n+' : une seule navigation interne');
  assert.equal((h.match(/<h1[\s>]/g)||[]).length,1,n+' : un seul h1');
 }
 const css=lire('public/vitrine/sde-pages-premium.css');
 for(const k of ['--fam-cmd:#1b2f6b','--fam-spi:#5b21b6','--fam-mis:#3f6b34','prefers-reduced-motion','max-width:620px'])assert.ok(css.includes(k),k);
});

test('Pages publiques : chaque lien de navigation interne mène à une section existante',()=>{
 for(const n of Object.keys(PAGES)){
  const h=page(n),nav=h.slice(h.indexOf('class="pg-tabs'),h.indexOf('</nav>',h.indexOf('class="pg-tabs')));
  const cibles=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
  assert.ok(cibles.length>=3,n);
  for(const id of cibles)assert.ok(h.includes(`id="${id}"`),`${n} : #${id} introuvable`);
 }
});

test('Notre Mouvement : vision, valeurs, histoire, présence, leadership et organigramme dans la navigation',()=>{
 const h=page('mouvement');
 for(const id of ['mouvement','fondements','axes','poles','histoire','presence','leadership','organigramme'])assert.ok(h.includes(`href="#${id}"`),id);
});

test('Programmes & Agenda : synchronisation publique, calendrier mensuel et fiche TPA centrale',()=>{
 const h=page('programmes');
 assert.ok(h.includes('href="/api/agenda-public.ics"'));
 assert.ok(h.includes('webcal://mouvement-sde.org/api/agenda-public.ics'));
 assert.ok(h.includes('href="/calendrier"'));
 assert.ok(h.includes('sde-fiche-phare.js'));
 assert.ok(!h.includes('href="/api/calendrier.ics"'),'pas de flux privé');
 const js=lire('public/vitrine/sde-fiche-phare.js');
 assert.ok(js.includes('/vitrine/evenement-phare.json'));
 assert.ok(!js.includes('innerHTML'));
 const phare=JSON.parse(lire('public/vitrine/evenement-phare.json'));
 assert.ok(h.includes(phare.inscription),'lien d’inscription identique à la fiche centrale');
 assert.ok(h.includes('datetime="'+phare.debut+'"'));
});

test('Soutenir : paiements affichés selon l’état réel du serveur, reçus et transparence, aucun chiffre inventé',()=>{
 const h=page('soutenir'),js=lire('public/vitrine/sde-soutenir-statut.js');
 assert.ok(h.includes('id="pay-liste"')&&h.includes('id="pay-note"'));
 assert.ok(js.includes('/api/sde-demarches/statut')&&js.includes('paiementsActifs===true')&&js.includes('canauxActifs'));
 for(const id of ['missions','etapes','reglements','recus','formulaire'])assert.ok(h.includes(`id="${id}"`),id);
 assert.match(h,/Aucun reçu n’est émis tant qu’un don n’est pas confirmé/);
 assert.ok(h.includes('href="/transparence"'));
 assert.doesNotMatch(h,/\d[\d\s]*\s?FCFA(?! \()/,'aucun montant collecté affiché');
});

test('Témoignages : cartes validées uniquement, catégories, médias sûrs',async()=>{
 const h=page('temoignages'),js=lire('public/vitrine/sde-temoignages.js');
 assert.ok(h.includes('id="tm-grille"')&&h.includes('id="tm-filtres"'));
 assert.ok(js.includes('/api/temoignages-publics')&&!js.includes('innerHTML'));
 assert.match(h,/relu et validé par un responsable/);
 assert.ok(h.includes('<option>Guérison et restauration</option>'));
 const {default:app}=await import('../src/worker.js');
 const data={annonces:[
  {id:'a1',data:{type:'temoignage',publie:true,vitrine:true,auteur:'Marie K.',texte:'Dieu m’a restaurée.',categorie:'Guérison et restauration',creeLe:1790000000000,media:{type:'photo',url:'/vitrine/photos/x.webp'}}},
  {id:'a2',data:{type:'temoignage',publie:true,vitrine:false,auteur:'Privé',texte:'Réservé aux membres'}},
  {id:'a3',data:{type:'temoignage',publie:true,vitrine:true,auteur:'Paul',texte:'Vidéo',categorie:'Inconnue',media:{type:'video',url:'https://youtu.be/abc'}}},
  {id:'a4',data:{type:'temoignage',publie:true,vitrine:true,auteur:'X',texte:'Image externe',media:{type:'photo',url:'https://exemple.test/x.png'}}},
  {id:'a5',data:{type:'temoignage',publie:true,vitrine:true,auteur:'Y',texte:'Chemin piégé',media:{type:'photo',url:'/vitrine/../secret.png'}}},
  {id:'a6',data:{type:'annonce',publie:true,vitrine:true,texte:'Autre annonce'}}]};
 const env={DB:{prepare:()=>({bind:(parent)=>({all:async()=>({results:(data[parent]||[]).map(x=>({id:x.id,data:JSON.stringify(x.data)}))})})})},ASSETS:{fetch:async()=>new Response('x')}};
 const res=await app.fetch(new Request('https://mouvement-sde.org/api/temoignages-publics'),env,{waitUntil(){}});
 const b=await res.json();
 assert.equal(res.status,200);
 assert.deepEqual(b.temoignages.map(t=>t.id).sort(),['a1','a3','a4','a5']);
 assert.ok(!JSON.stringify(b).includes('Réservé aux membres'),'rien sans marquage vitrine');
 const parId=Object.fromEntries(b.temoignages.map(t=>[t.id,t]));
 assert.equal(parId.a1.media.url,'/vitrine/photos/x.webp');
 assert.equal(parId.a3.categorie,'Autre parcours de foi','catégorie inconnue ramenée à la liste');
 assert.equal(parId.a3.media.type,'video');
 assert.equal(parId.a4.media,null,'image externe refusée (CSP)');
 assert.equal(parId.a5.media,null,'chemin remontant refusé');
 const plus=lire('public/vitrine/portail-plus.js'),svc=lire('src/portal-services.js');
 assert.ok(plus.includes('Publier aussi sur le site public'));
 assert.ok(svc.includes('vitrine:b.vitrine===true'),'le marquage public vient d’une décision explicite');
});

test('Contact & adhésion : référence, étapes visibles et suivi sans donnée personnelle',async()=>{
 const h=page('rejoindre'),sub=lire('public/vitrine/subpage.js'),js=lire('public/vitrine/sde-suivi-demande.js');
 for(const id of ['envoi-ref','envoi-ref-bloc','form-suivi','s-ref','s-contact','suivi-res','suivi'])assert.ok(h.includes(`id="${id}"`),id);
 assert.ok(h.includes('aria-label="Étapes de votre demande"'));
 assert.ok(sub.includes('data.reference'));
 assert.ok(js.includes('/api/engager/suivi')&&!js.includes('innerHTML'));
 const {default:app}=await import('../src/worker.js');
 const ligne={cree:1790000000000,objet:'Devenir membre',tel:'+225 07 78 68 45 67',email:'Alice@Exemple.test',traite:0};
 const env={DB:{prepare:(sql)=>({bind:(...p)=>({first:async()=>/FROM engagements/.test(sql)&&p[0]===12?ligne:null,all:async()=>({results:[]}),run:async()=>({})}),run:async()=>({})})},ASSETS:{fetch:async()=>new Response('x')}};
 const appel=async q=>{const r=await app.fetch(new Request('https://mouvement-sde.org/api/engager/suivi?'+q),env,{waitUntil(){}});return [r.status,await r.json()]};
 let [st,b]=await appel('ref=SDE-12&contact=4567');
 assert.equal(st,200);assert.equal(b.statut,'Reçue par le secrétariat');assert.equal(b.etape,2);
 assert.ok(!JSON.stringify(b).match(/Alice|4567|07 78|Exemple/),'aucune donnée personnelle renvoyée');
 [st,b]=await appel('ref=12&contact=alice@exemple.test');assert.equal(st,200);
 for(const q of ['ref=12&contact=0000','ref=13&contact=4567','ref=12&contact=bob@exemple.test'])assert.equal((await appel(q))[0],404,q);
 assert.equal((await appel('ref=abc&contact=4567'))[0],400);
 assert.equal((await appel('ref=12&contact=12'))[0],400);
 ligne.traite=1;[st,b]=await appel('ref=12&contact=4567');assert.equal(b.etape,3);assert.equal(b.statut,'Traitée');
});

test('Agenda public .ics : événements publics à venir et programme phare, jamais de réunion privée',async()=>{
 const {default:app}=await import('../src/worker.js');
 const jour=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 const data={evenements:[
  {id:'e1',data:{date:jour,heure:'08:30',type:'Conférence',titre:'Rencontre, SDE',lieu:'Abidjan'}},
  {id:'e2',data:{date:jour,type:'Conférence',titre:'Interne secret',prive:true}},
  {id:'e3',data:{date:jour,type:'Réunion interne',titre:'Comité'}},
  {id:'e4',data:{date:'2000-01-01',type:'Conférence',titre:'Passé'}},
  {id:'e5',data:{date:jour,heure:'20:00',type:'Prière et intercession',titre:'TPA 2026 (copie)'}}]};
 const phare={id:'tpa-2026',titre:'Traversée Prophétique Annuelle — TPA 2026',titreCourt:'TPA 2026',debut:'2099-12-18T20:00:00+00:00',lieu:'Google Meet',description:'Prière'};
 const env={DB:{prepare:()=>({bind:(parent)=>({all:async()=>({results:(data[parent]||[]).map(x=>({id:x.id,data:JSON.stringify(x.data)}))})})})},ASSETS:{fetch:async()=>new Response(JSON.stringify(phare))}};
 const r=await app.fetch(new Request('https://mouvement-sde.org/api/agenda-public.ics'),env,{waitUntil(){}});
 const ics=await r.text();
 assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/calendar/);
 assert.ok(ics.startsWith('BEGIN:VCALENDAR')&&ics.trimEnd().endsWith('END:VCALENDAR'));
 assert.ok(ics.includes('SUMMARY:Rencontre\\, SDE'));
 for(const interdit of ['Interne secret','Comité','Passé','copie'])assert.ok(!ics.includes(interdit),interdit);
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2,'un rendez-vous public + le programme phare, sans doublon');
 assert.ok(ics.includes('DTSTART:20991218T200000Z'));
});

test('Notre Mouvement : film de présentation hébergé, sous la limite des ressources, sans lecture automatique',()=>{
 const h=page('mouvement'),mp4='public/vitrine/media/presentation-sde.mp4',affiche='public/vitrine/media/presentation-sde-affiche.webp';
 assert.ok(existsSync(mp4)&&existsSync(affiche));
 assert.ok(statSync(mp4).size<25*1024*1024,'limite Cloudflare de 25 Mo par fichier');
 assert.equal(readFileSync(mp4).subarray(4,8).toString(),'ftyp','conteneur MP4 valide');
 const video=h.match(/<video[^>]*>/)[0];
 assert.match(video,/\bcontrols\b/);assert.match(video,/preload="none"/);assert.match(video,/poster="\/vitrine\/media\/presentation-sde-affiche\.webp"/);
 assert.doesNotMatch(video,/autoplay/);
 assert.ok(h.includes('<source src="/vitrine/media/presentation-sde.mp4" type="video/mp4">'));
 assert.ok(h.includes('id="film-description"')&&video.includes('aria-describedby="film-description"'),'description accessible');
 assert.ok(h.includes('href="#film"')&&h.includes('id="film"'));
 assert.doesNotMatch(lire('public/sw-public.js').match(/PUBLIC_ASSETS\s*=\s*([^;]+);/)[1],/mp4/,'les vidéos ne passent pas par le cache du service worker');
});

test('Film de présentation : bouton sur l’accueil (hors des quatre actions) et rappel sur Contact',()=>{
 const home=page('portail'),contact=page('rejoindre'),film=page('mouvement');
 assert.ok(film.includes('id="film"'),'cible du lien');
 const hero=home.slice(home.indexOf('class="ap-hero"'),home.indexOf('</section>',home.indexOf('class="ap-hero"')));
  const actions=hero.match(/<nav class="ap-actions[^"]*">[\s\S]*?<\/nav>/)?.[0]||'';
  assert.equal((actions.match(/<a /g)||[]).length,4,'quatre actions principales de la refonte Work 2+3');
  for(const route of ['/mouvement','/contact#rejoindre','/programmes#agenda','/portail'])assert.ok(actions.includes('href="'+route+'"'),'Action absente : '+route);
 assert.ok(actions.includes('href="/contact#rejoindre"')&&actions.includes('href="/mouvement"'), 'découverte et adhésion');
 assert.ok(hero.includes('href="/mouvement#film"')&&hero.includes('data-film-link'),'film présent en lien secondaire distinct des CTA');
 assert.ok(contact.includes('id="film-contact"')&&contact.includes('href="/mouvement#film"'));
 assert.ok(contact.indexOf('id="film-contact"')<contact.indexOf('id="rejoindre" aria-labelledby'),'avant le formulaire, hors des sections de texte légal');
 assert.ok(lire('public/vitrine/sde-accueil-premium.css').includes('.ap-film'));
});

test('Réseaux sociaux : TikTok et Facebook officiels dans tous les pieds de page, la page Contact et les données structurées',()=>{
 const TT='https://www.tiktok.com/@mouvement.sde',FB='https://www.facebook.com/share/1GkJmWSyqj/',WA='https://whatsapp.com/channel/0029Vb7BYdL3WHTVwJ0bwC0G',GRP='https://chat.whatsapp.com/EoI9QvyDSqHGTfJzpa1rJT',DM='https://wa.me/2250778689573';
 const pages=readdirSync('public/vitrine').filter(f=>f.endsWith('.html')).filter(f=>lire('public/vitrine/'+f).includes('class="site-footer'));
 assert.ok(pages.length>=20,'pieds de page détectés');
 const hub=readdirSync('public/vitrine').filter(f=>f.endsWith('.html')&&lire('public/vitrine/'+f).includes('class="hub-footer"'));
 assert.ok(hub.length>=10,'pages de type hub détectées');
 for(const f of hub){const h=lire('public/vitrine/'+f),pied=h.slice(h.indexOf('class="hub-footer"'),h.indexOf('</footer>',h.indexOf('class="hub-footer"')));assert.ok(pied.includes(TT)&&pied.includes(FB)&&pied.includes(WA),f+' : réseaux dans le pied de page hub')}
 for(const f of pages){
  const h=lire('public/vitrine/'+f),pied=h.slice(h.indexOf('<footer'),h.indexOf('</footer>'));
  assert.ok(pied.includes(`href="${TT}" target="_blank" rel="noopener noreferrer"`),f+' : TikTok');
  assert.ok(pied.includes(`href="${FB}" target="_blank" rel="noopener noreferrer"`),f+' : Facebook');
  assert.ok(pied.includes(`href="${WA}" target="_blank" rel="noopener noreferrer"`),f+' : Chaîne WhatsApp');
 }
 const c=page('rejoindre');
 assert.ok(c.includes('class="pg-reseaux"')&&c.includes('TikTok @mouvement.sde'));
 for(const l of [WA,GRP,DM])assert.ok(c.includes(`href="${l}" target="_blank" rel="noopener noreferrer"`),'Contact : '+l);
 assert.doesNotMatch(c,/chat\.whatsapp\.com\/[A-Za-z0-9]+\?/,'lien de groupe sans paramètres de suivi');
 assert.ok(lire('public/vitrine/index.html').includes(`"sameAs":["${TT}","${FB}","${WA}"]`));
 assert.doesNotMatch(TT,/[?&](_r|_t)=/,'sans paramètres de suivi');
});

test('Fiche TPA unique : le tableau de bord lit evenement-phare.json et garde un secours identique',async()=>{
 const {PHARE_DEFAUT,pharePublie,finPromotion}=await import('../frontend/evenement-phare.js');
 const fiche=JSON.parse(lire('public/vitrine/evenement-phare.json'));
 for(const k of ['id','titre','titreCourt','debut','dateLibelle','heure','lieu','description','affiche','fiche'])
  assert.equal(PHARE_DEFAUT[k],fiche[k],'le secours reprend la fiche centrale : '+k);
 assert.equal(finPromotion(fiche.debut),Date.parse('2026-12-19T00:00:00Z'),'fin de promotion = minuit du jour J');
 // une fiche modifiée est reprise ; des valeurs invalides ou dangereuses sont ignorées
 const maj=pharePublie({titre:'Nouveau titre',debut:'2027-01-08T20:00:00+00:00',dateLibelle:'Vendredi 8 janvier 2027',heure:'19h30',affiche:'/vitrine/illus/x.webp',fiche:'/programmes#x'});
 assert.equal(maj.titre,'Nouveau titre');assert.equal(maj.heure,'19h30');assert.equal(maj.fiche,'/programmes#x');
 const mauvais=pharePublie({titre:'',debut:'pas une date',affiche:'https://exemple.test/x.png',fiche:'//evil.test',lieu:42,dateLibelle:'x'.repeat(500)});
 assert.deepEqual(mauvais,PHARE_DEFAUT);
 for(const nul of [null,undefined,[],'texte',42])assert.deepEqual(pharePublie(nul),PHARE_DEFAUT);
 const ops=lire('frontend/operations.jsx');
 assert.ok(ops.includes("from './use-phare.js'")&&ops.includes('usePhare()'));
 assert.ok(lire('frontend/use-phare.js').includes('/vitrine/evenement-phare.json'));
 assert.ok(!ops.includes("Date.parse('2026-12-19T00:00:00Z')"),'plus de date codée en dur dans la carte');
 assert.ok(!/<h3>Traversée Prophétique Annuelle — TPA 2026<\/h3>/.test(ops));
 assert.ok(lire('public/vitrine/sde-fiche-phare.js').includes('/vitrine/evenement-phare.json'),'même source côté pages publiques');
});

test('Accueil : présentation institutionnelle 2026 silencieuse, contrôlable et décrite',()=>{
 const h=page('portail'),mp4='public/vitrine/sde-presentation-2026.mp4',affiche='public/vitrine/sde-presentation-2026-affiche.jpg';
 assert.ok(existsSync(mp4)&&existsSync(affiche));
 assert.ok(statSync(mp4).size<25*1024*1024,'limite Cloudflare de 25 Mo par fichier');
 assert.equal(readFileSync(mp4).subarray(4,8).toString(),'ftyp','conteneur MP4 valide');
 const sec=h.slice(h.indexOf('id="presentation-2026"'),h.indexOf('id="programmes-accueil"'));
 const video=sec.match(/<video[^>]*>/)[0];
 assert.match(video,/\bcontrols\b/);assert.match(video,/preload="metadata"/);assert.match(video,/autoplay muted loop/);
 assert.match(video,/poster="\/vitrine\/sde-presentation-2026-affiche\.jpg"/);
 assert.ok(sec.includes('<source src="/vitrine/sde-presentation-2026.mp4" type="video/mp4">'));
 assert.ok(video.includes('aria-describedby="presentation-2026-description"')&&sec.includes('id="presentation-2026-description"'));
 assert.match(sec,/<summary>Lire la transcription visuelle<\/summary>/);
 assert.ok(h.indexOf('id="presentation-2026"')>h.indexOf('id="sde-piliers-titre"'),'placée après le héros et les piliers');
 assert.ok(lire('public/vitrine/sde-accueil-premium.css').includes('.ap-presentation-cadre'));
 assert.doesNotMatch(lire('public/sw-public.js').match(/PUBLIC_ASSETS\s*=\s*([^;]+);/)[1],/mp4/);
});

test('Pages publiques : aucun lien vers l’administration, une seule entrée « Mon Portail S.D.E »',()=>{
 const publiques=['portail','rejoindre','mouvement','programmes','projets','prieres','soutenir','transparence','gouvernance','academy','ressources'];
 for(const n of publiques){
  const h=page(n);
  assert.ok(!/href="\/administration/.test(h),n+' : pas de lien vers /administration');
  assert.ok(!/Poste de commandement|Espace administrateur|Connexion responsable/.test(h),n+' : pas de mention du poste de commandement');
 }
 assert.ok(page('portail').includes('href="/portail" class="private-access-card private-login"'));
 const js=lire('public/vitrine/portail-unifie.js');
 assert.ok(!js.includes('"/administration"'),'le script public ne pointe plus vers /administration');
 assert.ok(js.includes('label:"Soutenir"')&&js.includes('label:"Rejoindre"'),'barre mobile publique : destinations publiques nommées honnêtement');
});

test('Référencement : titres uniques et désambiguïsés, robots et sitemap cohérents',()=>{
 const titres=new Map();
 for(const n of ['portail','mouvement','programmes','projets','prieres','rejoindre','soutenir','transparence','gouvernance','academy','ressources']){
  const t=page(n).match(/<title>([^<]*)<\/title>/)[1];
  assert.ok(!titres.has(t),'titre en double : '+t);titres.set(t,n);
  assert.match(t,/Soldats? de l['’]Éternel/,n+' : nom complet du mouvement dans le titre');
 }
 assert.equal(page('programmes').match(/<title>([^<]*)<\/title>/)[1],'Programmes, IN FIRE &amp; Soldiers Academy | Soldats de l\'Éternel (SDE)');
 const robots=lire('public/robots.txt'),map=lire('public/sitemap.xml');
 for(const r of ['/portail','/connexion','/mon-espace','/administration','/api/'])assert.ok(robots.includes('Disallow: '+r),r);
 assert.ok(robots.includes('Sitemap: https://mouvement-sde.org/sitemap.xml'));
 for(const loc of map.match(/<loc>[^<]+<\/loc>/g)){
  const chemin=loc.replace(/<\/?loc>/g,'').replace('https://mouvement-sde.org','')||'/';
  assert.ok(!/^\/(portail|connexion|mon-espace|administration|api|comptes-membres|courriels|formulaires)/.test(chemin),'sitemap : route privée '+chemin);
 }
});
