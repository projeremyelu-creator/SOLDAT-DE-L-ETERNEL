import pathlib, re

js = pathlib.Path("src/app.js"); s = js.read_text()
css = pathlib.Path("src/style.css"); c = css.read_text()
mk = pathlib.Path("src/markup.html"); h = mk.read_text()

def rep(txt, old, new, n=1):
    k = txt.count(old)
    assert k == n, (k, old[:140])
    return txt.replace(old, new)

# ───────────── Référentiels ─────────────
s = rep(s, '    soldeInitial: { montant: 0, mois: null },',
        '    soldeInitial: { montant: 0, mois: null },\n    programmes: ["Soldier’s Academy", "Love School", "Spiritual War School"],\n    typesGarnison: ["Siège", "Antenne", "Cellule", "Département", "Groupe"],')
s = rep(s, '    secretariat: ["Écris la prophétie : grave-la sur des tables, afin qu’on la lise couramment.", "Habacuc 2.2"],',
        '''    secretariat: ["Écris la prophétie : grave-la sur des tables, afin qu’on la lise couramment.", "Habacuc 2.2"],
    garnisons: ["Ils persévéraient dans l’enseignement des apôtres, dans la communion fraternelle, dans la fraction du pain, et dans les prières.", "Actes 2.42"],
    academie: ["Ce que tu as entendu de moi en présence de beaucoup de témoins, confie-le à des hommes fidèles, qui soient capables de l’enseigner aussi à d’autres.", "2 Timothée 2.2"],
    portevoix: ["Ce que je vous dis dans les ténèbres, dites-le en plein jour ; et ce qui vous est dit à l’oreille, prêchez-le sur les toits.", "Matthieu 10.27"],
    chambre: ["Tous, d’un commun accord, persévéraient dans la prière.", "Actes 1.14"],
    arsenal: ["Prenez aussi le casque du salut, et l’épée de l’Esprit, qui est la parole de Dieu.", "Éphésiens 6.17"],''')
s = rep(s, '''  const ONGLETS = [
    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement" },
    { id: "membres", ico: "i-users", court: "Membres", long: "Registre des membres" },
    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances" },
    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences" },
    { id: "secretariat", ico: "i-scroll", court: "Décisions", long: "Secrétariat" },
  ];''', '''  const ONGLETS = [
    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement", desc: "Tableau de bord" },
    { id: "membres", ico: "i-users", court: "Membres", long: "Registre des membres", desc: "Fiches, anniversaires, discipline, cartes" },
    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse et cotisations" },
    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences", desc: "Rassemblements et assiduité" },
    { id: "garnisons", ico: "i-fort", court: "Garnisons", long: "Garnisons", desc: "Structures et cellules" },
    { id: "academie", ico: "i-cap", court: "Académie", long: "Académie", desc: "Formations et attestations" },
    { id: "portevoix", ico: "i-horn", court: "Porte-Voix", long: "Porte-Voix", desc: "Annonces et messages" },
    { id: "chambre", ico: "i-flame", court: "Chambre Haute", long: "Chambre Haute", desc: "Intercession et prière" },
    { id: "arsenal", ico: "i-shelf", court: "Arsenal", long: "Arsenal", desc: "Médias et bibliothèque" },
    { id: "secretariat", ico: "i-scroll", court: "Décisions", long: "Secrétariat", desc: "Registre des décisions" },
  ];
  const PRIMAIRES = ["accueil", "membres", "finances", "agenda"];''')

# ───────────── État ─────────────
s = rep(s, "    membres: [], evenements: [], decisions: [], moisDocs: {}, ops: {}, opsPret: {}, cotisations: {}, discipline: [], assets: null,\n    pret: { config: false, membres: false, evenements: false, decisions: false, finances: false, cotisations: false, discipline: false },",
        "    membres: [], evenements: [], decisions: [], moisDocs: {}, ops: {}, opsPret: {}, cotisations: {}, discipline: [], assets: null,\n    garnisons: [], formations: [], annonces: [], diffusions: [], prieres: [], prieresConf: [], chaine: null, ressources: [], attest: null,\n    pret: { config: false, membres: false, evenements: false, decisions: false, finances: false, cotisations: false, discipline: false, garnisons: false, formations: false, annonces: false, diffusions: false, prieres: false, prieresConf: false, chaine: false, ressources: false },")
