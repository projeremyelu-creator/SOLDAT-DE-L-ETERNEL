import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {DIMENSIONS,BIEN_ETRE,FRACTURES,POLES,ECOLES,mayApprove,sdeOsApi} from "../src/sde-os.js";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const load=path=>readFileSync(path,"utf8");
function db(){
 const assessments=[],baro=[],progress=[],actions=[],finances=[],audit=[];
 const DB={prepare(query){
  let args=[];
  return {
   bind(...params){args=params;return this;},
   async first(){
    if(query.startsWith("SELECT * FROM os_validations"))return finances.find(x=>x.id===args[0])||null;
    return null;
   },
   async all(){
    if(query.includes("FROM os_evaluations WHERE compte"))return {results:assessments.filter(x=>x.compte===args[0]).sort((a,b)=>b.cree-a.cree)};
    if(query.includes("FROM os_parcours WHERE compte"))return {results:progress.filter(x=>x.compte===args[0])};
    if(query.includes("SELECT periode, COUNT(*)"))return {results:[...new Set(baro.map(x=>x.periode))].map(periode=>({periode,n:baro.filter(x=>x.periode===periode).length}))};
    if(query.includes("SELECT donnees FROM os_barometre WHERE periode"))return {results:baro.filter(x=>x.periode===args[0]).map(x=>({donnees:x.donnees}))};
    if(query.includes("SELECT id,pole,titre,echeance"))return {results:actions};
    if(query.includes("SELECT id,objet,montant,pole"))return {results:finances};
    return {results:[]};
   },
   async run(){
    if(query.startsWith("INSERT INTO os_evaluations"))assessments.push({id:args[0],compte:args[1],cree:args[2],donnees:args[3]});
    else if(query.startsWith("DELETE FROM os_evaluations")){
      for(let i=assessments.length-1;i>=0;i--)if(assessments[i].id===args[0]&&assessments[i].compte===args[1])assessments.splice(i,1);
    }else if(query.startsWith("INSERT INTO os_barometre")){
      const prev=baro.findIndex(x=>x.compte===args[0]&&x.periode===args[1]);
      if(prev>=0)baro.splice(prev,1);
      baro.push({compte:args[0],periode:args[1],donnees:args[3]});
    }else if(query.startsWith("INSERT INTO os_parcours")){
      const prev=progress.findIndex(x=>x.compte===args[0]&&x.ecole===args[1]);if(prev>=0)progress.splice(prev,1);
      progress.push({compte:args[0],ecole:args[1],statut:args[2],maj:args[3]});
    }else if(query.startsWith("INSERT INTO os_actions"))actions.push({id:args[0],pole:args[1],titre:args[2],echeance:args[3],statut:args[4],auteur:args[5],maj:args[6]});
    else if(query.startsWith("INSERT INTO os_validations"))finances.push({id:args[0],objet:args[1],montant:args[2],pole:args[3],etat:args[4],demandeur:args[5],autoriseur:null,executeur:null,controleur:null,cree:args[6],maj:args[7]});
    else if(query.startsWith("UPDATE os_validations SET etat")){
      const item=finances.find(x=>x.id===args[5]);if(item&&item.etat===args[6]){
        const name=query.includes(" autoriseur=")?"autoriseur":query.includes(" executeur=")?"executeur":"controleur";
        item.etat=args[0];item[name]=args[1];item.maj=args[4];return {meta:{changes:1}};
      }
      return {meta:{changes:0}};
    }else if(query.startsWith("INSERT INTO os_audit"))audit.push(args);
    return {meta:{changes:1}};
   }
  };
 }};
 return {DB,assessments,baro,progress,actions,finances,audit};
}
const user=(id,niveau=0)=>({id,nom:"Membre",role:niveau>=2?"admin":"soldat",niveau,connecte:true});
const api=(database,person,path,method="GET",payload)=>sdeOsApi(
 new Request("https://app.mouvement-sde.org/api/os/"+path,{method,headers:payload?{"content-type":"application/json"}:{},body:payload?JSON.stringify(payload):undefined}),
 {DB:database.DB},person,new URL("https://app.mouvement-sde.org/api/os/"+path));
