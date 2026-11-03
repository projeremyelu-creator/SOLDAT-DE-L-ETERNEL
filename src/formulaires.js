/* Formulaires du mouvement, créés par l'administration et hébergés sur le site (sans service externe).
   - Public : GET /api/f/<slug> (définition d'un formulaire actif) et POST /api/f/<slug> (réponse).
   - Administration (niveau 2+) : GET/POST /api/formulaires — liste, modèles, création/modification,
     activation, consultation des réponses et export CSV.
   - Un formulaire créé est INACTIF tant que l'administrateur ne l'active pas.
   - Rien d'autre que les champs du formulaire n'est conservé : ni adresse IP, ni empreinte du navigateur.
   - Les réponses ne sont jamais effaçables depuis l'interface (aucune suppression définitive). */
const json=(corps,status=200)=>Response.json(corps,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>json({ok:false,message},status);
export const TYPES=['texte','texte_long','email','telephone','nombre','date','choix','cases','oui_non'];
export const MAX_CHAMPS=30,MAX_OPTIONS=20,MAX_REPONSES=20000,MAX_CORPS=24000;
const SLUG_OK=/^[a-z0-9][a-z0-9-]{1,38}$/,ID_OK=/^[a-z][a-z0-9_]{0,29}$/;
const EMAIL_OK=/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$/,TEL_OK=/^[+0-9 ().-]{6,25}$/;
const propre=(t,n)=>String(t??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[ \t]+/g,' ').trim().slice(0,n);
const ligne=(t,n)=>propre(t,n).replace(/\s*[\r\n]+\s*/g,' ');
const id=()=>[...crypto.getRandomValues(new Uint8Array(9))].map(x=>x.toString(16).padStart(2,'0')).join('');
const POLES=['Réveil et évangélisation','Impact social et humanitaire','Logistique et organisation','Communication, médias et relations extérieures','Formation, développement et entrepreneuriat'];
const c=(id,etiquette,type,extra={})=>({id,etiquette,type,requis:true,...extra});
export const MODELES={
 benevole:{titre:'Devenir bénévole dans un pôle',intro:'Dites-nous où vous souhaitez servir : un responsable vous recontactera.',confirmation:'Merci ! Un responsable de pôle vous contactera.',champs:[
  c('nom','Nom et prénoms','texte'),c('telephone','Téléphone (WhatsApp si possible)','telephone'),c('email','Adresse e-mail','email',{requis:false}),
  c('pole','Pôle souhaité','choix',{options:POLES}),c('ville','Ville et pays','texte'),c('motivation','Pourquoi souhaitez-vous servir ?','texte_long',{requis:false})]},
 evenement:{titre:'Inscription à un événement',intro:'Réservez votre place pour le prochain rassemblement.',confirmation:'Votre inscription est enregistrée. À bientôt !',champs:[
  c('nom','Nom et prénoms','texte'),c('telephone','Téléphone','telephone'),c('email','Adresse e-mail','email',{requis:false}),
  c('participants','Nombre de personnes','nombre',{aide:'Vous compris.'}),c('ville','Ville et pays','texte'),c('premiere','Est-ce votre première fois ?','oui_non',{requis:false})]},
 retour:{titre:'Votre avis sur nos rencontres',intro:'Votre retour nous aide à servir mieux. Il est facultatif de vous nommer.',confirmation:'Merci pour votre retour.',champs:[
  c('rencontre','Quelle rencontre ?','texte'),c('note','Votre appréciation','choix',{options:['1 – À améliorer','2','3','4','5 – Excellente']}),
  c('commentaire','Vos remarques','texte_long',{requis:false}),c('nom','Votre nom (facultatif)','texte',{requis:false})]}
};
export async function ensureFormulaires(env){
 await env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_formulaires (slug TEXT PRIMARY KEY,titre TEXT NOT NULL,intro TEXT NOT NULL DEFAULT \'\',confirmation TEXT NOT NULL DEFAULT \'\',champs TEXT NOT NULL,actif INTEGER NOT NULL DEFAULT 0,cree INTEGER NOT NULL,maj INTEGER NOT NULL)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_formulaires_reponses (id TEXT PRIMARY KEY,slug TEXT NOT NULL,donnees TEXT NOT NULL,cree INTEGER NOT NULL)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sde_formulaires_reponses_slug ON sde_formulaires_reponses(slug,cree)')
 ]);
}
/* Contrôle et nettoyage d'une définition envoyée par l'administration. */
export function definitionValide(b){
 const titre=ligne(b?.titre,120);if(titre.length<3)return {erreur:'Le titre doit compter au moins 3 caractères.'};
 if(!Array.isArray(b.champs)||!b.champs.length||b.champs.length>MAX_CHAMPS)return {erreur:'Un formulaire compte de 1 à '+MAX_CHAMPS+' champs.'};
 const vus=new Set(),champs=[];
 for(const x of b.champs){
  const cid=String(x?.id||''),type=String(x?.type||''),etiquette=ligne(x?.etiquette,120);
  if(!ID_OK.test(cid)||vus.has(cid))return {erreur:'Identifiant de champ invalide ou en double : « '+ligne(cid,30)+' ».'};
  if(!TYPES.includes(type))return {erreur:'Type de champ inconnu pour « '+cid+' ».'};
  if(!etiquette)return {erreur:'Le champ « '+cid+' » n’a pas d’intitulé.'};
  vus.add(cid);
  const champ={id:cid,etiquette,type,requis:x.requis!==false};
  const aide=ligne(x.aide,200);if(aide)champ.aide=aide;
  if(type==='choix'||type==='cases'){
   const options=[...new Set((Array.isArray(x.options)?x.options:[]).map(o=>ligne(o,80)).filter(Boolean))];
   if(options.length<2||options.length>MAX_OPTIONS)return {erreur:'Le champ « '+etiquette+' » demande de 2 à '+MAX_OPTIONS+' choix.'};
   champ.options=options;
  }
  champs.push(champ);
 }
 return {definition:{titre,intro:propre(b.intro,1000),confirmation:ligne(b.confirmation,300)||'Merci, votre réponse est enregistrée.',champs}};
}
/* Contrôle des réponses d'un visiteur selon la définition ; ignore tout champ inconnu. */
export function reponsesValides(champs,envoyees){
 const donnees={};
 for(const f of champs){
  const v=envoyees?.[f.id];
  const vide=v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length);
  if(vide){if(f.requis)return {erreur:'Le champ « '+f.etiquette+' » est obligatoire.'};continue}
  switch(f.type){
   case 'texte':donnees[f.id]=ligne(v,300);break;
   case 'texte_long':donnees[f.id]=propre(v,2000);break;
   case 'email':{const e=ligne(v,254).toLowerCase();if(!EMAIL_OK.test(e))return {erreur:'Adresse e-mail invalide pour « '+f.etiquette+' ».'};donnees[f.id]=e;break}
   case 'telephone':{const t=ligne(v,25);if(!TEL_OK.test(t))return {erreur:'Numéro invalide pour « '+f.etiquette+' ».'};donnees[f.id]=t;break}
   case 'nombre':{const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>1e9)return {erreur:'Nombre invalide pour « '+f.etiquette+' ».'};donnees[f.id]=n;break}
   case 'date':{const d=String(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+'T00:00:00Z')))return {erreur:'Date invalide pour « '+f.etiquette+' ».'};donnees[f.id]=d;break}
   case 'choix':if(!f.options.includes(String(v)))return {erreur:'Choix non reconnu pour « '+f.etiquette+' ».'};donnees[f.id]=String(v);break;
   case 'cases':{const l=Array.isArray(v)?v.map(String):[String(v)];if(l.some(o=>!f.options.includes(o)))return {erreur:'Choix non reconnu pour « '+f.etiquette+' ».'};donnees[f.id]=[...new Set(l)];break}
   case 'oui_non':if(v!=='oui'&&v!=='non')return {erreur:'Répondez par oui ou non à « '+f.etiquette+' ».'};donnees[f.id]=v;break;
  }
 }
 return {donnees};
}
const lire=async(env,slug)=>{
 const r=await env.DB.prepare('SELECT slug,titre,intro,confirmation,champs,actif,cree,maj FROM sde_formulaires WHERE slug=?').bind(slug).first();
 if(!r)return null;
 try{return {...r,actif:!!r.actif,champs:JSON.parse(r.champs)}}catch{return null}
};
const cellule=v=>{
 const t=Array.isArray(v)?v.join(' ; '):v===undefined||v===null?'':String(v);
 return /^[=+\-@\t\r]/.test(t)?"'"+t:t;
};
const csv=(champs,lignes)=>{
 const q=t=>'"'+String(t).replace(/"/g,'""')+'"';
 const tete=['Date',...champs.map(f=>f.etiquette)].map(q).join(',');
 return '﻿'+[tete,...lignes.map(l=>[new Date(l.cree).toISOString(),...champs.map(f=>cellule(l.donnees[f.id]))].map(q).join(','))].join('\r\n')+'\r\n';
};

/* ── Public ── */
export async function formulairePublic(req,env,s){
 const m=new URL(req.url).pathname.match(/^\/api\/f\/([a-z0-9-]{2,39})$/);
 if(!m)return null;
 await ensureFormulaires(env);
 const f=await lire(env,m[1]);
 if(!f||!f.actif)return fail('Ce formulaire n’existe pas ou n’est pas ouvert.',404);
 if(req.method==='GET')return json({ok:true,formulaire:{slug:f.slug,titre:f.titre,intro:f.intro,champs:f.champs}});
 if(req.method!=='POST')return fail('Méthode refusée.',405);
 const texte=await req.text();
 if(texte.length>MAX_CORPS)return fail('Réponse trop volumineuse.',413);
 let b;try{b=JSON.parse(texte)}catch{return fail('Données invalides.')}
 if(b&&b.site)return json({ok:true,message:f.confirmation});
 const cle='formulaire:'+s.ip(req);
 if(await s.blocked(cle,15))return fail('Trop de réponses envoyées depuis ce réseau : réessayez dans un quart d’heure.',429);
 if(b?.consentement!==true)return fail('Veuillez accepter que vos réponses soient enregistrées par le Mouvement SDE.');
 const v=reponsesValides(f.champs,b.reponses);
 if(v.erreur)return fail(v.erreur);
 const n=(await env.DB.prepare('SELECT COUNT(*) AS n FROM sde_formulaires_reponses WHERE slug=?').bind(f.slug).first())?.n||0;
 if(n>=MAX_REPONSES)return fail('Ce formulaire a atteint sa capacité maximale.',429);
 await s.count(cle);
 await env.DB.prepare('INSERT INTO sde_formulaires_reponses(id,slug,donnees,cree) VALUES(?,?,?,?)').bind(id(),f.slug,JSON.stringify(v.donnees),Date.now()).run();
 if(s.notify)s.notify('sondage',{action:'Formulaire '+f.slug});
 return json({ok:true,message:f.confirmation});
}

/* ── Administration ── */
export async function formulairesApi(req,env,u,s={}){
 const url=new URL(req.url);
 if(url.pathname!=='/api/formulaires')return null;
 if(!u.connecte||u.niveau<2)return fail('Réservé aux administrateurs.',403);
 await ensureFormulaires(env);
 if(req.method==='GET'){
  const slug=url.searchParams.get('slug');
  if(slug){
   const f=await lire(env,slug);if(!f)return fail('Formulaire introuvable.',404);
   const lignes=((await env.DB.prepare('SELECT id,donnees,cree FROM sde_formulaires_reponses WHERE slug=? ORDER BY cree DESC LIMIT 5000').bind(slug).all()).results||[])
    .map(r=>{try{return {id:r.id,cree:r.cree,donnees:JSON.parse(r.donnees)}}catch{return null}}).filter(Boolean);
   if(url.searchParams.get('csv')==='1')return new Response(csv(f.champs,lignes),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="formulaire-'+slug+'.csv"','cache-control':'private, no-store'}});
   return json({ok:true,formulaire:f,reponses:lignes.slice(0,500),total:lignes.length});
  }
  const liste=(await env.DB.prepare('SELECT f.slug,f.titre,f.actif,f.maj,(SELECT COUNT(*) FROM sde_formulaires_reponses r WHERE r.slug=f.slug) AS reponses FROM sde_formulaires f ORDER BY f.maj DESC').all()).results||[];
  return json({ok:true,formulaires:liste.map(x=>({...x,actif:!!x.actif})),modeles:Object.entries(MODELES).map(([cle,m])=>({cle,titre:m.titre})),types:TYPES});
 }
 if(req.method!=='POST')return fail('Méthode refusée.',405);
 const b=await req.json().catch(()=>({}));
 const t=Date.now();
 if(b.action==='activer'){
  const f=await lire(env,String(b.slug||''));if(!f)return fail('Formulaire introuvable.',404);
  await env.DB.prepare('UPDATE sde_formulaires SET actif=?,maj=? WHERE slug=?').bind(b.actif===true?1:0,t,f.slug).run();
  return json({ok:true,actif:b.actif===true});
 }
 if(b.action==='modele'){
  const m=MODELES[b.modele];if(!m)return fail('Modèle inconnu.');
  let slug=String(b.modele),i=1;
  while(await lire(env,slug))slug=b.modele+'-'+(++i);
  await env.DB.prepare('INSERT INTO sde_formulaires(slug,titre,intro,confirmation,champs,actif,cree,maj) VALUES(?,?,?,?,?,0,?,?)').bind(slug,m.titre,m.intro,m.confirmation,JSON.stringify(m.champs),t,t).run();
  return json({ok:true,slug});
 }
 if(b.action==='enregistrer'){
  const slug=String(b.slug||'').toLowerCase();
  if(!SLUG_OK.test(slug))return fail('Adresse invalide : 2 à 39 caractères, lettres minuscules, chiffres et tirets.');
  const v=definitionValide(b.formulaire);if(v.erreur)return fail(v.erreur);
  const d=v.definition,ex=await lire(env,slug);
  if(ex)await env.DB.prepare('UPDATE sde_formulaires SET titre=?,intro=?,confirmation=?,champs=?,maj=? WHERE slug=?').bind(d.titre,d.intro,d.confirmation,JSON.stringify(d.champs),t,slug).run();
  else await env.DB.prepare('INSERT INTO sde_formulaires(slug,titre,intro,confirmation,champs,actif,cree,maj) VALUES(?,?,?,?,?,0,?,?)').bind(slug,d.titre,d.intro,d.confirmation,JSON.stringify(d.champs),t,t).run();
  return json({ok:true,slug,cree:!ex});
 }
 return fail('Action inconnue.');
}
