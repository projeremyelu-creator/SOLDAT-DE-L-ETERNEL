/* Soldiers Academy — parcours évalué côté serveur, isolé de la préinscription.
   Aucune donnée de progression ni corrigé n'est exposé sans session.
   Les validations pratiques sont réservées à un responsable habilité. */
import {MODULES_ACADEMY,NIVEAUX_ACADEMY} from "./sde-academy-catalogue.js";

const EXAMENS=[
[
["Quelle association décrit les fondations de la formation ?",["Identité en Christ, prière et étude biblique","Dons, budget et organigramme","Communication, protocole et gestion de flotte"],0,"Le premier niveau regroupe les modules 1 à 3."],
["Quelle attitude accompagne la foi selon Éphésiens 2.8-10 ?",["Des œuvres comme conséquence de la grâce","Des œuvres comme prix du salut","Un titre comme condition du salut"],0,"Le texte présente le salut comme un don et les bonnes œuvres comme son fruit."],
["Une prière collective responsable :",["Respecte la confidentialité et le libre consentement","Oblige chacun à parler","Publie les sujets personnels"],0,"La prière respecte les personnes et leurs confidences."],
["Avant d'appliquer un verset, il faut :",["Observer son contexte","Ignorer son genre","Répéter uniquement une phrase"],0,"Le contexte protège l'interprétation."],
["Une action cohérente avec l'identité en Christ consiste à :",["Reconnaître ses torts et progresser","Imposer une supériorité spirituelle","Refuser de vérifier un enseignement"],0,"Humilité, discernement et responsabilité manifestent la vie de disciple."]
],
[
["Quel ensemble correspond à la maturité chrétienne ?",["Caractère, dons et intercession responsables","Prestige, rivalité et silence","Dons sans redevabilité"],0,"Le niveau 2 articule sainteté, vie de l'Esprit et intercession."],
["Les dons spirituels doivent principalement servir :",["L'édification commune","L'ascension individuelle","Le contrôle de décisions privées"],0,"1 Corinthiens 12-14 associe les dons à l'édification."],
["Quelle pratique protège une intention de prière nominative ?",["La diffusion après consentement","La publication automatique","Le partage à tous les groupes"],0,"Le consentement permet une gestion responsable des informations."],
["Dans un conflit sérieux avec violence, la priorité est :",["Protéger les personnes","Préserver la réputation du responsable","Imposer le pardon immédiatement"],0,"La sécurité des personnes passe avant les exigences relationnelles."],
["Un fruit de l'Esprit se reconnaît notamment dans :",["La patience et la maîtrise de soi","La domination et le mépris","La peur entretenue"],0,"Galates 5.22-23 inclut la patience et la maîtrise de soi."]
],
[
["1 Thessaloniciens 5 recommande de traiter une parole prophétique en :",["L'examinant","L'imposant","La monnayant"],0,"Le passage préconise l'examen et la retenue de ce qui est bon."],
["L'évangélisation respecte la liberté de conscience lorsque :",["Le refus est accepté","Les coordonnées sont prises sans accord","Une menace suit le refus"],0,"Un témoignage responsable ne contraint pas son interlocuteur."],
["Pour un leader chrétien, Marc 10 met en avant :",["Le service","L'impunité","La domination"],0,"Jésus oppose la domination au service."],
["Une délégation de tâche efficace comprend :",["Résultat, responsable et délai","Consigne vague et secret","Responsable sans moyens"],0,"La clarté permet l'exécution et l'évaluation."],
["Une prédiction portant sur la santé doit :",["Être examinée sans remplacer des soins","Interdire la consultation médicale","Être considérée infaillible"],0,"La responsabilité implique prudence et protection."]
],
[
["Le principe des 4 Yeux exige :",["Un second contrôle habilité pour une décision sensible","Deux signatures décoratives","Un accès public aux dossiers"],0,"La séparation des rôles réduit les erreurs et abus."],
["Un bénéfice est :",["Le résultat restant après les charges pertinentes","Le total de toutes les ventes","Le montant des dons collectés"],0,"La rentabilité dépend des revenus et des dépenses."],
["Une mission humanitaire responsable commence par :",["L'écoute des besoins des personnes","La publication des photos","Une distribution sans préparation"],0,"Le diagnostic participatif aide à prioriser les besoins réels."],
["La transparence d'un projet doit :",["Partager un bilan sans divulguer de données sensibles","Publier les dossiers individuels","Inventer des bénéficiaires"],0,"La reddition des comptes respecte la confidentialité."],
["Pour une dépense de projet, il faut :",["Prévoir pièces justificatives et rôles définis","Mélanger fonds personnels et dons","Supprimer le contrôle"],0,"Des justificatifs et la séparation des tâches assurent la traçabilité."]
]
].map((questions,i)=>({niveau:i+1,questions:questions.map(([question,choix,reponse,explication])=>({question,choix,reponse,explication}))}));

