  /* ════════════════════════ Outils communs aux modules ════════════════════════ */
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const jourIdx = (iso) => ((versDate(iso).getDay() + 6) % 7) + 1;
  const urlSure = (u) => (/^https?:\/\/[^\s<>"]+$/i.test(String(u || "").trim()) ? String(u).trim() : "");
  const nomCourtM = (m) => (m ? `${prenomUsuel(m)} ${String(m.nom || "").toUpperCase()}`.trim() : "");
  const plusieurs = (ids) => ids.map((id) => membre(id)).filter(Boolean);
  async function upsert(path, data) {
    return enFile("doc:" + path, async () => {
      const ref = S.db.doc(path);
      const cur = await ref.get();
      if (cur.exists) await ref.update({ ...data, ...tampon() });
      else await ref.set({ ...data, ...creation() });
    });
  }
  /* Plusieurs écritures à la suite, avec reprise si la plateforme demande de ralentir. */
  async function lot(ops, ok) {
    if (!S.db || !ops.length) return true;
    S.attente += 1; majSync();
    let faits = 0, err = null;
    for (const op of ops) {
      let reussi = false;
      for (let essai = 0; essai < 4 && !reussi && !err; essai += 1) {
        try { await op(); reussi = true; }
        catch (e) { if (e && (e.code === "resource_exhausted" || e.code === "unavailable")) { await sleep(800 * (essai + 1)); continue; } err = e; }
      }
      if (reussi) faits += 1;
      if (err) break;
    }
    S.attente -= 1; majSync();
    if (faits < ops.length) toast(`${nb(faits)} sur ${nb(ops.length)} enregistrés. ${messageErreur(err)}`, "err");
    else if (ok) toast(ok);
    return faits === ops.length;
  }

  /* Choix de membres dans une liste à cocher, réutilisé par plusieurs modules */
  const CHK = { ids: new Set(), base: null, meta: null, onValider: null, libelle: "Valider", intro: "" };
  function ouvrirChoix({ titre, intro = "", selection = [], base = null, meta = null, onValider, libelle = "Valider" }) {
    CHK.ids = new Set(selection); CHK.base = base; CHK.meta = meta; CHK.onValider = onValider; CHK.libelle = libelle; CHK.intro = intro;
    S.f.sel = { q: "" };
    ouvrir({ titre, wide: true, refresh: ficheChoix });
  }
  function listeChoix() {
    const base = CHK.base ? CHK.base() : membresActifs();
    const q = norm(S.f.sel.q);
    return base.filter((m) => !q || norm(`${nomComplet(m)} ${m.matricule || ""} ${m.fonction || ""} ${m.quartier || ""}`).includes(q));
  }
  function ficheChoix() {
    const liste = listeChoix();
    const rows = liste.map((m) => {
      const meta = CHK.meta ? CHK.meta(m) : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · ");
      return `<button class="row" type="button" data-act="sel-basculer" data-mid="${esc(m.id)}" aria-pressed="${CHK.ids.has(m.id)}"><span class="tick">${I("i-check")}</span><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span></button>`;
    }).join("");
    return `${CHK.intro ? `<p class="hint" style="margin-bottom:10px">${CHK.intro}</p>` : ""}<p class="tally"><span><b>${nb(CHK.ids.size)}</b> ${CHK.ids.size > 1 ? "sélectionnés" : "sélectionné"}</span></p>
      <div class="filters"><label class="sr" for="q-sel">Rechercher un membre</label><input class="search" id="q-sel" type="search" placeholder="Rechercher un membre…" value="${esc(S.f.sel.q)}" data-filtre="sel.q" autocomplete="off"><div class="btn-row">${btn("sel-tous", "Tout cocher", { sm: true })}${btn("sel-aucun", "Tout décocher", { sm: true })}</div></div>
      ${liste.length ? `<div class="list">${rows}</div>` : vide("i-search", "Aucun membre ne correspond.")}
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Annuler</button><button class="btn btn-primary" type="button" data-act="sel-valider">${esc(CHK.libelle)}</button></div>`;
  }

  /* ════════════════════════ Garnisons ════════════════════════ */
  const STATUTS_G = ["Active", "En ouverture", "En sommeil"];
  const garnison = (id) => (id ? S.garnisons.find((g) => g.id === id) || null : null);
  function ordreG(a, b) {
    const t = cfg().typesGarnison;
    const ia = t.indexOf(a.type), ib = t.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || cmpFr(a.nom || "", b.nom || "");
  }
  const enfantsG = (gid) => S.garnisons.filter((g) => (garnison(g.parentId) ? g.parentId : "") === (gid || "")).sort(ordreG);
  function ancetresG(gid) {
    const out = [];
    let g = garnison(gid);
    const vus = new Set();
    while (g && !vus.has(g.id)) { out.push(g.id); vus.add(g.id); g = garnison(g.parentId); }
    return out;
  }
  function descendantsG(gid) {
    const out = new Set([gid]);
    let ajout = true;
    while (ajout) { ajout = false; for (const g of S.garnisons) if (g.parentId && out.has(g.parentId) && !out.has(g.id)) { out.add(g.id); ajout = true; } }
    return out;
  }
  const dansG = (m, gid) => !!m.garnisonId && ancetresG(m.garnisonId).includes(gid);
  const membresDeG = (gid, inclureSous) => membresActifs().filter((m) => (inclureSous ? dansG(m, gid) : m.garnisonId === gid));
  const cheminG = (gid) => ancetresG(gid).map((id) => garnison(id).nom).reverse().join(" › ");
  /* Un rassemblement lié à une garnison ne compte que pour ses membres (et ceux des structures qui en dépendent). */
  function concerne(e, m) {
    if (!e.garnisonId || !garnison(e.garnisonId)) return true;
    const v = presentsEffectifs(e)[m.id];
    if (v !== undefined && v !== null) return true;
    return dansG(m, e.garnisonId);
  }
  const compte = (e, m) => (!m.adhesion || e.date >= m.adhesion) && concerne(e, m);
  function optionsGarnisons(exclure) {
    const out = [];
    const parcourir = (gid, niv) => { for (const g of enfantsG(gid)) { if (exclure && exclure.has(g.id)) continue; out.push([g.id, `${"— ".repeat(niv)}${g.nom}`]); parcourir(g.id, niv + 1); } };
    parcourir("", 0);
    return out;
  }
  function rowGarnison(g, niv) {
    const n = membresDeG(g.id, false).length;
    const resp = membre(g.responsableId);
    const meta = [g.type, [g.ville || g.quartier, g.pays].filter(Boolean).join(", "), g.jour ? `${g.jour}${g.heure ? " " + fmtHeure(g.heure) : ""}` : "", resp ? "resp. " + nomCourtM(resp) : ""].filter(Boolean).join(" · ");
    return `<button class="row g-row" style="--niv:${niv}" type="button" data-act="voir-garnison" data-id="${esc(g.id)}"><span class="g-ico" aria-hidden="true">${I("i-fort")}</span><span class="row-main"><span class="row-t">${esc(g.nom || "Sans nom")}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r"><span class="chip">${pluriel(n, "membre", "membres")}</span>${g.statut && g.statut !== "Active" ? `<span class="chip warn">${esc(g.statut)}</span>` : ""}</span></button>`;
  }
  function arbreGarnisons() {
    const lignes = [];
    const parcourir = (gid, niv) => { for (const g of enfantsG(gid)) { lignes.push(rowGarnison(g, niv)); parcourir(g.id, niv + 1); } };
    parcourir("", 0);
    return lignes.join("");
  }
  VUES.garnisons = function () {
    const ecr = peutEcrire();
    let out = secHead("Garnisons", { eyebrow: "Structures et cellules", verset: VERSETS.garnisons, actions: ecr ? btn("ajout-garnison", "Nouvelle garnison", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les structures et cellules du mouvement");
    if (!S.pret.garnisons || !S.pret.membres) return out + chargement("Lecture des garnisons…");
    const actifs = membresActifs();
    const sans = actifs.filter((m) => !garnison(m.garnisonId));
    out += sousOnglets("garnisons", [["structures", "Structures", S.garnisons.length], ["sans", "Non rattachés", sans.length]]);
    if (S.sous.garnisons === "sans") {
      if (!sans.length) return out + vide("i-check", "Tous les membres actifs sont rattachés à une garnison.");
      return out + `<p class="note">Pour rattacher plusieurs membres d’un coup, ouvrez une garnison puis « Ajouter ou retirer des membres ». Pour un seul membre, modifiez sa fiche.</p><div class="list">${sans.map(rowMembre).join("")}</div>`;
    }
    if (!S.garnisons.length) return out + vide("i-fort", "Aucune garnison enregistrée. Créez le siège, les antennes et les cellules du mouvement, puis rattachez-y les membres : chaque garnison aura son effectif, ses réunions et son assiduité.", ecr ? btn("ajout-garnison", "Créer la première garnison", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const actives = S.garnisons.filter((g) => (g.statut || "Active") === "Active").length;
    const pays = new Set(S.garnisons.map((g) => norm(g.pays)).filter(Boolean)).size;
    const cellules = S.garnisons.filter((g) => g.type === "Cellule").length;
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-fort")}Garnisons actives</span><span class="stat-v">${nb(actives)}</span><span class="stat-m">sur ${pluriel(S.garnisons.length, "structure", "structures")}</span></div>
      <div class="stat"><span class="stat-l">Cellules</span><span class="stat-v">${nb(cellules)}</span><span class="stat-m">Groupes de proximité</span></div>
      <div class="stat"><span class="stat-l">Membres rattachés</span><span class="stat-v">${nb(actifs.length - sans.length)}</span><span class="stat-m">${pluriel(sans.length, "non rattaché", "non rattachés")}</span></div>
      <div class="stat"><span class="stat-l">Pays</span><span class="stat-v">${nb(pays)}</span><span class="stat-m">Où le mouvement est implanté</span></div></div>`;
    return out + `<div class="list">${arbreGarnisons()}</div>`;
  };
  function ficheGarnison(id) {
    const g = garnison(id);
    if (!g) return null;
    const ecr = peutEcrire();
    const parent = garnison(g.parentId);
    const resp = membre(g.responsableId), adj = membre(g.adjointId);
    const mbs = membresDeG(g.id, false);
    const tous = membresDeG(g.id, true);
    const evts3 = evtsPeriode("3m", "");
    const taux = tous.map((m) => statsMembre(m, evts3).taux).filter((t) => t != null);
    const moy = taux.length ? taux.reduce((a, b) => a + b, 0) / taux.length : null;
    const sous = enfantsG(g.id);
    const prochains = aVenir().filter((e) => e.garnisonId === g.id).slice(0, 4);
    const lien = (m) => (m ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomUsuel(m))}</button>${m.telephone ? ` <span class="num muted">${esc(telAffiche(m.telephone))}</span>` : ""}` : "");
    const reunion = [g.jour, g.heure ? fmtHeure(g.heure) : "", g.lieuReunion].filter(Boolean).join(" · ");
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-fort")}</span><div><h3>${esc(g.nom)}</h3><p>${esc([g.type, g.statut && g.statut !== "Active" ? g.statut : ""].filter(Boolean).join(" · "))}</p></div></div>
      <div class="counters"><div class="counter"><span class="lab">Effectif</span><div class="counter-c"><b>${nb(tous.length)}</b></div><span class="hint">${sous.length ? `dont ${nb(mbs.length)} rattachés directement` : "membres actifs"}</span></div><div class="counter"><span class="lab">Assiduité · 3 mois</span><div class="counter-c"><b>${pct(moy)}</b></div><span class="hint">Moyenne des membres</span></div></div>
      ${kv([["Rattachée à", parent ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(parent.id)}">${esc(parent.nom)}</button>` : ""], ["Implantation", esc([g.quartier, g.ville, g.pays].filter(Boolean).join(", "))], ["Réunions", esc(reunion)], ["Responsable", lien(resp)], ["Adjoint", lien(adj)], ["Description", g.description ? `<span style="white-space:pre-wrap">${esc(g.description)}</span>` : ""]])}
      ${sous.length ? `<h3 class="h3">Structures rattachées</h3><div class="list">${sous.map((x) => rowGarnison(x, 0)).join("")}</div>` : ""}
      <h3 class="h3">Prochaines réunions</h3>${prochains.length ? `<div class="list">${prochains.map(rowEvt).join("")}</div>` : `<p class="hint">Aucune réunion programmée pour cette garnison.</p>`}
      <h3 class="h3">Membres (${nb(mbs.length)})</h3>${mbs.length ? `<div class="list">${mbs.map(rowMembre).join("")}</div>` : `<p class="hint">Aucun membre rattaché directement.</p>`}
      ${ecr ? `<div class="actions">${btn("membres-garnison", "Ajouter ou retirer des membres", { ico: "i-users", cls: "btn-primary", data: `data-id="${esc(g.id)}"` })}${btn("ajout-evt", "Programmer une réunion", { ico: "i-cal", data: `data-garnison="${esc(g.id)}" data-type="Réunion"` })}${btn("ecrire", "Écrire aux membres", { ico: "i-horn", data: `data-aud="garnison" data-val="${esc(g.id)}"` })}${btn("editer-garnison", "Modifier", { ico: "i-edit", data: `data-id="${esc(g.id)}"` })}${peutAdmin() ? btn("supprimer-garnison", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(g.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirGarnison = (id) => ouvrir({ titre: "Garnison", refresh: surveiller(() => ficheGarnison(id)) });
  function ouvrirFormGarnison(id, parentId) {
    const c = cfg();
    const g = id ? garnison(id) : { parentId: parentId || "", pays: "Côte d’Ivoire", statut: "Active" };
    if (id && !g) return;
    const exclus = id ? descendantsG(id) : null;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const html = `<form class="form" id="f-garnison" novalidate>
      ${champ("g-nom", "Nom", inp("g-nom", "nom", g.nom, 'autocomplete="off" required autofocus placeholder="Siège, Antenne Italie, Cellule de Yopougon…"'), { req: true })}
      <div class="f2">${champ("g-type", "Type", sel("g-type", "type", c.typesGarnison, g.type || c.typesGarnison[0], null))}${champ("g-parent", "Rattachée à", sel("g-parent", "parentId", optionsGarnisons(exclus), g.parentId, "Aucune (niveau principal)"))}</div>
      <div class="f2">${champ("g-statut", "Statut", sel("g-statut", "statut", STATUTS_G, g.statut || "Active", null))}${champ("g-pays", "Pays", inp("g-pays", "pays", g.pays, 'autocomplete="off"'))}</div>
      <div class="f2">${champ("g-ville", "Ville", inp("g-ville", "ville", g.ville, 'autocomplete="off" placeholder="Abidjan"'))}${champ("g-quartier", "Commune, quartier ou adresse", inp("g-quartier", "quartier", g.quartier, 'autocomplete="off" placeholder="Cocody Deux-Plateaux"'))}</div>
      <fieldset class="fs"><legend>Réunions habituelles</legend>
        <div class="f2">${champ("g-jour", "Jour", sel("g-jour", "jour", JOURS, g.jour, "Non fixé"))}${champ("g-heure", "Heure", inp("g-heure", "heure", g.heure, 'type="time"'))}</div>
        ${champ("g-lieu", "Lieu de réunion", inp("g-lieu", "lieuReunion", g.lieuReunion, 'autocomplete="off"'))}
      </fieldset>
      <fieldset class="fs"><legend>Encadrement</legend>
        <div class="f2">${champ("g-resp", "Responsable", sel("g-resp", "responsableId", mbs, g.responsableId, "Non désigné"))}${champ("g-adj", "Adjoint", sel("g-adj", "adjointId", mbs, g.adjointId, "Non désigné"))}</div>
        ${champ("g-desc", "Description", zone("g-desc", "description", g.description, 'rows="3" placeholder="Mission, public, particularités…"'))}
      </fieldset>
      ${pied(id ? "Enregistrer les modifications" : "Créer la garnison")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la garnison" : "Nouvelle garnison", html, wide: true, onSubmit: (fd, form) => enregistrerGarnison(fd, form, id) });
  }
  async function enregistrerGarnison(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("nom")) { erreurForm("Indiquez le nom de la garnison."); $("#g-nom").focus(); return; }
    const doublon = S.garnisons.find((x) => x.id !== id && norm(x.nom) === norm(g("nom")));
    if (doublon) { erreurForm(`Une garnison porte déjà le nom « ${doublon.nom} ».`); return; }
    if (g("responsableId") && g("responsableId") === g("adjointId")) { erreurForm("Le responsable et l’adjoint doivent être deux personnes différentes."); return; }
    const data = { nom: g("nom"), type: g("type"), parentId: g("parentId"), statut: g("statut"), pays: g("pays"), ville: g("ville"), quartier: g("quartier"), jour: g("jour"), heure: g("heure"), lieuReunion: g("lieuReunion"), responsableId: g("responsableId"), adjointId: g("adjointId"), description: g("description") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("garnisons/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("garnisons").doc(); await ref.set({ ...data, ...creation() }); }
    }, id ? "Garnison modifiée" : "Garnison créée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirGarnison(id || ref.id);
  }
  function choisirMembresGarnison(gid) {
    const g = garnison(gid);
    if (!g) return;
    const avant = membresDeG(gid, false).map((m) => m.id);
    ouvrirChoix({
      titre: `Membres · ${g.nom}`,
      intro: "Cochez les membres à rattacher directement à cette garnison. Un membre rattaché ailleurs y sera déplacé ; un membre décoché n’aura plus de garnison.",
      selection: avant,
      meta: (m) => { const x = garnison(m.garnisonId); return x && x.id !== gid ? `Actuellement : ${x.nom}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      libelle: "Enregistrer",
      onValider: async (ids) => {
        const choisis = new Set(ids);
        const ops = [];
        for (const id of ids) if (membre(id) && membre(id).garnisonId !== gid) ops.push(() => S.db.doc("membres/" + id).update({ garnisonId: gid, ...tampon() }));
        for (const id of avant) if (!choisis.has(id)) ops.push(() => S.db.doc("membres/" + id).update({ garnisonId: "", ...tampon() }));
        if (!ops.length) { ouvrirGarnison(gid); return; }
        if (await lot(ops, `${pluriel(ops.length, "fiche mise à jour", "fiches mises à jour")}`)) ouvrirGarnison(gid);
      },
    });
  }

  /* ════════════════════════ Académie ════════════════════════ */
  const MODES_F = ["Présentiel", "En ligne", "Mixte"];
  const MENTIONS = ["Sans mention", "Assez bien", "Bien", "Très bien", "Excellent"];
  const formation = (id) => S.formations.find((f) => f.id === id) || null;
  function etatFormation(f) {
    const t = aujourdhui();
    if (!f.dateDebut || f.dateDebut > t) return "avenir";
    if (f.dateFin && f.dateFin < t) return "terminee";
    return "encours";
  }
  const LIB_ETAT_F = { avenir: "À venir", encours: "En cours", terminee: "Terminée" };
  const CLS_ETAT_F = { avenir: "gold", encours: "info", terminee: "" };
  const actifF = (p) => p && p.statut !== "Retiré";
  const participantsF = (f) => Object.entries(f.participants || {}).filter(([mid, p]) => actifF(p) && membre(mid)).map(([mid, p]) => ({ m: membre(mid), p }));
  const modulesF = (f) => (Array.isArray(f.modules) ? f.modules : []);
  function progressionP(f, p) {
    const mods = modulesF(f);
    const faits = mods.filter((x) => p && p.suivis && p.suivis[x.id]).length;
    return { faits, total: mods.length, taux: mods.length ? faits / mods.length : null };
  }
  function datesF(f) {
    if (!f.dateDebut) return "Dates à fixer";
    if (!f.dateFin || f.dateFin === f.dateDebut) return fmtJour(f.dateDebut);
    return `Du ${fmtCourt(f.dateDebut)} au ${fmtJour(f.dateFin)}`;
  }
  function rowFormation(f) {
    const et = etatFormation(f);
    const n = participantsF(f).filter(({ p }) => p.statut !== "Abandon").length;
    const meta = [f.programme, datesF(f), f.formateur].filter(Boolean).join(" · ");
    return `<button class="row" type="button" data-act="voir-formation" data-id="${esc(f.id)}"><span class="g-ico" aria-hidden="true">${I("i-cap")}</span><span class="row-main"><span class="row-t">${esc(f.titre || "Formation")}</span><span class="row-m">${esc(meta)}</span></span><span class="row-r"><span class="chip ${CLS_ETAT_F[et]}">${LIB_ETAT_F[et]}</span><span class="chip">${pluriel(n, "inscrit", "inscrits")}</span></span></button>`;
  }
  function formationsDe(mid) {
    return S.formations.filter((f) => actifF((f.participants || {})[mid])).map((f) => ({ f, p: f.participants[mid] })).sort((a, b) => cmpFr(b.f.dateDebut || "", a.f.dateDebut || ""));
  }
  VUES.academie = function () {
    const c = cfg();
    const ecr = peutEcrire();
    let out = secHead("Académie", { eyebrow: "Formations", verset: VERSETS.academie, actions: ecr ? btn("ajout-formation", "Nouvelle formation", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les formations et les parcours des membres");
    if (!S.pret.formations || !S.pret.membres) return out + chargement("Lecture des formations…");
    const par = { avenir: [], encours: [], terminee: [] };
    S.formations.forEach((f) => par[etatFormation(f)].push(f));
    const apprenants = membresActifs().filter((m) => formationsDe(m.id).length);
    const an = String(new Date().getFullYear());
    const certifies = S.formations.reduce((t, f) => t + participantsF(f).filter(({ p }) => p.statut === "Certifié" && String(p.certifieLe || "").startsWith(an)).length, 0);
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-cap")}En cours</span><span class="stat-v">${nb(par.encours.length)}</span><span class="stat-m">${pluriel(par.avenir.length, "formation à venir", "formations à venir")}</span></div>
      <div class="stat"><span class="stat-l">Apprenants</span><span class="stat-v">${nb(apprenants.length)}</span><span class="stat-m">Membres inscrits au moins une fois</span></div>
      <div class="stat"><span class="stat-l">${I("i-award")}Certifiés en ${an}</span><span class="stat-v">${nb(certifies)}</span><span class="stat-m">Attestations délivrables</span></div>
      <div class="stat"><span class="stat-l">Programmes</span><span class="stat-v">${nb(c.programmes.length)}</span><span class="stat-m">${esc(c.programmes.slice(0, 2).join(", "))}${c.programmes.length > 2 ? "…" : ""}</span></div></div>`;
    out += sousOnglets("academie", [["encours", "En cours", par.encours.length], ["avenir", "À venir", par.avenir.length], ["terminees", "Terminées", par.terminee.length], ["apprenants", "Apprenants", apprenants.length]]);
    if (S.sous.academie === "apprenants") {
      if (!apprenants.length) return out + vide("i-cap", "Aucun membre n’est encore inscrit à une formation.");
      return out + `<div class="list">${apprenants.map((m) => {
        const fs = formationsDe(m.id);
        const cert = fs.filter(({ p }) => p.statut === "Certifié").length;
        return `<button class="row" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${esc(fs.map(({ f }) => f.titre).join(" · "))}</span></span><span class="row-r"><span class="chip">${pluriel(fs.length, "formation", "formations")}</span>${cert ? `<span class="chip ok">${pluriel(cert, "certificat", "certificats")}</span>` : ""}</span></button>`;
      }).join("")}</div>`;
    }
    const f = S.f.academie;
    const cle = { encours: "encours", avenir: "avenir", terminees: "terminee" }[S.sous.academie] || "encours";
    out += `<div class="filters"><label class="sr" for="q-acad">Rechercher une formation</label><input class="search" id="q-acad" type="search" placeholder="Titre, formateur…" value="${esc(f.q)}" data-filtre="academie.q" autocomplete="off"><label class="sr" for="f-prog">Programme</label><select class="sel" id="f-prog" data-filtre="academie.programme">${options(c.programmes, f.programme, "Tous les programmes")}</select></div>`;
    if (!S.formations.length) return out + vide("i-cap", `Aucune formation enregistrée. Créez une session de ${esc(c.programmes[0] || "formation")} : vous pourrez y inscrire des membres, suivre leur présence module par module et délivrer des attestations signées.`, ecr ? btn("ajout-formation", "Créer une formation", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const q = norm(f.q);
    const liste = par[cle].filter((x) => (!f.programme || x.programme === f.programme) && (!q || norm([x.titre, x.formateur, x.programme, x.parcours].join(" ")).includes(q)))
      .sort((a, b) => (cle === "terminee" ? cmpFr(b.dateFin || b.dateDebut || "", a.dateFin || a.dateDebut || "") : cmpFr(a.dateDebut || "9999", b.dateDebut || "9999")));
    if (!liste.length) return out + vide("i-search", par[cle].length ? "Aucune formation ne correspond." : `Aucune formation ${LIB_ETAT_F[cle].toLowerCase()}.`);
    return out + `<div class="list">${liste.map(rowFormation).join("")}</div>`;
  };
  function ficheFormation(id) {
    const f = formation(id);
    if (!f) return null;
    const ecr = peutEcrire();
    const et = etatFormation(f);
    const parts = participantsF(f).sort((a, b) => parNom(a.m, b.m));
    const actifs = parts.filter(({ p }) => p.statut !== "Abandon");
    const certifies = parts.filter(({ p }) => p.statut === "Certifié");
    const mods = modulesF(f);
    const prog = actifs.map(({ p }) => progressionP(f, p).taux).filter((t) => t != null);
    const moy = prog.length ? prog.reduce((a, b) => a + b, 0) / prog.length : null;
    const lieu = [f.mode, f.lieu].filter(Boolean).join(" · ");
    const rowsMods = mods.map((x, i) => {
      const n = actifs.filter(({ p }) => p.suivis && p.suivis[x.id]).length;
      return `<div class="row nolead"><span class="row-main"><span class="row-t">${i + 1}. ${esc(x.titre)}</span><span class="row-m">${x.date ? esc(fmtJour(x.date)) : "Date à fixer"} · ${pluriel(n, "présent", "présents")} sur ${nb(actifs.length)}</span></span><span class="row-r">${ecr && actifs.length ? btn("pointer-module", "Pointer", { ico: "i-ucheck", sm: true, data: `data-id="${esc(f.id)}" data-mod="${esc(x.id)}"` }) : ""}</span></div>`;
    }).join("");
    const rowsParts = parts.map(({ m, p }) => {
      const pr = progressionP(f, p);
      const chip = p.statut === "Certifié" ? `<span class="chip ok">Certifié</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">Inscrit</span>`;
      return `<button class="row" type="button" data-act="voir-participant" data-id="${esc(f.id)}" data-mid="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : "Aucun module défini"}</span>${pr.taux != null ? `<span class="bar slim ${pr.taux >= 0.8 ? "ok" : pr.taux >= 0.5 ? "info" : "warn"}" aria-hidden="true"><i style="width:${(pr.taux * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r">${chip}</span></button>`;
    }).join("");
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-cap")}</span><div><h3>${esc(f.titre)}</h3><p>${esc([f.programme, f.parcours].filter(Boolean).join(" · "))}</p></div></div>
      <div class="figure"><span class="chip ${CLS_ETAT_F[et]}">${LIB_ETAT_F[et]}</span><span>${esc(datesF(f))}</span></div>
      <div class="counters"><div class="counter"><span class="lab">Inscrits</span><div class="counter-c"><b>${nb(actifs.length)}${f.capacite ? `<small class="muted"> / ${nb(f.capacite)}</small>` : ""}</b></div></div><div class="counter"><span class="lab">Progression moyenne</span><div class="counter-c"><b>${pct(moy)}</b></div></div></div>
      ${kv([["Formateur", esc(f.formateur || "")], ["Lieu", esc(lieu)], ["Frais", Number(f.frais) ? esc(fcfa(f.frais)) : ""], ["Certifiés", certifies.length ? esc(pluriel(certifies.length, "participant", "participants")) : ""], ["Description", f.description ? `<span style="white-space:pre-wrap">${esc(f.description)}</span>` : ""]])}
      <h3 class="h3">Modules (${nb(mods.length)})</h3>${mods.length ? `<div class="list">${rowsMods}</div>` : `<p class="hint">Aucun module défini. Ajoutez-les en modifiant la formation, un par ligne.</p>`}
      <h3 class="h3">Participants (${nb(parts.length)})</h3>${parts.length ? `<div class="list">${rowsParts}</div>` : `<p class="hint">Aucun inscrit pour l’instant.</p>`}
      <div class="actions">${ecr ? btn("inscrire-formation", "Inscrire des membres", { ico: "i-users", cls: "btn-primary", data: `data-id="${esc(f.id)}"` }) : ""}${ecr && actifs.length ? btn("ecrire", "Écrire aux participants", { ico: "i-horn", data: `data-aud="formation" data-val="${esc(f.id)}" data-modele="formation"` }) : ""}${certifies.length ? btn("zip-attestations", `Attestations (${nb(certifies.length)})`, { ico: "i-award", data: `data-id="${esc(f.id)}"` }) : ""}${ecr ? btn("editer-formation", "Modifier", { ico: "i-edit", data: `data-id="${esc(f.id)}"` }) : ""}${peutAdmin() ? btn("supprimer-formation", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(f.id)}"` }) : ""}</div>`;
  }
  const ouvrirFormation = (id) => ouvrir({ titre: "Formation", refresh: surveiller(() => ficheFormation(id)) });
  const ligneModule = (x) => `${x.date ? x.date.split("-").reverse().join("/") + " " : ""}${x.titre}`;
  function lireModules(texte, anciens) {
    const pris = new Set();
    return String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      let date = "", titre = l;
      const r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*[-–—:]?\s*(.*)$/.exec(l) || null;
      const r2 = r ? null : /^(\d{4})-(\d{2})-(\d{2})\s*[-–—:]?\s*(.*)$/.exec(l);
      if (r && r[4]) { date = `${r[3]}-${pad(r[2])}-${pad(r[1])}`; titre = r[4]; }
      else if (r2 && r2[4]) { date = `${r2[1]}-${r2[2]}-${r2[3]}`; titre = r2[4]; }
      const ancien = anciens.find((a) => !pris.has(a.id) && norm(a.titre) === norm(titre));
      const id = ancien ? ancien.id : "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      pris.add(id);
      return { id, titre, date };
    });
  }
  function ouvrirFormFormation(id) {
    const c = cfg();
    const f = id ? formation(id) : { programme: c.programmes[0], mode: "Présentiel" };
    if (id && !f) return;
    const html = `<form class="form" id="f-formation" novalidate>
      ${champ("f-titre", "Intitulé", inp("f-titre", "titre", f.titre, 'autocomplete="off" required autofocus placeholder="Soldier’s Academy · Promotion 2026"'), { req: true })}
      <div class="f2">${champ("f-programme", "Programme", sel("f-programme", "programme", c.programmes, f.programme, null))}${champ("f-parcours", "Parcours ou niveau", inp("f-parcours", "parcours", f.parcours, 'autocomplete="off" placeholder="Fondations, Niveau 1…"'))}</div>
      <div class="f2">${champ("f-debut", "Début", inp("f-debut", "dateDebut", f.dateDebut, 'type="date"'))}${champ("f-fin", "Fin", inp("f-fin", "dateFin", f.dateFin, 'type="date"'))}</div>
      <div class="f2">${champ("f-formateur", "Formateur", inp("f-formateur", "formateur", f.formateur, 'autocomplete="off"'))}${champ("f-mode", "Mode", sel("f-mode", "mode", MODES_F, f.mode, null))}</div>
      <div class="f2">${champ("f-lieu", "Lieu ou lien de connexion", inp("f-lieu", "lieu", f.lieu, 'autocomplete="off"'))}${champ("f-cap", "Places disponibles", inp("f-cap", "capacite", f.capacite || "", 'inputmode="numeric" autocomplete="off" placeholder="Sans limite"'))}</div>
      ${champ("f-frais", "Frais d’inscription (FCFA)", inp("f-frais", "frais", Number(f.frais) ? nb(f.frais) : "", 'inputmode="numeric" autocomplete="off" placeholder="Gratuit"'))}
      ${champ("f-mods", "Modules", zone("f-mods", "modules", modulesF(f).map(ligneModule).join("\n"), 'rows="6" placeholder="12/11/2026 Les fondements du combat spirituel&#10;19/11/2026 Les armes de notre guerre&#10;L’intercession prophétique"'), { hint: "Un module par ligne, avec sa date au début si elle est connue. Retirer une ligne efface la présence enregistrée pour ce module." })}
      ${champ("f-desc", "Description", zone("f-desc", "description", f.description, 'rows="3"'))}
      ${pied(id ? "Enregistrer les modifications" : "Créer la formation")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la formation" : "Nouvelle formation", html, wide: true, onSubmit: (fd, form) => enregistrerFormation(fd, form, id) });
  }
  async function enregistrerFormation(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé de la formation."); $("#f-titre").focus(); return; }
    if (g("dateDebut") && g("dateFin") && g("dateFin") < g("dateDebut")) { erreurForm("La date de fin doit suivre la date de début."); return; }
    const anciens = id ? modulesF(formation(id) || {}) : [];
    const data = { titre: g("titre"), programme: g("programme"), parcours: g("parcours"), dateDebut: g("dateDebut"), dateFin: g("dateFin"), formateur: g("formateur"), mode: g("mode"), lieu: g("lieu"), capacite: Number(g("capacite").replace(/\D/g, "")) || null, frais: Number(g("frais").replace(/\D/g, "")) || 0, modules: lireModules(g("modules"), anciens), description: g("description") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("formations/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("formations").doc(); await ref.set({ ...data, participants: {}, ...creation() }); }
    }, id ? "Formation modifiée" : "Formation créée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirFormation(id || ref.id);
  }
  function inscrireFormation(fid) {
    const f = formation(fid);
    if (!f) return;
    const avant = participantsF(f).map(({ m }) => m.id);
    ouvrirChoix({
      titre: `Inscriptions · ${f.titre}`,
      intro: `Cochez les membres inscrits à cette formation${f.capacite ? ` (${pluriel(f.capacite, "place", "places")})` : ""}. Un membre décoché garde sa progression s’il est réinscrit plus tard.`,
      selection: avant,
      libelle: "Enregistrer les inscriptions",
      meta: (m) => { const fs = formationsDe(m.id).filter((x) => x.f.id !== fid); return fs.length ? `Déjà : ${fs.map((x) => x.f.titre).join(", ")}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      onValider: async (ids) => {
        const choisis = new Set(ids);
        const maj = {};
        for (const mid of ids) { const p = (f.participants || {})[mid]; if (!actifF(p)) maj[mid] = { statut: "Inscrit", inscritLe: aujourdhui() }; }
        for (const mid of avant) if (!choisis.has(mid)) maj[mid] = { statut: "Retiré" };
        if (f.capacite && ids.length > f.capacite) toast(`Attention : ${nb(ids.length)} inscrits pour ${pluriel(f.capacite, "place", "places")}.`, "err");
        if (!Object.keys(maj).length) { ouvrirFormation(fid); return; }
        if (await ecrire(() => S.db.doc("formations/" + fid).update({ participants: maj, ...tampon() }), "Inscriptions enregistrées")) ouvrirFormation(fid);
      },
    });
  }
  function fichePointageModule(fid, modId) {
    const f = formation(fid);
    if (!f) return null;
    const x = modulesF(f).find((y) => y.id === modId);
    if (!x) return null;
    const parts = participantsF(f).filter(({ p }) => p.statut !== "Abandon").sort((a, b) => parNom(a.m, b.m));
    const n = parts.filter(({ p }) => p.suivis && p.suivis[modId]).length;
    return `<p class="hint" style="margin-bottom:10px">${esc(f.titre)} · ${x.date ? esc(fmtLong(x.date)) : "date à fixer"}. Touchez un nom pour marquer sa présence à ce module ; chaque appui est enregistré aussitôt.</p>
      <p class="tally"><span><b>${nb(n)}</b> présent${n > 1 ? "s" : ""}</span><span>sur ${pluriel(parts.length, "participant", "participants")}</span></p>
      <div class="list">${parts.map(({ m, p }) => `<button class="row" type="button" data-act="basculer-module" data-id="${esc(fid)}" data-mod="${esc(modId)}" data-mid="${esc(m.id)}" aria-pressed="${!!(p.suivis && p.suivis[modId])}"><span class="tick">${I("i-check")}</span><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span></span></button>`).join("")}</div>
      <div class="actions">${btn("voir-formation", "Retour à la formation", { ico: "i-left", data: `data-id="${esc(fid)}"` })}</div>`;
  }
  function ficheParticipant(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return null;
    const p = (f.participants || {})[mid];
    if (!actifF(p)) return null;
    const pr = progressionP(f, p);
    const ecr = peutEcrire();
    const mods = modulesF(f).map((x) => `<div class="kv-l"><span>${esc(x.titre)}</span><span class="${p.suivis && p.suivis[x.id] ? "amt in" : "muted"}">${p.suivis && p.suivis[x.id] ? "Présent" : "Absent"}</span></div>`).join("");
    return `<div class="ident">${avatar(m, true)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(f.titre)}</p></div></div>
      <div class="figure">${p.statut === "Certifié" ? `<span class="chip ok">Certifié${p.mention && p.mention !== "Sans mention" ? " · " + esc(p.mention) : ""}</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">Inscrit</span>`}<span>${pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} suivi${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""}</span></div>
      ${kv([["Inscrit le", p.inscritLe ? esc(fmtJour(p.inscritLe)) : ""], ["Certifié le", p.statut === "Certifié" && p.certifieLe ? esc(fmtJour(p.certifieLe)) : ""]])}
      ${mods ? `<h3 class="h3">Modules</h3><div class="kvl">${mods}</div>` : ""}
      <div class="actions">
        ${p.statut === "Certifié" ? btn("attestation", "Attestation (PNG)", { ico: "i-award", cls: "btn-primary", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` }) : ""}
        ${ecr && p.statut !== "Certifié" && p.statut !== "Abandon" ? btn("certifier", "Certifier", { ico: "i-award", cls: "btn-primary", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` }) : ""}
        ${ecr && p.statut === "Certifié" ? btn("statut-participant", "Annuler la certification", { ico: "i-undo", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Inscrit"` }) : ""}
        ${ecr && p.statut === "Inscrit" ? btn("statut-participant", "Marquer l’abandon", { ico: "i-x", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Abandon"` }) : ""}
        ${ecr && p.statut === "Abandon" ? btn("statut-participant", "Réintégrer", { ico: "i-undo", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Inscrit"` }) : ""}
        ${btn("voir-formation", "Retour à la formation", { ico: "i-left", data: `data-id="${esc(fid)}"` })}
      </div>`;
  }
  function ouvrirCertification(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return;
    const p = f.participants[mid] || {};
    const pr = progressionP(f, p);
    ouvrir({
      titre: "Certifier",
      html: `<form class="form" novalidate><p><b>${esc(nomUsuel(m))}</b> · ${esc(f.titre)}</p>${pr.total && pr.faits < pr.total ? `<p class="note warn">${pr.faits} module${pr.faits > 1 ? "s" : ""} suivi${pr.faits > 1 ? "s" : ""} sur ${pr.total}. Vous pouvez certifier quand même si les absences ont été rattrapées.</p>` : ""}
        <div class="f2">${champ("ce-date", "Date de certification", inp("ce-date", "date", f.dateFin && f.dateFin <= aujourdhui() ? f.dateFin : aujourdhui(), 'type="date" required'), { req: true })}${champ("ce-mention", "Mention", sel("ce-mention", "mention", MENTIONS, "Sans mention", null))}</div>
        ${pied("Certifier")}</form>`,
      onSubmit: async (fd, form) => {
        const date = String(fd.get("date") || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { erreurForm("Indiquez la date de certification."); return; }
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => S.db.doc("formations/" + fid).update({ participants: { [mid]: { statut: "Certifié", certifieLe: date, mention: String(fd.get("mention") || "") } }, ...tampon() }), "Participant certifié")) ouvrirParticipant(fid, mid);
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  const ouvrirParticipant = (fid, mid) => ouvrir({ titre: "Parcours du participant", refresh: surveiller(() => ficheParticipant(fid, mid)) });

  /* Attestations de formation */
  async function codeAttestation(m, f) {
    const txt = `S.D.E.|ATT|${m.matricule || m.id}|${f.id}|${String(m.nom || "").toUpperCase()}`;
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch (e) { return (hash(txt) >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(-6); }
  }
  function dessinerQR(x, texte, qx, qy, qs, encre) {
    const qg = window.qrcode;
    qg.stringToBytes = qg.stringToBytesFuncs["UTF-8"];
    const q = qg(0, "M"); q.addData(texte, "Byte"); q.make();
    const n = q.getModuleCount();
    x.fillStyle = "#ffffff"; x.fillRect(qx, qy, qs, qs);
    const t = Math.floor((qs - 16) / n), o = (qs - t * n) / 2;
    x.fillStyle = encre;
    for (let r = 0; r < n; r += 1) for (let cc = 0; cc < n; cc += 1) if (q.isDark(r, cc)) x.fillRect(qx + o + cc * t, qy + o + r * t, t, t);
  }
  async function rendreAttestation(m, f) {
    await Promise.all([polices(), chargerScript(LIB_QR)]);
    const c = cfg();
    const p = (f.participants || {})[m.id] || {};
    const code = await codeAttestation(m, f);
    const logo = await imageLogo();
    const W = 1754, H = 1240;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const NUIT = "#0f1e3d", OR = "#b8901f", OR_F = "#85650f", GRIS = "#535c75";
    const COND = '"Saira Condensed", "Arial Narrow", sans-serif', CORPS = '"Atkinson Hyperlegible", Arial, sans-serif', PLUME = '"Great Vibes", "Brush Script MT", cursive';
    x.fillStyle = "#fbf8f0"; x.fillRect(0, 0, W, H);
    x.fillStyle = NUIT; x.fillRect(0, 0, W, 26); x.fillRect(0, H - 26, W, 26); x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H);
    x.strokeStyle = OR; x.lineWidth = 4; x.strokeRect(52, 52, W - 104, H - 104);
    x.strokeStyle = "rgba(184,144,31,.45)"; x.lineWidth = 1.5; x.strokeRect(64, 64, W - 128, H - 128);
    if (logo) { x.globalAlpha = 0.05; x.drawImage(logo, W / 2 - 380, H / 2 - 330, 760, 760); x.globalAlpha = 1; }
    const cx = W / 2;
    x.fillStyle = NUIT; x.beginPath(); x.arc(cx, 190, 96, 0, Math.PI * 2); x.fill();
    x.strokeStyle = OR; x.lineWidth = 4; x.beginPath(); x.arc(cx, 190, 100, 0, Math.PI * 2); x.stroke();
    if (logo) x.drawImage(logo, cx - 82, 108, 164, 164);
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    x.fillStyle = OR_F; espacer(x, "4px"); ecrireAjuste(x, (c.nomOfficiel || c.nomCourt).toUpperCase(), cx, 340, W - 300, 26, `600 {t}px ${COND}`, 14);
    x.fillStyle = NUIT; espacer(x, "8px"); x.font = `700 84px ${COND}`; x.fillText("ATTESTATION DE FORMATION", cx, 440); espacer(x, "0px");
    x.strokeStyle = OR; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 220, 474); x.lineTo(cx + 220, 474); x.stroke();
    x.fillStyle = GRIS; x.font = `400 30px ${CORPS}`; x.fillText("Le Mouvement atteste que", cx, 548);
    x.fillStyle = NUIT; ecrireAjuste(x, nomUsuel(m), cx, 650, W - 360, 92, `400 {t}px ${PLUME}`, 40);
    x.fillStyle = GRIS; x.font = `400 24px ${CORPS}`; x.fillText(m.matricule ? `Matricule ${m.matricule}` : "", cx, 698);
    x.fillStyle = GRIS; x.font = `400 30px ${CORPS}`; x.fillText("a suivi avec succès la formation", cx, 770);
    x.fillStyle = NUIT; ecrireAjuste(x, f.titre || "", cx, 846, W - 320, 58, `700 {t}px ${COND}`, 28);
    const pr = progressionP(f, p);
    const details = [f.programme, f.parcours, f.dateDebut ? datesF(f).replace(/^Du /, "du ") : "", pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""].filter(Boolean).join(" · ");
    x.fillStyle = GRIS; ecrireAjuste(x, details, cx, 900, W - 360, 26, `400 {t}px ${CORPS}`, 16);
    if (p.mention && p.mention !== "Sans mention") { x.fillStyle = OR_F; x.font = `700 30px ${COND}`; espacer(x, "3px"); x.fillText(`MENTION ${p.mention.toUpperCase()}`, cx, 952); espacer(x, "0px"); }
    const qs = 236, qx = 120, qy = H - 118 - qs;
    dessinerQR(x, [`${c.nomCourt} · Attestation`, `${m.matricule || "Sans matricule"} · ${nomComplet(m)}`, String(f.titre || "").slice(0, 48), `Code de contrôle ${code}`].join("\n"), qx, qy, qs, NUIT);
    x.textAlign = "left"; x.fillStyle = GRIS; x.font = `600 18px ${COND}`; espacer(x, "2px"); x.fillText(`CONTRÔLE ${code}`, qx, qy + qs + 30); espacer(x, "0px");
    x.font = `400 24px ${CORPS}`; x.fillText(`Fait à ${c.ville}, le ${fmtJour(p.certifieLe || aujourdhui())}`, qx + qs + 36, qy + qs - 70);
    if (f.formateur) { x.fillStyle = GRIS; x.fillText(`Formateur : ${f.formateur}`, qx + qs + 36, qy + qs - 30); }
    x.textAlign = "center";
    const sx = W - 420;
    x.fillStyle = GRIS; x.font = `600 18px ${COND}`; espacer(x, "2px"); x.fillText("LE LEADER DU MOUVEMENT", sx, H - 300); espacer(x, "0px");
    x.fillStyle = NUIT; ecrireAjuste(x, c.signataire, sx, H - 220, 520, 62, `400 {t}px ${PLUME}`, 30);
    x.strokeStyle = OR; x.lineWidth = 2; x.beginPath(); x.moveTo(sx - 230, H - 196); x.lineTo(sx + 230, H - 196); x.stroke();
    x.fillStyle = GRIS; ecrireAjuste(x, `${c.signataire} · ${c.signataireTitre}`, sx, H - 160, 520, 22, `400 {t}px ${CORPS}`, 12);
    x.textAlign = "left";
    return { cv, code };
  }
  const nomFichierAttestation = (m, f) => `attestation-${[m.matricule || "", sansAccents(String(m.nom || "")), sansAccents(String(f.titre || "")).slice(0, 40)].filter(Boolean).join("-").replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "")}.png`;
  async function ouvrirAttestation(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return;
    ouvrir({ titre: "Attestation de formation", wide: true, html: chargement("Préparation de l’attestation…") });
    let res;
    try { res = await rendreAttestation(m, f); }
    catch (e) { if (!$("#sheet").hidden) $("#sheet-b").innerHTML = `<p class="note danger">${e && e.code === "bibliotheque" ? "Le générateur de code QR n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "L’attestation n’a pas pu être préparée."}</p>`; return; }
    if ($("#sheet").hidden) return;
    S.attest = { fid, mid, cv: res.cv };
    $("#sheet-b").innerHTML = `<img class="carte-img" src="${res.cv.toDataURL("image/png")}" alt="Attestation de formation de ${esc(nomUsuel(m))} pour ${esc(f.titre)}">
      <p class="hint" style="margin-top:10px">Format A4 paysage, signée « ${esc(cfg().signataire)} ». Code de contrôle : <b class="num">${esc(res.code)}</b>, vérifiable depuis Membres → Cartes.</p>
      <div class="actions">${btn("dl-attestation", "Télécharger l’image (PNG)", { ico: "i-down", cls: "btn-primary" })}${btn("voir-participant", "Retour", { ico: "i-left", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` })}</div>`;
  }
  async function zipAttestations(fid) {
    const f = formation(fid);
    if (!f) return;
    const certs = participantsF(f).filter(({ p }) => p.statut === "Certifié");
    const b = document.querySelector('[data-act="zip-attestations"]');
    if (b) b.disabled = true;
    S.attente += 1; majSync();
    try {
      await chargerScript(LIB_ZIP);
      const zip = new window.JSZip();
      for (const { m } of certs) {
        const { cv } = await rendreAttestation(m, f);
        zip.file(nomFichierAttestation(m, f), await new Promise((ok) => cv.toBlob(ok, "image/png")));
      }
      const out = await zip.generateAsync({ type: "blob" });
      await telechargerBlob(`attestations-${sansAccents(f.titre || "formation").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 50)}.zip`, out);
    } catch (e) {
      toast(e && e.code === "bibliotheque" ? "Un module nécessaire n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "Les attestations n’ont pas pu être préparées.", "err");
    } finally { S.attente -= 1; majSync(); if (b && document.contains(b)) b.disabled = false; }
  }
  function carteAcademie() {
    const pied = `<button class="link" type="button" data-vue="academie">Ouvrir l’Académie</button>`;
    if (!S.pret.formations) return carte("Académie", chargement("Lecture des formations…"));
    const encours = S.formations.filter((f) => etatFormation(f) === "encours");
    const avenir = S.formations.filter((f) => etatFormation(f) === "avenir" && f.dateDebut).sort((a, b) => cmpFr(a.dateDebut, b.dateDebut));
    if (!encours.length && !avenir.length) return carte("Académie", `<p class="hint">Aucune formation en cours ni programmée.</p>`, { pied });
    const corps = `<div class="list flat">${encours.concat(avenir.slice(0, Math.max(0, 3 - encours.length))).slice(0, 4).map(rowFormation).join("")}</div>`;
    return carte("Académie", corps, { actions: encours.length ? `<span class="chip info">${pluriel(encours.length, "en cours", "en cours")}</span>` : "", pied });
  }

  /* ════════════════════════ Porte-Voix ════════════════════════ */
  const annoncesActives = () => S.annonces.filter((a) => !a.expireLe || a.expireLe >= aujourdhui()).sort((a, b) => (!!b.epingle - !!a.epingle) || (b.creeLe || 0) - (a.creeLe || 0));
  function blocAnnonce(a, ecr) {
    const expiree = a.expireLe && a.expireLe < aujourdhui();
    return `<article class="annonce${a.epingle ? " epingle" : ""}${expiree ? " passee" : ""}"><div class="annonce-h"><h3>${esc(a.titre)}</h3><span class="btn-row">${a.epingle ? `<span class="chip gold">${I("i-pin")}Épinglée</span>` : ""}${expiree ? `<span class="chip">Expirée</span>` : a.expireLe ? `<span class="chip">Jusqu’au ${esc(fmtCourt(a.expireLe))}</span>` : ""}</span></div>
      <p class="annonce-t">${esc(a.texte)}</p><p class="hint">${esc(a.creeLe ? `Publiée le ${fmtStamp(a.creeLe)}${a.creePar ? " par " + nomDe(a.creePar) : ""}` : "")}</p>
      <div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}${ecr ? btn("editer-annonce", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(a.id)}"` }) + btn("supprimer-annonce", "Supprimer", { ico: "i-trash", sm: true, cls: "btn-danger", data: `data-id="${esc(a.id)}"` }) : ""}</div></article>`;
  }
  function carteAnnonces() {
    if (!S.pret.annonces) return carte("Annonces", chargement("Lecture des annonces…"));
    const actives = annoncesActives();
    const ecr = peutEcrire();
    if (!actives.length && !ecr) return "";
    const corps = actives.length ? actives.slice(0, 3).map((a) => `<div class="annonce-mini${a.epingle ? " epingle" : ""}"><b>${esc(a.titre)}</b><p>${esc(a.texte)}</p></div>`).join("") : `<p class="hint">Aucune annonce en cours. Publiez la prochaine depuis le Porte-Voix : elle s’affichera ici pour tous.</p>`;
    return carte("Annonces", corps, { cls: "span2", actions: ecr ? btn("ajout-annonce", "Publier", { ico: "i-plus", sm: true }) : "", pied: accesRegistre() ? `<button class="link" type="button" data-act="aller-annonces">Ouvrir le Porte-Voix</button>` : "" });
  }
  function ouvrirFormAnnonce(id) {
    const a = id ? S.annonces.find((x) => x.id === id) : {};
    if (id && !a) return;
    const html = `<form class="form" id="f-annonce" novalidate>
      ${champ("an-titre", "Titre", inp("an-titre", "titre", a.titre, 'autocomplete="off" required autofocus maxlength="120"'), { req: true })}
      ${champ("an-texte", "Texte", zone("an-texte", "texte", a.texte, 'rows="6" required'), { req: true })}
      <div class="f2">${champ("an-exp", "Visible jusqu’au", inp("an-exp", "expireLe", a.expireLe, 'type="date"'), { hint: "Facultatif : l’annonce disparaît de l’accueil après cette date." })}<div class="field"><span class="lab">Mise en avant</span><label class="check"><input type="checkbox" name="epingle" value="1"${a.epingle ? " checked" : ""}> Épingler en tête</label></div></div>
      <p class="hint">Les annonces s’affichent sur l’accueil de toutes les personnes qui ont accès à l’application, y compris en lecture seule.</p>
      ${pied(id ? "Enregistrer" : "Publier l’annonce")}
    </form>`;
    ouvrir({
      titre: id ? "Modifier l’annonce" : "Nouvelle annonce", html,
      onSubmit: async (fd, form) => {
        const g = (k) => String(fd.get(k) || "").trim();
        if (!g("titre") || !g("texte")) { erreurForm("Indiquez le titre et le texte de l’annonce."); return; }
        if (g("expireLe") && g("expireLe") < aujourdhui()) { erreurForm("La date de fin est déjà passée."); return; }
        const data = { titre: g("titre"), texte: g("texte"), expireLe: g("expireLe"), epingle: fd.get("epingle") === "1" };
        form.querySelector("[type=submit]").disabled = true;
        const ok = await ecrire(async () => { if (id) await S.db.doc("annonces/" + id).update({ ...data, ...tampon() }); else await S.db.collection("annonces").doc().set({ ...data, ...creation() }); }, id ? "Annonce modifiée" : "Annonce publiée");
        if (ok) fermer(); else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }

  /* Messages ciblés */
  const AUDIENCES = [
    ["tous", "Tous les membres actifs"], ["pole", "Un pôle"], ["garnison", "Une garnison"], ["formation", "Les participants d’une formation"], ["statut", "Un statut"],
    ["suivi", "Les membres à suivre (absents)"], ["anniv", "Les anniversaires des 7 prochains jours"], ["chaine", "Les intercesseurs de la chaîne de prière"], ["cotis", "Les membres en retard de cotisation"], ["manuel", "Une sélection de membres"],
  ];
  const audiencesPermises = () => AUDIENCES.filter(([k]) => k !== "cotis" || accesDirection());
  function valeursAudience(type) {
    if (type === "pole") return cfg().poles.map((p) => [p, p]);
    if (type === "garnison") return optionsGarnisons();
    if (type === "formation") return S.formations.slice().sort((a, b) => cmpFr(b.dateDebut || "", a.dateDebut || "")).map((f) => [f.id, f.titre]);
    if (type === "statut") return cfg().statuts.map((s) => [s, s]);
    if (type === "chaine") return [["jour", "Intercesseurs d’aujourd’hui"], ["tous", "Tous les intercesseurs de la semaine"]];
    return null;
  }
  function destinatairesDe(aud) {
    const actifs = membresActifs();
    const t = aud.type, v = aud.valeur;
    let l = [];
    if (t === "tous") l = actifs;
    else if (t === "pole") l = actifs.filter((m) => m.pole === v);
    else if (t === "garnison") l = actifs.filter((m) => dansG(m, v));
    else if (t === "formation") { const f = formation(v); l = f ? participantsF(f).filter(({ p }) => p.statut !== "Abandon").map(({ m }) => m).filter((m) => m.actif !== false) : []; }
    else if (t === "statut") l = actifs.filter((m) => m.statut === v);
    else if (t === "suivi") l = suiviPastoral().liste;
    else if (t === "anniv") l = actifs.filter((m) => { const a = prochainAnniv(m); return a && a.dans <= 7; });
    else if (t === "chaine") { const ids = new Set(v === "tous" ? intercesseursSemaine() : intercesseursDuJour(aujourdhui()).flatMap((x) => x.ids)); l = actifs.filter((m) => ids.has(m.id)); }
    else if (t === "cotis") { const an = new Date().getFullYear(); l = accesDirection() ? actifs.filter((m) => etatCotis(m, an).retard.length) : []; }
    else if (t === "manuel") { const ids = new Set(aud.ids || []); l = actifs.filter((m) => ids.has(m.id)); }
    return l.map((m) => m.id);
  }
  function libAudience(aud) {
    const base = (AUDIENCES.find(([k]) => k === aud.type) || [0, "Destinataires"])[1];
    const vals = valeursAudience(aud.type);
    const v = vals ? (vals.find(([k]) => k === aud.valeur) || [0, ""])[1] : "";
    if (aud.type === "pole" || aud.type === "garnison" || aud.type === "statut") return v ? `${aud.type === "pole" ? "Pôle" : aud.type === "garnison" ? "Garnison" : "Statut"} : ${v.replace(/^(— )+/, "")}` : base;
    if (aud.type === "formation") return v ? `Formation : ${v}` : base;
    if (aud.type === "chaine") return v || base;
    return base;
  }
  const MODELES = [["libre", "Message libre"], ["rassemblement", "Annonce d’un rassemblement"], ["convocation", "Convocation à une réunion"], ["priere", "Appel à la prière"], ["formation", "Rappel de formation"], ["cotis", "Rappel de cotisation"]];
  function texteModele(type, { evtId, formationId } = {}) {
    const c = cfg();
    if (type === "rassemblement") {
      const e = evt(evtId);
      if (!e) return "";
      return `Bonjour {prenom} ! ${e.titre} : ${fmtLong(e.date)}${e.heure ? " à " + fmtHeure(e.heure) : ""}${e.lieu ? ", " + e.lieu : ""}.${e.description ? "\n" + e.description : ""}\nNous comptons sur ta présence. Que Dieu te bénisse !\n— ${c.nomCourt}`;
    }
    if (type === "convocation") return `Bonjour {prenom}, que la paix du Seigneur soit avec toi. Tu es convoqué(e) à une réunion le [date] à [heure], [lieu].\nOrdre du jour : [à préciser].\nTa présence est importante.\n— ${c.nomCourt}`;
    if (type === "priere") { const ch = chaine(); return `Bien-aimé(e) {prenom}, la Chambre Haute t’appelle à la prière${ch.sujetSemaine ? ` pour : ${ch.sujetSemaine}` : "."}${ch.versetSemaine ? `\n« ${ch.versetSemaine} »` : ""}\nTenons-nous à la brèche ensemble.\n— ${c.nomCourt}`; }
    if (type === "formation") {
      const f = formation(formationId);
      return `Bonjour {prenom}, rappel : la formation « ${f ? f.titre : "[formation]"} »${f && f.programme ? ` (${f.programme})` : ""} se poursuit${f && f.dateDebut ? ` (${datesF(f).toLowerCase()})` : ""}${f && f.lieu ? `, ${f.lieu}` : ""}. Prépare-toi et sois à l’heure !\n— ${c.nomCourt}`;
    }
    if (type === "cotis") return `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Petit rappel fraternel : ta cotisation au mouvement ${c.nomCourt} est attendue. Merci pour ta fidélité et ton engagement !`;
    return "";
  }
  function ouvrirCompose(preset = {}) {
    const auds = audiencesPermises();
    const evts = aVenir().slice(0, 30).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre}`]);
    const fms = S.formations.map((f) => [f.id, f.titre]);
    const modeles = MODELES.filter(([k]) => k !== "cotis" || accesDirection());
    const aud = preset.aud || "tous";
    const html = `<form class="form" id="f-diff" novalidate>
      ${champ("d-titre", "Titre", inp("d-titre", "titre", preset.titre || "", 'autocomplete="off" placeholder="Pour retrouver ce message dans l’historique"'))}
      <div class="f2">${champ("d-modele", "Modèle", sel("d-modele", "modele", modeles, preset.modele || "libre", null))}<div class="field" id="d-evt-w" hidden><label for="d-evt">Rassemblement</label>${sel("d-evt", "evtId", evts, preset.evtId || "", evts.length ? null : "Aucun rassemblement à venir")}</div><div class="field" id="d-fo-w" hidden><label for="d-fo">Formation</label>${sel("d-fo", "formationId", fms, preset.formationId || (preset.aud === "formation" ? preset.val : "") || "", fms.length ? null : "Aucune formation")}</div></div>
      <div class="f2">${champ("d-aud", "Destinataires", sel("d-aud", "aud", auds, aud, null))}<div class="field" id="d-val-w" hidden><label for="d-val">Précisez</label><select class="inp" id="d-val" name="val"></select></div></div>
      <div class="field" id="d-pick" hidden><span class="lab">Membres choisis</span><input class="search" id="d-pick-q" type="search" placeholder="Filtrer la liste…" autocomplete="off" aria-label="Filtrer la liste des membres"><div class="pick">${membresActifs().map((m) => `<label class="pick-l" data-n="${esc(norm(nomComplet(m)))}"><input type="checkbox" name="ids" value="${esc(m.id)}"${(preset.ids || []).includes(m.id) ? " checked" : ""}> <span>${esc(nomComplet(m))}</span>${m.telephone ? "" : ` <small class="muted">sans numéro</small>`}</label>`).join("")}</div></div>
      <p class="note" id="d-compte" aria-live="polite"></p>
      ${champ("d-msg", "Message", zone("d-msg", "message", preset.message || "", 'rows="8" required'), { req: true, hint: "{prenom} est remplacé par le prénom de chaque destinataire." })}
      ${pied("Préparer l’envoi")}
    </form>`;
    ouvrir({
      titre: "Nouveau message", html, wide: true, onSubmit: enregistrerDiffusion,
      apres: (sheet) => {
        const $s = (q) => sheet.querySelector(q);
        const msg = $s("#d-msg");
        let auto = !msg.value;
        msg.addEventListener("input", () => { auto = !msg.value; });
        const majValeurs = (garder) => {
          const t = $s("#d-aud").value;
          const vals = valeursAudience(t);
          $s("#d-val-w").hidden = !vals;
          if (vals) {
            const cur = garder ? preset.val : $s("#d-val").value;
            $s("#d-val").innerHTML = options(vals, vals.some(([k]) => k === cur) ? cur : vals[0] ? vals[0][0] : "", vals.length ? null : "Aucun choix disponible");
          }
          $s("#d-pick").hidden = t !== "manuel";
        };
        const majModele = () => {
          const m = $s("#d-modele").value;
          $s("#d-evt-w").hidden = m !== "rassemblement";
          $s("#d-fo-w").hidden = m !== "formation";
          if (auto) { msg.value = texteModele(m, { evtId: $s("#d-evt").value, formationId: $s("#d-fo").value }); auto = true; }
        };
        const majCompte = () => {
          const t = $s("#d-aud").value;
          const ids = destinatairesDe({ type: t, valeur: $s("#d-val").value, ids: Array.from(sheet.querySelectorAll('#d-pick input[name="ids"]:checked')).map((i) => i.value) });
          const sans = ids.filter((id) => !telChiffres((membre(id) || {}).telephone)).length;
          $s("#d-compte").textContent = ids.length ? `${pluriel(ids.length, "destinataire", "destinataires")}${sans ? `, dont ${nb(sans)} sans numéro de téléphone` : ""}.` : "Aucun destinataire pour ce choix.";
        };
        $s("#d-aud").addEventListener("change", () => { majValeurs(false); majCompte(); });
        $s("#d-val").addEventListener("change", majCompte);
        $s("#d-modele").addEventListener("change", majModele);
        $s("#d-evt").addEventListener("change", majModele);
        $s("#d-fo").addEventListener("change", majModele);
        $s("#d-pick").addEventListener("change", majCompte);
        $s("#d-pick-q").addEventListener("input", (ev) => { const q = norm(ev.target.value); sheet.querySelectorAll(".pick-l").forEach((l) => { l.hidden = !!q && !l.dataset.n.includes(q); }); });
        majValeurs(true); majModele(); majCompte();
      },
    });
  }
  async function enregistrerDiffusion(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const aud = { type: g("aud"), valeur: g("val"), ids: fd.getAll("ids").map(String) };
    const ids = destinatairesDe(aud);
    if (!ids.length) { erreurForm("Aucun destinataire : changez le choix des destinataires."); return; }
    const message = g("message").replace(/\{mouvement\}/g, cfg().nomCourt);
    if (!message) { erreurForm("Écrivez le message."); $("#d-msg").focus(); return; }
    const titre = g("titre") || message.replace(/\{prenom\}/g, "").replace(/\s+/g, " ").slice(0, 60);
    form.querySelector("[type=submit]").disabled = true;
    const ref = S.db.collection("diffusions").doc();
    const ok = await ecrire(() => ref.set({ titre, message, audience: { type: aud.type, valeur: aud.type === "manuel" ? "" : aud.valeur, lib: libAudience(aud) }, destinataires: ids, envoyes: {}, ...creation() }), "Message prêt à envoyer");
    if (ok) ouvrirDiffusion(ref.id); else form.querySelector("[type=submit]").disabled = false;
  }
  const diffusion = (id) => S.diffusions.find((d) => d.id === id) || null;
  const msgPour = (d, m) => String(d.message || "").replace(/\{prenom\}/g, m ? prenomUsuel(m) : "");
  const msgGroupe = (d) => String(d.message || "").replace(/\s*\{prenom\}\s*/g, " ").replace(/ +([,.!?])/g, "$1").replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").trim();
  const envoyesD = (d) => (d.destinataires || []).filter((id) => d.envoyes && d.envoyes[id]).length;
  function rowDiffusion(d) {
    const n = (d.destinataires || []).length, e = envoyesD(d);
    return `<button class="row nolead" type="button" data-act="voir-diffusion" data-id="${esc(d.id)}"><span class="row-main"><span class="row-t">${esc(d.titre || "Message")}</span><span class="row-m">${esc([(d.audience || {}).lib, d.creeLe ? fmtStamp(d.creeLe) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="chip ${e >= n ? "ok" : e ? "info" : "warn"}">${nb(e)}/${nb(n)} envoyés</span></span></button>`;
  }
  function ficheDiffusion(id) {
    const d = diffusion(id);
    if (!d) return null;
    const ecr = peutEcrire();
    const dest = (d.destinataires || []).map((mid) => membre(mid)).filter(Boolean).sort(parNom);
    const n = dest.length, e = dest.filter((m) => d.envoyes && d.envoyes[m.id]).length;
    const suivant = dest.find((m) => !(d.envoyes && d.envoyes[m.id]) && telChiffres(m.telephone));
    const rows = dest.map((m) => {
      const fait = d.envoyes && d.envoyes[m.id];
      const tel = telChiffres(m.telephone);
      return `<div class="row nolead${fait ? " envoye" : ""}"><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${tel ? esc(telAffiche(m.telephone)) : "Sans numéro de téléphone"}${fait ? ` · envoyé ${esc(fmtStamp(fait))}` : ""}</span></span><span class="row-r"><span class="btn-row">${tel && ecr ? `<a class="btn btn-sm ${fait ? "btn-ghost" : "btn-primary"}" href="${esc(lienWa(m.telephone, msgPour(d, m)))}" target="_blank" rel="noopener" data-act="envoi-wa" data-id="${esc(d.id)}" data-mid="${esc(m.id)}">${I("i-msg")}${fait ? "Renvoyer" : "Envoyer"}</a>` : ""}${ecr ? `<button class="icon-btn" type="button" data-act="envoi-bascule" data-id="${esc(d.id)}" data-mid="${esc(m.id)}" aria-pressed="${!!fait}" aria-label="${fait ? "Marquer comme non envoyé" : "Marquer comme envoyé"} : ${esc(nomComplet(m))}">${I(fait ? "i-undo" : "i-check")}</button>` : ""}</span></span></div>`;
    }).join("");
    return `<div class="figure"><span class="chip ${e >= n ? "ok" : "info"}">${nb(e)} envoyé${e > 1 ? "s" : ""} sur ${nb(n)}</span><span>${esc((d.audience || {}).lib || "")}</span></div>
      <div class="bar" aria-hidden="true" style="margin-bottom:14px"><i style="width:${n ? ((e / n) * 100).toFixed(1) : 0}%"></i></div>
      <div class="msgbox">${esc(d.message)}</div>
      <div class="actions">${suivant && ecr ? `<a class="btn btn-primary" href="${esc(lienWa(suivant.telephone, msgPour(d, suivant)))}" target="_blank" rel="noopener" data-act="envoi-wa" data-id="${esc(d.id)}" data-mid="${esc(suivant.id)}">${I("i-msg")}Envoyer à ${esc(prenomUsuel(suivant))}</a>` : ""}${btn("copier-msg-groupe", "Copier pour un groupe", { ico: "i-copy", data: `data-id="${esc(d.id)}"` })}${btn("copier-numeros", "Copier les numéros", { ico: "i-phone", data: `data-id="${esc(d.id)}"` })}${btn("export-diffusion", "Exporter", { ico: "i-down", data: `data-id="${esc(d.id)}"` })}</div>
      <p class="hint">WhatsApp s’ouvre avec le message déjà personnalisé : il reste à appuyer sur « Envoyer ». Pour une liste de diffusion WhatsApp, copiez les numéros puis le message de groupe.</p>
      <h3 class="h3">Destinataires (${nb(n)})</h3><div class="list">${rows}</div>
      ${ecr ? `<div class="actions">${btn("supprimer-diffusion", "Supprimer ce message", { ico: "i-trash", cls: "btn-danger", sm: true, data: `data-id="${esc(d.id)}"` })}</div>` : ""}`;
  }
  const ouvrirDiffusion = (id) => ouvrir({ titre: "Message", wide: true, refresh: surveiller(() => ficheDiffusion(id)) });
  VUES.portevoix = function () {
    const ecr = peutEcrire();
    let out = secHead("Porte-Voix", { eyebrow: "Communication", verset: VERSETS.portevoix, actions: ecr ? btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) + btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les annonces et les messages du mouvement");
    if (!S.pret.annonces || !S.pret.diffusions || !S.pret.membres) return out + chargement("Lecture des communications…");
    const actives = annoncesActives();
    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length]]);
    if (S.sous.portevoix === "messages") {
      if (!S.diffusions.length) return out + vide("i-horn", "Aucun message préparé. Choisissez des destinataires (une garnison, un pôle, les participants d’une formation, les membres à suivre…) et un modèle : l’application prépare un message WhatsApp personnalisé pour chacun et suit les envois.", ecr ? btn("ecrire", "Préparer un message", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
      const liste = S.diffusions.slice().sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));
      return out + `<div class="list">${liste.map(rowDiffusion).join("")}</div>`;
    }
    const passees = S.annonces.filter((a) => a.expireLe && a.expireLe < aujourdhui()).sort((a, b) => cmpFr(b.expireLe, a.expireLe));
    if (!actives.length && !passees.length) return out + vide("i-pin", "Aucune annonce. Une annonce publiée ici s’affiche sur l’accueil de tous, y compris des personnes en lecture seule.", ecr ? btn("ajout-annonce", "Publier une annonce", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    return out + `<div class="col">${actives.map((a) => blocAnnonce(a, ecr)).join("")}</div>${passees.length ? `<h2 class="h3" style="margin-top:22px">Annonces expirées</h2><div class="col">${passees.slice(0, 10).map((a) => blocAnnonce(a, ecr)).join("")}</div>` : ""}`;
  };

  /* ════════════════════════ Chambre Haute ════════════════════════ */
  const CATEGORIES_PRIERE = ["Santé et guérison", "Famille", "Travail et finances", "Délivrance", "Études", "Ministère et mouvement", "Nations", "Autre"];
  const CRENEAUX_DEFAUT = ["05:00", "12:00", "18:00", "00:00"];
  const chaine = () => ({ creneaux: CRENEAUX_DEFAUT, affectations: {}, sujetSemaine: "", versetSemaine: "", ...(S.chaine || {}) });
  const heureC = (h) => (h === "00:00" ? "minuit" : fmtHeure(h));
  const cleCreneau = (j, h) => `${j}_${String(h).replace(":", "")}`;
  function intercesseursDuJour(iso) {
    const ch = chaine(), j = jourIdx(iso);
    return ch.creneaux.map((h) => ({ h, ids: ((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id)) }));
  }
  function intercesseursSemaine() {
    const out = new Set();
    for (const v of Object.values(chaine().affectations || {})) if (Array.isArray(v)) v.forEach((id) => out.add(id));
    return [...out].filter((id) => membre(id));
  }
  function creneauxDe(mid) {
    const ch = chaine(), out = [];
    for (let j = 1; j <= 7; j += 1) for (const h of ch.creneaux) if (((ch.affectations || {})[cleCreneau(j, h)] || []).includes(mid)) out.push(`${JOURS[j - 1]} ${heureC(h)}`);
    return out;
  }
  const priere = (id, conf) => (conf ? S.prieresConf : S.prieres).find((p) => p.id === id) || null;
  const nbPriants = (p) => Object.values(p.priants || {}).filter(Boolean).length;
  function rowPriere(p, conf) {
    const pour = membre(p.pourId);
    const meta = [p.categorie, pour ? "pour " + nomCourtM(pour) : p.pour ? "pour " + p.pour : "", p.date ? fmtCourt(p.date) : ""].filter(Boolean).join(" · ");
    const n = nbPriants(p);
    const moi = S.me.id && p.priants && p.priants[S.me.id];
    const enPriere = (p.statut || "En prière") === "En prière";
    return `<div class="pr-row${p.urgent && enPriere ? " urgent" : ""}"><button class="pr-main" type="button" data-act="voir-priere" data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}><span class="row-main"><span class="row-t">${p.urgent && enPriere ? `<span class="chip danger">Urgent</span> ` : ""}${esc(p.sujet || "Requête")}</span><span class="row-m">${esc(meta)}</span>${p.statut === "Exaucée" && p.temoignage ? `<span class="row-q">${esc(p.temoignage)}</span>` : ""}</span></button><span class="pr-side">${enPriere && peutEcrire() && S.me.id ? `<button class="btn btn-sm ${moi ? "btn-ghost" : "btn-primary"}" type="button" data-act="j-ai-prie" data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""} aria-pressed="${!!moi}">${I("i-flame")}${moi ? "Prié" : "J’ai prié"}</button>` : ""}<span class="chip">${pluriel(n, "intercesseur", "intercesseurs")}</span></span></div>`;
  }
  VUES.chambre = function () {
    const ecr = peutEcrire();
    let out = secHead("Chambre Haute", { eyebrow: "Intercession et prière", verset: VERSETS.chambre, actions: ecr ? btn("ajout-priere", "Nouvelle requête", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les requêtes de prière et la chaîne d’intercession");
    if (!S.pret.prieres || !S.pret.chaine || !S.pret.membres) return out + chargement("Lecture de la Chambre Haute…");
    const ch = chaine();
    out += `<section class="card hero sujet"><div class="card-h"><h2 class="card-t">Sujet de la semaine</h2>${ecr ? btn("editer-sujet", "Modifier", { ico: "i-edit", sm: true }) : ""}</div>${ch.sujetSemaine ? `<p class="sujet-t">${esc(ch.sujetSemaine)}</p>${ch.versetSemaine ? `<p class="hint">« ${esc(ch.versetSemaine)} »</p>` : ""}` : `<p class="hint">Aucun sujet défini. Fixez le sujet de prière de la semaine : il s’affichera sur l’accueil et dans les appels à la prière.</p>`}</section>`;
    const enP = S.prieres.filter((p) => (p.statut || "En prière") === "En prière");
    const exa = S.prieres.filter((p) => p.statut === "Exaucée");
    const ong = [["requetes", "En prière", enP.length], ["exaucees", "Témoignages", exa.length], ["chaine", "Chaîne de prière", null]];
    if (accesDirection()) ong.push(["confidentielles", "Confidentielles", S.pret.prieresConf ? S.prieresConf.filter((p) => (p.statut || "En prière") === "En prière").length : null]);
    ong.push(["closes", "Closes", S.prieres.filter((p) => p.statut === "Close").length]);
    out += `<div style="margin-top:16px">${sousOnglets("chambre", ong)}</div>`;
    const s = S.sous.chambre;
    if (s === "confidentielles" && !accesDirection()) S.sous.chambre = "requetes";
    if (s === "chaine") return out + vueChaine();
    if (s === "confidentielles") {
      if (!S.pret.prieresConf) return out + chargement("Lecture des requêtes confidentielles…");
      const l = S.prieresConf.slice().sort((a, b) => ((a.statut || "En prière") !== "En prière") - ((b.statut || "En prière") !== "En prière") || cmpFr(b.date || "", a.date || ""));
      return out + `<p class="note">${I("i-lock")} Requêtes confidentielles : seuls le propriétaire et les éditeurs y ont accès.</p>${l.length ? `<div class="list">${l.map((p) => rowPriere(p, true)).join("")}</div>` : vide("i-lock", "Aucune requête confidentielle.")}`;
    }
    const l = s === "exaucees" ? exa : s === "closes" ? S.prieres.filter((p) => p.statut === "Close") : enP;
    l.sort((a, b) => (s === "requetes" ? (!!b.urgent - !!a.urgent) : 0) || cmpFr(b.date || "", a.date || ""));
    if (!l.length) return out + vide("i-flame", s === "exaucees" ? "Aucun témoignage pour l’instant. Quand une requête est exaucée, marquez-la comme telle et notez le témoignage : il apparaîtra ici." : s === "closes" ? "Aucune requête close." : "Aucune requête en cours. Déposez les sujets de prière des membres et du mouvement : chacun pourra indiquer qu’il a prié.", ecr && s === "requetes" ? btn("ajout-priere", "Déposer une requête", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    return out + `<div class="list">${l.map((p) => rowPriere(p, false)).join("")}</div>`;
  };
  function vueChaine() {
    const ch = chaine();
    const ecr = peutEcrire();
    const today = jourIdx(aujourdhui());
    const tot = intercesseursSemaine().length;
    const vides = (() => { let n = 0; for (let j = 1; j <= 7; j += 1) for (const h of ch.creneaux) if (!((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id)).length) n += 1; return n; })();
    let out = `<div class="toolbar"><p class="hint" style="margin:0">${pluriel(tot, "intercesseur engagé", "intercesseurs engagés")} · ${pluriel(ch.creneaux.length, "créneau", "créneaux")} par jour${vides ? ` · ${pluriel(vides, "créneau libre", "créneaux libres")}` : ""}</p><div class="btn-row">${ecr ? btn("ecrire", "Rappeler ceux d’aujourd’hui", { ico: "i-msg", sm: true, data: 'data-aud="chaine" data-val="jour" data-modele="priere"' }) + btn("editer-creneaux", "Modifier les créneaux", { ico: "i-clock", sm: true }) : ""}</div></div>`;
    const ordre = [0, 1, 2, 3, 4, 5, 6].map((k) => ((today - 1 + k) % 7) + 1);
    out += `<div class="grid g3">${ordre.map((j) => {
      const lignes = ch.creneaux.map((h) => {
        const ids = ((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id));
        return `<div class="cr-row"><span class="cr-h num">${esc(heureC(h))}</span><span class="cr-n">${ids.length ? esc(ids.map((id) => nomCourtM(membre(id))).join(", ")) : `<span class="muted">Personne</span>`}</span>${ecr ? `<button class="icon-btn" type="button" data-act="editer-creneau" data-j="${j}" data-h="${esc(h)}" aria-label="Choisir les intercesseurs du ${esc(JOURS[j - 1].toLowerCase())} à ${esc(heureC(h))}">${I("i-edit")}</button>` : ""}</div>`;
      }).join("");
      return `<section class="card cr-jour${j === today ? " auj" : ""}"><div class="card-h"><h2 class="card-t">${esc(JOURS[j - 1])}</h2>${j === today ? `<span class="chip warn">Aujourd’hui</span>` : ""}</div>${lignes}</section>`;
    }).join("")}</div>`;
    return out;
  }
  function ouvrirFormPriere(id, conf) {
    const p = id ? priere(id, conf) : { date: aujourdhui(), categorie: CATEGORIES_PRIERE[0] };
    if (id && !p) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const html = `<form class="form" id="f-priere" novalidate>
      ${champ("p-sujet", "Sujet", inp("p-sujet", "sujet", p.sujet, 'autocomplete="off" required autofocus maxlength="140" placeholder="Guérison de maman, examen de fin d’année…"'), { req: true })}
      ${champ("p-det", "Détails", zone("p-det", "details", p.details, 'rows="4"'))}
      <div class="f2">${champ("p-cat", "Catégorie", sel("p-cat", "categorie", CATEGORIES_PRIERE, p.categorie, null))}${champ("p-date", "Date", inp("p-date", "date", p.date, 'type="date"'))}</div>
      <div class="f2">${champ("p-pour", "Pour un membre", sel("p-pour", "pourId", mbs, p.pourId, "—"))}${champ("p-autre", "Ou pour une autre personne", inp("p-autre", "pour", p.pour, 'autocomplete="off" placeholder="Un proche, une nation…"'))}</div>
      <label class="check"><input type="checkbox" name="urgent" value="1"${p.urgent ? " checked" : ""}> Requête urgente</label>
      ${!id && accesDirection() ? `<label class="check"><input type="checkbox" name="conf" value="1"> Confidentielle : visible seulement par la direction</label>` : !id ? `<p class="hint">Pour une requête confidentielle, adressez-vous à la direction : elle seule peut l’enregistrer à l’abri des autres responsables.</p>` : ""}
      ${pied(id ? "Enregistrer" : "Déposer la requête")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la requête" : "Nouvelle requête", html, wide: true, onSubmit: (fd, form) => enregistrerPriere(fd, form, id, conf) });
  }
  async function enregistrerPriere(fd, form, id, conf) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("sujet")) { erreurForm("Indiquez le sujet de la requête."); $("#p-sujet").focus(); return; }
    const vers = id ? (conf ? "prieres_conf" : "prieres") : fd.get("conf") === "1" && accesDirection() ? "prieres_conf" : "prieres";
    const data = { sujet: g("sujet"), details: g("details"), categorie: g("categorie"), date: g("date") || aujourdhui(), pourId: g("pourId"), pour: g("pourId") ? "" : g("pour"), urgent: fd.get("urgent") === "1" };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc(`${vers}/${id}`).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection(vers).doc(); await ref.set({ ...data, statut: "En prière", priants: {}, ...creation() }); }
    }, id ? "Requête modifiée" : "Requête déposée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirPriere(id || ref.id, vers === "prieres_conf");
  }
  function fichePriere(id, conf) {
    const p = priere(id, conf);
    if (!p) return null;
    const ecr = peutEcrire();
    const pour = membre(p.pourId);
    const st = p.statut || "En prière";
    const priants = Object.entries(p.priants || {}).filter(([, v]) => v).map(([uid]) => uid);
    const moi = S.me.id && p.priants && p.priants[S.me.id];
    return `<div class="figure"><span class="chip ${st === "Exaucée" ? "ok" : st === "Close" ? "" : "info"}">${esc(st)}</span>${p.urgent && st === "En prière" ? `<span class="chip danger">Urgent</span>` : ""}${conf ? `<span class="chip">${I("i-lock")}Confidentielle</span>` : ""}</div>
      <p style="margin:0 0 12px;font-size:18px;font-weight:700">${esc(p.sujet)}</p>
      ${p.details ? `<div class="msgbox">${esc(p.details)}</div>` : ""}
      ${kv([["Catégorie", esc(p.categorie || "")], ["Pour", pour ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(pour.id)}">${esc(nomUsuel(pour))}</button>` : esc(p.pour || "")], ["Déposée le", p.date ? esc(fmtJour(p.date)) : ""], ["Déposée par", p.creePar ? esc(nomDe(p.creePar)) : ""], ["Ont prié", priants.length ? esc(priants.map((u) => nomDe(u)).join(", ")) : "Personne pour l’instant"], ["Exaucée le", st === "Exaucée" && p.exauceeLe ? esc(fmtJour(p.exauceeLe)) : ""], ["Témoignage", p.temoignage ? `<span style="white-space:pre-wrap">${esc(p.temoignage)}</span>` : ""]])}
      <div class="actions">
        ${st === "En prière" && ecr && S.me.id ? btn("j-ai-prie", moi ? "Retirer « J’ai prié »" : "J’ai prié", { ico: "i-flame", cls: moi ? "btn-ghost" : "btn-primary", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${st === "En prière" && ecr ? btn("exaucer", "Marquer exaucée", { ico: "i-check", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) + btn("statut-priere", "Clore", { ico: "i-archive", data: `data-id="${esc(p.id)}" data-statut="Close"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${st !== "En prière" && ecr ? btn("statut-priere", "Remettre en prière", { ico: "i-undo", data: `data-id="${esc(p.id)}" data-statut="En prière"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${!conf ? btn("partager-priere", "Partager", { ico: "i-msg", data: `data-id="${esc(p.id)}"` }) : ""}
        ${ecr ? btn("editer-priere", "Modifier", { ico: "i-edit", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${peutAdmin() ? btn("supprimer-priere", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
      </div>`;
  }
  const ouvrirPriere = (id, conf) => ouvrir({ titre: conf ? "Requête confidentielle" : "Requête de prière", refresh: surveiller(() => fichePriere(id, conf)) });
  function ouvrirExaucement(id, conf) {
    const p = priere(id, conf);
    if (!p) return;
    ouvrir({
      titre: "Requête exaucée",
      html: `<form class="form" novalidate><p><b>${esc(p.sujet)}</b></p>${champ("ex-date", "Exaucée le", inp("ex-date", "date", aujourdhui(), 'type="date"'))}${champ("ex-tem", "Témoignage", zone("ex-tem", "temoignage", p.temoignage, 'rows="5" autofocus placeholder="Ce que le Seigneur a fait…"'))}${pied("Rendre gloire")}</form>`,
      onSubmit: async (fd, form) => {
        form.querySelector("[type=submit]").disabled = true;
        const ok = await ecrire(() => S.db.doc(`${conf ? "prieres_conf" : "prieres"}/${id}`).update({ statut: "Exaucée", exauceeLe: String(fd.get("date") || aujourdhui()), temoignage: String(fd.get("temoignage") || "").trim(), ...tampon() }), "Gloire à Dieu ! Requête exaucée");
        if (ok) ouvrirPriere(id, conf); else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function ouvrirSujet() {
    const ch = chaine();
    ouvrir({
      titre: "Sujet de la semaine",
      html: `<form class="form" novalidate>${champ("su-t", "Sujet de prière", zone("su-t", "sujet", ch.sujetSemaine, 'rows="3" autofocus placeholder="IN FIRE 2026 : que le feu du réveil embrase les nations"'))}${champ("su-v", "Verset d’appui", inp("su-v", "verset", ch.versetSemaine, 'autocomplete="off" placeholder="Car là où deux ou trois sont assemblés en mon nom… (Matthieu 18.20)"'))}${pied("Enregistrer")}</form>`,
      onSubmit: async (fd, form) => {
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => upsert("chaine/semaine", { sujetSemaine: String(fd.get("sujet") || "").trim(), versetSemaine: String(fd.get("verset") || "").trim() }), "Sujet de la semaine enregistré")) fermer();
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function ouvrirCreneaux() {
    const ch = chaine();
    ouvrir({
      titre: "Créneaux de prière",
      html: `<form class="form" novalidate>${champ("cr-l", "Heures des créneaux", zone("cr-l", "creneaux", ch.creneaux.join("\n"), 'rows="6" autofocus'), { hint: "Une heure par ligne, au format 05:00. Les intercesseurs déjà affectés à une heure conservée restent en place." })}${pied("Enregistrer")}</form>`,
      onSubmit: async (fd, form) => {
        const lignes = [...new Set(String(fd.get("creneaux") || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
        const mal = lignes.filter((l) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(l));
        if (!lignes.length || mal.length) { erreurForm(mal.length ? `Format d’heure invalide : ${mal.join(", ")}. Écrivez par exemple 05:00 ou 18:30.` : "Indiquez au moins un créneau."); return; }
        lignes.sort((a, b) => (a === "00:00") - (b === "00:00") || cmpFr(a, b));
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => upsert("chaine/semaine", { creneaux: lignes }), "Créneaux enregistrés")) fermer();
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function choisirIntercesseurs(j, h) {
    const k = cleCreneau(j, h);
    ouvrirChoix({
      titre: `${JOURS[j - 1]} · ${heureC(h)}`,
      intro: "Cochez les intercesseurs qui tiennent ce créneau chaque semaine.",
      selection: ((chaine().affectations || {})[k] || []).filter((id) => membre(id)),
      libelle: "Enregistrer",
      meta: (m) => { const c = creneauxDe(m.id); return c.length ? `Déjà : ${c.slice(0, 3).join(", ")}${c.length > 3 ? "…" : ""}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      onValider: async (ids) => {
        if (await ecrire(() => upsert("chaine/semaine", { affectations: { [k]: ids } }), "Créneau mis à jour")) { fermer(); allerA("chambre", "chaine"); }
      },
    });
  }
  function carteChambre() {
    const pied = `<button class="link" type="button" data-vue="chambre">Ouvrir la Chambre Haute</button>`;
    if (!S.pret.prieres || !S.pret.chaine || !S.pret.membres) return carte("Chambre Haute", chargement("Lecture des requêtes…"));
    const ch = chaine();
    const enP = S.prieres.filter((p) => (p.statut || "En prière") === "En prière");
    const urg = enP.filter((p) => p.urgent).length;
    const auj = intercesseursDuJour(aujourdhui()).filter((x) => x.ids.length);
    const corps = `${ch.sujetSemaine ? `<p class="eyebrow">Sujet de la semaine</p><p class="sujet-mini">${esc(ch.sujetSemaine)}</p>` : ""}
      <div class="split"><div><span>En prière</span><b>${nb(enP.length)}</b></div><div><span>Urgentes</span><b>${nb(urg)}</b></div><div><span>Exaucées</span><b>${nb(S.prieres.filter((p) => p.statut === "Exaucée").length)}</b></div></div>
      <p class="hint" style="margin-top:12px">${auj.length ? `Aujourd’hui : ${esc(auj.map((x) => `${heureC(x.h)} ${x.ids.map((id) => prenomUsuel(membre(id))).join(", ")}`).join(" · "))}` : "Aucun intercesseur affecté aujourd’hui dans la chaîne de prière."}</p>`;
    return carte("Chambre Haute", corps, { actions: urg ? `<span class="chip danger">${pluriel(urg, "urgente", "urgentes")}</span>` : "", pied });
  }

  /* ════════════════════════ Arsenal ════════════════════════ */
  const TYPES_R = [["livre", "Livre", "i-shelf"], ["video", "Enseignement vidéo", "i-play"], ["audio", "Enseignement audio", "i-audio"], ["document", "Document", "i-file"], ["image", "Image", "i-image"], ["lien", "Lien", "i-link"]];
  const typeR = (r) => TYPES_R.find(([k]) => k === r.type) || TYPES_R[5];
  const ressource = (id) => S.ressources.find((r) => r.id === id) || null;
  const pretsEnCours = (r) => Object.entries(r.prets || {}).filter(([, p]) => p && !p.renduLe).map(([id, p]) => ({ id, ...p }));
  const disponibles = (r) => (Number(r.exemplaires) ? Number(r.exemplaires) - pretsEnCours(r).length : null);
  const TYPES_FICHIER = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
  const taille = (o) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
  function rowRessource(r) {
    const t = typeR(r);
    const dispo = disponibles(r);
    const meta = [t[1], r.auteur, r.annee, r.theme].filter(Boolean).join(" · ");
    return `<button class="row" type="button" data-act="voir-ressource" data-id="${esc(r.id)}"><span class="r-ico t-${esc(t[0])}" aria-hidden="true">${I(t[2])}</span><span class="row-main"><span class="row-t">${esc(r.titre || "Ressource")}</span><span class="row-m">${esc(meta)}</span></span><span class="row-r">${dispo != null ? `<span class="chip ${dispo > 0 ? "ok" : "warn"}">${dispo > 0 ? `${nb(dispo)} dispo.` : "Tous prêtés"}</span>` : ""}${r.fichierId ? `<span class="chip">${I("i-file")}Fichier</span>` : urlSure(r.lien) ? `<span class="chip">${I("i-link")}Lien</span>` : ""}</span></button>`;
  }
  VUES.arsenal = function () {
    const ecr = peutEcrire();
    let out = secHead("Arsenal", { eyebrow: "Médias et bibliothèque", verset: VERSETS.arsenal, actions: ecr ? btn("ajout-ressource", "Ajouter une ressource", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les livres, enseignements et médias du mouvement");
    if (!S.pret.ressources) return out + chargement("Lecture de l’Arsenal…");
    const prets = S.ressources.flatMap((r) => pretsEnCours(r).map((p) => ({ r, p })));
    const retard = prets.filter(({ p }) => p.retourPrevu && p.retourPrevu < aujourdhui()).length;
    if (accesRegistre()) out += sousOnglets("arsenal", [["biblio", "Bibliothèque", S.ressources.length], ["prets", "Prêts en cours", prets.length]]);
    if (S.sous.arsenal === "prets" && accesRegistre()) {
      if (!prets.length) return out + vide("i-shelf", "Aucun livre prêté en ce moment. Indiquez le nombre d’exemplaires d’un livre dans sa fiche pour pouvoir le prêter.");
      prets.sort((a, b) => cmpFr(a.p.retourPrevu || "9999", b.p.retourPrevu || "9999"));
      return out + `<div class="list">${prets.map(({ r, p }) => { const m = membre(p.membreId); const tard = p.retourPrevu && p.retourPrevu < aujourdhui(); return `<div class="row nolead"><span class="row-main"><span class="row-t">${esc(r.titre)}</span><span class="row-m">${esc([m ? nomComplet(m) : "Membre inconnu", p.date ? "prêté le " + fmtCourt(p.date) : "", p.retourPrevu ? "retour prévu le " + fmtCourt(p.retourPrevu) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${tard ? `<span class="chip danger">En retard</span>` : ""}${ecr ? btn("rendre-pret", "Rendu", { ico: "i-check", sm: true, data: `data-id="${esc(r.id)}" data-pret="${esc(p.id)}"` }) : ""}</span></div>`; }).join("")}</div>`;
    }
    const livres = S.ressources.filter((r) => r.type === "livre").length;
    const medias = S.ressources.filter((r) => r.type === "video" || r.type === "audio").length;
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-shelf")}Ressources</span><span class="stat-v">${nb(S.ressources.length)}</span><span class="stat-m">Dans l’Arsenal</span></div>
      <div class="stat"><span class="stat-l">Livres</span><span class="stat-v">${nb(livres)}</span><span class="stat-m">Ouvrages et manuels</span></div>
      <div class="stat"><span class="stat-l">${I("i-play")}Enseignements</span><span class="stat-v">${nb(medias)}</span><span class="stat-m">Vidéos et audios</span></div>
      <div class="stat"><span class="stat-l">Prêts en cours</span><span class="stat-v">${nb(prets.length)}</span><span class="stat-m">${retard ? `${nb(retard)} en retard` : "Aucun retard"}</span></div></div>`;
    const f = S.f.arsenal;
    const themes = [...new Set(S.ressources.map((r) => (r.theme || "").trim()).filter(Boolean))].sort(cmpFr);
    out += `<div class="filters"><div class="chips" role="group" aria-label="Type de ressource">${[["", "Tout"], ...TYPES_R.map(([k, l]) => [k, l.replace("Enseignement ", "")])].map(([k, l]) => `<button class="chip-btn${f.type === k ? " on" : ""}" type="button" data-act="arsenal-type" data-v="${k}" aria-pressed="${f.type === k}">${esc(cap(l))}</button>`).join("")}</div>
      <label class="sr" for="q-ars">Rechercher une ressource</label><input class="search" id="q-ars" type="search" placeholder="Titre, auteur, thème…" value="${esc(f.q)}" data-filtre="arsenal.q" autocomplete="off">${themes.length ? `<label class="sr" for="f-theme">Thème</label><select class="sel" id="f-theme" data-filtre="arsenal.theme">${options(themes, f.theme, "Tous les thèmes")}</select>` : ""}</div>`;
    if (!S.ressources.length) return out + vide("i-shelf", "L’Arsenal est vide. Ajoutez les livres du mouvement, les enseignements (lien YouTube ou Drive), les documents PDF et les images à partager.", ecr ? btn("ajout-ressource", "Ajouter une ressource", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const q = norm(f.q);
    const liste = S.ressources.filter((r) => (!f.type || r.type === f.type) && (!f.theme || (r.theme || "").trim() === f.theme) && (!q || norm([r.titre, r.auteur, r.theme, r.description].join(" ")).includes(q)))
      .sort((a, b) => (!!b.enAvant - !!a.enAvant) || cmpFr(a.titre || "", b.titre || ""));
    if (!liste.length) return out + vide("i-search", "Aucune ressource ne correspond.");
    return out + `<div class="list">${liste.slice(0, S.limite).map(rowRessource).join("")}${liste.length > S.limite ? `<button class="more" type="button" data-act="plus">Afficher plus de ressources</button>` : ""}</div>`;
  };
  function ficheRessource(id) {
    const r = ressource(id);
    if (!r) return null;
    const t = typeR(r);
    const ecr = peutEcrire();
    const lien = urlSure(r.lien);
    const prets = pretsEnCours(r);
    const dispo = disponibles(r);
    const histo = Object.entries(r.prets || {}).filter(([, p]) => p && p.renduLe).map(([pid, p]) => ({ id: pid, ...p })).sort((a, b) => cmpFr(b.renduLe, a.renduLe)).slice(0, 5);
    const nomP = (p) => { const m = membre(p.membreId); return m ? nomComplet(m) : "Emprunteur"; };
    return `<div class="ident"><span class="r-ico lg t-${esc(t[0])}" aria-hidden="true">${I(t[2])}</span><div><h3>${esc(r.titre)}</h3><p>${esc([t[1], r.auteur].filter(Boolean).join(" · "))}</p></div></div>
      ${r.description ? `<div class="msgbox">${esc(r.description)}</div>` : ""}
      ${kv([["Auteur ou orateur", esc(r.auteur || "")], ["Année", esc(r.annee || "")], ["Thème", esc(r.theme || "")], ["Exemplaires", Number(r.exemplaires) ? esc(`${nb(r.exemplaires)} · ${nb(Math.max(0, dispo))} disponible${dispo > 1 ? "s" : ""}`) : ""], ["Fichier", r.fichierId ? esc(`${r.fichierNom || "Fichier"}${r.fichierTaille ? " · " + taille(r.fichierTaille) : ""}`) : ""], ["Lien", lien ? `<a class="link" href="${esc(lien)}" target="_blank" rel="noopener">${esc(lien.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : ""]])}
      <div class="actions">${lien ? `<a class="btn btn-primary" href="${esc(lien)}" target="_blank" rel="noopener">${I(r.type === "video" ? "i-play" : r.type === "audio" ? "i-audio" : "i-link")}Ouvrir</a>` : ""}${r.fichierId ? `<a class="btn ${lien ? "btn-ghost" : "btn-primary"}" href="/_blob/${esc(r.fichierId)}" target="_blank" rel="noopener">${I("i-file")}Consulter le fichier</a>${btn("dl-ressource", "Télécharger", { ico: "i-down", data: `data-id="${esc(r.id)}"` })}` : ""}${btn("partager-ressource", "Partager", { ico: "i-msg", data: `data-id="${esc(r.id)}"` })}</div>
      ${accesRegistre() && (Number(r.exemplaires) || prets.length) ? `<h3 class="h3">Prêts</h3>${prets.length ? `<div class="list">${prets.map((p) => `<div class="row nolead"><span class="row-main"><span class="row-t">${esc(nomP(p))}</span><span class="row-m">${esc([p.date ? "prêté le " + fmtCourt(p.date) : "", p.retourPrevu ? "retour prévu le " + fmtCourt(p.retourPrevu) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${p.retourPrevu && p.retourPrevu < aujourdhui() ? `<span class="chip danger">En retard</span>` : ""}${ecr ? btn("rendre-pret", "Rendu", { ico: "i-check", sm: true, data: `data-id="${esc(r.id)}" data-pret="${esc(p.id)}"` }) : ""}</span></div>`).join("")}</div>` : `<p class="hint">Aucun exemplaire prêté.</p>`}
        ${ecr && dispo > 0 ? `<div class="btn-row" style="margin-top:10px">${btn("preter", "Prêter un exemplaire", { ico: "i-plus", sm: true, data: `data-id="${esc(r.id)}"` })}</div>` : ""}
        ${histo.length ? `<p class="hint" style="margin-top:10px">Derniers retours : ${esc(histo.map((p) => `${nomP(p)} (${fmtCourt(p.renduLe)})`).join(", "))}.</p>` : ""}` : ""}
      ${ecr ? `<hr class="sep"><div class="btn-row">${btn("editer-ressource", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(r.id)}"` })}${peutAdmin() ? btn("supprimer-ressource", "Supprimer", { ico: "i-trash", cls: "btn-danger", sm: true, data: `data-id="${esc(r.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirRessource = (id) => ouvrir({ titre: "Arsenal", refresh: surveiller(() => ficheRessource(id)) });
  function ouvrirFormRessource(id) {
    const r = id ? ressource(id) : { type: "livre" };
    if (id && !r) return;
    const peutFichier = !!S.assets && peutAdmin();
    const html = `<form class="form" id="f-ressource" novalidate>
      ${champ("r-titre", "Titre", inp("r-titre", "titre", r.titre, 'autocomplete="off" required autofocus'), { req: true })}
      <div class="f2">${champ("r-type", "Type", sel("r-type", "type", TYPES_R.map(([k, l]) => [k, l]), r.type, null))}${champ("r-auteur", "Auteur ou orateur", inp("r-auteur", "auteur", r.auteur, 'autocomplete="off"'))}</div>
      <div class="f2">${champ("r-annee", "Année", inp("r-annee", "annee", r.annee, 'inputmode="numeric" maxlength="4" autocomplete="off"'))}${champ("r-theme", "Thème", inp("r-theme", "theme", r.theme, 'autocomplete="off" placeholder="Combat spirituel, Prière, Famille…" list="themes-l"'))}<datalist id="themes-l">${[...new Set(S.ressources.map((x) => x.theme).filter(Boolean))].map((x) => `<option value="${esc(x)}">`).join("")}</datalist></div>
      ${champ("r-desc", "Description", zone("r-desc", "description", r.description, 'rows="3"'))}
      ${champ("r-lien", "Lien (YouTube, Drive, site…)", inp("r-lien", "lien", r.lien, 'type="url" inputmode="url" autocomplete="off" placeholder="https://"'), { hint: "Pour un enseignement audio ou une vidéo lourde, mettez le lien de la plateforme où il est hébergé." })}
      <div class="f2">${champ("r-ex", "Exemplaires physiques", inp("r-ex", "exemplaires", r.exemplaires || "", 'inputmode="numeric" autocomplete="off" placeholder="0"'), { hint: "Pour les livres que le mouvement peut prêter." })}<div class="field"><span class="lab">Mise en avant</span><label class="check"><input type="checkbox" name="enAvant" value="1"${r.enAvant ? " checked" : ""}> Afficher en tête</label></div></div>
      ${peutFichier ? `<div class="field"><label for="r-fichier">Fichier</label><input class="inp" type="file" id="r-fichier" name="fichier" accept="${TYPES_FICHIER.join(",")}"><p class="hint">PDF, image ou vidéo MP4/WebM, 20 Mo au plus. ${r.fichierId ? `Fichier actuel : ${esc(r.fichierNom || "fichier")} ; un nouveau fichier le remplacera.` : ""}</p>${r.fichierId ? `<label class="check"><input type="checkbox" name="retirerFichier" value="1"> Retirer le fichier actuel</label>` : ""}</div>` : `<p class="hint">Le dépôt de fichiers est réservé aux éditeurs ; vous pouvez indiquer un lien.</p>`}
      ${pied(id ? "Enregistrer" : "Ajouter à l’Arsenal")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la ressource" : "Nouvelle ressource", html, wide: true, onSubmit: (fd, form) => enregistrerRessource(fd, form, id) });
  }
  async function enregistrerRessource(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez le titre."); $("#r-titre").focus(); return; }
    if (g("lien") && !urlSure(g("lien"))) { erreurForm("Le lien doit commencer par https:// ou http://"); return; }
    if (g("annee") && !/^\d{4}$/.test(g("annee"))) { erreurForm("L’année doit comporter quatre chiffres."); return; }
    const ancien = id ? ressource(id) : null;
    const data = { titre: g("titre"), type: g("type"), auteur: g("auteur"), annee: g("annee"), theme: g("theme"), description: g("description"), lien: g("lien"), exemplaires: Number(g("exemplaires").replace(/\D/g, "")) || 0, enAvant: fd.get("enAvant") === "1" };
    const fichier = fd.get("fichier");
    const btnS = form.querySelector("[type=submit]");
    btnS.disabled = true;
    let aSupprimer = null;
    if (fichier && fichier.size) {
      if (!TYPES_FICHIER.includes(fichier.type)) { erreurForm("Ce format n’est pas accepté : choisissez un PDF, une image (JPEG, PNG, WebP, GIF) ou une vidéo MP4/WebM. Pour un audio, indiquez un lien."); btnS.disabled = false; return; }
      if (fichier.size > 20 * 1048576) { erreurForm(`Fichier trop lourd (${taille(fichier.size)}) : 20 Mo au plus.`); btnS.disabled = false; return; }
      S.attente += 1; majSync();
      try {
        const res = await S.assets.upload(fichier, { type: fichier.type });
        Object.assign(data, { fichierId: res.id, fichierNom: fichier.name, fichierType: fichier.type, fichierTaille: res.sizeBytes || fichier.size });
        if (ancien && ancien.fichierId) aSupprimer = ancien.fichierId;
      } catch (e) {
        const code = e && e.code;
        erreurForm(code === "too_large" ? "Fichier trop lourd pour le stockage." : code === "unsupported_type" ? "Ce format de fichier n’est pas accepté." : code === "quota_or_state" ? "L’espace de stockage de l’application est plein." : "Le fichier n’a pas pu être envoyé. Réessayez.");
        btnS.disabled = false; return;
      } finally { S.attente -= 1; majSync(); }
    } else if (fd.get("retirerFichier") === "1" && ancien && ancien.fichierId) {
      Object.assign(data, { fichierId: "", fichierNom: "", fichierType: "", fichierTaille: 0 });
      aSupprimer = ancien.fichierId;
    }
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("ressources/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("ressources").doc(); await ref.set({ ...data, prets: {}, ...creation() }); }
    }, id ? "Ressource modifiée" : "Ressource ajoutée à l’Arsenal");
    btnS.disabled = false;
    if (!ok) return;
    if (aSupprimer && S.assets) { try { await S.assets.delete(aSupprimer); } catch (e) { /* l’ancien fichier reste stocké */ } }
    ouvrirRessource(id || ref.id);
  }
  function ouvrirPret(rid) {
    const r = ressource(rid);
    if (!r) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    ouvrir({
      titre: "Prêter un exemplaire",
      html: `<form class="form" novalidate><p><b>${esc(r.titre)}</b> · ${pluriel(Math.max(0, disponibles(r)), "exemplaire disponible", "exemplaires disponibles")}</p>
        ${champ("pr-m", "Emprunteur", sel("pr-m", "membreId", mbs, "", "Choisir un membre", "required autofocus"), { req: true })}
        <div class="f2">${champ("pr-d", "Date du prêt", inp("pr-d", "date", aujourdhui(), 'type="date"'))}${champ("pr-r", "Retour prévu", inp("pr-r", "retourPrevu", ajoutJours(aujourdhui(), 21), 'type="date"'))}</div>${pied("Enregistrer le prêt")}</form>`,
      onSubmit: async (fd, form) => {
        const mid = String(fd.get("membreId") || "");
        if (!membre(mid)) { erreurForm("Choisissez l’emprunteur."); return; }
        if (!(disponibles(ressource(rid)) > 0)) { erreurForm("Plus aucun exemplaire disponible."); return; }
        const pid = "p" + Date.now().toString(36);
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => S.db.doc("ressources/" + rid).update({ prets: { [pid]: { membreId: mid, date: String(fd.get("date") || aujourdhui()), retourPrevu: String(fd.get("retourPrevu") || ""), creePar: S.me.id || null } }, ...tampon() }), "Prêt enregistré")) ouvrirRessource(rid);
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function livresDe(mid) {
    return S.ressources.flatMap((r) => pretsEnCours(r).filter((p) => p.membreId === mid).map((p) => ({ r, p })));
  }

  /* ════════════════════════ Modules (accès rapide) ════════════════════════ */
  function resumeModule(id) {
    if (id === "membres") return S.pret.membres ? pluriel(membresActifs().length, "membre actif", "membres actifs") : "";
    if (id === "finances") { const s = S.pret.finances ? soldeFin(moisCourant()) : null; return s == null ? "Journal et cotisations" : `Caisse : ${fcfa(s)}`; }
    if (id === "agenda") { const e = aVenir()[0]; return e ? `Prochain : ${e.titre} · ${fmtCourt(e.date)}` : "Aucun rassemblement programmé"; }
    if (id === "garnisons") return S.pret.garnisons ? `${pluriel(S.garnisons.length, "structure", "structures")}` : "";
    if (id === "academie") { const n = S.formations.filter((f) => etatFormation(f) === "encours").length; return S.pret.formations ? (n ? `${pluriel(n, "formation en cours", "formations en cours")}` : `${pluriel(S.formations.length, "formation", "formations")}`) : ""; }
    if (id === "portevoix") return S.pret.annonces ? pluriel(annoncesActives().length, "annonce active", "annonces actives") : "";
    if (id === "chambre") return S.pret.prieres ? pluriel(S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length, "requête en prière", "requêtes en prière") : "";
    if (id === "arsenal") return S.pret.ressources ? pluriel(S.ressources.length, "ressource", "ressources") : "";
    if (id === "secretariat") return S.pret.decisions ? pluriel(S.decisions.filter(enCours).length, "décision en cours", "décisions en cours") : "";
    return "";
  }
  VUES.plus = function () {
    let out = secHead("Modules", { eyebrow: "Toutes les sections du Quartier Général" });
    const vis = ongletsVisibles().filter((o) => o.id !== "accueil");
    return out + `<div class="tiles">${vis.map((o) => `<button class="tile" type="button" data-vue="${o.id}"><span class="tile-ico" aria-hidden="true">${I(o.ico)}</span><span class="tile-t">${esc(o.long)}</span><span class="tile-d">${esc(o.desc || "")}</span><span class="tile-m">${esc(resumeModule(o.id))}</span></button>`).join("")}</div>`;
  };
