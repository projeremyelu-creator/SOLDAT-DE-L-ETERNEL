/* Interactions publiques SDE Digital Universe : pas de points, de suivi ou de diffusion inventes. */
(()=>{"use strict";
 const ready=()=>{
  const prefersReduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(!prefersReduced)document.body.classList.add("sdu-motion");
  document.querySelectorAll("[data-sdu-motion-toggle]").forEach(btn=>{
   const update=()=>{const paused=document.body.classList.contains("sdu-motion-paused");
    btn.textContent=paused?"Reprendre les animations":"Mettre les animations en pause";
    btn.setAttribute("aria-pressed",String(paused));};
   btn.addEventListener("click",()=>{document.body.classList.toggle("sdu-motion-paused");update();});update();
  });
  document.querySelectorAll("[data-sdu-filter-group]").forEach(group=>{
   const target=group.getAttribute("data-sdu-target");
   const grid=target?document.getElementById(target):null;
   if(!grid)return;
   const items=Array.from(grid.querySelectorAll("[data-sdu-category]"));
   const buttons=Array.from(group.querySelectorAll("button[data-sdu-filter]"));
   const status=group.querySelector("[data-sdu-filter-status]");
   const render=(value)=>{
    let shown=0;
    for(const item of items){
     const terms=(item.getAttribute("data-sdu-category")||"").split(/\s+/);
     const visible=value==="tous"||terms.includes(value);
     item.hidden=!visible;if(visible)shown++;
    }
    for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.sduFilter===value));
    if(status)status.textContent=shown===0?"Aucun contenu dans cette catégorie.":shown+" rubrique"+(shown>1?"s":"")+" disponible"+(shown>1?"s":"")+".";
   };
   for(const button of buttons)button.addEventListener("click",()=>render(button.dataset.sduFilter));
   render(buttons.find(b=>b.getAttribute("aria-pressed")==="true")?.dataset.sduFilter||"tous");
  });
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
})();