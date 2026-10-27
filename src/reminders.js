import {sendPushNotification} from "./web-push.js";

const defaults={rencontres:true,formations:true,taches:true,lecture:true,cotisations:true,delai:1};
const clean=(value,size=180)=>String(value??"").replace(/[\r\n\t]+/g," ").trim().slice(0,size);
const dateAt=(timestamp)=>new Date(timestamp).toISOString().slice(0,10);
const monthAt=(timestamp)=>dateAt(timestamp).slice(0,7);
const addDays=(timestamp,days)=>dateAt(timestamp+days*86400000);

async function ensure(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS portail_etat (compte TEXT PRIMARY KEY,preferences TEXT NOT NULL,parcours TEXT NOT NULL,maj INTEGER NOT NULL)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS portail_rappels_envoyes (id TEXT PRIMARY KEY,userId TEXT NOT NULL,type TEXT NOT NULL,objet TEXT NOT NULL,echeance TEXT NOT NULL,cree INTEGER NOT NULL)").run();
 await env.DB.prepare("DELETE FROM portail_rappels_envoyes WHERE cree < ?").bind(Date.now()-120*86400000).run();
}
function parse(value,fallback={}){try{return JSON.parse(value)||fallback}catch{return fallback}}
function notification(kind,id,due,title,body,url){
 return {kind,due,title,body,url,tag:`sde-${kind}-${id}-${due}`,sound:true};
}

export async function sendPortalReminders(env,{now=Date.now(),send=sendPushNotification}={}){
 if(!env?.VAPID_PUBLIC_KEY||!env?.VAPID_PRIVATE_KEY)return{sent:0,notifications:0,reason:"config"};
 const hour=new Date(now).getUTCHours();
 if(hour<7||hour>=21)return{sent:0,notifications:0,reason:"quiet_hours"};
 await ensure(env);
 const subscriptions=(await env.DB.prepare("SELECT userId,endpoint,p256dh,auth FROM push_subs ORDER BY userId").all()).results||[];
 if(!subscriptions.length)return{sent:0,notifications:0};
 const accountRows=(await env.DB.prepare("SELECT id,membreId,role FROM comptes WHERE id IN (SELECT DISTINCT userId FROM push_subs)").all()).results||[];
 const stateRows=(await env.DB.prepare("SELECT compte,preferences FROM portail_etat").all()).results||[];
 const docRows=(await env.DB.prepare("SELECT path,parent,id,data FROM docs WHERE parent IN ('config','membres','evenements','formations','cotisations')").all()).results||[];
 const docs=docRows.map(row=>({...row,value:parse(row.data)}));
 const config=docs.find(x=>x.path==="config/general")?.value||{};
 const members=new Map(docs.filter(x=>x.parent==="membres").map(x=>[x.id,x.value]));
 const events=docs.filter(x=>x.parent==="evenements");
 const formations=docs.filter(x=>x.parent==="formations");
 const cotisations=docs.filter(x=>x.parent==="cotisations");
 const preferences=new Map(stateRows.map(row=>[row.compte,{...defaults,...parse(row.preferences)}]));
 const accounts=new Map(accountRows.map(row=>[row.id,row]));
 const byUser=new Map();for(const sub of subscriptions){if(!byUser.has(sub.userId))byUser.set(sub.userId,[]);byUser.get(sub.userId).push(sub)}
 const today=dateAt(now),month=monthAt(now),amount=Number(config.cotisationMensuelle)||0;
 let sent=0,notifications=0;
 for(const [userId,subs]of byUser){
  const account=accounts.get(userId);if(!account)continue;
  const memberId=account.membreId||"",member=members.get(memberId)||{},prefs=preferences.get(userId)||{...defaults};
  const until=addDays(now,[1,3,7].includes(Number(prefs.delai))?Number(prefs.delai):1);
  const pending=[];
  const responsable=['contributeur','admin','proprietaire'].includes(account.role);
  if(prefs.rencontres)for(const row of events){const e=row.value,due=clean(e.date,10);if(e.prive===true&&!responsable)continue;if(due>=today&&due<=until){const when=[due,clean(e.heure,5),clean(e.lieu)].filter(Boolean).join(" · ");pending.push(notification("rencontre",row.id,due,"Rappel SDE · "+clean(e.titre||"Rencontre"),when,"/mon-espace?module=agenda"))}}
  if(prefs.formations&&memberId)for(const row of formations){const f=row.value,part=f.participants?.[memberId],due=clean(f.dateDebut,10);if(part&&!['Retiré','Abandon','Certifié'].includes(part.statut)&&due>=today&&due<=until)pending.push(notification("formation",row.id,due,"Rappel SDE · "+clean(f.titre||"Formation"),"Votre formation approche : "+due,"/mon-espace?module=academie"))}
  const start=clean(config.cotisationDebut,7),joined=clean(member.adhesion,7);
  const monthNumber=month.slice(5),year=Number(month.slice(0,4));
  const paid=cotisations.some(row=>row.value.membreId===memberId&&(
    (Number(row.value.annee)===year&&row.value.mois&&typeof row.value.mois==='object'&&!!row.value.mois[monthNumber])||
    clean(row.value.mois,7)===month||clean(row.value.date,10).startsWith(month)
  ));
  if(prefs.cotisations!==false&&memberId&&members.has(memberId)&&amount>0&&!member.cotisationExempte&&(!start||start<=month)&&(!joined||joined<=month)&&!paid){
   pending.push(notification("cotisation",month,month,"Rappel de cotisation SDE","Un rappel de cotisation est disponible dans votre espace personnel. Merci pour votre fidélité et votre engagement.","/mon-espace?module=espace"));
  }
  for(const payload of pending){
   const key=[userId,payload.kind,payload.tag].join("|");
   if(await env.DB.prepare("SELECT id FROM portail_rappels_envoyes WHERE id=?").bind(key).first())continue;
   let delivered=0;
   for(const sub of subs){const result=await send(sub,payload,env);if(result?.ok){sent++;delivered++}else if(result?.reason==="expired")await env.DB.prepare("DELETE FROM push_subs WHERE userId=? AND endpoint=?").bind(userId,sub.endpoint).run()}
   if(delivered){notifications++;await env.DB.prepare("INSERT OR IGNORE INTO portail_rappels_envoyes(id,userId,type,objet,echeance,cree) VALUES(?,?,?,?,?,?)").bind(key,userId,payload.kind,payload.tag,payload.due,now).run()}
  }
 }
 return{sent,notifications};
}
