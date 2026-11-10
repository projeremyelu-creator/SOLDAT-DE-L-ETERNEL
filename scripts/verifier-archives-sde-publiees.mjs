/* Vérification en lecture seule des miniatures WebP SDE réellement publiées.
 * Les originaux sont conservés ; les optimisations sont strictement plus petites.
 */
import {pathToFileURL} from "node:url";
import {statSync,existsSync} from "node:fs";
const base="/vitrine/media/archives-2027/";
export const originaux=["action-humanitaire.jpg","polos-sde-vert-blanc.png","polos-sde-or-blanc.jpg","tenues-sde-portees.jpg"];
export const domaines=["https://mouvement-sde.org","https://app.mouvement-sde.org"];
export async function verifier({fetcher=fetch,domainList=domaines,checkLocal=true}={}){
 const bilan=[];
 for(const filename of originaux){
  const optimized=filename.replace(/\.(png|jpg)$/i,"-optimise.webp");
  if(checkLocal){
   const source="public"+base+filename;
   const target="public"+base+optimized;
   if(!existsSync(target)||statSync(target).size>=statSync(source).size)
    throw Error("Miniature non optimisée : "+optimized);
  }
  for(const domain of domainList){
   const address=domain+base+optimized;
   const response=await fetcher(address,{method:"HEAD",redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(12000)});
   if(response.status!==200||!/image\/webp/i.test(response.headers.get("content-type")||""))
    throw Error("Miniature absente ou type incorrect : "+domain+" "+optimized+" HTTP "+response.status);
   bilan.push({domain,optimized,ok:true});
  }
 }
 return bilan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 verifier().then(x=>console.log("ARCHIVES_WEBP_PUBLIEES "+JSON.stringify({verifications:x.length,domaines,medias:originaux.length}))).catch(e=>{
  console.error("ARCHIVES_WEBP_ECHEC "+String(e.message||e));
  process.exitCode=1;
 });
}
