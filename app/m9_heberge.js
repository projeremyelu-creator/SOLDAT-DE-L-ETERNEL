  /* ════════════════════════ Version hébergée : connexion Google et comptes ════════════════════════ */
  const SDEH = window.SDE || { moi: { connecte: false, niveau: 0 } };
  const moiH = () => SDEH.moi || { connecte: false, niveau: 0 };
  const LIB_ROLE_H = { attente: "En attente", lecture: "Lecture seule", contributeur: "Contributeur", admin: "Administrateur", proprietaire: "Propriétaire", visiteur: "Visiteur" };
  const ROLES_H = [["contributeur", "Contributeur : registre, agenda, pointage, sans les finances"], ["admin", "Administrateur : tout, finances comprises"], ["lecture", "Lecture seule"], ["attente", "En attente (aucun accès interne)"]];
  async function ouvrirConnexion() {
    const id = moiH().clientId;
    ouvrir({
      titre: "Connexion des responsables",
      html: `<p class="hint" style="margin-top:0">Secrétaires, trésoriers, chefs de point et direction se connectent avec leur compte Google. Les droits de chacun sont attribués par le propriétaire de l’application.</p>
        ${id ? `<div id="gsi-btn" class="gsi-w"></div><p class="hint" id="gsi-msg" role="status"></p>` : `<p class="note warn">La connexion Google n’est pas encore configurée. Elle sera disponible très bientôt.</p>`}
        <p class="hint">Soldat du mouvement ? Pas besoin de compte : ouvrez <button class="link" type="button" data-vue="espace">Mon espace</button> avec votre code personnel.</p>`,
      apres: async () => {
        if (!id) return;
        try {
          await chargerScript("https://accounts.google.com/gsi/client");
          window.google.accounts.id.initialize({ client_id: id, ux_mode: "popup", callback: async (r) => { const m = $("#gsi-msg"); if (m) m.textContent = "Connexion en cours…"; try { await SDEH.connexion(r.credential); } catch (e) { if (m) m.textContent = (e && e.message) || "La connexion a échoué."; } } });
          const box = $("#gsi-btn");
          if (box) window.google.accounts.id.renderButton(box, { theme: "filled_blue", size: "large", text: "signin_with", shape: "pill", locale: "fr", width: 280 });
        } catch (e) { const m = $("#gsi-msg"); if (m) m.textContent = "Le service de connexion Google ne répond pas. Vérifiez la connexion et réessayez."; }
      },
    });
  }
  function blocCompteH() {
    const m = moiH();
    if (!m.connecte) return `<section class="card compte-h"><h2 class="h3">Accès des responsables</h2><p class="hint">Vous consultez l’application comme visiteur : agenda, annonces et espace soldat.</p><div class="btn-row">${btn("connexion", "Se connecter avec Google", { ico: "i-lock", cls: "btn-primary" })}</div></section>`;
    return `<section class="card compte-h"><h2 class="h3">Mon compte</h2><p style="margin:0"><b>${esc(m.nom || m.email)}</b></p><p class="hint" style="margin:2px 0 10px">${esc(m.email)} · ${esc(LIB_ROLE_H[m.role] || m.libRole || "")}</p>${m.role === "attente" ? `<p class="note warn">Votre compte attend qu’un administrateur vous attribue un rôle.</p>` : ""}<div class="btn-row">${m.niveau >= 2 ? btn("comptes", "Comptes et accès", { ico: "i-users", sm: true }) : ""}${btn("deconnexion", "Se déconnecter", { sm: true })}</div></section>`;
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
  const CPT = { liste: null, err: "", roles: {} };
  async function chargerComptes() {
    try { const r = await SDEH.comptes(); CPT.liste = r.comptes || []; CPT.err = ""; } catch (e) { CPT.err = (e && e.message) || "Lecture impossible."; }
    dernier.sheet = null; render();
  }
  function ficheComptes() {
    const m = moiH();
    if (CPT.err) return `<p class="note danger">${esc(CPT.err)}</p>`;
    if (!CPT.liste) return chargement("Chargement des comptes…");
    const opts = (r) => ROLES_H.filter(([k]) => k !== "admin" || m.niveau >= 3).map(([k, l]) => `<option value="${k}"${k === r ? " selected" : ""}>${esc(l.split(" :")[0])}</option>`).join("");
    const imp = m.niveau >= 3 ? `<details class="imp-h"><summary>Transférer des données (propriétaire)</summary><p class="hint">Choisissez le fichier de transfert (.json) préparé à partir de la version Claude. Les documents existants portant le même nom sont remplacés.</p><label class="btn btn-sm" for="imp-fichier">${I("i-up")}Choisir le fichier</label><input type="file" id="imp-fichier" accept=".json,application/json" hidden><p class="hint" id="imp-msg" role="status"></p></details>` : "";
    return imp + `<p class="hint" style="margin-top:0">Ajoutez l’adresse Gmail d’un responsable avec son rôle : il pourra se connecter aussitôt. Une personne qui se connecte sans avoir été ajoutée apparaît « En attente ».</p>
      <form class="form compte-aj" id="f-compte" novalidate><div class="f2">${champ("cp-email", "Adresse Gmail", inp("cp-email", "email", "", 'type="email" autocomplete="off" placeholder="prenom.nom@gmail.com" required'))}${champ("cp-nom", "Nom", inp("cp-nom", "nom", "", 'autocomplete="off"'))}</div>${champ("cp-role", "Rôle", `<select class="inp" id="cp-role" name="role">${opts("contributeur")}</select>`)}<button class="btn btn-primary btn-sm" type="submit">${I("i-plus")}Ajouter ou mettre à jour</button></form>
      <div class="list" style="margin-top:14px">${CPT.liste.map((c) => `<div class="row nolead sp-row"><span class="row-main"><span class="row-t">${esc(c.nom || c.email)}</span><span class="row-m">${esc(c.email)}${c.derniere ? " · dernière connexion " + esc(fmtStamp(c.derniere)) : " · jamais connecté"}</span></span><span class="row-r">${c.role === "proprietaire" ? `<span class="chip ok">Propriétaire</span>` : `<label class="sr" for="cr-${esc(c.id)}">Rôle de ${esc(c.email)}</label><select class="inp inp-sm" id="cr-${esc(c.id)}" data-compte="${esc(c.email)}">${opts(c.role)}</select><button class="icon-btn" type="button" data-act="compte-suppr" data-email="${esc(c.email)}" aria-label="${esc("Retirer l’accès de " + c.email)}">${I("i-trash")}</button>`}</span></div>`).join("")}</div>`;
  }
  const ouvrirComptes = () => { CPT.liste = null; ouvrir({ titre: "Comptes et accès", refresh: surveiller(() => ficheComptes()), wide: true }); chargerComptes(); };
  async function majCompteH(o, msg) {
    try { await SDEH.majCompte(o); toast(msg); await chargerComptes(); } catch (e) { toast((e && e.message) || "Modification refusée.", "err"); }
  }
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t && t.dataset && t.dataset.compte) majCompteH({ email: t.dataset.compte, role: t.value }, "Rôle mis à jour");
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
    majCompteH({ email: String(fd.get("email") || ""), nom: String(fd.get("nom") || ""), role: String(fd.get("role") || "contributeur") }, "Compte enregistré");
  });
  Object.assign(A, {
    connexion: () => ouvrirConnexion(),
    compte: () => (moiH().connecte ? ouvrir({ titre: "Mon compte", html: blocCompteH().replace('<section class="card compte-h"><h2 class="h3">Mon compte</h2>', "<section>") }) : ouvrirConnexion()),
    deconnexion: () => SDEH.deconnexion(),
    comptes: () => ouvrirComptes(),
    "compte-suppr": (t) => boutonArme(t, "Confirmer le retrait", () => majCompteH({ email: t.dataset.email, supprimer: true }, "Accès retiré")),
  });
