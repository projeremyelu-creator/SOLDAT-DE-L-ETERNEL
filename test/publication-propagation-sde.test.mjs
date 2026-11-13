import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {revisionAttendue,verifierDomaine,attendrePublication} from '../scripts/attendre-publication-sde.mjs';
const REV='149d9548dce4';
const domain='https://mouvement-sde.org';
const respond=(url,{stale=false,missing=false}={})=>{
 const p=new URL(url).pathname;
 if(p==='/api/sante')return new Response(JSON.stringify({ok:true,assetRevision:stale?'c8b24b2ba52e':REV}),
   {status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
 if(p==='/soldier-quest')return new Response('<!doctype html><title>Quest</title><h1 id="quest-title">Soldier Quest</h1>',
   {status:missing?404:200,headers:{'content-type':'text/html'}});
 if(p==='/soldiers-tv')return new Response('<!doctype html><title>TV</title><h1 id="tv-title">Soldiers TV</h1>',
   {status:200,headers:{'content-type':'text/html'}});
 if(p==='/_v/'+REV+'/vitrine/sde-digital-universe.css')
  return new Response('/* SDE Digital Universe 2027 */',{status:200,headers:{'content-type':'text/css'}});
 throw Error('Route inconnue dans le test : '+p);
};
test('Révision attendue : SHA GitHub valide seulement',()=>{
 assert.equal(revisionAttendue({GITHUB_SHA:REV+'dce4738d'}),REV);
 assert.equal(revisionAttendue({SDE_EXPECTED_REV:REV}),REV);
 assert.throws(()=>revisionAttendue({SDE_EXPECTED_REV:'wrong'}));
});
test('Le contrôle attend Worker + deux pages + CSS de la même révision',async()=>{
 const paths=[];
 const result=await verifierDomaine({domaine:domain,rev:REV,fetcher:async url=>{
  paths.push(new URL(url).pathname);
  return respond(url);
 }});
 assert.equal(result.ok,true);
 assert.deepEqual(paths,['/api/sante','/soldier-quest','/soldiers-tv','/_v/'+REV+'/vitrine/sde-digital-universe.css']);
});
test('Une ancienne version est refusée même si elle répond HTTP 200',async()=>{
 const result=await verifierDomaine({domaine:domain,rev:REV,fetcher:url=>Promise.resolve(respond(url,{stale:true}))});
 assert.equal(result.ok,false);
 assert.match(result.detail,/révision c8b24/);
});
test('La page 404 vue sur mobile est refusée',async()=>{
 const result=await verifierDomaine({domaine:domain,rev:REV,fetcher:url=>Promise.resolve(respond(url,{missing:true}))});
 assert.equal(result.ok,false);
 assert.match(result.detail,/soldier-quest.*404/);
});
test('L’attente ne réussit que lorsque les deux domaines sont à jour',async()=>{
 let n=0;const reports=[];
 const result=await attendrePublication({
  rev:REV,domaines:[domain,'https://app.mouvement-sde.org'],
  fetcher:async url=>{
   if(new URL(url).pathname==='/api/sante')n++;
   return respond(url,{stale:n<=2});
  },
  tempsMaxMs:10000,intervalleMs:1,attendre:async()=>{},
  rapport:msg=>reports.push(msg)
 });
 assert.equal(result.ok,true);
 assert.equal(result.essais,2);
 assert.ok(reports.some(x=>x.startsWith('PUBLICATION_EN_ATTENTE')));
 assert.ok(reports.some(x=>x.startsWith('PUBLICATION_VERIFIEE')));
});
test('Le pipeline déclenche la recette seulement après les contrôles de publication',()=>{
 const yml=readFileSync('.github/workflows/deployer.yml','utf8');
 assert.match(yml,/attendre-publication-sde\.mjs/);
 assert.match(yml,/SDE_EXPECTED_REV:/);
});

test('Recette authentifiée : chaque rôle sur les deux domaines, sans partager la session',()=>{
 const script=readFileSync('scripts/audit-prive-authentifie.mjs','utf8');
 assert.match(script,/DOMAINES_PUBLICATION\.flatMap\(base=>accounts\.map\(account=>\(\{\.\.\.account,base\}\)\)\)/);
 assert.match(script,/for\(const account of sessions\)/);
 assert.match(script,/const base=account\.base/);
 assert.match(script,/const context=await browser\.newContext/);
 assert.match(script,/u\.origin!==base/);
 assert.match(script,/lectureDeRecetteAutorisee/);
 assert.match(script,/report\.length!==sessions\.length\*5/);
 assert.match(script,/domaine:base,role:account\.type/);
});

test('Pipeline : attendre la publication des deux domaines avant les recettes publiques',()=>{
 const workflow=readFileSync('.github/workflows/deployer.yml','utf8');
 const gate=workflow.indexOf('run: node scripts/attendre-publication-sde.mjs');
 const smoke=workflow.indexOf('run: node scripts/recette-production.mjs');
 const academy=workflow.indexOf('run: node scripts/recette-academy-production.mjs');
 assert.ok(gate>0&&smoke>gate&&academy>smoke);
 assert.match(workflow,/SDE_EXPECTED_REV:\s*\$\{\{ github\.sha \}\}/);
});
