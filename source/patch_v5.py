import pathlib, shutil, re
d = pathlib.Path(__file__).parent / "src"
app = d / "app.js"
if not (d / "app.v4.js").exists(): shutil.copy(app, d / "app.v4.js")
if not (d / "style.v4.css").exists(): shutil.copy(d / "style.css", d / "style.v4.css")
s = (d / "app.v4.js").read_text()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:120])
    s = s.replace(old, new)

# 1. Réglages par défaut
rep('''    signataireTitre: "Leader du Mouvement",
''', '''    signataireTitre: "Leader du Mouvement",
    signatureCarte: "Jérémy Octave",
    versetCarte: "Souffre avec moi, comme un bon soldat de Jésus-Christ.",
    versetCarteRef: "2 Timothée 2.3",
    contactCarte: "infosoldat@gmail.com · +225 07 78 68 95 73",
''')
rep('typesGarnison: ["Siège", "Antenne", "Cellule", "Département", "Groupe"],', 'typesGarnison: ["Point SDE", "Siège", "Antenne", "Cellule", "Département", "Groupe"],')
rep('{ id: "garnisons", ico: "i-fort", court: "Garnisons", long: "Garnisons", desc: "Structures et cellules" },', '{ id: "garnisons", ico: "i-fort", court: "Garnisons", long: "Garnisons", desc: "Points SDE, carte, structures et cellules" },')
rep('{ id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse et cotisations" },', '{ id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse, cotisations et offrandes" },')

# 2. État
rep('prieresConf: false, chaine: false, ressources: false },', 'prieresConf: false, chaine: false, ressources: false, suivi: false, speciales: false, offrandes: false },\n    suivi: [], speciales: [], offrandes: [], carteV: null, carteSel: "", carteLargeur: 0,')
rep('garnisons: "structures", academie: "encours"', 'garnisons: "carte", cotis: "fixes", academie: "encours"')
rep('discipline: { statut: "encours" } },', 'discipline: { statut: "encours" }, voyants: { filtre: "tous" }, speciales: { filtre: "ouvertes" }, offrandes: { type: "", q: "" } },')

# 3. Abonnements
rep('''    if (accesFinances()) suivre("prieres_conf", "prieresConf", ["date", "desc", 300]);
    else S.pret.prieresConf = true;''', '''    if (accesFinances()) suivre("prieres_conf", "prieresConf", ["date", "desc", 300]);
    else S.pret.prieresConf = true;
    if (accesFinances()) { suivre("suivi", "suivi", null); suivre("cotis_speciales", "speciales", null); suivre("offrandes", "offrandes", ["date", "desc", 3000]); }
    else { S.pret.suivi = true; S.pret.speciales = true; S.pret.offrandes = true; }''')

# 4. Crochet après rendu
rep('''    dernier.main = html;
    main.innerHTML = html;''', '''    dernier.main = html;
    main.innerHTML = html;
    apresRenduMain();''')

# 5. Signature de la carte (recto) sans le nom de famille
rep('x.fillStyle = "#f3e3b0"; ecrireAjuste(x, c.signataire, 52, 548, 520, 52,', 'x.fillStyle = "#f3e3b0"; ecrireAjuste(x, signatureCarte(), 52, 548, 520, 52,')
rep('const sw = Math.min(520, x.measureText(c.signataire).width);', 'const sw = Math.min(520, x.measureText(signatureCarte()).width);')
rep('x.fillStyle = BRUME; ecrireAjuste(x, `${c.signataire} · ${c.signataireTitre}`, 44, 594, 560, 17,', 'x.fillStyle = BRUME; ecrireAjuste(x, `${signatureCarte()} · ${c.signataireTitre}`, 44, 594, 560, 17,')

