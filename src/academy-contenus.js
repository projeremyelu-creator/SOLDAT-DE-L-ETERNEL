/**
 * Soldiers Academy — ressources pédagogiques et studio de publication (2027).
 * Les publications ne modifient jamais les notes du cursus officiel.
 * D1 conserve les métadonnées, KV FICHIERS conserve les pièces jointes courtes.
 * L'accès aux fichiers passe EXCLUSIVEMENT par cette API authentifiée (pas /_blob).
 */
import {SOLDIERS_ACADEMY_2027 as ACADEMY} from "./soldiers-academy-2027.js";

const COURS=ACADEMY.courses;
const kinds=new Set(["lecon","cours","video","audio","document","exercice","lien"]);
const ROLES=new Set(["enseignant","coach"]);
const MAX_FILE=8*1024*1024;
const idPattern=/^[a-f0-9-]{36}$/i;
const safe=(v,n=1000)=>String(v??"").trim().slice(0,n);
const ok=(data,status=200)=>Response.json({ok:true,...data},{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const fail=(message,status=400)=>Response.json({ok:false,message},{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const course=id=>COURS.find(c=>c.id===id);
const validIndex=n=>Number.isInteger(n)&&n>=0&&n<=4;
const validUrl=(raw,kind)=>{
  if(!raw)return "";
  let url;try{url=new URL(raw)}catch{return null;}
  if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
  if(!/^[a-z0-9.-]+$/i.test(url.hostname))return null;
  if(kind==="video"){
    const allowed=["youtube.com","www.youtube.com","m.youtube.com","youtu.be","youtube-nocookie.com","www.youtube-nocookie.com","vimeo.com","www.vimeo.com","player.vimeo.com","drive.google.com"];
    if(!allowed.includes(url.hostname.toLowerCase()))return null;
  }
  if(!["video","audio","document","lien","cours"].includes(kind))return null;
  return url.toString().slice(0,1500);
};
const extForMime={
 "application/pdf":".pdf","image/png":".png","image/jpeg":".jpg",
 "audio/mpeg":".mp3","audio/mp4":".m4a","video/mp4":".mp4",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document":".docx",
 "application/vnd.openxmlformats-officedocument.presentationml.presentation":".pptx"
};
const mimeForKind={cours:["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"],video:["video/mp4"],audio:["audio/mpeg","audio/mp4"],document:["application/pdf","image/png","image/jpeg","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"]};
function magicOk(bytes,mime){
 const a=new Uint8Array(bytes),ascii=(s,i)=>[...s].every((ch,n)=>a[i+n]===ch.charCodeAt(0));
 if(mime==="application/pdf")return ascii("%PDF-",0);
 if(mime==="image/png")return a.length>8&&a[0]===137&&ascii("PNG",1)&&a[4]===13&&a[5]===10;
 if(mime==="image/jpeg")return a[0]===255&&a[1]===216&&a[2]===255;
 if(mime==="video/mp4"||mime==="audio/mp4")return a.length>=12&&ascii("ftyp",4);
 if(mime==="audio/mpeg")return ascii("ID3",0)||(a[0]===255&&(a[1]&0xe0)===0xe0);
 if(mime.includes("officedocument"))return a[0]===80&&a[1]===75;
 return false;
}
async function init(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_staff (compte TEXT PRIMARY KEY, role TEXT NOT NULL, cours TEXT NOT NULL, actif INTEGER NOT NULL DEFAULT 1, attribue_par TEXT NOT NULL, attribue_le INTEGER NOT NULL)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_contenus (id TEXT PRIMARY KEY, cours TEXT NOT NULL, lecon INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL, titre TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', texte TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', fichier_cle TEXT, fichier_type TEXT, fichier_nom TEXT, fichier_taille INTEGER, auteur TEXT NOT NULL, publie INTEGER NOT NULL DEFAULT 0, archive INTEGER NOT NULL DEFAULT 0, cree INTEGER NOT NULL, maj INTEGER NOT NULL)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_contenus_pub ON academy_2027_contenus(archive,publie,maj)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_contenus_cours ON academy_2027_contenus(cours,lecon,maj)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_contenus_vus (compte TEXT NOT NULL, ressource TEXT NOT NULL, vu_le INTEGER NOT NULL, PRIMARY KEY(compte,ressource))").run();
}
async function rights(env,u){
 const admin=Number(u.niveau)>=2;
 const row=await env.DB.prepare("SELECT role,cours,actif FROM academy_2027_staff WHERE compte=?").bind(String(u.id)).first();
 let courses=[];try{courses=JSON.parse(row?.cours||"[]")}catch{}
 if(!Array.isArray(courses))courses=[];
 const allowed=admin||Boolean(row?.actif===1&&ROLES.has(row.role));
 return {admin,allowed,role:admin?"direction":allowed?row.role:"apprenant",courses:admin?COURS.map(c=>c.id):courses.filter(x=>!!course(x))};
}
const canManage=(p,c)=>p.admin||(p.allowed&&p.courses.includes(c));
const canEdit=(p,c,u)=>canManage(p,c.cours)&&(p.admin||c.auteur===String(u.id));
const tableToPublic=(r,vu=false)=>({
 id:r.id,courseId:r.cours,lesson:r.lecon,kind:r.type,title:r.titre,description:r.description,
 text:r.texte,url:r.url,hasFile:!!r.fichier_cle,fileName:r.fichier_nom||"",fileMime:r.fichier_type||"",
 author:r.auteur_nom||"Équipe Soldiers Academy",published:r.publie===1,createdAt:r.cree,updatedAt:r.maj,seen:!!vu,
 fileUrl:r.fichier_cle?"/api/soldiers-academy/contenus/"+encodeURIComponent(r.id)+"/fichier":""
});
async function bodyJson(req){
 if(Number(req.headers.get("content-length")||"0")>25000)throw Error("Données trop volumineuses.");
 const text=await req.text();
 if(text.length>25000)throw Error("Données trop volumineuses.");
 return JSON.parse(text||"{}");
}
function parseResource(b,old=null){
 const courseId=b.courseId===undefined?old?.cours:b.courseId;
 const kind=b.kind===undefined?old?.type:b.kind;
 const lesson=b.lesson===undefined?(old?.lecon??0):Number(b.lesson);
 const title=b.title===undefined?old?.titre:safe(b.title,140);
 const description=b.description===undefined?old?.description:safe(b.description,600);
 const content=b.text===undefined?old?.texte:safe(b.text,12000);
 const link=b.url===undefined?old?.url:safe(b.url,1500);
 const published=b.published===undefined?!!old?.publie:b.published===true;
 if(!course(courseId)||!kinds.has(kind)||!validIndex(lesson))return {error:"Choisissez un cours, un type de ressource et une leçon valides."};
 if(title.length<4||title.length>140)return {error:"Le titre doit contenir entre 4 et 140 caractères."};
 const verified=validUrl(link,kind);
 if(verified===null)return {error:kind==="video"?"Utilisez un lien vidéo HTTPS YouTube, Vimeo ou Google Drive.":"Le lien fourni n'est pas une adresse HTTPS valide."};
 if(published&&!verified&&content.length<30&&!old?.fichier_cle)
   return {error:"Pour publier, ajoutez un enseignement de 30 caractères, un lien ou une pièce jointe."};
 return {courseId,kind,lesson,title,description,content,link:verified,published};
}
const resourceSql="SELECT r.*,COALESCE(c.nom,'Équipe Soldiers Academy') AS auteur_nom FROM academy_2027_contenus r LEFT JOIN comptes c ON c.id=r.auteur";
async function findResource(env,id){
 if(!idPattern.test(id))return null;
 return env.DB.prepare(resourceSql+" WHERE r.id=? AND r.archive=0").bind(id).first();
}
async function publishedAndSeen(env,account,courseId){
 const rows=(await env.DB.prepare(resourceSql+" WHERE r.archive=0 AND r.publie=1"+(courseId?" AND r.cours=?":"")+" ORDER BY r.maj DESC LIMIT 300").bind(...(courseId?[courseId]:[])).all()).results||[];
 const vus=(await env.DB.prepare("SELECT ressource FROM academy_2027_contenus_vus WHERE compte=?").bind(String(account)).all()).results||[];
 const seen=new Set(vus.map(x=>x.ressource));
 return rows.map(r=>tableToPublic(r,seen.has(r.id)));
}
async function teacherView(env,u,p){
 const rows=(await env.DB.prepare(resourceSql+" WHERE r.archive=0"+(p.admin?"":" AND r.auteur=?")+" ORDER BY r.maj DESC LIMIT 300").bind(...(p.admin?[]:[String(u.id)])).all()).results||[];
 const result={access:true,role:p.role,admin:p.admin,courses:COURS.map(c=>({id:c.id,title:c.title,level:c.level})),assigned:p.courses,resources:rows.map(r=>tableToPublic(r))};
 if(p.admin){
  const users=(await env.DB.prepare("SELECT s.compte,s.role,s.cours,s.actif,c.nom FROM academy_2027_staff s LEFT JOIN comptes c ON c.id=s.compte ORDER BY s.attribue_le DESC LIMIT 100").all()).results||[];
  result.staff=users.map(x=>({account:x.compte,name:x.nom||"Compte SDE",role:x.role,assigned:JSON.parse(x.cours||"[]"),active:x.actif===1}));
 }
 return result;
}
export async function academyContenusApi(req,env,u,path){
 const prefix="/api/soldiers-academy/contenus";
 if(!(path===prefix||path.startsWith(prefix+"/")))return null;
 if(!u?.connecte||!u.id)return fail("Connexion requise pour accéder aux ressources Soldiers Academy.",401);
 if(!env.DB)return fail("Base de données indisponible.",503);
 await init(env);
 const p=await rights(env,u);
 const suffix=path.slice(prefix.length);
 const method=req.method;
 const q=new URL(req.url).searchParams;
 if(!suffix&&method==="GET"){
  const filter=q.get("cours")||"";
  if(filter&&!course(filter))return fail("Cours inconnu.");
  return ok({resources:await publishedAndSeen(env,u.id,filter),updatedAt:Date.now()});
 }
 if(suffix==="/studio"&&method==="GET"){
  if(!p.allowed)return fail("Studio réservé aux enseignants et coachs habilités.",403);
  return ok(await teacherView(env,u,p));
 }
 if(suffix==="/equipe"&&method==="POST"){
  if(!p.admin)return fail("Seule la direction pédagogique peut attribuer les rôles.",403);
  let b;try{b=await bodyJson(req)}catch{return fail("Données invalides ou trop volumineuses.")}
  const account=safe(b.account,254),role=safe(b.role,30),active=b.active!==false;
  const ids=Array.isArray(b.courses)?[...new Set(b.courses)]:[];
  if(!account||!ROLES.has(role)||ids.length>24||ids.some(x=>!course(x))||(!ids.length&&active))
   return fail("Compte, rôle et cours autorisés requis.");
  const user=await env.DB.prepare("SELECT id,nom FROM comptes WHERE id=? OR email=? LIMIT 1").bind(account,account.toLowerCase()).first();
  if(!user)return fail("Ce compte SDE n'existe pas : créez son accès membre avant de le nommer enseignant ou coach.",404);
  await env.DB.prepare("INSERT INTO academy_2027_staff(compte,role,cours,actif,attribue_par,attribue_le) VALUES(?,?,?,?,?,?) ON CONFLICT(compte) DO UPDATE SET role=excluded.role,cours=excluded.cours,actif=excluded.actif,attribue_par=excluded.attribue_par,attribue_le=excluded.attribue_le")
    .bind(String(user.id),role,JSON.stringify(ids),active?1:0,String(u.id),Date.now()).run();
  return ok({message:active?"Habilitation enregistrée.":"Accès au studio suspendu.",account:String(user.id),name:user.nom||""});
 }
 if(!suffix&&method==="POST"){
  if(!p.allowed)return fail("Seuls les enseignants et coachs habilités peuvent publier.",403);
  let b;try{b=await bodyJson(req)}catch{return fail("Données invalides ou trop volumineuses.")}
  const v=parseResource(b);
  if(v.error)return fail(v.error);
  if(!canManage(p,v.courseId))return fail("Ce cours ne vous a pas été attribué.",403);
  const id=crypto.randomUUID(),now=Date.now();
  await env.DB.prepare("INSERT INTO academy_2027_contenus(id,cours,lecon,type,titre,description,texte,url,auteur,publie,cree,maj) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
   .bind(id,v.courseId,v.lesson,v.kind,v.title,v.description,v.content,v.link,String(u.id),v.published?1:0,now,now).run();
  return ok({id,message:v.published?"Ressource publiée pour tous les apprenants.":"Brouillon enregistré."},201);
 }
 const match=suffix.match(/^\/([a-f0-9-]{36})(?:\/(fichier|consulte))?$/i);
 if(!match)return fail("Action non prise en charge.",404);
 const id=match[1],action=match[2]||"";
 const item=await findResource(env,id);
 if(!item)return fail("Ressource introuvable.",404);
 if(action==="fichier"&&method==="GET"){
  if(item.publie!==1&&!canEdit(p,item,u))return fail("Ce fichier n'est pas publié.",403);
  if(!item.fichier_cle||!env.FICHIERS)return fail("Aucun fichier disponible.",404);
  const bytes=await env.FICHIERS.get(item.fichier_cle,{type:"arrayBuffer"});
  if(!bytes)return fail("Fichier temporairement indisponible.",404);
  const mime=item.fichier_type||"application/octet-stream";
  const preview=["application/pdf","image/png","image/jpeg","audio/mpeg","audio/mp4","video/mp4"].includes(mime);
  const name=String(item.fichier_nom||"support").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);
  return new Response(bytes,{headers:{"content-type":mime,"content-disposition":(preview?"inline":"attachment")+'; filename="'+name+'"',"cache-control":"private, no-store","content-security-policy":"default-src 'none'; sandbox","x-content-type-options":"nosniff","x-robots-tag":"noindex,nofollow"}});
 }
 if(action==="consulte"&&method==="POST"){
  if(item.publie!==1)return fail("Ressource non publiée.",403);
  await env.DB.prepare("INSERT INTO academy_2027_contenus_vus(compte,ressource,vu_le) VALUES(?,?,?) ON CONFLICT(compte,ressource) DO UPDATE SET vu_le=excluded.vu_le").bind(String(u.id),id,Date.now()).run();
  return ok({message:"Ressource marquée comme consultée."});
 }
 if(action==="fichier"&&method==="POST"){
  if(!canEdit(p,item,u))return fail("Modification réservée à l'auteur habilité ou à la direction.",403);
  if(!env.FICHIERS)return fail("Stockage des supports indisponible.",503);
  if(!mimeForKind[item.type])return fail("Ce type de ressource n'accepte pas de pièce jointe.");
  const mime=String(req.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(!mimeForKind[item.type].includes(mime))return fail("Type de fichier non autorisé pour cette ressource.",415);
  if(Number(req.headers.get("content-length")||"0")>MAX_FILE)return fail("Fichier trop volumineux (8 Mo maximum).",413);
  const bytes=await req.arrayBuffer();
  if(bytes.byteLength===0||bytes.byteLength>MAX_FILE)return fail("Fichier vide ou trop volumineux (8 Mo maximum).",413);
  if(!magicOk(bytes,mime))return fail("Format du fichier invalide : vérifiez le document, l'audio ou la vidéo.",415);
  let rawName;try{rawName=decodeURIComponent(req.headers.get("x-sde-filename")||"support").slice(0,150)}catch{return fail("Nom de fichier invalide.")}
  const filename=safe(rawName.replace(/[^\p{L}\p{N}_. -]/gu,"_"),110)||"support";
  const base=filename.replace(/\.[^.]+$/,"").slice(0,78);
  const finalName=base+(extForMime[mime]||"");
  const key="academy-prive:"+id;
  await env.FICHIERS.put(key,bytes,{metadata:{type:mime,filename:finalName}});
  await env.DB.prepare("UPDATE academy_2027_contenus SET fichier_cle=?,fichier_type=?,fichier_nom=?,fichier_taille=?,maj=? WHERE id=?")
     .bind(key,mime,finalName,bytes.byteLength,Date.now(),id).run();
  return ok({message:"Support enregistré dans le stockage privé.",fileName:finalName,size:bytes.byteLength});
 }
 if(!action&&method==="PATCH"){
  if(!canEdit(p,item,u))return fail("Modification réservée à l'auteur habilité ou à la direction.",403);
  let b;try{b=await bodyJson(req)}catch{return fail("Données invalides ou trop volumineuses.")}
  const v=parseResource(b,item);
  if(v.error)return fail(v.error);
  if(!canManage(p,v.courseId))return fail("Ce cours ne vous a pas été attribué.",403);
  await env.DB.prepare("UPDATE academy_2027_contenus SET cours=?,lecon=?,type=?,titre=?,description=?,texte=?,url=?,publie=?,maj=? WHERE id=?")
    .bind(v.courseId,v.lesson,v.kind,v.title,v.description,v.content,v.link,v.published?1:0,Date.now(),id).run();
  return ok({message:v.published?"Ressource mise à jour et visible des apprenants.":"Brouillon enregistré."});
 }
 if(!action&&method==="DELETE"){
  if(!canEdit(p,item,u))return fail("Suppression réservée à l'auteur habilité ou à la direction.",403);
  await env.DB.prepare("UPDATE academy_2027_contenus SET archive=1,publie=0,maj=? WHERE id=?").bind(Date.now(),id).run();
  return ok({message:"Ressource archivée. Les fichiers restent conservés pour contrôle interne."});
 }
 return fail("Méthode non prise en charge.",405);
}
