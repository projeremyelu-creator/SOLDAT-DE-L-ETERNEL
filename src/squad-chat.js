import {sendPushNotification} from './web-push.js';
/* Chat Squad : une messagerie texte par Squad, réservée à ses membres.
   - L'administration (niveau 2+) crée les Squads et en gère les membres.
   - Un responsable de Squad et l'administration peuvent retirer un message.
   - Aucun média, aucun message public : tout est lu côté interface par textContent. */
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>json({ok:false,message},status);
export const POLES_SQUAD=['REV','ISH','LO','CMR','FDE'];
export const TEXTE_MAX=1000;
export const MESSAGES_PAR_PAGE=50;
const ID=/^[a-zA-Z0-9_-]{1,80}$/;
async function ensure(env){
 for(const sql of [
  'CREATE TABLE IF NOT EXISTS sde_squads (id TEXT PRIMARY KEY,nom TEXT NOT NULL,description TEXT NOT NULL DEFAULT \'\',pole TEXT NOT NULL DEFAULT \'\',statut TEXT NOT NULL DEFAULT \'actif\',cree INTEGER NOT NULL,cree_par TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sde_squad_membres (squad TEXT NOT NULL,compte TEXT NOT NULL,nom TEXT NOT NULL DEFAULT \'\',role TEXT NOT NULL DEFAULT \'membre\',cree INTEGER NOT NULL,PRIMARY KEY(squad,compte))',
  'CREATE INDEX IF NOT EXISTS sde_squad_membres_compte ON sde_squad_membres(compte)',
  'CREATE TABLE IF NOT EXISTS sde_squad_messages (id TEXT PRIMARY KEY,squad TEXT NOT NULL,auteur TEXT NOT NULL,nom TEXT NOT NULL,texte TEXT NOT NULL,cree INTEGER NOT NULL,statut TEXT NOT NULL DEFAULT \'publie\',retire_par TEXT)',
  'CREATE INDEX IF NOT EXISTS sde_squad_messages_fil ON sde_squad_messages(squad,cree)',
  'CREATE TABLE IF NOT EXISTS sde_squad_lectures (squad TEXT NOT NULL,compte TEXT NOT NULL,vu INTEGER NOT NULL,PRIMARY KEY(squad,compte))',
  'CREATE TABLE IF NOT EXISTS sde_squad_push (squad TEXT NOT NULL,compte TEXT NOT NULL,dernier INTEGER NOT NULL,PRIMARY KEY(squad,compte))'
 ])await env.DB.prepare(sql).run();
}
const propre=(v,max)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
export const nettoyerTexte=v=>typeof v==='string'?v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/\n{3,}/g,'\n\n').trim():'';
/* Droit de l'utilisateur sur une Squad : 'admin', 'responsable', 'membre' ou null. */
export async function droitSquad(env,u,squadId){
 const squad=await env.DB.prepare('SELECT * FROM sde_squads WHERE id=?').bind(squadId).first();
 if(!squad)return {squad:null,droit:null};
 if(u.niveau>=2)return {squad,droit:'admin'};
 const m=await env.DB.prepare('SELECT role FROM sde_squad_membres WHERE squad=? AND compte=?').bind(squadId,u.id).first();
 return {squad,droit:m?(m.role==='responsable'?'responsable':'membre'):null};
}
const vueSquad=(s,extra={})=>({id:s.id,nom:s.nom,description:s.description,pole:s.pole,statut:s.statut,...extra});

export const PUSH_INTERVALLE=5*60*1000;
/* Prévient les autres membres d'un nouveau message, sans jamais en révéler le contenu
   ni l'auteur, au plus une fois toutes les 5 minutes par membre et par Squad. */
