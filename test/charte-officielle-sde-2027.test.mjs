import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read = path => readFileSync(path,"utf8");
const css = read("public/vitrine/sde-shell-public.css");
const charter = css.slice(css.indexOf("Référence OFFICIELLE SDE 2027"));
const js=read("public/vitrine/sde-shell-public.js");
const color = h => h.slice(1).match(/../g).map(v => parseInt(v,16)/255)
  .map(v => v<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
const luminance = h => {
 const [r,g,b] = color(h);
 return r*.2126+g*.7152+b*.0722;
};
const contrast = (a,b) => {
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};

test("Charte officielle 2027 : les cinq usages de couleur sont formalisés",()=>{
 assert.ok(charter.length>5000);
 const doc=read("docs/charte-visuelle-officielle-sde-2027.md");
 for(const [label,hex] of [
  ["nuit","#0B1730"],["ivoire","#F7F2E8"],["or","#D4AF37"],
  ["violet","#694097"],["vert","#2F684F"]
 ]){
  assert.ok(doc.toUpperCase().includes(hex.toUpperCase()),label);
 }
 for(const token of ["--sde-2027-night","--sde-2027-ivory","--sde-2027-gold",
                      "--sde-2027-violet","--sde-2027-green"]){
  assert.ok(css.includes(token),token);
 }
});
test("Accessibilité : l'or de lecture et les textes secondaires dépassent WCAG AA sur ivoire",()=>{
 const ivory="#f7f2e8",paper="#fffdf8",navy="#0b1730";
 assert.ok(contrast("#d4af37",ivory)<3,"l'or décoratif ne peut pas servir de texte");
 for(const fg of ["#68400e","#202b43","#566077","#694097","#2f684f"]){
  assert.ok(contrast(fg,ivory)>=4.5,fg+" sur ivoire");
  assert.ok(contrast(fg,paper)>=4.5,fg+" sur papier");
 }
 assert.ok(contrast(navy,"#efd487")>=4.5,"bouton or avec encre bleu nuit");
 assert.match(charter,/--sde-2027-gold-on-light:#68400e/);
 assert.match(charter,/-webkit-text-fill-color:var\(--sde-2027-gold-on-light\)/);
});
test("Navigation : toutes les pages publiques standards et la page 404 utilisent la même coque",()=>{
 const pages=["portail","programmes","mouvement","projets","rejoindre","ressources",
  "plus","academy","boutique","prieres","missions-humanitaires","soldiers-voice",
  "soldiers-award","temoignages","formulaire","soutenir","album-infire","404"];
 for(const page of pages){
  const html=read("public/vitrine/"+page+".html");
  assert.match(html,/\/vitrine\/sde-shell-public\.css/,page+" CSS");
  assert.match(html,/\/vitrine\/sde-shell-public\.js/,page+" JS");
 }
 const dom=new JSDOM(read("public/vitrine/404.html"),{
  url:"https://mouvement-sde.org/une-page-introuvable",runScripts:"outside-only"
 });
 try{
  dom.window.eval(js);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const doc=dom.window.document;
  assert.equal(doc.querySelectorAll(".sde-shell-header").length,1);
  assert.equal(doc.querySelectorAll(".sde-shell-footer").length,1);
  assert.equal(doc.querySelectorAll(".sde-shell-bottom-item").length,5);
 }finally{dom.window.close();}
});
test("Mobile 360 et 390 : en-tête responsive et commandes tactiles",()=>{
 assert.match(charter,/@media\(max-width:390px\)/);
 assert.match(charter,/@media\(max-width:360px\)/);
 assert.match(charter,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(charter,/min-height:44px/);
 assert.match(charter,/min-height:55px/);
 const audit=read("scripts/audit-public-mobile.mjs");
 assert.match(audit,/name:'accueil-360'/);
 assert.match(audit,/name:'accueil-390'/);
 assert.match(audit,/name:'priere-anonyme-390'/);
});
test("Animation : aucun texte révélé tardivement ou masqué au chargement",()=>{
 assert.match(charter,/opacity:1!important;visibility:visible!important/);
 assert.match(charter,/prefers-reduced-motion:reduce/);
 assert.match(charter,/html\[data-motion="reduced"\]/);
 assert.match(charter,/body\.sde-shell-mounted\[data-motion="paused"\]/);
 assert.doesNotMatch(charter,/opacity:\s*0\s*!important/);
 const doc=read("docs/charte-visuelle-officielle-sde-2027.md");
 assert.match(doc,/même sans JavaScript/);
});
