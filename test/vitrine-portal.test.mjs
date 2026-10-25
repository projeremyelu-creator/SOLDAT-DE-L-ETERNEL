import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const { JSDOM } = createRequire(import.meta.url)("jsdom");
const script = readFileSync("public/vitrine/portal.js", "utf8");
const discovery = readFileSync("public/vitrine/discovery.js", "utf8");
const pages = ["index.html", "academy.html", "formulaire.html", "engagements.html"];
const load = (page) => {
  const html = readFileSync("public/vitrine/" + page, "utf8");
  const url = "https://mouvement-sde.org/" + (page === "index.html" ? "" : "vitrine/" + page);
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(script);
  if (page === "index.html") dom.window.eval(discovery);
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
    assert.equal(items[3].href, "https://app.mouvement-sde.org/#finances");
    assert.equal(items[4].href, "https://mouvement-sde.org/vitrine/plus");
    assert.ok(p.d.body.classList.contains("sde-portal"));
    assert.equal(p.d.querySelectorAll(".sde-global-nav a[aria-current='page']").length, 1);
    if (page !== "index.html") {
      assert.equal(p.d.querySelector("header.entete").nextElementSibling, p.d.querySelector(".sde-global-nav"));
      assert.ok(p.d.querySelector(".sde-skip[href^='#']"), "lien de navigation clavier");
    }
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

test("recherche sur les programmes : filtrage sans altérer les textes ni les liens", () => {
  const p = load("index.html");
  const input = p.d.getElementById("sde-search-programmes");
  const articles = [...p.d.querySelectorAll("#programmes .programmes .programme")];
  const namesBefore = articles.map(a => a.textContent);
  assert.ok(input, "recherche des programmes disponible");
  const q = "Soldiers Academy";
  input.value = q;
  input.dispatchEvent(new p.w.Event("input", { bubbles:true }));
  const visible = articles.filter(a => !a.hidden);
  assert.equal(visible.length, 1);
  assert.ok(visible[0].textContent.includes(q));
  assert.deepEqual(articles.map(a => a.textContent), namesBefore);
  input.value = "";
  input.dispatchEvent(new p.w.Event("input", { bubbles:true }));
  assert.equal(articles.filter(a=>!a.hidden).length, articles.length);
  p.dom.window.close();
});
test("recherche ressources : filtres d'origine, accents français et état vide", async () => {
  const p = load("index.html");
  const input = p.d.getElementById("sde-search-ressources");
  const cards = [...p.d.querySelectorAll("#ressources-grille .ressource-carte")];
  assert.ok(input);
  const sourceCount = cards.length;
  input.value = "révélation";
  input.dispatchEvent(new p.w.Event("input", { bubbles:true }));
  assert.ok(cards.some(c=>!c.hidden));
  input.value = "zzzz-recherche-introuvable";
  input.dispatchEvent(new p.w.Event("input", { bubbles:true }));
  assert.equal(cards.filter(c=>!c.hidden).length, 0);
  assert.equal(p.d.querySelector("#ressources .sde-search-empty").hidden, false);
  input.value = "";
  input.dispatchEvent(new p.w.Event("input", { bubbles:true }));
  assert.equal(cards.filter(c=>!c.hidden).length, sourceCount);
  p.dom.window.close();
});
test("navigation desktop : barre fixe également présente sur l'accueil", () => {
  const style = readFileSync("public/vitrine/portal.css","utf8");
  assert.ok(style.includes("position: fixed; top: auto; bottom: 0;"));
  assert.ok(!style.includes(".sde-home-page .sde-global-nav { display: none"));
});
test("référencement : Academy indexable, interface admin exclue", () => {
  const xml = readFileSync("public/sitemap.xml","utf8");
  const admin = readFileSync("public/vitrine/engagements.html","utf8");
  assert.ok(xml.includes("https://mouvement-sde.org/vitrine/academy"));
  assert.ok(!xml.includes("engagements"));
  assert.ok(admin.includes('name="robots" content="noindex, nofollow"'));
});
