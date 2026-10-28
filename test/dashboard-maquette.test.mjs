import {test} from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/d1.mjs';
test('Dashboard : agrégats de fréquentation et de formation issus des seules données réelles',async()=>{const f=fixture();try{
 f.account('admin','admin');f.account('alice');
 f.doc('evenements/e1',{titre:'Rencontre',date:'2026-01-10',presents:{alice:true,bob:'retard',c:false,d:'excuse'}});
 f.doc('evenements/futur',{titre:'FUTUR SECRET',date:'2099-01-01',presents:{alice:true}});
 f.doc('evenements/sans',{titre:'Sans pointage',date:'2026-01-11'});
 f.doc('formations/f1',{modules:[{id:'m1'},{id:'m2'}],participants:{alice:{statut:'En cours',suivis:{m1:true,ancien:true}},bob:{statut:'Certifié',suivis:{m1:true,m2:true}},retire:{statut:'Retiré',suivis:{m1:true,m2:true}}}});
 f.doc('projets/p1',{statut:'En cours',taches:{a:{statut:'Fait'},b:{statut:'À faire'}}});
 f.doc('projets/p2',{statut:'Terminé'});f.doc('finances/f1',{montant:1234567,libelle:'SECRET FINANCIER'});
 const r=await f.call('/api/tableau-de-bord','admin');assert.equal(r.status,200);
 assert.deepEqual(r.body.frequentation,[{date:'2026-01-10',titre:'Rencontre',presents:1,retards:1,absents:1,excuses:1}]);
 assert.deepEqual(r.body.academie,{inscriptions:2,certifies:1,modulesSuivis:3,modulesAttendus:4});
 assert.deepEqual(r.body.missions,{actifs:1,termines:1,tachesFaites:1,tachesTotal:2});
 assert.ok(!JSON.stringify(r.body).includes('alice'));assert.ok(!JSON.stringify(r.body).includes('1234567'));
 assert.equal((await f.call('/api/tableau-de-bord','alice')).status,403);
}finally{f.close()}});
test('Dashboard : sans données, aucune courbe ni pourcentage fictif',async()=>{const f=fixture();try{f.account('responsable','contributeur');const r=await f.call('/api/tableau-de-bord','responsable');assert.deepEqual(r.body.frequentation,[]);assert.equal(r.body.academie.modulesAttendus,0);assert.equal(r.body.missions.tachesTotal,0)}finally{f.close()}});
test('Direction : actifs, taux explicite et urgences sans dossiers confidentiels',async()=>{const f=fixture();try{
 f.account('editor','contributeur');f.doc('membres/a',{actif:true});f.doc('membres/b',{});f.doc('membres/c',{actif:true});f.doc('membres/d',{actif:false});
 f.doc('evenements/e',{date:new Date().toISOString().slice(0,10),presents:{a:true,b:'retard',c:false,d:'excuse'}});
 f.doc('prieres/p',{urgent:true,statut:'En prière',sujet:'SUJET A MASQUER',date:'2026-10-28'});f.doc('prieres/fin',{urgent:true,statut:'Exaucée'});f.doc('prieres_conf/secret',{urgent:true,sujet:'SECRET LEADER'});
 const r=(await f.call('/api/tableau-de-bord','editor')).body;assert.equal(r.indicateurs.membresActifs,3);assert.equal(r.indicateurs.presence.taux,67);assert.equal(r.indicateurs.presence.renseignes,3);assert.equal(r.indicateurs.intercessions,1);assert.equal(r.urgences.length,1);assert.ok(!JSON.stringify(r).includes('SUJET A MASQUER'));assert.ok(!JSON.stringify(r).includes('SECRET LEADER'));assert.ok(r.actualiseLe);
}finally{f.close()}});

test('Assiduité native : absences nulles ou non cochées, adhésion et garnisons',async()=>{const f=fixture();try{f.account('admin','admin');for(const [id,data]of Object.entries({a:{garnisonId:'g'},b:{garnisonId:'g'},c:{garnisonId:'sub'},autre:{garnisonId:'else'},nouveau:{garnisonId:'g',adhesion:'2099-01-01'},archive:{garnisonId:'g',actif:false}}))f.doc('membres/'+id,data);f.doc('garnisons/g',{});f.doc('garnisons/sub',{parentId:'g'});f.doc('garnisons/else',{});f.doc('evenements/e',{date:'2026-01-01',garnisonId:'g',presents:{a:true,b:null}});const k=(await f.call('/api/tableau-de-bord','admin')).body.indicateurs;assert.equal(k.presence.taux,33);assert.equal(k.presence.renseignes,3)}finally{f.close()}});
