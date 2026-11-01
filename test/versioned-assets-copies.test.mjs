import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const revision='a1b2c3d4e5f6';
test('Versionnement : les URL HTML correspondent aux vrais fichiers JS et CSS publiables',()=>{
 const root=mkdtempSync(join(tmpdir(),'sde-version-copie-'));
 try{
  const vitr=join(root,'public','vitrine');
  const ops=join(vitr,'operations-assets');
  mkdirSync(ops,{recursive:true});
  mkdirSync(join(root,'src'),{recursive:true});
  const html='<!doctype html><link href="/vitrine/sde-experience.css?v=ancien"><script src="/vitrine/operations-assets/portail-operations.js?v=ancien"></script>';
  writeFileSync(join(vitr,'portail.html'),html);
  writeFileSync(join(vitr,'sde-experience.css'),'body{color:#000}');
  writeFileSync(join(ops,'portail-operations.js'),'import("./chunk-TEST.js");');
  writeFileSync(join(ops,'chunk-TEST.js'),'export const ok=true;');
  execFileSync(process.execPath,[resolve('scripts/version-chemins.mjs')],{
   cwd:root,env:{...process.env,GITHUB_SHA:revision+'9999'},stdio:'pipe'
  });
  const out=readFileSync(join(vitr,'portail.html'),'utf8');
  assert.ok(out.includes('/_v/'+revision+'/vitrine/sde-experience.css'));
  assert.ok(out.includes('/_v/'+revision+'/vitrine/operations-assets/portail-operations.js'));
  for(const relative of [
   'vitrine/sde-experience.css','vitrine/operations-assets/portail-operations.js',
   'vitrine/operations-assets/chunk-TEST.js'
  ])assert.ok(existsSync(join(root,'public','_v',revision,relative)),relative+' ne doit pas renvoyer 404');
  const generated=readFileSync(join(root,'src','build-revision.js'),'utf8');
  assert.ok(generated.includes(revision));
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('Le Worker prend les chemins versionnés originaux et rejette un fallback HTML',()=>{
 const s=readFileSync('src/worker.js','utf8');
 assert.ok(s.includes('m[1].toLowerCase() !== ASSET_REVISION'));
 assert.match(s,/const r = await env\.ASSETS\.fetch\(req\);[\s\S]*?const type=\(r\.headers\.get\("content-type"\)/);
 assert.match(s,/Ressource versionnée indisponible/);
 assert.match(s,/max-age=31536000, immutable/);
});
