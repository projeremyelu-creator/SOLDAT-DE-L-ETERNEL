  /* ════════════════════════ Rappels du jour (WhatsApp prêt à envoyer) ════════════════════════ */
  const rappelDoc = (cle) => (S.rappels || []).find((r) => r.id === cle) || null;
  const rappelEnvoye = (jour, k) => { const d = rappelDoc(jour); return !!(d && d.envoyes && d.envoyes[k]); };
  function texteVeille(e, auj) {
    const c = cfg();
    return `Shalom à tous ! ${auj ? "C’est aujourd’hui" : "Rappel : c’est demain"}, ${fmtLong(e.date)}${e.heure ? " à " + fmtHeure(e.heure) : ""} : ${e.titre}${e.lieu ? `\nLieu : ${e.lieu}` : ""}.\n${auj ? "Nous vous attendons, venez avec vos proches !" : "Préparez-vous et venez avec vos proches : l’Esprit va souffler !"}\n« Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent ! » (Ézéchiel 37.9)\n— ${c.nomCourt}`;
  }
  function texteCotis(m, e, an) {
    const c = cfg();
    const mt = Number(c.cotisationMensuelle) || 0;
    const k = e.retard.length;
    const quoi = k === 1 ? `de ${libListeMois(e.retard, an)}` : `de ${libListeMois(e.retard, an)} (${k} mois)`;
    return `Shalom ${prenomUsuel(m)}, que la grâce du Seigneur soit avec toi.\nPetit rappel fraternel : ta cotisation mensuelle ${quoi} reste à régler${mt ? `, soit ${fcfa(mt * k)}` : ""}. Tu peux la remettre au trésorier ou à ton responsable de point.\n« Dieu aime celui qui donne avec joie. » (2 Corinthiens 9.7)\nMerci pour ta fidélité !\n— ${c.nomCourt}`;
  }
  function rappelsDuJour() {
    const groupes = [];
    if (!accesRegistre() || !S.pret.membres) return groupes;
    const auj = aujourdhui(), dem = ajoutJours(auj, 1), mois = moisCourant(), an = new Date().getFullYear();
    const ann = membresActifs().filter((m) => { const a = prochainAnniv(m); return a && a.dans === 0; });
    if (ann.length) {
      const items = ann.map((m) => ({ k: "anniv:" + m.id, jour: auj, titre: `Anniversaire de ${nomComplet(m)}`, sous: m.telephone ? telAffiche(m.telephone) : "Pas de numéro : choisissez le contact dans WhatsApp", texte: messageAnniv(m), tel: m.telephone || "", mid: m.id }));
      const noms = ann.map((m) => prenomUsuel(m) + " " + String(m.nom || "").toUpperCase());
      items.push({ k: "anniv-groupe", jour: auj, titre: "Annonce au groupe du mouvement", sous: "À partager dans les groupes WhatsApp", texte: `Toute la famille ${cfg().nomCourt} souhaite un joyeux anniversaire à ${noms.length > 1 ? noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1] : noms[0]} ! Que l’Éternel vous comble de sa grâce et fasse de cette nouvelle année une année de résurrection et de victoire. « Je mettrai mon esprit en vous, et vous vivrez. » (Ézéchiel 37.14)`, tel: "" });
      groupes.push({ id: "anniv", titre: "Anniversaires du jour", ico: "i-cake", items });
    }
    const evs = S.evenements.filter((e) => e.date === dem || e.date === auj).sort((a, b) => cmpFr(a.date + (a.heure || ""), b.date + (b.heure || "")));
    if (evs.length) groupes.push({ id: "evt", titre: "Rassemblements", ico: "i-cal", items: evs.map((e) => ({ k: (e.date === auj ? "jourj:" : "veille:") + e.id, jour: auj, titre: `${e.date === auj ? "Aujourd’hui" : "Demain"} : ${e.titre}`, sous: [fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · ") || "Message de groupe", texte: texteVeille(e, e.date === auj), tel: "", evtId: e.id })) });
    if (accesDirection() && S.pret.cotisations && (Number(cfg().cotisationMensuelle) || cfg().cotisationDebut)) {
      const dus = membresActifs().map((m) => ({ m, e: etatCotis(m, an) })).filter((x) => x.e.retard.length).sort((a, b) => b.e.retard.length - a.e.retard.length || parNom(a.m, b.m));
      if (dus.length) groupes.push({ id: "cotis", titre: `Cotisations de ${MOIS_NOMS[new Date().getMonth()]}`, ico: "i-wallet", items: dus.map(({ m, e }) => ({ k: "cotis:" + m.id, jour: mois, titre: nomComplet(m), sous: `${e.retard.length} mois ${e.retard.length > 1 ? "dus" : "dû"}${Number(cfg().cotisationMensuelle) ? " · " + fcfa(e.retard.length * Number(cfg().cotisationMensuelle)) : ""}${m.telephone ? "" : " · pas de numéro"}`, texte: texteCotis(m, e, an), tel: m.telephone || "", mid: m.id })) });
    }
    return groupes;
  }
  function rappelsEnAttente() {
    return rappelsDuJour().flatMap((g) => g.items).filter((it) => !rappelEnvoye(it.jour, it.k)).length;
  }
  function vueRappels() {
    const gs = rappelsDuJour();
    let out = `<p class="hint" style="margin:0 0 12px">Chaque matin, l’application prépare les messages du jour : anniversaires, rassemblement du lendemain et, pour la direction, rappels de cotisation. Touchez « WhatsApp » : le message s’ouvre prêt à partir, et la ligne est cochée comme envoyée.</p>`;
    if (!gs.length) return out + vide("i-check", "Aucun rappel à envoyer aujourd’hui. Revenez demain matin.");
    for (const g of gs) {
      const reste = g.items.filter((it) => !rappelEnvoye(it.jour, it.k)).length;
      out += `<section class="rap-g"><h2 class="h3">${I(g.ico)} ${esc(g.titre)} <span class="count">${reste ? nb(reste) + " à envoyer" : "tout est envoyé"}</span></h2><div class="list">${g.items.map((it, i) => {
        const fait = rappelEnvoye(it.jour, it.k);
        return `<div class="row nolead sp-row rap-row${fait ? " fait" : ""}"><span class="row-main"><span class="row-t">${fait ? `<span class="chip ok">Envoyé</span> ` : ""}${esc(it.titre)}</span><span class="row-m">${esc(it.sous)}</span></span><span class="row-r"><span class="btn-row"><a class="btn btn-sm ${fait ? "btn-ghost" : "btn-primary"}" href="${esc(lienWa(it.tel, it.texte))}" target="_blank" rel="noopener" data-act="rappel-envoye" data-jour="${esc(it.jour)}" data-k="${esc(it.k)}">${I("i-msg")}WhatsApp</a><button class="icon-btn" type="button" data-act="rappel-voir" data-g="${esc(g.id)}" data-i="${i}" aria-label="${esc("Voir et copier le message : " + it.titre)}">${I("i-copy")}</button>${it.evtId && peutEcrire() ? `<button class="btn btn-sm btn-ghost" type="button" data-act="rappel-chacun" data-id="${esc(it.evtId)}">À chacun</button>` : ""}</span></span></div>`;
      }).join("")}</div></section>`;
    }
    return out;
  }
  async function marquerRappel(jour, k) {
    if (!peutEcrire() || rappelEnvoye(jour, k)) return;
    try { await upsert("rappels/" + jour, { jour, envoyes: { [k]: Date.now() } }); } catch (e) { /* le message est parti quand même */ }
  }

  /* ════════════════════════ Sauvegarde Excel ════════════════════════ */
  /* Classeur .xlsx écrit à la main (SpreadsheetML zippé avec JSZip, déjà utilisé pour les cartes) */
  const xmlEsc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const colXl = (n) => { let s = ""; n += 1; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  async function classeurXlsx(feuilles) {
    await chargerScript(LIB_ZIP);
    const zip = new window.JSZip();
    const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const noms = new Set();
    const fs = feuilles.map((f, i) => {
      let nom = String(f.nom).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31).trim() || "Feuille" + (i + 1);
      while (noms.has(nom)) nom = nom.slice(0, 28) + " " + (i + 1);
      noms.add(nom);
      return { ...f, nom };
    });
    fs.forEach((f, i) => {
      const ncol = Math.max(1, ...f.rows.map((r) => r.length));
      const cols = `<cols>${Array.from({ length: ncol }, (_, k) => `<col min="${k + 1}" max="${k + 1}" width="${(f.largeurs && f.largeurs[k]) || 14}" customWidth="1"/>`).join("")}</cols>`;
      const lignes = f.rows.map((r, y) => `<row r="${y + 1}">${r.map((v, x) => {
        const ref = colXl(x) + (y + 1), st = y === 0 ? ' s="1"' : "";
        if (v === null || v === undefined || v === "") return y === 0 ? `<c r="${ref}"${st}/>` : "";
        if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
        return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      }).join("")}</row>`).join("");
      const filtre = f.rows.length > 1 ? `<autoFilter ref="A1:${colXl(ncol - 1)}${f.rows.length}"/>` : "";
      zip.file(`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS}><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${lignes}</sheetData>${filtre}</worksheet>`);
    });
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${fs.map((f, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${NS}><sheets>${fs.map((f, i) => `<sheet name="${xmlEsc(f.nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${fs.some((f) => f.rows.length > 1) ? `<definedNames>${fs.map((f, i) => (f.rows.length > 1 ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(f.nom).replace(/'/g, "''")}'!$A$1:$${colXl(Math.max(1, ...f.rows.map((r) => r.length)) - 1)}$${f.rows.length}</definedName>` : "")).join("")}</definedNames>` : ""}</workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fs.map((f, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${fs.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F1E3D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const dateFrC = (d) => (d ? String(d).split("-").reverse().join("/") : "");
  const sauvegardeDue = () => accesDirection() && S.pret.config && String(cfg().derniereSauvegarde || "").slice(0, 7) < moisCourant();
  async function sauvegardeExcel(bouton) {
    if (!accesRegistre()) return;
    if (bouton) bouton.disabled = true;
    toast("Préparation de la sauvegarde Excel…");
    try {
      const feuilles = [];
      const feuille = (nom, rows, largeurs) => feuilles.push({ nom, rows, largeurs });
      const nomG = (id) => { const g = garnison(id); return g ? g.nom : ""; };
      const mbs = S.membres.slice().sort((a, b) => cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b));
      feuille("Membres", [["Matricule", "Nom", "Prénoms", "Statut", "Fonction", "Pôle", "Point SDE / garnison", "Téléphone", "Autre numéro", "E-mail", "Église", "Quartier", "Anniversaire", "Membre depuis", "Actif"],
        ...mbs.map((m) => [m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", m.statut || "", m.fonction || "", m.pole || "", nomG(m.garnisonId), telAffiche(m.telephone), telAffiche(m.telephone2), m.email || "", m.eglise || "", m.quartier || "", m.anniv ? `${m.anniv.slice(3)}/${m.anniv.slice(0, 2)}` : "", dateFrC(m.adhesion), m.actif === false || m.archive ? "Non" : "Oui"])],
        [12, 18, 22, 16, 16, 18, 20, 16, 16, 22, 20, 16, 12, 14, 8]);
      const evs = S.evenements.slice().sort((a, b) => cmpFr(b.date, a.date));
      feuille("Rassemblements", [["Date", "Heure", "Titre", "Type", "Lieu", "Membres présents", "Retards", "Excusés", "Visiteurs", "Nouveaux venus"],
        ...evs.map((e) => [dateFrC(e.date), e.heure || "", e.titre || "", e.type || "", e.lieu || "", nbPresents(e), nbEtat(e, "retard"), nbEtat(e, "excuse"), Number(e.visiteurs) || 0, Number(e.nouveaux) || 0])],
        [12, 8, 30, 14, 30, 10, 10, 10, 10, 10]);
      const pts = evenementsPointes().slice(0, 120);
      if (pts.length) feuille("Présences", [["Matricule", "Membre", ...pts.map((e) => `${dateFrC(e.date)} ${e.titre || ""}`.slice(0, 40)), "Taux"],
        ...membresActifs().slice().sort(parNom).map((m) => { const s = statsMembre(m, pts); return [m.matricule || "", nomComplet(m), ...pts.map((e) => { if (!compte(e, m)) return ""; const v = presentsEffectifs(e)[m.id]; return v === true ? "P" : v === "retard" ? "R" : v === "excuse" ? "E" : "A"; }), s.taux == null ? "" : Math.round(s.taux * 100) + " %"]; })],
        [12, 26, ...pts.map(() => 12), 8]);
      if (accesFinances() && S.db) {
        const ops = [];
        for (const cle of Object.keys(S.moisDocs || {}).sort()) {
          try { const q = await S.db.collection(`finances/${cle}/ops`).get(); q.docs.forEach((d) => ops.push({ id: d.id, mois: cle, ...d.data() })); } catch (e) { /* mois illisible : ignoré */ }
          await sleep(80);
        }
        ops.sort((a, b) => cmpFr(a.date || "", b.date || ""));
        feuille("Caisse", [["Date", "Mois", "Sens", "Catégorie", "Libellé", "Montant (FCFA)", "Moyen", "Membre", "Référence", "Annulée"],
          ...ops.map((o) => { const m = o.membreId ? membre(o.membreId) : null; return [dateFrC(o.date), o.mois, o.sens === "E" ? "Entrée" : "Sortie", o.categorie || "", o.libelle || "", o.annule ? 0 : (o.sens === "E" ? 1 : -1) * (Number(o.montant) || 0), o.moyen || "", m ? nomComplet(m) : "", o.piece || "", o.annule ? "Oui" : "Non"]; })],
          [12, 9, 8, 22, 34, 14, 12, 24, 14, 8]);
        const ans = [...new Set([new Date().getFullYear(), ...Object.keys(S.cotisations || {}).map((k) => Number(k.split("-").pop())).filter(Boolean)])].sort();
        for (const an of ans.slice(-3)) {
          feuille(`Cotisations ${an}`, [["Matricule", "Membre", ...MOIS_NOMS.map((x) => x.slice(0, 4)), "Total versé", "Mois en retard"],
            ...membresActifs().slice().sort(parNom).map((m) => { const e = etatCotis(m, an); return [m.matricule || "", nomComplet(m), ...MOIS_NOMS.map((x, i) => { const p = e.payes[pad(i + 1)]; return p ? Number(p.montant) || 0 : e.exempt ? "Ex." : e.dus.includes(pad(i + 1)) ? "dû" : ""; }), e.verse, e.retard.length]; })],
            [12, 26, ...MOIS_NOMS.map(() => 8), 12, 10]);
        }
        const vsp = [];
        (S.speciales || []).forEach((sp) => versementsSp(sp).forEach((v) => { const m = membre(v.membreId); vsp.push([sp.titre || "", dateFrC(v.date), m ? nomComplet(m) : "", Number(v.montant) || 0, v.annule ? "Oui" : "Non"]); }));
        if (vsp.length) feuille("Cotisations spéciales", [["Cotisation", "Date", "Membre", "Montant (FCFA)", "Annulé"], ...vsp], [30, 12, 26, 14, 8]);
        if ((S.offrandes || []).length) feuille("Offrandes", [["Date", "Type", "Donateur", "Montant (FCFA)", "Moyen", "Annulée"],
          ...S.offrandes.slice().sort((a, b) => cmpFr(a.date || "", b.date || "")).map((o) => { const m = o.membreId ? membre(o.membreId) : null; return [dateFrC(o.date), o.type || "", m ? nomComplet(m) : o.donateur || "Anonyme", Number(o.montant) || 0, o.moyen || "", o.annule ? "Oui" : "Non"]; })],
          [12, 18, 26, 14, 12, 8]);
      }
      if ((S.projets || []).length) {
        const rows = [["Projet", "Statut", "Catégorie", "Début", "Fin", "Budget (FCFA)", "Collecté (FCFA)", "Dépensé (FCFA)", "Avancement"]];
        S.projets.forEach((p) => { const b = accesFinances() && S.pret.projetsFin ? bilanFinP(p) : null; rows.push([p.titre || "", statutP(p), p.categorie || "", dateFrC(p.dateDebut), dateFrC(p.dateFin), budgetP(p), b ? b.collecte : "", b ? b.depense : "", avancementP(p) == null ? "" : Math.round(avancementP(p) * 100) + " %"]); });
        feuille("Projets", rows, [30, 14, 18, 12, 12, 14, 14, 14, 12]);
      }
      if ((S.garnisons || []).length) feuille("Points et garnisons", [["Nom", "Type", "Pays", "Ville", "Rattachée à", "Membres"], ...S.garnisons.map((g) => [g.nom || "", g.type || "", g.pays || "", g.ville || "", nomG(g.parentId), membresActifs().filter((m) => m.garnisonId === g.id).length])], [26, 16, 16, 16, 22, 10]);
      if ((S.decisions || []).length) feuille("Décisions", [["Date", "Titre", "Statut", "Détail"], ...S.decisions.map((d) => [dateFrC(d.date), d.titre || "", d.statut || "", d.texte || d.description || ""])], [12, 34, 14, 60]);
      const blob = await classeurXlsx(feuilles);
      await telechargerBlob(`SDE-sauvegarde-${aujourdhui()}.xlsx`, blob);
      if (peutAdmin()) { try { await upsert("config/general", { derniereSauvegarde: aujourdhui() }); } catch (e) { /* date non notée */ } }
    } catch (e) { toast(e && e.code === "bibliotheque" ? "La bibliothèque Excel n’a pas pu être chargée : vérifiez la connexion." : "La sauvegarde Excel a échoué.", "err"); }
    if (bouton && document.contains(bouton)) bouton.disabled = false;
  }

  /* ════════════════════════ Copie de poche (consultation hors ligne) ════════════════════════ */
  function copieDePoche() {
    const c = cfg();
    const evs = aVenir().slice(0, 30);
    const mbs = accesRegistre() ? membresActifs().slice().sort(parNom) : [];
    const nomG = (id) => { const g = garnison(id); return g ? g.nom : ""; };
    const e = (s) => esc(String(s || ""));
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(c.nomCourt)} · copie de poche</title><style>
:root{--bg:#0f1e3d;--or:#e2c26a;--t:#161e35;--m:#535c75;--l:#dde1ea}*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--t);background:#eef0f5}
header{background:var(--bg);color:#fff;padding:18px 16px}header p{margin:2px 0;color:#b8c1d8;font-size:13px}h1{margin:0;font-size:20px}h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#85650f;margin:22px 0 8px}
main{max-width:760px;margin:0 auto;padding:0 16px 40px}.v{background:#fff;border:1px solid var(--l);border-radius:10px;padding:12px 14px;font-style:italic}.v b{display:block;font-style:normal;color:#85650f;font-size:13px;margin-top:4px}
ul{list-style:none;margin:0;padding:0;background:#fff;border:1px solid var(--l);border-radius:10px}li{padding:10px 14px;border-top:1px solid var(--l)}li:first-child{border-top:0}li small{display:block;color:var(--m)}a{color:#2b6cb0}
input{width:100%;padding:10px 12px;border:1px solid var(--l);border-radius:8px;font:inherit;margin-bottom:8px}footer{color:var(--m);font-size:12px;margin-top:24px}</style></head><body>
<header><h1>${e(c.nomOfficiel || c.nomCourt)}</h1><p>Copie de poche enregistrée le ${e(fmtLong(aujourdhui()))} à ${e(new Date().toTimeString().slice(0, 5))} · consultable sans réseau</p></header><main>
<h2>Texte fondateur</h2><p class="v">« Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent ! »<b>Ézéchiel 37.9</b></p>
<h2>Prochains rassemblements</h2>${evs.length ? `<ul>${evs.map((x) => `<li><b>${e(x.titre)}</b><small>${e([fmtLong(x.date), fmtHeure(x.heure), x.lieu].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>` : "<p>Aucun rassemblement programmé.</p>"}
${(S.annonces || []).length ? `<h2>Annonces</h2><ul>${S.annonces.filter((a) => !a.expireLe || a.expireLe >= aujourdhui()).slice(0, 10).map((a) => `<li><b>${e(a.titre)}</b><small>${e(a.texte)}</small></li>`).join("")}</ul>` : ""}
${mbs.length ? `<h2>Annuaire des soldats (${mbs.length})</h2><input type="search" placeholder="Rechercher un nom, un matricule, un point…" oninput="var q=this.value.toLowerCase();document.querySelectorAll('#ann li').forEach(function(l){l.style.display=l.textContent.toLowerCase().indexOf(q)>-1?'':'none'})"><ul id="ann">${mbs.map((m) => `<li><b>${e(nomComplet(m))}</b><small>${e([m.matricule, m.fonction || m.statut, nomG(m.garnisonId)].filter(Boolean).join(" · "))}</small>${m.telephone ? `<small><a href="tel:${e(String(m.telephone).replace(/[^\d+]/g, ""))}">${e(telAffiche(m.telephone))}</a> · <a href="${e(lienWa(m.telephone, ""))}">WhatsApp</a></small>` : ""}</li>`).join("")}</ul>` : ""}
<footer>${e(c.nomCourt)} · ${e(c.devise || "")}. Document confidentiel réservé au mouvement : ne le partagez pas en dehors.</footer></main></body></html>`;
    telecharger(`SDE-copie-de-poche-${aujourdhui()}.html`, html);
  }

  /* ════════════════════════ Installation sur le téléphone ════════════════════════ */
  let invite = null;
  window.addEventListener("beforeinstallprompt", (ev) => { ev.preventDefault(); invite = ev; });
  function ficheInstaller() {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const etape = (n, t) => `<li><span class="inst-n">${n}</span><span>${t}</span></li>`;
    const bloc = (titre, pas, actif) => `<section class="inst-b${actif ? " on" : ""}"><h3 class="h3">${titre}${actif ? ` <span class="chip ok">Votre appareil</span>` : ""}</h3><ol class="inst-l">${pas.map((p, i) => etape(i + 1, p)).join("")}</ol></section>`;
    const lien = lienApp();
    return `<p class="hint" style="margin-top:0">S.D.E. DIGITAL s’installe comme une application : une icône sur l’écran d’accueil ouvre directement l’application, sans chercher le lien.</p>
      <div class="inst-lien"><input class="inp" id="lien-app" readonly value="${esc(lien)}" aria-label="Lien de l’application"><button class="btn btn-sm btn-primary" type="button" data-act="copier" data-cible="lien-app">${I("i-copy")}Copier le lien</button><a class="btn btn-sm btn-ghost" href="${esc(lienWa("", "Voici le lien de l’application S.D.E. DIGITAL : " + lien))}" target="_blank" rel="noopener">${I("i-msg")}Partager</a></div>
      ${invite ? `<div class="btn-row" style="margin:10px 0">${btn("installer-pwa", "Installer maintenant", { ico: "i-down", cls: "btn-primary" })}</div>` : ""}
      ${bloc("Android (Chrome)", ["Ouvrez le lien de l’application dans <b>Chrome</b> et connectez-vous à Claude si c’est demandé.", "Touchez le menu <b>⋮</b> en haut à droite.", "Choisissez <b>Ajouter à l’écran d’accueil</b> (ou <b>Installer l’application</b>), puis <b>Ajouter</b>.", "L’icône apparaît sur l’écran d’accueil : un appui suffit pour ouvrir S.D.E. DIGITAL."], android)}
      ${bloc("iPhone et iPad (Safari)", ["Ouvrez le lien dans <b>Safari</b> et connectez-vous à Claude si c’est demandé.", "Touchez le bouton <b>Partager</b> (carré avec une flèche vers le haut).", "Faites défiler et choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>."], ios)}
      ${bloc("Ordinateur (Chrome ou Edge)", ["Ouvrez le lien de l’application.", "Cliquez sur l’icône d’installation dans la barre d’adresse, ou menu <b>⋮</b> › <b>Caster, enregistrer et partager</b> › <b>Créer un raccourci</b> (cochez « Ouvrir dans une fenêtre »)."], !ios && !android)}
      <h3 class="h3" style="margin-top:16px">Sans réseau</h3>
      <p class="hint">L’application garde sur cet appareil une copie des dernières données consultées : elle s’ouvre aussitôt, même avec un réseau faible, et reste lisible si la connexion tombe. Les enregistrements reprennent au retour du réseau.${S.cacheT ? ` Dernière copie : ${esc(fmtStamp(S.cacheT))}.` : ""}</p>
      <div class="btn-row">${accesRegistre() ? btn("copie-poche", "Télécharger la copie de poche", { ico: "i-down", sm: true }) : ""}${btn("effacer-cache", "Effacer les données de cet appareil", { sm: true })}</div>
      ${accesRegistre() ? `<p class="hint" style="margin-top:6px">La copie de poche est un fichier à garder dans le téléphone : agenda, annonces et annuaire des soldats, consultables sans aucune connexion.</p>` : ""}`;
  }
  const ouvrirInstaller = () => ouvrir({ titre: "Installer l’application", refresh: surveiller(() => ficheInstaller()), wide: true });

  /* ════════════════════════ Copie locale des données (ouverture instantanée, lecture hors ligne) ════════════════════════ */
  const CLE_CACHE = "sde-cache-v1";
  const CHAMPS_CACHE = ["evenements", "annonces", "ressources", "garnisons", "formations", "diffusions", "prieres", "chaine", "projets", "affiches", "membres", "decisions", "rappels", "moisDocs", "cotisations", "discipline", "suivi", "speciales", "offrandes", "projetsFin", "prieresConf", "acces"];
  let cacheT = 0;
  function planifierCache() {
    if (S.etat !== "pret" || !S.db || S.horsLigne || !S.pret.evenements || !S.pret.membres) return;
    clearTimeout(cacheT);
    cacheT = setTimeout(sauverCache, 8000);
  }
  function sauverCache() {
    try {
      const data = { cfgDoc: S.cfgDoc };
      for (const k of CHAMPS_CACHE) if (S.pret[k] || k === "rappels") data[k] = S[k];
      data.ops = {}; const mc = moisCourant(); if (S.ops[mc]) data.ops[mc] = S.ops[mc];
      const o = { t: Date.now(), uid: S.me.id || null, niveau: { peutEcrire: S.peutEcrire, estAdmin: S.estAdmin, estProprio: S.estProprio }, me: S.me, data };
      localStorage.setItem(CLE_CACHE, JSON.stringify(o));
      S.cacheT = o.t;
    } catch (e) { /* stockage plein ou indisponible : pas de copie locale */ }
  }
  function appliquerCache(uid, horsLigne) {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(CLE_CACHE) || "null"); } catch (e) { o = null; }
    if (!o || !o.data) return false;
    if (!horsLigne && (!uid || o.uid !== uid)) return false;
    const d = o.data;
    S.cfgDoc = d.cfgDoc || null; S.pret.config = true;
    for (const k of CHAMPS_CACHE) if (d[k] !== undefined) { S[k] = d[k]; S.pret[k] = true; }
    if (d.ops) for (const [k, v] of Object.entries(d.ops)) { S.ops[k] = v; S.opsPret[k] = true; }
    if (horsLigne) { S.peutEcrire = o.niveau.peutEcrire; S.estAdmin = o.niveau.estAdmin; S.estProprio = o.niveau.estProprio; if (o.me) S.me = o.me; }
    S.cacheT = o.t;
    S.caches.local = true;
    return true;
  }
  function effacerCache() {
    try { localStorage.removeItem(CLE_CACHE); localStorage.removeItem("sde-espace"); } catch (e) { /* rien à effacer */ }
    S.cacheT = 0; ESP.code = ""; ESP.data = null;
    toast("Les données de cet appareil ont été effacées");
    dernier.sheet = null; render();
  }
  window.addEventListener("online", () => { if (S.horsLigne) location.reload(); });

  /* ════════════════════════ Pointage rapide : Entrée marque le seul nom trouvé ════════════════════════ */
  document.addEventListener("keydown", (ev) => {
    if (!ev.target || ev.target.id !== "q-pt" || ev.key !== "Enter" || ev.isComposing || !S.pt.id) return;
    ev.preventDefault();
    const e = evt(S.pt.id);
    if (!e || !peutEcrire()) return;
    const q = norm(ev.target.value);
    if (!q) return;
    const f = S.f.pointage;
    const l = membresActifs().filter((m) => (f.tous || concerne(e, m)) && norm(nomComplet(m) + " " + (m.matricule || "") + " " + (m.quartier || "") + " " + (m.fonction || "")).includes(q));
    if (l.length !== 1) { toast(l.length ? `${l.length} membres correspondent : précisez la recherche.` : "Aucun membre ne correspond.", l.length ? "" : "err"); return; }
    const m = l[0];
    if (presentsEffectifs(e)[m.id] !== true) { S.pt.attente[m.id] = true; planifierEnvoi(S.pt); }
    toast(`${nomComplet(m)} : présent`);
    S.f.pointage.q = "";
    ev.target.value = "";
    render();
  });
