  /* ════════════════════════ Assistant Éliézer ════════════════════════ */
  const IA = { tours: [], enCours: false, partiel: "", activite: "", erreur: "", brouillon: "", ctl: null, defiler: false };
  function messageIA(e) {
    const code = e && e.code;
    return ({
      not_granted: "Éliézer n’est pas autorisé pour cette application. Autorisez l’accès à Claude dans le menu des permissions de l’application.",
      sampling_disabled: "L’assistant n’est pas disponible pour ce compte.",
      not_declared: "L’assistant n’est pas activé dans cette version de l’application.",
      capability_disabled: "L’assistant n’est pas disponible dans cette vue.",
      rate_limited: "Trop de demandes pour le moment, ou limite d’utilisation atteinte : réessayez un peu plus tard.",
      session_expired: "Votre session a expiré : reconnectez-vous à Claude puis réessayez.",
      refused: "Éliézer ne peut pas répondre à cette demande telle qu’elle est formulée. Reformulez-la.",
      empty_completion: "Éliézer n’a rien répondu. Reformulez la demande plus simplement.",
      prompt_too_large: "La conversation est devenue trop longue : commencez une nouvelle conversation.",
      invalid_json: "La proposition n’a pas pu être lue. Réessayez.",
      tools_unavailable: "Éliézer ne peut pas consulter les données dans cette vue.",
    })[code] || "La réponse a été interrompue. Vérifiez la connexion puis réessayez.";
  }
  const libNiveau = () => (accesDirection() ? "direction (propriétaire ou éditeur)" : accesRegistre() ? "contributeur" : "lecture seule");
  const dateFr = (iso) => (iso ? fmtLong(iso) : "");
  /* — Données que l’assistant peut lire, filtrées selon le niveau d’accès — */
  function statsIA() {
    const actifs = membresActifs();
    const o = { aujourdhui: dateFr(aujourdhui()), prochainsRassemblements: aVenir().slice(0, 5).map((e) => ({ titre: e.titre, type: e.type, date: dateFr(e.date), heure: fmtHeure(e.heure), lieu: e.lieu || "" })), annoncesActives: annoncesActives().map((a) => ({ titre: a.titre, texte: a.texte })) };
    if (!accesRegistre()) return o;
    const parPole = {};
    actifs.forEach((m) => { const k = poleCourt(m.pole) || "Sans pôle"; parPole[k] = (parPole[k] || 0) + 1; });
    const evts = evtsPeriode("3m", "");
    const taux = actifs.map((m) => statsMembre(m, evts).taux).filter((t) => t != null);
    Object.assign(o, {
      membresActifs: actifs.length, membresArchives: S.membres.length - actifs.length, parPole,
      pointsSDE: pointsSDE().map((g) => ({ point: g.nom, pays: g.pays, membres: membresDeG(g.id, true).length })),
      membresSansPoint: actifs.filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId)).length,
      assiduiteMoyenne3Mois: taux.length ? pct(taux.reduce((x, y) => x + y, 0) / taux.length) : "pas de pointage",
      rassemblementsPointes3Mois: evts.length,
      membresAbsentsTroisDerniers: suiviPastoral().liste.map(nomComplet),
      formationsEnCours: S.formations.filter((f) => etatFormation(f) === "encours").map((f) => f.titre),
      requetesEnPriere: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length,
      projetsEnCours: (S.projets || []).filter(estActifP).map((p) => ({ titre: p.titre, avancement: pct(avancementP(p)) })),
      tachesEnRetard: (S.projets || []).filter((p) => !estClosP(p)).flatMap(tachesP).filter(tacheEnRetard).length,
    });
    if (accesDirection()) {
      const an = new Date().getFullYear();
      const ec = actifs.map((m) => etatCotis(m, an));
      o.caisseFinDuMoisCourant = S.pret.finances ? fcfa(soldeFin(moisCourant()) || 0) : "non chargée";
      o.cotisationsMensuelles = { montant: fcfa(Number(cfg().cotisationMensuelle) || 0), membresEnRetard: ec.filter((e) => e.retard.length).length, collecteAnnee: fcfa(ec.reduce((t, e) => t + e.verse, 0)) };
      o.veillePastorale = actifs.map((m) => ({ m, v: voyantsDe(m) })).filter((x) => x.v.global >= 3).map((x) => ({ membre: nomComplet(x.m), etat: ETAT_GLOBAL[x.v.global] }));
    }
    return o;
  }
  function trouverMembre(q) {
    const s = norm(String(q || ""));
    if (!s) return null;
    return S.membres.find((m) => m.id === q || norm(m.matricule) === s) || S.membres.find((m) => norm(nomComplet(m)) === s || norm(nomUsuel(m)) === s) || S.membres.find((m) => s.split(" ").every((w) => norm(`${nomComplet(m)} ${m.matricule || ""}`).includes(w))) || null;
  }
  function membreCourtIA(m) {
    const pt = m.garnisonId ? pointDeGarnison(m.garnisonId) : null;
    return { id: m.id, nom: nomComplet(m), matricule: m.matricule || "", fonction: m.fonction || "", statut: m.statut || "", pole: poleCourt(m.pole), pointSDE: pt ? pt.nom : "", garnison: garnison(m.garnisonId) ? garnison(m.garnisonId).nom : "", telephone: m.telephone ? telAffiche(m.telephone) : "" };
  }
  function ficheIA(m) {
    const o = { ...membreCourtIA(m), eglise: m.eglise || "", quartier: m.quartier || "", membreDepuis: m.adhesion ? dateFr(m.adhesion) : "", anniversaire: m.anniv ? fmtJM(`2000-${m.anniv}`) : "", archive: m.actif === false };
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    o.assiduite3Mois = s3.taux == null ? "aucun pointage" : `${pct(s3.taux)} (${s3.p + s3.r} présences sur ${s3.n - s3.x})`;
    const v = voyantsDe(m);
    o.voyants = { etatGeneral: ETAT_GLOBAL[v.global], ...Object.fromEntries(v.auto.concat(v.sante).map(([, l, x]) => [l, x.lib + (x.detail ? ` (${x.detail})` : "")])) };
    if (S.pret.formations) o.formations = formationsDe(m.id).map(({ f, p }) => `${f.titre} : ${p.statut}`);
    if (S.pret.projets) o.projets = (S.projets || []).filter((p) => p.responsableId === m.id || (p.equipe || []).includes(m.id)).map((p) => p.titre);
    if (accesDirection() && S.pret.discipline) o.discipline = S.discipline.filter((d) => d.membreId === m.id && mesureEnCours(d)).map((d) => `${d.mesure} (${d.motif})`);
    if (accesDirection() && S.pret.suivi) { const sv = suiviDe(m.id); if (sv) { o.accompagnementPrevu = sv.besoin || ""; o.prochainSuivi = sv.prochainSuivi ? dateFr(sv.prochainSuivi) : ""; } }
    return o;
  }
  function financesIA() {
    const cur = moisCourant();
    const mois = [];
    for (let k = 5; k >= 0; k -= 1) { const cle = ajoutMois(cur, -k); const t = totauxMois(cle); mois.push({ mois: fmtMois(cle), entrees: t.e, sorties: t.s }); }
    const an = new Date().getFullYear();
    const offr = (S.offrandes || []).filter((o) => !o.annule && String(o.date || "").startsWith(String(an)));
    const parType = {};
    offr.forEach((o) => { parType[o.type || "Offrande"] = (parType[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
    return {
      soldeCaisseFinMoisCourant: soldeFin(cur), sixDerniersMois: mois,
      cotisationsSpecialesOuvertes: (S.speciales || []).filter(ouverteSp).map((sp) => { const b = bilanSp(sp); return { titre: sp.titre, collecte: b.collecte, attendu: b.attendu, echeance: sp.echeance || "" }; }),
      offrandesAnnee: parType,
      projets: (S.projets || []).filter((p) => !estClosP(p)).map((p) => { const b = bilanFinP(p); return { titre: p.titre, budget: budgetP(p), collecte: b.collecte, depense: b.depense, promis: b.promis }; }),
      montantsEnFCFA: true,
    };
  }
  function outilsIA() {
    const t = [];
    const act = (txt) => { IA.activite = txt; render(); };
    t.push({ name: "tableau_de_bord", description: "Vue chiffrée du mouvement : prochains rassemblements, annonces, effectif, pôles, points SDE, assiduité, absents, formations, prières, projets ; pour la direction aussi caisse, cotisations et veille pastorale. À appeler en premier pour toute question générale.", execute: () => { act("Consulte le tableau de bord…"); return statsIA(); } });
    t.push({ name: "agenda", description: "Liste des rassemblements (titre, type, date, heure, lieu, nombre de présents pour les passés). periode : \"avenir\" ou \"passes\".", inputSchema: { type: "object", properties: { periode: { type: "string", enum: ["avenir", "passes"] }, limite: { type: "number" } } }, execute: (i) => { act("Consulte l’agenda…"); const l = String(i.periode) === "passes" ? passes() : aVenir(); return l.slice(0, Math.min(30, Number(i.limite) || 10)).map((e) => ({ titre: e.titre, type: e.type, date: dateFr(e.date), heure: fmtHeure(e.heure), lieu: e.lieu || "", garnison: garnison(e.garnisonId) ? garnison(e.garnisonId).nom : "", presents: accesRegistre() && e.date <= aujourdhui() ? totalPresence(e) : undefined, description: e.description || "" })); } });
    if (accesRegistre()) {
      t.push({ name: "chercher_membres", description: "Cherche des membres actifs par nom, fonction, pôle, point SDE ou statut. Renvoie nom, matricule, fonction, statut, pôle, point SDE, téléphone.", inputSchema: { type: "object", properties: { texte: { type: "string" }, pole: { type: "string" }, point: { type: "string" }, statut: { type: "string" }, limite: { type: "number" } } }, execute: (i) => {
        act("Cherche dans le registre…");
        const q = norm(String(i.texte || "")), po = norm(String(i.pole || "")), pt = norm(String(i.point || "")), st = norm(String(i.statut || ""));
        const l = membresActifs().filter((m) => (!q || q.split(" ").every((w) => norm(`${nomComplet(m)} ${m.matricule || ""} ${m.fonction || ""} ${m.eglise || ""} ${m.quartier || ""}`).includes(w))) && (!po || norm(m.pole).includes(po)) && (!st || norm(m.statut).includes(st)) && (!pt || (m.garnisonId && norm(cheminG(m.garnisonId)).includes(pt))));
        return { total: l.length, membres: l.slice(0, Math.min(60, Number(i.limite) || 30)).map(membreCourtIA) };
      } });
      t.push({ name: "fiche_membre", description: "Fiche détaillée d’un membre (par nom, matricule ou identifiant) : coordonnées, point SDE, assiduité, voyants, formations, projets ; pour la direction aussi discipline et accompagnement.", inputSchema: { type: "object", properties: { membre: { type: "string" } }, required: ["membre"] }, execute: (i) => { act("Ouvre une fiche membre…"); const m = trouverMembre(i.membre); if (!m) throw new Error("Aucun membre ne correspond à « " + String(i.membre || "") + " »."); return ficheIA(m); } });
      t.push({ name: "anniversaires", description: "Anniversaires des prochains jours (nom, date, âge s’il est connu, téléphone).", inputSchema: { type: "object", properties: { jours: { type: "number" } } }, execute: (i) => { act("Regarde les anniversaires…"); const j = Math.min(366, Number(i.jours) || 30); return membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= j).sort((a, b) => a.a.dans - b.a.dans).map(({ m, a }) => ({ nom: nomUsuel(m), date: fmtJM(a.date), dansJours: a.dans, age: a.age || undefined, telephone: m.telephone ? telAffiche(m.telephone) : "" })); } });
      t.push({ name: "projets_et_prieres", description: "Projets (statut, avancement, étapes, tâches ouvertes avec responsable et échéance) et requêtes de prière en cours avec le sujet de la semaine de la chaîne.", execute: () => {
        act("Consulte les projets et la Chambre Haute…");
        return { projets: (S.projets || []).filter((p) => !estClosP(p)).map((p) => ({ titre: p.titre, statut: statutP(p), avancement: pct(avancementP(p)), finPrevue: p.dateFin ? dateFr(p.dateFin) : "", etapes: jalonsP(p).map((j) => `${j.titre}${j.date ? " (" + fmtCourt(j.date) + ")" : ""}${j.fait ? " ✓" : ""}`), tachesOuvertes: tachesP(p).filter((x) => x.statut !== "Fait").map((x) => ({ tache: x.titre, responsable: membre(x.responsableId) ? nomUsuel(membre(x.responsableId)) : "", echeance: x.echeance ? fmtCourt(x.echeance) : "", enRetard: tacheEnRetard(x) })) })),
          prieres: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").slice(0, 30).map((p) => ({ sujet: p.sujet, categorie: p.categorie, pour: membre(p.pourId) ? nomUsuel(membre(p.pourId)) : p.pour || "", urgent: !!p.urgent })),
          sujetDeLaSemaine: (S.chaine && S.chaine.sujetSemaine) || "", versetDeLaSemaine: (S.chaine && S.chaine.versetSemaine) || "" };
      } });
    }
    if (accesDirection()) t.push({ name: "finances", description: "Finances (direction) : solde de caisse, entrées et sorties des six derniers mois, cotisations spéciales ouvertes, offrandes de l’année par type, finances des projets. Montants en FCFA.", execute: () => { act("Consulte les finances…"); return financesIA(); } });
    const max = IA.limites && IA.limites.tools ? IA.limites.tools.maxCount : t.length;
    return t.slice(0, max);
  }
  function consigneIA() {
    const c = cfg();
    return `Tu es Éliézer, l’assistant intégré à l’application « S.D.E. Gestion » du ${c.nomOfficiel} (${c.nomCourt}), mouvement chrétien dont le siège est à Abidjan (Côte d’Ivoire), avec des points SDE en Tunisie, au Burkina Faso, en Italie, au Canada et aux États-Unis. Le leader du mouvement est l’Apôtre Jérémy Octave GLAZAÏ (« Jérémy l’Élu »). Ton nom vient de l’intendant fidèle d’Abraham (Genèse 24).
Tu sers les responsables du mouvement : réponds en français, avec clarté, chaleur fraternelle et sobriété, dans une perspective chrétienne centrée sur Jésus-Christ.
Règles :
- Pour toute information sur les membres, l’agenda, les finances, les projets ou les prières, consulte les outils de l’application ; n’invente jamais un nom, un chiffre ou une date. Si l’information manque, dis-le.
- Citations bibliques : Bible Louis Segond 1910, avec la référence ; si tu n’es pas certain du texte exact, signale-le.
- Confidentialité : ne transmets que ce que les outils renvoient à cette personne.
- Tu ne peux ni modifier ni enregistrer de données : tu lis et tu rédiges. L’utilisateur peut ensuite transformer ta réponse en annonce, en message WhatsApp ou en affiche avec les boutons sous ta réponse.
- Textes à publier (annonces, invitations, messages, vœux, prières, mots d’exhortation) : fournis un texte prêt à l’emploi, sans commentaire superflu autour.
- Mise en forme : paragraphes courts, listes à puces quand c’est utile, **gras** pour l’essentiel. Pas de tableaux.
Aujourd’hui : ${dateFr(aujourdhui())}. Personne qui écrit : ${S.me.name || "un responsable"}, accès ${libNiveau()}.`;
  }
  async function envoyerIA(texte) {
    const q = String(texte || "").trim();
    if (!q || IA.enCours || !S.sample) return;
    IA.tours.push({ role: "user", content: q });
    IA.enCours = true; IA.partiel = ""; IA.activite = "Éliézer réfléchit…"; IA.erreur = ""; IA.brouillon = ""; IA.defiler = true;
    render();
    const fenetre = IA.tours.slice(-12);
    while (fenetre.length && fenetre[0].role !== "user") fenetre.shift();
    const outils = IA.limites && IA.limites.tools ? outilsIA() : null;
    const contexte = outils ? "" : `\n\nDonnées de l’application (lecture seule) :\n${JSON.stringify(statsIA())}`;
    const input = fenetre.map((t, k) => (k === 0 ? { role: "user", content: `${consigneIA()}${contexte}\n\n---\n\n${t.content}` } : t));
    IA.ctl = new AbortController();
    try {
      const r = await S.sample(input, { modelTier: "default", cache: false, signal: IA.ctl.signal, ...(outils ? { tools: outils } : {}), onText: ({ text }) => { IA.partiel = text; IA.activite = ""; IA.defiler = true; render(); } });
      IA.tours.push({ role: "assistant", content: r.text, coupe: r.truncated });
    } catch (e) {
      if (e && e.code === "cancelled") { if (IA.partiel) IA.tours.push({ role: "assistant", content: IA.partiel, coupe: true }); else IA.tours.pop(); }
      else {
        if (e && e.text) IA.tours.push({ role: "assistant", content: e.text, coupe: true });
        else IA.tours.pop();
        IA.erreur = messageIA(e);
        if (!e || !e.text) IA.brouillon = q;
      }
    } finally { IA.enCours = false; IA.partiel = ""; IA.activite = ""; IA.ctl = null; IA.defiler = true; render(); }
  }
  /* Mise en forme légère et sûre des réponses (le texte est échappé avant tout balisage) */
  function mdLeger(t) {
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const out = [];
    let liste = null;
    const fermerListe = () => { if (liste) { out.push(`</${liste}>`); liste = null; } };
    for (const brute of esc(t).split(/\n/)) {
      const l = brute.trimEnd();
      let r;
      if ((r = /^\s*[-•*]\s+(.*)$/.exec(l))) { if (liste !== "ul") { fermerListe(); out.push("<ul>"); liste = "ul"; } out.push(`<li>${inline(r[1])}</li>`); }
      else if ((r = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (liste !== "ol") { fermerListe(); out.push("<ol>"); liste = "ol"; } out.push(`<li>${inline(r[1])}</li>`); }
      else if ((r = /^\s*#{1,4}\s+(.*)$/.exec(l))) { fermerListe(); out.push(`<p class="ia-h">${inline(r[1])}</p>`); }
      else if (!l.trim()) fermerListe();
      else { fermerListe(); out.push(`<p>${inline(l)}</p>`); }
    }
    fermerListe();
    return out.join("");
  }
  const SUGGESTIONS_IA = () => [
    ["Prochain rassemblement", "Rédige l’annonce WhatsApp du prochain rassemblement, prête à envoyer."],
    ["Anniversaires", "Qui fête son anniversaire dans les 7 prochains jours ? Propose un message de vœux pour chacun."],
    ["Bilan de la semaine", "Fais-moi le point de la semaine : assiduité, absents à visiter, projets et tâches en retard."],
    ...(accesDirection() ? [["Finances", "Résume la situation financière : caisse, cotisations, offrandes et projets."], ["Veille pastorale", "Quels membres demandent un accompagnement en priorité, et pourquoi ?"]] : []),
    ["Exhortation", "Écris une courte exhortation pour la chaîne de prière de cette semaine, avec un verset Louis Segond."],
    ["IN FIRE", "Propose trois thèmes et versets pour la prochaine conférence IN FIRE, avec une phrase d’accroche chacun."],
  ];
  VUES.assistant = function () {
    let out = secHead("Éliézer", { eyebrow: "Assistant IA du mouvement", verset: ["Éternel, Dieu de mon seigneur Abraham, fais-moi, je te prie, rencontrer aujourd’hui ce que je désire.", "Genèse 24.12"], actions: IA.tours.length && !IA.enCours ? btn("ia-nouveau", "Nouvelle conversation", { ico: "i-plus" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("L’assistant");
    if (S.etat === "connexion") return out + chargement("Préparation de l’assistant…");
    if (!S.sample) return out + vide("i-spark", "L’assistant n’est pas disponible ici. Il fonctionne dans Claude, pour les personnes qui ont autorisé l’application à utiliser Claude.");
    const fil = IA.tours.map((t, i) => t.role === "user"
      ? `<div class="ia-msg moi"><div class="ia-bulle">${esc(t.content).replace(/\n/g, "<br>")}</div></div>`
      : `<div class="ia-msg lui"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle">${mdLeger(t.content)}${t.coupe ? `<p class="hint">Réponse incomplète.</p>` : ""}<div class="ia-act">${btn("ia-copier", "Copier", { ico: "i-copy", sm: true, data: `data-i="${i}"` })}${peutEcrire() ? btn("ia-annonce", "Annonce", { ico: "i-pin", sm: true, data: `data-i="${i}"` }) + btn("ia-message", "Message", { ico: "i-horn", sm: true, data: `data-i="${i}"` }) : ""}${btn("ia-affiche", "Affiche", { ico: "i-image", sm: true, data: `data-i="${i}"` })}</div></div></div>`).join("");
    const enCours = IA.enCours ? `<div class="ia-msg lui"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle">${IA.partiel ? mdLeger(IA.partiel) : ""}${IA.activite ? `<p class="ia-attente"><i></i>${esc(IA.activite)}</p>` : ""}</div></div>` : "";
    const accueil = !IA.tours.length && !IA.enCours ? `<div class="ia-accueil"><p>Bonjour${S.me.name ? " " + esc(S.me.name.split(/\s+/)[0]) : ""}. Je consulte les données de l’application (membres, agenda, projets${accesDirection() ? ", finances" : ""}…) et je rédige pour vous annonces, messages, vœux, exhortations ou thèmes de conférence.</p><div class="ia-sugg">${SUGGESTIONS_IA().map(([l, q]) => `<button class="chip-btn" type="button" data-act="ia-suggestion" data-q="${esc(q)}">${esc(l)}</button>`).join("")}</div></div>` : "";
    out += `<div class="ia"><div class="ia-fil" id="ia-fil" aria-live="polite">${accueil}${fil}${enCours}</div>
      ${IA.erreur ? `<p class="note danger" role="alert" style="margin:10px 0 0">${esc(IA.erreur)}</p>` : ""}
      <form class="ia-saisie" id="ia-form" novalidate><label class="sr" for="ia-q">Votre demande à Éliézer</label><textarea class="inp" id="ia-q" rows="2" placeholder="Demandez à Éliézer…"${IA.enCours ? " disabled" : ""}>${esc(IA.brouillon)}</textarea>${IA.enCours ? btn("ia-stop", "Arrêter", { ico: "i-x" }) : `<button class="btn btn-primary" type="submit">${I("i-right")}Envoyer</button>`}</form>
      <p class="hint" style="margin-top:6px">Éliézer peut se tromper : vérifiez les chiffres importants. Les conversations ne sont pas enregistrées.</p></div>`;
    return out;
  };
  document.addEventListener("submit", (ev) => { if (ev.target && ev.target.id === "ia-form") { ev.preventDefault(); const q = $("#ia-q"); envoyerIA(q ? q.value : ""); } });
  document.addEventListener("keydown", (ev) => { if (ev.target && ev.target.id === "ia-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); envoyerIA(ev.target.value); } });
  document.addEventListener("input", (ev) => { if (ev.target && ev.target.id === "ia-q") IA.brouillon = ev.target.value; });
  function apresRenduIA() {
    const fil = $("#ia-fil");
    if (fil && IA.defiler) { fil.scrollTop = fil.scrollHeight; IA.defiler = false; }
    const fab = $("#fab-ia");
    if (fab) fab.hidden = !S.sample || S.vue === "assistant" || S.etat !== "pret";
  }
  const premiereLigne = (t) => String(t || "").split(/\n/).map((l) => l.replace(/[*#`>]/g, "").replace(/^\s*[-•\d.)]+\s*/, "").trim()).find(Boolean) || "";
  const sansMarques = (t) => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*#{1,4}\s+/gm, "").replace(/`/g, "").trim();
