/* Navigation du portail public SDE : aucun appel privé ni état de synchronisation simulé. */
(() => {
  "use strict";
  const start = () => {
    const body = document.body;
    if (!body) return;
    body.classList.add("sde-portal");
    const home = Boolean(document.getElementById("accueil"));
    const page = body.dataset.sdePage || "";
    if (home) body.classList.add("sde-home-page");
    // Lien d'évitement : disponible au clavier sur les pages secondaires.
    if (!home) {
      const main = document.querySelector("main");
      if (main) {
        if (!main.id) main.id = "sde-contenu-principal";
        if (!document.querySelector(".sde-skip, .skip")) {
          const skip = document.createElement("a");
          skip.className = "sde-skip";
          skip.href = "#" + main.id;
          skip.textContent = "Accéder au contenu";
          body.insertBefore(skip, body.firstChild);
        }
      }
    }
    const site = "https://mouvement-sde.org/";
    const app = "https://app.mouvement-sde.org/#connexion";
    const finances = "https://app.mouvement-sde.org/#finances";
    const hashUrl = (id) => (home ? "#" : site + "#") + id;
    const pictos = {
      maison: '<path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/>',
      membres: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20c.6-3.6 3-5 6.5-5s5.9 1.4 6.5 5M16 5a3 3 0 0 1 0 6M18 14c2 1 3 3 3.5 6"/>',
      agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      finances: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M16 16h2"/>',
      plus: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
    };
    const svg = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + pictos[name] + '</svg>';
    const tabs = [
      ["Accueil",site,"maison","accueil"],
      ["Membres",site+"vitrine/rejoindre#membres","membres","membres"],
      ["Agenda",site+"vitrine/programmes#agenda","agenda","agenda"],
      ["Finances",finances,"finances","finances"],
      ["Plus",site+"vitrine/plus","plus","plus"]
    ];
    let nav = document.querySelector(".nav-mobile");
    if (!nav) {
      nav = document.createElement("nav");
      const header = document.querySelector("header.entete");
      if (header) header.insertAdjacentElement("afterend", nav);
      else body.append(nav);
    }
    nav.className = "nav-mobile sde-global-nav";
    nav.setAttribute("aria-label", "Navigation SDE — accès principaux");
    nav.innerHTML = "<ul>" + tabs.map((tab) =>
      '<li><a data-sde-tab="' + tab[3] + '" href="' + tab[1] + '">' +
      svg(tab[2]) + '<span>' + tab[0] + "</span></a></li>"
    ).join("") + "</ul>";

    // Garder les contrôles actuels de chaque page : ne pas modifier leurs handlers.
    if (!home) {
      const actions = document.querySelector(".entete .entete-actions");
      if (actions && !actions.querySelector(".sde-header-quick")) {
        const el = document.createElement("div");
        el.className = "sde-header-quick";
        el.innerHTML = '<a href="' + site + '" aria-label="Site du mouvement" title="Accueil SDE">' + svg("globe") + '</a>' +
                       '<a href="' + app + '" aria-label="Espace membre" title="Espace membre">' + svg("user") + "</a>";
        actions.prepend(el);
      }
    }

    const active = () => {
      const h = window.location.hash.substring(1);
      const inAgenda = ["agenda","programmes","infire"].includes(h);
      const inMembres = ["membres","rejoindre"].includes(h);
      const inPlus = ["parcours-sde","mouvement","histoire","poles","ressources","galerie","projets","faq","responsables","soutenir","presence","chiffres","axes","engagement"].includes(h);
      const key = !home ? (page === "programmes" ? "agenda" : page === "rejoindre" ? "membres" : "plus") :
        (inAgenda ? "agenda" : inMembres ? "membres" : inPlus ? "plus" : "accueil");
      nav.querySelectorAll("a[data-sde-tab]").forEach((a) => {
        const selected = a.dataset.sdeTab === key;
        a.classList.toggle("sde-current", selected);
        if (selected) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    };
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-sde-tab]");
      if (!a) return;
      nav.querySelectorAll("a[data-sde-tab]").forEach((node) => {
        const selected = node === a;
        node.classList.toggle("sde-current", selected);
        if (selected) node.setAttribute("aria-current", "page");
        else node.removeAttribute("aria-current");
      });
    });
    window.addEventListener("hashchange", active);
    window.addEventListener("popstate", active);
    // L'onglet actif suit aussi le défilement des sections, sans modifier l'historique.
    if (home) {
      const categories = { "accueil": "accueil", "infire": "agenda", "agenda": "agenda", "programmes": "agenda", "rejoindre": "membres", "membres": "membres" };
      const sections = [...document.querySelectorAll("main section[id]")];
      let scheduled = false;
      const onScroll = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          let id = "accueil";
          for (const element of sections) {
            if (element.getBoundingClientRect().top <= Math.max(160, window.innerHeight * .4)) {
              id = categories[element.id] || "plus";
            }
          }
          nav.querySelectorAll("a[data-sde-tab]").forEach((a) => {
            const selected = a.dataset.sdeTab === id;
            a.classList.toggle("sde-current", selected);
            if (selected) a.setAttribute("aria-current", "page");
            else a.removeAttribute("aria-current");
          });
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    active();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
