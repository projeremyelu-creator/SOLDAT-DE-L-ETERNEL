import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");
const loader=read("public/vitrine/sde-media-archives.js");
const pages=[
 ["/priere","public/vitrine/prieres.html",3],
 ["/missions-humanitaires","public/vitrine/missions-humanitaires.html",1],
 ["/boutique","public/vitrine/boutique.html",3],
 ["/soldiers-tv","public/vitrine/soldiers-tv.html",3],
 ["/","public/vitrine/portail.html",1]
];
async function render(path,file,available){
 const dom=new JSDOM(read(file),{url:"https://mouvement-sde.org"+path,runScripts:"outside-only"});
 dom.window.fetch=async(url,options)=>{
  assert.equal(options.method,"HEAD");
  const video=String(url).endsWith(".mp4");
  return {ok:available,headers:{get:()=>available?(video?"video/mp4":"image/webp"):"text/html"}};
 };
 dom.window.eval(loader);
 dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
 await new Promise(resolve=>setTimeout(resolve,0));
 return dom;
}
test("SDE: les cinq pages chargent le module médias en mode différé",()=>{
 for(const [,file] of pages){
  const s=read(file);
  assert.match(s,/sde-media-archives\.css/);
  assert.match(s,/defer src="\/vitrine\/sde-media-archives\.js/);
 }
});
test("Les médias publiés sont associés aux rubriques sans inventer de date",async()=>{
 for(const [path,file,num] of pages){
  const dom=await render(path,file,true);
  const cards=dom.window.document.querySelectorAll(".sde-archive-gallery .sde-archive-card");
  assert.equal(cards.length,num,path);
  for(const img of dom.window.document.querySelectorAll(".sde-archive-gallery img"))assert.ok(img.alt);
  for(const v of dom.window.document.querySelectorAll(".sde-archive-gallery video"))assert.equal(v.controls,true);
  dom.window.close();
 }
});
test("Un chemin non publié ne produit ni section vide ni image cassée",async()=>{
 for(const [path,file] of pages){
  const dom=await render(path,file,false);
  assert.equal(dom.window.document.querySelector(".sde-archive-gallery"),null,path);
  dom.window.close();
 }
});
test("Les maquettes de polos n'annoncent pas de disponibilité ni de prix",async()=>{
 const dom=await render("/boutique","public/vitrine/boutique.html",true);
 assert.match(dom.window.document.querySelector(".sde-archive-gallery").textContent,/Maquette illustrative/);
 assert.match(dom.window.document.querySelector(".sde-archive-gallery").textContent,/Aucune vente/);
 dom.window.close();
});
test("La vidéo SDE originale et les deux autres clips restent distincts",()=>{
 assert.match(loader,/identite-sde-expansion/);
 assert.match(loader,/livre-pouvoir-femme/);
 assert.match(loader,/archives-rassemblement/);
 assert.doesNotMatch(loader,/visiteurs en direct|vues en direct|2025 · édition/);
});
