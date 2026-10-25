/* SDE OS installable uniquement sous /os/ ; jamais de données privées en cache. */
const NAME="sde-os-shell-v31a";
const ASSETS=["/os/","/os/index.html","/os/os.css?v=31a","/os/os.js?v=31a","/os/manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil((async()=>{
 const cache=await caches.open(NAME);
 await Promise.all(ASSETS.map(async path=>{
  try{const response=await fetch(path,{cache:"reload"});if(response.ok)await cache.put(path,response);}catch{}
 }));
 await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("sde-os-shell-")&&k!==NAME).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith("/os/"))return;
 if(url.pathname.includes("/api/"))return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).catch(async()=>{
   const cache=await caches.open(NAME);
   return await cache.match("/os/")||new Response("SDE OS nécessite une connexion",{status:503});
  }));return;
 }
 if(!/^\/os\/(os\.css|os\.js|manifest\.webmanifest)$/.test(url.pathname))return;
 event.respondWith(fetch(req).then(async response=>{
  if(response.ok)(await caches.open(NAME)).put(req,response.clone());
  return response;
 }).catch(async()=> (await caches.open(NAME)).match(req)));
});
