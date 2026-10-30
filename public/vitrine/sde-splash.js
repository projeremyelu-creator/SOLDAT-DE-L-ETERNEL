/* Écran de chargement : visible au premier affichage, retiré dès que l'espace est prêt (0,7 s minimum, 4 s maximum). */
(() => {
  "use strict";
  const splash = document.getElementById("sde-splash");
  if (!splash) return;
  const start = performance.now();
  let deja = false;
  try { deja = sessionStorage.getItem("sde-splash-vu") === "1"; sessionStorage.setItem("sde-splash-vu", "1"); } catch (_) {}
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minimum = deja || calme ? 150 : 700;
  const fermer = () => {
    const reste = Math.max(0, minimum - (performance.now() - start));
    setTimeout(() => { splash.classList.add("is-done"); splash.setAttribute("aria-hidden", "true"); setTimeout(() => splash.remove(), 600); }, reste);
  };
  if (document.readyState === "complete") fermer(); else addEventListener("load", fermer, { once: true });
  setTimeout(fermer, 4000);
})();
