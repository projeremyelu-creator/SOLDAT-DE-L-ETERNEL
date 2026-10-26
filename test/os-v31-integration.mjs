import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import worker from '../src/worker.js';
import {SDE_OS_31,apiSdeOs31} from '../src/os-v31.js';
test('Worker : routes OS, origine, session expirée et cache privé',async t=>{
 const env=database(t);env.ASSETS={fetch:async req=>new Response(new URL(req.url).pathname)};
 const run=(path,o={})=>worker.fetch(new Request('https://app.mouvement-sde.org'+path,o),env,{});
 assert.equal((await run('/api/os-v31',{method:'POST',body:'{}'})).status,401);
 assert.equal((await run('/api/os-v31',{method:'POST',headers:{origin:'https://foreign.example'},body:'{}'})).status,403);
 assert.equal((await run('/api/os-v31',{method:'POST',headers:{cookie:'sde_s=expired'},body:'{}'})).status,401);
 assert.equal((await run('/api/os-v31')).status,405);
 const page=await run('/os-v31/');assert.match(page.headers.get('cache-control')||'',/no-store/);
 assert.equal(page.headers.get('x-frame-options'),'DENY');
 const pub=await worker.fetch(new Request('https://mouvement-sde.org/os-v31/'),env,{});
 assert.equal(pub.status,302);assert.equal(pub.headers.get('location'),'https://mouvement-sde.org/mon-espace/os-v31');
});
test('Worker : erreur asynchrone OS interceptée sans fuite SQL',async()=>{
 const env={DB:{prepare:()=>({bind(){return this},first:async()=>({email:'test@example.com',id:'test',role:'soldat',expire:Date.now()+60000}),run:async()=>{throw Error('SQL_PRIVATE')}})}};
 const res=await worker.fetch(new Request('https://app.mouvement-sde.org/api/os-v31',{method:'POST',headers:{cookie:'sde_s=test'},body:'{"action":"tableau"}'}),env,{});
 assert.equal(res.status,500);assert.ok(!(await res.text()).includes('SQL_PRIVATE'));
});
test('service worker : OS et ses scripts exclus du cache',()=>{
 const handlers={};let handled=0;
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self:{addEventListener:(name,fn)=>handlers[name]=fn},URL,location:{origin:'https://app.mouvement-sde.org'}});
 for(const p of ['/os-v31/','/os-v31/index.html','/os-v31/sde-os.js','/api/os-v31'])handlers.fetch({request:{url:'https://app.mouvement-sde.org'+p,method:'GET',mode:'navigate'},respondWith:()=>handled++});
 assert.equal(handled,0);
});
async function browser(t,respond,hash=''){
 const dom=new JSDOM(readFileSync('public/os-v31/index.html','utf8'),{url:'https://app.mouvement-sde.org/os-v31/'+hash,runScripts:'outside-only'});
 t.after(()=>dom.window.close());const w=dom.window;w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.confirm=()=>true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async(url,opts)=>respond(JSON.parse(opts.body));
 w.eval(readFileSync('public/os-v31/sde-os.js','utf8'));await new Promise(r=>setTimeout(r,30));return w;
}
const overview={ok:true,mesBilans:1,mesEcoles:[],decisionsEnAttente:0,referentiel:SDE_OS_31,admin:false,role:'soldat',profil:{nom:'Test'}};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
test('connexion : conserver le module demandé dans un lien direct',async t=>{
 const w=await browser(t,()=>response({ok:false,message:'Connexion requise'},401),'#academy');
 const link=w.document.querySelector('#session-state a');
 assert.equal(new URL(link.href).searchParams.get('retour'),'/os-v31/#academy');
});
test('mouvement-sde.org : accès public visible vers OS privé sans appel API',()=>{
 const dom=new JSDOM('<header class="entete"><div class="enveloppe"><div class="entete-actions"></div></div></header>',{url:'https://mouvement-sde.org/',runScripts:'outside-only'});
 const w=dom.window;w.fetch=()=>{throw Error('API privée appelée sur le site public')};
 w.eval(readFileSync('public/vitrine/sde-app-shell.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const link=[...w.document.querySelectorAll('.sde-shell-toolbar a')].find(a=>a.textContent.includes('OS v3.1'));
 assert.ok(link);assert.equal(link.href,'https://mouvement-sde.org/os-v31/');dom.window.close();
});
test('interface : parcours, thèmes, saisie et historique navigateur',async t=>{
 const actions=[];const w=await browser(t,b=>{actions.push(b);return response(b.action==='tableau'?overview:b.action==='mes_bilans'?{ok:true,bilans:[]}:{ok:true})});
 const d=w.document;assert.equal(d.querySelector('#workspace-content').hidden,false);
 d.querySelector('.side-links [data-route="integral"]').click();assert.equal(w.location.hash,'#integral');
 for(const s of d.querySelectorAll('.rating-fields select'))s.value='2';d.querySelector('#consent-checkin').checked=true;
 d.querySelector('#balance-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));
 assert.equal(actions.find(x=>x.action==='enregistrer_bilan').dimensions.length,7);
 d.querySelector('[data-presentation-value="immersif"]').click();assert.equal(d.body.dataset.presentation,'immersif');
 d.querySelector('#theme-toggle').click();assert.equal(d.documentElement.dataset.theme,'dark');
 d.querySelector('.side-links [data-route="academy"]').click();assert.equal(w.history.length,3);
 d.querySelector('.academy-card button').click();await new Promise(r=>setTimeout(r,10));assert.ok(actions.some(x=>x.action==='inscription_ecole'&&x.ecole===1));
});
test('interface : session expirée efface les données personnelles',async t=>{
 let expired=false;const w=await browser(t,b=>response(expired?{ok:false,message:'Session expirée'}:b.action==='tableau'?overview:{ok:true,bilans:[{mois:'2026-10',dimensions:[3,3,3,3,3,3,3],bienEtre:[3,3,3,3],fractures:[1,1,1,1],prejuges:1}]},expired?401:200));
 const d=w.document;assert.match(d.querySelector('#my-history').textContent,/2026-10/);
 expired=true;d.querySelector('#delete-checkins').click();await new Promise(r=>setTimeout(r,15));
 assert.equal(d.querySelector('#workspace-content').hidden,true);assert.equal(d.querySelector('#my-history').textContent,'');
 assert.equal(d.querySelector('#session-state').hidden,false);assert.ok(d.querySelector('#session-state a').href.includes('retour='));
});
function database(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync('schema.sql','utf8'));
 const stmt=(q,a=[])=>({bind:(...v)=>stmt(q,v),first:async()=>sql.prepare(q).get(...a)??null,all:async()=>({results:sql.prepare(q).all(...a)}),run:async()=>({meta:sql.prepare(q).run(...a)})});
 return {sql,DB:{prepare:q=>stmt(q)}};
}
const member={connecte:true,id:'member',niveau:0,role:'soldat'};
const admin={connecte:true,id:'admin',niveau:2,role:'admin'};
const payload={consentement:true,dimensions:[0,1,2,3,4,2,3],bienEtre:[1,2,3,4],fractures:[0,1,2,3],prejuges:4};
const call=(env,u,action,data={})=>apiSdeOs31(new Request('https://app.mouvement-sde.org/api/os-v31',{method:'POST',body:JSON.stringify({action,...data})}),env,u);
test('SQLite : isolation des bilans, modification mensuelle et suppression limitée',async t=>{
 const env=database(t);
 await call(env,member,'enregistrer_bilan',payload);await call(env,{...member,id:'other'},'enregistrer_bilan',payload);
 await call(env,member,'enregistrer_bilan',{...payload,prejuges:1});
 const mine=await (await call(env,member,'mes_bilans',{user_id:'other'})).json();
 assert.equal(mine.bilans.length,1);assert.equal(mine.bilans[0].prejuges,1);
 assert.deepEqual((await (await call(env,admin,'mes_bilans',{user_id:'member'})).json()).bilans,[]);
 await call(env,member,'supprimer_mes_bilans',{user_id:'other'});
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM osv31_checkins').get().n,1);
 assert.equal(env.sql.prepare('SELECT user_id FROM osv31_checkins').get().user_id,'other');
});
test('SQLite : seuil collectif de cinq participants',async t=>{
 const env=database(t);
 for(let i=0;i<4;i++)await call(env,{...member,id:'m'+i},'enregistrer_bilan',payload);
 assert.deepEqual((await (await call(env,admin,'tendance')).json()).tendance,[]);
 await call(env,{...member,id:'m4'},'enregistrer_bilan',payload);
 const data=(await (await call(env,admin,'tendance')).json()).tendance;
 assert.equal(data.length,1);assert.deepEqual(data[0].series,[0,1,2,3,4]);
 assert.deepEqual(Object.keys(data[0]).sort(),['mois','participants','series']);
});
test('SQLite : auteur refusé, cosignature distincte et décision immuable',async t=>{
 const env=database(t);const p=await (await call(env,admin,'proposer_decision',{type:'projet',titre:'Projet fictif'})).json();
 assert.equal((await call(env,admin,'examiner_decision',{id:p.id,decision:'approuve'})).status,409);
 assert.equal((await call(env,member,'examiner_decision',{id:p.id,decision:'approuve'})).status,403);
 assert.equal((await call(env,{...admin,id:'reviewer'},'examiner_decision',{id:p.id,decision:'approuve'})).status,200);
 assert.equal((await call(env,{...admin,id:'third'},'examiner_decision',{id:p.id,decision:'rejete'})).status,409);
 assert.equal(env.sql.prepare('SELECT review_par FROM osv31_decisions').get().review_par,'reviewer');
});
test('SQLite : intérêt Academy idempotent sans admission',async t=>{
 const env=database(t);for(let i=0;i<2;i++)await call(env,member,'inscription_ecole',{ecole:2});
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM osv31_academy').get().n,1);
 assert.equal(env.sql.prepare('SELECT statut FROM osv31_academy').get().statut,'interet');
});
