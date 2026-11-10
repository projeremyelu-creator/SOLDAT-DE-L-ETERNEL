/* SDE 2027 — contrôles de la finition premium des références.
 * Aucune collecte de données, aucune API d'écriture, aucun accès privé.
 * Tous les contrôles sont des éléments HTML natifs accessibles. */
(()=>{
 "use strict";
 const init=()=>{
  const root=document.getElementById("reveil-des-nations");
  if(!root||root.dataset.sdePremiumReady==="true")return;
  root.dataset.sdePremiumReady="true";
  const mode=root.querySelector("[data-sde-rv-immersive]");
  const stage=root.querySelector("#sde-rv-immersive-stage");
  const setImmersive=(enabled)=>{
   root.classList.toggle("sde-rv-immersive",enabled);
   mode?.setAttribute("aria-pressed",String(enabled));
   if(mode)mode.textContent=enabled?"Quitter le mode immersion":"Activer le mode immersion";
   if(enabled&&stage&&window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches!==true){
    stage.scrollIntoView?.({behavior:"smooth",block:"nearest"});
   }
  };
  mode?.addEventListener("click",()=>{
   setImmersive(!root.classList.contains("sde-rv-immersive"));
  });
  root.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&root.classList.contains("sde-rv-immersive")){
    setImmersive(false);
    mode?.focus();
   }
  });
  const missions=root.querySelector(".sde-rv-missions");
  const buttons=[...root.querySelectorAll("[data-sde-mission-view]")];
  const projects=root.querySelector("[data-sde-mission-panel='projets']");
  const setMissionView=(view)=>{
   if(!missions||!["carte","projets"].includes(view))return;
   missions.dataset.view=view;
   buttons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.sdeMissionView===view)));
   if(projects)projects.hidden=view!=="projets";
  };
  buttons.forEach(button=>button.addEventListener("click",()=>setMissionView(button.dataset.sdeMissionView)));
  setMissionView("carte");
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
