/* Album IN FIRE 2026 — médias validés depuis le studio SDE.
 * Le fichier attaché à la conversation n'est PAS disponible sur le site avant
 * téléversement effectif. Les médias proviennent strictement de /api/medias
 * (déjà filtré côté serveur en mode visiteur).
 */
(()=>{"use strict";
if(!document.body.classList.contains("sde-infire-album"))return;
if(document.documentElement.dataset.infire2026Publications==="1")return;
document.documentElement.dataset.infire2026Publications="1";
const tab=document.querySelector('.tab[data-year="2026"]');
const grid=document.getElementById("gallery");
const count=document.getElementById("count");
const empty=document.getElementById("empty");
const modal=document.getElementById("modal"),large=document.getElementById("large"),legend=document.getElementById("legend"),close=document.getElementById("close");
if(!tab||!grid||!count||!empty)return;
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
let records=null,fetching=null,visible=false;
const selected=()=>tab.getAttribute("aria-selected")==="true";
const mediaUrl=m=>"/m/"+encodeURIComponent(m.id)+"/"+encodeURIComponent(m.nom);
const eligible=m=>{
 if(!m||m.categorie!=="IN FIRE"||!["image","video"].includes(m.genre)||!m.id||!m.nom)return false;
 const label=[m.titre,m.description,m.nom].filter(Boolean).join(" ");
 return /\b(?:in[\s-]?fire[\s-]?2026|2026[\s_-]?in[\s-]?fire|2026)\b/i.test(label);
};
const titleOf=m=>String(m.titre||m.nom||"Souvenir IN FIRE 2026").slice(0,160);
const existing=m=>[...grid.querySelectorAll("img,source,video")].some(x=>
 x.getAttribute("src")?.includes(encodeURIComponent(m.nom)) ||
 x.getAttribute("src")?.endsWith("/"+m.nom));
function displayImage(m){
 const figure=make("figure","item sde-infire-live-photo");
 const btn=make("button");btn.type="button";btn.setAttribute("aria-label","Agrandir "+titleOf(m));
 const img=make("img");img.src=mediaUrl(m);img.alt=titleOf(m)+" — IN FIRE 2026";img.loading="lazy";img.decoding="async";
 const caption=make("figcaption");caption.append(make("strong","",titleOf(m)),make("span","","IN FIRE 2026"));
 btn.append(img);figure.append(btn,caption);
 btn.addEventListener("click",()=>{
  if(!modal||!large||!legend||!close)return;
  large.src=mediaUrl(m);large.alt=img.alt;legend.textContent=titleOf(m);
  modal.classList.add("open");document.body.style.overflow="hidden";close.focus();
 });
 return figure;
}
function displayVideo(m){
 const figure=make("figure","item sde-infire-live-video");
 const player=make("video");player.controls=true;player.preload="metadata";player.playsInline=true;
 player.setAttribute("aria-label",titleOf(m)+" — vidéo IN FIRE 2026");player.src=mediaUrl(m);
 const caption=make("figcaption");caption.append(make("strong","",titleOf(m)),make("span","","IN FIRE 2026 · vidéo"));
 figure.append(player,caption);return figure;
}
function draw(){
 if(!selected()||!Array.isArray(records))return;
 for(const m of records.filter(eligible).slice(0,60)){
  if(grid.querySelector('[data-infire-media-id="'+CSS.escape(String(m.id))+'"]'))continue;
  if(existing(m))continue;
  const card=m.genre==="image"?displayImage(m):displayVideo(m);
  card.dataset.infireMediaId=String(m.id);grid.append(card);
 }
 const number=grid.querySelectorAll("figure").length;
 const videoCount=grid.querySelectorAll("video").length;
 if(number){empty.classList.add("hidden");grid.classList.remove("hidden");}
 count.textContent=number?number+" médias"+(videoCount?" · "+videoCount+" vidéos":""):"Photos et vidéos à venir";
}
async function load(){
 if(!selected())return;
 if(records){draw();return;}
 if(fetching)return;
 fetching=(async()=>{
  try{
   const r=await fetch("/api/medias",{credentials:"omit",cache:"no-store",headers:{"Accept":"application/json"}});
   if(!r.ok)throw Error("Contenus indisponibles");
   const j=await r.json();
   records=Array.isArray(j.medias)?j.medias:[];
   if(selected())draw();
  }catch{if(selected())count.textContent="Les nouvelles publications sont momentanément indisponibles.";}
  finally{fetching=null;}
 })();
 await fetching;
}
tab.addEventListener("click",()=>queueMicrotask(load));
if(selected())load();
})();