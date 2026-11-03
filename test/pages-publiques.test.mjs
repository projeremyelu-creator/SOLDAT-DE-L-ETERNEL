import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const lire=f=>readFileSync(f,'utf8');
const page=n=>lire(`public/vitrine/${n}.html`);
const PAGES={mouvement:'spi',programmes:'mis',soutenir:'cmd',temoignages:'spi',rejoindre:'cmd'};

test('Pages publiques : feuille premium chargée avant la charte Fusion, famille de couleur déclarée',()=>{
 for(const [n,fam] of Object.entries(PAGES)){
  const h=page(n),feuilles=[...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  const iF=feuilles.findIndex(f=>f.includes('sde-fusion.css')),iP=feuilles.findIndex(f=>f.includes('sde-pages-premium.css'));
  assert.ok(iP>=0&&iP<iF,n+' : feuille premium avant la charte Fusion');
  const apres=feuilles.slice(iF+1);
  assert.ok(apres.length===0||(n==='soutenir'&&apres.length===1&&apres[0].includes('sde-standalone-clarte.css')),n+' : Fusion en dernier (sauf clarté autonome de Soutenir)');
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
 for(const canal of ['Orange Money','MTN Mobile Money','Moov Money','Virement bancaire','Visa / Mastercard'])assert.ok(h.includes(`data-canal="${canal}">Non activé`),canal);
 assert.ok(js.includes('/api/sde-demarches/statut')&&js.includes('paiementsActifs === true'));
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
