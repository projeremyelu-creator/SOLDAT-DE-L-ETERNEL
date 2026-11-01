import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recetteProduction,CONTROLES} from '../scripts/recette-production.mjs';

const read=p=>readFileSync(p,'utf8');

test('Les actifs sous /_v disposent du repli canonique contrôlé par MIME et révision',()=>{
 const worker=read('src/worker.js');
 assert.match(worker,/m\[1\]\.toLowerCase\(\) !== ASSET_REVISION/);
 assert.match(worker,/const r = await env\.ASSETS\.fetch\(req\)/);
 assert.ok(worker.includes('env.ASSETS.fetch(new Request(new URL(m[2],u.origin),req))'));
 assert.match(worker,/attendu\.test\(\(actif\.headers\.get\("content-type"\)/);
 assert.ok(worker.includes('"public, max-age=31536000, immutable"'));
 assert.ok(worker.includes('assetRevision:ASSET_REVISION'));
});

test('La recette distingue un Worker ancien même si une ancienne page répond HTTP 200',async()=>{
 const run=async rev=>recetteProduction({
  fetcher:async()=>Response.json({ok:true,assetRevision:rev}),
  domaines:['https://mouvement-sde.org'],
  controles:CONTROLES.filter(x=>x.type==='revision-worker'),
  essais:1,attente:async()=>{}
 });
 const previous=process.env.SDE_EXPECTED_REV;
 process.env.SDE_EXPECTED_REV='abcdef1234567890';
 try{
  const ok=await run('abcdef123456');
  assert.equal(ok.ok,true);
  const stale=await run('1234567890ab');
  assert.equal(stale.ok,false);
  assert.match(stale.resultats[0].erreur,/autre révision/);
 }finally{
  if(previous===undefined)delete process.env.SDE_EXPECTED_REV;
  else process.env.SDE_EXPECTED_REV=previous;
 }
});
