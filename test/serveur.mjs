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
  put: async (k, v, o) => kv.set(k, { v: Buffer.from(v instanceof ArrayBuffer ? new Uint8Array(v) : v), m: (o && o.metadata) || {} }),
  getWithMetadata: async (k) => (kv.has(k) ? { value: kv.get(k).v, metadata: kv.get(k).m } : { value: null }),
  delete: async (k) => kv.delete(k),
  get: async (k, o) => { if (!kv.has(k)) return null; const b = kv.get(k).v; return (o && o.type === "arrayBuffer") || o === "arrayBuffer" ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b.toString("utf8"); },
  list: async ({ prefix = "" } = {}) => ({ keys: [...kv.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, x]) => ({ name, metadata: x.m })) }),
};
const TYPES = { ".xml": "application/xml", ".txt": "text/plain", ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const ASSETS = {
  fetch: async (req) => {
    let p = new URL(req.url).pathname;
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(RACINE, "public", p);
    if (!f.startsWith(path.join(RACINE, "public")) || !existsSync(f)) return new Response(readFileSync(path.join(RACINE, "public/index.html")), { headers: { "content-type": TYPES[".html"] } });
    return new Response(readFileSync(f), { headers: { "content-type": TYPES[path.extname(f)] || "application/octet-stream" } });
  },
};
const env = { DB, FICHIERS, ASSETS, GOOGLE_CLIENT_ID: process.env.CLIENT_ID || "test-client.apps.googleusercontent.com", PROPRIETAIRES: "infosoldat@gmail.com" };
// Fausse API Claude pour les essais d'Éliézer (FAUX_IA=1)
if (process.env.FAUX_IA) {
  env.ANTHROPIC_API_KEY = "cle-essai";
  const { appendFileSync } = await import("node:fs");
  const vrai = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    if (!String(u).startsWith("https://api.anthropic.com/")) return vrai(u, o);
    const b = JSON.parse(o.body);
    if (process.env.IA_JOURNAL) appendFileSync(process.env.IA_JOURNAL, JSON.stringify({ model: b.model, key: o.headers["x-api-key"], tools: (b.tools || []).map((t) => t.name), messages: b.messages }) + "\n");
    const der = b.messages[b.messages.length - 1];
    const ev = [];
    const e = (type, data) => ev.push(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    e("message_start", { message: { id: "m1", role: "assistant", content: [] } });
    const texte = (i, t) => { e("content_block_start", { index: i, content_block: { type: "text", text: "" } }); for (const morceau of t.match(/.{1,12}/gs)) e("content_block_delta", { index: i, delta: { type: "text_delta", text: morceau } }); e("content_block_stop", { index: i }); };
    if (Array.isArray(der.content) && der.content[0].type === "tool_result") {
      const r = JSON.parse(der.content[0].content);
      texte(0, "Prochain rendez-vous : **" + (r[0] ? r[0].titre : "aucun") + "**.");
      e("message_delta", { delta: { stop_reason: "end_turn" } });
    } else if (b.tools && b.tools.some((t) => t.name === "agenda")) {
      texte(0, "Je consulte l’agenda.");
      e("content_block_start", { index: 1, content_block: { type: "tool_use", id: "t1", name: "agenda", input: {} } });
      e("content_block_delta", { index: 1, delta: { type: "input_json_delta", partial_json: '{"periode":' } });
      e("content_block_delta", { index: 1, delta: { type: "input_json_delta", partial_json: '"avenir"}' } });
      e("content_block_stop", { index: 1 });
      e("message_delta", { delta: { stop_reason: "tool_use" } });
    } else {
      texte(0, '```json\n{"surtitre":"Grande soirée","titre":"","soustitre":"Thème essai","texte":"Venez nombreux.","verset":"","reference":""}\n```');
      e("message_delta", { delta: { stop_reason: "end_turn" } });
    }
    e("message_stop", {});
    return new Response(ev.join(""), { headers: { "content-type": "text/event-stream" } });
  };
}
globalThis.__sql = sql;

const port = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  const morceaux = [];
  for await (const c of req) morceaux.push(c);
  const corps = Buffer.concat(morceaux);
  const r = await worker.fetch(new Request("http://" + (req.headers.host || "localhost:" + port) + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : corps }), env);
  const h = {};
  r.headers.forEach((v, k) => { h[k] = v; });
  res.writeHead(r.status, h);
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log("pret " + port));
// Commandes de test via stdin : lignes SQL
process.stdin.on("data", (d) => { try { console.log(JSON.stringify(sql.prepare(String(d)).all())); } catch (e) { console.log("ERR " + e.message); } });