# 6. Ancienne fiche carte et lot ZIP remplacés
i = s.index("  async function ouvrirCarte(mid) {")
j = s.index("  function ouvrirCartes() {")
s = s[:i] + s[j:]
rep('''      html: `<p>Cartes ${anneeCarte()} signées « ${esc(cfg().signataire)} », avec la photo du membre lorsqu’elle existe, un code QR et un code de contrôle.</p>
        <div class="actions">${btn("zip-cartes", `Télécharger les ${nb(actifs.length)} cartes (ZIP)`, { ico: "i-down", cls: "btn-primary", attrs: actifs.length ? "" : "disabled" })}</div>''',
'''      html: `<p>Cartes ${anneeCarte()} recto-verso signées « ${esc(signatureCarte())} », avec la photo du membre lorsqu’elle existe, un code QR, le point SDE et un code de contrôle.</p>
        <div class="actions">${btn("pdf-cartes", `Toutes les cartes en PDF (${nb(actifs.length)})`, { ico: "i-down", cls: "btn-primary", attrs: actifs.length ? "" : "disabled" })}${btn("zip-cartes", "Images PNG (ZIP)", { ico: "i-image", attrs: actifs.length ? "" : "disabled" })}</div>''')
rep('<p class="hint">Chaque carte est une image PNG au format carte bancaire, prête pour l’imprimeur. Pour une seule carte, ouvrez la fiche du membre.</p>',
    '<p class="hint">Le PDF contient le recto puis le verso de chaque carte, au format carte bancaire (85,6 × 54 mm), prêt pour l’imprimeur. Le ZIP contient deux images PNG par membre. Pour une seule carte, ouvrez la fiche du membre.</p>')
i = s.index("  async function zipCartes() {")
j = s.index("  async function verifierCarte() {")
s = s[:i] + "  async function zipCartes() { return lotCartes(\"zip\"); }\n" + s[j:]

# 7. Fiche membre : voyants et autres cotisations
rep('      ${photo}${voeux}\n      ${kv([["Matricule"', '      ${photo}${voeux}\n      ${blocVoyants(m)}\n      ${kv([["Matricule"')
rep('      ${blocParcours(m)}${cotis}${disc}', '      ${blocParcours(m)}${cotis}${accesDirection() ? blocCotisAutres(m) : ""}${disc}')

# 8. Pastille d’état dans les listes
rep('<span class="row-r">${m.statut ? `<span class="chip">${esc(m.statut)}</span>` : ""}${m.actif === false', '<span class="row-r">${pastilleEtat(m)}${m.statut ? `<span class="chip">${esc(m.statut)}</span>` : ""}${m.actif === false')

# 9. Sous-onglet « Voyants » du registre
rep('''    if (accesDirection()) ongM.push(["discipline", "Discipline", S.pret.discipline ? S.discipline.filter(mesureEnCours).length : null]);''',
'''    if (accesDirection()) ongM.push(["voyants", "Voyants", null]);
    if (accesDirection()) ongM.push(["discipline", "Discipline", S.pret.discipline ? S.discipline.filter(mesureEnCours).length : null]);''')
rep('''    if (S.sous.membres === "discipline" && !accesDirection()) S.sous.membres = "tous";
    const sous = S.sous.membres;
    if (sous === "discipline") return out + vueDiscipline();''', '''    if ((S.sous.membres === "discipline" || S.sous.membres === "voyants") && !accesDirection()) S.sous.membres = "tous";
    const sous = S.sous.membres;
    if (sous === "discipline") return out + vueDiscipline();
    if (sous === "voyants") return out + vueVoyants();''')

# 10. Accueil
rep('''    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteCotis());''', '''    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteVeille());
    if (accesDirection()) cartes.push(carteCotis());
    if (accesRegistre()) cartes.push(carteLieux());''')

# 11. Finances : cotisations fixes, spéciales, offrandes
rep('''aria-pressed="${S.fvue === "cotisations"}">${I("i-users")}Cotisations</button></div>`;
    if (S.fvue === "cotisations") return out + vueCotisations();''', '''aria-pressed="${S.fvue === "cotisations"}">${I("i-users")}Cotisations et offrandes</button></div>`;
    if (S.fvue === "cotisations") return out + vueCotisationsTout();''')

