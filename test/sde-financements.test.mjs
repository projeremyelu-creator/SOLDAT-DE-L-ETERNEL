import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/d1.mjs';

test('Collectes : aucune somme publiée avant validation du propriétaire',async()=>{
 const f=fixture();try{
  const initial=await f.call('/api/sde-financements');
  assert.equal(initial.status,200);
  assert.ok(initial.body.projets.every(x=>x.donneesVerifiees===false&&x.encaisse===null));
  f.account('member','soldat');f.account('admin','admin');f.account('owner','proprietaire');
  const data={projet:'in-fire-2027',objectif:150000,encaisse:25000,reference:'releve-verifie-001',publie:true};
  assert.equal((await f.call('/api/sde-financements',null,'POST',data)).status,403);
  assert.equal((await f.call('/api/sde-financements','admin','POST',data)).status,403);
  assert.equal((await f.call('/api/sde-financements','owner','POST',data)).status,200);
  const published=await f.call('/api/sde-financements');
  assert.equal(published.body.projets.find(p=>p.id==='in-fire-2027').encaisse,25000);
  assert.equal(published.body.projets.find(p=>p.id==='soldiers-academy').encaisse,null);
 }finally{f.close()}
});
test('Rapport trimestriel : validation, brouillon et publication séparés',async()=>{
 const f=fixture();try{
  f.account('owner','proprietaire');
  const report={periode:'2026-Q4',texte:'Rapport trimestriel de contrôle des programmes, des contributions et des dépenses, validé par le propriétaire.',reference:'sde-rapport-2026-q4',publie:false};
  const draft=await f.call('/api/sde-bilans','owner','POST',report);
  assert.equal(draft.status,200);
  assert.equal((await f.call('/api/sde-bilans')).body.rapports.length,0);
  const publicReport=await f.call('/api/sde-bilans','owner','POST',{...report,publie:true});
  assert.equal(publicReport.status,200);
  assert.equal((await f.call('/api/sde-bilans')).body.rapports.length,1);
 }finally{f.close()}
});
