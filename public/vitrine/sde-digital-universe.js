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
  const player=document.getElementById("sdu-tv-player");
  if(player){
   const title=document.getElementById("sdu-tv-current-title");
   const description=document.getElementById("sdu-tv-current-desc");
   document.querySelectorAll("[data-sdu-video-src]").forEach(button=>{
    button.addEventListener("click",()=>{
     const source=button.getAttribute("data-sdu-video-src")||"";
     // Les sources sont des fichiers publies par le mouvement, meme origine.
     if(!/^\/vitrine\/[a-z0-9/_-]+\.mp4$/i.test(source))return;
     if(player.getAttribute("src")!==source){player.pause();player.src=source;player.load();}
     const poster=button.getAttribute("data-sdu-video-poster")||"";
     if(/^\/vitrine\/[a-z0-9/_-]+\.(?:jpg|webp|png)$/i.test(poster))player.poster=poster;
     if(title)title.textContent=button.getAttribute("data-sdu-video-title")||"Vidéo SDE";
     if(description)description.textContent=button.getAttribute("data-sdu-video-desc")||"";
     document.querySelectorAll("[data-sdu-video-src]").forEach(other=>other.setAttribute("aria-pressed",String(other===button)));
     player.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"center"});
     player.focus({preventScroll:true});
    });
   });
  }
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