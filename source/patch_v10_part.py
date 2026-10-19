# 22. Rappels, espace soldat, sauvegarde Excel, installation et copie locale — exécuté depuis patch_v5.py
rep('''    contactCarte: "infosoldat@gmail.com · +225 07 78 68 95 73",
''', '''    contactCarte: "infosoldat@gmail.com · +225 07 78 68 95 73",
    lienApp: "https://claude.ai/artifact/GoENFgrqfSdyNhanWp5iaR",
    contactPriere: "",
    derniereSauvegarde: "",
''')
rep('projetsFin: false, affiches: false },', 'projetsFin: false, affiches: false, rappels: false, acces: false },')
rep('    projets: [], projetsFin: [], projetOnglet: "apercu",', '    projets: [], projetsFin: [], projetOnglet: "apercu", rappels: [], acces: [], horsLigne: false, cacheT: 0,')
rep('''    if (accesFinances()) suivre("projets_fin", "projetsFin", null); else S.pret.projetsFin = true;''',
    '''    if (accesFinances()) suivre("projets_fin", "projetsFin", null); else S.pret.projetsFin = true;
    if (accesRegistre()) suivre("rappels", "rappels", ["jour", "desc", 60]); else S.pret.rappels = true;
    if (accesFinances()) suivre("acces", "acces", null); else S.pret.acces = true;''')
rep('''S.evenements = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.evenements = true; noteCache("evenements", q.metadata); render();''',
    '''S.evenements = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.evenements = true; noteCache("evenements", q.metadata); delete S.caches.local; S.horsLigne = false; render();''')
rep('''    apresRenduIA();
    rafraichirSheet();''', '''    apresRenduIA();
    apresRenduEspace();
    planifierSynchro();
    planifierCache();
    rafraichirSheet();''')
rep('''    if (ONGLETS.some((o) => o.id === h)) S.vue = h;
    render();''', '''    if (ONGLETS.some((o) => o.id === h)) S.vue = h;
    render();
    if (navigator.onLine === false && appliquerCache(null, true)) { S.etat = "pret"; S.horsLigne = true; render(); }''')
rep('''    if (!db) { S.etat = "absent"; render(); return; }
    S.db = db;
    S.etat = "pret";''', '''    if (!db) {
      if (S.horsLigne || (navigator.onLine === false && appliquerCache(null, true))) { S.etat = "pret"; S.horsLigne = true; render(); return; }
      S.etat = "absent"; render(); return;
    }
    S.db = db;
    S.etat = "pret";
    if (!S.horsLigne && appliquerCache(S.me.id, false)) render();''')
rep('''    else if (!S.enLigne) html = `<div class="banner warn"><span>Connexion perdue''', '''    else if (S.horsLigne) html = `<div class="banner warn"><span>Mode hors ligne : vous consultez les données enregistrées sur cet appareil${S.cacheT ? " le " + fmtStamp(S.cacheT) : ""}. Les modifications reprendront au retour du réseau.</span></div>`;
    else if (!S.enLigne) html = `<div class="banner warn"><span>Connexion perdue''')
rep('''    { id: "membres", ico: "i-users", court: "Membres",''', '''    { id: "espace", ico: "i-card", court: "Mon espace", long: "Espace soldat", desc: "Ma carte, mes présences, mes cotisations, ma requête de prière" },
    { id: "membres", ico: "i-users", court: "Membres",''')
rep('''    const prim = vis.filter((o) => PRIMAIRES.includes(o.id));
    const autres = vis.filter((o) => !PRIMAIRES.includes(o.id));''', '''    const estPrim = (o) => PRIMAIRES.includes(o.id) || (o.id === "espace" && !accesRegistre());
    const prim = vis.filter(estPrim);
    const autres = vis.filter((o) => !estPrim(o));''')
rep('''["affiches", "Affiches", (S.affiches || []).length || null]]);''', '''["affiches", "Affiches", (S.affiches || []).length || null], ["rappels", "Rappels du jour", rappelsEnAttente() || null]]);
    if (S.sous.portevoix === "rappels") return out + vueRappels();''')
rep('      ${blocParcours(m)}${blocProjetsMembre(m)}${cotis}', '      ${blocParcours(m)}${blocProjetsMembre(m)}${cotis}${blocEspaceMembre(m)}')
rep('${ecr ? btn("matricules", "Matricules", { ico: "i-edit", sm: true }) : ""}', '${ecr ? btn("matricules", "Matricules", { ico: "i-edit", sm: true }) : ""}${peutAdmin() ? btn("espaces", "Espaces soldats", { ico: "i-card", sm: true }) : ""}')
rep('''${accesRegistre() ? btn("export-tout", "Sauvegarde complète (JSON)", { ico: "i-down", sm: true }) : ""}</div>''',
    '''${accesRegistre() ? btn("export-tout", "Sauvegarde complète (JSON)", { ico: "i-down", sm: true }) : ""}${accesRegistre() ? btn("sauvegarde-excel", "Sauvegarde Excel", { ico: "i-down", sm: true }) : ""}${accesRegistre() ? btn("copie-poche", "Copie de poche (hors ligne)", { ico: "i-down", sm: true }) : ""}${btn("installer", "Installer sur le téléphone", { ico: "i-phone", sm: true })}</div>''')
rep('''    if (!c || typeof c.use !== "function") { S.etat = "absent"; render(); return; }''', '''    if (!c || typeof c.use !== "function") { if (S.horsLigne) return; S.etat = "absent"; render(); return; }''')
