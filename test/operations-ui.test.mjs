import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {buildSync} from 'esbuild';import {JSDOM} from 'jsdom';import {fixture} from './helpers/d1.mjs';
const bundle=buildSync({entryPoints:['frontend/operations-entry.jsx'],bundle:true,format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const tick=()=>new Promise(r=>setTimeout(r,70));const waitFor=async f=>{const deadline=Date.now()+2200;while(!f()&&Date.now()<deadline)await tick();assert.ok(f(),'État UI attendu non atteint')};
async function page(path='/administration',role='admin'){
 const f=fixture();f.account('alice',role);f.doc('membres/alice',{nom:'Alice',matricule:'SDE-A',statut:'Soldat',pole:'Accueil'});f.doc('evenements/e',{titre:'Rencontre du jour',date:new Date().toISOString().slice(0,10)});f.doc('formations/f',{titre:'ALEPH',modules:[{id:'m'}],participants:{alice:{statut:'Inscrit',suivis:{m:true}}}});f.doc('ressources/r',{titre:'Cours audio',type:'audio',lien:'https://example.org/cours.mp3'});
 const dom=new JSDOM('<!doctype html><body><div class="shell"><nav id="nav"></nav><main id="main">Natif</main></div></body>',{url:'https://mouvement-sde.org'+path,pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window,d=w.document,actions=[],errors=[];w.addEventListener('error',e=>errors.push(e.message));w.matchMedia=()=>({matches:false,addEventListener(){}});
 for(const name of ['espace','academie','membres','finances','projets','agenda','chambre','arsenal','portevoix']){const b=d.createElement('button');b.dataset.vue=name;b.textContent=name;b.addEventListener('click',()=>{d.querySelector('#main').textContent='Natif '+name});d.querySelector('#nav').append(b)}d.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t)actions.push({...t.dataset})});
 w.fetch=async(path,opts={})=>{const r=await f.call(path,'alice',opts.method||'GET',opts.body?JSON.parse(opts.body):undefined);return{ok:r.status<400,status:r.status,json:async()=>r.body}};
 for(const p of ['public/vitrine/portail-plus.js','public/vitrine/portail-direct.js'])w.eval(readFileSync(p,'utf8'));w.eval(bundle);d.dispatchEvent(new w.Event('DOMContentLoaded'));await waitFor(()=>d.querySelector('.ops-top-nav'));return{f,w,d,dom,actions,errors,close:()=>{dom.window.close();f.close()}};
}
test('Maquettes : annuaire filtrable et ouverture de la fiche native',async()=>{const c=await page();try{c.w.SDEPortal.selectionner('annuaire');try{await waitFor(()=>c.d.querySelector('.ops-panel table tbody tr'))}catch(e){throw Error(JSON.stringify({panel:c.d.querySelector('.ops-panel')?.textContent,errors:c.errors}))};assert.match(c.d.querySelector('.ops-panel').textContent,/Alice/);const see=[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Voir la fiche');see.click();await tick();assert.equal(c.d.querySelector('#main').textContent,'Natif membres');assert.equal(c.actions.at(-1).act,'voir-membre');assert.equal(c.actions.at(-1).id,'alice');assert.equal(c.d.querySelector('.ops-panel'),null);assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Academy : vrais dossiers prêts à certifier, puis formulaire existant',async()=>{const c=await page();try{c.w.SDEPortal.selectionner('academy-direction');await waitFor(()=>c.d.querySelector('[data-act="voir-participant"]'));assert.match(c.d.querySelector('.ops-panel').textContent,/ALEPH/);c.d.querySelector('[data-act="voir-participant"]').click();await tick();assert.equal(c.actions.at(-1).mid,'alice');assert.equal(c.actions.at(-1).id,'f');assert.equal(c.d.querySelector('#main').textContent,'Natif academie')}finally{c.close()}});
test('Membre : accueil avec carte réelle, puis carte QR et bibliothèque',async()=>{const c=await page('/mon-espace','soldat');try{assert.ok(!c.d.querySelector('.ops-top-nav a'));await waitFor(()=>c.d.querySelector('.soldier-qr'));assert.match(c.d.querySelector('.soldier-card').textContent,/SDE-A/);c.w.SDEPortal.selectionner('carteqr');await waitFor(()=>c.d.querySelector('.ops-qr-image'));assert.match(c.d.querySelector('.ops-qr-image').src,/^data:image\/svg\+xml/);assert.match(c.d.querySelector('.ops-qr-card').textContent,/SDE-A/);c.w.SDEPortal.selectionner('bibliotheque');await waitFor(()=>c.d.querySelector('.ops-panel a[href="https://example.org/cours.mp3"]'));[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Écouter / regarder').click();await tick();assert.equal(c.d.querySelector('audio').getAttribute('src'),'https://example.org/cours.mp3');assert.equal(c.w.location.pathname,'/mon-espace');assert.deepEqual(c.errors,[])}finally{c.close()}});
test('Scanner : rencontre obligatoire, aucune caméra automatique, navigation sûre',async()=>{const c=await page();try{let requests=0;Object.defineProperty(c.w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{requests++;throw Error('Refus')}}});c.w.SDEPortal.selectionner('scanner');await waitFor(()=>c.d.querySelector('.ops-panel select'));const start=[...c.d.querySelectorAll('.ops-panel button')].find(b=>b.textContent==='Activer le scanner');assert.equal(start.disabled,true);assert.equal(requests,0);const select=c.d.querySelector('.ops-panel select');select.value='e';select.dispatchEvent(new c.w.Event('change',{bubbles:true}));await tick();assert.equal(start.disabled,false);c.w.SDEPortal.selectionner('agenda');await tick();assert.equal(c.d.querySelector('.ops-panel'),null);assert.equal(requests,0);assert.deepEqual(c.errors,[])}finally{c.close()}});
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
