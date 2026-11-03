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
  assert.match(lire("public/vitrine/portail.html"), /class="ap-hero"/);
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

test("Refonte Fusion : Chambre Haute avec tuiles réelles, cotisations et prières au style Fusion", () => {
  const app = lire("public/index.html");
  const bloc = app.slice(app.indexOf("VUES.chambre = function"), app.indexOf("function vueChaine"));
  for (const k of ["Chiffres de la Chambre Haute", "enP.filter((p) => p.urgent).length", "exa.length", "intercesseursSemaine().length"]) assert.ok(bloc.includes(k), k);
  const css = lire("public/vitrine/sde-fusion.css");
  for (const k of [".cot-mois i.ok", ".cot-mois i.du", ".pr-row.urgent", ".cr-jour.auj", ".chip-btn.on"]) assert.ok(css.includes(k), k);
});

test("Refonte Fusion : agenda avec tuiles réelles, projets et fiche membre au style Fusion", () => {
  const app = lire("public/index.html");
  const bloc = app.slice(app.indexOf("VUES.agenda = function"), app.indexOf("Secrétariat ═"));
  for (const k of ["Chiffres de l’agenda", "av.length", "pa.length", "moisEnCours", "fmtCourt(av[0].date)"]) assert.ok(bloc.includes(k), k);
  const css = lire("public/vitrine/sde-fusion.css");
  for (const k of [".subtab.on", ".day-h", ".bar i", ".ident{", ".ident h3"]) assert.ok(css.includes(k), k);
});

test("Palette Tactique et modules tactiques fondés sur des données réelles", () => {
  const shell = lire("frontend/reference-shell.jsx");
  assert.match(shell, /\['tactique','Tactique · Bleu nuit · Bordeaux · Or'\]/);
  assert.match(lire("public/index.html"), /fusion\|ivoire\|terracotta\|militaire\|violet\|tactique/);
  assert.match(lire("public/index.html"), /sde-tactique\.css/);
  const css = lire("public/vitrine/sde-tactique.css");
  for (const k of ['data-sde-palette="tactique"', "#6b1730", "--pal-surface"]) assert.ok(css.includes(k), k);
  const ops = lire("frontend/operations.jsx");
  for (const k of ["function RankPath", "function CountryBoard", "rankIndex", "fonction de responsabilité confiée".replace("f", "F")]) assert.ok(ops.includes(k), k);
  assert.match(ops, /Grade déduit automatiquement/);
  assert.ok(lire("src/operations.js").includes("pays:paysDe(m.data.garnisonId)"));
  const app = lire("public/index.html");
  assert.ok(app.includes("function radarPriere") && app.includes("out += radarPriere(enP)"));
});
