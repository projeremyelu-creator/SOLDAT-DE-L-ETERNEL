import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

test("lot 1 : les anciennes URL publiques restent accessibles sans 404", () => {
  const worker = read("src/worker.js");
  assert.match(worker, /"\/album-infire"\s*:\s*"\/vitrine\/album-infire\.html"/);
  assert.match(worker, /"\/projets"\s*:\s*"\/vitrine\/projets\.html"/);
});

test("lot 1 : les boutons or conservent un texte sombre et les erreurs restent lisibles", () => {
  const css = read("public/vitrine/sde-sitewide-2026.css");
  assert.match(css, /\.ap-btn-gold[^}]*color\s*:\s*#2b1450\s*!important/is);
  assert.match(css, /\.sde-error-page[^}]*color\s*:\s*#271447\s*!important/is);
});

test("lot 2 : accueil, album, projets, programme passé et coordonnées sont cohérents", () => {
  const home = read("public/vitrine/portail.html");
  const album = read("public/vitrine/album-infire.html");
  const programmes = read("public/vitrine/programmes.html");
  const contact = read("public/vitrine/rejoindre.html");
  assert.doesNotMatch(home, /href="\/projets"/);
  assert.match(home, /href="\/album-infire"/);
  assert.match(album, /canonical" href="https:\/\/mouvement-sde\.org\/album-infire"/);
  assert.match(programmes, /IN FIRE 2026[^]*Événement terminé[^]*Voir les souvenirs/is);
  assert.doesNotMatch(programmes, /<h3>Confirmer ma venue<\/h3>/i);
  assert.doesNotMatch(contact, /infosoldatdeleternel@gmail\.com/i);
});

test("lot 2 et 4 : le répertoire et la recherche couvrent toutes les rubriques publiques", () => {
  const directory = read("public/vitrine/plus.html");
  const search = read("public/vitrine/sde-hub.js");
  for (const route of ["/soutenir","/transparence","/gouvernance","/reseau","/communaute","/calendrier","/newsletter","/rechercher","/academy-programme-24","/album-infire","/pole-reveil","/pole-social","/pole-logistique","/pole-medias","/pole-formation"])
    assert.match(directory, new RegExp(`href=["']${route.replaceAll("/","\\/")}["']`), route);
  assert.match(search, /IN FIRE/);
  assert.match(search, /REV/);
  assert.match(search, /Soldiers Voice/);
});

test("lot 3 : une seule langue annoncée tant que les traductions ne sont pas complètes", () => {
  const hub = read("public/vitrine/sde-hub.js");
  assert.doesNotMatch(hub, /translation\s*=|setLang\s*=/);
  assert.match(hub, /data-lang[^]*remove\(\)/);
});

test("lot 5 : PWA, sitemap, HEAD agenda et SEO sont synchronisés", () => {
  const sw = read("public/sw-public.js");
  const map = read("public/sitemap.xml");
  const worker = read("src/worker.js");
  const home = read("public/vitrine/portail.html");
  for (const route of ["/soutenir","/transparence","/gouvernance","/reseau","/communaute","/calendrier","/newsletter","/rechercher","/academy-programme-24","/album-infire","/pole-reveil","/pole-social","/pole-logistique","/pole-medias","/pole-formation"])
    assert.match(sw, new RegExp(`"${route.replaceAll("/","\\/")}"`), route);
  assert.doesNotMatch(map, /mouvement-sde\.org\/plus<\/loc>/);
  assert.match(map, /mouvement-sde\.org\/album-infire<\/loc>/);
  assert.match(worker, /p === "\/api\/agenda-public\.ics" && \(req\.method === "GET" \|\| req\.method === "HEAD"\)/);
  assert.match(home, /"sameAs"\s*:\s*\[/);
});

test("lot 5 : la politique de confidentialité publie des durées précises", () => {
  const policy = read("public/vitrine/confidentialite.html");
  assert.doesNotMatch(policy, /doivent être confirmées/i);
  assert.match(policy, /12 mois/);
  assert.match(policy, /24 mois/);
  assert.match(policy, /durée de l’adhésion/i);
});
