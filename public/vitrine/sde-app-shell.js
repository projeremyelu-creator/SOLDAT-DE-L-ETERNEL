/* SDE : composant d'interface commun au site public, sans API privée. */
(() => {
  "use strict";
  const NAV = [
    ["Présentation du mouvement","/vitrine/mouvement","Institution"],
    ["Agenda et programmes","/vitrine/programmes","Événements"],
    ["Soldiers Academy","/vitrine/academy","Formation"],
    ["Prières et intercession","/vitrine/prieres","Prière"],
    ["Enseignements et ressources","/vitrine/ressources","Bibliothèque"],
    ["Témoignages","/vitrine/temoignages","Communauté"],
    ["Soldiers Voice","/vitrine/soldiers-voice","Musique"],
    ["Soldier’s Award","/vitrine/soldiers-award","Honneur"],
    ["Missions humanitaires","/vitrine/missions-humanitaires","Solidarité"],
    ["Projets et dons","/vitrine/projets","Engagement"],
    ["Rejoindre SDE","/vitrine/rejoindre","Adhésion"],
    ["Toutes les rubriques","/vitrine/plus","Explorer"],
    ["SDE OS v3.1 — connexion requise","/os-v31/","Espace privé"]
  ];
  const normalize = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").trim();
  const make = (tag, classes, content) => {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (content) el.textContent = content;
    return el;
  };
  const start = () => {
    if (!document.body || !document.querySelector("header.entete")) return;
    const body = document.body;
    body.classList.add("sde-portal","sde-app-shell");
    const header = document.querySelector("header.entete");
    const headerInside = header.querySelector(".enveloppe");
    const actions = header.querySelector(".entete-droite, .entete-actions");
    const brand = header.querySelector(".marque");
    if (brand && !header.querySelector(".sde-shell-public-tag")) {
      const badge = make("span","sde-shell-public-tag","Site public");
      brand.insertAdjacentElement("afterend", badge);
    }
    if (actions && !actions.querySelector(".sde-shell-secure")) {
      const direct = actions.querySelector('a[href*="app.mouvement-sde.org"]');
      if (direct) {
        direct.classList.add("sde-shell-secure");
        direct.setAttribute("aria-label","Ouvrir l'application privée sécurisée SDE");
        direct.textContent = "Espace membre";
      } else {
        const a = make("a","sde-shell-secure","Espace membre");
        a.href = "https://app.mouvement-sde.org/#connexion";
        a.setAttribute("aria-label","Ouvrir l'application privée sécurisée SDE");
        actions.append(a);
      }
    }
    const searchBtn = make("button","sde-shell-search-btn");
    searchBtn.type = "button";
    searchBtn.setAttribute("aria-label","Rechercher dans le site public");
    searchBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/></svg><span class="sde-search-desktop-label">Rechercher</span>';
    if (actions) actions.prepend(searchBtn);
    else headerInside?.append(searchBtn);

    if (actions && !document.getElementById("btn-theme") && !document.getElementById("btnTheme")) {
      const theme = make("button","sde-shell-theme","◐");
      theme.type = "button";
      theme.setAttribute("aria-label","Basculer le thème clair ou sombre");
      theme.addEventListener("click", () => {
        const light = document.documentElement.dataset.theme === "light";
        const next = light ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("sde-theme", next); } catch (_) {}
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = next === "light" ? "#eef0f5" : "#0f1e3d";
      });
      actions.prepend(theme);
    }

    if (!document.querySelector(".sde-shell-toolbar")) {
      const bar = make("nav","sde-shell-toolbar");
      bar.setAttribute("aria-label","Accès rapides aux activités SDE");
      for(const [label,url] of [
        ["Prière","/vitrine/prieres"],
        ["Témoignages","/vitrine/temoignages"],
        ["Soldiers Voice","/vitrine/soldiers-voice"],
        ["Missions solidaires","/vitrine/missions-humanitaires"],
        ["Espace sécurisé","https://app.mouvement-sde.org/#connexion"],
        ["SDE OS v3.1 · privé","/os-v31/"]
      ]) {
        const link = make("a","",label);
        link.href = url;
        if (location.pathname === url || location.pathname === url+".html") {
          link.setAttribute("aria-current","page");
        }
        bar.append(link);
      }
      header.insertAdjacentElement("afterend",bar);
    }

    const dialog = make("dialog","sde-shell-search-dialog");
    dialog.setAttribute("aria-label","Rechercher dans les pages publiques SDE");
    const title = make("h2","","Rechercher sur SDE");
    const hint = make("p","","Accès rapide aux pages publiques. Les dossiers privés ne sont pas indexés ici.");
    const controls = make("div","sde-search-controls");
    const input = make("input","");
    input.type = "search";
    input.id = "sde-shell-query";
    input.placeholder = "Programmes, prière, missions…";
    input.autocomplete = "off";
    input.setAttribute("aria-label","Rechercher une rubrique publique");
    const close = make("button","sde-search-close","×");
    close.type = "button";
    close.setAttribute("aria-label","Fermer la recherche");
    controls.append(input,close);
    const results = make("div","sde-shell-search-results");
    results.setAttribute("aria-live","polite");
    const resultCount = make("p","");
    resultCount.setAttribute("role","status");
    dialog.append(title,hint,controls,resultCount,results);
    body.append(dialog);
    let previousFocus = null;
    const show = () => {
      previousFocus = document.activeElement;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open","");
      input.value = "";
      update();
      input.focus();
    };
    const hide = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      if (previousFocus?.focus) previousFocus.focus();
    };
    const update = () => {
      const term = normalize(input.value);
      const found = NAV.filter(([label,,type])=>!term || normalize(label+" "+type).includes(term));
      results.replaceChildren();
      for(const [label,url,category] of found) {
        const link = make("a","");
        link.href = url;
        const name = make("strong","",label);
        const tag = make("small","",category);
        link.append(name,tag);
        results.append(link);
      }
      if (!found.length) results.append(make("p","sde-shell-search-empty","Aucune rubrique publique trouvée."));
      resultCount.textContent = found.length + " rubrique" + (found.length > 1 ? "s" : "") + " disponible" + (found.length > 1 ? "s" : "");
    };
    searchBtn.addEventListener("click",show);
    close.addEventListener("click",hide);
    dialog.addEventListener("click", event => { if (event.target === dialog) hide(); });
    dialog.addEventListener("close", () => { if (previousFocus?.focus) previousFocus.focus(); });
    input.addEventListener("input",update);
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==="k") {
        event.preventDefault();
        if (!dialog.open) show();
      } else if (event.key === "Escape" && dialog.open) {
        hide();
      }
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    if (!reduced && "IntersectionObserver" in window) {
      const candidates = document.querySelectorAll(".sde-simple-grid > a, .sde-initiative-grid > *, .sde-parcours-grid > a");
      const seen = new IntersectionObserver(items => {
        for(const item of items) if(item.isIntersecting) {
          item.target.classList.add("sde-shell-shown");
          seen.unobserve(item.target);
        }
      }, { threshold:.05, rootMargin:"0px 0px 30px 0px" });
      for(const item of candidates) {
        item.classList.add("sde-shell-reveal");
        seen.observe(item);
      }
      body.classList.add("sde-shell-motion-ready");
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
