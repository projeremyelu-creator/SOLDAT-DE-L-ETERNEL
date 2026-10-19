/* S.D.E. DIGITAL — serveur Cloudflare (Worker)
   Sert l'application, garde les données dans D1, les fichiers dans KV,
   et reconnaît les responsables par leur compte Google.
   Les règles d'accès reprennent exactement celles de la version Claude. */

const NIVEAUX = { view: 0, interact: 1, admin: 2, owner: 3 };
const ROLES = { attente: 0, lecture: 0, contributeur: 1, admin: 2, proprietaire: 3 };
const LIB_ROLES = { attente: "En attente", lecture: "Lecture seule", contributeur: "Contributeur", admin: "Administrateur", proprietaire: "Propriétaire" };
const REGLES = [
  { path: "", read: "interact", write: "interact" },
  { path: "evenements", read: "view", write: "interact" },
  { path: "config", read: "view", write: "admin" },
  { path: "finances", read: "admin", write: "admin" },
  { path: "cotisations", read: "admin", write: "admin" },
  { path: "discipline", read: "admin", write: "admin" },
  { path: "prieres_conf", read: "admin", write: "admin" },
  { path: "annonces", read: "view", write: "interact" },
  { path: "ressources", read: "view", write: "interact" },
  { path: "suivi", read: "admin", write: "admin" },
  { path: "cotis_speciales", read: "admin", write: "admin" },
  { path: "offrandes", read: "admin", write: "admin" },
  { path: "projets_fin", read: "admin", write: "admin" },
  { path: "acces", read: "admin", write: "admin" },
  { path: "espace", read: "view", write: "admin" },
];
const SESSION_JOURS = 30;
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

/* ───────── utilitaires ───────── */
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const erreur = (code, message, status = 400) => json({ erreur: code, message }, status);
const segs = (p) => String(p || "").split("/").filter((s) => s !== "");
function cheminValide(p, pair) {
  const s = segs(p);
  if (!s.length || s.length > 16 || s.some((x) => !SEG.test(x) || x === "." || x === "..")) return false;
  return pair ? s.length % 2 === 0 : s.length % 2 === 1;
}
const parentDe = (p) => segs(p).slice(0, -1).join("/");
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function idDeEmail(email) { return "u_" + b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(email).toLowerCase()))).slice(0, 22); }
function jetonAleatoire(n = 32) { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }
function cookies(req) { const o = {}; (req.headers.get("cookie") || "").split(/;\s*/).forEach((c) => { const i = c.indexOf("="); if (i > 0) o[c.slice(0, i)] = decodeURIComponent(c.slice(i + 1)); }); return o; }
function fusion(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) fusion(a[k], v);
    else a[k] = v;
  }
  return a;
}

/* ───────── règles d'accès ───────── */
function regle(path, action) {
  const s = segs(path);
  let niveau = null;
  for (const r of REGLES) {
    const rs = segs(r.path);
    if (rs.length <= s.length && rs.every((x, i) => x === s[i])) {
      if (niveau === null || rs.length >= niveau.n) niveau = { n: rs.length, v: r[action] };
    }
  }
  return NIVEAUX[(niveau && niveau.v) || "interact"];
}
const peutLire = (u, path) => u.niveau >= regle(path, "read");
const peutEcrire = (u, path) => u.niveau >= Math.max(1, regle(path, "write"));

