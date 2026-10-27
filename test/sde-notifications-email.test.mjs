import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {renderNotice,recordNotice,flushNotices,mailStatus,notifySde,notificationConfigured} from "../src/notifications.js";
import {SDE_MAIL_RECIPIENT} from "../src/notification-events.js";
const source=readFileSync("src/worker.js","utf8");
function mockDatabase(){
  let id=0;
  const rows=[];
  const DB={prepare(q){
    let args=[];
    return {
      bind(...values){args=values;return this;},
      async run(){
        if(q.includes("UPDATE sde_alertes SET envoye=1")){const row=rows.find(x=>x.id===args[0]);if(row)row.envoye=1;}
        return {success:true};
      },
      async first(){
        if(q.startsWith("INSERT INTO sde_alertes")){
          const row={id:++id,cree:args[0],sujet:args[1],texte:args[2],envoye:0};
          rows.push(row);return row;
        }
        if(q.includes("COUNT(*) AS pending"))return {pending:rows.filter(x=>!x.envoye).length};
        return null;
      },
      async all(){
        if(q.includes("FROM sde_alertes WHERE envoye=0"))return {results:rows.filter(x=>!x.envoye).slice(0,30)};
        return {results:[]};
      }
    };
  }};
  return {DB,rows};
}
test("notifications SDE : destinataire unique et aucune donnée pastorale ou financière dans les e-mails",()=>{
 assert.equal(SDE_MAIL_RECIPIENT,"infosoldat@gmail.com");
 for(const type of ["engagement","sondage","academy","inscription","priere","absence","espace","media","import"]){
  const msg=renderNotice(type,{path:"prieres/xyz",nom:"Nom public",email:"contact@example.com",details:"Diagnostic sensible",motDePasse:"SECRET",montant:600000});
  assert.ok(msg?.subject.startsWith("[SDE]"),type);
  assert.ok(msg.text.includes("app.mouvement-sde.org"));
  assert.ok(!msg.text.includes("Diagnostic sensible"));
  assert.ok(!msg.text.includes("SECRET"));
  assert.ok(!msg.text.includes("600000"));
 }
 const msg=renderNotice("espace",{path:"cotisations/abc",action:"set"});
 assert.ok(msg.text.includes("Finances"));
 assert.ok(!msg.text.includes("abc"));
});
test("notification : file conservée hors ligne et remise après activation du binding e-mail",async()=>{
 const db=mockDatabase(),env={DB:db.DB};
 assert.equal(notificationConfigured(env),false);
 await recordNotice(env,"engagement",{nom:"Personne"});
 assert.equal(db.rows.length,1);
 assert.equal(db.rows[0].envoye,0);
 assert.equal((await mailStatus(env)).en_attente,1);
 const sent=[];
 env.NOTIFICATION_FROM="notifications@mouvement-sde.org";
 env.EMAIL={send:async mail=>{sent.push(mail);return {messageId:"testing"};}};
 assert.equal(notificationConfigured(env),true);
 assert.equal((await flushNotices(env)).sent,1);
 assert.equal((await mailStatus(env)).en_attente,0);
 assert.equal(sent[0].to,"infosoldat@gmail.com");
 assert.equal(sent[0].from,env.NOTIFICATION_FROM);
});
test("notification : échec du prestataire ne modifie pas la saisie ni la file",async()=>{
 const db=mockDatabase(),env={DB:db.DB,NOTIFICATION_FROM:"notifications@mouvement-sde.org",EMAIL:{send:async()=>{throw Error("Indisponible");}}};
 await recordNotice(env,"academy",{nom:"Personne"});
 assert.equal(db.rows[0].envoye,0);
 assert.equal((await mailStatus(env)).active,true);
});
test("notification : opérations publiques et privées déclenchent la file après sauvegarde",()=>{
 for(const type of ["engagement","sondage","academy","inscription","priere","absence","import","espace","media"])
  assert.ok(source.includes('notifySde(env,ctx,"'+type+'"'),"événement non connecté : "+type);
 assert.ok(source.includes('u.niveau < 3'),"statut réservé au propriétaire");
 assert.ok(source.includes("/api/notifications-status"));
 assert.ok(source.includes("flushNotices(env)"));
 assert.ok(source.includes("sendPortalReminders(env)"));
 const wrangler=readFileSync("wrangler.toml","utf8");
 assert.ok(wrangler.includes("*/15 * * * *"));
 assert.ok(wrangler.includes('destination_address = "infosoldat@gmail.com"'));
 assert.ok(wrangler.includes('# [[send_email]]'),"binding non activé avant vérification Gmail");
});
test("notification : les tâches non bloquantes utilisent waitUntil",async()=>{
 const db=mockDatabase(),env={DB:db.DB};
 const jobs=[];notifySde(env,{waitUntil:p=>jobs.push(p)},"absence",{});
 assert.equal(jobs.length,1);
 await Promise.all(jobs);
 assert.equal(db.rows.length,1);
});
