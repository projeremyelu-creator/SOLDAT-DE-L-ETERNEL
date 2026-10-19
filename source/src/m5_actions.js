  Object.assign(A, {
    /* Assistant */
    "ia-suggestion": (t) => envoyerIA(t.dataset.q),
    "ia-stop": () => { if (IA.ctl) IA.ctl.abort(); },
    "ia-nouveau": () => { IA.tours = []; IA.erreur = ""; IA.brouillon = ""; render(); },
    "ia-copier": (t) => { const x = IA.tours[Number(t.dataset.i)]; if (x) copier(sansMarques(x.content)); },
    "ia-annonce": (t) => {
      const x = IA.tours[Number(t.dataset.i)];
      if (!x) return;
      ouvrirFormAnnonce(null);
      const ti = $("#an-titre"), tx = $("#an-texte");
      if (ti) ti.value = premiereLigne(x.content).slice(0, 120);
      if (tx) tx.value = sansMarques(x.content);
    },
    "ia-message": (t) => { const x = IA.tours[Number(t.dataset.i)]; if (x) ouvrirCompose({ aud: "tous", titre: "Message rédigé avec Éliézer", message: sansMarques(x.content) }); },
    "ia-affiche": (t) => {
      const x = IA.tours[Number(t.dataset.i)];
      if (!x) return;
      const lignes = sansMarques(x.content).split(/\n+/).filter((l) => l.trim());
      ouvrirAffiche({ modele: "info", surtitre: "Information", titre: premiereLigne(x.content).slice(0, 70), texte: lignes.slice(1).join("\n").slice(0, 420) });
    },
    /* Affiches */
    "nouvelle-affiche": (t) => { const m = t.dataset.modele || "libre"; ouvrirAffiche({ modele: m, surtitre: m === "anniv" ? "Joyeux anniversaire" : m === "info" ? "Information" : "", theme: m === "anniv" ? "pourpre" : "nuit" }); },
    "affiche-evt": (t) => { const p = presetEvt(t.dataset.id); if (p) ouvrirAffiche(p); },
    "affiche-annonce": (t) => { const a = S.annonces.find((x) => x.id === t.dataset.id); if (a) ouvrirAffiche({ modele: "info", surtitre: "Communiqué", titre: a.titre, texte: a.texte, theme: a.epingle ? "feu" : "nuit" }); },
    "affiche-anniv": (t) => ouvrirAffiche({ modele: "anniv", membreId: t.dataset.id, theme: "pourpre", surtitre: "Joyeux anniversaire" }),
    "voir-affiche": (t) => { const a = (S.affiches || []).find((x) => x.id === t.dataset.id); if (!a) return; const p = {}; for (const k of Object.keys(AFF_VIDE)) if (a[k] != null) p[k] = a[k]; ouvrirAffiche(p, a.id); },
    "supprimer-affiche": (t) => boutonArme(t, "Supprimer ?", () => ecrire(() => S.db.doc("affiches/" + t.dataset.id).delete(), "Affiche supprimée")),
    "aff-dl": () => exporterAffiche("png").catch(() => toast("L’affiche n’a pas pu être préparée.", "err")),
    "aff-pdf": () => exporterAffiche("pdf").catch(() => toast("Le PDF n’a pas pu être préparé.", "err")),
    "aff-partager": () => exporterAffiche("partager").catch(() => toast("L’affiche n’a pas pu être partagée.", "err")),
    "aff-enregistrer": () => enregistrerAffiche(),
    "aff-ia": () => texteAffiche(),
    "aff-image-retirer": () => { AF.img = null; planifierApercu(0); },
  });