s = rep(s, '    sous: { membres: "tous", agenda: "avenir", secretariat: "encours", finances: "toutes" },',
        '    sous: { membres: "tous", agenda: "avenir", secretariat: "encours", finances: "toutes", garnisons: "structures", academie: "encours", portevoix: "annonces", chambre: "requetes", arsenal: "biblio" },')
s = rep(s, '    f: { membres: { q: "", pole: "", statut: "" }, finances: { q: "" }, agenda: { q: "", type: "" }, secretariat: { q: "" }, pointage: { q: "", seuls: false },',
        '    f: { membres: { q: "", pole: "", statut: "", garnison: "" }, finances: { q: "" }, agenda: { q: "", type: "", garnison: "" }, secretariat: { q: "" }, pointage: { q: "", seuls: false, tous: false }, academie: { q: "", programme: "" }, arsenal: { q: "", type: "", theme: "" }, sel: { q: "" },')
s = rep(s, '  const ongletsVisibles = () => ONGLETS.filter((o) => (o.id === "membres" || o.id === "secretariat" ? accesRegistre()',
        '  const ongletsVisibles = () => ONGLETS.filter((o) => (["membres", "secretariat", "garnisons", "academie", "portevoix", "chambre"].includes(o.id) ? accesRegistre()')

# ───────────── Navigation ─────────────
s = rep(s, '''  function renderNav() {
    const vis = ongletsVisibles();
    if (S.etat !== "connexion" && !vis.some((o) => o.id === S.vue)) S.vue = "accueil";
    const html = vis.map((o) => `<button class="nav-btn${o.id === S.vue ? " on" : ""}" type="button" data-vue="${o.id}"${o.id === S.vue ? ' aria-current="page"' : ""}>${I(o.ico)}<span class="l-short">${o.court}</span><span class="l-long">${o.long}</span></button>`).join("");
    if (dernier.nav === html) return;
    dernier.nav = html;
    $("#nav").innerHTML = html;
  }''', '''  function renderNav() {
    const vis = ongletsVisibles();
    if (S.etat !== "connexion" && S.vue !== "plus" && !vis.some((o) => o.id === S.vue)) S.vue = "accueil";
    const prim = vis.filter((o) => PRIMAIRES.includes(o.id));
    const autres = vis.filter((o) => !PRIMAIRES.includes(o.id));
    const compact = prim.length + autres.length > 5;
    const b = (o, x) => `<button class="nav-btn${x ? " nav-x" : ""}${o.id === S.vue ? " on" : ""}" type="button" data-vue="${o.id}"${o.id === S.vue ? ' aria-current="page"' : ""}>${I(o.ico)}<span class="l-short">${o.court}</span><span class="l-long">${o.long}</span></button>`;
    const plusOn = S.vue === "plus" || autres.some((o) => o.id === S.vue);
    const html = prim.map((o) => b(o, false)).join("") + (autres.length ? `<span class="nav-sep${compact ? " nav-x" : ""}" aria-hidden="true">Modules</span>` : "") + autres.map((o) => b(o, compact)).join("")
      + (compact ? `<button class="nav-btn nav-plus${plusOn ? " on" : ""}" type="button" data-vue="plus"${S.vue === "plus" ? ' aria-current="page"' : ""}>${I("i-grid")}<span class="l-short">Plus</span><span class="l-long">Tous les modules</span></button>` : "");
    if (dernier.nav === html) return;
    dernier.nav = html;
    const nav = $("#nav");
    nav.className = "nav" + (compact ? " compact" : "");
    nav.innerHTML = html;
  }''')
s = rep(s, '    if (!ongletsVisibles().some((o) => o.id === v)) v = "accueil";', '    if (v !== "plus" && !ongletsVisibles().some((o) => o.id === v)) v = "accueil";')
s = rep(s, '    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda des rassemblements.</span></div>`;',
        '    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda, les annonces et l’Arsenal.</span></div>`;')

