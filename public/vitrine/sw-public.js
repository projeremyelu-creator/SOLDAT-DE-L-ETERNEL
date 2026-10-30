/* SDE portail public : service worker limité à /vitrine/.
   Exclut tous les formulaires administratifs, APIs et données privées. */
const CACHE = "sde-public-pages-20261025";
const DOCS = new Set([
  "/vitrine/","/vitrine/mouvement","/vitrine/programmes",
  "/vitrine/ressources","/vitrine/rejoindre","/vitrine/projets",
  "/vitrine/plus","/vitrine/academy","/vitrine/prieres",
  "/vitrine/temoignages","/vitrine/soldiers-voice","/vitrine/soldiers-award",
  "/vitrine/missions-humanitaires"
]);
const STATIC = new Set([
  "/vitrine/mpa-base.css","/vitrine/mpa.css",
  "/vitrine/portal.css","/vitrine/modern-2026.css",
  "/vitrine/mpa-nav.js","/vitrine/portal.js",
  "/vitrine/initiatives.css","/vitrine/initiatives.js",
  "/vitrine/discovery.js","/vitrine/manifest.webmanifest",
  "/vitrine/offline-public.html"
]);
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.all(["/vitrine/plus","/vitrine/offline-public.html"].map(async path=>{
      try {const response=await fetch(path,{cache:"reload"});if(response.ok)await cache.put(path,response);}catch(_){}
    }));
    await self.skipWaiting();
  }));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith("sde-public-pages-")&&key!==CACHE).map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith("/vitrine/"))return;
  const path=url.pathname.endsWith(".html")?url.pathname.slice(0,-5):url.pathname;
  if(req.mode==="navigate"){
    if(!DOCS.has(path))return;
    event.respondWith(fetch(req).then(async response=>{
      if(response.ok&&response.headers.get("content-type")?.includes("text/html")){
        const cache=await caches.open(CACHE);await cache.put(req,response.clone());
      }
      return response;
    }).catch(async()=>await caches.match(req,{ignoreSearch:true})||
      await caches.match("/vitrine/offline-public.html")||
      new Response("Hors connexion.",{status:503})));
    return;
  }
  if(STATIC.has(path)||/\.(png|jpe?g|webp|svg)$/.test(path)){
    event.respondWith(caches.match(req,{ignoreSearch:true}).then(async cached=>{
      if(cached)return cached;
      const response=await fetch(req);
      if(response.ok){
        const cache=await caches.open(CACHE);await cache.put(req,response.clone());
      }
      return response;
    }));
  }
});
