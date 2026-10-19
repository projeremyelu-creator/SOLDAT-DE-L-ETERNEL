  /* ════════════════════════ Version hébergée : comptes par e-mail et mot de passe ════════════════════════ */
  const SDEH = window.SDE || { moi: { connecte: false, niveau: 0 } };
  const moiH = () => SDEH.moi || { connecte: false, niveau: 0 };
  const LIB_ROLE_H = { attente: "En attente", soldat: "Soldat", lecture: "Lecture seule", contributeur: "Contributeur", admin: "Administrateur", proprietaire: "Propriétaire", visiteur: "Visiteur" };
  const ROLES_H = [["soldat", "Soldat : son espace, l’agenda et les annonces"], ["contributeur", "Contributeur : registre, agenda, pointage, sans les finances"], ["admin", "Administrateur : tout, finances comprises"], ["lecture", "Lecture seule"], ["attente", "En attente (aucun accès interne)"]];
  const URL_APP_H = "https://app.mouvement-sde.org";
  const champMdp = (id, label, auto, hint) => champ(id, label, `<input class="inp" id="${id}" name="${id.replace(/^c[a-z]+-/, "")}" type="password" autocomplete="${auto}" minlength="8" maxlength="200" required>`, { req: true, hint });
  const voirMdp = `<label class="check cnx-voir"><input type="checkbox" data-voir-mdp> Afficher le mot de passe</label>`;

  /* — Feuille de connexion : se connecter, créer son compte, activer un compte — */
  const CNX = { mode: "connexion", email: "" };
  function ficheConnexion() {
    const m = CNX.mode;
    const onglets = [["connexion", "Se connecter"], ["inscription", "Créer mon compte"], ["activation", "J’ai un code"]].map(([k, l]) => `<button class="cnx-o${k === m ? " on" : ""}" type="button" data-act="cnx-mode" data-m="${k}" aria-pressed="${k === m}">${l}</button>`).join("");
    const email = champ("cx-email", "Adresse e-mail", inp("cx-email", "email", CNX.email, 'type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required' + (m !== "inscription" ? " autofocus" : "")), { req: true });
    let corps;
    if (m === "connexion") corps = `${email}${champMdp("cx-mdp", "Mot de passe", "current-password")}${voirMdp}
      <p class="hint">Mot de passe oublié ? Un responsable vous donne un code pour en choisir un nouveau, à saisir dans « J’ai un code ».${telContact() ? ` <a class="link" href="${esc(lienWa(telContact(), "Shalom ! J’ai oublié mon mot de passe S.D.E. DIGITAL. Mon adresse e-mail : "))}" target="_blank" rel="noopener">Le demander par WhatsApp</a>` : ""}</p>${pied("Se connecter")}`;
    else if (m === "inscription") corps = `<p class="hint" style="margin-top:0">Votre compte s’ouvre aussitôt et vous recevez votre <b>matricule à 6 chiffres</b>, votre carte de membre et votre espace soldat.</p>
      <div class="f2">${champ("ci-prenoms", "Prénoms", inp("ci-prenoms", "prenoms", "", 'autocomplete="given-name" required autofocus maxlength="80"'), { req: true })}${champ("ci-nom", "Nom", inp("ci-nom", "nom", "", 'autocomplete="family-name" required maxlength="80"'), { req: true })}</div>
      ${champ("ci-tel", "Téléphone (WhatsApp)", inp("ci-tel", "telephone", "", 'type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="07 00 00 00 00"'))}
      ${email}${champMdp("ci-mdp", "Choisissez un mot de passe", "new-password", "Au moins 8 caractères.")}${champMdp("ci-mdp2", "Confirmez le mot de passe", "new-password")}${voirMdp}
      <p class="hint">Déjà membre avec un matricule (par exemple SDE-CI-013) ? Inscrivez-vous puis prévenez le secrétariat : il reliera votre compte à votre fiche et vous garderez votre matricule.</p>${pied("Créer mon compte")}`;
    else corps = `<p class="hint" style="margin-top:0">Le secrétariat vous a remis un code d’activation (par exemple K7PM-Q2XD) pour ouvrir votre compte ou choisir un nouveau mot de passe.</p>${email}
      ${champ("ca-code", "Code d’activation", inp("ca-code", "code", "", 'autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="12" required placeholder="K7PM-Q2XD"'), { req: true })}
      ${champMdp("ca-mdp", "Nouveau mot de passe", "new-password", "Au moins 8 caractères.")}${champMdp("ca-mdp2", "Confirmez le mot de passe", "new-password")}${voirMdp}${pied("Activer et me connecter")}`;
    return `<div class="cnx-onglets" role="group" aria-label="Choix">${onglets}</div><form class="form cnx-form" id="f-cnx" data-mode="${m}" novalidate>${corps}</form>`;
  }
  function ouvrirConnexion(mode) {
    if (mode) CNX.mode = mode;
    ouvrir({ titre: CNX.mode === "inscription" ? "Créer mon compte" : CNX.mode === "activation" ? "Activer mon compte" : "Connexion", html: ficheConnexion(), onSubmit: soumettreConnexion });
  }
  async function soumettreConnexion(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const mode = form.dataset.mode, email = g("email").toLowerCase();
    CNX.email = email;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erreurForm("Indiquez une adresse e-mail valide."); return; }
    const mdp = String(fd.get("mdp") || "");
    if (mdp.length < 8) { erreurForm("Le mot de passe doit compter au moins 8 caractères."); return; }
    if (mode !== "connexion" && mdp !== String(fd.get("mdp2") || "")) { erreurForm("Les deux mots de passe ne sont pas identiques."); return; }
    if (mode === "inscription" && (!g("prenoms") || !g("nom"))) { erreurForm("Indiquez votre nom et vos prénoms."); return; }
    if (mode === "activation" && g("code").replace(/[^0-9a-z]/gi, "").length !== 8) { erreurForm("Le code d’activation compte 8 caractères, par exemple K7PM-Q2XD."); return; }
    const b = form.querySelector("[type=submit]");
    if (b) { b.disabled = true; b.textContent = "Un instant…"; }
    try {
      if (mode === "connexion") await SDEH.connexion(email, mdp);
      else if (mode === "inscription") { await SDEH.inscription({ email, motDePasse: mdp, prenoms: g("prenoms"), nom: g("nom"), telephone: g("telephone") }); location.hash = "#espace"; }
      else await SDEH.activation({ email, code: g("code"), motDePasse: mdp });
      location.reload();
    } catch (e) {
      if (e && e.code === "activation") { CNX.mode = "activation"; ouvrirConnexion(); erreurForm(e.message); return; }
      erreurForm((e && e.message) || "La connexion a échoué. Réessayez.");
      if (b) { b.disabled = false; b.textContent = mode === "connexion" ? "Se connecter" : mode === "inscription" ? "Créer mon compte" : "Activer et me connecter"; }
    }
  }
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t && t.matches && t.matches("[data-voir-mdp]")) { const f = t.closest("form"); if (f) f.querySelectorAll('input[name^="mdp"], input[name="ancien"], input[name="nouveau"], input[name="nouveau2"]').forEach((i) => { i.type = t.checked ? "text" : "password"; }); }
  });

  /* — Changer son mot de passe — */
  function ouvrirMotDePasse() {
    ouvrir({ titre: "Changer mon mot de passe", html: `<form class="form" id="f-mdp" novalidate>${champ("cm-ancien", "Mot de passe actuel", '<input class="inp" id="cm-ancien" name="ancien" type="password" autocomplete="current-password" required autofocus>', { req: true })}${champ("cm-nouveau", "Nouveau mot de passe", '<input class="inp" id="cm-nouveau" name="nouveau" type="password" autocomplete="new-password" minlength="8" required>', { req: true, hint: "Au moins 8 caractères." })}${champ("cm-nouveau2", "Confirmez le nouveau mot de passe", '<input class="inp" id="cm-nouveau2" name="nouveau2" type="password" autocomplete="new-password" required>', { req: true })}${voirMdp}${pied("Enregistrer")}</form>`,
      onSubmit: async (fd, form) => {
        const n = String(fd.get("nouveau") || "");
        if (n.length < 8) { erreurForm("Le nouveau mot de passe doit compter au moins 8 caractères."); return; }
        if (n !== String(fd.get("nouveau2") || "")) { erreurForm("Les deux mots de passe ne sont pas identiques."); return; }
        try { await SDEH.motDePasse({ ancien: String(fd.get("ancien") || ""), nouveau: n }); fermer(); toast("Mot de passe modifié. Vos autres appareils sont déconnectés."); }
        catch (e) { erreurForm((e && e.message) || "Modification impossible."); }
      } });
  }

  /* — Mon compte — */
  function blocCompteH() {
    const m = moiH();
    if (!m.connecte) return `<section class="card compte-h"><h2 class="h3">Mon compte</h2><p class="hint">Créez votre compte avec votre adresse e-mail : vous recevez aussitôt votre matricule, votre carte de membre et votre espace soldat.</p><div class="btn-row">${btn("inscription", "Créer mon compte", { ico: "i-plus", cls: "btn-primary" })}${btn("connexion", "Se connecter", { ico: "i-lock" })}</div></section>`;
    return `<section class="card compte-h"><h2 class="h3">Mon compte</h2><p style="margin:0"><b>${esc(m.nom || m.email)}</b></p><p class="hint" style="margin:2px 0 10px">${esc(m.email)} · ${esc(LIB_ROLE_H[m.role] || m.libRole || "")}${m.matricule ? ` · matricule <b class="num">${esc(m.matricule)}</b>` : ""}</p>${m.role === "attente" ? `<p class="note warn">Votre compte attend qu’un administrateur vous attribue un rôle.</p>` : ""}<div class="btn-row">${m.membreId ? btn("aller-espace", "Mon espace soldat", { ico: "i-card", sm: true, cls: "btn-primary" }) : ""}${m.niveau >= 2 ? btn("comptes", "Comptes et accès", { ico: "i-users", sm: true }) : ""}${btn("mot-de-passe", "Changer mon mot de passe", { ico: "i-lock", sm: true })}${btn("deconnexion", "Se déconnecter", { sm: true })}</div></section>`;
  }
  (function boutonCompteH() {
    const ref = document.getElementById("btn-reglages");
    if (!ref || document.getElementById("btn-compte")) return;
    const m = moiH();
    const b = document.createElement("button");
    b.className = "hdr-btn hdr-compte" + (m.connecte ? " on" : "");
    b.id = "btn-compte"; b.type = "button"; b.dataset.act = "compte";
    b.setAttribute("aria-label", m.connecte ? "Mon compte : " + (m.nom || m.email) : "Se connecter");
    b.innerHTML = m.connecte ? `<span class="hdr-ini" aria-hidden="true">${esc(String(m.nom || m.email || "?").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase())}</span>` : I("i-lock");
    ref.parentNode.insertBefore(b, ref);
  })();
  const plusOrigH = VUES.plus;
  VUES.plus = function () { return blocCompteH() + plusOrigH(); };

  /* — Espace soldat d’un compte relié à une fiche — */
  const ESPC = { charge: false, data: null, err: "", majLe: null, demande: false };
  async function chargerEspaceCompte() {
    ESPC.charge = true; ESPC.demande = true;
    try {
      const r = await SDEH.monEspace();
      const an = new Date().getFullYear();
      const base = { v: 1, m: r.membre, garnisons: r.garnisons || [], presences: { taux: null, liste: [] }, cotis: { annee: an, mensuel: 0, payes: {}, dus: [], retard: [], verse: 0, exempt: false }, speciales: [], projets: [], offrandes: { annee: an, total: 0, n: 0 } };
      ESPC.data = r.resume ? { ...base, ...r.resume, m: { ...r.resume.m, ...r.membre } } : base;
      ESPC.majLe = r.resume ? r.majLe : null; ESPC.err = "";
    } catch (e) { ESPC.err = (e && e.message) || "Votre espace n’a pas pu être chargé."; }
    ESPC.charge = false;
    ESP.data = ESPC.data; ESP.code = ESPC.data ? "compte" : ""; ESP.t = ESPC.majLe || 0; ESP.cartes = ""; ESP.rafraichi = true;
    render();
  }
  const espaceOrigH = VUES.espace;
  VUES.espace = function () {
    const m = moiH();
    if (!m.connecte || !m.membreId) {
      const html = espaceOrigH();
      if (m.connecte) return html.replace(/<section class="card esp-entree">/, `<p class="note info">Votre compte n’est pas encore relié à une fiche de membre : le secrétariat peut le faire depuis « Comptes et accès ». En attendant, vous pouvez ouvrir votre espace avec un code personnel.</p><section class="card esp-entree">`);
      return html.replace(/<section class="card esp-entree">/, `<section class="card esp-compte"><div class="esp-entree-i" aria-hidden="true">${I("i-users")}</div><h2 class="h3">Créer mon compte soldat</h2><p class="hint">Avec votre adresse e-mail et un mot de passe. Vous recevez aussitôt votre matricule à 6 chiffres, votre carte de membre et votre espace.</p><div class="btn-row">${btn("inscription", "Créer mon compte", { ico: "i-plus", cls: "btn-primary" })}${btn("connexion", "Se connecter", { ico: "i-lock" })}</div></section><p class="hint esp-ou">Vous avez reçu un code personnel du secrétariat ? Il fonctionne toujours :</p><section class="card esp-entree">`);
    }
    const out = secHead("Mon espace soldat", { eyebrow: "Espace personnel", verset: ["Je mettrai mon esprit en vous, et vous vivrez.", "Ézéchiel 37.14"] });
    if (!ESPC.demande) { setTimeout(chargerEspaceCompte, 0); return out + chargement("Ouverture de votre espace…"); }
    if (ESPC.charge && !ESPC.data) return out + chargement("Ouverture de votre espace…");
    if (!ESPC.data) return out + `<p class="note danger">${esc(ESPC.err)}</p><div class="btn-row">${btn("esp-recharger", "Réessayer", { ico: "i-undo" })}</div>`;
    const accueil = !ESPC.majLe ? `<p class="note info"><b>Bienvenue dans l’armée, ${esc(String(ESPC.data.m.prenoms || "").split(/\s+/)[0] || "soldat")} !</b> Votre matricule est <b class="num">${esc(ESPC.data.m.matricule || m.matricule)}</b>. Vos présences et vos cotisations s’afficheront ici dès la prochaine mise à jour du secrétariat.</p>` : "";
    return out + accueil + espaceSoldat(ESPC.data).replace(/<p class="hint esp-pied">[\s\S]*?<\/p>\s*$/, `<p class="hint esp-pied">${ESPC.majLe ? `Présences et cotisations mises à jour ${esc(relLong(isoJour(new Date(ESPC.majLe))))}. ` : ""}Matricule attribué à l’inscription. <button class="link" type="button" data-act="mot-de-passe">Changer mon mot de passe</button> · <button class="link" type="button" data-act="deconnexion">Se déconnecter</button></p>`);
  };
  /* Requête de prière d’un compte : enregistrée directement dans la Chambre Haute */
  const deposerPriereOrigH = deposerPriere;
  deposerPriere = async function (fd, form) {
    const m = moiH();
    if (!m.connecte || !m.membreId || m.niveau >= 1 || fd.get("conf") === "1") return deposerPriereOrigH(fd, form);
    const sujet = String(fd.get("sujet") || "").trim();
    if (!sujet) { toast("Écrivez votre sujet de prière.", "err"); return; }
    ESP.envoi = true; render();
    try { await SDEH.priere({ sujet }); form.reset(); toast("Requête déposée : les intercesseurs prient pour vous."); }
    catch (e) { toast((e && e.message) || "La requête n’a pas pu être déposée.", "err"); }
    ESP.envoi = false; render();
  };

  /* — Direction : publie le résumé (présences, cotisations) de chaque compte relié à une fiche — */
  const SYNC_C = { t: 0, enCours: false, empreintes: new Map(), comptes: null, lu: 0 };
  function planifierSynchroComptes() {
    if (!peutAdmin() || !pretPourResume()) return;
    clearTimeout(SYNC_C.t);
    SYNC_C.t = setTimeout(synchroComptes, 5000);
  }
  async function synchroComptes() {
    if (SYNC_C.enCours || !peutAdmin() || !pretPourResume()) return;
    SYNC_C.enCours = true;
    try {
      if (!SYNC_C.comptes || Date.now() - SYNC_C.lu > 120000) {
        SYNC_C.comptes = ((await SDEH.comptes()).comptes || []).filter((c) => c.membreId); SYNC_C.lu = Date.now();
        if (!SYNC_C.empreintes.size) {
          const snap = await S.db.collection("espace_membre").get();
          snap.forEach((d) => SYNC_C.empreintes.set(d.id, (d.data() || {}).empreinte || ""));
        }
      }
      for (const c of SYNC_C.comptes) {
        const mb = membre(c.membreId);
        if (!mb) continue;
        const r = resumeSoldat(mb);
        const emp = await empreinte(JSON.stringify(r));
        if (SYNC_C.empreintes.get(mb.id) === emp) continue;
        await S.db.doc("espace_membre/" + mb.id).set({ resume: r, empreinte: emp, majLe: Date.now() });
        SYNC_C.empreintes.set(mb.id, emp);
        await sleep(120);
      }
    } catch (e) { /* nouvel essai au prochain changement */ }
    SYNC_C.enCours = false;
  }

  /* — Comptes et accès (administrateurs) — */
  const CPT = { liste: null, err: "", code: null };
  async function chargerComptes() {
    try { const r = await SDEH.comptes(); CPT.liste = r.comptes || []; CPT.err = ""; SYNC_C.comptes = null; } catch (e) { CPT.err = (e && e.message) || "Lecture impossible."; }
    dernier.sheet = null; render();
  }
  function messageActivation(c) {
    return `Shalom${c.nom ? " " + c.nom.split(/\s+/)[0] : ""} !\n\nTon accès à S.D.E. DIGITAL est prêt.\n1. Ouvre ${URL_APP_H}\n2. Touche le cadenas, puis « J’ai un code »\n3. Saisis ton adresse ${c.email}, le code ${c.code} et choisis ton mot de passe.\n\nLe code est valable 14 jours et ne sert qu’une fois.\n— ${cfg().nomCourt}`;
  }
  function ficheComptes() {
    const m = moiH();
    if (CPT.err) return `<p class="note danger">${esc(CPT.err)}</p>`;
    if (!CPT.liste) return chargement("Chargement des comptes…");
    const opts = (r) => ROLES_H.filter(([k]) => k !== "admin" || m.niveau >= 3).map(([k, l]) => `<option value="${k}"${k === r ? " selected" : ""}>${esc(l.split(" :")[0])}</option>`).join("");
    const fiches = S.pret.membres ? membresActifs().slice().sort(parNom) : [];
    const pris = new Set(CPT.liste.map((c) => c.membreId).filter(Boolean));
    const nomFiche = (id) => { const f = id && membre(id); return f ? `${nomComplet(f)}${f.matricule ? " · " + f.matricule : ""}` : ""; };
    const imp = m.niveau >= 3 ? `<details class="imp-h"><summary>Transférer des données (propriétaire)</summary><p class="hint">Choisissez le fichier de transfert (.json) préparé à partir de la version Claude. Les documents existants portant le même nom sont remplacés.</p><label class="btn btn-sm" for="imp-fichier">${I("i-up")}Choisir le fichier</label><input type="file" id="imp-fichier" accept=".json,application/json" hidden><p class="hint" id="imp-msg" role="status"></p></details>` : "";
    const code = CPT.code ? `<div class="note ok cpt-code" role="status"><p style="margin:0 0 6px"><b>Code d’activation pour ${esc(CPT.code.email)} : <span class="num esp-code">${esc(CPT.code.code)}</span></b></p><p class="hint" style="margin:0 0 8px">Transmettez-le à la personne : il n’est affiché qu’une fois, reste valable 14 jours et ne sert qu’une fois.</p><div class="btn-row"><a class="btn btn-sm btn-primary" href="${esc(lienWa("", messageActivation(CPT.code)))}" target="_blank" rel="noopener">${I("i-msg")}Envoyer par WhatsApp</a>${btn("cpt-copier", "Copier le message", { sm: true })}${btn("cpt-code-ok", "C’est transmis", { sm: true })}</div></div>` : "";
    const etat = (c) => c.actif ? (c.derniere ? "dernière connexion " + fmtStamp(c.derniere) : "actif") : c.aActiver ? "en attente d’activation" : "sans mot de passe";
    return imp + code + `<p class="hint" style="margin-top:0">Les soldats créent eux-mêmes leur compte et reçoivent un matricule à 6 chiffres. Pour un responsable, ajoutez son adresse avec son rôle : un code d’activation s’affiche, à lui transmettre pour qu’il choisisse son mot de passe.</p>
      <form class="form compte-aj" id="f-compte" novalidate><div class="f2">${champ("cp-email", "Adresse e-mail", inp("cp-email", "email", "", 'type="email" autocomplete="off" placeholder="prenom.nom@gmail.com" required'))}${champ("cp-nom", "Nom", inp("cp-nom", "nom", "", 'autocomplete="off"'))}</div>${champ("cp-role", "Rôle", `<select class="inp" id="cp-role" name="role">${opts("contributeur")}</select>`)}<button class="btn btn-primary btn-sm" type="submit">${I("i-plus")}Ajouter ou mettre à jour</button></form>
      <div class="list" style="margin-top:14px">${CPT.liste.map((c) => {
        const proprio = c.role === "proprietaire";
        const lien = fiches.length && !proprio ? `<label class="sr" for="cf-${esc(c.id)}">Fiche de ${esc(c.email)}</label><select class="inp inp-sm cpt-fiche" id="cf-${esc(c.id)}" data-fiche="${esc(c.email)}"><option value="">${c.membreId ? "Délier la fiche" : "Relier à une fiche…"}</option>${fiches.filter((f) => f.id === c.membreId || !pris.has(f.id)).map((f) => `<option value="${esc(f.id)}"${f.id === c.membreId ? " selected" : ""}>${esc(nomComplet(f))}${f.matricule ? " · " + esc(f.matricule) : ""}</option>`).join("")}</select>` : "";
        return `<div class="row nolead sp-row cpt-row"><span class="row-main"><span class="row-t">${esc(c.nom || c.email)}</span><span class="row-m">${esc(c.email)} · ${esc(etat(c))}${c.matricule ? " · matricule " + esc(c.matricule) : ""}${c.membreId && nomFiche(c.membreId) ? " · fiche " + esc(nomFiche(c.membreId)) : ""}</span>${lien}</span><span class="row-r">${proprio ? `<span class="chip ok">Propriétaire</span>${c.email === m.email ? btn("cpt-reinit", "Nouveau code", { sm: true, data: `data-email="${esc(c.email)}"` }) : ""}` : `<label class="sr" for="cr-${esc(c.id)}">Rôle de ${esc(c.email)}</label><select class="inp inp-sm" id="cr-${esc(c.id)}" data-compte="${esc(c.email)}">${opts(c.role)}</select>${btn("cpt-reinit", "Nouveau code", { sm: true, data: `data-email="${esc(c.email)}"`, attrs: `aria-label="${esc("Nouveau code d’activation pour " + c.email)}"` })}<button class="icon-btn" type="button" data-act="compte-suppr" data-email="${esc(c.email)}" aria-label="${esc("Retirer l’accès de " + c.email)}">${I("i-trash")}</button>`}</span></div>`;
      }).join("")}</div>`;
  }
  const ouvrirComptes = () => { CPT.liste = null; ouvrir({ titre: "Comptes et accès", refresh: surveiller(() => ficheComptes()), wide: true }); chargerComptes(); };
  async function majCompteH(o, msg) {
    try {
      const r = await SDEH.majCompte(o);
      if (r && r.code) CPT.code = { email: o.email, nom: o.nom || (CPT.liste.find((c) => c.email === o.email) || {}).nom || "", code: r.code };
      toast(msg); await chargerComptes();
    } catch (e) { toast((e && e.message) || "Modification refusée.", "err"); await chargerComptes(); }
  }
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t && t.dataset && t.dataset.compte) majCompteH({ email: t.dataset.compte, role: t.value }, "Rôle mis à jour");
    if (t && t.dataset && t.dataset.fiche) majCompteH({ email: t.dataset.fiche, membreId: t.value }, t.value ? "Compte relié à la fiche" : "Fiche déliée");
  });
  document.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (!t || t.id !== "imp-fichier" || !t.files || !t.files[0]) return;
    const msg = $("#imp-msg");
    try {
      const o = JSON.parse(await t.files[0].text());
      const docs = o.docs || o;
      if (msg) msg.textContent = `Transfert de ${Object.keys(docs).length} documents…`;
      const r = await SDEH.importer(docs);
      if (msg) msg.textContent = `${r.importes} documents transférés${r.ignores ? `, ${r.ignores} ignorés` : ""}. Rechargement…`;
      setTimeout(() => location.reload(), 1500);
    } catch (e) { if (msg) msg.textContent = "Transfert impossible : " + ((e && e.message) || "fichier illisible"); }
  });
  document.addEventListener("submit", (ev) => {
    if (!ev.target || ev.target.id !== "f-compte") return;
    ev.preventDefault();
    const fd = new FormData(ev.target);
    majCompteH({ email: String(fd.get("email") || "").trim().toLowerCase(), nom: String(fd.get("nom") || ""), role: String(fd.get("role") || "contributeur") }, "Compte enregistré");
  });
  Object.assign(A, {
    connexion: () => ouvrirConnexion("connexion"),
    inscription: () => ouvrirConnexion("inscription"),
    "cnx-mode": (t) => { const f = $("#f-cnx"); const e = f && f.querySelector('[name="email"]'); if (e) CNX.email = e.value.trim(); ouvrirConnexion(t.dataset.m); },
    compte: () => (moiH().connecte ? ouvrir({ titre: "Mon compte", html: blocCompteH().replace('<section class="card compte-h"><h2 class="h3">Mon compte</h2>', "<section>") }) : ouvrirConnexion("connexion")),
    "mot-de-passe": () => ouvrirMotDePasse(),
    "aller-espace": () => { fermer(); allerA("espace"); },
    "esp-recharger": () => { ESPC.demande = false; render(); },
    deconnexion: () => SDEH.deconnexion(),
    comptes: () => ouvrirComptes(),
    "cpt-reinit": (t) => boutonArme(t, "Confirmer", () => majCompteH({ email: t.dataset.email, reinitialiser: true }, "Nouveau code créé : l’ancien mot de passe ne fonctionne plus")),
    "cpt-copier": () => { if (CPT.code) navigator.clipboard.writeText(messageActivation(CPT.code)).then(() => toast("Message copié"), () => toast("Copie impossible", "err")); },
    "cpt-code-ok": () => { CPT.code = null; dernier.sheet = null; render(); },
    "compte-suppr": (t) => boutonArme(t, "Confirmer le retrait", () => majCompteH({ email: t.dataset.email, supprimer: true }, "Accès retiré")),
  });
