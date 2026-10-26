import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/worker.js";

const repoFile=(p)=>readFileSync(p,"utf8");
const publiques={
  "/":"/vitrine/portail.html", "/mouvement":"/vitrine/mouvement.html",
  "/programmes":"/vitrine/programmes.html", "/academy":"/vitrine/academy.html",
  "/enseignements":"/vitrine/ressources.html", "/missions":"/vitrine/projets.html",
  "/priere":"/vitrine/prieres.html", "/contact":"/vitrine/rejoindre.html",
  "/temoignages":"/vitrine/temoignages.html",
  "/soldiers-voice":"/vitrine/soldiers-voice.html",
  "/missions-humanitaires":"/vitrine/missions-humanitaires.html",
  "/rubriques":"/vitrine/plus.html"
};
function env(role=null){
 return {
  PROPRIETAIRES:"",
  ASSETS:{fetch:async(request)=>new Response(new URL(request.url).pathname,{headers:{"content-type":"text/html;charset=utf-8"}})},
  DB:{prepare:(sql)=>({
    bind(){return this},
    first:async()=>sql.includes("FROM sessions s")&&role?{
      email:"exemple@domaine.fr",expire:Date.now()+3600_000,id:"id",nom:"Exemple",role
    }:null,
    run:async()=>({}),
    all:async()=>({results:[]})
  }),batch:async()=>[]}
 };
}
const get=(path,role,extra={})=>worker.fetch(new Request("https://mouvement-sde.org"+path,{
  ...extra,
  headers:{...(role?{cookie:"sde_s=une_session"}:{}),...(extra.headers||{})},
  redirect:"manual"
}),env(role),{waitUntil(){}});
test("portail : page d'accueil légère distincte du tableau de bord privé",async()=>{
 const res=await get("/");
 assert.equal(res.status,200);
 assert.equal(await res.text(),"/vitrine/portail.html");
 assert.match(repoFile("public/vitrine/portail.html"),/href="\/mon-espace"/);
 assert.match(repoFile("public/vitrine/portail.html"),/href="\/programmes"/);
 const old=await get("/vitrine/");
 assert.equal(old.status,301);
 assert.equal(old.headers.get("location"),"https://mouvement-sde.org/");
});
test("portail : vraies pages publiques et même domaine",async()=>{
 for(const [route,asset]of Object.entries(publiques)){
  const res=await get(route);
  assert.equal(res.status,200,route);
  assert.equal(await res.text(),asset,route);
 }
});
test("portail : connexion unique, jamais indexée ni stockée",async()=>{
 const res=await get("/connexion");
 assert.equal(res.status,200);
 assert.equal(await res.text(),"/vitrine/connexion-unifiee.html");
 assert.match(res.headers.get("cache-control"),/no-store/);
 assert.match(res.headers.get("x-robots-tag"),/noindex/);
 const html=repoFile("public/vitrine/connexion-unifiee.html");
 for(const id of ["form-connexion","form-inscription","form-activation"])assert.ok(html.includes('id="'+id+'"'));
 const script=repoFile("public/vitrine/portail-connexion.js");
 for(const endpoint of ["/api/connexion","/api/inscription","/api/activation"])assert.ok(script.includes(endpoint));
 assert.match(script,/credentials:"same-origin"/);
});
test("portail : accès personnel refusé avant connexion",async()=>{
 const res=await get("/mon-espace");
 assert.equal(res.status,302);
 assert.equal(res.headers.get("location"),"https://mouvement-sde.org/connexion?retour=%2Fmon-espace");
});
test("portail : administration interdite aux non-connectés et membres simples",async()=>{
 const anonyme=await get("/administration");
 assert.equal(anonyme.status,302);
 assert.equal(anonyme.headers.get("location"),"https://mouvement-sde.org/connexion?retour=%2Fadministration");
 const soldat=await get("/administration","soldat");
 assert.equal(soldat.status,403);
 assert.ok(!(await soldat.text()).includes("index.html"));
});
test("portail : deux espaces servis uniquement aux rôles autorisés",async()=>{
 const espace=await get("/mon-espace","soldat");
 assert.equal(espace.status,200);
 assert.equal(await espace.text(),"/vitrine/tableau-membre.html");
 assert.match(espace.headers.get("cache-control"),/no-store/);
 assert.match(espace.headers.get("x-robots-tag"),/noindex/);
 for(const role of ["contributeur","admin","proprietaire"]){
  const r=await get("/administration",role);
  assert.equal(r.status,200,role);
  assert.equal(await r.text(),"/vitrine/tableau-administration.html");
 }
});
test("portail : même API sécurisée disponible depuis le domaine public",async()=>{
 const req=await get("/api/moi","soldat");
 assert.equal(req.status,200);
 const body=await req.json();
 assert.equal(body.connecte,true);
 assert.equal(body.role,"soldat");
 assert.equal(body.niveau,0);
});
test("portail : assets de l'espace sans redirection hors du domaine",async()=>{
 for(const file of ["/app.css","/sde-unified.css","/sde-private-ui.css","/sde-bridge.js","/vitrine/portail-espace.js"]){
  const res=await get(file);
  assert.equal(res.status,200,file);
  assert.equal(await res.text(),file);
 }
});
test("portail : sécurité PWA et séparation du cache public/privé",()=>{
 const worker=repoFile("public/sw-public.js");
 const pages=worker.slice(worker.indexOf("const PAGES"),worker.indexOf("const OFFLINE"));
 assert.ok(!pages.includes("/mon-espace"));
 assert.ok(!pages.includes("/administration"));
 assert.ok(!pages.includes("/connexion"));
 const app=repoFile("public/index.html");
 assert.match(app,/location.hostname !== "mouvement-sde.org"/);
 assert.match(app,/portail-espace.js/);
});
test("portail : en-tête partagé sur les pages éditoriales",()=>{
 for(const name of ["mouvement","programmes","ressources","rejoindre","projets","plus","academy","prieres","temoignages","soldiers-voice","missions-humanitaires"]){
  const html=repoFile("public/vitrine/"+name+".html");
  assert.match(html,/portail-unifie\.css/);
  assert.match(html,/portail-unifie\.js/);
 }
});
