/* ─── Web Push (RFC 8291) pour Cloudflare Workers ─────────────────────
   Implémente le protocole Web Push avec chiffrement aes128gcm
   et authentification VAPID, en utilisant uniquement la Web Crypto API. */

/* ── Helpers base64url ── */
function b64url(arr) {
  let s = ""; for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  const b = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b + "=".repeat((4 - b.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function concat(...arrays) {
  const len = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len); let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/* ── VAPID JWT (ES256) ── */
async function vapidJwt(endpoint, publicKeyB64, privateKeyB64, subject) {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud, exp: now + 43200, sub: subject })));
  const unsigned = header + "." + payload;

  const pubBytes = unb64url(publicKeyB64);
  const privBytes = unb64url(privateKeyB64);
  const key = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256",
    x: b64url(pubBytes.slice(1, 33)),
    y: b64url(pubBytes.slice(33, 65)),
    d: b64url(privBytes),
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  return unsigned + "." + b64url(sig);
}

/* ── Chiffrement aes128gcm (RFC 8291) ── */
async function encrypt(payloadJson, p256dhB64, authB64) {
  const plaintext = new TextEncoder().encode(JSON.stringify(payloadJson));
  const clientPub = unb64url(p256dhB64);
  const clientAuth = unb64url(authB64);

  // Clé ECDH éphémère
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const ephPub = concat(new Uint8Array([0x04]), unb64url(ephJwk.x), unb64url(ephJwk.y));

  // Secret partagé ECDH
  const clientKey = await crypto.subtle.importKey(
    "raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey }, ephemeral.privateKey, 256));

  // HKDF étape 1 : IKM = HKDF(salt=auth, ikm=shared, info="WebPush: info\0" || clientPub || ephPub)
  const info1 = concat(new TextEncoder().encode("WebPush: info\0"), clientPub, ephPub);
  const sharedKey = await crypto.subtle.importKey("raw", shared, { name: "HKDF" }, false, ["deriveBits"]);
  const ikm = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: clientAuth, info: info1 }, sharedKey, 256));

  // Sel aléatoire de 16 octets
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF étape 2 : CEK (16 octets) et nonce (12 octets)
  const ikmKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const cek = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: aes128gcm\0") }, ikmKey, 128);
  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: nonce\0") }, ikmKey, 96));

  // Remplissage : données + délimiteur 0x02
  const padded = concat(plaintext, new Uint8Array([2]));

  // AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  // En-tête aes128gcm : salt(16) || rs(4) || idlen(1) || keyid(ephPub)
  const hdr = new Uint8Array(16 + 4 + 1 + ephPub.length);
  hdr.set(salt);
  new DataView(hdr.buffer).setUint32(16, 4096);
  hdr[20] = ephPub.length;
  hdr.set(ephPub, 21);

  return concat(hdr, cipher);
}

/* ── Envoi d'une notification push à un abonné ── */
export async function sendPushNotification(sub, payload, env) {
  const pubKey = env.VAPID_PUBLIC_KEY;
  const privKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT || "mailto:infosoldat@gmail.com";
  if (!pubKey || !privKey || !sub.p256dh || !sub.auth) return { ok: false, reason: "config" };

  try {
    const body = await encrypt(payload, sub.p256dh, sub.auth);
    const jwt = await vapidJwt(sub.endpoint, pubKey, privKey, subject);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": String(body.byteLength),
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${pubKey}`,
      },
      body,
    });

    // 410 Gone ou 404 = abonnement expiré → à supprimer
    if (res.status === 410 || res.status === 404) return { ok: false, reason: "expired", status: res.status };
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (e) {
    console.warn("Push envoi échoué :", e?.message || e);
    return { ok: false, reason: "error" };
  }
}

/* ── Envoi groupé, avec ciblage obligatoire pour les alertes de direction.
   Une notification de gestion ne doit jamais être envoyée aux soldats. ── */
export async function broadcastPush(env, payload, {audience="all", send=sendPushNotification}={}) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { sent: 0, total: 0 };
  if (!["all","direction"].includes(audience)) return {sent:0,total:0};

  await env.DB.prepare("CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT, auth TEXT, cree INTEGER, PRIMARY KEY (userId, endpoint))").run();
  // Le lien avec comptes exclut aussi les abonnements orphelins.
  const { results } = await env.DB.prepare(
    "SELECT s.userId, s.endpoint, s.p256dh, s.auth, c.role, c.email FROM push_subs s JOIN comptes c ON c.id=s.userId"
  ).all();
  const proprietaires = new Set(String(env.PROPRIETAIRES || "")
    .split(",").map(email=>email.trim().toLowerCase()).filter(Boolean));
  const abonnements = (results || []).filter(sub=>audience!=="direction" ||
    sub.role==="admin" || sub.role==="proprietaire" ||
    proprietaires.has(String(sub.email||"").toLowerCase()));
  if (!abonnements.length) return {sent:0,total:0};

  let sent = 0;
  const expired = [];
  for (const sub of abonnements) {
    const r = await send(sub, payload, env);
    if (r.ok) sent++;
    else if (r.reason === "expired") expired.push(sub);
  }

  // Nettoyer les abonnements expirés
  for (const sub of expired) {
    await env.DB.prepare("DELETE FROM push_subs WHERE userId = ? AND endpoint = ?").bind(sub.userId, sub.endpoint).run();
  }

  return { sent, total: abonnements.length, expired: expired.length };
}

/* ── Génération d'une paire de clés VAPID (à usage unique lors de la configuration) ── */
export async function generateVapidKeys() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);

  const pubBytes = concat(new Uint8Array([0x04]), unb64url(pub.x), unb64url(pub.y));
  return {
    publicKey: b64url(pubBytes),
    privateKey: priv.d,
  };
}
