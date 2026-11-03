/* Soldiers Academy — ressources pédagogiques déposées par les enseignants et coachs.
   - Un enseignant ou coach est désigné par l'administration (table academy_2027_formateurs) : aucun rôle du site n'est modifié.
   - Il peut publier vidéos (YouTube / Vimeo ou fichier téléversé dans la médiathèque), fichiers, liens et notes de cours.
   - Dès la publication, tous les apprenants qui ont accès au cours (ou à la bibliothèque générale) la voient dans leur espace.
   - Aucune ressource ne contient de corrigé : les corrigés restent dans academy-correctifs.js (serveur seulement). */
import {SOLDIERS_ACADEMY_2027 as PROGRAMME} from "./soldiers-academy-2027.js";

const reply=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>reply({ok:false,message},status);
const propre=(v,max)=>String(v??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g," ").replace(/[ \t]+/g," ").trim().slice(0,max);
const IDS_COURS=PROGRAMME.courses.map(c=>c.id);
export const PORTEES=[...IDS_COURS,"N1","N2","N3","GENERAL"];
export const TYPES=["video","fichier","lien","note","exercice"];
const ID_MEDIA=/^[a-z0-9]{20}$/;
const FONCTIONS=["enseignant","coach"];

export async function initRessources(env){
  for(const sql of [
    "CREATE TABLE IF NOT EXISTS academy_2027_formateurs (compte TEXT PRIMARY KEY, fonction TEXT NOT NULL, portees TEXT NOT NULL DEFAULT '[]', par TEXT NOT NULL, cree INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS academy_2027_ressources (id TEXT PRIMARY KEY, portee TEXT NOT NULL, type TEXT NOT NULL, titre TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', media TEXT NOT NULL DEFAULT '', genre TEXT NOT NULL DEFAULT '', texte TEXT NOT NULL DEFAULT '', auteur TEXT NOT NULL, auteur_nom TEXT NOT NULL DEFAULT '', publie INTEGER NOT NULL DEFAULT 1, cree INTEGER NOT NULL, maj INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_academy_2027_ressources_portee ON academy_2027_ressources(portee,publie,cree)"
  ])await env.DB.prepare(sql).run();
}
/* Droit d'ajouter des ressources : administrateur (niveau 2+) ou enseignant/coach désigné. */
export async function fonctionFormateur(env,u){
  if(!u?.connecte||!u.id)return null;
  if(Number(u.niveau)>=2)return "administrateur";
  try{
    const r=await env.DB.prepare("SELECT fonction FROM academy_2027_formateurs WHERE compte=?").bind(String(u.id)).first();
    return r?.fonction||null;
  }catch{return null}
}
export const estFormateur=async(env,u)=>!!(await fonctionFormateur(env,u));
/* Cours confiés à l'intervenant : l'administration voit tout ; un enseignant ou coach ne publie que dans ses portées. */
export async function porteesAutorisees(env,u){
  if(Number(u?.niveau)>=2)return PORTEES.slice();
  try{
    const r=await env.DB.prepare("SELECT portees FROM academy_2027_formateurs WHERE compte=?").bind(String(u.id)).first();
    const l=JSON.parse(r?.portees||"[]");
    return Array.isArray(l)?l.filter(x=>PORTEES.includes(x)):[];
  }catch{return []}
}
function normaliserPortees(brut){
  if(brut==="tous"||brut==="*")return PORTEES.slice();
  const l=Array.isArray(brut)?brut.map(String):[];
  return [...new Set(l.filter(x=>PORTEES.includes(x)))];
}

