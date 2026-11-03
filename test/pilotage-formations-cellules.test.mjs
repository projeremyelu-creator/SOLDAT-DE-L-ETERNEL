import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import {resumerFormations,resumerCellules} from '../src/os-v31.js';
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


test('Pilotage : effectifs de formation sans noms, retirés exclus',()=>{
 const r=resumerFormations([
  {titre:'Fondations',dateDebut:'2026-10-01',participants:{a:{statut:'Inscrit',nom:'SECRET'},b:{statut:'Certifié'},c:{statut:'Retiré'},d:{statut:'Abandon'}}},
  {titre:'Maturité',dateDebut:'2026-11-15'}
 ]);
 assert.equal(r.total,2);assert.equal(r.inscrits,2);assert.equal(r.certifies,1);
 assert.equal(r.lignes[0].titre,'Maturité','plus récente d’abord');
 const f=r.lignes.find(x=>x.titre==='Fondations');assert.deepEqual([f.inscrits,f.certifies,f.retires],[2,1,2]);
 assert.ok(!JSON.stringify(r).includes('SECRET'));
});

test('Pilotage : cellules, cellules de prière, membres rattachés (sous-groupes compris)',()=>{
 const garnisons=[
  {id:'g0',nom:'Siège',type:'Siège'},
  {id:'c1',nom:'Cellule de prière de Yopougon',type:'Cellule',parentId:'g0',ville:'Abidjan',pays:'Côte d’Ivoire',jour:'Mardi',heure:'19:00',responsableId:'m1',statut:'Active'},
  {id:'c2',nom:'Cellule de Cocody',type:'Cellule',parentId:'g0'},
  {id:'sg',nom:'Sous-groupe',type:'Groupe',parentId:'c1'}
 ];
 const membres=[{garnisonId:'c1'},{garnisonId:'sg'},{garnisonId:'sg',actif:false},{garnisonId:'c2'},{}];
 const r=resumerCellules(garnisons,membres);
 assert.equal(r.total,2);assert.equal(r.priere,1);assert.equal(r.sansResponsable,1);
 assert.equal(r.cellules[0].nom,'Cellule de prière de Yopougon');assert.equal(r.cellules[0].priere,true);
 assert.equal(r.cellules[0].membres,2,'le sous-groupe compte, l’inactif non');
 assert.equal(r.cellules[1].membres,1);assert.equal(r.cellules[0].parent,'Siège');
 assert.deepEqual(resumerCellules([],[]),{cellules:[],total:0,priere:0,sansResponsable:0});
});

test('Pilotage : action réservée aux administrateurs, données réelles de la base',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin','admin'),simple=w.compte('s','Simple');
 const doc=(parent,id,d)=>w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES(?,?,?,?,1,1)").run(parent+'/'+id,parent,id,JSON.stringify(d));
 doc('formations','f1',{titre:'Fondations',dateDebut:'2026-10-01',participants:{m1:{statut:'Inscrit'},m2:{statut:'Certifié'}}});
 doc('garnisons','c1',{nom:'Cellule de prière',type:'Cellule',responsableId:'m1'});
 doc('membres','m1',{nom:'A',garnisonId:'c1'});
 const appel=(jeton,action)=>worker.fetch(new Request(ORIGINE+'/api/os-v31',{method:'POST',headers:{'content-type':'application/json',cookie:jeton?'sde_s='+jeton:''},body:JSON.stringify({action})}),w.env,{waitUntil(){}}).then(async r=>({statut:r.status,json:await r.json()}));
 assert.equal((await appel(undefined,'pilotage')).statut,401);
 assert.equal((await appel(simple,'pilotage')).statut,403);
 const r=await appel(admin,'pilotage');
 assert.equal(r.statut,200);assert.equal(r.json.formations.inscrits,2);assert.equal(r.json.cellules.priere,1);assert.equal(r.json.cellules.cellules[0].membres,1);
});

test('Pilotage : section du tableau de bord, sans script en ligne',()=>{
 const h=readFileSync('public/os-v31/index.html','utf8'),j=readFileSync('public/os-v31/sde-os.js','utf8');
 assert.match(h,/id="pilotage-admin"[^>]*hidden/);assert.ok(h.includes('id="pilotage-formations"')&&h.includes('id="pilotage-cellules"'));
 assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(h));
 assert.match(j,/api\("pilotage"\)/);assert.ok(!/innerHTML/.test(j.slice(j.indexOf('async function loadPilotage'),j.indexOf('async function loadPilotage')+2500)),'rendu par textContent uniquement');
});
