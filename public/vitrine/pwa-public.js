/* Invite d'installation du portail lorsqu'elle est proposée par le navigateur.
   La PWA privée sur app.mouvement-sde.org conserve son fonctionnement propre. */
(() => {
  // Uniquement sur le domaine public ; portée publique /, cache strictement limité aux pages publiques autorisées.
  if (location.hostname === "mouvement-sde.org" && "serviceWorker" in navigator) {
    const register = () => navigator.serviceWorker.register("/sw-public.js", {scope:"/"}).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, {once:true});
  }
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
    const main = document.querySelector(".sde-initiative-lead .enveloppe, .sde-intro, #parcours-sde .sde-parcours-inner");
    if (!main || document.getElementById("sde-install-public")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "sde-install-public";
    button.className = "sde-form-submit sde-install-button";
    button.textContent = "Installer le portail SDE";
    button.addEventListener("click", async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      button.remove();
    });
    main.appendChild(button);
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    document.getElementById("sde-install-public")?.remove();
  });
})();
