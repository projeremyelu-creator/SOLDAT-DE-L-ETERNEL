/* Fiche événement centrale : la page Programmes reprend evenement-phare.json (même source que l’accueil).
   Le HTML reste complet sans JavaScript ; ce script ne fait que synchroniser les valeurs. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function texte(el, v) { if (el && v) el.textContent = v; }
  fetch("/vitrine/evenement-phare.json", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
    if (!p || !p.titre || isNaN(Date.parse(p.debut))) return;
    var quand = (p.dateLibelle || "") + (p.heure ? " à " + p.heure : "");
    texte($("#phare-titre"), p.titre);
    texte($("#phare-quand"), quand.charAt(0).toLowerCase() + quand.slice(1));
    var carte = $("#tpa-2026");
    if (carte) {
      texte($("h3", carte), p.titre);
      var t = $("[data-sde-tpa-extra='date'] time", carte);
      if (t) { t.setAttribute("datetime", p.debut); t.textContent = quand; }
      var d = new Date(p.debut);
      var jour = $(".jour b", carte), mois = $(".jour small", carte);
      if (jour) jour.textContent = new Intl.DateTimeFormat("fr-CI", { day: "numeric", timeZone: "Africa/Abidjan" }).format(d);
      if (mois) mois.textContent = new Intl.DateTimeFormat("fr-CI", { month: "short", timeZone: "Africa/Abidjan" }).format(d);
    }
    if (p.inscription) document.querySelectorAll("#tpa-2026 a[href*='objet='], #tpa-affiche a[href*='objet=']").forEach(function (a) { a.setAttribute("href", p.inscription); });
  }).catch(function () { /* le contenu statique reste valable */ });
})();
