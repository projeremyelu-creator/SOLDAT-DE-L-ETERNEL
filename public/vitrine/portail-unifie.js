/* Portail SDE : navigation commune, sans framework ni données privées. */
(() => {
  "use strict";
  const routes = [
    ["/","Accueil"],["/mouvement","Le Mouvement"],["/programmes","Programmes"],
    ["/academy","Academy"],["/enseignements","Enseignements"],["/missions","Missions"],
    ["/priere","Prière"],["/mon-espace","Espace membre"],["/administration","Espace administrateur"]
  ];
  function navigation() {
    if (!document.querySelector(".site-header")) {
      const old = document.querySelector("header.entete");
      if (!old) return;
      document.body.classList.add("sde-multipage-unifie");
      const header = document.createElement("header");
      header.className = "site-header";
      header.innerHTML = '<div class="site-header-inner">' +
        '<a class="site-brand" href="/" aria-label="Soldats de l’Éternel — accueil">' +
        '<img src="/vitrine/logo-96.png" alt="" width="44" height="44"><span><b>S.D.E.</b><small>Le Réveil Spirituel des Nations</small></span></a>' +
        '<button class="site-burger" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Ouvrir la navigation"><span></span><span></span><span></span></button>' +
        '<nav class="site-menu" id="site-menu" aria-label="Navigation principale">' +
        routes.map(([href,label])=>'<a href="'+href+'">'+label+'</a>').join("") +
        '</nav><div class="site-access-top" aria-label="Accès privés"><a href="/mon-espace">Espace membre</a><a href="/administration">Espace administrateur</a></div></div>';
      old.insertAdjacentElement("beforebegin",header);
      const footer=document.querySelector("footer");
      if(footer && !footer.classList.contains("site-footer")) {
        const link=document.createElement("a");
        link.href="/administration";
        link.textContent="Administration";
        link.style.margin="0 12px";
        footer.append(link);
      }
    }
    const menu = document.getElementById("site-menu");
    const btn = document.querySelector(".site-header .site-burger");
    if (!menu || !btn) return;
    btn.addEventListener("click",()=>{
      const ouvert=btn.getAttribute("aria-expanded")==="true";
      btn.setAttribute("aria-expanded",String(!ouvert));
      btn.setAttribute("aria-label",ouvert?"Ouvrir la navigation":"Fermer la navigation");
      menu.dataset.open=String(!ouvert);
    });
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape"&&menu.dataset.open==="true"){
        menu.dataset.open="false";btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label","Ouvrir la navigation");btn.focus();
      }
    });
    menu.addEventListener("click",e=>{
      if(e.target.closest("a")){menu.dataset.open="false";btn.setAttribute("aria-expanded","false")}
    });
    const current=location.pathname;
    let logical=current;
    const legacy={
      "/vitrine/mouvement":"mouvement","/vitrine/programmes":"programmes",
      "/vitrine/academy":"academy","/vitrine/ressources":"enseignements",
      "/vitrine/projets":"missions","/vitrine/prieres":"priere",
      "/vitrine/rejoindre":"contact"
    };
    if (legacy[current]) logical="/"+legacy[current];
    const active=[...menu.querySelectorAll("a")].find(a=>a.getAttribute("href")===logical);
    if(active)active.setAttribute("aria-current","page");
    // Compatibilité des liens d'une section de l'ancien accueil vers sa vraie page.
    const anchors={
      mouvement:"/mouvement#mouvement",histoire:"/mouvement#histoire",poles:"/mouvement#poles",
      responsables:"/mouvement#responsables",programmes:"/programmes#programmes",
      agenda:"/programmes#agenda",infire:"/programmes#infire",
      ressources:"/enseignements#ressources",galerie:"/enseignements#galerie",
      rejoindre:"/contact#rejoindre",membres:"/mon-espace",
      projets:"/missions#projets",engagement:"/missions#engagement",
      soutenir:"/missions#soutenir",faq:"/contact#faq",confidentialite:"/contact#confidentialite"
    };
    for(const a of document.querySelectorAll('a[href^="/#"]')) {
      const key=a.getAttribute("href").slice(2);
      if(anchors[key])a.href=anchors[key];
    }
    // Aucun lien public ne quitte le domaine pour rejoindre les espaces sécurisés.
    for(const a of document.querySelectorAll('a[href*="app.mouvement-sde.org"]')){
      let old;try{old=new URL(a.href)}catch(_){continue}
      const hash=old.hash.replace("#","");
      a.href=hash==="finances"||hash==="admin"?"/administration":"/mon-espace";
    }
  }
  async function agenda() {
    const status=document.getElementById("event-status");
    if (!status) return;
    try {
      const response=await fetch("/api/public",{credentials:"omit",cache:"no-store"});
      if(!response.ok)return;
      const data=await response.json();
      const e=Array.isArray(data.evenements)?data.evenements[0]:null;
      if(!e||!e.date||!e.titre)return;
      const date=new Date(e.date+"T12:00:00Z");
      if(Number.isNaN(date.getTime()))return;
      status.textContent=String(e.titre).slice(0,140)+" · "+new Intl.DateTimeFormat("fr-CI",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(date)+(e.heure?" à "+String(e.heure):"")+(e.lieu?" · "+String(e.lieu):"");
    }catch(_) { /* Ne bloque jamais la vitrine si l'agenda est indisponible. */ }
  }
  function theme() {
    /* Restaurer le choix enregistré ou respecter la préférence système */
    try {
      const saved = localStorage.getItem("sde-theme");
      if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
    } catch (_) {}
    /* Bouton bascule dans l'en-tête */
    const header = document.querySelector(".site-header-inner");
    if (!header || header.querySelector(".site-theme-toggle")) return;
    const btn = document.createElement("button");
    btn.className = "site-theme-toggle";
    btn.type = "button";
    const isDark = () => document.documentElement.getAttribute("data-theme") !== "light";
    const label = () => isDark() ? "Passer en mode clair" : "Passer en mode sombre";
    const icon = () => isDark()
      ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11.36A7.5 7.5 0 1 1 8.64 3 5.5 5.5 0 0 0 17 11.36z"/></svg>';
    btn.innerHTML = icon();
    btn.setAttribute("aria-label", label());
    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#11182a" : "#eef0f5");
      btn.innerHTML = icon();
      btn.setAttribute("aria-label", label());
      try { localStorage.setItem("sde-theme", next); } catch (_) {}
    });
    /* Insérer avant le burger */
    const burger = header.querySelector(".site-burger");
    if (burger) burger.insertAdjacentElement("beforebegin", btn);
    else header.append(btn);
  }
  const start=()=>{theme();navigation();agenda()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();