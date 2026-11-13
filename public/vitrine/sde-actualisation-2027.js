/* SDE Digital · notification de mise à jour sans intervention sur les comptes.
 * Compatible avec la vitrine, le portail et la PWA installée Android.
 * Ne supprime pas les données du navigateur et ne déconnecte personne. */
(() => {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  const REVISION = "20261113-citadelle-v3";
  let showed = false;
  const notify = () => {
    if (showed || !document.body || document.getElementById("sde-nouvelle-version")) return;
    showed = true;
    const root = document.createElement("aside");
    root.id = "sde-nouvelle-version";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    root.style.cssText = [
      "position:fixed","left:12px","right:12px",
      "bottom:calc(12px + env(safe-area-inset-bottom,0px))",
      "z-index:2147483640","width:min(550px,calc(100% - 24px))",
      "margin-inline:auto","display:flex","align-items:center",
      "justify-content:space-between","gap:12px","flex-wrap:wrap",
      "background:#101f39","color:#fff7e6","border:2px solid #e7c677",
      "box-shadow:0 18px 40px #03091acc","border-radius:14px",
      "padding:12px 14px","font:600 14px/1.45 system-ui,sans-serif"
    ].join(";");
    const text = document.createElement("span");
    text.textContent = "Nouvelle interface SDE Digital disponible.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Actualiser";
    button.style.cssText = "min-height:44px;min-width:105px;padding:8px 14px;border:0;border-radius:10px;background:#e7c677;color:#09162c;font:800 14px system-ui,sans-serif;cursor:pointer";
    button.addEventListener("click", () => {
      const target = new URL(location.href);
      target.searchParams.set("sde_interface", REVISION);
      location.assign(target.href);
    });
    root.append(text,button);
    document.body.appendChild(root);
  };
  navigator.serviceWorker.addEventListener("controllerchange",notify);
  /* Le site ou une PWA peut rester ouverte entre deux publications.
   * La mise à jour se fait dès qu'une nouvelle page SDE est visitée,
   * mais la décision de recharger appartient à l'utilisateur. */
  window.addEventListener("pageshow", () => {
    navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {});
  });
})();