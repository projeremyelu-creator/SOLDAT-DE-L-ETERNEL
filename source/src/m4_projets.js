  /* ════════════════════════ Projets ════════════════════════ */
  const CATEGORIES_PROJET = ["Construction et aménagement", "Mission et évangélisation", "Action sociale", "Médias et communication", "Formation", "Événement", "Équipement", "Autre"];
  const STATUTS_PROJET = ["Idée", "En préparation", "En cours", "Suspendu", "Terminé", "Abandonné"];
  const PRIORITES = ["Haute", "Normale", "Basse"];
  const STATUTS_TACHE = ["À faire", "En cours", "Fait"];
  const categorieProjet = () => cfg().categoriesEntree.find((x) => norm(x) === norm("Cotisations de projets")) || "Cotisations de projets";
  const projet = (id) => (S.projets || []).find((p) => p.id === id) || null;
  const finProjet = (id) => (S.projetsFin || []).find((x) => x.id === id) || {};
  const listeObj = (o) => Object.entries(o || {}).filter(([, v]) => v && typeof v === "object").map(([id, v]) => ({ id, ...v }));
  const somme = (l) => l.reduce((t, x) => t + (Number(x.montant) || 0), 0);
  const nouvelId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const jalonsP = (p) => listeObj(p.jalons).sort((a, b) => cmpFr(a.date || "9999", b.date || "9999") || (a.ordre || 0) - (b.ordre || 0));
  const RANG_T = { "En cours": 0, "À faire": 1, Fait: 2 };
  const tachesP = (p) => listeObj(p.taches).sort((a, b) => (RANG_T[a.statut] ?? 1) - (RANG_T[b.statut] ?? 1) || cmpFr(a.echeance || "9999", b.echeance || "9999") || (a.creeLe || 0) - (b.creeLe || 0));
  const lignesP = (p) => listeObj(p.lignes).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const notesP = (p) => listeObj(p.notes).sort((a, b) => (b.le || 0) - (a.le || 0));
  const budgetP = (p) => somme(lignesP(p)) || Number(p.budget) || 0;
  const statutP = (p) => p.statut || "En préparation";
  const estActifP = (p) => ["En préparation", "En cours", "Suspendu"].includes(statutP(p));
  const estClosP = (p) => ["Terminé", "Abandonné"].includes(statutP(p));
  const tacheEnRetard = (t) => t.statut !== "Fait" && t.echeance && t.echeance < aujourdhui();
  function avancementP(p) {
    const j = jalonsP(p), t = tachesP(p);
    const items = j.length ? j.map((x) => !!x.fait) : t.map((x) => x.statut === "Fait");
    if (!items.length) return statutP(p) === "Terminé" ? 1 : null;
    return items.filter(Boolean).length / items.length;
  }
  const CHIP_STATUT_P = { Idée: "", "En préparation": "info", "En cours": "ok", Suspendu: "warn", Terminé: "ok", Abandonné: "" };
  const chipStatutP = (p) => `<span class="chip ${CHIP_STATUT_P[statutP(p)] || ""}">${esc(statutP(p))}</span>`;
  function cibleP(p, f) {
    const c = f.cible || { type: "equipe" };
    if (c.type === "tous") return { lib: "Tous les membres actifs", liste: membresActifs() };
    if (c.type === "garnison" && garnison(c.valeur)) return { lib: garnison(c.valeur).nom, liste: membresDeG(c.valeur, true) };
    if (c.type === "pole" && c.valeur) return { lib: c.valeur, liste: membresActifs().filter((m) => m.pole === c.valeur) };
    const ids = new Set([...(p.equipe || []), p.responsableId].filter(Boolean));
    return { lib: "L’équipe du projet", liste: membresActifs().filter((m) => ids.has(m.id)) };
  }
  function bilanFinP(p) {
    const f = finProjet(p.id);
    const tousV = listeObj(f.versements).sort((a, b) => cmpFr(b.date || "", a.date || ""));
    const tousD = listeObj(f.depenses).sort((a, b) => cmpFr(b.date || "", a.date || ""));
    const vs = tousV.filter((v) => !v.annule), ds = tousD.filter((d) => !d.annule);
    const parM = {};
    vs.forEach((v) => { if (v.membreId) parM[v.membreId] = (parM[v.membreId] || 0) + (Number(v.montant) || 0); });
    const promesses = {};
    Object.entries(f.promesses || {}).forEach(([mid, x]) => { if (x && Number(x.montant) > 0) promesses[mid] = { montant: Number(x.montant), date: x.date || "" }; });
    const cible = cibleP(p, f);
    const mt = Number(f.montantParMembre) || 0;
    const collecte = somme(vs), depense = somme(ds);
    const objectif = Number(f.objectifCollecte) || (mt ? mt * cible.liste.length : budgetP(p));
    const depParLigne = {};
    ds.forEach((d) => { depParLigne[d.ligneId || ""] = (depParLigne[d.ligneId || ""] || 0) + (Number(d.montant) || 0); });
    const promis = Object.values(promesses).reduce((t, x) => t + x.montant, 0);
    return { f, tousV, tousD, vs, ds, parM, promesses, promis, cible, mt, collecte, depense, solde: collecte - depense, objectif, taux: objectif ? collecte / objectif : null, depParLigne };
  }
  const attenduMembreP = (b, mid) => Math.max(b.mt, (b.promesses[mid] || {}).montant || 0);
  function rowProjet(p) {
    const av = avancementP(p);
    const resp = membre(p.responsableId);
    const tOuvertes = tachesP(p).filter((t) => t.statut !== "Fait");
    const retard = tOuvertes.filter(tacheEnRetard).length;
    const meta = [p.categorie, resp ? "resp. " + nomCourtM(resp) : "", p.dateFin ? `fin ${fmtCourt(p.dateFin)}` : "", tOuvertes.length ? pluriel(tOuvertes.length, "tâche ouverte", "tâches ouvertes") : ""].filter(Boolean).join(" · ");
    const fin = accesDirection() && S.pret.projetsFin ? bilanFinP(p) : null;
    return `<button class="row" type="button" data-act="voir-projet" data-id="${esc(p.id)}"><span class="g-ico" aria-hidden="true">${I("i-proj")}</span><span class="row-main"><span class="row-t">${esc(p.titre || "Sans titre")}</span><span class="row-m">${esc(meta)}</span>${av != null ? `<span class="bar slim${av >= 1 ? " ok" : ""}" aria-hidden="true"><i style="width:${(av * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r">${av != null ? `<b class="taux">${pct(av)}</b>` : ""}${chipStatutP(p)}${p.priorite === "Haute" && !estClosP(p) ? `<span class="chip danger">Priorité haute</span>` : ""}${retard ? `<span class="chip warn">${pluriel(retard, "tâche en retard", "tâches en retard")}</span>` : ""}${fin && fin.collecte ? `<span class="amt in">${nb(fin.collecte)}</span>` : ""}</span></button>`;
  }
  VUES.projets = function () {
    const ecr = peutEcrire();
    let out = secHead("Projets", { eyebrow: "Bâtir ensemble", verset: VERSETS.projets, actions: ecr ? btn("ajout-projet", "Nouveau projet", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les projets du mouvement");
    if (!S.pret.projets || !S.pret.membres) return out + chargement("Lecture des projets…");
    const tous = S.projets || [];
    const actifs = tous.filter(estActifP), idees = tous.filter((p) => statutP(p) === "Idée"), clos = tous.filter(estClosP);
    const tOuv = tous.filter((p) => !estClosP(p)).flatMap((p) => tachesP(p).filter((t) => t.statut !== "Fait").map((t) => ({ t, p })));
    out += sousOnglets("projets", [["actifs", "En cours", actifs.length], ["idees", "Idées", idees.length], ["taches", "Tâches", tOuv.length], ["clos", "Terminés", clos.length]]);
    if (!tous.length) return out + vide("i-proj", "Aucun projet enregistré. Créez un projet (construction, mission, action sociale, équipement…) : objectifs, équipe, étapes, tâches, budget par poste, cotisations des membres et dépenses, tout est suivi au même endroit.", ecr ? btn("ajout-projet", "Créer le premier projet", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    if (S.sous.projets === "taches") return out + vueTachesProjets(tOuv);
    if (S.sous.projets === "actifs") {
      const retard = tOuv.filter(({ t }) => tacheEnRetard(t)).length;
      const budget = actifs.reduce((t, p) => t + budgetP(p), 0);
      const fin = accesDirection() && S.pret.projetsFin ? actifs.map(bilanFinP) : null;
      const jal = actifs.flatMap(jalonsP);
      out += `<div class="stats s4">
        <div class="stat"><span class="stat-l">${I("i-proj")}Projets en cours</span><span class="stat-v">${nb(actifs.length)}</span><span class="stat-m">${pluriel(idees.length, "idée en attente", "idées en attente")}</span></div>
        <div class="stat${retard ? " out" : ""}"><span class="stat-l">Tâches ouvertes</span><span class="stat-v">${nb(tOuv.length)}</span><span class="stat-m">${retard ? pluriel(retard, "en retard", "en retard") : "Aucune en retard"}</span></div>
        <div class="stat"><span class="stat-l">Budget prévu</span><span class="stat-v">${nb(budget)}<small>FCFA</small></span><span class="stat-m">${pluriel(jal.filter((j) => j.fait).length, "étape atteinte", "étapes atteintes")} sur ${nb(jal.length)}</span></div>
        ${fin ? `<div class="stat in"><span class="stat-l">${I("i-in")}Collecté</span><span class="stat-v">${nb(fin.reduce((t, b) => t + b.collecte, 0))}<small>FCFA</small></span><span class="stat-m">${esc(fcfa(fin.reduce((t, b) => t + b.depense, 0)))} dépensés</span></div>` : `<div class="stat"><span class="stat-l">Avancement moyen</span><span class="stat-v">${pct((() => { const a = actifs.map(avancementP).filter((x) => x != null); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; })())}</span><span class="stat-m">Étapes ou tâches réalisées</span></div>`}</div>`;
    }
    const f = S.f.projets;
    out += `<div class="filters"><label class="sr" for="q-proj">Rechercher un projet</label><input class="search" id="q-proj" type="search" placeholder="Projet, responsable, catégorie…" value="${esc(f.q)}" data-filtre="projets.q" autocomplete="off"><label class="sr" for="f-pcat">Catégorie</label><select class="sel" id="f-pcat" data-filtre="projets.cat">${options(CATEGORIES_PROJET, f.cat, "Toutes les catégories")}</select></div>`;
    const base = S.sous.projets === "idees" ? idees : S.sous.projets === "clos" ? clos : actifs;
    const q = norm(f.q);
    const liste = base.filter((p) => (!f.cat || p.categorie === f.cat) && (!q || norm([p.titre, p.categorie, p.description, membre(p.responsableId) ? nomComplet(membre(p.responsableId)) : ""].join(" ")).includes(q)))
      .sort((a, b) => (PRIORITES.indexOf(a.priorite || "Normale") - PRIORITES.indexOf(b.priorite || "Normale")) || cmpFr(a.dateFin || "9999", b.dateFin || "9999") || cmpFr(a.titre || "", b.titre || ""));
    if (!liste.length) return out + vide(S.sous.projets === "idees" ? "i-proj" : "i-search", S.sous.projets === "idees" && !q ? "Aucune idée de projet en attente. Notez ici les projets à étudier : vous les lancerez en changeant leur statut." : S.sous.projets === "clos" && !q ? "Aucun projet terminé pour l’instant." : base.length ? "Aucun projet ne correspond." : "Aucun projet en cours.");
    return out + `<div class="list">${liste.map(rowProjet).join("")}</div>`;
  };
  function rowTacheGlobale({ t, p }) {
    const r = membre(t.responsableId);
    const retard = tacheEnRetard(t);
    return `<button class="row nolead" type="button" data-act="voir-projet" data-id="${esc(p.id)}" data-onglet="taches"><span class="row-main"><span class="row-t">${esc(t.titre)}</span><span class="row-m">${esc([p.titre, r ? nomCourtM(r) : "Sans responsable", t.echeance ? `échéance ${fmtCourt(t.echeance)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="chip${t.statut === "En cours" ? " info" : ""}">${esc(t.statut || "À faire")}</span>${retard ? `<span class="chip danger">${esc(relCourt(t.echeance))}</span>` : ""}</span></button>`;
  }
  function vueTachesProjets(tOuv) {
    const f = S.f.projets;
    const filtre = f.taches || "toutes";
    let out = `<div class="filters"><div class="chips" role="group" aria-label="Filtrer les tâches">${[["toutes", "Toutes"], ["retard", "En retard"], ["semaine", "Cette semaine"], ["sansresp", "Sans responsable"]].map(([id, l]) => `<button class="chip-btn${filtre === id ? " on" : ""}" type="button" data-act="ptache-filtre" data-v="${id}" aria-pressed="${filtre === id}">${l}</button>`).join("")}</div></div>`;
    const semaine = ajoutJours(aujourdhui(), 7);
    const liste = tOuv.filter(({ t }) => (filtre === "retard" ? tacheEnRetard(t) : filtre === "semaine" ? t.echeance && t.echeance <= semaine : filtre === "sansresp" ? !membre(t.responsableId) : true))
      .sort((a, b) => cmpFr(a.t.echeance || "9999", b.t.echeance || "9999") || cmpFr(a.p.titre || "", b.p.titre || ""));
    if (!liste.length) return out + vide("i-check", filtre === "toutes" ? "Aucune tâche ouverte. Ajoutez des tâches depuis la fiche d’un projet." : "Aucune tâche ne correspond.");
    return out + `<div class="list">${liste.map(rowTacheGlobale).join("")}</div>`;
  }

  /* — Fiche projet — */
  function ficheProjet(id) {
    const p = projet(id);
    if (!p) return null;
    const ecr = peutEcrire();
    const dir = accesDirection();
    const ong = S.projetOnglet || "apercu";
    const taches = tachesP(p), notes = notesP(p);
    const onglets = [["apercu", "Aperçu", null], ["taches", "Tâches", taches.filter((t) => t.statut !== "Fait").length], ...(dir ? [["finances", "Finances", null]] : []), ["journal", "Journal", notes.length]];
    const o = onglets.some(([k]) => k === ong) ? ong : "apercu";
    let out = `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-proj")}</span><div><h3>${esc(p.titre)}</h3><p>${esc([p.categorie, statutP(p), p.priorite && p.priorite !== "Normale" ? `priorité ${p.priorite.toLowerCase()}` : ""].filter(Boolean).join(" · "))}</p></div></div>
      <div class="subtabs" role="group" aria-label="Sections du projet">${onglets.map(([k, l, n]) => `<button class="subtab${o === k ? " on" : ""}" type="button" data-act="projet-onglet" data-v="${k}" aria-pressed="${o === k}">${esc(l)}${n ? `<span class="count">${nb(n)}</span>` : ""}</button>`).join("")}</div>`;
    if (o === "taches") return out + sectionTaches(p, ecr);
    if (o === "finances") return out + sectionFinances(p);
    if (o === "journal") return out + sectionJournal(p, ecr);
    const av = avancementP(p);
    const resp = membre(p.responsableId);
    const eq = (p.equipe || []).map(membre).filter(Boolean);
    const jal = jalonsP(p);
    const lignes = lignesP(p);
    const fin = dir && S.pret.projetsFin ? bilanFinP(p) : null;
    out += `${p.description ? `<p style="white-space:pre-wrap;margin:0 0 10px">${esc(p.description)}</p>` : ""}
      <div class="figure"><span class="big-figure">${pct(av)}</span><span class="chip">${jal.length ? `${nb(jal.filter((j) => j.fait).length)} étape${jal.filter((j) => j.fait).length > 1 ? "s" : ""} sur ${nb(jal.length)}` : taches.length ? `${nb(taches.filter((t) => t.statut === "Fait").length)} tâche${taches.filter((t) => t.statut === "Fait").length > 1 ? "s" : ""} sur ${nb(taches.length)}` : "Aucune étape"}</span>${chipStatutP(p)}</div>
      ${av != null ? `<div class="bar${av >= 1 ? " ok" : ""}" style="margin:-4px 0 14px" aria-hidden="true"><i style="width:${(av * 100).toFixed(1)}%"></i></div>` : ""}
      ${kv([["Objectifs", p.objectifs ? `<span style="white-space:pre-wrap">${esc(p.objectifs)}</span>` : ""], ["Responsable", resp ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(resp.id)}">${esc(nomUsuel(resp))}</button>` : ""], ["Garnison", garnison(p.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(p.garnisonId)}">${esc(cheminG(p.garnisonId))}</button>` : "Tout le mouvement"], ["Début", p.dateDebut ? esc(fmtJour(p.dateDebut)) : ""], ["Fin prévue", p.dateFin ? `${esc(fmtJour(p.dateFin))}${!estClosP(p) && p.dateFin < aujourdhui() ? ` <span class="chip danger">Dépassée</span>` : ""}` : ""], ["Budget prévu", budgetP(p) ? esc(fcfa(budgetP(p))) : ""], ["Collecté", fin ? `${esc(fcfa(fin.collecte))}${fin.objectif ? ` · ${pct(fin.taux)} de l’objectif` : ""}` : ""]])}
      <h3 class="h3">Équipe (${nb(eq.length + (resp && !eq.some((m) => m.id === resp.id) ? 1 : 0))})</h3>
      ${resp || eq.length ? `<div class="chips-l">${[resp, ...eq.filter((m) => !resp || m.id !== resp.id)].filter(Boolean).map((m) => `<button class="pill" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span>${esc(nomCourtM(m))}${resp && m.id === resp.id ? " · responsable" : ""}</span></button>`).join("")}</div>` : `<p class="hint">Aucun membre dans l’équipe.</p>`}
      ${ecr ? `<div class="btn-row" style="margin-top:8px">${btn("equipe-projet", "Composer l’équipe", { ico: "i-users", sm: true, data: `data-id="${esc(p.id)}"` })}</div>` : ""}
      <h3 class="h3">Étapes</h3>
      ${jal.length ? `<div class="list">${jal.map((j) => `<div class="row nolead jal-row${j.fait ? " fait" : ""}">${ecr ? `<button class="tick-b" type="button" data-act="jalon-basculer" data-id="${esc(p.id)}" data-j="${esc(j.id)}" aria-pressed="${!!j.fait}" aria-label="${esc(`${j.fait ? "Rouvrir" : "Marquer atteinte"} : ${j.titre}`)}">${I("i-check")}</button>` : `<span class="tick-b" aria-hidden="true">${j.fait ? I("i-check") : ""}</span>`}<span class="row-main"><span class="row-t">${esc(j.titre)}</span><span class="row-m">${esc([j.date ? fmtJour(j.date) : "Sans date", j.fait && j.faitLe ? `atteinte le ${fmtJour(j.faitLe)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${!j.fait && j.date && j.date < aujourdhui() ? `<span class="chip danger">En retard</span>` : j.fait ? `<span class="chip ok">Atteinte</span>` : ""}</span></div>`).join("")}</div>` : `<p class="hint">Aucune étape définie. Ajoutez-les en modifiant le projet (une par ligne, avec sa date).</p>`}
      ${lignes.length ? `<h3 class="h3">Budget par poste</h3><div class="bars">${lignes.map((l) => { const dep = fin ? fin.depParLigne[l.id] || 0 : null; const taux = dep != null && l.montant ? dep / l.montant : null; return `<div class="bar-row"><div class="bar-top"><span>${esc(l.libelle)}</span><b>${dep != null ? `${nb(dep)} / ` : ""}${nb(l.montant)}</b></div>${dep != null ? `<div class="bar${taux > 1 ? " over" : ""}"><i style="width:${Math.min(100, (taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}</div>`; }).join("")}</div>${fin ? `<p class="hint" style="margin-top:6px">Dépensé / prévu, en FCFA.</p>` : ""}` : ""}
      <div class="actions">${ecr ? btn("editer-projet", "Modifier le projet", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(p.id)}"` }) : ""}${ecr ? btn("ajout-tache", "Nouvelle tâche", { ico: "i-plus", data: `data-id="${esc(p.id)}"` }) : ""}${ecr && (eq.length || resp) ? btn("ecrire-equipe", "Écrire à l’équipe", { ico: "i-horn", data: `data-id="${esc(p.id)}"` }) : ""}${dir ? btn("export-projet", "Exporter", { ico: "i-down", data: `data-id="${esc(p.id)}"` }) : ""}${peutAdmin() ? btn("supprimer-projet", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(p.id)}"` }) : ""}</div>
      ${p.creeLe ? `<p class="hint" style="margin-top:12px">Créé le ${esc(fmtStamp(p.creeLe))}${p.creePar ? ` par ${esc(nomDe(p.creePar))}` : ""}.</p>` : ""}`;
    return out;
  }
  function sectionTaches(p, ecr) {
    const taches = tachesP(p);
    let out = ecr ? `<div class="btn-row" style="margin:4px 0 12px">${btn("ajout-tache", "Nouvelle tâche", { ico: "i-plus", cls: "btn-primary", sm: true, data: `data-id="${esc(p.id)}"` })}</div>` : "";
    if (!taches.length) return out + `<p class="hint">Aucune tâche. Découpez le projet en actions concrètes, chacune avec un responsable et une échéance.</p>`;
    for (const st of ["En cours", "À faire", "Fait"]) {
      const l = taches.filter((t) => (t.statut || "À faire") === st);
      if (!l.length) continue;
      out += `<h3 class="h3">${esc(st)} (${nb(l.length)})</h3><div class="list">${l.map((t) => {
        const r = membre(t.responsableId);
        const retard = tacheEnRetard(t);
        const suivant = st === "À faire" ? "En cours" : st === "En cours" ? "Fait" : "À faire";
        return `<div class="row nolead jal-row${st === "Fait" ? " fait" : ""}">${ecr ? `<button class="tick-b${st === "En cours" ? " mi" : ""}" type="button" data-act="tache-statut" data-id="${esc(p.id)}" data-t="${esc(t.id)}" data-v="${esc(suivant)}" aria-label="${esc(`${t.titre} : passer à « ${suivant} »`)}" title="Passer à « ${esc(suivant)} »">${I(st === "Fait" ? "i-check" : st === "En cours" ? "i-clock" : "i-check")}</button>` : `<span class="tick-b" aria-hidden="true">${st === "Fait" ? I("i-check") : ""}</span>`}<span class="row-main">${ecr ? `<button class="link row-t" type="button" data-act="editer-tache" data-id="${esc(p.id)}" data-t="${esc(t.id)}">${esc(t.titre)}</button>` : `<span class="row-t">${esc(t.titre)}</span>`}<span class="row-m">${esc([r ? nomCourtM(r) : "Sans responsable", t.echeance ? `échéance ${fmtJour(t.echeance)}` : "", t.note || ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${retard ? `<span class="chip danger">En retard</span>` : st === "Fait" && t.faiteLe ? `<span class="chip ok">${esc(fmtCourt(t.faiteLe))}</span>` : ""}${r && r.telephone && st !== "Fait" ? `<a class="icon-btn" href="${esc(lienWa(r.telephone, `Bonjour ${prenomUsuel(r)}, petit point sur le projet « ${p.titre} » : la tâche « ${t.titre} »${t.echeance ? ` est attendue pour le ${fmtJour(t.echeance)}` : " est en attente"}. Où en es-tu ? Merci !`))}" target="_blank" rel="noopener" aria-label="${esc(`Relancer ${nomComplet(r)} sur WhatsApp`)}">${I("i-msg")}</a>` : ""}</span></div>`;
      }).join("")}</div>`;
    }
    return out;
  }
  function sectionFinances(p) {
    if (!S.pret.projetsFin) return chargement("Lecture des finances du projet…");
    const adm = peutAdmin();
    const b = bilanFinP(p);
    const id = esc(p.id);
    let out = `<div class="stats s4" style="margin-top:4px">
      <div class="stat in"><span class="stat-l">${I("i-in")}Collecté</span><span class="stat-v">${nb(b.collecte)}<small>FCFA</small></span><span class="stat-m">${b.objectif ? `${pct(b.taux)} de ${esc(fcfa(b.objectif))}` : "Objectif non fixé"}</span></div>
      <div class="stat"><span class="stat-l">Promis</span><span class="stat-v">${nb(b.promis)}<small>FCFA</small></span><span class="stat-m">${pluriel(Object.keys(b.promesses).length, "promesse", "promesses")}</span></div>
      <div class="stat out"><span class="stat-l">${I("i-out")}Dépensé</span><span class="stat-v">${nb(b.depense)}<small>FCFA</small></span><span class="stat-m">${budgetP(p) ? `sur ${esc(fcfa(budgetP(p)))} prévus` : "Budget non défini"}</span></div>
      <div class="stat"><span class="stat-l">Solde du projet</span><span class="stat-v">${esc(signe(b.solde))}<small>FCFA</small></span><span class="stat-m">Collecté moins dépensé</span></div></div>
      ${b.objectif ? `<div class="bar${b.taux >= 1 ? " ok" : ""}" style="margin:0 0 6px" role="img" aria-label="${esc(`${pct(b.taux)} de l’objectif collecté`)}"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}
      <p class="hint">Collecte auprès de : <b>${esc(b.cible.lib)}</b> (${nb(b.cible.liste.length)})${b.mt ? ` · ${esc(fcfa(b.mt))} par membre` : " · contribution libre"}${b.f.echeanceCollecte ? ` · jusqu’au ${esc(fmtJour(b.f.echeanceCollecte))}` : ""}.</p>
      ${adm ? `<div class="actions">${btn("cotis-projet", "Enregistrer une cotisation", { ico: "i-plus", cls: "btn-primary", data: `data-id="${id}"` })}${btn("promesse-projet", "Promesse", { ico: "i-flag", data: `data-id="${id}"` })}${btn("depense-projet", "Enregistrer une dépense", { ico: "i-out", data: `data-id="${id}"` })}${btn("collecte-projet", "Paramètres de la collecte", { ico: "i-sliders", data: `data-id="${id}"` })}</div>` : ""}`;
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const extra = [...new Set([...Object.keys(b.parM), ...Object.keys(b.promesses)])].filter((mid) => !ids.has(mid)).map(membre).filter(Boolean);
    const contributeurs = b.cible.liste.concat(extra).map((m) => ({ m, v: b.parM[m.id] || 0, att: attenduMembreP(b, m.id) })).sort((x, y) => (y.att - y.v) - (x.att - x.v) || y.v - x.v || parNom(x.m, y.m));
    const aRelancer = contributeurs.filter((x) => (x.att ? x.v < x.att : !x.v) && ids.has(x.m.id));
    out += `<h3 class="h3">Contributions des membres</h3>${aRelancer.length && peutEcrire() ? `<div class="btn-row" style="margin-bottom:8px">${btn("relancer-projet", `Relancer (${nb(aRelancer.length)})`, { ico: "i-horn", sm: true, data: `data-id="${id}"` })}</div>` : ""}`;
    out += contributeurs.length ? `<div class="list">${contributeurs.map(({ m, v, att }) => {
      const pr = b.promesses[m.id];
      const reste = att ? Math.max(0, att - v) : 0;
      const chip = att ? (reste === 0 ? `<span class="chip ok">Soldé</span>` : v ? `<span class="chip warn">Reste ${nb(reste)}</span>` : `<span class="chip">Rien versé</span>`) : v ? `<span class="chip ok">A contribué</span>` : `<span class="chip">Pas encore</span>`;
      return `<div class="row nolead sp-row"><span class="row-main"><button class="link row-t" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button><span class="row-m">${esc([v ? `${fcfa(v)} versés` : "Aucun versement", pr ? `promesse de ${fcfa(pr.montant)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${chip}${adm ? `<button class="icon-btn" type="button" data-act="cotis-projet" data-id="${id}" data-mid="${esc(m.id)}" aria-label="${esc(`Enregistrer une cotisation de ${nomComplet(m)}`)}">${I("i-plus")}</button>` : ""}</span></div>`;
    }).join("")}</div>` : `<p class="hint">Aucun membre concerné par la collecte.</p>`;
    const rowMvt = (x, sens) => { const m = membre(x.membreId); const qui = sens === "E" ? (m ? nomComplet(m) : x.nom || (x.donateur === "anonyme" ? "Anonyme" : "Donateur")) : x.libelle || "Dépense"; const l = sens === "S" && x.ligneId ? lignesP(p).find((y) => y.id === x.ligneId) : null; return `<button class="row nolead${x.annule ? " reversed" : ""}" type="button" data-act="voir-op-de" data-mois="${esc(x.opMois || "")}" data-id="${esc(x.opId || "")}"><span class="row-main"><span class="row-t">${esc(qui)}</span><span class="row-m">${esc([fmtJour(x.date), l ? l.libelle : "", x.beneficiaire, x.moyen, x.piece].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${x.annule ? "" : sens === "E" ? "in" : "out"}">${sens === "E" ? "+" : "−"}${nb(x.montant)}</span>${x.annule ? `<span class="chip danger">Annulé</span>` : ""}</span></button>`; };
    out += `<h3 class="h3">Cotisations reçues</h3>${b.tousV.length ? `<div class="list">${b.tousV.map((x) => rowMvt(x, "E")).join("")}</div>` : `<p class="hint">Aucune cotisation enregistrée.</p>`}`;
    out += `<h3 class="h3">Dépenses</h3>${b.tousD.length ? `<div class="list">${b.tousD.map((x) => rowMvt(x, "S")).join("")}</div>` : `<p class="hint">Aucune dépense enregistrée.</p>`}`;
    return out + `<p class="hint" style="margin-top:10px">Chaque cotisation et chaque dépense entre aussi dans le journal de caisse. Pour corriger un mouvement, ouvrez-le et annulez-le : l’annulation est reportée ici.</p>`;
  }
  function sectionJournal(p, ecr) {
    const notes = notesP(p);
    let out = ecr ? `<form class="form" id="f-note-projet" novalidate style="margin:4px 0 14px">${champ("pn-texte", "Nouvelle information", zone("pn-texte", "texte", "", 'rows="3" placeholder="Avancée des travaux, décision, difficulté, remerciement…"'))}<div class="btn-row">${btn("note-projet", "Publier dans le journal", { ico: "i-plus", cls: "btn-primary", sm: true, data: `data-id="${esc(p.id)}"` })}</div></form>` : "";
    if (!notes.length) return out + `<p class="hint">Le journal du projet est vide.</p>`;
    return out + `<ul class="journal">${notes.map((n) => `<li><p class="j-m">${esc(fmtStamp(n.le))}${n.par ? ` · ${esc(nomDe(n.par))}` : ""}</p><p style="white-space:pre-wrap;margin:0">${esc(n.texte)}</p></li>`).join("")}</ul>`;
  }
  const ouvrirProjet = (id, onglet) => { if (onglet) S.projetOnglet = onglet; ouvrir({ titre: "Projet", wide: true, refresh: surveiller(() => ficheProjet(id)) }); };

  /* — Formulaires — */
  function lireLignesBudget(texte, anciens) {
    const pris = new Set();
    return String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const r = /^(.*?)[\s:=–—-]+([\d][\d\s.  ]*)\s*(f\s?cfa|fcfa|f)?$/i.exec(l);
      const libelle = (r ? r[1] : l).replace(/[\s:=–—-]+$/, "").trim() || l;
      const montant = r ? Number(r[2].replace(/\D/g, "")) || 0 : 0;
      const ancien = anciens.find((a) => !pris.has(a.id) && norm(a.libelle) === norm(libelle));
      const id = ancien ? ancien.id : nouvelId("l");
      pris.add(id);
      return { id, libelle, montant, ordre: i };
    });
  }
  function ouvrirFormProjet(id) {
    const p = id ? projet(id) : { statut: "En préparation", priorite: "Normale", categorie: CATEGORIES_PROJET[0], dateDebut: aujourdhui() };
    if (id && !p) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const lignes = id ? lignesP(p).map((l) => `${l.libelle} : ${nb(l.montant)}`).join("\n") : "";
    const jalons = id ? jalonsP(p).map((j) => `${j.date ? j.date.split("-").reverse().join("/") + " " : ""}${j.titre}`).join("\n") : "";
    const html = `<form class="form" id="f-projet" novalidate>
      ${champ("p-titre", "Intitulé du projet", inp("p-titre", "titre", p.titre, 'autocomplete="off" required autofocus placeholder="Construction du siège, Mission Tunisie 2027…"'), { req: true })}
      <div class="f2">${champ("p-cat", "Catégorie", sel("p-cat", "categorie", CATEGORIES_PROJET, p.categorie, null))}${champ("p-statut", "Statut", sel("p-statut", "statut", STATUTS_PROJET, statutP(p), null))}</div>
      <div class="f2">${champ("p-prio", "Priorité", sel("p-prio", "priorite", PRIORITES, p.priorite || "Normale", null))}${champ("p-resp", "Responsable", sel("p-resp", "responsableId", mbs, p.responsableId, "Non désigné"))}</div>
      ${champ("p-desc", "Description", zone("p-desc", "description", p.description, 'rows="3" placeholder="De quoi s’agit-il, pour qui, pourquoi maintenant"'))}
      ${champ("p-obj", "Objectifs et résultats attendus", zone("p-obj", "objectifs", p.objectifs, 'rows="3"'))}
      <div class="f2">${champ("p-deb", "Début", inp("p-deb", "dateDebut", p.dateDebut, 'type="date"'))}${champ("p-fin", "Fin prévue", inp("p-fin", "dateFin", p.dateFin, 'type="date"'))}</div>
      ${S.garnisons.length ? champ("p-garn", "Garnison ou point SDE porteur", sel("p-garn", "garnisonId", optionsGarnisons(), p.garnisonId, "Tout le mouvement")) : ""}
      ${champ("p-lignes", "Budget par poste", zone("p-lignes", "lignes", lignes, 'rows="5" placeholder="Ciment et fer : 1 500 000\nMain-d’œuvre : 800 000\nToiture : 650 000"'), { hint: "Un poste par ligne, avec son montant en FCFA. Le budget total se calcule seul." })}
      ${champ("p-jal", "Étapes (jalons)", zone("p-jal", "jalons", jalons, 'rows="5" placeholder="15/11/2026 Achat du terrain\n31/01/2027 Fondations\n30/06/2027 Inauguration"'), { hint: "Une étape par ligne, précédée de sa date si elle est connue. L’avancement du projet se calcule sur les étapes atteintes." })}
      ${pied(id ? "Enregistrer les modifications" : "Créer le projet")}
    </form>`;
    ouvrir({ titre: id ? "Modifier le projet" : "Nouveau projet", html, wide: true, onSubmit: (fd, form) => enregistrerProjet(fd, form, id) });
  }
  async function enregistrerProjet(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé du projet."); return; }
    if (g("dateDebut") && g("dateFin") && g("dateFin") < g("dateDebut")) { erreurForm("La fin prévue doit suivre le début."); return; }
    const p = id ? projet(id) : null;
    const lignes = lireLignesBudget(g("lignes"), p ? lignesP(p) : []);
    const anciensJ = p ? jalonsP(p) : [];
    const jal = lireModules(g("jalons"), anciensJ).map((j, i) => { const a = anciensJ.find((x) => x.id === j.id); return { ...j, ordre: i, fait: a ? !!a.fait : false, faitLe: a ? a.faitLe || "" : "" }; });
    const data = { titre: g("titre"), categorie: g("categorie"), statut: g("statut"), priorite: g("priorite"), responsableId: g("responsableId"), description: g("description"), objectifs: g("objectifs"), dateDebut: g("dateDebut"), dateFin: g("dateFin"), garnisonId: g("garnisonId"),
      lignes: Object.fromEntries(lignes.map(({ id: k, ...v }) => [k, v])), jalons: Object.fromEntries(jal.map(({ id: k, ...v }) => [k, v])), budget: lignes.reduce((t, l) => t + l.montant, 0) };
    if (statutP(data) === "Terminé" && (!p || statutP(p) !== "Terminé")) data.termineLe = aujourdhui();
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(() => enFile("projet:" + (id || "nouveau"), async () => {
      if (id) {
        const r = S.db.doc("projets/" + id);
        const cur = await r.get();
        await r.set({ ...(cur.exists ? cur.data() : {}), ...data, ...tampon() });
      } else {
        ref = ref || S.db.collection("projets").doc();
        await ref.set({ ...data, equipe: data.responsableId ? [data.responsableId] : [], taches: {}, notes: {}, ...creation() });
      }
    }), id ? "Projet modifié" : "Projet créé");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirProjet(id || ref.id, "apercu");
  }
  function choisirEquipe(id) {
    const p = projet(id);
    if (!p) return;
    ouvrirChoix({
      titre: `Équipe · ${p.titre}`, intro: "Cochez les membres qui portent ce projet. Le responsable en fait partie d’office.", selection: p.equipe || [], libelle: "Enregistrer l’équipe",
      onValider: async (ids) => {
        const eq = [...new Set([...(p.responsableId ? [p.responsableId] : []), ...ids])];
        if (await ecrire(() => S.db.doc("projets/" + id).update({ equipe: eq, ...tampon() }), "Équipe enregistrée")) ouvrirProjet(id, "apercu");
      },
    });
  }
  function ouvrirFormTache(id, tid) {
    const p = projet(id);
    if (!p) return;
    const t = tid ? (p.taches || {})[tid] : { statut: "À faire" };
    if (tid && !t) return;
    const eqIds = new Set([...(p.equipe || []), p.responsableId].filter(Boolean));
    const eq = membresActifs().filter((m) => eqIds.has(m.id)), autres = membresActifs().filter((m) => !eqIds.has(m.id));
    const grp = (titre, l) => (l.length ? `<optgroup label="${esc(titre)}">${l.map((m) => `<option value="${esc(m.id)}"${m.id === t.responsableId ? " selected" : ""}>${esc(nomComplet(m))}</option>`).join("")}</optgroup>` : "");
    const html = `<form class="form" id="f-tache" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b></p>
      ${champ("t-titre", "Tâche", inp("t-titre", "titre", t.titre, 'autocomplete="off" required autofocus placeholder="Obtenir trois devis, réserver la salle…"'), { req: true })}
      <div class="f2">${champ("t-resp", "Responsable", `<select class="inp" id="t-resp" name="responsableId"><option value="">Non désigné</option>${grp("Équipe du projet", eq)}${grp("Autres membres", autres)}</select>`)}${champ("t-ech", "Échéance", inp("t-ech", "echeance", t.echeance, 'type="date"'))}</div>
      ${champ("t-statut", "Statut", sel("t-statut", "statut", STATUTS_TACHE, t.statut || "À faire", null))}
      ${champ("t-note", "Précisions", zone("t-note", "note", t.note, 'rows="2"'))}
      ${pied(tid ? "Enregistrer" : "Ajouter la tâche", tid && peutEcrire() ? btn("supprimer-tache", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(id)}" data-t="${esc(tid)}"` }) : "")}
    </form>`;
    ouvrir({ titre: tid ? "Modifier la tâche" : "Nouvelle tâche", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      if (!g("titre")) { erreurForm("Décrivez la tâche."); return; }
      const k = tid || nouvelId("t");
      const statut = g("statut") || "À faire";
      const data = { titre: g("titre"), responsableId: g("responsableId"), echeance: g("echeance"), statut, note: g("note"), faiteLe: statut === "Fait" ? (t.faiteLe || aujourdhui()) : "", ...(tid ? {} : { creeLe: Date.now(), creePar: S.me.id || null }) };
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => S.db.doc("projets/" + id).update({ taches: { [k]: data }, ...tampon() }), tid ? "Tâche modifiée" : "Tâche ajoutée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "taches");
    } });
  }
  async function retirerCle(path, champ, cle, ok) {
    return ecrire(() => enFile("doc:" + path, async () => {
      const r = S.db.doc(path);
      const cur = await r.get();
      if (!cur.exists) return;
      const d = cur.data();
      const o = { ...(d[champ] || {}) };
      delete o[cle];
      await r.set({ ...d, [champ]: o, ...tampon() });
    }), ok);
  }
  function ouvrirFormCollecte(id) {
    const p = projet(id);
    if (!p) return;
    const f = finProjet(id);
    const c = cfg();
    const cv = f.cible ? (f.cible.type === "garnison" ? "g:" + f.cible.valeur : f.cible.type === "pole" ? "p:" + f.cible.valeur : f.cible.type) : "equipe";
    const opts = `<option value="equipe"${cv === "equipe" ? " selected" : ""}>L’équipe du projet</option><option value="tous"${cv === "tous" ? " selected" : ""}>Tous les membres actifs</option>${S.garnisons.length ? `<optgroup label="Une garnison ou un point SDE">${optionsGarnisons().map(([v, l]) => `<option value="g:${esc(v)}"${cv === "g:" + v ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` : ""}<optgroup label="Un pôle">${c.poles.map((x) => `<option value="p:${esc(x)}"${cv === "p:" + x ? " selected" : ""}>${esc(x)}</option>`).join("")}</optgroup>`;
    const html = `<form class="form" id="f-collecte" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b>${budgetP(p) ? ` · budget prévu ${esc(fcfa(budgetP(p)))}` : ""}</p>
      ${champ("cl-cible", "Membres sollicités", `<select class="inp" id="cl-cible" name="cible">${opts}</select>`)}
      <div class="f2">${champ("cl-mt", "Cotisation attendue par membre (FCFA)", inp("cl-mt", "montantParMembre", f.montantParMembre ? nb(f.montantParMembre) : "", 'inputmode="numeric" autocomplete="off" placeholder="Libre"'))}${champ("cl-obj", "Objectif de collecte (FCFA)", inp("cl-obj", "objectifCollecte", f.objectifCollecte ? nb(f.objectifCollecte) : "", 'inputmode="numeric" autocomplete="off" placeholder="Par défaut : le budget prévu"'))}</div>
      ${champ("cl-ech", "Collecte jusqu’au", inp("cl-ech", "echeanceCollecte", f.echeanceCollecte, 'type="date"'))}
      ${pied("Enregistrer")}
    </form>`;
    ouvrir({ titre: "Paramètres de la collecte", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      const v = g("cible");
      const cible = v.startsWith("g:") ? { type: "garnison", valeur: v.slice(2) } : v.startsWith("p:") ? { type: "pole", valeur: v.slice(2) } : { type: v || "equipe", valeur: "" };
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => upsert("projets_fin/" + id, { projetId: id, cible, montantParMembre: Number(g("montantParMembre").replace(/\D/g, "")) || 0, objectifCollecte: Number(g("objectifCollecte").replace(/\D/g, "")) || 0, echeanceCollecte: g("echeanceCollecte") }), "Collecte paramétrée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
    } });
  }
  function selectMembresProjet(b, mid, name = "membreId", vide1 = "Choisir un membre") {
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const lib = (m) => { const v = b.parM[m.id] || 0, att = attenduMembreP(b, m.id); return nomComplet(m) + (att ? ` · ${v >= att ? "soldé" : `reste ${nb(att - v)}`}` : v ? ` · ${nb(v)} versés` : ""); };
    const grp = (titre, l) => (l.length ? `<optgroup label="${esc(titre)}">${l.map((m) => `<option value="${esc(m.id)}"${m.id === mid ? " selected" : ""}>${esc(lib(m))}</option>`).join("")}</optgroup>` : "");
    return `<select class="inp" id="pc-membre" name="${name}"><option value="">${esc(vide1)}</option>${grp("Membres sollicités", b.cible.liste.slice().sort(parNom))}${grp("Autres membres", membresActifs().filter((m) => !ids.has(m.id)))}</select>`;
  }
  const montantSaisi = (mt) => { mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); }); mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; }); };
  function ouvrirFormCotisProjet(id, mid) {
    const p = projet(id);
    if (!p) return;
    const b = bilanFinP(p);
    const c = cfg();
    const reste = (x) => (x ? Math.max(0, attenduMembreP(b, x) - (b.parM[x] || 0)) : 0);
    const html = `<form class="form" id="f-cp" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b>${b.mt ? ` · ${esc(fcfa(b.mt))} attendus par membre` : ""}</p>
      <div class="field"><span class="lab" id="lab-pcd">Donateur</span><div class="seg" role="radiogroup" aria-labelledby="lab-pcd" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[["membre", "Un membre"], ["anonyme", "Anonyme"], ["autre", "Autre personne"]].map(([v, l]) => `<input type="radio" name="donateur" id="pc-d-${v}" value="${v}"${v === "membre" ? " checked" : ""}><label for="pc-d-${v}">${esc(l)}</label>`).join("")}</div></div>
      <div id="pc-m-w">${champ("pc-membre", "Membre", selectMembresProjet(b, mid))}</div>
      <div id="pc-n-w" hidden>${champ("pc-nom", "Nom du donateur", inp("pc-nom", "nom", "", 'autocomplete="off"'))}</div>
      <div class="f2">${champ("pc-mt", "Montant versé (FCFA)", inp("pc-mt", "montant", reste(mid) ? nb(reste(mid)) : "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("pc-date", "Date", inp("pc-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("pc-moyen", "Moyen de paiement", sel("pc-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("pc-piece", "N° de pièce ou référence", inp("pc-piece", "piece", "", 'autocomplete="off"'))}</div>
      <p class="hint">La cotisation entre aussi dans le journal de caisse, catégorie « ${esc(categorieProjet())} ».</p>
      ${pied("Enregistrer la cotisation")}
    </form>`;
    ouvrir({ titre: "Cotisation de projet", html, wide: true, onSubmit: (fd, form) => enregistrerCotisProjet(fd, form, id),
      apres: (sheet) => {
        const mt = sheet.querySelector("#pc-mt");
        const maj = () => { const v = (sheet.querySelector("input[name=donateur]:checked") || {}).value; sheet.querySelector("#pc-m-w").hidden = v !== "membre"; sheet.querySelector("#pc-n-w").hidden = v !== "autre"; };
        sheet.querySelectorAll("input[name=donateur]").forEach((r) => r.addEventListener("change", maj));
        sheet.querySelector("#pc-membre").addEventListener("change", (ev) => { if (!mt.dataset.manuel) { const r = reste(ev.target.value); mt.value = r ? nb(r) : ""; } });
        mt.addEventListener("input", () => { mt.dataset.manuel = "1"; });
        montantSaisi(mt);
      } });
  }
  async function enregistrerCotisProjet(fd, form, id) {
    const p = projet(id);
    const g = (k) => String(fd.get(k) || "").trim();
    const donateur = g("donateur") || "membre";
    const m = donateur === "membre" ? membre(g("membreId")) : null;
    if (donateur === "membre" && !m) { erreurForm("Choisissez le membre."); return; }
    if (donateur === "autre" && !g("nom")) { erreurForm("Indiquez le nom du donateur."); return; }
    const montant = Number(g("montant").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant versé."); return; }
    const date = g("date");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const vid = nouvelId("v");
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const qui = m ? nomComplet(m) : donateur === "autre" ? g("nom") : "Anonyme";
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: categorieProjet(), moyen: g("moyen"), libelle: `Projet « ${p.titre} » · ${qui}`, membreId: m ? m.id : null, evenementId: null, piece: g("piece"), projet: { id, vid }, annule: false, ...creation() });
      await upsert("projets_fin/" + id, { projetId: id, versements: { [vid]: { membreId: m ? m.id : "", donateur, nom: donateur === "autre" ? g("nom") : "", montant, date, moyen: g("moyen"), piece: g("piece"), opId: opRef.id, opMois: cle, annule: false } } });
    }, `Cotisation de ${fcfa(montant)} enregistrée`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirProjet(id, "finances");
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function ouvrirFormPromesse(id, mid) {
    const p = projet(id);
    if (!p) return;
    const b = bilanFinP(p);
    const html = `<form class="form" id="f-prom" novalidate>
      <p class="hint" style="margin-top:0">Une promesse n’entre pas en caisse : elle sert à suivre ce que chacun s’est engagé à donner.</p>
      ${champ("pc-membre", "Membre", selectMembresProjet(b, mid))}
      <div class="f2">${champ("pr-mt", "Montant promis (FCFA)", inp("pr-mt", "montant", mid && b.promesses[mid] ? nb(b.promesses[mid].montant) : "", 'class="inp big" inputmode="numeric" autocomplete="off" placeholder="0"'), { hint: "0 pour retirer la promesse." })}${champ("pr-date", "Date de la promesse", inp("pr-date", "date", aujourdhui(), 'type="date"'))}</div>
      ${pied("Enregistrer la promesse")}
    </form>`;
    ouvrir({ titre: "Promesse de don", html, wide: true, onSubmit: async (fd, form) => {
      const mid2 = String(fd.get("membreId") || "");
      if (!membre(mid2)) { erreurForm("Choisissez le membre."); return; }
      const montant = Number(String(fd.get("montant") || "").replace(/\D/g, "")) || 0;
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => upsert("projets_fin/" + id, { projetId: id, promesses: { [mid2]: { montant, date: String(fd.get("date") || "") } } }), montant ? "Promesse enregistrée" : "Promesse retirée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
    }, apres: (sheet) => montantSaisi(sheet.querySelector("#pr-mt")) });
  }
  function ouvrirFormDepenseProjet(id) {
    const p = projet(id);
    if (!p) return;
    const c = cfg();
    const lignes = lignesP(p).map((l) => [l.id, `${l.libelle} (${nb(l.montant)})`]);
    const html = `<form class="form" id="f-dp" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b></p>
      ${champ("dp-lib", "Objet de la dépense", inp("dp-lib", "libelle", "", 'autocomplete="off" required autofocus placeholder="50 sacs de ciment, location du car…"'), { req: true })}
      <div class="f2">${champ("dp-ligne", "Poste du budget", sel("dp-ligne", "ligneId", lignes, "", "Hors budget"))}${champ("dp-cat", "Catégorie en caisse", sel("dp-cat", "categorie", c.categoriesSortie, c.categoriesSortie.find((x) => /logistique|mat/i.test(x)) || c.categoriesSortie[0], null))}</div>
      <div class="f2">${champ("dp-mt", "Montant (FCFA)", inp("dp-mt", "montant", "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("dp-date", "Date", inp("dp-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("dp-moyen", "Moyen de paiement", sel("dp-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("dp-benef", "Bénéficiaire", inp("dp-benef", "beneficiaire", "", 'autocomplete="off" placeholder="Fournisseur, prestataire…"'))}</div>
      ${champ("dp-piece", "N° de facture ou référence", inp("dp-piece", "piece", "", 'autocomplete="off"'))}
      <p class="hint">La dépense sort aussi de la caisse, dans la catégorie choisie.</p>
      ${pied("Enregistrer la dépense")}
    </form>`;
    ouvrir({ titre: "Dépense du projet", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      if (!g("libelle")) { erreurForm("Indiquez l’objet de la dépense."); return; }
      const montant = Number(g("montant").replace(/\D/g, ""));
      if (!montant) { erreurForm("Indiquez le montant."); return; }
      const date = g("date");
      const errD = verifierDateCaisse(date);
      if (errD) { erreurForm(errD); return; }
      const cle = date.slice(0, 7);
      const did = nouvelId("d");
      const opRef = S.db.collection(`finances/${cle}/ops`).doc();
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(async () => {
        await opRef.set({ sens: "S", montant, date, categorie: g("categorie"), moyen: g("moyen"), libelle: `Projet « ${p.titre} » · ${g("libelle")}${g("beneficiaire") ? ` · ${g("beneficiaire")}` : ""}`, membreId: null, evenementId: null, piece: g("piece"), projet: { id, did }, annule: false, ...creation() });
        await upsert("projets_fin/" + id, { projetId: id, depenses: { [did]: { libelle: g("libelle"), ligneId: g("ligneId"), categorie: g("categorie"), montant, date, moyen: g("moyen"), beneficiaire: g("beneficiaire"), piece: g("piece"), opId: opRef.id, opMois: cle, annule: false } } });
      }, `Dépense de ${fcfa(montant)} enregistrée`);
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
      try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
    }, apres: (sheet) => montantSaisi(sheet.querySelector("#dp-mt")) });
  }
  function exporterProjet(id) {
    const p = projet(id);
    if (!p) return;
    const rows = [["Rubrique", "Date", "Intitulé", "Personne", "Montant (FCFA)", "Statut"]];
    lignesP(p).forEach((l) => rows.push(["Budget prévu", "", l.libelle, "", String(l.montant), ""]));
    jalonsP(p).forEach((j) => rows.push(["Étape", j.date ? j.date.split("-").reverse().join("/") : "", j.titre, "", "", j.fait ? "Atteinte" : "À venir"]));
    tachesP(p).forEach((t) => { const r = membre(t.responsableId); rows.push(["Tâche", t.echeance ? t.echeance.split("-").reverse().join("/") : "", t.titre, r ? nomComplet(r) : "", "", t.statut || "À faire"]); });
    if (accesDirection() && S.pret.projetsFin) {
      const b = bilanFinP(p);
      b.tousV.forEach((v) => { const m = membre(v.membreId); rows.push(["Cotisation", v.date.split("-").reverse().join("/"), v.moyen || "", m ? nomComplet(m) : v.nom || "Anonyme", String(v.montant), v.annule ? "Annulée" : ""]); });
      Object.entries(b.promesses).forEach(([mid, x]) => { const m = membre(mid); rows.push(["Promesse", x.date ? x.date.split("-").reverse().join("/") : "", "", m ? nomComplet(m) : "", String(x.montant), ""]); });
      b.tousD.forEach((d) => rows.push(["Dépense", d.date.split("-").reverse().join("/"), d.libelle, d.beneficiaire || "", String(d.montant), d.annule ? "Annulée" : ""]));
    }
    telecharger(`projet-${sansAccents(p.titre).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.csv`, versCSV(rows));
  }

  /* — Résumés — */
  function carteProjets() {
    const pied = `<button class="link" type="button" data-vue="projets">Ouvrir les projets</button>`;
    if (!S.pret.projets) return carte("Projets", chargement("Lecture des projets…"));
    const actifs = (S.projets || []).filter(estActifP);
    if (!actifs.length) return carte("Projets", `<p class="hint">Aucun projet en cours.</p>`, { pied });
    const retard = actifs.flatMap(tachesP).filter(tacheEnRetard).length;
    const top = actifs.slice().sort((a, b) => (PRIORITES.indexOf(a.priorite || "Normale") - PRIORITES.indexOf(b.priorite || "Normale")) || cmpFr(a.dateFin || "9999", b.dateFin || "9999")).slice(0, 4);
    return carte("Projets", `<p class="big-figure num">${nb(actifs.length)}<small>en cours</small></p><div class="bars">${top.map((p) => { const av = avancementP(p); return `<div class="bar-row"><div class="bar-top"><span>${esc(p.titre)}</span><b>${pct(av)}</b></div><div class="bar${av >= 1 ? " ok" : ""}"><i style="width:${((av || 0) * 100).toFixed(1)}%"></i></div></div>`; }).join("")}</div>${retard ? `<p class="note warn" style="margin:10px 0 0">${pluriel(retard, "tâche en retard", "tâches en retard")}. <button class="link" type="button" data-act="sous" data-vue-cible="projets" data-sous="taches">Voir</button></p>` : ""}`, { pied });
  }
  function blocProjetsMembre(m) {
    if (!S.pret.projets) return "";
    const ps = (S.projets || []).filter((p) => !estClosP(p) && (p.responsableId === m.id || (p.equipe || []).includes(m.id)));
    const ts = (S.projets || []).filter((p) => !estClosP(p)).flatMap((p) => tachesP(p).filter((t) => t.responsableId === m.id && t.statut !== "Fait").map((t) => ({ t, p })));
    let out = "";
    if (ps.length || ts.length) {
      out += `<h3 class="h3">Projets</h3>`;
      if (ps.length) out += `<div class="list">${ps.map((p) => `<button class="row nolead" type="button" data-act="voir-projet" data-id="${esc(p.id)}"><span class="row-main"><span class="row-t">${esc(p.titre)}</span><span class="row-m">${esc(p.responsableId === m.id ? "Responsable" : "Membre de l’équipe")}</span></span><span class="row-r">${chipStatutP(p)}</span></button>`).join("")}</div>`;
      if (ts.length) out += `<p class="hint" style="margin:8px 0 4px"><b>Tâches ouvertes</b></p><div class="list">${ts.map(rowTacheGlobale).join("")}</div>`;
    }
    if (accesDirection() && S.pret.projetsFin) {
      const contribs = (S.projets || []).map((p) => ({ p, v: bilanFinP(p).parM[m.id] || 0 })).filter((x) => x.v);
      if (contribs.length) out += `<p class="hint" style="margin:10px 0 0"><b>Cotisations de projets</b> : ${esc(contribs.map((x) => `${x.p.titre} ${fcfa(x.v)}`).join(" · "))}</p>`;
    }
    return out;
  }
