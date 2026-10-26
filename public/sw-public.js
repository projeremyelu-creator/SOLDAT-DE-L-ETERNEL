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