/* ───────── identité ───────── */
let certsCache = { t: 0, keys: [] };
async function clesGoogle() {
  if (Date.now() - certsCache.t < 3600e3 && certsCache.keys.length) return certsCache.keys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const j = await r.json();
  certsCache = { t: Date.now(), keys: j.keys || [] };
  return certsCache.keys;
}
async function verifierJetonGoogle(jwt, clientId) {
  const [h, p, sig] = String(jwt || "").split(".");
  if (!h || !p || !sig) throw new Error("jeton");
  const entete = JSON.parse(new TextDecoder().decode(deB64url(h)));
  const charge = JSON.parse(new TextDecoder().decode(deB64url(p)));
  const jwk = (await clesGoogle()).find((k) => k.kid === entete.kid);
  if (!jwk || entete.alg !== "RS256") throw new Error("cle");
  const cle = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cle, deB64url(sig), new TextEncoder().encode(h + "." + p));
  if (!ok) throw new Error("signature");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(charge.iss)) throw new Error("emetteur");
  if (charge.aud !== clientId) throw new Error("audience");
  if (!charge.exp || charge.exp * 1000 < Date.now()) throw new Error("expire");
  if (!charge.email || charge.email_verified === false) throw new Error("email");
  return charge;
}
const proprietaires = (env) => String(env.PROPRIETAIRES || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
async function utilisateur(req, env) {
  const jeton = cookies(req).sde_s;
  const anonyme = { connecte: false, niveau: 0, role: "visiteur", id: null, email: null, nom: "" };
  if (!jeton) return anonyme;
  const s = await env.DB.prepare("SELECT s.email, s.expire, c.id, c.nom, c.photo, c.role FROM sessions s LEFT JOIN comptes c ON c.email = s.email WHERE s.jeton = ?").bind(jeton).first();
  if (!s || s.expire < Date.now()) return anonyme;
  let role = s.role || "attente";
  if (proprietaires(env).includes(String(s.email).toLowerCase())) role = "proprietaire";
  return { connecte: true, niveau: ROLES[role] ?? 0, role, id: s.id, email: s.email, nom: s.nom || "", photo: s.photo || "", jeton };
}

/* ───────── documents ───────── */
async function lireDoc(env, path) {
  const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(path).first();
  return r ? { data: JSON.parse(r.data), version: r.version } : null;
}
async function lireRequete(env, q) {
  const params = [q.path];
  let sql = "SELECT id, data FROM docs WHERE parent = ?";
  if (q.order && /^[A-Za-z0-9_]{1,64}$/.test(q.order[0])) {
    const dir = q.order[1] === "desc" ? "DESC" : "ASC";
    sql += ` ORDER BY json_extract(data, '$.${q.order[0]}') IS NULL, json_extract(data, '$.${q.order[0]}') ${dir}, id ASC`;
  } else sql += " ORDER BY id ASC";
  const lim = Math.min(5000, Math.max(0, Number(q.limit) || 0));
  if (lim) { sql += " LIMIT ?"; params.push(lim); }
  const r = await env.DB.prepare(sql).bind(...params).all();
  return (r.results || []).map((x) => ({ id: x.id, data: JSON.parse(x.data) }));
}
const bumpRev = (env, parent) => env.DB.prepare("INSERT INTO revs (parent, rev) VALUES (?, 1) ON CONFLICT(parent) DO UPDATE SET rev = rev + 1").bind(parent);
async function ecrireDoc(env, op, path, data) {
  const parent = parentDe(path), id = segs(path).pop(), maj = Date.now();
  if (op === "delete") {
    await env.DB.batch([env.DB.prepare("DELETE FROM docs WHERE path = ?").bind(path), bumpRev(env, parent)]);
    return;
  }
  if (op === "set") {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, maj = excluded.maj").bind(path, parent, id, JSON.stringify(data), maj),
      bumpRev(env, parent),
    ]);
    return;
  }
  for (let essai = 0; essai < 5; essai += 1) {
    const cur = await lireDoc(env, path);
    if (!cur) throw Object.assign(new Error("absent"), { code: "invalid_argument" });
    const res = await env.DB.batch([
      env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, maj = ? WHERE path = ? AND version = ?").bind(JSON.stringify(fusion(cur.data, data)), maj, path, cur.version),
      bumpRev(env, parent),
    ]);
    if (res[0].meta && res[0].meta.changes) return;
  }
  throw Object.assign(new Error("conflit"), { code: "aborted" });
}

