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

test("lisibilité générale : surfaces bleues et cartes ivoire, sans violet global",()=>{
 const final=css.slice(css.indexOf("SDE · Contraste et luminosité harmonisés"));
 assert.ok(final.startsWith("SDE · Contraste et luminosité harmonisés"));
 assert.match(final,/--fu-bg0:#101b35/);
 assert.match(final,/--sde-forest:#101b35/);
 assert.match(final,/--fu-card:#fffaf0/);
 assert.match(final,/--fu-card-ink:#1b2942/);
 assert.match(final,/background:linear-gradient\(145deg,#111e36/);
 assert.match(final,/background:#fffaf0!important;color:#1b2942!important/);
 assert.match(final,/\[data-sde-page="prieres"\]/);
 assert.match(final,/\[data-sde-page="missions-humanitaires"\]/);
 assert.doesNotMatch(final,/filter:brightness\(/);
 assert.doesNotMatch(final,/body\.sde-reference/);
 assert.doesNotMatch(final,/body\.sde-admin/);
});
test("contraste WCAG AA : ivoire et or sur bleu nuit ; encre et liens sur ivoire",()=>{
 const lumi=h=>{
  const rgb=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
  const lin=rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return lin[0]*.2126+lin[1]*.7152+lin[2]*.0722;
 };
 const contrast=(a,b)=>{
  const x=lumi(a),y=lumi(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
 };
 for(const [name,foreground,background] of [
  ["texte ivoire sur nuit","#f7f2e8","#101b35"],
  ["accent or sur nuit","#e2c26a","#101b35"],
  ["titre sur carte ivoire","#1b2942","#fffaf0"],
  ["lien sur carte ivoire","#775312","#fffaf0"],
  ["texte secondaire sur ivoire","#56647a","#fffaf0"]
 ])assert.ok(contrast(foreground,background)>=4.5,name);
});
