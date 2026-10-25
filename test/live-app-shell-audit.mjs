/* Audit de publication — requêtes GET uniquement, aucune création de donnée. */
import {JSDOM} from "jsdom";
const PUBLIC="https://mouvement-sde.org";
const APP="https://app.mouvement-sde.org";
const urls=[
  ["/","/vitrine/sde-app-shell.css?v=20261025f"],
  ["/vitrine/mouvement","sde-app-shell.css"],
  ["/vitrine/programmes","sde-app-shell.css"],
  ["/vitrine/ressources","sde-app-shell.css"],
  ["/vitrine/rejoindre","sde-app-shell.css"],
  ["/vitrine/projets","sde-app-shell.css"],
  ["/vitrine/plus","sde-app-shell.css"],
  ["/vitrine/prieres","sde-app-shell.css"],
  ["/vitrine/temoignages","sde-app-shell.css"],
  ["/vitrine/soldiers-voice","sde-app-shell.css"],
  ["/vitrine/missions-humanitaires","sde-app-shell.css"],
  ["/vitrine/academy","sde-app-shell.css"],
  ["/vitrine/formulaire","sde-app-shell.css"],
  ["/vitrine/sde-app-shell.css?v=20261025f","sde-shell-search-dialog"],
  ["/vitrine/sde-app-shell.js?v=20261025f","Rechercher sur SDE"],
  ["/vitrine/sde-unified.css?v=20261025f","--sde-night"],
  ["/vitrine/sde-public-directory.js?v=20261025f","sde-directory-search"],
  ["/vitrine/pwa-public.js?v=20261025f","/sw-public.js"],
  ["/vitrine/manifest.webmanifest",'"start_url": "/"'],
  ["/sw-public.js","sde-public-shell-20261025f"]
];
let failed=false;let home="",shell="";
for(const [path,marker] of urls){
  try{
    const res=await fetch(PUBLIC+path,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"Cache-Control":"no-cache"}});
    const body=await res.text();
    const ok=res.status===200 && body.includes(marker) && res.url.startsWith(PUBLIC);
    if(path==="/") home=body;
    if(path.startsWith("/vitrine/sde-app-shell.js"))shell=body;
    console.log(JSON.stringify({path,status:res.status,source:res.url,marker:body.includes(marker),bytes:body.length,result:ok?"OK":"FAIL"}));
    if(!ok)failed=true;
  }catch(e){failed=true;console.error(JSON.stringify({path,result:"FAIL",error:String(e)}));}
}
if(home && shell){
 try{
  const d=new JSDOM(home,{url:PUBLIC,runScripts:"outside-only",pretendToBeVisual:true});
  d.window.eval(shell);
  d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
  const doc=d.window.document;
  const search=doc.querySelector(".sde-shell-search-btn");
  search?.click();
  const input=doc.querySelector("#sde-shell-query");
  if(input){input.value="prière";input.dispatchEvent(new d.window.Event("input",{bubbles:true}));}
  const links=[...doc.querySelectorAll(".sde-shell-search-results a")].map(x=>x.getAttribute("href"));
  const ok=!!search && links.includes("/vitrine/prieres") &&
    !!doc.querySelector(".sde-shell-toolbar") && !!doc.querySelector("#form-rejoindre");
  console.log(JSON.stringify({name:"Interactions du site public",search:!!search,results:links,formsPreserved:!!doc.querySelector("#form-rejoindre"),result:ok?"OK":"FAIL"}));
  if(!ok)failed=true;
  d.window.close();
 }catch(e){failed=true;console.error(JSON.stringify({name:"Interactions du site public",result:"FAIL",error:String(e)}));}
}
try{
 const r=await fetch(APP+"/",{redirect:"follow",signal:AbortSignal.timeout(15000)});
 const h=await r.text();
 const ok=r.ok&&h.includes('name="robots" content="noindex"')&&h.includes("/sde-private-ui.css")&&!h.includes("/vitrine/sde-app-shell.css");
 console.log(JSON.stringify({name:"Séparation du portail privé",status:r.status,host:new URL(r.url).hostname,privateStyle:h.includes("/sde-private-ui.css"),publicStyle:h.includes("/vitrine/sde-app-shell.css"),result:ok?"OK":"FAIL"}));
 if(!ok)failed=true;
}catch(e){failed=true;console.error(JSON.stringify({name:"Portail privé",error:String(e)}));}
if(failed){console.error("AUDIT DE PRODUCTION INCOMPLET");process.exitCode=1;}
else console.log("AUDIT PRODUCTION PUBLIC/PRIVE SDE : TOUS LES CONTROLES ONT REUSSI.");
