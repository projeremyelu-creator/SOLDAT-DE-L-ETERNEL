import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const cssPath = "public/vitrine/sde-mobile-correctifs-20261103.css";
const css = read(cssPath);
const app = read("public/index.html");
const accueil = read("public/vitrine/portail.html");
// Le build remplace les versions ?v=... par le SHA GitHub : tester le chemin stable.
const linkPath = "/vitrine/sde-mobile-correctifs-20261103.css";
const linkPattern = /<link rel="stylesheet" href="\/vitrine\/sde-mobile-correctifs-20261103\.css(?:\?v=[^"]+)?">/g;

test("le même correctif mobile est chargé sur les deux interfaces réellement servies", () => {
  assert.equal([...app.matchAll(linkPattern)].length, 1);
  assert.equal([...accueil.matchAll(linkPattern)].length, 1);
  assert.ok(app.indexOf(linkPath) > app.indexOf("/vitrine/sde-tactique.css"));
  assert.ok(accueil.indexOf(linkPath) > accueil.indexOf("/vitrine/sde-fusion.css"));
});

test("le style respecte les deux en-têtes et les interactions privées", () => {
  for (const selector of [
    ".site-header .site-header-inner",
    ".site-brand b",
    ".site-search",
    ".site-portal-cta",
    ".sde-direct-header",
    "#sde-direct-menu-toggle",
    ".sde-ambiance-ctl",
    ".nav .nav-btn",
    ".main"
  ]) {
    assert.ok(css.includes(selector), "Sélecteur attendu : " + selector);
  }
  assert.match(css, /max-width:\s*760px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /aria-pressed="true"/);
});

test("feuille CSS équilibrée et aucune dépendance de données introduite", () => {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  let level = 0;
  for (const char of clean) {
    if (char === "{") level += 1;
    if (char === "}") level -= 1;
    assert.ok(level >= 0, "Accolade fermante isolée");
  }
  assert.equal(level, 0);
  assert.doesNotMatch(css, /fetch\s*\(|\/api\/|document\.cookie|localStorage/);
});

test("les routes privées continuent à vérifier la session et les rôles", () => {
  const worker = read("src/worker.js");
  assert.match(worker, /\["\/mon-espace","\/administration"/);
  assert.match(worker, /if \(!u\.connecte\)/);
  assert.match(worker, /p\.startsWith\("\/administration"\) && u\.niveau < 1/);
});
