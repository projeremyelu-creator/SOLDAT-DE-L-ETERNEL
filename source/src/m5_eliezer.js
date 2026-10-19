  /* ════════════════════════ Éliézer, assistant IA du QG ════════════════════════ */
  const IA = { tours: [], enCours: false, courant: "", statut: "", ctl: null, erreur: "", brouillon: "", outils: null };
  function messageIA(e) {
    const code = e && e.code;
    if (code === "not_granted") return "L’accès à Claude a été refusé pour cette application. Vous pouvez l’autoriser depuis le menu de l’application.";
    if (code === "sampling_disabled" || code === "capability_disabled" || code === "not_declared" || code === "capability_removed") return "L’assistant n’est pas disponible pour ce compte.";
    if (code === "rate_limited") return "Trop de demandes pour le moment : réessayez dans un instant.";
    if (code === "session_expired") return "Votre session a expiré : reconnectez-vous à Claude.";
    if (code === "refused") return "Éliézer ne peut pas répondre à cette demande. Reformulez-la.";
    if (code === "prompt_too_large") return "La conversation est trop longue : effacez-la pour repartir.";
    if (code === "invalid_json" || code === "empty_completion") return "La réponse n’a pas pu être lue : réessayez.";
    if (code === "cancelled") return "";
    return "La réponse a été interrompue. Réessayez.";
  }
  /* Rendu Markdown minimal et sûr (gras, italique, listes, titres) */
  function mdIA(t) {
    const ligne = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const out = [];
    let liste = null;
    const fermerListe = () => { if (liste) { out.push(`<${liste.t}>${liste.items.map((x) => `<li>${x}</li>`).join("")}</${liste.t}>`); liste = null; } };
    for (const brut of String(t || "").split(/\r?\n/)) {
      const l = brut.trimEnd();
      let r;
      if ((r = /^\s*[-*•]\s+(.*)$/.exec(l))) { if (!liste || liste.t !== "ul") { fermerListe(); liste = { t: "ul", items: [] }; } liste.items.push(ligne(r[1])); continue; }
      if ((r = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (!liste || liste.t !== "ol") { fermerListe(); liste = { t: "ol", items: [] }; } liste.items.push(ligne(r[1])); continue; }
      fermerListe();
      if (!l.trim()) continue;
      if ((r = /^#{1,4}\s+(.*)$/.exec(l))) { out.push(`<p class="ia-h">${ligne(r[1])}</p>`); continue; }
      out.push(`<p>${ligne(l)}</p>`);
    }
    fermerListe();
    return out.join("");
  }
  const texteBrut = (t) => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,4}\s+/gm, "").replace(/`([^`]+)`/g, "$1").trim();

  /* — Ce qu’Éliézer peut consulter (lecture seule, selon les droits de la personne) — */
  const resumeM = (m) => ({ id: m.id, nom: nomComplet(m), matricule: m.matricule || "", fonction: m.fonction || "", statut: m.statut || "", pole: poleCourt(m.pole), garnison: garnison(m.garnisonId) ? cheminG(m.garnisonId) : "", telephone: m.telephone ? telAffiche(m.telephone) : "", anniversaire: m.anniv ? fmtJM("2000-" + m.anniv) : "" });
  function trouverMembre(cle) {
    const k = norm(String(cle || ""));
    if (!k) return null;
    return S.membres.find((m) => m.id === cle || norm(m.matricule) === k) || membresActifs().find((m) => norm(nomComplet(m)) === k || norm(nomUsuel(m)) === k) || membresActifs().find((m) => norm(nomComplet(m)).includes(k));
  }
  function outilsIA() {
    const dir = accesDirection();
    const t = [
      { name: "chercher_membres", description: "Cherche des membres actifs du registre par nom, matricule, fonction, pôle, garnison ou statut. Renvoie au plus 30 fiches résumées. Sans critère, renvoie tout le registre.", inputSchema: { type: "object", properties: { recherche: { type: "string", description: "Texte libre : nom, fonction, église, quartier…" }, pole: { type: "string" }, garnison: { type: "string", description: "Nom de la garnison ou du point SDE" }, statut: { type: "string" } } },
        execute: (i) => {
          IA.statutSet("Consulte le registre…");
          const q = norm(i.recherche || ""), pole = norm(i.pole || ""), gq = norm(i.garnison || ""), st = norm(i.statut || "");
          const l = membresActifs().filter((m) => (!q || norm([m.nom, m.prenoms, m.matricule, m.fonction, m.eglise, m.quartier, m.implantation].join(" ")).includes(q)) && (!pole || norm(m.pole).includes(pole)) && (!st || norm(m.statut).includes(st)) && (!gq || norm(garnison(m.garnisonId) ? cheminG(m.garnisonId) : "").includes(gq)));
          return { total: l.length, membres: l.slice(0, 30).map(resumeM) };
        } },
      { name: "fiche_membre", description: "Fiche détaillée d’un membre (par id, matricule ou nom) : identité, garnison, assiduité sur trois mois, voyants, formations, projets" + (dir ? ", cotisations et santé pastorale (direction)." : "."), inputSchema: { type: "object", properties: { membre: { type: "string" } }, required: ["membre"] },
        execute: (i) => {
          IA.statutSet("Ouvre une fiche…");
          const m = trouverMembre(i.membre);
          if (!m) throw new Error("Aucun membre ne correspond.");
          const v = voyantsDe(m);
          const s3 = statsMembre(m, evtsPeriode("3m", ""));
          const out = { ...resumeM(m), adhesion: m.adhesion || "", eglise: m.eglise || "", quartier: m.quartier || "", assiduite3mois: s3.taux == null ? "sans données" : pct(s3.taux), presences: `${s3.p + s3.r} sur ${s3.n - s3.x}`,
            voyants: Object.fromEntries(v.auto.concat(v.sante).map(([, l, x]) => [l, x.lib])), etatGeneral: ETAT_GLOBAL[v.global],
            formations: S.pret.formations ? formationsDe(m.id).map(({ f, p }) => `${f.titre} (${p.statut})`) : [],
            projets: (S.projets || []).filter((p) => p.responsableId === m.id || (p.equipe || []).includes(m.id)).map((p) => p.titre) };
          if (dir) { const s = suiviDe(m.id); if (s && s.besoin) out.accompagnement = s.besoin; }
          return out;
        } },
      { name: "agenda", description: "Rassemblements du mouvement : à venir, ou passés avec le nombre de présents. Renvoie titre, type, date, heure, lieu, garnison.", inputSchema: { type: "object", properties: { periode: { type: "string", enum: ["avenir", "passes"] }, nombre: { type: "number" } } },
        execute: (i) => {
          IA.statutSet("Consulte l’agenda…");
          const n = Math.min(30, Number(i.nombre) || 10);
          const l = (i.periode === "passes" ? passes() : aVenir()).slice(0, n);
          return l.map((e) => ({ titre: e.titre, type: e.type, date: e.date, jour: fmtLong(e.date), heure: heureAffiche(e.heure, e.fin), lieu: e.lieu || "", garnison: garnison(e.garnisonId) ? garnison(e.garnisonId).nom : "", responsable: e.responsable || "", ...(i.periode === "passes" ? { presents: nbPresents(e), visiteurs: compteur(e, "visiteurs"), nouveaux: compteur(e, "nouveaux") } : {}) }));
        } },
      { name: "anniversaires", description: "Anniversaires des membres actifs dans les prochains jours (par défaut 30). Renvoie nom, date, âge s’il est connu, téléphone.", inputSchema: { type: "object", properties: { jours: { type: "number" } } },
        execute: (i) => {
          const j = Math.min(366, Number(i.jours) || 30);
          return membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= j).sort((x, y) => x.a.dans - y.a.dans).map(({ m, a }) => ({ nom: nomUsuel(m), date: fmtJour(a.date), dans: a.dans === 0 ? "aujourd’hui" : `${a.dans} jours`, age: a.age || "", telephone: m.telephone ? telAffiche(m.telephone) : "" }));
        } },
      { name: "assiduite", description: "Assiduité aux rassemblements pointés : taux moyen, membres les moins assidus, absences répétées à suivre.", inputSchema: { type: "object", properties: { periode: { type: "string", enum: ["3m", "6m", "an"] } } },
        execute: (i) => {
          IA.statutSet("Calcule l’assiduité…");
          const evts = evtsPeriode(["3m", "6m", "an"].includes(i.periode) ? i.periode : "3m", "");
          const st = membresActifs().map((m) => ({ m, s: statsMembre(m, evts) })).filter((x) => x.s.taux != null);
          const moy = st.length ? st.reduce((t, x) => t + x.s.taux, 0) / st.length : null;
          return { rassemblementsPointes: evts.length, tauxMoyen: pct(moy), moinsAssidus: st.sort((a, b) => a.s.taux - b.s.taux).slice(0, 10).map((x) => ({ nom: nomComplet(x.m), taux: pct(x.s.taux) })), aSuivre: suiviPastoral().liste.map(nomComplet) };
        } },
      { name: "projets", description: "Projets du mouvement : statut, avancement, échéance, tâches ouvertes et en retard" + (dir ? ", budget, collecte et dépenses." : "."), inputSchema: { type: "object", properties: {} },
        execute: () => (S.projets || []).map((p) => {
          const o = { titre: p.titre, categorie: p.categorie, statut: statutP(p), priorite: p.priorite || "Normale", avancement: pct(avancementP(p)), finPrevue: p.dateFin || "", responsable: membre(p.responsableId) ? nomComplet(membre(p.responsableId)) : "", tachesOuvertes: tachesP(p).filter((t) => t.statut !== "Fait").map((t) => `${t.titre}${t.echeance ? ` (échéance ${t.echeance})` : ""}${tacheEnRetard(t) ? " — EN RETARD" : ""}`), budgetPrevu: budgetP(p) };
          if (dir && S.pret.projetsFin) { const b = bilanFinP(p); Object.assign(o, { collecte: b.collecte, objectif: b.objectif, depense: b.depense, promis: b.promis }); }
          return o;
        }) },
      { name: "communication", description: "Annonces actives, sujets de prière ouverts (non confidentiels), sujet de la semaine et formations de l’Académie.", inputSchema: { type: "object", properties: {} },
        execute: () => ({ annonces: annoncesActives().map((a) => ({ titre: a.titre, texte: a.texte })), prieres: (S.prieres || []).filter((p) => (p.statut || "En prière") === "En prière").slice(0, 20).map((p) => p.sujet), sujetSemaine: S.chaine ? S.chaine.sujetSemaine || "" : "", formations: (S.formations || []).map((f) => ({ titre: f.titre, etat: LIB_ETAT_F[etatFormation(f)], inscrits: participantsF(f).length })) }) },
      { name: "points_sde", description: "Points SDE (pays d’implantation) et garnisons, avec le nombre de membres rattachés.", inputSchema: { type: "object", properties: {} },
        execute: () => ({ points: pointsSDE().map((g) => ({ nom: g.nom, pays: g.pays, ville: g.ville || "", membres: membresDeG(g.id, true).length, structures: enfantsG(g.id).map((x) => x.nom) })), nonRattaches: membresActifs().filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId)).length }) },
    ];
    if (dir) t.push({ name: "finances", description: "Direction seulement : caisse du mois (entrées, sorties, solde cumulé), cotisations mensuelles en retard, cotisations spéciales et offrandes de l’année.", inputSchema: { type: "object", properties: { mois: { type: "string", description: "AAAA-MM, par défaut le mois en cours" } } },
      execute: (i) => {
        IA.statutSet("Consulte les finances…");
        const cle = /^\d{4}-\d{2}$/.test(String(i.mois || "")) ? i.mois : moisCourant();
        const tm = totauxMois(cle);
        const an = new Date().getFullYear();
        const retard = membresActifs().map((m) => ({ m, e: etatCotis(m, an) })).filter((x) => x.e.retard.length);
        const offr = (S.offrandes || []).filter((o) => !o.annule && String(o.date || "").startsWith(String(an)));
        return { mois: fmtMois(cle), entrees: tm.e, sorties: tm.s, soldeCaisse: soldeFin(cle), cotisationMensuelle: cfg().cotisationMensuelle || 0, membresEnRetard: retard.map((x) => `${nomComplet(x.m)} (${x.e.retard.length} mois)`), cotisationsSpeciales: (S.speciales || []).map((sp) => { const b = bilanSp(sp); return { titre: sp.titre, collecte: b.collecte, attendu: b.attendu, statut: sp.statut || "Ouverte" }; }), offrandesAnnee: offr.reduce((t, o) => t + (Number(o.montant) || 0), 0) };
      } });
    return t;
  }
  function consignesIA() {
    const c = cfg();
    const dir = accesDirection();
    const actifs = membresActifs();
    const prochain = aVenir().slice(0, 3).map((e) => `${e.titre} (${fmtLong(e.date)}${e.heure ? ", " + fmtHeure(e.heure) : ""}${e.lieu ? ", " + e.lieu : ""})`).join(" ; ");
    return `Tu es Éliézer, l’assistant intégré à l’application de gestion du ${c.nomOfficiel} (${c.nomCourt}), mouvement chrétien prophético-apostolique dont le siège est à Abidjan (Côte d’Ivoire), présent en Côte d’Ivoire, Tunisie, Burkina Faso, Italie, Canada et États-Unis. Ton nom vient d’Éliézer, l’intendant fidèle d’Abraham (Genèse 24).
