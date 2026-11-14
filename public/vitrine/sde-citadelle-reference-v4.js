/* Interface de la maquette V4 reliée aux données déjà autorisées sur la session SDE.
 * Aucune API nouvelle, aucun compteur fictif, aucune mutation des données métier. */
(() => {
 "use strict";
 const elt=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 const action=(label,vue,tag="button")=>{
  const el=elt(tag,"",label);
  if(tag==="button"){el.type="button";el.dataset.vue=vue;el.addEventListener("click",()=>window.SDEPortal?.selectionner?.(vue,{userInitiated:true}));}
  return el;
 };
 function carte(titre,texte,lien,vue,cls){
  const card=elt("article","sde-ref-card"+(cls?" "+cls:""));
  card.append(elt("h3","",titre),elt("p","",texte));
  const button=vue?action(lien,vue):elt("a","",lien);
  if(!vue)button.href=cls==="sde-ref-card--priere"?"/priere":"/missions";
  card.append(button);return card;
 }
 function commandBoard(view){
  if(view.querySelector(".sde-ref-command")||!view.querySelector(".acc-hero"))return;
  const deck=elt("section","sde-ref-command");
  deck.setAttribute("aria-label","SDE Digital — Centre de commandement");
  const headline=elt("div","sde-ref-headline");
  headline.append(elt("h2","","Tableau de bord · La Citadelle"),elt("span","sde-ref-status","● Espace sécurisé"));
  deck.append(headline);
  const originals=[...view.querySelectorAll(".chiffres .chiffre")].slice(0,4);
  if(originals.length){
   const metrics=elt("div","sde-ref-metrics");
   for(const original of originals){
    const raw=original.querySelector("b");
    const value=raw?.textContent?.trim()||"";
    if(!value||value==="—")continue;
    const label=original.querySelector(".chiffre-l")?.textContent?.trim()||"Indicateur";
    const detail=original.querySelector("small")?.textContent?.trim()||"";
    const tile=elt("button","sde-ref-metric");tile.type="button";
    const viewName=original.getAttribute("data-vue");
    if(viewName)tile.dataset.vue=viewName;
    tile.append(elt("b","",value),elt("span","",[label,detail].filter(Boolean).join(" · ")));
    metrics.append(tile);
   }
   if(metrics.childElementCount)deck.append(metrics);
  }
  const agendaTitre=view.querySelector(".auj-evt .auj-t")?.textContent?.trim();
  const agendaMeta=view.querySelector(".auj-evt .auj-m")?.textContent?.trim();
  const cards=elt("div","sde-ref-cards");
  const event=carte("▣ Agenda",agendaTitre||"Prochains rendez-vous","Voir l’agenda →","agenda","");
  if(agendaMeta)event.insertBefore(elt("p","",agendaMeta),event.lastElementChild);
  cards.append(event);
  cards.append(carte("✦ Soldiers Academy","Formations et ressources selon vos autorisations","Poursuivre ma formation →","academie",""));
  cards.append(carte("❧ Missions","Projets, mobilisation et impact sur le terrain","Voir les missions →",null,"sde-ref-card--missions"));
  cards.append(carte("♢ Intercession","Sujets et accompagnement dans votre espace autorisé","Ouvrir la prière →",null,"sde-ref-card--priere"));
  // Les notifications sont issues des priorités réellement présentes dans la session :
  // aucune quantité, alerte ou tâche de démonstration n'est créée.
  const notices=[...view.querySelectorAll(".prio .prio-i")].slice(0,3);
  if(notices.length){
   const note=elt("article","sde-ref-card sde-ref-card--notifications");
   note.append(elt("h3","","♧ Notifications"));
   const list=elt("ul","sde-ref-alert-list");
   for(const originalNotice of notices){
    const label=originalNotice.querySelector(".prio-x b")?.textContent?.trim();
    const detail=originalNotice.querySelector(".prio-x small")?.textContent?.trim();
    if(!label)continue;
    const item=elt("li","",label);
    if(detail)item.append(elt("small","",detail));
    list.append(item);
   }
   if(list.children.length){note.append(list);cards.append(note);}
  }
  const network=carte("✧ Réseau SDE","Présence, formation et missions : la vision au-delà des frontières.","Découvrir le réseau →",null,"sde-ref-card--reseau");
  network.querySelector("a").href="/reseau";
  cards.append(network);
  deck.append(cards);
  view.insertBefore(deck,view.firstChild);
  // Un seul tableau de bord Citadelle affiché : les anciens blocs restent
  // accessibles sur demande dans les outils complets, sans perte d'actions.
  const legacy=[...view.children].filter(node=>node!==deck);
  if(legacy.length){
   const details=elt("details","sde-ref-operational");
   details.append(elt("summary","","Outils complets, opérations et rapports SDE"));
   const content=elt("div","sde-ref-operational-content");
   for(const node of legacy)content.append(node);
   details.append(content);
   view.append(details);
  }
 }
 function memberCards(view){
  const realCard=view.querySelector("#sde-personal-card");
  if(!realCard||view.querySelector(".sde-ref-member-shortcuts"))return;
  const wrapper=elt("section","sde-ref-member-shortcuts");
  wrapper.setAttribute("aria-label","Raccourcis personnels du soldat");
  wrapper.append(elt("h2","","Mon espace personnel"));
  const grid=elt("div","sde-ref-member-shortcuts-grid");
  // Les cinq modules privés sont accessibles par le routeur existant :
  // aucune donnée d'un autre soldat n'est chargée, aucune permission n'est ajoutée.
  const shortcuts=[
   ["🎓","Soldiers Academy","Ma formation et mes attestations","academie"],
   ["▣","Mon agenda","Mes rendez-vous et activités","rendezvous"],
   ["♙","Mon profil","Ma fiche, ma photo et ma carte","espace"],
   ["✦","Mes prières","Intercession et suivi confidentiel","priere"],
   ["▤","Mes ressources","Bibliothèque et enseignements","bibliotheque"]
  ];
  // Le routeur authentifié peut autoriser des vues absentes du menu historique.
  // En l'absence du routeur, n'afficher que les vues explicitement navigables.
  const permitted=new Set([
   ...document.querySelectorAll("#sde-direct-tabs [data-module], #nav [data-vue]")
  ].map(node=>node.dataset.module||node.dataset.vue));
  for(const [icon,title,detail,route] of shortcuts){
   if(permitted.size&&!permitted.has(route)&&!window.SDEPortal?.selectionner)continue;
   const button=action("",route);
   button.className="sde-ref-shortcut";
   button.setAttribute("aria-label",title);
   button.append(elt("span","sde-ref-shortcut-icon",icon),elt("b","",title),elt("small","",detail));
   grid.append(button);
  }
  const mission=elt("a","sde-ref-shortcut","");
  mission.href="/missions";
  mission.append(elt("span","sde-ref-shortcut-icon","♡"),elt("b","","Missions & Impact"),elt("small","","Servir et agir sur le terrain"));
  grid.append(mission);
  // Éviter de recréer les anciens raccourcis lorsque la couche de référence
  // historique s'initialise après celle-ci.
  grid.dataset.sdeReferenceExpanded="true";
  wrapper.append(grid);
  const tpa=elt("a","sde-ref-member-event","");
  tpa.href="/programmes";
  tpa.append(elt("strong","","ALEPH 12 · 12 jours de Jeûne et Prière"),elt("span","","À venir — consulter les programmes SDE"),elt("span","","Voir les programmes →"));
  wrapper.append(tpa);
  realCard.insertAdjacentElement("afterend",wrapper);
 }
 function improveHeader(){
  const top=document.querySelector("#sde-direct-top .sde-direct-header");
  if(!top||top.querySelector(".sde-citadel-private-title"))return;
  const member=document.body.classList.contains("sde-direct-member");
  const headline=elt("span","sde-citadel-private-title",member?"SDE DIGITAL — MON ESPACE":"SDE DIGITAL — CENTRE DE COMMANDEMENT");
  top.querySelector(".sde-direct-logo")?.insertAdjacentElement("afterend",headline);
 }
 function mount(){
  if(!document.body.classList.contains("sde-direct"))return;
  improveHeader();
  const view=document.querySelector("#main > .view");
  if(!view)return;
  commandBoard(view);
  if(document.body.classList.contains("sde-direct-member"))memberCards(view);
 }
 function start(){
  mount();
  const main=document.getElementById("main");
  if(main){
   const observer=new MutationObserver(()=>mount());
   observer.observe(main,{childList:true});
  }
  // Le portail direct est monté après les données de rôle; attendre ce montage sans
  // réinitialiser les sessions, routes ou permissions.
  const parent=new MutationObserver(()=>{
   if(document.body.classList.contains("sde-direct")){mount();parent.disconnect();}
  });
  parent.observe(document.body,{childList:true});
  if(document.body.classList.contains("sde-direct"))parent.disconnect();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();
