/* Soldiers Academy : apprentissage vivant, classes, suivi et pilotage.
 * Toutes les opérations passent par les autorisations de cours déjà en place.
 * Les quiz d'entraînement ne modifient jamais les évaluations officielles.
 */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";
import {LOVE_SCHOOL} from "./love-school.js";
import {academyAutorise,initAcademyAcces} from "./soldiers-academy-acces.js";
import {loveAutorise,initLoveAcces} from "./love-school-acces.js";
import {initRessources,porteesAutorisees} from "./academy-ressources.js";
import {notifierCompte} from "./academy-extras.js";

const COURS=[...PROGRAMME.courses,...LOVE_SCHOOL.courses.filter(c=>!c.adultOnly)];
const cours=id=>COURS.find(c=>c.id===id);
const official=c=>c.id.startsWith("SA-");
const fail=(message,status=400)=>Response.json({ok:false,message},{status,headers:{"cache-control":"private, no-store"}});
const ok=(d,status=200)=>Response.json({ok:true,...d},{status,headers:{"cache-control":"private, no-store"}});
const clean=(v,n)=>String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n);
const validTime=(v)=>{const n=Date.parse(String(v||""));return Number.isFinite(n)?n:null};
const courseList=(portees)=>COURS.filter(c=>portees.includes(c.id)||(official(c)&&portees.includes("N"+c.level))).map(c=>c.id);
const inVals=(n)=>Array.from({length:n},()=>"?").join(",");
async function data(req){const t=await req.text();if(t.length>12000)throw Error("Corps trop volumineux");return JSON.parse(t)}
export async function initAcademyDynamique(env){
 for(const query of [
  "CREATE TABLE IF NOT EXISTS academy_dyn_lecons (compte TEXT NOT NULL,cours TEXT NOT NULL,lecon INTEGER NOT NULL,terminee INTEGER NOT NULL DEFAULT 0,maj INTEGER NOT NULL,PRIMARY KEY(compte,cours,lecon))",
  "CREATE INDEX IF NOT EXISTS idx_academy_dyn_lecons_cours ON academy_dyn_lecons(cours,terminee)",
  "CREATE TABLE IF NOT EXISTS academy_dyn_quiz (id TEXT PRIMARY KEY,cours TEXT NOT NULL,question TEXT NOT NULL,choix TEXT NOT NULL,reponse INTEGER NOT NULL,explication TEXT NOT NULL,par TEXT NOT NULL,cree INTEGER NOT NULL,publication INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_academy_dyn_quiz_cours ON academy_dyn_quiz(cours,publication)",
  "CREATE TABLE IF NOT EXISTS academy_dyn_essais (compte TEXT NOT NULL,quiz TEXT NOT NULL,choix INTEGER NOT NULL,reussi INTEGER NOT NULL,maj INTEGER NOT NULL,PRIMARY KEY(compte,quiz))",
  "CREATE TABLE IF NOT EXISTS academy_dyn_seances (id TEXT PRIMARY KEY,cours TEXT NOT NULL,titre TEXT NOT NULL,debut INTEGER NOT NULL,duree INTEGER NOT NULL,lien TEXT NOT NULL,par TEXT NOT NULL,cree INTEGER NOT NULL,annule INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS idx_academy_dyn_seances_cours ON academy_dyn_seances(cours,debut)",
  "CREATE TABLE IF NOT EXISTS academy_dyn_questions (id TEXT PRIMARY KEY,cours TEXT NOT NULL,compte TEXT NOT NULL,question TEXT NOT NULL,reponse TEXT NOT NULL DEFAULT '',par TEXT,cree INTEGER NOT NULL,repondu INTEGER)",
  "CREATE INDEX IF NOT EXISTS idx_academy_dyn_questions_compte ON academy_dyn_questions(compte,cours,cree)",
  "CREATE TABLE IF NOT EXISTS academy_dyn_rappels (seance TEXT NOT NULL,compte TEXT NOT NULL,envoye INTEGER NOT NULL,PRIMARY KEY(seance,compte))"
 ])await env.DB.prepare(query).run();
}
const select=async(env,sql,...args)=>(await env.DB.prepare(sql).bind(...args).all()).results||[];
const byRows=(rows,key)=>Object.fromEntries(rows.map(r=>[r[key],r]));
const teacher=async(env,u,id)=>{
 if(Number(u.niveau)>=2)return true;
 await initRessources(env);
 const scopes=await porteesAutorisees(env,u),c=cours(id);
 return !!c&&(scopes.includes(c.id)||(official(c)&&scopes.includes("N"+c.level)));
};
async function accepted(env,u,id,{state}={}){
 const c=cours(id);if(!c)return false;
 if(!official(c))return loveAutorise(env,u.id,id);
 if(!state)return false;
 if(c.level>1&&!state.completedLevel(c.level-1))return false;
 return academyAutorise(env,u.id,c,state.overview[c.id]);
}

