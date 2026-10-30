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

test("les deux nouvelles maquettes sont des thèmes privés facultatifs et persistants",()=>{
 const shell=read("frontend/reference-shell.jsx");
 const css=read("frontend/palette-themes.css");
 const entry=read("frontend/experience.css");
 for(const t of ["militaire","ivoire","violet"])assert.ok(shell.includes("'"+t+"'"),t);
 assert.ok(shell.includes("localStorage.getItem('sde-private-palette')"),"préférence enregistrée");
 assert.ok(shell.includes("setAttribute('data-sde-palette',palette)"),"préférence appliquée à l'espace privé");
 assert.ok(shell.includes('aria-pressed={palette===id}')&&shell.includes('aria-label="Choisir la palette graphique"'),"sélecteur accessible");
 assert.ok(shell.includes("portal.selectionner(m)"),"navigation privée préservée");
 assert.ok(entry.includes('@import "./palette-themes.css";'),"feuille chargée par le build");
 for(const t of ['data-sde-palette="ivoire"','data-sde-palette="violet"'])assert.ok(css.includes(t),t);
 assert.ok(css.includes('body.sde-reference'),"styles limités aux espaces privés");
 assert.ok(css.includes('.soldier-qr'),"QR existant valorisé");
 assert.ok(css.includes('.ref-tabbar'),"navigation smartphone");
});
test("accueil réellement servi (portail.html) refait selon la maquette",()=>{
 const h=read("public/vitrine/portail.html");
 for(const t of ['class="m-band"','Une génération enracinée en Jésus-Christ, prête à servir','Nos cinq engagements','Nos programmes','Nos cinq pôles','Espaces sécurisés','Nous rejoindre','pour la moisson.','accueil-maquette.css','id="event-title"','id="event-details"','id="event-action"','class="private-access-card private-member"','class="private-access-card private-admin"'])assert.ok(h.includes(t),t);
 assert.equal((h.match(/class="site-access-top"/g)||[]).length,1);
 const js=read("public/vitrine/portail-unifie.js");assert.ok(js.includes("sde-rail")&&js.includes("--sde-rail-top"),"rail sur toutes les pages publiques");
});

test("correctif mobile : le vrai accueil reste responsive, pas de bureau rétréci",()=>{
 const worker=read("src/worker.js");
 const html=read("public/vitrine/portail.html");
 const css=read("public/vitrine/portail-unifie.css");
 const legacy=read("public/vitrine/sde-maquette.css");
 assert.ok(worker.includes('return assetPortail("/vitrine/portail.html")'),"accueil servi par le worker");
 assert.ok(html.includes('width=device-width, initial-scale=1'),"viewport mobile réel");
 assert.ok(css.includes("Correctifs mobile 30 octobre 2026"),"correctifs page active");
 for(const key of [
   "body.sde-unifie .site-header-inner",
   "body.sde-unifie .site-burger",
   "body.sde-unifie .home-hero h1",
   "body.sde-unifie .site-menu",
   "body.sde-unifie .meeting-card"
 ])assert.ok(css.includes(key),key);
 assert.ok(legacy.includes("Lisibilité de l'ancienne vitrine sur téléphone"),"compatibilité ancienne vitrine");
 assert.ok(legacy.includes(".hero-decompte")&&legacy.includes(".sde-shell-toolbar"),"compte à rebours et raccourcis adaptatifs");
 assert.ok(!css.includes("transform:scale(.5)"),"pas de réduction visuelle artificielle");
});

test("maquette récente : panneaux de l'accueil adaptés au format smartphone",()=>{
 const css=read("public/vitrine/accueil-maquette.css");
 assert.ok(css.includes("Responsive post-refonte"),"styles dédiés au nouvel accueil");
 for(const s of [".m-main",".m-band h2",".m-kpis",".m-feature-body",".private-access-grid"])
   assert.ok(css.includes(s),s);
 assert.ok(css.includes("@media(max-width:360px)"),"écrans étroits");
});

test("fiche membre plein écran et cache mobile : accessibilité sans changement métier",()=>{
 const app=read("public/index.html");
 const appCss=read("public/app.css");
 const home=read("public/vitrine/portail.html");
 const oldHome=read("public/vitrine/index.html");
 const source=read("public/vitrine/portail-unifie.css");
 const builder=read("scripts/build-experience.mjs");
 for(const token of ['name="viewport"','width=device-width'])assert.ok(app.includes(token),token);
 assert.ok(app.includes('href="/app.css'),"style privé chargé");
 assert.ok(appCss.includes("Fiche membre et formulaires natifs réellement utilisables"),"modal mobile");
 assert.ok(appCss.includes('body #sheet:not([hidden])'),"fenêtre de dialogue complète");
 assert.ok(appCss.includes('height:100dvh!important'),"hauteur écran mobile");
 assert.ok(appCss.includes('overflow-y:auto'),"défilement membre");
 assert.ok(appCss.includes('(pointer: coarse)'),"mode ordinateur Android traité");
 assert.ok(appCss.includes('.vy-grid'),"voyants adaptés");
 assert.ok(source.includes('Correctifs mobile 30 octobre 2026'),"nouvelle feuille publique");
 assert.ok(home.includes('/vitrine/portail-unifie.css?v='),"style principal public");
 assert.ok(home.includes('/vitrine/accueil-maquette.css?v='),"style accueil actif");
 assert.ok(home.includes('/vitrine/sde-maquette.css?v='),"style charte publique");
 assert.ok(oldHome.includes('/vitrine/sde-maquette.css?v='),"style ancienne vitrine");
 assert.ok(builder.includes("versionnerHtml('public')"),"invalidation des assets gérée automatiquement");
 assert.ok(app.includes('Veille pastorale · visible par la direction seulement'),"accès pastoral inchangé");
 assert.ok(app.includes('sheet.hidden = true'),"fermeture du dialogue conservée");
});
test("logo officiel et verset fondateur Ézéchiel 37",()=>{
 const h=read("public/vitrine/portail.html");
 assert.ok(h.includes('src="/vitrine/logo-96.webp"')&&h.includes("logo-sde.webp"),"logo officiel");
 assert.ok(h.includes("Ézéchiel 37.10")&&h.includes("Ézéchiel 37.9"),"verset fondateur");
 assert.ok(read("public/vitrine/portail-unifie.js").includes('class="site-logo"'),"logo sur les pages intérieures");
});
