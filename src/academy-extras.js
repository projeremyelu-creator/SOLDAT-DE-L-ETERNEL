/* Soldiers Academy 2027 — compléments : avis, notifications, cohortes, vérification publique, pilotage.
   Aucun corrigé ici : voir academy-correctifs.js (réservé au serveur). */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";
import {broadcastPush,sendPushNotification} from "./web-push.js";

const reply=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>reply({ok:false,message},status);
const propre=(v,max)=>String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
export const URL_ACADEMY="/mon-espace/academy";

export async function initExtras(env){
  for(const sql of [
    "CREATE TABLE IF NOT EXISTS academy_2027_avis (id INTEGER PRIMARY KEY AUTOINCREMENT, compte TEXT NOT NULL, texte TEXT NOT NULL, cree INTEGER NOT NULL, lu INTEGER NOT NULL DEFAULT 0)",
    "CREATE INDEX IF NOT EXISTS idx_academy_2027_avis_compte ON academy_2027_avis(compte,lu,cree)",
    "CREATE TABLE IF NOT EXISTS academy_2027_cohortes (id TEXT PRIMARY KEY, nom TEXT NOT NULL, niveau INTEGER NOT NULL, debut TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'ouverte', cree INTEGER NOT NULL, par TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS academy_2027_cohorte_membres (cohorte TEXT NOT NULL, compte TEXT NOT NULL, cree INTEGER NOT NULL, PRIMARY KEY(cohorte,compte))"
  ])await env.DB.prepare(sql).run();
}

/* ── Notifications : push (si configuré) + avis visibles dans l'espace de l'apprenant ── */
export async function notifierCompte(env,compte,{titre,corps,tag="sde-academy"},{send=sendPushNotification}={}){
  try{
    await env.DB.prepare("INSERT INTO academy_2027_avis(compte,texte,cree) VALUES(?,?,?)").bind(String(compte),propre(corps,300),Date.now()).run();
    if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return;
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT,auth TEXT,cree INTEGER,PRIMARY KEY(userId,endpoint))").run();
    const subs=(await env.DB.prepare("SELECT endpoint,p256dh,auth FROM push_subs WHERE userId=?").bind(String(compte)).all()).results||[];
    for(const sub of subs){
      const r=await send(sub,{title:propre(titre,80),body:propre(corps,200),url:URL_ACADEMY,tag},env).catch(()=>({ok:false}));
      if(r?.reason==="expired")await env.DB.prepare("DELETE FROM push_subs WHERE userId=? AND endpoint=?").bind(String(compte),sub.endpoint).run();
    }
  }catch(e){console.warn("Academy : avis non envoyé",e?.message||e)}
}
/* Alerte de direction : jamais envoyée aux appareils des simples membres. */
export async function notifierDirection(env,corps,{send=sendPushNotification}={}){
  try{await broadcastPush(env,{title:"SDE · Soldiers Academy",body:propre(corps,160),url:URL_ACADEMY,tag:"sde-academy-direction"},{audience:"direction",send})}
  catch(e){console.warn("Academy : alerte direction non envoyée",e?.message||e)}
}
export async function avisNonLus(env,compte){
  const r=await env.DB.prepare("SELECT id,texte,cree FROM academy_2027_avis WHERE compte=? AND lu=0 ORDER BY cree DESC LIMIT 10").bind(String(compte)).all();
  return (r.results||[]).map(x=>({id:x.id,texte:x.texte,cree:x.cree}));
}
export async function marquerAvisLus(env,compte){
  await env.DB.prepare("UPDATE academy_2027_avis SET lu=1 WHERE compte=? AND lu=0").bind(String(compte)).run();
}