# ───────────── Abonnements ─────────────
s = rep(s, '''    if (accesRegistre()) {
      abos.push(db.collection("membres").onSnapshot((q) => {''', '''    const suivre = (col, cle, tri) => {
      let q = db.collection(col);
      if (tri) q = q.orderBy(tri[0], tri[1]).limit(tri[2]);
      abos.push(q.onSnapshot((snap) => { S[cle] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret[cle] = true; noteCache(cle, snap.metadata); render(); }, erreurAbo));
    };
    suivre("annonces", "annonces", ["creeLe", "desc", 200]);
    suivre("ressources", "ressources", null);
    if (accesRegistre()) {
      suivre("garnisons", "garnisons", null);
      suivre("formations", "formations", ["dateDebut", "desc", 300]);
      suivre("diffusions", "diffusions", ["creeLe", "desc", 300]);
      suivre("prieres", "prieres", ["date", "desc", 500]);
      abos.push(db.doc("chaine/semaine").onSnapshot((snap) => { S.chaine = snap.exists ? snap.data() : null; S.pret.chaine = true; noteCache("chaine", snap.metadata); render(); }, erreurAbo));
    } else { S.pret.garnisons = S.pret.formations = S.pret.diffusions = S.pret.prieres = S.pret.chaine = true; }
    if (accesFinances()) suivre("prieres_conf", "prieresConf", ["date", "desc", 300]);
    else S.pret.prieresConf = true;
    if (accesRegistre()) {
      abos.push(db.collection("membres").onSnapshot((q) => {''')

# ───────────── Accueil ─────────────
s = rep(s, '''    if (accesFinances()) cartes.push(carteCaisse());
    if (accesRegistre()) cartes.push(carteAnniv());
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteCotis());''', '''    if (accesFinances()) cartes.push(carteCaisse());
    const ann = carteAnnonces();
    if (ann) cartes.push(ann);
    if (accesRegistre()) cartes.push(carteAnniv());
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteChambre());
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteCotis());
    if (accesRegistre()) cartes.push(carteAcademie());''')

# ───────────── Assiduité : un rassemblement de garnison ne compte que pour ses membres ─────────────
s = rep(s, "      const evs = pts.filter((e) => !m.adhesion || e.date >= m.adhesion).slice(0, 3);", "      const evs = pts.filter((e) => compte(e, m)).slice(0, 3);")
s = rep(s, "    const ev = evts.filter((e) => !m.adhesion || e.date >= m.adhesion);", "    const ev = evts.filter((e) => compte(e, m));")
s = rep(s, "      const evs = pts.filter((e) => !m.adhesion || e.date >= m.adhesion);", "      const evs = pts.filter((e) => compte(e, m));")
s = rep(s, "        if (m.adhesion && e.date < m.adhesion) return `<td class=\"na\">–</td>`;", "        if (!compte(e, m)) return `<td class=\"na\">–</td>`;")
s = rep(s, "    const pts = evenementsPointes().filter((e) => !m.adhesion || e.date >= m.adhesion);", "    const pts = evenementsPointes().filter((e) => compte(e, m));")
s = rep(s, "        if (m.adhesion && e.date < m.adhesion) return \"\";", "        if (!compte(e, m)) return \"\";")
s = rep(s, "P présent · R retard · E excusé · point : absent · tiret : pas encore membre.", "P présent · R retard · E excusé · point : absent · tiret : non concerné (pas encore membre, ou réunion d’une autre garnison).")

# Pointage
s = rep(s, '    const actifs = membresActifs();\n    const liste = actifs.filter((m) => (!f.seuls',
        '    const actifs = membresActifs().filter((m) => f.tous || concerne(e, m));\n    const liste = actifs.filter((m) => (!f.seuls')
s = rep(s, 'aria-pressed="${f.seuls}">Pointés seulement</button></div>',
        'aria-pressed="${f.seuls}">Pointés seulement</button>${e.garnisonId && garnison(e.garnisonId) ? `<button class="chip-btn solo${f.tous ? " on" : ""}" type="button" data-act="pt-tous" aria-pressed="${!!f.tous}">Afficher tout le mouvement</button>` : ""}</div>${e.garnisonId && garnison(e.garnisonId) && !f.tous ? `<p class="hint" style="margin:-6px 0 10px">Réunion de ${esc(garnison(e.garnisonId).nom)} : seuls ses membres sont listés et comptés.</p>` : ""}')
s = rep(s, '    S.f.pointage = { q: "", seuls: false };', '    S.f.pointage = { q: "", seuls: false, tous: false };')
s = rep(s, '• ${pluriel(np, "membre présent", "membres présents")} sur ${nb(membresActifs().length)}', '• ${pluriel(np, "membre présent", "membres présents")} sur ${nb(membresActifs().filter((m) => concerne(e, m)).length)}')