/* ───────── API ───────── */
async function apiDb(req, env, u) {
  const b = await req.json();
  const path = String(b.path || "");
  if (b.op === "get") {
    if (!cheminValide(path, true)) return erreur("invalid_argument", "chemin");
    if (!peutLire(u, path)) return json({ exists: false });
    const d = await lireDoc(env, path);
    return json(d ? { exists: true, data: d.data } : { exists: false });
  }
  if (b.op === "query") {
    if (!cheminValide(path, false)) return erreur("invalid_argument", "chemin");
    if (!peutLire(u, path) || (segs(path)[0] === "espace" && u.niveau < 2)) return json({ docs: [] });
    return json({ docs: await lireRequete(env, { path, order: b.order, limit: b.limit }) });
  }
  if (["set", "update", "delete"].includes(b.op)) {
    if (!cheminValide(path, true)) return erreur("invalid_argument", "chemin");
    if (!peutEcrire(u, path)) return erreur("invalid_argument", "Votre niveau d’accès ne permet pas cette modification.", 403);
    if (b.op !== "delete" && (typeof b.data !== "object" || b.data === null || Array.isArray(b.data))) return erreur("invalid_argument", "données");
    if (b.op !== "delete" && JSON.stringify(b.data).length > 256 * 1024) return erreur("invalid_argument", "trop volumineux");
    try { await ecrireDoc(env, b.op, path, b.data); } catch (e) { return erreur(e.code || "unavailable", e.message, e.code === "invalid_argument" ? 400 : 409); }
    return json({ ok: true });
  }
  return erreur("invalid_argument", "opération");
}
async function apiSync(req, env, u) {
  const b = await req.json();
  const subs = Array.isArray(b.subs) ? b.subs.slice(0, 80) : [];
  const parents = [...new Set(subs.map((s) => (s.type === "doc" ? parentDe(s.path) : s.path)).filter(Boolean))];
  const revs = {};
  if (parents.length) {
    const r = await env.DB.prepare(`SELECT parent, rev FROM revs WHERE parent IN (${parents.map(() => "?").join(",")})`).bind(...parents).all();
    for (const x of r.results || []) revs[x.parent] = x.rev;
  }
  const out = {};
  for (const s of subs) {
    const parent = s.type === "doc" ? parentDe(s.path) : s.path;
    const rev = revs[parent] || 0;
    if (s.rev === rev) continue;
    if (s.type === "doc") {
      if (!cheminValide(s.path, true)) continue;
      const d = peutLire(u, s.path) ? await lireDoc(env, s.path) : null;
      out[s.k] = { rev, exists: !!d, data: d ? d.data : null };
    } else {
      if (!cheminValide(s.path, false)) continue;
      const ok = peutLire(u, s.path) && !(segs(s.path)[0] === "espace" && u.niveau < 2);
      out[s.k] = { rev, docs: ok ? await lireRequete(env, s) : [] };
    }
  }
  return json({ res: out });
}
async function apiConnexion(req, env) {
  if (!env.GOOGLE_CLIENT_ID) return erreur("indisponible", "La connexion Google n’est pas encore configurée.", 503);
  const b = await req.json();
  let p;
  try { p = await verifierJetonGoogle(b.credential, env.GOOGLE_CLIENT_ID); } catch (e) { return erreur("refuse", "Connexion Google refusée (" + e.message + ").", 401); }
  const email = String(p.email).toLowerCase();
  const id = await idDeEmail(email);
  const maintenant = Date.now();
  await env.DB.prepare("INSERT INTO comptes (email, id, nom, photo, role, cree, derniere) VALUES (?, ?, ?, ?, 'attente', ?, ?) ON CONFLICT(email) DO UPDATE SET nom = COALESCE(NULLIF(comptes.nom, ''), excluded.nom), photo = excluded.photo, derniere = excluded.derniere")
    .bind(email, id, p.name || "", p.picture || "", maintenant, maintenant).run();
  const jeton = jetonAleatoire();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expire < ?").bind(maintenant),
    env.DB.prepare("INSERT INTO sessions (jeton, email, expire) VALUES (?, ?, ?)").bind(jeton, email, maintenant + SESSION_JOURS * 864e5),
  ]);
  return json({ ok: true }, 200, { "set-cookie": `sde_s=${jeton}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_JOURS * 86400}` });
}
async function apiComptes(req, env, u) {
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  if (req.method === "GET") {
    const r = await env.DB.prepare("SELECT email, id, nom, role, cree, derniere FROM comptes ORDER BY derniere DESC").all();
    const props = proprietaires(env);
    return json({ comptes: (r.results || []).map((c) => ({ ...c, role: props.includes(c.email) ? "proprietaire" : c.role })), roles: LIB_ROLES, proprietaires: props });
  }
  const b = await req.json();
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erreur("invalid_argument", "Adresse e-mail invalide.");
  if (proprietaires(env).includes(email)) return erreur("refuse", "Le compte propriétaire ne peut pas être modifié ici.", 403);
  if (b.supprimer) {
    await env.DB.batch([env.DB.prepare("DELETE FROM comptes WHERE email = ?").bind(email), env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email)]);
    return json({ ok: true });
  }
  const role = String(b.role || "");
  if (!["attente", "lecture", "contributeur", "admin"].includes(role)) return erreur("invalid_argument", "Rôle inconnu.");
  if (role === "admin" && u.niveau < 3) return erreur("refuse", "Seul le propriétaire nomme les administrateurs.", 403);
  await env.DB.prepare("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role, nom = COALESCE(NULLIF(excluded.nom, ''), comptes.nom)")
    .bind(email, await idDeEmail(email), String(b.nom || "").slice(0, 120), role, Date.now()).run();
  return json({ ok: true });
}
async function apiProfils(req, env) {
  const b = await req.json();
  const ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 64).map(String);
  const out = {};
  if (!ids.length) return json(out);
  const r = await env.DB.prepare("SELECT id, nom, alias FROM comptes").all();
  for (const c of r.results || []) {
    const tous = [c.id, ...String(c.alias || "").split(",").map((x) => x.trim()).filter(Boolean)];
    for (const i of tous) if (ids.includes(i)) out[i] = { name: c.nom || "" };
  }
  return json(out);
}
async function apiFichiers(req, env, u, url) {
  const id = url.pathname.split("/")[3];
  if (req.method === "DELETE") {
    if (u.niveau < 2 || !id) return erreur("refuse", "Réservé aux administrateurs.", 403);
    await env.FICHIERS.delete(id);
    await env.DB.prepare("DELETE FROM fichiers WHERE id = ?").bind(id).run();
    return json({ deleted: true });
  }
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  const type = req.headers.get("content-type") || "application/octet-stream";
  const corps = await req.arrayBuffer();
  if (corps.byteLength > 20 * 1024 * 1024) return erreur("too_large", "Fichier trop lourd (20 Mo maximum).", 413);
  const nid = jetonAleatoire(16);
  await env.FICHIERS.put(nid, corps, { metadata: { type } });
  await env.DB.prepare("INSERT INTO fichiers (id, type, taille, par, cree) VALUES (?, ?, ?, ?, ?)").bind(nid, type, corps.byteLength, u.email, Date.now()).run();
  return json({ id: nid, url: "/_blob/" + nid, sizeBytes: corps.byteLength, contentType: type });
}

