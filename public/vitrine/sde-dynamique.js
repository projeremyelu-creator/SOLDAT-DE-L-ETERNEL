/* SDE — parcours interactif, événements publics et navigation de confort. Sans données privées. */
(() => {
  "use strict";
  const categories = [
    ["decouvrir", "Découvrir"],
    ["grandir", "Grandir dans la foi"],
    ["agir", "Servir et agir"],
    ["tous", "Tout voir"]
  ];
  const liens = {
    "#mouvement": "decouvrir",
    "#rejoindre": "decouvrir",
    "#galerie": "decouvrir",
    "/vitrine/temoignages": "decouvrir",
    "/vitrine/academy.html": "grandir",
    "#ressources": "grandir",
    "/vitrine/prieres": "grandir",
    "#programmes": "agir",
    "#poles": "agir",
    "#engagement": "agir",
    "/vitrine/soldiers-voice": "agir",
    "/vitrine/missions-humanitaires": "agir"
  };
  const nettoyer = (valeur) => String(valeur || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();

  function parcoursInteractif() {
    const racine = document.getElementById("parcours-sde");
    if (!racine || racine.querySelector(".sde-dyn-tools")) return;
    const grille = racine.querySelector(".sde-parcours-grid");
    const intro = racine.querySelector(".sde-parcours-intro");
    if (!grille || !intro) return;
    const cartes = [...grille.querySelectorAll("a.sde-parcours-card")];
    if (!cartes.length) return;
    const outils = document.createElement("div");
    outils.className = "sde-dyn-tools";
    outils.innerHTML = '<div class="sde-dyn-filtres" role="group" aria-label="Filtrer les parcours SDE"></div>' +
      '<label class="sde-dyn-recherche" for="sde-dyn-search"><span>Rechercher un parcours</span>' +
      '<input id="sde-dyn-search" type="search" inputmode="search" autocomplete="off" placeholder="Formation, prière, mission…"></label>' +
      '<p class="sde-dyn-resultats" role="status" aria-live="polite"></p>' +
      '<p class="sde-dyn-vide" hidden>Aucun parcours correspondant. Essayez un autre terme ou sélectionnez « Tout voir ».</p>';
    intro.insertAdjacentElement("afterend", outils);
    const conteneur = outils.querySelector(".sde-dyn-filtres");
    const recherche = outils.querySelector("input");
    const resultat = outils.querySelector(".sde-dyn-resultats");
    const vide = outils.querySelector(".sde-dyn-vide");
    let categorie = "decouvrir";
    let texte = "";
    const boutons = categories.map(([id, nom]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sde-dyn-filtre";
      btn.textContent = nom;
      btn.dataset.categorie = id;
      btn.setAttribute("aria-controls", "sde-parcours-cartes");
      conteneur.append(btn);
      btn.addEventListener("click", () => {
        categorie = id;
        actualiser();
      });
      return btn;
    });
    grille.id = grille.id || "sde-parcours-cartes";
    function actualiser() {
      let visibles = 0;
      for (const carte of cartes) {
        const href = carte.getAttribute("href") || "";
        const dansCategorie = categorie === "tous" || liens[href] === categorie;
        const dansRecherche = !texte || nettoyer(carte.textContent).includes(texte);
        carte.hidden = !(dansCategorie && dansRecherche);
        if (!carte.hidden) visibles += 1;
      }
      for (const btn of boutons) {
        const actif = btn.dataset.categorie === categorie;
        btn.setAttribute("aria-pressed", String(actif));
      }
      resultat.textContent = visibles + (visibles > 1 ? " parcours disponibles" : " parcours disponible");
      vide.hidden = visibles !== 0;
    }
    recherche.addEventListener("input", () => {
      texte = nettoyer(recherche.value);
      // Une recherche doit couvrir tous les parcours, même si le filtre initial est limité.
      if (texte) categorie = "tous";
      actualiser();
    });
    actualiser();

    // Affichage facultatif d'un rendez-vous issu de l'API publique, jamais de l'espace membre.
    if (typeof window.fetch !== "function") return;
    window.fetch("/api/public", { credentials: "omit", headers: { accept: "application/json" } })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const liste = json && Array.isArray(json.evenements) ? json.evenements : [];
        const evenement = liste.find((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || "")) && e.titre);
        if (!evenement) return;
        const [annee, mois, jour] = evenement.date.split("-").map(Number);
        const date = new Date(Date.UTC(annee, mois - 1, jour));
        if (Number.isNaN(date.getTime())) return;
        const texteDate = new Intl.DateTimeFormat("fr-CI", {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
        }).format(date);
        const bloc = document.createElement("aside");
        bloc.className = "sde-dyn-rdv";
        bloc.setAttribute("aria-label", "Prochain rendez-vous du mouvement");
        const information = document.createElement("div");
        const libelle = document.createElement("span");
        libelle.className = "sde-dyn-rdv-label";
        libelle.textContent = "À venir · Agenda SDE";
        const titre = document.createElement("strong");
        titre.textContent = String(evenement.titre).slice(0, 140);
        const description = document.createElement("span");
        description.textContent = [texteDate, evenement.heure || "", evenement.lieu || ""].filter(Boolean).join(" · ");
        information.append(libelle, titre, description);
        const lien = document.createElement("a");
        lien.href = "/vitrine/programmes#agenda";
        lien.textContent = "Voir l'agenda";
        bloc.append(information, lien);
        outils.insertAdjacentElement("beforebegin", bloc);
      }).catch(() => { /* L'agenda reste accessible sans connexion API. */ });
  }

  function navigationConfort() {
    if (document.querySelector(".sde-dyn-progression")) return;
    const progression = document.createElement("div");
    progression.className = "sde-dyn-progression";
    progression.setAttribute("aria-hidden", "true");
    progression.innerHTML = "<span></span>";
    const retour = document.createElement("button");
    retour.type = "button";
    retour.className = "sde-dyn-retour";
    retour.textContent = "↑";
    retour.setAttribute("aria-label", "Retour en haut de page");
    retour.title = "Retour en haut";
    retour.hidden = true;
    retour.addEventListener("click", () => {
      const reduit = document.documentElement.dataset.motion === "reduced" ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      window.scrollTo({ top: 0, behavior: reduit ? "instant" : "smooth" });
    });
    document.body.append(progression, retour);
    const barre = progression.firstElementChild;
    let demande = false;
    const actualiser = () => {
      demande = false;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const position = Math.max(0, window.scrollY || window.pageYOffset || 0);
      barre.style.width = (max ? Math.min(100, Math.round(position / max * 100)) : 0) + "%";
      retour.hidden = position < 650;
    };
    const surDefilement = () => {
      if (demande) return;
      demande = true;
      window.requestAnimationFrame(actualiser);
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    actualiser();
  }
  const demarrer = () => {
    parcoursInteractif();
    navigationConfort();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer, { once: true });
  } else demarrer();
})();