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

// Refonte définitive : installer le thème Citadelle après TOUS les styles historiques.
// Ne jamais retirer le JS métier, l'authentification, les albums ni les permissions.
const citadelStylePath = '/vitrine/sde-citadelle-celeste-2027.css';
const citadelScriptPath = '/vitrine/sde-citadelle-celeste-2027.js';
const referenceStylePath = '/vitrine/sde-citadelle-reference-v4.css';
function installerCitadelleFinale(html){
 if (!/<html\b/i.test(html) || !/(<\/head>|<body\b)/i.test(html)) return html;
 html=html.replace(/<link\b[^>]*href=["']\/vitrine\/sde-citadelle-celeste-2027\.css[^"']*["'][^>]*>\s*/gi,'');
 html=html.replace(/<script\b[^>]*src=["']\/vitrine\/sde-citadelle-celeste-2027\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,'');
 html=html.replace(/<html\b/i,'<html data-sde-citadel-integral="v4"');
 const links='<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>\n'+
 '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'+
 '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'+
 '<link rel="stylesheet" href="'+citadelStylePath+'?v='+revision+'">\n'+
 '<script defer src="'+citadelScriptPath+'?v='+revision+'"></script>\n'+
 '<link rel="stylesheet" href="'+referenceStylePath+'?v='+revision+'">\n';
 // L'application native utilise un <head> implicite et contient un <\/head> DANS une
 // chaîne JavaScript de sauvegarde hors-ligne. Ne jamais insérer le thème dans
 // cette chaîne : construire un véritable head juste avant le splash initial.
 if (/^\s*<!doctype html>\s*<html[^>]*>\s*<meta/i.test(html) && html.includes('<div class="sde-splash"')) {
   html=html.replace(/(<html\b[^>]*>)/i,'$1\n<head>');
   // Charger les styles après la dernière feuille privée mais AVANT le script
   // de palette, sans interrompre le gabarit HTML stocké dans le JS métier.
   html=html.replace('<script>/* Palette des espaces privés',links+'<script>/* Palette des espaces privés');
   return html.replace(/(?=<div class="sde-splash")/,'</head>\n<body>\n');
 }
 if (html.includes('</head>')) return html.replace('</head>',links+'</head>');
 return html.replace(/<body\b/i,links+'<body');
}

versionnerHtml('public');
// Les pages publiques et privées sont publiées depuis le même répertoire Cloudflare.
function integrerToutesPages(dossier){
 for(const entree of readdirSync(dossier,{withFileTypes:true})){
  const chemin=`${dossier}/${entree.name}`;
  if(entree.isDirectory())integrerToutesPages(chemin);
  else if(entree.isFile()&&entree.name.endsWith('.html')&&!/offline/i.test(entree.name)){
   const actuel=readFileSync(chemin,'utf8');const final=installerCitadelleFinale(actuel);
   if(final!==actuel)writeFileSync(chemin,final);
  }
 }
}
integrerToutesPages('public');
console.log('Citadelle Céleste v3 installée sur tous les HTML publics et privés, sans toucher aux albums.');
console.log(`URLs CSS/JavaScript versionnées pour ${revision}.`);