# 12. Fiche opération
rep('''      ${o.cotisation ? `<p class="note">Cotisation de ${esc(libListeMois(o.cotisation.mois || [], o.cotisation.annee))}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis les cotisations.</p>` : ""}''',
'''      ${o.cotisation ? `<p class="note">Cotisation de ${esc(libListeMois(o.cotisation.mois || [], o.cotisation.annee))}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis les cotisations.</p>` : ""}${noteOpLiee(o)}''')
rep('${adm && ouvert && !o.annule && !o.cotisation ? btn("editer-op"', '${adm && ouvert && !o.annule && !o.cotisation && !o.speciale && !o.offrande && !o.projet ? btn("editer-op"')

# 13. Annulation et rétablissement reportés
rep('''        try { await synchroCotisOp(o, true); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }''',
'''        try { await synchroCotisOp(o, true); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }
        try { await synchroAutresOp(o, true); } catch (e) { toast("La cotisation spéciale ou l’offrande liée n’a pas pu être mise à jour.", "err"); }''')
rep('''      try { await synchroCotisOp(o, false); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }''',
'''      try { await synchroCotisOp(o, false); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }
      try { await synchroAutresOp(o, false); } catch (e) { toast("La cotisation spéciale ou l’offrande liée n’a pas pu être mise à jour.", "err"); }''')

# 14. Garnisons : cartographie
rep('''    let out = secHead("Garnisons", { eyebrow: "Structures et cellules", verset: VERSETS.garnisons, actions: ecr ? btn("ajout-garnison", "Nouvelle garnison", { ico: "i-plus", cls: "btn-primary" }) : "" });''',
'''    let out = secHead("Garnisons", { eyebrow: "Points SDE, structures et cellules", verset: VERSETS.garnisons, actions: ecr ? btn("ouvrir-point", "Nouveau point SDE", { ico: "i-pin" }) + btn("ajout-garnison", "Nouvelle garnison", { ico: "i-plus", cls: "btn-primary" }) : "" });''')
rep('''    out += sousOnglets("garnisons", [["structures", "Structures", S.garnisons.length], ["sans", "Non rattachés", sans.length]]);''',
'''    out += sousOnglets("garnisons", [["carte", "Cartographie", pointsSDE().length], ["structures", "Structures", S.garnisons.length], ["sans", "Non rattachés", sans.length]]);
    if (S.sous.garnisons === "carte") return out + vueCartographie();''')
rep('''    const pays = new Set(S.garnisons.map((g) => norm(g.pays)).filter(Boolean)).size;
    const cellules = S.garnisons.filter((g) => g.type === "Cellule").length;''', '''    const pays = new Set(S.garnisons.map((g) => isoDePays(g.pays) || norm(g.pays)).filter(Boolean)).size;
    const cellules = S.garnisons.filter((g) => g.type === "Cellule").length;
    const nbPoints = pointsSDE().length;''')
rep('''      <div class="stat"><span class="stat-l">Cellules</span><span class="stat-v">${nb(cellules)}</span><span class="stat-m">Groupes de proximité</span></div>''',
'''      <div class="stat"><span class="stat-l">Points SDE</span><span class="stat-v">${nb(nbPoints)}</span><span class="stat-m">${pluriel(cellules, "cellule", "cellules")}</span></div>''')
rep('''  function ouvrirFormGarnison(id, parentId) {
    const c = cfg();
    const g = id ? garnison(id) : { parentId: parentId || "", pays: "Côte d’Ivoire", statut: "Active" };''', '''  function ouvrirFormGarnison(id, parentId, preset) {
    const c = cfg();
    const g = id ? garnison(id) : { parentId: parentId || "", pays: garnison(parentId) ? garnison(parentId).pays || "" : "Côte d’Ivoire", statut: "Active", ...(preset || {}) };''')