# ───────────── Rassemblements : garnison ─────────────
s = rep(s, '    const meta = [e.type, fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · ");', '    const meta = [e.type, fmtHeure(e.heure), garnison(e.garnisonId) ? garnison(e.garnisonId).nom : e.lieu].filter(Boolean).join(" · ");')
s = rep(s, '''  function ouvrirFormEvt(id) {
    const c = cfg();
    const e = id ? evt(id) : {};''', '''  function ouvrirFormEvt(id, preset) {
    const c = cfg();
    const e = id ? evt(id) : { ...(preset || {}) };
    if (!id && e.garnisonId && garnison(e.garnisonId) && !e.titre) e.titre = `${e.type || "Réunion"} · ${garnison(e.garnisonId).nom}`;
    if (!id && e.garnisonId && garnison(e.garnisonId) && !e.lieu) { const g0 = garnison(e.garnisonId); e.lieu = g0.lieuReunion || ""; e.heure = g0.heure || ""; }''')
s = rep(s, '''      ${champ("e-resp", "Responsable", inp("e-resp", "responsable", e.responsable, 'autocomplete="off"'))}''',
        '''      ${champ("e-resp", "Responsable", inp("e-resp", "responsable", e.responsable, 'autocomplete="off"'))}
      ${S.garnisons.length ? champ("e-garn", "Garnison concernée", sel("e-garn", "garnisonId", optionsGarnisons(), e.garnisonId, "Tout le mouvement"), { hint: "Pour une réunion de cellule ou d’antenne : seuls ses membres sont pointés et comptés dans l’assiduité." }) : ""}''')
s = rep(s, '    const data = { titre, type: g("type"), date, heure: g("heure"), fin: g("fin"), lieu: g("lieu"), responsable: g("responsable"), description: g("description") };',
        '    const data = { titre, type: g("type"), date, heure: g("heure"), fin: g("fin"), lieu: g("lieu"), responsable: g("responsable"), description: g("description"), garnisonId: g("garnisonId") };')
s = rep(s, '      ${kv([["Date", esc(fmtLong(e.date))], ["Horaire", esc(horaire)], ["Lieu", esc(e.lieu || "")],',
        '      ${kv([["Date", esc(fmtLong(e.date))], ["Horaire", esc(horaire)], ["Lieu", esc(e.lieu || "")], ["Garnison", garnison(e.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(e.garnisonId)}">${esc(cheminG(e.garnisonId))}</button>` : ""],')
s = rep(s, '<label class="sr" for="f-type">Type</label><select class="sel" id="f-type" data-filtre="agenda.type">${options(c.typesEvenement, f.type, "Tous les types")}</select>',
        '<label class="sr" for="f-type">Type</label><select class="sel" id="f-type" data-filtre="agenda.type">${options(c.typesEvenement, f.type, "Tous les types")}</select>${S.garnisons.length ? `<label class="sr" for="f-ag-garn">Garnison</label><select class="sel" id="f-ag-garn" data-filtre="agenda.garnison">${options(optionsGarnisons(), f.garnison, "Toutes les garnisons")}</select>` : ""}')
s = rep(s, '    const liste = base.filter((e) => (!f.type || e.type === f.type) && (!q ||',
        '    const liste = base.filter((e) => (!f.type || e.type === f.type) && (!f.garnison || e.garnisonId === f.garnison) && (!q ||')

# ───────────── Membres : garnison, parcours ─────────────
s = rep(s, '''      <label class="sr" for="f-statut">Statut</label><select class="sel" id="f-statut" data-filtre="membres.statut">${options(c.statuts, f.statut, "Tous les statuts")}</select>''',
        '''      <label class="sr" for="f-statut">Statut</label><select class="sel" id="f-statut" data-filtre="membres.statut">${options(c.statuts, f.statut, "Tous les statuts")}</select>${S.garnisons.length ? `<label class="sr" for="f-garn">Garnison</label><select class="sel" id="f-garn" data-filtre="membres.garnison">${options(optionsGarnisons(), f.garnison === "__aucune" ? "" : f.garnison, "Toutes les garnisons")}<option value="__aucune"${f.garnison === "__aucune" ? " selected" : ""}>Sans garnison</option></select>` : ""}''')
