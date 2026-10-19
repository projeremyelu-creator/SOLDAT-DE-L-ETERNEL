  Object.assign(A, {
    /* Rappels */
    "rappel-envoye": (t) => { marquerRappel(t.dataset.jour, t.dataset.k); },
    "rappel-voir": (t) => { const g = rappelsDuJour().find((x) => x.id === t.dataset.g); const it = g && g.items[Number(t.dataset.i)]; if (it) { ouvrirTexte(it.titre, it.texte, { wa: it.tel || "", intro: "Relisez et personnalisez le message si besoin." }); marquerRappel(it.jour, it.k); } },
    "rappel-chacun": (t) => { const e = evt(t.dataset.id); if (e) ouvrirCompose({ aud: e.garnisonId ? "garnison" : "tous", val: e.garnisonId || "", modele: "rassemblement", evtId: e.id, titre: `Rappel · ${e.titre}` }); },
    /* Sauvegarde, copie de poche, installation */
    "sauvegarde-excel": (t) => sauvegardeExcel(t),
    "copie-poche": () => copieDePoche(),
    installer: () => ouvrirInstaller(),
    "installer-pwa": async () => { if (!invite) return; invite.prompt(); try { await invite.userChoice; } catch (e) { /* refus */ } invite = null; dernier.sheet = null; render(); },
    "effacer-cache": (t) => boutonArme(t, "Confirmer l’effacement", () => effacerCache()),
    /* Espace soldat */
    espaces: () => ouvrirEspaces(),
    "esp-creer": async (t) => { t.disabled = true; await creerAcces(t.dataset.id); dernier.sheet = null; render(); },
    "esp-creer-tous": async (t) => {
      t.disabled = true;
      const sans = membresActifs().filter((m) => !accesDe(m.id));
      let n = 0;
      for (const m of sans) { if (await creerAcces(m.id, true)) n += 1; t.textContent = `Création… ${n}/${sans.length}`; await sleep(100); }
      toast(`${pluriel(n, "code créé", "codes créés")}`);
      dernier.sheet = null; render();
    },
    "esp-nouveau": (t) => boutonArme(t, "Confirmer le nouveau code", async () => { await creerAcces(t.dataset.id); dernier.sheet = null; render(); }),
    "esp-retirer": (t) => boutonArme(t, "Confirmer le retrait", () => retirerAcces(t.dataset.id)),
    "esp-copier": (t) => { const m = membre(t.dataset.id), a = accesDe(t.dataset.id); if (m && a) ouvrirTexte("Code de l’espace soldat", messageCode(m, a.code), { wa: m.telephone || "", intro: "Message prêt à envoyer au soldat." }); },
    "esp-carte": (t) => telechargerCarteEspace(t.dataset.face),
    "esp-quitter": () => quitterEspace(),
  });
