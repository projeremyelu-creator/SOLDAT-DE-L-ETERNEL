/* Courriels automatisés du mouvement (newsletter hebdomadaire, nouveaux rassemblements, alertes d'agenda).
   Envoi par Resend (API HTTPS, lots de 100). Rien ne part tant que RESEND_API_KEY, COURRIEL_FROM et
   COURRIEL_SECRET ne sont pas configurés et que l'administrateur n'a pas activé chaque scénario.
   - Inscription avec double confirmation ; désinscription en un clic dans chaque message
     (liens signés HMAC, en-têtes List-Unsubscribe).
   - Chaque envoi est réservé dans sde_courriel_envois avant l'expédition : jamais deux fois le même.
   - Seuls les rassemblements publics sont annoncés ; aucune donnée de membre ni de fiche n'est utilisée. */
const BASE='https://mouvement-sde.org';
const json=(corps,status=200)=>Response.json(corps,{status,headers:{'cache-control':'private, no-store'}});
const aller=(chemin)=>new Response(null,{status:303,headers:{location:BASE+chemin,'cache-control':'no-store'}});
const fail=(message,status=400)=>json({ok:false,message},status);
export const THEMES=['hebdo','nouveau','agenda'];
export const LIBELLES={hebdo:'Lettre hebdomadaire',nouveau:'Nouveaux cultes et rassemblements',agenda:'Alertes d’agenda (3 jours et la veille)'};
const EMAIL_OK=/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$/;
const LOT=100,MAX_LOTS=40;
export const courrielConfigure=env=>!!(env?.RESEND_API_KEY&&env?.COURRIEL_FROM&&env?.COURRIEL_SECRET);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const propre=(t,n)=>String(t||'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const b64u=buf=>{let s='';for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const deb64u=s=>{const p=s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0))};

/* ── liens signés ── */
async function hmac(env,texte){
 const cle=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(env.COURRIEL_SECRET)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64u(await crypto.subtle.sign('HMAC',cle,new TextEncoder().encode(texte)));
}
export async function jeton(env,email,but){
 const e=String(email).toLowerCase();
 return b64u(new TextEncoder().encode(e))+'.'+await hmac(env,but+'|'+e);
}
export async function lireJeton(env,t,but){
 if(!env?.COURRIEL_SECRET)return null;
 const [a,sig]=String(t||'').split('.');if(!a||!sig)return null;
 let email;try{email=new TextDecoder().decode(deb64u(a))}catch{return null}
 const attendu=await hmac(env,but+'|'+email);
 if(attendu.length!==sig.length)return null;
 let d=0;for(let i=0;i<sig.length;i++)d|=attendu.charCodeAt(i)^sig.charCodeAt(i);
 return d===0&&EMAIL_OK.test(email)?email:null;
}

/* ── tables ── */
export async function ensure(env){
 for(const sql of [
  'CREATE TABLE IF NOT EXISTS sde_abonnes (email TEXT PRIMARY KEY,nom TEXT NOT NULL DEFAULT \'\',themes TEXT NOT NULL,statut TEXT NOT NULL,cree INTEGER NOT NULL,confirme INTEGER,confirmation_envoyee INTEGER NOT NULL DEFAULT 0,derniere_demande INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS sde_courriel_envois (cle TEXT PRIMARY KEY,envoye INTEGER NOT NULL,total INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT)'
 ])await env.DB.prepare(sql).run();
}
export async function reglages(env){
 const r=await env.DB.prepare("SELECT val FROM meta WHERE cle='courriels'").first();
 let v={};try{v=JSON.parse(r?.val||'{}')}catch{}
 return {hebdo:v.hebdo===true,nouveau:v.nouveau===true,agenda:v.agenda===true};
}
const ecrireReglages=(env,v)=>env.DB.prepare("INSERT INTO meta(cle,val) VALUES('courriels',?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val").bind(JSON.stringify(v)).run();

/* ── Resend ── */
export async function envoyerLot(env,messages,{fetchImpl=fetch}={}){
 if(!courrielConfigure(env))return{ok:0,ko:messages.length,reason:'config'};
 let ok=0,ko=0;
 for(let i=0;i<messages.length&&i<LOT*MAX_LOTS;i+=LOT){
  const paquet=messages.slice(i,i+LOT).map(m=>({from:String(env.COURRIEL_FROM),to:[m.to],subject:m.subject,html:m.html,text:m.text,headers:m.headers||{}}));
  try{
   const r=await fetchImpl('https://api.resend.com/emails/batch',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify(paquet)});
   if(r.ok)ok+=paquet.length;else ko+=paquet.length;
  }catch{ko+=paquet.length}
 }
 return{ok,ko};
}