s = rep(s, "      if (f.statut && m.statut !== f.statut) return false;",
        "      if (f.statut && m.statut !== f.statut) return false;\n      if (f.garnison === \"__aucune\" ? garnison(m.garnisonId) : f.garnison && !dansG(m, f.garnison)) return false;")
s = rep(s, '["Implantation", esc(m.implantation || "")], ["Pôle", esc(m.pole || "")]',
        '["Implantation", esc(m.implantation || "")], ["Garnison", garnison(m.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(m.garnisonId)}">${esc(cheminG(m.garnisonId))}</button>` : ""], ["Pôle", esc(m.pole || "")]')
s = rep(s, '''      <h3 class="h3">Assiduité</h3>${blocAssiduite(m)}
      ${cotis}${disc}''', '''      <h3 class="h3">Assiduité</h3>${blocAssiduite(m)}
      ${blocParcours(m)}${cotis}${disc}''')
s = rep(s, '''        <div class="f2">${champ("m-eglise", "Église ou communauté", inp("m-eglise", "eglise", m.eglise, 'autocomplete="off"'))}${champ("m-impl", "Implantation", inp("m-impl", "implantation", m.implantation, 'autocomplete="off" placeholder="Siège, Italie, Canada…"'))}</div>''',
        '''        <div class="f2">${champ("m-eglise", "Église ou communauté", inp("m-eglise", "eglise", m.eglise, 'autocomplete="off"'))}${champ("m-impl", "Implantation", inp("m-impl", "implantation", m.implantation, 'autocomplete="off" placeholder="Siège, Italie, Canada…"'))}</div>
        ${S.garnisons.length ? `<div class="f2">${champ("m-garn", "Garnison", sel("m-garn", "garnisonId", optionsGarnisons(), m.garnisonId, "Aucune"))}<div></div></div>` : ""}''')
s = rep(s, 'notes: g("notes"), cotisationExempte: fd.get("cotisationExempte") === "1" };',
        'notes: g("notes"), cotisationExempte: fd.get("cotisationExempte") === "1", ...(S.garnisons.length ? { garnisonId: g("garnisonId") } : {}) };')

# ───────────── Réglages ─────────────
s = rep(s, "          <li><b>Lecture seule</b> : agenda des rassemblements.</li>", "          <li><b>Lecture seule</b> : agenda, annonces et Arsenal.</li>")
s = rep(s, "          <li><b>Contributeur</b> : en plus, registre des membres, pointage des présences et secrétariat.</li>", "          <li><b>Contributeur</b> : en plus, registre des membres, présences, garnisons, Académie, Porte-Voix, Chambre Haute et secrétariat.</li>")
s = rep(s, "          <li><b>Éditeur et propriétaire</b> : en plus, finances et réglages.</li>", "          <li><b>Éditeur et propriétaire</b> : en plus, finances, cotisations, discipline, requêtes confidentielles, dépôt de fichiers et réglages.</li>")
s = rep(s, '''        ${champ("r-inst", "Instances de décision", zone("r-inst", "instances", lignes(c.instances), 'rows="4"'))}''',
        '''        ${champ("r-inst", "Instances de décision", zone("r-inst", "instances", lignes(c.instances), 'rows="4"'))}
        <div class="f2">${champ("r-prog", "Programmes de l’Académie", zone("r-prog", "programmes", lignes(c.programmes), 'rows="4"'))}${champ("r-tg", "Types de garnisons", zone("r-tg", "typesGarnison", lignes(c.typesGarnison), 'rows="4"'))}</div>''')
s = rep(s, 'instances: liste("instances", c.instances),', 'instances: liste("instances", c.instances), programmes: liste("programmes", c.programmes), typesGarnison: liste("typesGarnison", c.typesGarnison),')

# ───────────── Sauvegarde complète ─────────────
s = rep(s, '    const data = { application: "S.D.E. Gestion", exporteLe: new Date().toISOString(), reglages: cfg(), membres: S.membres, evenements: S.evenements, decisions: S.decisions, ...(accesFinances() ? { finances } : {}) };',
        '    const data = { application: "S.D.E. Gestion", exporteLe: new Date().toISOString(), reglages: cfg(), membres: S.membres, evenements: S.evenements, decisions: S.decisions, garnisons: S.garnisons, formations: S.formations, annonces: S.annonces, messages: S.diffusions, prieres: S.prieres, chainePriere: S.chaine, arsenal: S.ressources, ...(accesFinances() ? { finances, cotisations: S.cotisations, discipline: S.discipline, prieresConfidentielles: S.prieresConf } : {}) };')

