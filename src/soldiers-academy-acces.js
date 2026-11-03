/**
 * Soldiers Academy — verrou individuel des 24 cours officiels.
 * Objectifs et règles consultables sans déverrouiller les leçons ni les examens.
 * Les anciens cours ayant déjà des travaux validés ou commencés conservent leur accès,
 * sauf si un refus/retrait est explicitement décidé après migration.
 */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";
import {initRessources,porteesAutorisees} from "./academy-ressources.js";

const reply=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>reply({ok:false,message},status);
const COURS=PROGRAMME.courses,courseFor=id=>COURS.find(c=>c.id===id);
const COURSES=COURS.map(c=>c.id);
const LEVELS={1:"Fondations bibliques et identité",2:"Équipement spirituel et ministériel",3:"Leadership et commandement"};
const PROPRE=s=>String(s??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,400);
/* Conditions supplémentaires rédigées spécifiquement pour les 24 modules. */
const PREREQUIS={
 "SA-01":"Recevoir l’enseignement sur le salut dans un esprit de liberté et sans pression religieuse.",
 "SA-02":"Respecter la dignité et le cheminement spirituel de chaque personne.",
 "SA-03":"Accepter d’examiner les affirmations à la lumière des Écritures.",
 "SA-04":"Approcher les textes bibliques dans leur contexte historique et littéraire.",
 "SA-05":"Pratiquer la prière et le jeûne sans mettre en danger sa santé ni imposer une pratique à autrui.",
 "SA-06":"Distinguer les enseignements bibliques des impressions personnelles.",
 "SA-07":"S’engager à un travail personnel sur le caractère sans jugement humiliant.",
 "SA-08":"Respecter les valeurs du mouvement et la liberté de conscience.",
 "SA-09":"Avoir validé le niveau I et respecter la complémentarité des ministères.",
 "SA-10":"Avoir validé le niveau I et distinguer interprétation, discernement et fait vérifiable.",
 "SA-11":"Avoir validé le niveau I et reconnaître la responsabilité collective de la mission.",
 "SA-12":"Avoir validé le niveau I et pratiquer un discernement responsable, sans accusation.",
 "SA-13":"Avoir validé le niveau I et respecter la confidentialité des sujets de prière.",
 "SA-14":"Avoir validé le niveau I et examiner les situations humaines sans attribuer arbitrairement une cause spirituelle.",
 "SA-15":"Avoir validé le niveau I et exercer les dons dans l’ordre et l’éthique.",
 "SA-16":"Avoir validé le niveau I et respecter strictement l’intégrité, la sécurité et le consentement des personnes accompagnées.",
 "SA-17":"Avoir validé le niveau II et privilégier l’exemplarité et le service.",
 "SA-18":"Avoir validé le niveau II et accepter la redevabilité des responsables.",
 "SA-19":"Avoir validé le niveau II et respecter la gouvernance, les conflits d’intérêts et la protection des informations.",
 "SA-20":"Avoir validé le niveau II et enseigner sans manipulation ni information mensongère.",
 "SA-21":"Avoir validé le niveau II et s’exercer à résoudre les conflits sans intimidation.",
 "SA-22":"Avoir validé le niveau II et respecter la liberté des personnes rencontrées en mission.",
 "SA-23":"Avoir validé le niveau II et s’engager à la transparence et à l’intégrité financière.",
 "SA-24":"Avoir validé le niveau II et transmettre dans la responsabilité et la redevabilité."
};
const REGLES={
 "SA-05":"Une difficulté de santé ou un traitement peut contre-indiquer le jeûne : demander un conseil médical approprié; aucune pratique n’est obligatoire.",
 "SA-10":"Aucune parole dite prophétique ne peut être imposée comme diagnostic médical ou décision personnelle forcée.",
 "SA-12":"Ne pas accuser une personne de sorcellerie, de possession ou de faute sans éléments vérifiables.",
 "SA-13":"Ne pas diffuser les sujets de prière privés sans consentement.",
 "SA-14":"Aucune pratique de combat spirituel ne doit justifier intimidation, violence ou privation de soins.",
 "SA-15":"Les dons spirituels n’autorisent ni manipulation ni atteinte à la dignité.",
 "SA-16":"Aucune méthode coercitive ou humiliation; toute question de santé nécessite un professionnel qualifié.",
 "SA-18":"L’autorité spirituelle ne donne aucun droit sur le corps, les finances ou la vie privée d’autrui.",
 "SA-19":"Les données pastorales et financières doivent rester limitées aux personnes habilitées.",
 "SA-20":"Éviter les promesses de guérison, de richesse ou de résultat garantis.",
 "SA-21":"Un conflit impliquant des violences demande d’abord une protection adéquate, pas une médiation forcée.",
 "SA-22":"Ne conditionner aucune aide humanitaire à une adhésion religieuse.",
 "SA-23":"Toute collecte ou dépense doit suivre les règles de transparence établies par le mouvement.",
 "SA-24":"La formation des futurs leaders doit respecter les contrôles et la gouvernance du mouvement."
};
export const CONDITIONS_GENERALES_SA=[
 "Être connecté à un compte membre du Mouvement SDE.",
 "Lire les objectifs, conditions et restrictions du cours avant de demander l’accès.",
 "Obtenir l’autorisation individuelle d’un professeur, coach habilité ou administrateur pour ce cours précis.",
 "Pour les niveaux II et III, avoir validé tous les cours du niveau précédent."
];
export const RESTRICTIONS_GENERALES_SA=[
 "Les leçons, documents, vidéos, quiz, devoirs et examens restent verrouillés tant que l’autorisation n’est pas accordée.",
 "Une autorisation pour un cours ne déverrouille ni les autres cours ni le niveau suivant.",
 "Aucun formateur ne peut valider son propre compte; seuls les cours confiés peuvent être approuvés.",
 "Aucune information pastorale, médicale ou intime sensible n’est exigée pour demander l’accès.",
 "Les attestations restent conditionnées aux notes et à l’assiduité du cursus officiel."
];
export async function initAcademyAcces(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_acces (compte TEXT NOT NULL,cours TEXT NOT NULL,statut TEXT NOT NULL CHECK(statut IN ('en_attente','approuve','refuse','revoque')),demande_le INTEGER NOT NULL,decision_le INTEGER,decideur TEXT,commentaire TEXT NOT NULL DEFAULT '',PRIMARY KEY(compte,cours))").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_2027_acces_attente ON academy_2027_acces(cours,statut,demande_le)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_2027_acces_journal(id TEXT PRIMARY KEY,compte TEXT NOT NULL,cours TEXT NOT NULL,avant TEXT NOT NULL,apres TEXT NOT NULL,acteur TEXT NOT NULL,date_action INTEGER NOT NULL)").run();
}
export async function etatsAcademy(env,compte){
 const rows=(await env.DB.prepare("SELECT cours,statut,demande_le,decision_le,commentaire FROM academy_2027_acces WHERE compte=?").bind(String(compte)).all()).results||[];
 return Object.fromEntries(rows.filter(r=>COURSES.includes(r.cours)).map(r=>[r.cours,r]));
}
export function historiqueDemarre(overview){
 return !!(overview&&(overview.passed||overview.pending?.length||overview.feedback?.length||overview.attendance>0||overview.participation!==null&&overview.participation!==undefined));
}
export function academyStatut(c,etat,overview,precedentValide){
 const historique=historiqueDemarre(overview);
 const statut=etat?.statut|| (historique?"approuve":"verrouille");
 return {statut,autorise:statut==="approuve"&&!!precedentValide,demandeLe:etat?.demande_le||null,
  decisionLe:etat?.decision_le||null,commentaire:etat?.commentaire||"",
  anterieurementCommence:historique&&!etat,prerequisNiveau:!!precedentValide};
}
export function academyMeta(c,etat,overview,precedentValide){
 return {
  description:c.purpose,
  objectifs:c.goals.slice(),
  passages:c.refs,
  conditions:[...CONDITIONS_GENERALES_SA,PREREQUIS[c.id]].filter(Boolean),
  restrictions:[...RESTRICTIONS_GENERALES_SA,...(REGLES[c.id]?[REGLES[c.id]]:[])],
  acces:academyStatut(c,etat,overview,precedentValide)
 };
}
export async function academyAutorise(env,compte,c,overview){
 if(!c||!compte)return false;
 const r=await env.DB.prepare("SELECT statut FROM academy_2027_acces WHERE compte=? AND cours=?").bind(String(compte),c.id).first();
 return r?r.statut==="approuve":historiqueDemarre(overview);
}
const scopes=(portees)=>COURS.filter(c=>portees.includes(c.id)||portees.includes("N"+c.level)).map(c=>c.id);
async function journal(env,{compte,cours,avant,apres,acteur}){
 await env.DB.prepare("INSERT INTO academy_2027_acces_journal(id,compte,cours,avant,apres,acteur,date_action) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(),compte,cours,avant,apres,acteur,Date.now()).run();
}
async function body(req){const raw=await req.text();if(raw.length>5000)throw Error("Corps trop long");return JSON.parse(raw)}
export async function academyAccesApi(req,env,u,path,{completedLevel,overview}={}){
 const racine="/api/soldiers-academy/acces";
 if(!path.startsWith(racine))return null;
 if(!u?.connecte||!u.id)return error("Connexion requise.",401);
 await initAcademyAcces(env);
 const actor=String(u.id),admin=Number(u.niveau)>=2;
 if(path===racine+"/demander"&&req.method==="POST"){
  let b;try{b=await body(req)}catch{return error("Demande invalide.");}
  const c=courseFor(String(b?.cours||""));
  if(!c)return error("Cours inexistant.",404);
  if(c.level>1&&!completedLevel?.(c.level-1))return error("Validez d'abord les huit cours du niveau précédent.",403);
  const before=await env.DB.prepare("SELECT statut FROM academy_2027_acces WHERE compte=? AND cours=?").bind(actor,c.id).first();
  if((before?.statut==="approuve")||(!before&&historiqueDemarre(overview?.[c.id])))
   return reply({ok:true,statut:"approuve",message:"Cours déjà ouvert dans votre parcours."});
  if(before?.statut==="en_attente")return reply({ok:true,statut:"en_attente",message:"Votre demande attend la décision pédagogique."});
  await env.DB.prepare("INSERT INTO academy_2027_acces(compte,cours,statut,demande_le,decision_le,decideur,commentaire) VALUES(?,?,'en_attente',?,NULL,NULL,'') ON CONFLICT(compte,cours) DO UPDATE SET statut='en_attente',demande_le=excluded.demande_le,decision_le=NULL,decideur=NULL,commentaire=''")
   .bind(actor,c.id,Date.now()).run();
  await journal(env,{compte:actor,cours:c.id,avant:before?.statut||"verrouille",apres:"en_attente",acteur:actor});
  return reply({ok:true,statut:"en_attente",message:"Demande transmise. Le cours reste verrouillé jusqu'à la validation du responsable."},201);
 }
 if(path===racine+"/gestion"&&req.method==="GET"){
  await initRessources(env);
  const portees=await porteesAutorisees(env,u);
  const autorisees=admin?COURSES.slice():scopes(portees);
  if(!autorisees.length)return error("Gestion réservée aux formateurs habilités aux cours officiels.",403);
  const markers=autorisees.map(()=>"?").join(",");
  const rows=(await env.DB.prepare("SELECT a.compte,a.cours,a.statut,a.demande_le,a.decision_le,a.commentaire,c.nom,c.email FROM academy_2027_acces a LEFT JOIN comptes c ON c.id=a.compte WHERE a.cours IN ("+markers+") ORDER BY CASE WHEN a.statut='en_attente' THEN 0 ELSE 1 END,a.demande_le DESC LIMIT 500").bind(...autorisees).all()).results||[];
  return reply({ok:true,autorisees,demandes:rows.map(r=>({compte:r.compte,cours:r.cours,statut:r.statut,demandeLe:r.demande_le,decisionLe:r.decision_le,commentaire:r.commentaire,nom:r.nom||"Apprenant SDE",email:r.email||""})),
   cours:COURS.map(c=>({id:c.id,title:c.title,level:c.level}))});
 }
 if(path===racine+"/decision"&&req.method==="PATCH"){
  let b;try{b=await body(req)}catch{return error("Décision invalide.");}
  const c=courseFor(String(b?.cours||"")),compte=String(b?.compte||""),decision=String(b?.decision||"");
  if(!c||!compte||compte.length>150)return error("Dossier introuvable.",404);
  if(!["approuve","refuse","revoque"].includes(decision))return error("Décision invalide.");
  await initRessources(env);
  if(!admin&&!scopes(await porteesAutorisees(env,u)).includes(c.id))return error("Ce cours n'est pas confié à votre équipe.",403);
  if(!admin&&compte===actor)return error("Vous ne pouvez pas décider de votre propre accès.",403);
  const before=await env.DB.prepare("SELECT statut FROM academy_2027_acces WHERE compte=? AND cours=?").bind(compte,c.id).first();
  if(!before)return error("Aucune demande n'a été transmise.",404);
  if(decision==="revoque"&&before.statut!=="approuve")return error("Seul un accès validé peut être retiré.",409);
  if(decision!=="revoque"&&before.statut!=="en_attente")return error("Demande déjà traitée, actualisez.",409);
  const r=await env.DB.prepare("UPDATE academy_2027_acces SET statut=?,decision_le=?,decideur=?,commentaire=? WHERE compte=? AND cours=? AND statut=?")
   .bind(decision,Date.now(),actor,PROPRE(b?.commentaire),compte,c.id,before.statut).run();
  if(r.meta?.changes!==1)return error("La demande vient de changer.",409);
  await journal(env,{compte,cours:c.id,avant:before.statut,apres:decision,acteur:actor});
  return reply({ok:true,statut:decision,message:decision==="approuve"?"Cours ouvert pour cet apprenant.":decision==="refuse"?"Demande refusée.":"Accès au cours retiré."});
 }
 return error("Route ou méthode non autorisée.",405);
}
/* Protection directe des fichiers locaux rattachés aux cours SA-xx. */
export async function mediaAcademyAutorise(env,u,mediaId){
 let rows;
 try{rows=(await env.DB.prepare("SELECT DISTINCT portee FROM academy_2027_ressources WHERE media=?").bind(mediaId).all()).results||[]}
 catch(e){if(/no such table/i.test(String(e?.message||e)))return {restreint:false,autorise:true};throw e;}
 const ids=rows.map(r=>r.portee).filter(p=>COURSES.includes(p));
 const niveaux=rows.map(r=>r.portee).filter(p=>/^N[123]$/.test(p));
 if(!ids.length&&!niveaux.length)return {restreint:false,autorise:true};
 if(!u?.connecte||!u.id)return {restreint:true,autorise:false};
 if(Number(u.niveau)>=2)return {restreint:true,autorise:true};
 await initRessources(env);
 const portees=await porteesAutorisees(env,u);
 const tous=COURS.filter(c=>ids.includes(c.id)||niveaux.includes("N"+c.level));
 if(tous.every(c=>portees.includes(c.id)||portees.includes("N"+c.level)))return {restreint:true,autorise:true};
 let lignes;
 try{
  lignes=(await env.DB.prepare("SELECT cours,statut FROM academy_2027_acces WHERE compte=?").bind(String(u.id)).all()).results||[];
 }catch(e){if(/no such table/i.test(String(e?.message||e)))return {restreint:true,autorise:false};throw e;}
 const approves=new Set(lignes.filter(r=>r.statut==="approuve").map(r=>r.cours));
 return {restreint:true,autorise:tous.every(c=>portees.includes(c.id)||portees.includes("N"+c.level)||approves.has(c.id))};
}
