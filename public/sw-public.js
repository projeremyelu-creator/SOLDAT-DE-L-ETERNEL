/* SDE — service worker PUBLIC uniquement. Scope "/" sur mouvement-sde.org.
   Ne prend jamais en charge le sous-domaine privé app.mouvement-sde.org.
   Seuls les GET de pages publiques explicitement listées sont mis en cache. */
const CACHE = "sde-public-shell-20261026-unifie";
const PAGES = new Set([
  "/", "/index.html", "/vitrine/", "/vitrine/index.html",
  "/vitrine/mouvement", "/vitrine/programmes", "/vitrine/ressources",
  "/vitrine/rejoindre", "/vitrine/projets", "/vitrine/plus",
  "/vitrine/academy", "/vitrine/prieres", "/vitrine/temoignages",
  "/vitrine/soldiers-voice", "/vitrine/missions-humanitaires",
  "/mouvement", "/programmes", "/academy", "/enseignements",
  "/missions", "/priere", "/contact", "/temoignages", "/soldiers-voice",
  "/missions-humanitaires", "/rubriques"
]);
const OFFLINE = "/vitrine/offline-public.html";
const RESOURCES = ["/", OFFLINE, "/vitrine/sde-app-shell.css", "/vitrine/sde-app-shell.js", "/vitrine/manifest.webmanifest"];
const PUBLIC_ASSETS = /^\/vitrine\/[^?#]+\.(?:css|js|png|webp|jpe?g|svg|webmanifest)$/i;
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await Promise.all(RESOURCES.map(async path => {
    try {
      const response = await fetch(path, {cache:"reload"});
      if (response.ok && response.type !== "opaqueredirect") await cache.put(path,response);
    } catch (_) { /* cache best effort pour rester installable */ }
  }));
  await self.skipWaiting();
})()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith("sde-public-shell-") && key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const pathname = url.pathname;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_blob/") || pathname.startsWith("/m/")) return;
  if (pathname.includes("/engagements") || pathname.includes("/formulaire")) return;
  if (req.mode === "navigate") {
    const path = pathname.endsWith(".html") && pathname.startsWith("/vitrine/")
      ? pathname.slice(0,-5) : pathname;
    if (!PAGES.has(path)) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
          const cache = await caches.open(CACHE);
          await cache.put(req, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(req, {ignoreSearch:true})) ||
          (await caches.match(path, {ignoreSearch:true})) ||
          (await caches.match(OFFLINE)) ||
          new Response("Connexion indisponible.", {status:503,headers:{"content-type":"text/plain;charset=utf-8"}});
      }
    })());
    return;
  }
  if (!PUBLIC_ASSETS.test(pathname)) return;
  event.respondWith((async () => {
    // Les fichiers CSS et JS doivent refléter immédiatement les déploiements.
    // Respecter la version ?v= et servir le dernier contenu en priorité.
    if (/\.(?:css|js)$/i.test(pathname)) {
      try {
        const response = await fetch(req);
        if (response.ok && response.type !== "opaqueredirect") {
          const cache = await caches.open(CACHE);
          await cache.put(req, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(req)) ||
          new Response("Ressource indisponible hors connexion.",{status:503});
      }
    }
    const cached = await caches.match(req);
    if (cached) return cached;
    const response = await fetch(req);
    if (response.ok && response.type !== "opaqueredirect") {
      const cache = await caches.open(CACHE);
      await cache.put(req, response.clone());
    }
    return response;
  })());
});


/* Notifications PWA unifiées.
   Ce service worker ne conserve ni sessions, ni requêtes API, ni pages privées.
   Les liens de notification sont limités au site SDE (pas de redirection externe). */
function destinationNotification(valeur) {
  try {
    const u = new URL(String(valeur || "/"), self.location.origin);
    if (u.origin !== self.location.origin) {
      if(u.protocol === "https:" && u.hostname === "app.mouvement-sde.org")
        return "/mon-espace";
      return "/";
    }
    if (/^\/(?:api\/|_blob\/|m\/)/.test(u.pathname))return "/";
    if (u.pathname === "/os-v31" || u.pathname === "/os-v31/")
      return "/mon-espace/os-v31" + u.hash;
    return u.pathname + u.search + u.hash;
  } catch (_) {
    return "/";
  }
}

self.addEventListener("push",event=>{
  let payload={};
  try { payload=event.data?.json()||{}; } catch (_) {}
  const titre=String(payload.title||"SDE · Soldats de l'Éternel").slice(0,140);
  const texte=String(payload.body||"Vous avez une nouvelle notification.").slice(0,260);
  const destination=destinationNotification(payload.url||"/mon-espace");
  event.waitUntil(self.registration.showNotification(titre,{
    body:texte,
    icon:"/icone-192.png",badge:"/icone-192.png",
    data:{url:destination}
  }));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const cible=destinationNotification(event.notification?.data?.url||"/mon-espace");
  event.waitUntil((async()=>{
    const ouvert=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const fenetre of ouvert){
      try{
        const u=new URL(fenetre.url);
        if(u.origin!==self.location.origin || u.pathname!==new URL(cible,self.location.origin).pathname)continue;
        if(typeof fenetre.focus==="function")return fenetre.focus();
      }catch(_){}
    }
    return self.clients.openWindow(cible);
  })());
});

self.addEventListener("message",event=>{
  if(event.data==="skipWaiting")self.skipWaiting();
});
