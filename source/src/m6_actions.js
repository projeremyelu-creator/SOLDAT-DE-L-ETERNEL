  Object.assign(A, {
    /* Matricules */
    "editer-matricule": (t) => ouvrirMatricule(t.dataset.id),
    matricules: () => ouvrirMatricules(),
    "mat-onglet": (t) => { MT.onglet = t.dataset.v; dernier.sheet = null; render(); },
    "mat-enregistrer": () => enregistrerMatricules(),
    "mat-renum": (t) => boutonArme(t, "Confirmer la renumérotation", () => appliquerRenum()),
  });
