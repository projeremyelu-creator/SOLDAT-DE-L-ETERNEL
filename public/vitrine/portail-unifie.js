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
        '<img class="site-logo" src="/vitrine/logo-96.webp" alt="" width="46" height="46"><span><b>SDE - Mouvement</b><small>Soldats de l’Éternel</small></span></a>' +
        '<button class="site-burger" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Ouvrir la navigation"><span></span><span></span><span></span></button>' +
        '<nav class="site-menu" id="site-menu" aria-label="Navigation principale"><details class="site-mega"><summary>Découvrir SDE</summary><div class="site-mega-panel"><a href="/mouvement"><strong>Vision et mouvement</strong><small>Notre histoire et notre appel</small></a><a href="/missions"><strong>Missions</strong><small>Servir les nations</small></a></div></details><details class="site-mega"><summary>Grandir</summary><div class="site-mega-panel"><a href="/academy"><strong>Soldiers Academy</strong><small>Formation et discipleship</small></a><a href="/enseignements"><strong>Enseignements</strong><small>Lire, écouter et grandir</small></a><a href="/programmes"><strong>Programmes</strong><small>Rencontres et rassemblements</small></a></div></details><details class="site-mega"><summary>S’engager</summary><div class="site-mega-panel"><a href="/priere"><strong>Prière et intercession</strong><small>Prier et être accompagné</small></a><a href="/boutique"><strong>Tenues SDE</strong><small>Concepts de collection</small></a><a href="/contact#rejoindre"><strong>Nous rejoindre</strong><small>Faire votre premier pas</small></a></div></details></nav><div class="site-access-top" aria-label="Accès sécurisé"><a class="site-portal-cta" href="/portail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3"/></svg> Mon Portail S.D.E <span aria-hidden="true">→</span></a></div></div>';
      const generatedInner=header.querySelector(".site-header-inner");
      if(generatedInner){
        const themePlaceholder=document.createElement("button");
        themePlaceholder.className="site-theme-toggle";
        themePlaceholder.type="button";
        themePlaceholder.setAttribute("aria-label","Passer en mode clair");
        header.querySelector(".site-burger")?.insertAdjacentElement("beforebegin",themePlaceholder);
        const motionSlot=document.createElement("span");
        motionSlot.className="sde-motion-slot";
        motionSlot.setAttribute("data-sde-motion-slot","true");
        motionSlot.setAttribute("aria-label","Contrôle des animations");
        generatedInner.append(motionSlot);
      }
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
    if(!document.querySelector(".sde-rail")&&document.querySelector(".site-header")&&!/^\/(mon-espace|administration|connexion)/.test(location.pathname)){
      const ic=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';
      const items=[["/","Accueil","M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9"],["/mouvement","Découvrir SDE","M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"],["/programmes","Programmes","M4 5h16v16H4zM4 10h16M9 3v4M15 3v4"],["/missions","Missions","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"],["/enseignements","Ressources","M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"],["/contact","Nous rejoindre","M15 19v-1a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v1M8.5 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19 8v6M22 11h-6"]];
      const here=location.pathname.replace(/\/$/,"")||"/";
      const aside=document.createElement("aside");aside.className="sde-rail";aside.setAttribute("aria-label","Raccourcis du site");
      aside.innerHTML='<nav aria-label="Raccourcis">'+items.map(([h,l,d])=>'<a href="'+h+'"'+(here===h?' aria-current="page"':'')+'>'+ic(d)+l+'</a>').join("")+'</nav><p class="sde-rail-citation">« Organiser.<br>Former.<br>Équiper<br>pour la moisson. »</p>';
      document.querySelector(".site-header").insertAdjacentElement("afterend",aside);
    }
    const railTop=()=>{const h=document.querySelector(".site-header");if(h)document.documentElement.style.setProperty("--sde-rail-top",Math.max(0,Math.round(h.getBoundingClientRect().bottom))+"px")};
    railTop();addEventListener("scroll",railTop,{passive:true});addEventListener("resize",railTop);setTimeout(railTop,600);
    const menu = document.getElementById("site-menu");
    // Ajouter des raccourcis SDE dans la structure existante, sans créer
    // de cinquième méga-menu ni perturber les anciennes navigations.
    if(menu && !menu.querySelector('[data-sde-service-link]')){
      const panel=menu.querySelector('details.site-mega:last-of-type .site-mega-panel')
        || menu.querySelector('details.site-mega .site-mega-panel') || menu;
      for(const [href,title] of [
        ['/soutenir','Soutenir SDE'],['/calendrier','Calendrier'],
        ['/communaute','Communauté'],['/reseau','Réseau international'],
        ['/transparence','Transparence'],['/gouvernance','Gouvernance'],
        ['/newsletter','Newsletter'],['/rechercher','Recherche'],
        ['/rubriques','Toutes les rubriques']
      ]){
        const a=document.createElement('a');a.href=href;
        a.dataset.sdeServiceLink='true';a.textContent=title;
        panel.append(a);
      }
    }
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
      if(e.target.closest("a")){menu.dataset.open="false";btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label","Ouvrir la navigation")}
    });
    // Fermer le menu mobile si l'utilisateur touche en dehors ou agrandit la fenêtre.
    document.addEventListener("pointerdown",e=>{
      if(menu.dataset.open!=="true"||e.target.closest(".site-header"))return;
      menu.dataset.open="false";
      btn.setAttribute("aria-expanded","false");
      btn.setAttribute("aria-label","Ouvrir la navigation");
    });
    addEventListener("resize",()=>{
      if(innerWidth>900&&menu.dataset.open==="true"){
        menu.dataset.open="false";
        btn.setAttribute("aria-expanded","false");
        btn.setAttribute("aria-label","Ouvrir la navigation");
      }
    });
    const groups=[...menu.querySelectorAll("details.site-mega")];
    for(const group of groups)group.addEventListener("toggle",()=>{
      if(group.open)for(const other of groups)if(other!==group)other.open=false;
    });
    document.addEventListener("click",e=>{if(!e.target.closest(".site-mega"))for(const group of groups)group.open=false;});
    menu.addEventListener("keydown",e=>{
      if(e.key==="Escape"){const group=e.target.closest("details");if(group?.open){e.stopPropagation();group.open=false;group.querySelector("summary")?.focus();}}
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
    // Page détaillée accessible depuis tous les formulaires et pieds de page publics.
    for(const a of document.querySelectorAll('a[href="/contact#confidentialite"]'))a.href="/confidentialite";
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
      const today=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Africa/Abidjan"}).format(new Date());
      const events=(Array.isArray(data.evenements)?data.evenements:[]).filter(e=>{
        if(!e||typeof e.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||e.date<today||typeof e.titre!=="string"||!e.titre.trim())return false;
        if(e.date==="2026-10-31"&&/^IN\s+FIRE\s+2026$/i.test(e.titre.trim())&&Date.now()>=Date.parse("2026-10-31T18:00:00Z"))return false;
        const d=new Date(e.date+"T12:00:00Z");
        return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===e.date;
      }).sort((a,b)=>(a.date+String(a.heure||"")).localeCompare(b.date+String(b.heure||"")));
      const e=events[0];
      if(!e){status.textContent="Les prochaines dates seront annoncées dans l'agenda. Découvrez nos programmes ou contactez le secrétariat.";return;}
      const dateLabel=new Intl.DateTimeFormat("fr-CI",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Abidjan"}).format(new Date(e.date+"T12:00:00Z"));
      const title=String(e.titre).slice(0,140);
      const infireOfficial=/^IN\s+FIRE\s+2026$/i.test(title.trim())&&e.date==="2026-10-31";
      const hour=infireOfficial?"08:30":/^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.heure||""))?String(e.heure):"";
      const place=typeof e.lieu==="string"?e.lieu.trim().slice(0,200):"";
      const card=document.getElementById("event-details");
      if(card){
        document.getElementById("event-title").textContent=title;
        const date=document.getElementById("event-date");date.textContent=dateLabel;date.dateTime=e.date;
        const time=document.getElementById("event-time");time.textContent=hour;time.hidden=!hour;
        document.getElementById("event-time-row").hidden=!hour;
        const location=document.getElementById("event-place");location.textContent=place;location.hidden=!place;
        document.getElementById("event-place-row").hidden=!place;
        card.hidden=false;
        const action=document.getElementById("event-action");
        const infire=/^IN\s+FIRE\s+2026$/i.test(title.trim())&&e.date==="2026-10-31";
        action.href=infire?"/programmes#infire":"/programmes#agenda";
        action.textContent=infire?"Voir les détails et confirmer ma venue →":"Voir les informations pratiques →";
        status.textContent="Retrouvez les informations pratiques et les modalités de participation dans nos programmes.";
      }else{
        status.textContent=title+" · "+dateLabel+(hour?" à "+hour:"")+(place?" · "+place:"");
      }
    }catch(_) { /* L'accès à l'agenda reste disponible en cas de panne réseau. */ }
  }
  function theme() {
    /* Restaurer le choix enregistré ou respecter la préférence système */
    try {
      const saved = localStorage.getItem("sde-theme");
      if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
    } catch (_) {}
    /* Bouton bascule dans l'en-tête */
    const header = document.querySelector(".site-header-inner");
    if (!header) return;
    const btn = header.querySelector(".site-theme-toggle") || document.createElement("button");
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
    if (!btn.isConnected) {
      if (burger) burger.insertAdjacentElement("beforebegin", btn);
      else header.append(btn);
    }
  }
  const start=()=>{navigation();theme();agenda()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();

/* Correctifs transversaux : actualité des programmes et accessibilité mobile.
   Ne touche ni aux formulaires ni aux espaces réservés. */
(()=>{
  const finInFire=Date.parse("2026-10-31T18:00:00Z");
  const finTpa=Date.parse("2026-12-19T00:00:00Z");
  function actualiserEvenements(){
    const now=Date.now();
    if(now<finInFire)return;
    const tpaAVenir=now<finTpa;
    document.querySelectorAll(".infire-takeover").forEach(bandeau=>{
      // Le bandeau événement est maintenant présent dès le HTML initial :
      // ne pas le vider avant que React mette à jour le vrai décompte.
      if(bandeau.querySelector(".event-bar-inner"))return;
      bandeau.setAttribute("aria-label",tpaAVenir?"Prochain événement : Traversée Prophétique Annuelle":"Programmes du mouvement SDE");
      const lien=bandeau.querySelector("a");
      if(!lien)return;
      lien.href=tpaAVenir?"/programmes#tpa-2026":"/programmes#agenda";
      lien.replaceChildren();
      const fort=document.createElement("strong");
      fort.textContent=tpaAVenir?"TPA 2026":"Programmes SDE";
      const detail=document.createTextNode(tpaAVenir?" · Vendredi 18 décembre · 20h · Google Meet ":" · Découvrez nos rendez-vous ");
      const appel=document.createElement("span");
      appel.textContent=tpaAVenir?"Découvrir la traversée →":"Consulter l’agenda →";
      lien.append(fort,detail,appel);
    });

    // La conférence achevée reste accessible dans les archives, sans figurer
    // parmi les événements à venir et sans proposer un fichier calendrier passé.
    const agenda=document.getElementById("agenda");
    const liste=document.getElementById("agenda-liste");
    const ancienne=liste?.querySelector(".programme.rdv");
    if(agenda&&liste&&ancienne&&/IN FIRE 2026/i.test(ancienne.querySelector("h3")?.textContent||"")){
      const archives=document.createElement("details");
      archives.className="sde-archives";
      const titre=document.createElement("summary");
      titre.textContent="Événements passés · IN FIRE 2026";
      archives.append(titre);
      ancienne.querySelectorAll("[data-ics]").forEach(b=>b.remove());
      ancienne.classList.remove("revele");
      ancienne.dataset.archive="true";
      archives.append(ancienne);
      agenda.querySelector(".enveloppe")?.append(archives);
    }
    // Le visuel de l'accueil doit promouvoir le prochain programme plutôt
    // que laisser une affiche de la conférence achevée en première position.
    const image=document.querySelector(".iv-band .iv-frame img");
    if(image&&/infire-banniere/.test(image.getAttribute("src")||"")){
      if(tpaAVenir){
        image.src="/vitrine/illus/tpa-2026.webp";
        image.alt="Traversée Prophétique Annuelle SDE — vendredi 18 décembre 2026 à 20h sur Google Meet";
        image.width=600;image.height=600;
        image.closest(".iv-band")?.classList.add("sde-tpa-hero");
        const conteneur=image.closest(".iv-frame");
        if(conteneur&&!conteneur.querySelector(".sde-hero-cta")){
          const bouton=document.createElement("a");
          bouton.className="sde-hero-cta";
          bouton.href="/programmes#tpa-2026";
          bouton.textContent="Découvrir la TPA 2026 →";
          conteneur.append(bouton);
        }
      }else{
        image.closest(".iv-band")?.setAttribute("hidden","");
      }
    }
  }
    // L'événement de décembre est archivé automatiquement à l'issue de sa date.
  function masquerAncienneTPA(){
    if(Date.now()>=Date.parse("2026-12-19T00:00:00Z"))
      document.querySelector(".iv-band.sde-tpa-hero")?.setAttribute("hidden","");
  }
  function navigationAccessible(){
    const menu=document.getElementById("site-menu");
    const bouton=document.querySelector(".site-header .site-burger");
    if(!menu||!bouton||typeof MutationObserver==="undefined")return;
    // Les éléments de menu restent navigables au clavier et le défilement
    // du fond est bloqué seulement pendant l'ouverture sur petit écran.
    let ouvert=false;
    const synchroniser=()=>{
      const actif=menu.dataset.open==="true" && window.innerWidth<=900;
      document.body.classList.toggle("sde-menu-mobile-ouvert",actif);
      if(actif&&!ouvert){
        (menu.querySelector("summary,a,button")||menu).focus?.({preventScroll:true});
      }else if(!actif&&ouvert&&document.activeElement&&menu.contains(document.activeElement)){
        bouton.focus({preventScroll:true});
      }
      ouvert=actif;
    };
    const observateur=new MutationObserver(synchroniser);
    observateur.observe(menu,{attributes:true,attributeFilter:["data-open"]});
    window.addEventListener("resize",synchroniser,{passive:true});
    menu.addEventListener("keydown",event=>{
      if(event.key!=="Tab"||!ouvert)return;
      const actifs=[...menu.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
        .filter(el=>el.getClientRects().length>0);
      if(!actifs.length)return;
      const premier=actifs[0],dernier=actifs[actifs.length-1];
      if(event.shiftKey&&document.activeElement===premier){event.preventDefault();dernier.focus();}
      if(!event.shiftKey&&document.activeElement===dernier){event.preventDefault();premier.focus();}
    });
    synchroniser();
  }

  // Parcours public : cinq raccourcis fixes sur téléphone, sans accès aux
  // finances internes. « Finances » mène uniquement au soutien public.
  function installerRaccourcisPublics(){
    if(document.body.classList.contains("sde-tableau") ||
       document.querySelector(".sde-public-bottom-nav"))return;
    const menu=document.getElementById("site-menu");
    if(menu&&!menu.querySelector(':scope > a[href="/rubriques"]')){
      const plus=document.createElement("a");
      plus.href="/rubriques";
      plus.className="sde-menu-plus";
      plus.textContent="Plus";
      menu.append(plus);
    }
    if(document.querySelector(".sde-global-nav,.nav-mobile,.sde-bottom-nav"))return;
    const links=[
      {href:"/",label:"Accueil",slug:"accueil",path:"M3 10 12 3l9 7v11h-6v-7H9v7H3z"},
      {href:"/contact#rejoindre",label:"Membres",slug:"membres",path:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"},
      {href:"/programmes#agenda",label:"Agenda",slug:"agenda",path:"M3 5h18v16H3zM7 3v4M17 3v4M3 10h18"},
      {href:"/missions#soutenir",label:"Finances",slug:"finances",path:"M3 6h18v15H3zM3 10h18M7 16h4"},
      {href:"/rubriques",label:"Plus",slug:"plus",path:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"}
    ];
    const active={"/":"accueil","/contact":"membres","/programmes":"agenda",
      "/missions":"finances","/rubriques":"plus","/plus":"plus"}[location.pathname];
    const nav=document.createElement("nav");
    nav.className="sde-public-bottom-nav";
    nav.setAttribute("aria-label","Navigation rapide SDE sur mobile");
    for(const link of links){
      const a=document.createElement("a");
      a.href=link.href;
      a.dataset.sdeMobileLink=link.slug;
      if(link.slug===active)a.setAttribute("aria-current","page");
      if(link.slug==="finances")a.title="Soutenir le mouvement — aucun compte financier privé";
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 24 24");
      svg.setAttribute("fill","none");
      svg.setAttribute("stroke","currentColor");
      svg.setAttribute("stroke-width","1.8");
      svg.setAttribute("stroke-linecap","round");
      svg.setAttribute("stroke-linejoin","round");
      svg.setAttribute("aria-hidden","true");
      const path=document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",link.path);
      svg.append(path);
      const caption=document.createElement("span");
      caption.textContent=link.label;
      a.append(svg,caption);
      nav.append(a);
    }
    document.body.append(nav);
  }

  const commencer=()=>{actualiserEvenements();masquerAncienneTPA();navigationAccessible();installerRaccourcisPublics();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",commencer,{once:true});
  else commencer();
})();
