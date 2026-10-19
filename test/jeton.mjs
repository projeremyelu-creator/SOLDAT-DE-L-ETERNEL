// Vérifie la validation des jetons Google avec une clé de test.
import worker from "../src/worker.js";
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
async function jeton(charge, kid = "k1") {
  const h = b64({ alg: "RS256", kid, typ: "JWT" }), p = b64(charge);
  const s = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(h + "." + p))).toString("base64url");
  return `${h}.${p}.${s}`;
}
const vraiFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => (String(u).includes("oauth2/v3/certs") ? new Response(JSON.stringify({ keys: [jwk] })) : vraiFetch(u, o));
const appels = [];
const env = { GOOGLE_CLIENT_ID: "abc.apps.googleusercontent.com", PROPRIETAIRES: "chef@gmail.com", DB: {
  prepare: (q) => ({ bind: (...a) => ({ run: async () => { appels.push(q); return {}; }, first: async () => null, all: async () => ({ results: [] }) }) }),
  batch: async (l) => l.map(() => ({ meta: {} })) } };
const base = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, email: "chef@gmail.com", email_verified: true, name: "Chef", exp: Math.floor(Date.now() / 1000) + 600 };
const essai = async (nom, t, attendu) => {
  const r = await worker.fetch(new Request("https://app.test/api/connexion", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.test" }, body: JSON.stringify({ credential: t }) }), env);
  console.log((r.status === attendu ? "OK   " : "ÉCHEC ") + nom + " → " + r.status + (r.headers.get("set-cookie") ? " (cookie)" : ""));
};
await essai("jeton valide", await jeton(base), 200);
await essai("mauvaise audience", await jeton({ ...base, aud: "autre" }), 401);
await essai("jeton expiré", await jeton({ ...base, exp: 10 }), 401);
await essai("mauvais émetteur", await jeton({ ...base, iss: "https://pirate.example" }), 401);
const t = await jeton(base); await essai("signature altérée", t.slice(0, -4) + "AAAA", 401);
await essai("clé inconnue", await jeton(base, "k9"), 401);
const r = await worker.fetch(new Request("https://app.test/api/db", { method: "POST", headers: { "content-type": "application/json", origin: "https://pirate.example" }, body: "{}" }), env);
console.log((r.status === 403 ? "OK   " : "ÉCHEC ") + "origine étrangère refusée → " + r.status);
