/* Pont visuel SDE : modules historiques, même domaine et même session. */
(() => {
  "use strict";
  if (location.hostname !== "mouvement-sde.org") return;
  const path=location.pathname;
  const personnel=path.startsWith("/mon-espace/");
  const direction=path.startsWith("/administration/");
  if(!personnel&&!direction)return;
  const retour=direction?"/administration":"/mon-espace";
  const os31=path.endsWith("/os-v31");
  const historique=path.endsWith("/outils");
  if(!historique&&!os31)return;

  const modules={
    espace:{nom:"Espace soldat",niveau:0},
    academie:{nom:"Soldiers Academy",niveau:0},
    agenda:{nom:"Agenda",niveau:0},
    arsenal:{nom:"Enseignements",niveau:0},
    mediatheque:{nom:"Médiathèque",niveau:0},
    membres:{nom:"Registre des membres",niveau:1},
    garnisons:{nom:"Garnisons et départements",niveau:1},
    projets:{nom:"Projets",niveau:1},
    portevoix:{nom:"Annonces et messages",niveau:1},
    chambre:{nom:"Chambre Haute",niveau:1},
    secretariat:{nom:"Secrétariat",niveau:1},
    finances:{nom:"Finances",niveau:2}
  };
  const requested=new URLSearchParams(location.search).get("module")||"";
  const souhait=Object.prototype.hasOwnProperty.call(modules,requested)?requested:"";
  function lien(href,label,cls=""){
    const a=document.createElement("a");
    a.href=href;a.textContent=label;
    if(cls)a.className=cls;
    return a;
  }
  function creer(){
    if(document.getElementById("sde-espace-entete"))return;
    const nav=document.createElement("nav");
    nav.id="sde-espace-entete";
    nav.setAttribute("aria-label","Navigation commune des espaces SDE");
    nav.append(
      lien("/","S.D.E.","sde-espace-marque"),
      lien(retour,"← Tableau de bord","sde-espace-retour"),
      lien("/","Site public")
    );
    const info=document.createElement("span");
    info.id="sde-module-etat";info.setAttribute("role","status");info.setAttribute("aria-live","polite");
    info.textContent=os31?"Soldat Intégral · SDE OS 3.1":"Gestion SDE";
    nav.append(info);
    document.body.insertBefore(nav,document.body.firstChild);
    const css=document.createElement("style");
    css.textContent=[
      '#sde-espace-entete{position:sticky;top:0;z-index:99999;display:flex;align-items:center;gap:14px;min-height:58px;padding:8px clamp(12px,3vw,38px);box-sizing:border-box;color:#f7f4ed;background:#11182a;border-bottom:2px solid #c8a451;font:700 14px/1.4 system-ui,sans-serif}',
      '#sde-espace-entete a{color:inherit!important;text-decoration:none!important;padding:10px 9px;border-radius:9px;white-space:nowrap}',
      '#sde-espace-entete a:hover,#sde-espace-entete a:focus-visible{background:#293955;color:#edd089!important}',
      '#sde-espace-entete .sde-espace-marque{color:#edd089!important;font-weight:900;letter-spacing:.08em}',
      '#sde-espace-entete .sde-espace-retour{background:#32405b}',
      '#sde-module-etat{margin-left:auto;max-width:40%;color:#dbe1eb;text-align:right;font-size:12px;overflow:hidden;text-overflow:ellipsis}',
      '@media(max-width:650px){#sde-espace-entete{gap:4px;padding:8px;font-size:12px;flex-wrap:wrap}#sde-espace-entete a{padding:7px}#sde-module-etat{max-width:100%;flex-basis:100%;text-align:left;margin:0 5px}}'
    ].join("");
    document.head.append(css);
    fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(user=>{
        if(!user||!user.connecte)return;
        if(user.niveau>=1)nav.insertBefore(lien("/administration","Administration"),info);
        if(historique&&requested){
          if(!souhait||(personnel&&modules[souhait].niveau>=1)||user.niveau<modules[souhait].niveau){
            info.textContent="Module non autorisé ou inconnu";return;
          }
          ouvrirModule(souhait,info);
        }
      })
      .catch(()=>{info.textContent="Connexion indisponible";});
  }
  function ouvrirModule(nom,info){
    const nav=document.querySelector("#nav");
    if(!nav)return;
    let fait=false;
    let observation;
    const essayer=()=>{
      if(fait)return;
      const bouton=nav.querySelector('button[data-vue="'+nom+'"]');
      if(!bouton||bouton.disabled)return;
      fait=true;
      observation.disconnect();
      info.textContent=modules[nom].nom;
      bouton.click(); // Le routeur natif revalide la disponibilité du module.
    };
    observation=new MutationObserver(essayer);
    observation.observe(nav,{childList:true,subtree:true});
    essayer();
    setTimeout(()=>{
      if(!fait){observation.disconnect();info.textContent="Module indisponible pour ce compte";}
    },12000);
  }
  document.addEventListener("click",e=>{
    const a=e.target.closest?.('a[href^="https://app.mouvement-sde.org"]');
    if(!a)return;
    e.preventDefault();
    location.assign(a.href.includes("#finances")?"/administration":retour);
  },true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",creer,{once:true});
  else creer();
})();