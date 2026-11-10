/* Contrôle anonyme des deux portails SDE après publication Cloudflare.
 * Aucun cookie, aucune donnée privée, aucun téléversement en production.
 * Échec explicite si le studio est ouvert sans authentification. */
const domains=["https://mouvement-sde.org","https://app.mouvement-sde.org"];
const expected=(process.env.SDE_EXPECTED_REV||"").slice(0,12);

async function check(root){
 const get=async(path,{method="GET"}={})=>{
  const url=new URL(path,root);
  const r=await fetch(url,{method,redirect:"manual",cache:"no-store",
   headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(15000)});
  return r;
 };
 const health=await get("/api/sante");
 if(health.status!==200)throw Error(root+" : santé non disponible ("+health.status+")");
 const data=await health.json();
 if(expected&&data.assetRevision!==expected)throw Error(root+" : révision "+data.assetRevision+" attendue "+expected);
 const publicPage=await get("/mediatheque");
 if(publicPage.status!==200||!(publicPage.headers.get("content-type")||"").includes("text/html"))
  throw Error(root+" : médiathèque publique inaccessible ("+publicPage.status+")");
 const html=await publicPage.text();
 for(const part of ["Médiathèque officielle SDE","sde-public-media.js","sde-shell-public.js"]){
  if(!html.includes(part))throw Error(root+" : contenu médiathèque incomplet, marqueur "+part);
 }
 const app=await get("/administration/medias");
 const redir=app.headers.get("location")||"";
 if(![302,303].includes(app.status)||new URL(redir,root).pathname!=="/connexion")
  throw Error(root+" : le studio admin n'exige pas de session (statut "+app.status+")");
 const raw=await get("/vitrine/sde-mediatheque-admin.html");
 const rawLocation=raw.headers.get("location")||"";
 if(![301,302,303].includes(raw.status)||new URL(rawLocation,root).pathname!=="/administration/medias")
  throw Error(root+" : la route HTML brute doit renvoyer au studio protégé");
 const scripts=["/vitrine/sde-public-media.js","/vitrine/sde-mediatheque-admin.js"];
 for(const path of scripts){
  const resource=await get(path,{method:"HEAD"});
  if(resource.status!==200||!/javascript|ecmascript/.test(resource.headers.get("content-type")||""))
   throw Error(root+" : script indisponible "+path+" ("+resource.status+")");
 }
 const listing=await get("/api/medias");
 if(listing.status!==200)throw Error(root+" : catalogue public indisponible ("+listing.status+")");
 const catalogue=await listing.json();
 if(!Array.isArray(catalogue.medias)||catalogue.peutAjouter!==false)
  throw Error(root+" : catalogue public non sécurisé");
 if(catalogue.medias.some(m=>m.visibilite!=="public"||m.gerer))
  throw Error(root+" : une ressource non publique a été exposée dans le catalogue");
 console.log("MEDIATHEQUE_PUBLIEE_ET_PROTEGEE "+JSON.stringify({
  domain:root,revision:data.assetRevision,page:200,studio:app.status,
  assetProtege:raw.status,scripts:scripts.length,mediasPublics:catalogue.medias.length
 }));
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const root of domains){
 let last;
 for(let n=1;n<=4;n++){
  try{await check(root);last=null;break;}
  catch(e){last=e;console.warn("CONTROLE_MEDIA_REESSAI "+root+" essai="+n+" "+e.message);if(n<4)await sleep(9000);}
 }
 if(last)throw last;
}
console.log("RECETTE_MEDIATHEQUE_SDE_VALIDEE : accès public et garde administrateur confirmés sur les deux domaines.");
