/* Empreinte / Face ID (WebAuthn) côté portail React. Rien de biométrique ne quitte l'appareil. */
const dec=s=>{const p=s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0)).buffer};
export const enc=buf=>{let s='';for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
export const empreinteDisponible=()=>typeof window!=='undefined'&&!!window.PublicKeyCredential&&!!navigator.credentials&&!!navigator.credentials.get;
const PREUVE_CLE='sde-preuve-identite';
/* La preuve (10 minutes) reste dans l'onglet : jamais dans l'URL ni dans un stockage durable. */
export function preuveActuelle(){
 try{const v=JSON.parse(sessionStorage.getItem(PREUVE_CLE)||'null');return v&&typeof v.jeton==='string'&&v.expire>Date.now()?v.jeton:''}catch{return ''}
}
export function memoriserPreuve(jeton,expire){try{sessionStorage.setItem(PREUVE_CLE,JSON.stringify({jeton,expire}))}catch{/* l'onglet garde la preuve en mémoire de page seulement */}}
/* Demande à l'appareil de confirmer l'identité (empreinte, visage ou code de l'appareil). */
export async function confirmerIdentite(api){
 const {publicKey}=await api('/api/passkeys/presence/options','POST',{});
 const options={...publicKey,challenge:dec(publicKey.challenge),allowCredentials:(publicKey.allowCredentials||[]).map(c=>({...c,id:dec(c.id)}))};
 const cred=await navigator.credentials.get({publicKey:options});
 const r=cred.response;
 const reponse=await api('/api/passkeys/presence','POST',{defi:publicKey.challenge,id:enc(cred.rawId),clientDataJSON:enc(r.clientDataJSON),authenticatorData:enc(r.authenticatorData),signature:enc(r.signature)});
 memoriserPreuve(reponse.preuve,reponse.expire);
 return reponse;
}
export const messageErreurEmpreinte=e=>e&&e.name==='NotAllowedError'?'Confirmation annulée. Vous pouvez réessayer.':(e&&e.message)||'La confirmation par empreinte a échoué.';
