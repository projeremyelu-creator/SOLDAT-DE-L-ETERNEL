# 20. Matricules modifiables (exécuté depuis patch_v5.py)
rep('["Matricule", m.matricule ? `<span class="num">${esc(m.matricule)}</span>` : ""]',
    '["Matricule", `${m.matricule ? `<span class="num">${esc(m.matricule)}</span>` : `<span class="muted">Aucun</span>`}${ecr ? ` <button class="link" type="button" data-act="editer-matricule" data-id="${esc(m.id)}">Modifier</button>` : ""}`]')
rep('${peutAdmin() ? btn("cartes", "Cartes", { ico: "i-card", sm: true }) : ""}',
    '${peutAdmin() ? btn("cartes", "Cartes", { ico: "i-card", sm: true }) : ""}${ecr ? btn("matricules", "Matricules", { ico: "i-edit", sm: true }) : ""}')
rep("""    const m = S.membres.find((x) => String(x.matricule || "").toUpperCase() === mat);
    if (!m) { zoneR.innerHTML = `<p class="note danger">Aucun membre du registre ne porte le matricule ${esc(mat)}.</p>`; return; }""",
    """    const mActuel = S.membres.find((x) => String(x.matricule || "").toUpperCase() === mat);
    const mAncien = mActuel ? null : S.membres.find((x) => (x.anciensMatricules || []).some((a) => String(a).toUpperCase() === mat));
    const m = mActuel || (mAncien ? { ...mAncien, matricule: mat } : null);
    if (!m) { zoneR.innerHTML = `<p class="note danger">Aucun membre du registre ne porte le matricule ${esc(mat)}.</p>`; return; }
    if (mAncien) zoneR.innerHTML = `<p class="hint">${esc(mat)} est un ancien matricule de ${esc(nomComplet(mAncien))}, remplacé par ${esc(mAncien.matricule || "—")}.</p>`;""")