const coursAvecAcces=async(env,id)=>{
 const table=id.startsWith("SA-")?"academy_2027_acces":"academy_love_acces";
 return (await select(env,"SELECT compte FROM "+table+" WHERE cours=? AND statut='approuve' LIMIT 250",id)).map(x=>String(x.compte));
};
async function notifierClasse(env,{id,titre,debut}){
 const membres=await coursAvecAcces(env,id);
 await Promise.allSettled(membres.map(compte=>notifierCompte(env,compte,{titre:"Soldiers Academy · Classe programmée",
  corps:"Une séance (« "+titre+" ») est programmée dans votre cours "+id+" le "+new Date(debut).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})+". Consultez l'agenda Academy.",
  tag:"academy-classe"})));
}
export async function rappelsSeancesDynamique(env,{now=Date.now()}={}){
 await Promise.all([initAcademyDynamique(env),initAcademyAcces(env),initLoveAcces(env)]);
 const rows=await select(env,"SELECT id,cours,titre,debut FROM academy_dyn_seances WHERE annule=0 AND debut BETWEEN ? AND ? ORDER BY debut LIMIT 100",now+25*60000,now+65*60000);
 let notifications=0;
 for(const s of rows){
  const membres=await coursAvecAcces(env,s.cours);
  for(const compte of membres){
   const ajout=await env.DB.prepare("INSERT OR IGNORE INTO academy_dyn_rappels(seance,compte,envoye) VALUES(?,?,?)").bind(s.id,compte,now).run();
   if(ajout.meta?.changes===1){
    await notifierCompte(env,compte,{titre:"Soldiers Academy · Rappel de classe",
      corps:"Votre classe « "+s.titre+" » commence dans environ une heure. Ouvrez l'agenda Academy pour rejoindre la séance.",tag:"academy-rappel-classe"});
    notifications++;
   }
  }
 }
 return {seances:rows.length,notifications};
}