/* ── Normalisation des liens : seules les vidéos YouTube et Vimeo sont intégrées (lecteurs sans cookies) ── */
export function lienVideo(brut){
  let u;try{u=new URL(String(brut||"").trim())}catch{return null}
  if(u.protocol!=="https:"||u.username||u.password)return null;
  const h=u.hostname.replace(/^www\./,"").replace(/^m\./,"");
  let id=null;
  if(h==="youtu.be")id=u.pathname.slice(1).split("/")[0];
  else if(h==="youtube.com"||h==="youtube-nocookie.com"){
    if(u.pathname==="/watch")id=u.searchParams.get("v");
    else{const m=u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);if(m)id=m[1]}
  }
  if(id&&/^[A-Za-z0-9_-]{11}$/.test(id))return {fournisseur:"youtube",url:"https://www.youtube-nocookie.com/embed/"+id};
  if(h==="vimeo.com"||h==="player.vimeo.com"){
    const m=u.pathname.match(/\/(?:video\/)?(\d{6,12})(?:\/([a-f0-9]{6,12}))?\/?$/);
    const cle=m&&(m[2]||(/^[a-f0-9]{6,12}$/.test(u.searchParams.get("h")||"")?u.searchParams.get("h"):""));
    if(m)return {fournisseur:"vimeo",url:"https://player.vimeo.com/video/"+m[1]+(cle?"?h="+cle:"")};
  }
  return null;
}
export function lienHttps(brut){
  let u;try{u=new URL(String(brut||"").trim())}catch{return null}
  if(u.protocol!=="https:"||u.username||u.password||String(brut).length>500)return null;
  if(/^(localhost|.*\.local|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/i.test(u.hostname))return null;
  return u.toString();
}

async function lireJson(req){const s=await req.text();if(s.length>20000)throw Error("trop long");return JSON.parse(s)}

function vuePublique(r,{gerer=false}={}){
  return {id:r.id,portee:r.portee,type:r.type,titre:r.titre,description:r.description,url:r.url,genre:r.genre,texte:r.texte,auteur:r.auteur_nom,cree:r.cree,...(gerer?{publie:!!r.publie,media:r.media,maj:r.maj,auteurId:r.auteur}:{})};
}
/* Ressources visibles par un apprenant : publiées, dans un niveau ouvert (ou bibliothèque générale). */
export async function ressourcesApprenant(env,{peutNiveau}){
  const rows=(await env.DB.prepare("SELECT * FROM academy_2027_ressources WHERE publie=1 ORDER BY cree DESC LIMIT 1500").all()).results||[];
  const niveauDe=p=>{
    if(p==="GENERAL")return 1;
    if(/^N[123]$/.test(p))return Number(p[1]);
    return PROGRAMME.courses.find(c=>c.id===p)?.level||0;
  };
  const visibles=rows.filter(r=>(r.portee==="GENERAL"||peutNiveau(niveauDe(r.portee))));
  const parCours={},generales=[];
  for(const r of visibles){
    const v=vuePublique(r);
    if(IDS_COURS.includes(r.portee))(parCours[r.portee]=parCours[r.portee]||[]).push(v);
    else generales.push(v);
  }
  const limite=Date.now()-14*864e5;
  const nouveautes=visibles.filter(r=>r.cree>=limite).slice(0,8).map(r=>({id:r.id,portee:r.portee,type:r.type,titre:r.titre,cree:r.cree}));
  return {parCours,generales,nouveautes};
}

/* ── Routes : /api/soldiers-academy/ressources… et /formateurs… ── */
export async function ressourcesApi(req,env,u,path){
  const racine="/api/soldiers-academy/";
  if(!path.startsWith(racine+"ressources")&&!path.startsWith(racine+"formateurs"))return null;
  await initRessources(env);
  const fonction=await fonctionFormateur(env,u),admin=Number(u.niveau)>=2;
  const sous=path.slice(racine.length);
  if(sous==="ressources/gestion"&&req.method==="GET"){
    if(!fonction)return error("Espace réservé aux enseignants et coachs désignés.",403);
    const rows=(await env.DB.prepare("SELECT * FROM academy_2027_ressources"+(admin?"":" WHERE auteur=?")+" ORDER BY cree DESC LIMIT 1500").bind(...(admin?[]:[String(u.id)])).all()).results||[];
    const autorisees=await porteesAutorisees(env,u);
    const out={ok:true,fonction,moi:String(u.id),autorisees,ressources:rows.map(r=>vuePublique(r,{gerer:true})),cours:PROGRAMME.courses.map(c=>({id:c.id,title:c.title,level:c.level})),types:TYPES};
    if(admin){
      out.formateurs=((await env.DB.prepare("SELECT f.compte,f.fonction,f.portees,f.cree,c.nom,c.email FROM academy_2027_formateurs f LEFT JOIN comptes c ON c.id=f.compte ORDER BY f.cree DESC LIMIT 200").all()).results||[]).map(x=>({compte:x.compte,fonction:x.fonction,portees:(()=>{try{return JSON.parse(x.portees||"[]")}catch{return []}})(),nom:x.nom||"Compte SDE",email:x.email||"",cree:x.cree}));
    }
    return reply(out);
  }
  if(req.method!=="POST"&&req.method!=="PATCH")return error("Méthode non autorisée.",405);
  let b;try{b=await lireJson(req)}catch{return error("Données invalides.")}

  /* désignation par l'administration */
  if(sous==="formateurs"&&req.method==="POST"){
    if(!admin)return error("Réservé à l'administration.",403);
    const fn=String(b.fonction||"");if(!FONCTIONS.includes(fn))return error("Fonction inconnue (enseignant ou coach).");
    const ident=propre(b.compte,190).toLowerCase();if(!ident)return error("Indiquez l'adresse e-mail du compte à désigner.");
    const c=await env.DB.prepare("SELECT id,nom,email FROM comptes WHERE lower(email)=? OR id=?").bind(ident,propre(b.compte,190)).first();
    if(!c)return error("Aucun compte ne correspond. La personne doit d'abord créer son compte (page Academy ou connexion).",404);
    const portees=normaliserPortees(b.portees);
    if(!portees.length)return error("Choisissez au moins un cours (ou « tous les cours ») à confier.");
    await env.DB.prepare("INSERT INTO academy_2027_formateurs(compte,fonction,portees,par,cree) VALUES(?,?,?,?,?) ON CONFLICT(compte) DO UPDATE SET fonction=excluded.fonction,portees=excluded.portees,par=excluded.par").bind(c.id,fn,JSON.stringify(portees),String(u.id),Date.now()).run();
    return reply({ok:true,message:(c.nom||c.email)+" est désigné(e) "+fn+" ("+portees.length+" cours/portées confiés)."},201);
  }
  if(sous==="formateurs/retirer"&&req.method==="POST"){
    if(!admin)return error("Réservé à l'administration.",403);
    const r=await env.DB.prepare("DELETE FROM academy_2027_formateurs WHERE compte=?").bind(String(b.compte||"")).run();
    return r.meta?.changes?reply({ok:true}):error("Désignation introuvable.",404);
  }

  /* ressources */
  if(!fonction)return error("Espace réservé aux enseignants et coachs désignés.",403);
  const maintenant=Date.now(),moi=String(u.id),autorisees=await porteesAutorisees(env,u);
  async function valider(b,existante){
    const portee=existante?existante.portee:String(b.portee||"");
    if(!PORTEES.includes(portee))return {erreur:"Choisissez un cours, un niveau ou la bibliothèque générale."};
    if(!autorisees.includes(portee))return {erreur:"Ce cours ne vous est pas confié : demandez à la direction pédagogique."};
    const type=existante?existante.type:String(b.type||"");
    if(!TYPES.includes(type))return {erreur:"Type de ressource inconnu."};
    const titre=propre(b.titre??existante?.titre,140);if(titre.length<3)return {erreur:"Donnez un titre (3 caractères minimum)."};
    const description=propre(b.description??existante?.description??"",1000);
    const out={portee,type,titre,description,url:"",media:"",genre:"",texte:""};
    if(type==="note"||type==="exercice"){
      const t=String(b.texte??existante?.texte??"").replace(/\r\n?/g,"\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").trim();
      if(t.length<20||t.length>6000)return {erreur:"La note doit compter de 20 à 6 000 caractères."};
      out.texte=t;return {out};
    }
    const mediaId=propre(b.mediaId??(existante&&!("url" in b)?existante.media:""),40);
    if(mediaId){
      if(!ID_MEDIA.test(mediaId))return {erreur:"Fichier de la médiathèque invalide."};
      const m=await env.DB.prepare("SELECT id,nom,genre,auteur,fini FROM medias WHERE id=?").bind(mediaId).first();
      if(!m||!m.fini)return {erreur:"Ce fichier n'est pas (ou pas encore) disponible dans la médiathèque."};
      if(!admin&&m.auteur!==moi)return {erreur:"Vous ne pouvez rattacher que vos propres fichiers."};
      if(type==="video"&&!["video","audio"].includes(m.genre))return {erreur:"Une vidéo doit être un fichier vidéo ou audio."};
      if(type==="lien")return {erreur:"Un lien doit être une adresse web."};
      out.media=m.id;out.genre=m.genre;out.url="/m/"+m.id+"/"+encodeURIComponent(m.nom);
      return {out};
    }
    const brut=b.url??existante?.url;
    if(type==="video"){
      const v=lienVideo(brut);if(!v)return {erreur:"Collez un lien YouTube ou Vimeo (https), ou téléversez un fichier vidéo."};
      out.url=v.url;out.genre=v.fournisseur;return {out};
    }
    const l=lienHttps(brut);if(!l)return {erreur:"Indiquez une adresse web valide commençant par https://."};
    out.url=l;out.genre=type==="fichier"?"document":"lien";return {out};
  }
  if(sous==="ressources"&&req.method==="POST"){
    const v=await valider(b,null);if(v.erreur)return error(v.erreur);
    const id=crypto.randomUUID().replace(/-/g,"").slice(0,16),o=v.out;
    const publie=b.publie===false?0:1;
    await env.DB.prepare("INSERT INTO academy_2027_ressources(id,portee,type,titre,description,url,media,genre,texte,auteur,auteur_nom,publie,cree,maj) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,o.portee,o.type,o.titre,o.description,o.url,o.media,o.genre,o.texte,moi,propre(u.nom||"Équipe pédagogique",80),publie,maintenant,maintenant).run();
    return reply({ok:true,id,publie:!!publie,message:publie?"Ressource publiée : les apprenants la voient dans leur espace.":"Brouillon enregistré (invisible des apprenants)."},201);
  }
  if(sous==="ressources"&&req.method==="PATCH"){
    const ex=await env.DB.prepare("SELECT * FROM academy_2027_ressources WHERE id=?").bind(String(b.id||"")).first();
    if(!ex)return error("Ressource introuvable.",404);
    if(!admin&&(ex.auteur!==moi||!autorisees.includes(ex.portee)))return error("Vous ne pouvez modifier que vos propres ressources, dans vos cours confiés.",403);
    const v=await valider(b,ex);if(v.erreur)return error(v.erreur);
    const o=v.out,publie=typeof b.publie==="boolean"?(b.publie?1:0):ex.publie;
    await env.DB.prepare("UPDATE academy_2027_ressources SET titre=?,description=?,url=?,media=?,genre=?,texte=?,publie=?,maj=? WHERE id=?").bind(o.titre,o.description,o.url,o.media,o.genre,o.texte,publie,maintenant,ex.id).run();
    return reply({ok:true,publie:!!publie});
  }
  if(sous==="ressources/supprimer"&&req.method==="POST"){
    const ex=await env.DB.prepare("SELECT id,auteur,media FROM academy_2027_ressources WHERE id=?").bind(String(b.id||"")).first();
    if(!ex)return error("Ressource introuvable.",404);
    if(!admin&&ex.auteur!==moi)return error("Vous ne pouvez supprimer que vos propres ressources.",403);
    await env.DB.prepare("DELETE FROM academy_2027_ressources WHERE id=?").bind(ex.id).run();
    return reply({ok:true,media:ex.media||""});
  }
  return error("Route inconnue.",404);
}
