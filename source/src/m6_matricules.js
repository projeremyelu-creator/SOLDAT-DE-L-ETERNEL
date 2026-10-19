  /* ════════════════════════ Matricules ════════════════════════ */
  const CODES_PAYS = { CIV: "CI", TUN: "TN", BFA: "BF", ITA: "IT", CAN: "CA", USA: "US", FRA: "FR", BEL: "BE", CHE: "CH", SEN: "SN", MLI: "ML", TGO: "TG", BEN: "BJ", GHA: "GH", CMR: "CM", GAB: "GA", COD: "CD", GBR: "GB", DEU: "DE", ESP: "ES" };
  const normMat = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");
  function porteurMatricule(mat, saufId) {
    const k = normMat(mat);
    return k ? S.membres.find((x) => x.id !== saufId && normMat(x.matricule) === k) || null : null;
  }
  const anciensMat = (m, ancien, nouveau) => { const a = [...new Set([...(m.anciensMatricules || []), normMat(ancien)].filter(Boolean))].filter((x) => x !== normMat(nouveau)); return a.slice(-10); };
  /* — Un seul membre — */
  function ouvrirMatricule(mid) {
    const m = membre(mid);
    if (!m) return;
    const html = `<form class="form" id="f-mat" novalidate>
      <div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(m.matricule ? `Matricule actuel : ${m.matricule}` : "Pas encore de matricule")}</p></div></div>
      ${champ("mt-val", "Nouveau matricule", inp("mt-val", "matricule", m.matricule || prochainMatricule(), 'autocomplete="off" autocapitalize="characters" required autofocus'), { req: true, hint: `Prochain numéro libre : ${esc(prochainMatricule())}.` })}
      <p class="note">La carte de membre et les attestations porteront le nouveau matricule. Les documents déjà imprimés restent vérifiables avec l’ancien.</p>
      ${(m.anciensMatricules || []).length ? `<p class="hint">Anciens matricules : ${esc(m.anciensMatricules.join(", "))}</p>` : ""}
      ${pied("Enregistrer le matricule")}
    </form>`;
    ouvrir({ titre: "Matricule", html, onSubmit: async (fd, form) => {
      const nv = normMat(fd.get("matricule"));
      if (!nv) { erreurForm("Indiquez le matricule."); return; }
      if (nv === normMat(m.matricule)) { ouvrirMembre(mid); return; }
      const pris = porteurMatricule(nv, mid);
      if (pris) { erreurForm(`Le matricule ${nv} est déjà attribué à ${nomComplet(pris)}.`); return; }
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => S.db.doc("membres/" + mid).update({ matricule: nv, anciensMatricules: anciensMat(m, m.matricule, nv), ...tampon() }), `Matricule ${nv} enregistré`);
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirMembre(mid);
    } });
  }
  /* — Tous les membres : tableau et renumérotation — */
  const MT = { onglet: "tableau", saisies: {}, opts: null };
  const OPTS_MAT = () => ({ prefixe: "SDE", sep: "-", point: false, annee: false, chiffres: 4, depart: 1, ordre: "matricule", parPoint: false, archives: true });
  function membresMat() { return S.membres.slice().sort((a, b) => (a.actif === false) - (b.actif === false) || cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b)); }
  function codePoint(m) {
    const pt = m.garnisonId ? pointDeGarnison(m.garnisonId) : null;
    const iso = pt ? isoDePays(pt.pays) : m.garnisonId ? paysDeGarnison(m.garnisonId) : "";
    return iso ? CODES_PAYS[iso] || iso.slice(0, 2) : "XX";
  }
  function planRenum(o) {
    const base = S.membres.filter((m) => o.archives || m.actif !== false);
    const tri = base.slice().sort((a, b) => {
      if (o.ordre === "nom") return parNom(a, b);
      if (o.ordre === "adhesion") return cmpFr(a.adhesion || "9999", b.adhesion || "9999") || parNom(a, b);
      return cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b);
    });
    const compteurs = {};
    const largeur = Math.max(2, Math.min(6, Number(o.chiffres) || 4));
    const dep = Math.max(0, Number(o.depart) || 1);
    const plan = tri.map((m) => {
      const parts = [o.prefixe.trim().toUpperCase()].filter(Boolean);
      if (o.point) parts.push(codePoint(m));
      if (o.annee) parts.push(m.adhesion ? m.adhesion.slice(0, 4) : String(new Date().getFullYear()));
      const cle = o.parPoint && o.point ? codePoint(m) : "_";
      compteurs[cle] = (compteurs[cle] ?? dep - 1) + 1;
      parts.push(String(compteurs[cle]).padStart(largeur, "0"));
      return { m, ancien: m.matricule || "", nouveau: parts.join(o.sep) };
    });
    const pris = new Set(plan.map((x) => x.nouveau));
    const exclus = S.membres.filter((m) => !base.includes(m));
    const conflits = exclus.filter((m) => pris.has(normMat(m.matricule)));
    const doublons = plan.length - pris.size;
    return { plan, changes: plan.filter((x) => normMat(x.ancien) !== x.nouveau), conflits, doublons };
  }
  function ficheMatricules() {
    if (!S.pret.membres) return chargement("Lecture du registre…");
    const adm = peutAdmin();
    const ong = adm ? MT.onglet : "tableau";
    let out = adm ? `<div class="subtabs" role="group" aria-label="Mode">${[["tableau", "Modifier un par un"], ["renum", "Renuméroter tout le registre"]].map(([k, l]) => `<button class="subtab${ong === k ? " on" : ""}" type="button" data-act="mat-onglet" data-v="${k}" aria-pressed="${ong === k}">${esc(l)}</button>`).join("")}</div>` : "";
    if (ong === "renum") {
      const o = MT.opts || (MT.opts = OPTS_MAT());
      const r = planRenum(o);
      const exemple = r.plan[0] ? r.plan[0].nouveau : "";
      out += `<form class="form" id="f-renum" novalidate>
        <div class="f2">${champ("rn-pre", "Préfixe", inp("rn-pre", "prefixe", o.prefixe, 'autocomplete="off" autocapitalize="characters" maxlength="12"'))}${champ("rn-sep", "Séparateur", sel("rn-sep", "sep", [["-", "Tiret ( - )"], ["/", "Barre ( / )"], [".", "Point ( . )"], ["", "Aucun"]], o.sep, null))}</div>
        <div class="f2">${champ("rn-chif", "Nombre de chiffres", sel("rn-chif", "chiffres", [["3", "3 (001)"], ["4", "4 (0001)"], ["5", "5 (00001)"]], String(o.chiffres), null))}${champ("rn-dep", "Premier numéro", inp("rn-dep", "depart", String(o.depart), 'inputmode="numeric" autocomplete="off"'))}</div>
        ${champ("rn-ordre", "Ordre de numérotation", sel("rn-ordre", "ordre", [["matricule", "Ordre des matricules actuels"], ["adhesion", "Date d’adhésion (les plus anciens d’abord)"], ["nom", "Ordre alphabétique"]], o.ordre, null))}
        <div class="field"><span class="lab">Options</span>
          <label class="check"><input type="checkbox" name="point" value="1"${o.point ? " checked" : ""}> Ajouter le code du point SDE (CI, TN, BF, IT, CA, US)</label>
          <label class="check"><input type="checkbox" name="parPoint" value="1"${o.parPoint ? " checked" : ""}${o.point ? "" : " disabled"}> Numéroter séparément dans chaque point</label>
          <label class="check"><input type="checkbox" name="annee" value="1"${o.annee ? " checked" : ""}> Ajouter l’année d’adhésion</label>
          <label class="check"><input type="checkbox" name="archives" value="1"${o.archives ? " checked" : ""}> Inclure les membres archivés</label>
        </div>
      </form>
      <p class="tally"><span>Exemple : <b class="num">${esc(exemple || "—")}</b></span><span>${pluriel(r.changes.length, "matricule changera", "matricules changeront")} sur ${nb(r.plan.length)}</span></p>
      ${r.conflits.length ? `<p class="note danger">Conflit avec des membres non renumérotés : ${esc(r.conflits.map((m) => `${nomComplet(m)} (${m.matricule})`).join(", "))}. Incluez les archivés ou changez le format.</p>` : ""}
      ${r.doublons ? `<p class="note danger">Le format produit des doublons : ajoutez un numéro par point ou changez les options.</p>` : ""}
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Membre</th><th scope="col">Actuel</th><th scope="col">Nouveau</th></tr></thead><tbody>${r.plan.slice(0, 200).map((x) => `<tr${normMat(x.ancien) !== x.nouveau ? ' class="chg"' : ""}><th scope="row">${esc(nomComplet(x.m))}${x.m.actif === false ? ' <span class="chip">Archivé</span>' : ""}</th><td class="num">${esc(x.ancien || "—")}</td><td class="num"><b>${esc(x.nouveau)}</b></td></tr>`).join("")}</tbody></table></div>
      <p class="note" style="margin-top:12px">Les cartes et attestations déjà imprimées restent vérifiables avec l’ancien matricule. Pensez à réimprimer les cartes après la renumérotation.</p>
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Annuler</button><button class="btn btn-primary" type="button" data-act="mat-renum"${r.changes.length && !r.conflits.length && !r.doublons ? "" : " disabled"}>${I("i-check")}Appliquer à ${pluriel(r.changes.length, "membre", "membres")}</button></div>`;
      return out;
    }
    const liste = membresMat();
    const valeurs = liste.map((m) => ({ m, v: MT.saisies[m.id] != null ? MT.saisies[m.id] : m.matricule || "" }));
    const compte = {};
    valeurs.forEach(({ v }) => { const k = normMat(v); if (k) compte[k] = (compte[k] || 0) + 1; });
    const modifies = valeurs.filter(({ m, v }) => normMat(v) !== normMat(m.matricule));
    const erreurs = valeurs.filter(({ v }) => normMat(v) && compte[normMat(v)] > 1);
    out += `<p class="hint">Corrigez les matricules directement dans le tableau, puis enregistrez. Les doublons sont signalés en rouge.</p>
      <div class="table-wrap"><table class="t mat-t"><thead><tr><th scope="col">Membre</th><th scope="col">Matricule</th></tr></thead><tbody>${valeurs.map(({ m, v }) => {
        const dup = normMat(v) && compte[normMat(v)] > 1, chg = normMat(v) !== normMat(m.matricule);
        return `<tr class="${dup ? "dup" : chg ? "chg" : ""}"><th scope="row">${esc(nomComplet(m))}${m.actif === false ? ' <span class="chip">Archivé</span>' : ""}</th><td><label class="sr" for="mt-${esc(m.id)}">Matricule de ${esc(nomComplet(m))}</label><input class="inp mat-in" id="mt-${esc(m.id)}" data-mat="${esc(m.id)}" value="${esc(v)}" autocomplete="off" autocapitalize="characters" spellcheck="false"></td></tr>`;
      }).join("")}</tbody></table></div>
      ${erreurs.length ? `<p class="note danger" style="margin-top:10px">${pluriel(new Set(erreurs.map((x) => normMat(x.v))).size, "matricule est attribué", "matricules sont attribués")} à plusieurs membres.</p>` : ""}
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Fermer</button><button class="btn btn-primary" type="button" data-act="mat-enregistrer"${modifies.length && !erreurs.length ? "" : " disabled"}>${I("i-check")}${modifies.length ? `Enregistrer ${pluriel(modifies.length, "modification", "modifications")}` : "Aucune modification"}</button></div>`;
    return out;
  }
  function ouvrirMatricules() { MT.saisies = {}; MT.onglet = "tableau"; MT.opts = null; ouvrir({ titre: "Matricules", wide: true, refresh: ficheMatricules }); }
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t && t.dataset && t.dataset.mat) { MT.saisies[t.dataset.mat] = t.value; clearTimeout(MT.timer); MT.timer = setTimeout(() => { dernier.sheet = null; render(); }, 350); return; }
    if (t && t.form && t.form.id === "f-renum") lireOptsRenum(t.form);
  });
  document.addEventListener("change", (ev) => { const t = ev.target; if (t && t.form && t.form.id === "f-renum") lireOptsRenum(t.form); });
  function lireOptsRenum(form) {
    const fd = new FormData(form);
    MT.opts = { prefixe: String(fd.get("prefixe") || ""), sep: String(fd.get("sep") ?? "-"), chiffres: Number(fd.get("chiffres")) || 4, depart: Number(String(fd.get("depart") || "1").replace(/\D/g, "")) || 0, ordre: String(fd.get("ordre") || "matricule"), point: fd.get("point") === "1", parPoint: fd.get("parPoint") === "1", annee: fd.get("annee") === "1", archives: fd.get("archives") === "1" };
    clearTimeout(MT.timer); MT.timer = setTimeout(() => { dernier.sheet = null; render(); }, 250);
  }
  async function enregistrerMatricules() {
    const ops = [];
    for (const [id, v] of Object.entries(MT.saisies)) {
      const m = membre(id);
      const nv = normMat(v);
      if (!m || nv === normMat(m.matricule)) continue;
      ops.push(() => S.db.doc("membres/" + id).update({ matricule: nv, anciensMatricules: anciensMat(m, m.matricule, nv), ...tampon() }));
    }
    if (!ops.length) return;
    if (await lot(ops, `${pluriel(ops.length, "matricule mis à jour", "matricules mis à jour")}`)) { MT.saisies = {}; dernier.sheet = null; render(); }
  }
  async function appliquerRenum() {
    const r = planRenum(MT.opts || OPTS_MAT());
    if (!r.changes.length || r.conflits.length || r.doublons) return;
    const ops = r.changes.map((x) => () => S.db.doc("membres/" + x.m.id).update({ matricule: x.nouveau, anciensMatricules: anciensMat(x.m, x.ancien, x.nouveau), ...tampon() }));
    if (await lot(ops, `${pluriel(ops.length, "membre renuméroté", "membres renumérotés")}`)) { MT.onglet = "tableau"; dernier.sheet = null; render(); }
  }
