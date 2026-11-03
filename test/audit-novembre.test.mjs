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

test("Générateur de QR servi par le site, plus par un CDN", () => {
  assert.ok(existsSync(new URL("../public/vitrine/vendor/qrcode-generator-1.4.4.js", import.meta.url)));
  const i = lire("public/index.html");
  assert.doesNotMatch(i, /jsdelivr/);
  assert.match(i, /\/vitrine\/vendor\/qrcode-generator-1\.4\.4\.js/);
});

test("Refonte Fusion 03+04 : charte violet/or chargée partout, palette fusion par défaut", () => {
  const css = lire("public/vitrine/sde-fusion.css");
  for (const k of ["--fu-gold", "data-sde-palette=fusion", "body.sde-unifie", ".fu-strip"]) assert.ok(css.includes(k), k);
  const app = lire("public/index.html");
  assert.match(app, /sde-fusion\.css/);
  assert.match(app, /"fusion-04"/);
  assert.match(lire("frontend/reference-shell.jsx"), /\['fusion','Fusion · Violet · Vert · Or'\]/);
  for (const f of ["portail", "mouvement", "programmes", "missions-humanitaires", "ressources", "rejoindre", "prieres", "tableau-administration", "tableau-membre"])
    assert.match(lire(`public/vitrine/${f}.html`), /sde-fusion\.css/, f);
  assert.match(lire("public/vitrine/portail.html"), /class="fu-strip"/);
});
