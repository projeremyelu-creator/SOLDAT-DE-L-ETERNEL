  /* ════════════════════════ Voyants du membre ════════════════════════ */
  /* Niveaux : 0 non évalué (gris), 1 vert, 2 jaune, 3 orange, 4 rouge. */
  const NIV_CLS = ["off", "g", "y", "o", "r"];
  const NIV_SANTE = ["Non évaluée", "Bonne", "Fragile", "Préoccupante", "Critique"];
  const DIM_SANTE = [["physique", "Santé physique"], ["moral", "Santé morale"], ["spirituel", "Santé spirituelle"], ["financier", "Santé financière"]];
  const ETAT_GLOBAL = ["Non évalué", "Au vert", "À surveiller", "Préoccupant", "Alerte"];
  const suiviDe = (mid) => (S.suivi || []).find((d) => d.id === mid) || null;
  function implication(m) {
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    const facteurs = [];
    let autres = 0;
    const fonction = String(m.fonction || "").trim();
    const resp = S.garnisons.some((g) => g.responsableId === m.id || g.adjointId === m.id);
    if (fonction || resp) { autres += 15; facteurs.push(resp ? "encadre une garnison" : "exerce une fonction"); }
    const eng = norm(m.statut || "");
    if (/engage|leader|co-leader/.test(eng)) { autres += 15; facteurs.push(m.statut); }
    if (S.pret.formations && formationsDe(m.id).some(({ p }) => p.statut === "Inscrit" || p.statut === "Certifié")) { autres += 10; facteurs.push("en formation à l’Académie"); }
    if (S.pret.chaine && creneauxDe(m.id).length) { autres += 10; facteurs.push("intercesseur de la chaîne"); }
    let score;
    if (s3.taux == null) {
      if (!autres) return { n: 0, score: null, lib: "Données insuffisantes", detail: "Aucun rassemblement pointé depuis trois mois.", facteurs };
      score = Math.round((autres / 50) * 100 * 0.8);
    } else {
      score = Math.round(s3.taux * 50 + autres);
      facteurs.unshift(`${pct(s3.taux)} de présence`);
    }
    const n = score >= 70 ? 1 : score >= 45 ? 2 : score >= 25 ? 3 : 4;
    return { n, score, lib: ["", "Forte", "Moyenne", "Faible", "Très faible"][n], detail: facteurs.join(" · ") || "Présence seule", facteurs };
  }
  function voyantAssiduite(m) {
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    if (s3.taux == null) return { n: 0, lib: "Sans données", detail: "Aucun rassemblement pointé depuis trois mois" };
    const n = s3.taux >= 0.75 ? 1 : s3.taux >= 0.5 ? 2 : s3.taux >= 0.3 ? 3 : 4;
    return { n, lib: pct(s3.taux), detail: `${pluriel(s3.p + s3.r, "présence", "présences")} sur ${nb(s3.n - s3.x)} · 3 mois` };
  }
  function voyantCotis(m) {
    const an = new Date().getFullYear();
    const e = etatCotis(m, an);
    if (e.exempt) return { n: 0, lib: "Exempté", detail: "Exemption de cotisation" };
    if (!e.dus.length) return { n: 0, lib: "Rien de dû", detail: `Aucun mois dû en ${an}` };
    const k = e.retard.length;
    const n = k === 0 ? 1 : k === 1 ? 2 : k === 2 ? 3 : 4;
    return { n, lib: k ? `${k} mois dû${k > 1 ? "s" : ""}` : "À jour", detail: k ? libListeMois(e.retard, an) : `${fcfa(e.verse)} versés en ${an}` };
  }
  function voyantDiscipline(m) {
    const enC = S.discipline.filter((d) => d.membreId === m.id && mesureEnCours(d));
    if (!enC.length) return { n: 1, lib: "Aucune mesure", detail: "Pas de mesure en cours" };
    const grave = enC.some((d) => /suspension/i.test(d.mesure || ""));
    return { n: grave ? 4 : 3, lib: enC.length > 1 ? `${enC.length} mesures` : "Mesure en cours", detail: enC.map((d) => d.mesure || d.motif).filter(Boolean).join(" · ") };
  }
  /* Les voyants calculés peuvent être ajustés à la main par la direction (forçage), puis remis en automatique. */
  const LIB_AUTO = {
    implication: ["", "Forte", "Moyenne", "Faible", "Très faible"],
    assiduite: ["", "Excellente", "Régulière", "Irrégulière", "À relancer"],
    cotis: ["", "À jour", "Léger retard", "Retard", "Retard important"],
    discipline: ["", "Aucune mesure", "Avertissement", "Mesure en cours", "Mesure grave"],
    global: ETAT_GLOBAL,
  };
  const DIM_AUTO = [["implication", "Implication"], ["assiduite", "Assiduité"], ["cotis", "Cotisations"], ["discipline", "Discipline"]];
  function forcage(s, k) {
    const f = s && s.forcages && s.forcages[k];
    const n = f ? Number(f.n) || 0 : 0;
    return n >= 1 && n <= 4 ? { n, note: f.note || "", le: f.le || null, par: f.par || null } : null;
  }
  function voyantsDe(m) {
    const auto = [["implication", "Implication", implication(m)], ["assiduite", "Assiduité", voyantAssiduite(m)]];
    if (accesDirection()) {
      if (S.pret.cotisations) auto.push(["cotis", "Cotisations", voyantCotis(m)]);
      if (S.pret.discipline) auto.push(["discipline", "Discipline", voyantDiscipline(m)]);
    }
    const s = accesDirection() && S.pret.suivi ? suiviDe(m.id) : null;
    for (const x of auto) {
      const f = forcage(s, x[0]);
      if (f) x[2] = { n: f.n, lib: LIB_AUTO[x[0]][f.n], detail: f.note || `Calcul automatique : ${x[2].lib}`, force: true, calcule: x[2] };
    }
    const sante = [];
    if (s || (accesDirection() && S.pret.suivi)) {
      const sv = s || {};
      for (const [k, l] of DIM_SANTE) {
        const v = sv[k] || {};
        const n = Math.max(0, Math.min(4, Number(v.n) || 0));
        sante.push([k, l, { n, lib: NIV_SANTE[n], detail: v.note || "" }]);
      }
    }
    // L’état général suit l’implication, l’assiduité, la discipline et la santé ; un retard de cotisation garde son propre voyant.
    const tous = auto.concat(sante).filter((x) => x[0] !== "cotis").map((x) => x[2].n).filter((n) => n > 0);
    const calcule = tous.length ? Math.max(...tous) : 0;
    const fg = forcage(s, "global");
    return { auto, sante, global: fg ? fg.n : calcule, globalCalcule: calcule, globalForce: fg };
  }
  const led = (n, grand) => `<span class="led ${NIV_CLS[n] || "off"}${grand ? " lg" : ""}" aria-hidden="true"></span>`;
  function tuileVoyant([k, l, v], mid) {
    const corps = `${led(v.n)}<span class="vy-x"><span class="vy-l">${esc(l)}${v.force ? `<span class="vy-f">ajusté</span>` : ""}</span><b class="vy-v">${esc(v.lib)}</b>${v.detail ? `<span class="vy-d">${esc(v.detail)}</span>` : ""}</span>`;
    if (mid && peutAdmin() && S.pret.suivi) return `<button class="vy-t edit" type="button" data-act="evaluer-membre" data-id="${esc(mid)}" data-k="${esc(k)}" aria-label="${esc(`Modifier le voyant ${l} : ${v.lib}`)}">${corps}${I("i-edit", "ico vy-e")}</button>`;
    return `<div class="vy-t" data-k="${esc(k)}">${corps}</div>`;
  }
  function blocVoyants(m) {
    const v = voyantsDe(m);
    const s = accesDirection() && S.pret.suivi ? suiviDe(m.id) : null;
    const adm = peutAdmin() && S.pret.suivi;
    const relance = s && s.prochainSuivi ? (s.prochainSuivi <= aujourdhui() ? `<span class="chip warn">Suivi prévu ${esc(relLong(s.prochainSuivi))}</span>` : `<span class="chip">Prochain suivi le ${esc(fmtJour(s.prochainSuivi))}</span>`) : "";
    const gNote = v.globalForce ? `<p class="vy-d" style="margin:2px 0 0">${esc(v.globalForce.note || `Calcul automatique : ${ETAT_GLOBAL[v.globalCalcule]}`)}</p>` : "";
    let out = `<section class="voyants" aria-label="Voyants du membre">
      <div class="vy-h">${led(v.global, true)}<div><p class="vy-k">État général${v.globalForce ? `<span class="vy-f">ajusté</span>` : ""}</p><p class="vy-g">${esc(ETAT_GLOBAL[v.global])}</p>${gNote}</div>${relance}${adm ? btn("evaluer-membre", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(m.id)}" data-k="global"` }) : ""}</div>
      <div class="vy-grid">${v.auto.map((x) => tuileVoyant(x, m.id)).join("")}</div>`;
    if (accesDirection()) {
      if (!S.pret.suivi) out += chargement("Lecture du suivi pastoral…");
      else {
        out += `<p class="vy-sep">${I("i-lock")}Santé du soldat · visible par la direction seulement</p><div class="vy-grid">${v.sante.map((x) => tuileVoyant(x, m.id)).join("")}</div>`;
        if (s && s.besoin) out += `<p class="note" style="margin:10px 0 0"><b>Accompagnement :</b> ${esc(s.besoin)}</p>`;
        if (s && s.evalueLe) out += `<p class="hint" style="margin-top:8px">Mis à jour le ${esc(fmtStamp(s.evalueLe))}${s.evaluePar ? ` par ${esc(nomDe(s.evaluePar))}` : ""}.</p>`;
        const hist = s && s.historique ? Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).slice(1, 6) : [];
        if (hist.length) out += `<details class="vy-hist"><summary>Évaluations précédentes (${nb(hist.length)})</summary><ul>${hist.map(([ts, h]) => `<li><span>${esc(fmtJour(h.date || isoJour(new Date(Number(ts)))))}</span><span class="vy-mini">${DIM_SANTE.map(([k, l]) => `<span title="${esc(`${l} : ${NIV_SANTE[(h.niveaux || {})[k] || 0]}`)}">${led((h.niveaux || {})[k] || 0)}</span>`).join("")}</span></li>`).join("")}</ul></details>`;
        if (adm) out += `<div class="btn-row" style="margin-top:12px">${btn("evaluer-membre", s ? "Mettre à jour les voyants" : "Évaluer l’état du soldat", { ico: "i-edit", sm: true, data: `data-id="${esc(m.id)}"` })}</div>`;
      }
    }
    return out + `</section>`;
  }
  function ouvrirEvaluation(mid, focus) {
    const m = membre(mid);
    if (!m) return;
    const s = suiviDe(mid) || {};
    const v = voyantsDe(m);
    const options = (k, libs, cur, autoTxt, autoN) => `<div class="eval-c" role="radiogroup">${autoTxt != null ? `<label class="eval-o"><input type="radio" name="${k}" value="0"${cur === 0 ? " checked" : ""}><span>${led(autoN)}Automatique · ${esc(autoTxt)}</span></label>` : ""}${libs.map((t, n) => (n === 0 && autoTxt != null ? "" : `<label class="eval-o ${NIV_CLS[n]}"><input type="radio" name="${k}" value="${n}"${n === cur ? " checked" : ""}><span>${led(n)}${esc(t)}</span></label>`)).join("")}</div>`;
    const ligneAuto = ([k, l]) => {
      const x = v.auto.find((y) => y[0] === k);
      if (!x) return "";
      const calc = x[2].calcule || x[2];
      const f = forcage(s, k);
      return `<fieldset class="fs eval" id="ev-${k}"><legend>${esc(l)}</legend>${options("f_" + k, LIB_AUTO[k], f ? f.n : 0, calc.lib, calc.n)}
        ${inp("e-f-" + k, "f_" + k + "Note", f ? f.note : "", `autocomplete="off" placeholder="Motif de l’ajustement (facultatif)" aria-label="Motif : ${esc(l)}"`)}</fieldset>`;
    };
    const fg = forcage(s, "global");
    const ligneSante = ([k, l]) => {
      const cur = Number((s[k] || {}).n) || 0;
      return `<fieldset class="fs eval" id="ev-${k}"><legend>${esc(l)}</legend>${options(k, NIV_SANTE, cur, null, 0)}
        ${inp("e-" + k, k + "Note", (s[k] || {}).note || "", `autocomplete="off" placeholder="Observation (facultatif)" aria-label="Observation : ${esc(l)}"`)}</fieldset>`;
    };
    const html = `<form class="form" id="f-eval" novalidate>
      <div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc([m.matricule, m.fonction].filter(Boolean).join(" · "))}</p></div></div>
      <p class="note">${I("i-lock")} Visible uniquement par le propriétaire et les éditeurs. « Automatique » laisse l’application calculer le voyant ; choisissez un niveau pour l’ajuster selon votre connaissance du soldat.</p>
      <fieldset class="fs eval" id="ev-global"><legend>État général</legend>${options("f_global", ETAT_GLOBAL, fg ? fg.n : 0, ETAT_GLOBAL[v.globalCalcule], v.globalCalcule)}
        ${inp("e-f-global", "f_globalNote", fg ? fg.note : "", 'autocomplete="off" placeholder="Motif de l’ajustement (facultatif)" aria-label="Motif : état général"')}</fieldset>
      <h3 class="h3">Voyants calculés</h3>
      ${DIM_AUTO.map(ligneAuto).join("")}
      <h3 class="h3">Santé du soldat</h3>
      <p class="hint">Observations pastorales, pas de diagnostic médical.</p>
      ${DIM_SANTE.map(ligneSante).join("")}
      ${champ("e-besoin", "Accompagnement prévu", zone("e-besoin", "besoin", s.besoin || "", 'rows="3" placeholder="Visite, prière, aide matérielle, orientation…"'))}
      ${champ("e-suivi", "Prochain suivi", inp("e-suivi", "prochainSuivi", s.prochainSuivi || "", 'type="date"'), { hint: "Le tableau de bord rappelle les suivis arrivés à échéance." })}
      ${pied("Enregistrer les voyants")}
    </form>`;
    ouvrir({
      titre: "Voyants du soldat", html, wide: true, onSubmit: (fd, form) => enregistrerEvaluation(fd, form, mid),
      apres: (sheet) => {
        if (!focus) return;
        const fs = sheet.querySelector("#ev-" + CSS.escape(focus));
        if (!fs) return;
        fs.scrollIntoView({ block: "center" });
        fs.classList.add("vise");
        const r = fs.querySelector("input:checked") || fs.querySelector("input");
        if (r) r.focus({ preventScroll: true });
      },
    });
  }
  async function enregistrerEvaluation(fd, form, mid) {
    const data = {};
    const niveaux = {};
    const borne = (x) => Math.max(0, Math.min(4, Number(x) || 0));
    for (const [k] of DIM_SANTE) {
      const n = borne(fd.get(k));
      niveaux[k] = n;
      data[k] = { n, note: String(fd.get(k + "Note") || "").trim() };
    }
    const forcages = {};
    const forces = {};
    for (const k of ["global", ...DIM_AUTO.map((x) => x[0])]) {
      if (fd.get("f_" + k) === null) continue;
      const n = borne(fd.get("f_" + k));
      forcages[k] = { n, note: n ? String(fd.get("f_" + k + "Note") || "").trim() : "", le: Date.now(), par: S.me.id || null };
      forces[k] = n;
    }
    data.forcages = forcages;
    data.besoin = String(fd.get("besoin") || "").trim();
    data.prochainSuivi = String(fd.get("prochainSuivi") || "");
    data.membreId = mid;
    data.evalueLe = Date.now();
    data.evaluePar = S.me.id || null;
    data.historique = { [String(Date.now())]: { date: aujourdhui(), niveaux, forces, par: S.me.id || null } };
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(() => upsert("suivi/" + mid, data), "Voyants mis à jour");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirMembre(mid);
  }
  /* Pastille d’état dans les listes (direction) */
  function pastilleEtat(m) {
    if (!accesDirection() || !S.pret.suivi) return "";
    const n = voyantsDe(m).global;
    return n >= 2 ? `<span class="led-s ${NIV_CLS[n]}" title="${esc(ETAT_GLOBAL[n])}" role="img" aria-label="${esc(ETAT_GLOBAL[n])}"></span>` : "";
  }
  function carteVeille() {
    const pied = `<button class="link" type="button" data-act="aller-veille">Voir tous les membres</button>`;
    if (!S.pret.suivi || !S.pret.membres) return carte("Veille pastorale", chargement("Lecture des voyants…"));
    const actifs = membresActifs();
    const etats = actifs.map((m) => ({ m, v: voyantsDe(m), s: suiviDe(m.id) }));
    const cpt = [0, 0, 0, 0, 0];
    etats.forEach((x) => { cpt[x.v.global] += 1; });
    const alerte = etats.filter((x) => x.v.global >= 3).sort((a, b) => b.v.global - a.v.global || parNom(a.m, b.m));
    const echus = etats.filter((x) => x.s && x.s.prochainSuivi && x.s.prochainSuivi <= aujourdhui());
    const evalues = etats.filter((x) => x.s && x.s.evalueLe).length;
    const corps = `<div class="vy-bar" role="img" aria-label="${esc(`${cpt[1]} au vert, ${cpt[2]} à surveiller, ${cpt[3]} préoccupants, ${cpt[4]} en alerte, ${cpt[0]} non évalués`)}">${[1, 2, 3, 4, 0].map((n) => cpt[n] ? `<i class="${NIV_CLS[n]}" style="flex:${cpt[n]}"></i>` : "").join("")}</div>
      <div class="legend" style="margin-top:8px">${[1, 2, 3, 4].map((n) => `<span>${led(n)}${esc(ETAT_GLOBAL[n])} <b>${nb(cpt[n])}</b></span>`).join("")}</div>
      ${alerte.length ? `<div class="list" style="margin-top:10px">${alerte.slice(0, 4).map((x) => `<button class="row" type="button" data-act="voir-membre" data-id="${esc(x.m.id)}">${avatar(x.m)}<span class="row-main"><span class="row-t">${esc(nomComplet(x.m))}</span><span class="row-m">${esc(x.v.auto.concat(x.v.sante).filter((y) => y[2].n >= 3).map((y) => y[1]).join(" · "))}</span></span><span class="row-r">${led(x.v.global)}</span></button>`).join("")}</div>` : `<p class="hint" style="margin-top:10px">Aucun membre en état préoccupant.</p>`}
      ${echus.length ? `<p class="note warn" style="margin:10px 0 0">${pluriel(echus.length, "suivi pastoral arrivé", "suivis pastoraux arrivés")} à échéance.</p>` : ""}
      <p class="hint" style="margin-top:8px">${pluriel(evalues, "soldat évalué", "soldats évalués")} sur ${nb(actifs.length)}.</p>`;
    return carte("Veille pastorale", corps, { pied });
  }
  function vueVoyants() {
    if (!S.pret.suivi) return chargement("Lecture des voyants…");
    const f = S.f.voyants;
    const actifs = membresActifs();
    const lignes = actifs.map((m) => ({ m, v: voyantsDe(m), s: suiviDe(m.id) }));
    const filt = lignes.filter((x) => (f.filtre === "alerte" ? x.v.global >= 2 : f.filtre === "nonevalue" ? !(x.s && x.s.evalueLe) : f.filtre === "echus" ? x.s && x.s.prochainSuivi && x.s.prochainSuivi <= aujourdhui() : true))
      .sort((a, b) => b.v.global - a.v.global || parNom(a.m, b.m));
    const cols = [["implication", "Implic."], ["assiduite", "Assid."], ["cotis", "Cotis."], ["discipline", "Discip."], ["physique", "Phys."], ["moral", "Moral"], ["spirituel", "Spirit."], ["financier", "Financ."]];
    const titres = { implication: "Implication", assiduite: "Assiduité", cotis: "Cotisations", discipline: "Discipline", physique: "Santé physique", moral: "Santé morale", spirituel: "Santé spirituelle", financier: "Santé financière" };
    let out = `<p class="note">${I("i-lock")} Tableau réservé à la direction. Les quatre premiers voyants se calculent seuls à partir des présences, des engagements, des cotisations et de la discipline ; les quatre voyants de santé viennent de l’évaluation pastorale saisie dans chaque fiche.</p>
      <div class="filters"><div class="chips" role="group" aria-label="Filtrer">${[["tous", "Tous"], ["alerte", "À surveiller et plus"], ["nonevalue", "Non évalués"], ["echus", "Suivis à faire"]].map(([id, l]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="voyants-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l}</button>`).join("")}</div></div>
      <div class="legend" style="margin:-4px 0 10px">${[1, 2, 3, 4, 0].map((n) => `<span>${led(n)}${esc(n ? ETAT_GLOBAL[n] : "Non évalué")}</span>`).join("")}</div>`;
    if (!filt.length) return out + vide("i-check", "Aucun membre ne correspond.");
    out += `<div class="table-wrap"><table class="t vy-table"><thead><tr><th scope="col">Membre</th><th scope="col" title="État général">État</th>${cols.map(([k, l]) => `<th scope="col" title="${esc(titres[k])}">${esc(l)}</th>`).join("")}</tr></thead><tbody>${filt.map(({ m, v }) => {
      const tous = Object.fromEntries(v.auto.concat(v.sante).map(([k, , x]) => [k, x]));
      return `<tr><th scope="row"><button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button></th><td title="${esc(ETAT_GLOBAL[v.global])}">${led(v.global)}<span class="sr">${esc(ETAT_GLOBAL[v.global])}</span></td>${cols.map(([k]) => { const x = tous[k]; return x ? `<td title="${esc(`${titres[k]} : ${x.lib}${x.detail ? " · " + x.detail : ""}`)}">${led(x.n)}<span class="sr">${esc(`${titres[k]} : ${x.lib}`)}</span></td>` : `<td class="na">–</td>`; }).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
    return out;
  }
