/* Comptes des membres créés à partir de la liste des membres (fiches « membres/… »).
   - Réservé aux administrateurs (niveau 2+), lot de 25 comptes par appel.
   - Chaque compte reçoit un mot de passe temporaire UNIQUE, aléatoire, affiché une seule fois
     à l'administrateur ; seul son empreinte PBKDF2 est conservée.
   - Le mot de passe temporaire expire au bout de 14 jours et doit être changé à la première
     connexion (page /mot-de-passe). Un mot de passe commun à tous les membres n'est jamais utilisé.
   - Aucun e-mail n'est envoyé. Un membre sans adresse e-mail valide est ignoré, sauf si l'administrateur
     choisit explicitement de créer aussi ces comptes (« sansEmail ») : l'identifiant interne
     <matricule>@membre.sde.invalid (domaine réservé .invalid, jamais joignable) sert alors de clé de compte,
     le membre se connecte avec son seul matricule et la récupération passe par l'administration. */
const json=(corps,status=200)=>Response.json(corps,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>json({ok:false,message},status);
export const MDP_TEMP_JOURS=14;
export const LOT=25;
export const DOMAINE_INTERNE='membre.sde.invalid';
export const estInterne=email=>String(email||'').toLowerCase().endsWith('@'+DOMAINE_INTERNE);
const identifiantInterne=matricule=>String(matricule).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^[-.]+|[-.]+$/g,'')+'@'+DOMAINE_INTERNE;
const ALPHABET='23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export async function ensureMdpTemp(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS comptes_mdp_temp (email TEXT PRIMARY KEY,expire INTEGER NOT NULL,cree INTEGER NOT NULL)').run();
}
export function motDePasseTemporaire(){
 let s='';
 while(s.length<12){
  for(const x of crypto.getRandomValues(new Uint8Array(24))){
   if(x<248&&s.length<12)s+=ALPHABET[x%ALPHABET.length];
  }
 }
 return s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8);
}
/* Ligne du mot de passe temporaire d'un compte, ou null. */
export async function mdpTemporaire(env,email){
 try{return await env.DB.prepare('SELECT expire FROM comptes_mdp_temp WHERE email=?').bind(email).first()}
 catch{return null}
}
export async function oublierMdpTemporaire(env,email){
 try{await env.DB.prepare('DELETE FROM comptes_mdp_temp WHERE email=?').bind(email).run()}catch{}
}

export async function comptesMembresApi(req,env,u,s){
 const path=new URL(req.url).pathname;
 if(path!=='/api/comptes/membres')return null;
 if(req.method!=='POST')return fail('Méthode refusée.',405);
 if(!u.connecte||u.niveau<2)return fail('Réservé aux administrateurs.',403);
 const b=await req.json().catch(()=>({}));
 const simuler=b.simuler!==false,sansEmail=b.sansEmail===true;
 await ensureMdpTemp(env);
 const fiches=(await env.DB.prepare("SELECT id,data FROM docs WHERE parent='membres' ORDER BY id ASC").all()).results||[];
 const comptes=(await env.DB.prepare('SELECT email,membreId,matricule FROM comptes').all()).results||[];
 const emails=new Set(comptes.map(c=>String(c.email).toLowerCase())),relies=new Set(comptes.map(c=>c.membreId).filter(Boolean));
 const matricules=new Set(comptes.map(c=>String(c.matricule||'').toUpperCase()).filter(Boolean));
 const proprietaires=new Set((s.proprietaires?s.proprietaires():[]).map(e=>String(e).toLowerCase()));
 const ignores=[],aCreer=[],vus=new Set();
 for(const f of fiches){
  let d;try{d=JSON.parse(f.data)}catch{continue}
  const nom=[d.prenoms,d.nom].filter(Boolean).join(' ').trim()||'(sans nom)';
  const email=s.normEmail(d.email);
  if(d.actif===false){ignores.push({nom,raison:'fiche inactive'});continue}
  if(relies.has(f.id)){ignores.push({nom,raison:'compte déjà relié à cette fiche'});continue}
  const interne=!s.EMAIL_OK.test(email);
  if(interne&&!sansEmail){ignores.push({nom,raison:'adresse e-mail absente ou invalide'});continue}
  if(!interne&&(emails.has(email)||proprietaires.has(email))){ignores.push({nom,raison:'un compte existe déjà avec cette adresse'});continue}
  if(!interne&&vus.has(email)){ignores.push({nom,raison:'adresse e-mail en double dans la liste'});continue}
  if(!interne)vus.add(email);
  aCreer.push({id:f.id,d,nom,email,interne});
 }
 const lot=aCreer.slice(0,LOT);
 const restants=aCreer.length-lot.length;
 if(simuler){
  return json({ok:true,simulation:true,acreer:aCreer.length,sansEmail:aCreer.filter(x=>x.interne).length,restants:aCreer.length,total:fiches.length,
   apercu:aCreer.slice(0,200).map(x=>({nom:x.nom,email:x.interne?'':x.email,matricule:x.d.matricule||''})),ignores});
 }
 const crees=[],echecs=[],t=Date.now(),expire=t+MDP_TEMP_JOURS*864e5;
 for(const x of lot){
  try{
   let matricule=String(x.d.matricule||'').trim();
   if(!matricule||matricules.has(matricule.toUpperCase()))matricule=await s.nouveauMatricule(env);
   matricules.add(matricule.toUpperCase());
   const cle=x.interne?identifiantInterne(matricule):x.email;
   if(x.interne&&emails.has(cle))throw new Error('identifiant interne déjà pris');
   emails.add(cle);
   const mdp=motDePasseTemporaire(),id=await s.idDeEmail(cle);
   await env.DB.batch([
    env.DB.prepare("INSERT INTO comptes (email,id,nom,role,cree,mdp,membreId,matricule) VALUES (?,?,?,'soldat',?,?,?,?)").bind(cle,id,x.nom,t,await s.empreinteMdp(mdp),x.id,matricule),
    env.DB.prepare('INSERT INTO comptes_mdp_temp(email,expire,cree) VALUES(?,?,?)').bind(cle,expire,t)
   ]);
   await s.ecrireDoc(env,'update','membres/'+x.id,{matricule,compteId:id,...(x.interne?{}:{email:x.email}),modifieLe:t,modifiePar:u.id});
   crees.push({nom:x.nom,email:x.interne?'':x.email,matricule,motDePasse:mdp});
  }catch(e){echecs.push({nom:x.nom,raison:'création impossible (doublon ou erreur)'})}
 }
 return json({ok:true,simulation:false,crees,echecs,ignores,restants,expireJours:MDP_TEMP_JOURS});
}
