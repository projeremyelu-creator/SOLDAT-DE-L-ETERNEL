import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const { JSDOM } = createRequire(import.meta.url)("jsdom");
const script = readFileSync("public/vitrine/portal.js", "utf8");
const pages = ["index.html", "academy.html", "formulaire.html", "engagements.html"];
const load = (page) => {
  const html = readFileSync("public/vitrine/" + page, "utf8");
  const url = "https://mouvement-sde.org/" + (page === "index.html" ? "" : "vitrine/" + page);
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return { dom, d: dom.window.document, w: dom.window };
};

test("vitrine : parcours d'accueil avec huit liens valides vers des sections et pages existantes", () => {
  const p = load("index.html");
  const cartes = [...p.d.querySelectorAll("#parcours-sde .sde-parcours-card")];
  assert.equal(cartes.length, 8);
  for (const a of cartes) {
    assert.ok(a.querySelector("strong"), "titre de parcours manquant");
    const href = a.getAttribute("href");
    if (href.startsWith("#")) assert.ok(p.d.getElementById(href.slice(1)), href + " doit pointer sur une section existante");
    else assert.equal(href, "/vitrine/academy.html");
  }
  assert.ok(p.d.getElementById("f-venue"));
  assert.ok(p.d.getElementById("form-rejoindre"));
  p.dom.window.close();
});

for (const page of pages) {
  test("navigation à cinq onglets et contenus intacts : " + page, () => {
    const p = load(page);
    const items = [...p.d.querySelectorAll(".sde-global-nav a[data-sde-tab]")];
    assert.deepEqual(items.map((a) => a.textContent.trim()), ["Accueil", "Membres", "Agenda", "Finances", "Plus"]);
    assert.equal(p.d.querySelectorAll(".sde-global-nav").length, 1);
    assert.equal(items[3].href, "https://app.mouvement-sde.org/#connexion");
    assert.equal(items[4].href, page === "index.html" ? "https://mouvement-sde.org/#parcours-sde" : "https://mouvement-sde.org/#parcours-sde");
    assert.ok(p.d.body.classList.contains("sde-portal"));
    assert.equal(p.d.querySelectorAll(".sde-global-nav a[aria-current='page']").length, 1);
    if (page !== "index.html") assert.equal(p.d.querySelector("header.entete").nextElementSibling, p.d.querySelector(".sde-global-nav"));
    if (page === "formulaire.html" || page === "academy.html") {
      const form = p.d.getElementById("formulaire");
      assert.ok(form, "formulaire d'origine conservé");
      assert.ok([...form.querySelectorAll("input, select, textarea")].length > 1);
    }
    if (page === "engagements.html") {
      assert.ok(p.d.querySelector("#qui"), "contrôle existant conservé");
    }
    if (page === "index.html") {
      assert.ok(p.d.getElementById("nav-principal"), "menu principal conservé");
      assert.equal(items[0].getAttribute("aria-current"), "page");
      p.w.location.hash = "#agenda";
      p.w.dispatchEvent(new p.w.Event("hashchange"));
      assert.equal(items[2].getAttribute("aria-current"), "page");
      assert.ok(p.d.getElementById("infire"), "section IN FIRE préservée");
    }
    p.dom.window.close();
  });
}