/* ── mise en forme ── */
const dateFr=iso=>{try{return new Date(iso+'T12:00:00Z').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'})}catch{return iso}};
const ligneEvt=e=>[dateFr(e.date),e.heure,e.lieu].filter(Boolean).join(' · ');
function gabarit({titre,intro,blocs,lienDesabo}){
 const html='<!doctype html><html lang="fr"><body style="margin:0;background:#f4f1fb;font-family:Arial,Helvetica,sans-serif;color:#1d1633"><div style="max-width:600px;margin:0 auto;padding:24px 16px"><div style="background:#3b1d7a;color:#f3d98b;padding:20px 24px;border-radius:12px 12px 0 0"><strong style="font-size:18px">Mouvement SDE · Soldats de l’Éternel</strong></div><div style="background:#fff;padding:24px;border-radius:0 0 12px 12px"><h1 style="font-size:22px;margin:0 0 12px">'+esc(titre)+'</h1>'+(intro?'<p style="line-height:1.5">'+esc(intro)+'</p>':'')+
  blocs.map(b=>'<h2 style="font-size:16px;color:#3b1d7a;margin:22px 0 8px">'+esc(b.titre)+'</h2>'+b.lignes.map(l=>'<p style="margin:0 0 10px;line-height:1.45"><strong>'+esc(l.t)+'</strong>'+(l.d?'<br><span style="color:#5a5072">'+esc(l.d)+'</span>':'')+'</p>').join('')).join('')+
  '<p style="margin:26px 0 0"><a href="'+BASE+'/programmes" style="background:#f3d98b;color:#1d1633;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Voir le programme complet</a></p></div><p style="font-size:12px;color:#6b6280;line-height:1.5;text-align:center;margin:16px 0 0">Vous recevez ce message car vous vous êtes inscrit à la lettre du Mouvement SDE.<br><a href="'+esc(lienDesabo)+'" style="color:#3b1d7a">Me désinscrire en un clic</a> · Contact : infosoldat@gmail.com</p></div></body></html>';
 const texte=[titre,'',intro||'',...blocs.flatMap(b=>['',b.titre.toUpperCase(),...b.lignes.map(l=>'- '+l.t+(l.d?' ('+l.d+')':''))]),'','Programme : '+BASE+'/programmes','','Me désinscrire : '+lienDesabo].filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n');
 return{html,text:texte};
}
async function pourAbonne(env,abonne,sujet,contenu){
 const lien=BASE+'/api/newsletter/desabonner?t='+await jeton(env,abonne.email,'desab');
 const g=gabarit({...contenu,lienDesabo:lien});
 return{to:abonne.email,subject:sujet,html:g.html,text:g.text,headers:{'List-Unsubscribe':'<'+lien+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
}

/* ── données de l'agenda (rassemblements publics seulement) ── */
const lireDocs=async(env,parent)=>((await env.DB.prepare('SELECT id,data FROM docs WHERE parent=?').bind(parent).all()).results||[]).map(r=>{try{return{id:r.id,...JSON.parse(r.data)}}catch{return null}}).filter(Boolean);
const jourDe=t=>new Date(t).toISOString().slice(0,10);
const plusJours=(t,n)=>jourDe(t+n*864e5);
export async function evenementsPublics(env,now){
 return (await lireDocs(env,'evenements')).filter(e=>e.prive!==true&&/^\d{4}-\d{2}-\d{2}$/.test(String(e.date||''))&&e.date>=jourDe(now)&&propre(e.titre,160))
  .map(e=>({id:e.id,titre:propre(e.titre,160),date:e.date,heure:propre(e.heure,5),lieu:propre(e.lieu,160)}))
  .sort((a,b)=>(a.date+a.heure).localeCompare(b.date+b.heure));
}
function semaineISO(t){
 const d=new Date(Date.UTC(...(()=>{const x=new Date(t);return[x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate()]})()));
 const jour=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-jour);
 const an=d.getUTCFullYear(),debut=Date.UTC(an,0,1);
 return an+'-S'+String(Math.ceil(((d-debut)/864e5+1)/7)).padStart(2,'0');
}
export async function contenuHebdo(env,now){
 const fin=plusJours(now,7),evts=(await evenementsPublics(env,now)).filter(e=>e.date<=fin);
 const depuis=plusJours(now,-7);
 const annonces=(await lireDocs(env,'annonces')).filter(a=>String(a.date||'')>=depuis&&propre(a.titre,160)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 const blocs=[];
 if(evts.length)blocs.push({titre:'Cette semaine et la suivante',lignes:evts.slice(0,12).map(e=>({t:e.titre,d:ligneEvt(e)}))});
 if(annonces.length)blocs.push({titre:'Nouvelles du mouvement',lignes:annonces.map(a=>({t:propre(a.titre,160),d:propre(a.contenu||a.message,280)}))});
 return blocs.length?{titre:'La lettre de la semaine',intro:'Voici les rendez-vous et les nouvelles du Mouvement SDE.',blocs}:null;
}

/* ── abonnés ── */
const actifs=async(env,theme)=>((await env.DB.prepare("SELECT email,nom,themes FROM sde_abonnes WHERE statut='actif'").all()).results||[]).filter(a=>String(a.themes).split(',').includes(theme));
async function reserver(env,cle){
 const r=await env.DB.prepare('INSERT OR IGNORE INTO sde_courriel_envois(cle,envoye,total) VALUES(?,?,0)').bind(cle,Date.now()).run();
 return !!(r?.meta?.changes);
}
const liberer=(env,cle)=>env.DB.prepare('DELETE FROM sde_courriel_envois WHERE cle=?').bind(cle).run();
async function diffuser(env,cles,theme,sujet,contenu,opts){
 const dest=await actifs(env,theme);
 if(!dest.length){for(const c of cles)await liberer(env,c);return{sent:0,total:0}}
 const messages=[];for(const a of dest)messages.push(await pourAbonne(env,a,sujet,contenu));
 const r=await envoyerLot(env,messages,opts);
 if(r.ok===0)for(const c of cles)await liberer(env,c);
 else for(const c of cles)await env.DB.prepare('UPDATE sde_courriel_envois SET total=? WHERE cle=?').bind(r.ok,c).run();
 return{sent:r.ok,total:dest.length};
}

/* ── scénarios automatiques (appelés toutes les 15 minutes) ── */
export async function lancerCourriels(env,{now=Date.now(),fetchImpl,forcer=false,seulement}={}){
 if(!courrielConfigure(env))return{reason:'config'};
 await ensure(env);
 const opts={fetchImpl},r=await reglages(env),sortie={};
 const h=new Date(now).getUTCHours(),jourSemaine=new Date(now).getUTCDay();
 await confirmationsEnAttente(env,opts);
 if(r.hebdo&&(!seulement||seulement==='hebdo')&&(forcer||(jourSemaine===1&&h>=7))){
  const cle='hebdo:'+semaineISO(now);
  if(await reserver(env,cle)){
   const c=await contenuHebdo(env,now);
   if(!c){await liberer(env,cle);sortie.hebdo={sent:0,reason:'rien à annoncer'}}
   else sortie.hebdo=await diffuser(env,[cle],'hebdo','Mouvement SDE · La lettre de la semaine',c,opts);
  }
 }
 if(r.nouveau&&(!seulement||seulement==='nouveau')){
  const evts=await evenementsPublics(env,now),neufs=[];
  for(const e of evts)if(await reserver(env,'nouveau:'+e.id))neufs.push(e);
  if(neufs.length){
   const cles=neufs.map(e=>'nouveau:'+e.id);
   sortie.nouveau=await diffuser(env,cles,'nouveau',neufs.length===1?'Nouveau rassemblement : '+neufs[0].titre:'Nouveaux rassemblements du Mouvement SDE',
    {titre:neufs.length===1?'Un nouveau rassemblement est annoncé':'De nouveaux rassemblements sont annoncés',intro:'Bénissez ces rendez-vous et partagez-les autour de vous.',blocs:[{titre:'À noter dans votre agenda',lignes:neufs.slice(0,10).map(e=>({t:e.titre,d:ligneEvt(e)}))}]},opts);
  }
 }
 if(r.agenda&&(!seulement||seulement==='agenda')&&(forcer||h>=8)){
  const evts=await evenementsPublics(env,now);
  for(const [delai,etiquette] of [[3,'J-3'],[1,'J-1']]){
   const cible=plusJours(now,delai),du=evts.filter(e=>e.date===cible),cles=[];
   for(const e of du)if(await reserver(env,'agenda:'+etiquette+':'+e.id))cles.push('agenda:'+etiquette+':'+e.id);
   const aEnvoyer=du.filter(e=>cles.includes('agenda:'+etiquette+':'+e.id));
   if(aEnvoyer.length){
    sortie['agenda'+etiquette]=await diffuser(env,cles,'agenda',(delai===1?'Demain : ':'Dans 3 jours : ')+aEnvoyer[0].titre+(aEnvoyer.length>1?' et plus':''),
     {titre:delai===1?'C’est demain':'Dans trois jours',intro:delai===1?'Un rappel pour ne pas manquer le rendez-vous de demain.':'Préparez-vous : le rendez-vous approche.',blocs:[{titre:delai===1?'Demain':'Dans 3 jours',lignes:aEnvoyer.map(e=>({t:e.titre,d:ligneEvt(e)}))}]},opts);
   }
  }
 }
 return sortie;
}
/* Évite d'annoncer d'un coup tout l'agenda existant quand « nouveaux rassemblements » est activé. */
async function amorcer(env,now){
 for(const e of await evenementsPublics(env,now))await reserver(env,'nouveau:'+e.id);
}

/* ── inscription à double confirmation ── */
async function envoyerConfirmation(env,abonne,opts){
 const lien=BASE+'/api/newsletter/confirmer?t='+await jeton(env,abonne.email,'conf');
 const texte='Bonjour'+(abonne.nom?' '+abonne.nom:'')+',\n\nPour confirmer votre inscription à la lettre du Mouvement SDE, ouvrez ce lien :\n'+lien+'\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera envoyé.';
 const html='<p>Bonjour'+(abonne.nom?' '+esc(abonne.nom):'')+',</p><p>Pour confirmer votre inscription à la lettre du Mouvement SDE, <a href="'+esc(lien)+'">cliquez ici</a>.</p><p style="color:#6b6280">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera envoyé.</p>';
 const r=await envoyerLot(env,[{to:abonne.email,subject:'Confirmez votre inscription à la lettre SDE',html,text:texte}],opts);
 if(r.ok)await env.DB.prepare('UPDATE sde_abonnes SET confirmation_envoyee=1 WHERE email=?').bind(abonne.email).run();
 return r.ok>0;
}
async function confirmationsEnAttente(env,opts){
 const l=(await env.DB.prepare("SELECT email,nom FROM sde_abonnes WHERE statut='en_attente' AND confirmation_envoyee=0 LIMIT 50").all()).results||[];
 for(const a of l)await envoyerConfirmation(env,a,opts);
}

export async function courrielApi(req,env,u,s){
 const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/newsletter')&&!path.startsWith('/api/courriels'))return null;
 const opts={fetchImpl:s.fetchImpl};
 /* Inscription publique */
 if(path==='/api/newsletter'&&req.method==='POST'){
  const ip=s.ip?s.ip(req):'ip';
  if(await s.blocked('news:'+ip,8))return fail('Trop de demandes depuis ce réseau. Réessayez dans un quart d’heure.',429);
  await s.count('news:'+ip);
  const b=await req.json().catch(()=>({}));
  if(b.site)return json({ok:true,message:'Merci.'});
  const email=String(b.email||'').trim().toLowerCase(),nom=propre(b.nom,100);
  if(!EMAIL_OK.test(email))return fail('Adresse e-mail invalide.');
  if(b.consentement!==true)return fail('Votre consentement est nécessaire pour vous inscrire.');
  const themes=(Array.isArray(b.themes)?b.themes:THEMES).filter(t=>THEMES.includes(t));
  if(!themes.length)return fail('Choisissez au moins un type de message.');
  await ensure(env);
  const ex=await env.DB.prepare('SELECT statut,derniere_demande FROM sde_abonnes WHERE email=?').bind(email).first();
  const maintenant=Date.now();
  const reponse={ok:true,message:'Merci ! Si cette adresse est valide, un message de confirmation vous est envoyé : ouvrez le lien qu’il contient pour finaliser votre inscription.'};
  if(ex?.statut==='actif'){
   await env.DB.prepare('UPDATE sde_abonnes SET themes=? WHERE email=?').bind(themes.join(','),email).run();
   return json(reponse);
  }
  if(ex&&maintenant-Number(ex.derniere_demande)<10*60*1000)return json(reponse);
  await env.DB.prepare("INSERT INTO sde_abonnes(email,nom,themes,statut,cree,confirmation_envoyee,derniere_demande) VALUES(?,?,?,'en_attente',?,0,?) ON CONFLICT(email) DO UPDATE SET nom=excluded.nom,themes=excluded.themes,statut='en_attente',confirmation_envoyee=0,derniere_demande=excluded.derniere_demande").bind(email,nom,themes.join(','),maintenant,maintenant).run();
  if(courrielConfigure(env))await envoyerConfirmation(env,{email,nom},opts);
  return json(reponse);
 }
 if(path==='/api/newsletter/confirmer'&&req.method==='GET'){
  const email=await lireJeton(env,url.searchParams.get('t'),'conf');
  if(!email)return aller('/newsletter?etat=invalide');
  await ensure(env);
  const r=await env.DB.prepare("UPDATE sde_abonnes SET statut='actif',confirme=? WHERE email=? AND statut IN ('en_attente','actif')").bind(Date.now(),email).run();
  return aller('/newsletter?etat='+(r?.meta?.changes?'confirme':'invalide'));
 }
 if(path==='/api/newsletter/desabonner'&&(req.method==='GET'||req.method==='POST')){
  const email=await lireJeton(env,url.searchParams.get('t'),'desab');
  if(!email)return req.method==='POST'?fail('Lien invalide.',400):aller('/newsletter?etat=invalide');
  await ensure(env);
  await env.DB.prepare("UPDATE sde_abonnes SET statut='desabonne' WHERE email=?").bind(email).run();
  return req.method==='POST'?json({ok:true}):aller('/newsletter?etat=desabonne');
 }
 /* Déclenchement par un outil d'automatisation (Make, Zapier, n8n…) : secret dédié, jamais un compte. */
 if(path==='/api/courriels/declencher'&&req.method==='POST'){
  const attendu=String(env.COURRIEL_WEBHOOK_SECRET||''),recu=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  let d=attendu.length>=24&&attendu.length===recu.length?0:1;
  for(let i=0;i<Math.min(attendu.length,recu.length);i++)d|=attendu.charCodeAt(i)^recu.charCodeAt(i);
  if(d!==0)return fail('Non autorisé.',401);
  const b=await req.json().catch(()=>({}));
  if(!THEMES.includes(b.scenario))return fail('Scénario inconnu.');
  return json({ok:true,resultat:await lancerCourriels(env,{seulement:b.scenario,forcer:b.forcer===true,fetchImpl:s.fetchImpl})});
 }
 /* Pilotage par l'administration */
 if(path==='/api/courriels'){
  if(!u.connecte||u.niveau<2)return fail('Réservé aux administrateurs.',403);
  await ensure(env);
  if(req.method==='GET'){
   const lignes=(await env.DB.prepare('SELECT statut,themes FROM sde_abonnes').all()).results||[];
   const par={};for(const t of THEMES)par[t]=lignes.filter(l=>l.statut==='actif'&&String(l.themes).split(',').includes(t)).length;
   const envois=(await env.DB.prepare('SELECT cle,envoye,total FROM sde_courriel_envois ORDER BY envoye DESC LIMIT 12').all()).results||[];
   return json({ok:true,configure:courrielConfigure(env),manque:['RESEND_API_KEY','COURRIEL_FROM','COURRIEL_SECRET'].filter(k=>!env[k]),
    webhook:String(env.COURRIEL_WEBHOOK_SECRET||'').length>=24,scenarios:await reglages(env),libelles:LIBELLES,
    abonnes:{actifs:lignes.filter(l=>l.statut==='actif').length,enAttente:lignes.filter(l=>l.statut==='en_attente').length,desabonnes:lignes.filter(l=>l.statut==='desabonne').length,parTheme:par},envois});
  }
  if(req.method!=='POST')return fail('Méthode refusée.',405);
  const b=await req.json().catch(()=>({}));
  if(b.scenarios&&typeof b.scenarios==='object'){
   const avant=await reglages(env),apres={...avant};
   for(const t of THEMES)if(typeof b.scenarios[t]==='boolean')apres[t]=b.scenarios[t];
   if(apres.nouveau&&!avant.nouveau)await amorcer(env,Date.now());
   await ecrireReglages(env,apres);
   return json({ok:true,scenarios:apres});
  }
  if(b.apercu===true){
   const c=await contenuHebdo(env,Date.now());
   return json({ok:true,apercu:c?{titre:c.titre,blocs:c.blocs}:null});
  }
  if(b.test===true){
   if(!courrielConfigure(env))return fail('L’envoi n’est pas encore configuré (clé Resend, expéditeur et secret).',409);
   const cible=String(u.email||'').toLowerCase();
   if(!EMAIL_OK.test(cible)||cible.endsWith('.invalid'))return fail('Votre compte n’a pas d’adresse e-mail réelle pour recevoir le test.',409);
   const c=(await contenuHebdo(env,Date.now()))||{titre:'Message de test',intro:'Aucun rassemblement public ni annonce récente : ce message vérifie seulement l’envoi.',blocs:[{titre:'Test',lignes:[{t:'L’envoi fonctionne',d:'Ce message n’a été adressé qu’à vous.'}]}]};
   const m=await pourAbonne(env,{email:cible},'[Test] Mouvement SDE · '+c.titre,c);
   const r=await envoyerLot(env,[m],opts);
   return r.ok?json({ok:true,message:'Test envoyé à votre adresse.'}):fail('Resend a refusé l’envoi : vérifiez la clé et le domaine expéditeur.',502);
  }
  if(THEMES.includes(b.lancer)){
   if(!courrielConfigure(env))return fail('L’envoi n’est pas encore configuré.',409);
   const r=await reglages(env);
   if(!r[b.lancer])return fail('Activez d’abord ce scénario.',409);
   return json({ok:true,resultat:await lancerCourriels(env,{seulement:b.lancer,forcer:true,fetchImpl:s.fetchImpl})});
  }
  return fail('Demande inconnue.');
 }
 return null;
}
