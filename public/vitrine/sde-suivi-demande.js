/* Suivi d’une demande de contact ou d’adhésion : état général uniquement, jamais de donnée personnelle. */
(function () {
  "use strict";
  var form = document.getElementById("form-suivi"), res = document.getElementById("suivi-res");
  if (!form || !res) return;
  var refInput=document.getElementById("s-ref");
  if(refInput){
    refInput.setAttribute("inputmode","text");
    refInput.setAttribute("aria-describedby","s-ref-aide");
    var aide=document.createElement("small");
    aide.id="s-ref-aide";aide.className="sde-ref-help";
    aide.textContent="Format attendu : SDE-12 (votre référence réelle, sans numéro inventé).";
    refInput.insertAdjacentElement("afterend",aide);
    refInput.addEventListener("input",function(){
      var digits=refInput.value.toUpperCase().replace(/^SDE[- ]?/,"").replace(/\D/g,"").slice(0,9);
      refInput.value=digits?"SDE-"+digits:"";
      refInput.classList.toggle("sde-ref-format-ok",digits.length>0);
    });
  }
  function afficher(txt, erreur) { res.textContent = txt; res.setAttribute("data-erreur", erreur ? "true" : "false"); }
  function etapesDuServeur(d) {
    var progression=document.createElement("ol");
    progression.className="sde-suivi-steps";progression.setAttribute("aria-label","Avancement réel de votre demande");
    var noms=["Reçue","Suivi en cours","Traitée"];
    var step=Math.min(3,Math.max(1,Number(d.etape)||1));
    noms.forEach(function(n,i){
      var li=document.createElement("li");li.textContent=(i+1)+". "+n;
      if(i+1<step)li.classList.add("sde-step-done");
      if(i+1===step)li.setAttribute("aria-current","step");
      progression.append(li);
    });
    return progression;
  }
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
        res.append(t, p, etapesDuServeur(d)); res.setAttribute("data-erreur", "false");
      })
      .catch(function () { afficher("Le suivi est momentanément indisponible. Vous pouvez écrire au secrétariat.", true); })
      .finally(function () { bouton.disabled = false; });
  });
})();
