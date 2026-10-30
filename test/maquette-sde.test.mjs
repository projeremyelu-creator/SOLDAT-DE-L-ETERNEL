import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=f=>readFileSync(f,"utf8");
const ops=read("frontend/operations.jsx"),shell=read("frontend/reference-shell.jsx"),css=read("frontend/reference.css"),direct=read("public/vitrine/portail-direct.js"),worker=read("src/worker.js");
test("maquette : menu administrateur, citation et sous-titre du poste de commandement",()=>{
 for(const l of ["'Vue générale'","'Membres'","'Pôles'","'Communication'"])assert.ok(shell.includes(l),l);
 assert.ok(shell.includes("Des outils au service d’une vision éternelle."));
 assert.ok(ops.includes("Superviser · Coordonner · Faire grandir"));
 assert.ok(ops.includes("bienvenue dans l’espace de pilotage du Mouvement SDE"));
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
 for(const t of ["Soldiers Academy","Prochain rendez-vous","Mes cotisations","Mon carnet de prière","Colossiens 4:2","Mes ressources","Reprendre ma formation","Voir mon agenda","Ouvrir les ressources"])assert.ok(ops.includes(t),t);
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
test("refonte étape 4 : Rejoindre, Soutenir et pied de page selon le document",()=>{
 const home=read("public/vitrine/index.html"),rej=read("public/vitrine/rejoindre.html"),proj=read("public/vitrine/projets.html"),sub=read("public/vitrine/subpage.js");
 for(const h of [home,rej]){for(const t of ["Votre parcours peut commencer ici","Commune ou ville","Pôle d’intérêt prioritaire","Programme souhaité","Envoyer ma demande","Merci pour votre démarche.","Votre demande a bien été transmise à l’équipe du Mouvement SDE."])assert.ok(h.includes(t),t);assert.ok(h.includes('name="pole"'));}
 for(const h of [home,proj])for(const t of ["Contribuer à la mission","5 000 FCFA","10 000 FCFA","25 000 FCFA","Autre montant","Choisir mon mode de contribution"])assert.ok(h.includes(t),t);
 assert.ok(sub.includes('pole:g("pole")'),"le pôle est transmis à l'API");
 assert.ok(home.includes("Politique de confidentialité")&&home.includes("Mentions légales"));
});
test("refonte étapes 5 et 6 : connexion par matricule ou e-mail, textes du document",()=>{
 const login=read("public/vitrine/connexion-unifiee.html");
 for(const t of ["Bienvenue dans votre espace SDE","Matricule ou adresse e-mail","Mot de passe oublié","Première connexion ?"])assert.ok(login.includes(t),t);
 assert.ok(/name="email" type="text"/.test(login),"le champ accepte un matricule");
 const fn=worker.slice(worker.indexOf("async function apiConnexionMdp"),worker.indexOf("async function apiActivation"));
 assert.ok(fn.includes("upper(matricule) = upper(?)")&&fn.includes(".bind(saisie)"),"recherche paramétrée par matricule");
 assert.ok(fn.includes("Les informations saisies ne permettent pas de vous connecter."));
 assert.ok(fn.includes('bloque(env, "e:" + saisie, 8)'),"limitation des essais conservée");
});
test("refonte étape 6 : Anniversaires et Suivi des pôles réservés à l'administration",()=>{
 assert.ok(ops.includes("active==='anniversaires'&&direction?<Birthdays/>")&&ops.includes("active==='suivi-poles'&&direction?<PoleTracking"));
 assert.ok(direct.includes('["anniversaires","suivi-poles"].includes(nom)&&(mode!=="direction"||!(compte?.niveau>=1))'));
 for(const l of ["'anniversaires','Anniversaires'","'suivi-poles','Pôles'","'site-public','Programmes'","'bibliotheque','Ressources'"])assert.ok(shell.includes(l),l);
 assert.ok(read("src/operations.js").includes("anniv:str(m.data.anniv,10)"),"date d'anniversaire dans l'annuaire réservé");
 for(const t of ["Examiner les adhésions","Publier une annonce","Consulter le suivi des pôles","Vérifier les opérations financières"])assert.ok(ops.includes(t),t);
});
test("charte visuelle de la maquette : couleurs, typographies, lion, événement phare",()=>{
 const charte=read("public/vitrine/sde-maquette.css");
 for(const t of ["--m-nuit:#0a121b","--m-or:#c9a14a","--m-treillis:#5f6d3a","Cinzel","Cormorant Garamond"])assert.ok(charte.includes(t),t);
 assert.ok(charte.includes('html:not([data-theme="light"])'),"le thème clair reste disponible");
 assert.ok(css.includes("url(/vitrine/illus/lion-sde.webp)"),"carte de membre au lion");
 assert.ok(ops.includes("function FeatureEvent")&&ops.includes("Événement phare"));
 for(const p of ["index","mouvement","programmes","rejoindre","ressources"]){const h=read("public/vitrine/"+p+".html");assert.ok(h.includes("sde-maquette.css"),p);assert.ok(h.includes("family=Cinzel"),p+" polices");}
 assert.ok(read("public/vitrine/index.html").includes('document.documentElement.setAttribute("data-theme", "dark");'),"sombre par défaut");
});
test("maquette fidèle : rail latéral, panneaux numérotés, logo monogramme",()=>{
 const home=read("public/vitrine/index.html"),charte=read("public/vitrine/sde-maquette.css");
 assert.ok(home.includes('class="sde-rail"')&&home.includes("pour la moisson."),"rail et citation");
 assert.ok(home.includes('<span class="monogramme" aria-hidden="true">SDE</span>'),"monogramme");
 assert.ok(charte.includes("counter(panneau,decimal-leading-zero)"),"numérotation des sections");
 assert.ok(css.includes('content:"03"')&&css.includes('content:"02"'),"bandeaux 02 et 03 de l'application");
});
