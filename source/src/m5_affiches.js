  /* ════════════════════════ Affiches ════════════════════════ */
  const FORMATS_AFF = { carre: { w: 1080, h: 1080, lib: "Carré", d: "WhatsApp, Facebook, Instagram" }, story: { w: 1080, h: 1920, lib: "Vertical", d: "Statut WhatsApp, story" }, a4: { w: 1240, h: 1754, lib: "A4", d: "Impression, affichage" } };
  const THEMES_AFF = {
    nuit: { lib: "Nuit et or", fond: ["#0a1430", "#1b2f5b"], acc: "#e2c26a", txt: "#ffffff", doux: "#c3cbe0", halo: "rgba(226,194,106,.20)", voile: "rgba(10,20,48,.72)" },
    feu: { lib: "Feu du réveil", fond: ["#190404", "#7a1410"], acc: "#ffb347", txt: "#ffffff", doux: "#f6cfb0", halo: "rgba(255,110,30,.30)", voile: "rgba(25,4,4,.70)" },
    pourpre: { lib: "Pourpre royal", fond: ["#241440", "#6b4fa0"], acc: "#d4af37", txt: "#ffffff", doux: "#ddd2f0", halo: "rgba(212,175,55,.22)", voile: "rgba(36,20,64,.70)" },
    lumiere: { lib: "Lumière", fond: ["#fdf9ef", "#efe2c0"], acc: "#8a6a14", txt: "#0f1e3d", doux: "#4f5a72", halo: "rgba(154,122,34,.16)", voile: "rgba(253,249,239,.80)" },
  };
  const MODELES_AFF = [["evenement", "Événement"], ["info", "Information"], ["anniv", "Anniversaire"], ["libre", "Libre"]];
  const AFF_VIDE = { modele: "evenement", format: "carre", theme: "nuit", surtitre: "", titre: "", soustitre: "", date: "", heure: "", lieu: "", orateurs: "", texte: "", verset: "", reference: "", contact: "", membreId: "", evenementId: "" };
  function rectArrondi(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
  function couvrir(x, img, l, t, w, h) {
    const k = Math.max(w / img.width, h / img.height);
    const iw = img.width * k, ih = img.height * k;
    x.drawImage(img, l + (w - iw) / 2, t + (h - ih) / 2, iw, ih);
  }
  /* Dessine l’affiche : bandeau du mouvement, bloc central centré verticalement, verset et contact en pied. */
  async function rendreAffiche(a, img) {
    await polices();
    const F = FORMATS_AFF[a.format] || FORMATS_AFF.carre, T = THEMES_AFF[a.theme] || THEMES_AFF.nuit;
    const W = F.w, H = F.h, u = W / 1080, haut = H / W > 1.5;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const COND = '"Saira Condensed", "Arial Narrow", sans-serif', CORPS = '"Atkinson Hyperlegible", Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", serif', PLUME = '"Great Vibes", "Brush Script MT", cursive';
    const c = cfg();
    const logo = await imageLogo();
    // Fond
    const g = x.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, T.fond[0]); g.addColorStop(1, T.fond[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (img && a.modele !== "anniv") { x.globalAlpha = 0.9; couvrir(x, img, 0, 0, W, H); x.globalAlpha = 1; x.fillStyle = T.voile; x.fillRect(0, 0, W, H); }
    const halo = (cx, cy, r) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, T.halo); rg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = rg; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
    halo(W * 0.85, H * 0.12, 520 * u); halo(W * 0.1, H * 0.92, 600 * u);
    if (a.theme === "feu") { halo(W * 0.5, H * 1.02, 700 * u); }
    x.save(); x.globalAlpha = a.theme === "lumiere" ? 0.06 : 0.07; x.strokeStyle = T.acc; x.lineWidth = 2 * u;
    for (let k = 0; k < 18; k += 1) { const t = (k - 8.5) * 0.09; x.beginPath(); x.moveTo(W / 2, -60 * u); x.lineTo(W / 2 + Math.sin(t) * H * 1.6, -60 * u + Math.cos(t) * H * 1.6); x.stroke(); }
    x.restore();
    if (logo) { x.globalAlpha = a.theme === "lumiere" ? 0.06 : 0.05; const s = W * 0.9; x.drawImage(logo, (W - s) / 2, H * 0.5 - s / 2, s, s); x.globalAlpha = 1; }
    // Cadre
    x.strokeStyle = T.acc; x.globalAlpha = 0.7; x.lineWidth = 3 * u; rectArrondi(x, 30 * u, 30 * u, W - 60 * u, H - 60 * u, 26 * u); x.stroke();
    x.globalAlpha = 0.3; x.lineWidth = 1.2 * u; rectArrondi(x, 42 * u, 42 * u, W - 84 * u, H - 84 * u, 20 * u); x.stroke(); x.globalAlpha = 1;
    // En-tête
    const off = c.nomOfficiel || "";
    const i = off.toLowerCase().indexOf("soldats");
    const l1 = (i > 0 ? off.slice(0, i) : "Mouvement").trim().toUpperCase();
    const l2 = (i > 0 ? off.slice(i) : off || c.nomCourt).trim().toUpperCase();
    const hy = 78 * u, ls = 92 * u;
    x.textBaseline = "alphabetic";
    x.font = `700 ${34 * u}px ${COND}`; espacer(x, `${1.5 * u}px`);
    const wl2 = x.measureText(l2).width;
    const bloc = (logo ? ls + 22 * u : 0) + Math.min(wl2, W - 260 * u);
    let bx = (W - bloc) / 2;
    if (logo) { x.drawImage(logo, bx, hy, ls, ls); bx += ls + 22 * u; }
    x.textAlign = "left";
    x.fillStyle = T.acc; espacer(x, `${3 * u}px`); ecrireAjuste(x, l1, bx, hy + 34 * u, W - 260 * u, 19 * u, `600 {t}px ${COND}`, 11 * u);
    x.fillStyle = T.txt; espacer(x, `${1.5 * u}px`); ecrireAjuste(x, l2, bx, hy + 74 * u, W - 260 * u, 34 * u, `700 {t}px ${COND}`, 18 * u);
    espacer(x, "0px");
    // Pied : contact
    const piedY = H - 92 * u;
    const contact = String(a.contact || "").trim();
    x.textAlign = "center";
    if (contact) { x.fillStyle = T.doux; ecrireAjuste(x, contact, W / 2, piedY, W - 180 * u, 27 * u, `700 {t}px ${CORPS}`, 14 * u); }
    x.fillStyle = T.acc; x.font = `600 ${18 * u}px ${COND}`; espacer(x, `${4 * u}px`);
    x.fillText((c.devise || "").toUpperCase(), W / 2, piedY + (contact ? 36 : 6) * u); espacer(x, "0px");
    // Verset (ancré au-dessus du pied)
    let basContenu = piedY - (contact ? 60 : 40) * u;
    const vt = String(a.verset || "").trim();
    if (vt) {
      x.font = `italic 400 ${30 * u}px ${SERIF}`;
      const lignesV = lignesTexte(x, `« ${vt.replace(/^[«"“\s]+|[»"”\s]+$/g, "")} »`, W - 220 * u).slice(0, 4);
      const hV = lignesV.length * 40 * u + (a.reference ? 40 * u : 0);
      let vy = basContenu - hV + 30 * u;
      x.fillStyle = T.doux;
      lignesV.forEach((l) => { x.fillText(l, W / 2, vy); vy += 40 * u; });
      if (a.reference) { x.fillStyle = T.acc; x.font = `700 ${22 * u}px ${COND}`; espacer(x, `${2 * u}px`); x.fillText(String(a.reference).toUpperCase(), W / 2, vy + 2 * u); espacer(x, "0px"); }
      basContenu -= hV + 34 * u;
      x.strokeStyle = T.acc; x.globalAlpha = 0.5; x.lineWidth = 1.5 * u; x.beginPath(); x.moveTo(W / 2 - 90 * u, basContenu + 6 * u); x.lineTo(W / 2 + 90 * u, basContenu + 6 * u); x.stroke(); x.globalAlpha = 1;
      basContenu -= 20 * u;
    }
    // Bloc central : on mesure, puis on dessine centré entre l’en-tête et le verset
    const hautContenu = hy + ls + 56 * u;
    const dispo = basContenu - hautContenu;
    const blocs = [];
    const maxW = W - 150 * u;
    const surt = String(a.surtitre || "").trim();
    if (a.modele === "anniv") {
      const r = (haut ? 230 : 150) * u;
      blocs.push({ h: 2 * r + 30 * u, d: (y) => {
        const cx = W / 2, cy = y + r;
        x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
        if (img) couvrir(x, img, cx - r, cy - r, 2 * r, 2 * r);
        else { x.fillStyle = T.acc; x.globalAlpha = 0.25; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); x.globalAlpha = 1; const m = membre(a.membreId); x.fillStyle = T.txt; x.font = `700 ${r * 0.8}px ${COND}`; x.textBaseline = "middle"; x.fillText(m ? initiales(m) : "★", cx, cy + 4 * u); x.textBaseline = "alphabetic"; }
        x.restore();
        x.strokeStyle = T.acc; x.lineWidth = 7 * u; x.beginPath(); x.arc(cx, cy, r + 6 * u, 0, Math.PI * 2); x.stroke();
        x.lineWidth = 2 * u; x.globalAlpha = 0.5; x.beginPath(); x.arc(cx, cy, r + 20 * u, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1;
      } });
      blocs.push({ h: (haut ? 120 : 100) * u, d: (y) => { x.fillStyle = T.acc; ecrireAjuste(x, surt || "Joyeux anniversaire", W / 2, y + (haut ? 92 : 78) * u, maxW, (haut ? 110 : 92) * u, `400 {t}px ${PLUME}`, 40 * u); } });
    } else if (surt) {
      blocs.push({ h: 58 * u, d: (y) => { x.fillStyle = T.acc; espacer(x, `${6 * u}px`); ecrireAjuste(x, surt.toUpperCase(), W / 2, y + 38 * u, maxW, 34 * u, `600 {t}px ${COND}`, 16 * u); espacer(x, "0px"); } });
    }
    const titre = String(a.titre || "").trim() || (a.modele === "anniv" ? "" : "Titre de l’affiche");
    if (titre) {
      let t = (a.modele === "anniv" ? (haut ? 96 : 80) : haut ? 150 : 124) * u, lignes;
      const maxL = a.modele === "anniv" ? 2 : 3;
      for (;;) { x.font = `700 ${t}px ${COND}`; lignes = lignesTexte(x, titre.toUpperCase(), maxW); if ((lignes.length <= maxL && lignes.every((l) => x.measureText(l).width <= maxW)) || t <= 52 * u) break; t -= 4 * u; }
      const lh = t * 0.98;
      blocs.push({ h: lignes.length * lh + 10 * u, d: (y) => { x.font = `700 ${t}px ${COND}`; x.fillStyle = T.txt; lignes.forEach((l, k) => x.fillText(l, W / 2, y + t * 0.86 + k * lh)); } });
    }
    const st = String(a.soustitre || "").trim();
    if (st) {
      x.font = `italic 400 ${40 * u}px ${SERIF}`;
      const ls2 = lignesTexte(x, st, maxW).slice(0, 3);
      blocs.push({ h: ls2.length * 50 * u + 14 * u, d: (y) => { x.font = `italic 400 ${40 * u}px ${SERIF}`; x.fillStyle = T.doux; ls2.forEach((l, k) => x.fillText(l, W / 2, y + 44 * u + k * 50 * u)); } });
    }
    const infos = [];
    if (a.date) infos.push(fmtLong(a.date).toUpperCase());
    const hl = [a.heure ? fmtHeure(a.heure).toUpperCase() : "", String(a.lieu || "").trim()].filter(Boolean);
    if (infos.length || hl.length) {
      blocs.push({ h: (infos.length ? 92 : 0) * u + hl.length * 48 * u + 22 * u, d: (y) => {
        let yy = y + 10 * u;
        if (infos.length) {
          x.font = `700 ${46 * u}px ${COND}`; espacer(x, `${2 * u}px`);
          const w = Math.min(maxW, x.measureText(infos[0]).width + 70 * u);
          x.fillStyle = T.acc; rectArrondi(x, (W - w) / 2, yy, w, 74 * u, 37 * u); x.fill();
          x.fillStyle = a.theme === "lumiere" ? "#ffffff" : T.fond[0]; ecrireAjuste(x, infos[0], W / 2, yy + 52 * u, w - 50 * u, 46 * u, `700 {t}px ${COND}`, 20 * u); espacer(x, "0px");
          yy += 92 * u;
        }
        x.fillStyle = T.txt;
        hl.forEach((l, k) => { ecrireAjuste(x, l, W / 2, yy + 36 * u + k * 48 * u, maxW, (k === 0 && a.heure ? 40 : 34) * u, `${k === 0 && a.heure ? 700 : 400} {t}px ${k === 0 && a.heure ? COND : CORPS}`, 16 * u); });
      } });
    }
    const ora = String(a.orateurs || "").trim();
    if (ora) blocs.push({ h: 56 * u, d: (y) => { x.fillStyle = T.acc; ecrireAjuste(x, `Avec ${ora}`, W / 2, y + 40 * u, maxW, 34 * u, `700 {t}px ${CORPS}`, 16 * u); } });
    const tx = String(a.texte || "").trim();
    if (tx) {
      let t = 32 * u, ls3;
      const place = Math.max(80 * u, dispo - blocs.reduce((s, b) => s + b.h, 0) - 30 * u);
      for (;;) { x.font = `400 ${t}px ${CORPS}`; ls3 = tx.split(/\n+/).flatMap((p) => lignesTexte(x, p, maxW - 40 * u)); if (ls3.length * t * 1.35 <= place || t <= 20 * u) break; t -= 2 * u; }
      const maxLignes = Math.max(2, Math.floor(place / (t * 1.35)));
      if (ls3.length > maxLignes) { ls3 = ls3.slice(0, maxLignes); ls3[maxLignes - 1] = ls3[maxLignes - 1].replace(/\s*\S*$/, " …"); }
      blocs.push({ h: ls3.length * t * 1.35 + 20 * u, d: (y) => { x.font = `400 ${t}px ${CORPS}`; x.fillStyle = T.txt; ls3.forEach((l, k) => x.fillText(l, W / 2, y + t * 1.1 + k * t * 1.35)); } });
    }
    const gap = 18 * u;
    const total = blocs.reduce((s, b) => s + b.h, 0) + gap * Math.max(0, blocs.length - 1);
    let y = hautContenu + Math.max(0, (dispo - total) / 2);
    x.textAlign = "center";
    for (const b of blocs) { b.d(y); y += b.h + gap; }
    x.textAlign = "left";
    return cv;
  }

  /* — Atelier — */
  const AF = { a: null, id: null, img: null, timer: 0, rendu: 0 };
  function ouvrirAffiche(preset = {}, id = null) {
    const c = cfg();
    AF.a = { ...AFF_VIDE, contact: String(c.contactCarte || DEFAUTS.contactCarte), ...preset };
    AF.id = id; AF.img = null;
    const a = AF.a;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const evts = S.evenements.slice().sort((x1, x2) => cmpFr(x2.date, x1.date)).slice(0, 60).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre}`]);
    const html = `<div class="aff-ed">
      <div class="aff-prev"><canvas id="aff-cv" class="aff-cv" role="img" aria-label="Aperçu de l’affiche"></canvas><p class="hint" id="aff-etat" aria-live="polite"></p></div>
      <form class="form aff-form" id="f-aff" novalidate>
        <div class="f2">${champ("af-modele", "Modèle", sel("af-modele", "modele", MODELES_AFF, a.modele, null))}${champ("af-format", "Format", sel("af-format", "format", Object.entries(FORMATS_AFF).map(([k, v]) => [k, `${v.lib} · ${v.d}`]), a.format, null))}</div>
        <div class="field"><span class="lab" id="lab-th">Couleurs</span><div class="aff-th" role="radiogroup" aria-labelledby="lab-th">${Object.entries(THEMES_AFF).map(([k, t]) => `<label class="aff-sw" title="${esc(t.lib)}"><input type="radio" name="theme" value="${k}"${a.theme === k ? " checked" : ""}><span style="background:linear-gradient(135deg,${t.fond[0]},${t.fond[1]});--acc:${t.acc}"><i></i></span><small>${esc(t.lib)}</small></label>`).join("")}</div></div>
        <div id="af-w-evt" class="aff-opt" data-modeles="evenement">${champ("af-evt", "Rassemblement de l’agenda", sel("af-evt", "evenementId", evts, a.evenementId, "Aucun (saisie libre)"))}</div>
        <div id="af-w-mb" class="aff-opt" data-modeles="anniv">${champ("af-mb", "Membre fêté", sel("af-mb", "membreId", mbs, a.membreId, "Choisir un membre"))}</div>
        ${champ("af-sur", "Surtitre", inp("af-sur", "surtitre", a.surtitre, 'autocomplete="off" placeholder="Conférence internationale, Invitation, Joyeux anniversaire…"'))}
        ${champ("af-titre", "Titre", inp("af-titre", "titre", a.titre, 'autocomplete="off"'))}
        ${champ("af-st", "Thème ou sous-titre", inp("af-st", "soustitre", a.soustitre, 'autocomplete="off"'))}
        <div class="aff-opt" data-modeles="evenement info libre"><div class="f2">${champ("af-date", "Date", inp("af-date", "date", a.date, 'type="date"'))}${champ("af-heure", "Heure", inp("af-heure", "heure", a.heure, 'type="time"'))}</div>
        ${champ("af-lieu", "Lieu", inp("af-lieu", "lieu", a.lieu, 'autocomplete="off"'))}</div>
        <div class="aff-opt" data-modeles="evenement">${champ("af-ora", "Orateurs ou invités", inp("af-ora", "orateurs", a.orateurs, 'autocomplete="off" placeholder="Apôtre Jérémy Octave GLAZAÏ…"'))}</div>
        ${champ("af-texte", "Texte", zone("af-texte", "texte", a.texte, 'rows="3"'))}
        <div class="f2">${champ("af-vers", "Verset", zone("af-vers", "verset", a.verset, 'rows="2"'))}${champ("af-ref", "Référence", inp("af-ref", "reference", a.reference, 'autocomplete="off" placeholder="Actes 2.17"'))}</div>
        ${champ("af-cont", "Contact en pied", inp("af-cont", "contact", a.contact, 'autocomplete="off"'))}
        <div class="field"><span class="lab">Image</span><div class="btn-row"><label class="btn btn-ghost btn-sm" for="af-img">${I("i-image")}Choisir une image</label><input type="file" id="af-img" accept="image/*" class="sr">${btn("aff-image-retirer", "Retirer", { ico: "i-x", sm: true })}</div><p class="hint">Photo d’orateur, visuel de fond… Elle reste sur votre appareil. Pour un anniversaire, la photo de la fiche du membre est utilisée.</p></div>
      </form>
    </div>
    <div class="actions aff-actions">${btn("aff-dl", "Télécharger (PNG)", { ico: "i-down", cls: "btn-primary" })}${btn("aff-pdf", "PDF", { ico: "i-file" })}${btn("aff-partager", "Partager", { ico: "i-msg" })}${S.sample ? btn("aff-ia", "Rédiger avec Éliézer", { ico: "i-spark" }) : ""}${peutEcrire() ? btn("aff-enregistrer", id ? "Enregistrer" : "Garder dans l’atelier", { ico: "i-check" }) : ""}</div>`;
    ouvrir({ titre: "Atelier d’affiches", wide: true, html, apres: (sheet) => {
      const f = sheet.querySelector("#f-aff");
      const lire = () => { const fd = new FormData(f); for (const k of Object.keys(AFF_VIDE)) if (fd.has(k)) AF.a[k] = String(fd.get(k) || ""); };
      f.addEventListener("input", (ev) => { if (ev.target.id === "af-img") return; lire(); planifierApercu(); });
      f.addEventListener("change", async (ev) => {
        const t = ev.target;
        if (t.id === "af-img") { const fi = t.files && t.files[0]; if (fi) { try { AF.img = await createImageBitmap(fi); } catch (e) { toast("Cette image n’a pas pu être lue.", "err"); } } t.value = ""; planifierApercu(); return; }
        lire();
        if (t.id === "af-modele") { modeleAffiche(sheet); }
        if (t.id === "af-evt") remplirDepuisEvt(sheet, t.value);
        if (t.id === "af-mb") await remplirDepuisMembre(sheet, t.value);
        planifierApercu();
      });
      modeleAffiche(sheet, true);
      if (AF.a.modele === "anniv" && AF.a.membreId) remplirDepuisMembre(sheet, AF.a.membreId, true).then(() => planifierApercu(0));
      else planifierApercu(0);
    } });
  }
  function modeleAffiche(sheet, initial) {
    const m = AF.a.modele;
    sheet.querySelectorAll(".aff-opt").forEach((el) => { el.hidden = !el.dataset.modeles.split(" ").includes(m); });
    if (!initial && m === "anniv" && !AF.a.surtitre) { AF.a.surtitre = "Joyeux anniversaire"; const s = sheet.querySelector("#af-sur"); if (s) s.value = AF.a.surtitre; }
  }
  const champAff = (sheet, k, v) => { AF.a[k] = v; const el = sheet.querySelector(`#f-aff [name="${k}"]`); if (el) el.value = v; };
  function remplirDepuisEvt(sheet, id) {
    const e = evt(id);
    if (!e) return;
    champAff(sheet, "titre", e.titre || "");
    champAff(sheet, "date", e.date || "");
    champAff(sheet, "heure", e.heure || "");
    champAff(sheet, "lieu", e.lieu || "");
    if (!AF.a.surtitre) champAff(sheet, "surtitre", e.type && e.type !== "Autre" ? e.type : "Invitation");
    if (e.description && !AF.a.texte) champAff(sheet, "texte", e.description);
  }
  async function remplirDepuisMembre(sheet, id, initial) {
    const m = membre(id);
    AF.img = null;
    if (!m) return;
    if (!initial || !AF.a.titre) champAff(sheet, "titre", nomUsuel(m));
    if (!AF.a.surtitre) champAff(sheet, "surtitre", "Joyeux anniversaire");
    if (!initial && !AF.a.texte) champAff(sheet, "texte", `Toute la famille ${cfg().nomCourt} rend grâce à Dieu pour ta vie !`);
    if (!AF.a.verset) {
      const v = versetAnniv(m);
      const r = /^«\s*(.*?)\s*»\s*\((.*)\)$/.exec(v);
      if (r) { champAff(sheet, "verset", r[1]); champAff(sheet, "reference", r[2]); }
    }
    AF.img = await photoBitmap(m);
  }
  function planifierApercu(delai = 180) {
    clearTimeout(AF.timer);
    AF.timer = setTimeout(async () => {
      const cvDom = $("#aff-cv");
      if (!cvDom) return;
      const n = ++AF.rendu;
      const cv = await rendreAffiche(AF.a, AF.img);
      if (n !== AF.rendu || !document.contains(cvDom)) return;
      cvDom.width = cv.width; cvDom.height = cv.height;
      cvDom.getContext("2d").drawImage(cv, 0, 0);
      AF.cv = cv;
      const e1 = $("#aff-etat"); if (e1) e1.textContent = `${FORMATS_AFF[AF.a.format].lib} · ${cv.width} × ${cv.height} px`;
    }, delai);
  }
  const nomFichierAffiche = (ext) => `affiche-${sansAccents(AF.a.titre || AF.a.surtitre || "sde").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "sde"}-${AF.a.format}.${ext}`;
  async function exporterAffiche(type) {
    const cv = await rendreAffiche(AF.a, AF.img);
    if (type === "pdf") {
      const F = FORMATS_AFF[AF.a.format];
      const pw = AF.a.format === "a4" ? 595.28 : 595.28, ph = pw * (F.h / F.w);
      await telechargerBlob(nomFichierAffiche("pdf"), pdfImages([await jpegDe(cv)], pw, ph));
      return;
    }
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
    if (type === "partager") {
      const fichier = new File([blob], nomFichierAffiche("png"), { type: "image/png" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: AF.a.titre || "Affiche" }); return; }
      } catch (e) { if (e && e.name === "AbortError") return; }
      toast("Le partage direct n’est pas disponible ici : l’affiche est téléchargée, vous pourrez l’envoyer ensuite.");
    }
    await telechargerBlob(nomFichierAffiche("png"), blob);
  }
  async function enregistrerAffiche() {
    const data = {};
    for (const k of Object.keys(AFF_VIDE)) data[k] = AF.a[k] || "";
    const ref = AF.id ? S.db.doc("affiches/" + AF.id) : S.db.collection("affiches").doc();
    const ok = await ecrire(async () => { if (AF.id) await ref.update({ ...data, ...tampon() }); else await ref.set({ ...data, ...creation() }); }, AF.id ? "Affiche enregistrée" : "Affiche gardée dans l’atelier");
    if (ok && !AF.id) { AF.id = ref.id; const b = document.querySelector('[data-act="aff-enregistrer"]'); if (b) b.lastChild.textContent = "Enregistrer"; }
  }
  async function texteAffiche() {
    if (!S.sample) return;
    const b = document.querySelector('[data-act="aff-ia"]');
    if (b) b.disabled = true;
    const e1 = $("#aff-etat"); if (e1) e1.textContent = "Éliézer rédige…";
    const a = AF.a, c = cfg(), m = membre(a.membreId);
    const consigne = `Tu rédiges le texte d’une affiche pour le ${c.nomOfficiel} (${c.nomCourt}), mouvement chrétien prophético-apostolique dont le siège est à Abidjan. Style : français soigné, percutant, fervent, sans exagération.
Modèle : ${MODELES_AFF.find(([k]) => k === a.modele)[1]}.
Informations déjà saisies (à respecter, ne pas inventer de date, d’heure ou de lieu) :
${JSON.stringify({ surtitre: a.surtitre, titre: a.titre, sousTitre: a.soustitre, date: a.date ? fmtLong(a.date) : "", heure: a.heure, lieu: a.lieu, orateurs: a.orateurs, texte: a.texte, membreFete: m ? nomUsuel(m) : "" })}
Réponds uniquement par un objet JSON : {"surtitre": "2 à 4 mots", "titre": "6 mots au plus", "soustitre": "une phrase courte (thème)", "texte": "2 phrases au plus d’invitation ou de vœux", "verset": "texte exact de la Bible Louis Segond 1910, court", "reference": "Livre chapitre.verset"}.
Garde le titre existant s’il est déjà rempli. Si tu n’es pas certain du texte exact d’un verset Louis Segond 1910, mets "" pour verset et reference.`;
    try {
      const r = await S.sample.json(consigne, { modelTier: "quick", cache: false });
      const sheet = $("#sheet");
      if (r && typeof r === "object" && sheet) {
        for (const k of ["surtitre", "titre", "soustitre", "texte", "verset", "reference"]) {
          const v = typeof r[k] === "string" ? r[k].trim() : "";
          if (!v) continue;
          if (k === "titre" && a.titre) continue;
          champAff(sheet, k, v);
        }
        planifierApercu(0);
      }
    } catch (e) { if (e1) e1.textContent = ""; toast(messageIA(e), "err"); }
    finally { if (b && document.contains(b)) b.disabled = false; }
  }
  function vueAffiches() {
    const ecr = peutEcrire();
    let out = `<div class="aff-modeles">${MODELES_AFF.map(([k, l]) => `<button class="tile" type="button" data-act="nouvelle-affiche" data-modele="${k}"><span class="tile-ico" aria-hidden="true">${I(k === "anniv" ? "i-cake" : k === "evenement" ? "i-cal" : k === "info" ? "i-horn" : "i-image")}</span><span class="tile-t">${esc(l)}</span><span class="tile-d">${esc(k === "evenement" ? "Culte, conférence, veillée…" : k === "info" ? "Annonce, communiqué, appel" : k === "anniv" ? "Avec la photo du membre" : "Composition libre")}</span></button>`).join("")}</div>`;
    const prochains = aVenir().slice(0, 5);
    if (prochains.length) out += `<h2 class="h3">Rassemblements à venir</h2><div class="list">${prochains.map((e) => `<div class="row nolead sp-row"><span class="row-main"><span class="row-t">${esc(e.titre)}</span><span class="row-m">${esc([fmtLong(e.date), fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · "))}</span></span><span class="row-r">${btn("affiche-evt", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(e.id)}"` })}</span></div>`).join("")}</div>`;
    const annivs = membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= 14).sort((a1, b1) => a1.a.dans - b1.a.dans);
    if (annivs.length) out += `<h2 class="h3">Anniversaires des deux prochaines semaines</h2><div class="list">${annivs.map(({ m, a }) => `<div class="row sp-row">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomUsuel(m))}</span><span class="row-m">${esc(a.dans === 0 ? "Aujourd’hui" : fmtJM(a.date))}</span></span><span class="row-r">${btn("affiche-anniv", "Affiche", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}</span></div>`).join("")}</div>`;
    const gardees = (S.affiches || []).slice().sort((a1, b1) => (b1.modifieLe || b1.creeLe || 0) - (a1.modifieLe || a1.creeLe || 0));
    out += `<h2 class="h3">Affiches gardées</h2>`;
    out += gardees.length ? `<div class="list">${gardees.map((a) => `<div class="row nolead sp-row"><button class="link row-main" type="button" data-act="voir-affiche" data-id="${esc(a.id)}" style="text-align:left"><span class="row-t">${esc(a.titre || a.surtitre || "Sans titre")}</span><span class="row-m">${esc([(MODELES_AFF.find(([k]) => k === a.modele) || ["", ""])[1], (FORMATS_AFF[a.format] || {}).lib, THEMES_AFF[a.theme] ? THEMES_AFF[a.theme].lib : "", a.date ? fmtCourt(a.date) : ""].filter(Boolean).join(" · "))}</span></button><span class="row-r">${ecr ? `<button class="icon-btn" type="button" data-act="supprimer-affiche" data-id="${esc(a.id)}" aria-label="Supprimer l’affiche">${I("i-trash")}</button>` : ""}</span></div>`).join("")}</div>` : `<p class="hint">Les affiches gardées dans l’atelier apparaissent ici pour être retravaillées ou déclinées dans un autre format.</p>`;
    return out;
  }
  function presetEvt(id) {
    const e = evt(id);
    if (!e) return null;
    return { modele: "evenement", evenementId: e.id, titre: e.titre || "", date: e.date || "", heure: e.heure || "", lieu: e.lieu || "", surtitre: e.type && e.type !== "Autre" ? e.type : "Invitation", texte: e.description || "", theme: /in\s*fire|réveil|feu/i.test(e.titre || "") ? "feu" : "nuit" };
  }
