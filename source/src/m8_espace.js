  /* ════════════════════════ Espace soldat ════════════════════════ */
  /* Chaque soldat reçoit un code personnel (ex. K7PM-Q2XD). La direction publie pour lui un résumé chiffré
     (carte, présences, cotisations) dans « espace/<id dérivé du code> » : sans le code, le résumé est illisible,
     et l’identifiant du document ne révèle pas le code (dérivation PBKDF2 lente). */
  const ESP = { code: "", data: null, t: 0, err: "", charge: false, rafraichi: false, cle: new Map(), cartes: "", envoi: false };
  const ALPHA_CODE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const LIEN_APP = "https://claude.ai/artifact/GoENFgrqfSdyNhanWp5iaR";
  const lienApp = () => String(cfg().lienApp || LIEN_APP).trim() || LIEN_APP;
  const telContact = () => String(cfg().contactPriere || "").trim() || ((String(cfg().contactCarte || DEFAUTS.contactCarte || "").match(/\+?[\d][\d\s]{7,}/) || [""])[0]).trim();
  function nouveauCode() {
    const a = new Uint32Array(8);
    crypto.getRandomValues(a);
    let s = "";
    for (const x of a) s += ALPHA_CODE[x % ALPHA_CODE.length];
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  }
  function normCode(c) {
    let s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.length === 11 && s.startsWith("SDE")) s = s.slice(3);
    if (s.length !== 8 || [...s].some((ch) => !ALPHA_CODE.includes(ch))) return "";
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  }
  const versB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const deB64 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  const hex = (u8) => [...u8].map((x) => x.toString(16).padStart(2, "0")).join("");
  async function deriver(code) {
    const n = normCode(code);
    if (!n) throw Object.assign(new Error("code"), { code: "code" });
    if (ESP.cle.has(n)) return ESP.cle.get(n);
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(n.replace("-", "")), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("sde-espace-v1"), iterations: 200000 }, base, 384));
    const key = await crypto.subtle.importKey("raw", bits.slice(16, 48), "AES-GCM", false, ["encrypt", "decrypt"]);
    const r = { docId: "e" + hex(bits.slice(0, 16)), key };
    ESP.cle.set(n, r);
    return r;
  }
  async function chiffrer(code, obj) {
    const { docId, key } = await deriver(code);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    return { docId, doc: { v: 1, iv: versB64(iv), ct: versB64(ct), majLe: Date.now() } };
  }
  async function dechiffrer(code, doc) {
    const { key } = await deriver(code);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(doc.iv) }, key, deB64(doc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function empreinte(txt) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)))).slice(0, 32); }

  /* Résumé publié pour un soldat (calculé par la direction) */
  function resumeSoldat(m) {
    const an = new Date().getFullYear();
    const gs = [];
    let g = m.garnisonId ? garnison(m.garnisonId) : null;
    while (g && gs.length < 4) { gs.push({ id: g.id, nom: g.nom || "", type: g.type || "", pays: g.pays || "", ville: g.ville || "", parentId: g.parentId || "" }); g = g.parentId ? garnison(g.parentId) : null; }
    const evs = evenementsPointes().filter((e) => compte(e, m));
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    const ec = etatCotis(m, an);
    const payes = {};
    for (const [k, v] of Object.entries(ec.payes)) payes[k] = { montant: Number(v.montant) || 0 };
    const sps = (S.speciales || []).map((sp) => ({ sp, b: bilanSp(sp) })).filter(({ sp, b }) => b.parM[m.id] || (ouverteSp(sp) && b.cible.liste.some((x) => x.id === m.id)))
      .map(({ sp, b }) => ({ titre: sp.titre || "Cotisation spéciale", attendu: Number(sp.montant) || 0, verse: b.parM[m.id] || 0, ouverte: ouverteSp(sp) }));
    const pjs = (S.projets || []).map((p) => ({ p, b: bilanFinP(p) })).filter(({ p, b }) => b.parM[m.id] || (!estClosP(p) && b.cible.liste.some((x) => x.id === m.id)))
      .map(({ p, b }) => ({ titre: p.titre || "Projet", attendu: Number(finProjet(p.id).montantParMembre) || 0, verse: b.parM[m.id] || 0 }));
    const os = (S.offrandes || []).filter((o) => o.membreId === m.id && !o.annule && String(o.date || "").startsWith(String(an)));
    return {
      v: 1,
      m: { id: m.id, nom: m.nom || "", prenoms: m.prenoms || "", matricule: m.matricule || "", statut: m.statut || "", fonction: m.fonction || "", pole: m.pole || "", eglise: m.eglise || "", garnisonId: m.garnisonId || "", photoId: m.photoId || "", anniv: m.anniv || "", adhesion: m.adhesion || "" },
      garnisons: gs,
      presences: { taux: s3.taux, p: s3.p, r: s3.r, x: s3.x, a: s3.a, n: s3.n, liste: evs.slice(0, 15).map((e) => { const v = presentsEffectifs(e)[m.id]; return { date: e.date, titre: e.titre || "Rassemblement", etat: v === true ? "P" : v === "retard" ? "R" : v === "excuse" ? "E" : "A" }; }) },
      cotis: { annee: an, mensuel: Number(cfg().cotisationMensuelle) || 0, payes, dus: ec.dus, retard: ec.retard, verse: ec.verse, exempt: ec.exempt },
      speciales: sps, projets: pjs,
      offrandes: { annee: an, total: os.reduce((t, o) => t + (Number(o.montant) || 0), 0), n: os.length },
    };
  }
  const pretPourResume = () => ["config", "membres", "evenements", "cotisations", "speciales", "offrandes", "projets", "projetsFin", "garnisons", "acces"].every((k) => S.pret[k]);
  const accesDe = (mid) => (S.acces || []).find((a) => a.id === mid) || null;

  /* Synchronisation automatique (direction) : chaque résumé modifié est rechiffré et republié. */
  let synchroT = 0, synchroEnCours = false;
  function planifierSynchro() {
    if (!peutAdmin() || !pretPourResume() || !(S.acces || []).length) return;
    clearTimeout(synchroT);
    synchroT = setTimeout(synchroEspaces, 4000);
  }
  async function synchroEspaces() {
    if (synchroEnCours || !peutAdmin() || !pretPourResume()) return;
    synchroEnCours = true;
    try {
      for (const a of (S.acces || []).slice()) {
        const m = membre(a.id);
        if (!m || !normCode(a.code)) continue;
        const r = resumeSoldat(m);
        const emp = await empreinte(JSON.stringify(r));
        if (emp === a.empreinte) continue;
        const { docId, doc } = await chiffrer(a.code, r);
        await S.db.doc("espace/" + docId).set(doc);
        await S.db.doc("acces/" + a.id).update({ empreinte: emp, docId, majLe: Date.now() });
        await sleep(120);
      }
    } catch (e) { /* nouvel essai au prochain changement */ }
    synchroEnCours = false;
  }
  async function creerAcces(mid, silencieux) {
    const m = membre(mid);
    if (!m || !peutAdmin()) return false;
    const ancien = accesDe(mid);
    const code = nouveauCode();
    try {
      const r = resumeSoldat(m);
      const { docId, doc } = await chiffrer(code, r);
      const emp = await empreinte(JSON.stringify(r));
      if (ancien && ancien.docId && ancien.docId !== docId) { try { await S.db.doc("espace/" + ancien.docId).delete(); } catch (e) { /* déjà absent */ } }
      await S.db.doc("espace/" + docId).set(doc);
      await S.db.doc("acces/" + mid).set({ membreId: mid, code, docId, empreinte: emp, creeLe: Date.now(), creePar: S.me.id || null, majLe: Date.now() });
      if (!silencieux) toast(ancien ? "Nouveau code créé : l’ancien ne fonctionne plus" : "Accès à l’espace soldat créé");
      return true;
    } catch (e) { toast(messageErreur(e), "err"); return false; }
  }
  async function retirerAcces(mid) {
    const a = accesDe(mid);
    if (!a) return;
    const ok = await ecrire(async () => { if (a.docId) await S.db.doc("espace/" + a.docId).delete(); await S.db.doc("acces/" + mid).delete(); }, "Accès à l’espace soldat retiré");
    if (ok) { dernier.sheet = null; render(); }
  }
  function messageCode(m, code) {
    return `Shalom ${prenomUsuel(m)} !\n\nVoici ton accès personnel à l’Espace soldat de S.D.E. DIGITAL : ta carte de membre, tes présences, tes cotisations, et un bouton pour déposer une requête de prière.\n\n1. Ouvre : ${lienApp()}\n2. Touche « Mon espace »\n3. Saisis ton code : ${code}\n\nGarde ce code pour toi : il ouvre ton espace.\n— ${cfg().nomCourt}`;
  }
  /* Bloc dans la fiche du membre (direction) */
  function blocEspaceMembre(m) {
    if (!peutAdmin() || !S.pret.acces) return "";
    const a = accesDe(m.id);
    if (!a) return `<div class="esp-bloc"><p class="hint" style="margin:0"><b>Espace soldat</b> · pas encore d’accès. Le soldat pourra consulter sa carte, ses présences et ses cotisations avec un code personnel.</p><div class="btn-row">${btn("esp-creer", "Créer son code d’accès", { ico: "i-plus", sm: true, data: `data-id="${esc(m.id)}"` })}</div></div>`;
    return `<div class="esp-bloc"><p class="hint" style="margin:0"><b>Espace soldat</b> · code <span class="num esp-code">${esc(a.code)}</span>${a.majLe ? ` · résumé mis à jour ${esc(relLong(isoJour(new Date(a.majLe))))}` : ""}</p><div class="btn-row"><a class="btn btn-sm btn-primary" href="${esc(lienWa(m.telephone, messageCode(m, a.code)))}" target="_blank" rel="noopener">${I("i-msg")}Envoyer par WhatsApp</a>${btn("esp-copier", "Copier le message", { sm: true, data: `data-id="${esc(m.id)}"` })}${btn("esp-nouveau", "Nouveau code", { sm: true, data: `data-id="${esc(m.id)}"` })}${btn("esp-retirer", "Retirer l’accès", { sm: true, cls: "btn-danger", data: `data-id="${esc(m.id)}"` })}</div></div>`;
  }
  /* Feuille de gestion de tous les accès */
  function ficheEspaces() {
    const actifs = membresActifs().slice().sort(parNom);
    const avec = actifs.filter((m) => accesDe(m.id)), sans = actifs.filter((m) => !accesDe(m.id));
    return `<p class="hint" style="margin-top:0">Chaque soldat ouvre son espace avec un code personnel, depuis le lien de l’application, rubrique « Mon espace ». Son résumé (carte, présences, cotisations) se met à jour tout seul quand un administrateur utilise l’application.</p>
      <p class="tally"><span><b>${nb(avec.length)}</b> soldats avec un code</span><span>${pluriel(sans.length, "sans code", "sans code")}</span></p>
      ${sans.length ? `<div class="btn-row" style="margin-bottom:12px">${btn("esp-creer-tous", `Créer les ${pluriel(sans.length, "code manquant", "codes manquants")}`, { ico: "i-plus", cls: "btn-primary", sm: true })}</div>` : ""}
      <div class="list">${actifs.map((m) => { const a = accesDe(m.id); return `<div class="row nolead sp-row"><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${esc([m.matricule, a ? "Code " + a.code : "Pas de code", m.telephone ? telAffiche(m.telephone) : "Pas de numéro"].filter(Boolean).join(" · "))}</span></span><span class="row-r">${a ? `<a class="btn btn-sm" href="${esc(lienWa(m.telephone, messageCode(m, a.code)))}" target="_blank" rel="noopener" aria-label="${esc(`Envoyer son code à ${nomComplet(m)} par WhatsApp`)}">${I("i-msg")}<span class="hide-s">WhatsApp</span></a>` : btn("esp-creer", "Créer", { sm: true, data: `data-id="${esc(m.id)}"` })}</span></div>`; }).join("")}</div>`;
  }
  const ouvrirEspaces = () => ouvrir({ titre: "Espaces soldats", refresh: surveiller(() => ficheEspaces()), wide: true });

  /* Côté soldat */
  function chargerEspaceLocal() {
    try { const o = JSON.parse(localStorage.getItem("sde-espace") || "null"); if (o && normCode(o.code)) { ESP.code = normCode(o.code); ESP.data = o.data || null; ESP.t = o.t || 0; } } catch (e) { /* stockage indisponible */ }
  }
  function garderEspaceLocal() {
    try { if (ESP.code) localStorage.setItem("sde-espace", JSON.stringify({ code: ESP.code, data: ESP.data, t: ESP.t })); else localStorage.removeItem("sde-espace"); } catch (e) { /* stockage indisponible */ }
  }
  async function ouvrirEspace(code, silencieux) {
    const n = normCode(code);
    if (!n) { ESP.err = "Ce code n’est pas valide : il compte 8 caractères, par exemple K7PM-Q2XD."; render(); return; }
    if (!S.db) { ESP.err = "Connexion aux données indisponible : réessayez dans un instant."; render(); return; }
    if (!silencieux) { ESP.charge = true; ESP.err = ""; render(); }
    try {
      const { docId } = await deriver(n);
      const snap = await S.db.doc("espace/" + docId).get();
      if (!snap.exists) {
        if (silencieux) { ESP.code = ""; ESP.data = null; garderEspaceLocal(); ESP.err = "Votre code a été remplacé ou retiré : demandez le nouveau au secrétariat."; }
        else ESP.err = "Code inconnu. Vérifiez la saisie, ou demandez votre code au secrétariat.";
      } else {
        ESP.data = await dechiffrer(n, snap.data());
        ESP.code = n; ESP.t = Date.now(); ESP.err = ""; ESP.cartes = "";
        garderEspaceLocal();
      }
    } catch (e) { if (!silencieux) ESP.err = e && e.code === "code" ? "Ce code n’est pas valide." : "L’espace n’a pas pu être ouvert. Réessayez."; }
    ESP.charge = false;
    render();
  }
  function quitterEspace() { ESP.code = ""; ESP.data = null; ESP.t = 0; ESP.err = ""; ESP.cartes = ""; garderEspaceLocal(); render(); }
  function formCode() {
    const tel = telContact();
    return `<section class="card esp-entree"><div class="esp-entree-i" aria-hidden="true">${I("i-card")}</div><h2 class="h3">Ouvrir mon espace</h2><p class="hint">Saisissez le code personnel reçu du secrétariat. Votre espace s’ouvrira ensuite directement sur cet appareil.</p>
      <form class="form esp-form" id="f-esp" novalidate><label class="sr" for="esp-code">Code personnel</label><input class="inp esp-inp" id="esp-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7PM-Q2XD" maxlength="14" inputmode="text"><button class="btn btn-primary" type="submit">${I("i-right")}Ouvrir</button></form>
      ${ESP.err ? `<p class="note danger" role="alert">${esc(ESP.err)}</p>` : ""}
      ${tel ? `<p class="hint" style="margin-top:12px">Pas encore de code ? <a class="link" href="${esc(lienWa(tel, "Shalom ! Je souhaite recevoir mon code d’accès à l’Espace soldat S.D.E. DIGITAL. Nom et prénoms : "))}" target="_blank" rel="noopener">Le demander par WhatsApp</a></p>` : ""}</section>`;
  }
  const ETAT_PRES = { P: ["Présent", "ok"], R: ["En retard", "warn"], E: ["Excusé", "info"], A: ["Absent", "danger"] };
  function espaceSoldat(d) {
    const m = d.m, c = d.cotis || {}, pr = d.presences || {};
    const point = (d.garnisons || []).find((g) => g.type === TYPE_POINT) || (d.garnisons || [])[0];
    const ec = { payes: c.payes || {}, dus: c.dus || [], exempt: !!c.exempt };
    const retard = (c.retard || []).length;
    const cot = c.exempt ? `<p class="hint">Exempté(e) de cotisation.</p>` : !ec.dus.length ? `<p class="hint">Aucune cotisation due en ${esc(String(c.annee || ""))}.</p>` : `<p class="esp-etat ${retard ? "du" : "ok"}">${retard ? `${retard} mois ${retard > 1 ? "restent" : "reste"} à régler${c.mensuel ? ` · ${esc(fcfa(retard * c.mensuel))}` : ""}` : "À jour, merci pour votre fidélité !"}</p>`;
    const autres = [...(d.speciales || []).map((s) => [s.titre, s.verse, s.attendu]), ...(d.projets || []).map((p) => [p.titre, p.verse, p.attendu])];
    const prochains = aVenir().slice(0, 3);
    return `<section class="card esp-id"><div class="esp-id-h">${avatar({ ...m, id: m.id }, true)}<div><h2 class="esp-nom">${esc(nomComplet(m))}</h2><p class="hint" style="margin:2px 0 0">${esc([m.matricule, m.statut, m.fonction].filter(Boolean).join(" · "))}</p>${point ? `<p class="hint" style="margin:2px 0 0">${I("i-pin")} ${esc(point.nom)}</p>` : ""}</div></div>
        <div class="esp-cartes" id="esp-cartes" aria-label="Ma carte de membre"><div class="esp-cv-w"><canvas id="esp-recto" aria-label="Recto de la carte"></canvas></div><div class="esp-cv-w"><canvas id="esp-verso" aria-label="Verso de la carte"></canvas></div></div>
        <div class="btn-row">${btn("esp-carte", "Recto (image)", { ico: "i-down", sm: true, data: 'data-face="recto"' })}${btn("esp-carte", "Verso (image)", { ico: "i-down", sm: true, data: 'data-face="verso"' })}${btn("esp-carte", "Carte en PDF", { ico: "i-down", sm: true, data: 'data-face="pdf"' })}</div></section>
      <div class="grid g3 esp-grid">
        <section class="card"><p class="eyebrow">Mes présences</p><p class="esp-big">${pr.taux == null ? "—" : Math.round(pr.taux * 100) + " %"}</p><p class="hint" style="margin-top:0">${pr.taux == null ? "Pas encore de rassemblement pointé ces trois derniers mois." : `d’assiduité sur trois mois · ${pluriel((pr.p || 0) + (pr.r || 0), "présence", "présences")}`}</p>${(pr.liste || []).length ? `<ul class="esp-l">${pr.liste.slice(0, 8).map((x) => `<li><span><b>${esc(x.titre)}</b><small>${esc(fmtCourt(x.date))}</small></span><span class="chip ${ETAT_PRES[x.etat][1]}">${ETAT_PRES[x.etat][0]}</span></li>`).join("")}</ul>` : ""}</section>
        <section class="card"><p class="eyebrow">Mes cotisations ${esc(String(c.annee || ""))}</p>${cellulesCotis(ec, c.annee || new Date().getFullYear(), true)}${cot}${c.verse ? `<p class="hint">Versé cette année : <b>${esc(fcfa(c.verse))}</b></p>` : ""}${autres.length ? `<ul class="esp-l">${autres.map(([t, v, a]) => `<li><span><b>${esc(t)}</b><small>${esc(a ? `${fcfa(v)} sur ${fcfa(a)}` : fcfa(v) + " versés")}</small></span>${a ? `<span class="chip ${v >= a ? "ok" : "warn"}">${v >= a ? "Soldé" : "En cours"}</span>` : ""}</li>`).join("")}</ul>` : ""}${d.offrandes && d.offrandes.total ? `<p class="hint">Offrandes, dîmes et dons ${esc(String(d.offrandes.annee))} : <b>${esc(fcfa(d.offrandes.total))}</b></p>` : ""}</section>
        <section class="card"><p class="eyebrow">Requête de prière</p><form class="form" id="f-esp-priere" novalidate>${champ("esp-sujet", "Pour quoi souhaitez-vous que l’on prie ?", `<textarea class="inp" id="esp-sujet" name="sujet" rows="4" maxlength="800" placeholder="Votre sujet de prière…"></textarea>`)}<label class="check"><input type="checkbox" name="conf" value="1"> Confidentielle : seule la direction la lira</label><button class="btn btn-primary" type="submit"${ESP.envoi ? " disabled" : ""}>${I("i-flame")}Déposer ma requête</button></form><p class="hint" style="margin-top:8px">${peutEcrire() && accesRegistre() ? "Votre requête rejoint la Chambre Haute. Les requêtes confidentielles partent par WhatsApp vers la direction." : "Votre requête part par WhatsApp vers la direction, qui la confie aux intercesseurs."}</p></section>
      </div>
      ${prochains.length ? `<h2 class="h3 acc-sec">Prochains rassemblements</h2><div class="list">${prochains.map(rowEvt).join("")}</div>` : ""}
      <p class="hint esp-pied">Résumé publié par la direction${ESP.t ? `, ouvert ${esc(relLong(isoJour(new Date(ESP.t))))}` : ""}. <button class="link" type="button" data-act="esp-quitter">Fermer mon espace sur cet appareil</button></p>`;
  }
  VUES.espace = function () {
    let out = secHead("Mon espace soldat", { eyebrow: "Espace personnel", verset: ["Je mettrai mon esprit en vous, et vous vivrez.", "Ézéchiel 37.14"] });
    if (ESP.charge) return out + chargement("Ouverture de votre espace…");
    if (!ESP.code || !ESP.data) {
      if (S.etat === "absent") return out + nonConnecte("Votre espace soldat");
      return out + formCode() + (peutAdmin() ? `<p class="hint" style="margin-top:14px">Direction : les codes se créent dans la fiche de chaque membre ou d’un coup avec ${btn("espaces", "Espaces soldats", { sm: true, ico: "i-card" })}</p>` : "");
    }
    return out + (ESP.err ? `<p class="note warn">${esc(ESP.err)}</p>` : "") + espaceSoldat(ESP.data);
  };
  async function apresRenduEspace() {
    if (S.db && ESP.code && !ESP.rafraichi) { ESP.rafraichi = true; ouvrirEspace(ESP.code, true); }
    const box = $("#esp-cartes");
    if (!box || !ESP.data) return;
    const cle = JSON.stringify(ESP.data.m) + (ESP.data.garnisons || []).map((g) => g.id).join();
    if (ESP.cartes === cle && $("#esp-recto").width > 300) return;
    ESP.cartes = cle;
    try {
      for (const g of ESP.data.garnisons || []) if (!garnison(g.id)) S.garnisons.push(g);
      const m = { ...ESP.data.m };
      const r = await rendreCarte(m), v = await rendreVerso(m);
      ESP.cv = { recto: r.cv || r, verso: v.cv || v, m };
      for (const [id, cv] of [["#esp-recto", ESP.cv.recto], ["#esp-verso", ESP.cv.verso]]) {
        const el = $(id);
        if (!el) return;
        el.width = cv.width; el.height = cv.height;
        el.getContext("2d").drawImage(cv, 0, 0);
      }
    } catch (e) { ESP.cartes = ""; }
  }
  async function telechargerCarteEspace(face) {
    if (!ESP.cv) return;
    const base = baseFichierCarte(ESP.cv.m);
    if (face === "pdf") {
      try { await telechargerBlob(`${base}.pdf`, pdfImages([await jpegDe(ESP.cv.recto), await jpegDe(ESP.cv.verso)])); } catch (e) { toast("Le PDF n’a pas pu être préparé.", "err"); }
      return;
    }
    const cv = face === "verso" ? ESP.cv.verso : ESP.cv.recto;
    cv.toBlob((b) => { if (b) telechargerBlob(`${base}-${face}.png`, b); }, "image/png");
  }
  async function deposerPriere(fd, form) {
    const sujet = String(fd.get("sujet") || "").trim();
    const conf = fd.get("conf") === "1";
    if (!sujet) { toast("Écrivez votre sujet de prière.", "err"); return; }
    const m = ESP.data && ESP.data.m;
    if (!m) return;
    if (!conf && peutEcrire() && accesRegistre()) {
      ESP.envoi = true; render();
      const ok = await ecrire(() => S.db.collection("prieres").doc().set({ sujet: sujet.slice(0, 140), details: sujet.length > 140 ? sujet : "", categorie: "Personnelle", date: aujourdhui(), pourId: m.id, pour: "", urgent: false, statut: "En prière", priants: {}, source: "espace", ...creation() }), "Requête déposée dans la Chambre Haute");
      ESP.envoi = false;
      if (ok) form.reset();
      render();
      return;
    }
    const tel = telContact();
    const texte = `Requête de prière${conf ? " (confidentielle)" : ""}\n${nomComplet(m)}${m.matricule ? " · " + m.matricule : ""}\n\n${sujet}`;
    window.open(lienWa(tel, texte), "_blank", "noopener");
    form.reset();
    toast("WhatsApp s’ouvre avec votre requête : il reste à l’envoyer.");
  }
  document.addEventListener("submit", (ev) => {
    const f = ev.target;
    if (f.id === "f-esp") { ev.preventDefault(); ouvrirEspace(new FormData(f).get("code"), false); }
    else if (f.id === "f-esp-priere") { ev.preventDefault(); deposerPriere(new FormData(f), f); }
  });
  chargerEspaceLocal();
