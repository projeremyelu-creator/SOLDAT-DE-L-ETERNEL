// Recette isolée des espaces privés : mêmes routes Worker et SQLite que la production,
// comptes fictifs seulement. Aucune donnée réelle ni secret d'accès utilisé.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {fixture} from './helpers/d1.mjs';

function contexte(){
  const f=fixture();
  for(const [id,role] of [
    ['alice','soldat'],['bob','soldat'],['staff','contributeur'],
    ['admin','admin'],['owner','proprietaire']
  ]) f.account(id,role);
  f.doc('membres/alice',{nom:'ALICE',prenoms:'Essai',telephone:'0700000000',matricule:'RECETTE-A',pole:'Formation'});
  f.doc('membres/bob',{nom:'BOB',prenoms:'Essai',telephone:'0100000000',matricule:'RECETTE-B',pole:'Missions'});
  return f;
}

test('Recette 2.1 : sessions et espaces protégés sur les deux domaines',async()=>{
  const f=contexte();
  try{
    for(const host of ['mouvement-sde.org','app.mouvement-sde.org']){
      const get=(path,id)=>worker.fetch(new Request('https://'+host+path,{
        headers:id?{cookie:'sde_s='+id}:{}
      }),f.env,{waitUntil(){}});
      assert.equal((await get('/mon-espace')).status,302,host+' anonyme membre');
      assert.equal((await get('/administration')).status,302,host+' anonyme administration');
      assert.equal((await get('/mon-espace','alice')).status,200,host+' membre');
      assert.equal((await get('/administration','alice')).status,403,host+' membre sans privilège');
      assert.equal((await get('/administration','staff')).status,200,host+' responsable');
      assert.equal((await get('/administration','admin')).status,200,host+' administration');
      const page=await get('/mon-espace','alice');
      assert.match(page.headers.get('cache-control')||'',/no-store/);
      assert.match(page.headers.get('x-robots-tag')||'',/noindex/);
    }
  }finally{f.close()}
});

test('Recette 2.2 : profil du membre enregistré, relu et isolé de celui des autres',async()=>{
  const f=contexte();
  try{
    assert.equal((await f.call('/api/mon-espace','alice')).body.membre.telephone,'0700000000');
    const change=await f.call('/api/mon-profil','alice','PATCH',{
      telephone:'0701020304',quartier:'Cocody',pole:'Pôle non autorisé'
    });
    assert.equal(change.status,200);
    const alice=await f.call('/api/mon-espace','alice');
    const bob=await f.call('/api/mon-espace','bob');
    assert.equal(alice.body.membre.telephone,'0701020304');
    assert.equal(alice.body.membre.quartier,'Cocody');
    assert.equal(alice.body.membre.pole,'Formation');
    assert.equal(bob.body.membre.telephone,'0100000000');
    assert.equal((await f.call('/api/mon-profil',null,'PATCH',{telephone:'999'})).status,404);
    const brut=await f.call('/api/db','alice','POST',{op:'query',path:'membres'});
    assert.deepEqual(brut.body.docs,[]);
  }finally{f.close()}
});

test('Recette 2.3 : création admin d’un événement et inscription réelle du membre',async()=>{
  const f=contexte();
  try{
    const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
    const creer=await f.call('/api/db','admin','POST',{
      op:'set',path:'evenements/recette',data:{titre:'Rencontre de recette SDE',date,heure:'10:00',prive:false}
    });
    assert.equal(creer.status,200,JSON.stringify(creer.body));
    const publicMember=await f.call('/api/mes-evenements','alice');
    assert.equal(publicMember.status,200);
    assert.ok(publicMember.body.evenements.some(e=>e.id==='recette'));
    const rsvp=await f.call('/api/mes-evenements','alice','POST',{evenement:'recette',participe:true});
    assert.equal(rsvp.status,200);
    assert.equal((await f.call('/api/mes-evenements','alice')).body.evenements.find(e=>e.id==='recette').inscrit,true);
    assert.equal((await f.call('/api/mes-evenements','bob')).body.evenements.find(e=>e.id==='recette').inscrit,false);
    assert.equal((await f.call('/api/mes-evenements','alice','POST',{evenement:'recette',participe:true})).status,200);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM portail_inscriptions_evenements').get().n,1);
    assert.equal((await f.call('/api/tableau-de-bord','admin')).body.total.evenements,1);
    assert.equal((await f.call('/api/tableau-de-bord','alice')).status,403);
  }finally{f.close()}
});

