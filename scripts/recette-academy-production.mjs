// Recette réelle en lecture seule exécutée après le déploiement Cloudflare.
// Ne requiert aucun compte, secret, cookie ni écriture dans les données membres.
import {pathToFileURL} from 'node:url';
import {CONTROLES,recetteProduction} from './recette-production.mjs';

export const CONTROLES_ACADEMY=Object.freeze(CONTROLES.filter(c=>c.type.startsWith('academy-')));

export async function recetteAcademyProduction(options={}){
 return recetteProduction({controles:CONTROLES_ACADEMY,essais:4,timeoutMs:12000,...options});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const bilan=await recetteAcademyProduction({rapport:r=>{
  console.log((r.ok?'OK':'ÉCHEC')+' '+r.domaine+r.path+(r.ok?'':' : '+r.erreur));
 }});
 console.log('Recette réelle Soldiers Academy : '+bilan.reussis+'/'+bilan.total+' vérifications');
 if(!bilan.ok)process.exitCode=1;
}
