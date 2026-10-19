  /* Parcours du membre dans les modules : formations, chaîne de prière, livres empruntés */
  function blocParcours(m) {
    let out = "";
    if (S.pret.formations) {
      const fs = formationsDe(m.id);
      out += `<h3 class="h3">Formations</h3>` + (fs.length ? `<div class="list">${fs.map(({ f, p }) => {
        const pr = progressionP(f, p);
        const chip = p.statut === "Certifié" ? `<span class="chip ok">Certifié</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">${LIB_ETAT_F[etatFormation(f)]}</span>`;
        return `<button class="row nolead" type="button" data-act="voir-participant" data-id="${esc(f.id)}" data-mid="${esc(m.id)}"><span class="row-main"><span class="row-t">${esc(f.titre)}</span><span class="row-m">${esc([f.programme, pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${chip}</span></button>`;
      }).join("")}</div>` : `<p class="hint">Aucune formation suivie.</p>`);
    }
    if (S.pret.chaine) {
      const cr = creneauxDe(m.id);
      if (cr.length) out += `<h3 class="h3">Chaîne de prière</h3><p class="hint">${esc(cr.join(" · "))}</p>`;
    }
    if (S.pret.ressources) {
      const l = livresDe(m.id);
      if (l.length) out += `<h3 class="h3">Livres empruntés</h3><p class="hint">${esc(l.map(({ r, p }) => `${r.titre}${p.retourPrevu ? ` (retour prévu le ${fmtCourt(p.retourPrevu)})` : ""}`).join(" · "))}</p>`;
    }
    return out;
  }
