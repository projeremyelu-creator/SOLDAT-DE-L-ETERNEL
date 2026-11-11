/* Optimisation non destructive des archives affichées dans les galeries mobiles.
 * Les originaux restent disponibles pour consultation plein format.
 * Ce script tourne AVANT la construction Cloudflare (ImageMagick présent en CI).
 */
import {spawnSync} from "node:child_process";
import {existsSync,statSync,renameSync,rmSync} from "node:fs";
const base="public/vitrine/media/archives-2027/";
const sources=[
 ["action-humanitaire.jpg","action-humanitaire-optimise.webp"],
 ["polos-sde-vert-blanc.png","polos-sde-vert-blanc-optimise.webp"],
 ["polos-sde-or-blanc.jpg","polos-sde-or-blanc-optimise.webp"],
 ["tenues-sde-portees.jpg","tenues-sde-portees-optimise.webp"]
];
let total=0,saved=0;
for(const [file,target] of sources){
 const input=base+file,output=base+target,tmp=output+".tmp.webp";
 if(!existsSync(input))throw Error("Archive officielle introuvable : "+file);
 const inputSize=statSync(input).size;
 let ok=false;
 // FFmpeg (fourni par les runners GitHub) est un moteur WebP de repli,
 // sans commande APT ni remplacement des fichiers sources.
 for(const binary of ["magick","convert","ffmpeg"]){
  const args=binary==="ffmpeg"
   ?["-hide_banner","-loglevel","error","-y","-i",input,
     "-vf","scale=960:960:force_original_aspect_ratio=decrease:flags=lanczos",
     "-frames:v","1","-c:v","libwebp","-quality","72","-compression_level","6",tmp]
   :[input,"-auto-orient","-resize","960x960>","-strip","-quality","72",tmp];
  const process=spawnSync(binary,args,{timeout:45000,encoding:"utf8"});
  if(process.status===0&&existsSync(tmp)){
   const outputSize=statSync(tmp).size;
   if(outputSize>=2500&&outputSize<inputSize){
    renameSync(tmp,output);ok=true;break;
   }
  }
  rmSync(tmp,{force:true});
 }
 if(!ok)throw Error("Impossible de produire un WebP réellement plus léger pour "+file);
 total+=inputSize;saved+=statSync(output).size;
}
console.log("ARCHIVES_SDE_OPTIMISEES "+JSON.stringify({sources:sources.length,originalBytes:total,webpBytes:saved,reductionPercent:Math.round((1-saved/total)*100)}));
