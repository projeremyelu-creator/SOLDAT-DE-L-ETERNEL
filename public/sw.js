/* Service Worker — Soldats de l'Éternel
   Cache les pages publiques. Ne met jamais en cache les données pastorales ou personnelles.
   Stratégies :
   - Navigations → réseau d'abord, cache en secours, page hors-ligne en dernier recours
   - Polices & icônes (fonts.gstatic.com, icône SDE) → stale-while-revalidate
   - Fichiers statiques → stale-while-revalidate
   - API, blobs, médias, pastoral, OS privé → jamais mis en cache */
const CACHE = "sde-v11";
const PRECACHE = ["/", "/vitrine/", "/manifest.webmanifest", "/offline.html", "/icone-192.png", "/icone-512.png", "/app.css"];
const EXCLUS = ["/api/", "/_blob/", "/m/", "/pastoral", "/suivi/", "/os-v31"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Nettoyage automatique : supprimer les entrées les plus anciennes au-delà de la limite */
const MAX_CACHE = 80;
async function limiterCache() {
  const c = await caches.open(CACHE);
  const ks = await c.keys();
  if (ks.length > MAX_CACHE) {
    const suppr = ks.slice(0, ks.length - MAX_CACHE);
    await Promise.all(suppr.map((r) => c.delete(r)));
  }
}

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  /* Requêtes cross-origin : ne gérer que les polices Google */
  if (u.origin !== location.origin) {
    if (u.hostname === "fonts.gstatic.com" || u.hostname === "fonts.googleapis.com") {
      e.respondWith(
        caches.match(e.request).then((r) => {
          const fetching = fetch(e.request).then((nr) => {
            if (nr.ok) { const c = nr.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
            return nr;
          }).catch(() => null);
          return r || fetching;
        })
      );
    }
    return;
  }

  /* Exclure les chemins sensibles */
  if (EXCLUS.some((p) => u.pathname.startsWith(p))) return;

  /* Navigations : réseau → cache → hors-ligne */
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); }
          return r;
        })
        .catch(() =>
          caches.match(e.request).then((r) =>
            r || caches.match("/offline.html").then((f) =>
              f || new Response("Hors connexion — reconnectez-vous pour accéder au site.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })
            )
          )
        )
    );
    return;
  }

  /* Ressources statiques : stale-while-revalidate */
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetching = fetch(e.request).then((nr) => {
        if (nr.ok) {
          const c = nr.clone();
          caches.open(CACHE).then((k) => { k.put(e.request, c); limiterCache(); });
        }
        return nr;
      }).catch(() => null);
      return cached || fetching;
    })
  );
});

/* ───────── Notifications push ───────── */
self.addEventListener("push", (e) => {
  let data = { title: "MPA SDE", body: "Nouvelle notification", url: "/" };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const dest = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if (new URL(c.url).pathname === dest && "focus" in c) return c.focus(); }
      return clients.openWindow(dest);
    })
  );
});

/* Message de mise à jour : le client peut envoyer un message pour forcer le SW à s'activer */
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
