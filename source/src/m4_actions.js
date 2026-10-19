  Object.assign(A, {
    /* Projets */
    "ajout-projet": () => ouvrirFormProjet(null),
    "voir-projet": (t) => { if ($("#sheet").contains(t) && !t.dataset.onglet) S.projetOnglet = "apercu"; ouvrirProjet(t.dataset.id, t.dataset.onglet || (!$("#sheet").contains(t) ? "apercu" : "")); },
    "editer-projet": (t) => ouvrirFormProjet(t.dataset.id),
    "projet-onglet": (t) => { S.projetOnglet = t.dataset.v; dernier.sheet = null; render(); const b = $("#sheet-b"); if (b) b.scrollTop = 0; },
    "equipe-projet": (t) => choisirEquipe(t.dataset.id),
    "jalon-basculer": async (t) => {
      const p = projet(t.dataset.id);
      const j = p && (p.jalons || {})[t.dataset.j];
      if (!j) return;
      await ecrire(() => S.db.doc("projets/" + p.id).update({ jalons: { [t.dataset.j]: { fait: !j.fait, faitLe: !j.fait ? aujourdhui() : "" } }, ...tampon() }), !j.fait ? "Étape atteinte" : "Étape rouverte");
    },
    "ajout-tache": (t) => ouvrirFormTache(t.dataset.id, null),
    "editer-tache": (t) => ouvrirFormTache(t.dataset.id, t.dataset.t),
    "tache-statut": async (t) => {
      const v = t.dataset.v;
      await ecrire(() => S.db.doc("projets/" + t.dataset.id).update({ taches: { [t.dataset.t]: { statut: v, faiteLe: v === "Fait" ? aujourdhui() : "" } }, ...tampon() }), v === "Fait" ? "Tâche terminée" : `Tâche « ${v} »`);
    },
    "supprimer-tache": (t) => boutonArme(t, "Confirmer", async () => { if (await retirerCle("projets/" + t.dataset.id, "taches", t.dataset.t, "Tâche supprimée")) ouvrirProjet(t.dataset.id, "taches"); }),
    "note-projet": async (t) => {
      const zoneT = $("#pn-texte");
      const texte = zoneT ? zoneT.value.trim() : "";
      if (!texte) { if (zoneT) zoneT.focus(); toast("Écrivez d’abord l’information à publier.", "err"); return; }
      t.disabled = true;
      const nid = "n" + Date.now().toString(36);
      if (await ecrire(() => S.db.doc("projets/" + t.dataset.id).update({ notes: { [nid]: { texte, le: Date.now(), par: S.me.id || null } }, ...tampon() }), "Publié dans le journal") && zoneT) zoneT.value = "";
      t.disabled = false;
    },
    "cotis-projet": (t) => ouvrirFormCotisProjet(t.dataset.id, t.dataset.mid || ""),
    "promesse-projet": (t) => ouvrirFormPromesse(t.dataset.id, t.dataset.mid || ""),
    "depense-projet": (t) => ouvrirFormDepenseProjet(t.dataset.id),
    "collecte-projet": (t) => ouvrirFormCollecte(t.dataset.id),
    "relancer-projet": (t) => {
      const p = projet(t.dataset.id);
      if (!p) return;
      const b = bilanFinP(p);
      const ids = b.cible.liste.filter((m) => { const att = attenduMembreP(b, m.id); const v = b.parM[m.id] || 0; return att ? v < att : !v; }).map((m) => m.id);
      ouvrirCompose({ aud: "manuel", ids, titre: `Relance · projet ${p.titre}`, message: `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Le projet « ${p.titre} » du mouvement ${cfg().nomCourt} avance${b.objectif ? ` : ${pct(b.taux)} de l’objectif est déjà réuni` : ""}. Ta cotisation${b.mt ? ` (${fcfa(b.mt)})` : ""} est attendue${b.f.echeanceCollecte ? ` avant le ${fmtJour(b.f.echeanceCollecte)}` : ""}. Merci pour ta générosité : ensemble, bâtissons !` });
    },
    "ecrire-equipe": (t) => {
      const p = projet(t.dataset.id);
      if (!p) return;
      ouvrirCompose({ aud: "manuel", ids: [...new Set([p.responsableId, ...(p.equipe || [])].filter(Boolean))], titre: `Équipe · ${p.titre}`, message: `Bonjour {prenom}, point d’étape sur le projet « ${p.titre} » : ` });
    },
    "export-projet": (t) => exporterProjet(t.dataset.id),
    "supprimer-projet": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      const p = projet(t.dataset.id);
      if (!p) return;
      const b = S.pret.projetsFin ? bilanFinP(p) : null;
      if (b && (b.vs.length || b.ds.length)) { toast("Ce projet a des cotisations ou des dépenses en caisse : annulez-les d’abord, ou passez le projet en « Abandonné ».", "err"); return; }
      const ok = await ecrire(async () => {
        await S.db.doc("projets/" + p.id).delete();
        if (S.pret.projetsFin && (S.projetsFin || []).some((x) => x.id === p.id)) await S.db.doc("projets_fin/" + p.id).delete();
      }, "Projet supprimé");
      if (ok) fermer();
    }),
    "ptache-filtre": (t) => { S.f.projets.taches = t.dataset.v; render(); },
  });
