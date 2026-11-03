import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import {lancerCourriels,jeton,lireJeton,courrielConfigure,ensure} from '../src/courriel.js';
const ORIGINE='https://mouvement-sde.org';
function monde(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync('schema.sql','utf8'));
 const stmt=(q,args=[])=>({
  bind:(...a)=>stmt(q,a),
  first:async()=>sql.prepare(q).get(...args)??null,
  all:async()=>({results:sql.prepare(q).all(...args)}),
  run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
  _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
 });
 const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec('BEGIN');try{const o=l.map(s=>s._exec());sql.exec('COMMIT');return o}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={DB,ASSETS:{fetch:async()=>new Response('x')},PROPRIETAIRES:'chef@exemple.test'};
 const compte=(id,nom,role='soldat',email=id+'@exemple.test',matricule='M-'+id)=>{
  sql.prepare('INSERT INTO comptes(email,id,nom,role,cree,matricule) VALUES(?,?,?,?,?,?)').run(email,id,nom,role,Date.now(),matricule);
  const jeton='jeton-'+id;sql.prepare('INSERT INTO sessions(jeton,email,expire) VALUES(?,?,?)').run(jeton,email,Date.now()+864e5);return jeton;
 };
 let n=0;
 const appel=async(chemin,{methode='GET',jeton,corps,ip,extra}={})=>{
  const h={'content-type':'application/json','cf-connecting-ip':ip||'10.0.0.'+(++n%200+1)};
  if(jeton)h.cookie='sde_s='+jeton;
  Object.assign(h,extra||{});
  const r=await worker.fetch(new Request(ORIGINE+chemin,{method:methode,headers:h,body:corps===undefined?undefined:JSON.stringify(corps)}),env,{waitUntil(){}});
  let j=null;try{j=await r.clone().json()}catch{}
  return {statut:r.status,json:j,entetes:r.headers};
 };
 return {sql,env,compte,appel};
}

const CONF={RESEND_API_KEY:'re_test',COURRIEL_FROM:'SDE <infos@mouvement-sde.org>',COURRIEL_SECRET:'secret-de-test-assez-long-0123456789'};
const LUNDI=Date.UTC(2026,10,9,8,0,0); // lundi 9 novembre 2026, 08:00 UTC
function faux(){const envois=[];const f=async(url,opts)=>{const corps=JSON.parse(opts.body);envois.push({url,auth:opts.headers.authorization,messages:corps});return new Response(JSON.stringify({data:corps.map((_,i)=>({id:'x'+i}))}),{status:200})};return {f,envois,messages:()=>envois.flatMap(e=>e.messages)};}
const evt=(w,id,d)=>w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES(?,?,?,?,1,?)").run('evenements/'+id,'evenements',id,JSON.stringify(d),Date.now());
const abonne=(w,email,themes='hebdo,nouveau,agenda',statut='actif')=>w.sql.prepare('INSERT INTO sde_abonnes(email,nom,themes,statut,cree,confirmation_envoyee) VALUES(?,?,?,?,?,1)').run(email,'',themes,statut,1);
async function pret(extra={}){const w=monde();Object.assign(w.env,extra);await ensure(w.env);return w}
const regler=(w,v)=>w.env.DB.prepare("INSERT INTO meta(cle,val) VALUES('courriels',?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val").bind(JSON.stringify(v)).run();

test('Courriels : rien ne part sans configuration, l’inscription reste en attente',async()=>{
 const w=await pret(),f=faux();
 assert.equal(courrielConfigure(w.env),false);
 assert.equal((await lancerCourriels(w.env,{now:LUNDI,fetchImpl:f.f})).reason,'config');
 const r=await w.appel('/api/newsletter',{methode:'POST',corps:{email:'Visiteur@Exemple.test',nom:'Visiteur',themes:['hebdo'],consentement:true}});
 assert.equal(r.statut,200);assert.equal(r.json.ok,true);
 const l=w.sql.prepare('SELECT * FROM sde_abonnes').get();
 assert.equal(l.email,'visiteur@exemple.test');assert.equal(l.statut,'en_attente');assert.equal(l.confirmation_envoyee,0);
 assert.equal(f.envois.length,0);
});

