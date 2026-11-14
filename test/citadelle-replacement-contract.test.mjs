import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const vitrine = "public/vitrine";
const legacyThemes = ["sde-hybride-integral-2027.css", "sde-recette-captures-20261113.css"];
const citadelleTheme = "/vitrine/sde-citadelle-celeste-2027.css";
const read = (path) => readFileSync(path, "utf8");
const htmlFiles = ["public/index.html", ...readdirSync(vitrine).filter((name) => name.endsWith(".html")).map((name) => join(vitrine, name))];
const finalThemePages = htmlFiles.filter((file) => read(file).includes(citadelleTheme));

test("Citadelle remplace le dernier calque hérité sur chaque écran concerné", () => {
  assert.ok(finalThemePages.length > 0, "Le contrat doit couvrir les pages qui chargent le thème Citadelle.");
  for (const file of finalThemePages) {
    const html = read(file);
    const count = html.split(citadelleTheme).length - 1;
    assert.equal(count, 1, `${file} doit charger une seule feuille Citadelle finale.`);
    for (const legacy of legacyThemes) {
      assert.equal(html.includes(legacy), false, `${file} ne doit plus charger ${legacy}.`);
    }
  }
});

test("le manifeste de cache ne référence aucun calque visuel retiré", () => {
  for (const file of ["public/sw.js", "public/sw-public.js", "public/vitrine/sw-public.js"]) {
    const source = read(file);
    for (const legacy of legacyThemes) {
      assert.equal(source.includes(legacy), false, `${file} référence encore ${legacy}.`);
    }
  }
});

test("le thème Citadelle porte les jetons, le focus et le mode de mouvement réduit", () => {
  const path = "public/vitrine/sde-citadelle-celeste-2027.css";
  assert.ok(existsSync(path), "La feuille Citadelle finale doit exister.");
  const css = read(path);
  for (const token of ["#071226", "#f4ebdd", "#d8b455", "#3a245f", "#405a45", ":focus-visible", "prefers-reduced-motion"]) {
    assert.ok(css.includes(token), `Jeton ou garantie d’accessibilité absent : ${token}.`);
  }
});

test("la Porte de la Citadelle garde six axes officiels et deux appels héro maximum", () => {
  const home = read("public/vitrine/portail.html");
  const axes = ["Rassembler et Unir", "Former", "Réveiller", "Restaurer", "Équiper", "Envoyer"];
  for (const axis of axes) assert.ok(home.includes(axis), `Axe officiel absent : ${axis}.`);
  const hero = home.match(/<section class="ap-hero[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(hero, "Le héros public doit rester identifiable.");
  assert.ok((hero.match(/class="ap-btn/g) ?? []).length <= 2, "Le héros ne doit proposer que deux actions primaires.");
});

test("le portail est l'unique entrée membre et la connexion reste isolée", () => {
  const publicHtml = ["portail.html", "mouvement.html", "programmes.html", "projets.html", "prieres.html", "ressources.html", "soutenir.html", "rejoindre.html"].map((name) => read(join(vitrine, name))).join("\n");
  assert.equal(publicHtml.includes('href="/mon-espace"'), false, "Aucun ancien point d’entrée membre ne doit être exposé.");
  assert.ok(publicHtml.includes('href="/portail"'), "Le point d’entrée membre /portail doit être disponible.");
  const login = read("public/vitrine/connexion-unifiee.html");
  assert.equal(login.includes('class="site-header"'), false, "La connexion ne doit pas rendre l’en-tête public.");
  assert.equal(login.includes("sde-public-bottom-nav"), false, "La connexion ne doit pas rendre la navigation basse publique.");
});

test("les gabarits privés ne rendent ni navigation publique ni métriques inventées", () => {
  for (const file of ["public/index.html", "public/vitrine/tableau-membre.html", "public/vitrine/tableau-administration.html"]) {
    const html = read(file);
    assert.equal(html.includes("sde-public-bottom-nav"), false, `${file} ne doit pas embarquer la navigation publique.`);
    assert.equal(/(?:membres actifs|présences|missions|intercession)\s*[:=]\s*\d+/i.test(html), false, `${file} ne doit pas figer de KPI privé.`);
  }
});


test("La Citadelle Céleste v3 est compilée comme unique charte finale de toutes les pages", () => {
  const build = read("scripts/build-experience.mjs");
  assert.ok(build.includes("integrerToutesPages('public')"));
  assert.ok(build.includes("installerCitadelleFinale"));
  assert.ok(build.includes("citadelStylePath+'?v='+revision"));
  const home = read("public/vitrine/portail.html");
  assert.ok(home.includes("LA CITADELLE"));
  assert.ok(home.includes("CÉLESTE"));
  assert.ok(home.includes("UNE ARMÉE SPIRITUELLE. UN ÉCOSYSTÈME VIVANT."));
  const css = read("public/vitrine/sde-citadelle-celeste-2027.css");
  assert.ok(css.includes("/vitrine/illus/citadelle-celeste.svg"));
  assert.ok(css.includes("Plus Jakarta Sans"));
  assert.ok(existsSync("public/vitrine/illus/citadelle-celeste.svg"));
});

test("les quatre portes de la Citadelle sont quatre cartes tactiles réellement responsives", () => {
 const home=read("public/vitrine/portail.html");
 const css=read("public/vitrine/sde-citadelle-celeste-2027.css");
 const quick=home.match(/<section class="sde-citadelle-quicknav"[\s\S]*?<\/section>/)?.[0]||"";
 assert.ok(quick,"Section quatre portes absente");
 assert.deepEqual([...quick.matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]),["/mouvement","/contact#rejoindre","/programmes#agenda","/portail"]);
 assert.ok(css.includes("RÉPARATION CITADELLE v3.2"));
 assert.match(css,/nav\.sde-citadelle-quicknav-items\s*\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/@media\(max-width:760px\)[\s\S]*?nav\.sde-citadelle-quicknav-items\s*\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/nav\.sde-citadelle-quicknav-items > a\s*\{[\s\S]*?display:flex!important/);
 assert.match(css,/nav\.sde-citadelle-quicknav-items > a strong\s*\{[\s\S]*?text-decoration:none!important/);
});
