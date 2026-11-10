import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");
const worker=read("src/worker.js");
const studio=read("public/vitrine/sde-mediatheque-admin.html");
const studioJS=read("public/vitrine/sde-mediatheque-admin.js");
const publicJS=read("public/vitrine/sde-public-media.js");
const id="a".repeat(20);
const media=(title,visibilite,categorie,genre="image")=>({id,titre:title,description:"Texte public",nom:"media.jpg",genre,taille:100,visibilite,categorie});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test("Le studio fichiers est protégé côté Cloudflare : session et rôle admin nécessaires",()=>{
 const start=worker.indexOf('if (p === "/administration/medias" || p === "/administration/mediatheque")');
 const end=worker.indexOf('if (["/mon-espace"',start);
 assert.ok(start>0&&end>start,"route avant les espaces privés");
 const block=worker.slice(start,end);
 assert.match(block,/await utilisateur\(req, env\)/);
 assert.match(block,/if \(!u\.connecte\)/);
 assert.match(block,/u\.niveau < 2/);
 assert.match(block,/\b403\b/);
 assert.match(block,/sde-mediatheque-admin\.html/);
 assert.match(block,/no-store/);
 assert.match(block,/noindex, nofollow/);
 assert.match(block,/frame-ancestors 'none'/);
 assert.ok(!block.includes('env.ASSETS.fetch(req)'),"pas d'accès public direct à la page privée");
});
test("L'API interdit aux responsables et enseignants de publier en public",()=>{
 const start=worker.indexOf("async function apiMedias");
 const end=worker.indexOf("/* Lecture d'un fichier",start);
 const block=worker.slice(start,end);
 assert.equal((block.match(/u\.niveau < 2 && p\.visibilite === "public"/g)||[]).length,2,
  "création et modification refusées aux rôles < administrateur");
 assert.match(block,/u\.restreint/);
 assert.match(block,/u\.niveau < 1/);
 assert.match(worker,/x-content-type-options": "nosniff"/);
 assert.match(worker,/mediaLoveAutorise/);
 assert.match(worker,/mediaAcademyAutorise/);
});
test("Les routes et rubriques publiques existent sur les mêmes domaines",()=>{
 assert.match(worker,/"\/mediatheque": "\/vitrine\/mediatheque-publique\.html"/);
 const paths={
  "soldiers-tv.html":"Soldiers TV",
  "prieres.html":"Prières et intercession",
  "missions-humanitaires.html":"Missions humanitaires",
  "boutique.html":"Tenues SDE",
  "ressources.html":"Enseignements et documents",
  "album-infire.html":"IN FIRE",
  "soldiers-voice.html":"Soldiers Voice",
  "temoignages.html":"Témoignages"
 };
 for(const [name,label] of Object.entries(paths)){
  const html=read("public/vitrine/"+name);
  assert.match(html,/sde-public-media\.js/,name);
  assert.match(html,/sde-public-media\.css/,name);
  assert.ok(publicJS.includes('"'+label+'"'),label);
  const doc=new JSDOM(html).window.document;
  const urls=[...doc.querySelectorAll('link[rel="stylesheet"]')].map(n=>n.href);
  const overlay=urls.findIndex(u=>u.includes("sde-public-media.css"));
  const shell=urls.findIndex(u=>u.includes("sde-shell-public.css"));
  if(shell>=0)assert.ok(overlay<shell,name+": chargement CSS sans conflit");
 }
 assert.match(read("public/vitrine/sde-shell-public.js"),/\/mediatheque/);
});
test("Le studio offre l'import local multiple, les droits et le suivi",()=>{
 const d=new JSDOM(studio).window.document;
 assert.ok(d.querySelector("input[type=file][multiple]"));
 assert.ok(d.querySelector('input[type=file][accept*=".mp4"]'));
 assert.ok(d.querySelector('input[type=file][accept*=".pdf"]'));
 assert.ok(d.querySelector('select[name=visibilite] option[value=public]'));
 assert.ok(d.querySelector("#rights-confirm"));
 assert.ok(d.querySelector("#upload-log"));
 for(const marker of ['/api/moi','/api/medias','method:"PUT"','"/fin"','format(e.fichierMax)','/api/medias'])
  assert.ok(studioJS.includes(marker),marker);
 assert.match(studio,/Médiathèque publique/);
 assert.match(studio,/robots" content="noindex,nofollow"/);
});
test("Un visiteur ne voit que les publications publiques, jamais les documents privés",async()=>{
 const dom=new JSDOM(read("public/vitrine/mediatheque-publique.html"),{
  url:"https://mouvement-sde.org/mediatheque",runScripts:"outside-only"
 });
 const w=dom.window;
 w.fetch=async()=>({ok:true,json:async()=>({medias:[
  {...media("Photo officielle","public","Soldiers TV"),id:"a".repeat(20)},
  {...media("Dossier pastoral confidentiel","membres","Enseignements et documents"),id:"b".repeat(20)},
  {...media("<script>danger</script>","public","Enseignements et documents"),id:"c".repeat(20)}
 ]})});
 try{
  w.eval(publicJS);
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  await tick();
  const el=w.document.querySelector("#sde-published-content");
  assert.ok(el);
  assert.equal(el.querySelectorAll(".sde-public-media-card").length,2);
  assert.ok(!el.textContent.includes("Dossier pastoral"));
  assert.equal(el.querySelectorAll("script").length,0);
  assert.ok(el.textContent.includes("<script>danger</script>"));
 }finally{w.close();}
});
test("Un visiteur non administrateur ne peut ouvrir le studio dans le navigateur",async()=>{
 const dom=new JSDOM(studio,{url:"https://mouvement-sde.org/administration/medias",runScripts:"outside-only"});
 dom.window.fetch=async()=>({ok:true,json:async()=>({connecte:true,niveau:0,nom:"Visiteur"})});
 try{
  dom.window.eval(studioJS);
  await tick();
  assert.ok(dom.window.document.getElementById("studio").hidden);
  assert.match(dom.window.document.getElementById("auth-status").textContent,/réservé/);
 }finally{dom.window.close();}
});

test("La route technique HTML n'expose jamais directement le studio sans la session",()=>{
 const marker='if (p === "/vitrine/sde-mediatheque-admin.html"';
 assert.ok(worker.includes(marker));
 assert.ok(worker.includes('location:url.origin+"/administration/medias"'));
 assert.ok(worker.includes('"cache-control":"private, no-store"'));
});
