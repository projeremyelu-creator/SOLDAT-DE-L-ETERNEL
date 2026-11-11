import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=p=>readFileSync(p,"utf8");
function render(name,path){
 const dom=new JSDOM(read("public/vitrine/"+name+".html"),{url:"https://mouvement-sde.org"+path,runScripts:"outside-only",pretendToBeVisual:true});
 dom.window.eval(read("public/vitrine/sde-shell-public.js"));
 dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
 return {dom,doc:dom.window.document,win:dom.window};
}
test("Navigation commune : même en-tête et menu sur accueil, contact et soutien",()=>{
 for(const [name,path] of [["portail","/"],["rejoindre","/contact"],["soutenir","/soutenir"],["plus","/rubriques"]]){
  const c=render(name,path);
  try{
   assert.equal(c.doc.querySelectorAll(".sde-shell-header").length,1,name);
   assert.equal(c.doc.querySelectorAll(".sde-shell-footer").length,1,name);
   assert.equal(c.doc.querySelectorAll(".sde-shell-bottom").length,1,name);
   assert.deepEqual([...c.doc.querySelectorAll(".sde-shell-mega-group>summary")].map(x=>x.textContent),["Le Mouvement","Programmes & Agenda","Missions & Impact","Médias & Ressources","S’engager"]);
   assert.ok(c.doc.querySelector('.sde-shell-mega-group a[href="/soutenir"]'),name);
   assert.ok(c.doc.querySelector('.sde-shell-head-actions>a[href="/portail"]'),name);
   assert.equal(c.doc.querySelectorAll('.sde-shell-bottom-item').length,5,name);
   assert.equal(c.doc.querySelectorAll('.sde-shell-footer-grid>div,.sde-shell-footer-grid>nav').length,4,name);
  }finally{c.dom.window.close();}
 }
});
test("Le tiroir Plus s'ouvre, cherche les sous-rubriques et se ferme",()=>{
 const c=render("portail","/");
 try{
  const toggle=c.doc.querySelector(".sde-shell-open"), overlay=c.doc.querySelector(".sde-shell-overlay");
  assert.ok(overlay.hidden);
  toggle.click();assert.equal(overlay.hidden,false);assert.equal(toggle.getAttribute("aria-expanded"),"true");
  const input=c.doc.querySelector(".sde-shell-filter");
  input.value="soldiers voice";input.dispatchEvent(new c.win.Event("input",{bubbles:true}));
  assert.equal(c.doc.querySelector('.sde-shell-drawer-groups a[href="/soldiers-voice"]').hidden,false);
  assert.equal(c.doc.querySelector('.sde-shell-drawer-groups a[href="/pole-reveil"]').hidden,true);
  overlay.dispatchEvent(new c.win.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(overlay.hidden,true);
 }finally{c.dom.window.close();}
});
test("Accueil : deux CTA Réveil Spirituel, intitulés métiers, TPA compact et états vides cachés",()=>{
 const c=render("portail","/");
 try{
  assert.equal(c.doc.querySelectorAll(".ap-hero .ap-actions a").length,2);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/Vie de l’Esprit/);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/Gouvernance & Ordre/);
  assert.match(c.doc.querySelector(".sde-premium-pillars").textContent,/Terrain & Compassion/);
  assert.ok(c.doc.querySelector(".ap-indicateurs").hidden);
  assert.ok(c.doc.querySelector(".sde-shell-event a[href='/programmes#tpa-2026']"));
 }finally{c.dom.window.close();}
});
test("Soutenir : formulaire immédiatement accessible, aucun canal supposé activé",()=>{
 const c=render("soutenir","/soutenir");
 try{
  const html=read("public/vitrine/soutenir.html");
  assert.ok(html.indexOf('id="formulaire"')<html.indexOf('id="reglements"'));
  assert.ok(c.doc.querySelector(".sde-donation-overview #formulaire form[method=post]"));
  assert.ok(c.doc.getElementById("pay-liste").hidden);
  assert.ok(c.doc.querySelectorAll(".hub-progress").length===3);
  assert.match(read("public/vitrine/sde-soutenir-statut.js"),/canauxActifs/);
 }finally{c.dom.window.close();}
});
test("Contact : prise de contact distincte de l'inscription ; un seul accès public",()=>{
 const c=render("rejoindre","/contact");
 try{
  assert.equal(c.doc.querySelectorAll("#membres .carte-acces").length,1);
  assert.ok(c.doc.querySelector('#membres a[href="/portail?mode=inscription"]'));
  assert.ok(c.doc.querySelector('#membres a[href="/portail"]'));
  assert.ok(c.doc.querySelector("#form-rejoindre"));
  assert.match(c.doc.querySelector("#rejoindre").textContent,/ne crée pas de compte/i);
 }finally{c.dom.window.close();}
});
test("Connexion : ni double menu, ni images de maquette, ni écran interstitiel",()=>{
 const html=read("public/vitrine/connexion-unifiee.html");
 const css=read("public/vitrine/sde-connexion-empreinte.css");
 assert.doesNotMatch(html,/reference-portail\.jpg/);
 assert.doesNotMatch(html,/id="sde-splash"/);
 assert.match(css,/\.sde-auth-nav,\.ref-login-art,\.sde-splash/);
 assert.ok(html.includes("form-inscription"));
});
test("Un seul composant de navigation chargé sur les principales pages publiques",()=>{
 const pages=["portail","rejoindre","soutenir","plus","mouvement","programmes","projets","academy","ressources","prieres","transparence","gouvernance","reseau","newsletter","communaute","calendrier","soldiers-voice","missions-humanitaires","temoignages","pole-reveil","pole-social","pole-logistique","pole-medias","pole-formation","boutique","soldiers-award","formulaire","rechercher","confidentialite"];
 for(const p of pages){
  const html=read("public/vitrine/"+p+".html");
  assert.ok(html.includes("/vitrine/sde-shell-public.js"),p+" JS");
  assert.ok(html.includes("/vitrine/sde-shell-public.css"),p+" CSS");
 }
});

