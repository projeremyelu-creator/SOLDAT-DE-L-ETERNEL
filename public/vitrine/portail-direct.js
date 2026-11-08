/* Portail privé à navigation directe.
   Les rubriques déclenchent le routeur de l'application historique dans la même page.
   Aucune nouvelle API ni données clonées : même compte, même moteur, mêmes contrôles Worker.
 */
(() => {
  "use strict";
  if (!new Set(["mouvement-sde.org", "app.mouvement-sde.org"]).has(location.hostname)) return;
  const mode=location.pathname==="/mon-espace"?"membre":
    location.pathname==="/administration"?"direction":null;
  if(!mode)return;

  const catalogue={
    "centre-membre":"Tous mes services","centre-command":"Centre opérationnel",
    rendezvous:"Événements & notifications",carteqr:"Ma carte",scanner:"Pointages & QR",pilotage:"Dashboard",annuaire:"Annuaire",bibliotheque:"Ressources","finance-direction":"Finances & missions","site-public":"Contenu du site",adhesions:"Demandes d’adhésion",anniversaires:"Anniversaires des membres","suivi-poles":"Suivi des pôles","espace-soldat":"Mon espace Soldat","academy-direction":"Gestion Academy",mur:"Mur de prière",accueil:"Tableau de bord",espace:"Mon profil",priere:"Prières",membres:"Membres et fiches",
    agenda:"Mon agenda",garnisons:"Garnisons et pôles",academie:"Formations",
    portevoix:"Communication et annonces",chambre:"Prière et intercession",
    projets:"Projets et missions",secretariat:"Secrétariat et décisions",finances:"Finances et cotisations",
    arsenal:"Bibliothèque et enseignements",mediatheque:"Médiathèque",assistant:"Assistant Éliézer",
    engagements:"Mes engagements",contributions:"Cotisations",synthese:"Mon accueil",parcours:"Lecture et prière",preferences:"Notifications",gestion:"Centre de contrôle"
  };
  const personnel=new Set(["centre-membre","espace-soldat","rendezvous","carteqr","bibliotheque","mur","priere","espace","agenda","academie","portevoix","arsenal","mediatheque","synthese","engagements","contributions","parcours","preferences"]);
  const url=new URL(location.href);
  const demandé=url.searchParams.get("module")||"";
  const souhait=Object.prototype.hasOwnProperty.call(catalogue,demandé)?demandé:
    mode==="membre"?"espace-soldat":"accueil";
  const body=document.body;
  body.classList.add("sde-direct",mode==="membre"?"sde-direct-member":"sde-direct-admin");
  let compte=null,initial=false,signature="",navCourant="",priereOuverte=false,historiqueCharge=false,vueExterne="";
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
    if(nom==="priere")return mode==="membre";
    if(nom==="centre-command")return mode==="direction"&&compte?.niveau>=1;
    if(nom==="centre-membre")return mode==="membre";
    if(nom==="gestion")return mode==="direction"&&compte?.niveau>=1;
    if(["scanner","pilotage","annuaire","academy-direction"].includes(nom)&&compte?.niveau<1)return false;
    if(nom==="finance-direction"&&compte?.niveau<2)return false;
    if(["anniversaires","suivi-poles"].includes(nom)&&(mode!=="direction"||!(compte?.niveau>=1)))return false;
    if(nom==="adhesions"&&(mode!=="direction"||!(compte?.niveau>=1)))return false;
    if(nom==="espace-soldat"&&mode!=="membre")return false;
    if(nom==="site-public"&&(mode!=="direction"||!(compte?.niveau>=2)))return false;
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
    const liens=element("nav","sde-direct-head-links");liens.setAttribute("aria-label","Navigation entre les espaces SDE");
    const publique=link("https://mouvement-sde.org/","Site public","sde-direct-site-link");liens.append(publique);
    const membre=link("/mon-espace","Mon espace","sde-direct-member-link");liens.append(membre);
    if(mode==="membre")membre.setAttribute("aria-current","page");
    const direction=link("/administration","Administration","sde-direct-admin-link");
    direction.hidden=true;
    if(mode==="direction")direction.setAttribute("aria-current","page");
    liens.append(direction);head.append(liens);
    const reglages=element("button","sde-direct-settings sde-direct-gear","Réglages");
    reglages.type="button";
    reglages.addEventListener("click",()=>{
      const natif=document.getElementById("btn-reglages");
      if(natif) natif.click();
    });
    head.append(reglages);
    const account=element("button","sde-direct-settings sde-direct-account","Mon compte");account.type="button";
    account.addEventListener("click",()=>{(document.getElementById("btn-compte")||document.getElementById("btn-reglages"))?.click()});
    head.append(account);
    const role=element("span","sde-direct-access",mode==="membre"?"Espace membre":"Espace administrateur");
    head.append(role);
    const tabs=element("nav");tabs.id="sde-direct-tabs";tabs.setAttribute("aria-label","Rubriques de l'espace privé");
    // Mobile : les rubriques ne doivent pas repousser le tableau de bord sous
    // une longue grille. Le bouton les dévoile sur demande, sans changer de page.
    const mobileMenu=element("button","sde-direct-menu-toggle","Afficher les rubriques");
    mobileMenu.id="sde-direct-menu-toggle";mobileMenu.type="button";
    mobileMenu.setAttribute("aria-controls",tabs.id);
    mobileMenu.setAttribute("aria-expanded","false");
    const afficherMenu=(ouvert)=>{
      tabs.classList.toggle("sde-direct-tabs-open",ouvert);
      mobileMenu.setAttribute("aria-expanded",String(ouvert));
      mobileMenu.textContent=ouvert?"Masquer les rubriques":"Afficher les rubriques";
      barreMobile.querySelector('[data-bottom-more]')?.setAttribute("aria-expanded",String(ouvert));
    };
    // Barre de menu mobile : cinq accès directs, construits seulement après
    // confirmation du rôle serveur. Les liens ne remplacent pas l'habilitation.
    const barreMobile=element("nav","sde-direct-bottom-nav");
    barreMobile.id="sde-direct-bottom-nav";
    barreMobile.hidden=true;
    barreMobile.setAttribute("aria-label","Navigation rapide de mon espace SDE");
    const pictos={
      accueil:["M3 10 12 3l9 7","M5 9v12h5v-7h4v7h5V9"],
      coeur:["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"],
      academy:["M2 10 12 4l10 6-10 6L2 10Z","M6 13v5c4 3 8 3 12 0v-5","M22 10v8"],
      agenda:["M4 5h16v16H4z","M4 10h16","M8 3v4","M16 3v4"],
      membres:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M22 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"],
      finances:["M3 6h18v14H3z","M3 10h18","M7 16h4"],
      missions:["M3 7h18v14H3z","M9 7V4h6v3","M3 13h18"],
      plus:["M4 4h6v6H4z","M14 4h6v6h-6z","M4 14h6v6H4z","M14 14h6v6h-6z"]
    };
    const dessinerPicto=(cle)=>{
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 24 24");
      svg.setAttribute("aria-hidden","true");
      svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
      svg.setAttribute("stroke-width","1.8");
      svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
      for(const d of pictos[cle]||pictos.plus){
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d",d);svg.append(path);
      }
      return svg;
    };
    const synchroniserBarreMobile=(nom)=>{
      const courant=mode==="membre"&&["espace-soldat","centre-membre"].includes(nom)?"synthese":
        mode==="direction"&&["synthese","pilotage","centre-command"].includes(nom)?"accueil":nom;
      for(const action of barreMobile.querySelectorAll("button[data-module]")){
        if(action.dataset.module===courant)action.setAttribute("aria-current","page");
        else action.removeAttribute("aria-current");
      }
    };
    const construireBarreMobile=()=>{
      const items=mode==="membre"?[
        ["synthese","Accueil","accueil"],["priere","Prière","coeur"],
        ["academie","Academy","academy"],["agenda","Agenda","agenda"]
      ]:[
        ["accueil","Accueil","accueil"],["membres","Membres","membres"],
        ["agenda","Agenda","agenda"],compte?.niveau>=2?
          ["finances","Finances","finances"]:["projets","Missions","missions"]
      ];
      barreMobile.replaceChildren();
      for(const [nom,libelle,picto] of items){
        if(!allowed(nom))continue;
        const action=element("button","sde-direct-bottom-action");
        action.type="button";action.dataset.module=nom;
        action.setAttribute("aria-label","Ouvrir "+libelle);
        action.append(dessinerPicto(picto),element("span","",libelle));
        action.addEventListener("click",()=>selectionner(nom,{userInitiated:true}));
        barreMobile.append(action);
      }
      const plus=element("button","sde-direct-bottom-action sde-direct-bottom-more");
      plus.type="button";plus.dataset.bottomMore="true";
      plus.setAttribute("aria-controls",tabs.id);
      plus.setAttribute("aria-expanded","false");
      plus.setAttribute("aria-label","Afficher toutes les rubriques");
      plus.append(dessinerPicto("plus"),element("span","","Plus"));
      plus.addEventListener("click",()=>{
        const ouvert=mobileMenu.getAttribute("aria-expanded")!=="true";
        afficherMenu(ouvert);
        if(ouvert)tabs.scrollIntoView?.({block:"start",behavior:"auto"});
      });
      barreMobile.append(plus);
      barreMobile.hidden=false;
      synchroniserBarreMobile(navCourant||souhait);
    };
    mobileMenu.addEventListener("click",event=>{
      const ouvert=mobileMenu.getAttribute("aria-expanded")!=="true";
      afficherMenu(ouvert);
      // Depuis le clavier, aller vers le premier module ; sur écran tactile,
      // préserver le point de lecture au lieu de déplacer le défilement.
      if(ouvert&&event.detail===0)tabs.querySelector("button")?.focus();
    });
    tabs.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&tabs.classList.contains("sde-direct-tabs-open")){
        event.preventDefault();afficherMenu(false);mobileMenu.focus();
      }
    });
    header.append(head);
    const intro=element("div","sde-direct-intro");
    const eyebrow=element("p","sde-direct-eyebrow","MOUVEMENT SDE · LE RÉVEIL SPIRITUEL DES NATIONS");
    const titre=element("h1","sde-direct-title",mode==="membre"?"Mon espace membre":"Poste de commandement administratif");
    const description=element("p","sde-direct-description",mode==="membre"?
      "Votre vie spirituelle au premier plan : prière, formation biblique, enseignements et rencontres. Vos informations personnelles restent accessibles au même endroit.":
      "Accompagnez le réveil spirituel : intercession, enseignements, Soldiers Academy et rassemblements, avec les outils de gouvernance et d'administration SDE.");
    const etat=element("p","sde-direct-loading","Chargement des rubriques autorisées…");
    etat.setAttribute("role","status");etat.setAttribute("aria-live","polite");
    intro.append(eyebrow,titre,description);
    const actions=element("div","sde-spirit-actions");
    actions.setAttribute("aria-label","Accès rapides à la vie spirituelle");
    const rapides=mode==="membre"?[
      ["priere","Déposer une prière"],["academie","Me former"],["arsenal","Lire un enseignement"],["agenda","Rencontres"]
    ]:[
      ["chambre","Intercession"],["academie","Formations"],["arsenal","Enseignements"],["agenda","Rassemblements"]
    ];
    for(const [nom,label] of rapides){
      const b=element("button","sde-spirit-quick",label);
      b.type="button";b.dataset.quick=nom;
      b.addEventListener("click",()=>selectionner(nom,{userInitiated:true}));
      actions.append(b);
    }
    intro.append(actions,etat);
    header.append(intro);
    body.insertBefore(header,body.firstChild);
    body.append(barreMobile);
    const main=document.getElementById("main");
    let panneau=null,histoire=null,messagePriere=null,champPriere=null,envoiPriere=null;
    if(mode==="membre"&&main?.parentElement){
      panneau=element("section","sde-spiritual-panel");panneau.id="sde-priere-panel";
      panneau.hidden=true;panneau.tabIndex=-1;panneau.setAttribute("aria-labelledby","sde-priere-titre");
      const h=element("h2","", "Mes prières et mon intercession");h.id="sde-priere-titre";
      const aide=element("p","", "Choisissez vos destinataires avant l'envoi. Une requête d'intercession est visible par les responsables habilités ; une demande confidentielle reste réservée au leader et à votre historique personnel.");
      const form=element("form","sde-priere-form");
      const confidentialite=element("label","", "Destinataires de ma demande");
      const audience=document.createElement("select");audience.name="confidentialite";
      for(const [value,label] of [["equipe","Responsables habilités — intercession"],["leader","Leader uniquement — confidentiel"]]){const option=element("option","",label);option.value=value;audience.append(option)}
      confidentialite.append(audience);
      const label=element("label","", "Mon sujet de prière");
      champPriere=document.createElement("textarea");
      champPriere.name="sujet";champPriere.required=true;champPriere.maxLength=2000;
      champPriere.rows=5;champPriere.placeholder="Écrivez votre sujet de prière…";
      label.append(champPriere);
      envoiPriere=element("button","sde-priere-submit","Déposer ma requête");
      envoiPriere.type="submit";
      form.append(confidentialite,label,envoiPriere);
      messagePriere=element("p","sde-priere-feedback","");
      messagePriere.setAttribute("role","status");messagePriere.setAttribute("aria-live","polite");
      const recap=element("h3","", "Mes dernières requêtes");
      histoire=element("ul","sde-priere-historique");
      panneau.append(h,aide,form,messagePriere,recap,histoire);
      main.parentElement.insertBefore(panneau,main);
      form.addEventListener("submit",async event=>{
        event.preventDefault();
        if(!compte?.connecte||!compte.membreId)return;
        const sujet=champPriere.value.trim();
        if(!sujet)return;
        envoiPriere.disabled=true;messagePriere.textContent="Transmission de votre prière…";
        try{
          const r=await fetch("/api/priere",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({sujet,...(audience.value==="leader"?{confidentiel:true}:{})})});
          const data=await r.json().catch(()=>({}));
          if(!r.ok||data.ok!==true)throw Error(data.message||"La prière n'a pas pu être transmise.");
          champPriere.value="";messagePriere.textContent="Votre requête de prière a été enregistrée.";
          historiqueCharge=false;await lireHistorique();
        }catch(err){messagePriere.textContent=err.message||"Service temporairement indisponible.";}
        finally{envoiPriere.disabled=false;}
      });
    }
    if(main?.parentElement){
      main.parentElement.insertBefore(mobileMenu,panneau||main);
      main.parentElement.insertBefore(tabs,panneau||main);
    }else header.append(mobileMenu,tabs);
    const original=document.getElementById("nav");
    if(!original){etat.textContent="Les modules de gestion n’ont pas été chargés. Rechargez la page.";return;}
    async function lireHistorique(){
      if(!histoire||historiqueCharge)return;
      histoire.replaceChildren();
      histoire.append(element("li","","Chargement de votre historique…"));
      try{
        const r=await fetch("/api/mon-historique",{credentials:"same-origin",cache:"no-store",headers:{accept:"application/json"}});
        if(!r.ok)throw Error("Historique indisponible pour ce compte.");
        const data=await r.json();
        const prieres=Array.isArray(data.prieres)?data.prieres:[];
        histoire.replaceChildren();
        if(!prieres.length)histoire.append(element("li","","Aucune requête enregistrée."));
        for(const p of prieres.slice(0,8)){
          const li=element("li","");
          const titre=element("strong","",String(p.sujet||"Prière personnelle"));
          const detail=element("span","", [p.date,p.statut,p.confidentiel?"Leader uniquement":"Intercession"].filter(Boolean).join(" · "));
          li.append(titre,detail);histoire.append(li);
        }
        historiqueCharge=true;
      }catch(err){histoire.replaceChildren();histoire.append(element("li","",err.message));}
    }
    function selectionner(nom,options={}){
      if(mode==="direction"&&nom==="synthese"&&window.SDEOpsReady)nom="pilotage";
      if(!compte||!allowed(nom))return;
      const ouverture=new CustomEvent("sde:open",{cancelable:true,detail:{module:nom}});
      document.dispatchEvent(ouverture);
      if(ouverture.defaultPrevented){
        vueExterne=nom;priereOuverte=false;if(panneau)panneau.hidden=true;main.hidden=true;
      }else if(nom==="priere"&&mode==="membre"&&panneau){
        vueExterne="";
        panneau.hidden=false;main.hidden=true;priereOuverte=true;
        if(!compte.membreId){
          messagePriere.textContent="Votre compte doit être relié à une fiche membre pour déposer une prière.";
          envoiPriere.disabled=true;
          histoire.replaceChildren();histoire.append(element("li","","Historique disponible après liaison de votre fiche."));
        }else void lireHistorique();
      }else{
        const native=original.querySelector('button[data-vue="'+nom+'"]');
        if(!native||native.disabled)return;
        vueExterne="";
        if(panneau)panneau.hidden=true;
        main.hidden=false;priereOuverte=false;
        native.click();
      }
      const nextUrl=new URL(location.href);
      nextUrl.searchParams.set("module",nom);nextUrl.hash="";
      history.replaceState(null,"",nextUrl.pathname+nextUrl.search);
      for(const b of tabs.querySelectorAll("[data-module]")){
        if(b.dataset.module===nom)b.setAttribute("aria-current","page");
        else b.removeAttribute("aria-current");
      }
      navCourant=nom;
      synchroniserBarreMobile(nom);
      // Après un choix sur smartphone, afficher directement le module choisi.
      if(window.matchMedia?.("(max-width: 760px)")?.matches){
        afficherMenu(false);
        // La navigation est réellement directe : un clic utilisateur place
        // le contenu choisi dans le champ de vision, pas derrière les rubriques.
        if(options.userInitiated){
          const destination=priereOuverte?panneau:(!main.hidden?main:null);
          if(destination){
            destination.focus?.({preventScroll:true});
            destination.scrollIntoView?.({block:"start",behavior:"instant"});
          }
        }
      }
      document.dispatchEvent(new CustomEvent("sde:navigate",{detail:{module:nom,titre:catalogue[nom]}}));
      if(nom==="priere")panneau?.querySelector("h2")?.focus?.();
    }

    const sync=()=>{
      if(!compte)return;
      const buttons=[...original.querySelectorAll('button[data-vue]')];
      const ordre=mode==="membre"?
        ["priere","academie","arsenal","bibliotheque","mur","synthese","engagements","contributions","parcours","carteqr","espace","agenda","preferences","portevoix","mediatheque"]:
        ["synthese","engagements","contributions","accueil","chambre","mur","academie","arsenal","bibliotheque","parcours","agenda","portevoix",
         "membres","garnisons","scanner","projets","secretariat","mediatheque",
         "finances","gestion","preferences","assistant","carteqr","espace"];
      const disponibles=buttons.filter(b=>allowed(b.dataset.vue)&&!b.disabled);
      if(mode==="membre"&&!disponibles.some(b=>b.dataset.vue==="academie")){
        const b=element("button","");b.dataset.vue="academie";disponibles.push(b);
      }
      for(const nom of ["synthese","carteqr","bibliotheque","scanner","engagements","contributions","parcours","preferences","gestion","mur"].filter(allowed)){
        const b=element("button","");b.dataset.vue=nom;disponibles.push(b);
      }
      if(mode==="membre"){
        const prayerButton=element("button","");
        prayerButton.dataset.vue="priere";disponibles.push(prayerButton);
      }
      disponibles.sort((a,b)=>ordre.indexOf(a.dataset.vue)-ordre.indexOf(b.dataset.vue));
      const next=disponibles.map(b=>b.dataset.vue).join("|");
      if(next!==signature){
        const search=tabs.querySelector(".sde-plus-search");
        signature=next;tabs.replaceChildren();if(search)tabs.append(search);
        const groupes=mode==="membre"?[
          ["Vie spirituelle",new Set(["priere","mur","academie","arsenal","bibliotheque"])],
          ["Mon parcours",new Set(["synthese","engagements","contributions","parcours","espace","agenda","preferences"])],
          ["Communauté et ressources",new Set(["portevoix","mediatheque"])]
        ]:[
          ["Vie spirituelle et communication",new Set(["mur","synthese","engagements","contributions","accueil","chambre","academie","arsenal","bibliotheque","parcours","agenda","portevoix"])],
          ["Pilotage et organisation",new Set(["membres","garnisons","scanner","projets","secretariat","mediatheque"])],
          ["Finances et administration",new Set(["finances","gestion","preferences","assistant","carteqr","espace"])]
        ];
        let precedent="";
        for(const b of disponibles){
          const groupe=groupes.find(g=>g[1].has(b.dataset.vue))?.[0]||"Autres services";
          if(groupe!==precedent){
            const titreGroupe=element("span","sde-direct-group",groupe);
            tabs.append(titreGroupe);precedent=groupe;
          }
          const nom=b.dataset.vue;
          const item=element("button","sde-direct-tab",catalogue[nom]);
          item.type="button";item.dataset.module=nom;
          item.addEventListener("click",()=>selectionner(nom,{userInitiated:true}));
          tabs.append(item);
        }
        etat.textContent="Cliquez sur une rubrique pour afficher directement son contenu, sans changer de page.";
        document.dispatchEvent(new Event("sde:modules"));
      }
      const courant=vueExterne|| (priereOuverte?"priere":buttons.find(b=>b.getAttribute("aria-current")==="page"||b.classList.contains("on"))?.dataset.vue||"");
      if(courant!==navCourant||next!==signature){
        navCourant=courant;
        for(const b of tabs.querySelectorAll("button")){
          if(b.dataset.module===courant)b.setAttribute("aria-current","page");
          else b.removeAttribute("aria-current");
        }
      }
      synchroniserBarreMobile(courant||souhait);
      if(!initial){
        const cible=disponibles.find(b=>b.dataset.vue===souhait);
        const moduleExterne=["carteqr","bibliotheque","scanner","pilotage","annuaire","finance-direction","site-public","espace-soldat","adhesions","anniversaires","suivi-poles","academy-direction","mur","priere","synthese","engagements","contributions","parcours","preferences","gestion"].includes(souhait);
        if(cible||(moduleExterne&&allowed(souhait))){
          initial=true;
          if(moduleExterne)selectionner(souhait);
          else if(!cible.classList.contains("on")&&cible.getAttribute("aria-current")!=="page")cible.click();
        }
      }
    };
    const monitor=new MutationObserver(sync);
    monitor.observe(original,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-current","class"]});
    fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(user=>{
        if(!user||!user.connecte){role.textContent="Session non disponible";etat.textContent="Votre session est expirée. Reconnectez-vous sur /connexion.";return}
        compte=user;
        role.textContent=user.libRole||user.role||(mode==="membre"?"Membre":"Direction");
        direction.hidden=user.niveau<1;
        construireBarreMobile();
        sync();
        window.SDEPortal={compte:user,selectionner};
        document.dispatchEvent(new CustomEvent("sde:ready",{detail:window.SDEPortal}));
      })
      .catch(()=>{role.textContent="Connexion indisponible";etat.textContent="Impossible de vérifier la session. Réessayez ou contactez le secrétariat.";});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
