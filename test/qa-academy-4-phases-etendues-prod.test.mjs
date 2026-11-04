import test from "node:test";
import assert from "node:assert/strict";
const domaines=["https://mouvement-sde.org","https://app.mouvement-sde.org"];
const checks=[
 ["/vitrine/sde-academy-studio-dynamique.js","js",["dynStudioCopies","dynPilotageNiveaux","/noter","dynStudioMessages"]],
 ["/vitrine/sde-academy-dynamique.js","js",["chargerTableau","chargerCours","data-dyn-termine"]],
 ["/vitrine/sde-academy-dynamique.css","css",["academy-dyn-level-chart","academy-dyn-response"]],
 ["/api/soldiers-academy/dynamique/studio/copies","private",[]],
 ["/api/soldiers-academy/dynamique/pilotage","private",[]],
 ["/api/soldiers-academy/dynamique/tableau","private",[]],
 ["/api/soldiers-academy/noter","private",[]],
 ["/mon-espace/academy","redirect",[]],
 ["/mon-espace/enseignants","redirect",[]]
];
test("Academy refonte intégrale : 18 contrôles publics sur deux domaines, sans session ni données personnelles",async()=>{
 let done=0;
 for(const domaine of domaines)for(const [chemin,kind,markers] of checks){
  const url=domaine+chemin;
  const response=await fetch(url,{redirect:"manual",headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(20000)});
  if(kind==="private"){
   assert.equal(response.status,401,url);
   const json=await response.json();
   assert.equal(json.ok,false,url);
  }else if(kind==="redirect"){
   assert.equal(response.status,302,url);
   const redir=new URL(response.headers.get("location"),domaine);
   assert.equal(redir.origin,domaine,url);
   assert.equal(redir.pathname,"/connexion",url);
   assert.match(redir.search,/retour=/,url);
  }else{
   assert.equal(response.status,200,url);
   assert.match(response.headers.get("content-type")||"",kind==="js"?/javascript/:/css/,url);
   const body=await response.text();
   for(const m of markers)assert.ok(body.includes(m),url+" marqueur manquant: "+m);
  }
  console.log("ACADEMY 4 PHASES PROD OK",url,response.status);
  done++;
 }
 assert.equal(done,18);
 console.log("ACADEMY 4 PHASES PROD BILAN",done+"/18");
});