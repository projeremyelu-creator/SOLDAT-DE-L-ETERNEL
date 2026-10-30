import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
await build({entryPoints:['frontend/experience.jsx'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'public/vitrine/sde-experience.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
console.log('Interface React SDE compilée.');

rmSync('public/vitrine/operations-assets',{recursive:true,force:true});
await build({entryPoints:['frontend/operations-entry.jsx'],bundle:true,minify:true,splitting:true,format:'esm',target:['es2020'],outdir:'public/vitrine/operations-assets',entryNames:'portail-operations',chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});

// Chaque publication invalide les anciennes URLs cachees de l'application et du site.
const revision=(process.env.GITHUB_SHA||execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim()).replace(/[^a-f0-9]/gi,'').slice(0,12)||'local';
function versionnerHtml(dossier){
 for(const entree of readdirSync(dossier,{withFileTypes:true})){
  const chemin=`${dossier}/${entree.name}`;
  if(entree.isDirectory())versionnerHtml(chemin);
  else if(entree.isFile()&&entree.name.endsWith('.html')){
   const html=readFileSync(chemin,'utf8');
   const actualise=html.replace(/([?&]v=)[^&"'\s<>]+/g,`$1${revision}`);
   if(actualise!==html)writeFileSync(chemin,actualise);
  }
 }
}
versionnerHtml('public');
console.log(`URLs CSS/JavaScript versionnées pour ${revision}.`);
