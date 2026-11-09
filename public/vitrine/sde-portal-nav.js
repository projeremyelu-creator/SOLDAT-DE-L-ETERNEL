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
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
