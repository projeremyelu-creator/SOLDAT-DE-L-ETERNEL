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
