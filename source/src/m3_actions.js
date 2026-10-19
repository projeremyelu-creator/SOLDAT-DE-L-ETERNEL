  Object.assign(A, {
    /* Cartes recto-verso */
    "dl-carte": (t) => telechargerCarte(t.dataset.face || "recto"),
    "zip-cartes": () => lotCartes("zip"),
    "pdf-cartes": () => lotCartes("pdf"),
    /* Voyants */
    "evaluer-membre": (t) => ouvrirEvaluation(t.dataset.id, t.dataset.k || ""),
    "aller-veille": () => { S.sous.membres = "voyants"; allerA("membres"); },
    "voyants-filtre": (t) => { S.f.voyants.filtre = t.dataset.v; render(); },
    /* Cartographie */
    "carte-point": (t) => {
      S.carteSel = t.dataset.id; render();
      if (window.innerWidth < 960) requestAnimationFrame(() => { const p = $(".carte-panel"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); });
    },
    "carte-pays": (t) => {
      const iso = t.dataset.iso;
      const pts = pointsSDE().filter((g) => isoDePays(g.pays) === iso);
      S.carteSel = pts.length === 1 ? pts[0].id : "pays:" + iso;
      render();
      if (window.innerWidth < 960) requestAnimationFrame(() => { const p = $(".carte-panel"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); });
    },
    "carte-tout": () => { S.carteSel = ""; render(); },
    "carte-zoom": (t) => { const svg = $("#carte-svg"); if (svg) zoomer(svg, Number(t.dataset.k) || 1); },
    "carte-centrer": () => { const svg = $("#carte-svg"); const v = bornerVue(vueParDefaut(donneesCarte().marques)); if (svg) appliquerVue(svg, v); else S.carteV = v; },
    "carte-monde": () => { const svg = $("#carte-svg"); const v = bornerVue({ x: -75, y: -130, w: 1150 }); if (svg) appliquerVue(svg, v); else S.carteV = v; },
    "carte-voir": (t) => { S.carteSel = t.dataset.id; S.carteV = null; fermer(); S.sous.garnisons = "carte"; allerA("garnisons"); },
    "aller-carte": () => { S.sous.garnisons = "carte"; allerA("garnisons"); },
    "ouvrir-point": (t) => ouvrirNouveauPoint(t.dataset.pays || ""),
    /* Cotisations spéciales */
    "sp-filtre": (t) => { S.f.speciales.filtre = t.dataset.v; render(); },
    "ajout-speciale": () => ouvrirFormSpeciale(null),
    "voir-speciale": (t) => ouvrirSpeciale(t.dataset.id),
    "editer-speciale": (t) => ouvrirFormSpeciale(t.dataset.id),
    "ajout-versement-sp": (t) => ouvrirFormVersementSp(t.dataset.id, t.dataset.mid || ""),
    "export-sp": (t) => exporterSpeciale(t.dataset.id),
    "relancer-sp": (t) => {
      const sp = speciale(t.dataset.id);
      if (!sp) return;
      const b = bilanSp(sp);
      const ids = b.cible.liste.filter((m) => (b.mt ? (b.parM[m.id] || 0) < b.mt : !b.parM[m.id])).map((m) => m.id);
      const c = cfg();
      ouvrirCompose({ aud: "manuel", ids, titre: `Relance · ${sp.titre}`, message: `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Rappel fraternel : la cotisation spéciale « ${sp.titre} » du mouvement ${c.nomCourt}${sp.echeance ? `, attendue pour le ${fmtJour(sp.echeance)},` : ""} compte sur ta participation${b.mt ? ` (${fcfa(b.mt)} par membre)` : ""}. Merci pour ta générosité et ton engagement !` });
    },
    "statut-speciale": async (t) => {
      const sp = speciale(t.dataset.id);
      if (!sp) return;
      const ouv = ouverteSp(sp);
      await ecrire(() => S.db.doc("cotis_speciales/" + sp.id).update({ statut: ouv ? "Close" : "Ouverte", ...tampon() }), ouv ? "Cotisation clôturée" : "Cotisation rouverte");
    },
    "supprimer-speciale": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      if (await ecrire(() => S.db.doc("cotis_speciales/" + t.dataset.id).delete(), "Cotisation spéciale supprimée")) fermer();
    }),
    /* Offrandes */
    "off-type": (t) => { S.f.offrandes.type = t.dataset.v; render(); },
    "ajout-offrande": (t) => ouvrirFormOffrande({ membreId: t.dataset.mid || "" }),
    "voir-offrande": (t) => ouvrirOffrande(t.dataset.id),
    "export-offrandes": () => exporterOffrandes(),
    "voir-op-de": (t) => {
      const cle = t.dataset.mois, id = t.dataset.id;
      if (!cle || !id) return;
      S.mois = cle; S.fvue = "journal";
      allerA("finances");
      abonnerMois(cle);
      ouvrirOp(cle, id);
    },
  });
