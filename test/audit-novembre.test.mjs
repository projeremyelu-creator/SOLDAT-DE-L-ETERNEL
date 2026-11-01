import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const lire = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("Hachage : 100 000 itérations et recalcul des anciens hachages à la connexion", () => {
  const w = lire("src/worker.js");
  assert.match(w, /const ITERATIONS = 100000/);
  assert.match(w, /split\("\$"\)\[1\]\) < ITERATIONS/);
});
test("Socle CSP posé sur toutes les réponses sans casser les scripts", () => {
  const w = lire("src/worker.js");
  assert.match(w, /object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'/);
});
test("JSZip est servi par le site, plus par un CDN", () => {
  assert.ok(existsSync(new URL("../public/vitrine/vendor/jszip-3.10.1.min.js", import.meta.url)));
  const i = lire("public/index.html");
  assert.doesNotMatch(i, /jsdelivr\.net\/npm\/jszip/);
  assert.match(i, /\/vitrine\/vendor\/jszip-3\.10\.1\.min\.js/);
});
test("Affiche IN FIRE servie en WebP", () => {
  assert.ok(existsSync(new URL("../public/vitrine/infire-2026/affiche-officielle.webp", import.meta.url)));
  for (const f of ["public/vitrine/index.html", "public/vitrine/programmes.html", "frontend/experience.jsx", "public/vitrine/sde-experience.js"])
    assert.doesNotMatch(lire(f), /affiche-officielle\.png/, f);
});
test("Pages publiques : canonical et Open Graph", () => {
  for (const f of ["formulaire", "academy", "plus"]) {
    const h = lire(`public/vitrine/${f}.html`);
    assert.match(h, /rel="canonical"/, f);
    assert.match(h, /property="og:title"/, f);
  }
  assert.match(lire("public/sitemap.xml"), /mouvement-sde\.org\/plus</);
});