async function viewSessions(env,ids,now=Date.now()){
 if(!ids.length)return [];
 return (await select(env,"SELECT id,cours,titre,debut,duree,lien FROM academy_dyn_seances WHERE annule=0 AND cours IN ("+inVals(ids.length)+") AND debut>=? ORDER BY debut ASC LIMIT 30",...ids,now-2*3600e3));
}
async function detail(env,u,id,state){
 const c=cours(id);
 if(!c)return fail("Cours inconnu.",404);
 if(!(await accepted(env,u,id,{state})))return fail("Le module doit être autorisé par un coach ou professeur avant toute activité.",403);
 const now=Date.now();
 const [lecons,quiz,essais,questions,seances]=await Promise.all([
  select(env,"SELECT lecon,terminee,maj FROM academy_dyn_lecons WHERE compte=? AND cours=? ORDER BY lecon",String(u.id),id),
  select(env,"SELECT id,question,choix FROM academy_dyn_quiz WHERE cours=? AND publication<=? ORDER BY cree DESC LIMIT 40",id,now),
  select(env,"SELECT e.quiz,e.choix,e.reussi,e.maj FROM academy_dyn_essais e JOIN academy_dyn_quiz q ON q.id=e.quiz WHERE e.compte=? AND q.cours=?",String(u.id),id),
  select(env,"SELECT id,question,reponse,cree,repondu FROM academy_dyn_questions WHERE compte=? AND cours=? ORDER BY cree DESC LIMIT 30",String(u.id),id),
  viewSessions(env,[id])
 ]);
 const total=official(c)?c.units.length:c.lessons.length;
 return ok({cours:id,lecons:lecons.map(r=>({numero:r.lecon,terminee:!!r.terminee,maj:r.maj})),totalLecons:total,
  quiz:quiz.map(q=>({id:q.id,question:q.question,choix:JSON.parse(q.choix)})),
  essais:essais.map(e=>({quiz:e.quiz,choix:e.choix,reussi:!!e.reussi,maj:e.maj})),
  questions,seances});
}
export async function academyDynamiqueApi(req,env,u,path,{state}={}){
 const base="/api/soldiers-academy/dynamique";
 if(!path.startsWith(base))return null;
 if(!u?.connecte||!u.id)return fail("Connexion requise.",401);
 if(!env.DB)return fail("Base de données indisponible.",503);
 await Promise.all([initAcademyDynamique(env),initAcademyAcces(env),initLoveAcces(env)]);
 const account=String(u.id),now=Date.now(),admin=Number(u.niveau)>=2;
 const sous=path.slice(base.length);
 if(sous==="/cours"&&req.method==="GET"){
  const id=new URL(req.url).searchParams.get("id")||"";
  return detail(env,u,id,state);
 }
 if(sous==="/tableau"&&req.method==="GET"){
  const access=await Promise.all(COURS.map(async c=>({id:c.id,autorise:await accepted(env,u,c.id,{state})})));
  const ids=access.filter(r=>r.autorise).map(r=>r.id);
  const [lecons,essais,attente,seances]=await Promise.all([
   select(env,"SELECT cours,COUNT(*) AS n,MAX(maj) AS maj FROM academy_dyn_lecons WHERE compte=? AND terminee=1 GROUP BY cours",account),
   select(env,"SELECT COUNT(*) AS n FROM academy_dyn_essais WHERE compte=? AND reussi=1",account),
   select(env,"SELECT COUNT(*) AS n FROM academy_2027_acces WHERE compte=? AND statut='en_attente'",account),
   viewSessions(env,ids)
  ]);
  const prog=byRows(lecons,"cours"),complet=lecons.reduce((a,b)=>a+Number(b.n),0),dernier=lecons.sort((a,b)=>b.maj-a.maj)[0];
  const total=ids.reduce((n,id)=>n+(cours(id).units?.length||cours(id).lessons?.length||0),0);
  return ok({resume:{coursAutorises:ids.length,leconsEtudiees:complet,leconsDisponibles:total,
    activitesReussies:Number(essais[0]?.n||0),demandesEnAttente:Number(attente[0]?.n||0),reprendre:dernier?.cours||ids[0]||null},
    progressions:Object.fromEntries(ids.map(id=>[id,Number(prog[id]?.n||0)])),seances});
 }
 if(sous==="/lecon"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Données invalides.");}
  const c=cours(b.cours),n=Number(b.lecon);
  if(!c||!Number.isInteger(n)||n<1||n>(c.units?.length||c.lessons?.length||0)||typeof b.terminee!=="boolean")
   return fail("Leçon ou statut invalide.");
  if(!(await accepted(env,u,c.id,{state})))return fail("Cours verrouillé.",403);
  await env.DB.prepare("INSERT INTO academy_dyn_lecons(compte,cours,lecon,terminee,maj) VALUES(?,?,?,?,?) ON CONFLICT(compte,cours,lecon) DO UPDATE SET terminee=excluded.terminee,maj=excluded.maj")
   .bind(account,c.id,n,b.terminee?1:0,now).run();
  return ok({cours:c.id,lecon:n,terminee:b.terminee,message:b.terminee?"Leçon marquée comme étudiée.":"Marque de lecture retirée."});
 }
 if(sous==="/quiz/repondre"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Réponse invalide.");}
  const r=await env.DB.prepare("SELECT * FROM academy_dyn_quiz WHERE id=? AND publication<=?").bind(clean(b.id,70),now).first();
  if(!r)return fail("Activité indisponible.",404);
  const choices=JSON.parse(r.choix),answer=Number(b.choix);
  if(!Number.isInteger(answer)||answer<0||answer>=choices.length)return fail("Choisissez une réponse valide.");
  if(!(await accepted(env,u,r.cours,{state})))return fail("Cours verrouillé.",403);
  const found=answer===r.reponse;
  await env.DB.prepare("INSERT INTO academy_dyn_essais(compte,quiz,choix,reussi,maj) VALUES(?,?,?,?,?) ON CONFLICT(compte,quiz) DO UPDATE SET choix=excluded.choix,reussi=excluded.reussi,maj=excluded.maj").bind(account,r.id,answer,found?1:0,now).run();
  return ok({id:r.id,reussi:found,explication:r.explication,correction:r.reponse,
    message:found?"Bonne réponse.":"Réponse à revoir. Cette activité ne compte pas pour l'examen officiel."});
 }
 if(sous==="/question"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Question invalide.");}
  const c=cours(b.cours),question=clean(b.question,600);
  if(!c||question.length<10)return fail("Indiquez le cours et une question pédagogique (10 caractères minimum).");
  if(!(await accepted(env,u,c.id,{state})))return fail("Cours verrouillé.",403);
  const freq=await env.DB.prepare("SELECT COUNT(*) AS n FROM academy_dyn_questions WHERE compte=? AND cree>?").bind(account,now-86400e3).first();
  if(Number(freq?.n||0)>=6)return fail("Limite de six questions par jour atteinte.",429);
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO academy_dyn_questions(id,cours,compte,question,cree) VALUES(?,?,?,?,?)").bind(id,c.id,account,question,now).run();
  return ok({id,message:"Votre question privée a été transmise à l'équipe pédagogique du cours."},201);
 }
 if(sous==="/studio/copies"&&req.method==="GET"){
  await initRessources(env);
  const scope=await porteesAutorisees(env,u),ids=admin?PROGRAMME.courses.map(c=>c.id):courseList(scope).filter(id=>id.startsWith("SA-"));
  if(!ids.length)return ok({copies:[]});
  const rows=await select(env,"SELECT s.id,s.compte,s.cours,s.type,s.reponses,s.date_soumission,c.nom FROM academy_2027_submissions s LEFT JOIN comptes c ON c.id=s.compte WHERE s.statut='en_attente' AND s.cours IN ("+inVals(ids.length)+") ORDER BY s.date_soumission ASC LIMIT 150",...ids);
  return ok({copies:rows.map(r=>{
   const c=PROGRAMME.courses.find(x=>x.id===r.cours);
   const consignes=r.type==="quiz"?c.quiz.map(q=>q.question):r.type==="exercises"?c.exercises.map(x=>x.instruction):r.type==="exam"?c.exam.map(x=>x.task):[];
   return {id:r.id,cours:r.cours,type:r.type,nom:r.nom||"Apprenant SDE",date:r.date_soumission,reponses:JSON.parse(r.reponses||"[]"),consignes};
  })});
 }
 if(sous==="/studio"&&req.method==="GET"){
  await initRessources(env);
  const scopes=await porteesAutorisees(env,u),ids=admin?COURS.map(c=>c.id):courseList(scopes);
  if(!ids.length)return fail("Réservé aux enseignants et coachs habilités.",403);
  const [activites,seances,questions]=await Promise.all([
   select(env,"SELECT id,cours,question,choix,explication,publication,cree FROM academy_dyn_quiz WHERE cours IN ("+inVals(ids.length)+") ORDER BY cree DESC LIMIT 150",...ids),
   select(env,"SELECT id,cours,titre,debut,duree,lien,annule FROM academy_dyn_seances WHERE cours IN ("+inVals(ids.length)+") ORDER BY debut DESC LIMIT 150",...ids),
   select(env,"SELECT q.id,q.cours,q.compte,q.question,q.reponse,q.cree,q.repondu FROM academy_dyn_questions q WHERE q.cours IN ("+inVals(ids.length)+") ORDER BY q.cree DESC LIMIT 150",...ids)
  ]);
  return ok({cours:COURS.filter(c=>ids.includes(c.id)).map(c=>({id:c.id,title:c.title})),activites:activites.map(a=>({...a,choix:JSON.parse(a.choix)})),seances,questions,
   statistiques:{activites:activites.length,seances:seances.filter(x=>!x.annule&&x.debut>now).length,questionsEnAttente:questions.filter(x=>!x.repondu).length}});
 }
 if(sous==="/studio/quiz"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Activité invalide.");}
  const c=cours(b.cours),question=clean(b.question,240),explication=clean(b.explication,500);
  const choix=Array.isArray(b.choix)?b.choix.map(x=>clean(x,150)):[];
  const reponse=Number(b.reponse),publication=b.publication?validTime(b.publication):now;
  if(!c||!(await teacher(env,u,c.id)))return fail("Ce cours ne vous est pas confié.",403);
  if(question.length<10||explication.length<15||choix.length<2||choix.length>4||choix.some(x=>x.length<2)||!Number.isInteger(reponse)||reponse<0||reponse>=choix.length)
   return fail("Question, 2 à 4 choix, réponse correcte et explication sont requis.");
  if(!publication||publication>now+365*86400e3||publication<now-86400e3)return fail("Date de publication invalide.");
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO academy_dyn_quiz(id,cours,question,choix,reponse,explication,par,cree,publication) VALUES(?,?,?,?,?,?,?,?,?)")
   .bind(id,c.id,question,JSON.stringify(choix),reponse,explication,account,now,publication).run();
  return ok({id,message:publication>now?"Activité programmée.":"Activité interactive publiée pour les apprenants autorisés."},201);
 }
 if(sous==="/studio/seance"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Séance invalide.");}
  const c=cours(b.cours),titre=clean(b.titre,120),start=validTime(b.debut),duree=Number(b.duree),lien=String(b.lien||"").trim();
  if(!c||!(await teacher(env,u,c.id)))return fail("Ce cours ne vous est pas confié.",403);
  if(titre.length<5||!start||start<now+5*60e3||start>now+365*86400e3||!Number.isInteger(duree)||duree<15||duree>240)
   return fail("Indiquez une séance future valide (15 à 240 minutes).");
  if(!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(lien))return fail("Indiquez un lien Google Meet valide.");
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO academy_dyn_seances(id,cours,titre,debut,duree,lien,par,cree) VALUES(?,?,?,?,?,?,?,?)")
   .bind(id,c.id,titre,start,duree,lien,account,now).run();
  await notifierClasse(env,{id:c.id,titre,debut:start});
  return ok({id,message:"Classe virtuelle inscrite dans l'agenda et annoncée aux apprenants autorisés."},201);
 }
 if(sous==="/studio/annuler"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Séance invalide.");}
  const s=await env.DB.prepare("SELECT cours,annule FROM academy_dyn_seances WHERE id=?").bind(clean(b.id,100)).first();
  if(!s)return fail("Séance inconnue.",404);
  if(!(await teacher(env,u,s.cours)))return fail("Action non autorisée.",403);
  await env.DB.prepare("UPDATE academy_dyn_seances SET annule=1 WHERE id=?").bind(String(b.id)).run();
  return ok({message:"Classe virtuelle annulée."});
 }
 if(sous==="/studio/repondre"&&req.method==="POST"){
  let b;try{b=await data(req)}catch{return fail("Réponse invalide.");}
  const q=await env.DB.prepare("SELECT id,cours,compte,repondu FROM academy_dyn_questions WHERE id=?").bind(clean(b.id,100)).first();
  const reponse=clean(b.reponse,800);
  if(!q)return fail("Question inconnue.",404);
  if(!(await teacher(env,u,q.cours)))return fail("Ce cours ne vous est pas confié.",403);
  if(reponse.length<10)return fail("Saisissez une réponse pédagogique d'au moins 10 caractères.");
  await env.DB.prepare("UPDATE academy_dyn_questions SET reponse=?,par=?,repondu=? WHERE id=?").bind(reponse,account,now,q.id).run();
  await notifierCompte(env,q.compte,{titre:"Soldiers Academy · Réponse du coach",corps:"Un enseignant a répondu à votre question sur le cours "+q.cours+". Consultez votre espace Academy.",tag:"academy-question"});
  return ok({message:"Réponse privée envoyée à l'apprenant."});
 }
 if(sous==="/pilotage"&&req.method==="GET"){
  if(!admin)return fail("Réservé à l'administration pédagogique.",403);
  const [suivi,activites,questions,classes,validations]=await Promise.all([
    select(env,"SELECT COUNT(DISTINCT compte) AS apprenants,COUNT(*) AS lecons FROM academy_dyn_lecons WHERE terminee=1"),
    select(env,"SELECT COUNT(*) AS essais,SUM(CASE WHEN reussi=1 THEN 1 ELSE 0 END) AS reussites FROM academy_dyn_essais"),
    select(env,"SELECT COUNT(*) AS total,SUM(CASE WHEN repondu IS NULL THEN 1 ELSE 0 END) AS attente FROM academy_dyn_questions"),
    select(env,"SELECT COUNT(*) AS total,SUM(CASE WHEN annule=0 AND debut>? THEN 1 ELSE 0 END) AS avenir FROM academy_dyn_seances",now),
    select(env,"SELECT COUNT(*) AS total,SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) AS attente FROM academy_2027_acces")
  ]);
  const niveaux=await select(env,"SELECT cours,COUNT(*) AS n FROM academy_dyn_lecons WHERE terminee=1 AND cours LIKE 'SA-%' GROUP BY cours");
  const parNiveau=[1,2,3].map(n=>({niveau:n,lecons:niveaux.filter(r=>{const no=Number(String(r.cours).slice(3));return no>=(n-1)*8+1&&no<=n*8}).reduce((sum,r)=>sum+Number(r.n),0)}));
  return ok({indicateurs:{apprenantsActifs:Number(suivi[0]?.apprenants||0),leconsEtudiees:Number(suivi[0]?.lecons||0),
   quizTentes:Number(activites[0]?.essais||0),quizReussis:Number(activites[0]?.reussites||0),
   questions:Number(questions[0]?.total||0),questionsEnAttente:Number(questions[0]?.attente||0),
   seances:Number(classes[0]?.total||0),seancesAVenir:Number(classes[0]?.avenir||0),
   demandesAcces:Number(validations[0]?.total||0),demandesEnAttente:Number(validations[0]?.attente||0)},parNiveau});
 }
 return fail("Route ou méthode inconnue.",405);
}
