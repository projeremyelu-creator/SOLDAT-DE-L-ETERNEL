/*
 * Création d'une affiche mobile plus légère sans toucher à l'original officiel.
 * Exécuté avant la publication Worker/ASSETS. La source reste la solution de
 * repli pour les environnements où ffmpeg / ImageMagick est indisponible.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync,existsSync,statSync,renameSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const source='public/vitrine/illus/tpa-2026.webp';
const cible='public/vitrine/illus/tpa-2026-mobile.webp';
const tmp='public/vitrine/illus/tpa-2026-mobile.tmp.webp';
if(!existsSync(source))throw new Error('Affiche officielle TPA introuvable');
const original=statSync(source).size;
// La version mobile optimisée du dépôt reste valable si les outils externes
// sont momentanément indisponibles ; ne pas l'écraser par une copie plus lourde.
const mobilePrebuilt=existsSync(cible)?statSync(cible).size:Infinity;
const methods=[
 ['ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,
  '-vf','scale=480:-2:flags=lanczos','-frames:v','1','-c:v','libwebp',
  '-lossless','0','-quality','68','-compression_level','6',tmp]],
 ['magick',[source,'-resize','480x480>','-strip','-quality','68',tmp]],
 ['convert',[source,'-resize','480x480>','-strip','-quality','68',tmp]],
 [process.execPath,['scripts/encoder-webp-chrome.mjs',source,tmp,'480','480','68']]
];
let success=false,engine='source';
const failures=[];
for(const [binary,args] of methods){
 const run=spawnSync(binary,args,{encoding:'utf8',timeout:45000});
 if(run.status===0&&existsSync(tmp)&&statSync(tmp).size>2000&&statSync(tmp).size<original){
  renameSync(tmp,cible);success=true;engine=binary;break;
 }
 failures.push({outil:binary,code:run.status,erreur:run.error?.code||String(run.stderr||'').slice(0,120)});
 rmSync(tmp,{force:true});
}
if(!success){
 if(mobilePrebuilt>2000&&mobilePrebuilt<original){
  engine='prebuilt';
  success=true;
 }else copyFileSync(source,cible);
}
const bytes=statSync(cible).size;
console.log('AFFICHE_TPA_MOBILE '+JSON.stringify({engine,originalBytes:original,mobileBytes:bytes,reductionPercent:Math.round((1-bytes/original)*100),fallback:!success,failures:success?[]:failures}));
