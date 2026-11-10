/* SDE 2027 — navigation de l'interface premium Soldiers Academy.
 * Cette couche ne modifie pas les règles d'accès ni les notes.
 * Elle ouvre uniquement les onglets existants après une session valide. */
(()=>{
 "use strict";
 function init(){
  const root=document.querySelector("body.sde-v5-campus-private");
  if(!root||root.dataset.sdeV5CampusInit==="true")return;
  root.dataset.sdeV5CampusInit="true";
  const buttons=[...root.querySelectorAll("[data-v5-tab-target]")];
  const student=root.querySelector("#studentPage");
  function sync(){
   buttons.forEach(button=>{
    const tab=document.getElementById(button.dataset.v5TabTarget);
    const active=Boolean(tab&&tab.getAttribute("aria-selected")==="true");
    button.setAttribute("aria-current",active?"true":"false");
    button.disabled=Boolean(student?.hidden||!tab||tab.hidden);
   });
  }
  buttons.forEach(button=>{
   button.addEventListener("click",()=>{
    const tab=document.getElementById(button.dataset.v5TabTarget);
    if(!tab||tab.hidden||student?.hidden)return;
    tab.click();
    tab.focus();
    sync();
   });
  });
  const tabs=root.querySelector("#mainTabs");
  if(tabs&&typeof MutationObserver!=="undefined"){
   const observer=new MutationObserver(sync);
   observer.observe(tabs,{attributes:true,subtree:true,attributeFilter:["aria-selected","hidden"]});
  }
  if(student&&typeof MutationObserver!=="undefined"){
   const observer=new MutationObserver(sync);
   observer.observe(student,{attributes:true,attributeFilter:["hidden"]});
  }
  sync();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
