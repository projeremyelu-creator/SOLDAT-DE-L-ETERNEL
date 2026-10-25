import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {SDE_OS_31,apiSdeOs31} from "../src/os-v31.js";
const {JSDOM}=createRequire(import.meta.url)("jsdom");
const html=readFileSync("public/os-v31/index.html","utf8");
const script=readFileSync("public/os-v31/sde-os.js","utf8");
const style=readFileSync("public/os-v31/sde-os.css","utf8");
const worker=readFileSync("src/worker.js","utf8");
const mock=()=>({DB:{prepare(sql){return {bind(...params){this.params=params;return this},async run(){return {success:true}},async all(){return {results:[]}},async first(){return null}}}}});
const u={connecte:true,id:"member-1",niveau:0,role:"soldat",nom:"Soldat Test"};
const admin={connecte:true,id:"admin-1",niveau:2,role:"admin",nom:"Responsable"};
const request=(action,details={})=>new Request("https://app.mouvement-sde.org/api/os-v31",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...details})});
test("référentiel Soldier House : sept dimensions, cinq pôles, quatre écoles, quatre fractures",()=>{
 assert.equal(SDE_OS_31.version,"3.1");
 assert.deepEqual(SDE_OS_31.integral,["Spirituelle","Personnelle","Familiale","Professionnelle","Économique","Sociale","Missionnaire"]);
 assert.equal(SDE_OS_31.bienEtre.length,4);
 assert.equal(SDE_OS_31.fractures.length,4);
 assert.equal(SDE_OS_31.poles.length,5);
 assert.equal(SDE_OS_31.ecoles.length,4);
 assert.equal(SDE_OS_31.ecoles[0].nom,"Fondations");
 assert.equal(SDE_OS_31.ecoles[3].nom,"Mission et Influence");
});
test("application complète : six vues, quatre paradigmes et cinq navigations réelles",()=>{
 const dom=new JSDOM(html,{url:"https://app.mouvement-sde.org/os-v31/",runScripts:"outside-only"});
 const d=dom.window.document;
 for(const id of ["tableau","integral","fractures","gouvernance","academy","poles"]){
  assert.ok(d.getElementById("view-"+id));
  assert.ok(d.querySelector('.side-links [data-route="'+id+'"]'));
  assert.ok(d.querySelector('.command-dialog'));
 }
 assert.equal(d.querySelectorAll("[data-presentation-value]").length,4);
 assert.ok(d.querySelector(".header-links"),"méga-menu");
 assert.ok(d.querySelector(".side-links"),"rail latéral");
 assert.ok(d.querySelector(".bento-nav"),"cartes de navigation");
 assert.ok(d.querySelector(".command-links"),"commande plein écran");
 assert.equal(d.querySelectorAll(".bottom-navigation > *").length,5);
 assert.ok(style.includes("prefers-reduced-motion"));
 assert.ok(style.includes("safe-area-inset-bottom"));
 assert.ok(html.includes('noindex,nofollow'));
 dom.window.close();
});
test("sécurité : aucun bilan personnel accessible sans connexion",async()=>{
 const res=await apiSdeOs31(request("mes_bilans"),mock(),{connecte:false});
 assert.equal(res.status,401);
});
test("sécurité : aucune courbe institutionnelle sans rôle administratif",async()=>{
 const res=await apiSdeOs31(request("tendance"),mock(),u);
 assert.equal(res.status,403);
});
test("sécurité : aucune consultation du registre de décisions pour soldat",async()=>{
 const res=await apiSdeOs31(request("decisions"),mock(),u);
 assert.equal(res.status,403);
});
test("sécurité : consentement explicite et barème complet avant bilan",async()=>{
 const base={dimensions:[3,3,3,3,3,3,3],bienEtre:[3,3,3,3],fractures:[1,1,1,1],prejuges:2};
 let res=await apiSdeOs31(request("enregistrer_bilan",base),mock(),u);
 assert.equal(res.status,400);
 res=await apiSdeOs31(request("enregistrer_bilan",{...base,consentement:true,fractures:[1,1,10,1]}),mock(),u);
 assert.equal(res.status,400);
});
test("règle des 4 yeux : contrôle atomique refuse auteur/approbateur identiques",async()=>{
 let sql="";
 let args=[];
 const env={DB:{prepare(q){return {bind(...a){args=a;sql=q;return this},async run(){return {success:true}},async first(){return null}}}}};
 const res=await apiSdeOs31(request("examiner_decision",{id:12,decision:"approuve"}),env,admin);
 assert.equal(res.status,409);
 assert.ok(sql.includes("propose_par<>?"),"interdiction d'auto-approbation dans SQL");
 assert.equal(args.at(-1),admin.id);
 assert.equal(args[1],admin.id);
});
test("module privé : intégration dans Worker et navigation SDE existante",()=>{
 assert.ok(worker.includes('p === "/api/os-v31"'));
 assert.ok(worker.includes("apiSdeOs31(req, env, u)"));
 assert.ok(readFileSync("public/sde-bridge.js","utf8").includes("/os-v31/"));
 assert.ok(html.includes('href="https://app.mouvement-sde.org/"'));
 assert.ok(!script.includes("localStorage.setItem"));
 assert.ok(!style.includes("display:none!important"));
});
