/* Navigation unique des univers SDE, sans données privées et sans changement des droits serveur. */
(()=>{
 "use strict";
 const entries=[
  ["Tableau de bord","/mon-espace"],
  ["Soldier Quest","/soldier-quest"],
  ["Soldiers Campus","/mon-espace/academy"],
  ["Devoirs & examens","/mon-espace/academy#pane-parcours"],
  ["Love School","/mon-espace/academy#love-school"],
  ["Chaîne de prière","/priere"],
  ["Témoignages","/temoignages"],
  ["Ma communauté","/communaute"],
  ["Mon pôle","/mouvement#poles"],
  ["Soldiers TV","/soldiers-tv"]
 ];
 const mobileBar=()=>{
  if(!document.body.classList.contains("sde-campus-student")||document.querySelector(".sdu-campus-mobile-bar"))return;
  const icons={
   accueil:"M3 10 12 3l9 7v11h-6v-7H9v7H3z",
   quest:"M12 3l8 5v8l-8 5-8-5V8zM9 12l2 2 4-4",
   campus:"M3 9l9-5 9 5-9 5zM7 12v5c3 3 7 3 10 0v-5",
   priere:"M12 21V3M6 9l6 6 6-6",
   plus:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
  };
  const items=[
   ["Accueil","/mon-espace","accueil"],
   ["Quest","/soldier-quest","quest"],
   ["Campus","/mon-espace/academy","campus"],
   ["Prière","/priere","priere"],
   ["Plus","/mon-espace#outils","plus"]
  ];
  const nav=document.createElement("nav");nav.className="sdu-campus-mobile-bar";
  nav.setAttribute("aria-label","Raccourcis mobiles de Soldiers Campus");
  for(const [label,href,name] of items){
   const a=document.createElement("a");a.href=href;
   if(location.pathname===href)a.setAttribute("aria-current","page");
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
   svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d",icons[name]);svg.append(path);
   const text=document.createElement("span");text.textContent=label;a.append(svg,text);nav.append(a);
  }
  document.body.append(nav);
 };
 const install=()=>{
  for(const nav of document.querySelectorAll("[data-sdu-portal-nav]")){
   nav.querySelectorAll("[data-sdu-fallback]").forEach(el=>el.remove());
   const fragment=document.createDocumentFragment();
   for(const [label,href] of entries){
    const a=document.createElement("a");a.href=href;a.textContent=label;
    if(location.pathname===href.split("#")[0] && (!href.includes("#")||location.hash===href.split("#")[1].replace(/^/,"#"))) a.setAttribute("aria-current","page");
    fragment.append(a);
   }
   nav.prepend(fragment);
  }
  mobileBar();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
