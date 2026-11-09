import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync('public/vitrine/portail.html','utf8');
const script=readFileSync('public/vitrine/sde-accueil-premium.js','utf8');
const phareReel=JSON.parse(readFileSync('public/vitrine/evenement-phare.json','utf8'));
// Les dates sont fixées très loin dans le futur : le test ne vieillit pas avec le calendrier réel.
const phare={...phareReel,debut:'2099-12-18T20:00:00+00:00',dateLibelle:'Vendredi 18 décembre 2099'};
const event=(extra={})=>({id:'e1',titre:'Rencontre SDE',type:'Conférence',date:'2099-10-31',heure:'08:30',fin:'',lieu:'Abidjan',description:'',...extra});
async function page(events,{failure=false,impact=null,pharePerdu=false,pharePasse=false}={}){
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/',runScripts:'outside-only'});
 const w=dom.window;
 w.fetch=async(url)=>{
  if(failure)throw Error('offline');
  if(String(url).includes('evenement-phare'))return pharePerdu?{ok:false}:{ok:true,json:async()=>pharePasse?{...phare,debut:'2020-12-18T20:00:00+00:00'}:phare};
  if(String(url).includes('/api/impact'))return impact?{ok:true,json:async()=>impact}:{ok:false};
  return {ok:true,json:async()=>({evenements:events})};
 };
 w.eval(script);
 await new Promise(r=>setTimeout(r,10));
 return dom;
}
const texte=(d,id)=>d.getElementById(id).textContent;
// Une seule fiche centrale : le programme phare vient de evenement-phare.json et du même titre que l'affiche.
test('Accueil : la fiche centrale du programme phare est cohérente avec l’affiche et le JSON-LD',()=>{
 const d=new JSDOM(html).window.document;
 assert.equal(phareReel.affiche,'/vitrine/illus/tpa-2026.webp');
 assert.equal(d.querySelectorAll(`img[src="${phareReel.affiche}"]`).length,0,'l’affiche lourde est accessible depuis la fiche, sans préchargement sur l’accueil');
 assert.equal(d.getElementById('ap-next-title').textContent,phareReel.titre);
 assert.equal(d.querySelector('#prochain-rendez-vous time').getAttribute('datetime'),phareReel.debut);
 assert.equal(d.getElementById('ap-next-register').getAttribute('href'),phareReel.inscription);
 assert.equal(d.getElementById('ap-next-more').getAttribute('href'),phareReel.fiche);
 assert.match(html,new RegExp('"startDate":"'+phareReel.debut.replace(/[+]/g,'\\+')+'"'));
});
test('Accueil : un rendez-vous public plus proche passe avant le programme phare, sans doublon',async()=>{
 const dom=await page([event({date:'2098-11-02',titre:'Plus tard'}),event({date:'2098-10-31'}),event({date:'2099-12-18',titre:'TPA 2026 (copie publique)',heure:'20:00'})]);
 try{
  const d=dom.window.document;
  assert.equal(texte(d,'ap-next-title'),'Rencontre SDE');
  assert.equal(d.getElementById('ap-next-date').getAttribute('datetime'),'2098-10-31');
  assert.match(texte(d,'ap-next-date'),/31 octobre 2098/);
  assert.equal(texte(d,'ap-next-time'),'08h30');
  assert.equal(texte(d,'ap-next-place'),'Abidjan');
  assert.match(d.getElementById('ap-next-register').getAttribute('href'),/^\/contact\?objet=Rencontre%20SDE#rejoindre$/);
  const suite=[...d.querySelectorAll('#ap-upcoming-list li')].map(li=>li.textContent);
  assert.equal(suite.length,1,'la grille reprend seulement les autres rendez-vous datés');
  assert.ok(suite.some(t=>t.includes('Plus tard')));
  assert.equal(suite.filter(t=>/TPA 2026/.test(t)).length,0);
 }finally{dom.window.close()}
});
test('Accueil : sans rendez-vous plus proche, la carte affiche le programme phare avec son inscription',async()=>{
 const dom=await page([event({date:'2100-01-10',titre:'Après la TPA'})]);
 try{
  const d=dom.window.document;
  assert.equal(texte(d,'ap-next-title'),phare.titre);
  assert.equal(texte(d,'ap-next-date'),'Vendredi 18 décembre 2099');
  assert.equal(texte(d,'ap-next-time'),'20h00');
  assert.equal(d.getElementById('ap-next-register').getAttribute('href'),phare.inscription);
  assert.equal(d.getElementById('ap-next-more').getAttribute('href'),'/programmes#tpa-2026');
  assert.equal(d.getElementById('prochain-rendez-vous').hidden,true,'le bandeau TPA suffit pour ce rendez-vous');
  assert.match(texte(d,'ap-countdown'),/^Dans \\d+ jours \\d+ h \\d+ min \\d+ s$/);
 }finally{dom.window.close()}
});
// Dates passées, impossibles, absentes, entrées invalides, panne réseau : la fiche statique reste utile.
for(const [name,events,options]of [
 ['dates passées',[event({date:'2020-01-01'})],{}],
 ['date impossible',[event({date:'2099-02-30'})],{}],
 ['date absente',[event({date:null})],{}],
 ['aucun événement',[],{}],
 ['entrée invalide',[null],{}],
 ['panne réseau',[],{failure:true}]
])test('Accueil : repli utile pour '+name,async()=>{
 const dom=await page(events,options);
 try{
  const d=dom.window.document;
  const titre=texte(d,'ap-next-title');
  assert.ok(titre.length>5,'une fiche reste affichée');
  assert.ok(d.getElementById('ap-next-register').getAttribute('href').startsWith('/contact'));
  assert.ok(d.getElementById('ap-next-more').getAttribute('href').startsWith('/programmes'));
  assert.doesNotMatch(d.body.textContent,/undefined|null|NaN/);
 }finally{dom.window.close()}
});
test('Accueil : programme phare passé et aucun rendez-vous, message honnête et accès à l’agenda',async()=>{
 const dom=await page([],{pharePasse:true});
 try{
  const d=dom.window.document;
  assert.equal(texte(d,'ap-next-title'),'Prochain rendez-vous à annoncer');
  assert.equal(d.getElementById('ap-next-more').getAttribute('href'),'/programmes');
 }finally{dom.window.close()}
});
// Aucune injection HTML ; les informations manquantes ne produisent pas de texte inventé.
test('Accueil : les titres restent du texte et les informations manquantes sont signalées',async()=>{
 const dom=await page([event({titre:'<img src=x onerror=alert(1)>',date:'2098-01-05',heure:'',lieu:''})]);
 try{
  const d=dom.window.document;
  assert.equal(texte(d,'ap-next-title'),'<img src=x onerror=alert(1)>');
  assert.equal(d.querySelector('#ap-next-title img'),null);
  assert.equal(texte(d,'ap-next-time'),'À confirmer');
  assert.equal(texte(d,'ap-next-place'),'À confirmer');
 }finally{dom.window.close()}
});
// Indicateurs : uniquement des totaux strictement positifs renvoyés par l'API, rien de décoratif.
test('Accueil : indicateurs vérifiés, valeurs nulles masquées, aucun chiffre inventé',async()=>{
 const dom=await page([],{impact:{ok:true,membresActifs:12,pays:0,formations:4,missionsEnCours:0,rendezVousAVenir:2}});
 try{
  const d=dom.window.document;
  const items=[...d.querySelectorAll('#ap-indicateurs-liste li')].map(li=>li.textContent);
  assert.deepEqual(items,['12membres actifs','4formations enregistrées','2rendez-vous publics à venir']);
  assert.match(texte(d,'ap-ind-note'),/Aucun nom ni aucune coordonnée/);
 }finally{dom.window.close()}
});
test('Accueil : indicateurs indisponibles, panneau entièrement masqué',async()=>{
 const dom=await page([]);
 try{
  const d=dom.window.document;
  assert.equal(d.querySelectorAll('#ap-indicateurs-liste li').length,0);
  assert.equal(d.querySelector('.ap-indicateurs')?.hidden,true);
  assert.equal(d.getElementById('ap-ind-note')?.hidden,true);
 }finally{dom.window.close()}
});
