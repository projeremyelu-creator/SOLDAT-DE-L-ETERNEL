/* Configuration VAPID à usage unique, sans stocker de secrets dans le dépôt.
   Ne modifie rien si les notifications push sont déjà configurées.
   Les clés sont transmises par stdin à Wrangler, jamais à la sortie standard. */
import {spawnSync} from 'node:child_process';
import {generateVapidKeys} from '../src/web-push.js';
import {deploymentEnvironment} from './deploy-cloudflare.mjs';

const ORIGIN='https://mouvement-sde.org';
const keyValid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{80,100}$/.test(value);
async function fetchConfigured(){
 const r=await fetch(ORIGIN+'/api/vapid-public-key',{headers:{accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(r.status!==200)throw Error('Statut public VAPID inaccessible : '+r.status);
 const data=await r.json();
 if(!data||typeof data!=='object'||!('key' in data))throw Error('Réponse VAPID inattendue');
 if(data.key!==null&&!keyValid(data.key))throw Error('Clé VAPID existante non conforme ; arrêt sans modification');
 return keyValid(data.key);
}
const configured=await fetchConfigured();
if(configured){
 console.log('VAPID_STATUS: déjà configuré — aucun secret modifié.');
 process.exit(0);
}
const protectedStatus=await fetch(ORIGIN+'/api/notifications-status',{redirect:'manual',signal:AbortSignal.timeout(12000)});
if(protectedStatus.status!==403)throw Error('Le diagnostic des notifications doit rester privé — arrêt sans modification');
const env=deploymentEnvironment(process.env);
const pair=await generateVapidKeys();
if(!keyValid(pair.publicKey)||!/^[A-Za-z0-9_-]{40,50}$/.test(pair.privateKey))throw Error('Échec de la génération VAPID');
for(const [name,secret] of Object.entries({VAPID_PUBLIC_KEY:pair.publicKey,VAPID_PRIVATE_KEY:pair.privateKey})){
 const p=spawnSync('npx',['--yes','wrangler@4.154.0','secret','put',name,'--name','sde'],{
  input:secret+'\n',env,encoding:'utf8',maxBuffer:1024*1024,timeout:150000
 });
 if(p.error||p.status!==0)throw Error('Échec enregistrement du secret '+name+' (code '+p.status+'). Aucune clé n’a été affichée.');
 console.log(name+': enregistré de manière confidentielle.');
}
let active=false;
for(let attempt=0;attempt<7;attempt++){
 try{if(await fetchConfigured()){active=true;break;}}catch(_){}
 await new Promise(r=>setTimeout(r,3000));
}
if(!active)throw Error('Clés stockées, mais activation publique VAPID non confirmée');
console.log('VAPID_STATUS: actif. Les membres devront autoriser les notifications sur leurs propres appareils.');
