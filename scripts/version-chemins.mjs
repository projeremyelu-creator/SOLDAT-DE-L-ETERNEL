/* Avant le déploiement : les ressources versionnées passent d'une version en paramètre (?v=)
   à une version dans le chemin (/_v/<révision>/…). Le cache Cloudflare de la zone ignore les
   paramètres : seule une adresse différente garantit que chaque publication est servie aussitôt. */
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const rev=(process.env.GITHUB_SHA||execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim()).replace(/[^a-f0-9]/gi,'').slice(0,12)||'local';
const motif=/((?:src|href)=["'])\/(?!\/|_v\/)([^"'?#\s]+\.(?:js|css))\?v=[^"'\s>]*/g;
let fichiers=0,liens=0;
(function parcourir(d){for(const e of readdirSync(d,{withFileTypes:true})){const c=d+'/'+e.name;if(e.isDirectory())parcourir(c);else if(e.name.endsWith('.html')){const h=readFileSync(c,'utf8');let n=0;const h2=h.replace(motif,(m,a,p)=>{n++;return `${a}/_v/${rev}/${p}`});if(n){writeFileSync(c,h2);fichiers++;liens+=n}}}})('public');
console.log(`Chemins versionnés /_v/${rev}/ : ${liens} lien(s) dans ${fichiers} page(s).`);
