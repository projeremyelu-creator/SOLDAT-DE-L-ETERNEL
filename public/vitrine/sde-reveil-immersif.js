/* SDE — interactions du Réveil des Nations.
   Onglets accessibles, événement calqué sur la fiche publique courante,
   animations facultatives et vidéo ouverte seulement sur action explicite. */
(()=>{
 "use strict";
 const init=()=>{
  const root=document.getElementById("reveil-des-nations");
  if(!root||root.dataset.rvReady==="true")return;
  root.dataset.rvReady="true";
  const tabs=[...root.querySelectorAll("[data-sde-rv-tab]")];
  const panels=[...root.querySelectorAll("[data-sde-rv-panel]")];
  const activate=(id,focus=false)=>{
   const chosen=tabs.find(tab=>tab.dataset.sdeRvTab===id);
   if(!chosen)return;
   tabs.forEach(tab=>{
    const active=tab===chosen;
    tab.setAttribute("aria-selected",String(active));
    tab.tabIndex=active?0:-1;
   });
   panels.forEach(panel=>{panel.hidden=panel.dataset.sdeRvPanel!==id;});
   if(focus)chosen.focus();
  };
  tabs.forEach((tab,index)=>{
   tab.addEventListener("click",()=>activate(tab.dataset.sdeRvTab));
   tab.addEventListener("keydown",event=>{
    const key=event.key;
    if(!["ArrowRight","ArrowLeft","Home","End"].includes(key))return;
    event.preventDefault();
    const next=key==="Home"?0:key==="End"?tabs.length-1:
     (index+(key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
    activate(tabs[next].dataset.sdeRvTab,true);
   });
  });
  const mediaButton=root.querySelector("[data-sde-rv-video]");
  const mediaPanel=root.querySelector("#sde-rv-media-panel");
  const video=mediaPanel?.querySelector("video");
  mediaButton?.addEventListener("click",()=>{
   if(!mediaPanel)return;
   const open=mediaPanel.hidden;
   mediaPanel.hidden=!open;
   mediaButton.setAttribute("aria-expanded",String(open));
   mediaButton.textContent=open?"Masquer le film SDE":"▶ Voir le film SDE (1 min 13)";
   if(open){
    video?.load();
    const attempt=video?.play();
    if(attempt?.catch)attempt.catch(()=>{ /* Le lecteur visible reste utilisable. */ });
   }else video?.pause();
  });
  const motionButton=root.querySelector("[data-sde-rv-motion]");
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
  let paused=reduced;
  const reflectMotion=()=>{
   root.classList.toggle("sde-rv-motion-paused",paused);
   motionButton?.setAttribute("aria-pressed",String(paused));
   if(motionButton)motionButton.textContent=paused?"Activer les animations":"Mettre les animations en pause";
  };
  reflectMotion();
  motionButton?.addEventListener("click",()=>{paused=!paused;reflectMotion();});
  /* Ne jamais afficher des mesures, des dates ou une diffusion inventées :
     la carte d'agenda est synchronisée avec la fiche déjà rendue par le site. */
  const source=document.querySelector("#prochain-rendez-vous");
  const title=root.querySelector("[data-sde-rv-event-title]");
  const date=root.querySelector("[data-sde-rv-event-date]");
  const time=root.querySelector("[data-sde-rv-event-time]");
  const link=root.querySelector("[data-sde-rv-event-link]");
  let lastSync="";
  const syncEvent=()=>{
   if(!source)return;
   const incomingTitle=source.querySelector("#ap-next-title")?.textContent?.trim();
   const incomingDate=source.querySelector("#ap-next-date");
   const incomingTime=source.querySelector("#ap-next-time")?.textContent?.trim();
   const incomingLink=source.querySelector("#ap-next-more")?.getAttribute("href");
   const stamp=[incomingTitle,incomingDate?.getAttribute("datetime"),incomingDate?.textContent,incomingTime,incomingLink].join("|");
   if(stamp===lastSync)return;
   lastSync=stamp;
   if(title&&incomingTitle)title.textContent=incomingTitle;
   if(date&&incomingDate?.textContent?.trim()){
    date.textContent=incomingDate.textContent.trim();
    const iso=incomingDate.getAttribute("datetime");
    if(iso)date.setAttribute("datetime",iso);
   }
   if(time&&incomingTime)time.textContent=incomingTime;
   if(link&&incomingLink){
    try{
     const dest=new URL(incomingLink,document.baseURI);
     if(dest.origin===location.origin)link.setAttribute("href",dest.pathname+dest.search+dest.hash);
    }catch(_){ /* Conserver le lien de secours si URL invalide. */ }
   }
  };
  syncEvent();
  if(source&&typeof MutationObserver!=="undefined"){
   const observer=new MutationObserver(syncEvent);
   observer.observe(source,{childList:true,characterData:true,attributes:true,subtree:true});
  }
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
