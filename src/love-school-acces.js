/**
 * Love School — accès individuels par module, validés par l'équipe pédagogique.
 * Les règles d'admission sont des métadonnées publiques dans l'espace connecté.
 * Les contenus, exercices, quiz et médias ne sont jamais divulgués avant accord.
 */
import {LOVE_SCHOOL,LOVE_SCHOOL_IDS} from "./love-school.js";
import {initRessources,porteesAutorisees} from "./academy-ressources.js";

const reply=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>reply({ok:false,message},status);
const coursPour=id=>LOVE_SCHOOL.courses.find(c=>c.id===id);
const adminDe=u=>Number(u?.niveau)>=2;
const noteCourte=s=>String(s??"").trim().replace(/[\u0000-\u001f\u007f]/g," ").slice(0,400);
const REGLES={
 "LS-01":{conditions:["S'engager à respecter la dignité et la liberté de chaque personne."],restrictions:["Aucun devoir ne doit exiger une révélation personnelle ou une relation amoureuse."]},
 "LS-02":{conditions:["Accepter un apprentissage sans jugement du statut matrimonial."],restrictions:["Le célibat ne doit être décrit ni comme une faute ni comme une maladie."]},
 "LS-03":{conditions:["Aborder le discernement sans décider à la place d'autrui."],restrictions:["Aucune relation ne peut être imposée par pression religieuse, sociale ou familiale."]},
 "LS-04":{conditions:["Pratiquer l'écoute et accepter des désaccords respectueux."],restrictions:["Le pardon ne doit pas servir à justifier des violences ou à contraindre une réconciliation."]},
 "LS-05":{conditions:["Respecter les limites émotionnelles, physiques, spirituelles et numériques."],restrictions:["Aucune confidence, photo intime ou information sensible n'est demandée."]},
 "LS-06":{conditions:["Étudier le mariage comme un engagement libre, réfléchi et réciproque."],restrictions:["Le mariage n'est pas une condition obligatoire pour participer aux cours non adultes."]},
 "LS-07":{conditions:["Explorer les manières d'exprimer l'affection sans étiqueter les personnes."],restrictions:["Les « langages de l'amour » ne constituent ni un diagnostic ni un droit à une contrepartie."]},
 "LS-08":{conditions:["S'exercer à écouter et à communiquer sans intimidation."],restrictions:["Les exercices ne doivent pas mettre les apprenants en situation de raconter leurs conflits intimes."]},
 "LS-09":{conditions:["Déclarer avoir au moins 18 ans avant la demande et avant la lecture du cours.","Recevoir une validation spécifique du professeur, du coach habilité ou de l'administration."],restrictions:["Réservé aux adultes ; contenus strictement pédagogiques et non graphiques.","Aucune photographie, expérience sexuelle personnelle ou donnée médicale n'est recueillie.","Une déclaration de majorité ne constitue pas une vérification officielle de l'âge."]},
 "LS-10":{conditions:["Déclarer avoir au moins 18 ans avant la demande et avant la lecture du cours.","Recevoir une validation spécifique du professeur, du coach habilité ou de l'administration."],restrictions:["Réservé aux adultes ; conseils de santé généraux, sans diagnostic individuel.","Les échanges et exercices n'exigent aucune information intime ou médicale.","Une déclaration de majorité ne constitue pas une vérification officielle de l'âge."]}
};
const CONDITIONS_COMMUNES=[
 "Disposer d'un compte membre SDE connecté.",
 "Prendre connaissance des objectifs, conditions d'accès et restrictions du module.",
 "Demander l'ouverture du cours et attendre une validation nominative par un coach, professeur habilité ou administrateur.",
 "Respecter le caractère facultatif du parcours, la confidentialité et la liberté de conscience."
];
const RESTRICTIONS_COMMUNES=[
 "Accès individuel : l'autorisation d'un cours ne déverrouille pas automatiquement les autres.",
 "Les vidéos, documents, leçons et quiz demeurent verrouillés tant que la demande n'est pas approuvée.",
 "Aucun résultat, quiz ou devoir de Love School ne modifie les 24 cours, les 192 heures ou les attestations de Soldiers Academy."
];
export function loveMeta(c,ligne=null){
 const statut=["en_attente","approuve","refuse","revoque"].includes(ligne?.statut)?ligne.statut:"verrouille";
 return {
  id:c.id,title:c.title,theme:c.theme,track:c.track||"",adultOnly:!!c.adultOnly,
  objectifs:c.objectives.slice(),passages:c.scriptures.slice(),
  conditions:[...CONDITIONS_COMMUNES,...(REGLES[c.id]?.conditions||[])],
  restrictions:[...RESTRICTIONS_COMMUNES,...(REGLES[c.id]?.restrictions||[])],
  acces:{statut,autorise:statut==="approuve",demandeLe:ligne?.demande_le||null,decisionLe:ligne?.decision_le||null,
   commentaire:ligne?.commentaire||""}
 };
}
export async function initLoveAcces(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_love_acces (compte TEXT NOT NULL,cours TEXT NOT NULL,statut TEXT NOT NULL CHECK(statut IN ('en_attente','approuve','refuse','revoque')),demande_le INTEGER NOT NULL,decision_le INTEGER,decideur TEXT,commentaire TEXT NOT NULL DEFAULT '',PRIMARY KEY(compte,cours))").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_academy_love_acces_attente ON academy_love_acces(cours,statut,demande_le)").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_love_acces_journal (id TEXT PRIMARY KEY,compte TEXT NOT NULL,cours TEXT NOT NULL,avant TEXT NOT NULL,apres TEXT NOT NULL,acteur TEXT NOT NULL,date_action INTEGER NOT NULL)").run();
}
export async function loveEtats(env,compte){
 const rows=(await env.DB.prepare("SELECT cours,statut,demande_le,decision_le,commentaire FROM academy_love_acces WHERE compte=?").bind(String(compte)).all()).results||[];
 return Object.fromEntries(rows.filter(r=>LOVE_SCHOOL_IDS.includes(r.cours)).map(r=>[r.cours,r]));
}
export async function loveAutorise(env,compte,cours){
 if(!LOVE_SCHOOL_IDS.includes(cours)||!compte)return false;
 const r=await env.DB.prepare("SELECT statut FROM academy_love_acces WHERE compte=? AND cours=?").bind(String(compte),cours).first();
 return r?.statut==="approuve";
}
async function jsonBody(req){
 const raw=await req.text();if(raw.length>5000)throw Error("Données trop longues");
 return JSON.parse(raw);
}
async function journal(env,{compte,cours,avant,apres,acteur}){
 await env.DB.prepare("INSERT INTO academy_love_acces_journal(id,compte,cours,avant,apres,acteur,date_action) VALUES(?,?,?,?,?,?,?)")
 .bind(crypto.randomUUID(),compte,cours,avant,apres,acteur,Date.now()).run();
}
export async function loveAccesApi(req,env,u,path){
 const base="/api/soldiers-academy/love-school/acces";
 if(!path.startsWith(base))return null;
 if(!u?.connecte||!u.id)return error("Connexion requise.",401);
 await initLoveAcces(env);
 if(path===base+"/demander"&&req.method==="POST"){
  let b;try{b=await jsonBody(req)}catch{return error("Demande invalide.");}
  const id=String(b?.cours||"");const c=coursPour(id);
  if(!c)return error("Module Love School introuvable.",404);
  if(c.adultOnly&&b?.confirmationMajeur!==true)return error("Ce module 18+ requiert une déclaration de majorité avant la demande.",403);
  const compte=String(u.id),avant=await env.DB.prepare("SELECT statut FROM academy_love_acces WHERE compte=? AND cours=?").bind(compte,id).first();
  if(avant?.statut==="approuve")return reply({ok:true,statut:"approuve",message:"Ce cours est déjà validé pour votre compte."});
  if(avant?.statut==="en_attente")return reply({ok:true,statut:"en_attente",message:"Votre demande attend la décision d'un coach ou professeur."});
  const date=Date.now();
  await env.DB.prepare("INSERT INTO academy_love_acces(compte,cours,statut,demande_le,decision_le,decideur,commentaire) VALUES(?,?,'en_attente',?,NULL,NULL,'') ON CONFLICT(compte,cours) DO UPDATE SET statut='en_attente',demande_le=excluded.demande_le,decision_le=NULL,decideur=NULL,commentaire=''")
   .bind(compte,id,date).run();
  await journal(env,{compte,cours:id,avant:avant?.statut||"verrouille",apres:"en_attente",acteur:compte});
  return reply({ok:true,statut:"en_attente",message:"Demande envoyée à l'équipe pédagogique. Le contenu restera verrouillé jusqu'à sa validation."},201);
 }
 const admin=adminDe(u);
 if(path===base+"/gestion"&&req.method==="GET"){
  await initRessources(env);
  const portees=await porteesAutorisees(env,u);
  const autorisees=admin?LOVE_SCHOOL_IDS.slice():portees.filter(p=>LOVE_SCHOOL_IDS.includes(p));
  if(!autorisees.length)return error("Seuls les coaches, professeurs habilités ou administrateurs peuvent valider.",403);
  const marqueurs=autorisees.map(()=>"?").join(",");
  const rows=(await env.DB.prepare("SELECT a.compte,a.cours,a.statut,a.demande_le,a.decision_le,a.decideur,a.commentaire,c.nom,c.email FROM academy_love_acces a LEFT JOIN comptes c ON c.id=a.compte WHERE a.cours IN ("+marqueurs+") ORDER BY CASE WHEN a.statut='en_attente' THEN 0 ELSE 1 END,a.demande_le DESC LIMIT 500").bind(...autorisees).all()).results||[];
  return reply({ok:true,autorisees,demandes:rows.map(r=>({compte:r.compte,cours:r.cours,statut:r.statut,demandeLe:r.demande_le,decisionLe:r.decision_le,commentaire:r.commentaire,nom:r.nom||"Membre SDE",email:r.email||""})),cours:LOVE_SCHOOL.courses.map(c=>({id:c.id,title:c.title}))});
 }
 if(path===base+"/decision"&&req.method==="PATCH"){
  let b;try{b=await jsonBody(req)}catch{return error("Décision invalide.");}
  const cours=String(b?.cours||""),compte=String(b?.compte||""),decision=String(b?.decision||"");
  if(!coursPour(cours)||!compte||compte.length>150)return error("Demande introuvable.",404);
  if(!["approuve","refuse","revoque"].includes(decision))return error("Décision inconnue.");
  await initRessources(env);
  const autorisees=await porteesAutorisees(env,u);
  if(!admin&&!autorisees.includes(cours))return error("Vous n'êtes pas habilité à valider ce cours.",403);
  if(!admin&&compte===String(u.id))return error("Un formateur ne peut pas valider son propre accès.",403);
  const avant=await env.DB.prepare("SELECT statut FROM academy_love_acces WHERE compte=? AND cours=?").bind(compte,cours).first();
  if(!avant)return error("L'apprenant n'a pas demandé ce cours.",404);
  if(decision==="revoque"&&avant.statut!=="approuve")return error("Seule une autorisation accordée peut être révoquée.",409);
  if(decision!=="revoque"&&avant.statut!=="en_attente")return error("Seule une demande en attente peut être acceptée ou refusée.",409);
  const commentaire=noteCourte(b?.commentaire);
  const resultat=await env.DB.prepare("UPDATE academy_love_acces SET statut=?,decision_le=?,decideur=?,commentaire=? WHERE compte=? AND cours=? AND statut=?")
   .bind(decision,Date.now(),String(u.id),commentaire,compte,cours,avant.statut).run();
  if(resultat.meta?.changes!==1)return error("La demande a changé, actualisez la liste.",409);
  await journal(env,{compte,cours,avant:avant.statut,apres:decision,acteur:String(u.id)});
  return reply({ok:true,statut:decision,message:decision==="approuve"?"Cours débloqué pour cet apprenant.":decision==="refuse"?"Demande refusée.":"Autorisation retirée : cours verrouillé de nouveau."});
 }
 return error("Route Love School inconnue ou méthode interdite.",405);
}
/* Empêcher l'accès direct aux fichiers /m/... rattachés à un module non validé.
   Les liens hébergés sur des plateformes tierces peuvent circuler hors de ce portail. */
