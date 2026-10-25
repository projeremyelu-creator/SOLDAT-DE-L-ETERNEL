/* Invite d'installation du portail lorsqu'elle est proposée par le navigateur.
   La PWA privée sur app.mouvement-sde.org conserve son fonctionnement propre. */
(() => {
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
    const main = document.querySelector(".sde-initiative-lead .enveloppe");
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
