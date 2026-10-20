  /* ════════════════════════ Voyants du membre ════════════════════════ */
  /* Niveaux : 0 non évalué (gris), 1 vert, 2 jaune, 3 orange, 4 rouge. */
  const NIV_CLS = ["off", "g", "y", "o", "r"];
  const NIV_SANTE = ["Non évalué", "Au vert", "Fragile", "Difficile", "Critique"];
  /* Dimensions de la veille pastorale : modifiables par la direction (Réglages de la veille). */
  const COURT_VEILLE = { physique: "Physique", moral: "Moral", spirituel: "Spirituel", financier: "Finances", professionnel: "Travail", familial: "Famille", relationnel: "Relations" };
  const DIM_VEILLE_DEFAUT = [["physique", "Santé physique"], ["moral", "Moral et émotionnel"], ["spirituel", "Vie spirituelle"], ["financier", "Situation financière"], ["professionnel", "Vie professionnelle ou études"], ["familial", "Famille et couple"], ["relationnel", "Relations et intégration"]];
  DEFAUTS.veilleDims = DIM_VEILLE_DEFAUT.map(([k, l]) => ({ k, l, actif: true }));
  const dimsSante = () => {
    const c = cfg().veilleDims;
    const l = (Array.isArray(c) ? c : []).filter((d) => d && d.k && d.l && d.actif !== false).map((d) => [String(d.k), String(d.l)]);
    return l.length ? l : DIM_VEILLE_DEFAUT;
  };
  /* Tendance d’un voyant : comparaison avec l’évaluation précédente */
  function tendance(s, k, n) {
    if (!s || !s.historique || !n) return 0;
    const h = Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).map(([, x]) => Number(((x || {}).niveaux || {})[k]) || 0).filter((x) => x > 0);
    const prec = h.length > 1 ? h[1] : 0;
    return !prec || prec === n ? 0 : n < prec ? 1 : -1;
  }
  const fleche = (t) => (t > 0 ? `<span class="vy-tend up" title="En amélioration" aria-label="En amélioration">▲</span>` : t < 0 ? `<span class="vy-tend down" title="En dégradation" aria-label="En dégradation">▼</span>` : "");
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
      for (const [k, l] of dimsSante()) {
        const v = sv[k] || {};
        const n = Math.max(0, Math.min(4, Number(v.n) || 0));
        sante.push([k, l, { n, lib: NIV_SANTE[n], detail: v.note || "", tend: tendance(s, k, n), sante: true }]);
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
    const corps = `${led(v.n)}<span class="vy-x"><span class="vy-l">${esc(l)}${v.force ? `<span class="vy-f">ajusté</span>` : ""}</span><b class="vy-v">${esc(v.lib)}${fleche(v.tend)}</b>${v.detail ? `<span class="vy-d">${esc(v.detail)}</span>` : ""}</span>`;
    if (mid && peutAdmin() && S.pret.suivi) return `<button class="vy-t edit" type="button" data-act="${v.sante ? "veille-niveau" : "evaluer-membre"}" data-id="${esc(mid)}" data-k="${esc(k)}" aria-label="${esc(`Modifier le voyant ${l} : ${v.lib}`)}">${corps}${I("i-edit", "ico vy-e")}</button>`;
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
        out += `<p class="vy-sep">${I("i-lock")}Veille pastorale · visible par la direction seulement${adm ? " · touchez un voyant pour le changer" : ""}</p><div class="vy-grid">${v.sante.map((x) => tuileVoyant(x, m.id)).join("")}</div>`;
        if (s && s.besoin) out += `<p class="note" style="margin:10px 0 0"><b>Accompagnement :</b> ${esc(s.besoin)}</p>`;
        if (s && s.evalueLe) out += `<p class="hint" style="margin-top:8px">Mis à jour le ${esc(fmtStamp(s.evalueLe))}${s.evaluePar ? ` par ${esc(nomDe(s.evaluePar))}` : ""}.</p>`;
        const hist = s && s.historique ? Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).slice(1, 6) : [];
        if (hist.length) out += `<details class="vy-hist"><summary>Évaluations précédentes (${nb(hist.length)})</summary><ul>${hist.map(([ts, h]) => `<li><span>${esc(fmtJour(h.date || isoJour(new Date(Number(ts)))))}</span><span class="vy-mini">${dimsSante().map(([k, l]) => `<span title="${esc(`${l} : ${NIV_SANTE[(h.niveaux || {})[k] || 0]}`)}">${led((h.niveaux || {})[k] || 0)}</span>`).join("")}</span></li>`).join("")}</ul></details>`;
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
      <h3 class="h3">Veille pastorale</h3>
      <p class="hint">Observations pastorales, pas de diagnostic médical ni de jugement : elles servent à accompagner le soldat.</p>
      ${dimsSante().map(ligneSante).join("")}
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
    for (const [k] of dimsSante()) {
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
  /* Évaluation rapide d’un voyant de veille : un toucher sur un niveau l’enregistre */
  const VR = { retour: false };
  function ouvrirVeilleRapide(mid, k) {
    const m = membre(mid);
    const d = dimsSante().find(([x]) => x === k);
    if (!m || !d) return;
    const s = suiviDe(mid) || {};
    const v = s[k] || {};
    const cur = Number(v.n) || 0;
    const hist = s.historique ? Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).map(([ts, h]) => ({ ts: Number(ts), n: Number(((h || {}).niveaux || {})[k]) || 0, note: ((h || {}).notes || {})[k] || "" })).filter((x) => x.n > 0).slice(0, 8) : [];
    const html = `<div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(d[1])}</p></div></div>
      <p class="hint">Touchez un niveau : il est enregistré aussitôt, avec l’observation ci-dessous.</p>
      ${champ("vr-note", "Observation (facultatif)", zone("vr-note", "note", v.note || "", 'rows="2" maxlength="400" placeholder="Ce que vous avez constaté, ce qui est prévu…"'))}
      <div class="vr-niveaux" role="group" aria-label="Niveau">${[1, 2, 3, 4, 0].map((n) => `<button class="vr-n ${NIV_CLS[n]}${n === cur ? " on" : ""}" type="button" data-act="veille-choisir" data-id="${esc(mid)}" data-k="${esc(k)}" data-n="${n}" aria-pressed="${n === cur}">${led(n, true)}<b>${esc(NIV_SANTE[n])}</b></button>`).join("")}</div>
      ${hist.length ? `<details class="vy-hist" open><summary>Évolution (${nb(hist.length)})</summary><div class="vr-courbe">${hist.slice().reverse().map((x) => `<span title="${esc(`${fmtJour(isoJour(new Date(x.ts)))} : ${NIV_SANTE[x.n]}${x.note ? " · " + x.note : ""}`)}">${led(x.n)}<small>${esc(fmtCourt(isoJour(new Date(x.ts))))}</small></span>`).join("")}</div></details>` : ""}
      <div class="btn-row" style="margin-top:12px">${btn("evaluer-membre", "Évaluation complète", { ico: "i-edit", sm: true, data: `data-id="${esc(mid)}" data-k="${esc(k)}"` })}</div>`;
    VR.retour = !$("#sheet").hidden && !!document.querySelector("#sheet .voyants");
    ouvrir({ titre: "Veille pastorale", html });
  }
  async function enregistrerVeilleRapide(mid, k, n) {
    const s = suiviDe(mid) || {};
    const note = String(($("#vr-note") || {}).value || "").trim();
    const niveaux = {};
    for (const [x] of dimsSante()) niveaux[x] = x === k ? n : Number((s[x] || {}).n) || 0;
    const ts = String(Date.now());
    const data = { [k]: { n, note }, membreId: mid, evalueLe: Date.now(), evaluePar: S.me.id || null, historique: { [ts]: { date: aujourdhui(), niveaux, notes: { [k]: note }, par: S.me.id || null, rapide: k } } };
    document.querySelectorAll(".vr-n").forEach((b) => { b.disabled = true; });
    const ok = await ecrire(() => upsert("suivi/" + mid, data), `${(dimsSante().find(([x]) => x === k) || ["", "Voyant"])[1]} : ${NIV_SANTE[n]}`);
    if (ok) { if (VR.retour) ouvrirMembre(mid); else fermer(); } else document.querySelectorAll(".vr-n").forEach((b) => { b.disabled = false; });
  }
  /* Réglages de la veille : dimensions suivies (ajouter, renommer, masquer) */
  function ficheDimsVeille() {
    const c = cfg().veilleDims;
    const l = Array.isArray(c) && c.length ? c : DIM_VEILLE_DEFAUT.map(([k, x]) => ({ k, l: x, actif: true }));
    return `<form class="form" id="f-dims-veille" novalidate><p class="hint" style="margin-top:0">Ces dimensions apparaissent dans la fiche de chaque membre et dans le tableau de veille. Une dimension masquée garde son historique.</p>
      <div class="list">${l.map((d, i) => `<div class="row nolead dv-row"><label class="check"><input type="checkbox" name="actif_${i}"${d.actif !== false ? " checked" : ""}> <span class="sr">Suivre</span></label><input type="hidden" name="k_${i}" value="${esc(d.k)}"><label class="sr" for="dv-${i}">Nom de la dimension</label><input class="inp" id="dv-${i}" name="l_${i}" value="${esc(d.l)}" maxlength="60" required></div>`).join("")}</div>
      ${champ("dv-nouv", "Ajouter une dimension", inp("dv-nouv", "nouvelle", "", 'maxlength="60" placeholder="Par exemple : Logement, Santé mentale, Ministère…"'))}
      <input type="hidden" name="n" value="${l.length}">${pied("Enregistrer les dimensions")}</form>`;
  }
  async function enregistrerDimsVeille(fd) {
    const n = Number(fd.get("n")) || 0;
    const l = [];
    for (let i = 0; i < n; i += 1) { const lib = String(fd.get("l_" + i) || "").trim(); if (lib) l.push({ k: String(fd.get("k_" + i)), l: lib.slice(0, 60), actif: fd.get("actif_" + i) === "on" }); }
    const nouv = String(fd.get("nouvelle") || "").trim();
    if (nouv) l.push({ k: "d" + Date.now().toString(36), l: nouv.slice(0, 60), actif: true });
    if (!l.some((d) => d.actif)) { erreurForm("Gardez au moins une dimension suivie."); return; }
    const ok = await ecrire(() => S.db.doc("config/general").update({ veilleDims: l, ...tampon() }), "Dimensions de la veille enregistrées");
    if (ok) fermer();
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
    const adm = peutAdmin();
    const dims = dimsSante();
    const actifs = membresActifs();
    const lignes = actifs.map((m) => ({ m, v: voyantsDe(m), s: suiviDe(m.id) }));
    const q = norm(f.q || "");
    const val = (x, k) => (x.v.auto.concat(x.v.sante).find((y) => y[0] === k) || [, , { n: 0 }])[2].n;
    const filt = lignes.filter((x) => (f.filtre === "alerte" ? x.v.global >= 2 : f.filtre === "nonevalue" ? !(x.s && x.s.evalueLe) : f.filtre === "echus" ? x.s && x.s.prochainSuivi && x.s.prochainSuivi <= aujourdhui() : true)
      && (!f.dim || val(x, f.dim) >= 3) && (!q || norm(`${nomComplet(x.m)} ${x.m.matricule || ""}`).includes(q)))
      .sort((a, b) => (f.dim ? val(b, f.dim) - val(a, f.dim) : 0) || b.v.global - a.v.global || parNom(a.m, b.m));
    const cols = [["implication", "Implic.", "Implication"], ["assiduite", "Assid.", "Assiduité"], ["cotis", "Cotis.", "Cotisations"], ["discipline", "Discip.", "Discipline"]].concat(dims.map(([k, l]) => [k, COURT_VEILLE[k] || (l.length > 10 ? l.slice(0, 9) + "." : l), l]));
    const alertes = dims.map(([k, l]) => ({ k, l, n: lignes.filter((x) => val(x, k) >= 3).length }));
    const cpt = [0, 0, 0, 0, 0]; lignes.forEach((x) => { cpt[x.v.global] += 1; });
    let out = `<p class="note">${I("i-lock")} Veille pastorale réservée à la direction. Les quatre premiers voyants se calculent seuls (présences, engagements, cotisations, discipline) ; les autres viennent de l’observation pastorale.${adm ? " <b>Touchez un voyant pour le changer</b> : il est enregistré aussitôt." : ""}</p>
      <div class="vw-resume">${[4, 3, 2, 1, 0].map((n) => `<div class="vw-c ${NIV_CLS[n]}">${led(n, true)}<b>${nb(cpt[n])}</b><span>${esc(ETAT_GLOBAL[n])}</span></div>`).join("")}</div>
      <div class="vw-dims" role="group" aria-label="Difficultés par dimension">${alertes.map((a) => `<button class="chip-btn${f.dim === a.k ? " on" : ""}${a.n ? " vw-a" : ""}" type="button" data-act="veille-dim" data-k="${esc(a.k)}" aria-pressed="${f.dim === a.k}">${esc(a.l)} <b>${nb(a.n)}</b></button>`).join("")}${f.dim ? `<button class="link" type="button" data-act="veille-dim" data-k="">Toutes les dimensions</button>` : ""}</div>
      <div class="filters"><div class="chips" role="group" aria-label="Filtrer">${[["tous", "Tous"], ["alerte", "À surveiller et plus"], ["nonevalue", "Non évalués"], ["echus", "Suivis à faire"]].map(([id, l]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="voyants-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l}</button>`).join("")}</div><label class="sr" for="vw-q">Rechercher un membre</label><input class="inp vw-q" id="vw-q" type="search" placeholder="Rechercher un membre…" value="${esc(f.q || "")}" autocomplete="off">${adm ? btn("veille-dims", "Dimensions suivies", { ico: "i-sliders", sm: true }) : ""}</div>
      <div class="legend" style="margin:-4px 0 10px">${[1, 2, 3, 4, 0].map((n) => `<span>${led(n)}${esc(n ? NIV_SANTE[n] : "Non évalué")}</span>`).join("")}<span><span class="vy-tend up">▲</span> en mieux</span><span><span class="vy-tend down">▼</span> en baisse</span></div>`;
    if (!filt.length) return out + vide("i-check", "Aucun membre ne correspond.");
    out += `<div class="table-wrap"><table class="t vy-table"><thead><tr><th scope="col">Membre</th><th scope="col" title="État général">État</th>${cols.map(([k, c, l]) => `<th scope="col" title="${esc(l)}"${f.dim === k ? ' class="vw-on"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${filt.map(({ m, v }) => {
      const tous = Object.fromEntries(v.auto.concat(v.sante).map(([k, , x]) => [k, x]));
      return `<tr><th scope="row"><button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button></th><td title="${esc(ETAT_GLOBAL[v.global])}">${led(v.global)}<span class="sr">${esc(ETAT_GLOBAL[v.global])}</span></td>${cols.map(([k, , l]) => {
        const x = tous[k];
        if (!x) return `<td class="na">–</td>`;
        const t = esc(`${l} : ${x.lib}${x.detail ? " · " + x.detail : ""}`);
        const contenu = `${led(x.n)}${fleche(x.tend)}<span class="sr">${t}</span>`;
        return adm ? `<td><button class="vw-cell" type="button" data-act="${x.sante ? "veille-niveau" : "evaluer-membre"}" data-id="${esc(m.id)}" data-k="${esc(k)}" title="${t}" aria-label="${t}">${contenu}</button></td>` : `<td title="${t}">${contenu}</td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
    return out;
  }
  document.addEventListener("input", (ev) => {
    if (ev.target && ev.target.id === "vw-q") { S.f.voyants.q = ev.target.value; const pos = ev.target.selectionStart; render(); const el = $("#vw-q"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* sans effet */ } } }
  });
