/* Publications SDE depuis la médiathèque Cloudflare : aucune API d'édition côté visiteur.
 * Les cartes ne montrent que les médias explicitement publics et achevés.
 * Les contenus non fiables sont insérés via textContent, jamais innerHTML. */
(()=>{"use strict";
const page=location.pathname;
const mapping={
 "/soldiers-tv":["Soldiers TV"],
 "/priere":["Prières et intercession"],
 "/missions-humanitaires":["Missions humanitaires"],
 "/boutique":["Tenues SDE"],
 "/enseignements":["Enseignements et documents"],
 "/album-infire":["IN FIRE"],
 "/soldiers-voice":["Soldiers Voice"],
 "/temoignages":["Témoignages"],
 "/mediatheque":null
};
if(!(page in mapping))return;
const sections=mapping[page];
const container=document.querySelector("main");
if(!container)return;
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
const supported=new Set(["image","video","audio","pdf","word","powerpoint","excel"]);
const url=m=>"/m/"+m.id+"/"+encodeURIComponent(m.nom);
function card(m){
 const article=node("article","sde-public-media-card");
 const preview=node("div","sde-public-media-preview");
 const link=url(m);
 if(m.genre==="image"){
  const img=node("img");img.src=link;img.alt=m.titre;img.loading="lazy";img.decoding="async";
  preview.append(img);
 }else if(m.genre==="video"){
  const video=node("video");video.controls=true;video.preload="none";video.playsInline=true;
  video.src=link;video.setAttribute("aria-label",m.titre);preview.append(video);
 }else if(m.genre==="audio"){
  const audio=node("audio");audio.controls=true;audio.preload="none";audio.src=link;preview.append(audio);
 }else{
  preview.append(node("span","sde-public-media-doc",m.genre==="pdf"?"PDF":"Document"));
 }
 const body=node("div","sde-public-media-body");
 const title=node("h3","",m.titre);
 const category=node("p","sde-public-media-category",m.categorie||"Publication SDE");
 body.append(title,category);
 if(m.description)body.append(node("p","sde-public-media-desc",m.description.slice(0,400)));
 const a=node("a","sde-public-media-link",m.genre==="pdf"||["word","powerpoint","excel"].includes(m.genre)?"Ouvrir le document":"Voir le média");
 a.href=link;a.target="_blank";a.rel="noopener noreferrer";
 body.append(a);article.append(preview,body);
 return article;
}
function init(items){
 const list=items.filter(m=>m&&m.visibilite==="public"&&/^[a-z0-9]{20}$/.test(m.id||"")&&
  typeof m.nom==="string"&&m.nom.length<200&&typeof m.titre==="string"&&supported.has(m.genre)&&
  (sections===null||sections.includes(m.categorie)));
 if(!list.length){
  if(page==="/mediatheque"){
   const target=document.getElementById("sde-published-content");
   if(target)target.append(node("p","sde-public-media-empty","Aucune publication n'est encore disponible. Les fichiers privés restent protégés."));
  }
  return;
 }
 const section=node("section","sde-public-media");
 section.id="publications-ajoutees";
 section.setAttribute("aria-labelledby","publications-ajoutees-titre");
 const content=node("div","sde-public-media-inner");
 const heading=node("div","sde-public-media-heading");
 heading.append(node("p","sde-public-media-eyebrow","Médiathèque SDE · Contenus publiés"));
 const h2=node("h2","",page==="/mediatheque"?"Photos, vidéos et documents du Mouvement":"Nouvelles publications");
 h2.id="publications-ajoutees-titre";heading.append(h2);
 heading.append(node("p","",page==="/mediatheque"?"Parcourez les ressources rendues publiques par les responsables du mouvement.":"Les nouveaux médias validés par l'administration apparaissent automatiquement ici."));
 content.append(heading);
 const grid=node("div","sde-public-media-grid");
 for(const m of list.slice(0,page==="/mediatheque"?100:24))grid.append(card(m));
 content.append(grid);
 if(page!=="/mediatheque"){
  const all=node("a","sde-public-media-all","Voir toute la médiathèque SDE");
  all.href="/mediatheque";content.append(all);
 }
 section.append(content);
 if(page==="/mediatheque"){
  const target=document.getElementById("sde-published-content")||container;
  target.append(section);
 }else{
  const anchor=page==="/soldiers-tv"?document.getElementById("a-la-une"):
    page==="/priere"?document.querySelector(".sde-initiative-lead"):
    page==="/missions-humanitaires"?document.getElementById("actions"):
    page==="/boutique"?document.querySelector(".merch-section"):
    page==="/enseignements"?document.getElementById("ressources"):
    page==="/album-infire"?document.querySelector(".toolbar"):
    page==="/soldiers-voice"?document.querySelector("main section"):
    page==="/temoignages"?document.querySelector("main section"):null;
  if(anchor)anchor.insertAdjacentElement("afterend",section);
  else container.append(section);
 }
}
async function run(){
 try{
  const response=await fetch("/api/medias",{credentials:"omit",cache:"no-store"});
  if(!response.ok)return;
  const data=await response.json();
  if(!data||!Array.isArray(data.medias))return;
  init(data.medias);
 }catch{/* Échec réseau : aucun faux média ni message trompeur */ }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();