/* Pont S.D.E. DIGITAL : fournit à l'application la même interface que dans Claude
   (window.claude.use("db" | "user" | "downloads" | "assets")), branchée sur le serveur Cloudflare. */
(function () {
  "use strict";
  const MOI = { connecte: false, id: null, nom: "", email: null, role: "visiteur", libRole: "Visiteur", niveau: 0, clientId: "" };
  const pret = fetch("/api/moi", { credentials: "same-origin", cache: "no-store" })
    .then((r) => r.json()).then((m) => Object.assign(MOI, m)).catch(() => MOI);
  const segs = (p) => String(p).split("/").filter(Boolean);
  const meta = { fromCache: false, hasPendingWrites: false };
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
  const nouvelId = () => { const a = new Uint8Array(20); crypto.getRandomValues(a); return [...a].map((x) => ALPHA[x % 36]).join(""); };
  const echec = (code, message) => Object.assign(new Error(message || code), { code });

  async function appel(url, corps) {
    let r;
    try { r = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) }); }
    catch (e) { throw echec("unavailable", "Réseau indisponible"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw echec(j.erreur || (r.status === 403 ? "invalid_argument" : "unavailable"), j.message);
    return j;
  }
  const snapDoc = (path, exists, data) => ({ id: segs(path).pop(), ref: docRef(path), exists: !!exists, data: () => (exists ? clone(data) : undefined), metadata: meta });
  const snapQuery = (path, docs) => {
    const d = docs.map((x) => snapDoc(path + "/" + x.id, true, x.data));
    return { docs: d, size: d.length, empty: !d.length, metadata: meta, docChanges: () => [], forEach: (f) => d.forEach(f) };
  };

  /* Abonnements : interrogation groupée du serveur toutes les quelques secondes */
  const abos = new Map();
  let n = 0, minuterie = 0, enCours = false, relance = false;
  function planifier(delai) { clearTimeout(minuterie); minuterie = setTimeout(synchroniser, delai); }
  async function synchroniser() {
    if (enCours) { relance = true; return; }
    if (!abos.size) return;
    if (document.hidden) { planifier(4000); return; }
    enCours = true;
    const liste = [...abos.entries()].map(([k, a]) => ({ k, type: a.type, path: a.path, order: a.order, limit: a.limit, rev: a.rev }));
    try {
      const { res } = await appel("/api/sync", { subs: liste });
      for (const [k, v] of Object.entries(res || {})) {
        const a = abos.get(k);
        if (!a) continue;
        a.rev = v.rev;
        try { a.next(a.type === "doc" ? snapDoc(a.path, v.exists, v.data) : snapQuery(a.path, v.docs || [])); } catch (e) { setTimeout(() => { throw e; }); }
      }
    } catch (e) { for (const a of abos.values()) if (a.err && e.code === "revoked") a.err(e); }
    enCours = false;
    if (relance) { relance = false; planifier(50); } else planifier(navigator.onLine === false ? 8000 : 4000);
  }
  function abonner(type, path, q, next, err) {
    const k = "s" + (n += 1);
    abos.set(k, { type, path, order: q.order || null, limit: q.limit || 0, rev: -1, next, err });
    planifier(0);
    return () => abos.delete(k);
  }
  const apresEcriture = () => planifier(120);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) planifier(0); });
  window.addEventListener("online", () => planifier(0));

  function docRef(path) {
    return {
      id: segs(path).pop(), path,
      get: async () => { const r = await appel("/api/db", { op: "get", path }); return snapDoc(path, r.exists, r.data); },
      set: async (data) => { await appel("/api/db", { op: "set", path, data }); apresEcriture(); },
      update: async (data) => { await appel("/api/db", { op: "update", path, data }); apresEcriture(); },
      delete: async () => { await appel("/api/db", { op: "delete", path }); apresEcriture(); },
      onSnapshot: (next, err) => abonner("doc", path, {}, next, err),
      collection: (sub) => collRef(path + "/" + sub),
    };
  }
  function requete(path, q) {
    return {
      where: () => { throw echec("invalid_argument", "where non pris en charge"); },
      orderBy: (champ, dir = "asc") => requete(path, { ...q, order: [champ, dir] }),
      limit: (k) => requete(path, { ...q, limit: k }),
      get: async () => { const r = await appel("/api/db", { op: "query", path, order: q.order, limit: q.limit }); return snapQuery(path, r.docs || []); },
      onSnapshot: (next, err) => abonner("query", path, q, next, err),
    };
  }
  function collRef(path) {
    return Object.assign(requete(path, {}), { path, id: segs(path).pop(), doc: (id) => docRef(path + "/" + (id || nouvelId())) });
  }
  const db = { doc: docRef, collection: collRef };

  const user = {
    isOwner: async () => (await pret, MOI.niveau >= 3),
    canEdit: async () => (await pret, MOI.niveau >= 2),
    can: async (nom) => { await pret; if (nom === "data.write") return MOI.niveau >= 1; if (nom === "assets.write" || nom === "files.write") return MOI.niveau >= 2; return false; },
    id: async () => (await pret, MOI.id),
    me: async () => { await pret; return { id: MOI.id, name: MOI.nom || "", avatarUrl: MOI.photo || "", email: MOI.email, isOwner: MOI.niveau >= 3, canEdit: MOI.niveau >= 2 }; },
    profiles: async (ids) => { try { return await appel("/api/profils", { ids }); } catch (e) { return {}; } },
    search: async () => [],
  };
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.csv$/i.test(filename) ? "text/csv;charset=utf-8" : /\.html?$/i.test(filename) ? "text/html;charset=utf-8" : /\.json$/i.test(filename) ? "application/json" : "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return { status: "saved" };
    },
  };
  const assets = {
    upload: async (blob, o) => {
      const r = await fetch("/api/fichiers", { method: "POST", credentials: "same-origin", headers: { "content-type": (o && o.type) || blob.type || "application/octet-stream" }, body: blob });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw echec(j.erreur || "unavailable", j.message);
      return j;
    },
    delete: async (id) => { await fetch("/api/fichiers/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin" }); return { deleted: true }; },
    list: async () => ({ assets: [], usage: {} }),
  };

  window.SDE = {
    moi: MOI, pret,
    async connexion(credential) { await appel("/api/connexion", { credential }); location.reload(); },
    async deconnexion() { try { await appel("/api/deconnexion", {}); } catch (e) { /* déjà déconnecté */ } location.reload(); },
    comptes: async () => { const r = await fetch("/api/comptes", { credentials: "same-origin" }); const j = await r.json(); if (!r.ok) throw echec(j.erreur, j.message); return j; },
    majCompte: (o) => appel("/api/comptes", o),
  };
  window.claude = {
    use: async (nom) => {
      await pret;
      if (nom === "db") return db;
      if (nom === "user") return user;
      if (nom === "downloads") return downloads;
      if (nom === "assets") return MOI.niveau >= 2 ? assets : null;
      return null;
    },
  };
})();
