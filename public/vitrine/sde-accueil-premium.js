/* Accueil premium : agenda dynamique, compte à rebours et indicateurs vérifiés.
   Aucune valeur inventée : les données viennent de /vitrine/evenement-phare.json, /api/public et /api/impact.
   Le HTML contient déjà la fiche du programme phare : la page reste complète sans JavaScript. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var fmtDate = new Intl.DateTimeFormat("fr-CI", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Abidjan" });
  var fmtJour = new Intl.DateTimeFormat("fr-CI", { day: "numeric", timeZone: "Africa/Abidjan" });
  var fmtMois = new Intl.DateTimeFormat("fr-CI", { month: "short", timeZone: "Africa/Abidjan" });
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var nb = new Intl.NumberFormat("fr-FR");
  function json(url) { return fetch(url, { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function lienInscription(titre) { return "/contact?objet=" + encodeURIComponent(titre) + "#rejoindre"; }
  function jourIso(iso) { return new Date(iso + "T12:00:00Z"); }

  function compteARebours(debut) {
    var el = $("ap-countdown"); if (!el || !debut) return;
    function tick() {
      var ms = Date.parse(debut) - Date.now();
      if (!(ms > 0)) { el.hidden = true; el.replaceChildren(); return; }
      var jours = Math.floor(ms / 86400000);
      var heures = Math.floor((ms % 86400000) / 3600000);
      var minutes = Math.floor((ms % 3600000) / 60000);
      var secondes = Math.floor((ms % 60000) / 1000);
      var prefix = document.createElement("span");
      prefix.className = "sde-countdown-prefix"; prefix.textContent = "Dans ";
      var unite = function(nombre,texte) {
        var cellule = document.createElement("span"); cellule.className = "sde-countdown-unit";
        var nombreEl = document.createElement("strong"), libelle = document.createElement("small");
        nombreEl.textContent = String(nombre) + " "; libelle.textContent = texte;
        cellule.append(nombreEl,libelle); return cellule;
      };
      el.hidden = false;
      el.replaceChildren(prefix,unite(jours,"jours"),unite(heures,"h"),unite(minutes,"min"),unite(secondes,"s"));
      el.setAttribute("aria-label","Dans "+jours+" jour(s), "+heures+" heure(s), "+minutes+" minute(s) et "+secondes+" seconde(s)");
    }
    tick(); setInterval(tick,1000);
  }
  function preparerCalendrier(phare) {
    var el = $("sde-tpa-calendar");
    if(!el || !phare || !phare.debut)return;
    var date = new Date(phare.debut),fin = phare.fin ? new Date(phare.fin) : new Date(date.getTime()+3*3600000);
    if(!Number.isFinite(date.getTime()) || !Number.isFinite(fin.getTime()) || fin<=date)return;
    var format = function(d){return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");};
    var p = new URLSearchParams();
    p.set("action","TEMPLATE");
    p.set("text",phare.titre||"Traversée Prophétique Annuelle — TPA 2026");
    p.set("dates",format(date)+"/"+format(fin));
    p.set("details",(phare.lieu||"En ligne")+". La fin de ce créneau est indicative, à confirmer par l'organisateur.");
    el.href="https://calendar.google.com/calendar/render?"+p.toString();
  }

  function evenementsPublics(data) {
    var jour = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(new Date());
    return (data && Array.isArray(data.evenements) ? data.evenements : []).filter(function (e) {
      return e && typeof e.titre === "string" && e.titre.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.date >= jour && !isNaN(jourIso(e.date).getTime());
    }).map(function (e) {
      return { titre: e.titre.trim().slice(0, 140), date: e.date, heure: /^([01]\d|2[0-3]):[0-5]\d$/.test(e.heure || "") ? e.heure : "", lieu: String(e.lieu || "").trim().slice(0, 200), description: String(e.description || "").trim().slice(0, 240), lien: "/programmes#agenda", tri: e.date + (e.heure || "00:00") };
    });
  }

  function heureLisible(h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(h || "") ? h.slice(0, 2) + "h" + h.slice(3) : String(h || ""); }

  function remplirCarte(e) {
    var titre = $("ap-next-title"); if (!titre) return;
    titre.textContent = e.titre;
    var d = $("ap-next-date"); d.textContent = e.dateLibelle || cap(fmtDate.format(jourIso(e.date))); d.setAttribute("datetime", e.debut || e.date);
    $("ap-next-time").textContent = e.heure ? heureLisible(e.heure) : "À confirmer";
    $("ap-next-place").textContent = e.lieu || "À confirmer";
    $("ap-next-text").textContent = e.description || "Retrouvez les informations pratiques dans nos programmes.";
    $("ap-next-register").setAttribute("href", e.inscription || lienInscription(e.titre));
    $("ap-next-more").setAttribute("href", e.lien);
  }

  function agenda(phare, publics) {
    var liste = publics.filter(function (e) {
      /* Une seule fiche par programme : l’événement public qui reprend le programme phare est écarté. */
      return !(phare && phare.titreCourt && e.titre.toLowerCase().indexOf(phare.titreCourt.toLowerCase()) !== -1);
    });
    if (phare && Date.parse(phare.debut) > Date.now()) {
      liste.push({ titre: phare.titre, date: phare.debut.slice(0, 10), debut: phare.debut, dateLibelle: phare.dateLibelle, heure: phare.heure, lieu: phare.lieu, description: phare.description, lien: phare.fiche, inscription: phare.inscription, tri: phare.debut.slice(0, 10) + phare.debut.slice(11, 16) });
    }
    liste.sort(function (a, b) { return a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0; });
    var prochain = liste[0];
    var carte = $("prochain-rendez-vous");
    var estPhare = function(e){return !!(phare && e && e.debut === phare.debut && e.titre === phare.titre);};
    // Le bandeau supérieur présente déjà la TPA : la carte centrale ne la répète pas.
    if(carte)carte.hidden = !prochain || estPhare(prochain);
    if (prochain) remplirCarte(prochain);
    else if (phare && $("ap-next-title")) {
      $("ap-next-title").textContent = "Prochain rendez-vous à annoncer";
      var d0 = $("ap-next-date"); d0.textContent = "À annoncer"; d0.removeAttribute("datetime");
      $("ap-next-time").textContent = "À annoncer"; $("ap-next-place").textContent = "À annoncer";
      $("ap-next-text").textContent = "Les prochaines dates seront publiées dans l’agenda. Vous pouvez aussi contacter le secrétariat.";
      $("ap-next-register").setAttribute("href", "/contact#rejoindre"); $("ap-next-more").setAttribute("href", "/programmes");
    }
    var autres = liste.filter(function(e){return !estPhare(e);});
    var suite = (estPhare(prochain) ? autres : autres.slice(1)).slice(0, 3), ul = $("ap-upcoming-list");
    if (!ul) return;
    ul.textContent = "";
    if (!suite.length) { var empty=document.createElement("li");empty.className="ap-muted";empty.textContent="Aucun autre rendez-vous daté n’est annoncé. Consultez le calendrier pour les nouveautés.";ul.append(empty);return; }
    suite.forEach(function (e) {
      var li = document.createElement("li"), dt = document.createElement("span"), b = document.createElement("b"), sm = document.createElement("small"), txt = document.createElement("span"), a = document.createElement("a"), meta = document.createElement("small");
      dt.className = "ap-date"; b.textContent = fmtJour.format(jourIso(e.date)); sm.textContent = fmtMois.format(jourIso(e.date)).toUpperCase(); dt.append(b, sm);
      a.href = e.lien; a.textContent = e.titre; a.style.fontWeight = "700"; a.style.color = "inherit";
      meta.textContent = [heureLisible(e.heure), e.lieu].filter(Boolean).join(" · ");
      txt.append(a); txt.append(document.createElement("br")); txt.append(meta);
      li.append(dt, txt); ul.append(li);
    });
  }

  function indicateurs(d) {
    var ul = $("ap-indicateurs-liste"), note = $("ap-ind-note");
    if (!ul) return;
    var tuiles = d && d.ok ? [["membresActifs", "membres actifs"], ["pays", "pays où le mouvement est présent"], ["missionsEnCours", "missions en cours"], ["formations", "formations enregistrées"], ["rendezVousAVenir", "rendez-vous publics à venir"]].filter(function (t) { return Number(d[t[0]]) > 0; }) : [];
    var panneau = ul.closest(".ap-indicateurs");
    if (!tuiles.length) { if (panneau) panneau.hidden = true; if (note) note.hidden = true; return; }
    if (panneau) panneau.hidden = false;
    ul.textContent = "";
    tuiles.forEach(function (t) { var li = document.createElement("li"), s = document.createElement("strong"), l = document.createElement("span"); s.textContent = nb.format(Number(d[t[0]])); l.textContent = t[1]; li.append(s, l); ul.append(li); });
    if (note) { note.hidden = false; note.textContent = "Chiffres issus des fiches du mouvement, actualisés à chaque affichage (délai maximal : 5 minutes). Aucun nom ni aucune coordonnée n’est publié."; }
  }

  json("/vitrine/evenement-phare.json").then(function (phare) {
    if (phare) { compteARebours(phare.debut); preparerCalendrier(phare); if (Date.parse(phare.debut) <= Date.now()) { var carteHero = document.querySelector(".sde-tpa-hero-card"); if (carteHero) carteHero.hidden = true; } }
    return Promise.all([Promise.resolve(phare), json("/api/public")]);
  }).then(function (r) { agenda(r[0], evenementsPublics(r[1])); });
  json("/api/impact").then(indicateurs);
})();
