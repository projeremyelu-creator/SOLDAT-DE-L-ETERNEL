/* Passerelle visuelle SDE : liens inter-sites et recherche locale publique. */
(() => {
  "use strict";
  const site="https://mouvement-sde.org/";
  const app="https://app.mouvement-sde.org/";
  const start=()=>{
    const isPrivate=location.hostname==="app.mouvement-sde.org";
    if(isPrivate){
      const link=document.querySelector(".hdr-site");
      if(link&&!link.querySelector(".sde-public-label")){
        const span=document.createElement("span");
        span.className="sde-public-label";
        span.textContent="Site public";
        link.append(span);
      }
      const banner=document.getElementById("banner");
      if(banner&&!document.querySelector(".sde-private-links")){
        const nav=document.createElement("nav");
        nav.className="sde-private-links";
        nav.setAttribute("aria-label","Accès aux rubriques publiques SDE");
        nav.innerHTML=
          '<a href="'+app+'os/">SDE OS v3.1</a>'+
          '<a href="'+site+'">Portail SDE</a>'+
          '<a href="'+site+'vitrine/programmes">Programmes publics</a>'+
          '<a href="'+site+'vitrine/prieres">Prières</a>'+
          '<a href="'+site+'vitrine/temoignages">Témoignages</a>'+
          '<a href="'+site+'vitrine/soldiers-voice">Soldiers Voice</a>'+
          '<a href="'+site+'vitrine/missions-humanitaires">Missions</a>';
        banner.insertAdjacentElement("afterend",nav);
      }
    }else if(location.hostname==="mouvement-sde.org"){
      const plus=document.querySelector('body[data-sde-page="plus"] .sde-simple-grid');
      if(plus&&!document.querySelector(".sde-directory-search")){
        const container=document.createElement("div");
        container.className="sde-directory-search";
        const label=document.createElement("label");label.htmlFor="sde-rubriques-filter";
        label.textContent="Rechercher une rubrique SDE";
        const input=document.createElement("input");input.type="search";input.id=label.htmlFor;
        input.autocomplete="off";input.placeholder="Programmes, prière, témoignages, musique…";
        const count=document.createElement("output");count.className="sde-count";count.setAttribute("aria-live","polite");
        const empty=document.createElement("p");empty.className="sde-search-empty";
        empty.textContent="Aucune rubrique trouvée.";empty.hidden=true;
        container.append(label,input,count,empty);plus.insertAdjacentElement("beforebegin",container);
        const normalize=(s)=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
        const cards=[...plus.querySelectorAll("a[href]")];
        const run=()=>{const query=normalize(input.value.trim());let visible=0;
          cards.forEach(card=>{const show=!query||normalize(card.textContent).includes(query);card.hidden=!show;if(show)visible++;});
          count.textContent=visible+" rubrique"+(visible>1?"s":"");
          empty.hidden=visible!==0;
        };
        input.addEventListener("input",run);run();
      }
      const header=document.querySelector("header.entete .entete-droite, header.entete .entete-actions");
      if(header&&!header.querySelector(".sde-portal-bridge")&&!header.querySelector(".btn-membre")){
        const link=document.createElement("a");
        link.href=app+"#connexion";link.className="sde-portal-bridge";link.textContent="Espace sécurisé";
        header.append(link);
      }
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