const data=async res=>res.json();
test("document Soldier House : 7 dimensions, 5 pôles, 4 écoles, 4 fractures + préjugés",()=>{
 assert.deepEqual(DIMENSIONS,["spirituelle","personnelle","familiale","professionnelle","economique","sociale","missionnaire"]);
 assert.equal(BIEN_ETRE.length,4);assert.equal(FRACTURES.length,5);assert.equal(POLES.length,5);assert.equal(ECOLES.length,4);
 assert.equal(POLES[4],"Formation & Développement Intégral");
});
test("les données OS sont inaccessibles sans connexion et sans droits administratifs",async()=>{
 const database=db();
 assert.equal((await api(database,{connecte:false},"bootstrap")).status,401);
 assert.equal((await api(database,user("membre"),"finances","POST",{objet:"Test",montant:100,pole:1})).status,403);
 assert.equal((await api(database,user("membre"),"actions","POST",{titre:"Exemple",pole:2})).status,403);
});
test("auto-évaluations : volontaires, exactement 7 dimensions, isolées par compte et suppression",async()=>{
 const database=db(),alice=user("alice"),bob=user("bob");
 const scores=Object.fromEntries(DIMENSIONS.map(key=>[key,4]));
 assert.equal((await api(database,alice,"evaluation","POST",{...scores})).status,400);
 const saved=await api(database,alice,"evaluation","POST",{...scores,consentement:true,sante_physique:3});
 assert.equal(saved.status,200);
 const a=await data(await api(database,alice,"bootstrap"));
 const b=await data(await api(database,bob,"bootstrap"));
 assert.equal(a.evaluations.length,1);
 assert.equal(b.evaluations.length,0);
 assert.equal(JSON.stringify(a).includes("sante_physique"),true);
 assert.equal(b.evaluations.length,0); // les noms des champs publics ne constituent pas une fuite de données
 assert.equal((await api(database,bob,"evaluation?id="+a.evaluations[0].id,"DELETE")).status,200);
 assert.equal((await data(await api(database,alice,"bootstrap"))).evaluations.length,1);
 await api(database,alice,"evaluation?id="+a.evaluations[0].id,"DELETE");
 assert.equal((await data(await api(database,alice,"bootstrap"))).evaluations.length,0);
});
test("baromètre : aucun graphique institutionnel avec moins de 5 participants distincts",async()=>{
 const database=db(),values=Object.fromEntries(FRACTURES.map(key=>[key,3]));
 for(let i=0;i<4;i++){
  const result=await api(database,user("m"+i),"barometre","POST",{...values,consentement:true});
  assert.equal(result.status,200);
 }
 assert.equal((await data(await api(database,user("m0"),"bootstrap"))).barometre.length,0);
 await api(database,user("m4"),"barometre","POST",{...values,consentement:true});
 const aggregate=(await data(await api(database,user("m0"),"bootstrap"))).barometre;
 assert.equal(aggregate.length,1);assert.equal(aggregate[0].n,5);
 assert.equal(aggregate[0].prejuges,3);
 await api(database,user("m4"),"barometre","POST",{...values,prejuges:5,consentement:true});
 assert.equal(database.baro.length,5,"un membre ne peut produire deux votes dans un mois");
 const withdrawal=await api(database,user("m4"),"barometre","DELETE");
 assert.equal(withdrawal.status,200);
 assert.equal((await data(await api(database,user("m0"),"bootstrap"))).barometre.length,0);
 assert.equal(database.baro.filter(x=>x.compte!=="m4").length,4);
});
test("quatre yeux : approbation et contrôle par des personnes différentes",async()=>{
 const base={etat:"soumis",demandeur:"a"};
 assert.equal(mayApprove(base,"a","authoriser"),false);
 assert.equal(mayApprove(base,"b","authoriser"),true);
 assert.equal(mayApprove({...base,etat:"autorise",autoriseur:"b"},"b","executer"),false);
 assert.equal(mayApprove({...base,etat:"autorise",autoriseur:"b"},"a","executer"),true);
 assert.equal(mayApprove({...base,etat:"execute",executeur:"a"},"a","controler"),false);
 assert.equal(mayApprove({...base,etat:"execute",executeur:"a"},"b","controler"),true);
 const database=db(),adminA=user("a",2),adminB=user("b",2);
 const created=await data(await api(database,adminA,"finances","POST",{objet:"Mission",montant:30000,pole:2}));
 assert.ok(created.ok);
 assert.equal((await api(database,adminA,"finances","PATCH",{id:created.id,etape:"authoriser"})).status,403);
 assert.equal((await api(database,adminB,"finances","PATCH",{id:created.id,etape:"authoriser"})).status,200);
 assert.equal((await api(database,adminB,"finances","PATCH",{id:created.id,etape:"executer",reference:"Doc-1"})).status,403);
 assert.equal((await api(database,adminA,"finances","PATCH",{id:created.id,etape:"executer",reference:"Doc-1"})).status,200);
 assert.equal((await api(database,adminA,"finances","PATCH",{id:created.id,etape:"controler"})).status,403);
 assert.equal((await api(database,adminB,"finances","PATCH",{id:created.id,etape:"controler"})).status,200);
 assert.equal(database.finances[0].etat,"verifie");
 assert.ok(database.audit.length>=4);
});
test("interface OS : 4 paradigmes, 5 navigations, aucune donnée de santé en cache PWA",()=>{
 const html=load("public/os/index.html"),css=load("public/os/os.css"),js=load("public/os/os.js"),sw=load("public/os/sw.js");
 const d=new JSDOM(html).window.document;
 for(const view of ["accueil","integral","barometre","academy","directoire","poles","finances"])assert.ok(d.getElementById("view-"+view),view);
 for(const mode of ["commandement","bento","focus","immersif"])assert.ok(d.querySelector('#paradigm-select option[value="'+mode+'"]'));
 for(const element of [".mega",".side",".bento",".mobile-tabs","#command-dialog"])assert.ok(d.querySelector(element),element);
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(js.includes('request("bootstrap")'));
 assert.ok(!sw.includes("api/os/bootstrap"));
 assert.ok(sw.includes('url.pathname.startsWith("/os/")'));
 const manifest=JSON.parse(load("public/os/manifest.webmanifest"));
 assert.equal(manifest.scope,"/os/");
 assert.equal(manifest.display,"standalone");
 const privateIndex=load("public/sde-bridge.js");
 assert.ok(privateIndex.includes("SDE OS v3.1"));
});


