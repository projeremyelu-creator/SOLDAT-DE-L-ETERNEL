import {rmSync} from 'node:fs';
import {build} from 'esbuild';
await build({entryPoints:['frontend/experience.jsx'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'public/vitrine/sde-experience.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
console.log('Interface React SDE compilée.');

rmSync('public/vitrine/operations-assets',{recursive:true,force:true});
await build({entryPoints:['frontend/operations-entry.jsx'],bundle:true,minify:true,splitting:true,format:'esm',target:['es2020'],outdir:'public/vitrine/operations-assets',entryNames:'portail-operations',chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
