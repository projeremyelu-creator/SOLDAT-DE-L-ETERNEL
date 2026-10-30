import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './helpers/d1.mjs';
import {broadcastPush} from '../src/web-push.js';

function setup() {
  const f=fixture();
  for(const [id,role] of [
    ['alice','soldat'],['bob','soldat'],['staff','contributeur'],
    ['admin','admin'],['owner','proprietaire'],['director','soldat']
  ]) f.account(id,role);
  f.env.PROPRIETAIRES='owner@example.org,director@example.org';
  f.env.VAPID_PUBLIC_KEY='publique-de-test';
  f.env.VAPID_PRIVATE_KEY='privee-de-test';
  f.sql.exec('CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT, auth TEXT, cree INTEGER, PRIMARY KEY (userId, endpoint))');
  for(const id of ['alice','bob','staff','admin','owner','director','deleted']){
    f.sql.prepare('INSERT INTO push_subs(userId,endpoint,p256dh,auth,cree) VALUES(?,?,?,?,?)')
      .run(id,'https://push.example.test/'+id,'test-public','test-auth',Date.now());
  }
  return f;
}

test('Alertes de gestion : seuls administrateurs et propriétaires reçoivent les push',async()=>{
  const f=setup();
  try {
    const delivered=[];
    const res=await broadcastPush(f.env,{title:'Nouvelle information',url:'/administration'},{
      audience:'direction',send:async(sub,payload)=>{
        delivered.push({id:sub.userId,url:payload.url});return {ok:true};
      }
    });
    assert.deepEqual(delivered.map(x=>x.id).sort(),['admin','director','owner']);
    assert.ok(delivered.every(x=>x.url==='/administration'));
    assert.equal(res.total,3);
    assert.equal(res.sent,3);
    assert.ok(!delivered.some(x=>['alice','bob','staff','deleted'].includes(x.id)));
  } finally { f.close(); }
});

test('Alertes de gestion : rétrogradation de rôle immédiatement prise en compte',async()=>{
  const f=setup();
  try {
    f.sql.prepare("UPDATE comptes SET role='soldat' WHERE id='admin'").run();
    const delivered=[];
    await broadcastPush(f.env,{title:'Gestion'},{
      audience:'direction',send:async sub=>{delivered.push(sub.userId);return{ok:true};}
    });
    assert.deepEqual(delivered.sort(),['director','owner']);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM push_subs WHERE userId='admin'").get().n,1,
      'L’appareil rétrogradé reste abonné aux seuls rappels personnels');
  } finally { f.close(); }
});

test('Alertes de gestion : abonnement expiré nettoyé, seuls les destinataires autorisés contactés',async()=>{
  const f=setup();
  try {
    const delivered=[];
    const res=await broadcastPush(f.env,{title:'Gestion'},{
      audience:'direction',send:async sub=>{
        delivered.push(sub.userId);
        return sub.userId==='admin'?{ok:false,reason:'expired'}:{ok:true};
      }
    });
    assert.deepEqual(delivered.sort(),['admin','director','owner']);
    assert.equal(res.expired,1);
    assert.equal(res.sent,2);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM push_subs WHERE userId='admin'").get().n,0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM push_subs WHERE userId='alice'").get().n,1);
  } finally { f.close(); }
});

test('Rappels communautaires distincts : diffusion générale encore possible',async()=>{
  const f=setup();
  try {
    const seen=[];
    const res=await broadcastPush(f.env,{title:'Annonce communautaire'},{
      send:async sub=>{seen.push(sub.userId);return{ok:true};}
    });
    assert.deepEqual(seen.sort(),['admin','alice','bob','director','owner','staff']);
    assert.equal(res.total,6);
  } finally { f.close(); }
});

test('Notifications : audience invalide ou secrets manquants n’envoient rien',async()=>{
  const f=setup();
  try {
    const sent=[];
    const send=async sub=>{sent.push(sub.userId);return{ok:true};};
    assert.equal((await broadcastPush(f.env,{title:'A'}, {audience:'inconnue',send})).sent,0);
    delete f.env.VAPID_PRIVATE_KEY;
    assert.equal((await broadcastPush(f.env,{title:'B'}, {audience:'direction',send})).sent,0);
    assert.deepEqual(sent,[]);
  } finally { f.close(); }
});

test('Les notifications de direction utilisent obligatoirement le filtrage des destinataires',()=>{
  const source=readFileSync('src/notifications.js','utf8');
  assert.match(source,/broadcastPush\(env,\s*\{[\s\S]*?url:\s*"\/administration"[\s\S]*?\},\s*\{audience:"direction"\}\)/);
});
