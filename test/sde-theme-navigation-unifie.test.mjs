import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("public/vitrine/sde-shell-public.css","utf8");
const js=readFileSync("public/vitrine/sde-shell-public.js","utf8");
test("la charte SDE conserve les cinq couleurs avec leurs fonctions",()=>{
 for(const token of ["--sde-2027-night:","--sde-2027-ivory:","--sde-2027-gold:","--sde-2027-violet:","--sde-2027-green:"])assert.ok(css.includes(token),token);
 assert.match(css,/data-sde-page="prieres"/);
 assert.match(css,/data-sde-page="missions-humanitaires"/);
});
test("le menu public met en évidence la rubrique active sans changer ses routes",()=>{
 assert.match(js,/sde-shell-group-active/);
 assert.match(js,/document\.body\.dataset\.sdePage/);
 assert.match(js,/aria-current/);
 assert.match(css,/\.sde-shell-mega-group\.sde-shell-group-active>summary/);
});
test("navigation et animation respectent accessibilité et mobile",()=>{
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:55px/);
});
test("les styles privés ne sont pas ciblés par cette livraison",()=>{
 const section=css.slice(css.lastIndexOf("/* SDE 2027 — harmonisation finale"));
 assert.ok(section.startsWith("/* SDE 2027"));
 assert.doesNotMatch(section,/body\.sde-admin/);
 assert.doesNotMatch(section,/body\.sde-member/);
});

test("barre privée : cinq accès fixes sans exposition des finances administrateur",()=>{
 const shell=readFileSync("frontend/reference-shell.jsx","utf8");
 const design=readFileSync("frontend/reference.css","utf8");
 assert.match(shell,/\['espace','Membres','members'\]/);
 assert.match(shell,/\['contributions','Finances','money'\]/);
 assert.match(shell,/account\.niveau>=2\?\['finance-direction','Finances','money'\]:\['scanner','Pointages','qr'\]/);
 assert.match(shell,/\['rendezvous','Agenda','mission'\]/);
 assert.match(shell,/\['tactique','SDE officiel/);
 assert.doesNotMatch(shell,/\['fusion','Fusion/);
 assert.match(shell,/<span>Plus<\/span>/);
 assert.match(design,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(design,/prefers-reduced-motion:reduce/);
});


test("Capture Android : encre des pôles, FAQ et connexion visible sur fond nuit",()=>{
 const home=readFileSync("public/vitrine/portail.html","utf8");
 const fix=readFileSync("public/vitrine/sde-six-maquettes-2027.css","utf8");
 const fragment=fix.slice(fix.indexOf("/* SDE 2027 — correctif contraste des captures Android du 10-11-2026 */"));
 assert.ok(fragment.length>6000,"surcouche de réparation présente après les six maquettes");
 for(const selector of [
  "#poles-accueil .sde-pole-officiel-lien h3",
  "#poles-accueil .sde-pole-officiel-lien p",
  "#poles-accueil .sde-pole-officiel-lien .m-pole-num",
  "#poles-accueil .sde-pole-officiel-lien .sde-pole-talents",
  ".ap-faq .home-faq-list summary",
  ".ap-faq .home-faq-list details p",
  "#espaces-prives .private-access-card.private-login :is(span,strong)"
 ]){
  assert.ok(fragment.includes(selector),"sélecteur absent : "+selector);
 }
 for(const text of ["#fff6e5","#e7ebf4","#f1d38d","#17243b"]){
  assert.match(fragment,new RegExp(text,"i"));
 }
 const color=(s)=>s.match(/#[a-f0-9]{6}/i)?.[0];
 const lum=h=>{
  const rgb=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 };
 const ratio=(a,b)=>{const hi=Math.max(lum(color(a)),lum(color(b))),lo=Math.min(lum(color(a)),lum(color(b)));return (hi+.05)/(lo+.05)};
 for(const [fg,bg] of [["#fff6e5","#17243b"],["#e7ebf4","#17243b"],["#f1d38d","#17243b"],["#f3f1ec","#101b35"]]){
  assert.ok(ratio(fg,bg)>=4.5,fg+" / "+bg+" doit respecter le contraste WCAG AA");
 }
 assert.ok(fragment.includes("-webkit-text-fill-color"),"Android : corriger l'encre et pas seulement color");
 assert.match(fragment,/@media\(max-width:760px\)/);
 assert.match(fragment,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.equal((home.match(/class="m-pole sde-pole-officiel"/g)||[]).length,5);
 assert.ok(home.includes('id="espaces-prives"'));
 assert.ok(home.includes('class="home-faq-list"'));
});

test("Capture Android : footer partagé en une colonne et newsletter lisible",()=>{
 const fix=readFileSync("public/vitrine/sde-shell-public.css","utf8");
 const fragment=fix.slice(fix.indexOf("/* SDE 2027 — correction lisibilite reelle du pied de page mobile (10-11-2026) */"));
 assert.ok(fragment.length>3400);
 assert.match(fragment,/@media\(max-width:850px\)/);
 assert.match(fragment,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(fragment,/\.sde-shell-footer-grid nav>a/);
 assert.match(fragment,/min-height:44px!important/);
 assert.match(fragment,/\.sde-shell-newsletter \.sde-privacy-note/);
 assert.match(fragment,/font-size:\.9rem!important/);
 assert.match(fragment,/\.sde-shell-subfooter/);
 assert.match(fragment,/-webkit-text-fill-color:#f4d997!important/);
});
