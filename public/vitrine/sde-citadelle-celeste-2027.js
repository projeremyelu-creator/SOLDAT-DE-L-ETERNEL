/* Progressive-only Citadelle behaviour: no data access or permission changes. */
(() => {
  // Même identité graphique sur chaque route sans aucune requête aux données privées.
  document.documentElement.setAttribute("data-sde-citadel-integral", "v3");
  const formatCountdown = (target) => {
    const value = new Date(target).getTime();
    if (!Number.isFinite(value)) return "Date à confirmer";
    const delta = value - Date.now();
    if (delta <= 0) return "Rendez-vous terminé — consulter l’agenda";
    const days = Math.floor(delta / 86400000);
    const hours = Math.floor((delta % 86400000) / 3600000);
    return `${days} j ${hours} h avant le rendez-vous`;
  };
  window.SdeCitadel = window.SdeCitadel || {
    init(root = document) {
      root.querySelectorAll("[data-sde-citadel-countdown]").forEach((element) => {
        const label = formatCountdown(element.dataset.sdeCitadelCountdown);
        element.textContent = label;
        element.setAttribute("aria-label", label);
      });
      const active = root.querySelector(`[data-sde-nav="${location.pathname}"]`);
      active?.setAttribute("aria-current", "page");
    },
    formatCountdown
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.SdeCitadel.init(), { once: true });
  else window.SdeCitadel.init();
})();
