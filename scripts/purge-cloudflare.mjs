/* Purge Cloudflare avec un jeton dédié Zone Cache Purge si configuré.
 * Le jeton Workers Deploy n'a pas forcément les droits sur les zones DNS.
 * Ne jamais afficher ni enregistrer de valeurs de secrets. */
import {pathToFileURL} from 'node:url';
import {deploymentEnvironment} from './deploy-cloudflare.mjs';
const ZONE='mouvement-sde.org';

export function configurerPurge(source){
 const dedicated=String(source.CLOUDFLARE_CACHE_PURGE_TOKEN||'').trim();
 const env=deploymentEnvironment(dedicated?{...source,CLOUDFLARE_API_TOKEN:dedicated}:source);
 const headers={'content-type':'application/json'};
 if(env.CLOUDFLARE_API_TOKEN)headers.authorization='Bearer '+env.CLOUDFLARE_API_TOKEN;
 else{headers['x-auth-key']=env.CLOUDFLARE_API_KEY;headers['x-auth-email']=env.CLOUDFLARE_EMAIL}
 const rawZone=String(source.CLOUDFLARE_ZONE_ID||'').trim();
 if(rawZone&&!/^[0-9a-f]{32}$/i.test(rawZone))throw Error('Identifiant de zone Cloudflare invalide (32 caractères hexadécimaux).');
 return {headers,zoneId:rawZone||null,tokenDedie:!!dedicated};
}
async function main(){
 const {headers,zoneId}=configurerPurge(process.env);
 const api=async(path,init={})=>{
  const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...init,headers});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.success===false){
   if(r.status===401||r.status===403||data.errors?.some(e=>[10000,10001].includes(e.code)))
    throw Error('Accès à la zone refusé. Vérifiez CLOUDFLARE_CACHE_PURGE_TOKEN (Zone → Cache Purge) et CLOUDFLARE_ZONE_ID.');
   throw Error('Échec de purge Cloudflare (HTTP '+r.status+').');
  }
  return data;
 };
 let zone=zoneId;
 if(!zone){
  const zones=await api('/zones?name='+encodeURIComponent(ZONE));
  zone=zones.result?.find(z=>z.name===ZONE)?.id;
  if(!zone)throw Error('Zone introuvable : configurez CLOUDFLARE_ZONE_ID ou la permission Zone → Read.');
 }
 await api('/zones/'+zone+'/purge_cache',{method:'POST',body:JSON.stringify({purge_everything:true})});
 console.log('Cache Cloudflare invalidé pour '+ZONE+'.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{console.log('::warning::Purge Cloudflare non effectuée : '+e.message);process.exitCode=0});
