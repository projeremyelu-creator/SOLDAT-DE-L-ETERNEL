/* Validation par empreinte / Face ID / schéma de l'appareil (WebAuthn, « passkeys »).
   Le site ne reçoit, ne voit et ne stocke AUCUNE donnée biométrique : l'appareil
   vérifie la personne et signe un défi ; le serveur ne garde que l'identifiant
   et la clé publique de l'appareil.
   Usages : se connecter sans mot de passe ; confirmer son identité avant d'afficher
   un QR de présence de courte durée (preuve valable 10 minutes). */
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'private, no-store',...headers}});
const fail=(message,status=400)=>json({ok:false,message},status);
const enc=new TextEncoder();
export const DEFI_MINUTES=5;
export const PREUVE_MINUTES=10;
export const PASSKEYS_MAX=5;
export const b64u={
 enc:bytes=>{let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
 dec:s=>{if(typeof s!=='string'||!/^[A-Za-z0-9_-]*$/.test(s)||s.length>8192)throw new Error('b64');const p=s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0));}
};
const sha256=async data=>new Uint8Array(await crypto.subtle.digest('SHA-256',data));
const egal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
async function ensure(env){
 for(const sql of [
  'CREATE TABLE IF NOT EXISTS sde_passkeys (id TEXT PRIMARY KEY,compte TEXT NOT NULL,email TEXT NOT NULL,cle TEXT NOT NULL,algo INTEGER NOT NULL,compteur INTEGER NOT NULL DEFAULT 0,nom TEXT NOT NULL DEFAULT \'\',cree INTEGER NOT NULL,derniere INTEGER)',
  'CREATE INDEX IF NOT EXISTS sde_passkeys_compte ON sde_passkeys(compte)',
  'CREATE TABLE IF NOT EXISTS sde_passkey_defis (defi TEXT PRIMARY KEY,compte TEXT,usage TEXT NOT NULL,expire INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sde_passkey_preuves (hash TEXT PRIMARY KEY,compte TEXT NOT NULL,expire INTEGER NOT NULL)'
 ])await env.DB.prepare(sql).run();
}
/* ───── analyse et vérification (fonctions pures, testées avec de vraies clés) ───── */
export function lireAuthData(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<37)throw new Error('authData');
 const flags=bytes[32];
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const r={rpIdHash:bytes.slice(0,32),flags,presence:!!(flags&1),verification:!!(flags&4),attesté:!!(flags&64),compteur:dv.getUint32(33,false),credentialId:null};
 if(r.attesté){
  if(bytes.length<55)throw new Error('authData');
  const n=dv.getUint16(53,false);
  if(n<1||n>1023||bytes.length<55+n)throw new Error('authData');
  r.credentialId=bytes.slice(55,55+n);
 }
 return r;
}
export function signatureDerVersBrute(der,taille=32){
 const d=new Uint8Array(der);
 if(d[0]!==0x30)throw new Error('der');
 let i=2;if(d[1]&0x80)i=2+(d[1]&0x7f);
 const lire=()=>{
  if(d[i]!==0x02)throw new Error('der');
  const n=d[i+1];let v=d.slice(i+2,i+2+n);i+=2+n;
  while(v.length>taille&&v[0]===0)v=v.slice(1);
  if(v.length>taille)throw new Error('der');
  const o=new Uint8Array(taille);o.set(v,taille-v.length);return o;
 };
 const r=lire(),s=lire(),out=new Uint8Array(taille*2);out.set(r,0);out.set(s,taille);return out;
}
export async function importerCle(spki,algo){
 if(algo===-7)return crypto.subtle.importKey('spki',spki,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(algo===-257)return crypto.subtle.importKey('spki',spki,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 throw new Error('algo');
}
export async function verifierSignature({spki,algo,authData,clientDataJSON,signature}){
 const cle=await importerCle(spki,algo);
 const donnees=new Uint8Array([...authData,...await sha256(clientDataJSON)]);
 if(algo===-7)return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},cle,signatureDerVersBrute(signature),donnees);
 return crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5'},cle,signature,donnees);
}
/* Vérifie type, défi et origine du clientDataJSON. */
export function controlerClientData(clientDataJSON,{type,defi,origin}){
 let c;try{c=JSON.parse(new TextDecoder().decode(clientDataJSON));}catch{throw new Error('clientData');}
 if(c.type!==type||c.challenge!==defi||c.origin!==origin||c.crossOrigin===true)throw new Error('clientData');
 return c;
}
async function controlerAuthData(authData,rpId,exigerVerification=true){
 const a=lireAuthData(authData);
 if(!egal(a.rpIdHash,await sha256(enc.encode(rpId))))throw new Error('rp');
 if(!a.presence||(exigerVerification&&!a.verification))throw new Error('flags');
 return a;
}
/* ───── défis à usage unique ───── */
async function creerDefi(env,compte,usage){
 const defi=b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
 const t=Date.now();
 await env.DB.prepare('DELETE FROM sde_passkey_defis WHERE expire<?').bind(t).run();
 await env.DB.prepare('INSERT INTO sde_passkey_defis(defi,compte,usage,expire) VALUES(?,?,?,?)').bind(defi,compte||null,usage,t+DEFI_MINUTES*60000).run();
 return defi;
}
async function consommerDefi(env,defi,usage,compte){
 if(typeof defi!=='string'||defi.length>100)return false;
 const l=await env.DB.prepare('SELECT compte,usage,expire FROM sde_passkey_defis WHERE defi=?').bind(defi).first();
 if(!l||l.usage!==usage||l.expire<Date.now()||(compte!==undefined&&(l.compte||null)!==(compte||null)))return false;
 const r=await env.DB.prepare('DELETE FROM sde_passkey_defis WHERE defi=?').bind(defi).run();
 return (r?.meta?.changes??1)===1;
}
/* ───── preuve d'identité de courte durée (QR de présence) ───── */
export async function preuveValide(env,compte,jeton){
 if(typeof jeton!=='string'||!/^[A-Za-z0-9_-]{20,80}$/.test(jeton))return false;
 try{
  await ensure(env);
  const h=b64u.enc(await sha256(enc.encode(jeton)));
  const l=await env.DB.prepare('SELECT compte,expire FROM sde_passkey_preuves WHERE hash=?').bind(h).first();
  return !!l&&l.compte===compte&&l.expire>Date.now();
 }catch{return false;}
}
const texteCourt=(v,max)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
export async function passkeysApi(req,env,u,services){
 const url=new URL(req.url),path=url.pathname;
 if(path!=='/api/passkeys'&&!path.startsWith('/api/passkeys/'))return null;
 const rpId=url.hostname,origin=url.origin,m=req.method;
 await ensure(env);
 const ip=services.ip(req);
 /* ── connexion (publique) ── */
 if(path==='/api/passkeys/connexion/options'&&m==='POST'){
  if(await services.blocked('pk-opt:'+ip,40))return fail('Trop d’essais. Patientez quelques minutes.',429);
  await services.count('pk-opt:'+ip);
  const defi=await creerDefi(env,null,'connexion');
  return json({ok:true,publicKey:{challenge:defi,rpId,timeout:60000,userVerification:'required',allowCredentials:[]}});
 }
 if(path==='/api/passkeys/connexion'&&m==='POST'){
  if(await services.blocked('pk-conn:'+ip,20))return fail('Trop d’essais. Patientez quelques minutes.',429);
  const refus=async()=>{await services.count('pk-conn:'+ip);return fail('Cette empreinte ne permet pas de vous connecter. Utilisez votre matricule et votre mot de passe.',401);};
  const b=await req.json().catch(()=>null);
  try{
   if(!b)throw new Error('corps');
   const id=typeof b.id==='string'&&/^[A-Za-z0-9_-]{16,1400}$/.test(b.id)?b.id:null;if(!id)throw new Error('id');
   const cle=await env.DB.prepare('SELECT * FROM sde_passkeys WHERE id=?').bind(id).first();if(!cle)throw new Error('inconnue');
   const clientDataJSON=b64u.dec(b.clientDataJSON),authData=b64u.dec(b.authenticatorData),signature=b64u.dec(b.signature);
   const c=controlerClientData(clientDataJSON,{type:'webauthn.get',defi:b.defi,origin});
   if(!await consommerDefi(env,c.challenge,'connexion'))throw new Error('défi');
   const a=await controlerAuthData(authData,rpId);
   if(!await verifierSignature({spki:b64u.dec(cle.cle),algo:cle.algo,authData,clientDataJSON,signature}))throw new Error('signature');
   if((a.compteur>0||cle.compteur>0)&&a.compteur<=cle.compteur)throw new Error('compteur');
   const compte=await env.DB.prepare('SELECT email FROM comptes WHERE id=? AND email=?').bind(cle.compte,cle.email).first();if(!compte)throw new Error('compte');
   await env.DB.prepare('UPDATE sde_passkeys SET compteur=?,derniere=? WHERE id=?').bind(a.compteur,Date.now(),id).run();
   return json({ok:true},200,{'set-cookie':await services.ouvrirSession(compte.email)});
  }catch{return refus();}
 }
 /* ── tout le reste exige une session ── */
 if(!u.connecte)return fail('Connectez-vous pour gérer votre empreinte.',401);
 if(path==='/api/passkeys'&&m==='GET'){
  const {results}=await env.DB.prepare('SELECT id,nom,cree,derniere FROM sde_passkeys WHERE compte=? ORDER BY cree').bind(u.id).all();
  return json({passkeys:(results||[]).map(p=>({id:p.id,nom:p.nom||'Cet appareil',cree:Number(p.cree),derniere:p.derniere?Number(p.derniere):null})),max:PASSKEYS_MAX});
 }
 if(path==='/api/passkeys/creation/options'&&m==='POST'){
  const {results}=await env.DB.prepare('SELECT id FROM sde_passkeys WHERE compte=?').bind(u.id).all();
  if((results||[]).length>=PASSKEYS_MAX)return fail('Vous avez atteint le maximum de '+PASSKEYS_MAX+' appareils. Retirez-en un avant d’en ajouter.',409);
  const defi=await creerDefi(env,u.id,'creation');
  return json({ok:true,publicKey:{challenge:defi,rp:{id:rpId,name:'Mouvement SDE'},user:{id:b64u.enc(enc.encode(u.id)),name:u.matricule||u.email,displayName:u.nom||'Membre SDE'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{userVerification:'required',residentKey:'preferred',authenticatorAttachment:'platform'},excludeCredentials:(results||[]).map(p=>({type:'public-key',id:p.id})),timeout:60000,attestation:'none'}});
 }
 if(path==='/api/passkeys/creation'&&m==='POST'){
  const b=await req.json().catch(()=>null);
  try{
   if(!b)throw new Error('corps');
   const id=typeof b.id==='string'&&/^[A-Za-z0-9_-]{16,1400}$/.test(b.id)?b.id:null;if(!id)throw new Error('id');
   const algo=Number(b.algo);if(![-7,-257].includes(algo))throw new Error('algo');
   const clientDataJSON=b64u.dec(b.clientDataJSON),authData=b64u.dec(b.authenticatorData),spki=b64u.dec(b.publicKey);
   const c=controlerClientData(clientDataJSON,{type:'webauthn.create',defi:b.defi,origin});
   if(!await consommerDefi(env,c.challenge,'creation',u.id))throw new Error('défi');
   const a=await controlerAuthData(authData,rpId);
   if(!a.credentialId||b64u.enc(a.credentialId)!==id)throw new Error('credential');
   await importerCle(spki,algo);
   const {results}=await env.DB.prepare('SELECT id FROM sde_passkeys WHERE compte=?').bind(u.id).all();
   if((results||[]).length>=PASSKEYS_MAX)return fail('Vous avez atteint le maximum de '+PASSKEYS_MAX+' appareils.',409);
   if(await env.DB.prepare('SELECT 1 AS x FROM sde_passkeys WHERE id=?').bind(id).first())return fail('Cet appareil est déjà enregistré.',409);
   await env.DB.prepare('INSERT INTO sde_passkeys(id,compte,email,cle,algo,compteur,nom,cree) VALUES(?,?,?,?,?,?,?,?)').bind(id,u.id,u.email,b64u.enc(spki),algo,a.compteur,texteCourt(b.nom,40)||'Cet appareil',Date.now()).run();
   return json({ok:true});
  }catch{return fail('L’enregistrement de l’empreinte n’a pas pu être vérifié. Réessayez.');}
 }
 const sup=path.match(/^\/api\/passkeys\/([A-Za-z0-9_-]{16,1400})$/);
 if(sup&&m==='DELETE'){
  const r=await env.DB.prepare('DELETE FROM sde_passkeys WHERE id=? AND compte=?').bind(sup[1],u.id).run();
  if((r?.meta?.changes??1)<1)return fail('Appareil introuvable.',404);
  return json({ok:true});
 }
 if(path==='/api/passkeys/presence/options'&&m==='POST'){
  const {results}=await env.DB.prepare('SELECT id FROM sde_passkeys WHERE compte=?').bind(u.id).all();
  if(!(results||[]).length)return fail('Activez d’abord l’empreinte sur cet appareil.',409);
  const defi=await creerDefi(env,u.id,'presence');
  return json({ok:true,publicKey:{challenge:defi,rpId,timeout:60000,userVerification:'required',allowCredentials:(results||[]).map(p=>({type:'public-key',id:p.id}))}});
 }
 if(path==='/api/passkeys/presence'&&m==='POST'){
  if(await services.blocked('pk-pres:'+u.id,20))return fail('Trop d’essais. Patientez quelques minutes.',429);
  const b=await req.json().catch(()=>null);
  try{
   if(!b)throw new Error('corps');
   const id=typeof b.id==='string'&&/^[A-Za-z0-9_-]{16,1400}$/.test(b.id)?b.id:null;if(!id)throw new Error('id');
   const cle=await env.DB.prepare('SELECT * FROM sde_passkeys WHERE id=? AND compte=?').bind(id,u.id).first();if(!cle)throw new Error('inconnue');
   const clientDataJSON=b64u.dec(b.clientDataJSON),authData=b64u.dec(b.authenticatorData),signature=b64u.dec(b.signature);
   const c=controlerClientData(clientDataJSON,{type:'webauthn.get',defi:b.defi,origin});
   if(!await consommerDefi(env,c.challenge,'presence',u.id))throw new Error('défi');
   const a=await controlerAuthData(authData,rpId);
   if(!await verifierSignature({spki:b64u.dec(cle.cle),algo:cle.algo,authData,clientDataJSON,signature}))throw new Error('signature');
   if((a.compteur>0||cle.compteur>0)&&a.compteur<=cle.compteur)throw new Error('compteur');
   await env.DB.prepare('UPDATE sde_passkeys SET compteur=?,derniere=? WHERE id=?').bind(a.compteur,Date.now(),id).run();
   const jeton=b64u.enc(crypto.getRandomValues(new Uint8Array(24))),expire=Date.now()+PREUVE_MINUTES*60000;
   await env.DB.prepare('DELETE FROM sde_passkey_preuves WHERE expire<?').bind(Date.now()).run();
   await env.DB.prepare('INSERT INTO sde_passkey_preuves(hash,compte,expire) VALUES(?,?,?)').bind(b64u.enc(await sha256(enc.encode(jeton))),u.id,expire).run();
   return json({ok:true,preuve:jeton,expire});
  }catch{await services.count('pk-pres:'+u.id);return fail('La confirmation par empreinte a échoué.',401);}
 }
 return fail('Introuvable.',404);
}
