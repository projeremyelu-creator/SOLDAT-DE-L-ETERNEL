/* SDE Multi-Page : méga-menu commun desktop. La barre mobile demeure dans portal.js. */
(() => {
  "use strict";
  const sections = [
    {title:"Le mouvement", links:[
      ["Présentation", "/vitrine/mouvement#mouvement", "Vision et identité"],
      ["Notre histoire", "/vitrine/mouvement#histoire", "Nos origines"],
      ["Pôles et départements", "/vitrine/mouvement#poles", "S'engager dans les pôles"],
      ["Nos projets", "/vitrine/projets#projets", "Actions et perspectives"]
    ]},
    {title:"Programmes", links:[
      ["Agenda", "/vitrine/programmes#agenda", "Prochains rendez-vous"],
      ["Tous les programmes", "/vitrine/programmes#programmes", "Formations et réunions"],
      ["IN FIRE 2026", "/vitrine/programmes#infire", "Conférence internationale"],
      ["Soldiers Academy", "/vitrine/academy", "Préinscription"],
      ["Prières et intercession", "/vitrine/prieres", "Temps de prière et contact"]
    ]},
    {title:"Ressources", links:[
      ["Enseignements et livres", "/vitrine/ressources#ressources", "Bibliothèque SDE"],
      ["Galerie et médias", "/vitrine/ressources#galerie", "La vie du mouvement"],
      ["Soldiers Academy", "/vitrine/academy", "Se former"],
      ["Témoignages", "/vitrine/temoignages", "Parcours de foi"]
    ]},
    {title:"S'engager", links:[
      ["Rejoindre SDE", "/vitrine/rejoindre#rejoindre", "Formulaire de contact"],
      ["Espace membre", "/vitrine/rejoindre#membres", "Compte et inscription"],
      ["Missions et solidarité", "/vitrine/projets#engagement", "Agir pour les autres"],
      ["Dons et soutien", "/vitrine/projets#soutenir", "Soutenir le mouvement"],
      ["Soldiers Voice", "/vitrine/soldiers-voice", "Groupe musical et louange"],
      ["Soldier’s Award", "/vitrine/soldiers-award", "Honneur et reconnaissance"],
      ["Missions humanitaires", "/vitrine/missions-humanitaires", "Bénévolat et solidarité"]
    ]}
  ];
  const escape = (s) => String(s).replace(/[&<>"']/g, x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const install = () => {
    const header = document.querySelector("header.entete .enveloppe");
    if (!header || header.querySelector(".sde-mega-nav")) return;
    const nav = document.createElement("nav");
    nav.className="sde-mega-nav";
    nav.setAttribute("aria-label","Navigation principale du site SDE");
    nav.innerHTML='<a class="sde-mega-home" href="/">Accueil</a>' +
      sections.map((part,i) => '<details class="sde-mega"><summary>' + escape(part.title) +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>' +
        '<div class="sde-mega-panel">' + part.links.map(link =>
          '<a href="' + escape(link[1]) + '"><strong>'+escape(link[0])+'</strong><small>'+escape(link[2])+'</small></a>'
        ).join("") + '</div></details>').join("") +
        '<a class="sde-mega-all" href="/vitrine/plus">Plus</a>';
    const actions = header.querySelector(".entete-droite, .entete-actions");
    if (actions) header.insertBefore(nav,actions);
    else header.append(nav);
    const details=[...nav.querySelectorAll("details")];
    for (const item of details) {
      item.addEventListener("toggle",()=>{if(item.open)for(const other of details)if(other!==item)other.open=false;});
      item.addEventListener("keydown",e=>{if(e.key==="Escape"&&item.open){item.open=false;item.querySelector("summary").focus();}});
    }
    document.addEventListener("click",e=>{if(!nav.contains(e.target))details.forEach(el=>el.open=false);});
    nav.addEventListener("click",e=>{if(e.target.closest("a"))details.forEach(el=>el.open=false);});
    const page=document.body.dataset.sdePage || "";
    const currentMap={mouvement:0,projets:3,programmes:1,ressources:2,rejoindre:3};
    if(page in currentMap) {
      const detail=details[currentMap[page]];
      detail.querySelector("summary")?.setAttribute("aria-current","page");
    }else if(page==="plus")nav.querySelector(".sde-mega-all").setAttribute("aria-current","page");
    else if(!page || page==="accueil")nav.querySelector(".sde-mega-home").setAttribute("aria-current","page");
    // En ouvrant un pôle depuis sa page dédiée, retrouver la fiche détaillée
    // déjà disponible dans la vitrine historique (aucun contenu ni fiche perdu).
    if (document.getElementById("accueil")) {
      try {
        const pending=sessionStorage.getItem("sde-pole-ouvrir");
        if (/^[1-5]$/.test(pending || "")) {
          sessionStorage.removeItem("sde-pole-ouvrir");
          const target=document.querySelector('.pole[data-pole="'+pending+'"]');
          if (target) setTimeout(()=>target.click(),80);
        }
      } catch (_) {}
    }
    // Les pages existantes ont déjà leur propre gestion du thème.
    if(document.body.classList.contains("sde-subpage")){
      const theme=document.getElementById("btn-theme");
      if(theme)theme.addEventListener("click",()=>{
        const newValue=document.documentElement.dataset.theme==="dark"?"light":"dark";
        document.documentElement.dataset.theme=newValue;
        try{localStorage.setItem("sde-theme",newValue);}catch(_){}
      });
      try{
        const preferred=localStorage.getItem("sde-theme");
        if(preferred==="dark"||preferred==="light")document.documentElement.dataset.theme=preferred;
      }catch(_){}
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
