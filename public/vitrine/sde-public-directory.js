/* Répertoire du site PUBLIC uniquement : n'importe aucune fonctionnalité de l'application privée. */
(() => {
  "use strict";
  const start = () => {
    const grid = document.querySelector('body[data-sde-page="plus"] .sde-simple-grid');
    if (!grid || document.querySelector(".sde-directory-search")) return;
    const container = document.createElement("div");
    container.className = "sde-directory-search";
    const label = document.createElement("label");
    label.htmlFor = "sde-rubriques-filter";
    label.textContent = "Rechercher une rubrique SDE";
    const input = document.createElement("input");
    input.type = "search";
    input.id = label.htmlFor;
    input.autocomplete = "off";
    input.placeholder = "Programmes, prière, témoignages, musique…";
    const count = document.createElement("output");
    count.className = "sde-count";
    count.setAttribute("aria-live", "polite");
    const empty = document.createElement("p");
    empty.className = "sde-search-empty";
    empty.textContent = "Aucune rubrique trouvée.";
    empty.hidden = true;
    container.append(label,input,count,empty);
    grid.insertAdjacentElement("beforebegin",container);
    const clean = s => String(s).normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
    const cards = [...grid.querySelectorAll("a[href]")];
    const update = () => {
      const query = clean(input.value.trim());
      let visible = 0;
      cards.forEach(card => {
        const shown = !query || clean(card.textContent).includes(query);
        card.hidden = !shown;
        if (shown) visible++;
      });
      count.textContent = visible+" rubrique"+(visible>1?"s":"");
      empty.hidden = visible !== 0;
    };
    input.addEventListener("input",update);
    update();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
