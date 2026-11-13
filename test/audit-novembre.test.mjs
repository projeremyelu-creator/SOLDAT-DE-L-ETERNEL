import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
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
  const sitemap=lire("public/sitemap.xml");
  assert.match(sitemap, /mouvement-sde\.org\/rubriques</);
  assert.doesNotMatch(sitemap, /mouvement-sde\.org\/plus</);
});

test("Générateur de QR servi par le site, plus par un CDN", () => {
  assert.ok(existsSync(new URL("../public/vitrine/vendor/qrcode-generator-1.4.4.js", import.meta.url)));
  const i = lire("public/index.html");
  assert.doesNotMatch(i, /jsdelivr/);
  assert.match(i, /\/vitrine\/vendor\/qrcode-generator-1\.4\.4\.js/);
});

test("Refonte Fusion historique : site public conservé, palette privée officielle bleu nuit/ivoire/or", () => {
  const css = lire("public/vitrine/sde-fusion.css");
  for (const k of ["--fu-gold", "data-sde-palette=fusion", "body.sde-unifie", ".fu-strip"]) assert.ok(css.includes(k), k);
  const app = lire("public/index.html");
  assert.match(app, /sde-fusion\.css/);
  assert.match(app, /"fusion-04"/);
  assert.match(lire("frontend/reference-shell.jsx"), /\['tactique','SDE officiel · Bleu nuit · Ivoire · Or'\]/);
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
  assert.match(shell, /\['tactique','SDE officiel · Bleu nuit · Ivoire · Or'\]/);
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

test("Onglets : trois familles Commandement, Spiritualité, Missions, chaque module dans une seule famille", () => {
  const app = lire("public/index.html"), css = lire("public/vitrine/sde-fusion.css");
  for (const k of ["const FAMILLES", "const FAM_DE", 'cmd: { nom: "Commandement"', 'spi: { nom: "Spiritualité"', 'mis: { nom: "Missions"', 'data-fam="${famDe(o.id)}"', 'class="fam-h"']) assert.ok(app.includes(k), k);
  const bloc = app.slice(app.indexOf("const FAM_DE"), app.indexOf("const famDe"));
  const ids = [...app.slice(app.indexOf("const ONGLETS"), app.indexOf("const PRIMAIRES")).matchAll(/\{ id: "(\w+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 14);
  for (const id of ids) assert.equal((bloc.match(new RegExp(`\\b${id}: "(cmd|spi|mis)"`, "g")) || []).length, 1, "famille de " + id);
  for (const k of ["--fam-cmd:#1b2f6b", "--fam-spi:#5b21b6", "--fam-mis:#3f6b34", ".tile[data-fam]", ".nav-btn[data-fam]"]) assert.ok(css.includes(k), k);
});

test("Portail React : les modules du menu portent leur famille de couleur", () => {
  const shell = lire("frontend/reference-shell.jsx"), css = lire("frontend/reference.css");
  assert.match(shell, /const FAM=\{[^}]*'rendezvous':'mis'[^}]*'academy-direction':'spi'[^}]*\};const famOf=/);
  assert.equal((shell.match(/data-fam=\{famOf\(module\)\}/g) || []).length, 2, "menu latéral et menu mobile");
  for (const k of ["--fam-cmd:#1b2f6b", "--fam-spi:#5b21b6", "--fam-mis:#3f6b34", 'button[data-fam="mis"]']) assert.ok(css.includes(k), k);
});


test("Navigation publique SDE : même header, footer et tiroir à cinq catégories",()=>{
 const html=lire("public/vitrine/portail.html");
 const dom=new JSDOM(html,{url:"https://mouvement-sde.org/",runScripts:"outside-only"});
 try{
  const w=dom.window,d=w.document;
  w.eval(lire("public/vitrine/sde-shell-public.js"));
  d.dispatchEvent(new w.Event("DOMContentLoaded"));
  const header=d.querySelector(".sde-shell-header");
  assert.ok(header,"header unique monté");
  assert.equal(d.querySelectorAll("header.site-header").length,1);
  assert.equal(d.querySelectorAll("footer.site-footer").length,1);
  assert.equal(header.querySelectorAll(".sde-shell-mega-group").length,5);
  const headings=[...header.querySelectorAll(".sde-shell-mega-group>summary")].map(x=>x.textContent);
  assert.deepEqual(headings,["Le Mouvement","Programmes & Agenda","Missions & Impact","Médias & Ressources","S’engager"]);
  assert.ok(header.querySelector('.sde-shell-mega-group a[href="/soutenir"]'));
  assert.ok(header.querySelector('.sde-shell-portal[href="/portail"]'));
  const nav=d.querySelector(".sde-shell-bottom");
  assert.equal(nav.children.length,5);
  assert.deepEqual([...nav.querySelectorAll("a")].map(a=>a.getAttribute("href")),
    ["/","/programmes#agenda","/contact#rejoindre","/soutenir"]);
  const toggle=nav.querySelector(".sde-shell-open"),overlay=d.querySelector(".sde-shell-overlay");
  toggle.click();
  assert.equal(overlay.hidden,false);
  assert.equal(toggle.getAttribute("aria-expanded"),"true");
  assert.equal(overlay.querySelectorAll(".sde-shell-drawer-group").length,5);
  const search=overlay.querySelector('input[type="search"]');
  search.value="formation";search.dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.ok([...overlay.querySelectorAll(".sde-shell-drawer-group a")].some(x=>!x.hidden&&/Formation/.test(x.textContent)));
  overlay.querySelector(".sde-shell-close").click();
  assert.equal(overlay.hidden,true);
 }finally{dom.window.close();}
});

test("Corrections UX : aucun indicateur ni compteur vide, contact avec un seul guichet, dons sûrs",()=>{
 const home=lire("public/vitrine/portail.html");
 const hero=home.slice(home.indexOf('class="ap-hero"'),home.indexOf("</section>",home.indexOf('class="ap-hero"')));
  const buttons=hero.match(/<nav class="ap-actions[^"]*"[^>]*>[\s\S]*?<\/nav>/)?.[0]||"";
  assert.equal((buttons.match(/<a /g)||[]).length,4,'quatre accès de la refonte Work 2+3');
  for(const route of ['/mouvement','/contact#rejoindre','/programmes#agenda','/portail'])assert.ok(buttons.includes('href="'+route+'"'),'Accès manquant : '+route);
 assert.match(home,/>Vie de l’Esprit<\/strong>/);
 assert.match(home,/>Gouvernance &amp; Ordre<\/strong>/);
 assert.match(home,/>Terrain &amp; Compassion<\/strong>/);
 assert.match(home,/class="ap-indicateurs"[^>]+hidden/);
 const counters=lire("public/vitrine/sde-versets.js");
 assert.match(counters,/Number\.isSafeInteger/);
 assert.match(counters,/if \(!bloc\.isConnected\)/);
 const form=lire("public/vitrine/rejoindre.html");
 assert.match(form,/href="\/portail\?mode=inscription"/);
 assert.doesNotMatch(form,/href="\/mon-espace\?mode=inscription"/);
 const soutien=lire("public/vitrine/soutenir.html");
 assert.match(soutien,/class="sde-donation-overview"/);
 assert.match(soutien,/id="pay-liste" hidden/);
 assert.match(soutien,/id="formulaire"/);
 const login=lire("public/vitrine/connexion-unifiee.html");
 assert.doesNotMatch(login,/reference-portail\.jpg/);
 assert.doesNotMatch(login,/id="sde-splash"/);
 const css=lire("public/vitrine/sde-connexion-empreinte.css");
 assert.match(css,/\.site-header,\.infire-takeover,\.sde-auth-nav/);
});
