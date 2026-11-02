/* Tableaux de bord unifiés SDE — lecture uniquement des API existantes de l'utilisateur.
 * Pas de stockage local des données sensibles, pas de données simulées.
 */
(() => {
  "use strict";
  const root=document.body;
  const mode=root?.dataset.dashboard;
  if(!["membre","administration"].includes(mode))return;
  const el=id=>document.getElementById(id);
  const status=el("sde-status");
  let compte=null,profil=null,historique=null;
  const setText=(id,value)=>{const target=el(id);if(target)target.textContent=value==null||value===""?"—":String(value)};
  const setStatus=(message,type="success")=>{
    if(!status)return;status.hidden=!message;status.textContent=message||"";status.dataset.state=type;
  };
  function formatDate(value) {
    const s=String(value||"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    const [y,m,d]=s.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));
    if(Number.isNaN(date.valueOf()))return s;
    return new Intl.DateTimeFormat("fr-CI",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(date);
  }
  async function api(url,options={}) {
    const response=await fetch(url,{
      credentials:"same-origin",cache:"no-store",...options,
      headers:{accept:"application/json",...(options.headers||{})}
    });
    if(response.status===401) {
      location.replace("/connexion?retour="+encodeURIComponent(mode==="administration"?"/administration":"/mon-espace"));
      throw Error("Session expirée. Veuillez vous reconnecter.");
    }
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.message||"Service temporairement indisponible.");
    return result;
  }
  async function post(url,data,method="POST") {
    return api(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  }
  function row(container,primary,secondary) {
    const li=document.createElement("li"),strong=document.createElement("strong"),detail=document.createElement("span");
    strong.textContent=String(primary||"Information");
    detail.textContent=String(secondary||"");
    li.append(strong,detail);container.append(li);
  }
  function renderList(id,items,convert,emptyMessage){
    const target=el(id);if(!target)return;
    target.replaceChildren();
    if(!Array.isArray(items)||!items.length){row(target,emptyMessage||"Aucune donnée enregistrée","");return}
    for(const item of items.slice(0,12)){
      const [titre,detail]=convert(item);
      row(target,titre,detail);
    }
  }
  function navigate(name,resetFocus=false) {
    const views=[...document.querySelectorAll("[data-section]")];
    const target=views.find(x=>x.dataset.section===name&&!x.dataset.access || (x.dataset.section===name && allowed(x.dataset.access)));
    const selected=target?target.dataset.section:"accueil";
    for(const view of views)view.hidden=view.dataset.section!==selected;
    for(const link of document.querySelectorAll("a[data-view]")){
      if(link.closest(".sde-dash-side")||link.closest(".sde-private-bottom-nav")){
        if(link.dataset.view===selected)link.setAttribute("aria-current","page");
        else link.removeAttribute("aria-current");
      }
    }
    if(resetFocus){
      const main=el("espace-principal");
      main?.focus({preventScroll:true});
      if(typeof main?.scrollIntoView==="function"){
        const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        main.scrollIntoView({block:"start",behavior:reduced?"instant":"auto"});
      }
    }
  }
  function allowed(access){
    if(!access)return true;
    if(access==="admin")return compte?.niveau>=2;
    if(access==="proprietaire")return compte?.niveau>=3;
    return false;
  }

  /* Accès directs tactiles : mêmes vues protégées que la barre latérale.
   * Aucun nouveau point d'entrée, aucune permission supplémentaire. */
  function installerNavigationMobile(){
    if(document.querySelector(".sde-private-bottom-nav"))return;
    const paths={
      home:"M3 10 12 3l9 7v11h-6v-7H9v7H3z",
      user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a8 8 0 0 1 16 0v2",
      school:"M3 9l9-5 9 5-9 5zM7 12v5c3 3 7 3 10 0v-5M21 9v7",
      prayer:"M12 21V3M6 9l6 6 6-6M4 21h16",
      calendar:"M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
      mission:"M12 3l9 4-9 4-9-4zM5 10v7l7 4 7-4v-7",
      more:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
    };
    const items=mode==="membre"?
      [["accueil","Accueil","home"],["profil","Profil","user"],["formations","Academy","school"],["prieres","Prière","prayer"],["outils","Plus","more"]]:
      [["accueil","Accueil","home"],["membres","Membres","user"],["programmes","Agenda","calendar"],["projets","Missions","mission"],["outils","Plus","more"]];
    const nav=document.createElement("nav");
    nav.className="sde-private-bottom-nav";
    nav.setAttribute("aria-label",mode==="membre"?"Accès rapides de mon espace":"Accès rapides du poste de commandement");
    for(const [view,label,icon] of items){
      const a=document.createElement("a");
      a.href="#"+view;a.dataset.view=view;
      if(view==="accueil")a.setAttribute("aria-current","page");
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 24 24");
      svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");
      svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
      svg.setAttribute("aria-hidden","true");
      const path=document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",paths[icon]);svg.append(path);
      const span=document.createElement("span");span.textContent=label;
      a.append(svg,span);nav.append(a);
    }
    document.body.append(nav);
  }
  function configureRoles(){
    for(const element of document.querySelectorAll("[data-access]")) {
      if(element.tagName==="A"||element.dataset.section)element.hidden=!allowed(element.dataset.access);
    }
    const switchLink=document.querySelector(".sde-admin-switch");
    if(switchLink)switchLink.hidden=!(compte.niveau>=1);
    setText("sde-role",compte.libRole||compte.role|| (mode==="membre"?"Membre":"Direction"));
  }
  function afficherMembre(){
    if(!profil?.membre)return;
    const m=profil.membre;
    const nom=[m.prenoms,m.nom].filter(Boolean).join(" ")||compte.nom||"Soldat de l'Éternel";
    setText("sde-heading","Bienvenue, "+nom+".");
    setText("m-matricule",m.matricule||compte.matricule);
    setText("profil-matricule",m.matricule||compte.matricule);
    setText("profil-nom",nom);
    setText("profil-email",m.email||compte.email);
    setText("profil-statut",m.statut||"Membre");
    const form=el("profil-form");
    if(form){
      form.elements.telephone.value=m.telephone||"";
      form.elements.quartier.value=m.quartier||"";
      form.elements.situation.value=m.situation||"";
    }
  }
  function afficherHistorique(){
    const presences=historique?.presences||[];
    const prieres=historique?.prieres||[];
    setText("m-presences",presences.filter(x=>["P","R"].includes(x.etat)).length);
    setText("m-prieres",historique?.totalPrieres ?? prieres.length);
    const etiquettes={P:"Présent",R:"En retard",A:"Absent",E:"Excusé"};
    renderList("liste-presences",presences,x=>[x.titre||"Rassemblement",[formatDate(x.date),etiquettes[x.etat]||""].filter(Boolean).join(" · ")],"Aucune présence enregistrée");
    renderList("liste-prieres",prieres,x=>[x.sujet||"Prière",[formatDate(x.date),x.statut||""].filter(Boolean).join(" · ")],"Aucune requête de prière enregistrée");
  }
  async function chargerMembre(){
    const response=await Promise.allSettled([api("/api/mon-espace"),api("/api/mon-historique")]);
    if(response[0].status==="fulfilled") {
      profil=response[0].value;afficherMembre();
    } else setStatus("Votre compte est actif, mais la fiche de membre n'est pas encore accessible. Contactez le secrétariat.","error");
    if(response[1].status==="fulfilled") {
      historique=response[1].value;afficherHistorique();
    } else {
      setText("m-presences","—");setText("m-prieres","—");
      renderList("liste-presences",[],null,"Historique temporairement indisponible");
      renderList("liste-prieres",[],null,"Historique temporairement indisponible");
    }
    if(response.every(x=>x.status==="fulfilled"))setStatus("Vos informations ont été chargées depuis votre compte SDE.");
  }
  async function chargerAdmin(){
    const counts=await Promise.allSettled([
      api("/api/tableau-de-bord"),api("/api/public")
    ]);
    if(counts[0].status==="fulfilled") {
      const info=counts[0].value;
      for(const key of ["membres","evenements","projets","annonces"]){
        setText("a-"+key,info.total?.[key]);
      }
    } else setStatus("Indicateurs indisponibles. La gestion complète reste accessible.","error");
    if(counts[1].status==="fulfilled"){
      const publicEvents=counts[1].value.evenements||[];
      renderList("liste-agenda",publicEvents,x=>[x.titre||"Rendez-vous",[formatDate(x.date),x.heure||"",x.lieu||""].filter(Boolean).join(" · ")],"Aucun programme public à venir");
    } else renderList("liste-agenda",[],null,"Agenda temporairement indisponible");
    if(counts.every(x=>x.status==="fulfilled"))setStatus("Données de synthèse actualisées. Les autorisations du compte sont appliquées.");
  }
  function wireForms(){
    el("profil-form")?.addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,btn=form.querySelector("button[type=submit]");
      const output=el("profil-feedback");btn.disabled=true;output.textContent="Enregistrement…";output.dataset.state="";
      try {
        await post("/api/mon-profil",{
          telephone:form.elements.telephone.value.trim(),
          quartier:form.elements.quartier.value.trim(),
          situation:form.elements.situation.value.trim()
        },"PATCH");
        output.dataset.state="success";output.textContent="Vos informations ont été mises à jour.";
        profil=await api("/api/mon-espace");afficherMembre();
      }catch(e){output.dataset.state="error";output.textContent=e.message||"Enregistrement impossible."}
      finally{btn.disabled=false}
    });
    el("priere-form")?.addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,btn=form.querySelector("button[type=submit]"),output=el("priere-feedback");
      const sujet=form.elements.sujet.value.trim();
      if(!sujet){output.textContent="Écrivez votre sujet de prière.";return}
      btn.disabled=true;output.textContent="Envoi…";output.dataset.state="";
      try {
        await post("/api/priere",{sujet});output.dataset.state="success";
        output.textContent="Votre requête de prière a été enregistrée.";form.reset();
        historique=await api("/api/mon-historique");afficherHistorique();
      }catch(e){output.dataset.state="error";output.textContent=e.message||"Envoi impossible."}
      finally{btn.disabled=false}
    });
    for(const btn of document.querySelectorAll('[data-action="deconnexion"]'))btn.addEventListener("click",async()=>{
      btn.disabled=true;
      try{await post("/api/deconnexion",{})}catch(_){}
      location.assign("/");
    });
  }
  async function start(){
    setStatus("Connexion sécurisée au mouvement…");
    try{
      compte=await api("/api/moi");
      if(!compte.connecte){location.replace("/connexion?retour="+encodeURIComponent(location.pathname));return}
      if(mode==="administration"&&compte.niveau<1){location.replace("/mon-espace");return}
      configureRoles();
      installerNavigationMobile();
      wireForms();
      // Les liens de rubrique ouvrent directement la vue, sans rechargement.
      // Historique du navigateur et accessibilité clavier restent disponibles.
      document.addEventListener("click",event=>{
        const link=event.target?.closest?.("a[data-view]");
        if(!link||!root.contains(link)||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        const name=link.dataset.view;
        const section=[...document.querySelectorAll("[data-section]")].find(x=>x.dataset.section===name);
        if(!section)return;
        event.preventDefault();
        if(!allowed(section.dataset.access))return;
        if(location.hash!=="#"+name)location.hash=name;
        navigate(name,true);
      });
      window.addEventListener("hashchange",()=>navigate(location.hash.slice(1),true));
      navigate(location.hash.slice(1)||"accueil");
      if(mode==="membre")await chargerMembre();
      else await chargerAdmin();
    }catch(e){setStatus(e.message||"Impossible de charger votre espace.","error")}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();