# ───────────── Vérification : cartes et attestations ─────────────
s = rep(s, "    if (!annee) { zoneR.innerHTML = `<p class=\"note danger\">Le code ${esc(code)} ne correspond pas à la carte de",
        '''    if (!annee) for (const f of S.formations) {
      const p = (f.participants || {})[m.id];
      if (p && p.statut === "Certifié" && (await codeAttestation(m, f)) === code) { zoneR.innerHTML = `<div class="note"><p><b>Attestation authentique</b> : ${esc(nomComplet(m))}, formation « ${esc(f.titre)} »${p.mention && p.mention !== "Sans mention" ? `, mention ${esc(p.mention)}` : ""}.</p>${p.certifieLe ? `<p>Certifiée le ${esc(fmtJour(p.certifieLe))}.</p>` : ""}</div>`; return; }
    }
    if (!annee) { zoneR.innerHTML = `<p class="note danger">Le code ${esc(code)} ne correspond ni à la carte ni à une attestation de''')
s = rep(s, '<h3 class="h3">Vérifier une carte</h3><p class="hint">Saisissez le matricule et le code de contrôle imprimés sur la carte, ou lus dans son code QR.</p>',
        '<h3 class="h3">Vérifier une carte ou une attestation</h3><p class="hint">Saisissez le matricule et le code de contrôle imprimés sur le document, ou lus dans son code QR.</p>')

# ───────────── Nouveaux modules et actions ─────────────
s = rep(s, "  /* ════════════════════════ Import et export ════════════════════════ */", pathlib.Path("src/modules2.js").read_text() + pathlib.Path("src/parcours.js").read_text() + "\n  /* ════════════════════════ Import et export ════════════════════════ */")
s = rep(s, '    "ajout-evt": () => ouvrirFormEvt(null),', '    "ajout-evt": (t) => ouvrirFormEvt(null, t && t.dataset && (t.dataset.garnison || t.dataset.type) ? { garnisonId: t.dataset.garnison || "", type: t.dataset.type || "" } : null),\n    "pt-tous": () => { S.f.pointage.tous = !S.f.pointage.tous; render(); },')
s = rep(s, '    "ajout-dec": () => ouvrirFormDec(null),', pathlib.Path("src/actions2.js").read_text() + '    "ajout-dec": () => ouvrirFormDec(null),')
js.write_text(s)

# ───────────── Icônes ─────────────
icones = '''  <symbol id="i-fort" viewBox="0 0 24 24"><path d="M4 21V8h3v2h2V8h6v2h2V8h3v13z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/><path d="M3 21h18"/></symbol>
  <symbol id="i-cap" viewBox="0 0 24 24"><path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.6 3.5 2.5 5.5 2.5s4-.9 5.5-2.5V11"/><path d="M21.5 9v5"/></symbol>
  <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-7-2.9-7-6.6 0-3.1 2-5 3.6-6.8.4 1.8 1.4 2.8 2.4 3.2-.3-3.4.9-6.5 3.3-8.3 0 3.2 1.5 4.9 3 6.6 1.3 1.5 1.7 3 1.7 4.8C19 18 15.9 21 12 21z"/></symbol>
  <symbol id="i-shelf" viewBox="0 0 24 24"><path d="M4.5 20V4.5h3.5V20M10 20V6.5h3.5V20M15.6 7.2l3.3-.9 3.4 12.9-3.3.9z"/><path d="M3 20.5h18"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9.5 5 2.5-5 2.5z"/></symbol>
  <symbol id="i-audio" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3.5" y="13.5" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="13.5" width="4" height="6.5" rx="1.5"/></symbol>
  <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7"/></symbol>
  <symbol id="i-image" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5 4.5 4.5"/></symbol>
'''
h = rep(h, '  <symbol id="i-horn"', icones + '  <symbol id="i-horn"')
mk.write_text(h)
css.write_text(c + pathlib.Path("src/style_v4.css").read_text())
print("patch v4 appliqué")
