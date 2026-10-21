/* MPA SDE — serveur Cloudflare (Worker)
   Sert l'application, garde les données dans D1, les fichiers dans KV,
   et reconnaît chacun par son adresse e-mail et son mot de passe.
   Les règles d'accès reprennent exactement celles de la version Claude. */

const NIVEAUX = { view: 0, interact: 1, admin: 2, owner: 3 };
const ROLES = { attente: 0, soldat: 0, lecture: 0, contributeur: 1, admin: 2, proprietaire: 3 };
const LIB_ROLES = { attente: "En attente", soldat: "Soldat", lecture: "Lecture seule", contributeur: "Contributeur", admin: "Administrateur", proprietaire: "Propriétaire" };
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
  { path: "espace_membre", read: "admin", write: "admin" },
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

/* ───────── identité : e-mail et mot de passe ───────── */
const ITERATIONS = 60000;
const EMAIL_OK = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$/;
const normEmail = (e) => String(e || "").trim().toLowerCase();
async function deriverMdp(mdp, sel, iter) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(mdp)), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations: iter }, cle, 256));
}
async function empreinteMdp(mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64url(sel)}$${b64url(await deriverMdp(mdp, sel, ITERATIONS))}`;
}
function egaux(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i += 1) d |= a[i] ^ b[i]; return d === 0; }
async function verifierMdp(mdp, stocke) {
  const [type, iter, sel, h] = String(stocke || "").split("$");
  if (type !== "pbkdf2" || !sel || !h) return false;
  return egaux(await deriverMdp(mdp, deB64url(sel), Number(iter) || ITERATIONS), deB64url(h));
}
const sha = async (t) => b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
const ALPHA_CODE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function nouveauCode() { const a = crypto.getRandomValues(new Uint8Array(8)); const t = [...a].map((x) => ALPHA_CODE[x % ALPHA_CODE.length]).join(""); return t.slice(0, 4) + "-" + t.slice(4); }
const normCode = (c) => String(c || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
const CODE_JOURS = 14;
const empreinteCode = async (email, code) => sha("activation:" + email + ":" + normCode(code));
function mdpValide(m) { return typeof m === "string" && m.length >= 4 && m.length <= 200; }

/* Freins contre les essais répétés (par adresse et par réseau) */
const FENETRE = 15 * 60e3;
async function bloque(env, cle, max) {
  const r = await env.DB.prepare("SELECT n, depuis FROM tentatives WHERE cle = ?").bind(cle).first();
  return !!(r && r.n >= max && Date.now() - r.depuis < FENETRE);
}
function compter(env, cle) {
  const t = Date.now();
  return env.DB.prepare("INSERT INTO tentatives (cle, n, depuis) VALUES (?, 1, ?) ON CONFLICT(cle) DO UPDATE SET n = CASE WHEN ? - tentatives.depuis > ? THEN 1 ELSE tentatives.n + 1 END, depuis = CASE WHEN ? - tentatives.depuis > ? THEN ? ELSE tentatives.depuis END").bind(cle, t, t, FENETRE, t, FENETRE, t).run();
}
const effacer = (env, cle) => env.DB.prepare("DELETE FROM tentatives WHERE cle = ?").bind(cle).run();
const ipDe = (req) => req.headers.get("cf-connecting-ip") || "local";

async function ouvrirSession(env, email) {
  const jeton = jetonAleatoire(), t = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expire < ?").bind(t),
    env.DB.prepare("INSERT INTO sessions (jeton, email, expire) VALUES (?, ?, ?)").bind(jeton, email, t + SESSION_JOURS * 864e5),
    env.DB.prepare("UPDATE comptes SET derniere = ? WHERE email = ?").bind(t, email),
  ]);
  return `sde_s=${jeton}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_JOURS * 86400}`;
}
const proprietaires = (env) => String(env.PROPRIETAIRES || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
async function utilisateur(req, env) {
  const jeton = cookies(req).sde_s;
  const anonyme = { connecte: false, niveau: 0, role: "visiteur", id: null, email: null, nom: "" };
  if (!jeton) return anonyme;
  const s = await env.DB.prepare("SELECT s.email, s.expire, c.id, c.nom, c.photo, c.role, c.membreId, c.matricule FROM sessions s LEFT JOIN comptes c ON c.email = s.email WHERE s.jeton = ?").bind(jeton).first();
  if (!s || s.expire < Date.now()) return anonyme;
  let role = s.role || "attente";
  if (proprietaires(env).includes(String(s.email).toLowerCase())) role = "proprietaire";
  return { connecte: true, niveau: ROLES[role] ?? 0, role, id: s.id || (await idDeEmail(s.email)), email: s.email, nom: s.nom || "", photo: s.photo || "", membreId: s.membreId || null, matricule: s.matricule || "", jeton };
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

/* Ce que voit une personne sans rôle de responsable : pas de liste de présences */
function filtrer(u, path, data) {
  if (u.niveau >= 1 || !data || segs(path)[0] !== "evenements") return data;
  const { presents, ...reste } = data;
  return reste;
}

/* ───────── API ───────── */
async function apiDb(req, env, u) {
  const b = await req.json();
  const path = String(b.path || "");
  if (b.op === "get") {
    if (!cheminValide(path, true)) return erreur("invalid_argument", "chemin");
    if (!peutLire(u, path)) return json({ exists: false });
    const d = await lireDoc(env, path);
    return json(d ? { exists: true, data: filtrer(u, path, d.data) } : { exists: false });
  }
  if (b.op === "query") {
    if (!cheminValide(path, false)) return erreur("invalid_argument", "chemin");
    if (!peutLire(u, path) || (segs(path)[0] === "espace" && u.niveau < 2)) return json({ docs: [] });
    return json({ docs: (await lireRequete(env, { path, order: b.order, limit: b.limit })).map((x) => ({ id: x.id, data: filtrer(u, path + "/" + x.id, x.data) })) });
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
      out[s.k] = { rev, exists: !!d, data: d ? filtrer(u, s.path, d.data) : null };
    } else {
      if (!cheminValide(s.path, false)) continue;
      const ok = peutLire(u, s.path) && !(segs(s.path)[0] === "espace" && u.niveau < 2);
      out[s.k] = { rev, docs: ok ? (await lireRequete(env, s)).map((x) => ({ id: x.id, data: filtrer(u, s.path + "/" + x.id, x.data) })) : [] };
    }
  }
  return json({ res: out });
}
/* ───────── comptes ───────── */
const ALPHA_ID = "abcdefghijklmnopqrstuvwxyz0123456789";
const idDoc = () => [...crypto.getRandomValues(new Uint8Array(20))].map((x) => ALPHA_ID[x % 36]).join("");
async function nouveauMatricule(env) {
  for (let i = 0; i < 40; i += 1) {
    const n = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const pris = await env.DB.prepare("SELECT 1 FROM comptes WHERE matricule = ? UNION SELECT 1 FROM docs WHERE parent = 'membres' AND json_extract(data, '$.matricule') = ? LIMIT 1").bind(n, n).first();
    if (!pris) return n;
  }
  throw new Error("Aucun matricule libre.");
}
const propre = (t, n) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n);
async function apiInscription(req, env) {
  const ip = ipDe(req);
  if (await bloque(env, "insc:" + ip, 12)) return erreur("rate_limited", "Trop d’inscriptions depuis ce réseau : réessayez dans un quart d’heure.", 429);
  const b = await req.json();
  const email = normEmail(b.email), prenoms = propre(b.prenoms, 80), nom = propre(b.nom, 80).toUpperCase(), telephone = propre(b.telephone, 30);
  if (!EMAIL_OK.test(email)) return erreur("invalid_argument", "Adresse e-mail invalide.");
  if (!prenoms || !nom) return erreur("invalid_argument", "Indiquez votre nom et vos prénoms.");
  if (!mdpValide(b.motDePasse)) return erreur("invalid_argument", "Le mot de passe doit compter au moins 4 caractères.");
  if (telephone && telephone.replace(/\D/g, "").length < 8) return erreur("invalid_argument", "Numéro de téléphone invalide.");
  const existe = await env.DB.prepare("SELECT email FROM comptes WHERE email = ?").bind(email).first();
  if (existe || proprietaires(env).includes(email)) return erreur("existe", "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez le code d’activation reçu du secrétariat.", 409);
  await compter(env, "insc:" + ip);
  const id = await idDeEmail(email), t = Date.now(), membreId = idDoc(), matricule = await nouveauMatricule(env);
  const fiche = { nom, prenoms, telephone, telephone2: "", email, matricule, statut: "Nouveau venu", actif: true, adhesion: new Date(t).toISOString().slice(0, 10), source: "inscription", compteId: id, creeLe: t, creePar: id, modifieLe: t, modifiePar: id };
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO comptes (email, id, nom, role, cree, derniere, mdp, membreId, matricule) VALUES (?, ?, ?, 'soldat', ?, ?, ?, ?, ?)").bind(email, id, prenoms + " " + nom, t, t, await empreinteMdp(b.motDePasse), membreId, matricule),
      env.DB.prepare("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?, 'membres', ?, ?, 1, ?)").bind("membres/" + membreId, membreId, JSON.stringify(fiche), t),
      bumpRev(env, "membres"),
    ]);
  } catch (e) { return erreur("existe", "Un compte existe déjà avec cette adresse.", 409); }
  return json({ ok: true, matricule }, 200, { "set-cookie": await ouvrirSession(env, email) });
}
async function apiConnexionMdp(req, env) {
  const b = await req.json();
  const email = normEmail(b.email), ip = ipDe(req);
  if (await bloque(env, "e:" + email, 8) || await bloque(env, "ip:" + ip, 40)) return erreur("rate_limited", "Trop d’essais : patientez un quart d’heure avant de réessayer.", 429);
  const c = EMAIL_OK.test(email) ? await env.DB.prepare("SELECT email, mdp, activation FROM comptes WHERE email = ?").bind(email).first() : null;
  if (!c || !c.mdp || !(await verifierMdp(b.motDePasse, c.mdp))) {
    await compter(env, "e:" + email); await compter(env, "ip:" + ip);
    if (c && !c.mdp && c.activation) return erreur("activation", "Ce compte n’est pas encore activé : choisissez « J’ai un code d’activation ».", 401);
    return erreur("refuse", "Adresse e-mail ou mot de passe incorrect.", 401);
  }
  await effacer(env, "e:" + email);
  return json({ ok: true }, 200, { "set-cookie": await ouvrirSession(env, email) });
}
async function apiActivation(req, env) {
  const b = await req.json();
  const email = normEmail(b.email), ip = ipDe(req);
  if (await bloque(env, "e:" + email, 8) || await bloque(env, "ip:" + ip, 40)) return erreur("rate_limited", "Trop d’essais : patientez un quart d’heure avant de réessayer.", 429);
  if (!mdpValide(b.motDePasse)) return erreur("invalid_argument", "Le mot de passe doit compter au moins 4 caractères.");
  const c = EMAIL_OK.test(email) ? await env.DB.prepare("SELECT email, activation FROM comptes WHERE email = ?").bind(email).first() : null;
  const [h, exp] = String((c && c.activation) || "").split("|");
  if (!c || !h || Number(exp) < Date.now() || h !== (await empreinteCode(email, b.code))) {
    await compter(env, "e:" + email); await compter(env, "ip:" + ip);
    return erreur("refuse", "Adresse ou code d’activation incorrect, ou code expiré : demandez-en un nouveau au secrétariat.", 401);
  }
  await env.DB.prepare("UPDATE comptes SET mdp = ?, activation = NULL WHERE email = ?").bind(await empreinteMdp(b.motDePasse), email).run();
  await effacer(env, "e:" + email);
  return json({ ok: true }, 200, { "set-cookie": await ouvrirSession(env, email) });
}
async function apiMotDePasse(req, env, u) {
  if (!u.connecte) return erreur("refuse", "Connectez-vous d’abord.", 401);
  const b = await req.json();
  if (!mdpValide(b.nouveau)) return erreur("invalid_argument", "Le nouveau mot de passe doit compter au moins 4 caractères.");
  if (await bloque(env, "e:" + u.email, 8)) return erreur("rate_limited", "Trop d’essais : patientez un quart d’heure.", 429);
  const c = await env.DB.prepare("SELECT mdp FROM comptes WHERE email = ?").bind(u.email).first();
  if (c && c.mdp && !(await verifierMdp(b.ancien, c.mdp))) { await compter(env, "e:" + u.email); return erreur("refuse", "Mot de passe actuel incorrect.", 401); }
  await env.DB.batch([
    env.DB.prepare("UPDATE comptes SET mdp = ? WHERE email = ?").bind(await empreinteMdp(b.nouveau), u.email),
    env.DB.prepare("DELETE FROM sessions WHERE email = ? AND jeton <> ?").bind(u.email, u.jeton),
  ]);
  return json({ ok: true });
}
async function poserCode(env, email) {
  const code = nouveauCode();
  await env.DB.prepare("UPDATE comptes SET activation = ? WHERE email = ?").bind((await empreinteCode(email, code)) + "|" + (Date.now() + CODE_JOURS * 864e5), email).run();
  return code;
}
async function apiComptes(req, env, u) {
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  const props = proprietaires(env);
  if (req.method === "GET") {
    const r = await env.DB.prepare("SELECT email, id, nom, role, cree, derniere, membreId, matricule, mdp IS NOT NULL AS actif, activation IS NOT NULL AS aActiver FROM comptes ORDER BY derniere DESC").all();
    return json({ comptes: (r.results || []).map((c) => ({ ...c, actif: !!c.actif, aActiver: !!c.aActiver, role: props.includes(c.email) ? "proprietaire" : c.role })), roles: LIB_ROLES, proprietaires: props });
  }
  const b = await req.json();
  const email = normEmail(b.email);
  if (!EMAIL_OK.test(email)) return erreur("invalid_argument", "Adresse e-mail invalide.");
  const cible = await env.DB.prepare("SELECT * FROM comptes WHERE email = ?").bind(email).first();
  const roleCible = props.includes(email) ? "proprietaire" : cible ? cible.role : null;
  if (roleCible === "proprietaire" && !(u.niveau >= 3 && b.reinitialiser && email === u.email)) return erreur("refuse", "Le compte propriétaire ne peut pas être modifié ici.", 403);
  if (roleCible === "admin" && u.niveau < 3) return erreur("refuse", "Seul le propriétaire modifie un administrateur.", 403);
  if (b.supprimer) {
    await env.DB.batch([env.DB.prepare("DELETE FROM comptes WHERE email = ?").bind(email), env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email)]);
    return json({ ok: true });
  }
  if (b.reinitialiser) {
    if (!cible) return erreur("invalid_argument", "Compte introuvable.");
    await env.DB.batch([env.DB.prepare("UPDATE comptes SET mdp = NULL WHERE email = ?").bind(email), env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email)]);
    return json({ ok: true, code: await poserCode(env, email) });
  }
  if (b.membreId !== undefined) {
    if (!cible) return erreur("invalid_argument", "Compte introuvable.");
    const mid = String(b.membreId || "");
    if (!mid) { await env.DB.prepare("UPDATE comptes SET membreId = NULL, matricule = NULL WHERE email = ?").bind(email).run(); return json({ ok: true }); }
    if (!cheminValide("membres/" + mid, true)) return erreur("invalid_argument", "Fiche invalide.");
    const f = await lireDoc(env, "membres/" + mid);
    if (!f) return erreur("invalid_argument", "Fiche introuvable.");
    const deja = await env.DB.prepare("SELECT email FROM comptes WHERE membreId = ? AND email <> ?").bind(mid, email).first();
    if (deja) return erreur("invalid_argument", "Cette fiche est déjà reliée au compte " + deja.email + ".");
    let matricule = f.data.matricule || "";
    if (!matricule) { matricule = await nouveauMatricule(env); }
    await ecrireDoc(env, "update", "membres/" + mid, { matricule, compteId: cible.id, ...(f.data.email ? {} : { email }), modifieLe: Date.now(), modifiePar: u.id });
    // La fiche créée automatiquement à l'inscription est retirée : la personne garde sa fiche d'origine
    if (cible.membreId && cible.membreId !== mid) {
      const auto = await lireDoc(env, "membres/" + cible.membreId);
      if (auto && auto.data.source === "inscription" && auto.data.compteId === cible.id) await ecrireDoc(env, "delete", "membres/" + cible.membreId);
    }
    await env.DB.prepare("UPDATE comptes SET membreId = ?, matricule = ? WHERE email = ?").bind(mid, matricule, email).run();
    return json({ ok: true, matricule });
  }
  const role = String(b.role || "");
  if (!["attente", "soldat", "lecture", "contributeur", "admin"].includes(role)) return erreur("invalid_argument", "Rôle inconnu.");
  if (role === "admin" && u.niveau < 3) return erreur("refuse", "Seul le propriétaire nomme les administrateurs.", 403);
  const nom = propre(b.nom, 120);
  if (cible) {
    await env.DB.prepare("UPDATE comptes SET role = ?, nom = COALESCE(NULLIF(?, ''), nom) WHERE email = ?").bind(role, nom, email).run();
    return json({ ok: true });
  }
  await env.DB.prepare("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?, ?, ?, ?, ?)").bind(email, await idDeEmail(email), nom, role, Date.now()).run();
  return json({ ok: true, nouveau: true, code: await poserCode(env, email) });
}

/* ───────── espace personnel d'un compte relié à une fiche ───────── */
const CHAMPS_FICHE = ["nom", "prenoms", "matricule", "statut", "fonction", "pole", "eglise", "garnisonId", "photoId", "anniv", "adhesion", "telephone", "email", "sexe"];
async function apiMonEspace(env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 404);
  const f = await lireDoc(env, "membres/" + u.membreId);
  if (!f) return erreur("refuse", "Fiche introuvable.", 404);
  const m = { id: u.membreId };
  for (const k of CHAMPS_FICHE) m[k] = f.data[k] ?? "";
  const gs = [];
  let gid = f.data.garnisonId;
  while (gid && gs.length < 4 && cheminValide("garnisons/" + gid, true)) {
    const g = await lireDoc(env, "garnisons/" + gid);
    if (!g) break;
    gs.push({ id: gid, nom: g.data.nom || "", type: g.data.type || "", pays: g.data.pays || "", ville: g.data.ville || "", parentId: g.data.parentId || "" });
    gid = g.data.parentId;
  }
  const r = await lireDoc(env, "espace_membre/" + u.membreId);
  return json({ membre: m, garnisons: gs, resume: r ? r.data.resume || null : null, majLe: r ? r.data.majLe || null : null });
}
async function apiPriere(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 403);
  const b = await req.json();
  const sujet = String(b.sujet || "").trim().slice(0, 2000);
  if (!sujet) return erreur("invalid_argument", "Écrivez votre sujet de prière.");
  if (await bloque(env, "priere:" + u.email, 10)) return erreur("rate_limited", "Vous avez déposé beaucoup de requêtes : réessayez un peu plus tard.", 429);
  await compter(env, "priere:" + u.email);
  const t = Date.now();
  await ecrireDoc(env, "set", "prieres/" + idDoc(), { sujet: sujet.slice(0, 140), details: sujet.length > 140 ? sujet : "", categorie: "Personnelle", date: new Date(t).toISOString().slice(0, 10), pourId: u.membreId, pour: "", urgent: false, statut: "En prière", priants: {}, source: "espace", creePar: u.id, creeLe: t, modifiePar: u.id, modifieLe: t });
  return json({ ok: true });
}
async function apiProfils(req, env, u) {
  if (u.niveau < 1) return json({});
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
const ID_FICHIER = /^[A-Za-z0-9_-]{16,64}$/;
async function apiFichiers(req, env, u, url) {
  const id = url.pathname.split("/")[3];
  if (id && !ID_FICHIER.test(id)) return erreur("introuvable", "Fichier inconnu.", 404);
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


/* ───────── site vitrine : rendez-vous publics ───────── */
const TYPES_PUBLICS = ["Culte", "Prière et intercession", "Formation", "Conférence", "Évangélisation"];
async function apiPublic(env) {
  const jour = new Date(Date.now()).toISOString().slice(0, 10);
  const r = await env.DB.prepare("SELECT id, data FROM docs WHERE parent = 'evenements'").all();
  const evts = (r.results || []).map((x) => ({ id: x.id, ...JSON.parse(x.data) }))
    .filter((e) => e.date && e.date >= jour && TYPES_PUBLICS.includes(e.type) && e.prive !== true)
    .sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")))
    .slice(0, 8)
    .map((e) => ({ id: e.id, titre: String(e.titre || ""), type: e.type, date: e.date, heure: e.heure || "", fin: e.fin || "", lieu: String(e.lieu || ""), description: String(e.description || "").slice(0, 600) }));
  return json({ evenements: evts }, 200, { "cache-control": "public, max-age=300" });
}

/* ───────── Éliézer : relais vers l'API Claude (clé gardée sur le serveur) ───────── */
const IA_MAX_MESSAGES = 80, IA_MAX_OCTETS = 600000, IA_MAX_OUTILS = 16;
function blocValide(b) {
  if (!b || typeof b !== "object") return false;
  if (b.type === "text") return typeof b.text === "string";
  if (b.type === "tool_use") return typeof b.id === "string" && typeof b.name === "string" && b.input && typeof b.input === "object";
  if (b.type === "tool_result") return typeof b.tool_use_id === "string" && (typeof b.content === "string" || Array.isArray(b.content));
  return false;
}
async function apiIA(req, env, u) {
  if (!env.ANTHROPIC_API_KEY) return erreur("sampling_disabled", "Éliézer n’est pas encore activé sur ce serveur.", 503);
  if (u.niveau < 1) return erreur("not_granted", "Éliézer est réservé aux responsables connectés.", 403);
  const brut = await req.text();
  if (brut.length > IA_MAX_OCTETS) return erreur("prompt_too_large", "La conversation est trop longue.", 413);
  let b;
  try { b = JSON.parse(brut); } catch (e) { return erreur("invalid_argument", "Requête illisible."); }
  const messages = Array.isArray(b.messages) ? b.messages : [];
  if (!messages.length || messages.length > IA_MAX_MESSAGES) return erreur("invalid_argument", "Conversation invalide.");
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return erreur("invalid_argument", "Message invalide.");
    if (typeof m.content === "string") { if (!m.content.trim()) return erreur("invalid_argument", "Message vide."); continue; }
    if (!Array.isArray(m.content) || !m.content.length || !m.content.every(blocValide)) return erreur("invalid_argument", "Message invalide.");
  }
  const outils = (Array.isArray(b.tools) ? b.tools : []).slice(0, IA_MAX_OUTILS)
    .filter((t) => t && typeof t.name === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(t.name))
    .map((t) => ({ name: t.name, description: String(t.description || "").slice(0, 2000), input_schema: t.input_schema && typeof t.input_schema === "object" ? t.input_schema : { type: "object", properties: {} } }));
  // Garde-fou de consommation : nombre d'appels par personne et par jour
  const limite = Number(env.IA_LIMITE_JOUR) || 300;
  const cle = u.id + ":" + new Date().toISOString().slice(0, 10);
  const c = await env.DB.prepare("INSERT INTO ia_conso (cle, n) VALUES (?, 1) ON CONFLICT(cle) DO UPDATE SET n = n + 1 RETURNING n").bind(cle).first();
  if (c && c.n > limite) return erreur("rate_limited", "Limite quotidienne d’Éliézer atteinte. Réessayez demain.", 429);
  const rapide = b.rapide === true;
  const corps = {
    model: rapide ? (env.IA_MODELE_RAPIDE || "claude-haiku-5-5") : (env.IA_MODELE || "claude-sonnet-5-5"),
    max_tokens: rapide ? 2000 : 4096,
    stream: true,
    system: "Tu es Éliézer, l’assistant de l’application MPA SDE du Mouvement Prophético-Apostolique Soldats de l’Éternel. Suis les consignes données dans la conversation.",
    messages,
    ...(outils.length ? { tools: outils } : {}),
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(corps),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 429 || r.status === 529) return erreur("rate_limited", "Éliézer est très sollicité : réessayez dans un instant.", 429);
    if (r.status === 401 || r.status === 403) return erreur("sampling_disabled", "La clé d’accès d’Éliézer est refusée.", 503);
    if (/too long|too many tokens|prompt is too long/i.test(t)) return erreur("prompt_too_large", "La conversation est trop longue.", 413);
    if (/credit|billing|balance/i.test(t)) return erreur("sampling_disabled", "Le crédit d’Éliézer est épuisé.", 503);
    return erreur("unavailable", "Éliézer ne répond pas (" + r.status + ").", 502);
  }
  return new Response(r.body, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}


/* ───────── médiathèque : vidéos, audios, photos et documents ─────────
   Les fichiers sont découpés en morceaux de 8 Mo : dans R2 si le compartiment MEDIAS est relié
   (10 Go gratuits), sinon dans l'espace KV (1 Go gratuit au total). La lecture accepte les requêtes
   partielles (Range) pour que les vidéos et audios se lisent et s'avancent sur téléphone. */
const MORCEAU = 8 * 1024 * 1024;
const TYPES_MEDIA = {
  mp4: ["video", "video/mp4"], m4v: ["video", "video/mp4"], mov: ["video", "video/quicktime"], webm: ["video", "video/webm"],
  mp3: ["audio", "audio/mpeg"], m4a: ["audio", "audio/mp4"], aac: ["audio", "audio/aac"], wav: ["audio", "audio/wav"], ogg: ["audio", "audio/ogg"],
  jpg: ["image", "image/jpeg"], jpeg: ["image", "image/jpeg"], png: ["image", "image/png"], webp: ["image", "image/webp"], gif: ["image", "image/gif"], heic: ["image", "image/heic"],
  pdf: ["pdf", "application/pdf"],
  doc: ["word", "application/msword"], docx: ["word", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ppt: ["powerpoint", "application/vnd.ms-powerpoint"], pptx: ["powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], pps: ["powerpoint", "application/vnd.ms-powerpoint"], ppsx: ["powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.slideshow"],
  xls: ["excel", "application/vnd.ms-excel"], xlsx: ["excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], csv: ["excel", "text/csv"],
};
const VISIBILITES = ["public", "membres", "responsables"];
const ID_MEDIA = /^[a-z0-9]{20}$/;
function stockage(env, type) {
  if (type === "r2") return { put: (k, v) => env.MEDIAS.put(k, v), get: async (k) => { const o = await env.MEDIAS.get(k); return o ? o.arrayBuffer() : null; }, del: (k) => env.MEDIAS.delete(k) };
  return { put: (k, v) => env.FICHIERS.put(k, v), get: (k) => env.FICHIERS.get(k, { type: "arrayBuffer" }), del: (k) => env.FICHIERS.delete(k) };
}
const limitesMedia = (env) => env.MEDIAS
  ? { stockage: "r2", fichierMax: (Number(env.MEDIA_FICHIER_MAX_MO) || 2048) * 1048576, total: (Number(env.MEDIA_TOTAL_MO) || 9500) * 1048576 }
  : { stockage: "kv", fichierMax: (Number(env.MEDIA_FICHIER_MAX_MO) || 200) * 1048576, total: (Number(env.MEDIA_TOTAL_MO) || 900) * 1048576 };
const mediaVisible = (u, m) => m.visibilite === "public" || (m.visibilite === "membres" && u.connecte) || (m.visibilite === "responsables" && u.niveau >= 1);
const peutGererMedia = (u, m) => u.niveau >= 2 || (u.niveau >= 1 && m.auteur === u.id);
const CHAMPS_MEDIA = "id, titre, description, categorie, genre, nom, mime, taille, visibilite, miniature, auteur, auteurNom, cree, vues";
async function supprimerMedia(env, m) {
  const st = stockage(env, m.stockage);
  for (let n = 0; n < m.morceaux; n += 1) { try { await st.del(`media:${m.id}:${n}`); } catch (e) { /* déjà absent */ } }
  await env.DB.batch([env.DB.prepare("DELETE FROM medias WHERE id = ?").bind(m.id), env.DB.prepare("DELETE FROM media_morceaux WHERE id = ?").bind(m.id)]);
}
const propreMedia = (b, m = {}) => ({
  titre: propre(b.titre ?? m.titre, 160), description: String(b.description ?? m.description ?? "").trim().slice(0, 2000),
  categorie: propre(b.categorie ?? m.categorie, 60), visibilite: VISIBILITES.includes(b.visibilite) ? b.visibilite : (m.visibilite || "membres"),
});
async function apiMedias(req, env, u, url) {
  const [, , , id, n] = url.pathname.split("/");
  if (id && !ID_MEDIA.test(id)) return erreur("introuvable", "Média inconnu.", 404);
  if (!id && req.method === "GET") {
    const r = await env.DB.prepare(`SELECT ${CHAMPS_MEDIA} FROM medias WHERE fini = 1 ORDER BY cree DESC LIMIT 2000`).all();
    const liste = (r.results || []).filter((m) => mediaVisible(u, m)).map((m) => ({ ...m, gerer: peutGererMedia(u, m) }));
    const out = { medias: liste, peutAjouter: u.niveau >= 1 };
    if (u.niveau >= 1) {
      const t = await env.DB.prepare("SELECT COALESCE(SUM(taille), 0) AS total, COUNT(*) AS n FROM medias WHERE stockage = ?").bind(limitesMedia(env).stockage).first();
      out.espace = { ...limitesMedia(env), utilise: t.total, nombre: t.n, morceau: MORCEAU };
    }
    return json(out);
  }
  if (u.niveau < 1) return erreur("refuse", "Réservé aux responsables connectés.", 403);
  if (!id && req.method === "POST") {
    const b = await req.json();
    const nom = propre(b.nom, 180).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
    const ext = (nom.match(/\.([a-z0-9]{2,5})$/i) || [, ""])[1].toLowerCase();
    const type = TYPES_MEDIA[ext];
    if (!type) return erreur("invalid_argument", "Type de fichier non accepté : vidéo MP4, audio MP3, photo, PDF, Word, PowerPoint ou Excel.");
    const taille = Math.floor(Number(b.taille) || 0);
    const lim = limitesMedia(env);
    if (taille <= 0) return erreur("invalid_argument", "Fichier vide.");
    if (taille > lim.fichierMax) return erreur("too_large", `Fichier trop lourd : ${Math.round(lim.fichierMax / 1048576)} Mo au maximum${lim.stockage === "kv" ? " (activez le stockage R2 pour les grosses vidéos)" : ""}.`, 413);
    const t = await env.DB.prepare("SELECT COALESCE(SUM(taille), 0) AS total FROM medias WHERE stockage = ?").bind(lim.stockage).first();
    if (t.total + taille > lim.total) return erreur("too_large", "L’espace de la médiathèque est plein : supprimez des fichiers ou activez un stockage plus grand.", 413);
    const miniature = typeof b.miniature === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.miniature) && b.miniature.length < 160000 ? b.miniature : null;
    const p = propreMedia(b);
    const mid = idDoc();
    await env.DB.prepare("INSERT INTO medias (id, titre, description, categorie, genre, nom, mime, taille, morceau, morceaux, stockage, visibilite, miniature, auteur, auteurNom, cree, fini) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
      .bind(mid, p.titre || nom.replace(/\.[^.]+$/, ""), p.description, p.categorie, type[0], nom, type[1], taille, MORCEAU, Math.ceil(taille / MORCEAU), lim.stockage, p.visibilite, miniature, u.id, u.nom || u.email, Date.now()).run();
    return json({ ok: true, id: mid, morceau: MORCEAU, morceaux: Math.ceil(taille / MORCEAU) });
  }
  const m = id ? await env.DB.prepare("SELECT * FROM medias WHERE id = ?").bind(id).first() : null;
  if (!m) return erreur("introuvable", "Média inconnu.", 404);
  if (!peutGererMedia(u, m)) return erreur("refuse", "Seuls l’auteur et les administrateurs peuvent modifier ce média.", 403);
  if (req.method === "PUT" && n !== undefined) {
    const k = Number(n);
    if (m.fini || !Number.isInteger(k) || k < 0 || k >= m.morceaux) return erreur("invalid_argument", "Morceau invalide.");
    const corps = await req.arrayBuffer();
    const attendu = k === m.morceaux - 1 ? m.taille - k * m.morceau : m.morceau;
    if (corps.byteLength !== attendu) return erreur("invalid_argument", `Morceau incomplet (${corps.byteLength} octets au lieu de ${attendu}).`);
    await stockage(env, m.stockage).put(`media:${m.id}:${k}`, corps);
    await env.DB.prepare("INSERT OR IGNORE INTO media_morceaux (id, n) VALUES (?, ?)").bind(m.id, k).run();
    return json({ ok: true });
  }
  if (req.method === "POST" && n === "fin") {
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM media_morceaux WHERE id = ?").bind(m.id).first();
    if (c.n !== m.morceaux) return erreur("invalid_argument", `Envoi incomplet : ${c.n} morceaux reçus sur ${m.morceaux}.`);
    await env.DB.batch([env.DB.prepare("UPDATE medias SET fini = 1 WHERE id = ?").bind(m.id), env.DB.prepare("DELETE FROM media_morceaux WHERE id = ?").bind(m.id)]);
    return json({ ok: true, url: `/m/${m.id}/${encodeURIComponent(m.nom)}` });
  }
  if (req.method === "POST" && !n) {
    const p = propreMedia(await req.json(), m);
    await env.DB.prepare("UPDATE medias SET titre = ?, description = ?, categorie = ?, visibilite = ? WHERE id = ?").bind(p.titre || m.titre, p.description, p.categorie, p.visibilite, m.id).run();
    return json({ ok: true });
  }
  if (req.method === "DELETE" && !n) { await supprimerMedia(env, m); return json({ ok: true }); }
  return erreur("invalid_argument", "Opération inconnue.");
}
/* Lecture d'un fichier : contrôle de visibilité, téléchargement par morceaux, requêtes partielles */
async function servirMedia(req, env, u, id) {
  if (!ID_MEDIA.test(id || "")) return new Response("Introuvable", { status: 404 });
  const m = await env.DB.prepare("SELECT * FROM medias WHERE id = ? AND fini = 1").bind(id).first();
  if (!m) return new Response("Ce média n’existe plus.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!mediaVisible(u, m)) return new Response("Connectez-vous à MPA SDE pour ouvrir ce média.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  let debut = 0, fin = m.taille - 1, partiel = false;
  const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || "");
  if (r && (r[1] !== "" || r[2] !== "")) {
    if (r[1] === "") debut = Math.max(0, m.taille - Number(r[2]));
    else { debut = Number(r[1]); if (r[2] !== "") fin = Math.min(m.taille - 1, Number(r[2])); }
    if (debut > fin || debut >= m.taille) return new Response(null, { status: 416, headers: { "content-range": `bytes */${m.taille}` } });
    partiel = true;
    fin = Math.min(fin, debut + 2 * MORCEAU - 1);
  }
  const st = stockage(env, m.stockage);
  let k = Math.floor(debut / m.morceau);
  const kFin = Math.floor(fin / m.morceau);
  const flux = new ReadableStream({
    async pull(c) {
      if (k > kFin) { c.close(); return; }
      const buf = await st.get(`media:${m.id}:${k}`);
      if (!buf) { c.error(new Error("morceau manquant")); return; }
      const base = k * m.morceau;
      c.enqueue(new Uint8Array(buf.slice(Math.max(0, debut - base), Math.min(buf.byteLength, fin - base + 1))));
      k += 1;
    },
  });
  if (!partiel || debut === 0) env.DB.prepare("UPDATE medias SET vues = vues + 1 WHERE id = ?").bind(m.id).run().catch(() => {});
  const enLigne = ["video", "audio", "image", "pdf"].includes(m.genre) && new URL(req.url).searchParams.get("telecharger") === null;
  const h = {
    "content-type": m.mime, "content-length": String(fin - debut + 1), "accept-ranges": "bytes",
    "content-disposition": `${enLigne ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(m.nom)}`,
    "cache-control": m.visibilite === "public" ? "public, max-age=86400" : "private, max-age=3600",
  };
  if (m.genre !== "pdf") h["content-security-policy"] = "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox";
  if (partiel) h["content-range"] = `bytes ${debut}-${fin}/${m.taille}`;
  return new Response(req.method === "HEAD" ? null : flux, { status: partiel ? 206 : 200, headers: h });
}
async function nettoyerMedias(env) {
  const r = await env.DB.prepare("SELECT * FROM medias WHERE fini = 0 AND cree < ?").bind(Date.now() - 86400e3).all();
  for (const m of r.results || []) await supprimerMedia(env, m);
}

/* ───────── sauvegardes automatiques (chaque nuit, gardées 35 jours) ───────── */
async function sauvegarder(env) {
  const docs = (await env.DB.prepare("SELECT path, data FROM docs").all()).results || [];
  const comptes = (await env.DB.prepare("SELECT email, id, nom, role, cree, derniere, membreId, matricule FROM comptes").all()).results || [];
  const medias = (await env.DB.prepare("SELECT id, titre, description, categorie, genre, nom, mime, taille, stockage, visibilite, auteur, auteurNom, cree FROM medias WHERE fini = 1").all()).results || [];
  const jour = new Date().toISOString().slice(0, 10);
  const corps = JSON.stringify({ version: 1, date: jour, application: "MPA SDE", docs: Object.fromEntries(docs.map((d) => [d.path, JSON.parse(d.data)])), comptes, medias });
  await env.FICHIERS.put("sauvegarde:" + jour, corps, { expirationTtl: 35 * 86400, metadata: { type: "application/json", taille: corps.length, documents: docs.length, comptes: comptes.length, faite: Date.now() } });
  return { jour, documents: docs.length, taille: corps.length };
}
async function apiSauvegardes(req, env, u, url) {
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  const jour = url.pathname.split("/")[3];
  if (req.method === "POST") return json({ ok: true, ...(await sauvegarder(env)) });
  if (jour) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return erreur("invalid_argument", "Date invalide.");
    const v = await env.FICHIERS.get("sauvegarde:" + jour);
    if (!v) return erreur("introuvable", "Aucune sauvegarde à cette date.", 404);
    return new Response(v, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="SDE-sauvegarde-${jour}.json"`, "cache-control": "no-store" } });
  }
  const l = await env.FICHIERS.list({ prefix: "sauvegarde:" });
  return json({ sauvegardes: (l.keys || []).map((k) => ({ jour: k.name.slice(11), ...(k.metadata || {}) })).sort((a, b) => b.jour.localeCompare(a.jour)) });
}

