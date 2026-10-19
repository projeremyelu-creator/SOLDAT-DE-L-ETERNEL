  /* ════════════════════════ Médiathèque : vidéos, audios, photos et documents ════════════════════════ */
  const MED = { liste: null, err: "", charge: false, q: "", cat: "", espace: null, peutAjouter: false, envois: [], photo: 0 };
  const GENRES_MED = { video: ["Vidéo", "i-play"], audio: ["Audio", "i-audio"], image: ["Photo", "i-image"], pdf: ["PDF", "i-file"], word: ["Word", "i-file"], powerpoint: ["PowerPoint", "i-file"], excel: ["Excel", "i-file"] };
  const EXT_MED = { mp4: "video", m4v: "video", mov: "video", webm: "video", mp3: "audio", m4a: "audio", aac: "audio", wav: "audio", ogg: "audio", jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", heic: "image", pdf: "pdf", doc: "word", docx: "word", ppt: "powerpoint", pptx: "powerpoint", pps: "powerpoint", ppsx: "powerpoint", xls: "excel", xlsx: "excel", csv: "excel" };
  const ACCEPT_MED = Object.keys(EXT_MED).map((e) => "." + e).join(",") + ",video/mp4,audio/mpeg,image/*,application/pdf";
  const CATS_MED = ["Enseignements", "Louange et adoration", "Cultes", "IN FIRE", "Formations", "Photos d’événements", "Documents officiels", "Supports de présentation", "Autres"];
  const VIS_MED = [["membres", "Membres connectés"], ["public", "Public : tout le monde, même sans compte"], ["responsables", "Responsables seulement"]];
  const LIB_VIS_MED = { public: "Public", membres: "Membres", responsables: "Responsables" };
  const FILTRES_MED = [["tout", "Tout", () => true], ["video", "Vidéos", (m) => m.genre === "video"], ["audio", "Audios", (m) => m.genre === "audio"], ["image", "Photos", (m) => m.genre === "image"], ["docs", "Documents", (m) => ["pdf", "word", "powerpoint", "excel"].includes(m.genre)]];
  if (!S.sous.mediatheque) S.sous.mediatheque = "tout";
  const genreDe = (nom) => EXT_MED[(String(nom).match(/\.([a-z0-9]{2,5})$/i) || [, ""])[1].toLowerCase()] || "";
  const octets = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1) + " Go" : n >= 1048576 ? (n / 1048576).toFixed(n >= 104857600 ? 0 : 1) + " Mo" : Math.max(1, Math.round(n / 1024)) + " Ko").replace(".", ",");
  const urlMedia = (m, telecharger) => `/m/${m.id}/${encodeURIComponent(m.nom)}${telecharger ? "?telecharger" : ""}`;
  async function chargerMedias() {
    MED.charge = true;
    try {
      const r = await fetch("/api/medias", { credentials: "same-origin", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Lecture impossible.");
      MED.liste = j.medias || []; MED.espace = j.espace || null; MED.peutAjouter = !!j.peutAjouter; MED.err = "";
    } catch (e) { MED.err = (e && e.message) || "La médiathèque n’a pas pu être chargée."; }
    MED.charge = false;
    render();
  }
  const filtreMed = () => (FILTRES_MED.find(([k]) => k === S.sous.mediatheque) || FILTRES_MED[0])[2];
  function mediasFiltres() {
    const q = norm(MED.q);
    return (MED.liste || []).filter(filtreMed()).filter((m) => (!MED.cat || m.categorie === MED.cat) && (!q || norm(`${m.titre} ${m.description || ""} ${m.categorie || ""} ${m.nom}`).includes(q)));
  }
  function carteMedia(m) {
    const [lib, ico] = GENRES_MED[m.genre] || ["Fichier", "i-file"];
    const vis = m.miniature ? `<img src="${esc(m.miniature)}" alt="" loading="lazy">` : `<span class="med-ico" aria-hidden="true">${I(ico)}<b>${esc(lib)}</b></span>`;
    return `<button class="med-carte g-${esc(m.genre)}" type="button" data-act="med-ouvrir" data-id="${esc(m.id)}" aria-label="${esc(`${lib} : ${m.titre}`)}"><span class="med-vis">${vis}${m.genre === "video" || m.genre === "audio" ? `<span class="med-play" aria-hidden="true">${I("i-play")}</span>` : ""}<span class="med-type">${esc(lib)}</span></span><span class="med-t">${esc(m.titre)}</span><span class="med-m">${esc([m.categorie, octets(m.taille), fmtCourt(isoJour(new Date(m.cree)))].filter(Boolean).join(" · "))}</span>${MED.peutAjouter ? `<span class="chip ${m.visibilite === "public" ? "ok" : m.visibilite === "responsables" ? "warn" : ""}">${esc(LIB_VIS_MED[m.visibilite] || "")}</span>` : ""}</button>`;
  }
  VUES.mediatheque = function () {
    let out = secHead("Médiathèque", { eyebrow: "Vidéos, audios, photos et documents", verset: ["Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", "Psaume 119.105"], actions: MED.peutAjouter ? btn("med-ajouter", "Ajouter des fichiers", { ico: "i-up", cls: "btn-primary" }) : "" });
    if (!MED.liste && !MED.err) { if (!MED.charge) setTimeout(chargerMedias, 0); return out + chargement("Ouverture de la médiathèque…"); }
    if (MED.err) return out + `<p class="note danger">${esc(MED.err)}</p><div class="btn-row">${btn("med-recharger", "Réessayer", { ico: "i-undo" })}</div>`;
    const tous = MED.liste;
    out += sousOnglets("mediatheque", FILTRES_MED.map(([k, l, f]) => [k, l, tous.filter(f).length]));
    const cats = [...new Set(tous.map((m) => m.categorie).filter(Boolean))].sort(cmpFr);
    out += `<div class="med-outils"><label class="sr" for="med-q">Rechercher</label><input class="inp" id="med-q" type="search" placeholder="Rechercher un titre, un thème…" value="${esc(MED.q)}" autocomplete="off">${cats.length ? `<label class="sr" for="med-cat">Catégorie</label><select class="inp" id="med-cat"><option value="">Toutes les catégories</option>${cats.map((c) => `<option${c === MED.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}</div>`;
    const l = mediasFiltres();
    if (!tous.length) out += vide("i-play", MED.peutAjouter ? "La médiathèque est vide. Ajoutez vos vidéos MP4, audios MP3, photos, PDF, documents Word, présentations PowerPoint et tableaux Excel." : moiH().connecte ? "Aucun média n’est encore publié." : "Aucun média public pour l’instant. Les membres connectés voient aussi les médias qui leur sont réservés.", MED.peutAjouter ? btn("med-ajouter", "Ajouter des fichiers", { ico: "i-up", cls: "btn-primary" }) : !moiH().connecte ? btn("connexion", "Se connecter", { ico: "i-lock" }) : "");
    else if (!l.length) out += vide("i-search", "Aucun média ne correspond à cette recherche.");
    else out += `<div class="med-grille" id="med-grille">${l.map(carteMedia).join("")}</div>`;
    if (MED.espace) {
      const e = MED.espace, pc = Math.min(100, Math.round((e.utilise / e.total) * 100));
      out += `<div class="med-espace"><div class="meter" aria-hidden="true"><i style="width:${pc}%"></i></div><p class="hint">Espace utilisé : <b>${esc(octets(e.utilise))}</b> sur ${esc(octets(e.total))} · ${pluriel(e.nombre, "fichier", "fichiers")} · ${esc(octets(e.fichierMax))} au maximum par fichier${e.stockage === "kv" ? " · stockage de départ (1 Go) : le stockage R2 offre 10 Go" : ""}.</p></div>`;
    }
    return out;
  };
  document.addEventListener("input", (ev) => {
    if (ev.target && ev.target.id === "med-q") {
      MED.q = ev.target.value;
      const g = $("#med-grille"), l = mediasFiltres();
      if (g && l.length) g.innerHTML = l.map(carteMedia).join(""); else render();
    }
  });
  document.addEventListener("change", (ev) => { if (ev.target && ev.target.id === "med-cat") { MED.cat = ev.target.value; render(); } });

  /* — Lecteur — */
  function lecteurMedia(m) {
    const src = esc(urlMedia(m));
    if (m.genre === "video") return `<video class="med-lecteur" controls playsinline preload="metadata" src="${src}"${m.miniature ? ` poster="${esc(m.miniature)}"` : ""}></video>`;
    if (m.genre === "audio") return `<div class="med-audio">${m.miniature ? `<img src="${esc(m.miniature)}" alt="">` : `<span class="med-ico" aria-hidden="true">${I("i-audio")}</span>`}<audio controls preload="metadata" src="${src}"></audio></div>`;
    if (m.genre === "image") return `<img class="med-photo" src="${src}" alt="${esc(m.titre)}">`;
    if (m.genre === "pdf") return `<iframe class="med-pdf" src="${src}#view=FitH" title="${esc(m.titre)}"></iframe><p class="hint">Le PDF ne s’affiche pas ? Touchez « Ouvrir » ou « Télécharger ».</p>`;
    const [lib] = GENRES_MED[m.genre] || ["Fichier"];
    return `<div class="med-doc"><span class="med-ico g-${esc(m.genre)}" aria-hidden="true">${I("i-file")}<b>${esc(lib)}</b></span><p><b>${esc(m.nom)}</b><br><span class="hint">${esc(octets(m.taille))} · s’ouvre avec ${esc(lib)} ou une application compatible du téléphone.</span></p></div>`;
  }
  function ficheMedia(m) {
    const photos = mediasFiltres().filter((x) => x.genre === "image");
    const i = photos.findIndex((x) => x.id === m.id);
    const nav = m.genre === "image" && photos.length > 1 ? `<div class="btn-row med-nav">${btn("med-ouvrir", "Précédente", { ico: "i-left", sm: true, data: `data-id="${esc(photos[(i - 1 + photos.length) % photos.length].id)}"` })}<span class="hint">${i + 1} / ${photos.length}</span>${btn("med-ouvrir", "Suivante", { ico: "i-right", sm: true, data: `data-id="${esc(photos[(i + 1) % photos.length].id)}"` })}</div>` : "";
    const lien = location.origin + urlMedia(m);
    const partage = m.visibilite === "public" ? `<a class="btn btn-sm" href="${esc(lienWa("", `${m.titre}\n${lien}\n— ${cfg().nomCourt}`))}" target="_blank" rel="noopener">${I("i-msg")}Partager sur WhatsApp</a>` : "";
    return `${lecteurMedia(m)}${nav}
      ${m.description ? `<p class="med-desc">${esc(m.description).replace(/\n/g, "<br>")}</p>` : ""}
      <p class="hint">${esc([GENRES_MED[m.genre] ? GENRES_MED[m.genre][0] : "", m.categorie, octets(m.taille), "ajouté le " + fmtCourt(isoJour(new Date(m.cree))), m.auteurNom ? "par " + m.auteurNom : "", MED.peutAjouter ? `${LIB_VIS_MED[m.visibilite]} · ${pluriel(m.vues || 0, "ouverture", "ouvertures")}` : ""].filter(Boolean).join(" · "))}</p>
      <div class="btn-row" style="margin-top:12px"><a class="btn btn-sm btn-primary" href="${esc(urlMedia(m, true))}" download="${esc(m.nom)}">${I("i-down")}Télécharger</a><a class="btn btn-sm" href="${esc(urlMedia(m))}" target="_blank" rel="noopener">${I("i-link")}Ouvrir</a>${partage}${btn("med-copier", "Copier le lien", { ico: "i-copy", sm: true, data: `data-lien="${esc(lien)}"` })}${m.gerer ? btn("med-modifier", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(m.id)}"` }) + btn("med-suppr", "Supprimer", { ico: "i-trash", sm: true, cls: "btn-danger", data: `data-id="${esc(m.id)}"` }) : ""}</div>
      ${m.visibilite !== "public" ? `<p class="hint" style="margin-top:8px">Lien réservé : il ne s’ouvre que pour les ${m.visibilite === "responsables" ? "responsables" : "membres"} connectés.</p>` : ""}`;
  }
  const ouvrirMedia = (id) => { const m = (MED.liste || []).find((x) => x.id === id); if (m) ouvrir({ titre: m.titre, html: ficheMedia(m), wide: true }); };

  /* — Ajout de fichiers — */
  function ficheAjoutMedia() {
    const e = MED.espace;
    const cats = [...new Set(CATS_MED.concat((MED.liste || []).map((m) => m.categorie).filter(Boolean)))];
    return `<form class="form" id="f-med" novalidate>
      <label class="med-depot" for="med-fichiers">${I("i-up")}<b>Choisir les fichiers</b><span class="hint">Vidéos MP4, audios MP3, photos, PDF, Word, PowerPoint, Excel${e ? ` · ${esc(octets(e.fichierMax))} au maximum par fichier` : ""}. Plusieurs fichiers à la fois.</span></label>
      <input type="file" id="med-fichiers" name="fichiers" multiple accept="${esc(ACCEPT_MED)}" hidden>
      <div id="med-choix" class="med-choix"></div>
      <div class="f2">${champ("med-c", "Catégorie", `<input class="inp" id="med-c" name="categorie" list="dl-med-c" autocomplete="off" placeholder="Enseignements, Louange…"><datalist id="dl-med-c">${cats.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist>`)}${champ("med-v", "Qui peut voir ?", `<select class="inp" id="med-v" name="visibilite">${VIS_MED.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select>`)}</div>
      ${champ("med-d", "Description (facultatif)", `<textarea class="inp" id="med-d" name="description" rows="3" maxlength="2000" placeholder="Orateur, date, thème, verset…"></textarea>`)}
      ${pied("Envoyer")}</form>`;
  }
  function majChoixMed(input) {
    const box = $("#med-choix");
    if (!box) return;
    const fs = [...(input.files || [])];
    const max = MED.espace ? MED.espace.fichierMax : Infinity;
    box.innerHTML = fs.map((f, i) => { const g = genreDe(f.name); const pb = !g ? "type non accepté" : f.size > max ? `trop lourd (${octets(max)} au maximum)` : ""; return `<div class="med-ligne${pb ? " ko" : ""}" data-i="${i}"><span class="med-ligne-i" aria-hidden="true">${I((GENRES_MED[g] || ["", "i-file"])[1])}</span><span class="med-ligne-c"><label class="sr" for="med-t-${i}">Titre de ${esc(f.name)}</label><input class="inp inp-sm" id="med-t-${i}" value="${esc(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "))}" maxlength="160"${pb ? " disabled" : ""}><small>${esc(f.name)} · ${esc(octets(f.size))}${pb ? ` · <b>${esc(pb)}</b>` : ""}</small><span class="med-barre" hidden><i id="med-p-${i}"></i></span><small class="med-etat" id="med-e-${i}"></small></span></div>`; }).join("");
  }
  async function miniatureMed(f, g) {
    const reduire = (src, w, h) => { const k = Math.min(1, 480 / Math.max(w, h)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.72); };
    const url = URL.createObjectURL(f);
    const delai = (ms) => new Promise((_, ko) => setTimeout(() => ko(new Error("délai")), ms));
    try {
      if (g === "image" && !/\.heic$/i.test(f.name)) {
        const img = new Image(); img.src = url;
        await Promise.race([img.decode(), delai(8000)]);
        return reduire(img, img.naturalWidth, img.naturalHeight);
      }
      if (g === "video") {
        const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
        await Promise.race([new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = ko; }), delai(8000)]);
        v.currentTime = Math.min(2, (v.duration || 4) / 3);
        await Promise.race([new Promise((ok) => { v.onseeked = ok; }), delai(6000)]);
        return reduire(v, v.videoWidth, v.videoHeight);
      }
    } catch (e) { /* pas de miniature */ } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return null;
  }
  async function envoyerMedia(f, i, commun) {
    const etat = (t) => { const el = $("#med-e-" + i); if (el) el.textContent = t; };
    const barre = (x) => { const el = $("#med-p-" + i); if (el) { el.parentNode.hidden = false; el.style.width = Math.round(x * 100) + "%"; } };
    const g = genreDe(f.name);
    etat("Préparation…");
    const miniature = await miniatureMed(f, g);
    const titre = ($("#med-t-" + i) || {}).value || f.name;
    let r = await fetch("/api/medias", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...commun, titre, nom: f.name, taille: f.size, miniature }) });
    let j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || "Envoi refusé.");
    const { id, morceau, morceaux } = j;
    for (let k = 0; k < morceaux; k += 1) {
      let essai = 0;
      for (;;) {
        try {
          r = await fetch(`/api/medias/${id}/${k}`, { method: "PUT", credentials: "same-origin", body: f.slice(k * morceau, Math.min(f.size, (k + 1) * morceau)) });
          if (r.ok) break;
          j = await r.json().catch(() => ({}));
          throw new Error(j.message || "Morceau refusé.");
        } catch (e) { essai += 1; if (essai >= 4) { await fetch(`/api/medias/${id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => {}); throw e; } etat(`Réseau instable, nouvel essai (${essai}/3)…`); await sleep(1500 * essai); }
      }
      barre((k + 1) / morceaux);
      etat(`${Math.round(((k + 1) / morceaux) * 100)} % · ${octets(Math.min(f.size, (k + 1) * morceau))} sur ${octets(f.size)}`);
    }
    r = await fetch(`/api/medias/${id}/fin`, { method: "POST", credentials: "same-origin" });
    j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || "Finalisation impossible.");
    etat("Envoyé ✓");
  }
  async function soumettreMedias(fd, form) {
    const input = $("#med-fichiers");
    const fs = [...((input && input.files) || [])];
    const max = MED.espace ? MED.espace.fichierMax : Infinity;
    const valides = fs.map((f, i) => ({ f, i })).filter(({ f }) => genreDe(f.name) && f.size <= max);
    if (!fs.length) { erreurForm("Choisissez au moins un fichier."); return; }
    if (!valides.length) { erreurForm("Aucun fichier accepté : vérifiez le type et la taille."); return; }
    const commun = { categorie: String(fd.get("categorie") || "").trim(), visibilite: String(fd.get("visibilite") || "membres"), description: String(fd.get("description") || "").trim() };
    const b = form.querySelector("[type=submit]");
    if (b) { b.disabled = true; b.textContent = "Envoi en cours…"; }
    let ok = 0;
    for (const { f, i } of valides) {
      try { await envoyerMedia(f, i, commun); ok += 1; } catch (e) { const el = $("#med-e-" + i); if (el) el.innerHTML = `<b class="ko">${esc((e && e.message) || "Échec de l’envoi.")}</b>`; }
    }
    if (b) { b.disabled = false; b.textContent = "Envoyer"; }
    toast(ok === valides.length ? pluriel(ok, "fichier ajouté", "fichiers ajoutés") + " à la médiathèque" : `${ok} sur ${valides.length} fichiers envoyés`, ok === valides.length ? "" : "err");
    await chargerMedias();
    if (ok === valides.length) fermer();
  }
  document.addEventListener("change", (ev) => { if (ev.target && ev.target.id === "med-fichiers") majChoixMed(ev.target); });

  /* — Modifier — */
  function ficheModifMedia(m) {
    return `<form class="form" id="f-med-modif" data-id="${esc(m.id)}" novalidate>${champ("mm-t", "Titre", inp("mm-t", "titre", m.titre, 'maxlength="160" required'), { req: true })}
      <div class="f2">${champ("mm-c", "Catégorie", `<input class="inp" id="mm-c" name="categorie" value="${esc(m.categorie || "")}" list="dl-mm-c" autocomplete="off"><datalist id="dl-mm-c">${CATS_MED.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist>`)}${champ("mm-v", "Qui peut voir ?", `<select class="inp" id="mm-v" name="visibilite">${VIS_MED.map(([k, l]) => `<option value="${k}"${k === m.visibilite ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`)}</div>
      ${champ("mm-d", "Description", `<textarea class="inp" id="mm-d" name="description" rows="4" maxlength="2000">${esc(m.description || "")}</textarea>`)}${pied("Enregistrer")}</form>`;
  }
  async function enregistrerModifMedia(fd, form) {
    const id = form.dataset.id;
    const r = await fetch(`/api/medias/${id}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ titre: String(fd.get("titre") || ""), categorie: String(fd.get("categorie") || ""), visibilite: String(fd.get("visibilite") || ""), description: String(fd.get("description") || "") }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { erreurForm(j.message || "Modification refusée."); return; }
    toast("Média modifié"); await chargerMedias(); ouvrirMedia(id);
  }

  Object.assign(A, {
    "med-ajouter": () => ouvrir({ titre: "Ajouter à la médiathèque", html: ficheAjoutMedia(), onSubmit: soumettreMedias, wide: true }),
    "med-ouvrir": (t) => ouvrirMedia(t.dataset.id),
    "med-recharger": () => { MED.err = ""; MED.liste = null; render(); },
    "med-copier": (t) => navigator.clipboard.writeText(t.dataset.lien).then(() => toast("Lien copié"), () => toast("Copie impossible", "err")),
    "med-modifier": (t) => { const m = (MED.liste || []).find((x) => x.id === t.dataset.id); if (m) ouvrir({ titre: "Modifier le média", html: ficheModifMedia(m), onSubmit: enregistrerModifMedia }); },
    "med-suppr": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      const r = await fetch(`/api/medias/${t.dataset.id}`, { method: "DELETE", credentials: "same-origin" });
      if (!r.ok) { toast("Suppression refusée.", "err"); return; }
      toast("Média supprimé"); fermer(); await chargerMedias();
    }),
  });
