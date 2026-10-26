/* SDE OS 3.1 — application privée. Source institutionnelle Soldier House, octobre 2026.
 * Auto-évaluation volontaire et non clinique ; valeurs individuelles visibles uniquement par leur auteur.
 * Les règles des quatre yeux concernent le circuit de décisions SDE OS et ne déclenchent aucun paiement.
 */
export const SDE_OS_31={
 version:"3.1",
 devises:["Réveiller","Restaurer","Former","Équiper","Envoyer"],
 integral:["Spirituelle","Personnelle","Familiale","Professionnelle","Économique","Sociale","Missionnaire"],
 bienEtre:["Spirituel","Physique","Émotionnel","Financier"],
 fractures:[
  "Spiritualité et transformation durable du caractère",
  "Connaissance biblique et mise en service",
  "Foi et vie professionnelle, familiale et économique",
  "Autorité spirituelle et redevabilité"
 ],
 prejuges:"Obstacles et préjugés perçus (indicateur exploratoire, non institutionnel)",
 poles:[
  {n:1,nom:"Réveil, Évangélisation & Missions",mandat:"Gagner, réveiller, accompagner et envoyer."},
  {n:2,nom:"Impact Social & Humanitaire",mandat:"Aimer en actes, protéger la dignité et servir les vulnérables."},
  {n:3,nom:"Logistique & Organisation",mandat:"Servir avec ordre, sécurité, préparation et excellence."},
  {n:4,nom:"Communication, Médias & Digital",mandat:"Porter la vision, produire, documenter et connecter."},
  {n:5,nom:"Formation & Développement Intégral",mandat:"Former le Soldat et développer ses capacités spirituelles, humaines, professionnelles et économiques."}
 ],
 ecoles:[
  {n:1,nom:"Fondations",contenu:"Identité en Christ, Bible, prière, vie de foi, caractère et culture SDE."},
  {n:2,nom:"Maturité",contenu:"Relations, communication, discipline, émotions, famille, temps, argent."},
  {n:3,nom:"Service et Leadership",contenu:"Service, éthique, équipe, organisation, protocole, projets, redevabilité."},
  {n:4,nom:"Mission et Influence",contenu:"Évangélisation, mission, implantation, entrepreneuriat et influence responsable."}
 ]
};
const CT="application/json; charset=utf-8";
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":CT,"cache-control":"no-store","x-content-type-options":"nosniff"}});
const err=(message,status=400)=>reply({ok:false,message},status);
const roleAdmin=u=>!!u?.connecte&&Number(u.niveau)>=2;
const safe=(value,max=120)=>String(value??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,max);
const scoreMap=(raw,n)=>{
 if(!Array.isArray(raw)||raw.length!==n||raw.some(v=>!Number.isInteger(v)||v<0||v>4))return null;
 return raw;
};
const TABLES=[
 "CREATE TABLE IF NOT EXISTS osv31_checkins (user_id TEXT NOT NULL,month TEXT NOT NULL,updated_ms INTEGER NOT NULL,dimensions TEXT NOT NULL,bien_etre TEXT NOT NULL,fractures TEXT NOT NULL,prejuges INTEGER NOT NULL,PRIMARY KEY(user_id,month))",
 "CREATE TABLE IF NOT EXISTS osv31_academy (user_id TEXT NOT NULL,ecole INTEGER NOT NULL,statut TEXT NOT NULL,updated_ms INTEGER NOT NULL,PRIMARY KEY(user_id,ecole))",
 "CREATE TABLE IF NOT EXISTS osv31_decisions (id INTEGER PRIMARY KEY AUTOINCREMENT,cree_ms INTEGER NOT NULL,propose_par TEXT NOT NULL,review_par TEXT,review_ms INTEGER,type TEXT NOT NULL,titre TEXT NOT NULL,details TEXT NOT NULL,statut TEXT NOT NULL DEFAULT 'en_attente')"
];
async function init(env){for(const sql of TABLES)await env.DB.prepare(sql).run();}
const jsonField=v=>{try{return JSON.parse(v);}catch{return [];}};
export async function apiSdeOs31(req,env,u){
 if(req.method!=="POST")return err("Méthode non autorisée",405);
 if(!u?.connecte||!u.id)return err("Connexion requise à votre compte SDE",401);
 let b;
 try{b=await req.json();}catch{return err("Requête JSON invalide");}
 if(!b||typeof b!=="object"||Array.isArray(b))return err("Requête invalide");
 const action=safe(b.action,40);
 if(action==="referentiel")return reply({ok:true,referentiel:SDE_OS_31,role:u.role,admin:roleAdmin(u)});
 await init(env);
 if(action==="tableau"){
  const [a,e,d]=await Promise.all([
   env.DB.prepare("SELECT COUNT(*) AS n FROM osv31_checkins WHERE user_id=?").bind(u.id).first(),
   env.DB.prepare("SELECT ecole,statut FROM osv31_academy WHERE user_id=? ORDER BY ecole").bind(u.id).all(),
   roleAdmin(u)?env.DB.prepare("SELECT COUNT(*) AS n FROM osv31_decisions WHERE statut='en_attente'").first():Promise.resolve({n:0})
  ]);
  return reply({ok:true,mesBilans:Number(a?.n||0),mesEcoles:e.results||[],decisionsEnAttente:Number(d?.n||0),referentiel:SDE_OS_31,admin:roleAdmin(u),role:u.role,profil:{nom:u.nom||"",matricule:u.matricule||""}});
 }
 if(action==="mes_bilans"){
  const r=await env.DB.prepare("SELECT month,updated_ms,dimensions,bien_etre,fractures,prejuges FROM osv31_checkins WHERE user_id=? ORDER BY month DESC LIMIT 24").bind(u.id).all();
  return reply({ok:true,bilans:(r.results||[]).map(x=>({mois:x.month,date:x.updated_ms,dimensions:jsonField(x.dimensions),bienEtre:jsonField(x.bien_etre),fractures:jsonField(x.fractures),prejuges:x.prejuges}))});
 }
 if(action==="enregistrer_bilan"){
  if(b.consentement!==true)return err("Consentement volontaire requis pour enregistrer cette auto-évaluation");
  const dimensions=scoreMap(b.dimensions,7),bienEtre=scoreMap(b.bienEtre,4),fractures=scoreMap(b.fractures,4);
  if(!dimensions||!bienEtre||!fractures||!Number.isInteger(b.prejuges)||b.prejuges<0||b.prejuges>4)return err("Les 16 réponses doivent être comprises entre 0 et 4");
  const month=new Date().toISOString().slice(0,7);
  await env.DB.prepare("INSERT INTO osv31_checkins (user_id,month,updated_ms,dimensions,bien_etre,fractures,prejuges) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET updated_ms=excluded.updated_ms,dimensions=excluded.dimensions,bien_etre=excluded.bien_etre,fractures=excluded.fractures,prejuges=excluded.prejuges")
   .bind(u.id,month,Date.now(),JSON.stringify(dimensions),JSON.stringify(bienEtre),JSON.stringify(fractures),b.prejuges).run();
  return reply({ok:true,mois:month,message:"Auto-évaluation personnelle enregistrée. Aucun classement automatique n'est produit."});
 }
 if(action==="supprimer_mes_bilans"){
  await env.DB.prepare("DELETE FROM osv31_checkins WHERE user_id=?").bind(u.id).run();
  return reply({ok:true});
 }
 if(action==="inscription_ecole"){
  const ecole=Number(b.ecole);
  if(!Number.isInteger(ecole)||ecole<1||ecole>4)return err("École non reconnue");
  await env.DB.prepare("INSERT INTO osv31_academy (user_id,ecole,statut,updated_ms) VALUES (?,?,'interet',?) ON CONFLICT(user_id,ecole) DO UPDATE SET statut='interet',updated_ms=excluded.updated_ms")
   .bind(u.id,ecole,Date.now()).run();
  return reply({ok:true,message:"Votre intérêt a été enregistré ; ce n'est pas une certification."});
 }
 if(action==="tendance"){
  if(!roleAdmin(u))return err("Réservé au Directoire autorisé",403);
  const r=await env.DB.prepare("SELECT month,fractures,prejuges FROM osv31_checkins ORDER BY month DESC LIMIT 3000").all();
  const groups=new Map();
  for(const v of r.results||[]){
   const scores=jsonField(v.fractures);
   if(!Array.isArray(scores)||scores.length!==4)continue;
   const prev=groups.get(v.month)||{mois:v.month,n:0,sums:[0,0,0,0,0]};
   prev.n+=1;scores.forEach((score,i)=>prev.sums[i]+=Number(score)||0);
   prev.sums[4]+=Number(v.prejuges)||0;groups.set(v.month,prev);
  }
  const data=[...groups.values()].filter(g=>g.n>=5).sort((a,b)=>a.mois.localeCompare(b.mois)).slice(-12)
   .map(g=>({mois:g.mois,participants:g.n,series:g.sums.map(x=>Math.round(x/g.n*100)/100)}));
  return reply({ok:true,tendance:data,seuil:5,source:"Déclarations volontaires des participants ; pas de mesure clinique ou institutionnelle validée."});
 }
 if(action==="decisions"){
  if(!roleAdmin(u))return err("Accès réservé au Directoire",403);
  const r=await env.DB.prepare("SELECT id,cree_ms,propose_par,review_par,review_ms,type,titre,details,statut FROM osv31_decisions ORDER BY id DESC LIMIT 80").all();
  return reply({ok:true,decisions:(r.results||[]).map(x=>({id:x.id,cree:x.cree_ms,type:x.type,titre:x.titre,details:x.details,statut:x.statut,
   estAuteur:x.propose_par===u.id,revieweur:!!x.review_par}))});
 }
 if(action==="proposer_decision"){
  if(!roleAdmin(u))return err("Accès réservé aux responsables autorisés",403);
  const type=safe(b.type,30),titre=safe(b.titre,160),details=safe(b.details,1000);
  if(!["finances","projet","partenariat","gouvernance"].includes(type)||titre.length<5)return err("Type et intitulé valides requis");
  const r=await env.DB.prepare("INSERT INTO osv31_decisions (cree_ms,propose_par,type,titre,details,statut) VALUES (?,?,?,?,?,'en_attente') RETURNING id")
   .bind(Date.now(),u.id,type,titre,details).first();
  return reply({ok:true,id:r?.id,statut:"en_attente",message:"Proposition enregistrée. Elle nécessite la décision d'un second responsable distinct."});
 }
 if(action==="examiner_decision"){
  if(!roleAdmin(u))return err("Accès réservé au Directoire",403);
  const id=Number(b.id),decision=safe(b.decision,20);
  if(!Number.isInteger(id)||id<=0||!["approuve","rejete"].includes(decision))return err("Demande de décision invalide");
  const result=await env.DB.prepare("UPDATE osv31_decisions SET statut=?,review_par=?,review_ms=? WHERE id=? AND statut='en_attente' AND propose_par<>? RETURNING id")
   .bind(decision,u.id,Date.now(),id,u.id).first();
  if(!result)return err("Décision introuvable, déjà examinée, ou auto-approbation interdite.",409);
  return reply({ok:true,statut:decision,message:"Décision cosignée par un responsable distinct."});
 }
 return err("Opération inconnue",404);
}