Tu aides ${S.me.name ? S.me.name : "la personne connectée"} (${dir ? "direction : accès complet, y compris finances et suivi pastoral" : "contributeur : pas d’accès aux finances ni au suivi pastoral"}) à administrer le mouvement : analyser les présences, l’assiduité, les anniversaires, les projets${dir ? ", les finances" : ""} ; rédiger des annonces, messages WhatsApp, convocations, textes d’affiches, discours et prières ; préparer des programmes et des comptes rendus.
Règles :
- Réponds toujours en français, avec respect et chaleur, dans un esprit christocentrique. Cite la Bible dans la version Louis Segond 1910, avec la référence.
- Pour toute donnée du mouvement (membres, dates, chiffres), utilise les outils de consultation : n’invente jamais un nom, un chiffre ou une date. Si une information manque, dis-le.
- Les informations personnelles restent confidentielles : ne les reformule que pour le besoin de la demande.
- Sois concis : phrases courtes, listes à puces quand c’est utile, pas de longs préambules. Les messages WhatsApp à rédiger sont prêts à copier.
- Tu ne peux rien modifier dans l’application : propose le texte ou la démarche, la personne l’enregistre elle-même.
Contexte du jour : ${fmtLong(aujourdhui())}. ${pluriel(actifs.length, "membre actif", "membres actifs")}. Prochains rassemblements : ${prochain || "aucun programmé"}. Devise : ${c.devise}.`;
  }
  async function envoyerIA(question) {
    const q = String(question || "").trim();
    if (!q || IA.enCours || !S.sample) return;
    IA.tours.push({ role: "user", content: q });
    IA.brouillon = ""; IA.enCours = true; IA.courant = ""; IA.erreur = ""; IA.statut = "Éliézer réfléchit…";
    IA.ctl = new AbortController();
    render(); defilerIA();
    if (!IA.outils) {
      try { const lim = await S.sample.limits(); IA.outils = lim && lim.tools ? lim.tools.maxCount || 16 : 0; } catch (e) { IA.outils = 0; }
    }
    const tours = IA.tours.slice(-16);
    while (tours.length && tours[0].role !== "user") tours.shift();
    const opts = { signal: IA.ctl.signal, cache: false, onText: ({ text }) => { IA.courant = text; IA.statut = ""; const el = $("#ia-courant"); if (el) { el.innerHTML = mdIA(text); defilerIA(); } else render(); } };
    let entree = [{ role: "user", content: consignesIA() }, ...tours];
    if (IA.outils) { opts.tools = outilsIA().slice(0, IA.outils); delete opts.cache; }
    else entree = [{ role: "user", content: consignesIA() + "\n\nDonnées du mouvement (extrait) :\n" + JSON.stringify(instantaneIA()).slice(0, 60000) }, ...tours];
    try {
      const r = await S.sample(entree, opts);
      IA.tours.push({ role: "assistant", content: r.text + (r.truncated ? "\n\n*(Réponse coupée : demandez la suite.)*" : "") });
    } catch (e) {
      if (e && e.text) IA.tours.push({ role: "assistant", content: e.text + "\n\n*(Réponse interrompue.)*" });
      IA.erreur = messageIA(e);
      if (e && e.code === "cancelled") IA.erreur = "";
    } finally {
      IA.enCours = false; IA.courant = ""; IA.statut = ""; IA.ctl = null;
      render(); defilerIA();
    }
  }
  function instantaneIA() {
    const dir = accesDirection();
    return { membres: membresActifs().map(resumeM), agenda: aVenir().slice(0, 10).map((e) => ({ titre: e.titre, date: e.date, heure: e.heure, lieu: e.lieu })), anniversaires30j: outilsIA().find((t) => t.name === "anniversaires").execute({ jours: 30 }), projets: outilsIA().find((t) => t.name === "projets").execute({}), ...(dir ? { finances: outilsIA().find((t) => t.name === "finances").execute({}) } : {}) };
  }
  IA.statutSet = (s) => { IA.statut = s; const el = $("#ia-statut"); if (el) el.textContent = s; };
  function defilerIA() { requestAnimationFrame(() => { const f = $("#ia-fil"); if (f) f.scrollTop = f.scrollHeight; const b = $("#ia-bas"); if (b && S.vue === "assistant") b.scrollIntoView({ block: "end" }); }); }
  const SUGGESTIONS_IA = [
    ["Résumé de la semaine", "Fais-moi le point de la semaine : prochains rassemblements, anniversaires, tâches de projets en retard et membres à relancer."],
    ["Qui relancer ?", "Quels membres faut-il appeler cette semaine (absences répétées, faible assiduité) ? Propose un court message WhatsApp fraternel pour eux."],
    ["Annonce du prochain culte", "Rédige l’annonce du prochain rassemblement pour le groupe WhatsApp du mouvement, avec un verset."],
    ["Anniversaires", "Quels sont les anniversaires des 14 prochains jours ? Rédige un message de vœux personnalisé pour chacun."],
    ["État des projets", "Fais le point sur les projets en cours : avancement, tâches en retard, et ce qu’il faut décider."],
    ["Prière de la semaine", "Propose une prière d’intercession pour le mouvement cette semaine, avec trois sujets et des versets."],
  ];
  VUES.assistant = function () {
    let out = secHead("Éliézer", { eyebrow: "Assistant IA du Quartier Général", verset: ["Éternel, Dieu de mon seigneur Abraham, fais-moi, je te prie, rencontrer aujourd’hui ce que je désire.", "Genèse 24.12"], actions: IA.tours.length && !IA.enCours ? btn("ia-effacer", "Nouvelle conversation", { ico: "i-undo" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("L’assistant");
    if (S.etat === "connexion") return out + chargement("Préparation de l’assistant…");
    if (!S.sample) return out + vide("i-spark", "L’assistant fonctionne lorsque l’application est ouverte dans Claude, avec un compte qui autorise l’IA.");
    let fil = "";
    if (!IA.tours.length) fil = `<div class="ia-accueil"><span class="ia-av lg" aria-hidden="true">${I("i-spark")}</span><p><b>Bonjour${S.me.name ? " " + esc(S.me.name.split(/\s+/)[0]) : ""}, je suis Éliézer.</b> Je consulte les données du mouvement pour vous répondre et je rédige vos messages, annonces et textes d’affiches.</p><div class="ia-sugg">${SUGGESTIONS_IA.map(([l, q]) => `<button class="chip-btn" type="button" data-act="ia-suggestion" data-q="${esc(q)}">${esc(l)}</button>`).join("")}</div><p class="hint">Chaque question utilise votre forfait Claude. La première fois, Claude vous demande l’autorisation.</p></div>`;
    fil += IA.tours.map((t, n) => t.role === "user"
      ? `<div class="ia-msg moi"><div class="ia-bulle">${esc(t.content).replace(/\n/g, "<br>")}</div></div>`
      : `<div class="ia-msg"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle">${mdIA(t.content)}<div class="ia-act">${btn("ia-copier", "Copier", { ico: "i-copy", sm: true, data: `data-i="${n}"` })}${btn("ia-whatsapp", "WhatsApp", { ico: "i-msg", sm: true, data: `data-i="${n}"` })}${peutEcrire() ? btn("ia-annonce", "Annonce", { ico: "i-horn", sm: true, data: `data-i="${n}"` }) : ""}${btn("ia-affiche", "Affiche", { ico: "i-image", sm: true, data: `data-i="${n}"` })}</div></div></div>`).join("");
    if (IA.enCours) fil += `<div class="ia-msg"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle"><div id="ia-courant">${IA.courant ? mdIA(IA.courant) : ""}</div><p class="ia-statut" id="ia-statut" aria-live="polite">${esc(IA.statut)}</p></div></div>`;
    if (IA.erreur) fil += `<p class="note warn">${esc(IA.erreur)}</p>`;
    out += `<div class="ia-fil" id="ia-fil" aria-live="polite">${fil}</div>
      <form class="ia-saisie" id="ia-form" novalidate><label class="sr" for="ia-q">Votre question pour Éliézer</label><textarea class="inp" id="ia-q" rows="2" placeholder="Posez une question ou demandez un texte…"${IA.enCours ? " disabled" : ""}>${esc(IA.brouillon)}</textarea>${IA.enCours ? btn("ia-stop", "Arrêter", { ico: "i-x" }) : `<button class="btn btn-primary" type="submit">${I("i-right")}Envoyer</button>`}</form><span id="ia-bas"></span>`;
    return out;
  };
  function carteEliezer() {
    if (!S.sample) return "";
    return `<section class="card ia-carte" aria-labelledby="c-ia"><div class="card-h"><h2 class="card-t" id="c-ia">${I("i-spark")}Demander à Éliézer</h2></div><form class="ia-mini" id="ia-mini" novalidate><label class="sr" for="ia-mini-q">Question</label><input class="inp" id="ia-mini-q" type="text" placeholder="Qui fête son anniversaire cette semaine ?" autocomplete="off"><button class="btn btn-primary" type="submit" aria-label="Envoyer à Éliézer">${I("i-right")}</button></form><div class="ia-sugg">${SUGGESTIONS_IA.slice(0, 3).map(([l, q]) => `<button class="chip-btn" type="button" data-act="ia-suggestion" data-q="${esc(q)}">${esc(l)}</button>`).join("")}</div></section>`;
  }
  document.addEventListener("submit", (ev) => {
    if (ev.target.id === "ia-form") { ev.preventDefault(); const q = $("#ia-q"); envoyerIA(q ? q.value : ""); }
    if (ev.target.id === "ia-mini") { ev.preventDefault(); const q = $("#ia-mini-q"); const v = q ? q.value : ""; if (!v.trim()) return; allerA("assistant"); envoyerIA(v); }
  });
  document.addEventListener("input", (ev) => { if (ev.target.id === "ia-q") IA.brouillon = ev.target.value; });
  document.addEventListener("keydown", (ev) => { if (ev.target.id === "ia-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); envoyerIA(ev.target.value); } });
