/* Lecture seule : confirmer le déploiement Cloudflare des quatre lots SDE. */
import { JSDOM } from "jsdom";
const origin = "https://mouvement-sde.org";
const targets = [
  ["/", "Votre parcours avec SDE", "Accueil"],
  ["/vitrine/academy.html", "portal.js?v=20261025b", "Academy"],
  ["/vitrine/formulaire.html", "portal.js?v=20261025b", "Formulaire"],
  ["/vitrine/engagements.html", "portal.js?v=20261025b", "Engagements"],
  ["/vitrine/portal.js?v=20261025b", "#finances", "Navigation JS"],
  ["/vitrine/portal.css?v=20261025b", "position: fixed; top: auto; bottom: 0", "Dock CSS"],
  ["/vitrine/discovery.js?v=20261025b", "Rechercher un programme", "Recherche JS"],
  ["/sitemap.xml", "/vitrine/academy", "Sitemap"]
];
let failed=false;let html,portal,discovery;
for(const [path,marker,label] of targets){
  try{
    const response=await fetch(origin+path, {
      redirect:"follow",
      headers:{"Cache-Control":"no-cache", "User-Agent":"SDE-ReadOnly-Verification/1.0"},
      signal:AbortSignal.timeout(15000)
    });
    const body=await response.text();
    const ok=response.ok && body.includes(marker);
    console.log(JSON.stringify({label,status:response.status,finalUrl:response.url,marker:body.includes(marker),bytes:body.length,result:ok?"OK":"FAIL"}));
    if(!ok)failed=true;
    if(path==="/")html=body;
    if(path.includes("portal.js?"))portal=body;
    if(path.includes("discovery.js?"))discovery=body;
  }catch(error){failed=true;console.error(JSON.stringify({label,result:"FAIL",error:String(error)}));}
}
if(html && portal && discovery){
  try{
    const dom=new JSDOM(html,{url:origin,runScripts:"outside-only",pretendToBeVisual:true});
    const w=dom.window;
    w.eval(portal);w.eval(discovery);
    w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
    const d=w.document;
    const labels=[...d.querySelectorAll(".sde-global-nav [data-sde-tab]")].map(a=>a.textContent.trim());
    const finances=d.querySelector('.sde-global-nav [data-sde-tab="finances"]')?.href;
    const resources=d.querySelector("#sde-search-ressources");
    const programs=d.querySelector("#sde-search-programmes");
    const cards=d.querySelectorAll("#parcours-sde .sde-parcours-card").length;
    if(programs){programs.value="Soldiers Academy";programs.dispatchEvent(new w.Event("input",{bubbles:true}));}
    const shown=d.querySelectorAll("#programmes .programme:not([hidden])").length;
    const hasForm=Boolean(d.getElementById("form-rejoindre"));
    const ok=labels.join("|")==="Accueil|Membres|Agenda|Finances|Plus"
      && finances==="https://app.mouvement-sde.org/#finances"
      && !!resources && !!programs && shown===1 && cards===8 && hasForm;
    console.log(JSON.stringify({label:"Interactivité DOM publique",labels,finances,programSearch:!!programs,resourceSearch:!!resources,resultsAfterSearch:shown,cards,originalForm:hasForm,result:ok?"OK":"FAIL"}));
    if(!ok) failed=true;
    w.close();
  }catch(error){failed=true;console.error(JSON.stringify({label:"Interactivité DOM",result:"FAIL",error:String(error)}));}
}
if(failed){console.error("AUDIT FAILED");process.exitCode=1;}
else console.log("AUDIT DE PRODUCTION SDE : TOUTES LES VÉRIFICATIONS ONT RÉUSSI.");