const reply=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>reply({ok:false,message},status);
const idModule=(x)=>typeof x==="string"&&/^m(0[1-9]|1[0-2])$/.test(x);
const moduleOf=(id)=>MODULES_ACADEMY.find(m=>m.id===id);
const toCode=(x)=>String(x??"").trim().slice(0,120);
async function setup(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS academy_parcours (compte TEXT PRIMARY KEY, data TEXT NOT NULL, maj INTEGER NOT NULL)").run();
}
async function load(env,compte){
  const row=await env.DB.prepare("SELECT data FROM academy_parcours WHERE compte=?").bind(compte).first();
  if(!row)return {modules:{},niveaux:{}};
  try{const data=JSON.parse(row.data);return {modules:data.modules&&typeof data.modules==="object"?data.modules:{},niveaux:data.niveaux&&typeof data.niveaux==="object"?data.niveaux:{}};}
  catch{return {modules:{},niveaux:{}};}
}
async function save(env,compte,data){
  await env.DB.prepare("INSERT INTO academy_parcours(compte,data,maj) VALUES(?,?,?) ON CONFLICT(compte) DO UPDATE SET data=excluded.data,maj=excluded.maj").bind(compte,JSON.stringify(data),Date.now()).run();
}
function passed(mod){return Number(mod?.score)>=80&&mod?.exercice?.statut==="valide";}
function niveauValide(data,num){return !!(data.niveaux?.[num]?.attestation&&Number(data.niveaux[num].score)>=80);}
function unlocked(data,n){return n===1||niveauValide(data,n-1);}
function allowedExam(data,n){return unlocked(data,n)&&NIVEAUX_ACADEMY[n-1].modules.every(id=>passed(data.modules?.[id]));}
function variantQuestions(questions,salt=0){
  return questions.map((q,i)=>{
    const rotation=(i*2+Math.floor(i/3)+salt)%q.choix.length;
    return {...q,choix:q.choix.map((_,j)=>q.choix[(j+rotation)%q.choix.length]),reponse:(q.reponse-rotation+q.choix.length)%q.choix.length};
  });
}
function quizPublic(q){return {question:q.question,choix:q.choix};}
function modulePublic(m,data){
  const ouvert=unlocked(data,m.niveau);
  const state=data.modules[m.id]||{};
  const {exercice,score,essais,quizLe}=state;
  const base={id:m.id,numero:m.numero,titre:m.titre,niveau:m.niveau,dureeMinutes:m.dureeMinutes,verrouille:!ouvert,progression:{score:Number.isFinite(score)?score:null,quizReussi:Number(score)>=80,exercice:exercice?{statut:exercice.statut,commentaire:exercice.commentaire||"",soumisLe:exercice.soumisLe||null,texte:exercice.texte||""}:null,essais:essais||0,quizLe:quizLe||null,valide:passed(state)}};
  if(!ouvert)return base;
  return {...base,objectifs:m.objectifs,references:m.references,chapitres:m.chapitres,exercices:m.exercices,medias:m.medias,validation:m.validation,quiz:variantQuestions(m.quiz,m.numero).map(quizPublic)};
}
function niveauxPublic(data){
 return NIVEAUX_ACADEMY.map(l=>({...l,verrouille:!unlocked(data,l.id),examenDisponible:allowedExam(data,l.id),
  examen:allowedExam(data,l.id)?variantQuestions(EXAMENS[l.id-1].questions,l.id).map(quizPublic):null,
  progression:data.niveaux?.[l.id]||null,
  valide:niveauValide(data,l.id)}));
}
function overview(data){const valides=MODULES_ACADEMY.filter(m=>passed(data.modules[m.id])).length;return {valides,total:12,pourcentage:Math.round(valides/12*100),niveauxValides:NIVEAUX_ACADEMY.filter(n=>niveauValide(data,n.id)).length};}
function grade(questions,answers){
 if(!Array.isArray(answers)||answers.length!==questions.length||answers.some((x,i)=>!Number.isInteger(x)||x<0||x>=questions[i].choix.length))return null;
 const detail=questions.map((q,i)=>({question:i+1,juste:q.reponse===answers[i],bonneReponse:q.reponse,explication:q.explication}));
 return {score:Math.round(100*detail.filter(x=>x.juste).length/questions.length),detail};
}
async function parseBody(req){
 const s=await req.text();
 if(s.length>16000)throw Error("Taille dépassée");
 return JSON.parse(s);
}
export async function soldiersAcademyApi(req,env,u,pathname){
 if(!pathname.startsWith("/api/soldiers-academy"))return null;
 if(!u?.connecte||!u.id)return error("Connexion requise pour accéder à votre parcours.",401);
 const admin=u.niveau>=2;
 await setup(env);
 const ownId=String(u.id);
 if(pathname==="/api/soldiers-academy"&&req.method==="GET"){
  const data=await load(env,ownId);
  return reply({ok:true,nom:u.nom||"Membre SDE",niveaux:niveauxPublic(data),modules:MODULES_ACADEMY.map(m=>modulePublic(m,data)),resume:overview(data),gestion:admin});
 }
 if(pathname==="/api/soldiers-academy/corrections"&&req.method==="GET"){
  if(!admin)return error("Accès réservé aux administrateurs habilités.",403);
  const records=(await env.DB.prepare("SELECT a.compte,a.data,c.nom FROM academy_parcours a LEFT JOIN comptes c ON c.id=a.compte ORDER BY a.maj DESC LIMIT 250").all()).results||[];
  const aCorriger=[];
  for(const x of records){
   let d;try{d=JSON.parse(x.data)}catch{continue}
   for(const m of MODULES_ACADEMY){
    const st=d.modules?.[m.id];if(st?.exercice?.statut!=="soumis")continue;
    aCorriger.push({compte:x.compte,nom:x.nom||"Compte SDE",moduleId:m.id,titre:m.titre,texte:st.exercice.texte,soumisLe:st.exercice.soumisLe,quizScore:st.score??null});
   }
  }
  return reply({ok:true,demandes:aCorriger.slice(0,250)});
 }
 if(!["POST","PATCH"].includes(req.method))return error("Méthode non autorisée.",405);
 let body;try{body=await parseBody(req)}catch{return error("Données invalides ou trop volumineuses.");}
 if(pathname==="/api/soldiers-academy/correction"){
  if(!admin)return error("Accès réservé aux administrateurs habilités.",403);
  if(req.method!=="PATCH"||!idModule(body.moduleId)||!["valide","a_revoir"].includes(body.statut)||!body.compte||String(body.compte).length>120)return error("Validation invalide.");
  const commentaire=String(body.commentaire||"").trim().slice(0,600);
  if(body.statut==="a_revoir"&&!commentaire)return error("Indiquez une amélioration demandée.");
  const target=String(body.compte),data=await load(env,target),mod=data.modules[body.moduleId];
  if(mod?.exercice?.statut!=="soumis")return error("Exercice introuvable ou déjà traité.",404);
  mod.exercice={...mod.exercice,statut:body.statut,commentaire,verifiePar:ownId,verifieLe:Date.now()};
  await save(env,target,data);
  return reply({ok:true,statut:body.statut});
 }
 const data=await load(env,ownId);
 if(pathname==="/api/soldiers-academy/quiz"&&req.method==="POST"){
  if(!idModule(body.moduleId))return error("Module inconnu.");
  const mod=moduleOf(body.moduleId);
  if(!unlocked(data,mod.niveau))return error("Ce niveau est verrouillé.",403);
  const result=grade(variantQuestions(mod.quiz,mod.numero),body.reponses);
  if(!result)return error("Répondez à toutes les questions.");
  const state=data.modules[mod.id]||{};
  // Une réussite acquise n'est jamais effacée par une tentative ultérieure.
  data.modules[mod.id]={...state,score:Math.max(Number(state.score)||0,result.score),essais:(Number(state.essais)||0)+1,quizLe:Date.now()};
  await save(env,ownId,data);
  return reply({ok:true,...result,meilleurScore:data.modules[mod.id].score,quizReussi:data.modules[mod.id].score>=80});
 }
 if(pathname==="/api/soldiers-academy/exercice"&&req.method==="POST"){
  if(!idModule(body.moduleId))return error("Module inconnu.");
  const mod=moduleOf(body.moduleId);
  if(!unlocked(data,mod.niveau))return error("Ce niveau est verrouillé.",403);
  const texte=String(body.texte??"").trim();
  if(texte.length<80||texte.length>3000)return error("Votre travail doit comporter de 80 à 3 000 caractères.");
  const state=data.modules[mod.id]||{};
  if(state.exercice?.statut==="valide")return error("Travail déjà validé. Contactez votre formateur pour une correction.");
  data.modules[mod.id]={...state,exercice:{texte,statut:"soumis",soumisLe:Date.now(),commentaire:""}};
  await save(env,ownId,data);
  return reply({ok:true,message:"Travail transmis pour validation par un responsable."});
 }
 if(pathname==="/api/soldiers-academy/examen"&&req.method==="POST"){
  const niveau=Number(body.niveau);
  if(!Number.isInteger(niveau)||niveau<1||niveau>4)return error("Niveau inconnu.");
  if(!allowedExam(data,niveau))return error("Terminez les trois modules et leurs exercices validés avant l'évaluation finale.",403);
  const result=grade(variantQuestions(EXAMENS[niveau-1].questions,niveau),body.reponses);
  if(!result)return error("Répondez à toutes les questions.");
  const previous=data.niveaux[niveau]||{};
  const passedNow=result.score>=80;
  const attestation=previous.attestation||(passedNow?("SDE-ACA-"+new Date().getUTCFullYear()+"-"+crypto.randomUUID().slice(0,8).toUpperCase()):null);
  data.niveaux[niveau]={score:Math.max(previous.score||0,result.score),attestation,delivreeLe:previous.delivreeLe||(passedNow?Date.now():null),essais:(previous.essais||0)+1};
  await save(env,ownId,data);
  return reply({ok:true,...result,attestation,examenReussi:!!attestation});
 }
 return error("Route inconnue.",404);
}
