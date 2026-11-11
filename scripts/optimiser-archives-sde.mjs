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
 for(const binary of ["magick","convert","ffmpeg","chrome"]){
  const args=binary==="chrome"
   ?["scripts/encoder-webp-chrome.mjs",input,tmp,"960","960","72"]
   :binary==="ffmpeg"
   ?["-hide_banner","-loglevel","error","-y","-i",input,
     "-vf","scale=960:960:force_original_aspect_ratio=decrease:flags=lanczos",
     "-frames:v","1","-c:v","libwebp","-quality","72","-compression_level","6",tmp]
   :[input,"-auto-orient","-resize","960x960>","-strip","-quality","72",tmp];
  const result=spawnSync(binary==="chrome"?process.execPath:binary,args,{timeout:45000,encoding:"utf8"});
  if(result.status===0&&existsSync(tmp)){
   const outputSize=statSync(tmp).size;
   if(outputSize>=2500&&outputSize<inputSize){
    renameSync(tmp,output);ok=true;break;
   }
  }
  rmSync(tmp,{force:true});
 }
 if(!ok){
  // Certaines photos JPEG compressées sont déjà très petites : une tentative
  // à 960 px / qualité 72 peut produire un fichier WebP plus lourd. Réessayer
  // avec des dimensions dégressives, plutôt que bloquer tout le déploiement.
  // Les fichiers sources ne sont jamais touchés.
  const secours=[
   [720,60],[600,52],[480,45],[400,38],[320,32]
  ];
  for(const [taille,qualite] of secours){
   const args=["scripts/encoder-webp-chrome.mjs",input,tmp,
    String(taille),String(taille),String(qualite)];
   const result=spawnSync(process.execPath,args,{timeout:45000,encoding:"utf8"});
   if(result.status===0&&existsSync(tmp)){
    const bytes=statSync(tmp).size;
    if(bytes>=2000&&bytes<inputSize){
     renameSync(tmp,output);ok=true;
     console.log("ARCHIVE_WEBP_SECOURS "+JSON.stringify({source:file,taille,qualite,bytes}));
     break;
    }
   }
   rmSync(tmp,{force:true});
  }
 }
 if(!ok)throw Error("Impossible de produire un WebP réellement plus léger pour "+file);
 total+=inputSize;saved+=statSync(output).size;
}
console.log("ARCHIVES_SDE_OPTIMISEES "+JSON.stringify({sources:sources.length,originalBytes:total,webpBytes:saved,reductionPercent:Math.round((1-saved/total)*100)}));