export async function notifierSquad(env,squadId,auteur,{send=sendPushNotification,now=Date.now()}={}){
 if(!env?.VAPID_PUBLIC_KEY||!env?.VAPID_PRIVATE_KEY)return{sent:0,reason:'config'};
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT,auth TEXT,cree INTEGER,PRIMARY KEY(userId,endpoint))').run();
 const squad=await env.DB.prepare('SELECT nom FROM sde_squads WHERE id=?').bind(squadId).first();
 if(!squad)return{sent:0};
 const {results}=await env.DB.prepare('SELECT p.userId,p.endpoint,p.p256dh,p.auth FROM push_subs p JOIN sde_squad_membres m ON m.compte=p.userId LEFT JOIN sde_squad_push d ON d.squad=m.squad AND d.compte=m.compte WHERE m.squad=? AND m.compte<>? AND (d.dernier IS NULL OR d.dernier<?)').bind(squadId,auteur,now-PUSH_INTERVALLE).all();
 const abonnements=results||[];
 let sent=0;const prevenus=new Set();
 for(const sub of abonnements){
  const r=await send(sub,{title:'SDE · '+String(squad.nom).slice(0,60),body:'Nouveau message dans votre Squad.',url:'/squads',tag:'sde-squad-'+squadId},env).catch(()=>({ok:false}));
  if(r&&r.ok){sent++;prevenus.add(sub.userId)}
  else if(r&&r.reason==='expired')await env.DB.prepare('DELETE FROM push_subs WHERE userId=? AND endpoint=?').bind(sub.userId,sub.endpoint).run();
 }
 for(const compte of prevenus)await env.DB.prepare('INSERT INTO sde_squad_push(squad,compte,dernier) VALUES(?,?,?) ON CONFLICT(squad,compte) DO UPDATE SET dernier=excluded.dernier').bind(squadId,compte,now).run();
 return{sent,total:abonnements.length};
}
export async function squadChatApi(req,env,u,services){
 const url=new URL(req.url),path=url.pathname;
 if(path!=='/api/squads'&&!path.startsWith('/api/squads/'))return null;
 if(!u.connecte)return fail('Connectez-vous pour accéder à vos Squads.',401);
 await ensure(env);
 const m=req.method;
 if(path==='/api/squads'){
  if(m==='GET'){
   const admin=u.niveau>=2;
   const {results}=await env.DB.prepare(admin
    ?"SELECT s.*,'admin' AS droit,(SELECT COUNT(*) FROM sde_squad_membres x WHERE x.squad=s.id) AS membres,(SELECT COUNT(*) FROM sde_squad_messages g WHERE g.squad=s.id AND g.statut='publie' AND g.auteur<>?1 AND g.cree>COALESCE((SELECT vu FROM sde_squad_lectures l WHERE l.squad=s.id AND l.compte=?1),0)) AS non_lus FROM sde_squads s ORDER BY s.statut,s.nom"
    :"SELECT s.*,mm.role AS droit,(SELECT COUNT(*) FROM sde_squad_membres x WHERE x.squad=s.id) AS membres,(SELECT COUNT(*) FROM sde_squad_messages g WHERE g.squad=s.id AND g.statut='publie' AND g.auteur<>?1 AND g.cree>COALESCE((SELECT vu FROM sde_squad_lectures l WHERE l.squad=s.id AND l.compte=?1),0)) AS non_lus FROM sde_squads s JOIN sde_squad_membres mm ON mm.squad=s.id AND mm.compte=?1 ORDER BY s.statut,s.nom").bind(u.id).all();
   return json({squads:(results||[]).map(s=>vueSquad(s,{droit:s.droit,membres:Number(s.membres),nonLus:Number(s.non_lus)})),peutCreer:admin});
  }
  if(m==='POST'){
   if(u.niveau<2)return fail('Seule l’administration peut créer une Squad.',403);
   const b=await req.json().catch(()=>null);
   const nom=propre(b?.nom,60);
   if(nom.length<3)return fail('Donnez un nom de 3 à 60 caractères à la Squad.');
   const pole=b?.pole===undefined||b.pole===''?'':String(b.pole);
   if(pole&&!POLES_SQUAD.includes(pole))return fail('Pôle inconnu.');
   const id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO sde_squads(id,nom,description,pole,statut,cree,cree_par) VALUES(?,?,?,?,?,?,?)').bind(id,nom,propre(b?.description,300),pole,'actif',Date.now(),u.id).run();
   return json({ok:true,id});
  }
  return fail('Méthode refusée.',405);
 }
 if(path==='/api/squads/comptes'){
  if(u.niveau<2)return fail('Réservé à l’administration.',403);
  const q=propre(url.searchParams.get('q')||'',40).toLowerCase();
  const like='%'+q.replace(/[%_\\]/g,'')+'%';
  const {results}=await env.DB.prepare("SELECT id,nom,matricule FROM comptes WHERE (lower(nom) LIKE ?1 OR lower(matricule) LIKE ?1) AND role NOT IN ('attente') ORDER BY nom LIMIT 20").bind(like).all();
  return json({comptes:(results||[]).map(c=>({id:String(c.id),nom:c.nom||'Membre SDE',matricule:c.matricule||''}))});
 }
 const r=path.match(/^\/api\/squads\/([a-zA-Z0-9_-]{1,80})(?:\/(messages|membres|lu)(?:\/([a-zA-Z0-9_-]{1,80}))?)?$/);
 if(!r||!ID.test(r[1]))return fail('Introuvable.',404);
 const [,squadId,sous,cible]=r;
 const {squad,droit}=await droitSquad(env,u,squadId);
 if(!squad||!droit)return fail('Cette Squad n’est pas disponible.',404);
 const gere=droit==='admin';
 const modere=gere||droit==='responsable';

 if(!sous){
  if(m==='GET'){
   const {results}=await env.DB.prepare('SELECT compte,nom,role FROM sde_squad_membres WHERE squad=? ORDER BY role DESC,nom').bind(squadId).all();
   return json({squad:vueSquad(squad,{droit}),membres:(results||[]).map(x=>({compte:x.compte,nom:x.nom||'Membre SDE',role:x.role})),peutGerer:gere,peutModerer:modere});
  }
  if(m==='PATCH'){
   if(!gere)return fail('Seule l’administration modifie une Squad.',403);
   const b=await req.json().catch(()=>null);
   const nom=b?.nom===undefined?squad.nom:propre(b.nom,60);
   if(nom.length<3)return fail('Donnez un nom de 3 à 60 caractères à la Squad.');
   const pole=b?.pole===undefined?squad.pole:String(b.pole||'');
   if(pole&&!POLES_SQUAD.includes(pole))return fail('Pôle inconnu.');
   const statut=b?.statut===undefined?squad.statut:b.statut;
   if(!['actif','archive'].includes(statut))return fail('Statut invalide.');
   const description=b?.description===undefined?squad.description:propre(b.description,300);
   await env.DB.prepare('UPDATE sde_squads SET nom=?,description=?,pole=?,statut=? WHERE id=?').bind(nom,description,pole,statut,squadId).run();
   return json({ok:true});
  }
  return fail('Méthode refusée.',405);
 }

 if(sous==='membres'){
  if(!gere)return fail('Seule l’administration gère les membres d’une Squad.',403);
  if(m==='PUT'&&!cible){
   const b=await req.json().catch(()=>null);
   const compte=typeof b?.compte==='string'&&ID.test(b.compte)?b.compte:'';
   if(!compte)return fail('Choisissez un membre.');
   const role=b?.role===undefined?'membre':b.role;
   if(!['membre','responsable'].includes(role))return fail('Rôle invalide.');
   const c=await env.DB.prepare('SELECT id,nom FROM comptes WHERE id=?').bind(compte).first();
   if(!c)return fail('Ce membre n’existe pas.',404);
   await env.DB.prepare('INSERT INTO sde_squad_membres(squad,compte,nom,role,cree) VALUES(?,?,?,?,?) ON CONFLICT(squad,compte) DO UPDATE SET role=excluded.role,nom=excluded.nom').bind(squadId,String(c.id),String(c.nom||'Membre SDE').slice(0,100),role,Date.now()).run();
   return json({ok:true});
  }
  if(m==='DELETE'&&cible){
   await env.DB.prepare('DELETE FROM sde_squad_membres WHERE squad=? AND compte=?').bind(squadId,cible).run();
   return json({ok:true});
  }
  return fail('Méthode refusée.',405);
 }

 if(sous==='lu'){
  if(m!=='POST')return fail('Méthode refusée.',405);
  await env.DB.prepare('INSERT INTO sde_squad_lectures(squad,compte,vu) VALUES(?,?,?) ON CONFLICT(squad,compte) DO UPDATE SET vu=excluded.vu').bind(squadId,u.id,Date.now()).run();
  return json({ok:true});
 }

 /* messages */
 if(m==='GET'&&!cible){
  const limite=Math.min(MESSAGES_PAR_PAGE,Math.max(1,Number(url.searchParams.get('limite'))||MESSAGES_PAR_PAGE));
  const avant=Number(url.searchParams.get('avant'))||0,apres=Number(url.searchParams.get('apres'))||0;
  let sql="SELECT id,auteur,nom,texte,cree FROM sde_squad_messages WHERE squad=? AND statut='publie'",binds=[squadId];
  if(apres){sql+=' AND cree>?';binds.push(apres);}
  if(avant){sql+=' AND cree<?';binds.push(avant);}
  sql+=apres?' ORDER BY cree ASC LIMIT ?':' ORDER BY cree DESC LIMIT ?';binds.push(limite);
  const {results}=await env.DB.prepare(sql).bind(...binds).all();
  const lignes=(results||[]);
  if(!apres)lignes.reverse();
  return json({messages:lignes.map(x=>({id:x.id,nom:x.nom,texte:x.texte,cree:Number(x.cree),moi:x.auteur===u.id,retirable:modere||x.auteur===u.id})),plus:!apres&&lignes.length===limite});
 }
 if(m==='POST'&&!cible){
  if(squad.statut!=='actif')return fail('Cette Squad est archivée : elle reste consultable mais ne reçoit plus de messages.',409);
  if(u.role==='lecture')return fail('Votre compte est en lecture seule.',403);
  const b=await req.json().catch(()=>null);
  const texte=nettoyerTexte(b?.texte);
  if(texte.length<1)return fail('Écrivez un message.');
  if(texte.length>TEXTE_MAX)return fail('Un message compte au plus '+TEXTE_MAX+' caractères.');
  const key='squad-msg:'+u.id;
  if(await services.blocked(key,40))return fail('Vous écrivez trop vite. Patientez quelques minutes.',429);
  await services.count(key);
  const id=crypto.randomUUID(),t=Date.now();
  await env.DB.prepare('INSERT INTO sde_squad_messages(id,squad,auteur,nom,texte,cree,statut) VALUES(?,?,?,?,?,?,?)').bind(id,squadId,u.id,String(u.nom||'Membre SDE').slice(0,100),texte,t,'publie').run();
  await env.DB.prepare('INSERT INTO sde_squad_lectures(squad,compte,vu) VALUES(?,?,?) ON CONFLICT(squad,compte) DO UPDATE SET vu=excluded.vu').bind(squadId,u.id,t).run();
  const prevenir=notifierSquad(env,squadId,u.id).catch(()=>{});
  if(typeof services.apres==='function')services.apres(prevenir);else await prevenir;
  return json({ok:true,id,cree:t});
 }
 if(m==='DELETE'&&cible){
  const msg=await env.DB.prepare('SELECT auteur,statut FROM sde_squad_messages WHERE id=? AND squad=?').bind(cible,squadId).first();
  if(!msg||msg.statut!=='publie')return fail('Ce message n’est plus disponible.',404);
  if(!modere&&msg.auteur!==u.id)return fail('Vous ne pouvez retirer que vos propres messages.',403);
  await env.DB.prepare("UPDATE sde_squad_messages SET statut='retire',retire_par=? WHERE id=?").bind(u.id,cible).run();
  return json({ok:true});
 }
 return fail('Méthode refusée.',405);
}
