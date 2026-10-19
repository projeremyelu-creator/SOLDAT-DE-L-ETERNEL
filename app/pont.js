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

  /* Éliézer : même interface que l'IA de Claude (texte en continu, outils exécutés dans l'application) */
  async function tourIA(messages, outils, rapide, signal, surTexte) {
    let r;
    try { r = await fetch("/api/ia", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages, tools: outils, rapide }), signal }); }
    catch (e) { throw echec(e && e.name === "AbortError" ? "cancelled" : "unavailable", "Réseau indisponible"); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw echec(j.erreur || "unavailable", j.message); }
    const lecteur = r.body.getReader(), dec = new TextDecoder();
    const blocs = []; let tampon = "", arret = null, texte = "";
    const traiter = (ev) => {
      if (ev.type === "content_block_start") blocs[ev.index] = ev.content_block.type === "tool_use" ? { type: "tool_use", id: ev.content_block.id, name: ev.content_block.name, json: "" } : { type: ev.content_block.type, text: "" };
      else if (ev.type === "content_block_delta") {
        const b = blocs[ev.index]; if (!b) return;
        if (ev.delta.type === "text_delta") { b.text += ev.delta.text; texte += ev.delta.text; surTexte(texte); }
        else if (ev.delta.type === "input_json_delta") b.json += ev.delta.partial_json;
      } else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) arret = ev.delta.stop_reason;
      else if (ev.type === "error") throw echec(ev.error && ev.error.type === "overloaded_error" ? "rate_limited" : "unavailable", ev.error && ev.error.message);
    };
    try {
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        tampon += dec.decode(value, { stream: true });
        let i;
        while ((i = tampon.indexOf("\n\n")) >= 0) {
          const bloc = tampon.slice(0, i); tampon = tampon.slice(i + 2);
          const data = bloc.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
          if (data) traiter(JSON.parse(data));
        }
      }
    } catch (e) {
      if (e && e.code) throw Object.assign(e, { text: texte });
      throw Object.assign(echec(e && e.name === "AbortError" ? "cancelled" : "unavailable", "Réponse interrompue"), { text: texte });
    }
    const contenu = blocs.filter(Boolean).map((b) => b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, input: (() => { try { return b.json ? JSON.parse(b.json) : {}; } catch (e) { return {}; } })() } : b.type === "text" && b.text ? { type: "text", text: b.text } : null).filter(Boolean);
    return { contenu, arret, texte };
  }
  async function echantillon(entree, o = {}) {
    await pret;
    const messages = (typeof entree === "string" ? [{ role: "user", content: entree }] : entree).map((m) => ({ role: m.role, content: m.content }));
    const outils = Array.isArray(o.tools) ? o.tools.slice(0, 16) : [];
    const defs = outils.map((t) => ({ name: t.name, description: t.description || "", input_schema: t.inputSchema || { type: "object", properties: {} } }));
    const rapide = o.modelTier === "quick";
    let final = "", tout = "";
    for (let tour = 0; tour < 10; tour += 1) {
      let r;
      try { r = await tourIA(messages, defs, rapide, o.signal, (t) => { final = t; if (o.onText) o.onText({ text: t }); }); }
      catch (e) { if (e && !e.text && tout) e.text = tout; throw e; }
      if (!r.contenu.length) break;
      messages.push({ role: "assistant", content: r.contenu });
      if (r.arret !== "tool_use") return { text: r.texte || tout, truncated: r.arret === "max_tokens" };
      if (r.texte.trim()) tout = (tout ? tout + "\n\n" : "") + r.texte.trim();
      const resultats = [];
      for (const b of r.contenu.filter((x) => x.type === "tool_use")) {
        const t = outils.find((x) => x.name === b.name);
        try {
          if (!t) throw new Error("Outil inconnu : " + b.name);
          const v = await t.execute(b.input || {});
          resultats.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(v === undefined ? null : v).slice(0, 120000) });
        } catch (e) { resultats.push({ type: "tool_result", tool_use_id: b.id, is_error: true, content: String((e && e.message) || e) }); }
      }
      messages.push({ role: "user", content: resultats });
      final = "";
    }
    if (!(final || tout).trim()) throw echec("empty_completion", "Réponse vide");
    return { text: final || tout, truncated: false };
  }
  echantillon.json = async (consigne, o = {}) => {
    const r = await echantillon(String(consigne) + "\n\nRéponds uniquement avec un objet JSON valide, sans aucun texte autour.", { ...o, tools: undefined });
    const t = r.text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    const a = t.indexOf("{"), z = t.lastIndexOf("}");
    try { return JSON.parse(a >= 0 && z > a ? t.slice(a, z + 1) : t); } catch (e) { throw echec("invalid_json", "Réponse illisible"); }
  };
  echantillon.limits = async () => ({ tools: { maxCount: 16 } });

  window.SDE = {
    moi: MOI, pret,
    async connexion(credential) { await appel("/api/connexion", { credential }); location.reload(); },
    async deconnexion() { try { await appel("/api/deconnexion", {}); } catch (e) { /* déjà déconnecté */ } location.reload(); },
    comptes: async () => { const r = await fetch("/api/comptes", { credentials: "same-origin" }); const j = await r.json(); if (!r.ok) throw echec(j.erreur, j.message); return j; },
    majCompte: (o) => appel("/api/comptes", o),
    importer: (docs) => appel("/api/import", { docs }),
  };
  window.claude = {
    use: async (nom) => {
      await pret;
      if (nom === "db") return db;
      if (nom === "user") return user;
      if (nom === "downloads") return downloads;
      if (nom === "assets") return MOI.niveau >= 2 ? assets : null;
      if (nom === "sample") return MOI.ia ? echantillon : null;
      return null;
    },
  };
})();
