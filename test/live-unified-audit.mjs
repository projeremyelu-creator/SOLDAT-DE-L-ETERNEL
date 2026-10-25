/* Smoke test non destructif : HTML et ressources publiques uniquement. */
import {JSDOM} from "jsdom";
const urls=[
 ["https://mouvement-sde.org/","/vitrine/modern-2026.css","Accueil public"],
 ["https://mouvement-sde.org/vitrine/plus","/sde-bridge.js","Rubriques Plus"],
 ["https://mouvement-sde.org/vitrine/prieres","sde-unified.css","Prières"],
 ["https://mouvement-sde.org/vitrine/temoignages","modern-2026.css","Témoignages"],
 ["https://mouvement-sde.org/vitrine/soldiers-voice","modern-2026.css","Soldiers Voice"],
 ["https://mouvement-sde.org/vitrine/missions-humanitaires","modern-2026.css","Missions"],
 ["https://mouvement-sde.org/vitrine/manifest.webmanifest","standalone","Manifeste PWA"],
 ["https://mouvement-sde.org/vitrine/sw-public.js","sde-public-pages-20261025","SW public"],
 ["https://mouvement-sde.org/vitrine/offline-public.html","Hors connexion","Page hors ligne"],
 ["https://mouvement-sde.org/sde-unified.css?v=20261025e","--sde-gold","Tokens publics"],
 ["https://mouvement-sde.org/sde-bridge.js?v=20261025e","sde-private-links","Pont public"],
 ["https://app.mouvement-sde.org/","sde-private-ui.css","Accueil privé non connecté"],
 ["https://app.mouvement-sde.org/sde-private-ui.css?v=20261025e",".hdr-site","Styles privés"]
];
let invalid=false;
for(const [url,marker,label] of urls){
 try{
  const response=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"Cache-Control":"no-cache"}});
  const html=await response.text();
  const finalHost=new URL(response.url).hostname;
  const requestedHost=new URL(url).hostname;
  const ok=response.status===200&&html.includes(marker)&&requestedHost===finalHost;
  console.log(JSON.stringify({label,status:response.status,host:finalHost,bytes:html.length,markerFound:html.includes(marker),result:ok?"OK":"FAIL"}));
  if(!ok)invalid=true;
  if(label==="Rubriques Plus"){
    const dom=new JSDOM(html,{url,responseFormat:"text"});
    const count=dom.window.document.querySelectorAll(".sde-simple-grid a").length;
    console.log(JSON.stringify({label:"Rubriques publiques",count,result:count>=12?"OK":"FAIL"}));
    if(count<12)invalid=true;
  }
 }catch(e){invalid=true;console.error(JSON.stringify({label,result:"FAIL",reason:String(e)}));}
}
if(invalid){console.error("VALIDATION PRODUCTION FAILED");process.exitCode=1;}
else console.log("VALIDATION COMPLETE DES DEUX DOMAINES : OK");
