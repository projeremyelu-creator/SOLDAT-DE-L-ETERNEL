// Serveur local d'essai : exécute le Worker avec une base SQLite à la place de D1 (test uniquement).
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import worker from "../src/worker.js";

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fichierBase = process.env.BASE || ":memory:";
const sql = new DatabaseSync(fichierBase);
sql.exec(readFileSync(path.join(RACINE, "schema.sql"), "utf8"));

function stmt(q, args = []) {
  return {
    bind: (...a) => stmt(q, a),
    first: async () => sql.prepare(q).get(...args) ?? null,
    all: async () => ({ results: sql.prepare(q).all(...args) }),
    run: async () => { const r = sql.prepare(q).run(...args); return { meta: { changes: r.changes } }; },
    _exec: () => { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...args), meta: {} }; const r = sql.prepare(q).run(...args); return { results: [], meta: { changes: r.changes } }; },
  };
}
const DB = {
  prepare: (q) => stmt(q),
  batch: async (l) => { sql.exec("BEGIN"); try { const out = l.map((s) => s._exec()); sql.exec("COMMIT"); return out; } catch (e) { sql.exec("ROLLBACK"); throw e; } },
};
const kv = new Map();
const FICHIERS = {
  put: async (k, v, o) => kv.set(k, { v: Buffer.from(v), m: (o && o.metadata) || {} }),
  getWithMetadata: async (k) => (kv.has(k) ? { value: kv.get(k).v, metadata: kv.get(k).m } : { value: null }),
  delete: async (k) => kv.delete(k),
};
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const ASSETS = {
  fetch: async (req) => {
    let p = new URL(req.url).pathname;
    if (p === "/") p = "/index.html";
    const f = path.join(RACINE, "public", p);
    if (!f.startsWith(path.join(RACINE, "public")) || !existsSync(f)) return new Response(readFileSync(path.join(RACINE, "public/index.html")), { headers: { "content-type": TYPES[".html"] } });
    return new Response(readFileSync(f), { headers: { "content-type": TYPES[path.extname(f)] || "application/octet-stream" } });
  },
};
const env = { DB, FICHIERS, ASSETS, GOOGLE_CLIENT_ID: process.env.CLIENT_ID || "test-client.apps.googleusercontent.com", PROPRIETAIRES: "infosoldat@gmail.com" };
globalThis.__sql = sql;

const port = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  const morceaux = [];
  for await (const c of req) morceaux.push(c);
  const corps = Buffer.concat(morceaux);
  const r = await worker.fetch(new Request("http://localhost:" + port + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : corps }), env);
  const h = {};
  r.headers.forEach((v, k) => { h[k] = v; });
  res.writeHead(r.status, h);
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log("pret " + port));
// Commandes de test via stdin : lignes SQL
process.stdin.on("data", (d) => { try { console.log(JSON.stringify(sql.prepare(String(d)).all())); } catch (e) { console.log("ERR " + e.message); } });
