/* Soldiers Academy 2027 — API évaluée côté serveur.
   L'ancien cursus de douze modules est remplacé, sans destruction des archives personnelles.
   Aucun corrigé n'est publié dans le dépôt ni dans les réponses API. */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";
const COURSES=PROGRAMME.courses;
const courseFor=id=>COURSES.find(c=>c.id===id);
const response=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>response({ok:false,message},status);
const safeText=(s,max=14000)=>String(s??"").trim().slice(0,max);
const key=(account,course)=>String(account)+":"+course;
const types=["quiz","exercises","exam"];
const levelCourses=level=>COURSES.filter(c=>c.level===level);
const value=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
async function init(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_submissions (id TEXT PRIMARY KEY, compte TEXT NOT NULL, cours TEXT NOT NULL, type TEXT NOT NULL, reponses TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'en_attente', score INTEGER, commentaire TEXT, date_soumission INTEGER NOT NULL, date_correction INTEGER, correcteur TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_submissions_compte ON academy_2027_submissions(compte,cours,date_soumission)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_submissions_statut ON academy_2027_submissions(statut,date_soumission)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_suivi (compte TEXT NOT NULL, cours TEXT NOT NULL, presence INTEGER NOT NULL DEFAULT 0, participation INTEGER, modifie_le INTEGER NOT NULL, par TEXT NOT NULL, PRIMARY KEY(compte,cours))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_attestations (compte TEXT NOT NULL, niveau INTEGER NOT NULL, code TEXT NOT NULL UNIQUE, delivree_le INTEGER NOT NULL, PRIMARY KEY(compte,niveau))").run();
}
async function readBody(req){
  const s=await req.text();
  if(s.length>50000)throw Error("Soumission trop volumineuse");
  return JSON.parse(s);
}
async function state(env,account){
  const id=String(account);
  const [sub,att,cert]=await Promise.all([
    env.DB.prepare("SELECT id,cours,type,statut,score,commentaire,date_soumission FROM academy_2027_submissions WHERE compte=? ORDER BY date_soumission DESC LIMIT 600").bind(id).all(),
    env.DB.prepare("SELECT cours,presence,participation FROM academy_2027_suivi WHERE compte=?").bind(id).all(),
    env.DB.prepare("SELECT niveau,code,delivree_le FROM academy_2027_attestations WHERE compte=?").bind(id).all()
  ]);
  const overview={};
  for(const c of COURSES)overview[c.id]={id:c.id,level:c.level,quiz:null,exercises:null,exam:null,attendance:0,participation:null,pending:[],passed:false,average:null};
  for(const v of att.results||[]){const x=overview[v.cours];if(x){x.attendance=v.presence;x.participation=v.participation;}}
  for(const s of sub.results||[]){
    const x=overview[s.cours];if(!x||!types.includes(s.type))continue;
    if(s.statut==="en_attente")x.pending.push({id:s.id,type:s.type,submittedAt:s.date_soumission});
    if(s.statut==="note"&&value(s.score,0,100))x[s.type]=Math.max(x[s.type]??0,s.score);
  }
  for(const x of Object.values(overview)){
    const valid=types.every(t=>x[t]!==null)&&x.participation!==null;
    x.average=valid?Math.round(x.quiz*.25+x.exercises*.30+x.participation*.15+x.exam*.30):null;
    x.passed=x.average!==null&&x.average>=70&&x.attendance>=80;
  }
  const certificates=cert.results||[];
  const completedLevel=n=>levelCourses(n).every(c=>overview[c.id].passed);
  return {overview,certificates,completedLevel,progress:{passed:COURSES.filter(c=>overview[c.id].passed).length,total:24,percentage:Math.round(COURSES.filter(c=>overview[c.id].passed).length/24*100)}};
}
function publicProgress(data){
  return COURSES.map(c=>{
    const v=data.overview[c.id];
    const locked=c.level>1&&!data.completedLevel(c.level-1);
    return {id:c.id,title:c.title,level:c.level,durationHours:c.durationHours,locked,quiz:v.quiz,exercises:v.exercises,exam:v.exam,participation:v.participation,attendance:v.attendance,average:v.average,passed:v.passed,pending:v.pending};
  });
}
async function issueCertificates(env,account){
  const snapshot=await state(env,account);
  for(let level=1;level<=3;level++){
    if(!snapshot.completedLevel(level))continue;
    const exists=snapshot.certificates.some(c=>c.niveau===level);
    if(exists)continue;
    const token=crypto.randomUUID().slice(0,8).toUpperCase();
    const code="SDE-ACA-2027-N"+level+"-"+token;
    await env.DB.prepare("INSERT OR IGNORE INTO academy_2027_attestations(compte,niveau,code,delivree_le) VALUES(?,?,?,?)").bind(String(account),level,code,Date.now()).run();
  }
}
function canAccess(c,data){return c.level===1||data.completedLevel(c.level-1);}
function counts(c,type){return type==="quiz"?c.quiz:type==="exercises"?c.exercises:c.exam;}
export async function soldiersAcademyApi(req,env,u,path){
  if(!path.startsWith("/api/soldiers-academy"))return null;
  if(!u?.connecte||!u.id)return error("Connexion requise.",401);
  if(!env.DB)return error("Base de données indisponible.",503);
  const admin=Number(u.niveau)>=2;
  const account=String(u.id);
  await init(env);
  if(path==="/api/soldiers-academy"&&req.method==="GET"){
    const d=await state(env,account);
    return response({ok:true,programme:{version:PROGRAMME.version,status:PROGRAMME.status,durationHours:192,levels:PROGRAMME.levels,evaluation:PROGRAMME.evaluation},name:u.nom||"Membre SDE",admin,progress:d.progress,courses:publicProgress(d),certificates:d.certificates});
  }
  if(path.startsWith("/api/soldiers-academy/cours/")&&req.method==="GET"){
    const c=courseFor(decodeURIComponent(path.slice("/api/soldiers-academy/cours/".length)));
    if(!c)return error("Cours introuvable.",404);
    if(!canAccess(c,await state(env,account)))return error("Validez le niveau précédent pour ouvrir ce cours.",403);
    return response({ok:true,course:c,disclaimer:"Référentiel en attente d'approbation du Directoire. Les travaux et examens sont évalués par un responsable habilité."});
  }
  if(path==="/api/soldiers-academy/soumettre"&&req.method==="POST"){
    let body;try{body=await readBody(req)}catch{return error("Requête JSON invalide ou trop volumineuse.",413)}
    const c=courseFor(body.courseId);const type=body.type;
    if(!c||!types.includes(type))return error("Cours ou type d'épreuve invalide.");
    if(!canAccess(c,await state(env,account)))return error("Niveau verrouillé.",403);
    const prompts=counts(c,type);
    if(!Array.isArray(body.answers)||body.answers.length!==prompts.length||body.answers.some(x=>typeof x!=="string"||x.trim().length<12||x.length>8000))return error("Répondez à toutes les questions (minimum 12 caractères par réponse).");
    const pending=await env.DB.prepare("SELECT id FROM academy_2027_submissions WHERE compte=? AND cours=? AND type=? AND statut='en_attente' LIMIT 1").bind(account,c.id,type).first();
    if(pending)return error("Une copie de cette épreuve attend déjà sa correction.",409);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO academy_2027_submissions(id,compte,cours,type,reponses,statut,date_soumission) VALUES(?,?,?,?,?,'en_attente',?)").bind(id,account,c.id,type,JSON.stringify(body.answers.map(x=>safeText(x,8000))),Date.now()).run();
    return response({ok:true,id,message:"Copie remise au formateur. La note sera disponible après correction."},201);
  }
  if(path==="/api/soldiers-academy/gestion"&&req.method==="GET"){
    if(!admin)return error("Accès réservé à la direction pédagogique.",403);
    const rows=(await env.DB.prepare("SELECT a.id,a.compte,a.cours,a.type,a.reponses,a.date_soumission,c.nom FROM academy_2027_submissions a LEFT JOIN comptes c ON c.id=a.compte WHERE a.statut='en_attente' ORDER BY a.date_soumission ASC LIMIT 100").all()).results||[];
    const suivi=(await env.DB.prepare("SELECT DISTINCT compte,cours FROM academy_2027_submissions ORDER BY cours LIMIT 200").all()).results||[];
    return response({ok:true,pending:rows.map(x=>({...x,reponses:JSON.parse(x.reponses||"[]"),nom:x.nom||"Apprenant"})),students:suivi,courses:COURSES.map(c=>({id:c.id,title:c.title,level:c.level}))});
  }
  if(path==="/api/soldiers-academy/noter"&&req.method==="PATCH"){
    if(!admin)return error("Accès réservé aux correcteurs.",403);
    let b;try{b=await readBody(req)}catch{return error("Données invalides.")}
    if(typeof b.id!=="string"||!value(b.score,0,100)||safeText(b.comment,2000).length<3)return error("Indiquez la copie, une note de 0 à 100 et un commentaire.");
    const s=await env.DB.prepare("SELECT id,compte,statut FROM academy_2027_submissions WHERE id=?").bind(b.id).first();
    if(!s)return error("Copie introuvable.",404);
    if(s.statut!=="en_attente")return error("Cette copie a déjà été corrigée.",409);
    await env.DB.prepare("UPDATE academy_2027_submissions SET statut='note',score=?,commentaire=?,date_correction=?,correcteur=? WHERE id=? AND statut='en_attente'").bind(b.score,safeText(b.comment,2000),Date.now(),account,b.id).run();
    await issueCertificates(env,s.compte);
    return response({ok:true,message:"Note enregistrée."});
  }
  if(path==="/api/soldiers-academy/assiduite"&&req.method==="PATCH"){
    if(!admin)return error("Accès réservé à la direction pédagogique.",403);
    let b;try{b=await readBody(req)}catch{return error("Données invalides.")}
    if(typeof b.compte!=="string"||!b.compte.trim()||!courseFor(b.courseId)||!value(b.attendance,0,100)||!value(b.participation,0,100))return error("Compte, cours, assiduité et participation requis (0 à 100).");
    await env.DB.prepare("INSERT INTO academy_2027_suivi(compte,cours,presence,participation,modifie_le,par) VALUES(?,?,?,?,?,?) ON CONFLICT(compte,cours) DO UPDATE SET presence=excluded.presence,participation=excluded.participation,modifie_le=excluded.modifie_le,par=excluded.par").bind(b.compte.trim(),b.courseId,b.attendance,b.participation,Date.now(),account).run();
    await issueCertificates(env,b.compte.trim());
    return response({ok:true,message:"Assiduité et participation enregistrées."});
  }
  if(path==="/api/soldiers-academy/attestation"&&req.method==="GET"){
    const url=new URL(req.url);
    const level=Number(url.searchParams.get("niveau"));
    if(!value(level,1,3))return error("Niveau invalide.");
    const d=await state(env,account),certificate=d.certificates.find(c=>c.niveau===level);
    if(!certificate||!d.completedLevel(level))return error("L'attestation n'est pas encore acquise.",403);
    return response({ok:true,attestation:certificate,level:PROGRAMME.levels[level-1],name:u.nom||"Apprenant Soldiers Academy"});
  }
  return error("Ancienne interface désactivée : utilisez le programme 2027.",404);
}
