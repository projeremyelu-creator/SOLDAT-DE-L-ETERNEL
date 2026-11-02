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


test("Phase 2 : cinq accès publics mobiles, sans fuite des finances internes",()=>{
 const js=read("public/vitrine/portail-unifie.js");
 const css=read("public/vitrine/sde-premium-public.css");
 for(const [name,href] of [
  ["Accueil","/"],["Membres","/contact#rejoindre"],
  ["Agenda","/programmes#agenda"],["Finances","/missions#soutenir"],
  ["Plus","/rubriques"]
 ]){
  assert.ok(js.includes('href:"'+href+'",label:"'+name+'"'),name+" : destination publique attendue");
 }
 assert.ok(js.includes('aria-label","Navigation rapide SDE sur mobile"'));
 assert.ok(js.includes('a.setAttribute("aria-current","page")'));
 assert.ok(js.includes('document.body.classList.add("sde-has-bottom-nav")'));
 assert.ok(js.includes('if(innerWidth>1800&&menu.dataset.open==="true")'));
 assert.match(css,/\.sde-public-bottom-nav\s*\{/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.sde-has-bottom-nav/);
 assert.match(css,/body\.sde-menu-mobile-ouvert \.sde-public-bottom-nav/);
});
test("Phase 2 : galerie IN FIRE premium, focus retenu et fermeture clavier",()=>{
 const html=read("public/vitrine/album-infire.html");
 const css=read("public/vitrine/sde-premium-public.css");
 assert.ok(html.includes('class="sde-infire-album"'));
 assert.ok(html.includes('class="archive-note"'));
 assert.ok(html.includes("document.body.style.overflow='hidden'"));
 assert.ok(html.includes("document.body.style.overflow=oldOverflow"));
 assert.ok(html.includes("e.key==='Tab'"));
 assert.ok(html.includes("e.key==='Escape'"));
 assert.ok(html.includes("close.focus()"));
 assert.ok(html.includes("last?.focus()"));
 assert.ok(css.includes(".sde-infire-album .item"));
 assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"));
 for(const y of ["2024","2025","2026"]){
  assert.ok(html.includes('data-year="'+y+'"'));
 }
});


test("Fusion 03 + 04 : habillage cohérent public, membre, admin et OS",()=>{
 const pub=read("public/vitrine/sde-premium-public.css");
 const dash=read("public/vitrine/sde-premium-dashboards.css");
 const app=read("public/vitrine/sde-premium-app.css");
 assert.match(pub,/SDE FUSION 03 \+ 04/);
 assert.match(pub,/--sde-fusion-violet/);
 assert.match(pub,/--sde-fusion-militaire/);
 assert.match(dash,/FUSION 03 \+ 04/);
 assert.match(dash,/sde-private-bottom-nav/);
 assert.match(app,/FUSION 03 \+ 04/);
 assert.match(pub,/prefers-reduced-motion/);
 assert.match(dash,/prefers-reduced-motion/);
 assert.match(app,/prefers-reduced-motion/);
});
test("Navigation mobile privée : cinq raccourcis et respect de l'authentification",()=>{
 const js=read("public/vitrine/tableaux-de-bord.js");
 assert.match(js,/function installerNavigationMobile\(/);
 assert.match(js,/installerNavigationMobile\(\)/);
 assert.match(js,/sde-private-bottom-nav/);
 for(const view of ["accueil","profil","formations","prieres","outils","membres","programmes","projets"]){
  assert.ok(js.includes('"'+view+'"'),"Raccourci non trouvé : "+view);
 }
 assert.ok(js.indexOf("compte=await api(")<js.lastIndexOf("installerNavigationMobile();"),
   "L'authentification doit précéder la navigation privée");
 for(const filename of ["tableau-membre.html","tableau-administration.html"]){
  const html=read("public/vitrine/"+filename);
  assert.match(html,/tableaux-de-bord\.js\?v=20261102fusion03-04/);
  assert.match(html,/sde-premium-dashboards\.css\?v=20261102fusion03-04/);
 }
});
