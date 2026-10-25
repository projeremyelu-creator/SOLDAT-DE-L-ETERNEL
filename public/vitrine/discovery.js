/* Recherche côté visiteur dans des cartes déjà rendues ; aucune donnée privée ni API. */
(() => {
  "use strict";
  const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
  const install = ({sectionId, listSelector, cardSelector, filterSelector, countId, noun}) => {
    const section = document.getElementById(sectionId);
    const list = section?.querySelector(listSelector);
    if (!section || !list) return;
    const intro = section.querySelector(".tete-section");
    if (!intro) return;
    const controls = document.createElement("div");
    controls.className = "sde-find";
    const inputId = "sde-search-" + sectionId;
    const label = noun === "programme" ? "Rechercher un programme" : "Rechercher un enseignement ou document";
    controls.innerHTML = '<label for="' + inputId + '">' + label + '</label>' +
      '<input type="search" id="' + inputId + '" placeholder="Rechercher par mot-clé…" autocomplete="off">' +
      '<output aria-live="polite" aria-atomic="true"></output>';
    intro.insertAdjacentElement("afterend", controls);
    const field = controls.querySelector("input");
    const result = controls.querySelector("output");
    const empty = document.createElement("p");
    empty.className = "sde-search-empty";
    empty.setAttribute("role", "status");
    empty.textContent = "Aucun résultat pour cette recherche.";
    empty.hidden = true;
    list.insertAdjacentElement("afterend", empty);
    const apply = () => {
      const query = normalize(field.value);
      const activeType = filterSelector ? section.querySelector(filterSelector + " button.actif")?.dataset.filtre || "tous" : "tous";
      const cards = [...list.querySelectorAll(cardSelector)];
      let count = 0;
      for (const card of cards) {
        const typeMatch = activeType === "tous" || card.dataset.type === activeType;
        const textMatch = !query || normalize(card.textContent).includes(query);
        card.hidden = !(typeMatch && textMatch);
        if (!card.hidden) count++;
      }
      result.textContent = count + " " + noun + (count > 1 ? "s" : "");
      empty.hidden = count !== 0;
      const currentCount = countId && section.querySelector("#" + countId);
      if (currentCount) currentCount.textContent = result.textContent;
    };
    field.addEventListener("input", apply);
    if (filterSelector) {
      const bar = section.querySelector(filterSelector);
      // L'écouteur existant (attaché au conteneur) s'exécute avant celui du document.
      // La recherche conserve donc le filtre choisi par le visiteur.
      bar?.addEventListener("click", (event) => {
        if (event.target.closest("button[data-filtre]")) queueMicrotask(apply);
      });
    }
    apply();
  };
  const start = () => {
    install({sectionId:"programmes",listSelector:".programmes",cardSelector:".programme",noun:"programme"});
    install({sectionId:"ressources",listSelector:"#ressources-grille",cardSelector:".ressource-carte",filterSelector:"#res-filtres",countId:"res-compteur",noun:"ressource"});
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
