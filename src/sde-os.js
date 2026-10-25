/* SDE OS v3.1 — modules sécurisés, adossés à l'authentification SDE existante.
 * Données de santé / autoévaluation : privées à leur auteur, jamais exposées aux responsables.
 * Baromètre : agrégations > 4 participants, sans profil individuel.
 * Quatre yeux : validation croisée AVANT toute confirmation comptable, aucun paiement en ligne.
 */
export const DIMENSIONS=["spirituelle","personnelle","familiale","professionnelle","economique","sociale","missionnaire"];
export const BIEN_ETRE=["sante_spirituelle","sante_physique","sante_emotionnelle","sante_financiere"];
export const FRACTURES=["caractere","service","vie_integrale","redevabilite","prejuges"];
export const POLES=[
 "Réveil, Évangélisation & Missions","Impact Social & Humanitaire",
 "Logistique & Organisation","Communication, Médias & Digital",
 "Formation & Développement Intégral"
];
export const ECOLES=["Fondations","Maturité","Service & Leadership","Mission & Influence"];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const err=(code,message,status=400)=>json({ok:false,code,message},status);
const now=()=>Date.now();
const uid=()=>crypto.randomUUID();
const clean=(value,max=180)=>String(value||"").trim().slice(0,max);
const int=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
const owner=(u)=>!!u?.connecte&&!!u.id;
const admin=(u)=>owner(u)&&u.niveau>=2;
const get=(env,q,...values)=>env.DB.prepare(q).bind(...values).all();
const one=(env,q,...values)=>env.DB.prepare(q).bind(...values).first();
const run=(env,q,...values)=>env.DB.prepare(q).bind(...values).run();
export function mayApprove(financial,uid,step){
 if(step==="authoriser")return financial.etat==="soumis"&&uid!==financial.demandeur;
 if(step==="executer")return financial.etat==="autorise"&&uid!==financial.autoriseur;
 if(step==="controler")return financial.etat==="execute"&&uid!==financial.executeur;
 return false;
}
async function ensure(env){
 const queries=[
  "CREATE TABLE IF NOT EXISTS os_evaluations (id TEXT PRIMARY KEY, compte TEXT NOT NULL, cree INTEGER NOT NULL, donnees TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS os_eval_compte ON os_evaluations(compte,cree DESC)",
  "CREATE TABLE IF NOT EXISTS os_barometre (compte TEXT NOT NULL, periode TEXT NOT NULL, cree INTEGER NOT NULL, donnees TEXT NOT NULL, PRIMARY KEY(compte,periode))",
  "CREATE TABLE IF NOT EXISTS os_parcours (compte TEXT NOT NULL, ecole INTEGER NOT NULL, statut TEXT NOT NULL, maj INTEGER NOT NULL, PRIMARY KEY(compte,ecole))",
  "CREATE TABLE IF NOT EXISTS os_actions (id TEXT PRIMARY KEY, pole INTEGER NOT NULL, titre TEXT NOT NULL, echeance TEXT, statut TEXT NOT NULL, auteur TEXT NOT NULL, maj INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS os_validations (id TEXT PRIMARY KEY, objet TEXT NOT NULL, montant INTEGER NOT NULL, pole INTEGER NOT NULL, etat TEXT NOT NULL, demandeur TEXT NOT NULL, autoriseur TEXT, executeur TEXT, controleur TEXT, reference TEXT, cree INTEGER NOT NULL, maj INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS os_audit (id TEXT PRIMARY KEY, cible TEXT NOT NULL, operation TEXT NOT NULL, acteur TEXT NOT NULL, cree INTEGER NOT NULL)"
 ];
 for(const query of queries)await env.DB.prepare(query).run();
}
const parse=(t)=>{try{return JSON.parse(t);}catch{return null;}};
async function load(env,u){
 const scores=(await get(env,"SELECT id,cree,donnees FROM os_evaluations WHERE compte=? ORDER BY cree DESC LIMIT 24",u.id)).results||[];
 const parcours=(await get(env,"SELECT ecole,statut,maj FROM os_parcours WHERE compte=? ORDER BY ecole",u.id)).results||[];
 const response={ok:true,version:"3.1",profil:{nom:u.nom||"Membre SDE",role:u.role,niveau:u.niveau},
   dimensions:DIMENSIONS,bienEtre:BIEN_ETRE,fractures:FRACTURES,poles:POLES,ecoles:ECOLES,
   evaluations:scores.map(e=>({id:e.id,date:e.cree,...parse(e.donnees)})),
   parcours,barometre:[],actions:[],validations:[],peutGerer:admin(u)};
 // Jamais une donnée individuelle d'un autre compte.
 const bar=(await get(env,"SELECT periode, COUNT(*) AS n FROM os_barometre GROUP BY periode ORDER BY periode ASC LIMIT 24")).results||[];
 for(const group of bar){
  if(Number(group.n)<5)continue;
  const items=(await get(env,"SELECT donnees FROM os_barometre WHERE periode=?",group.periode)).results||[];
  const entries=items.map(x=>parse(x.donnees)).filter(Boolean);
  const values={};
  for(const key of FRACTURES)values[key]=Math.round((entries.reduce((acc,item)=>acc+Number(item[key]||0),0)/entries.length)*10)/10;
  response.barometre.push({periode:group.periode,n:entries.length,...values});
 }
 if(admin(u)){
  response.actions=(await get(env,"SELECT id,pole,titre,echeance,statut,maj FROM os_actions ORDER BY maj DESC LIMIT 150")).results||[];
  response.validations=(await get(env,"SELECT id,objet,montant,pole,etat,demandeur,autoriseur,executeur,controleur,reference,cree,maj FROM os_validations ORDER BY maj DESC LIMIT 100")).results||[];
 }
 return json(response);
}
async function evaluation(req,env,u){
 if(req.method==="GET"){
  return json({ok:true,evaluations:(await get(env,"SELECT id,cree,donnees FROM os_evaluations WHERE compte=? ORDER BY cree DESC LIMIT 24",u.id)).results.map(x=>({id:x.id,date:x.cree,...parse(x.donnees)}))});
 }
 if(req.method==="DELETE"){
  const id=new URL(req.url).searchParams.get("id");
  if(!id)return err("id","Identifiant requis.");
  await run(env,"DELETE FROM os_evaluations WHERE id=? AND compte=?",id,u.id);
  return json({ok:true});
 }
 if(req.method!=="POST")return err("methode","Méthode refusée",405);
 const b=await req.json();
 if(b.consentement!==true)return err("consentement","Le consentement est requis.");
 const vals={};
 for(const key of DIMENSIONS){
  if(!int(b[key],1,5))return err("dimension","Une note de 1 à 5 est requise pour les sept dimensions.");
  vals[key]=b[key];
 }
 for(const key of BIEN_ETRE){
  if(b[key]!==undefined && b[key]!==null && b[key]!==""){
   if(!int(b[key],1,5))return err("bien_etre","Les ressentis facultatifs vont de 1 à 5.");
   vals[key]=b[key];
  }
 }
 await run(env,"INSERT INTO os_evaluations (id,compte,cree,donnees) VALUES (?,?,?,?)",uid(),u.id,now(),JSON.stringify(vals));
 return json({ok:true,message:"Votre auto-évaluation privée est enregistrée."});
}
async function barometre(req,env,u){
 if(req.method!=="POST")return err("methode","Méthode refusée",405);
 const b=await req.json();
 if(b.consentement!==true)return err("consentement","Votre accord est nécessaire pour contribuer.");
 const vals={};
 for(const key of FRACTURES){
  if(!int(b[key],1,5))return err("note","Les cinq indicateurs doivent être notés de 1 à 5.");
  vals[key]=b[key];
 }
 // Une contribution actualisable par membre et par mois ; résultat agrégé seulement >=5 membres.
 const periode=new Date().toISOString().slice(0,7);
 await run(env,"INSERT INTO os_barometre(compte,periode,cree,donnees) VALUES (?,?,?,?) ON CONFLICT(compte,periode) DO UPDATE SET donnees=excluded.donnees,cree=excluded.cree",u.id,periode,now(),JSON.stringify(vals));
 return json({ok:true,message:"Contribution prise en compte. Affichage collectif à partir de cinq participants."});
}
async function parcours(req,env,u){
 if(req.method!=="POST")return err("methode","Méthode refusée",405);
 const b=await req.json();
 if(!int(b.ecole,1,4)||!["a_decouvrir","en_cours","parcourue"].includes(b.statut))return err("parcours","École ou progression invalide.");
 await run(env,"INSERT INTO os_parcours(compte,ecole,statut,maj) VALUES (?,?,?,?) ON CONFLICT(compte,ecole) DO UPDATE SET statut=excluded.statut,maj=excluded.maj",u.id,b.ecole,b.statut,now());
 return json({ok:true,message:"Progression personnelle enregistrée. Ceci ne constitue pas une certification."});
}
async function actions(req,env,u,url){
 if(!admin(u))return err("acces","Réservé au personnel habilité.",403);
 const b=await req.json();
 if(req.method==="POST"){
  if(!int(b.pole,1,5)||!clean(b.titre,180))return err("action","Pôle et titre requis.");
  const id=uid();
  await run(env,"INSERT INTO os_actions (id,pole,titre,echeance,statut,auteur,maj) VALUES (?,?,?,?,?,?,?)",id,b.pole,clean(b.titre),clean(b.echeance,10),"a_faire",u.id,now());
  await run(env,"INSERT INTO os_audit(id,cible,operation,acteur,cree) VALUES (?,?,?,?,?)",uid(),id,"creation_action",u.id,now());
  return json({ok:true,id});
 }
 if(req.method==="PATCH"){
  if(!["a_faire","en_cours","termine"].includes(b.statut))return err("statut","Statut invalide.");
  await run(env,"UPDATE os_actions SET statut=?,maj=? WHERE id=?",b.statut,now(),clean(b.id,40));
  return json({ok:true});
 }
 return err("methode","Méthode refusée",405);
}
async function finances(req,env,u){
 if(!admin(u))return err("acces","Réservé aux gestionnaires habilités.",403);
 const b=await req.json();
 if(req.method==="POST"){
  const montant=Number(b.montant);
  if(!clean(b.objet)||!Number.isSafeInteger(montant)||montant<=0||montant>1000000000||!int(b.pole,1,5))return err("validation","Objet, montant en FCFA et pôle requis.");
  const id=uid();
  await run(env,"INSERT INTO os_validations (id,objet,montant,pole,etat,demandeur,cree,maj) VALUES (?,?,?,?,?,?,?,?)",id,clean(b.objet),montant,b.pole,"soumis",u.id,now(),now());
  await run(env,"INSERT INTO os_audit(id,cible,operation,acteur,cree) VALUES (?,?,?,?,?)",uid(),id,"demande",u.id,now());
  return json({ok:true,id});
 }
 if(req.method!=="PATCH")return err("methode","Méthode refusée",405);
 const id=clean(b.id,40),step=clean(b.etape,20);
 const record=await one(env,"SELECT * FROM os_validations WHERE id=?",id);
 if(!record)return err("introuvable","Demande inconnue.",404);
 if(!mayApprove(record,u.id,step))return err("quatre_yeux","Étape ou séparation des responsabilités non conforme.",403);
 if(step==="executer" && !clean(b.reference,120))return err("reference","Référence documentaire obligatoire.");
 const next={authoriser:["autorise","autoriseur"],executer:["execute","executeur"],controler:["verifie","controleur"]}[step];
 // Mise à jour atomique : deux acteurs ne peuvent pas avancer deux fois la même étape.
 const res=await run(env,"UPDATE os_validations SET etat=?, "+next[1]+"=?, reference=CASE WHEN ?='executer' THEN ? ELSE reference END,maj=? WHERE id=? AND etat=?",next[0],u.id,step,step==="executer"?clean(b.reference,120):"",now(),id,record.etat);
 if(!res?.meta?.changes)return err("conflit","Demande modifiée. Actualisez la page.",409);
 await run(env,"INSERT INTO os_audit(id,cible,operation,acteur,cree) VALUES (?,?,?,?,?)",uid(),id,step,u.id,now());
 return json({ok:true,etat:next[0]});
}
export async function sdeOsApi(req,env,u,url){
 if(!owner(u))return err("connexion","Connectez-vous à l'espace membre SDE.",401);
 const path=url.pathname;
 if(!path.startsWith("/api/os/"))return err("introuvable","Route inconnue.",404);
 if(req.method!=="GET"){
  const o=req.headers.get("origin");
  if(o&&o!==url.origin)return err("origine","Origine refusée.",403);
 }
 try{
  await ensure(env);
  if(path==="/api/os/bootstrap"&&req.method==="GET")return load(env,u);
  if(path==="/api/os/evaluation")return evaluation(req,env,u);
  if(path==="/api/os/barometre")return barometre(req,env,u);
  if(path==="/api/os/parcours")return parcours(req,env,u);
  if(path==="/api/os/actions")return actions(req,env,u,url);
  if(path==="/api/os/finances")return finances(req,env,u);
  return err("introuvable","Route inconnue.",404);
 }catch(e){
  console.error("SDE OS: erreur technique",e?.name||"Erreur");
  return err("indisponible","SDE OS est momentanément indisponible.",503);
 }
}
