import {eventRsvpApi,publishedEventTime} from "./event-rsvp.js";
import {operationsApi} from "./operations.js";
import {memberQrApi} from "./member-qr.js";
import {memberContributions} from "./member-contributions.js";
import {dashboardMetrics,dashboardAttendance} from "./dashboard-metrics.js";
import {prayerWallApi} from "./prayer-wall.js";
import {apiSdeOs31,SDE_OS_31} from "./os-v31.js";
import {notifySde,flushNotices,mailStatus,pushConfigured,notificationConfigured} from "./notifications.js";
import {SDE_MAIL_RECIPIENT} from "./notification-events.js";
import {generateVapidKeys} from "./web-push.js";
import {sendPortalReminders} from "./reminders.js";
import {sdeOsApi} from "./sde-os.js";
import {portalApi,portalAudit,portalBackup} from "./portal-services.js";
/* MPA SDE — serveur Cloudflare (Worker)
   Sert l'application, garde les données dans D1, les fichiers dans KV,
   et reconnaît chacun par son adresse e-mail et son mot de passe.
   Les règles d'accès reprennent exactement celles de la version Claude. */

const NIVEAUX = { view: 0, interact: 1, admin: 2, owner: 3 };
const ROLES = { attente: 0, soldat: 0, lecture: 0, membre_actif: 0, contributeur: 1, admin: 2, proprietaire: 3 };
const LIB_ROLES = { attente: "En attente", soldat: "Soldat", lecture: "Lecture seule", membre_actif: "Membre actif", contributeur: "Contributeur", admin: "Administrateur", proprietaire: "Propriétaire" };
const REGLES = [
  { path: "", read: "interact", write: "interact" },
  { path: "evenements", read: "view", write: "interact" },
  { path: "config", read: "view", write: "admin" },
  { path: "finances", read: "admin", write: "admin" },
  { path: "cotisations", read: "admin", write: "admin" },
  { path: "discipline", read: "admin", write: "admin" },
  { path: "prieres_conf", read: "owner", write: "owner" },
  { path: "annonces", read: "view", write: "interact" },
  { path: "ressources", read: "view", write: "interact" },
  { path: "suivi", read: "owner", write: "owner" },
  { path: "cotis_speciales", read: "admin", write: "admin" },
  { path: "offrandes", read: "admin", write: "admin" },
  { path: "projets_fin", read: "admin", write: "admin" },
  { path: "acces", read: "admin", write: "admin" },
  { path: "site", read: "view", write: "admin" },
  { path: "reglages_site", read: "admin", write: "admin" },
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
function mdpValide(m) { return typeof m === "string" && m.length >= 8 && m.length <= 200; }

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

/* Rate-limit global : 120 requêtes API par IP / 15 min */
const RATE_API_MAX = 120;
async function rateLimitGlobal(env, ip) {
  const cle = "api:" + ip;
  if (await bloque(env, cle, RATE_API_MAX)) return true;
  await compter(env, cle);
  return false;
}

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
async function apiDb(req, env, u, ctx) {
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
    if (segs(path)[0] === "ressources" && u.niveau < 2) {
      const actuelle=await lireDoc(env,path);
      if(actuelle?.data?.public===true || (b.op!=="delete"&&Object.hasOwn(b.data,"public")))
        return erreur("refuse","Seuls les administrateurs peuvent publier, modifier ou retirer une ressource publique.",403);
    }
    try { await ecrireDoc(env, b.op, path, b.data); await portalAudit(env,u,segs(path)[0],b.op); notifySde(env,ctx,"espace",{path,action:b.op}); } catch (e) { return erreur(e.code || "unavailable", e.message, e.code === "invalid_argument" ? 400 : 409); }
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
  // Les lectures partent toutes en même temps (au lieu de l'une après l'autre) : premier chargement plus rapide
  await Promise.all(subs.map(async (s) => {
    const parent = s.type === "doc" ? parentDe(s.path) : s.path;
    const rev = revs[parent] || 0;
    if (s.rev === rev) return;
    if (s.type === "doc") {
      if (!cheminValide(s.path, true)) return;
      const d = peutLire(u, s.path) ? await lireDoc(env, s.path) : null;
      out[s.k] = { rev, exists: !!d, data: d ? filtrer(u, s.path, d.data) : null };
    } else {
      if (!cheminValide(s.path, false)) return;
      const ok = peutLire(u, s.path) && !(segs(s.path)[0] === "espace" && u.niveau < 2);
      out[s.k] = { rev, docs: ok ? (await lireRequete(env, s)).map((x) => ({ id: x.id, data: filtrer(u, s.path + "/" + x.id, x.data) })) : [] };
    }
  }));
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
async function apiInscription(req, env, ctx) {
  const ip = ipDe(req);
  if (await bloque(env, "insc:" + ip, 12)) return erreur("rate_limited", "Trop d’inscriptions depuis ce réseau : réessayez dans un quart d’heure.", 429);
  const b = await req.json();
  const email = normEmail(b.email), prenoms = propre(b.prenoms, 80), nom = propre(b.nom, 80).toUpperCase(), telephone = propre(b.telephone, 30);
  if (!EMAIL_OK.test(email)) return erreur("invalid_argument", "Adresse e-mail invalide.");
  if (!prenoms || !nom) return erreur("invalid_argument", "Indiquez votre nom et vos prénoms.");
  if (!mdpValide(b.motDePasse)) return erreur("invalid_argument", "Le mot de passe doit compter au moins 8 caractères.");
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
  notifySde(env,ctx,"inscription",{nom:prenoms+" "+nom,email,tel:telephone});
  return json({ ok: true, matricule }, 200, { "set-cookie": await ouvrirSession(env, email) });
}
async function apiConnexionMdp(req, env) {
  const b = await req.json();
  /* Identifiant : adresse e-mail ou matricule du membre. */
  const saisie = normEmail(b.email), ip = ipDe(req);
  if (await bloque(env, "e:" + saisie, 8) || await bloque(env, "ip:" + ip, 40)) return erreur("rate_limited", "Trop d’essais : patientez un quart d’heure avant de réessayer.", 429);
  let c = null;
  if (EMAIL_OK.test(saisie)) c = await env.DB.prepare("SELECT email, mdp, activation FROM comptes WHERE email = ?").bind(saisie).first();
  else if (/^[a-z0-9][a-z0-9 ._-]{2,39}$/i.test(saisie)) c = await env.DB.prepare("SELECT email, mdp, activation FROM comptes WHERE upper(matricule) = upper(?)").bind(saisie).first();
  const email = c ? c.email : saisie;
  if (!c || !c.mdp || !(await verifierMdp(b.motDePasse, c.mdp))) {
    await compter(env, "e:" + saisie); await compter(env, "ip:" + ip);
    if (c && !c.mdp && c.activation) return erreur("activation", "Ce compte n’est pas encore activé : choisissez « J’ai un code d’activation ».", 401);
    return erreur("refuse", "Les informations saisies ne permettent pas de vous connecter. Vérifiez votre matricule et votre mot de passe.", 401);
  }
  await effacer(env, "e:" + saisie);
  return json({ ok: true }, 200, { "set-cookie": await ouvrirSession(env, email) });
}
async function apiActivation(req, env) {
  const b = await req.json();
  const email = normEmail(b.email), ip = ipDe(req);
  if (await bloque(env, "e:" + email, 8) || await bloque(env, "ip:" + ip, 40)) return erreur("rate_limited", "Trop d’essais : patientez un quart d’heure avant de réessayer.", 429);
  if (!mdpValide(b.motDePasse)) return erreur("invalid_argument", "Le mot de passe doit compter au moins 8 caractères.");
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
  if (!mdpValide(b.nouveau)) return erreur("invalid_argument", "Le nouveau mot de passe doit compter au moins 8 caractères.");
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
const CHAMPS_FICHE = ["nom", "prenoms", "matricule", "statut", "fonction", "pole", "eglise", "garnisonId", "photoId", "anniv", "adhesion", "telephone", "email", "sexe", "quartier", "situation"];
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
async function apiPriere(req, env, u, ctx) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 403);
  const b = await req.json();
  const sujet = String(b.sujet || "").trim().slice(0, 2000);
  if (!sujet) return erreur("invalid_argument", "Écrivez votre sujet de prière.");
  if (await bloque(env, "priere:" + u.email, 10)) return erreur("rate_limited", "Vous avez déposé beaucoup de requêtes : réessayez un peu plus tard.", 429);
  await compter(env, "priere:" + u.email);
  const t = Date.now();
  if(b.confidentiel!==undefined&&typeof b.confidentiel!=="boolean")return erreur("invalid_argument","Choix de confidentialité invalide.");
  await ecrireDoc(env, "set", (b.confidentiel===true?"prieres_conf/":"prieres/") + idDoc(), { sujet: sujet.slice(0, 140), details: sujet.length > 140 ? sujet : "", categorie: "Personnelle", date: new Date(t).toISOString().slice(0, 10), pourId: u.membreId, pour: "", urgent: false, statut: "En prière", priants: {}, source: "espace", creePar: u.id, creeLe: t, modifiePar: u.id, modifieLe: t });
  notifySde(env,ctx,"priere");
  return json({ ok: true });
}

async function apiPriereAnonyme(req,env,ctx){
  if(req.method!=="POST")return erreur("methode","POST uniquement.",405);
  let b;try{b=await req.json()}catch{return erreur("invalid_argument","Données invalides.")}
  if(String(b.website||"").trim())return json({ok:true});
  const sujet=String(b.sujet||"").trim().replace(/\s+/g," ").slice(0,600);
  const categorie=String(b.categorie||"Prière générale").trim().slice(0,80);
  if(!sujet)return erreur("invalid_argument","Écrivez votre sujet de prière.");
  if(b.accord!==true)return erreur("invalid_argument","Confirmez l’envoi anonyme de votre sujet.");
  const cle="priere-anonyme:"+await sha(ipDe(req));
  if(await bloque(env,cle,5))return erreur("rate_limited","Trop de sujets ont été envoyés. Réessayez plus tard.",429);
  await compter(env,cle);
  const t=Date.now();
  await ecrireDoc(env,"set","prieres/"+idDoc(),{
    sujet:sujet.slice(0,140),details:sujet.length>140?sujet:"",categorie,
    date:new Date(t).toISOString().slice(0,10),pour:"Anonyme",urgent:false,
    statut:"En prière",priants:{},source:"public-anonyme",anonyme:true,creeLe:t,modifieLe:t
  });
  notifySde(env,ctx,"priere",{action:"Sujet anonyme reçu"});
  return json({ok:true,message:"Votre sujet anonyme a été transmis aux intercesseurs SDE."});
}

/* ───────── historique complet (presences, cotisations, prières) ───────── */
async function apiMonHistorique(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 404);
  const r = await lireDoc(env, "espace_membre/" + u.membreId);
  const resume = r ? r.data.resume || null : null;
  /* Presences complètes : chercher tous les événements contenant le membre */
  const evts = await lireRequete(env, {path:"evenements"});
  const presences = [];
  for (const e of evts) {
    if (!e.data || !e.data.presents) continue;
    const v = e.data.presents[u.membreId];
    if (v !== undefined) {
      presences.push({ date: e.data.date || "", titre: e.data.titre || "Rassemblement", etat: v === true ? "P" : v === "retard" ? "R" : v === "excuse" ? "E" : "A" });
    }
  }
  presences.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  /* Prières déposées par le membre */
  const publiques=await lireRequete(env,{path:"prieres"});
  const confidentielles=await lireRequete(env,{path:"prieres_conf"});
  const prieres = [...publiques.map(p=>({...p,confidentiel:false})),...confidentielles.map(p=>({...p,confidentiel:true}))].filter((p) => p.data && p.data.pourId === u.membreId && (!p.confidentiel || p.data.creePar===u.id)).map((p) => ({ date: p.data.date || "", sujet: (p.data.sujet || "").slice(0, 60), statut: p.data.statut || "",confidentiel:p.confidentiel })).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return json({ presences, prieres: prieres.slice(0, 50), totalPrieres: prieres.length, resume });
}