rep('''${champ("g-pays", "Pays", inp("g-pays", "pays", g.pays, 'autocomplete="off"'))}''', '''${champ("g-pays", "Pays", inp("g-pays", "pays", g.pays, 'autocomplete="off" list="dl-pays"') + `<datalist id="dl-pays">${PAYS_SDE.concat(PAYS_GEO.map((p) => p[1]).filter((n) => !PAYS_SDE.includes(n)).sort(cmpFr)).map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>`, { hint: "Place le point sur la carte." })}''')
rep('''      ${ecr ? `<div class="actions">${btn("membres-garnison", "Ajouter ou retirer des membres"''', '''      ${estPoint(g) || isoDePays(g.pays) ? `<div class="btn-row" style="margin-top:12px">${btn("carte-voir", "Voir sur la carte", { ico: "i-pin", sm: true, data: `data-id="${esc(estPoint(g) ? g.id : (pointDeGarnison(g.id) || g).id)}"` })}</div>` : ""}
      ${ecr ? `<div class="actions">${btn("membres-garnison", "Ajouter ou retirer des membres"''')
rep('''    if (id === "garnisons") return S.pret.garnisons ? `${pluriel(S.garnisons.length, "structure", "structures")}` : "";''',
'''    if (id === "garnisons") return S.pret.garnisons ? `${pluriel(pointsSDE().length, "point SDE", "points SDE")} · ${pluriel(S.garnisons.length, "structure", "structures")}` : "";''')

# 15. Réglages de la carte
rep('''        ${champ("r-can", "Cartes valables jusqu’au 31 décembre",''', '''        <div class="f2">${champ("r-sigc", "Signature imprimée sur la carte", inp("r-sigc", "signatureCarte", signatureCarte(), 'autocomplete="off"'), { hint: "Le signataire ci-dessus reste utilisé pour les attestations." })}${champ("r-cont", "Contact au verso", inp("r-cont", "contactCarte", c.contactCarte, 'autocomplete="off"'), { hint: "Séparez deux lignes par « · »." })}</div>
        <div class="f2">${champ("r-vc", "Verset du verso", zone("r-vc", "versetCarte", c.versetCarte, 'rows="2"'))}${champ("r-vcr", "Référence du verset", inp("r-vcr", "versetCarteRef", c.versetCarteRef, 'autocomplete="off"'))}</div>
        ${champ("r-can", "Cartes valables jusqu’au 31 décembre",''')
rep('''      data.carteAnnee = Number(g("carteAnnee")) || null;''', '''      data.carteAnnee = Number(g("carteAnnee")) || null;
      data.signatureCarte = g("signatureCarte") || DEFAUTS.signatureCarte;
      data.contactCarte = g("contactCarte");
      data.versetCarte = g("versetCarte") || DEFAUTS.versetCarte;
      data.versetCarteRef = g("versetCarteRef") || DEFAUTS.versetCarteRef;''')

# 16. Sauvegarde complète
rep('discipline: S.discipline, prieresConfidentielles: S.prieresConf } : {})', 'discipline: S.discipline, prieresConfidentielles: S.prieresConf, cotisationsSpeciales: S.speciales, offrandes: S.offrandes, suiviPastoral: S.suivi } : {})')

# 17. Nouveaux modules avant « Import et export », actions après la table A
mods = "".join((d / f).read_text() for f in ["carte_data.js", "m3_carte.js", "m3_voyants.js", "m3_points.js", "m3_cotis.js", "m4_projets.js", "m5_affiches.js", "m5_assistant.js", "m6_matricules.js", "m7_accueil.js", "m8_outils.js", "m8_espace.js"])
rep("  /* ════════════════════════ Import et export", mods + "\n  /* ════════════════════════ Import et export")
rep('''  };

  document.addEventListener("click", (ev) => {''', '''  };
''' + (d / "m3_actions.js").read_text() + (d / "m4_actions.js").read_text() + (d / "m5_actions.js").read_text() + (d / "m6_actions.js").read_text() + (d / "m7_actions.js").read_text() + (d / "m8_actions.js").read_text() + '''
  document.addEventListener("click", (ev) => {''')

