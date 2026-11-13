import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {buildSync} from 'esbuild';import {JSDOM} from 'jsdom';import {fixture} from './helpers/d1.mjs';

test('Le membre et l’administrateur chargent leur photo dans leur tableau de bord',async()=>{
 for(const [path,role] of [['/mon-espace','soldat'],['/administration','admin']]){
  const c=await page(path,role);
  try{
   const input=c.d.querySelector('.ops-profile-photo input[type="file"]');
   assert.ok(input,path+' propose le choix de photo');
   const original=c.w.fetch;
   let uploads=0;
   c.w.fetch=async(url,options)=>{
    if(url==='/api/ma-photo'){
     uploads++;assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');
     assert.equal(options.headers['content-type'],'image/png');
     return {ok:true,json:async()=>({ok:true,url:'/_blob/photo-fictive-123456',photoId:'photo-fictive-123456'})};
    }
    return original(url,options);
   };
   const file=new c.w.File([Uint8Array.from([137,80,78,71])],'portrait.png',{type:'image/png'});
   Object.defineProperty(input,'files',{configurable:true,value:[file]});
   input.dispatchEvent(new c.w.Event('change',{bubbles:true}));
   await waitFor(()=>c.d.querySelector('.ops-profile-photo [role="status"]')?.textContent.includes('enregistrée'));
   assert.equal(uploads,1);
   assert.equal(c.w.SDEPortal.compte.photo,'/_blob/photo-fictive-123456');
   assert.equal(c.d.querySelector('.ops-profile-avatar img')?.getAttribute('src'),'/_blob/photo-fictive-123456');
   if(role==='admin')assert.equal(c.d.querySelector('.ref-account .ref-avatar img')?.getAttribute('src'),'/_blob/photo-fictive-123456');
   assert.deepEqual(c.errors,[]);
  }finally{c.close()}
 }
});
const bundle=buildSync({entryPoints:['frontend/operations-entry.jsx'],bundle:true,format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const tick=()=>new Promise(r=>setTimeout(r,70));const waitFor=async f=>{const deadline=Date.now()+2200;while(!f()&&Date.now()<deadline)await tick();assert.ok(f(),'État UI attendu non atteint')};
async function page(path='/administration',role='admin'){
 const f=fixture();f.account('alice',role);f.doc('membres/alice',{nom:'Alice',matricule:'SDE-A',statut:'Soldat',pole:'Accueil'});f.doc('evenements/e',{titre:'Rencontre du jour',date:new Date().toISOString().slice(0,10)});f.doc('formations/f',{titre:'ALEPH',modules:[{id:'m'}],participants:{alice:{statut:'Inscrit',suivis:{m:true}}}});f.doc('ressources/r',{titre:'Cours audio',type:'audio',lien:'https://example.org/cours.mp3'});
 const dom=new JSDOM('<!doctype html><body><div class="shell"><nav id="nav"></nav><main id="main">Natif</main></div></body>',{url:'https://mouvement-sde.org'+path,pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window,d=w.document,actions=[],errors=[];w.addEventListener('error',e=>errors.push(e.message));w.matchMedia=()=>({matches:false,addEventListener(){}});
 for(const name of ['espace','academie','membres','finances','projets','agenda','chambre','arsenal','portevoix']){const b=d.createElement('button');b.dataset.vue=name;b.textContent=name;b.addEventListener('click',()=>{d.querySelector('#main').textContent='Natif '+name});d.querySelector('#nav').append(b)}d.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t)actions.push({...t.dataset})});
 w.fetch=async(path,opts={})=>{const r=await f.call(path,'alice',opts.method||'GET',opts.body?JSON.parse(opts.body):undefined);return{ok:r.status<400,status:r.status,json:async()=>r.body}};
 for(const p of ['public/vitrine/portail-plus.js','public/vitrine/portail-direct.js'])w.eval(readFileSync(p,'utf8'));w.eval(bundle);d.dispatchEvent(new w.Event('DOMContentLoaded'));await waitFor(()=>d.querySelector('.ops-top-nav'));return{f,w,d,dom,actions,errors,close:()=>{dom.window.close();f.close()}};
}
test('Maquettes : annuaire filtrable et ouverture de la fiche native',async()=>{const c=await page();try{c.w.SDEPortal.selectionner('annuaire');try{await waitFor(()=>{const panel=c.d.querySelector('.ops-panel');return panel?.textContent.includes('Alice')&&[...panel.querySelectorAll('button')].some(button=>button.textContent==='Voir la fiche')})}catch(e){throw Error(JSON.stringify({panel:c.d.querySelector('.ops-panel')?.textContent,errors:c.errors}))};assert.match(c.d.querySelector('.ops-panel').textContent,/Alice/);const see=[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Voir la fiche');see.click();await tick();assert.equal(c.d.querySelector('#main').textContent,'Natif membres');assert.equal(c.actions.at(-1).act,'voir-membre');assert.equal(c.actions.at(-1).id,'alice');assert.equal(c.d.querySelector('.ops-panel'),null);assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Academy : vrais dossiers prêts à certifier, puis formulaire existant',async()=>{const c=await page();try{c.w.SDEPortal.selectionner('academy-direction');await waitFor(()=>c.d.querySelector('[data-act="voir-participant"]'));assert.match(c.d.querySelector('.ops-panel').textContent,/ALEPH/);c.d.querySelector('[data-act="voir-participant"]').click();await tick();assert.equal(c.actions.at(-1).mid,'alice');assert.equal(c.actions.at(-1).id,'f');assert.equal(c.d.querySelector('#main').textContent,'Natif academie')}finally{c.close()}});
test('Membre : accueil avec carte réelle, puis carte QR et bibliothèque',async()=>{const c=await page('/mon-espace','soldat');try{assert.ok(!c.d.querySelector('.ops-top-nav a'));await waitFor(()=>c.d.querySelector('.soldier-qr'));assert.match(c.d.querySelector('.soldier-card').textContent,/SDE-A/);c.w.SDEPortal.selectionner('carteqr');await waitFor(()=>c.d.querySelector('.ops-qr-image'));assert.match(c.d.querySelector('.ops-qr-image').src,/^data:image\/svg\+xml/);assert.match(c.d.querySelector('.ops-qr-card').textContent,/SDE-A/);c.w.SDEPortal.selectionner('bibliotheque');await waitFor(()=>c.d.querySelector('.ops-panel a[href="https://example.org/cours.mp3"]'));[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Écouter / regarder').click();await tick();assert.equal(c.d.querySelector('audio').getAttribute('src'),'https://example.org/cours.mp3');assert.equal(c.w.location.pathname,'/mon-espace');assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Scanner : rencontre obligatoire, aucune caméra automatique, navigation sûre',async()=>{const c=await page();try{let requests=0;Object.defineProperty(c.w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{requests++;throw Error('Refus')}}});c.w.SDEPortal.selectionner('scanner');await waitFor(()=>[...c.d.querySelectorAll('.ops-panel button')].some(b=>b.textContent==='Activer le scanner'));const start=[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Activer le scanner');assert.equal(start.disabled,true);assert.equal(requests,0);const select=c.d.querySelector('.ops-panel select');select.value='e';select.dispatchEvent(new c.w.Event('change',{bubbles:true}));await tick();assert.equal(start.disabled,false);c.w.SDEPortal.selectionner('agenda');await tick();assert.equal(c.d.querySelector('.ops-panel'),null);assert.equal(requests,0);assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Finances et événements : période du graphique et inscription utilisables',async()=>{const c=await page();try{c.f.doc('finances/'+new Date().toISOString().slice(0,7)+'/ops/e',{date:new Date().toISOString().slice(0,10),sens:'E',montant:1000});c.w.SDEPortal.selectionner('finance-direction');await waitFor(()=>c.d.querySelectorAll('.ops-plot tbody tr').length===12);assert.equal(c.d.querySelectorAll('.ops-plot tbody tr').length,12);const select=c.d.querySelector('.ops-panel select');select.value='3';select.dispatchEvent(new c.w.Event('change',{bubbles:true}));await waitFor(()=>c.d.querySelectorAll('.ops-plot tbody tr').length===3);assert.equal(c.d.querySelectorAll('.ops-plot tbody tr').length,3);c.w.SDEPortal.selectionner('rendezvous');await waitFor(()=>[...c.d.querySelectorAll('.ops-panel button')].some(b=>b.textContent==='Confirmer ma participation'));[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Confirmer ma participation').click();await waitFor(()=>c.d.querySelector('.ops-panel')?.textContent.includes('Annuler mon inscription'));assert.equal(c.f.sql.prepare("SELECT participe FROM portail_inscriptions_evenements WHERE compte='alice'").get().participe,1)}finally{c.close()}});
test('Contenu du site : l’administrateur importe, publie, et /api/site reflète la publication',async()=>{const c=await page();try{c.w.confirm=()=>true;c.w.SDEPortal.selectionner('site-public');await waitFor(()=>c.d.querySelector('.site-ed'));[...c.d.querySelectorAll('.site-ed button')].find(b=>b.textContent==='Importer les programmes actuels').click();await waitFor(()=>c.d.querySelectorAll('.site-ed-prog').length===8);const set=(el,v)=>{const proto=el.tagName==='TEXTAREA'?c.w.HTMLTextAreaElement.prototype:c.w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);el.dispatchEvent(new c.w.Event('input',{bubbles:true}))};set(c.d.querySelector('.site-ed input[type=email]'),'contact@mouvement-sde.org');await tick();c.d.querySelector('.site-ed-go').click();await waitFor(()=>/Publié/.test(c.d.querySelector('.site-ed-publish p').textContent));const r=await c.f.call('/api/site','alice','GET');assert.equal(r.body.contact.email,'contact@mouvement-sde.org');assert.equal(r.body.programmes.length,8);assert.equal(r.body.programmes[1].lien,'#infire');assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Contenu du site : refusé aux comptes non administrateurs',async()=>{const c=await page('/administration','contributeur');try{c.w.SDEPortal.selectionner('site-public');await tick();assert.equal(c.d.querySelector('.site-ed'),null);const r=await c.f.call('/api/db','alice','POST',{op:'set',path:'site/contact',data:{email:'x@y.zz'}});assert.equal(r.status,403)}finally{c.close()}});

test('Bandeau privé SDE : une marque courte, un seul menu mobile et aucune superposition par duplication',async()=>{
 const c=await page('/administration','admin');
 try{
   const top=c.d.querySelector('#sde-operations-nav .ref-toolbar.ops-top-nav');
   assert.ok(top);
   assert.equal(top.querySelectorAll('.ref-digital-identity').length,1);
   assert.equal(top.querySelector('.ref-brand-caption strong')?.textContent,'SDE - MOUVEMENT');
   assert.equal(top.querySelector('.ref-brand-caption small')?.textContent,'Administration');
   assert.equal(top.querySelector('.ref-menu-button'),null,'Le hamburger redondant ne doit pas être affiché');
   assert.equal(top.querySelector('.ref-account')?.getAttribute('aria-label'),'Ouvrir mon compte : Compte alice');
   assert.equal(c.d.querySelectorAll('.ref-tabbar').length,1);
   assert.ok(c.d.querySelector('#sde-direct-menu-toggle'),'Les rubriques existantes restent accessibles');
   assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Bandeau privé SDE : accès directs Recherche, Apparence, Notifications et Mon compte',async()=>{
 const c=await page('/administration','admin');
 try{
   const top=c.d.querySelector('.ops-top-nav');
   const find=top.querySelector('[aria-label="Rechercher une rubrique"]');
   const theme=top.querySelector('[aria-label="Choisir l’apparence de mon espace"]');
   const reminders=top.querySelector('[aria-label="Notifications et rappels"]');
   const account=top.querySelector('.ref-account');
   assert.ok(find&&theme&&reminders&&account);
   find.click();await tick();
   assert.ok(c.d.querySelector('.ref-switcher input[type=search]'));
   assert.equal(find.getAttribute('aria-expanded'),'true');
   theme.click();await tick();
   assert.equal(c.d.querySelector('.ref-switcher'),null);
   assert.ok(c.d.querySelector('.ref-palette-menu'));
   assert.equal(theme.getAttribute('aria-expanded'),'true');
   c.d.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   await tick();assert.equal(c.d.querySelector('.ref-palette-menu'),null);
   reminders.click();await tick();
   assert.equal(new URLSearchParams(c.w.location.search).get('module'),'preferences');
   assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Bandeau membre SDE : identité cohérente et sans raccourcis administratifs',async()=>{
 const c=await page('/mon-espace','soldat');
 try{
   const top=c.d.querySelector('#sde-operations-nav .ops-top-nav');
   assert.equal(top.querySelector('.ref-brand-caption strong')?.textContent,'SDE - MOUVEMENT');
   assert.equal(top.querySelector('.ref-brand-caption small')?.textContent,'Espace membre');
   assert.equal(top.querySelector('.ref-account'),null);
   assert.equal(top.querySelector('.ref-menu-button'),null);
   assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Refonte 2+3 : les deux espaces privés partagent la palette et la hiérarchie SDE sans toucher aux rôles',()=>{
 const css=readFileSync('frontend/reference.css','utf8');
 const source=readFileSync('frontend/operations.jsx','utf8');
 for(const token of ['--sde23-private-night:#0D1B38','--sde23-private-ivory:#FAF7F0','--sde23-private-gold:#D9A72E','--sde23-private-earth:#B74624','--sde23-private-green:#00644F','Cormorant Garamond','Manrope'])assert.ok(css.includes(token),token);
 assert.match(css,/\.sde23-member-journey/);
 assert.match(css,/\.sde23-command-journey/);
 assert.match(source,/sde23-member-journey/);
 assert.match(source,/sde23-command-journey/);
 assert.doesNotMatch(source,/mot de passe|password|niveau\s*=/i);
});
test('Bandeau responsive SDE : mise en page en flux, contraste, focus et touch targets',()=>{
 const css=readFileSync('frontend/palette-themes.css','utf8');
 const section=css.slice(css.lastIndexOf('En-tête privé SDE — correction'));
 assert.ok(section.length>3000,'Correctifs de bandeau attendus');
 assert.match(section,/position:static!important/);
 assert.match(section,/transform:none!important/);
 assert.match(section,/justify-content:space-between!important/);
 assert.match(section,/min-width:44px!important;min-height:44px!important/);
 assert.match(section,/focus-visible/);
 assert.match(section,/@media\(max-width:760px\)/);
 assert.match(section,/@media\(max-width:380px\)/);
 assert.match(section,/\.ref-account-copy\{display:none!important\}/);
 assert.match(section,/\.ref-menu-button/);
});

test('Événement phare : informations réelles et accès au programme conservés',async()=>{
 const c=await page('/administration?module=pilotage','admin');
 try{
   await waitFor(()=>c.d.querySelector('.ref-command .ref-feature h3'));
   const hero=c.d.querySelector('.ref-command .ref-feature');
   assert.ok(hero);
   assert.equal(hero.getAttribute('aria-label'),'Événement phare');
   assert.match(hero.textContent,/Rencontre du jour/);
   const action=[...hero.querySelectorAll('button')].find(b=>/Voir le programme/.test(b.textContent));
   assert.ok(action);
   action.click();await tick();
   assert.equal(new URLSearchParams(c.w.location.search).get('module'),'rendezvous');
   assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Lisibilité du visuel IN FIRE : priorité à des lettres claires sur photo sombre',()=>{
 const source=readFileSync('frontend/palette-themes.css','utf8');
 const region=source.slice(source.indexOf('Recette du 30/10 : lisibilité réelle'));
 assert.ok(region.length>2500);
 assert.match(region,/html\[data-sde-palette\] body\.sde-reference-admin \.ref-command \.ref-feature :is\(h3,p\)/);
 assert.match(region,/color:#fff9e9!important/);
 assert.match(region,/color:#f0d68e!important/);
 assert.match(region,/linear-gradient\(90deg,rgba\(6,14,29,\.97\)/);
 assert.match(region,/text-shadow:0 2px 9px/);
 assert.match(region,/ref-feature button\.ref-small-action/);
 assert.match(region,/@media\(max-width:760px\)/);
});
test('Animations du pilotage : courtes, accessibles et désactivables',()=>{
 const region=readFileSync('frontend/palette-themes.css','utf8').split('Animations institutionnelles brèves')[1];
 assert.ok(region);
 assert.match(region,/@keyframes sde-command-arrive/);
 assert.match(region,/@keyframes sde-feature-sheen/);
 assert.match(region,/\.sv-hello-admin/);
 assert.match(region,/\.ref-command-overview/);
 assert.match(region,/\.ref-command \.ref-feature/);
 assert.match(region,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(region,/body\[data-motion=paused\]/);
 assert.match(region,/animation:none!important/);
});

test('Le poste de commandement retrouve son menu latéral antérieur, ouvrable par Plus et Rubriques',async()=>{
 const c=await page('/administration','admin');
 try{
  const plus=c.d.querySelector('.ref-tabbar button:last-child');
  assert.ok(plus,'Bouton Plus toujours présent');
  plus.click();
  await waitFor(()=>c.d.querySelector('.ref-sidebar.is-open'));
  assert.equal(c.d.querySelector('#ref-mobile-menu'),null,'Pas de nouveau tiroir plein écran admin');
  assert.ok(c.d.querySelector('.ref-admin-scrim'));
  c.d.querySelector('.ref-legacy-close').click();
  await waitFor(()=>!c.d.querySelector('.ref-sidebar.is-open'));
  assert.equal(c.d.getElementById('sde-direct-menu-toggle').getAttribute('aria-expanded'),'false');
  const rubriques=c.d.getElementById('sde-direct-menu-toggle');
  rubriques.click();
  await waitFor(()=>c.d.querySelector('.ref-sidebar.is-open'));
  const poles=[...c.d.querySelectorAll('.ref-sidebar nav button')].find(x=>x.textContent.includes('Pôles'));
  assert.ok(poles,'Pôles accessible dans le menu précédent');
  poles.click();await tick();
  assert.equal(c.d.querySelector('.ref-sidebar.is-open'),null);
  assert.equal(new URLSearchParams(c.w.location.search).get('module'),'suivi-poles');
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Plus reste accessible au membre sans afficher les finances ni les menus de direction',async()=>{
 const c=await page('/mon-espace','soldat');
 try{
  c.d.querySelector('.ref-tabbar button:last-child').click();
  await waitFor(()=>c.d.querySelector('#ref-mobile-menu'));
  const overlay=c.d.querySelector('#ref-mobile-menu');
  assert.match(overlay.textContent,/Mon agenda/);
  assert.ok(!overlay.textContent.includes('Suivi des pôles'));
  assert.ok(!overlay.textContent.includes('Finances & missions'));
  assert.ok(overlay.querySelector('a[href="/programmes#tpa-2026"]'));
  c.d.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await waitFor(()=>!c.d.querySelector('#ref-mobile-menu'));
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Le tableau de bord conserve ses KPIs et ouvre une fiche de détails sur clic TPA',async()=>{
 const c=await page('/administration?module=pilotage','admin');
 try{
  await waitFor(()=>c.d.querySelector('.ref-command .sde-official-tpa'));
  const dashboard=c.d.querySelector('.ref-command');
  const tpa=dashboard.querySelector('.sde-official-tpa');
  assert.match(tpa.textContent,/Traversée Prophétique Annuelle/);
  assert.match(tpa.textContent,/18 décembre 2026/);
  assert.match(tpa.textContent,/Google Meet/);
  assert.ok(tpa.querySelector('img[src="/vitrine/illus/tpa-2026.webp"]'));
  const kpis=dashboard.querySelector('.ops-kpis');
  assert.ok(kpis,'Les chiffres clés du précédent poste sont conservés');
  assert.ok(kpis.compareDocumentPosition(tpa)&c.w.Node.DOCUMENT_POSITION_FOLLOWING,'Les KPI restent au-dessus de la TPA');
  const poster=tpa.querySelector('.sde-official-tpa-poster');
  assert.equal(poster.tagName,'BUTTON');
  poster.click();
  await waitFor(()=>c.d.querySelector('.sde-tpa-dialog'));
  const modal=c.d.querySelector('.sde-tpa-dialog');
  assert.equal(modal.getAttribute('aria-modal'),'true');
  assert.match(modal.textContent,/Vendredi 18 décembre 2026/);
  assert.match(modal.textContent,/Google Meet/);
  assert.ok(modal.querySelector('a[href="/programmes#tpa-2026"]'));
  assert.ok(modal.querySelector('img[src="/vitrine/illus/tpa-2026.webp"]'));
  modal.querySelector('[aria-label="Fermer les détails de la TPA"]').click();
  await waitFor(()=>!c.d.querySelector('.sde-tpa-dialog'));
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('La page publique contient un lien TPA vers son affiche officielle',()=>{
 const html=readFileSync('public/vitrine/programmes.html','utf8');
 assert.match(html,/id="tpa-2026"/);
 assert.match(html,/id="tpa-affiche"/);
 assert.match(html,/datetime="2026-12-18T20:00:00\+00:00"/);
 const css=readFileSync('frontend/reference.css','utf8');
 assert.match(css,/body\.sde-reference \.sde-bottom-nav,\s*body\.sde-reference #sde-mobile-nav\s*\{display:none!important\}/);
 assert.match(css,/body\.sde-reference \.ref-tabbar\s*\{\s*display:grid!important/);
});


test('Centre métier Command : modules opérationnels, nombres issus de l’API et permissions',async()=>{
 const c=await page('/administration','admin');
 try{
  c.w.SDEPortal.selectionner('centre-command');
  await waitFor(()=>c.d.querySelectorAll('.sde-mosaic-command .sde-mosaic-module').length>10);
  const center=c.d.querySelector('.sde-mosaic-command');
  assert.ok(center);
  assert.match(center.textContent,/Poste de commandement/);
  assert.match(center.textContent,/Pointages et QR/);
  assert.match(center.textContent,/Rapports financiers/);
  assert.ok(center.querySelector('input[type="search"]'));
  assert.equal(center.querySelectorAll('.sde-mosaic-stat').length,4);
  assert.equal(c.errors.length,0);
  const open=[...center.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Ouvrir Registre et fiches des membres');
  assert.ok(open);
  open.click();
  await waitFor(()=>c.d.querySelector('.ops-panel')?.textContent.includes('Annuaire des membres'));
 }finally{c.close()}
});
test('Centre métier Membre : modules personnels, sans finances de direction',async()=>{
 const c=await page('/mon-espace','soldat');
 try{
  c.w.SDEPortal.selectionner('centre-membre');
  await waitFor(()=>c.d.querySelectorAll('.sde-mosaic-member .sde-mosaic-module').length>=10);
  const center=c.d.querySelector('.sde-mosaic-member');
  assert.ok(center);
  assert.match(center.textContent,/Mes cotisations/);
  assert.match(center.textContent,/Mon profil et mes informations/);
  assert.ok(!center.textContent.includes('Rapports financiers'));
  assert.ok(!center.textContent.includes('Registre et fiches des membres'));
  assert.equal(c.errors.length,0);
 }finally{c.close()}
});


test('Annuaire mobile : toutes les données du membre restent lisibles et la fiche native reste accessible',async()=>{
 const c=await page('/administration','admin');
 try{
  c.w.SDEPortal.selectionner('annuaire');
  await waitFor(()=>!!c.d.querySelector('.ops-annuaire-table tbody tr'));
  const table=c.d.querySelector('table.ops-annuaire-table');
  assert.ok(table);
  assert.equal(table.closest('.ops-directory-scroll')?.classList.contains('ops-table-scroll'),true);
  assert.deepEqual([...table.querySelectorAll('thead th')].map(x=>x.textContent.trim()),
   ['Soldat','Matricule','Fonction / statut','Academy','Présence','Fiche']);
  const record=table.querySelector('tbody tr');
  assert.equal(record.querySelector('th[scope="row"]')?.textContent.includes('Alice'),true);
  assert.deepEqual([...record.querySelectorAll('td')].map(x=>x.dataset.label),
   ['Matricule','Fonction / statut','Academy','Présence','Fiche']);
  assert.match(record.textContent,/SDE-A/);
  assert.ok(record.querySelector('button'));
  record.querySelector('button').click();
  await tick();
  assert.equal(c.actions.at(-1).act,'voir-membre');
  assert.equal(c.actions.at(-1).id,'alice');
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Palettes et tableaux privés : contraste vérifié pour fond sombre, cartes mobiles et actions',()=>{
 const css=readFileSync('frontend/business-mosaic.css','utf8');
 const index=css.indexOf('Accessibilité SDE : tableaux métiers et annuaire mobile');
 assert.ok(index>0,'Correctif manquant en dernière couche de styles');
 const end=css.slice(index);
 assert.match(end,/html\[data-sde-palette\] body\.sde-reference \.ops-panel \.ops-table-scroll/);
 assert.match(end,/\.ops-annuaire-table tbody tr/);
 assert.match(end,/content:attr\(data-label\)/);
 assert.match(end,/@media\(max-width:720px\)/);
 assert.match(end,/\.sde-ambiance-ctl\[aria-pressed="true"\]::before/);
 assert.ok(css.lastIndexOf('Accessibilité SDE : tableaux métiers')>css.indexOf('.sde-mosaic-module'));
 const lum=hex=>{
  const v=hex.match(/[0-9a-f]{2}/gi).map(s=>parseInt(s,16)/255);
  const p=v.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*p[0]+.7152*p[1]+.0722*p[2];
 };
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 assert.ok(ratio('f7f2eb','15243b')>=7,'Texte de cellule doit respecter WCAG AAA normal');
 assert.ok(ratio('f9d590','1d2d46')>=7,'En-têtes de tableau doivent respecter WCAG AAA normal');
 assert.ok(ratio('f6d48e','192b43')>=7,'Libellés mobiles doivent respecter WCAG AAA normal');
});

test('Fidélité mobile SDE : les budgets de missions gardent tous les champs et la validation native',async()=>{
 const src=readFileSync('frontend/operations.jsx','utf8');
 const css=readFileSync('frontend/business-mosaic.css','utf8');
 const c=await page('/administration','admin');
 try{
  c.w.SDEPortal.selectionner('finance-direction');
  await waitFor(()=>!!c.d.querySelector('.ops-finance-table'));
  const t=c.d.querySelector('table.ops-finance-table');
  assert.ok(t.closest('.ops-finance-scroll'));
  assert.deepEqual([...t.querySelectorAll('thead th')].map(el=>el.textContent.trim()),
   ['Mission','Budget prévu','Dépensé sur 12 mois','Équipe engagée','Avancement','Validation']);
  for(const label of ['Budget prévu','Dépensé sur 12 mois','Équipe engagée','Avancement','Validation'])
   assert.ok(src.includes('data-label="'+label+'"'),'Donnée budgétaire absente : '+label);
  assert.match(css,/\.ops-finance-table tbody td::before\{/);
  assert.match(css,/content:attr\(data-label\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.equal(c.errors.length,0);
 }finally{c.close()}
});
test('Fidélité mobile SDE : Academy et Agenda affichent leurs cartes sans contourner les vraies actions',async()=>{
 const c=await page('/administration','admin');
 try{
  c.w.SDEPortal.selectionner('academy-direction');
  await waitFor(()=>!!c.d.querySelector('.ops-academy-grid'));
  assert.ok(c.d.querySelector('.ops-academy-grid .ops-academy-course'));
  assert.ok(c.d.querySelector('.ops-academy-grid [data-act="voir-formation"]'));
  c.w.SDEPortal.selectionner('rendezvous');
  await waitFor(()=>!!c.d.querySelector('.ops-agenda-grid'));
  assert.ok(c.d.querySelector('.ops-agenda-grid .ops-card'));
  assert.ok([...c.d.querySelectorAll('.ops-agenda-grid button')].some(b=>b.textContent.includes('Confirmer ma participation')));
  assert.equal(c.errors.length,0);
 }finally{c.close()}
});

test('Pilotage : chiffres réels animés, détails interactifs et navigation depuis les cartes',async()=>{
 const c=await page('/administration?module=pilotage','admin');
 try{
  await waitFor(()=>c.d.querySelectorAll('.ref-command .ref-kpi-interactive').length===4);
  const kpis=[...c.d.querySelectorAll('.ref-command .ref-kpi-interactive')];
  assert.deepEqual(kpis.map(x=>x.querySelector('h3')?.textContent),[
   'Membres actifs','Demandes en attente','Pôles de mission','Programmes publiés'
  ]);
  assert.ok(kpis.every(x=>x.querySelector('.ref-kpi-number')));
  const details=c.d.getElementById('ref-kpi-fiche');
  assert.ok(details);
  assert.equal(details.hidden,true);
  const members=kpis[0].querySelector('button.ref-kpi-go');
  members.click();
  await waitFor(()=>!details.hidden);
  assert.equal(members.getAttribute('aria-expanded'),'true');
  assert.match(details.textContent,/Membres actifs/);
  assert.match(details.textContent,/Membres actuellement actifs/);
  details.querySelector('button.ref-kpi-fiche-open').click();
  await tick();
  assert.equal(new URLSearchParams(c.w.location.search).get('module'),'annuaire');
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Pilotage : actualisation à la demande et filtre interactif des rencontres',async()=>{
 const c=await page('/administration?module=pilotage','admin');
 try{
  await waitFor(()=>c.d.querySelector('.ref-command-refresh'));
  const refresh=c.d.querySelector('.ref-command-refresh');
  assert.match(refresh.textContent,/Actualiser les chiffres/);
  refresh.click();
  await waitFor(()=>/Actualiser les chiffres/.test(refresh.textContent));
  const select=c.d.querySelector('.ref-chart-filter select');
  assert.ok(select,'Filtre des présences disponible');
  assert.deepEqual([...select.options].map(o=>o.value),['3','7']);
  select.value='3';
  select.dispatchEvent(new c.w.Event('change',{bubbles:true}));
  await waitFor(()=>select.value==='3');
  assert.match(c.d.querySelector('.ref-command-livebar').textContent,/toutes les 60 s/);
  assert.deepEqual(c.errors,[]);
 }finally{c.close()}
});
test('Pilotage : animation à changements réels, lecture AA et mouvement réduit',()=>{
 const indicator=readFileSync('frontend/pilotage-indicators.jsx','utf8');
 const css=readFileSync('frontend/reference.css','utf8');
 assert.match(indicator,/indicateurs\?\.\[item\.champ\]\?\?null/);
 assert.match(indicator,/aria-expanded/);
 assert.match(indicator,/onOpen\(active\.module\)/);
 assert.match(indicator,/is-updated/);
 assert.match(css,/@keyframes sde-kpi-updated/);
 assert.match(css,/body\[data-motion=paused\]/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.ref-command-refresh/);
 assert.match(css,/\.ref-kpi-fiche/);
 assert.ok(!indicator.includes('Math.random'));
});
