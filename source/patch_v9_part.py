# 21. Accueil repensé (Ézéchiel 37) — exécuté depuis patch_v5.py
rep('''    apresRenduMain();
    if (garde) {''', '''    apresRenduMain();
    initHero();
    if (garde) {''')
# L’application s’ouvre toujours sur l’accueil (plus de retour automatique sur la caisse)
rep('''    try { const v = localStorage.getItem("sde-vue"); if (v) S.vue = v; } catch (e) { /* stockage indisponible */ }
''', '')
rep('''    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement", desc: "Tableau de bord" },''',
    '''    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement", desc: "Ézéchiel 37 · la vie du mouvement" },''')
rep('''    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse, cotisations et offrandes" },
    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences", desc: "Rassemblements et assiduité" },''',
    '''    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences", desc: "Rassemblements et assiduité" },
    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse, cotisations et offrandes" },''')
rep('const PRIMAIRES = ["accueil", "membres", "finances", "agenda"];', 'const PRIMAIRES = ["accueil", "membres", "agenda", "finances"];')
