/* Témoignages publiés : uniquement ceux validés par un responsable et marqués « vitrine ».
   Texte brut (textContent), médias limités aux adresses https ou aux fichiers du site. */
(function () {
  "use strict";
  var grille = document.getElementById("tm-grille"), vide = document.getElementById("tm-vide"), filtres = document.getElementById("tm-filtres");
  if (!grille || !vide || !filtres) return;
  var tous = [], actif = "";
  function carte(t) {
    var a = document.createElement("article"); a.className = "tm-carte"; a.setAttribute("data-categorie", t.categorie);
    var cat = document.createElement("span"); cat.className = "tm-cat"; cat.textContent = t.categorie; a.append(cat);
    if (t.media && t.media.type === "photo") { var img = document.createElement("img"); img.src = t.media.url; img.alt = "Photo illustrant le témoignage de " + t.auteur; img.loading = "lazy"; img.width = 640; img.height = 400; a.append(img); }
    if (t.media && t.media.type === "audio") { var au = document.createElement("audio"); au.controls = true; au.preload = "none"; au.src = t.media.url; au.setAttribute("aria-label", "Écouter le témoignage de " + t.auteur); a.append(au); }
    var q = document.createElement("blockquote"); q.textContent = t.texte; a.append(q);
    if (t.media && t.media.type === "video") { var l = document.createElement("a"); l.className = "pg-btn"; l.href = t.media.url; l.target = "_blank"; l.rel = "noopener noreferrer"; l.textContent = "Voir la vidéo"; a.append(l); }
    var f = document.createElement("footer"); f.textContent = "— " + t.auteur + (t.date ? " · " + t.date.slice(0, 4) : ""); a.append(f);
    return a;
  }
  function rendre() {
    grille.textContent = "";
    var liste = tous.filter(function (t) { return !actif || t.categorie === actif; });
    liste.forEach(function (t) { grille.append(carte(t)); });
    vide.hidden = liste.length > 0;
    if (!liste.length) vide.textContent = tous.length ? "Aucun témoignage dans cette catégorie pour le moment." : "Aucun témoignage n’est encore publié ici. Les témoignages sont affichés après relecture et avec l’accord de leur auteur : vous pouvez proposer le vôtre ci-dessous.";
  }
  function boutons(categories) {
    filtres.textContent = "";
    var presentes = categories.filter(function (c) { return tous.some(function (t) { return t.categorie === c; }); });
    if (presentes.length < 2) { filtres.hidden = true; return; }
    [""].concat(presentes).forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = c || "Tous"; b.setAttribute("aria-pressed", String(c === actif));
      b.addEventListener("click", function () { actif = c; filtres.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); rendre(); });
      filtres.append(b);
    });
    filtres.hidden = false;
  }
  fetch("/api/temoignages-publics", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    tous = d && Array.isArray(d.temoignages) ? d.temoignages : [];
    boutons(d && Array.isArray(d.categories) ? d.categories : []);
    rendre();
  }).catch(function () { vide.textContent = "Les témoignages publiés sont momentanément indisponibles."; });
})();
