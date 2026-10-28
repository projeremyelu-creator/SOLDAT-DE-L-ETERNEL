import {build} from 'esbuild';
await build({entryPoints:['frontend/experience.jsx'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'public/vitrine/sde-experience.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
console.log('Interface React SDE compilée.');