test('Courriels : inscription à double confirmation, désinscription en un clic, liens signés',async()=>{
 const w=await pret(CONF),f=faux(),reel=globalThis.fetch;globalThis.fetch=f.f;
 try{
  assert.equal((await w.appel('/api/newsletter',{methode:'POST',corps:{email:'pas-un-mail',consentement:true}})).statut,400);
  assert.equal((await w.appel('/api/newsletter',{methode:'POST',corps:{email:'a@exemple.test',consentement:false}})).statut,400,'consentement obligatoire');
  assert.equal((await w.appel('/api/newsletter',{methode:'POST',corps:{email:'a@exemple.test',themes:['x'],consentement:true}})).statut,400);
  assert.equal((await w.appel('/api/newsletter',{methode:'POST',corps:{email:'piege@exemple.test',consentement:true,site:'http://spam'}})).json.ok,true);
  assert.equal(w.sql.prepare("SELECT COUNT(*) AS n FROM sde_abonnes WHERE email='piege@exemple.test'").get().n,0,'champ piège');
  const r=await w.appel('/api/newsletter',{methode:'POST',corps:{email:'a@exemple.test',nom:'Awa <b>',consentement:true}});
  assert.equal(r.statut,200);
  assert.equal(f.envois.length,1);assert.equal(f.envois[0].url,'https://api.resend.com/emails/batch');assert.equal(f.envois[0].auth,'Bearer re_test');
  const conf=f.messages()[0];assert.equal(conf.to[0],'a@exemple.test');assert.equal(conf.from,CONF.COURRIEL_FROM);
  assert.ok(!conf.html.includes('<b>'),'le nom est échappé');
  const lien=conf.text.match(/https:\/\/mouvement-sde\.org\/api\/newsletter\/confirmer\?t=([^\s]+)/)[1];
  assert.equal(w.sql.prepare("SELECT statut FROM sde_abonnes WHERE email='a@exemple.test'").get().statut,'en_attente');
  // demandes répétées dans les 10 minutes : pas de second message
  await w.appel('/api/newsletter',{methode:'POST',corps:{email:'a@exemple.test',consentement:true}});assert.equal(f.envois.length,1);
  // lien falsifié
  assert.equal((await w.appel('/api/newsletter/confirmer?t='+lien.slice(0,-3)+'abc')).entetes.get('location'),ORIGINE+'/newsletter?etat=invalide');
  assert.equal(w.sql.prepare("SELECT statut FROM sde_abonnes WHERE email='a@exemple.test'").get().statut,'en_attente');
  const ok=await w.appel('/api/newsletter/confirmer?t='+lien);
  assert.equal(ok.statut,303);assert.equal(ok.entetes.get('location'),ORIGINE+'/newsletter?etat=confirme');
  assert.equal(w.sql.prepare("SELECT statut FROM sde_abonnes WHERE email='a@exemple.test'").get().statut,'actif');
  // un lien de confirmation ne sert pas à se désinscrire d'un autre compte, et inversement
  assert.equal(await lireJeton(w.env,lien,'desab'),null);
  const desab=await jeton(w.env,'a@exemple.test','desab');
  assert.equal((await w.appel('/api/newsletter/desabonner?t='+desab,{methode:'POST'})).json.ok,true);
  assert.equal(w.sql.prepare("SELECT statut FROM sde_abonnes WHERE email='a@exemple.test'").get().statut,'desabonne');
 }finally{globalThis.fetch=reel}
});

