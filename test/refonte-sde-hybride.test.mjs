import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";
import {join} from "node:path";
const root="public/vitrine";
const read=(p)=>readFileSync(p,"utf8");
const pages=readdirSync(root).filter(name=>name.endsWith(".html"));
test("38 pages publiques : toutes les charte SDE chargées",()=>{
  assert.equal(pages.length>=38,true,"Ne pas retirer de page de la vitrine");
  for(const name of pages){
    const html=read(join(root,name));
    const style=name.startsWith("tableau-")?"sde-premium-dashboards.css":"sde-premium-public.css";
    assert.ok(html.includes("/vitrine/"+style),name+" : palette non chargée");
    assert.ok(html.includes("<head")&&html.includes("</head>"),name+" : en-tête manquant");
    assert.ok(html.indexOf("/vitrine/"+style)<html.indexOf("</head>"),name+" : lien placé hors head");
  }
});
test("Portail SDE OS : palette privée installée sans modifier les droits",()=>{
 const html=read("public/index.html");
 assert.ok(html.includes("/vitrine/sde-premium-app.css"));
 assert.ok(html.includes('fetch("/api/moi"'));
 assert.ok(existsSync("src/worker.js"));
});
test("Trois palettes : public, membre et Command clairement séparées",()=>{
 const pub=read(join(root,"sde-premium-public.css"));
 const dash=read(join(root,"sde-premium-dashboards.css"));
 const app=read(join(root,"sde-premium-app.css"));
 assert.ok(pub.includes("body[data-cosmique]"));
 assert.ok(pub.includes(".sde-intro"));
 assert.ok(dash.includes("[data-dashboard=membre]"));
 assert.ok(dash.includes("[data-dashboard=administration]"));
 assert.ok(app.includes("data-sde-palette=ivoire"));
 assert.ok(app.includes("data-sde-palette=militaire"));
 for(const css of [pub,dash,app]){
   assert.ok(css.includes("prefers-reduced-motion"),"préférence d'animation");
   assert.ok(css.includes("focus-visible"),"navigation clavier");
   assert.ok(css.includes("max-width"),"règles mobiles");
 }
});
test("Liens métiers et confidentialité conservés",()=>{
 const documents=[
 ["tableau-membre.html",["/mon-espace","/academy"]],
 ["tableau-administration.html",["/administration","data-access=\"proprietaire\""]],
 ["programmes.html",["#tpa-2026"]],
 ["album-infire.html",["data-year=\"2024\"","data-year=\"2025\"","data-year=\"2026\""]]
 ];
 for(const [name,tokens] of documents){const html=read(join(root,name));for(const t of tokens)assert.ok(html.includes(t),name+" : "+t);}
});
