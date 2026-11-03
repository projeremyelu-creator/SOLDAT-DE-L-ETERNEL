import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {memberAcademySummary} from '../src/member-academy-summary.js';

const formations=[
 {id:'cours-1',data:{titre:'Fondations',modules:[{id:'m1',titre:'Identité'},{id:'m2',titre:'Discipline'},{id:'m3',titre:'Service'}],
  participants:{
   'a':{statut:'En cours',suivis:{m1:true,m2:false}},
   'b':{statut:'Certifié',suivis:{m1:true,m2:true,m3:true}}
  }}},
 {id:'cours-2',data:{titre:'Mission',modules:[{id:'m4',titre:'Évangélisation'}],
  participants:{'a':{statut:'Certifié',suivis:{m4:true}}}}},
 {id:'cours-b',data:{titre:'Formation confidentielle de B',modules:[{id:'mx',titre:'Étape privée de B'}],
  participants:{'b':{statut:'En cours',suivis:{mx:true}}}}},
 {id:'cours-retire',data:{titre:'Retiré',modules:[{id:'mt',titre:'Retiré'}],
  participants:{'a':{statut:'Retiré',suivis:{mt:true}}}}},
];
test('Academy : chaque compte reçoit uniquement ses propres formations et modules',()=>{
 const a=memberAcademySummary(formations,'a');
 assert.equal(a.formations,2);
 assert.equal(a.certifie,1);
 assert.equal(a.modulesTotal,4);
 assert.equal(a.modulesFaits,2);
 assert.equal(a.pourcentage,50);
 assert.deepEqual(a.parcours.map(c=>c.titre),['Fondations','Mission']);
 assert.deepEqual(a.parcours[0].modules.map(m=>m.suivi),[true,false,false]);
 assert.equal(a.parcours[0].pourcentage,33);
 assert.equal(a.parcours[1].pourcentage,100);
 assert.ok(!JSON.stringify(a).includes('Formation confidentielle de B'));
 assert.ok(!JSON.stringify(a).includes('Étape privée de B'));
 assert.ok(!JSON.stringify(a).includes('Retiré'));
});
test('Academy : profils sans formations et identifiants invalides',()=>{
 for(const id of ['',null,'inconnu']){
  const x=memberAcademySummary(formations,id);
  assert.deepEqual(x.parcours,[]);
  assert.equal(x.formations,0);
  assert.equal(x.pourcentage,null);
 }
 assert.deepEqual(memberAcademySummary(null,'a').parcours,[]);
});
test('Academy : parcours ancien conservé et titres limités',()=>{
 const row={id:'id-1',data:{titre:'Cours '+('x'.repeat(300)),modules:[{id:'1',nom:'Module A'}],participants:{a:{statut:'Inscrit',suivis:{}}}}};
 const x=memberAcademySummary([row],'a');
 assert.equal(x.modulesTotal,1);
 assert.equal(x.modulesFaits,0);
 assert.equal(x.pourcentage,0);
 assert.ok(x.parcours[0].titre.length<=120);
 assert.equal(x.parcours[0].modules[0].titre,'Module A');
});
test('Academy : API derrière le contrôle session, sans autre membre exposé',()=>{
 const src=readFileSync('src/worker.js','utf8');
 const a=src.indexOf('async function apiMonParcoursAcademy(');
 const b=src.indexOf('async function apiMesCotisations(',a);
 assert.ok(a>=0&&b>a);
 const method=src.slice(a,b);
 assert.ok(method.includes('if (!u.connecte || !u.membreId)'));
 assert.ok(method.includes('memberAcademySummary(formations, u.membreId)'));
 assert.ok(method.includes('req.method !== "GET"'));
 const frontend=readFileSync('frontend/tactical-panels.jsx','utf8');
 const ops=readFileSync('frontend/operations.jsx','utf8');
 assert.ok(frontend.includes('d.parcours'));
 assert.ok(frontend.includes('sde-tactical-training-modules'));
 assert.ok(frontend.includes('academyError'));
 assert.ok(ops.includes('academyLoading={!acad.data&&!acad.error}'));
});
