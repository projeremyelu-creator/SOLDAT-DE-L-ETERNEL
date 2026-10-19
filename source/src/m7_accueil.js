  /* ════════════════════════ Accueil (Ézéchiel 37) ════════════════════════ */
  /* Texte fondateur du mouvement : Ézéchiel 37, la vallée des ossements desséchés (Louis Segond 1910). */
  const EZ37 = [
    ["Fils de l’homme, ces os pourront-ils revivre ? Je répondis : Seigneur Éternel, tu le sais.", "Ézéchiel 37.3"],
    ["Ossements desséchés, écoutez la parole de l’Éternel !", "Ézéchiel 37.4"],
    ["Voici, je vais faire entrer en vous un esprit, et vous vivrez.", "Ézéchiel 37.5"],
    ["Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent !", "Ézéchiel 37.9"],
    ["Et l’esprit entra en eux, et ils reprirent vie, et ils se tinrent sur leurs pieds : c’était une armée nombreuse, très nombreuse.", "Ézéchiel 37.10"],
    ["Je mettrai mon esprit en vous, et vous vivrez ; je vous rétablirai dans votre pays, et vous saurez que moi, l’Éternel, j’ai parlé et agi.", "Ézéchiel 37.14"],
  ];
  const HERO = { idx: 4, timer: 0, raf: 0, cv: null, parts: [], souffle: 0, anime: false, cd: 0 };
  function versetHero(i) {
    const [t, r] = EZ37[i];
    return `<blockquote class="hero-v" id="hero-v"><p>« ${esc(t)} »</p><cite>${esc(r)}</cite></blockquote>`;
  }
  function decompte(e) {
    if (!e) return null;
    const [h, mi] = String(e.heure || "08:00").split(":").map(Number);
    const d = versDate(e.date); d.setHours(h || 0, mi || 0, 0, 0);
    return d;
  }
  function texteDecompte(cible, court) {
    const ms = cible - new Date();
    if (ms <= 0) return ms > -3 * 36e5 ? "C’est maintenant !" : "En cours";
    if (court) { const j = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5); return j ? `dans ${j} j ${pad(h)} h` : `dans ${h} h ${pad(Math.floor((ms % 36e5) / 6e4))} min`; }
    const j = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    return j ? `${j} j ${pad(h)} h ${pad(m)} min` : `${pad(h)} h ${pad(m)} min ${pad(s)} s`;
  }
  function compteurs() {
    const reg = accesRegistre();
    const out = [];
    if (reg && S.pret.membres) {
      const actifs = membresActifs();
      out.push({ n: actifs.length, l: "soldats", d: "dans l’armée", vue: "membres", ico: "i-users" });
      const pts = pointsSDE();
      out.push({ n: pts.length, l: pts.length > 1 ? "points SDE" : "point SDE", d: `${new Set(pts.map((g) => isoDePays(g.pays)).filter(Boolean)).size} pays`, vue: "garnisons", ico: "i-pin" });
      const evts = evtsPeriode("3m", "");
      const taux = actifs.map((m) => statsMembre(m, evts).taux).filter((t) => t != null);
      out.push({ n: taux.length ? Math.round((taux.reduce((a, b) => a + b, 0) / taux.length) * 100) : null, suf: " %", l: "d’assiduité", d: evts.length ? "sur trois mois" : "pointez un rassemblement", vue: "agenda", ico: "i-ucheck" });
    }
    if (reg && S.pret.projets) out.push({ n: (S.projets || []).filter(estActifP).length, l: "projets", d: "en cours", vue: "projets", ico: "i-proj" });
    if (reg && S.pret.prieres) out.push({ n: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length, l: "requêtes", d: "devant le trône", vue: "chambre", ico: "i-flame" });
    out.push({ n: aVenir().length, l: "rassemblements", d: "à venir", vue: "agenda", ico: "i-cal" });
    return out;
  }
  function priorites() {
    const l = [];
    if (!accesRegistre()) return l;
    const auj = aujourdhui();
    const nRap = rappelsEnAttente();
    if (nRap) l.push({ ico: "i-msg", t: `${pluriel(nRap, "rappel WhatsApp", "rappels WhatsApp")} à envoyer`, d: "Anniversaires, rassemblements, cotisations : messages prêts", act: "aller-sous", data: 'data-vue-cible="portevoix" data-sous="rappels"', cls: "gold" });
    if (sauvegardeDue()) l.push({ ico: "i-down", t: "Sauvegarde Excel du mois", d: cfg().derniereSauvegarde ? `Dernière le ${fmtCourt(cfg().derniereSauvegarde)}` : "Aucune sauvegarde Excel enregistrée", act: "sauvegarde-excel", data: "", cls: "warn" });
    const nonPointes = S.evenements.filter((e) => e.date < auj && e.date >= ajoutJours(auj, -14) && !estPointe(e) && !e.garnisonId).slice(0, 2);
    nonPointes.forEach((e) => l.push({ ico: "i-ucheck", t: `Pointer « ${e.titre} »`, d: `${fmtCourt(e.date)} · présences non saisies`, act: "pointer-evt", data: `data-id="${esc(e.id)}"`, cls: "warn" }));
    membresActifs().filter((m) => { const a = prochainAnniv(m); return a && a.dans === 0; }).forEach((m) => l.push({ ico: "i-cake", t: `Souhaiter l’anniversaire de ${nomCourtM(m)}`, d: "C’est aujourd’hui", act: "voeux", data: `data-id="${esc(m.id)}"`, cls: "gold" }));
    if (accesDirection() && S.pret.suivi) {
      const echus = (S.suivi || []).filter((s) => s.prochainSuivi && s.prochainSuivi <= auj && membre(s.membreId || s.id));
      if (echus.length) l.push({ ico: "i-users", t: `${pluriel(echus.length, "suivi pastoral", "suivis pastoraux")} à faire`, d: echus.map((s) => nomCourtM(membre(s.membreId || s.id))).slice(0, 3).join(", "), act: "aller-veille", data: "", cls: "warn" });
    }
    const sp = suiviPastoral();
    if (sp.pret && sp.liste.length) l.push({ ico: "i-phone", t: `${pluriel(sp.liste.length, "membre absent", "membres absents")} à appeler`, d: "Absents des trois derniers rassemblements", act: "aller-sous", data: 'data-vue-cible="membres" data-sous="suivi"', cls: "" });
    if (S.pret.projets) {
      const ret = (S.projets || []).filter((p) => !estClosP(p)).flatMap(tachesP).filter(tacheEnRetard).length;
      if (ret) l.push({ ico: "i-proj", t: `${pluriel(ret, "tâche de projet", "tâches de projet")} en retard`, d: "Relancer les responsables", act: "aller-sous", data: 'data-vue-cible="projets" data-sous="taches"', cls: "" });
    }
    if (S.pret.membres) {
      const sans = membresActifs().filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId)).length;
      if (sans) l.push({ ico: "i-pin", t: `${pluriel(sans, "soldat sans point SDE", "soldats sans point SDE")}`, d: "À rattacher sur la cartographie", act: "aller-sous", data: 'data-vue-cible="garnisons" data-sous="sans"', cls: "" });
    }
    return l.slice(0, 6);
  }
  function actionsRapides() {
    const a = [];
    const prochain = aVenir()[0];
    if (peutEcrire() && prochain) a.push(["pointer-evt", "Pointer", "i-ucheck", `data-id="${esc(prochain.id)}"`]);
    if (peutEcrire() && accesRegistre()) a.push(["ajout-membre", "Nouveau soldat", "i-plus", ""]);
    if (peutEcrire()) a.push(["ajout-annonce", "Annonce", "i-horn", ""]);
    a.push(["nouvelle-affiche", "Affiche", "i-image", 'data-modele="evenement"']);
    if (S.sample) a.push(["aller-ia", "Éliézer", "i-spark", ""]);
    if (accesRegistre()) a.push(["aller-chambre", "Prier", "i-flame", ""]);
    if (accesRegistre()) a.push(["aller-sous", "Rappels", "i-msg", 'data-vue-cible="portevoix" data-sous="rappels"']);
    if (!accesRegistre()) a.unshift(["aller-sous", "Mon espace", "i-card", 'data-vue-cible="espace" data-sous=""']);
    if (peutAdmin()) a.push(["ajout-offrande", "Offrande", "i-in", ""]);
    a.push(["installer", "Installer", "i-phone", ""]);
    return `<nav class="rapides" aria-label="Actions rapides">${a.map(([act, l, ico, data]) => `<button class="rapide" type="button" data-act="${act}"${data ? " " + data : ""}><span class="rapide-i" aria-hidden="true">${I(ico)}</span><span>${esc(l)}</span></button>`).join("")}</nav>`;
  }
  function bandeauAujourdhui() {
    const tuiles = [];
    const e = aVenir()[0];
    if (e) {
      const cible = decompte(e);
      tuiles.push(`<section class="auj auj-evt" aria-label="Prochain rassemblement"><p class="auj-k">${I("i-cal")}Prochain rassemblement</p><h2 class="auj-t">${esc(e.titre)}</h2><p class="auj-m">${esc([fmtLong(e.date), fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · "))}</p><p class="decompte" id="decompte" data-t="${cible.getTime()}" aria-live="off">${esc(texteDecompte(cible, true))}</p><div class="btn-row">${peutEcrire() && e.date === aujourdhui() ? btn("pointer-evt", "Pointer maintenant", { ico: "i-ucheck", sm: true, cls: "btn-primary", data: `data-id="${esc(e.id)}"` }) : ""}${btn("voir-evt", "Détails", { sm: true, data: `data-id="${esc(e.id)}"` })}${btn("affiche-evt", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(e.id)}"` })}${btn("annonce-evt", "Inviter", { ico: "i-msg", sm: true, data: `data-id="${esc(e.id)}"` })}</div></section>`);
    } else tuiles.push(`<section class="auj auj-evt"><p class="auj-k">${I("i-cal")}Prochain rassemblement</p><h2 class="auj-t">Rien de programmé</h2><p class="auj-m">Ajoutez le prochain culte, la prochaine veillée ou réunion.</p>${peutEcrire() ? `<div class="btn-row">${btn("ajout-evt", "Programmer", { ico: "i-plus", sm: true })}</div>` : ""}</section>`);
    if (accesRegistre() && S.pret.membres) {
      const ann = membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= 7).sort((x, y) => x.a.dans - y.a.dans);
      tuiles.push(`<section class="auj auj-anniv" aria-label="Anniversaires"><p class="auj-k">${I("i-cake")}Anniversaires de la semaine</p>${ann.length ? `<ul class="auj-l">${ann.slice(0, 4).map(({ m, a }) => `<li>${avatar(m)}<span><b>${esc(nomCourtM(m))}</b><small>${esc(a.dans === 0 ? "Aujourd’hui !" : a.dans === 1 ? "Demain" : fmtJM(a.date))}</small></span><span class="auj-b"><button class="icon-btn" type="button" data-act="voeux" data-id="${esc(m.id)}" aria-label="${esc(`Souhaiter l’anniversaire de ${nomCourtM(m)}`)}">${I("i-msg")}</button><button class="icon-btn" type="button" data-act="affiche-anniv" data-id="${esc(m.id)}" aria-label="${esc(`Affiche d’anniversaire de ${nomCourtM(m)}`)}">${I("i-image")}</button></span></li>`).join("")}</ul>${ann.length > 4 ? `<p class="auj-m">et ${pluriel(ann.length - 4, "autre", "autres")}</p>` : ""}` : `<p class="auj-m">Aucun anniversaire dans les sept prochains jours.</p>`}</section>`);
    }
    if (accesRegistre() && S.pret.chaine) {
      const ch = chaine();
      tuiles.push(`<section class="auj auj-priere" aria-label="Chambre Haute"><p class="auj-k">${I("i-flame")}Sujet de la semaine</p><h2 class="auj-t">${esc(ch.sujetSemaine || "Que l’Esprit souffle sur les nations")}</h2>${ch.versetSemaine ? `<p class="auj-m"><i>${esc(ch.versetSemaine)}</i></p>` : ""}<div class="btn-row">${btn("aller-chambre", "Entrer dans la Chambre Haute", { ico: "i-flame", sm: true })}</div></section>`);
    }
    return `<div class="aujourdhui">${tuiles.join("")}</div>`;
  }
  VUES.accueil = function () {
    const c = cfg();
    const h = new Date().getHours();
    const salut = h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
    const prenom = (S.me.name || "").trim().split(/\s+/)[0] || "";
    const nbSoldats = accesRegistre() && S.pret.membres ? membresActifs().length : null;
    let out = `<section class="acc-hero" aria-label="Accueil">
      <canvas class="hero-cv" id="hero-cv" aria-hidden="true"></canvas>
      <svg class="hero-vallee" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 160 L0 98 C140 70 230 118 360 92 C500 64 560 112 700 86 C840 60 930 104 1060 80 C1120 70 1170 78 1200 74 L1200 160 Z"/><path class="v2" d="M0 160 L0 124 C180 104 300 140 470 118 C640 96 760 136 930 114 C1060 98 1140 110 1200 104 L1200 160 Z"/></svg>
      <div class="hero-c">
        <div class="hero-top"><span class="logo lg" aria-hidden="true"></span><div><p class="hero-k">${salut}${prenom ? ", " + esc(prenom) : ""} · ${esc(fmtLong(aujourdhui()))}</p><p class="hero-m">${esc(c.nomOfficiel)}</p></div></div>
        <p class="hero-fond">Texte fondateur · Ézéchiel 37</p>
        ${versetHero(HERO.idx)}
        <div class="hero-pts" role="group" aria-label="Versets d’Ézéchiel 37">${EZ37.map(([, r], i) => `<button type="button" class="hero-pt${i === HERO.idx ? " on" : ""}" data-act="hero-verset" data-i="${i}" aria-label="${esc(r)}" aria-pressed="${i === HERO.idx}"></button>`).join("")}</div>
        <div class="hero-a"><button class="btn btn-souffle" type="button" data-act="souffle">${I("i-spark")}Esprit, viens des quatre vents !</button>${nbSoldats != null ? `<p class="hero-armee" id="hero-armee" aria-live="polite"><b data-compte="${nbSoldats}">${nb(nbSoldats)}</b> soldats debout · ${esc(c.devise || "")}</p>` : `<p class="hero-armee">${esc(c.devise || "")}</p>`}</div>
      </div>
    </section>`;
    if (S.etat === "absent") return out + nonConnecte("Les membres, l’agenda et la vie du mouvement");
    out += actionsRapides();
    out += bandeauAujourdhui();
    if (!accesRegistre()) out += `<section class="card esp-promo"><div class="esp-entree-i" aria-hidden="true">${I("i-card")}</div><div><h2 class="h3" style="margin:0">Mon espace soldat</h2><p class="hint" style="margin:4px 0 10px">${ESP.data ? `Bonjour ${esc(prenomUsuel(ESP.data.m))} : votre carte, vos présences et vos cotisations vous attendent.` : "Avec votre code personnel : votre carte de membre, vos présences, vos cotisations et vos requêtes de prière."}</p><button class="btn btn-primary btn-sm" type="button" data-vue="espace">${I("i-right")}Ouvrir mon espace</button></div></section>`;
    const cs = compteurs();
    if (cs.length) out += `<div class="chiffres">${cs.map((k) => `<button class="chiffre" type="button" data-vue="${k.vue}"><span class="chiffre-i" aria-hidden="true">${I(k.ico)}</span><b data-compte="${k.n == null ? "" : k.n}" data-suf="${esc(k.suf || "")}">${k.n == null ? "—" : nb(k.n) + (k.suf || "")}</b><span class="chiffre-l">${esc(k.l)}</span><small>${esc(k.d)}</small></button>`).join("")}</div>`;
    const pr = priorites();
    if (pr.length) out += `<section class="prio" aria-labelledby="prio-t"><h2 class="h3" id="prio-t">À faire aujourd’hui</h2><div class="prio-l">${pr.map((p) => `<button class="prio-i ${p.cls}" type="button" data-act="${p.act}"${p.data ? " " + p.data : ""}><span class="prio-ico" aria-hidden="true">${I(p.ico)}</span><span class="prio-x"><b>${esc(p.t)}</b><small>${esc(p.d)}</small></span>${I("i-right", "ico prio-f")}</button>`).join("")}</div></section>`;
    const cartes = [];
    const ann = carteAnnonces();
    if (ann) cartes.push(ann);
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteChambre());
    if (accesRegistre()) cartes.push(carteProjets());
    if (accesRegistre()) { cartes.push(carteLieux()); }
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesRegistre()) cartes.push(carteAcademie());
    if (accesDirection()) cartes.push(carteVeille());
    if (accesRegistre()) { cartes.push(carteDecisions()); cartes.push(carteEffectif()); cartes.push(carteSuivi()); }
    out += `<h2 class="h3 acc-sec">La vie du mouvement</h2><div class="grid g3">${cartes.join("")}</div>`;
    if (accesFinances()) out += `<details class="direction" id="esp-direction"${S.accDirOuvert ? " open" : ""}><summary>${I("i-lock")}<span>Espace direction · caisse et cotisations</span>${I("i-right", "ico dir-f")}</summary><div class="btn-row dir-outils">${btn("sauvegarde-excel", "Sauvegarde Excel", { ico: "i-down", sm: true })}${btn("espaces", "Espaces soldats", { ico: "i-card", sm: true })}${btn("copie-poche", "Copie de poche", { ico: "i-down", sm: true })}</div><div class="grid g3" style="margin-top:12px">${carteCaisse()}${carteCotis()}</div></details>`;
    return out;
  };
  /* Animation : souffle de l’Esprit (particules qui montent de la vallée) */
  function initHero() {
    const cv = $("#hero-cv");
    if (!cv) { cancelAnimationFrame(HERO.raf); HERO.raf = 0; HERO.cv = null; clearInterval(HERO.timer); HERO.timer = 0; clearInterval(HERO.cd); HERO.cd = 0; HERO.anime = false; return; }
    const reduit = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (HERO.cv !== cv) {
      HERO.cv = cv;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      if (!HERO.parts.length) for (let i = 0; i < 70; i += 1) HERO.parts.push(nouvellePart(cv, true));
      if (!reduit && !HERO.raf) HERO.raf = requestAnimationFrame(boucleHero);
      if (reduit) dessinerHero();
    }
    if (!HERO.timer && !reduit) HERO.timer = setInterval(() => { if (document.hidden) return; changerVerset((HERO.idx + 1) % EZ37.length); }, 9000);
    if (!HERO.cd) HERO.cd = setInterval(majDecompte, 1000);
    if (!HERO.anime) { HERO.anime = true; animerCompteurs(); }
  }
  function nouvellePart(cv, partout) {
    const w = cv.width, h = cv.height;
    return { x: Math.random() * w, y: partout ? Math.random() * h : h + Math.random() * 40, r: 0.6 + Math.random() * 2.2, v: 0.15 + Math.random() * 0.55, a: 0.15 + Math.random() * 0.6, o: Math.random() * Math.PI * 2 };
  }
  function dessinerHero() {
    const cv = HERO.cv;
    if (!cv) return;
    const x = cv.getContext("2d");
    x.clearRect(0, 0, cv.width, cv.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const p of HERO.parts) {
      const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4 * dpr);
      g.addColorStop(0, `rgba(255,214,120,${p.a})`); g.addColorStop(1, "rgba(255,170,60,0)");
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 4 * dpr, 0, Math.PI * 2); x.fill();
    }
  }
  function boucleHero() {
    HERO.raf = 0;
    const cv = HERO.cv;
    if (!cv || !document.contains(cv)) return;
    if (!document.hidden) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const boost = 1 + HERO.souffle * 6;
      for (const p of HERO.parts) {
        p.o += 0.02;
        p.y -= p.v * dpr * boost;
        p.x += Math.sin(p.o) * 0.35 * dpr + (HERO.souffle ? (p.x < cv.width / 2 ? -1 : 1) * HERO.souffle * 1.2 * dpr : 0);
        if (p.y < -10 || p.x < -20 || p.x > cv.width + 20) Object.assign(p, nouvellePart(cv, false));
      }
      if (HERO.souffle) HERO.souffle = Math.max(0, HERO.souffle - 0.008);
      dessinerHero();
    }
    HERO.raf = requestAnimationFrame(boucleHero);
  }
  function changerVerset(i) {
    HERO.idx = i;
    const v = $("#hero-v");
    if (!v) return;
    v.classList.add("sort");
    setTimeout(() => {
      const n = $("#hero-v");
      if (n) { n.outerHTML = versetHero(HERO.idx); }
      document.querySelectorAll(".hero-pt").forEach((b, k) => { b.classList.toggle("on", k === HERO.idx); b.setAttribute("aria-pressed", String(k === HERO.idx)); });
    }, 350);
  }
  function majDecompte() {
    const el = $("#decompte");
    if (!el) return;
    const t = texteDecompte(new Date(Number(el.dataset.t))); el.textContent = /^\d/.test(t) ? "dans " + t : t;
  }
  function animerCompteurs() {
    const reduit = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return;
    document.querySelectorAll("[data-compte]").forEach((el) => {
      const fin = Number(el.dataset.compte);
      if (!el.dataset.compte || !isFinite(fin)) return;
      const suf = el.dataset.suf || "";
      const t0 = performance.now(), duree = 1100;
      const pas = (t) => { const k = Math.min(1, (t - t0) / duree); const e = 1 - Math.pow(1 - k, 3); if (document.contains(el)) el.textContent = nb(Math.round(fin * e)) + suf; if (k < 1) requestAnimationFrame(pas); };
      requestAnimationFrame(pas);
    });
  }
  function souffler() {
    HERO.souffle = 1;
    if (HERO.cv) for (let i = 0; i < 60; i += 1) HERO.parts.push(nouvellePart(HERO.cv, false));
    HERO.parts = HERO.parts.slice(-160);
    if (!HERO.raf && HERO.cv) HERO.raf = requestAnimationFrame(boucleHero);
    changerVerset(4);
    const ar = $("#hero-armee b");
    if (ar) { HERO.anime = true; ar.closest(".hero-armee").classList.add("eclat"); const fin = Number(ar.dataset.compte) || 0; const t0 = performance.now(); const pas = (t) => { const k = Math.min(1, (t - t0) / 1600); if (document.contains(ar)) ar.textContent = nb(Math.round(fin * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(pas); }; requestAnimationFrame(pas); setTimeout(() => { const p = $("#hero-armee"); if (p) p.classList.remove("eclat"); }, 2200); }
  }
  document.addEventListener("toggle", (ev) => { if (ev.target && ev.target.id === "esp-direction") { S.accDirOuvert = ev.target.open; dernier.main = null; } }, true);
