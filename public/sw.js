/* Service Worker — Soldats de l'Éternel
   Cache les pages publiques. Ne met jamais en cache les données pastorales ou personnelles. */
const CACHE = "sde-v4";
const PRECACHE = ["/", "/vitrine/", "/manifest.json", "/offline.html", "/icone-192.png", "/icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // Ne jamais mettre en cache les API, les sessions, les fichiers privés, les médias
  if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/_blob/") || u.pathname.startsWith("/m/")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("/offline.html").then((f) => f || new Response("Hors connexion — reconnectez-vous pour accéder au site.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }))))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((nr) => { if (nr.ok) { const c = nr.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return nr; }))
  );
});