export async function mediaLoveAutorise(env,u,mediaId){
 let rows;
 try{
  rows=(await env.DB.prepare("SELECT DISTINCT portee FROM academy_2027_ressources WHERE media=?").bind(mediaId).all()).results||[];
 }catch(e){
  if(/no such table/i.test(String(e?.message||e)))return {restreint:false,autorise:true};
  throw e;
 }
 const cours=[...new Set(rows.map(r=>r.portee).filter(p=>LOVE_SCHOOL_IDS.includes(p)))];
 if(!cours.length)return {restreint:false,autorise:true};
 if(!u?.connecte||!u.id)return {restreint:true,autorise:false};
 if(adminDe(u))return {restreint:true,autorise:true};
 const portees=await porteesAutorisees(env,u);
 if(cours.some(c=>portees.includes(c)))return {restreint:true,autorise:true};
 const markers=cours.map(()=>"?").join(",");
 let appro;
 try{
  appro=(await env.DB.prepare("SELECT cours FROM academy_love_acces WHERE compte=? AND statut='approuve' AND cours IN ("+markers+") LIMIT 1").bind(String(u.id),...cours).first());
 }catch(e){if(/no such table/i.test(String(e?.message||e)))return {restreint:true,autorise:false};throw e;}
 return {restreint:true,autorise:!!appro};
}
