import {sendPushNotification} from './web-push.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>json({ok:false,message},status);
async function ensure(env){
 for(const sql of [
  'CREATE TABLE IF NOT EXISTS sde_mur_prieres (id TEXT PRIMARY KEY,auteur TEXT NOT NULL,nom TEXT NOT NULL,sujet TEXT NOT NULL,anonyme INTEGER NOT NULL,statut TEXT NOT NULL,cree INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sde_mur_flags (priere TEXT PRIMARY KEY,urgent INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS sde_mur_reactions (priere TEXT NOT NULL,compte TEXT NOT NULL,cree INTEGER NOT NULL,PRIMARY KEY(priere,compte))',
  'CREATE TABLE IF NOT EXISTS sde_mur_notifications (priere TEXT PRIMARY KEY,auteur TEXT NOT NULL,total INTEGER NOT NULL,maj INTEGER NOT NULL,lu INTEGER NOT NULL DEFAULT 0)'
 ])await env.DB.prepare(sql).run();
}
async function pushAuthor(env,author){
 if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return;
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT,auth TEXT,cree INTEGER,PRIMARY KEY(userId,endpoint))').run();
 const {results}=await env.DB.prepare('SELECT userId,endpoint,p256dh,auth FROM push_subs WHERE userId=?').bind(author).all();
 await Promise.allSettled((results||[]).map(s=>sendPushNotification(s,{title:'SDE · Intercession fraternelle',body:'Un membre a rejoint votre prière.',url:'/mon-espace?module=mur',tag:'sde-intercession'},env)));
}
export async function prayerWallApi(req,env,u,ctx,services){
 const path=new URL(req.url).pathname;
 if(path!=='/api/mur-priere'&&!path.startsWith('/api/mur-priere/'))return null;
 if(!u.connecte)return fail('Connectez-vous pour rejoindre le mur de prière.',401);
 await ensure(env);
 if(path==='/api/mur-priere'){
  if(req.method==='GET'){
   const {results}=await env.DB.prepare("SELECT p.*,COALESCE(f.urgent,0) AS urgent,(SELECT COUNT(*) FROM sde_mur_reactions r WHERE r.priere=p.id) AS total,EXISTS(SELECT 1 FROM sde_mur_reactions r WHERE r.priere=p.id AND r.compte=?) AS jePrie FROM sde_mur_prieres p LEFT JOIN sde_mur_flags f ON f.priere=p.id WHERE p.statut='publie' OR (p.auteur=? AND p.statut='en_attente') OR (?=1 AND p.statut='en_attente') ORDER BY COALESCE(f.urgent,0) DESC,p.cree DESC,p.id LIMIT 80").bind(u.id,u.id,u.niveau>=1?1:0).all();
   const notices=await env.DB.prepare('SELECT priere,total,maj,lu FROM sde_mur_notifications WHERE auteur=? ORDER BY maj DESC LIMIT 20').bind(u.id).all();
   return json({prieres:(results||[]).map(p=>({id:p.id,sujet:p.sujet,urgent:!!p.urgent,auteur:p.anonyme?'Anonyme':p.nom,anonyme:!!p.anonyme,statut:p.statut,cree:p.cree,total:Number(p.total),jePrie:!!p.jePrie,mien:p.auteur===u.id})),notifications:notices.results||[],moderateur:u.niveau>=1});
  }
  if(req.method!=='POST')return fail('Méthode refusée.',405);
  const b=await req.json();
  if(b?.consentement!==true)return fail('Confirmez votre accord pour partager ce sujet avec les membres après validation.');
  if(typeof b.sujet!=='string'||b.sujet.trim().length<3||b.sujet.trim().length>600)return fail('Écrivez un sujet de 3 à 600 caractères.');
  if(b.urgent!==undefined&&typeof b.urgent!=='boolean')return fail('Choix d’urgence invalide.');
  if(b.anonyme!==undefined&&typeof b.anonyme!=='boolean')return fail('Choix d’anonymat invalide.');
  const key='mur-priere:'+u.id;
  if(await services.blocked(key,5))return fail('Réessayez un peu plus tard.',429);
  await services.count(key);
  const id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO sde_mur_prieres(id,auteur,nom,sujet,anonyme,statut,cree) VALUES(?,?,?,?,?,?,?)').bind(id,u.id,String(u.nom||'Membre SDE').slice(0,100),b.sujet.trim(),b.anonyme===false?0:1,'en_attente',Date.now()).run();
  await env.DB.prepare('INSERT INTO sde_mur_flags(priere,urgent) VALUES(?,?)').bind(id,b.urgent===true?1:0).run();
  return json({ok:true,id,statut:'en_attente'});
 }
 if(path==='/api/mur-priere/notifications/lues'&&req.method==='POST'){
  await env.DB.prepare('UPDATE sde_mur_notifications SET lu=1 WHERE auteur=?').bind(u.id).run();
  return json({ok:true});
 }
 const match=path.match(/^\/api\/mur-priere\/([a-zA-Z0-9_-]{1,80})(?:\/(prier|moderation))?$/);
 if(!match)return fail('Introuvable.',404);
 const p=await env.DB.prepare('SELECT * FROM sde_mur_prieres WHERE id=?').bind(match[1]).first();
 if(!p)return fail('Cette prière n’est pas disponible.',404);
 if(!match[2]&&req.method==='DELETE'){
  if(p.auteur!==u.id)return fail('Vous ne pouvez retirer que votre propre sujet.',403);
  await env.DB.prepare("UPDATE sde_mur_prieres SET statut='retire' WHERE id=?").bind(p.id).run();
  return json({ok:true});
 }
 if(match[2]==='moderation'&&req.method==='POST'){
  if(u.niveau<1)return fail('Modération réservée aux responsables habilités.',403);
  const b=await req.json();if(!['publie','refuse'].includes(b?.statut))return fail('Décision invalide.');
  if(p.statut!=='en_attente')return fail('Cette demande a déjà été traitée.',409);
  const result=await env.DB.prepare("UPDATE sde_mur_prieres SET statut=? WHERE id=? AND statut='en_attente'").bind(b.statut,p.id).run();
  if(!result.meta?.changes)return fail('Ce sujet a été retiré ou déjà traité.',409);
  return json({ok:true});
 }
 if(match[2]==='prier'&&req.method==='POST'){
  if(p.statut!=='publie')return fail('Cette prière n’est pas disponible.',404);
  if(p.auteur===u.id)return fail('Ce sujet est déjà votre prière.');
  const added=await env.DB.prepare('INSERT OR IGNORE INTO sde_mur_reactions(priere,compte,cree) VALUES(?,?,?) RETURNING compte').bind(p.id,u.id,Date.now()).first();
  const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM sde_mur_reactions WHERE priere=?').bind(p.id).first();
  if(added){
   await env.DB.prepare('INSERT INTO sde_mur_notifications(priere,auteur,total,maj,lu) VALUES(?,?,?,?,0) ON CONFLICT(priere) DO UPDATE SET total=excluded.total,maj=excluded.maj,lu=0').bind(p.id,p.auteur,Number(count.total),Date.now()).run();
   ctx?.waitUntil?.(pushAuthor(env,p.auteur).catch(()=>{}));
  }
  return json({ok:true,total:Number(count.total)});
 }
 return fail('Méthode refusée.',405);
}

export async function prayerWallBackup(env){
 await ensure(env);const result={};
 for(const table of ["sde_mur_prieres","sde_mur_flags","sde_mur_reactions","sde_mur_notifications"])result[table]=(await env.DB.prepare("SELECT * FROM "+table).all()).results||[];
 return result;
}
