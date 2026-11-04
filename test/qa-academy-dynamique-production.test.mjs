/* Recette externe anonyme : vérifie que les quatre phases sont publiées, sans utiliser aucun compte réel. */
import test from "node:test";
import assert from "node:assert/strict";
const domaines=["https://mouvement-sde.org","https://app.mouvement-sde.org"];
const chemin=[
 ["/vitrine/sde-academy-dynamique.js","js",["chargerCours","chargerTableau","data-dyn-termine"]],
 ["/vitrine/sde-academy-studio-dynamique.js","js",["dynFormQuiz","dynFormMeet","dynPilotage"]],
 ["/vitrine/sde-academy-dynamique.css","css",["academy-dyn-dashboard","academy-dyn-studio-grid"]],
 ["/api/soldiers-academy/dynamique/tableau","prive",[]],
 ["/api/soldiers-academy/dynamique/cours?id=SA-01","prive",[]],
 ["/api/soldiers-academy/dynamique/pilotage","prive",[]],
 ["/mon-espace/academy","redirection",[]],
 ["/mon-espace/enseignants","redirection",[]]
];
test("Recette Academy dynamique : 16 contrôles réels, 2 domaines, aucune fuite anonyme",async()=>{
 let passes=0;
 for(const domaine of domaines){
  for(const [path,kind,marqueurs] of chemin){
   const url=domaine+path;
   const r=await fetch(url,{redirect:"manual",headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(15000)});
   if(kind==="prive"){
    assert.equal(r.status,401,url);
    const j=await r.json();
    assert.equal(j.ok,false,url);
   }else if(kind==="redirection"){
    assert.equal(r.status,302,url);
    const location=r.headers.get("location")||"";
    assert.match(location,/\/connexion\?retour=/,url);
    assert.equal(new URL(location).origin,domaine,url);
   }else{
    assert.equal(r.status,200,url);
    const type=r.headers.get("content-type")||"";
    assert.match(type,kind==="js"?/javascript/:/css/,url+" MIME");
    const body=await r.text();
    for(const marker of marqueurs)assert.ok(body.includes(marker),url+" marqueur "+marker+" manquant");
   }
   console.log("ACADEMY DYNAMIQUE PROD OK",url,kind,r.status);
   passes++;
  }
 }
 assert.equal(passes,16);
 console.log("ACADEMY DYNAMIQUE PROD BILAN",passes+"/16");
});
