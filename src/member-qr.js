/* QR de présence : signature serveur, session obligatoire, scan réservé aux responsables. */
const reply=(d,status=200)=>Response.json(d,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>reply({ok:false,message},status);
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
async function key(env,create=false){
 if(create)await env.DB.prepare('INSERT OR IGNORE INTO meta(cle,val) VALUES(?,?)').bind('member_qr_key',b64(crypto.getRandomValues(new Uint8Array(32)))).run();
 const row=await env.DB.prepare('SELECT val FROM meta WHERE cle=?').bind('member_qr_key').first();
 return row?crypto.subtle.importKey('raw',bytes(row.val),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']):null;
}
async function member(env,account,mid){
 const c=await env.DB.prepare('SELECT membreId FROM comptes WHERE id=?').bind(account).first();
 if(!safeId(mid)||c?.membreId!==mid)return null;
 const r=await env.DB.prepare('SELECT data FROM docs WHERE path=?').bind('membres/'+mid).first();
 const m=r?JSON.parse(r.data):null;return m&&m.actif!==false?m:null;
}
export async function qrBackup(env){await ensure(env);return (await env.DB.prepare('SELECT * FROM pointages_qr').all()).results||[]}
async function ensure(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS pointages_qr(id TEXT PRIMARY KEY,evenement TEXT NOT NULL,membre TEXT NOT NULL,acteur TEXT NOT NULL,cree INTEGER NOT NULL)').run()}
export async function memberQrApi(req,env,u){
 const path=new URL(req.url).pathname;if(!['/api/ma-carte-qr','/api/pointage-qr'].includes(path))return null;
 if(!u.connecte)return fail('Connectez-vous pour ouvrir votre espace.',401);
 if(path==='/api/ma-carte-qr'){
  if(req.method!=='GET')return fail('GET uniquement.',405);
  const m=await member(env,u.id,u.membreId);if(!m)return fail('Aucune fiche membre active reliée à ce compte.',404);
  const expire=Date.now()+7*86400000,payload=b64(enc.encode(JSON.stringify({c:u.id,m:u.membreId,x:expire}))),k=await key(env,true);
  const signature=b64(await crypto.subtle.sign('HMAC',k,enc.encode(payload)));
  return reply({code:'SDE1.'+payload+'.'+signature,expire,nom:[m.prenoms,m.nom].filter(Boolean).join(' ')||u.nom,matricule:m.matricule||u.matricule||''});
 }
 if(u.niveau<1)return fail('Pointage réservé aux responsables.',403);
 await ensure(env);
 if(req.method==='GET'){
  const today=new Date().toISOString().slice(0,10);
  const events=(await env.DB.prepare("SELECT id,data FROM docs WHERE parent='evenements'").all()).results||[];
  const evenements=events.map(e=>({...JSON.parse(e.data),id:e.id})).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.date<=today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,50).map(e=>({id:e.id,titre:String(e.titre||'Rencontre').slice(0,140),date:e.date}));
  const rows=(await env.DB.prepare("SELECT q.id,q.cree,q.evenement,m.data AS fiche,e.data AS rencontre FROM pointages_qr q LEFT JOIN docs m ON m.path='membres/'||q.membre LEFT JOIN docs e ON e.path='evenements/'||q.evenement ORDER BY q.cree DESC LIMIT 20").all()).results||[];
  return reply({evenements,activites:rows.map(r=>{const m=r.fiche?JSON.parse(r.fiche):{},e=r.rencontre?JSON.parse(r.rencontre):{};return {id:r.id,cree:r.cree,nom:[m.prenoms,m.nom].filter(Boolean).join(' ')||'Membre',rencontre:String(e.titre||'Rencontre').slice(0,140)}})});
 }
 if(req.method!=='POST')return fail('Méthode refusée.',405);
 const b=await req.json();if(!safeId(b.evenement)||typeof b.code!=='string'||b.code.length>1200)return fail('Choisissez une rencontre et un QR SDE valide.');
 let claim;
 try{
  const parts=b.code.split('.');if(parts.length!==3||parts[0]!=='SDE1')throw Error();
  const k=await key(env);if(!k||!await crypto.subtle.verify('HMAC',k,bytes(parts[2]),enc.encode(parts[1])))throw Error();
  claim=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  if(!Number.isFinite(claim.x)||claim.x<=Date.now()||claim.x>Date.now()+7*86400000+60000)throw Error();
 }catch{return fail('Ce QR est invalide ou expiré. Demandez au membre de rouvrir sa carte.')}
 const m=await member(env,claim.c,claim.m);if(!m)return fail('Cette carte n’est plus liée à un membre actif.');
 const event=await env.DB.prepare('SELECT data FROM docs WHERE path=?').bind('evenements/'+b.evenement).first();
 if(!event)return fail('Rencontre introuvable.',404);
 const e=JSON.parse(event.data),today=new Date().toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')||e.date>today)return fail('Le pointage est disponible le jour de la rencontre ou après.');
 const jsonPath='$.presents."'+claim.m+'"',now=Date.now();
 const result=await env.DB.batch([
  env.DB.prepare("UPDATE docs SET data=json_set(data,'$.presents',json_set(CASE WHEN json_type(data,'$.presents')='object' THEN json_extract(data,'$.presents') ELSE '{}' END,?,json('true'))),version=version+1,maj=? WHERE path=? AND COALESCE(json_extract(data,?),0) NOT IN (1,'retard')").bind('$."'+claim.m+'"',now,'evenements/'+b.evenement,jsonPath),
  env.DB.prepare('INSERT INTO pointages_qr(id,evenement,membre,acteur,cree) SELECT ?,?,?,?,? WHERE changes()>0').bind(crypto.randomUUID(),b.evenement,claim.m,u.id,now),
  env.DB.prepare("INSERT INTO revs(parent,rev) VALUES('evenements',1) ON CONFLICT(parent) DO UPDATE SET rev=rev+1")
 ]);
 return reply({ok:true,deja:!result[0]?.meta?.changes,nom:[m.prenoms,m.nom].filter(Boolean).join(' ')||'Membre',rencontre:String(e.titre||'Rencontre').slice(0,140)});
}
