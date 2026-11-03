/* État réel des moyens de règlement : lu sur le serveur, jamais supposé. */
(function () {
  "use strict";
  fetch("/api/sde-demarches/statut", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    var actifs = d.paiementsActifs === true;
    document.querySelectorAll(".pay-etat").forEach(function (el) {
      el.textContent = actifs ? "Activé" : "En préparation"; el.classList.toggle("actif", actifs);
    });
    var note = document.getElementById("pay-note");
    if (note) note.textContent = actifs ? "Les moyens de règlement marqués « Activé » sont confirmés par le mouvement." : "Paiement en ligne : en préparation. Aucun numéro de paiement non confirmé n’est publié.";
  }).catch(function () { /* le texte statique reste exact */ });
})();
