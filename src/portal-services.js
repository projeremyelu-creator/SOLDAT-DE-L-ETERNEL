/* Compléments du portail : aucune identité de compte ne vient du corps client. */
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>reply({ok:false,message},status);
const defaults={rencontres:true,formations:true,taches:true,lecture:true,delai:1};
const text=(v,n=180)=>String(v??'').trim().slice(0,n);
const day=()=>new Date().toISOString().slice(0,10);
const week=()=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
const emptyCourse=()=>({semaine:week(),lectures:[],prieres:[]});
async function ensure(env){
 for(const q of [
  'CREATE TABLE IF NOT EXISTS portail_etat (compte TEXT PRIMARY KEY,preferences TEXT NOT NULL,parcours TEXT NOT NULL,maj INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portail_recuperations (id TEXT PRIMARY KEY,email TEXT NOT NULL,cree INTEGER NOT NULL,statut TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portail_audit (id TEXT PRIMARY KEY,acteur TEXT NOT NULL,rubrique TEXT NOT NULL,operation TEXT NOT NULL,cree INTEGER NOT NULL)'
 ])await env.DB.prepare(q).run();
}
async function state(env,u){
 const r=await env.DB.prepare('SELECT preferences,parcours FROM portail_etat WHERE compte=?').bind(u.id).first();
 const preferences={...defaults,...(r?JSON.parse(r.preferences):{})};
 const old=r?JSON.parse(r.parcours):null;
 return {preferences,parcours:old?.semaine===week()?old:emptyCourse()};
}
async function save(env,u,s,field){await env.DB.prepare('INSERT INTO portail_etat(compte,preferences,parcours,maj) VALUES(?,?,?,?) ON CONFLICT(compte) DO UPDATE SET '+(field==='preferences'?'preferences=excluded.preferences':'parcours=excluded.parcours')+',maj=excluded.maj').bind(u.id,JSON.stringify(s.preferences),JSON.stringify(s.parcours),Date.now()).run()}
export async function portalAudit(env,u,rubrique,operation){
 if(!u?.connecte||u.niveau<1)return;
 await ensure(env);
 await env.DB.prepare('INSERT INTO portail_audit(id,acteur,rubrique,operation,cree) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u.id,text(rubrique,50),text(operation,40),Date.now()).run();
}
export async function portalBackup(env){
 await ensure(env);
 const result={};
 for(const [key,table]of [['etats','portail_etat'],['recuperations','portail_recuperations'],['audit','portail_audit']])result[key]=(await env.DB.prepare('SELECT * FROM '+table).all()).results||[];
 return result;
}
const paths=new Set(['/api/portail-resume','/api/mes-preferences','/api/mon-parcours-spirituel','/api/recuperation','/api/recuperations','/api/journal-administratif','/api/temoignages-personnels','/api/temoignages-validation']);
export async function portalApi(req,env,u,services){
 const requestedPath=new URL(req.url).pathname;
 const path=requestedPath==='/api/demande-reinitialisation'?'/api/recuperation':requestedPath;if(!paths.has(path))return null;
 if(path!=='/api/recuperation'&&!u.connecte)return fail('Connectez-vous pour ouvrir votre espace.',401);
 await ensure(env);
 const {list,write,notify,blocked,count,hash,owners}=services;
 if(path==='/api/recuperation'){
  if(req.method!=='POST')return fail('Méthode refusée.',405);
  const b=await req.json(),email=text(b.email,254).toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return fail('Saisissez une adresse e-mail valide.');
  const key='recuperation:'+await hash(email),ip=req.headers.get('cf-connecting-ip')||'local';
  if(await blocked('recuperation-ip:'+ip,6)||await blocked(key,2))return fail('Une demande récente a déjà été reçue. Réessayez plus tard.',429);
  await count(key);await count('recuperation-ip:'+ip);
  await env.DB.prepare('INSERT INTO portail_recuperations(id,email,cree,statut) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET cree=excluded.cree,statut=excluded.statut').bind(await hash(email),email,Date.now(),'en_attente').run();
  notify('espace',{path:'acces/recuperation'});
  return reply({ok:true,message:'Votre demande a été enregistrée. Le secrétariat vérifiera votre identité avant de vous remettre un code. Aucun mot de passe ne vous sera demandé.'});
 }
 if(path==='/api/mes-preferences'||path==='/api/mon-parcours-spirituel'){
  if(!['GET','PATCH'].includes(req.method))return fail('Méthode refusée.',405);
  const s=await state(env,u);
  if(req.method==='PATCH'){
   const b=await req.json();
   if(path==='/api/mes-preferences'){
    if(Object.keys(b).some(k=>!Object.hasOwn(defaults,k)))return fail('Préférence inconnue.');
    for(const k of ['rencontres','formations','taches','lecture'])if(b[k]!==undefined){if(typeof b[k]!=='boolean')return fail('Choix invalide.');s.preferences[k]=b[k]}
    if(b.delai!==undefined){if(![1,3,7].includes(b.delai))return fail('Délai invalide.');s.preferences.delai=b.delai}
   }else{
    if(b.semaine!==week())return fail('La semaine a changé. Actualisez votre parcours.');
    for(const k of ['lectures','prieres'])if(b[k]!==undefined){if(!Array.isArray(b[k])||b[k].length>7||b[k].some(n=>!Number.isInteger(n)||n<0||n>6))return fail('Progression invalide.');s.parcours[k]=[...new Set(b[k])].sort()}
   }
   await save(env,u,s,path==='/api/mes-preferences'?'preferences':'parcours');
  }
  return reply({ok:true,...s});
 }
 if(path==='/api/portail-resume'){
  if(req.method!=='GET')return fail('Méthode refusée.',405);
  const s=await state(env,u),today=day(),until=new Date(Date.now()+s.preferences.delai*86400000).toISOString().slice(0,10);
  const [ev,forms,ads,projects]=await Promise.all(['evenements','formations','annonces',...(u.niveau>=1?['projets']:[])].map(p=>list(p)));
  const evenements=ev.filter(x=>x.data.date>=today&&(u.niveau>=1||x.data.prive!==true)).map(({id,data:d})=>({id,titre:text(d.titre),date:text(d.date,10),heure:text(d.heure,5),lieu:text(d.lieu),type:text(d.type)})).sort((a,b)=>(a.date+a.heure).localeCompare(b.date+b.heure)).slice(0,8);
  const formations=forms.filter(f=>u.membreId&&f.data.participants?.[u.membreId]&&!['Retiré','Abandon'].includes(f.data.participants[u.membreId].statut)).map(({id,data:d})=>{const p=d.participants[u.membreId],modules=Array.isArray(d.modules)?d.modules:[];const prochaine=d.dateDebut>=today?d.dateDebut:(d.dateDebut&&(!d.dateFin||d.dateFin>=today)&&p.statut!=='Certifié'?today:'');return {id,titre:text(d.titre),date:text(prochaine,10),statut:text(p.statut),total:modules.length,faits:modules.filter(m=>p.suivis?.[m.id]).length,modules:modules.map(m=>({id:text(m.id),titre:text(m.titre),date:text(m.date,10),suivi:!!p.suivis?.[m.id]}))}}).slice(0,12);
  const annonces=ads.filter(a=>a.data.publie!==false&&(!a.data.expireLe||a.data.expireLe>=today)).sort((a,b)=>(b.data.creeLe||0)-(a.data.creeLe||0)).slice(0,5).map(({id,data:d})=>({id,titre:text(d.titre||'Annonce'),texte:text(d.contenu||d.texte,700),type:text(d.type)}));
  const taches=(projects||[]).flatMap(({id,data:d})=>Object.entries(d.taches||{}).map(([key,t])=>({id:key,...t})).filter(t=>u.membreId&&t.responsableId===u.membreId&&t.statut!=='Fait').map(t=>({id:text(t.id),projet:id,titre:text(t.titre),date:text(t.echeance,10)}))).slice(0,30);
  const rappels=[];
  if(s.preferences.rencontres)for(const e of evenements.filter(e=>e.date<=until))rappels.push({...e,type:'rencontres',module:'agenda'});
  if(s.preferences.formations)for(const f of formations.filter(f=>f.date>=today&&f.date<=until))rappels.push({...f,type:'formations',module:'academie'});
  if(s.preferences.taches)for(const t of taches.filter(t=>t.date&&t.date<=until))rappels.push({...t,type:'taches',module:'projets'});
  if(s.preferences.lecture&&!s.parcours.lectures.includes((new Date().getUTCDay()+6)%7))rappels.push({id:'lecture-du-jour',titre:'Votre lecture biblique du jour',date:today,type:'lecture',module:'parcours'});
  return reply({ok:true,nom:text(u.nom),ficheLiee:!!u.membreId,evenements,formations,annonces,taches,rappels,preferences:s.preferences,parcours:s.parcours});
 }
 if(path==='/api/recuperations'){
  if(u.niveau<2)return fail('Réservé aux administrateurs.',403);
  if(req.method==='GET'){
   const rows=(await env.DB.prepare('SELECT id,email,cree,statut FROM portail_recuperations ORDER BY cree DESC LIMIT 100').all()).results||[];
   return reply({ok:true,demandes:rows.filter(r=>u.niveau>=3||!owners.includes(r.email))});
  }
  if(req.method!=='PATCH')return fail('Méthode refusée.',405);
  const b=await req.json();if(!['traitee','en_attente'].includes(b.statut))return fail('Statut invalide.');
  const r=await env.DB.prepare('SELECT email FROM portail_recuperations WHERE id=?').bind(text(b.id,100)).first();
  if(!r)return fail('Demande introuvable.',404);if(owners.includes(r.email)&&u.niveau<3)return fail('Réservé au propriétaire.',403);
  await env.DB.prepare('UPDATE portail_recuperations SET statut=? WHERE id=?').bind(b.statut,b.id).run();await portalAudit(env,u,'recuperations',b.statut);return reply({ok:true});
 }
 if(path==='/api/journal-administratif'){
  if(u.niveau<2)return fail('Réservé aux administrateurs.',403);if(req.method!=='GET')return fail('Méthode refusée.',405);
  const rows=(await env.DB.prepare('SELECT a.id,a.acteur,a.rubrique,a.operation,a.cree,c.nom FROM portail_audit a LEFT JOIN comptes c ON c.id=a.acteur ORDER BY a.cree DESC LIMIT 100').all()).results||[];
  return reply({ok:true,actions:rows.filter(r=>u.niveau>=3||!['prieres_conf','suivi'].includes(r.rubrique))});
 }
 const personnel=path==='/api/temoignages-personnels';
 if(!personnel&&u.niveau<1)return fail('Réservé aux responsables.',403);
 if(req.method==='GET'){
  const rows=await list('temoignages_soumis');return reply({ok:true,temoignages:rows.filter(x=>!personnel||x.data.auteurId===u.id).map(x=>({id:x.id,texte:x.data.texte,auteur:x.data.auteur,statut:x.data.statut,creeLe:x.data.creeLe}))});
 }
 const b=await req.json();
 if(personnel&&req.method==='POST'){
  if(b.consentement!==true||!text(b.texte,2000))return fail('Écrivez votre témoignage et confirmez votre accord pour sa publication après validation.');
  if(await blocked('temoignage:'+u.id,5))return fail('Trop de témoignages envoyés. Réessayez plus tard.',429);await count('temoignage:'+u.id);
  const id=crypto.randomUUID();await write('set','temoignages_soumis/'+id,{texte:text(b.texte,2000),auteurId:u.id,auteur:text(u.nom||'Un membre SDE'),statut:'en_attente',consentement:true,creeLe:Date.now()});return reply({ok:true});
 }
 if(!personnel&&req.method==='PATCH'){
  if(!['publie','refuse'].includes(b.statut))return fail('Décision invalide.');
  const all=await list('temoignages_soumis'),r=all.find(x=>x.id===b.id);if(!r)return fail('Témoignage introuvable.',404);
  if(b.statut==='publie'){if(r.data.consentement!==true)return fail('Accord de publication absent.');await write('set','annonces/temoignage-'+r.id,{type:'temoignage',titre:'Témoignage',auteur:r.data.auteur,contenu:r.data.texte,texte:r.data.texte,publie:true,creeLe:Date.now(),creePar:u.id})}
  await write('update','temoignages_soumis/'+r.id,{statut:b.statut,moderePar:u.id,modereLe:Date.now()});await portalAudit(env,u,'temoignages',b.statut);return reply({ok:true});
 }
 return fail('Méthode refusée.',405);
}
