# 19. Assistant Éliézer et atelier d'affiches (exécuté depuis patch_v5.py)
rep('    { id: "garnisons", ico: "i-fort"', '    { id: "assistant", ico: "i-spark", court: "Éliézer", long: "Assistant Éliézer", desc: "Assistant IA : questions, textes, synthèses" },\n    { id: "garnisons", ico: "i-fort"')
rep('projets: false, projetsFin: false },', 'projets: false, projetsFin: false, affiches: false },\n    affiches: [], sample: null,')
rep("""    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;""", """    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;
    if (accesRegistre()) suivre("affiches", "affiches", ["creeLe", "desc", 200]); else S.pret.affiches = true;""")
rep("""    renderMain();
    rafraichirSheet();""", """    renderMain();
    apresRenduIA();
    rafraichirSheet();""")
rep('const [db, user, dl, assets] = await Promise.all([sur(c.use("db")), sur(c.use("user")), sur(c.use("downloads")), sur(c.use("assets"))]);',
    'const [db, user, dl, assets, sample] = await Promise.all([sur(c.use("db")), sur(c.use("user")), sur(c.use("downloads")), sur(c.use("assets")), sur(c.use("sample"))]);\n    S.sample = sample;\n    if (sample && typeof sample.limits === "function") sample.limits().then((l) => { IA.limites = l; render(); }).catch(() => { IA.limites = null; });')
rep("""    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length]]);""",
    """    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length], ["affiches", "Affiches", (S.affiches || []).length || null]]);
    if (S.sous.portevoix === "affiches") return out + vueAffiches();""")
rep("""actions: ecr ? btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) + btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "" });""",
    """actions: (ecr ? btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) : "") + btn("nouvelle-affiche", "Nouvelle affiche", { ico: "i-image", data: 'data-modele="evenement"' }) + (ecr ? btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "") });""")
rep("""        ${btn("annonce-evt", "Message d’annonce", { ico: "i-horn", data: `data-id="${esc(e.id)}"` })}""",
    """        ${btn("annonce-evt", "Message d’annonce", { ico: "i-horn", data: `data-id="${esc(e.id)}"` })}
        ${btn("affiche-evt", "Créer l’affiche", { ico: "i-image", data: `data-id="${esc(e.id)}"` })}""")
rep("""<div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}""",
    """<div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}${btn("affiche-annonce", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(a.id)}"` })}""")
rep("""${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}""",
    """${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}${btn("affiche-anniv", "Affiche d’anniversaire", { ico: "i-image", sm: true, data: `data-id="${esc(m.id)}"` })}""")
rep("""    if (id === "projets") return""", """    if (id === "assistant") return S.sample ? "Questions, textes et synthèses" : "Disponible dans Claude";
    if (id === "projets") return""")
