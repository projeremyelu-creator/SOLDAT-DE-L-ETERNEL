/* SDE — Fondations publiques : interactions côté client des nouvelles pages. */
(() => {
  "use strict";
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ── Copier un numéro Mobile Money ────────────────────────────────────────
  $$(".sde-don-copy").forEach(b => b.addEventListener("click", async () => {
    const txt = (b.dataset.copy || "").replace(/\s+/g, "");
    try { await navigator.clipboard.writeText(txt); } catch { /* ignorer */ }
    const base = b.textContent;
    b.textContent = "Copié";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = base; b.classList.remove("copied"); }, 1800);
  }));

  // ── Soumission d'un formulaire JSON ──────────────────────────────────────
  async function submit(form, mapper, okText, errFallback) {
    const btn = form.querySelector("button[type=submit]");
    const feed = form.querySelector(".sde-don-feedback");
    const data = Object.fromEntries(new FormData(form));
    const payload = mapper ? mapper(data) : data;
    if (btn) { btn.disabled = true; btn.dataset.base = btn.textContent; btn.textContent = "Envoi en cours…"; }
    if (feed) { feed.textContent = ""; feed.classList.remove("ok", "err"); }
    try {
      const r = await fetch(form.action, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      let body = {};
      try { body = await r.json(); } catch { /* texte brut */ }
      if (r.ok && body.ok !== false) {
        if (feed) { feed.textContent = body.message || okText; feed.classList.add("ok"); }
        form.reset();
      } else {
        if (feed) { feed.textContent = body.message || body.erreur || errFallback; feed.classList.add("err"); }
      }
    } catch (e) {
      if (feed) { feed.textContent = "Pas de connexion. Réessayez dans un instant."; feed.classList.add("err"); }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.base || "Envoyer"; }
    }
  }
  const formulaires = {
    "form-don": ["Merci. Votre déclaration a bien été reçue, nous vous écrivons sous 48 h avec le reçu officiel.", "Nous n'avons pas pu enregistrer votre don. Réessayez ou écrivez à infosoldat@gmail.com."],
    "form-signalement": ["Signalement reçu. Il est lu par le Leader Fondateur et la Co-Leader. Vous serez recontacté(e) sous 72 h si vous avez laissé un contact.", "Nous n'avons pas pu enregistrer votre signalement."],
    "form-ouvrir": ["Merci. Votre demande d'ouverture de point est transmise au Leader Fondateur. Nous vous recontactons sous 7 jours.", "Nous n'avons pas pu enregistrer votre demande."],
    "form-mur": ["Votre intention est bien reçue, les intercesseurs la portent déjà.", "Nous n'avons pas pu enregistrer votre intention."],
    "form-newsletter": ["Vous êtes inscrit(e). Rendez-vous début du mois prochain dans votre boîte mail.", "Nous n'avons pas pu enregistrer votre inscription."]
  };
  Object.entries(formulaires).forEach(([id, [ok, err]]) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("submit", e => { e.preventDefault(); submit(f, null, ok, err); });
  });

  // ── Pré-remplir l'affectation depuis un lien de cagnotte ─────────────────
  $$("a[data-affect]").forEach(a => a.addEventListener("click", () => {
    const sel = document.getElementById("don-affect");
    if (!sel) return;
    const v = a.dataset.affect;
    [...sel.options].forEach(o => { if (o.textContent.trim() === v) sel.value = o.value || o.textContent; });
  }));

  // ── Mur de prière : charger et prier ─────────────────────────────────────
  const mur = document.getElementById("mur-liste");
  if (mur) {
    const key = "sde-mur-priees";
    const dejaPriees = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
    const marquer = id => { try { const s = dejaPriees(); s.add(id); localStorage.setItem(key, JSON.stringify([...s])); } catch { /* ignorer */ } };
    const dateFr = ts => {
      const d = new Date(ts); const h = (24 * 3600 * 1000);
      const diff = Math.round((Date.now() - ts) / h);
      if (diff < 1) return "Aujourd’hui"; if (diff === 1) return "Hier"; if (diff < 7) return `Il y a ${diff} jours`;
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
    };
    const html = (s = "") => String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
    (async () => {
      try {
        const r = await fetch("/api/mur-priere", { headers: { "Accept": "application/json" } });
        const data = await r.json();
        const liste = Array.isArray(data.intentions) ? data.intentions : [];
        if (!liste.length) { mur.innerHTML = '<p class="sde-mur-vide">Soyez le premier à déposer une intention. Le mur se remplira avec les sujets des soldats du monde entier.</p>'; mur.setAttribute("aria-busy", "false"); return; }
        const priees = dejaPriees();
        mur.innerHTML = liste.slice(0, 30).map(i => `
<article class="sde-mur-intention" data-id="${html(i.id)}">
  <div class="sde-mur-intention-tete">
    <span class="sde-mur-intention-cat">${html(i.categorie || "Prière générale")}</span>
    <span class="sde-mur-intention-date">${html(dateFr(i.cree || Date.now()))}</span>
    <span class="sde-mur-intention-de">— ${html(i.prenom || "Anonyme")}</span>
  </div>
  <p class="sde-mur-intention-txt">${html(i.sujet || "")}</p>
  <div class="sde-mur-intention-pied">
    <button type="button" class="sde-mur-pour${priees.has(i.id) ? " priee" : ""}" data-pour="${html(i.id)}">${priees.has(i.id) ? "✓ Vous avez prié" : "🙏 Je prie pour cette intention"}</button>
    <span class="sde-mur-compteur">Priée par <strong>${(i.priants || 0)}</strong> soldat${(i.priants || 0) > 1 ? "s" : ""}</span>
  </div>
</article>`).join("");
        mur.setAttribute("aria-busy", "false");
        $$(".sde-mur-pour", mur).forEach(b => b.addEventListener("click", async () => {
          const id = b.dataset.pour;
          if (dejaPriees().has(id)) return;
          b.disabled = true;
          try {
            const r = await fetch("/api/mur-priere/prier", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id })
            });
            const d = await r.json();
            if (d.ok) {
              marquer(id);
              b.classList.add("priee");
              b.textContent = "✓ Vous avez prié";
              const cnt = b.parentElement?.querySelector(".sde-mur-compteur strong");
              if (cnt) cnt.textContent = d.priants || (parseInt(cnt.textContent, 10) + 1);
            } else {
              b.disabled = false;
            }
          } catch { b.disabled = false; }
        }));
      } catch {
        mur.innerHTML = '<p class="sde-mur-vide">Le mur ne répond pas. Réessayez dans un moment.</p>';
        mur.setAttribute("aria-busy", "false");
      }
    })();
  }

  // ── Calendrier mensuel ───────────────────────────────────────────────────
  const calGrille = document.getElementById("sde-cal-grille");
  if (calGrille) {
    const titre = document.getElementById("sde-cal-titre");
    const mois = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const jours = ["L","M","M","J","V","S","D"];
    // Événements répertoriés (ISO date -> {titre, href})
    const EVTS = {
      "2026-12-18": { titre: "TPA 2026 · 20h00 Google Meet", href: "/programmes#agenda" }
    };
    let courant = new Date(2026, 11, 1); // décembre 2026 par défaut
    function render() {
      const y = courant.getFullYear(), m = courant.getMonth();
      titre.textContent = `${mois[m]} ${y}`;
      const premier = new Date(y, m, 1);
      const dernierJour = new Date(y, m + 1, 0).getDate();
      let jourSemaine = (premier.getDay() + 6) % 7; // Lun=0
      const auj = new Date().toISOString().slice(0, 10);
      let html = jours.map(j => `<div class="sde-cal-jh">${j}</div>`).join("");
      for (let i = 0; i < jourSemaine; i++) html += '<div class="sde-cal-cel hors"></div>';
      for (let d = 1; d <= dernierJour; d++) {
        const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const evt = EVTS[iso];
        const cls = ["sde-cal-cel"];
        if (iso === auj) cls.push("auj");
        if (evt) cls.push("evt");
        html += evt
          ? `<a class="${cls.join(" ")}" href="${evt.href}" tabindex="0"><span>${d}</span><span class="sde-cal-tt">${evt.titre}</span></a>`
          : `<div class="${cls.join(" ")}"><span>${d}</span></div>`;
      }
      calGrille.innerHTML = html;
    }
    render();
    const prev = document.querySelector(".sde-cal-prev");
    const next = document.querySelector(".sde-cal-next");
    if (prev) prev.addEventListener("click", () => { courant = new Date(courant.getFullYear(), courant.getMonth() - 1, 1); render(); });
    if (next) next.addEventListener("click", () => { courant = new Date(courant.getFullYear(), courant.getMonth() + 1, 1); render(); });
  }

  // ── Carte réseau des 6 pays ──────────────────────────────────────────────
  const carte = document.getElementById("sde-carte-reseau");
  if (carte) {
    const PAYS = [
      { nom: "Côte d’Ivoire", ville: "Abidjan", drapeau: "🇨🇮", x: 44, y: 56, resp: "Apôtre Jérémy l’Élu · Siège" },
      { nom: "Tunisie", ville: "Tunis", drapeau: "🇹🇳", x: 54, y: 38, resp: "Coordinateur à confirmer" },
      { nom: "Burkina Faso", ville: "Ouagadougou", drapeau: "🇧🇫", x: 48, y: 53, resp: "Coordinateur à confirmer" },
      { nom: "Italie", ville: "Nord Italie", drapeau: "🇮🇹", x: 55, y: 34, resp: "Coordinateur à confirmer" },
      { nom: "Canada", ville: "Québec", drapeau: "🇨🇦", x: 24, y: 28, resp: "Coordinateur à confirmer" },
      { nom: "États-Unis", ville: "Côte Est", drapeau: "🇺🇸", x: 22, y: 38, resp: "Coordinateur à confirmer" }
    ];
    const svg = `
<svg viewBox="0 0 100 56" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">
  <defs>
    <radialGradient id="globe" cx="40%" cy="35%"><stop offset="0%" stop-color="rgba(226,194,106,0.14)"/><stop offset="100%" stop-color="rgba(10,20,30,0)"/></radialGradient>
  </defs>
  <ellipse cx="50" cy="30" rx="42" ry="24" fill="url(#globe)"/>
  <path d="M18 20 L30 18 L36 24 L34 32 L25 36 L15 30 Z" fill="rgba(226,194,106,.14)" stroke="rgba(226,194,106,.35)" stroke-width="0.3"/>
  <path d="M44 20 L58 18 L62 22 L58 28 L48 30 L42 24 Z" fill="rgba(226,194,106,.14)" stroke="rgba(226,194,106,.35)" stroke-width="0.3"/>
  <path d="M44 32 L54 32 L58 44 L50 50 L42 48 L40 40 Z" fill="rgba(226,194,106,.14)" stroke="rgba(226,194,106,.35)" stroke-width="0.3"/>
</svg>`;
    const marqueurs = PAYS.map((p, i) => `
<button type="button" class="sde-carte-pin" style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-100%);background:transparent;border:0;cursor:pointer;color:#e2c26a;text-align:center;z-index:${10 + i}" data-pays="${p.nom}">
  <span style="font-size:1.6rem;filter:drop-shadow(0 2px 6px rgba(226,194,106,.4))">${p.drapeau}</span>
  <span style="display:block;background:rgba(26,24,16,.9);padding:2px 8px;border-radius:999px;font-size:.72rem;white-space:nowrap;margin-top:2px;border:1px solid rgba(226,194,106,.4)">${p.ville}</span>
</button>`).join("");
    carte.innerHTML = svg + marqueurs + '<div class="sde-carte-popup" id="sde-carte-popup" style="position:absolute;bottom:14px;left:14px;right:14px;background:rgba(10,20,30,.9);border:1px solid rgba(226,194,106,.4);border-radius:12px;padding:12px 16px;color:#f7f4ed;display:none"></div>';
    const popup = carte.querySelector("#sde-carte-popup");
    carte.querySelectorAll(".sde-carte-pin").forEach(p => p.addEventListener("click", () => {
      const pays = PAYS.find(x => x.nom === p.dataset.pays);
      if (!pays) return;
      popup.innerHTML = `<strong style="color:#e2c26a">${pays.drapeau} ${pays.nom} · ${pays.ville}</strong><br><span style="color:#bac6d5;font-size:.9rem">${pays.resp}</span>`;
      popup.style.display = "block";
    }));
  }

  // ── Recherche globale ────────────────────────────────────────────────────
  const rc = document.getElementById("form-recherche");
  if (rc) {
    const INDEX = [
      { t: "Soutenir le mouvement", d: "Faire un don par Mobile Money, virement ou carte", u: "/soutenir", mots: "don donner dons soutien soutenir finance argent mobile money orange mtn moov wave virement carte" },
      { t: "Transparence", d: "Rapport trimestriel sur l'utilisation des dons", u: "/transparence", mots: "transparence rapport finance comptabilité trimestre tresorerie" },
      { t: "Gouvernance", d: "Leadership, statuts, charte éthique, signalement", u: "/gouvernance", mots: "qui sommes nous leadership statuts charte éthique signalement abus confiance jérémy amy" },
      { t: "Carte des points SDE", d: "Les six pays d'implantation du mouvement", u: "/reseau", mots: "carte pays implantation côte ivoire tunisie burkina faso italie canada usa états-unis" },
      { t: "Mur de prière", d: "Déposer et porter des intentions de prière", u: "/communaute", mots: "mur prière intention intercession demande sujet partage" },
      { t: "Calendrier", d: "Tous les prochains rendez-vous du mouvement", u: "/calendrier", mots: "calendrier agenda rendez-vous événement date" },
      { t: "Newsletter mensuelle", d: "S'abonner à la lettre mensuelle du mouvement", u: "/newsletter", mots: "newsletter abonnement email courrier mensuel" },
      { t: "TPA 2026 — Traversée Prophétique Annuelle", d: "Vendredi 18 décembre à 20h00 sur Google Meet", u: "/programmes#agenda", mots: "tpa traversée prophétique annuelle 18 décembre google meet rassemblement" },
      { t: "Le Mouvement SDE", d: "Vision, histoire, cinq pôles d'activité", u: "/mouvement", mots: "mouvement vision histoire pôles réveil ezéchiel 37" },
      { t: "Programmes", d: "TPA, IN FIRE, Academy, Holy Talk, Holy Day", u: "/programmes", mots: "programmes rencontres rassemblements" },
      { t: "Soldiers Academy", d: "Parcours de formation et discipleship", u: "/academy", mots: "academy formation disciple parcours" },
      { t: "Enseignements", d: "Prédications et ressources audio", u: "/enseignements", mots: "enseignements prédications ressources audio prédicateur" },
      { t: "Missions humanitaires", d: "Actions de solidarité du pôle Impact Social", u: "/missions-humanitaires", mots: "missions humanitaires impact social solidarité" },
      { t: "Soldier's Award", d: "Cérémonie annuelle d'honneur et de reconnaissance", u: "/soldiers-award", mots: "soldier award honneur reconnaissance cérémonie prix" },
      { t: "Pôle Réveil & missions", d: "Évangélisation et réveil", u: "/pole-reveil", mots: "pôle rev reveil évangélisation missions" },
      { t: "Pôle Impact social", d: "Humanitaire et entraide", u: "/pole-social", mots: "pôle ish impact social humanitaire entraide" },
      { t: "Pôle Logistique", d: "Organisation et service", u: "/pole-logistique", mots: "pôle lo logistique organisation service" },
      { t: "Pôle Médias", d: "Communication et création", u: "/pole-medias", mots: "pôle cmr médias communication création digital relations" },
      { t: "Pôle Formation", d: "Développement intégral et entrepreneuriat", u: "/pole-formation", mots: "pôle fde formation développement entrepreneuriat" },
      { t: "Prière et intercession", d: "Prier et être accompagné", u: "/priere", mots: "prière intercession accompagnement pastoral" },
      { t: "Nous rejoindre", d: "Faire votre premier pas dans le mouvement", u: "/contact#rejoindre", mots: "rejoindre contact adhésion membre inscription" }
    ];
    const q = document.getElementById("q");
    const res = document.getElementById("rc-resultats");
    const info = document.getElementById("rc-info");
    const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    function cherche() {
      const term = norm(q.value.trim());
      if (!term) { res.innerHTML = ""; info.textContent = ""; return; }
      const mots = term.split(/\s+/).filter(Boolean);
      const scored = INDEX.map(it => {
        const haystack = norm(it.t + " " + it.d + " " + it.mots);
        let score = 0;
        mots.forEach(m => { if (haystack.includes(m)) score += (haystack.indexOf(m) < 40 ? 2 : 1); });
        return { it, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
      if (!scored.length) { res.innerHTML = '<p class="sde-rc-vide">Aucun résultat. Essayez un autre mot-clé.</p>'; info.textContent = ""; return; }
      info.textContent = `${scored.length} résultat${scored.length > 1 ? "s" : ""} pour « ${q.value.trim()} »`;
      const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
      const mark = s => { let out = esc(s); mots.forEach(m => { const re = new RegExp("(" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"); out = out.replace(re, "<mark>$1</mark>"); }); return out; };
      res.innerHTML = scored.slice(0, 20).map(({ it }) => `<a class="sde-rc-item" href="${it.u}"><h3>${mark(it.t)}</h3><p>${mark(it.d)}</p></a>`).join("");
    }
    q.addEventListener("input", cherche);
    rc.addEventListener("submit", e => { e.preventDefault(); cherche(); });
  }
})();