/* ───────── upload photo de profil par le membre ───────── */
async function apiMaPhoto(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 403);
  if (req.method !== "POST") return erreur("invalid_argument", "Utilisez POST.");
  const type = req.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return erreur("invalid_argument", "Envoyez une image (JPEG ou PNG).");
  const corps = await req.arrayBuffer();
  if (corps.byteLength > 5 * 1024 * 1024) return erreur("too_large", "Photo trop lourde (5 Mo maximum).", 413);
  if (await bloque(env, "photo:" + u.email, 10)) return erreur("rate_limited", "Trop d'envois de photos : patientez un quart d'heure.", 429);
  await compter(env, "photo:" + u.email);
  const nid = jetonAleatoire(16);
  await env.FICHIERS.put(nid, corps, { metadata: { type } });
  await env.DB.prepare("INSERT INTO fichiers (id, type, taille, par, cree) VALUES (?, ?, ?, ?, ?)").bind(nid, type, corps.byteLength, u.email, Date.now()).run();
  await ecrireDoc(env, "merge", "membres/" + u.membreId, { photoId: nid, modifiePar: u.id, modifieLe: Date.now() });
  return json({ ok: true, photoId: nid, url: "/_blob/" + nid });
}

/* ───────── profil modifiable par le membre ───────── */
const CHAMPS_MODIFIABLES = ["telephone", "telephone2", "quartier", "email", "situation", "sexe", "anniv", "eglise"];
async function apiMonProfil(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 404);
  if (req.method !== "PATCH") return erreur("invalid_argument", "Utilisez PATCH.");
  const b = await req.json();
  const f = await lireDoc(env, "membres/" + u.membreId);
  if (!f) return erreur("refuse", "Fiche introuvable.", 404);
  const maj = {};
  for (const k of CHAMPS_MODIFIABLES) {
    if (b[k] !== undefined) maj[k] = String(b[k]).trim().slice(0, 200);
  }
  if (b.photoId && /^[A-Za-z0-9_-]{16,64}$/.test(b.photoId)) maj.photoId = b.photoId;
  if (!Object.keys(maj).length) return erreur("invalid_argument", "Rien à modifier.");
  maj.modifiePar = u.id;
  maj.modifieLe = Date.now();
  await ecrireDoc(env, "merge", "membres/" + u.membreId, maj);
  return json({ ok: true });
}

/* ───────── cotisations du membre ───────── */
/* Progression personnelle dans la Soldiers Academy : modules suivis / modules des formations où le membre est inscrit. */
async function apiMonParcoursAcademy(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 404);
  if (req.method !== "GET") return erreur("methode", "GET uniquement.", 405);
  const formations = await lireRequete(env, { path: "formations" });
  let faits = 0, total = 0, inscrit = 0, certifie = 0;
  for (const { data: d = {} } of formations) {
    const p = d.participants && d.participants[u.membreId];
    if (!p || typeof p !== "object" || ["Abandon", "Retiré"].includes(p.statut)) continue;
    const modules = Array.isArray(d.modules) ? d.modules.filter((m) => m && m.id) : [];
    inscrit++;
    if (p.statut === "Certifié") certifie++;
    total += modules.length;
    faits += modules.filter((m) => p.suivis && p.suivis[m.id]).length;
  }
  return json({ ok: true, formations: inscrit, certifie, modulesFaits: faits, modulesTotal: total, pourcentage: total ? Math.round((100 * faits) / total) : null });
}

async function apiMesCotisations(req, env, u) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 404);
  if(req.method!=="GET")return erreur("methode","GET uniquement.",405);
  const tous = await lireRequete(env, { path: "cotisations" });
  return json(memberContributions(tous,u.membreId));
}

/* ───────── actualités du mouvement ───────── */
async function apiActualites(env, u) {
  if (!u.connecte) return erreur("refuse", "Connectez-vous.", 403);
  const annonces = await lireRequete(env, { path: "annonces" });
  const evts = await lireRequete(env, { path: "evenements" });
  const jour = new Date().toISOString().slice(0, 10);
  /* Annonces récentes (30 derniers jours) */
  const trentaine = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const news = annonces
    .filter(a => a.data && (a.data.date || "") >= trentaine)
    .map(a => ({ type: "annonce", id: a.id, titre: (a.data.titre || "Annonce").slice(0, 200), contenu: (a.data.contenu || a.data.message || "").slice(0, 600), date: a.data.date || "", categorie: a.data.categorie || "" }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  /* Prochains événements */
  const prochains = evts
    .filter(e => e.data && (e.data.date || "") >= jour)
    .map(e => ({ type: "evenement", id: e.id, titre: (e.data.titre || "").slice(0, 200), date: e.data.date || "", heure: e.data.heure || "", lieu: (e.data.lieu || "").slice(0, 200) }))
    .sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")))
    .slice(0, 10);
  return json({ annonces: news.slice(0, 20), evenements: prochains });
}

/* ───────── demande d'absence ───────── */
async function apiAbsence(req, env, u, ctx) {
  if (!u.connecte || !u.membreId) return erreur("refuse", "Aucune fiche reliée à ce compte.", 403);
  if (req.method !== "POST") return erreur("invalid_argument", "Utilisez POST.");
  const b = await req.json();
  const dateDebut = String(b.dateDebut || "").trim();
  const dateFin = String(b.dateFin || "").trim();
  const motif = String(b.motif || "").trim().slice(0, 500);
  if (!dateDebut || !motif) return erreur("invalid_argument", "La date de début et le motif sont requis.");
  if (await bloque(env, "absence:" + u.email, 5)) return erreur("rate_limited", "Trop de demandes d'absence récentes.", 429);
  await compter(env, "absence:" + u.email);
  const t = Date.now();
  await ecrireDoc(env, "set", "absences/" + idDoc(), { membreId: u.membreId, nom: u.nom || u.email, dateDebut, dateFin: dateFin || dateDebut, motif, statut: "en_attente", creePar: u.id, creeLe: t, modifiePar: u.id, modifieLe: t });
  notifySde(env,ctx,"absence");
  return json({ ok: true });
}

/* ───────── notifications push (VAPID) ───────── */
async function apiPushSubscription(req, env, u) {
  if (!u.connecte) return erreur("refuse", "Connectez-vous.", 403);
  // La table n'existe pas encore dans la base en ligne : on la crée au premier usage
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT, auth TEXT, cree INTEGER, PRIMARY KEY (userId, endpoint))").run();
  if (req.method === "POST") {
    const b = await req.json();
    if (!b.endpoint || !b.keys) return erreur("invalid_argument", "Abonnement invalide.");
    // Un endpoint représente un appareil : lors d'un changement de compte,
    // transférer son abonnement plutôt que multiplier les envois à cet appareil.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ? AND userId <> ?").bind(b.endpoint,u.id),
      env.DB.prepare("INSERT OR REPLACE INTO push_subs (userId, endpoint, p256dh, auth, cree) VALUES (?, ?, ?, ?, ?)").bind(u.id, b.endpoint, b.keys.p256dh || "", b.keys.auth || "", Date.now()),
    ]);
    return json({ ok: true });
  }
  if (req.method === "DELETE") {
    const b = await req.json();
    if (b.endpoint) await env.DB.prepare("DELETE FROM push_subs WHERE userId = ? AND endpoint = ?").bind(u.id, b.endpoint).run();
    else await env.DB.prepare("DELETE FROM push_subs WHERE userId = ?").bind(u.id).run();
    return json({ ok: true });
  }
  return erreur("invalid_argument", "POST ou DELETE attendu.");
}

