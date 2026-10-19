    /* Choix de membres */
    "sel-basculer": (t) => { const id = t.dataset.mid; if (CHK.ids.has(id)) CHK.ids.delete(id); else CHK.ids.add(id); dernier.sheet = null; render(); },
    "sel-tous": () => { listeChoix().forEach((m) => CHK.ids.add(m.id)); dernier.sheet = null; render(); },
    "sel-aucun": () => { listeChoix().forEach((m) => CHK.ids.delete(m.id)); dernier.sheet = null; render(); },
    "sel-valider": (t) => { if (!CHK.onValider) return; t.disabled = true; CHK.onValider([...CHK.ids]); },
    /* Garnisons */
    "ajout-garnison": (t) => ouvrirFormGarnison(null, t.dataset.parent || ""),
    "voir-garnison": (t) => ouvrirGarnison(t.dataset.id),
    "editer-garnison": (t) => ouvrirFormGarnison(t.dataset.id),
    "membres-garnison": (t) => choisirMembresGarnison(t.dataset.id),
    "supprimer-garnison": (t) => {
      const g = garnison(t.dataset.id);
      if (!g) return;
      const n = S.membres.filter((m) => m.garnisonId === g.id).length, k = enfantsG(g.id).length;
      if (n || k) { toast(`Impossible de supprimer « ${g.nom} » : ${[n ? pluriel(n, "membre y est rattaché", "membres y sont rattachés") : "", k ? pluriel(k, "structure en dépend", "structures en dépendent") : ""].filter(Boolean).join(" et ")}. Déplacez-les d’abord.`, "err"); return; }
      boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("garnisons/" + g.id).delete(), "Garnison supprimée")) fermer(); });
    },
    /* Académie */
    "ajout-formation": () => ouvrirFormFormation(null),
    "voir-formation": (t) => ouvrirFormation(t.dataset.id),
    "editer-formation": (t) => ouvrirFormFormation(t.dataset.id),
    "inscrire-formation": (t) => inscrireFormation(t.dataset.id),
    "pointer-module": (t) => { const fid = t.dataset.id, mod = t.dataset.mod; ouvrir({ titre: "Présence au module", wide: true, refresh: surveiller(() => fichePointageModule(fid, mod)) }); },
    "basculer-module": (t) => {
      const f = formation(t.dataset.id);
      if (!f || !peutEcrire()) return;
      const mid = t.dataset.mid, mod = t.dataset.mod;
      const p = (f.participants || {})[mid] || {};
      const val = !(p.suivis && p.suivis[mod]);
      enFile("formation:" + f.id, () => ecrire(() => S.db.doc("formations/" + f.id).update({ participants: { [mid]: { suivis: { [mod]: val } } } })));
    },
    "voir-participant": (t) => ouvrirParticipant(t.dataset.id, t.dataset.mid),
    certifier: (t) => ouvrirCertification(t.dataset.id, t.dataset.mid),
    "statut-participant": (t) => {
      const fid = t.dataset.id, mid = t.dataset.mid, st = t.dataset.statut;
      ecrire(() => S.db.doc("formations/" + fid).update({ participants: { [mid]: { statut: st, ...(st === "Inscrit" ? { certifieLe: "", mention: "" } : {}) } }, ...tampon() }), st === "Abandon" ? "Abandon enregistré" : "Statut mis à jour");
    },
    attestation: (t) => ouvrirAttestation(t.dataset.id, t.dataset.mid),
    "dl-attestation": () => {
      const a = S.attest;
      if (!a) return;
      const f = formation(a.fid), m = membre(a.mid);
      a.cv.toBlob((b) => { if (b && f && m) telechargerBlob(nomFichierAttestation(m, f), b); }, "image/png");
    },
    "zip-attestations": (t) => zipAttestations(t.dataset.id),
    "supprimer-formation": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("formations/" + t.dataset.id).delete(), "Formation supprimée")) fermer(); }),
    /* Porte-Voix */
    "aller-annonces": () => allerA("portevoix", "annonces"),
    "ajout-annonce": () => ouvrirFormAnnonce(null),
    "editer-annonce": (t) => ouvrirFormAnnonce(t.dataset.id),
    "supprimer-annonce": (t) => boutonArme(t, "Confirmer", () => ecrire(() => S.db.doc("annonces/" + t.dataset.id).delete(), "Annonce supprimée")),
    "partager-annonce": (t) => { const a = S.annonces.find((x) => x.id === t.dataset.id); if (a) ouvrirTexte("Partager l’annonce", `${a.titre}\n\n${a.texte}\n\n— ${cfg().nomCourt}`, { wa: "" }); },
    ecrire: (t) => ouvrirCompose({ aud: t.dataset.aud || "tous", val: t.dataset.val || "", modele: t.dataset.modele || "libre", formationId: t.dataset.aud === "formation" ? t.dataset.val : "" }),
    "voir-diffusion": (t) => ouvrirDiffusion(t.dataset.id),
    "envoi-wa": (t) => {
      const d = diffusion(t.dataset.id);
      if (!d || !peutEcrire()) return;
      enFile("diff:" + d.id, () => ecrire(() => S.db.doc("diffusions/" + d.id).update({ envoyes: { [t.dataset.mid]: Date.now() } })));
    },
    "envoi-bascule": (t) => {
      const d = diffusion(t.dataset.id);
      if (!d) return;
      const fait = d.envoyes && d.envoyes[t.dataset.mid];
      enFile("diff:" + d.id, () => ecrire(() => S.db.doc("diffusions/" + d.id).update({ envoyes: { [t.dataset.mid]: fait ? 0 : Date.now() } })));
    },
    "copier-msg-groupe": (t) => { const d = diffusion(t.dataset.id); if (d) copier(msgGroupe(d)); },
    "copier-numeros": (t) => {
      const d = diffusion(t.dataset.id);
      if (!d) return;
      const nums = (d.destinataires || []).map((id) => membre(id)).filter(Boolean).map((m) => telChiffres(m.telephone)).filter(Boolean).map((x) => "+" + x);
      if (!nums.length) { toast("Aucun destinataire n’a de numéro.", "err"); return; }
      copier(nums.join(", "));
    },
    "export-diffusion": (t) => {
      const d = diffusion(t.dataset.id);
      if (!d) return;
      const rows = [["Matricule", "Nom", "Prénoms", "Téléphone", "Envoyé", "Message"]];
      (d.destinataires || []).map((id) => membre(id)).filter(Boolean).sort(parNom).forEach((m) => rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", telAffiche(m.telephone), d.envoyes && d.envoyes[m.id] ? fmtStamp(d.envoyes[m.id]) : "", msgPour(d, m)]));
      telecharger(`message-${aujourdhui()}.csv`, versCSV(rows));
    },
    "supprimer-diffusion": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("diffusions/" + t.dataset.id).delete(), "Message supprimé")) fermer(); }),
    /* Chambre Haute */
    "ajout-priere": () => ouvrirFormPriere(null, false),
    "voir-priere": (t) => ouvrirPriere(t.dataset.id, t.dataset.conf === "1"),
    "editer-priere": (t) => ouvrirFormPriere(t.dataset.id, t.dataset.conf === "1"),
    "j-ai-prie": (t) => {
      const conf = t.dataset.conf === "1";
      const p = priere(t.dataset.id, conf);
      if (!p || !S.me.id) return;
      const deja = p.priants && p.priants[S.me.id];
      ecrire(() => S.db.doc(`${conf ? "prieres_conf" : "prieres"}/${p.id}`).update({ priants: { [S.me.id]: deja ? 0 : Date.now() } }), deja ? "" : "Merci pour ton intercession");
    },
    exaucer: (t) => ouvrirExaucement(t.dataset.id, t.dataset.conf === "1"),
    "statut-priere": (t) => { const conf = t.dataset.conf === "1"; ecrire(() => S.db.doc(`${conf ? "prieres_conf" : "prieres"}/${t.dataset.id}`).update({ statut: t.dataset.statut, ...tampon() }), t.dataset.statut === "Close" ? "Requête close" : "Requête remise en prière"); },
    "supprimer-priere": (t) => boutonArme(t, "Confirmer la suppression", async () => { const conf = t.dataset.conf === "1"; if (await ecrire(() => S.db.doc(`${conf ? "prieres_conf" : "prieres"}/${t.dataset.id}`).delete(), "Requête supprimée")) fermer(); }),
    "partager-priere": (t) => {
      const p = priere(t.dataset.id, false);
      if (!p) return;
      const pour = membre(p.pourId);
      ouvrirTexte("Partager la requête", `🙏 Sujet de prière${pour ? ` pour ${nomUsuel(pour)}` : p.pour ? ` pour ${p.pour}` : ""} : ${p.sujet}${p.details ? `\n${p.details}` : ""}\n\nTenons-nous à la brèche ensemble.\n— ${cfg().nomCourt} · Chambre Haute`, { wa: "" });
    },
    "editer-sujet": () => ouvrirSujet(),
    "editer-creneaux": () => ouvrirCreneaux(),
    "editer-creneau": (t) => choisirIntercesseurs(Number(t.dataset.j), t.dataset.h),
    /* Arsenal */
    "arsenal-type": (t) => { S.f.arsenal.type = t.dataset.v; S.limite = 80; render(); },
    "ajout-ressource": () => ouvrirFormRessource(null),
    "voir-ressource": (t) => ouvrirRessource(t.dataset.id),
    "editer-ressource": (t) => ouvrirFormRessource(t.dataset.id),
    preter: (t) => ouvrirPret(t.dataset.id),
    "rendre-pret": (t) => ecrire(() => S.db.doc("ressources/" + t.dataset.id).update({ prets: { [t.dataset.pret]: { renduLe: aujourdhui() } }, ...tampon() }), "Retour enregistré"),
    "partager-ressource": (t) => { const r = ressource(t.dataset.id); if (r) ouvrirTexte("Partager", `📚 ${r.titre}${r.auteur ? ` — ${r.auteur}` : ""}${r.description ? `\n${r.description}` : ""}${urlSure(r.lien) ? `\n${urlSure(r.lien)}` : ""}\n\n— ${cfg().nomCourt} · Arsenal`, { wa: "" }); },
    "dl-ressource": async (t) => {
      const r = ressource(t.dataset.id);
      if (!r || !r.fichierId) return;
      try { const res = await fetch("/_blob/" + r.fichierId); if (!res.ok) throw new Error(String(res.status)); await telechargerBlob(r.fichierNom || "fichier", await res.blob()); }
      catch (e) { toast("Le fichier n’a pas pu être récupéré.", "err"); }
    },
    "supprimer-ressource": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      const r = ressource(t.dataset.id);
      if (!r) return;
      if (!(await ecrire(() => S.db.doc("ressources/" + r.id).delete(), "Ressource supprimée"))) return;
      if (r.fichierId && S.assets) { try { await S.assets.delete(r.fichierId); } catch (e) { /* le fichier reste stocké */ } }
      fermer();
    }),
