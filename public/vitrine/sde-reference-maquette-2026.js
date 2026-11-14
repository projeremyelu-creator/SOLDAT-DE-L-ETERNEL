/* Maquette officielle — enrichissement progressif, uniquement côté présentation.
   Aucun chiffre simulé, aucun nouveau rôle ni mutation d'authentification. */
(() => {
 "use strict";
 const make=(tag,className,text)=>{
   const node=document.createElement(tag);
   if(className)node.className=className;
   if(text!==undefined)node.textContent=text;
   return node;
 };
 const quickLink=(href,icon,title,subtitle)=>{
   const link=make("a","","");
   link.href=href;
   link.append(make("span","sde-ref-icon",icon));
   const text=make("span","");
   text.append(make("strong","",title),make("small","",subtitle));
   link.append(text,make("span","sde-ref-arrow","›"));
   return link;
 };
 const programLink=(href,icon,title,subtitle)=>{
   const link=make("a","","");
   link.href=href;
   const visual=make("span","sde-ref-program-icon",icon);visual.setAttribute("aria-hidden","true");
   const copy=make("span","");
   copy.append(make("strong","",title),make("small","",subtitle));
   link.append(visual,copy);
   return link;
 };
 function mountPublic(){
   const body=document.body,hero=document.querySelector(".ap-hero");
   if(!body.classList.contains("sde-premium-home")||!hero||hero.querySelector(".sde-ref-program-strip"))return;
   const inner=hero.querySelector(".ap-hero-inner"),heading=hero.querySelector("#titre-accueil");
   if(!inner||!heading)return;
   // L'identité graphique de la capture devient le titre visible; le texte source
   // reste disponible pour l'historique éditorial et les contrats existants.
   if(!heading.dataset.sdeOriginalHeading)heading.dataset.sdeOriginalHeading=heading.textContent.trim();
   heading.textContent="SOLDATS DE L’ÉTERNEL";
   const tagline=hero.querySelector(".sde-citadel-tagline");
   if(tagline)tagline.textContent="Un peuple réveillé, formé, équipé et envoyé pour impacter les nations.";
   const copy=hero.querySelector(".ap-hero-copy");
   if(copy&&!copy.querySelector(".sde-ref-foundation")){
     const verse=make("p","sde-ref-foundation","Mouvement S.D.E. · Ézéchiel 37");
     verse.style.cssText="font:700 .85rem/1.5 'Plus Jakarta Sans',system-ui,sans-serif;color:#f4cf80;letter-spacing:.06em;margin:0 0 6px;";
     copy.insertBefore(verse,heading);
   }
   const hub=make("nav","sde-ref-hub-links");
   hub.setAttribute("aria-label","Accès rapides aux espaces du mouvement");
   hub.append(
     quickLink("/academy","🎓","Soldiers Academy","Formation et leadership"),
     quickLink("/soldiers-tv","▶","Soldiers TV","Enseignements et médias"),
     quickLink("/missions-humanitaires","♡","Missions & Impact","Service et compassion"),
     quickLink("/priere","✦","Intercession","Prière et vie spirituelle")
   );
   inner.append(hub);
   const strip=make("nav","sde-ref-program-strip");
   strip.setAttribute("aria-label","Programmes et rendez-vous du SDE");
   strip.append(
     programLink("/album-infire","🔥","IN FIRE","Archives 2024–2026"),
     programLink("/programmes","♨","ALEPH 12","12 jours de Jeûne et Prière · Bientôt"),
     programLink("/programmes#agenda","♧","AG extraordinaire","4 décembre 2026 · 19h30 en ligne")
   );
   const existingTpa=hero.querySelector(".sde-tpa-hero-card");
   if(existingTpa)strip.append(existingTpa);
   else strip.append(programLink("/programmes#tpa-2026","▣","TPA 2026","18 décembre · 20h GMT"));
   hero.append(strip);
 }
 function mountPrivate(){
   if(!document.body.classList.contains("sde-direct"))return;
   const view=document.querySelector("#main > .view");
   if(!view)return;
   const command=view.querySelector(".sde-ref-command");
   if(command){
     const h=command.querySelector(".sde-ref-headline h2");
     if(h)h.textContent=document.body.classList.contains("sde-direct-member")?"Mon espace Soldat":"Poste de commandement";
   }
   if(!document.body.classList.contains("sde-direct-member"))return;
   const shortcuts=view.querySelector(".sde-ref-member-shortcuts-grid");
   if(!shortcuts||shortcuts.dataset.sdeReferenceExpanded)return;
   shortcuts.dataset.sdeReferenceExpanded="true";
   // Le routeur de l'application garde le contrôle : n'exposer que les vues
   // déjà disponibles au rôle dans son menu.
   const candidates=[
     ["espace","♙ Mon profil","Consulter ma fiche"],
     ["agenda","▣ Mon agenda","Rendez-vous et activités"],
     ["portevoix","☷ Actualités","Communications du mouvement"]
   ];
   const navigation=document.querySelector("#nav");
   for(const [route,title,detail] of candidates){
     if(!navigation?.querySelector('[data-vue="'+route+'"]'))continue;
     const button=make("button","sde-ref-shortcut");
     button.type="button";button.dataset.vue=route;
     button.append(make("b","",title),make("small","",detail));
     shortcuts.append(button);
   }
 }
 function ready(){
   mountPublic();mountPrivate();
   const main=document.getElementById("main");
   if(main){
     let queued=false;
     const obs=new MutationObserver(()=>{
       if(queued)return;
       queued=true;
       queueMicrotask(()=>{queued=false;mountPrivate();});
     });
     obs.observe(main,{childList:true,subtree:true});
   }
   if(!document.body.classList.contains("sde-direct")){
     const obs=new MutationObserver(()=>{
       if(document.body.classList.contains("sde-direct")){
         obs.disconnect();mountPrivate();
       }
     });
     obs.observe(document.body,{attributes:true,attributeFilter:["class"]});
   }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
 else ready();
})();
