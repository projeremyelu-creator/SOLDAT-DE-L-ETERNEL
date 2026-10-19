  /* ════════════════════════ Cotisations spéciales et offrandes ════════════════════════ */
  const TYPES_OFFRANDE = [["Offrande", "Offrandes"], ["Dîme", "Dîmes"], ["Action de grâce", "Offrandes"], ["Prémices", "Offrandes"], ["Semence", "Offrandes"], ["Don", "Dons"]];
  const DONATEURS = [["membre", "Un membre"], ["collecte", "Collecte de l’assemblée"], ["anonyme", "Anonyme"], ["autre", "Autre personne"]];
  function categorieEntree(voulue) {
    const cats = cfg().categoriesEntree;
    return cats.find((x) => norm(x) === norm(voulue)) || cats.find((x) => norm(x).startsWith(norm(voulue).slice(0, 5))) || voulue;
  }
  const categorieOffrande = (type) => categorieEntree((TYPES_OFFRANDE.find(([t]) => t === type) || ["", "Offrandes"])[1]);
  const speciale = (id) => (S.speciales || []).find((x) => x.id === id) || null;
  const offrande = (id) => (S.offrandes || []).find((x) => x.id === id) || null;
  function cibleSp(sp) {
    const c = sp.cible || { type: "tous" };
    if (c.type === "garnison" && garnison(c.valeur)) return { lib: garnison(c.valeur).nom, liste: membresDeG(c.valeur, true) };
    if (c.type === "pole" && c.valeur) return { lib: c.valeur, liste: membresActifs().filter((m) => m.pole === c.valeur) };
    return { lib: "Tous les membres actifs", liste: membresActifs() };
  }
  const versementsSp = (sp) => Object.entries(sp.versements || {}).filter(([, v]) => v && typeof v === "object").map(([vid, v]) => ({ vid, ...v })).sort((a, b) => cmpFr(b.date || "", a.date || ""));
  function bilanSp(sp) {
    const vs = versementsSp(sp).filter((v) => !v.annule);
    const parM = {};
    vs.forEach((v) => { parM[v.membreId] = (parM[v.membreId] || 0) + (Number(v.montant) || 0); });
    const cible = cibleSp(sp);
    const mt = Number(sp.montant) || 0;
    const collecte = vs.reduce((t, v) => t + (Number(v.montant) || 0), 0);
    const attendu = mt ? mt * cible.liste.length : Number(sp.objectif) || 0;
    const soldes = mt ? cible.liste.filter((m) => (parM[m.id] || 0) >= mt).length : 0;
    return { vs, parM, cible, mt, collecte, attendu, soldes, contributeurs: Object.keys(parM).length, taux: attendu ? collecte / attendu : null };
  }
  const ouverteSp = (sp) => (sp.statut || "Ouverte") === "Ouverte";
  function rowSpeciale(sp) {
    const b = bilanSp(sp);
    const meta = [sp.echeance ? `échéance ${fmtCourt(sp.echeance)}` : "", b.cible.lib, b.mt ? `${fcfa(b.mt)} par membre` : sp.objectif ? `objectif ${fcfa(sp.objectif)}` : "montant libre"].filter(Boolean).join(" · ");
    const retard = ouverteSp(sp) && sp.echeance && sp.echeance < aujourdhui();
    return `<button class="row nolead" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}"><span class="row-main"><span class="row-t">${esc(sp.titre || "Sans titre")}</span><span class="row-m">${esc(meta)}</span>${b.attendu ? `<span class="bar slim${b.taux >= 1 ? " ok" : ""}" aria-hidden="true"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r"><span class="amt in">${nb(b.collecte)}</span>${b.attendu ? `<span class="chip${b.taux >= 1 ? " ok" : ""}">${pct(b.taux)}</span>` : ""}${!ouverteSp(sp) ? `<span class="chip">Close</span>` : retard ? `<span class="chip warn">Échue</span>` : ""}</span></button>`;
  }
  function vueSpeciales() {
    const adm = peutAdmin();
    let out = `<div class="toolbar"><p class="hint" style="margin:0">Collectes ponctuelles : conférence, mission, construction, solidarité…</p><div class="btn-row">${adm ? btn("ajout-speciale", "Nouvelle cotisation spéciale", { ico: "i-plus", cls: "btn-primary" }) : ""}</div></div>`;
    if (!S.pret.speciales || !S.pret.membres) return out + chargement("Lecture des cotisations spéciales…");
    const tout = (S.speciales || []).slice().sort((a, b) => cmpFr(b.debut || "", a.debut || "") || (b.creeLe || 0) - (a.creeLe || 0));
    if (!tout.length) return out + vide("i-flag", "Aucune cotisation spéciale. Créez-en une pour chaque occasion (IN FIRE, mission, construction, action sociale…) : montant attendu par membre ou objectif global, échéance, membres concernés. Chaque versement entre dans la caisse et la progression se suit ici.", adm ? btn("ajout-speciale", "Créer une cotisation spéciale", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const f = S.f.speciales;
    const ouv = tout.filter(ouverteSp), closes = tout.filter((x) => !ouverteSp(x));
    const collecte = tout.reduce((t, sp) => t + bilanSp(sp).collecte, 0);
    const an = new Date().getFullYear();
    const cetteAnnee = tout.filter((sp) => String(sp.debut || "").startsWith(String(an))).reduce((t, sp) => t + bilanSp(sp).collecte, 0);
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-flag")}En cours</span><span class="stat-v">${nb(ouv.length)}</span><span class="stat-m">${pluriel(closes.length, "close", "closes")}</span></div>
      <div class="stat in"><span class="stat-l">${I("i-in")}Collecté en ${an}</span><span class="stat-v">${nb(cetteAnnee)}<small>FCFA</small></span><span class="stat-m">Cotisations lancées cette année</span></div>
      <div class="stat"><span class="stat-l">Collecté au total</span><span class="stat-v">${nb(collecte)}<small>FCFA</small></span><span class="stat-m">Toutes les cotisations spéciales</span></div>
      <div class="stat"><span class="stat-l">Reste à collecter</span><span class="stat-v">${nb(ouv.reduce((t, sp) => { const b = bilanSp(sp); return t + Math.max(0, b.attendu - b.collecte); }, 0))}<small>FCFA</small></span><span class="stat-m">Sur les cotisations en cours</span></div></div>
      <div class="filters"><div class="chips" role="group" aria-label="Filtrer">${[["ouvertes", "En cours", ouv.length], ["closes", "Closes", closes.length], ["toutes", "Toutes", tout.length]].map(([id, l, n]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="sp-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l} · ${nb(n)}</button>`).join("")}</div></div>`;
    const liste = f.filtre === "closes" ? closes : f.filtre === "toutes" ? tout : ouv;
    if (!liste.length) return out + vide("i-check", f.filtre === "closes" ? "Aucune cotisation spéciale close." : "Aucune cotisation spéciale en cours.");
    return out + `<div class="list">${liste.map(rowSpeciale).join("")}</div>`;
  }
  function ficheSpeciale(id) {
    const sp = speciale(id);
    if (!sp) return null;
    const adm = peutAdmin();
    const b = bilanSp(sp);
    const ouv = ouverteSp(sp);
    const concernes = b.cible.liste.slice().sort((x, y) => {
      const rx = b.mt ? Math.max(0, b.mt - (b.parM[x.id] || 0)) : -(b.parM[x.id] || 0), ry = b.mt ? Math.max(0, b.mt - (b.parM[y.id] || 0)) : -(b.parM[y.id] || 0);
      return ry - rx || parNom(x, y);
    });
    const ids = new Set(concernes.map((m) => m.id));
    const autres = Object.keys(b.parM).filter((mid) => !ids.has(mid)).map(membre).filter(Boolean);
    const ligneM = (m) => {
      const v = b.parM[m.id] || 0;
      const reste = b.mt ? Math.max(0, b.mt - v) : 0;
      const chip = b.mt ? (reste === 0 ? `<span class="chip ok">Soldé</span>` : v ? `<span class="chip warn">Reste ${nb(reste)}</span>` : `<span class="chip">Rien versé</span>`) : v ? `<span class="chip ok">A contribué</span>` : `<span class="chip">Pas encore</span>`;
      const msg = messageSpeciale(sp, m, reste);
      return `<div class="row nolead sp-row"><span class="row-main"><button class="link row-t" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button><span class="row-m">${v ? `${esc(fcfa(v))} versés` : "Aucun versement"}</span></span><span class="row-r">${chip}${adm && ouv && (!b.mt || reste) ? `<button class="icon-btn" type="button" data-act="ajout-versement-sp" data-id="${esc(sp.id)}" data-mid="${esc(m.id)}" aria-label="Enregistrer un versement de ${esc(nomComplet(m))}">${I("i-plus")}</button>` : ""}${ouv && (b.mt ? reste : !v) && m.telephone ? `<a class="icon-btn" href="${esc(lienWa(m.telephone, msg))}" target="_blank" rel="noopener" aria-label="Relancer ${esc(nomComplet(m))} sur WhatsApp">${I("i-msg")}</a>` : ""}</span></div>`;
    };
    const versements = b.vs.length || versementsSp(sp).length ? versementsSp(sp).map((v) => { const m = membre(v.membreId); return `<button class="row nolead${v.annule ? " reversed" : ""}" type="button" data-act="voir-op-de" data-mois="${esc(v.opMois || "")}" data-id="${esc(v.opId || "")}"><span class="row-main"><span class="row-t">${esc(m ? nomComplet(m) : "Membre retiré du registre")}</span><span class="row-m">${esc([fmtJour(v.date), v.moyen, v.piece].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${v.annule ? "" : "in"}">+${nb(v.montant)}</span>${v.annule ? `<span class="chip danger">Annulé</span>` : ""}</span></button>`; }).join("") : "";
    const relancer = concernes.filter((m) => (b.mt ? (b.parM[m.id] || 0) < b.mt : !b.parM[m.id]));
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-flag")}</span><div><h3>${esc(sp.titre)}</h3><p>${esc(ouv ? (sp.echeance && sp.echeance < aujourdhui() ? "Échéance dépassée" : "En cours") : "Close")}</p></div></div>
      ${sp.description ? `<p style="white-space:pre-wrap;margin:0 0 12px">${esc(sp.description)}</p>` : ""}
      <div class="figure"><span class="big-figure in">${nb(b.collecte)}<small>FCFA collectés</small></span>${b.attendu ? `<span class="chip${b.taux >= 1 ? " ok" : ""}">${pct(b.taux)} de ${esc(fcfa(b.attendu))}</span>` : ""}</div>
      ${b.attendu ? `<div class="bar${b.taux >= 1 ? " ok" : ""}" style="margin:6px 0 14px" role="img" aria-label="${esc(`${pct(b.taux)} collectés`)}"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}
      ${kv([["Membres concernés", esc(`${b.cible.lib} (${nb(b.cible.liste.length)})`)], ["Montant par membre", b.mt ? esc(fcfa(b.mt)) : "Libre"], ["Objectif global", sp.objectif ? esc(fcfa(sp.objectif)) : ""], ["Lancée le", sp.debut ? esc(fmtJour(sp.debut)) : ""], ["Échéance", sp.echeance ? esc(fmtJour(sp.echeance)) : ""], ["Contributeurs", esc(`${nb(b.contributeurs)}${b.mt ? ` · ${nb(b.soldes)} soldés` : ""}`)]])}
      <div class="actions">${adm && ouv ? btn("ajout-versement-sp", "Enregistrer un versement", { ico: "i-plus", cls: "btn-primary", data: `data-id="${esc(sp.id)}"` }) : ""}${ouv && relancer.length && peutEcrire() ? btn("relancer-sp", `Relancer (${nb(relancer.length)})`, { ico: "i-horn", data: `data-id="${esc(sp.id)}"` }) : ""}${btn("export-sp", "Exporter", { ico: "i-down", data: `data-id="${esc(sp.id)}"` })}${adm ? btn("editer-speciale", "Modifier", { ico: "i-edit", data: `data-id="${esc(sp.id)}"` }) : ""}${adm ? btn("statut-speciale", ouv ? "Clôturer" : "Rouvrir", { ico: ouv ? "i-lock" : "i-undo", data: `data-id="${esc(sp.id)}"` }) : ""}${adm && !versementsSp(sp).length ? btn("supprimer-speciale", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(sp.id)}"` }) : ""}</div>
      <h3 class="h3">Membres concernés</h3>${concernes.length ? `<div class="list">${concernes.map(ligneM).join("")}</div>` : `<p class="hint">Aucun membre concerné.</p>`}
      ${autres.length ? `<h3 class="h3">Autres contributeurs</h3><div class="list">${autres.map(ligneM).join("")}</div>` : ""}
      <h3 class="h3">Versements</h3>${versements ? `<div class="list">${versements}</div>` : `<p class="hint">Aucun versement enregistré.</p>`}`;
  }
  function messageSpeciale(sp, m, reste) {
    const c = cfg();
    return `Bonjour ${prenomUsuel(m)}, que la grâce de Dieu soit avec toi. Rappel fraternel : la cotisation spéciale « ${sp.titre} » du mouvement ${c.nomCourt}${sp.echeance ? `, attendue pour le ${fmtJour(sp.echeance)},` : ""} ${reste ? `reste à compléter (${fcfa(reste)})` : "compte sur ta participation"}. Merci pour ta générosité et ton engagement !`;
  }
  const ouvrirSpeciale = (id) => ouvrir({ titre: "Cotisation spéciale", wide: true, refresh: surveiller(() => ficheSpeciale(id)) });
  function ouvrirFormSpeciale(id) {
    const sp = id ? speciale(id) : { debut: aujourdhui(), cible: { type: "tous" } };
    if (id && !sp) return;
    const c = cfg();
    const cibleVal = sp.cible && sp.cible.type === "garnison" ? "g:" + sp.cible.valeur : sp.cible && sp.cible.type === "pole" ? "p:" + sp.cible.valeur : "tous";
    const opts = `<option value="tous"${cibleVal === "tous" ? " selected" : ""}>Tous les membres actifs</option>${S.garnisons.length ? `<optgroup label="Une garnison ou un point SDE">${optionsGarnisons().map(([v, l]) => `<option value="g:${esc(v)}"${cibleVal === "g:" + v ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` : ""}<optgroup label="Un pôle">${c.poles.map((p) => `<option value="p:${esc(p)}"${cibleVal === "p:" + p ? " selected" : ""}>${esc(p)}</option>`).join("")}</optgroup>`;
    const html = `<form class="form" id="f-sp" novalidate>
      ${champ("sp-titre", "Intitulé", inp("sp-titre", "titre", sp.titre, 'autocomplete="off" required autofocus placeholder="IN FIRE 2026, Mission Tunisie, Construction…"'), { req: true })}
      ${champ("sp-desc", "Objet", zone("sp-desc", "description", sp.description, 'rows="3" placeholder="À quoi servira cette collecte"'))}
      ${champ("sp-cible", "Membres concernés", `<select class="inp" id="sp-cible" name="cible">${opts}</select>`)}
      <div class="f2">${champ("sp-mt", "Montant attendu par membre (FCFA)", inp("sp-mt", "montant", sp.montant ? nb(sp.montant) : "", 'inputmode="numeric" autocomplete="off" placeholder="Libre"'), { hint: "Laissez vide pour une contribution libre." })}${champ("sp-obj", "Objectif global (FCFA)", inp("sp-obj", "objectif", sp.objectif ? nb(sp.objectif) : "", 'inputmode="numeric" autocomplete="off" placeholder="Facultatif"'))}</div>
      <div class="f2">${champ("sp-debut", "Lancée le", inp("sp-debut", "debut", sp.debut || aujourdhui(), 'type="date"'))}${champ("sp-ech", "Échéance", inp("sp-ech", "echeance", sp.echeance, 'type="date"'))}</div>
      ${pied(id ? "Enregistrer les modifications" : "Lancer la cotisation")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la cotisation spéciale" : "Nouvelle cotisation spéciale", html, wide: true, onSubmit: (fd, form) => enregistrerSpeciale(fd, form, id) });
  }
  async function enregistrerSpeciale(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé de la cotisation."); return; }
    const cv = g("cible");
    const cible = cv.startsWith("g:") ? { type: "garnison", valeur: cv.slice(2) } : cv.startsWith("p:") ? { type: "pole", valeur: cv.slice(2) } : { type: "tous", valeur: "" };
    const data = { titre: g("titre"), description: g("description"), cible, montant: Number(g("montant").replace(/\D/g, "")) || 0, objectif: Number(g("objectif").replace(/\D/g, "")) || 0, debut: g("debut") || aujourdhui(), echeance: g("echeance") };
    if (data.echeance && data.echeance < data.debut) { erreurForm("L’échéance doit suivre la date de lancement."); return; }
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("cotis_speciales/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("cotis_speciales").doc(); await ref.set({ ...data, statut: "Ouverte", versements: {}, ...creation() }); }
    }, id ? "Cotisation modifiée" : "Cotisation spéciale lancée");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirSpeciale(id || ref.id);
  }
  function ouvrirFormVersementSp(id, mid) {
    const sp = speciale(id);
    if (!sp) return;
    const c = cfg();
    const b = bilanSp(sp);
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const lib = (m) => { const v = b.parM[m.id] || 0; return nomComplet(m) + (b.mt ? ` · ${v >= b.mt ? "soldé" : `reste ${nb(b.mt - v)}`}` : v ? ` · ${nb(v)} versés` : ""); };
    const groupe = (titre, liste) => liste.length ? `<optgroup label="${esc(titre)}">${liste.map((m) => `<option value="${esc(m.id)}"${m.id === mid ? " selected" : ""}>${esc(lib(m))}</option>`).join("")}</optgroup>` : "";
    const concernes = b.cible.liste.slice().sort(parNom), autres = membresActifs().filter((m) => !ids.has(m.id));
    const reste = (m) => (m && b.mt ? Math.max(0, b.mt - (b.parM[m.id] || 0)) : 0);
    const html = `<form class="form" id="f-vsp" novalidate>
      <p class="hint" style="margin-top:0">Cotisation spéciale <b>${esc(sp.titre)}</b>${b.mt ? ` · ${esc(fcfa(b.mt))} par membre` : ""}</p>
      ${champ("v-membre", "Membre", `<select class="inp" id="v-membre" name="membreId" required><option value="">Choisir un membre</option>${groupe("Membres concernés", concernes)}${groupe("Autres membres", autres)}</select>`, { req: true })}
      <div class="f2">${champ("v-mt", "Montant versé (FCFA)", inp("v-mt", "montant", mid && reste(membre(mid)) ? nb(reste(membre(mid))) : "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("v-date", "Date du versement", inp("v-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("v-moyen", "Moyen de paiement", sel("v-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("v-piece", "N° de pièce ou référence", inp("v-piece", "piece", "", 'autocomplete="off" placeholder="Reçu, transaction…"'))}</div>
      <p class="hint">Le versement entre aussi dans le journal de caisse, catégorie « ${esc(categorieCotis())} ».</p>
      ${pied("Enregistrer le versement")}
    </form>`;
    ouvrir({
      titre: "Versement", html, wide: true, onSubmit: (fd, form) => enregistrerVersementSp(fd, form, id),
      apres: (sheet) => {
        const mt = sheet.querySelector("#v-mt");
        sheet.querySelector("#v-membre").addEventListener("change", (ev) => { if (!mt.dataset.manuel) { const r = reste(membre(ev.target.value)); mt.value = r ? nb(r) : ""; } });
        mt.addEventListener("input", () => { mt.dataset.manuel = "1"; });
        mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); });
        mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; });
      },
    });
  }
  function verifierDateCaisse(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > aujourdhui()) return "Indiquez une date valide, au plus tard aujourd’hui.";
    if (moisClos(date.slice(0, 7))) return `${cap(fmtMois(date.slice(0, 7)))} est clôturé dans la caisse : choisissez une date dans un mois ouvert.`;
    return "";
  }
  async function enregistrerVersementSp(fd, form, id) {
    const sp = speciale(id);
    const mid = String(fd.get("membreId") || "");
    const m = membre(mid);
    if (!sp || !m) { erreurForm("Choisissez le membre."); return; }
    const montant = Number(String(fd.get("montant") || "").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant versé."); return; }
    const date = String(fd.get("date") || "");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const vid = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const moyen = String(fd.get("moyen") || ""), piece = String(fd.get("piece") || "").trim();
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: categorieCotis(), moyen, libelle: `Cotisation spéciale « ${sp.titre} » · ${nomComplet(m)}`, membreId: mid, evenementId: null, piece, speciale: { id, vid }, annule: false, ...creation() });
      await S.db.doc("cotis_speciales/" + id).update({ versements: { [vid]: { membreId: mid, montant, date, moyen, piece, opId: opRef.id, opMois: cle, annule: false } }, ...tampon() });
    }, `Versement de ${fcfa(montant)} enregistré`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirSpeciale(id);
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function exporterSpeciale(id) {
    const sp = speciale(id);
    if (!sp) return;
    const b = bilanSp(sp);
    const rows = [["Matricule", "Nom", "Prénoms", "Concerné", "Versé (FCFA)", "Attendu (FCFA)", "Reste (FCFA)"]];
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const liste = b.cible.liste.concat(Object.keys(b.parM).filter((x) => !ids.has(x)).map(membre).filter(Boolean));
    liste.forEach((m) => { const v = b.parM[m.id] || 0; rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", ids.has(m.id) ? "oui" : "non", String(v), b.mt && ids.has(m.id) ? String(b.mt) : "", b.mt && ids.has(m.id) ? String(Math.max(0, b.mt - v)) : ""]); });
    telecharger(`cotisation-speciale-${sansAccents(sp.titre).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.csv`, versCSV(rows));
  }

  /* — Offrandes, dîmes et dons — */
  const donateurOff = (o) => (o.donateur === "membre" ? (membre(o.membreId) ? nomComplet(membre(o.membreId)) : "Membre retiré du registre") : o.donateur === "collecte" ? "Collecte de l’assemblée" : o.donateur === "anonyme" ? "Anonyme" : o.nom || "Autre personne");
  function vueOffrandes() {
    const adm = peutAdmin();
    const an = S.annee;
    const curY = new Date().getFullYear();
    let out = `<div class="toolbar"><div class="mnav"><button class="icon-btn" type="button" data-act="annee-prec" aria-label="Année précédente">${I("i-left")}</button><span class="mnav-l" aria-live="polite">Année ${an}</span><button class="icon-btn" type="button" data-act="annee-suiv" aria-label="Année suivante"${an >= curY + 1 ? " disabled" : ""}>${I("i-right")}</button></div><div class="btn-row">${adm ? btn("ajout-offrande", "Enregistrer une offrande", { ico: "i-plus", cls: "btn-primary" }) : ""}${btn("export-offrandes", `<span class="hide-s">Exporter</span>`, { ico: "i-down", cls: "btn-ghost ico-s", attrs: 'aria-label="Exporter les offrandes en CSV"' })}</div></div>`;
    if (!S.pret.offrandes) return out + chargement("Lecture des offrandes…");
    const annee = (S.offrandes || []).filter((o) => String(o.date || "").startsWith(String(an)));
    const valides = annee.filter((o) => !o.annule);
    const tot = valides.reduce((t, o) => t + (Number(o.montant) || 0), 0);
    const parType = {};
    valides.forEach((o) => { parType[o.type || "Offrande"] = (parType[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
    const dimes = parType["Dîme"] || 0, dons = parType["Don"] || 0;
    out += `<div class="stats s4">
      <div class="stat in"><span class="stat-l">${I("i-in")}Total ${an}</span><span class="stat-v">${nb(tot)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.length, "enregistrement", "enregistrements")}</span></div>
      <div class="stat"><span class="stat-l">Offrandes</span><span class="stat-v">${nb(tot - dimes - dons)}<small>FCFA</small></span><span class="stat-m">Offrandes, actions de grâce, prémices, semences</span></div>
      <div class="stat"><span class="stat-l">Dîmes</span><span class="stat-v">${nb(dimes)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.filter((o) => o.type === "Dîme").length, "versement", "versements")}</span></div>
      <div class="stat"><span class="stat-l">Dons</span><span class="stat-v">${nb(dons)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.filter((o) => o.type === "Don").length, "don", "dons")}</span></div></div>`;
    if (!annee.length) return out + vide("i-in", `Aucune offrande enregistrée en ${an}. Enregistrez les offrandes, dîmes, actions de grâce, prémices, semences et dons : chacun entre dans la caisse avec sa catégorie et se retrouve ici, par mois et par type.`, adm ? btn("ajout-offrande", "Enregistrer une offrande", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const parMois = Array.from({ length: 12 }, (_, i) => valides.filter((o) => o.date.slice(5, 7) === pad(i + 1)).reduce((t, o) => t + (Number(o.montant) || 0), 0));
    const max = Math.max(1, ...parMois);
    out += `<div class="grid g2">${carte("Par mois", `<div class="mbars" role="img" aria-label="${esc(parMois.map((v, i) => `${MOIS_NOMS[i]} : ${fcfa(v)}`).join(" ; "))}">${parMois.map((v, i) => `<div class="mb-col" title="${esc(`${cap(MOIS_NOMS[i])} : ${fcfa(v)}`)}"><div class="mb-bar"><i style="height:${((v / max) * 100).toFixed(1)}%"></i></div><span>${MOIS_INI[i]}</span></div>`).join("")}</div>`)}${carte("Par type", barresGroupe(parType, "in"))}</div>`;
    const f = S.f.offrandes;
    out += `<div class="filters" style="margin-top:14px"><div class="chips" role="group" aria-label="Type">${[["", "Tous"]].concat(TYPES_OFFRANDE.map(([t]) => [t, t])).map(([id, l]) => `<button class="chip-btn${f.type === id ? " on" : ""}" type="button" data-act="off-type" data-v="${esc(id)}" aria-pressed="${f.type === id}">${esc(l)}</button>`).join("")}</div><label class="sr" for="q-off">Rechercher</label><input class="search" id="q-off" type="search" placeholder="Donateur, occasion, référence…" value="${esc(f.q)}" data-filtre="offrandes.q" autocomplete="off"></div>`;
    const q = norm(f.q);
    const liste = annee.filter((o) => (!f.type || o.type === f.type) && (!q || norm([donateurOff(o), o.occasion, o.piece, o.note, o.type].join(" ")).includes(q))).sort((a, b) => cmpFr(b.date || "", a.date || "") || (b.creeLe || 0) - (a.creeLe || 0));
    if (!liste.length) return out + vide("i-search", "Aucune offrande ne correspond.");
    const groupes = [];
    liste.forEach((o) => { const k = o.date.slice(0, 7); const g = groupes[groupes.length - 1]; if (g && g.k === k) g.l.push(o); else groupes.push({ k, l: [o] }); });
    return out + groupes.map(({ k, l }) => `<h2 class="day-h">${esc(cap(fmtMois(k)))} · ${esc(fcfa(l.filter((o) => !o.annule).reduce((t, o) => t + (Number(o.montant) || 0), 0)))}</h2><div class="list">${l.map((o) => `<button class="row${o.annule ? " reversed" : ""}" type="button" data-act="voir-offrande" data-id="${esc(o.id)}"><span class="mark-io ${o.annule ? "neutral" : "in"}">${I("i-in")}</span><span class="row-main"><span class="row-t">${esc(o.type || "Offrande")} · ${esc(donateurOff(o))}</span><span class="row-m">${esc([fmtJour(o.date), o.occasion, o.moyen].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${o.annule ? "" : "in"}">+${nb(o.montant)}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</span></button>`).join("")}</div>`).join("");
  }
  function ficheOffrande(id) {
    const o = offrande(id);
    if (!o) return null;
    const e = o.evenementId ? evt(o.evenementId) : null;
    return `<div class="figure"><span class="big-figure ${o.annule ? "" : "in"}">+${nb(o.montant)}<small>FCFA</small></span><span class="chip in">${esc(o.type || "Offrande")}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</div>
      <p class="hint" style="margin-bottom:12px">${esc(cap(enLettres(o.montant)))} francs CFA</p>
      ${kv([["Date", esc(fmtLong(o.date))], ["Donateur", o.donateur === "membre" && membre(o.membreId) ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(o.membreId)}">${esc(donateurOff(o))}</button>` : esc(donateurOff(o))], ["Rassemblement", e ? esc(`${e.titre} · ${fmtCourt(e.date)}`) : ""], ["Occasion", esc(o.occasion || "")], ["Moyen", esc(o.moyen || "")], ["Référence", esc(o.piece || "")], ["Note", o.note ? `<span style="white-space:pre-wrap">${esc(o.note)}</span>` : ""], ["Catégorie en caisse", esc(o.categorie || categorieOffrande(o.type))], ["Saisie", esc([o.creeLe ? fmtStamp(o.creeLe) : "", o.creePar ? "par " + nomDe(o.creePar) : ""].filter(Boolean).join(" "))]])}
      <p class="note">Pour corriger ou annuler cette offrande, ouvrez l’opération de caisse correspondante : l’annulation y est tracée avec son motif, puis reportée ici.</p>
      <div class="actions">${o.opId ? btn("voir-op-de", "Opération de caisse et reçu", { ico: "i-receipt", cls: "btn-primary", data: `data-mois="${esc(o.opMois || o.date.slice(0, 7))}" data-id="${esc(o.opId)}"` }) : ""}</div>`;
  }
  const ouvrirOffrande = (id) => ouvrir({ titre: "Offrande", refresh: surveiller(() => ficheOffrande(id)) });
  function ouvrirFormOffrande(preset = {}) {
    const c = cfg();
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m) + (m.matricule ? ` · ${m.matricule}` : "")]);
    const evts = S.evenements.filter((e) => e.date <= aujourdhui()).sort((a, b) => cmpFr(b.date, a.date)).slice(0, 40).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre}`]);
    const don = preset.membreId ? "membre" : "collecte";
    const html = `<form class="form" id="f-off" novalidate>
      ${champ("o-type", "Nature", sel("o-type", "type", TYPES_OFFRANDE.map(([t]) => t), preset.type || "Offrande", null))}
      <div class="field"><span class="lab" id="lab-don">Donateur</span><div class="seg s4" role="radiogroup" aria-labelledby="lab-don">${DONATEURS.map(([v, l]) => `<input type="radio" name="donateur" id="o-d-${v}" value="${v}"${v === don ? " checked" : ""}><label for="o-d-${v}">${esc(l)}</label>`).join("")}</div></div>
      <div id="o-membre-w"${don === "membre" ? "" : " hidden"}>${champ("o-membre", "Membre", sel("o-membre", "membreId", mbs, preset.membreId || "", "Choisir un membre"))}</div>
      <div id="o-nom-w" hidden>${champ("o-nom", "Nom du donateur", inp("o-nom", "nom", "", 'autocomplete="off"'))}</div>
      <div class="f2">${champ("o-mt", "Montant (FCFA)", inp("o-mt", "montant", "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("o-date", "Date", inp("o-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("o-evt", "Rassemblement", sel("o-evt", "evenementId", evts, preset.evenementId || "", "Aucun"))}${champ("o-occ", "Occasion", inp("o-occ", "occasion", "", 'autocomplete="off" placeholder="Culte, anniversaire, naissance…"'))}</div>
      <div class="f2">${champ("o-moyen", "Moyen de paiement", sel("o-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("o-piece", "N° de pièce ou référence", inp("o-piece", "piece", "", 'autocomplete="off"'))}</div>
      ${champ("o-note", "Note", zone("o-note", "note", "", 'rows="2"'))}
      <p class="hint" id="o-cat">L’offrande entre aussi dans le journal de caisse.</p>
      ${pied("Enregistrer")}
    </form>`;
    ouvrir({
      titre: "Enregistrer une offrande", html, wide: true, onSubmit: enregistrerOffrande,
      apres: (sheet) => {
        const maj = () => {
          const v = (sheet.querySelector("input[name=donateur]:checked") || {}).value;
          sheet.querySelector("#o-membre-w").hidden = v !== "membre";
          sheet.querySelector("#o-nom-w").hidden = v !== "autre";
          sheet.querySelector("#o-cat").textContent = `L’offrande entre aussi dans le journal de caisse, catégorie « ${categorieOffrande(sheet.querySelector("#o-type").value)} ».`;
        };
        sheet.querySelectorAll("input[name=donateur]").forEach((r) => r.addEventListener("change", maj));
        sheet.querySelector("#o-type").addEventListener("change", maj);
        const mt = sheet.querySelector("#o-mt");
        mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); });
        mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; });
        maj();
      },
    });
  }
  async function enregistrerOffrande(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const type = g("type") || "Offrande";
    const donateur = g("donateur") || "collecte";
    const membreId = donateur === "membre" ? g("membreId") : "";
    if (donateur === "membre" && !membre(membreId)) { erreurForm("Choisissez le membre."); return; }
    if (donateur === "autre" && !g("nom")) { erreurForm("Indiquez le nom du donateur."); return; }
    const montant = Number(g("montant").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant."); return; }
    const date = g("date");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const ref = S.db.collection("offrandes").doc();
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const o = { type, donateur, membreId, nom: donateur === "autre" ? g("nom") : "", montant, date, evenementId: g("evenementId") || null, occasion: g("occasion"), moyen: g("moyen"), piece: g("piece"), note: g("note"), categorie: categorieOffrande(type), opId: opRef.id, opMois: cle, annule: false };
    const libelle = `${type}${o.occasion ? ` · ${o.occasion}` : ""} · ${donateurOff(o)}`;
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: o.categorie, moyen: o.moyen, libelle, membreId: membreId || null, evenementId: o.evenementId, piece: o.piece, offrande: { id: ref.id }, annule: false, ...creation() });
      await ref.set({ ...o, ...creation() });
    }, `${type} de ${fcfa(montant)} enregistrée`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    S.annee = Number(date.slice(0, 4));
    ouvrirOffrande(ref.id);
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function exporterOffrandes() {
    const an = S.annee;
    const rows = [["Date", "Nature", "Donateur", "Matricule", "Montant (FCFA)", "Moyen", "Référence", "Occasion", "Rassemblement", "Annulée"]];
    (S.offrandes || []).filter((o) => String(o.date || "").startsWith(String(an))).sort((a, b) => cmpFr(a.date, b.date)).forEach((o) => {
      const m = membre(o.membreId), e = o.evenementId ? evt(o.evenementId) : null;
      rows.push([o.date.split("-").reverse().join("/"), o.type || "", donateurOff(o), m ? m.matricule || "" : "", String(o.montant || 0), o.moyen || "", o.piece || "", o.occasion || "", e ? e.titre : "", o.annule ? "oui" : ""]);
    });
    telecharger(`offrandes-${an}.csv`, versCSV(rows));
  }
  /* Une opération annulée ou rétablie dans la caisse se reporte sur la cotisation spéciale ou l’offrande liée. */
  async function synchroAutresOp(op, annule) {
    if (!op) return;
    if (op.speciale && op.speciale.id && op.speciale.vid && speciale(op.speciale.id)) await S.db.doc("cotis_speciales/" + op.speciale.id).update({ versements: { [op.speciale.vid]: { annule: !!annule } }, ...tampon() });
    if (op.offrande && op.offrande.id && offrande(op.offrande.id)) await S.db.doc("offrandes/" + op.offrande.id).update({ annule: !!annule, ...tampon() });
    if (op.projet && op.projet.id && (op.projet.vid || op.projet.did)) {
      const champ = op.projet.vid ? "versements" : "depenses";
      await S.db.doc("projets_fin/" + op.projet.id).update({ [champ]: { [op.projet.vid || op.projet.did]: { annule: !!annule } }, ...tampon() });
    }
  }
  function noteOpLiee(o) {
    if (o.speciale) { const sp = speciale(o.speciale.id); return `<p class="note">Versement pour la cotisation spéciale ${sp ? `<button class="link" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}">« ${esc(sp.titre)} »</button>` : ""}. Pour le corriger, annulez-le puis enregistrez-le de nouveau.</p>`; }
    if (o.projet) { const p = projet(o.projet.id); return `<p class="note">${o.projet.vid ? "Cotisation" : "Dépense"} du projet ${p ? `<button class="link" type="button" data-act="voir-projet" data-id="${esc(p.id)}" data-onglet="finances">« ${esc(p.titre)} »</button>` : ""}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis le projet.</p>`; }
    if (o.offrande) return `<p class="note">${esc(offrande(o.offrande.id) ? offrande(o.offrande.id).type || "Offrande" : "Offrande")} enregistrée depuis le journal des offrandes${offrande(o.offrande.id) ? ` · <button class="link" type="button" data-act="voir-offrande" data-id="${esc(o.offrande.id)}">voir la fiche</button>` : ""}. Pour la corriger, annulez-la puis enregistrez-la de nouveau.</p>`;
    return "";
  }
  function vueCotisationsTout() {
    const cv = S.sous.cotis || "fixes";
    const n = (S.speciales || []).filter(ouverteSp).length;
    let out = sousOnglets("cotis", [["fixes", "Fixes (mensuelles)", null], ["speciales", "Spéciales", S.pret.speciales ? n : null], ["offrandes", "Offrandes, dîmes et dons", null]]);
    if (cv === "speciales") return out + vueSpeciales();
    if (cv === "offrandes") return out + vueOffrandes();
    return out + vueCotisations();
  }
  /* Résumé dans la fiche du membre (direction) */
  function blocCotisAutres(m) {
    let out = "";
    if (S.pret.speciales) {
      const sps = (S.speciales || []).map((sp) => ({ sp, b: bilanSp(sp) })).filter(({ sp, b }) => b.parM[m.id] || (ouverteSp(sp) && b.cible.liste.some((x) => x.id === m.id)));
      if (sps.length) out += `<p class="hint" style="margin:10px 0 4px"><b>Cotisations spéciales</b></p><div class="list">${sps.map(({ sp, b }) => { const v = b.parM[m.id] || 0; const reste = b.mt ? Math.max(0, b.mt - v) : 0; return `<button class="row nolead" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}"><span class="row-main"><span class="row-t">${esc(sp.titre)}</span><span class="row-m">${esc(v ? `${fcfa(v)} versés` : "Aucun versement")}</span></span><span class="row-r">${b.mt ? (reste ? `<span class="chip${v ? " warn" : ""}">Reste ${nb(reste)}</span>` : `<span class="chip ok">Soldé</span>`) : v ? `<span class="chip ok">A contribué</span>` : ""}</span></button>`; }).join("")}</div>`;
    }
    if (S.pret.offrandes) {
      const an = new Date().getFullYear();
      const os = (S.offrandes || []).filter((o) => o.membreId === m.id && !o.annule && String(o.date || "").startsWith(String(an)));
      if (os.length) {
        const parT = {};
        os.forEach((o) => { parT[o.type || "Offrande"] = (parT[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
        out += `<p class="hint" style="margin:10px 0 0"><b>Offrandes, dîmes et dons ${an}</b> : ${esc(Object.entries(parT).map(([t, v]) => `${t} ${fcfa(v)}`).join(" · "))}</p>`;
      }
    }
    return out;
  }