test("SDE OS : démarrage authentifié, cinq pôles, quatre écoles, navigation et recherche utilisables", async()=>{
 const html=load("public/os/index.html"),code=load("public/os/os.js");
 const dom=new JSDOM(html,{url:"https://app.mouvement-sde.org/os/",runScripts:"outside-only",pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.scrollTo=()=>{};
 w.fetch=async(url)=>({ok:true,json:async()=>({
  ok:true,profil:{id:"alice",nom:"Membre Test",role:"soldat",niveau:0},peutGerer:false,
  dimensions:DIMENSIONS,bienEtre:BIEN_ETRE,fractures:FRACTURES,poles:POLES,ecoles:ECOLES,
  evaluations:[],parcours:[],barometre:[],actions:[],validations:[]
 })});
 w.eval(code);
 d.dispatchEvent(new w.Event("DOMContentLoaded"));
 await new Promise(resolve=>setTimeout(resolve,45));
 assert.equal(d.getElementById("busy").hidden,true);
 assert.equal(d.querySelectorAll("#schools .school").length,4);
 assert.equal(d.querySelectorAll("#poles-list .pole-card").length,5);
 assert.equal(d.querySelectorAll("#eval-fields input[type=range]").length,7);
 assert.equal(d.querySelectorAll("#wellness-fields input[type=range]").length,4);
 assert.equal(d.querySelectorAll("#fracture-fields input[type=range]").length,5);
 assert.ok(d.querySelector("#withdraw-barometer"));
 assert.equal(d.querySelector("#pole-workspace").hidden,true,"les non-gestionnaires ne gèrent pas les pôles");
 assert.equal(d.querySelector("#finance-workspace").hidden,true);
 d.querySelector('.nav-item[data-go="academy"]').click();
 assert.equal(d.getElementById("view-academy").hidden,false);
 assert.equal(d.getElementById("view-accueil").hidden,true);
 d.getElementById("mobile-more").click();
 assert.equal(d.getElementById("more-overlay").hidden,false);
 d.getElementById("more-close").click();
 assert.equal(d.getElementById("more-overlay").hidden,true);
 d.getElementById("paradigm-select").value="immersif";
 d.getElementById("paradigm-select").dispatchEvent(new w.Event("change"));
 assert.equal(d.getElementById("app").dataset.paradigme,"immersif");
 dom.window.close();
});
