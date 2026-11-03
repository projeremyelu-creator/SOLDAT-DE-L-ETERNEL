/* Suivi d’une demande de contact ou d’adhésion : état général uniquement, jamais de donnée personnelle. */
(function () {
  "use strict";
  var form = document.getElementById("form-suivi"), res = document.getElementById("suivi-res");
  if (!form || !res) return;
  function afficher(txt, erreur) { res.textContent = txt; res.setAttribute("data-erreur", erreur ? "true" : "false"); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ref = document.getElementById("s-ref").value.trim(), contact = document.getElementById("s-contact").value.trim();
    if (!ref || contact.length < 4) { afficher("Indiquez la référence reçue et les 4 derniers chiffres de votre téléphone (ou votre e-mail).", true); return; }
    var bouton = form.querySelector("button[type=submit]"); bouton.disabled = true; afficher("Vérification en cours…", false);
    fetch("/api/engager/suivi?ref=" + encodeURIComponent(ref) + "&contact=" + encodeURIComponent(contact), { credentials: "omit", cache: "no-store" })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok || !x.d || !x.d.ok) { afficher((x.d && x.d.message) || "Aucune demande ne correspond à ces informations.", true); return; }
        var d = x.d;
        res.textContent = "";
        var t = document.createElement("strong"); t.textContent = d.reference + " · " + d.statut;
        var p = document.createElement("p"); p.textContent = d.message + " Demande du " + d.recueLe + " (" + d.objet + ").";
        res.append(t, p); res.setAttribute("data-erreur", "false");
      })
      .catch(function () { afficher("Le suivi est momentanément indisponible. Vous pouvez écrire au secrétariat.", true); })
      .finally(function () { bouton.disabled = false; });
  });
})();
