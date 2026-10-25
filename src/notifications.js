import {SDE_MAIL_RECIPIENT,PRIVATE_DASHBOARD,SDE_ALERT_TYPES} from "./notification-events.js";
const sections={membres:"Membres",prieres:"Prières",accompagnement:"Accompagnement pastoral",pastoral:"Accompagnement pastoral",cotisations:"Finances",offrandes:"Finances",projets_fin:"Finances",projets:"Projets",evenements:"Agenda",formations:"Formations",absences:"Absences",directoire:"Directoire"};
const safe=(value,size=100)=>String(value??"").replace(/[\\r\\n\\t]/g," ").trim().slice(0,size);
export function notificationConfigured(env){return !!(env?.NOTIFICATION_FROM && typeof env?.EMAIL?.send==="function");}
export function renderNotice(type,details={}){
 if(!SDE_ALERT_TYPES.includes(type))return null;
 const section=type==="espace"?(sections[String(details.path||"").split("/")[0]]||"Autre espace privé"):type;
 const topic=safe(section,80);
 return {subject:"[SDE] Nouvelle information : "+topic,text:[
 "Une information a été enregistrée dans le système SDE.","",
 "Rubrique : "+topic,
 "Opération : "+safe(details.action||"Nouvelle saisie",40),
 "Traitement sécurisé : "+PRIVATE_DASHBOARD,
 "","Aucune donnée pastorale, financière ou personnelle détaillée n'est jointe."
 ].join("\n")};
}
const sql="CREATE TABLE IF NOT EXISTS sde_alertes (id INTEGER PRIMARY KEY AUTOINCREMENT,cree INTEGER NOT NULL, sujet TEXT NOT NULL, texte TEXT NOT NULL,envoye INTEGER NOT NULL DEFAULT 0)";
async function table(env){await env.DB.prepare(sql).run();}
async function sendPending(env,row){
 if(!notificationConfigured(env))return false;
 try{
  await env.EMAIL.send({from:String(env.NOTIFICATION_FROM),to:SDE_MAIL_RECIPIENT,subject:row.sujet,text:row.texte});
  await env.DB.prepare("UPDATE sde_alertes SET envoye=1 WHERE id=?").bind(row.id).run();
  return true;
 }catch(error){console.warn("Envoi SDE non confirmé",error?.name||"Erreur");return false;}
}
export async function recordNotice(env,type,details={}){
 const note=renderNotice(type,details);if(!note)return false;
 await table(env);
 const row=await env.DB.prepare("INSERT INTO sde_alertes (cree,sujet,texte) VALUES (?,?,?) RETURNING id,sujet,texte")
  .bind(Date.now(),note.subject,note.text).first();
 if(row)await sendPending(env,row);
 return !!row;
}
export function notifySde(env,ctx,type,details={}){
 const task=recordNotice(env,type,details).catch(error=>console.warn("SDE : alerte non enregistrée",error?.name||"Erreur"));
 if(typeof ctx?.waitUntil==="function")ctx.waitUntil(task);
 return task;
}
export async function flushNotices(env){
 if(!notificationConfigured(env))return {sent:0};
 await table(env);
 const rows=await env.DB.prepare("SELECT id,sujet,texte FROM sde_alertes WHERE envoye=0 ORDER BY id LIMIT 30").all();
 let sent=0;
 for(const row of rows.results||[])if(await sendPending(env,row))sent++;
 return {sent};
}
export async function mailStatus(env){
 await table(env);
 const row=await env.DB.prepare("SELECT COUNT(*) AS pending FROM sde_alertes WHERE envoye=0").first();
 return {destinataire:SDE_MAIL_RECIPIENT,active:notificationConfigured(env),en_attente:Number(row?.pending||0)};
}