async function apiImport(req, env, u) {
  if (u.niveau < 3) return erreur("refuse", "Réservé au propriétaire.", 403);
  const b = await req.json();
  const docs = b && typeof b.docs === "object" && b.docs ? Object.entries(b.docs) : [];
  const valides = docs.filter(([p, d]) => cheminValide(p, true) && d && typeof d === "object" && !Array.isArray(d));
  if (!valides.length) return erreur("invalid_argument", "Aucun document valide dans le fichier.");
  const maj = Date.now();
  for (let i = 0; i < valides.length; i += 50) {
    await env.DB.batch(valides.slice(i, i + 50).map(([p, d]) => env.DB.prepare("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, maj = excluded.maj").bind(p, parentDe(p), segs(p).pop(), JSON.stringify(d), maj)));
  }
  const parents = [...new Set(valides.map(([p]) => parentDe(p)))];
  await env.DB.batch(parents.map((p) => bumpRev(env, p)));
  return json({ ok: true, importes: valides.length, ignores: docs.length - valides.length });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (url.hostname !== "app.mouvement-sde.org" && /(^|\.)mouvement-sde\.org$/.test(url.hostname))
      return Response.redirect("https://app.mouvement-sde.org" + p + url.search, 301);
    if (p.startsWith("/_blob/")) {
      const r = await env.FICHIERS.getWithMetadata(p.slice(7), { type: "arrayBuffer" });
      if (!r || !r.value) return new Response("Introuvable", { status: 404 });
      return new Response(r.value, { headers: { "content-type": (r.metadata && r.metadata.type) || "application/octet-stream", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } });
    }
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method !== "GET") {
      const origine = req.headers.get("origin");
      if (origine && origine !== url.origin) return erreur("refuse", "Origine refusée.", 403);
    }
    try {
      const u = await utilisateur(req, env);
      if (p === "/api/moi") return json({ connecte: u.connecte, id: u.id, email: u.email, nom: u.nom, photo: u.photo || "", role: u.role, libRole: LIB_ROLES[u.role] || "Visiteur", niveau: u.niveau, clientId: env.GOOGLE_CLIENT_ID || "" });
      if (p === "/api/db" && req.method === "POST") return apiDb(req, env, u);
      if (p === "/api/sync" && req.method === "POST") return apiSync(req, env, u);
      if (p === "/api/profils" && req.method === "POST") return apiProfils(req, env);
      if (p === "/api/connexion" && req.method === "POST") return apiConnexion(req, env);
      if (p === "/api/deconnexion" && req.method === "POST") {
        if (u.jeton) await env.DB.prepare("DELETE FROM sessions WHERE jeton = ?").bind(u.jeton).run();
        return json({ ok: true }, 200, { "set-cookie": "sde_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
      }
      if (p === "/api/comptes") return apiComptes(req, env, u);
      if (p.startsWith("/api/fichiers")) return apiFichiers(req, env, u, url);
      if (p === "/api/import" && req.method === "POST") return apiImport(req, env, u);
      return erreur("introuvable", "Route inconnue.", 404);
    } catch (e) {
      return erreur("unavailable", "Erreur du serveur : " + (e && e.message), 500);
    }
  },
};