/* ───────── export calendrier .ics ───────── */
async function apiCalendrier(env) {
  const evts = await lireRequete(env, "evenements");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MPA SDE//Agenda//FR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Agenda MPA SDE\r\n";
  for (const e of evts) {
    if (!e.data || !e.data.date) continue;
    const d = e.data;
    const dt = String(d.date).replace(/-/g, "");
    const h = String(d.heure || "08:00").replace(":", "") + "00";
    const uid = (e.id || "").replace(/[^a-z0-9]/gi, "") + "@mouvement-sde.org";
    const duree = Number(d.duree) || 120;
    const fin = new Date(new Date(`${d.date}T${d.heure || "08:00"}:00`).getTime() + duree * 60000);
    const dtFin = fin.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15);
    ics += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${now}\r\nDTSTART:${dt}T${h}\r\nDTEND:${dtFin}\r\nSUMMARY:${icsEsc(d.titre || "Rassemblement")}\r\n`;
    if (d.lieu) ics += `LOCATION:${icsEsc(d.lieu)}\r\n`;
    if (d.description) ics += `DESCRIPTION:${icsEsc(d.description)}\r\n`;
    ics += `END:VEVENT\r\n`;
  }
  ics += "END:VCALENDAR\r\n";
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="agenda-sde.ics"', "cache-control": "public, max-age=3600" } });
}
function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

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

async function apiImport(req, env, u, ctx) {
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
  notifySde(env,ctx,"import",{nombre:valides.length});
  return json({ ok: true, importes: valides.length, ignores: docs.length - valides.length });
}


/* Indicateurs administratifs : agrégats seulement, sans identité ni finances.
 * Le serveur vérifie le rôle à chaque appel; aucune liste privée n'est publiée.
 */
async function apiTableauDeBord(req,env,u) {
  if(req.method!=="GET")return erreur("methode","GET uniquement.",405);
  if(!u.connecte || u.niveau<1)return erreur("refuse","Accès réservé aux responsables.",403);
  const r=await env.DB.prepare("SELECT parent, COUNT(*) AS n FROM docs WHERE parent IN ('membres','evenements','projets','annonces') GROUP BY parent").all();
  const total={membres:0,evenements:0,projets:0,annonces:0};
  for(const x of r.results||[]){
    if(Object.prototype.hasOwnProperty.call(total,x.parent))total[x.parent]=Number(x.n)||0;
  }
  const [evenements,formations,projets,membres,prieres,garnisons]=await Promise.all(["evenements","formations","projets","membres","prieres","garnisons"].map(path=>lireRequete(env,{path})));
  const metrics=dashboardMetrics(evenements,formations,projets);
  const presence=dashboardAttendance(evenements,membres,garnisons);
  const enPriere=prieres.filter(p=>(p.data.statut||"En prière")==="En prière");
  const urgences=enPriere.filter(p=>p.data.urgent===true).map(p=>({id:p.id,date:String(p.data.date||"").slice(0,10)})).sort((a,b)=>b.date.localeCompare(a.date));
  // Uniquement des agrégats de pilotage : aucune coordonnée ni aucun message
  // de candidature ne quitte la table protégée via cette route.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cree INTEGER NOT NULL, objet TEXT,
    pole TEXT, source TEXT, nom TEXT NOT NULL, tel TEXT, email TEXT, ville TEXT,
    message TEXT, traite INTEGER NOT NULL DEFAULT 0, note TEXT
  )`).run();
  const [demandesAdhesion,site]=await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM engagements WHERE traite = 0").first(),
    donneesSite(env)
  ]);
  // Sans surcharge du CMS, la page Programmes conserve ses huit cartes publiques natives.
  const programmesPublies=(site.programmes||[]).filter(p=>p.titre).length||8;
  // Métadonnées de mises à jour uniquement, jamais le contenu des dossiers.
  const recents=await env.DB.prepare("SELECT parent,maj FROM docs WHERE parent IN ('membres','evenements','projets','formations','annonces') ORDER BY maj DESC LIMIT 8").all();
  return json({total,...metrics,indicateurs:{membresActifs:membres.filter(m=>m.data.actif!==false).length,presence,intercessions:enPriere.length,demandesAdhesion:Number(demandesAdhesion?.n)||0,poles:SDE_OS_31.poles.length,programmesPublies},urgences:urgences.slice(0,5),urgencesTotal:urgences.length,activites:(recents.results||[]).map(r=>({rubrique:r.parent,cree:r.maj})),actualiseLe:Date.now()});
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
    .map((e) => ({ id: e.id, titre: String(e.titre || ""), type: e.type, date: e.date, heure: publishedEventTime(e), fin: e.fin || "", lieu: String(e.lieu || ""), description: String(e.description || "").slice(0, 600) }));
  return json({ evenements: evts }, 200, { "cache-control": "public, max-age=300" });
}

/* Contenu public modifiable : documents site/contact, site/programmes, site/banniere.
   Écriture réservée aux administrateurs (REGLES) ; lecture publique en texte seul, champs filtrés. */