test('Recette 2.4 : caisse admin enregistrée et agrégée, invisible aux soldats',async()=>{
  const f=contexte();
  try{
    const date=new Date().toISOString().slice(0,10),mois=date.slice(0,7);
    const path='finances/'+mois+'/ops/recette';
    const record=await f.call('/api/db','admin','POST',{
      op:'set',path,data:{sens:'E',montant:15000,date,libelle:'Recette test'}
    });
    assert.equal(record.status,200,JSON.stringify(record.body));
    assert.equal((await f.call('/api/db','staff','POST',{op:'set',path,data:{sens:'S',montant:9999,date}})).status,403);
    assert.equal((await f.call('/api/db','alice','POST',{op:'set',path,data:{sens:'S',montant:9999,date}})).status,403);
    const memberRaw=await f.call('/api/db','alice','POST',{op:'get',path});
    assert.deepEqual(memberRaw.body,{exists:false});
    assert.equal((await f.call('/api/pilotage-finances','staff')).status,403);
    const bilan=await f.call('/api/pilotage-finances','admin');
    assert.equal(bilan.status,200,JSON.stringify(bilan.body));
    assert.equal(bilan.body.entrees,15000);
    const trace=await f.call('/api/journal-administratif','admin');
    assert.equal(trace.status,200);
    assert.ok(trace.body.actions.some(a=>a.rubrique==='finances'&&a.operation==='set'));
    assert.ok(!JSON.stringify(trace.body).includes('15000'));
  }finally{f.close()}
});

test('Recette 2.5 : Soldiers Academy suit uniquement la progression personnelle',async()=>{
  const f=contexte();
  try{
    const publish=await f.call('/api/db','admin','POST',{
      op:'set',path:'formations/recette',data:{
        titre:'Soldiers Academy Recette',
        modules:[{id:'m1',titre:'Fondements'},{id:'m2',titre:'Vie de prière'}],
        participants:{alice:{statut:'En cours',suivis:{m1:true}}}
      }
    });
    assert.equal(publish.status,200);
    const alice=await f.call('/api/mon-parcours-academy','alice');
    const bob=await f.call('/api/mon-parcours-academy','bob');
    assert.equal(alice.status,200);
    assert.equal(alice.body.formations,1);
    assert.equal(alice.body.modulesTotal,2);
    assert.equal(alice.body.modulesFaits,1);
    assert.equal(bob.body.formations,0);
    const resume=await f.call('/api/portail-resume','alice');
    assert.equal(resume.status,200);
    assert.ok(resume.body.formations.some(x=>x.titre==='Soldiers Academy Recette'));
    assert.ok(!JSON.stringify(resume.body).includes('participants'));
    assert.equal((await f.call('/api/portail-resume',null)).status,401);
  }finally{f.close()}
});

test('Recette 2.6 : comptes, élévation des droits et dossiers confidentiels cloisonnés',async()=>{
  const f=contexte();
  try{
    assert.equal((await f.call('/api/comptes','alice')).status,403);
    assert.equal((await f.call('/api/comptes','staff')).status,403);
    assert.equal((await f.call('/api/comptes','admin')).status,200);
    assert.equal((await f.call('/api/comptes','admin','POST',{email:'staff@example.org',role:'admin'})).status,403);
    assert.equal((await f.call('/api/comptes','owner','POST',{email:'staff@example.org',role:'admin'})).status,200);
    assert.equal(f.sql.prepare("SELECT role FROM comptes WHERE email='staff@example.org'").get().role,'admin');
    assert.equal((await f.call('/api/db','admin','POST',{op:'set',path:'suivi/alice',data:{note:'SECRET'}})).status,403);
    assert.equal((await f.call('/api/db','owner','POST',{op:'set',path:'suivi/alice',data:{note:'SECRET'}})).status,200);
    assert.deepEqual((await f.call('/api/db','admin','POST',{op:'query',path:'suivi'})).body.docs,[]);
    assert.equal((await f.call('/api/db','owner','POST',{op:'get',path:'suivi/alice'})).body.data.note,'SECRET');
    assert.equal((await f.call('/api/db','alice','POST',{op:'get',path:'suivi/alice'})).body.exists,false);
  }finally{f.close()}
});

test('Recette 2.7 : prière privée d’un soldat visible pour lui et le propriétaire, pas les autres',async()=>{
  const f=contexte();
  try{
    const subject='Une demande privée de test';
    assert.equal((await f.call('/api/priere','alice','POST',{sujet:subject,confidentiel:true})).status,200);
    const history=(await f.call('/api/mon-historique','alice')).body.prieres;
    assert.equal(history.length,1);
    assert.equal(history[0].confidentiel,true);
    assert.equal((await f.call('/api/mon-historique','bob')).body.prieres.length,0);
    assert.deepEqual((await f.call('/api/db','admin','POST',{op:'query',path:'prieres_conf'})).body.docs,[]);
    assert.equal((await f.call('/api/db','owner','POST',{op:'query',path:'prieres_conf'})).body.docs.length,1);
    assert.ok(!JSON.stringify((await f.call('/api/portail-resume','bob')).body).includes(subject));
  }finally{f.close()}
});
