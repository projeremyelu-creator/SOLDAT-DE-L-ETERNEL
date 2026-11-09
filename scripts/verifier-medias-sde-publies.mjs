/* Contrôle réel des 20 actifs média SDE 2027, uniquement si ZIP présent.
 * Protège l'annonce de publication: aucune réussite sur une vidéo 404.
 */
import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const zip=resolve(root,"Medias_SDE_2027_prets_pour_site.zip");
const domains=["https://mouvement-sde.org","https://app.mouvement-sde.org"];
const photos=[
"reunion-priere-01","reunion-priere-02","reunion-fraternelle",
"action-humanitaire","tenues-sde-portees",
"polos-sde-vert-blanc","polos-sde-or-blanc"
].map(name=>"/vitrine/media/archives-2027/"+name+".webp");
const videos=["identite-sde-expansion","livre-pouvoir-femme","archives-rassemblement"]
.map(name=>"/vitrine/media/videos-2027/"+name+".mp4");
const paths=[...photos,...videos];

export async function verifier({fetcher=fetch,domaines=domains,delai=ms=>new Promise(r=>setTimeout(r,ms)),attempts=4}={}){
 if(!existsSync(zip)){
  console.log("MEDIAS_SDE_EN_ATTENTE: le ZIP n'est pas présent dans main : aucun média public n'est annoncé.");
  return {ok:true,installed:false};
 }
 let last=[];
 for(let attempt=1;attempt<=attempts;attempt++){
  const checks=await Promise.all(domaines.flatMap(domain=>paths.map(async path=>{
   const u=domain+path+"?_sde_media="+attempt+"-"+process.env.GITHUB_SHA?.slice(0,12);
   try{
    const r=await fetcher(u,{method:"HEAD",cache:"no-store",redirect:"manual",headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(12000)});
    const expected=path.endsWith(".mp4")?"video/":"image/";
    const type=r.headers.get("content-type")||"";
    return {domain,path,status:r.status,ok:r.status===200&&type.toLowerCase().startsWith(expected),type};
   }catch(e){return {domain,path,ok:false,error:String(e.message||e)};}
  })));
  last=checks.filter(c=>!c.ok);
  if(!last.length){
   console.log("MEDIAS_SDE_PUBLICATION_VERIFIEE",JSON.stringify({domaines,photos:photos.length,videos:videos.length,attempt}));
   return {ok:true,installed:true};
  }
  console.warn("MEDIAS_SDE_EN_COURS",JSON.stringify({attempt,echecs:last.slice(0,8)}));
  if(attempt<attempts)await delai(20000);
 }
 throw Error("Médias SDE non publiés sur les deux domaines ("+last.length+" échecs) : "+JSON.stringify(last.slice(0,5)));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verifier().catch(err=>{console.error("MEDIAS_SDE_PUBLICATION_ECHEC",err.message);process.exitCode=1;});
}
