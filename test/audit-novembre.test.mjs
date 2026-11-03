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

test("Refonte Fusion : espace membre et poste de commandement reconstruits sur des données réelles", () => {
  const ops = lire("frontend/operations.jsx");
  for (const k of ["function MemberDeck", "function PoleDonut", "function QuickActions", "function Spark", "function Ring"]) assert.ok(ops.includes(k), k);
  // Données réelles uniquement : mêmes API que le reste du portail, aucun chiffre figé.
  for (const api of ["/api/mon-parcours-academy", "/api/mes-evenements", "/api/annuaire-portail"]) assert.ok(ops.includes(api), api);
  assert.ok(ops.includes("<MemberDeck portal={portal}/>") && ops.includes("<QuickActions portal={portal}/>") && ops.includes("<PoleDonut portal={portal}/>"));
  assert.ok(ops.includes("(d.mensuel||[]).map(m=>m.entrees)"), "courbe des finances branchée sur la série mensuelle réelle");
  assert.doesNotMatch(ops, /Points cumulés/, "pas d’indicateur sans donnée réelle");
  // Les repères historiques du poste de commandement restent en place.
  assert.ok(ops.includes('<div className="ref-command-overview"><PendingRequests/><CommandPoles portal={portal}/></div>'));
  const css = lire("frontend/reference.css");
  for (const k of [".fu-tile", ".fu-ring", ".fu-donut", ".fu-quick", ".fu-spark", "prefers-reduced-motion:reduce){.fu-tile", "@media(max-width:560px){.fu-tiles{grid-template-columns:repeat(3"]) assert.ok(css.includes(k), k);
});

test("Refonte Fusion : annuaire, pointages et finances reçoivent des tuiles de synthèse réelles", () => {
  const ops = lire("frontend/operations.jsx");
  assert.ok(ops.includes("function Stats("));
  for (const k of ["Membres actifs", "Certifiés Academy", "Rencontres disponibles", "Pointages récents", "Missions suivies"]) assert.ok(ops.includes(k), k);
  assert.ok((ops.match(/<Stats /g) || []).length >= 2);
  assert.ok(lire("frontend/reference.css").includes(".fu-stats"));
});

test("Refonte Fusion : Porte-Voix avec tuiles réelles et style Fusion", () => {
  const app = lire("public/index.html");
  const bloc = app.slice(app.indexOf("VUES.portevoix = function"), app.indexOf("Chambre Haute ═"));
  for (const k of ["pv-stats", "Annonces actives", "Messages ciblés", "Rappels du jour", "rappelsEnAttente()", "S.diffusions.length", "annoncesActives()"]) assert.ok(bloc.includes(k), k);
  const css = lire("public/vitrine/sde-fusion.css");
  for (const k of [".annonce", ".msgbox", ".stat{", ".chip.gold"]) assert.ok(css.includes(k), k);
});

test("Refonte Fusion : bibliothèque, agenda et Academy reçoivent tuiles et anneau réels", () => {
  const ops = lire("frontend/operations.jsx");
  for (const k of ["Chiffres de la bibliothèque", "Chiffres de l’agenda", "Rencontres annoncées", "Progression collective : "]) assert.ok(ops.includes(k), k);
  assert.equal((ops.match(/<Stats /g) || []).length, 4);
});
