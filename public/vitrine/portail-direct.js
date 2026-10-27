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
    accueil:"Tableau de bord",espace:"Mon profil et ma carte",membres:"Membres et fiches",
    agenda:"Agenda et présences",garnisons:"Garnisons et pôles",academie:"Soldiers Academy",
    portevoix:"Communication et annonces",chambre:"Prière et intercession",
    projets:"Projets et missions",secretariat:"Secrétariat et décisions",finances:"Finances et cotisations",
    arsenal:"Bibliothèque et enseignements",mediatheque:"Médiathèque",assistant:"Assistant Éliézer"
  };
  const personnel=new Set(["espace","agenda","academie","portevoix","arsenal","mediatheque"]);
  const url=new URL(location.href);
  const demandé=url.searchParams.get("module")||"";
  const souhait=Object.prototype.hasOwnProperty.call(catalogue,demandé)?demandé:
    mode==="membre"?"espace":"accueil";
  const body=document.body;
  body.classList.add("sde-direct",mode==="membre"?"sde-direct-member":"sde-direct-admin");
  let compte=null,initial=false,signature="",navCourant="";
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
    const role=element("span","sde-direct-access",mode==="membre"?"Espace membre":"Espace administrateur");
    head.append(role);
    const tabs=element("nav");tabs.id="sde-direct-tabs";tabs.setAttribute("aria-label","Rubriques de l'espace privé");
    header.append(head);
    const intro=element("div","sde-direct-intro");
    const eyebrow=element("p","sde-direct-eyebrow","MOUVEMENT SDE · PORTAIL PRIVÉ");
    const titre=element("h1","sde-direct-title",mode==="membre"?"Mon espace membre":"Poste de commandement administratif");
    const description=element("p","sde-direct-description",mode==="membre"?
      "Mon profil, mes présences, mes prières, mes formations et mes ressources. Chaque onglet ouvre son contenu directement ici.":
      "Pilotez le mouvement : membres, agenda, présences, directoire, pôles, projets, communication, finances et décisions. Choisissez une rubrique ci-dessous.");
    const etat=element("p","sde-direct-loading","Chargement des rubriques autorisées…");
    etat.setAttribute("role","status");etat.setAttribute("aria-live","polite");
    intro.append(eyebrow,titre,description,etat);
    header.append(intro);
    body.insertBefore(header,body.firstChild);
    const main=document.getElementById("main");
    if(main?.parentElement)main.parentElement.insertBefore(tabs,main);
    else header.append(tabs);
    const original=document.getElementById("nav");
    if(!original){etat.textContent="Les modules de gestion n’ont pas été chargés. Rechargez la page.";return;}

    const sync=()=>{
      if(!compte)return;
      const buttons=[...original.querySelectorAll('button[data-vue]')];
      const ordre=mode==="membre"?
        ["espace","agenda","academie","portevoix","arsenal","mediatheque"]:
        ["accueil","membres","agenda","garnisons","projets","secretariat",
         "academie","portevoix","chambre","arsenal","mediatheque",
         "finances","assistant","espace"];
      const disponibles=buttons.filter(b=>allowed(b.dataset.vue)&&!b.disabled)
        .sort((a,b)=>ordre.indexOf(a.dataset.vue)-ordre.indexOf(b.dataset.vue));
      const next=disponibles.map(b=>b.dataset.vue).join("|");
      if(next!==signature){
        signature=next;tabs.replaceChildren();
        const groupes=mode==="membre"?[
          ["Mon parcours",new Set(["espace","agenda","academie"])],
          ["Ressources et communauté",new Set(["portevoix","arsenal","mediatheque"])]
        ]:[
          ["Pilotage et organisation",new Set(["accueil","membres","agenda","garnisons","projets","secretariat"])],
          ["Vie spirituelle et communication",new Set(["academie","portevoix","chambre","arsenal","mediatheque"])],
          ["Finances et administration",new Set(["finances","assistant","espace"])]
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
          item.addEventListener("click",()=>{
            const target=original.querySelector('button[data-vue="'+nom+'"]');
            if(!target||target.disabled)return;
            // Le contenu se met à jour dans #main par le routeur natif, sans navigation HTTP.
            target.click();
            const nextUrl=new URL(location.href);
            nextUrl.searchParams.set("module",nom);
            if(nextUrl.hash)nextUrl.hash="";
            history.replaceState(null,"",nextUrl.pathname+nextUrl.search);
          });
          tabs.append(item);
        }
        etat.textContent="Cliquez sur une rubrique pour afficher directement son contenu, sans changer de page.";
      }
      const courant=buttons.find(b=>b.getAttribute("aria-current")==="page"||b.classList.contains("on"))?.dataset.vue||"";
      if(courant!==navCourant||next!==signature){
        navCourant=courant;
        for(const b of tabs.querySelectorAll("button")){
          if(b.dataset.module===courant)b.setAttribute("aria-current","page");
          else b.removeAttribute("aria-current");
        }
      }
      if(!initial){
        const cible=disponibles.find(b=>b.dataset.vue===souhait);
        if(cible){
          initial=true;
          // Évite une étape "tous les outils" : le module demandé devient la vue courante.
          if(!cible.classList.contains("on")&&cible.getAttribute("aria-current")!=="page")cible.click();
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
        sync();
      })
      .catch(()=>{role.textContent="Connexion indisponible";etat.textContent="Impossible de vérifier la session. Réessayez ou contactez le secrétariat.";});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();