const txt = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
const lienSite = (v) => { const l = txt(v, 300); return /^(\/(?!\/)|#|https:\/\/)/.test(l) ? l : ""; };
const imageProg = (v) => { const l = txt(v, 120); return /^\/vitrine\/illus\/[\w.-]+\.svg$/.test(l) ? l : ""; };
export function assainirSite(docs) {
  const c = docs.contact || {}, pr = docs.programmes || {}, b = docs.banniere || {};
  const email = txt(c.email, 120), tel = txt(c.telephone, 40);
  const liste = (Array.isArray(pr.liste) ? pr.liste : []).slice(0, 20).map((x) => ({
    titre: txt(x?.titre, 120), rythme: txt(x?.rythme, 80), texte: txt(x?.texte, 400),
    lien: lienSite(x?.lien), libelle: txt(x?.libelle, 40), image: imageProg(x?.image), feu: x?.feu === true
  })).filter((x) => x.titre);
  return {
    contact: { email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : "", telephone: /^[+\d][\d\s().-]{5,}$/.test(tel) ? tel : "" },
    programmes: liste,
    banniere: b.actif === false ? { texte: "", lien: "" } : { texte: txt(b.texte, 200), lien: lienSite(b.lien) }
  };
}
async function donneesSite(env) {
  const r = await env.DB.prepare("SELECT path, data FROM docs WHERE parent = 'site'").all();
  const docs = {};
  for (const x of r.results || []) { try { docs[String(x.path).split("/").pop()] = JSON.parse(x.data); } catch { /* document illisible : ignoré */ } }
  return assainirSite(docs);
}
async function apiSite(env) {
  return json(await donneesSite(env), 200, { "cache-control": "public, max-age=300" });
}

/* Affichage côté serveur : le contenu publié est inséré dans la page avant l'envoi, sans clignotement.
   Même rendu que subpage.js (hydratation, qui reste en place comme filet de sécurité). */
const ech = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function htmlProgrammes(liste) {
  return liste.map((p) => {
    const lien = p.lien || "/contact#rejoindre", sujet = p.lien ? "" : ` data-sujet="${ech(p.titre)}"`;
    return `<article class="programme revele vu${p.feu ? " feu" : ""}">${p.image ? `<img class="prog-img" src="${ech(p.image)}" alt="" width="600" height="260" loading="lazy">` : ""}${p.rythme ? `<span class="rythme">${ech(p.rythme)}</span>` : ""}<h3>${ech(p.titre)}</h3>${p.texte ? `<p>${ech(p.texte)}</p>` : ""}<a href="${ech(lien)}"${sujet}>${ech(p.libelle || "Participer")} <svg aria-hidden="true"><use href="#i-fleche"/></svg></a></article>`;
  }).join("");
}
export function htmlBanniere(b) {
  if (!b?.texte) return "";
  const style = "display:block;text-align:center;padding:.6rem 1rem;background:#D4AF37;color:#0b1530;font-weight:600;text-decoration:none";
  return b.lien ? `<a class="site-banniere" href="${ech(b.lien)}" style="${style}">${ech(b.texte)}</a>` : `<p class="site-banniere" style="${style};margin:0">${ech(b.texte)}</p>`;
}
async function injecterSite(reponse, env, page) {
  try {
    if (typeof HTMLRewriter === "undefined" || !(reponse.headers.get("content-type") || "").includes("text/html")) return reponse;
    const site = await donneesSite(env);
    const aRien = !site.contact.email && !site.contact.telephone && !site.programmes.length && !site.banniere.texte;
    if (aRien) return reponse;
    let r = new HTMLRewriter();
    const banniere = htmlBanniere(site.banniere);
    if (banniere) r = r.on("body", { element(e) { e.prepend(banniere, { html: true }); } });
    if (site.contact.email) r = r.on("#c-mail", { element(e) { e.setInnerContent(site.contact.email); } });
    if (site.contact.telephone) r = r.on("#c-tel", { element(e) { e.setInnerContent(site.contact.telephone); } });
    if (page === "programmes" && site.programmes.length) r = r.on(".programmes", { element(e) { e.setInnerContent(htmlProgrammes(site.programmes), { html: true }); } });
    const n = r.transform(reponse);
    n.headers.set("cache-control", "public, max-age=60");
    return n;
  } catch (e) { console.warn("Affichage serveur du site ignoré", e?.name || "Erreur"); return reponse; }
}

async function apiRessourcesPubliques(env){
  const rows=(await env.DB.prepare("SELECT id,data FROM docs WHERE parent='ressources'").all()).results||[];
  const ressources=[];
  for(const row of rows){
    let d;try{d=JSON.parse(row.data)}catch{continue}
    if(d.public!==true)continue;
    const lien=/^https?:\/\//i.test(String(d.lien||""))?String(d.lien).slice(0,1000):"";
    ressources.push({
      id:row.id,titre:String(d.titre||"Ressource").slice(0,180),type:String(d.type||"document").slice(0,40),
      auteur:String(d.auteur||"").slice(0,160),annee:String(d.annee||"").slice(0,4),theme:String(d.theme||"").slice(0,120),
      description:String(d.description||"").slice(0,700),lien,
      telechargement:d.fichierId?`/api/ressources-publiques/${encodeURIComponent(row.id)}/telecharger`:""
    });
  }
  ressources.sort((a,b)=>a.titre.localeCompare(b.titre,"fr"));
  return json({ressources},200,{"cache-control":"public, max-age=300"});
}
async function telechargerRessourcePublique(env,id){
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(id))return new Response("Introuvable",{status:404});
  const row=await env.DB.prepare("SELECT data FROM docs WHERE path=?").bind("ressources/"+id).first();
  if(!row)return new Response("Introuvable",{status:404});
  let d;try{d=JSON.parse(row.data)}catch{return new Response("Introuvable",{status:404})}
  if(d.public!==true||!d.fichierId||!ID_FICHIER.test(String(d.fichierId)))return new Response("Introuvable",{status:404});
  const fichier=await env.FICHIERS.getWithMetadata(String(d.fichierId),{type:"arrayBuffer"});
  if(!fichier?.value)return new Response("Introuvable",{status:404});
  const nom=String(d.fichierNom||d.titre||"ressource-sde").replace(/[\r\n"\\/]/g,"-").slice(0,160);
  return new Response(fichier.value,{headers:{
    "content-type":fichier.metadata?.type||d.fichierType||"application/octet-stream",
    "content-disposition":`attachment; filename*=UTF-8''${encodeURIComponent(nom)}`,
    "cache-control":"public, max-age=3600","x-content-type-options":"nosniff"
  }});
}

/* ───────── Formulaire public : collecte d'infos + bilan 2026 ───────── */
/* ───────── Demandes d'engagement (public) ─────────
   Petit formulaire accessible depuis chaque pôle, programme ou point SDE.
   Remplace les redirections WhatsApp par un enregistrement centralisé
   que le secrétariat peut consulter depuis l'app, et un e-mail de secours
   vers infosoldat@gmail.com. */
async function apiEngager(req, env, ctx) {
  if (req.method !== "POST") return erreur("methode", "POST uniquement.", 405);
  let b;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) b = await req.json();
    else { const fd = await req.formData(); b = {}; for (const [k, v] of fd.entries()) b[k] = typeof v === "string" ? v : ""; }
  } catch { return erreur("invalid", "Données du formulaire invalides."); }

  const champ = (n, max = 500) => String(b[n] || "").trim().slice(0, max);
  const nom = champ("nom", 120);
  const tel = champ("tel", 30);
  const email = champ("email", 160);
  const ville = champ("ville", 120);
  const objet = champ("objet", 160) || "Prise de contact";
  const pole = champ("pole", 160);
  const programme = champ("programme", 160);
  const motivation = champ("motivation", 2000);
  const message = champ("message", 2000);
  const source = champ("source", 160);

  /* Champ piège (invisible pour les personnes) : un robot le remplit, la demande est ignorée sans le lui dire. */
  if (champ("piege", 200)) return json({ ok: true, message: "Votre demande a bien été transmise au secrétariat du mouvement. Nous vous recontacterons sous peu." });
  if (!nom) return erreur("champ_manquant", "Votre nom est obligatoire.");
  if (!tel && !email) return erreur("champ_manquant", "Indiquez au moins un téléphone ou un e-mail pour que l'équipe vous recontacte.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erreur("email_invalide", "Adresse e-mail invalide.");
  if (tel && tel.replace(/\D/g, "").length < 7) return erreur("tel_invalide", "Numéro de téléphone trop court.");
  if (objet === "Devenir membre") {
    if (!tel || !email || !ville || !pole || !programme || !motivation) return erreur("champ_manquant", "Pour adhérer, renseignez téléphone, e-mail, ville, pôle, programme et motivation.");
    if (!["Réveil, évangélisation & missions", "Impact social & humanitaire", "Logistique & organisation", "Communication, médias & digital", "Formation & développement intégral"].includes(pole)) return erreur("pole_invalide", "Choisissez un pôle proposé.");
    if (!["Traversée Prophétique Mensuelle", "IN FIRE", "Soldiers Academy", "Holy Talk & Holy Day", "Missions & actions solidaires", "Holy Brunch", "ALEPH 12"].includes(programme)) return erreur("programme_invalide", "Choisissez un programme proposé.");
  }
  const ipPublic = "engagement:" + ipDe(req);
  if (await bloque(env, ipPublic, 30)) return erreur("rate_limited", "Trop de demandes récentes. Réessayez plus tard.", 429);
  await compter(env, ipPublic);

  /* Table auto-provisionnée pour ne pas dépendre d'une migration */
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cree INTEGER NOT NULL,
    objet TEXT, pole TEXT, source TEXT,
    nom TEXT NOT NULL, tel TEXT, email TEXT, ville TEXT,
    message TEXT,
    traite INTEGER NOT NULL DEFAULT 0,
    note TEXT
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS engagements_cree ON engagements(traite, cree)`).run();

  await env.DB.prepare(`INSERT INTO engagements (cree, objet, pole, source, nom, tel, email, ville, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(Date.now(), objet, pole, source, nom, tel, email, ville, objet === "Devenir membre" ? `Programme : ${programme}\nMotivation : ${motivation}${message ? `\nMessage : ${message}` : ""}` : message)
    .run();

  notifySde(env,ctx,"engagement",{nom,email,tel});
  const suite = (async () => {
    const sec = await secretariat(env);
    await Promise.allSettled([alerterSecretariat(env, sec.emails, { objet, nom, tel, email, ville }), accuserReception(env, { nom, objet, email })]);
  })().catch(() => {});
  if (typeof ctx?.waitUntil === "function") ctx.waitUntil(suite);
  return json({ ok: true, message: "Votre demande a bien été transmise au secrétariat du mouvement. Nous vous recontacterons sous peu." });
}

/* Secrétariat : accès facultatif aux demandes, activé et alimenté par un administrateur
   (document reglages_site/secretariat = { actif, emails[] }). Désactivé par défaut. */
export async function secretariat(env) {
  try {
    const d = await lireDoc(env, "reglages_site/secretariat");
    if (!d?.data || d.data.actif !== true) return { actif: false, emails: [] };
    const emails = (Array.isArray(d.data.emails) ? d.data.emails : []).map((e) => String(e).trim().toLowerCase())
      .filter((e) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e)).slice(0, 10);
    return { actif: true, emails };
  } catch { return { actif: false, emails: [] }; }
}
/* Alerte immédiate (e-mail) aux membres du secrétariat désignés, en plus des alertes SDE habituelles. */
async function alerterSecretariat(env, emails, d) {
  if (!emails.length || !notificationConfigured(env)) return;
  const ligne = (v) => String(v || "").replace(/[\r\n]+/g, " ").slice(0, 160);
  const text = ["Nouvelle demande reçue sur mouvement-sde.org.", "", "Objet : " + ligne(d.objet), "Nom : " + ligne(d.nom),
    d.tel ? "Téléphone : " + ligne(d.tel) : "", d.email ? "E-mail : " + ligne(d.email) : "", d.ville ? "Ville : " + ligne(d.ville) : "",
    "", "À traiter : https://app.mouvement-sde.org/engagements"].filter((x) => x !== "").join("\n");
  await Promise.allSettled(emails.map((to) => env.EMAIL.send({ from: String(env.NOTIFICATION_FROM), to, subject: "[SDE] Nouvelle demande : " + ligne(d.objet), text })));
}
/* Accusé de réception à la personne, si elle a laissé une adresse e-mail. */
async function accuserReception(env, d) {
  if (!d.email || !notificationConfigured(env)) return;
  let contact = "";
  try { contact = String((await lireDoc(env, "site/contact"))?.data?.email || ""); } catch { /* repli ci-dessous */ }
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(contact)) contact = SDE_MAIL_RECIPIENT;
  const text = ["Shalom " + String(d.nom).replace(/[\r\n]+/g, " ").slice(0, 80) + ",", "",
    "Nous avons bien reçu votre demande (« " + String(d.objet).replace(/[\r\n]+/g, " ").slice(0, 100) + " »).",
    "Le secrétariat du mouvement vous recontactera sous peu.", "", "Pour toute question : " + contact, "",
    "Mouvement Prophético-Apostolique Soldats de l'Éternel"].join("\n");
  try { await env.EMAIL.send({ from: String(env.NOTIFICATION_FROM), to: d.email, subject: "Votre demande a bien été reçue", text }); } catch (e) { console.warn("Accusé non envoyé", e?.name || "Erreur"); }
}

/* Liste des demandes d'engagement (propriétaires, et secrétariat désigné si l'option est activée) */
async function apiEngagerAdmin(req, env, u) {
  if (!u.connecte) return erreur("refuse", "Réservé à l'équipe administrative.", 403);
  if (u.niveau < 3) {
    const sec = await secretariat(env);
    if (!sec.actif || !sec.emails.includes(String(u.email || "").toLowerCase())) return erreur("refuse", "Réservé à l'équipe administrative.", 403);
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cree INTEGER NOT NULL,
    objet TEXT, pole TEXT, source TEXT,
    nom TEXT NOT NULL, tel TEXT, email TEXT, ville TEXT,
    message TEXT,
    traite INTEGER NOT NULL DEFAULT 0,
    note TEXT
  )`).run();
  await env.DB.prepare("ALTER TABLE engagements ADD COLUMN responsable TEXT").run().catch(() => {});
  const url = new URL(req.url);
  if (req.method === "PATCH") {
    let b; try { b = await req.json(); } catch { return erreur("invalid", "Corps JSON invalide."); }
    const id = parseInt(b.id, 10);
    if (!id) return erreur("invalid", "id requis.");
    await env.DB.prepare(`UPDATE engagements SET traite = ?, note = ? WHERE id = ?`).bind(b.traite ? 1 : 0, String(b.note || "").slice(0, 1000), id).run();
    if (typeof b.responsable === "string") await env.DB.prepare(`UPDATE engagements SET responsable = ? WHERE id = ?`).bind(b.responsable.trim().slice(0, 120), id).run();
    return json({ ok: true });
  }
  const limite = Math.min(200, parseInt(url.searchParams.get("limite") || "100", 10));
  const r = await env.DB.prepare(`SELECT id, cree, objet, pole, source, nom, tel, email, ville, message, traite, note, responsable FROM engagements ORDER BY traite ASC, cree DESC LIMIT ?`).bind(limite).all();
  return json({ ok: true, engagements: r.results || [] });
}

/* Compteur de visites du site public : visites du jour, total, visiteurs en ligne (signal toutes les 45 s, fenêtre de 90 s). */
async function apiVisites(req, env) {
  const t = Date.now(), jour = new Date(t).toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS visites_jour (jour TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS visites_presence (id TEXT PRIMARY KEY, vu INTEGER NOT NULL)"),
  ]);
  if (req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch { return erreur("invalid", "Corps JSON invalide."); }
    const id = String(b.id || "");
    if (!/^[a-z0-9]{16,40}$/.test(id)) return erreur("invalid", "Identifiant de visite invalide.");
    const ops = [env.DB.prepare("INSERT INTO visites_presence (id, vu) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET vu = excluded.vu").bind(id, t)];
    if (b.nouvelle === true) {
      const cle = "visite:" + ipDe(req);
      if (!(await bloque(env, cle, 30))) {
        await compter(env, cle);
        ops.push(env.DB.prepare("INSERT INTO visites_jour (jour, n) VALUES (?, 1) ON CONFLICT(jour) DO UPDATE SET n = n + 1").bind(jour));
      }
    }
    if (Math.random() < 0.1) ops.push(env.DB.prepare("DELETE FROM visites_presence WHERE vu < ?").bind(t - 600000));
    await env.DB.batch(ops);
  } else if (req.method !== "GET") return erreur("methode", "GET ou POST uniquement.", 405);
  const [jourR, totalR, ligneR] = await env.DB.batch([
    env.DB.prepare("SELECT n FROM visites_jour WHERE jour = ?").bind(jour),
    env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM visites_jour"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM visites_presence WHERE vu > ?").bind(t - 90000),
  ]);
  const n = (r) => Number(r?.results?.[0]?.n) || 0;
  return json({ ok: true, aujourdhui: n(jourR), total: n(totalR), enLigne: Math.max(1, n(ligneR)) }, 200, { "cache-control": "no-store" });
}

async function apiFormulaire(req, env, ctx) {
  if (req.method !== "POST") return erreur("methode", "POST uniquement.", 405);
  let fd;
  try { fd = await req.formData(); } catch { return erreur("invalid", "Données du formulaire invalides."); }

  const champ = (n) => String(fd.get(n) || "").trim();
  const obligatoires = ["nom", "prenom", "statut_matrimonial", "profession", "date_naissance", "lieu_naissance", "telephone", "email", "ville", "message"];
  for (const c of obligatoires) {
    if (!champ(c)) return erreur("champ_manquant", `Le champ « ${c.replace(/_/g, " ")} » est obligatoire.`);
  }
  const emailVal = champ("email");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailVal)) return erreur("email_invalide", "Adresse e-mail invalide.");

  const ipSondage = "sondage:" + ipDe(req);
  if (await bloque(env, ipSondage, 15)) return erreur("rate_limited", "Trop de réponses récentes. Réessayez plus tard.", 429);
  await compter(env, ipSondage);

  /* Photo (obligatoire) */
  const photo = fd.get("photo");
  if (!photo || typeof photo === "string" || !photo.size) return erreur("photo_manquante", "La photo est obligatoire.");
  if (photo.size > 5 * 1024 * 1024) return erreur("photo_trop_lourde", "La photo ne doit pas dépasser 5 Mo.");
  const photoType = photo.type || "image/jpeg";
  if (!photoType.startsWith("image/")) return erreur("photo_invalide", "Le fichier doit être une image.");
  const photoId = "form_" + jetonAleatoire(16);
  const photoBuf = await photo.arrayBuffer();
  await env.FICHIERS.put(photoId, photoBuf, { metadata: { type: photoType } });

  /* Sondage bilan 2026 */
  const satisfaction = parseInt(champ("satisfaction_2026") || "0", 10);

  await env.DB.prepare(`INSERT INTO formulaire_reponses
    (photo_id, nom, prenom, statut_matrimonial, profession, date_naissance, lieu_naissance,
     telephone, email, ville, message, satisfaction_2026, activites_marquantes,
     points_ameliorer, propositions_2027, domaines_prioritaires)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(photoId, champ("nom"), champ("prenom"), champ("statut_matrimonial"),
      champ("profession"), champ("date_naissance"), champ("lieu_naissance"),
      champ("telephone"), emailVal, champ("ville"), champ("message"),
      satisfaction, champ("activites_marquantes"), champ("points_ameliorer"),
      champ("propositions_2027"), champ("domaines_prioritaires"))
    .run();

  notifySde(env,ctx,"sondage",{nom:champ("nom")+" "+champ("prenom"),email:emailVal});
  return json({ ok: true, message: "Votre formulaire a été enregistré avec succès. Merci !" });
}

/* ───────── Préinscription Soldiers Academy (public) ───────── */
async function apiPreinscriptionAcademy(req, env, ctx) {
  if (req.method !== "POST") return erreur("methode", "POST uniquement.", 405);
  let fd;
  try { fd = await req.formData(); } catch { return erreur("invalid", "Données du formulaire invalides."); }
  const champ = (n) => String(fd.get(n) || "").trim();
  const obligatoires = ["nom", "prenom", "email", "telephone"];
  for (const c of obligatoires) {
    if (!champ(c)) return erreur("champ_manquant", `Le champ « ${c.replace(/_/g, " ")} » est obligatoire.`);
  }
  const emailVal = champ("email");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailVal)) return erreur("email_invalide", "Adresse e-mail invalide.");
  /* Doublon ? */
  const doublon = await env.DB.prepare("SELECT id FROM preinscriptions_academy WHERE email = ? AND statut NOT IN ('refusee') LIMIT 1").bind(emailVal).first();
  if (doublon) return erreur("doublon", "Une préinscription avec cette adresse e-mail existe déjà. Si vous souhaitez modifier vos informations, contactez le secrétariat.");
  const ipAcademy = "academy:" + ipDe(req);
  if (await bloque(env, ipAcademy, 20)) return erreur("rate_limited", "Trop de préinscriptions récentes. Réessayez plus tard.", 429);
  await compter(env, ipAcademy);

  await env.DB.prepare(`INSERT INTO preinscriptions_academy
    (nom, prenom, email, telephone, date_naissance, ville, pays, niveau_souhaite, motivation, experience, eglise_origine)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(champ("nom"), champ("prenom"), emailVal, champ("telephone"),
      champ("date_naissance"), champ("ville"), champ("pays") || "Côte d'Ivoire",
      champ("niveau_souhaite") || "Niveau 1", champ("motivation"), champ("experience"), champ("eglise_origine"))
    .run();

  notifySde(env,ctx,"academy",{nom:champ("nom")+" "+champ("prenom"),email:emailVal,tel:champ("telephone")});
  return json({ ok: true, message: "Votre préinscription à la Soldiers Academy a été enregistrée ! Nous vous contacterons prochainement." });
}

/* ───────── Gestion des préinscriptions Academy (admin) ───────── */
async function apiPreinscriptionAcademyAdmin(req, env, u) {
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  const url = new URL(req.url);

  if (req.method === "PATCH") {
    const b = await req.json();
    if (!b.id) return erreur("id_manquant", "ID requis.");
    const sets = [];
    const vals = [];
    if (b.statut) { sets.push("statut = ?"); vals.push(b.statut); }
    if (b.notes_admin !== undefined) { sets.push("notes_admin = ?"); vals.push(b.notes_admin); }
    if (!sets.length) return erreur("vide", "Rien à modifier.");
    sets.push("updated_at = datetime('now')");
    vals.push(b.id);
    await env.DB.prepare(`UPDATE preinscriptions_academy SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    const b = await req.json();
    if (!b.id) return erreur("id_manquant", "ID requis.");
    await env.DB.prepare("DELETE FROM preinscriptions_academy WHERE id = ?").bind(b.id).run();
    return json({ ok: true });
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const statut = url.searchParams.get("statut") || "";
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limite") || "30", 10)));
  const offset = (page - 1) * limit;
  const where = statut ? "WHERE statut = ?" : "";
  const binds = statut ? [statut, limit, offset] : [limit, offset];
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM preinscriptions_academy ${where}`).bind(...(statut ? [statut] : [])).first()).n;
  const r = await env.DB.prepare(`SELECT * FROM preinscriptions_academy ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds).all();
  return json({ total, page, pages: Math.ceil(total / limit), preinscriptions: r.results || [] });
}

