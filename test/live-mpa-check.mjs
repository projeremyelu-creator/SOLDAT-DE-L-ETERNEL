// Vérification HTTP/DOM des pages réellement publiées, strictement en lecture seule.
import {JSDOM} from "jsdom";
const root="https://mouvement-sde.org";
const endpoints=[
  ["/","<main id=\"contenu\">","Accueil"],
  ["/vitrine/mouvement","data-sde-page=\"mouvement\"","Le mouvement"],
  ["/vitrine/programmes","data-sde-page=\"programmes\"","Programmes"],
  ["/vitrine/ressources","data-sde-page=\"ressources\"","Ressources"],
  ["/vitrine/rejoindre","data-sde-page=\"rejoindre\"","Rejoindre"],
  ["/vitrine/projets","data-sde-page=\"projets\"","Projets"],
  ["/vitrine/plus","data-sde-page=\"plus\"","Plus"],
  ["/vitrine/academy","Soldiers Academy","Academy"],
  ["/vitrine/formulaire","id=\"formulaire\"","Formulaire"],
  ["/vitrine/mpa-nav.js?v=20261025c","sde-mega-nav","Script méga-menu"],
  ["/vitrine/mpa.css?v=20261025c","@media (max-width:1024px)","CSS responsive"],
  ["/vitrine/mpa-base.css?v=20261025c",".entete","CSS partagé"],
  ["/vitrine/subpage.js?v=20261025c","setupProgrammes","Script pages"],
  ["/vitrine/portal.js?v=20261025c","vitrine/plus","Navigation mobile"],
  ["/sitemap.xml","/vitrine/projets","Sitemap"]
];
let failed=false,movement=null,navjs=null,portaljs=null,mpacss=null;
for(const [path,marker,label] of endpoints){
  try {
    const r=await fetch(root+path,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"Cache-Control":"no-cache"}});
    const html=await r.text();
    const pass=r.ok && html.includes(marker);
    console.log(JSON.stringify({label,path,status:r.status,redirected:r.redirected,finalUrl:r.url,bytes:html.length,markerFound:html.includes(marker),result:pass?"OK":"FAIL"}));
    if(!pass)failed=true;
    if(path==="/vitrine/mouvement")movement=html;
    if(path.includes("mpa-nav.js"))navjs=html;
    if(path.includes("portal.js"))portaljs=html;
    if(path.includes("mpa.css"))mpacss=html;
  }catch(e){console.error(JSON.stringify({label,path,result:"FAIL",error:String(e)}));failed=true;}
}
if(movement&&navjs&&portaljs&&mpacss){
  try {
    const dom=new JSDOM(movement,{url:root+"/vitrine/mouvement",runScripts:"outside-only",pretendToBeVisual:true});
    dom.window.eval(portaljs);
    dom.window.eval(navjs);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const d=dom.window.document;
    const labels=[...d.querySelectorAll(".sde-global-nav a[data-sde-tab]")].map(a=>a.textContent.trim());
    const mega=d.querySelectorAll(".sde-mega-nav details").length;
    const target=d.querySelector('.sde-global-nav a[data-sde-tab="agenda"]')?.href;
    const mobile=mpacss.includes("@media (max-width:1024px)")&&mpacss.includes(".sde-global-nav { display:block !important");
    const desktop=mpacss.includes("@media (min-width:1025px)")&&mpacss.includes(".sde-global-nav { display:none !important");
    const good=labels.join("|")==="Accueil|Membres|Agenda|Finances|Plus"&&mega===4&&target===root+"/vitrine/programmes#agenda"&&mobile&&desktop;
    console.log(JSON.stringify({label:"Navigation DOM en production",tabs:labels,megaMenus:mega,agendaUrl:target,cssBottomMobile:mobile,cssMegaDesktop:desktop,result:good?"OK":"FAIL"}));
    if(!good)failed=true;
    dom.window.close();
  }catch(e){console.error(JSON.stringify({label:"Navigation DOM en production",result:"FAIL",error:String(e)}));failed=true;}
}
if(failed){console.error("CONTROLE MPA ECHEC");process.exitCode=1;}
else console.log("CONTROLE MPA PUBLIC EN PRODUCTION : SUCCÈS.");