# 18. Module Projets
rep('    { id: "secretariat", ico: "i-scroll"', '    { id: "projets", ico: "i-proj", court: "Projets", long: "Projets", desc: "Projets, tâches et cotisations de projets" },\n    { id: "secretariat", ico: "i-scroll"')
rep('["membres", "secretariat", "garnisons", "academie", "portevoix", "chambre"].includes(o.id)', '["membres", "secretariat", "garnisons", "academie", "portevoix", "chambre", "projets"].includes(o.id)')
rep('    arsenal: ["Prenez aussi le casque du salut', '    projets: ["Ils dirent : Levons-nous, et bâtissons ! Et ils se fortifièrent dans cette bonne résolution.", "Néhémie 2.18"],\n    arsenal: ["Prenez aussi le casque du salut')
rep('suivi: false, speciales: false, offrandes: false },', 'suivi: false, speciales: false, offrandes: false, projets: false, projetsFin: false },\n    projets: [], projetsFin: [], projetOnglet: "apercu",')
rep('garnisons: "carte", cotis: "fixes",', 'garnisons: "carte", cotis: "fixes", projets: "actifs",')
rep('offrandes: { type: "", q: "" } },', 'offrandes: { type: "", q: "" }, projets: { q: "", cat: "", taches: "toutes" } },')
rep('''    else { S.pret.suivi = true; S.pret.speciales = true; S.pret.offrandes = true; }''', '''    else { S.pret.suivi = true; S.pret.speciales = true; S.pret.offrandes = true; }
    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;
    if (accesFinances()) suivre("projets_fin", "projetsFin", null); else S.pret.projetsFin = true;''')
rep('''    if (accesRegistre()) cartes.push(carteLieux());''', '''    if (accesRegistre()) cartes.push(carteLieux());
    if (accesRegistre()) cartes.push(carteProjets());''')
rep('      ${blocParcours(m)}${cotis}', '      ${blocParcours(m)}${blocProjetsMembre(m)}${cotis}')
rep('''    if (id === "arsenal") return''', '''    if (id === "projets") return S.pret.projets ? pluriel((S.projets || []).filter(estActifP).length, "projet en cours", "projets en cours") : "";
    if (id === "arsenal") return''')
rep('cotisationsSpeciales: S.speciales, offrandes: S.offrandes, suiviPastoral: S.suivi } : {})', 'cotisationsSpeciales: S.speciales, offrandes: S.offrandes, suiviPastoral: S.suivi, financesProjets: S.projetsFin } : {})')
rep('chainePriere: S.chaine, arsenal: S.ressources,', 'chainePriere: S.chaine, arsenal: S.ressources, projets: S.projets,')

exec((d.parent / "patch_v7_part.py").read_text())
exec((d.parent / "patch_v8_part.py").read_text())
exec((d.parent / "patch_v9_part.py").read_text())
exec((d.parent / "patch_v10_part.py").read_text())
app.write_text(s)
mk = d / "markup.html"
m = mk.read_text()
if 'id="i-proj"' not in m:
    m = m.replace('<symbol id="i-flag"', '<symbol id="i-proj" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m8.5 10.5 1.6 1.6 3.2-3.2"/><path d="M8.5 16h7"/></symbol><symbol id="i-flag"', 1)
    mk.write_text(m)
m = mk.read_text()
if 'id="i-spark"' not in m:
    m = m.replace('<symbol id="i-flag"', '<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/></symbol><symbol id="i-flag"', 1)
    mk.write_text(m)
m = mk.read_text()
if 'id="fab-ia"' not in m:
    m = m.rstrip() + '\n<button id="fab-ia" class="fab-ia" type="button" data-vue="assistant" hidden aria-label="Ouvrir l’assistant Éliézer"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg><span>Éliézer</span></button>\n'
    mk.write_text(m)
css = (d / "style.v4.css").read_text() + "\n" + (d / "style_v5.css").read_text() + "\n" + (d / "style_v6.css").read_text() + "\n" + (d / "style_v7.css").read_text() + "\n" + (d / "style_v8.css").read_text() + "\n" + (d / "style_v9.css").read_text() + "\n" + (d / "style_v10.css").read_text()
(d / "style.css").write_text(css)
print("ok", len(s))
