import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {test} from "node:test";
import assert from "node:assert/strict";
import {assainirSite} from "../src/worker.js";
const require=createRequire(import.meta.url);

test("assainirSite filtre les champs et refuse les liens dangereux", () => {
  const r = assainirSite({
    contact: { email: "contact@mouvement-sde.org", telephone: "+225 07 78 68 95 73" },
    programmes: { liste: [
      { titre: "Holy Brunch", rythme: "Mensuel", texte: "x".repeat(900), lien: "javascript:alert(1)", image: "/vitrine/illus/prog-brunch.svg", secret: "non" },
      { titre: "", texte: "sans titre" },
      { titre: "IN FIRE", lien: "#infire", image: "https://evil.example/x.svg", feu: true }
    ] },
    banniere: { texte: "Bienvenue", lien: "//evil.example" }
  });
  assert.equal(r.contact.email, "contact@mouvement-sde.org");
  assert.equal(r.programmes.length, 2);
  assert.equal(r.programmes[0].texte.length, 400);
  assert.equal(r.programmes[0].lien, "");
  assert.equal(r.programmes[0].secret, undefined);
  assert.equal(r.programmes[1].image, "");
  assert.equal(r.programmes[1].lien, "#infire");
  assert.equal(r.banniere.lien, "");
});

test("assainirSite rejette e-mail et téléphone invalides, et gère l'absence de données", () => {
  assert.deepEqual(assainirSite({ contact: { email: "pas un mail", telephone: "abc" } }).contact, { email: "", telephone: "" });
  const vide = assainirSite({});
  assert.deepEqual(vide.programmes, []);
  assert.equal(vide.banniere.texte, "");
  assert.equal(assainirSite({ banniere: { texte: "Info", actif: false } }).banniere.texte, "");
});

function page(nom, site) {
  const {JSDOM}=require("jsdom");
  const d = new JSDOM(readFileSync("public/vitrine/" + nom + ".html", "utf8"), { url: "https://mouvement-sde.org/vitrine/" + nom, runScripts: "outside-only", pretendToBeVisual: true });
  d.window.fetch = async (u) => ({ ok: true, json: async () => (String(u).startsWith("/api/site") ? site : { evenements: [] }) });
  d.window.eval(readFileSync("public/vitrine/subpage.js", "utf8"));
  d.window.document.dispatchEvent(new d.window.Event("DOMContentLoaded"));
  return d;
}
const attendre = () => new Promise((r) => setTimeout(r, 30));

test("la page Contact affiche les coordonnées et les programmes publiés", async () => {
  const d = page("rejoindre", { contact: { email: "contact@mouvement-sde.org", telephone: "+225 01 02 03 04 05" }, programmes: [{ titre: "Nouveau programme", libelle: "Participer" }] });
  await attendre();
  const doc = d.window.document;
  assert.equal(doc.querySelector("#c-mail").textContent, "contact@mouvement-sde.org");
  assert.equal(doc.querySelector("#c-tel").textContent, "+225 01 02 03 04 05");
  assert.ok([...doc.querySelectorAll("#f-objet option")].some((o) => o.textContent === "Nouveau programme"));
});

test("la page Programmes remplace les cartes et garde le HTML si /api/site est vide", async () => {
  let d = page("programmes", { programmes: [{ titre: "Programme <b>test</b>", texte: "Texte", rythme: "Chaque jeudi" }] });
  await attendre();
  const cartes = d.window.document.querySelectorAll(".programmes .programme");
  assert.equal(cartes.length, 1);
  assert.equal(cartes[0].querySelector("h3").textContent, "Programme <b>test</b>");
  assert.equal(cartes[0].querySelector("b"), null);
  d = page("programmes", {});
  await attendre();
  assert.ok(d.window.document.querySelectorAll(".programmes .programme").length >= 8);
});