/* Liste des réponses (admin) */
async function apiFormulaireAdmin(req, env, u) {
  if (u.niveau < 2) return erreur("refuse", "Réservé aux administrateurs.", 403);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  if (req.method === "DELETE") {
    const b = await req.json();
    if (!b.id) return erreur("id_manquant", "ID requis.");
    const row = await env.DB.prepare("SELECT photo_id FROM formulaire_reponses WHERE id = ?").bind(b.id).first();
    if (row && row.photo_id) await env.FICHIERS.delete(row.photo_id);
    await env.DB.prepare("DELETE FROM formulaire_reponses WHERE id = ?").bind(b.id).run();
    return json({ ok: true });
  }

  const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM formulaire_reponses").first()).n;
  const r = await env.DB.prepare("SELECT * FROM formulaire_reponses ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all();
  return json({ total, page, pages: Math.ceil(total / limit), reponses: r.results || [] });
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
async function apiMedias(req, env, u, url, ctx) {
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
    notifySde(env,ctx,"media",{genre:m.genre});
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
  const portail=await portalBackup(env);
  const corps = JSON.stringify({ version: 1, date: jour, application: "MPA SDE", docs: Object.fromEntries(docs.map((d) => [d.path, JSON.parse(d.data)])), comptes, medias,portail });
  await env.FICHIERS.put("sauvegarde:" + jour, corps, { expirationTtl: 35 * 86400, metadata: { type: "application/json", taille: corps.length, documents: docs.length, comptes: comptes.length, faite: Date.now() } });
  return { jour, documents: docs.length, taille: corps.length };
}
async function apiSauvegardes(req, env, u, url) {
  // Une sauvegarde contient aussi les dossiers pastoraux : mêmes droits owner.
  if (u.niveau < 3) return erreur("refuse", "Sauvegardes complètes réservées au propriétaire.", 403);
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

/* ───────── sync cron espace_membre (nuit, sans admin connecté) ───────── */
async function syncEspacesMembres(env) {
  const comptes = (await env.DB.prepare("SELECT id, email, nom, membreId, role FROM comptes WHERE membreId IS NOT NULL AND membreId != ''").all()).results || [];
  if (!comptes.length) return { syncs: 0 };
  const docs = (await env.DB.prepare("SELECT path, data FROM docs").all()).results || [];
  const parPath = Object.fromEntries(docs.map((d) => [d.path, JSON.parse(d.data)]));
  const cfg = parPath["config/config"] || {};
  const an = new Date().getFullYear();
  const mensuel = Number(cfg.cotisationMensuelle) || 0;
  const moisDus = [];
  const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const moisActuel = new Date().getMonth();
  for (let i = 0; i <= moisActuel; i++) moisDus.push(MOIS[i]);
  const membres = {};
  const garnisons = {};
  const evenements = [];
  const cotisations = [];
  const speciales = [];
  const offrandes = [];
  const projets = [];
  const projetsFin = [];
  for (const [p, d] of Object.entries(parPath)) {
    const s = p.split("/");
    if (s[0] === "membres" && s.length === 2) membres[s[1]] = { id: s[1], ...d };
    else if (s[0] === "garnisons" && s.length === 2) garnisons[s[1]] = { id: s[1], ...d };
    else if (s[0] === "evenements" && s.length === 2) evenements.push({ id: s[1], ...d });
    else if (s[0] === "cotisations" && s.length === 2) cotisations.push({ id: s[1], ...d });
    else if (s[0] === "cotis_speciales" && s.length === 2) speciales.push({ id: s[1], ...d });
    else if (s[0] === "offrandes" && s.length === 2) offrandes.push({ id: s[1], ...d });
    else if (s[0] === "projets" && s.length === 2) projets.push({ id: s[1], ...d });
    else if (s[0] === "projets_fin" && s.length === 2) projetsFin.push({ id: s[1], ...d });
  }
  function chaineGarnisons(gid) {
    const gs = [];
    let id = gid;
    while (id && gs.length < 4 && garnisons[id]) {
      const g = garnisons[id];
      gs.push({ id, nom: g.nom || "", type: g.type || "", pays: g.pays || "", ville: g.ville || "", parentId: g.parentId || "" });
      id = g.parentId;
    }
    return gs;
  }
  function resumeCron(m) {
    const gs = chaineGarnisons(m.garnisonId);
    const evsPasses = evenements.filter((e) => e.date && e.date <= new Date().toISOString().slice(0, 10) && e.presents);
    const evs3m = evsPasses.filter((e) => { const d = new Date(e.date); const il3m = new Date(); il3m.setMonth(il3m.getMonth() - 3); return d >= il3m; });
    let p = 0, r = 0, x = 0, a = 0;
    for (const e of evs3m) {
      const v = e.presents[m.id];
      if (v === true) p++;
      else if (v === "retard") r++;
      else if (v === "excuse") x++;
      else if (v !== undefined) a++;
      else a++;
    }
    const n = evs3m.length;
    const taux = n > 0 ? (p + r) / n : null;
    const presListe = evsPasses.filter((e) => e.presents[m.id] !== undefined).slice(0, 30).map((e) => {
      const v = e.presents[m.id];
      return { date: e.date, titre: e.titre || "Rassemblement", etat: v === true ? "P" : v === "retard" ? "R" : v === "excuse" ? "E" : "A" };
    });
    const cotisAn = cotisations.filter((c) => c.membreId === m.id && String(c.date || "").startsWith(String(an)));
    const payes = {};
    for (const c of cotisAn) { const mo = String(c.mois || ""); if (mo) payes[mo] = { montant: Number(c.montant) || 0 }; }
    const dus = moisDus.filter((mo) => !payes[mo]);
    const retard = dus.slice();
    const verse = cotisAn.reduce((t, c) => t + (Number(c.montant) || 0), 0);
    const exempt = !!m.exemptCotisation;
    const sps = speciales.map((sp) => {
      const versements = cotisations.filter((c) => c.specialeId === sp.id && c.membreId === m.id);
      const verse = versements.reduce((t, c) => t + (Number(c.montant) || 0), 0);
      if (!verse && !(sp.statut !== "cloturee")) return null;
      return { titre: sp.titre || "Cotisation spéciale", attendu: Number(sp.montant) || 0, verse, ouverte: sp.statut !== "cloturee" };
    }).filter(Boolean);
    const pjs = projets.map((pj) => {
      const pf = projetsFin.find((f) => f.projetId === pj.id) || {};
      const versements = cotisations.filter((c) => c.projetId === pj.id && c.membreId === m.id);
      const verse = versements.reduce((t, c) => t + (Number(c.montant) || 0), 0);
      if (!verse) return null;
      return { titre: pj.titre || "Projet", attendu: Number(pf.montantParMembre) || 0, verse };
    }).filter(Boolean);
    const os = offrandes.filter((o) => o.membreId === m.id && !o.annule && String(o.date || "").startsWith(String(an)));
    return {
      v: 1,
      m: { id: m.id, nom: m.nom || "", prenoms: m.prenoms || "", matricule: m.matricule || "", statut: m.statut || "", fonction: m.fonction || "", pole: m.pole || "", eglise: m.eglise || "", garnisonId: m.garnisonId || "", photoId: m.photoId || "", anniv: m.anniv || "", adhesion: m.adhesion || "" },
      garnisons: gs,
      presences: { taux, p, r, x, a, n, liste: presListe },
      cotis: { annee: an, mensuel, payes, dus, retard, verse, exempt },
      speciales: sps, projets: pjs,
      offrandes: { annee: an, total: os.reduce((t, o) => t + (Number(o.montant) || 0), 0), n: os.length },
    };
  }
  let syncs = 0;
  for (const c of comptes) {
    const m = membres[c.membreId];
    if (!m) continue;
    try {
      const r = resumeCron(m);
      const emp = JSON.stringify(r);
      const existant = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind("espace_membre/" + m.id).first();
      const old = existant ? JSON.parse(existant.data) : {};
      if (JSON.stringify(old.resume) === JSON.stringify(r)) continue;
      await ecrireDoc(env, "set", "espace_membre/" + m.id, { resume: r, empreinte: emp.length.toString(36), majLe: Date.now() });
      syncs++;
    } catch (e) { /* continuer avec le suivant */ }
  }
  return { syncs };
}

/* ───────── en-têtes de sécurité ───────── */
function securiser(r) {
  const n = new Response(r.body, r);
  n.headers.set("x-content-type-options", "nosniff");
  n.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  n.headers.set("x-frame-options", "DENY");
  n.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  n.headers.set("permissions-policy", "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()");
  n.headers.set("x-xss-protection", "1; mode=block");
  return n;
}

/* ───────── Migration automatique de la base de données ───────── */
const SCHEMA_VERSION = 2;
const MIGRATIONS = {
  2: [
    "CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT)",
    "CREATE INDEX IF NOT EXISTS docs_id ON docs(id)",
    "CREATE INDEX IF NOT EXISTS sessions_expire ON sessions(expire)",
    "CREATE INDEX IF NOT EXISTS ia_conso_cle ON ia_conso(cle)",
  ],
};
async function migrer(env) {
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT)").run();
    const row = await env.DB.prepare("SELECT val FROM meta WHERE cle = 'schema_version'").first();
    let cur = row ? Number(row.val) : 1;
    while (cur < SCHEMA_VERSION) {
      cur += 1;
      const stmts = MIGRATIONS[cur];
      if (stmts) for (const sql of stmts) await env.DB.prepare(sql).run();
      await env.DB.prepare("INSERT OR REPLACE INTO meta (cle, val) VALUES ('schema_version', ?)").bind(String(cur)).run();
    }
  } catch (e) { /* migration non bloquante */ }
}
let migrationFaite = false;

/* Nettoyage des sessions expirées */
async function nettoyerSessions(env) {
  try { await env.DB.prepare("DELETE FROM sessions WHERE expire < ?").bind(Date.now()).run(); } catch (e) { /* non bloquant */ }
}

/* Nettoyage des anciennes tentatives de rate-limit (> 1 heure) */
async function nettoyerTentatives(env) {
  try { await env.DB.prepare("DELETE FROM tentatives WHERE depuis < ?").bind(Date.now() - 3600000).run(); } catch (e) { /* non bloquant */ }
}

export default {
  async scheduled(ev, env, ctx) {
    if (ev.cron === "0 2 * * *") ctx.waitUntil(Promise.all([sauvegarder(env), nettoyerMedias(env), syncEspacesMembres(env), nettoyerSessions(env), nettoyerTentatives(env)]));
    ctx.waitUntil(Promise.all([flushNotices(env),sendPortalReminders(env)]));
  },
  async fetch(req, env, ctx) {
    if (!migrationFaite) { migrationFaite = true; try { await migrer(env); } catch (e) { /* non bloquant */ } }
    // Toute erreur non anticipée (y compris rate-limit/DB avant le routeur API)
    // est convertie en réponse neutre : aucun détail SQL n'atteint le visiteur.
    try {
      return securiser(await traiter(req, env, ctx));
    } catch (_) {
      return securiser(erreur("erreur_interne", "Le service est temporairement indisponible. Réessayez plus tard.", 500));
    }
  },
};
async function traiter(req, env, ctx) {
  {
    const url = new URL(req.url);
    const p = url.pathname;
    if (url.hostname === "www.mouvement-sde.org") return Response.redirect("https://mouvement-sde.org" + p + url.search, 301);
    const appHost = url.hostname === "app.mouvement-sde.org";
    if (url.hostname === "mouvement-sde.org" || appHost) {
      // Routage unifié : pages réelles, un guichet de connexion, deux espaces protégés.
      const pagesPubliques = {
        "/formulaire": "/vitrine/formulaire.html",
        "/boutique": "/vitrine/boutique.html",
        "/mouvement": "/vitrine/mouvement.html",
        "/programmes": "/vitrine/programmes.html",
        "/academy": "/vitrine/academy.html",
        "/enseignements": "/vitrine/ressources.html",
        "/missions": "/vitrine/projets.html",
        "/priere": "/vitrine/prieres.html",
        "/contact": "/vitrine/rejoindre.html",
        "/temoignages": "/vitrine/temoignages.html",
        "/soldiers-voice": "/vitrine/soldiers-voice.html",
        "/missions-humanitaires": "/vitrine/missions-humanitaires.html",
        "/rubriques": "/vitrine/plus.html"
      };
      const assetPortail = async (nom) => {
        // ASSETS applique ses redirections HTML même derrière le Worker :
        // /index.html -> / renvoyait les comptes connectés à l'accueil public.
        // Résoudre les chemins de stockage ici pour garder l'URL privée et
        // les paramètres de connexion dans le navigateur, après contrôle du rôle.
        let cible = new URL(nom, url);
        for (let saut = 0; saut < 4; saut++) {
          const r = await env.ASSETS.fetch(new Request(cible, req));
          if (![301, 302, 303, 307, 308].includes(r.status)) {
            const n = new Response(r.body, r);
            n.headers.set("x-content-type-options", "nosniff");
            n.headers.set("x-frame-options", "DENY");
            n.headers.set("referrer-policy", "strict-origin-when-cross-origin");
            /* Pages HTML : toujours revalider, pour que chaque déploiement soit visible immédiatement (navigateurs, PWA, cache intermédiaire). */
            if ((n.headers.get("content-type") || "").includes("text/html") && !/no-store/.test(n.headers.get("cache-control") || "")) n.headers.set("cache-control", "no-cache, must-revalidate");
            return n;
          }
          const location = r.headers.get("location");
          if (!location) throw new Error("Redirection asset sans destination");
          const suivante = new URL(location, cible);
          await r.body?.cancel();
          if (suivante.origin !== url.origin) throw new Error("Redirection asset externe");
          cible = suivante;
        }
        throw new Error("Boucle de redirections asset");
      };
      if (req.method === "GET" || req.method === "HEAD") {
        if (p === "/" || p === "/index.html") {
          if (appHost) {
            const compte = await utilisateur(req, env);
            const destination = compte.connecte
              ? (compte.niveau >= 1 ? "/administration" : "/mon-espace")
              : "/connexion?retour=%2Fportail";
            return new Response(null, {status:302, headers:{location:url.origin + destination, "cache-control":"private, no-store", "x-robots-tag":"noindex, nofollow"}});
          }
          return assetPortail("/vitrine/portail.html");
        }
        if (p === "/vitrine/" || p === "/vitrine/index.html") return Response.redirect(url.origin + "/", 301);
        if (pagesPubliques[p]) {
          const page = await assetPortail(pagesPubliques[p]);
          return p === "/programmes" || p === "/contact" ? injecterSite(page, env, p === "/programmes" ? "programmes" : "contact") : page;
        }
        if (p === "/portail") {
          const u=await utilisateur(req,env);
          const destination=u.connecte?(u.niveau>=1?"/administration":"/mon-espace"):"/connexion?retour=%2Fportail";
          return new Response(null,{status:302,headers:{location:url.origin+destination,"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"}});
        }
        if (p === "/connexion") {
          const u = await utilisateur(req, env);
          if (u.connecte) {
            const retour = url.searchParams.get("retour");
            const dest = retour === "/mon-espace" ? "/mon-espace" : u.niveau >= 1 ? "/administration" : "/mon-espace";
            return Response.redirect(url.origin + dest, 302);
          }
          const r = await assetPortail("/vitrine/connexion-unifiee.html");
          const n = new Response(r.body, r);
          n.headers.set("cache-control", "no-store");
          n.headers.set("x-robots-tag", "noindex, nofollow");
          return n;
        }
        if (p === "/os-v31" || p === "/os-v31/") {
          return new Response(null, {status:302, headers:{
            location:url.origin + "/mon-espace/os-v31" + url.search + url.hash,
            "cache-control":"private, no-store",
            "x-robots-tag":"noindex, nofollow"
          }});
        }
        // Ressources JS/CSS privées, sous le même domaine ; aucune donnée métier statique.
        if (p === "/os-v31/sde-os.js" || p === "/os-v31/sde-os.css") {
          const r = await assetPortail(p);
          const n = new Response(r.body,r);
          n.headers.set("cache-control","private, no-store");
          n.headers.set("x-robots-tag","noindex, nofollow");
          n.headers.set("content-type",p.endsWith(".js")?"text/javascript; charset=utf-8":"text/css; charset=utf-8");
          return n;
        }
        if (["/mon-espace","/administration","/mon-espace/outils","/administration/outils",
             "/mon-espace/os-v31","/administration/os-v31"].includes(p)) {
          const u = await utilisateur(req, env);
          if (!u.connecte) {
            const cible=p.startsWith("/administration")?"/administration":"/mon-espace";
            const mode=url.searchParams.get("mode");
            const modeValide=["inscription","activation","recuperation"].includes(mode)?"&mode="+encodeURIComponent(mode):"";
            return Response.redirect(url.origin + "/connexion?retour=" + encodeURIComponent(cible) + modeValide, 302);
          }
          if (p.startsWith("/administration") && u.niveau < 1)
            return erreur("refuse", "Accès réservé aux responsables autorisés.", 403);
          // Un seul espace interactif : les deux entrées principales ouvrent
          // directement l'application native, jamais une page de liens intermédiaire.
          // Les routes /outils restent disponibles pour les anciens favoris.
          const fichier = p.endsWith("/os-v31")?"/os-v31/index.html":"/index.html";
          const r = await assetPortail(fichier);
          const n = new Response(r.body,r);
          n.headers.set("cache-control","private, no-store");
          n.headers.set("x-robots-tag","noindex, nofollow");
          if (p.endsWith("/os-v31")) n.headers.set("content-security-policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
          return n;
        }
      }
      if (p === "/api/public") return apiPublic(env);
      if (p === "/api/site" && req.method === "GET") return apiSite(env);
      if (p === "/api/visites") return apiVisites(req, env);
      // Les formulaires publics passent par les contrôles d'origine et de débit ci-dessous.
      // Les routes sensibles conservent les contrôles serveur existants :
      // aucun contenu, document ou fichier privé n'est rendu statique.
      const routeInterne = p.startsWith("/api/") || p.startsWith("/_blob/") || p.startsWith("/m/");
      if (!routeInterne) {
        if (!/^\/(vitrine\/|app\.css$|sde-(unified\.css|bridge\.js|private-ui\.css)$|og-sde\.(png|jpg)$|og-app\.png$|icone-(192|512)\.png$|robots\.txt$|sitemap\.xml$|sw-public\.js$|manifest\.webmanifest$|sw\.js$)/.test(p)) {
          const r404 = await assetPortail("/vitrine/404.html");
          return new Response(r404.body, { status: 404, headers: r404.headers });
        }
        const r = await env.ASSETS.fetch(req);
        if (r.ok && /^\/vitrine\/.+\.(jpe?g|png|webp|svg)$/.test(p)) {
          const n = new Response(r.body, r);
          n.headers.set("cache-control", "public, max-age=604800");
          return n;
        }
        return r;
      }
      // Les routes API et médias continuent plus bas, avec le même utilisateur
      // et les mêmes permissions que sur le sous-domaine historique.
    }
    if (p.startsWith("/_blob/")) {
      if (!ID_FICHIER.test(p.slice(7))) return new Response("Introuvable", { status: 404 });
      const r = await env.FICHIERS.getWithMetadata(p.slice(7), { type: "arrayBuffer" });
      if (!r || !r.value) return new Response("Introuvable", { status: 404 });
      return new Response(r.value, { headers: { "content-type": (r.metadata && r.metadata.type) || "application/octet-stream", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } });
    }
    if (p.startsWith("/m/") && (req.method === "GET" || req.method === "HEAD")) return servirMedia(req, env, await utilisateur(req, env), p.split("/")[2]);
    if (p === "/os-v31") return Response.redirect(url.origin + "/os-v31/" + url.search, 302);
    if (p.startsWith("/os-v31/")) {
      if (!["/os-v31/", "/os-v31/index.html", "/os-v31/sde-os.js", "/os-v31/sde-os.css"].includes(p))
        return new Response("Introuvable", {status:404,headers:{"cache-control":"no-store"}});
      const asset = await env.ASSETS.fetch(req);
      const r = new Response(asset.body, asset);
      r.headers.set("cache-control", "no-store");
      r.headers.set("x-robots-tag", "noindex, nofollow");
      r.headers.set("content-type", p.endsWith(".js") ? "text/javascript; charset=utf-8" : p.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8");
      r.headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      return r;
    }
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (p === "/api/sante") return json({ ok: true, version: "2.0.0", ts: Date.now() });
    if (req.method !== "GET") {
      const origine = req.headers.get("origin");
      if (origine && origine !== url.origin) return erreur("refuse", "Origine refusée.", 403);
    }
    /* Rate-limit global par IP */
    // Le plafond global ne vise que les requêtes anonymes. Les espaces membre et
    // administrateur se synchronisent toutes les 4 s (≈ 225 appels / 15 min) : les
    // soumettre au plafond bloquait la connexion de tous les appareils d'une même
    // adresse IP. La connexion garde ses propres freins (8 essais par e-mail, 40 par IP).
    const ipGlobal = ipDe(req);
    const avecSession = !!cookies(req).sde_s;
    if (!avecSession && await rateLimitGlobal(env, ipGlobal)) return erreur("rate_limited", "Trop de requêtes. Réessayez dans quelques minutes.", 429);
    if (p === "/api/formulaire" && req.method === "POST") return apiFormulaire(req, env, ctx);
    if (p === "/api/engager" && req.method === "POST") return apiEngager(req, env, ctx);
    if (p === "/api/preinscription-academy" && req.method === "POST") return apiPreinscriptionAcademy(req, env, ctx);
    if (p === "/api/priere-anonyme" && req.method === "POST") return apiPriereAnonyme(req,env,ctx);
    if (p === "/api/site" && req.method === "GET") return apiSite(env);
    if (p === "/api/visites") return apiVisites(req, env);
    if (p === "/api/ressources-publiques" && req.method === "GET") return apiRessourcesPubliques(env);
    const telechargementPublic=p.match(/^\/api\/ressources-publiques\/([^/]+)\/telecharger$/);
    if(telechargementPublic&&req.method==="GET")return telechargerRessourcePublique(env,telechargementPublic[1]);
    try {
      const u = await utilisateur(req, env);
      // Un cookie invalide ou expiré ne permet pas d'échapper au plafond anonyme.
      if (avecSession && !u.connecte && await rateLimitGlobal(env, ipGlobal))
        return erreur("rate_limited", "Trop de requêtes. Réessayez dans quelques minutes.", 429);
      const rsvp=await eventRsvpApi(req,env,u);if(rsvp)return rsvp;
      const operations=await operationsApi(req,env,u,{list:path=>lireRequete(env,{path}),audit:(rubrique,op)=>portalAudit(env,u,rubrique,op)});if(operations)return operations;
      const qr=await memberQrApi(req,env,u);if(qr)return qr;
      const mur=await prayerWallApi(req,env,u,ctx,{blocked:(key,max)=>bloque(env,key,max),count:key=>compter(env,key)});
      if(mur)return mur;
      const portail=await portalApi(req,env,u,{
        list:path=>lireRequete(env,{path}),write:(op,path,data)=>ecrireDoc(env,op,path,data),
        notify:(type,details)=>notifySde(env,ctx,type,details),
        blocked:(key,max)=>bloque(env,key,max),count:key=>compter(env,key),hash:sha,owners:proprietaires(env)
      });
      if(portail)return portail;
      if (p.startsWith("/api/os/")) return sdeOsApi(req,env,u,url);
      if (p === "/api/notifications-status" && req.method === "GET") {
        if (u.niveau < 3) return erreur("refuse", "Réservé au propriétaire.", 403);
        return json(await mailStatus(env));
      }
      if (p === "/api/os-v31") return await apiSdeOs31(req, env, u);
      if (p === "/api/tableau-de-bord") return apiTableauDeBord(req, env, u);
      if (p === "/api/moi") return json({ connecte: u.connecte, id: u.id, email: u.email, nom: u.nom, photo: u.photo || "", role: u.role, libRole: LIB_ROLES[u.role] || "Visiteur", niveau: u.niveau, membreId: u.membreId || null, matricule: u.matricule || "", ia: !!env.ANTHROPIC_API_KEY && u.niveau >= 1 });
      if (p === "/api/inscription" && req.method === "POST") return apiInscription(req, env, ctx);
      if (p === "/api/connexion" && req.method === "POST") return apiConnexionMdp(req, env);
      if (p === "/api/activation" && req.method === "POST") return apiActivation(req, env);
      if (p === "/api/mot-de-passe" && req.method === "POST") return apiMotDePasse(req, env, u);
      if (p === "/api/mon-espace") return apiMonEspace(env, u);
      if (p === "/api/mon-historique") return apiMonHistorique(req, env, u);
      if (p === "/api/mon-profil" && req.method === "PATCH") return apiMonProfil(req, env, u);
      if (p === "/api/ma-photo" && req.method === "POST") return apiMaPhoto(req, env, u);
      if (p === "/api/mes-cotisations") return apiMesCotisations(req, env, u);
      if (p === "/api/mon-parcours-academy") return apiMonParcoursAcademy(req, env, u);
      if (p === "/api/actualites") return apiActualites(env, u);
      if (p === "/api/priere" && req.method === "POST") return apiPriere(req, env, u, ctx);
      if (p === "/api/absence" && req.method === "POST") return apiAbsence(req, env, u, ctx);
      if (p === "/api/push" && (req.method === "POST" || req.method === "DELETE")) return apiPushSubscription(req, env, u);
      if (p === "/api/vapid-public-key" && req.method === "GET") return json({ key: env.VAPID_PUBLIC_KEY || null });
      if (p === "/api/generate-vapid" && req.method === "POST") {
        if (u.niveau < 3) return erreur("refuse", "Réservé au propriétaire.", 403);
        const keys = await generateVapidKeys();
        return json({ publicKey: keys.publicKey, privateKey: keys.privateKey, instruction: "Ajoutez ces clés comme secrets dans Cloudflare : VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY. La clé privée est confidentielle." });
      }
      if (p === "/api/calendrier.ics") return apiCalendrier(env);
      if (p === "/api/public") return apiPublic(env);
      if (p === "/api/ia" && req.method === "POST") return apiIA(req, env, u);
      if (p === "/api/db" && req.method === "POST") return apiDb(req, env, u, ctx);
      if (p === "/api/sync" && req.method === "POST") return apiSync(req, env, u);
      if (p === "/api/profils" && req.method === "POST") return apiProfils(req, env, u);
      if (p === "/api/deconnexion" && req.method === "POST") {
        if (u.jeton) await env.DB.prepare("DELETE FROM sessions WHERE jeton = ?").bind(u.jeton).run();
        return json({ ok: true }, 200, { "set-cookie": "sde_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
      }
      if (p === "/api/comptes") {
        const reponse=await apiComptes(req,env,u);
        if(req.method!=="GET"&&reponse.ok)await portalAudit(env,u,"comptes","modification");
        return reponse;
      }
      if (p.startsWith("/api/fichiers")) return apiFichiers(req, env, u, url);
      if (p === "/api/import" && req.method === "POST") return apiImport(req, env, u, ctx);
      if (p === "/api/medias" || p.startsWith("/api/medias/")) return apiMedias(req, env, u, url, ctx);
      if (p === "/api/sauvegardes" || p.startsWith("/api/sauvegardes/")) return apiSauvegardes(req, env, u, url);
      if (p === "/api/formulaire-admin") return apiFormulaireAdmin(req, env, u);
      if (p === "/api/engager-admin") return apiEngagerAdmin(req, env, u);
      if (p === "/api/preinscription-academy-admin") return apiPreinscriptionAcademyAdmin(req, env, u);
      return erreur("introuvable", "Route inconnue.", 404);
    } catch (e) {
      return erreur("unavailable", "Service temporairement indisponible. Réessayez plus tard.", 500);
    }
  }
}
