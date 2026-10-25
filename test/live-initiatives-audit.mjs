/* Audit de production en lecture seule. Aucun formulaire soumis. */
import {JSDOM} from "jsdom";
const host="https://mouvement-sde.org";
const list=[
 ["/vitrine/prieres","Prières et intercession"],
 ["/vitrine/temoignages","Témoignages"],
 ["/vitrine/soldiers-voice","Soldiers Voice"],
 ["/vitrine/missions-humanitaires","Missions humanitaires"],
 ["/vitrine/initiatives.css?v=20261025a","sde-initiative-form"],
 ["/vitrine/initiatives.js?v=20261025a","/api/engager"],
 ["/vitrine/pwa-public.js?v=20261025a","beforeinstallprompt"],
 ["/vitrine/manifest.webmanifest","standalone"],
 ["/vitrine/mpa-nav.js?v=20261025d","/vitrine/soldiers-voice"],
 ["/vitrine/plus","/vitrine/prieres"],
 ["/","/vitrine/temoignages"],
 ["/sitemap.xml","/vitrine/missions-humanitaires"]
];
let failed=false;
for(const [path,marker] of list){
 try{
  const res=await fetch(host+path,{headers:{"Cache-Control":"no-cache"},redirect:"follow",signal:AbortSignal.timeout(15000)});
  const source=await res.text();
  const ok=res.ok&&source.includes(marker);
  console.log(JSON.stringify({path,status:res.status,found:source.includes(marker),bytes:source.length,result:ok?"OK":"FAIL"}));
  if(!ok)failed=true;
  if(path.startsWith("/vitrine/")&&!path.includes(".")&&source.includes("<html")){
   const doc=new JSDOM(source).window.document;
   const valid=!!doc.querySelector("h1")&&!!doc.querySelector("form[data-sde-contact]")&&!!doc.querySelector('link[rel="canonical"]');
   if(path!=="/vitrine/plus"){
    console.log(JSON.stringify({path,document:valid?"OK":"FAIL",hasForm:!!doc.querySelector("form[data-sde-contact]")}));
    if(!valid)failed=true;
   }
  }
 }catch(error){console.error(JSON.stringify({path,result:"FAIL",error:String(error)}));failed=true;}
}
if(failed){console.error("PRODUCTION INCOMPLETE");process.exitCode=1;}
else console.log("VERIFICATION SDE QUATRE PAGES : SUCCES");
