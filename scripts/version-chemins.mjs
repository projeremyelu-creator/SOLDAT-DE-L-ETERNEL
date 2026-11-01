/* Avant le déploiement : les ressources versionnées passent d'une version en paramètre (?v=)
   à une version dans le chemin (/_v/<révision>/…). Le cache Cloudflare de la zone ignore les
   paramètres : seule une adresse différente garantit que chaque publication est servie aussitôt. */
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {dirname} from 'node:path';
const rev=(process.env.GITHUB_SHA||execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim()).replace(/[^a-f0-9]/gi,'').slice(0,12)||'local';
// La révision du Worker et celle des URL HTML doivent correspondre exactement.
writeFileSync('src/build-revision.js',
  '// Généré automatiquement pendant le déploiement.' + String.fromCharCode(10) +
  'export const ASSET_REVISION = ' + JSON.stringify(rev) + ';' + String.fromCharCode(10));
const motif=/((?:src|href)=["'])\/(?!\/|_v\/)([^"'?#\s]+\.(?:js|css))\?v=[^"'\s>]*/g;
let fichiers=0,liens=0;
(function parcourir(d){for(const e of readdirSync(d,{withFileTypes:true})){const c=d+'/'+e.name;if(e.isDirectory())parcourir(c);else if(e.name.endsWith('.html')){const h=readFileSync(c,'utf8');let n=0;const h2=h.replace(motif,(m,a,p)=>{n++;return `${a}/_v/${rev}/${p}`});if(n){writeFileSync(c,h2);fichiers++;liens+=n}}}})('public');
// Les URL /_v/<revision>/ sont des chemins de fichiers REELS dans la liaison
// Cloudflare ASSETS. Un alias virtuel Worker -> /vitrine/... avait renvoyé 404
// en production et désactivé le JavaScript de la page de connexion.
// Copier aussi les chunks ESBuild importés dynamiquement (imports relatifs).
const miroir='public/_v/'+rev;
rmSync('public/_v',{recursive:true,force:true});
let actifs=0;
(function copier(dossier){
 for(const entree of readdirSync(dossier,{withFileTypes:true})){
  const src=dossier+'/'+entree.name;
  if(entree.isDirectory()){
   if(src==='public/_v')continue;
   copier(src);
  }else if(entree.isFile()&&/\.(?:js|css)$/.test(entree.name)){
   const dest=miroir+src.slice('public'.length);
   mkdirSync(dirname(dest),{recursive:true});
   copyFileSync(src,dest);
   actifs++;
  }
 }
})('public');
console.log(`Chemins versionnés /_v/${rev}/ : ${liens} lien(s) dans ${fichiers} page(s) ; ${actifs} actifs JS/CSS réellement copiés.`);
