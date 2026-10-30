/* SDE OS — service worker privé, cache minimal et notifications sécurisées.
   Les API, la connexion, l'administration, les dossiers membres et les
   réponses comportant des cookies ou Cache-Control: private/no-store
   ne sont JAMAIS copiés dans Cache Storage. */
const CACHE = "sde-v12-public-only-20261030";
const PRECACHE = ["/offline.html", "/icone-192.png", "/icone-512.png"];
const PUBLIC_PAGES = new Set([
  "/mouvement", "/programmes", "/academy", "/enseignements", "/missions",
  "/priere", "/contact", "/temoignages", "/soldiers-voice",
  "/missions-humanitaires", "/rubriques", "/boutique",
  "/pole-reveil", "/pole-social", "/pole-logistique", "/pole-medias",
  "/pole-formation"
]);
const ASSET_PATH = /^\/(?:_v\/[a-f0-9]{7,16}\/)?(?:vitrine\/[^?#]+\.(?:css|js|png|webp|jpe?g|svg|webmanifest)|app\.(?:css|js)|icone-(?:192|512)\.png|logo[^/]*\.(?:png|webp|svg))$/i;
const EXCLUS = [
  "/api/", "/_blob/", "/m/", "/pastoral", "/suivi/", "/os-v31",
  "/mon-espace", "/administration", "/connexion", "/portail",
  "/espace-membre", "/tableau-membre", "/tableau-administration",
  "/inscription", "/formulaire"
];

function publicResponse(response, kind) {
  if (!response || !response.ok || response.type === "opaqueredirect") return false;
  const cc = (response.headers.get("cache-control") || "").toLowerCase();
  if (/\b(?:private|no-store|no-cache)\b/.test(cc)) return false;
  if (response.headers.has("set-cookie")) return false;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  return kind === "page" ? type.includes("text/html") : !type.includes("text/html");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async path => {
      try {
        const response = await fetch(path, {cache:"reload",credentials:"omit"});
        if (publicResponse(response, "asset")) await cache.put(path, response);
      } catch (_) { /* cache hors ligne facultatif */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Supprimer le cache historique susceptible de contenir des pages privées.
    await Promise.all(keys.filter(k => k.startsWith("sde-v") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const origin = self.location?.origin || (typeof location !== "undefined" ? location.origin : "");
  if (url.origin !== origin) return;
  const path = url.pathname;
  if (EXCLUS.some(prefix => path === prefix || path.startsWith(prefix + "/") || (prefix.endsWith("/") && path.startsWith(prefix)))) return;

  if (req.mode === "navigate") {
    // La page d'accueil du domaine privé nécessite une session : ne pas la cacher.
    if (!PUBLIC_PAGES.has(path)) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (publicResponse(response,"page")) {
          const cache = await caches.open(CACHE);
          await cache.put(req,response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(req)) || (await caches.match("/offline.html")) ||
          new Response("Connexion indisponible.",{status:503,headers:{"content-type":"text/plain;charset=utf-8"}});
      }
    })());
    return;
  }
  // Aucun cache des ressources non autorisées, même si leur URL paraît statique.
  if (!ASSET_PATH.test(path)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (publicResponse(response,"asset")) {
        const cache = await caches.open(CACHE);
        await cache.put(req,response.clone());
      }
      return response;
    } catch (_) {
      return (await caches.match(req)) ||
        new Response("Ressource hors ligne indisponible.",{status:503});
    }
  })());
});

function notificationDestination(value) {
  try {
    const target = new URL(String(value||"/mon-espace"),self.location.origin);
    if (target.origin !== self.location.origin) return "/mon-espace";
    if (target.pathname.startsWith("/api/") || target.pathname.startsWith("/_blob/")) return "/mon-espace";
    return target.pathname + target.search + target.hash;
  } catch (_) { return "/mon-espace"; }
}
self.addEventListener("push",event=>{
  let data={};
  try {data=event.data?.json()||{}} catch (_) {}
  const title=String(data.title||"SDE · Soldats de l'Éternel").slice(0,140);
  const body=String(data.body||"Nouvelle notification SDE").slice(0,260);
  event.waitUntil(self.registration.showNotification(title,{
    body,
    icon:"/icone-192.png",
    badge:"/icone-192.png",
    data:{url:notificationDestination(data.url)},
    tag:String(data.tag||"sde-info").replace(/[^a-z0-9_-]/gi,"-").slice(0,100)
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const dest=notificationDestination(event.notification?.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for (const client of windows) {
      try {
        const u=new URL(client.url);
        if (u.origin === self.location.origin && u.pathname === new URL(dest,self.location.origin).pathname)
          return client.focus();
      } catch (_) {}
    }
    return self.clients.openWindow(dest);
  })());
});
self.addEventListener("message",event=>{
  if (event.data==="skipWaiting") self.skipWaiting();
});
