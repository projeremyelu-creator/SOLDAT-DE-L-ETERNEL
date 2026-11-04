/* Transition SDE - Mouvement : décorative et non bloquante.
   Elle disparaît presque immédiatement, sans attendre toutes les ressources. */
(() => {
  "use strict";
  const splash = document.getElementById("sde-splash");
  if (!splash) return;
  const start = performance.now();
  let deja = false;
  try {
    deja = sessionStorage.getItem("sde-splash-vu") === "1";
    sessionStorage.setItem("sde-splash-vu", "1");
  } catch (_) {}
  const calme = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const minimum = deja || calme ? 0 : 180;
  let fermeturePlanifiee = false;
  let gardeFou;
  const fermer = () => {
    if (fermeturePlanifiee) return;
    fermeturePlanifiee = true;
    clearTimeout(gardeFou);
    const reste = Math.max(0, minimum - (performance.now() - start));
    setTimeout(() => {
      splash.classList.add("is-done");
      splash.setAttribute("aria-hidden", "true");
      setTimeout(() => splash.remove(), calme ? 0 : 180);
    }, reste);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fermer, { once: true });
  else fermer();
  gardeFou = setTimeout(fermer, 700);
})();
