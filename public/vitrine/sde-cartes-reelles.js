/* SDE — vraies cartes géographiques interactives.
   Leaflet 1.9.4 est téléchargé seulement après consentement explicite.
   Fonds OSM standard : jamais préchargés ni stockés hors ligne.
   Marqueurs issus exclusivement du fichier PUBLIC documenté.
 */
(()=>{
"use strict";
const DATA="/vitrine/carte-geographique-sde.json";
const TILES="https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const LEAFLET={
 css:"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
 script:"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
 cssIntegrity:"sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
 scriptIntegrity:"sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
};
const VIEWS={
 monde:{center:[9,-6],zoom:3,label:"Monde"},
 afrique:{center:[7,-2],zoom:4,label:"Afrique"},
 coteivoire:{center:[7.54,-5.55],zoom:7,label:"Côte d’Ivoire"}
};
const reduce=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
let leafletPending=null,dataPending=null;
function leaflet(){
 if(window.L?.map)return Promise.resolve(window.L);
 if(leafletPending)return leafletPending;
 leafletPending=new Promise((resolve,reject)=>{
  const css=document.createElement("link");
  css.rel="stylesheet";css.href=LEAFLET.css;css.integrity=LEAFLET.cssIntegrity;css.crossOrigin="anonymous";
  document.head.append(css);
  const script=document.createElement("script");
  script.src=LEAFLET.script;script.integrity=LEAFLET.scriptIntegrity;script.crossOrigin="anonymous";
  script.async=true;
  script.onload=()=>window.L?.map?resolve(window.L):reject(new Error("Leaflet indisponible"));
  script.onerror=()=>reject(new Error("Bibliothèque cartographique bloquée"));
  document.head.append(script);
 }).catch(error=>{leafletPending=null;throw error;});
 return leafletPending;
}
function validPoint(point){
 return point&&typeof point.id==="string"&&point.id.length<90&&
  typeof point.title==="string"&&point.title.length<130&&
  Number.isFinite(point.latitude)&&Math.abs(point.latitude)<=90&&
  Number.isFinite(point.longitude)&&Math.abs(point.longitude)<=180&&
  ["reference","mission"].includes(point.kind)&&
  point.precision==="city"&&
  typeof point.description==="string"&&point.description.length<520&&
  typeof point.link==="string"&&/^\/(?!\/)[a-zA-Z0-9/#_-]*$/.test(point.link);
}
function publicPoints(){
 if(dataPending)return dataPending;
 dataPending=fetch(DATA,{credentials:"omit"})
   .then(response=>{if(!response.ok)throw new Error("Données publiques indisponibles");return response.json()})
   .then(value=>Array.isArray(value?.locations)?value.locations.filter(validPoint):[])
   .catch(()=>[]); // La carte reste utilisable, même sans marqueur.
 return dataPending;
}
function textNode(tag,content,className){
 const element=document.createElement(tag);
 element.textContent=content;
 if(className)element.className=className;
 return element;
}
function safePopup(point){
 const box=document.createElement("div");
 box.className="sde-geo-popup";
 box.append(textNode("strong",point.title));
 box.append(textNode("p",point.description));
 box.append(textNode("small",point.kind==="mission"?"Mission documentée":"Repère géographique — précision ville"));
 const link=document.createElement("a");
 link.href=point.link;link.textContent="Lire les informations officielles →";
 box.append(link);
 return box;
}
function pinIcon(L,kind){
 return L.divIcon({
  className:"sde-geo-pin "+(kind==="mission"?"sde-geo-pin-mission":"sde-geo-pin-reference"),
  html:'<span class="sde-geo-pin-core" aria-hidden="true"></span>',
  iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-15]
 });
}
function init(root){
 if(root.dataset.geoInit==="1")return;
 root.dataset.geoInit="1";
 const mapNode=root.querySelector("[data-geo-map-canvas]");
 const intro=root.querySelector("[data-geo-intro]");
 const launch=root.querySelector("[data-geo-launch]");
 const status=root.querySelector("[data-geo-status]");
 const list=root.querySelector("[data-geo-places]");
 const filterButtons=[...root.querySelectorAll("[data-geo-filter]")];
 const viewButtons=[...root.querySelectorAll("[data-geo-view]")];
 const reset=root.querySelector("[data-geo-reset]");
 const full=root.querySelector("[data-geo-fullscreen]");
 const fallback=root.querySelector("[data-geo-fallback]");
 let map=null,visible=[],markers=[],points=[],filter="all";
 let view=VIEWS[root.dataset.geoStart]?"coteivoire": "monde";
 if(VIEWS[root.dataset.geoStart])view=root.dataset.geoStart;
 const say=message=>{if(status)status.textContent=message};
 const updateButtons=()=>{
  for(const button of filterButtons)button.setAttribute("aria-pressed",String(button.dataset.geoFilter===filter));
  for(const button of viewButtons)button.setAttribute("aria-pressed",String(button.dataset.geoView===view));
 };
 function render(){
  if(!map)return;
  for(const marker of markers)map.removeLayer(marker);
  markers=[];
  visible=points.filter(p=>filter==="all"||p.kind==="mission");
  if(list)list.replaceChildren();
  if(!visible.length){
   list?.append(textNode("p","Aucune mission avec une localisation publique confirmée n’est actuellement référencée.","sde-geo-empty"));
   say("Aucune mission géolocalisée confirmée à afficher. Vous pouvez toujours explorer le fond de carte.");
   return;
  }
  for(const point of visible){
   const marker=window.L.marker([point.latitude,point.longitude],{icon:pinIcon(window.L,point.kind),title:point.title,keyboard:true});
   marker.bindPopup(safePopup(point),{maxWidth:260});
   marker.addTo(map);
   markers.push(marker);
   const button=document.createElement("button");
   button.type="button";button.className="sde-geo-place";
   button.append(textNode("strong",point.title));
   button.append(textNode("small",point.kind==="mission"?"Mission géolocalisée publiée":"Repère à l’échelle de la ville"));
   button.addEventListener("click",()=>{
    if(reduce())map.setView([point.latitude,point.longitude],11);
    else map.flyTo([point.latitude,point.longitude],11,{duration:1.05});
    marker.openPopup();say(point.title+" sélectionné.");
   });
   list?.append(button);
  }
  say(visible.length+" repère géographique disponible. Cliquer sur le point ou son nom pour découvrir sa fiche.");
 }
 function move(){
  if(!map)return;
  const selection=VIEWS[view];
  if(reduce())map.setView(selection.center,selection.zoom);
  else map.flyTo(selection.center,selection.zoom,{duration:.8});
  say("Vue "+selection.label+" sélectionnée.");
 }
 viewButtons.forEach(button=>button.addEventListener("click",()=>{
  if(!VIEWS[button.dataset.geoView])return;
  view=button.dataset.geoView;updateButtons();
  if(map)move();
  else say("Vue "+VIEWS[view].label+" préparée. Activez la carte pour l’explorer.");
 }));
 filterButtons.forEach(button=>button.addEventListener("click",()=>{
  if(!["all","mission"].includes(button.dataset.geoFilter))return;
  filter=button.dataset.geoFilter;updateButtons();
  if(map)render();else say(filter==="mission"?"Filtre Missions prêt : la carte affichera uniquement les missions documentées.":"Tous les repères documentés seront affichés.");
 }));
 reset?.addEventListener("click",()=>{if(map)move();});
 full?.addEventListener("click",()=>{
  const expanded=root.classList.toggle("sde-geo-expanded");
  full.setAttribute("aria-pressed",String(expanded));
  full.textContent=expanded?"Réduire la carte":"Agrandir la carte";
  if(map)requestAnimationFrame(()=>map.invalidateSize());
 });
 root.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&root.classList.contains("sde-geo-expanded")){
   root.classList.remove("sde-geo-expanded");
   full?.setAttribute("aria-pressed","false");
   if(full){full.textContent="Agrandir la carte";full.focus();}
   if(map)requestAnimationFrame(()=>map.invalidateSize());
  }
 });
 updateButtons();
 launch?.addEventListener("click",async()=>{
  if(map)return;
  launch.disabled=true;
  say("Chargement de la carte géographique…");
  try{
   const [L,coords]=await Promise.all([leaflet(),publicPoints()]);
   points=coords;
   if(intro)intro.hidden=true;
   if(mapNode)mapNode.hidden=false;
   map=L.map(mapNode,{zoomControl:false,scrollWheelZoom:false,
     keyboard:true,preferCanvas:true,zoomAnimation:!reduce(),
     fadeAnimation:!reduce(),markerZoomAnimation:!reduce(),
     center:VIEWS[view].center,zoom:VIEWS[view].zoom});
   L.control.zoom({position:"topright"}).addTo(map);
   L.tileLayer(TILES,{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
     minZoom:2,maxZoom:18,updateWhenIdle:true,keepBuffer:1}).addTo(map);
   render();
   if(fallback)fallback.hidden=false;
   reset?.removeAttribute("disabled");
   full?.removeAttribute("disabled");
   requestAnimationFrame(()=>map.invalidateSize());
  }catch(_error){
   say("La carte n’a pas pu être chargée. Utilisez le lien OpenStreetMap pour l’ouvrir directement.");
   if(launch){launch.disabled=false;launch.textContent="Réessayer d’ouvrir la carte";}
   if(fallback)fallback.hidden=false;
  }
 });
}
function start(){document.querySelectorAll("[data-sde-real-map]").forEach(init);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();