/* ───────── en-têtes de sécurité ───────── */
function securiser(r) {
  const n = new Response(r.body, r);
  n.headers.set("x-content-type-options", "nosniff");
  n.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  n.headers.set("x-frame-options", "DENY");
  n.headers.set("strict-transport-security", "max-age=31536000");
  n.headers.set("permissions-policy", "geolocation=(self), camera=(self), microphone=()");
  return n;
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil(Promise.all([sauvegarder(env), nettoyerMedias(env)])); },
  async fetch(req, env) {
    return securiser(await traiter(req, env));
  },
};
async function traiter(req, env) {
  {
    const url = new URL(req.url);
    const p = url.pathname;
    if (url.hostname === "www.mouvement-sde.org") return Response.redirect("https://mouvement-sde.org" + p + url.search, 301);
    if (url.hostname === "mouvement-sde.org") {
      if (p === "/" || p === "/index.html") return env.ASSETS.fetch(new Request(new URL("/vitrine/", url), req));
      if (p === "/api/public") return apiPublic(env);
      if (!/^\/(vitrine\/|og-sde\.(png|jpg)$|og-app\.png$|icone-(192|512)\.png$|robots\.txt$|sitemap\.xml$)/.test(p))
        return Response.redirect("https://app.mouvement-sde.org" + p + url.search, 301);
      return env.ASSETS.fetch(req);
    }
    if (p.startsWith("/_blob/")) {
      if (!ID_FICHIER.test(p.slice(7))) return new Response("Introuvable", { status: 404 });
      const r = await env.FICHIERS.getWithMetadata(p.slice(7), { type: "arrayBuffer" });
      if (!r || !r.value) return new Response("Introuvable", { status: 404 });
      return new Response(r.value, { headers: { "content-type": (r.metadata && r.metadata.type) || "application/octet-stream", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } });
    }
    if (p.startsWith("/m/") && (req.method === "GET" || req.method === "HEAD")) return servirMedia(req, env, await utilisateur(req, env), p.split("/")[2]);
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method !== "GET") {
      const origine = req.headers.get("origin");
      if (origine && origine !== url.origin) return erreur("refuse", "Origine refusée.", 403);
    }
    try {
      const u = await utilisateur(req, env);
      if (p === "/api/moi") return json({ connecte: u.connecte, id: u.id, email: u.email, nom: u.nom, photo: u.photo || "", role: u.role, libRole: LIB_ROLES[u.role] || "Visiteur", niveau: u.niveau, membreId: u.membreId || null, matricule: u.matricule || "", ia: !!env.ANTHROPIC_API_KEY && u.niveau >= 1 });
      if (p === "/api/inscription" && req.method === "POST") return apiInscription(req, env);
      if (p === "/api/connexion" && req.method === "POST") return apiConnexionMdp(req, env);
      if (p === "/api/activation" && req.method === "POST") return apiActivation(req, env);
      if (p === "/api/mot-de-passe" && req.method === "POST") return apiMotDePasse(req, env, u);
      if (p === "/api/mon-espace") return apiMonEspace(env, u);
      if (p === "/api/priere" && req.method === "POST") return apiPriere(req, env, u);
      if (p === "/api/public") return apiPublic(env);
      if (p === "/api/ia" && req.method === "POST") return apiIA(req, env, u);
      if (p === "/api/db" && req.method === "POST") return apiDb(req, env, u);
      if (p === "/api/sync" && req.method === "POST") return apiSync(req, env, u);
      if (p === "/api/profils" && req.method === "POST") return apiProfils(req, env, u);
      if (p === "/api/deconnexion" && req.method === "POST") {
        if (u.jeton) await env.DB.prepare("DELETE FROM sessions WHERE jeton = ?").bind(u.jeton).run();
        return json({ ok: true }, 200, { "set-cookie": "sde_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
      }
      if (p === "/api/comptes") return apiComptes(req, env, u);
      if (p.startsWith("/api/fichiers")) return apiFichiers(req, env, u, url);
      if (p === "/api/import" && req.method === "POST") return apiImport(req, env, u);
      if (p === "/api/medias" || p.startsWith("/api/medias/")) return apiMedias(req, env, u, url);
      if (p === "/api/sauvegardes" || p.startsWith("/api/sauvegardes/")) return apiSauvegardes(req, env, u, url);
      return erreur("introuvable", "Route inconnue.", 404);
    } catch (e) {
      return erreur("unavailable", "Erreur du serveur : " + (e && e.message), 500);
    }
  }
}