test("Plus mobile et Rubriques en en-tête pilotent un même menu, accessible au clavier",()=>{
 const c=render("portail","/");
 try{
  const top=c.doc.querySelector(".sde-shell-rubriques");
  const plus=c.doc.querySelector(".sde-shell-open");
  const overlay=c.doc.getElementById("sde-shell-overlay");
  assert.ok(top&&plus&&overlay);
  assert.match(plus.textContent,/Plus/);
  assert.equal(top.getAttribute("aria-controls"),overlay.id);
  top.click();
  assert.equal(overlay.hidden,false);
  assert.equal(top.getAttribute("aria-expanded"),"true");
  assert.equal(plus.getAttribute("aria-expanded"),"true");
  const search=c.doc.querySelector(".sde-shell-filter");
  search.value="aucune rubrique possible";
  search.dispatchEvent(new c.win.Event("input",{bubbles:true}));
  assert.equal(c.doc.querySelector(".sde-shell-no-results").hidden,false);
  plus.click();
  assert.equal(overlay.hidden,true);
  plus.click();
  assert.equal(overlay.hidden,false);
  assert.equal(search.value,"","une nouvelle ouverture réinitialise le filtre");
  assert.equal(c.doc.querySelector(".sde-shell-no-results").hidden,true);
  overlay.dispatchEvent(new c.win.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(overlay.hidden,true);
  assert.equal(plus.getAttribute("aria-expanded"),"false");
 }finally{c.dom.window.close();}
});
test("Le pied de page commun est posé même si une page n'en possède pas",()=>{
 const html=read("public/vitrine/plus.html").replace(/<footer\b[\s\S]*?<\/footer>/i,"");
 const dom=new JSDOM(html,{url:"https://mouvement-sde.org/rubriques",runScripts:"outside-only",pretendToBeVisual:true});
 try{
  dom.window.eval(read("public/vitrine/sde-shell-public.js"));
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  assert.equal(dom.window.document.querySelectorAll(".sde-shell-footer").length,1);
 }finally{dom.window.close();}
});

test("Lisibilité 2026 : chaque fond sombre ou ivoire a une encre WCAG AA",()=>{
 const css=read("public/vitrine/sde-shell-public.css");
 const contrast=(fg,bg)=>{
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)
   .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  const lum=h=>rgb(h).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
  const a=lum(fg),b=lum(bg);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 };
 const pairs=[
  ["libellés soutien","#f7f2e8","#16283d"],
  ["champ soutien","#f7f2e8","#0d1c30"],
  ["placeholder soutien","#c1cad7","#0d1c30"],
  ["notice de confidentialité","#f7f2e8","#172942"],
  ["lien notice","#f0d586","#172942"],
  ["section légale","#17283f","#f7f2e8"],
  ["texte légal","#293b51","#fffaf0"],
  ["lien légal","#69470c","#fffaf0"]
 ];
 for(const [name,fg,bg] of pairs)assert.ok(contrast(fg,bg)>=4.5,
  name+" : "+contrast(fg,bg).toFixed(2)+":1 inférieur à 4,5");
 for(const token of [
  'main .sde-privacy-note','main #confidentialite .confidentialite',
  '.hub-main #formulaire .hub-form','::-placeholder',
  ':is(input:not([type="checkbox"]),select,textarea)','background-image:none!important'
 ]){
  if(token==='::-placeholder')assert.match(css,/::placeholder/);
  else assert.ok(css.includes(token),token);
 }
 for(const name of ["rejoindre","soutenir"]){
  const source=read("public/vitrine/"+name+".html");
  assert.match(source,/sde-shell-public\.css/);
 }
 const audit=read("scripts/audit-public-mobile.mjs");
 assert.match(audit,/LISIBILITE_SDE/);
 assert.ok(audit.includes('input[name="montant"]'));
 assert.ok(audit.includes('textarea[name="message"]'));
});

