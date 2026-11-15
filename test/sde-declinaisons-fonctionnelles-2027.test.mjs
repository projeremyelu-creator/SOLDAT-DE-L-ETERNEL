import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(x,"utf8");

test("Les déclinaisons fonctionnelles sont chargées après le thème de référence",()=>{
 const s=read("scripts/build-experience.mjs");
 assert.ok(s.includes("sde-declinaisons-fonctionnelles-2027.css"));
 assert.ok(s.includes("SDE-DECLINAISONS-COMPILEES-2027"));
 assert.ok(!s.includes("const declinationsStylePath"),"pas de CSS externe supplémentaire");
 const css=read("public/vitrine/sde-declinaisons-fonctionnelles-2027.css");
 for(const t of ["sde-2027-campus-hero","sde-2027-workspace-admin","sde-2027-workspace-member","@media(max-width:700px)"])assert.ok(css.includes(t),t);
});
test("Academy publique : accès à de vraies rubriques et non à des données fictives",()=>{
 const html=read("public/vitrine/academy.html");
 for(const s of ['/academy-programme-24#cours','/mon-espace/enseignants','/mon-espace/academy','/verifier-attestation'])assert.ok(html.includes('href="'+s+'"'));
 assert.ok(html.includes('sde-2027-campus-tiles'));
 assert.ok(html.includes('Aucune statistique de démonstration'));
 assert.ok(html.includes('id="form-inscription-cours"'));
 assert.ok(html.includes('id="formulaire"'));
});
test("Espaces privés : même route, mêmes identifiants métiers, nouveaux liens de navigation",()=>{
 const admin=read("public/vitrine/tableau-administration.html");
 const member=read("public/vitrine/tableau-membre.html");
 for(const el of ['id="a-membres"','id="a-evenements"','id="liste-agenda"','data-section="finances"'])assert.ok(admin.includes(el),el);
 for(const el of ['id="m-matricule"','id="m-modules-valides"','id="profil-form"','id="priere-form"'])assert.ok(member.includes(el),el);
 assert.ok(admin.includes('sde-2027-workspace-admin'));
 assert.ok(member.includes('sde-2027-workspace-member'));
 assert.ok(member.includes('data-view="formations"'));
});


test("Studio Academy : aucun accès public direct et alias historique protégé",()=>{
 const worker=read("src/worker.js");
 const page=read("public/vitrine/academy.html");
 assert.ok(worker.includes('p === "/academy-enseignants"'));
 assert.ok(worker.includes('location:url.origin+"/mon-espace/enseignants"'));
 assert.ok(worker.includes('"/mon-espace/enseignants","/administration/enseignants"'));
 assert.ok(page.includes('href="/mon-espace/enseignants"'));
 assert.ok(!page.includes('href="/academy-enseignants"'));
});


test("Page mouvement desktop : réserve stable avant le montage du header commun",()=>{
 const style=read("public/vitrine/sde-declinaisons-fonctionnelles-2027.css");
 const page=read("public/vitrine/mouvement.html");
 assert.ok(style.includes("SDE-2027-MOUVEMENT-PREPAINT-CLS"));
 assert.ok(style.includes("header#haut.site-header"));
 assert.ok(style.includes("height:66px!important;min-height:66px!important;max-height:66px!important"));
 assert.ok(style.includes('data-sde-page="mouvement"] > .infire-takeover'));
 assert.ok(page.includes('id="haut"'));
});
