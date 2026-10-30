/* Vide le cache Cloudflare de mouvement-sde.org après chaque déploiement.
   Réutilise les mêmes identifiants que le déploiement ; n'affiche jamais de secret. */
import {deploymentEnvironment} from './deploy-cloudflare.mjs';
const ZONE='mouvement-sde.org';
async function main(){
 const env=deploymentEnvironment(process.env);
 const headers={'content-type':'application/json'};
 if(env.CLOUDFLARE_API_TOKEN)headers.authorization='Bearer '+env.CLOUDFLARE_API_TOKEN;
 else{headers['x-auth-key']=env.CLOUDFLARE_API_KEY;headers['x-auth-email']=env.CLOUDFLARE_EMAIL}
 const api=async(path,init={})=>{const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...init,headers});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error((d.errors||[]).map(e=>e.code+' '+e.message).join('; ')||('HTTP '+r.status));return d};
 const zones=await api('/zones?name='+encodeURIComponent(ZONE));
 const zone=zones.result?.[0];if(!zone)throw Error('Zone '+ZONE+' introuvable pour ces identifiants.');
 await api('/zones/'+zone.id+'/purge_cache',{method:'POST',body:JSON.stringify({purge_everything:true})});
 console.log('Cache Cloudflare vidé pour '+ZONE+'.');
}
main().catch(e=>{console.log('::warning::Vidage du cache Cloudflare impossible : '+e.message);process.exitCode=0});