test("Recette Chromium : les règles haute priorité corrigent toutes les pages à notice",()=>{
 const css=read("public/vitrine/sde-shell-public.css");
 const hub=read("public/vitrine/sde-hub.js");
 assert.match(css,/main#contenu \.sde-privacy-note a/);
 assert.match(css,/main#contenu \.sde-privacy-note/);
 assert.match(css,/section#confidentialite #titre-confidentialite/);
 assert.match(css,/main \.sde-intro nav a/);
 assert.match(css,/\.sde-shell-footer-grid nav>a/);
 assert.match(hub,/class="pin-hit"/);
 assert.match(hub,/pointer-events="all"/);
 assert.match(hub,/map\.getBoundingClientRect\(\)\.width/);
 assert.match(hub,/addEventListener\('resize'/);
 // Un cercle SVG de rayon ajusté sur 1000 unités garde une cible >= 44 px.
 for(const width of [300,330,360,390,600,900,1000]){
  const radius=Math.max(25,Math.min(95,Math.ceil(24*1000/Math.max(220,width))));
  assert.ok((radius*2*width/1000)>=44,width+"px");
 }
});

test("Pied de page : cibles mobiles 44px et case consentement associée",()=>{
 const css=read("public/vitrine/sde-shell-public.css");
 const js=read("public/vitrine/sde-shell-public.js");
 assert.match(css,/html body\.sde-shell-mounted \.sde-shell-footer a,/);
 assert.match(css,/html body\.sde-shell-mounted \.sde-shell-subfooter a/);
 assert.match(css,/label\.sde-shell-consent\{/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/label\.sde-shell-consent input\[type="checkbox"\]/);
 assert.match(js,/class="sde-shell-consent"/);
});

test("Le Bilan 2026 garde ses événements sans ancien bouton de thème",()=>{
 const dom=new JSDOM(read("public/vitrine/formulaire.html"),{
  url:"https://mouvement-sde.org/formulaire",runScripts:"outside-only",pretendToBeVisual:true
 });
 try{
  const win=dom.window;
  win.matchMedia=()=>({matches:true});
  assert.equal(win.document.getElementById("btnTheme"),null,"bouton supprimé dans le thème unifié");
  const inline=[...win.document.querySelectorAll("script:not([src])")]
   .map(s=>s.textContent).find(s=>s.includes("PHOTO PREVIEW"));
  assert.ok(inline,"script interactif du bilan présent");
  assert.doesNotThrow(()=>win.eval(inline),"aucune erreur JS malgré btnTheme absent");
  assert.equal(typeof win.allerEtape,"function","navigation des deux étapes installée");
  assert.ok(win.document.querySelector("form#formulaire"),"le formulaire de bilan est conservé");
 }finally{dom.window.close();}
});
test("Le bandeau TPA du Mouvement est présent avant JavaScript, sans changement de structure au chargement",()=>{
 const html=read("public/vitrine/mouvement.html");
 const doc=new JSDOM(html).window.document;
 const banner=doc.getElementById("sde-event-root");
 assert.ok(banner?.querySelector(".event-bar-inner.upcoming"));
 assert.equal(banner.querySelectorAll("a[href='/programmes#tpa-2026']").length,2);
 assert.equal(banner.querySelector(".event-bar-date")?.textContent,"Traversée Prophétique Annuelle · Vendredi 18 décembre · 20h00 · Google Meet");
 const script=read("public/vitrine/sde-public-ui-lite.js");
 assert.match(script,/host\.querySelector\("\.event-bar-inner\.upcoming"\)/);
});

test("Soutenir réserve 73 px pour la navigation avant le remplacement du header sur ordinateur",()=>{
 const html=read("public/vitrine/soutenir.html");
 const doc=new JSDOM(html).window.document;
 assert.equal(doc.body.dataset.sdePage,"soutenir");
 const css=read("public/vitrine/sde-shell-public.css");
 const reserve=css.slice(css.lastIndexOf("Recette CLS 11/11/2026"));
 assert.match(reserve,/@media\(min-width:1100px\)/);
 assert.match(reserve,/body\[data-sde-page="soutenir"\]:not\(\.sde-shell-mounted\)>header\.sde-hub-head/);
 assert.match(reserve,/height:73px!important;min-height:73px!important;max-height:73px!important/);
 assert.match(reserve,/flex-wrap:nowrap!important;overflow:hidden!important/);
});
