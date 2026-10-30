/* Transition SDE - Mouvement : disparaît sans bloquer l'accès.
   Première visite : 700 ms minimum ; visites suivantes ou animations réduites :
   150 ms. En cas de ressource lente : 4 s maximum. */
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
  const minimum = deja || calme ? 150 : 700;
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
      setTimeout(() => splash.remove(), calme ? 0 : 600);
    }, reste);
  };
  if (document.readyState === "complete") fermer();
  else addEventListener("load", fermer, { once: true });
  gardeFou = setTimeout(fermer, 4000);
})();