/* ── Cohortes : 8 semaines par niveau, un cours par semaine ── */
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const dateValide=s=>{if(!DATE.test(s))return false;const d=new Date(s+"T00:00:00Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s};
const ajouterJours=(s,n)=>{const d=new Date(s+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export function calendrierCohorte(niveau,debut){
  return PROGRAMME.courses.filter(c=>c.level===niveau).map((c,i)=>({semaine:i+1,du:ajouterJours(debut,i*7),au:ajouterJours(debut,i*7+6),cours:c.id,titre:c.title}));
}
export async function cohortesVue(env,u,{peutRejoindre}){
  const rows=(await env.DB.prepare("SELECT c.id,c.nom,c.niveau,c.debut,c.statut,(SELECT COUNT(*) FROM academy_2027_cohorte_membres m WHERE m.cohorte=c.id) AS effectif,(SELECT COUNT(*) FROM academy_2027_cohorte_membres m WHERE m.cohorte=c.id AND m.compte=?) AS inscrit FROM academy_2027_cohortes c WHERE c.statut='ouverte' ORDER BY c.debut ASC LIMIT 40").bind(String(u.id)).all()).results||[];
  return rows.map(c=>({id:c.id,nom:c.nom,niveau:c.niveau,debut:c.debut,fin:ajouterJours(c.debut,55),effectif:Number(c.effectif),inscrit:Number(c.inscrit)>0,peutRejoindre:peutRejoindre(c.niveau),semaines:calendrierCohorte(c.niveau,c.debut)}));
}
export async function cohortesGestion(env){
  const rows=(await env.DB.prepare("SELECT c.id,c.nom,c.niveau,c.debut,c.statut,m.compte,cp.nom AS nom_compte FROM academy_2027_cohortes c LEFT JOIN academy_2027_cohorte_membres m ON m.cohorte=c.id LEFT JOIN comptes cp ON cp.id=m.compte ORDER BY c.debut DESC LIMIT 400").all()).results||[];
  const out=new Map();
  for(const r of rows){
    if(!out.has(r.id))out.set(r.id,{id:r.id,nom:r.nom,niveau:r.niveau,debut:r.debut,statut:r.statut,membres:[]});
    if(r.compte)out.get(r.id).membres.push({compte:r.compte,nom:r.nom_compte||"Apprenant"});
  }
  return [...out.values()];
}
async function lireJson(req){const s=await req.text();if(s.length>4000)throw Error("trop long");return JSON.parse(s)}
/* Routes cohortes : renvoie null si le chemin n'est pas concerné. */
export async function cohortesApi(req,env,u,path,{admin,peutRejoindre}){
  if(!path.startsWith("/api/soldiers-academy/cohortes"))return null;
  let b;try{b=await lireJson(req)}catch{return error("Données invalides.")}
  const sous=path.slice("/api/soldiers-academy/cohortes".length);
  if(sous===""&&req.method==="POST"){
    if(!admin)return error("Accès réservé à la direction pédagogique.",403);
    const nom=propre(b.nom,80),niveau=Number(b.niveau),debut=String(b.debut||"");
    if(nom.length<3)return error("Donnez un nom de cohorte (3 caractères minimum).");
    if(![1,2,3].includes(niveau))return error("Niveau invalide (1 à 3).");
    if(!dateValide(debut))return error("Date de début invalide (AAAA-MM-JJ).");
    const id=crypto.randomUUID().slice(0,12);
    await env.DB.prepare("INSERT INTO academy_2027_cohortes(id,nom,niveau,debut,statut,cree,par) VALUES(?,?,?,?,'ouverte',?,?)").bind(id,nom,niveau,debut,Date.now(),String(u.id)).run();
    return reply({ok:true,id,calendrier:calendrierCohorte(niveau,debut)},201);
  }
  if(sous==="/clore"&&req.method==="PATCH"){
    if(!admin)return error("Accès réservé à la direction pédagogique.",403);
    const r=await env.DB.prepare("UPDATE academy_2027_cohortes SET statut='close' WHERE id=? AND statut='ouverte'").bind(String(b.id||"")).run();
    return r.meta?.changes?reply({ok:true}):error("Cohorte introuvable ou déjà close.",404);
  }
  if((sous==="/rejoindre"||sous==="/quitter")&&req.method==="POST"){
    const c=await env.DB.prepare("SELECT id,niveau,statut FROM academy_2027_cohortes WHERE id=?").bind(String(b.id||"")).first();
    if(!c||c.statut!=="ouverte")return error("Cohorte introuvable ou close.",404);
    if(sous==="/quitter"){
      await env.DB.prepare("DELETE FROM academy_2027_cohorte_membres WHERE cohorte=? AND compte=?").bind(c.id,String(u.id)).run();
      return reply({ok:true,message:"Vous avez quitté la cohorte."});
    }
    if(!peutRejoindre(c.niveau))return error("Ce niveau n'est pas encore ouvert pour vous : validez d'abord les 8 cours du niveau précédent.",403);
    await env.DB.prepare("INSERT OR IGNORE INTO academy_2027_cohorte_membres(cohorte,compte,cree) VALUES(?,?,?)").bind(c.id,String(u.id),Date.now()).run();
    return reply({ok:true,message:"Inscription à la cohorte enregistrée."});
  }
  return error("Route inconnue.",404);
}

/* ── Vérification publique : validité, intitulé et date, jamais de nom ni de note ── */
const CODE=/^SDE-ACA-2027-(N[123]|PARCOURS)-[A-F0-9]{8}$/;
export async function verifierAttestation(req,env){
  const code=propre(new URL(req.url).searchParams.get("code"),60).toUpperCase();
  if(!CODE.test(code))return Response.json({ok:false,message:"Numéro d'attestation invalide."},{status:400,headers:{"cache-control":"no-store"}});
  await initExtras(env).catch(()=>{});
  let r=null;
  try{r=await env.DB.prepare("SELECT niveau,delivree_le FROM academy_2027_attestations WHERE code=?").bind(code).first()}catch{}
  const entetes={"cache-control":"no-store","x-robots-tag":"noindex, nofollow"};
  if(!r)return Response.json({ok:true,valide:false},{headers:entetes});
  const niveau=Number(r.niveau);
  const intitule=niveau===4?"Certificat de parcours — Parcours intégral Soldiers Academy (24 cours et projet intégrateur)":"Attestation de niveau "+niveau+" — "+(PROGRAMME.levels[niveau-1]?.title||"Soldiers Academy");
  return Response.json({ok:true,valide:true,intitule,delivreeLe:r.delivree_le,emetteur:"Mouvement SDE · Soldiers Academy",mention:"Formation interne au Mouvement SDE — sans équivalence académique officielle"},{headers:entetes});
}

/* ── Pilotage (administrateurs) : agrégats sans aucun nom ── */
export async function pilotageAcademy(env){
  const un=async(sql)=>{try{return Number((await env.DB.prepare(sql).first())?.n||0)}catch{return 0}};
  const par={};
  try{for(const x of (await env.DB.prepare("SELECT niveau,COUNT(*) AS n FROM academy_2027_attestations GROUP BY niveau").all()).results||[])par[Number(x.niveau)]=Number(x.n)}catch{}
  const cohortes=[];
  try{for(const x of (await env.DB.prepare("SELECT c.nom,c.niveau,c.debut,(SELECT COUNT(*) FROM academy_2027_cohorte_membres m WHERE m.cohorte=c.id) AS effectif FROM academy_2027_cohortes c WHERE c.statut='ouverte' ORDER BY c.debut ASC LIMIT 8").all()).results||[])cohortes.push({nom:propre(x.nom,80),niveau:Number(x.niveau),debut:x.debut,effectif:Number(x.effectif)})}catch{}
  return {
    apprenants:await un("SELECT COUNT(DISTINCT compte) AS n FROM academy_2027_submissions"),
    copiesEnAttente:await un("SELECT COUNT(*) AS n FROM academy_2027_submissions WHERE statut='en_attente'"),
    copiesNotees30j:await un("SELECT COUNT(*) AS n FROM academy_2027_submissions WHERE statut='note' AND date_correction>"+(Date.now()-30*864e5)),
    attestations:{niveau1:par[1]||0,niveau2:par[2]||0,niveau3:par[3]||0,parcours:par[4]||0},
    cohortes
  };
}
