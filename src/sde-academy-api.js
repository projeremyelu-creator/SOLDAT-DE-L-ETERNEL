/* Soldiers Academy 2027 — API évaluée côté serveur.
   L'ancien cursus de douze modules est remplacé, sans destruction des archives personnelles.
   Aucun corrigé n'est publié dans le dépôt ni dans les réponses API. */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";
import {LOVE_SCHOOL,LOVE_SCHOOL_PUBLICS} from "./love-school.js";
import {initLoveAcces,loveAccesApi,loveEtats,loveAutorise,loveMeta} from "./love-school-acces.js";
import {initAcademyAcces,etatsAcademy,academyStatut,academyMeta,academyAutorise,academyAccesApi} from "./soldiers-academy-acces.js";
import {CORRECTIFS,BAREME_EXERCICE,BAREME_EXAMEN} from "./academy-correctifs.js";
import {SPECIALISATIONS} from "./academy-specialisations.js";
import {initRessources,ressourcesApi,ressourcesApprenant,fonctionFormateur} from "./academy-ressources.js";
import {academyDynamiqueApi} from "./academy-dynamique.js";
import {initExtras,notifierCompte,notifierDirection,avisNonLus,marquerAvisLus,cohortesVue,cohortesGestion,cohortesApi,ecolesApi,ecolesDuCompte,ecolesGestion,verifierAttestation as verifierAttestationPublique} from "./academy-extras.js";
export const verifierAttestation=verifierAttestationPublique;
const COURSES=PROGRAMME.courses;
const courseFor=id=>COURSES.find(c=>c.id===id);
const response=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>response({ok:false,message},status);
const safeText=(s,max=14000)=>String(s??"").trim().slice(0,max);
const key=(account,course)=>String(account)+":"+course;
const types=["quiz","exercises","exam"];
const PROJET_ID="PROJET";
const PROJET_CRITERES=SPECIALISATIONS.projet;
const levelCourses=level=>COURSES.filter(c=>c.level===level);
const value=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
async function init(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_submissions (id TEXT PRIMARY KEY, compte TEXT NOT NULL, cours TEXT NOT NULL, type TEXT NOT NULL, reponses TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'en_attente', score INTEGER, commentaire TEXT, date_soumission INTEGER NOT NULL, date_correction INTEGER, correcteur TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_submissions_compte ON academy_2027_submissions(compte,cours,date_soumission)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_submissions_statut ON academy_2027_submissions(statut,date_soumission)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_suivi (compte TEXT NOT NULL, cours TEXT NOT NULL, presence INTEGER NOT NULL DEFAULT 0, participation INTEGER, modifie_le INTEGER NOT NULL, par TEXT NOT NULL, PRIMARY KEY(compte,cours))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_attestations (compte TEXT NOT NULL, niveau INTEGER NOT NULL, code TEXT NOT NULL UNIQUE, delivree_le INTEGER NOT NULL, PRIMARY KEY(compte,niveau))").run();
  await initExtras(env);
}
/* Projet intégrateur : ouvert quand les 24 cours sont validés ; 5 réponses (une par critère), noté sur 100, acquis à 70. */
async function projetEtat(env,account){
  const rows=(await env.DB.prepare("SELECT id,statut,score,commentaire,date_soumission FROM academy_2027_submissions WHERE compte=? AND cours=? ORDER BY date_soumission DESC LIMIT 20").bind(String(account),PROJET_ID).all()).results||[];
  const enAttente=rows.find(r=>r.statut==="en_attente")||null;
  const notes=rows.filter(r=>r.statut==="note"&&value(r.score,0,100));
  const meilleur=notes.length?Math.max(...notes.map(r=>r.score)):null;
  const dernier=notes[0]||null;
  return {enAttente:!!enAttente,soumisLe:enAttente?.date_soumission||null,meilleur,acquis:meilleur!==null&&meilleur>=70,dernier:dernier?{score:dernier.score,commentaire:dernier.commentaire||""}:null};
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
  for(const c of COURSES)overview[c.id]={id:c.id,level:c.level,quiz:null,exercises:null,exam:null,attendance:0,participation:null,pending:[],feedback:[],passed:false,average:null};
  for(const v of att.results||[]){const x=overview[v.cours];if(x){x.attendance=v.presence;x.participation=v.participation;}}
  for(const s of sub.results||[]){
    const x=overview[s.cours];if(!x||!types.includes(s.type))continue;
    if(s.statut==="en_attente")x.pending.push({id:s.id,type:s.type,submittedAt:s.date_soumission});
    if(s.statut==="note"&&value(s.score,0,100)){x[s.type]=Math.max(x[s.type]??0,s.score);x.feedback.push({type:s.type,score:s.score,commentaire:s.commentaire||""});}
  }
  for(const x of Object.values(overview)){
    const valid=types.every(t=>x[t]!==null)&&x.participation!==null;
    x.average=valid?Math.round(x.quiz*.25+x.exercises*.30+x.participation*.15+x.exam*.30):null;
    x.passed=x.average!==null&&x.average>=70&&x.attendance>=80;
  }
  const certificates=cert.results||[];
  const completedLevel=n=>levelCourses(n).every(c=>overview[c.id].passed);
  const allPassed=()=>[1,2,3].every(completedLevel);
  return {overview,certificates,completedLevel,allPassed,progress:{passed:COURSES.filter(c=>overview[c.id].passed).length,total:24,percentage:Math.round(COURSES.filter(c=>overview[c.id].passed).length/24*100)}};
}
function publicProgress(data,etats={}){
  return COURSES.map(c=>{
    const v=data.overview[c.id];
    const preRequis=c.level===1||data.completedLevel(c.level-1);
    const description=academyMeta(c,etats[c.id],v,preRequis);
    return {id:c.id,title:c.title,level:c.level,durationHours:c.durationHours,locked:!description.acces.autorise,
      ...description,quiz:v.quiz,exercises:v.exercises,exam:v.exam,participation:v.participation,attendance:v.attendance,
      average:v.average,passed:v.passed,pending:v.pending,feedback:v.feedback};
  });
}
async function issueCertificates(env,account){
  const snapshot=await state(env,account);
  const nouvelles=[];
  const delivrer=async(niveau,tag)=>{
    if(snapshot.certificates.some(c=>c.niveau===niveau))return;
    const code="SDE-ACA-2027-"+tag+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase();
    const r=await env.DB.prepare("INSERT OR IGNORE INTO academy_2027_attestations(compte,niveau,code,delivree_le) VALUES(?,?,?,?)").bind(String(account),niveau,code,Date.now()).run();
    if(r.meta?.changes!==0)nouvelles.push(niveau);
  };
  for(let level=1;level<=3;level++)if(snapshot.completedLevel(level))await delivrer(level,"N"+level);
  if(snapshot.allPassed()&&(await projetEtat(env,account)).acquis)await delivrer(4,"PARCOURS");
  for(const n of nouvelles){
    await notifierCompte(env,account,{titre:"SDE · Soldiers Academy",corps:n===4?"Félicitations : votre certificat de parcours est disponible dans votre espace Academy.":"Félicitations : l'attestation du niveau "+n+" est disponible"+(n<3?", et le niveau suivant est ouvert.":". Le projet intégrateur est ouvert."),tag:"sde-academy-attestation"});
  }
  return nouvelles;
}
async function ressourcesPour(env,d,compte){
  try{
    await initRessources(env);
    await initAcademyAcces(env);
    const etats=await etatsAcademy(env,compte);
    const coursAutorises=COURSES.filter(c=>{
      const prerequis=c.level===1||d.completedLevel(c.level-1);
      return academyStatut(c,etats[c.id],d.overview[c.id],prerequis).autorise;
    }).map(c=>c.id);
    return await ressourcesApprenant(env,{peutNiveau:n=>n===1||(n>1&&d.completedLevel(n-1)),coursAutorises});
  }catch{return {parCours:{},generales:[],nouveautes:[]}}
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
  if(path.startsWith("/api/soldiers-academy/dynamique")){
    const estEtudiant=/^\/api\/soldiers-academy\/dynamique\/(?:cours|tableau|lecon|quiz\/repondre|question)$/.test(path);
    return academyDynamiqueApi(req,env,u,path,{state:estEtudiant?await state(env,account):null});
  }
  if(path.startsWith("/api/soldiers-academy/acces")){
    const d=path.endsWith("/demander")?await state(env,account):null;
    return academyAccesApi(req,env,u,path,{completedLevel:d?.completedLevel,overview:d?.overview});
  }
  // Love School : toutes les leçons, vidéos, documents et quiz sont désormais
  // contrôlés par un droit individuel, attribué par un coach/professeur habilité.
  if(path.startsWith("/api/soldiers-academy/love-school/acces"))
    return loveAccesApi(req,env,u,path);
  if(path==="/api/soldiers-academy/love-school"&&req.method==="GET"){
    await initLoveAcces(env);
    const etats=await loveEtats(env,account);
    return response({ok:true,ecole:{
      title:LOVE_SCHOOL.title,subtitle:LOVE_SCHOOL.subtitle,nature:LOVE_SCHOOL.nature,parcours:LOVE_SCHOOL_PUBLICS,
      certification:false,
      courses:LOVE_SCHOOL.courses.map(c=>loveMeta(c,etats[c.id]))
    }});
  }
  if(path.startsWith("/api/soldiers-academy/love-school/cours/")){
    const id=decodeURIComponent(path.slice("/api/soldiers-academy/love-school/cours/".length));
    const c=LOVE_SCHOOL.courses.find(x=>x.id===id);
    if(!c)return error("Cours Love School introuvable.",404);
    await initLoveAcces(env);
    if(!(await loveAutorise(env,account,id)))
      return error("Module verrouillé : demandez sa validation à un professeur ou coach.",403);
    if(c.adultOnly){
      if(req.method!=="POST")return error("Ce module adulte nécessite une confirmation de majorité dans une requête dédiée.",403);
      let b;try{b=await readBody(req)}catch{return error("Déclaration invalide.",400)}
      if(b?.confirmationMajeur!==true)return error("Confirmez avoir au moins 18 ans.",403);
    }else if(req.method!=="GET")return error("Méthode non autorisée.",405);
    await initRessources(env);
    const supports=await ressourcesApprenant(env,{peutNiveau:()=>false,bonusAutorises:[id],peutBonusAdulte:!!c.adultOnly});
    return response({ok:true,cours:{...c,ressources:supports.parCours[id]||[]},statut:"approuve",
      verificationAge:c.adultOnly?"declarative_non_verifiee":null});
  }
  if(path==="/api/soldiers-academy/love-school/adulte")
    return error("Ancien accès désactivé. Actualisez Love School puis ouvrez individuellement chaque cours autorisé.",410);
  if(path==="/api/soldiers-academy/ressources/etat"&&req.method==="GET"){
    const d=await state(env,account);
    const biblio=await ressourcesPour(env,d,account);
    return response({ok:true,ressources:{
      generales:biblio.generales,nouveautes:biblio.nouveautes,
      parCours:Object.fromEntries(Object.entries(biblio.parCours).map(([k,v])=>[k,v.length]))
    }});
  }
  if(path==="/api/soldiers-academy"&&req.method==="GET"){
    const d=await state(env,account);
    const pj=await projetEtat(env,account);
    const peutRejoindre=n=>n===1||d.completedLevel(n-1);
    await initAcademyAcces(env);
    const [cohortes,avis,mesEcoles,biblio,fonction,accesCours]=await Promise.all([cohortesVue(env,u,{peutRejoindre}),avisNonLus(env,account),ecolesDuCompte(env,account),ressourcesPour(env,d,account),fonctionFormateur(env,u),etatsAcademy(env,account)]);
    const projet={ouvert:d.allPassed(),criteres:PROJET_CRITERES.map(([libelle,points])=>({libelle,points})),enAttente:pj.enAttente,soumisLe:pj.soumisLe,meilleur:pj.meilleur,acquis:pj.acquis,dernier:pj.dernier};
    return response({ok:true,programme:{version:PROGRAMME.version,status:"adopte",durationHours:192,levels:PROGRAMME.levels,evaluation:PROGRAMME.evaluation},name:u.nom||"Membre SDE",admin,progress:d.progress,courses:publicProgress(d,accesCours),certificates:d.certificates,projet,parcoursComplet:d.certificates.some(c=>c.niveau===4),
      specialisations:{ecoles:SPECIALISATIONS.ecoles,masterclass:SPECIALISATIONS.masterclass,ouvertes:d.allPassed(),mesInscriptions:mesEcoles},cohortes,avis,
      ressources:{generales:biblio.generales,nouveautes:biblio.nouveautes,parCours:Object.fromEntries(Object.entries(biblio.parCours).map(([k,v])=>[k,v.length]))},formateur:fonction||null});
  }
  if(path.startsWith("/api/soldiers-academy/cours/")&&req.method==="GET"){
    const c=courseFor(decodeURIComponent(path.slice("/api/soldiers-academy/cours/".length)));
    if(!c)return error("Cours introuvable.",404);
    const dc=await state(env,account);
    if(!canAccess(c,dc))return error("Validez le niveau précédent pour ouvrir ce cours.",403);
    await initAcademyAcces(env);
    if(!(await academyAutorise(env,account,c,dc.overview[c.id])))return error("Cours verrouillé : demandez une validation au coach ou professeur.",403);
    const biblioCours=await ressourcesPour(env,dc,account);
    return response({ok:true,course:c,ressources:biblioCours.parCours[c.id]||[],disclaimer:"Formation interne au Mouvement SDE. Les travaux et examens sont évalués par un responsable habilité."});
  }
  if(path==="/api/soldiers-academy/soumettre"&&req.method==="POST"){
    let body;try{body=await readBody(req)}catch{return error("Requête JSON invalide ou trop volumineuse.",413)}
    if(body.courseId===PROJET_ID&&body.type==="projet"){
      const d=await state(env,account),pj=await projetEtat(env,account);
      if(!d.allPassed())return error("Le projet intégrateur s'ouvre quand les 24 cours sont validés.",403);
      if(pj.enAttente)return error("Votre projet attend déjà sa correction.",409);
      if(pj.acquis)return error("Votre projet est déjà validé.",409);
      if(!Array.isArray(body.answers)||body.answers.length!==PROJET_CRITERES.length||body.answers.some(x=>typeof x!=="string"||x.trim().length<40||x.length>8000))return error("Renseignez les "+PROJET_CRITERES.length+" parties du dossier (minimum 40 caractères chacune).");
      const id=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO academy_2027_submissions(id,compte,cours,type,reponses,statut,date_soumission) VALUES(?,?,?,?,?,'en_attente',?)").bind(id,account,PROJET_ID,"projet",JSON.stringify(body.answers.map(x=>safeText(x,8000))),Date.now()).run();
      await notifierDirection(env,"Un projet intégrateur attend sa correction.");
      return response({ok:true,id,message:"Projet remis pour correction et soutenance."},201);
    }
    const c=courseFor(body.courseId);const type=body.type;
    if(!c||!types.includes(type))return error("Cours ou type d'épreuve invalide.");
    const dCourse=await state(env,account);
    if(!canAccess(c,dCourse))return error("Niveau verrouillé.",403);
    await initAcademyAcces(env);
    if(!(await academyAutorise(env,account,c,dCourse.overview[c.id])))return error("Cours verrouillé : une validation pédagogique préalable est nécessaire.",403);
    const prompts=counts(c,type);
    if(!Array.isArray(body.answers)||body.answers.length!==prompts.length||body.answers.some(x=>typeof x!=="string"||x.trim().length<12||x.length>8000))return error("Répondez à toutes les questions (minimum 12 caractères par réponse).");
    const pending=await env.DB.prepare("SELECT id FROM academy_2027_submissions WHERE compte=? AND cours=? AND type=? AND statut='en_attente' LIMIT 1").bind(account,c.id,type).first();
    if(pending)return error("Une copie de cette épreuve attend déjà sa correction.",409);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO academy_2027_submissions(id,compte,cours,type,reponses,statut,date_soumission) VALUES(?,?,?,?,?,'en_attente',?)").bind(id,account,c.id,type,JSON.stringify(body.answers.map(x=>safeText(x,8000))),Date.now()).run();
    await notifierDirection(env,"Une copie ("+c.id+") attend sa correction.");
    return response({ok:true,id,message:"Copie remise au formateur. La note sera disponible après correction."},201);
  }
  if(path==="/api/soldiers-academy/gestion"&&req.method==="GET"){
    if(!admin)return error("Accès réservé à la direction pédagogique.",403);
    const rows=(await env.DB.prepare("SELECT a.id,a.compte,a.cours,a.type,a.reponses,a.date_soumission,c.nom FROM academy_2027_submissions a LEFT JOIN comptes c ON c.id=a.compte WHERE a.statut='en_attente' ORDER BY a.date_soumission ASC LIMIT 100").all()).results||[];
    const suivi=(await env.DB.prepare("SELECT DISTINCT compte,cours FROM academy_2027_submissions ORDER BY cours LIMIT 200").all()).results||[];
    const aide=x=>{
      if(x.cours===PROJET_ID)return {consignes:PROJET_CRITERES.map(([l,p])=>l+" ("+p+" points)"),bareme:"Total sur 100 : "+PROJET_CRITERES.map(([l,p])=>l+" "+p).join(" ; ")+". Acquis à partir de 70. Soutenance : 12 min + 8 min de questions.",corriges:null};
      const c=courseFor(x.cours),k=CORRECTIFS[x.cours];
      if(!c||!k)return {consignes:[],bareme:"",corriges:null};
      if(x.type==="quiz")return {consignes:c.quiz.map(q=>q.question),bareme:"5 questions de 20 points : note sur 100.",corriges:k.quiz};
      if(x.type==="exam")return {consignes:c.exam.map(e=>e.task+" ("+e.points+" points)"),bareme:BAREME_EXAMEN+" Barème par épreuve : "+c.exam.map(e=>e.points).join(" + ")+" = 100.",corriges:k.exam};
      return {consignes:c.exercises.map(e=>e.instruction),bareme:BAREME_EXERCICE,corriges:null};
    };
    const cohortes=await cohortesGestion(env),ecolesDemandes=await ecolesGestion(env);
    return response({ok:true,pending:rows.map(x=>({...x,reponses:JSON.parse(x.reponses||"[]"),nom:x.nom||"Apprenant",aide:aide(x)})),students:suivi,courses:COURSES.map(c=>({id:c.id,title:c.title,level:c.level})),cohortes,ecolesDemandes});
  }
  if(path==="/api/soldiers-academy/noter"&&req.method==="PATCH"){
    if(!admin)return error("Accès réservé aux correcteurs.",403);
    let b;try{b=await readBody(req)}catch{return error("Données invalides.")}
    if(typeof b.id!=="string"||!value(b.score,0,100)||safeText(b.comment,2000).length<3)return error("Indiquez la copie, une note de 0 à 100 et un commentaire.");
    const s=await env.DB.prepare("SELECT id,compte,statut FROM academy_2027_submissions WHERE id=?").bind(b.id).first();
    if(!s)return error("Copie introuvable.",404);
    if(s.statut!=="en_attente")return error("Cette copie a déjà été corrigée.",409);
    await env.DB.prepare("UPDATE academy_2027_submissions SET statut='note',score=?,commentaire=?,date_correction=?,correcteur=? WHERE id=? AND statut='en_attente'").bind(b.score,safeText(b.comment,2000),Date.now(),account,b.id).run();
    const sujet=s.cours===PROJET_ID?"projet intégrateur":s.cours;
    await notifierCompte(env,s.compte,{titre:"SDE · Soldiers Academy",corps:"Votre copie ("+sujet+") a été corrigée : "+b.score+"/100. Consultez le commentaire dans votre espace Academy.",tag:"sde-academy-note"});
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
    if(!value(level,1,4))return error("Niveau invalide.");
    const d=await state(env,account),certificate=d.certificates.find(c=>c.niveau===level);
    if(!certificate||(level<4&&!d.completedLevel(level))||(level===4&&!d.allPassed()))return error("L'attestation n'est pas encore acquise.",403);
    return response({ok:true,attestation:certificate,level:level===4?{id:4,title:"Parcours intégral Soldiers Academy"}:PROGRAMME.levels[level-1],name:u.nom||"Apprenant Soldiers Academy"});
  }
  if(path==="/api/soldiers-academy/avis/lus"&&req.method==="POST"){await marquerAvisLus(env,account);return response({ok:true});}
  if(path.startsWith("/api/soldiers-academy/ressources")||path.startsWith("/api/soldiers-academy/formateurs"))return ressourcesApi(req,env,u,path);
  if(path.startsWith("/api/soldiers-academy/ecoles")){
    const d=await state(env,account);
    return ecolesApi(req,env,u,path,{admin,ouvert:d.allPassed()});
  }
  if(path.startsWith("/api/soldiers-academy/cohortes")){
    const d=await state(env,account);
    return cohortesApi(req,env,u,path,{admin,peutRejoindre:n=>n===1||d.completedLevel(n-1)});
  }
  return error("Ancienne interface désactivée : utilisez le programme 2027.",404);
}
