import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=f=>readFileSync(f,"utf8");
const ops=read("frontend/operations.jsx"),shell=read("frontend/reference-shell.jsx"),css=read("frontend/reference.css"),direct=read("public/vitrine/portail-direct.js"),worker=read("src/worker.js");
test("maquette : menu administrateur, citation et sous-titre du poste de commandement",()=>{
 for(const l of ["'Vue générale'","'Membres'","'Pôles'","'Communication'"])assert.ok(shell.includes(l),l);
 assert.ok(shell.includes("Des outils au service d’une vision éternelle."));
 assert.ok(ops.includes("Superviser · Coordonner · Multiplier"));
 assert.ok(ops.includes("ensemble pour des disciples équipés et un impact durable"));
});
test("maquette : demandes en attente, finances et avancement utilisent les vraies API",()=>{
 assert.ok(ops.includes("Demandes d’adhésion en attente")&&ops.includes("/api/engager-admin"));
 assert.ok(/api\('\/api\/engager-admin','PATCH',\{id:r\.id,traite:true/.test(ops),"validation = traité");
 assert.ok(ops.includes("Synthèse financière (FCFA)")&&ops.includes("/api/pilotage-finances"));
 assert.ok(ops.includes("ce n’est pas le solde bancaire"),"pas de faux solde");
 assert.ok(/portal\.compte\.niveau<2\|\|d===false\)return null/.test(ops),"finances réservées au niveau 2");
});
test("maquette : « Mon espace Soldat » est branché pour les membres seulement",()=>{
 assert.ok(ops.includes("Mon espace Soldat")&&ops.includes("Grandir · Servir · Impacter"));
 assert.ok(ops.includes("active==='espace-soldat'&&!direction"));
 assert.ok(direct.includes('"espace-soldat":"Mon espace Soldat"'));
 assert.ok(direct.includes('nom==="espace-soldat"&&mode!=="membre"'));
 for(const t of ["Mon parcours Academy","Prochaine rencontre","Mes cotisations","Mon carnet de prière","Colossiens 4:2","Mes documents"])assert.ok(ops.includes(t),t);
});
test("maquette : progression Academy calculée côté serveur pour le membre connecté",()=>{
 assert.ok(worker.includes('p === "/api/mon-parcours-academy"'));
 const fn=worker.slice(worker.indexOf("async function apiMonParcoursAcademy"),worker.indexOf("async function apiMesCotisations"));
 assert.ok(fn.includes("u.membreId")&&fn.includes("Abandon")&&fn.includes("modulesTotal"));
 assert.ok(/!u\.connecte \|\| !u\.membreId/.test(fn),"accès refusé sans fiche reliée");
});
test("maquette : barre d'onglets mobile et mouvement réduit",()=>{
 assert.ok(shell.includes("ref-tabbar")&&shell.includes("Navigation rapide"));
 assert.ok(css.includes(".ref-tabbar{display:none}")&&/@media\(max-width:760px\)\{\.ref-tabbar\{position:fixed/.test(css));
 assert.ok(css.includes("prefers-reduced-motion:reduce){.ref-bar i{transition:none}"));
});
test("refonte : rubrique Adhésions branchée de bout en bout pour l'administration",()=>{
 assert.ok(shell.includes("['adhesions','Adhésions','members']"),"menu latéral");
 assert.ok(ops.includes("adhesions:'Demandes d’adhésion'")&&ops.includes("active==='adhesions'&&direction"),"module réservé à la direction");
 assert.ok(direct.includes('adhesions:"Demandes d’adhésion"')&&direct.includes('nom==="adhesions"&&(mode!=="direction"||!(compte?.niveau>=1))'),"catalogue et droits");
 assert.ok(ops.includes("Approuver")&&ops.includes("Refuser")&&ops.includes("Contacter"));
});
test("refonte : accueil, textes du document de référence",()=>{
 const home=read("public/vitrine/index.html");
 for(const t of ["Une génération enracinée","Nos cinq engagements","Nos fondements","Nos programmes","Nos cinq pôles","Découvrir le programme","M’inscrire","Prière, intercession, annonce de l’Évangile et missions."])assert.ok(home.includes(t),t);
 assert.ok(home.includes('id="form-rejoindre"')&&home.includes('id="hero-decompte"'),"formulaire et compte à rebours conservés");
});
