/* Portail privé à navigation directe.
   Les rubriques déclenchent le routeur de l'application historique dans la même page.
   Aucune nouvelle API ni données clonées : même compte, même moteur, mêmes contrôles Worker.
 */
(() => {
  "use strict";
  if (location.hostname !== "mouvement-sde.org") return;
  const mode=location.pathname==="/mon-espace"?"membre":
    location.pathname==="/administration"?"direction":null;
  if(!mode)return;

  const catalogue={
    accueil:"Vue d'ensemble",espace:"Mon espace",membres:"Membres",
    agenda:"Agenda et présences",garnisons:"Garnisons",academie:"Soldiers Academy",
    portevoix:"Annonces et messages",chambre:"Prière et intercession",
    projets:"Projets",secretariat:"Décisions",finances:"Finances",
    arsenal:"Enseignements",mediatheque:"Médiathèque",assistant:"Assistant Éliézer"
  };
  const personnel=new Set(["espace","agenda","academie","portevoix","arsenal","mediatheque"]);
  const groupes=[
    {titre:"Mon tableau de bord",ids:["accueil","espace"]},
    {titre:"Membres et activités",ids:["membres","agenda","garnisons","projets","secretariat"]},
    {titre:"Formation et vie spirituelle",ids:["academie","chambre","arsenal","mediatheque"]},
    {titre:"Communication",ids:["portevoix","assistant"]},
    {titre:"Gestion financière",ids:["finances"]}
  ];
  const url=new URL(location.href);
  const demandé=url.searchParams.get("module")||"";
  const souhait=Object.prototype.hasOwnProperty.call(catalogue,demandé)?demandé:
    mode==="membre"?"espace":"accueil";
  const body=document.body;
  body.classList.add("sde-direct",mode==="membre"?"sde-direct-member":"sde-direct-admin");
  let compte=null,initial=false,signature="",navCourant="";
  const titrePage=mode==="membre"?"Mon espace personnel":"Poste de commandement";
  document.title=titrePage+" | Soldats de l'Éternel";
  const element=(tag,classe,contenu)=>{
    const node=document.createElement(tag);
    if(classe)node.className=classe;
    if(contenu!==undefined)node.textContent=contenu;
    return node;
  };
  const link=(href,txt,cls)=>{
    const el=element("a",cls,txt);el.href=href;return el;
  };
  function allowed(nom){
    if(!Object.prototype.hasOwnProperty.call(catalogue,nom))return false;
    if(mode==="membre"&&!personnel.has(nom))return false;
    if(nom==="finances"&&compte?.niveau<2)return false;
    return true;
  }
  function start(){
    const header=element("header");header.id="sde-direct-top";
    const head=element("div","sde-direct-header");
    const brand=link("/","S.D.E.","sde-direct-logo");
    const logo=document.createElement("img");
    logo.src="/vitrine/logo-96.png";logo.alt="";logo.width=36;logo.height=36;
    brand.prepend(logo);head.append(brand);
    const publique=link("/","Site public");head.append(publique);
    const membre=link("/mon-espace","Mon espace");head.append(membre);
    if(mode==="membre")membre.setAttribute("aria-current","page");
    const direction=link("/administration","Administration");
    direction.hidden=true;
    if(mode==="direction")direction.setAttribute("aria-current","page");
    head.append(direction);
    const reglages=element("button","sde-direct-settings","Réglages");
    reglages.type="button";
    reglages.addEventListener("click",()=>{
      const natif=document.getElementById("btn-reglages");
      if(natif) natif.click();
    });
    head.append(reglages);
    const role=element("span","sde-direct-access",mode==="membre"?"Tableau personnel":"Poste de commandement");
    head.append(role);
    const tabs=element("nav");tabs.id="sde-direct-tabs";tabs.setAttribute("aria-label","Rubriques de l'espace privé");
    header.append(head);
    body.insertBefore(header,body.firstChild);
    const original=document.getElementById("nav");
    const shell=document.querySelector(".shell");
    if(!original||!shell)return;

    // Le tableau de bord ET le contenu natif restent sur la même page.
    const workspace=element("div","sde-direct-workspace");
    const sidebar=element("aside","sde-direct-aside");
    sidebar.id="sde-direct-aside";
    sidebar.setAttribute("aria-label","Menu des rubriques privées");
    sidebar.dataset.collapsed="false";
    const sidenavHead=element("div","sde-direct-aside-head");
    const heading=element("h2","sde-direct-aside-heading",titrePage);
    const note=element("p","sde-direct-aside-intro","Choisissez une rubrique : son contenu s'affiche ici.");
    const menuToggle=element("button","sde-direct-menu-toggle","Masquer les rubriques");
    menuToggle.type="button";menuToggle.setAttribute("aria-controls","sde-direct-tabs");menuToggle.setAttribute("aria-expanded","true");
    menuToggle.addEventListener("click",()=>{
      const collapsed=sidebar.dataset.collapsed!=="true";
      sidebar.dataset.collapsed=String(collapsed);
      menuToggle.setAttribute("aria-expanded",String(!collapsed));
      menuToggle.textContent=collapsed?"Afficher toutes les rubriques":"Masquer les rubriques";
    });
    sidenavHead.append(heading,note,menuToggle);
    sidebar.append(sidenavHead,tabs);
    shell.before(workspace);workspace.append(sidebar,shell);

    const sync=()=>{
      if(!compte)return;
      const buttons=[...original.querySelectorAll('button[data-vue]')];
      const disponibles=buttons.filter(b=>allowed(b.dataset.vue)&&!b.disabled);
      const next=disponibles.map(b=>b.dataset.vue).join("|");
      const rebuilt=next!==signature;
      if(rebuilt){
        signature=next;tabs.replaceChildren();
        for(const groupe of groupes){
          const compatibles=disponibles.filter(b=>groupe.ids.includes(b.dataset.vue));
          if(!compatibles.length)continue;
          const section=element("div","sde-direct-group");
          section.append(element("h3","sde-direct-group-title",groupe.titre));
          for(const b of compatibles){
            const nom=b.dataset.vue;
            const item=element("button","sde-direct-tab",catalogue[nom]);
            item.type="button";item.dataset.module=nom;
            item.addEventListener("click",()=>{
              const target=original.querySelector('button[data-vue="'+nom+'"]');
              if(!target||target.disabled)return;
              // Une seule action : le routeur natif remplace #main sur place.
              target.click();
              const nextUrl=new URL(location.href);
              nextUrl.searchParams.set("module",nom);
              if(nextUrl.hash)nextUrl.hash="";
              history.replaceState(null,"",nextUrl.pathname+nextUrl.search);
              if(window.matchMedia?.("(max-width:760px)").matches){
                sidebar.dataset.collapsed="true";
                menuToggle.setAttribute("aria-expanded","false");
                menuToggle.textContent="Afficher toutes les rubriques";
                document.getElementById("main")?.focus({preventScroll:true});
              }
            });
            section.append(item);
          }
          tabs.append(section);
        }
      }
      const courant=buttons.find(b=>b.getAttribute("aria-current")==="page"||b.classList.contains("on"))?.dataset.vue||"";
      if(courant!==navCourant||rebuilt){
        navCourant=courant;
        for(const b of tabs.querySelectorAll("button")){
          if(b.dataset.module===courant)b.setAttribute("aria-current","page");
          else b.removeAttribute("aria-current");
        }
      }
      if(!initial&&disponibles.length){
        const cible=disponibles.find(b=>b.dataset.vue===souhait)||
          disponibles.find(b=>b.dataset.vue===(mode==="membre"?"espace":"accueil"))||
          disponibles[0];
        initial=true;
        // Si le lien demandé n'est pas autorisé, rester dans le tableau natif adapté.
        if(!cible.classList.contains("on")&&cible.getAttribute("aria-current")!=="page")cible.click();
      }
    };
    const monitor=new MutationObserver(sync);
    monitor.observe(original,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-current","class"]});
    fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(user=>{
        if(!user||!user.connecte){role.textContent="Session non disponible";return}
        compte=user;
        role.textContent=user.libRole||user.role||(mode==="membre"?"Membre":"Direction");
        direction.hidden=user.niveau<1;
        sync();
      })
      .catch(()=>{role.textContent="Connexion indisponible";});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();