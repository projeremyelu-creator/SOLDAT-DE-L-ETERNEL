import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

test("Connexion : le lien TPA reste dans le DOM HTML initial et ne dépend pas d'un montage React",()=>{
 const html=readFileSync("public/vitrine/connexion-unifiee.html","utf8");
 const jsx=readFileSync("frontend/experience.jsx","utf8");
 const dom=new JSDOM(html),doc=dom.window.document;
 assert.equal(doc.body.classList.contains("sde-reference-login"),true);
 const banner=doc.querySelector("#sde-event-root .event-bar-inner");
 assert.ok(banner);
 assert.ok(banner.querySelector('a[href="/programmes#tpa-2026"]'));
 assert.match(banner.textContent,/18 décembre 2026/);
 assert.match(banner.textContent,/20h00/);
 assert.equal(banner.querySelector(".event-clock"),null,"Le décompte non initialisé ne doit pas figurer sur la connexion");
 assert.match(jsx,/if\(event&&!document\.body\.classList\.contains\('sde-reference-login'\)\)createRoot\(event\)\.render\(<EventBanner\/>\)/);
 assert.match(jsx,/function EventBanner\(/);
 dom.window.close();
});
