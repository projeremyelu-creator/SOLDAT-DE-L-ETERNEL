/* Navigation transversale SDE Digital Universe 2027.
   Un seul référentiel pour Soldier Quest, Soldiers Campus et le portail membre.
   Les routes privées restent filtrées par le Worker : aucun état personnel n'est exposé. */
(()=>{"use strict";
 const groups=[
  {name:"Tableau de bord",items:[["/mon-espace","Vue globale"],["/programmes#agenda","Agenda des programmes"]]},
  {name:"Soldier Quest",items:[["/soldier-quest","Missions et engagement"],["/priere","Prière et intercession"],["/temoignages","Témoignages"],["/missions-humanitaires","Actions de service"]]},
  {name:"Soldiers Campus",items:[["/mon-espace/academy","Mes formations et devoirs"],["/academy-programme-24","Catalogue des cours"],["/mon-espace/academy#love-school","Love School"],["/academy","Mentorat et inscriptions"]]},
  {name:"Communauté et médias",items:[["/communaute","Ma communauté SDE"],["/mouvement#poles","Les cinq pôles"],["/soldiers-tv","Soldiers TV"],["/soldiers-voice","Soldiers Voice"]]}
 ];
 const exact=location.pathname;
 const link=(href,label)=>{
  const a=document.createElement("a");a.href=href;a.textContent=label;
  if(href.split("#")[0]===exact&&!href.includes("#"))a.setAttribute("aria-current","page");
  return a;
 };
 const create=()=>{
  document.querySelectorAll("[data-sdu-universe-nav]").forEach((host,i)=>{
   if(host.dataset.sduBuilt)return;host.dataset.sduBuilt="true";
   const nav=document.createElement("nav");
   nav.className="sdu-cross-nav";
   nav.setAttribute("aria-label","Mon Portail S.D.E — navigation unifiée");
   for(const g of groups){
    const group=document.createElement("div");group.className="sdu-cross-nav-group";
    const h=document.createElement("h3");h.textContent=g.name;group.append(h);
    const container=document.createElement("div");container.className="sdu-cross-nav-links";
    for(const [href,label] of g.items)container.append(link(href,label));
    group.append(container);nav.append(group);
   }
   host.append(nav);
  });
  if(document.body.classList.contains("sde-campus-student")&&!document.querySelector(".sdu-private-bottom")){
   const bar=document.createElement("nav");bar.className="sdu-private-bottom";
   bar.setAttribute("aria-label","Navigation mobile Mon Portail SDE");
   for(const [href,label,symbol] of [
    ["/mon-espace","Accueil","⌂"],["/soldier-quest","Quest","◎"],
    ["/mon-espace/academy","Campus","✧"],["/priere","Prière","✦"],
    ["/soldiers-tv","TV","▷"]
   ]){
    const a=link(href,label);a.innerHTML="";
    const icon=document.createElement("span");icon.setAttribute("aria-hidden","true");icon.textContent=symbol;
    const text=document.createElement("span");text.textContent=label;
    a.append(icon,text);bar.append(a);
   }
   document.body.append(bar);
  }
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",create,{once:true});else create();
})();