test('Courriels : lettre hebdomadaire — activation, jour, rassemblements publics seulement, une fois par semaine',async()=>{
 const w=await pret(CONF),f=faux();
 evt(w,'e1',{titre:'Culte de louange',date:'2026-11-11',heure:'18:00',lieu:'Yopougon'});
 evt(w,'e2',{titre:'Réunion de direction',date:'2026-11-12',prive:true});
 evt(w,'e3',{titre:'Trop loin',date:'2026-12-30'});
 w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES('annonces/a1','annonces','a1',?,1,1)").run(JSON.stringify({titre:'Mariage <script>',contenu:'Bénissons Armel',date:'2026-11-07'}));
 abonne(w,'x@exemple.test','hebdo');abonne(w,'y@exemple.test','agenda');abonne(w,'z@exemple.test','hebdo','en_attente');
 assert.deepEqual((await lancerCourriels(w.env,{now:LUNDI,fetchImpl:f.f})),{},'désactivé par défaut');
 await regler(w,{hebdo:true});
 assert.deepEqual(await lancerCourriels(w.env,{now:LUNDI-86400000,fetchImpl:f.f}),{},'pas un dimanche');
 assert.equal(f.envois.length,0);
 const r=await lancerCourriels(w.env,{now:LUNDI,fetchImpl:f.f});
 assert.equal(r.hebdo.sent,1,'seulement l’abonné confirmé qui a choisi la lettre');
 const m=f.messages()[0];
 assert.equal(m.to[0],'x@exemple.test');assert.match(m.html,/Culte de louange/);assert.ok(!/Réunion de direction/.test(m.html+m.text),'rassemblement privé exclu');assert.ok(!/Trop loin/.test(m.text));
 assert.ok(!m.html.includes('<script>'),'contenu échappé');
 assert.match(m.headers['List-Unsubscribe'],/api\/newsletter\/desabonner\?t=/);assert.equal(m.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
 assert.match(m.text,/Me désinscrire :/);
 assert.deepEqual(await lancerCourriels(w.env,{now:LUNDI+3600000,fetchImpl:f.f}),{},'une seule fois par semaine');
 assert.equal(f.envois.length,1);
 w.sql.exec("DELETE FROM docs");
 assert.equal((await lancerCourriels(w.env,{now:LUNDI+7*86400000,fetchImpl:f.f})).hebdo.reason,'rien à annoncer');
});

test('Courriels : nouveaux rassemblements (sans diffuser l’existant) et alertes J-3 / J-1',async()=>{
 const w=await pret(CONF),f=faux();
 abonne(w,'x@exemple.test');
 evt(w,'anc',{titre:'Déjà annoncé',date:'2026-11-20'});
 const admin=w.compte('adm','Admin','admin');
 assert.equal((await w.appel('/api/courriels',{methode:'POST',jeton:admin,corps:{scenarios:{nouveau:true,agenda:true}}})).json.scenarios.nouveau,true);
 assert.deepEqual(await lancerCourriels(w.env,{now:LUNDI,fetchImpl:f.f,seulement:'nouveau'}),{},'l’agenda existant est amorcé, pas envoyé');
 evt(w,'neuf',{titre:'Veillée de prière',date:'2026-11-14',heure:'20:00',lieu:'Abidjan'});
 evt(w,'secret',{titre:'Comité',date:'2026-11-14',prive:true});
 const r=await lancerCourriels(w.env,{now:LUNDI,fetchImpl:f.f});
 assert.equal(r.nouveau.sent,1);
 assert.match(f.messages()[0].subject,/Veillée de prière/);assert.ok(!/Comité/.test(f.messages()[0].html));
 assert.equal((await lancerCourriels(w.env,{now:LUNDI+900000,fetchImpl:f.f})).nouveau,undefined,'pas de doublon');
 // J-3 : le 11 novembre pour le 14 ; J-1 le 13
 const j3=await lancerCourriels(w.env,{now:Date.UTC(2026,10,11,9),fetchImpl:f.f});
 assert.equal(j3['agendaJ-3'].sent,1);assert.match(f.messages().at(-1).subject,/Dans 3 jours/);
 assert.equal((await lancerCourriels(w.env,{now:Date.UTC(2026,10,11,10),fetchImpl:f.f}))['agendaJ-3'],undefined);
 const j1=await lancerCourriels(w.env,{now:Date.UTC(2026,10,13,9),fetchImpl:f.f});
 assert.equal(j1['agendaJ-1'].sent,1);
 assert.match(f.messages().at(-1).subject,/Demain/);
 assert.deepEqual(await lancerCourriels(w.env,{now:Date.UTC(2026,10,13,6),fetchImpl:f.f}),{},'pas d’alerte avant 8 h');
});

test('Courriels : un échec Resend libère la réservation pour réessayer',async()=>{
 const w=await pret(CONF);abonne(w,'x@exemple.test');
 evt(w,'e1',{titre:'Culte',date:'2026-11-11'});await regler(w,{hebdo:true});
 const casse=async()=>new Response('{}',{status:500});
 assert.equal((await lancerCourriels(w.env,{now:LUNDI,fetchImpl:casse})).hebdo.sent,0);
 assert.equal(w.sql.prepare('SELECT COUNT(*) AS n FROM sde_courriel_envois').get().n,0);
 const f=faux();assert.equal((await lancerCourriels(w.env,{now:LUNDI+900000,fetchImpl:f.f})).hebdo.sent,1,'réessayé au passage suivant');
});

test('Courriels : pilotage réservé aux administrateurs, test, déclenchement par secret',async()=>{
 const w=await pret(),f=faux(),reel=globalThis.fetch;globalThis.fetch=f.f;
 try{
  const admin=w.compte('adm','Admin','admin'),simple=w.compte('s','Simple');
  assert.equal((await w.appel('/api/courriels')).statut,403);assert.equal((await w.appel('/api/courriels',{jeton:simple})).statut,403);
  const etat=await w.appel('/api/courriels',{jeton:admin});
  assert.equal(etat.json.configure,false);assert.deepEqual(etat.json.manque,['RESEND_API_KEY','COURRIEL_FROM','COURRIEL_SECRET']);assert.deepEqual(etat.json.scenarios,{hebdo:false,nouveau:false,agenda:false});
  assert.equal((await w.appel('/api/courriels',{methode:'POST',jeton:admin,corps:{test:true}})).statut,409,'test impossible sans configuration');
  Object.assign(w.env,CONF,{COURRIEL_WEBHOOK_SECRET:'secret-webhook-de-test-32-caracteres'});
  assert.equal((await w.appel('/api/courriels',{methode:'POST',jeton:admin,corps:{test:true}})).json.ok,true,'test envoyé à l’adresse de l’administrateur');
  assert.equal(f.messages().at(-1).to[0],'adm@exemple.test');assert.match(f.messages().at(-1).subject,/^\[Test\]/);
  assert.equal((await w.appel('/api/courriels',{methode:'POST',jeton:admin,corps:{lancer:'hebdo'}})).statut,409,'scénario non activé');
  assert.equal((await w.appel('/api/courriels/declencher',{methode:'POST',corps:{scenario:'hebdo'}})).statut,401);
  assert.equal((await w.appel('/api/courriels/declencher',{methode:'POST',corps:{scenario:'hebdo'},extra:{authorization:'Bearer mauvais'}})).statut,401);
 }finally{globalThis.fetch=reel}
});

test('Courriels : câblage du worker, page d’inscription, tâche planifiée',()=>{
 const w=readFileSync('src/worker.js','utf8'),n=readFileSync('public/vitrine/newsletter.html','utf8'),c=readFileSync('src/courriel.js','utf8');
 assert.match(w,/lancerCourriels\(env\)/);assert.match(w,/"\/courriels": "\/vitrine\/courriels\.html"/);
 assert.ok(n.includes('/api/newsletter')===false&&n.includes('sde-newsletter.js'),'le script porte l’appel, pas de script en ligne');
 assert.match(n,/name="consentement"[^>]*required/);assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(n));
 assert.ok(!/RESEND_API_KEY\s*=\s*['"]re_/.test(c),'aucune clé en dur');
 assert.ok(readFileSync('public/vitrine/courriels.html','utf8').includes('noindex'));
});
