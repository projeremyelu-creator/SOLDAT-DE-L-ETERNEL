/* Test HTTP en lecture seule, exécuté à distance depuis GitHub Actions. */
import { JSDOM } from "jsdom";
const domain="https://mouvement-sde.org";
const cases=[
 ["/","mpa-nav.js?v=20261025c","Accueil"],
 ["/vitrine/mouvement","data-sde-page=\"mouvement\"","Mouvement"],
 ["/vitrine/programmes","data-sde-page=\"programmes\"","Programmes"],
 ["/vitrine/ressources","data-sde-page=\"ressources\"","Ressources"],
 ["/vitrine/rejoindre","data-sde-page=\"rejoindre\"","Adhésion"],
 ["/vitrine/projets","data-sde-page=\"projets\"","Projets"],
 ["/vitrine/plus","data-sde-page=\"plus\"","Plus"],
 ["/vitrine/academy","Soldiers Academy","Academy"],
 ["/vitrine/mpa.css?v=20261025d",".sde-mega:not([open])","CSS mobile/desktop"],
 ["/vitrine/mpa-nav.js?v=20261025c","sde-mega-nav","JS méga-menu"],
 ["/vitrine/portal.js?v=20261025c","data-sde-tab","JS onglets"],
 ["/sitemap.xml","/vitrine/plus</loc>","Sitemap"]
];
let fail=false,home="",portal="",mega="";
for(const [path,marker,name] of cases){
 try {
   const r=await fetch(domain+path,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"Cache-Control":"no-cache"}});
   const source=await r.text();
   const ok=r.status===200&&source.includes(marker);
   console.log(JSON.stringify({name,status:r.status,url:r.url,markerFound:source.includes(marker),length:source.length,result:ok?"OK":"FAIL"}));
   if(!ok)fail=true;
   if(path==="/")home=source;
   if(path.startsWith("/vitrine/portal.js"))portal=source;
   if(path.startsWith("/vitrine/mpa-nav.js"))mega=source;
 }catch(err){fail=true;console.error(JSON.stringify({name,error:String(err),result:"FAIL"}));}
}
if(home&&portal&&mega){
 try{
  const d=new JSDOM(home,{url:domain,runScripts:"outside-only",pretendToBeVisual:true});
  d.window.eval(portal);d.window.eval(mega);d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
  const doc=d.window.document,tabs=[...doc.querySelectorAll(".sde-global-nav a")].map(a=>a.textContent.trim());
  const panels=doc.querySelectorAll(".sde-mega-nav details").length;
  const urls=[...doc.querySelectorAll(".sde-mega-panel a")].map(a=>a.href);
  const ok=tabs.join("|")==="Accueil|Membres|Agenda|Finances|Plus"&&panels===4&&
    ["mouvement","programmes","ressources","rejoindre","projets"].every(p=>urls.some(url=>url.includes("/vitrine/"+p)));
  console.log(JSON.stringify({name:"Menus DOM en production",tabs,panels,interPageLinks:urls.length,result:ok?"OK":"FAIL"}));
  if(!ok)fail=true;d.window.close();
 }catch(err){fail=true;console.error(JSON.stringify({name:"Menu DOM",error:String(err),result:"FAIL"}));}
}
if(fail) { console.error("CONTROLE MPA NON VALIDE");process.exitCode=1; }
else console.log("TOUS LES CONTROLES MPA DE PRODUCTION ONT REUSSI.");
