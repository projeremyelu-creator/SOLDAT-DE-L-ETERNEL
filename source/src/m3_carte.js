  /* ════════════════════════ Carte de membre : verso et PDF ════════════════════════ */
  const signatureCarte = () => String(cfg().signatureCarte || DEFAUTS.signatureCarte).trim() || DEFAUTS.signatureCarte;
  function lignesTexte(x, texte, max) {
    const mots = String(texte || "").split(/\s+/).filter(Boolean);
    const out = [];
    let cur = "";
    for (const w of mots) {
      const t = cur ? cur + " " + w : w;
      if (x.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  async function rendreVerso(m) {
    await polices();
    const c = cfg();
    const an = anneeCarte();
    const code = await codeControle(m, an);
    const logo = await imageLogo();
    const W = 1012, H = 638;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const OR = "#d4ad48", OR_FONCE = "#9a7a22", NUIT = "#0f1e3d", ENCRE = "#1b2f5b", GRIS = "#5b6478", BRUME = "#b8c1d8";
    const COND = '"Saira Condensed", "Arial Narrow", sans-serif', CORPS = '"Atkinson Hyperlegible", Arial, sans-serif';
    // Fond ivoire et filigrane
    x.save(); arrondi(x, 0, 0, W, H, 34); x.clip();
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#fbf7ec"); g.addColorStop(1, "#efe5cb");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(154,122,34,.07)"; x.lineWidth = 1;
    for (let k = -H; k < W; k += 18) { x.beginPath(); x.moveTo(k, H); x.lineTo(k + H, 0); x.stroke(); }
    if (logo) { x.globalAlpha = 0.07; x.drawImage(logo, W / 2 - 200, 150, 400, 400); x.globalAlpha = 1; }
    // Bandeau bleu nuit
    const gb = x.createLinearGradient(0, 0, W, 0); gb.addColorStop(0, NUIT); gb.addColorStop(1, "#1b2f5b");
    x.fillStyle = gb; x.fillRect(0, 0, W, 112);
    x.fillStyle = OR; x.fillRect(0, 112, W, 4);
    x.restore();
    if (logo) x.drawImage(logo, 40, 20, 74, 74);
    const off = c.nomOfficiel || "";
    const i = off.toLowerCase().indexOf("soldats");
    const l2 = (i > 0 ? off.slice(i) : off || c.nomCourt).trim().toUpperCase();
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    x.fillStyle = "#ffffff"; espacer(x, "1px"); ecrireAjuste(x, l2, 132, 62, 560, 36, `700 {t}px ${COND}`, 18);
    x.fillStyle = BRUME; espacer(x, "2px"); ecrireAjuste(x, (c.devise || "").toUpperCase(), 132, 90, 560, 15, `600 {t}px ${COND}`, 10);
    espacer(x, "3px"); x.textAlign = "right"; x.fillStyle = "#e2c26a"; x.font = `700 19px ${COND}`; x.fillText(`EXERCICE ${an}`, W - 44, 62);
    x.fillStyle = BRUME; x.font = `600 15px ${COND}`; x.fillText("VERSO", W - 44, 90);
    espacer(x, "0px"); x.textAlign = "left";
    // Cadre doré
    x.strokeStyle = OR; x.lineWidth = 3; arrondi(x, 16, 16, W - 32, H - 32, 24); x.stroke();
    // Titulaire : l’essentiel seulement
    const lab = (t, l, y) => { x.fillStyle = GRIS; x.font = `600 15px ${COND}`; espacer(x, "2px"); x.fillText(t, l, y); espacer(x, "0px"); };
    lab("TITULAIRE", 48, 172);
    x.fillStyle = NUIT; ecrireAjuste(x, nomComplet(m), 48, 214, 560, 38, `700 {t}px ${COND}`, 20);
    const g0 = garnison(m.garnisonId);
    const pt = g0 ? pointDeGarnison(g0.id) : null;
    lab("MATRICULE", 48, 282);
    x.fillStyle = ENCRE; ecrireAjuste(x, m.matricule || "—", 48, 316, 250, 28, `700 {t}px ${CORPS}`, 14);
    lab("POINT SDE", 320, 282);
    x.fillStyle = ENCRE; ecrireAjuste(x, pt ? String(pt.nom).replace(/^(point\s+)?sde\s+/i, "") : "—", 320, 316, 280, 28, `700 {t}px ${CORPS}`, 14);
    // Verset
    const vx = 640, vy = 150, vw = W - 48 - vx, vh = 212;
    x.fillStyle = "rgba(15,30,61,.94)"; arrondi(x, vx, vy, vw, vh, 16); x.fill();
    x.strokeStyle = OR; x.lineWidth = 1.5; arrondi(x, vx + 6, vy + 6, vw - 12, vh - 12, 12); x.stroke();
    x.fillStyle = "#e2c26a"; x.font = `700 54px Georgia, serif`; x.fillText("“", vx + 18, vy + 58);
    const vt = String(c.versetCarte || DEFAUTS.versetCarte);
    let taille = 22, lignes;
    do { x.font = `italic 400 ${taille}px Georgia, "Times New Roman", serif`; lignes = lignesTexte(x, vt, vw - 56); taille -= 1; } while (lignes.length * (taille + 9) > vh - 92 && taille > 13);
    x.fillStyle = "#ffffff";
    lignes.forEach((l, k) => x.fillText(l, vx + 28, vy + 66 + k * (taille + 9)));
    x.textAlign = "right"; x.fillStyle = "#e2c26a"; x.font = `700 17px ${COND}`; espacer(x, "1px");
    x.fillText(String(c.versetCarteRef || DEFAUTS.versetCarteRef).toUpperCase(), vx + vw - 24, vy + vh - 24); espacer(x, "0px"); x.textAlign = "left";
    // Pied : signature du titulaire et contact
    x.strokeStyle = "rgba(154,122,34,.55)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(48, 402); x.lineTo(W - 48, 402); x.stroke();
    lab("SIGNATURE DU TITULAIRE", 48, 444);
    x.strokeStyle = "rgba(27,47,91,.45)"; x.lineWidth = 1.2; x.setLineDash([5, 5]); x.beginPath(); x.moveTo(48, 556); x.lineTo(420, 556); x.stroke(); x.setLineDash([]);
    x.textAlign = "right";
    x.fillStyle = GRIS; x.font = `600 15px ${COND}`; espacer(x, "2px"); x.fillText("CARTE TROUVÉE ? MERCI DE LA RAPPORTER", W - 48, 444); espacer(x, "0px");
    const contact = String(c.contactCarte || DEFAUTS.contactCarte).split(/\s*[·|]\s*/).filter(Boolean);
    x.fillStyle = NUIT;
    contact.slice(0, 2).forEach((l, k) => ecrireAjuste(x, l, W - 48, 484 + k * 32, 470, 23, `700 {t}px ${CORPS}`, 12));
    x.fillStyle = OR_FONCE; x.font = `600 15px ${COND}`; espacer(x, "2px");
    x.fillText(`CONTRÔLE ${code}`, W - 48, 596); espacer(x, "0px");
    x.textAlign = "left";
    return { cv, code };
  }
  /* PDF minimal : une image JPEG pleine page par page (format carte bancaire 85,6 × 54 mm). */
  async function jpegDe(cv) {
    const t = document.createElement("canvas");
    t.width = cv.width; t.height = cv.height;
    const x = t.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, t.width, t.height);
    x.drawImage(cv, 0, 0);
    const b = await new Promise((ok) => t.toBlob(ok, "image/jpeg", 0.93));
    return { octets: new Uint8Array(await b.arrayBuffer()), w: t.width, h: t.height };
  }
  function pdfImages(images, pw = 242.65, ph = 153.07) {
    const enc = new TextEncoder();
    const morceaux = [];
    let taille = 0;
    const offs = [];
    const ajout = (v) => { const u = typeof v === "string" ? enc.encode(v) : v; morceaux.push(u); taille += u.length; };
    const n = images.length;
    // 1 catalogue, 2 pages, puis par page : page, contenu, image
    ajout("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const obj = (num, corps) => { offs[num] = taille; ajout(`${num} 0 obj\n`); corps(); ajout("\nendobj\n"); };
    obj(1, () => ajout("<< /Type /Catalog /Pages 2 0 R >>"));
    const kids = images.map((_, k) => `${3 + k * 3} 0 R`).join(" ");
    obj(2, () => ajout(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
    images.forEach((im, k) => {
      const p = 3 + k * 3, c = p + 1, i = p + 2;
      obj(p, () => ajout(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${k} ${i} 0 R >> >> /Contents ${c} 0 R >>`));
      const flux = `q ${pw} 0 0 ${ph} 0 0 cm /Im${k} Do Q`;
      obj(c, () => ajout(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`));
      obj(i, () => { ajout(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.octets.length} >>\nstream\n`); ajout(im.octets); ajout("\nendstream"); });
    });
    const total = 3 + n * 3;
    const xref = taille;
    let t = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let k = 1; k < total; k += 1) t += String(offs[k]).padStart(10, "0") + " 00000 n \n";
    ajout(t + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(morceaux, { type: "application/pdf" });
  }
  const baseFichierCarte = (m) => nomFichierCarte(m).replace(/\.png$/, "");
  async function ouvrirCarte(mid) {
    const m = membre(mid);
    if (!m) return;
    ouvrir({ titre: "Carte de membre", wide: true, html: chargement("Préparation de la carte…") });
    let r, v;
    try { [r, v] = await Promise.all([rendreCarte(m), rendreVerso(m)]); }
    catch (e) {
      if (!$("#sheet").hidden) $("#sheet-b").innerHTML = `<p class="note danger">${e && e.code === "bibliotheque" ? "Le générateur de code QR n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "La carte n’a pas pu être préparée."}</p>`;
      return;
    }
    if ($("#sheet").hidden) return;
    S.carte = { id: m.id, cv: r.cv, verso: v.cv };
    const dl = S.dl;
    $("#sheet-b").innerHTML = `<div class="carte-faces">
        <figure class="carte-face"><img class="carte-img" src="${r.cv.toDataURL("image/png")}" alt="Recto de la carte de membre de ${esc(nomUsuel(m))}, matricule ${esc(m.matricule || "non attribué")}"><figcaption>Recto</figcaption></figure>
        <figure class="carte-face"><img class="carte-img" src="${v.cv.toDataURL("image/png")}" alt="Verso de la carte : point SDE, pôle, verset et contact du mouvement"><figcaption>Verso</figcaption></figure>
      </div>
      <p class="hint" style="margin-top:10px">Format carte bancaire (85,6 × 54 mm à 300 dpi), signée « ${esc(signatureCarte())} ». Code de contrôle : <b class="num">${esc(r.code)}</b>.${m.matricule ? "" : " Ce membre n’a pas encore de matricule : ajoutez-le dans sa fiche."}</p>
      ${dl ? "" : `<p class="note">Le téléchargement n’est pas disponible dans cette vue : appuyez longuement sur une face pour l’enregistrer.</p>`}
      <div class="actions">${btn("dl-carte", "Recto-verso (PDF)", { ico: "i-down", cls: "btn-primary", data: 'data-face="pdf"' })}${btn("dl-carte", "Recto (PNG)", { ico: "i-image", data: 'data-face="recto"' })}${btn("dl-carte", "Verso (PNG)", { ico: "i-image", data: 'data-face="verso"' })}${btn("voir-membre", "Fiche du membre", { ico: "i-users", data: `data-id="${esc(m.id)}"` })}</div>`;
  }
  async function telechargerCarte(face) {
    const c0 = S.carte;
    if (!c0) return;
    const m = membre(c0.id) || { id: c0.id };
    const base = baseFichierCarte(m);
    if (face === "pdf") {
      try { const pages = [await jpegDe(c0.cv), await jpegDe(c0.verso)]; await telechargerBlob(`${base}.pdf`, pdfImages(pages)); }
      catch (e) { toast("Le PDF n’a pas pu être préparé.", "err"); }
      return;
    }
    const cv = face === "verso" ? c0.verso : c0.cv;
    cv.toBlob((b) => { if (b) telechargerBlob(`${base}-${face === "verso" ? "verso" : "recto"}.png`, b); }, "image/png");
  }
  async function lotCartes(format) {
    const actifs = membresActifs();
    const boutons = document.querySelectorAll('[data-act="zip-cartes"],[data-act="pdf-cartes"]');
    boutons.forEach((b) => { b.disabled = true; });
    const prog = $("#zip-prog");
    if (prog) prog.hidden = false;
    const etat = (txt, p) => { const e1 = $("#zip-etat"); if (e1) e1.textContent = txt; const p1 = $("#zip-prog i"); if (p1) p1.style.width = p.toFixed(1) + "%"; };
    try {
      let zip = null;
      const pages = [];
      if (format === "zip") { await chargerScript(LIB_ZIP); zip = new window.JSZip(); }
      let i = 0;
      for (const m of actifs) {
        const [r, v] = await Promise.all([rendreCarte(m), rendreVerso(m)]);
        if (zip) {
          const base = baseFichierCarte(m);
          const [br, bv] = await Promise.all([new Promise((ok) => r.cv.toBlob(ok, "image/png")), new Promise((ok) => v.cv.toBlob(ok, "image/png"))]);
          zip.file(`${base}-recto.png`, br);
          zip.file(`${base}-verso.png`, bv);
        } else { pages.push(await jpegDe(r.cv), await jpegDe(v.cv)); }
        i += 1;
        etat(`${i} sur ${actifs.length} cartes préparées…`, (i / actifs.length) * 90);
      }
      const nomLot = `cartes-membres-${cfg().nomCourt.replace(/\W+/g, "")}-${anneeCarte()}`;
      if (zip) {
        etat("Compression…", 95);
        const out = await zip.generateAsync({ type: "blob" });
        etat(`${pluriel(actifs.length, "carte prête", "cartes prêtes")} (recto et verso).`, 100);
        await telechargerBlob(`${nomLot}.zip`, out);
      } else {
        etat("Assemblage du PDF…", 95);
        const out = pdfImages(pages);
        etat(`${pluriel(actifs.length, "carte prête", "cartes prêtes")} : ${nb(pages.length)} pages recto-verso.`, 100);
        await telechargerBlob(`${nomLot}.pdf`, out);
      }
    } catch (e) {
      etat("", 0);
      toast(e && e.code === "bibliotheque" ? "Un module nécessaire n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "Les cartes n’ont pas pu être préparées.", "err");
    } finally { boutons.forEach((b) => { if (document.contains(b)) b.disabled = false; }); }
  }
