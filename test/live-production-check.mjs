// Contrôle HTTP sur le domaine public, exécuté depuis un runner GitHub.
import { JSDOM } from "jsdom";

const base = "https://mouvement-sde.org";
const requests = [
  ["/", "Votre parcours avec SDE", "HTML accueil"],
  ["/vitrine/academy.html", "portal.js", "HTML Academy"],
  ["/vitrine/formulaire.html", "portal.js", "HTML Formulaire"],
  ["/vitrine/engagements.html", "portal.js", "HTML Engagements"],
  ["/vitrine/portal.js?v=20261025a", "data-sde-tab", "JavaScript navigation"],
  ["/vitrine/portal.css?v=20261025a", ".sde-global-nav", "CSS navigation"]
];
let homepage, portal;
let failed = false;
for (const [path, expected, label] of requests) {
  const url = base + path;
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "Accept": path.endsWith(".html") || path === "/" ? "text/html" : "*/*", "Cache-Control": "no-cache" }
    });
    const text = await r.text();
    const found = text.includes(expected);
    const ok = r.ok && found;
    console.log(JSON.stringify({label, status: r.status, redirected: r.redirected, finalUrl: r.url, chars: text.length, markerFound: found, result: ok ? "OK" : "FAIL"}));
    if (!ok) failed = true;
    if(path === "/") homepage = text;
    if(path.startsWith("/vitrine/portal.js")) portal = text;
  } catch (e) {
    console.error(JSON.stringify({label, result: "FAIL", error: String(e)}));
    failed = true;
  }
}
if (homepage && portal) {
  try {
    const dom = new JSDOM(homepage, { url: base, runScripts: "outside-only", pretendToBeVisual: true });
    dom.window.eval(portal);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const d = dom.window.document;
    const labels = [...d.querySelectorAll(".sde-global-nav a")].map(a=>a.textContent.trim());
    const cards = d.querySelectorAll("#parcours-sde .sde-parcours-card").length;
    const form = Boolean(d.getElementById("form-rejoindre"));
    const ok = JSON.stringify(labels) === JSON.stringify(["Accueil","Membres","Agenda","Finances","Plus"]) && cards === 8 && form;
    console.log(JSON.stringify({label:"Menu dynamique et composants accueil",tabs:labels,cards,originalFormPresent:form,result:ok?"OK":"FAIL"}));
    if(!ok) failed=true;
    dom.window.close();
  } catch(e) {console.error(JSON.stringify({label:"DOM check",result:"FAIL",error:String(e)}));failed=true;}
}
if (failed) {
  console.error("Le contrôle de production échoue : le déploiement doit être vérifié.");
  process.exitCode=1;
} else console.log("Contrôle HTTP et structure de la production : OK.");
