"use strict";
(function () {
  /* ════════════════════════ Utilitaires ════════════════════════ */
  const $ = (s, r = document) => r.querySelector(s);
  const I = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = (s) => sansAccents(s).toLowerCase().replace(/\s+/g, " ").trim();
  const cmpFr = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;
  const NF = new Intl.NumberFormat("fr-FR");
  const nb = (n) => NF.format(Math.round(Number(n) || 0));
  const fcfa = (n) => nb(n) + " FCFA";
  const signe = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + nb(Math.abs(n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
  const guill = (t) => `« ${t} »`;
  const pluriel = (n, un, plusieurs) => `${nb(n)} ${n > 1 ? plusieurs : un}`;
  const fin = (matchMedia && matchMedia("(pointer: fine)").matches) || false;

  /* Dates */
  const isoJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const aujourdhui = () => isoJour(new Date());
  const versDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const moisCle = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const moisCourant = () => moisCle(new Date());
  const ajoutMois = (cle, n) => { const [y, m] = cle.split("-").map(Number); return moisCle(new Date(y, m - 1 + n, 1)); };
  const ajoutJours = (iso, n) => { const d = versDate(iso); d.setDate(d.getDate() + n); return isoJour(d); };
  const joursEntre = (a, b) => Math.round((versDate(b) - versDate(a)) / 864e5);
  const dernierJour = (cle) => { const [y, m] = cle.split("-").map(Number); return isoJour(new Date(y, m, 0)); };
  const premier = (s) => s.replace(/(^|\s)1(\s)/, "$11er$2");
  const DTF = (o) => new Intl.DateTimeFormat("fr-FR", o);
  const F_LONG = DTF({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const F_JOUR = DTF({ day: "numeric", month: "long", year: "numeric" });
  const F_JM = DTF({ day: "numeric", month: "long" });
  const F_COURT = DTF({ day: "numeric", month: "short" });
  const F_MOIS = DTF({ month: "long", year: "numeric" });
  const F_MOIS_C = DTF({ month: "short" });
  const F_SEM_C = DTF({ weekday: "short" });
  const F_STAMP = DTF({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtLong = (iso) => cap(premier(F_LONG.format(versDate(iso))));
  const fmtJour = (iso) => premier(F_JOUR.format(versDate(iso)));
  const fmtJM = (iso) => premier(F_JM.format(versDate(iso)));
  const fmtCourt = (iso) => premier(F_COURT.format(versDate(iso)));
  const fmtMois = (cle) => F_MOIS.format(versDate(cle + "-01"));
  const fmtMoisC = (cle) => F_MOIS_C.format(versDate(cle + "-01")).replace(".", "");
  const fmtStamp = (ms) => (ms ? F_STAMP.format(new Date(ms)) : "");
  const fmtHeure = (h) => { if (!h) return ""; const [H, M] = String(h).split(":"); return `${Number(H)} h${M && M !== "00" ? " " + M : ""}`; };
  const relCourt = (iso) => { const n = joursEntre(aujourdhui(), iso); if (n === 0) return "Aujourd’hui"; if (n === 1) return "Demain"; if (n === -1) return "Hier"; return n > 0 ? `Dans ${n} j` : `Il y a ${-n} j`; };
  const relLong = (iso) => { const n = joursEntre(aujourdhui(), iso); if (n === 0) return "aujourd’hui"; if (n === 1) return "demain"; if (n === -1) return "hier"; return n > 0 ? `dans ${n} jours` : `il y a ${-n} jours`; };
  const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const bissextile = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const joursDuMois = (m, y) => (m === 2 ? (y ? (bissextile(y) ? 29 : 28) : 29) : [4, 6, 9, 11].includes(m) ? 30 : 31);

  /* Téléphones (Côte d’Ivoire : 10 chiffres) */
  function telChiffres(t) {
    let d = String(t || "").trim();
    if (!d) return "";
    const plus = d.startsWith("+");
    d = d.replace(/\D/g, "");
    if (!plus && d.startsWith("00")) d = d.slice(2);
    else if (!plus && d.length === 10) d = "225" + d;
    return d.length >= 8 ? d : "";
  }
  function telAffiche(t) {
    const brut = String(t || "").trim();
    const d = brut.replace(/\D/g, "");
    if (/^\d{10}$/.test(d) && !brut.startsWith("+")) return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    if (/^225\d{10}$/.test(d)) return "+225 " + d.slice(3).replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    return brut;
  }
  const lienWa = (tel, texte) => { const d = telChiffres(tel); const q = texte ? `?text=${encodeURIComponent(texte)}` : ""; return d ? `https://wa.me/${d}${q}` : `https://wa.me/${q}`; };

  /* Montants en lettres (usage des reçus) */
  const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const DIZ = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  function moinsDeCent(n, final) {
    if (n < 20) return U[n];
    const d = Math.floor(n / 10), u = n % 10;
    if (d === 7 || d === 9) { if (d === 7 && u === 1) return "soixante et onze"; return DIZ[d] + "-" + U[10 + u]; }
    if (u === 0) return d === 8 ? (final ? "quatre-vingts" : "quatre-vingt") : DIZ[d];
    if (u === 1 && d !== 8) return DIZ[d] + " et un";
    return DIZ[d] + "-" + U[u];
  }
  function moinsDeMille(n, final) {
    const c = Math.floor(n / 100), r = n % 100;
    let s = "";
    if (c > 0) s = c === 1 ? "cent" : U[c] + " cent" + (r === 0 && final ? "s" : "");
    if (r > 0) s += (s ? " " : "") + moinsDeCent(r, final);
    return s;
  }
  function enLettres(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return "zéro";
    const mds = Math.floor(n / 1e9), mns = Math.floor((n % 1e9) / 1e6), mil = Math.floor((n % 1e6) / 1000), reste = n % 1000;
    const p = [];
    if (mds) p.push(moinsDeMille(mds, true) + " milliard" + (mds > 1 ? "s" : ""));
    if (mns) p.push(moinsDeMille(mns, true) + " million" + (mns > 1 ? "s" : ""));
    if (mil) p.push(mil === 1 ? "mille" : moinsDeMille(mil, false) + " mille");
    if (reste) p.push(moinsDeMille(reste, true));
    return p.join(" ");
  }

  /* ════════════════════════ Référentiels ════════════════════════ */
  const DEFAUTS = {
    nomCourt: "S.D.E.",
    nomOfficiel: "Mouvement Prophético-Apostolique Soldats de l’Éternel",
    sousTitre: "Gestion du mouvement",
    devise: "Réveiller · Restaurer · Former · Équiper · Envoyer",
    ville: "Abidjan",
    poles: ["Pôle 1 · Réveil, Évangélisation & Missions", "Pôle 2 · Impact Social & Humanitaire", "Pôle 3 · Logistique", "Pôle 4 · Communication, Médias & Digital", "Pôle 5 · Formation & Développement Intégral"],
    statuts: ["Visiteur", "Nouveau venu", "Membre", "Membre engagé"],
    categoriesEntree: ["Dîmes", "Offrandes", "Dons", "Cotisations", "Ventes (livres et supports)", "Inscriptions aux formations", "Autres entrées"],
    categoriesSortie: ["Loyer et charges", "Transport", "Logistique et matériel", "Communication et médias", "Action sociale", "Missions et évangélisation", "Prestations et honoraires", "Autres sorties"],
    moyens: ["Espèces", "Orange Money", "MTN MoMo", "Moov Money", "Wave", "Virement bancaire", "Chèque"],
    typesEvenement: ["Culte", "Prière et intercession", "Formation", "Réunion", "Conférence", "Évangélisation", "Autre"],
    instances: ["Directoire", "Collège doctrinal", "Secrétariat général", "Réunion des responsables", "Pôle", "Autre"],
    soldeInitial: { montant: 0, mois: null },
    cotisationMensuelle: 0,
    cotisationDebut: null,
    carteAnnee: null,
    signataire: "Jérémy Octave GLAZAÏ",
    signataireTitre: "Leader du Mouvement",
    messageAnniv: "Joyeux anniversaire, {prenom} ! Toute la famille {mouvement} rend grâce à Dieu pour ta vie. {verset} Que cette nouvelle année soit remplie de Sa présence et de Sa faveur.",
  };
  const SITUATIONS = ["Célibataire", "Marié(e)", "Veuf ou veuve", "Divorcé(e)"];
  const ETATS = ["À faire", "En cours", "Fait", "Abandonné"];
  const MOTIFS_DISC = ["Absences répétées non justifiées", "Retards répétés", "Comportement", "Manquement à une responsabilité", "Autre"];
  const MESURES_DISC = ["Rappel à l’ordre", "Avertissement", "Mise en observation", "Suspension de responsabilité", "Autre"];
  const PERIODES = [["3m", "3 mois"], ["6m", "6 mois"], ["an", "Cette année"], ["tout", "Tout"]];
  const MOIS_INI = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const MOIS_ABR = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  const LIB_QR = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  const LIB_ZIP = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  const VERSETS = {
    membres: ["Connais bien chacune de tes brebis, donne tes soins à tes troupeaux.", "Proverbes 27.23"],
    finances: ["Nous recherchons ce qui est bien, non seulement devant le Seigneur, mais aussi devant les hommes.", "2 Corinthiens 8.21"],
    agenda: ["N’abandonnons pas notre assemblée, comme c’est la coutume de quelques-uns ; mais exhortons-nous réciproquement.", "Hébreux 10.25"],
    secretariat: ["Écris la prophétie : grave-la sur des tables, afin qu’on la lise couramment.", "Habacuc 2.2"],
  };
  const VERSETS_ANNIV = [
    "« Que l’Éternel te bénisse, et qu’il te garde ! Que l’Éternel fasse luire sa face sur toi, et qu’il t’accorde sa grâce ! » (Nombres 6.24-25)",
    "« Enseigne-nous à bien compter nos jours, afin que nous appliquions notre cœur à la sagesse. » (Psaume 90.12)",
    "« Car je connais les projets que j’ai formés sur vous, dit l’Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l’espérance. » (Jérémie 29.11)",
    "« Qu’il te donne ce que ton cœur désire, et qu’il accomplisse tous tes desseins ! » (Psaume 20.5)",
    "« C’est par moi que tes jours se multiplieront, et que les années de ta vie augmenteront. » (Proverbes 9.11)",
  ];
  const ONGLETS = [
    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement" },
    { id: "membres", ico: "i-users", court: "Membres", long: "Registre des membres" },
    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances" },
    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences" },
    { id: "secretariat", ico: "i-scroll", court: "Décisions", long: "Secrétariat" },
  ];

  /* ════════════════════════ État ════════════════════════ */
  const S = {
    db: null, user: null, dl: null,
    etat: "connexion",
    me: { id: null, name: "" }, peutEcrire: null, estAdmin: false, estProprio: false,
    attente: 0, enLigne: navigator.onLine !== false, caches: {},
    cfgDoc: null,
    membres: [], evenements: [], decisions: [], moisDocs: {}, ops: {}, opsPret: {}, cotisations: {}, discipline: [], assets: null,
    pret: { config: false, membres: false, evenements: false, decisions: false, finances: false, cotisations: false, discipline: false },
    fvue: "journal", annee: new Date().getFullYear(), carte: null,
    noms: {},
    vue: "accueil",
    sous: { membres: "tous", agenda: "avenir", secretariat: "encours", finances: "toutes" },
    f: { membres: { q: "", pole: "", statut: "" }, finances: { q: "" }, agenda: { q: "", type: "" }, secretariat: { q: "" }, pointage: { q: "", seuls: false }, assiduite: { periode: "3m", type: "" }, cotis: { q: "", filtre: "tous" }, discipline: { statut: "encours" } },
    mois: moisCourant(),
    limite: 80,
    pt: nouveauPointage(null),
  };
  function nouveauPointage(id) { return { id, attente: {}, vol: {}, compteurs: {}, volC: {}, timer: 0, envoi: false, final: false }; }

  function cfg() {
    const d = S.cfgDoc || {};
    const o = { ...DEFAUTS };
    for (const k of Object.keys(DEFAUTS)) {
      const v = d[k];
      if (v === undefined || v === null) continue;
      if (Array.isArray(DEFAUTS[k]) && (!Array.isArray(v) || !v.length)) continue;
      if (typeof DEFAUTS[k] === "string" && typeof v !== "string") continue;
      o[k] = v;
    }
    return o;
  }
  const accesRegistre = () => S.peutEcrire !== false && S.etat !== "absent";
  const accesFinances = () => S.estAdmin || S.estProprio || (S.user === null && !!S.db);
  const accesDirection = () => accesFinances();
  const peutEcrire = () => !!S.db && S.peutEcrire !== false && S.etat === "pret";
  const peutAdmin = () => !!S.db && (S.estAdmin || S.estProprio) && S.etat === "pret";
  const ongletsVisibles = () => ONGLETS.filter((o) => (o.id === "membres" || o.id === "secretariat" ? accesRegistre() : o.id === "finances" ? accesFinances() || (S.etat === "connexion" && S.vue === "finances") : true));

  /* Membres */
  const nomComplet = (m) => (m ? [String(m.nom || "").toUpperCase(), m.prenoms || ""].filter(Boolean).join(" ").trim() || "Sans nom" : "");
  const nomUsuel = (m) => (m ? [m.prenoms || "", String(m.nom || "").toUpperCase()].filter(Boolean).join(" ").trim() : "");
  const prenomUsuel = (m) => String(m.prenoms || "").trim().split(/\s+/)[0] || cap(String(m.nom || "").toLowerCase());
  const initiales = (m) => ((String(m.prenoms || "").trim()[0] || "") + (String(m.nom || "").trim()[0] || "")).toUpperCase() || "?";
  const avatar = (m, lg) => (m.photoId
    ? `<img class="av photo${lg ? " lg" : ""}" src="/_blob/${esc(m.photoId)}" alt="" loading="lazy" data-ini="${esc(initiales(m))}" data-av="a${1 + (hash(m.id || m.nom) % 6)}">`
    : `<span class="av a${1 + (hash(m.id || m.nom) % 6)}${lg ? " lg" : ""}" aria-hidden="true">${esc(initiales(m))}</span>`);
  const poleCourt = (p) => (p ? String(p).split(" · ")[0] : "");
  const parNom = (a, b) => cmpFr(a.nom || "", b.nom || "") || cmpFr(a.prenoms || "", b.prenoms || "");
  let cacheActifs = { src: null, val: [] };
  function membresActifs() {
    if (cacheActifs.src !== S.membres) cacheActifs = { src: S.membres, val: S.membres.filter((m) => m.actif !== false).sort(parNom) };
    return cacheActifs.val;
  }
  const membre = (id) => S.membres.find((m) => m.id === id) || null;
  function prochainMatricule() {
    let max = 0, pref = "SDE-", larg = 4;
    for (const m of S.membres) {
      const r = /^(.*?)(\d+)$/.exec(String(m.matricule || "").trim());
      if (r && Number(r[2]) > max) { max = Number(r[2]); pref = r[1]; larg = r[2].length; }
    }
    return pref + String(max + 1).padStart(larg, "0");
  }
  const baptiseLib = (m) => (m.baptise === "Oui" ? (m.sexe === "F" ? "Baptisée" : m.sexe === "H" ? "Baptisé" : "Baptisé(e)") : m.baptise === "Non" ? (m.sexe === "F" ? "Non baptisée" : m.sexe === "H" ? "Non baptisé" : "Non baptisé(e)") : "");
  function prochainAnniv(m, ref = aujourdhui()) {
    if (!m.anniv || !/^\d{2}-\d{2}$/.test(m.anniv)) return null;
    const [mm, dd] = m.anniv.split("-").map(Number);
    const r = versDate(ref);
    const le = (y) => new Date(y, mm - 1, mm === 2 && dd === 29 && !bissextile(y) ? 28 : dd);
    let y = r.getFullYear(), d = le(y);
    if (d < r) { y += 1; d = le(y); }
    return { date: isoJour(d), dans: Math.round((d - r) / 864e5), age: m.annee ? y - Number(m.annee) : null };
  }
  function versetAnniv(m) { return VERSETS_ANNIV[hash((m.id || "") + new Date().getFullYear()) % VERSETS_ANNIV.length]; }
  function messageAnniv(m) {
    const c = cfg();
    return String(c.messageAnniv || DEFAUTS.messageAnniv)
      .replace(/\{prenom\}/g, prenomUsuel(m))
      .replace(/\{mouvement\}/g, c.nomCourt)
      .replace(/\{verset\}/g, versetAnniv(m))
      .replace(/\s+\n/g, "\n").trim();
  }

  /* Rassemblements */
  const evt = (id) => S.evenements.find((e) => e.id === id) || null;
  function presentsEffectifs(e) {
    const base = { ...(e.presents || {}) };
    if (S.pt.id === e.id) Object.assign(base, S.pt.vol, S.pt.attente);
    return base;
  }
  const estPresent = (v) => v === true || v === "retard";
  const nbPresents = (e) => Object.values(presentsEffectifs(e)).filter(estPresent).length;
  const nbEtat = (e, etat) => Object.values(presentsEffectifs(e)).filter((v) => v === etat).length;
  const estPointe = (e) => Object.values(presentsEffectifs(e)).some((v) => v === true || v === "retard" || v === "excuse");
  function compteur(e, k) {
    if (S.pt.id === e.id) {
      if (S.pt.compteurs[k] !== undefined) return S.pt.compteurs[k];
      if (S.pt.volC[k] !== undefined) return S.pt.volC[k];
    }
    return Number(e[k]) || 0;
  }
  const totalPresence = (e) => nbPresents(e) + compteur(e, "visiteurs") + compteur(e, "nouveaux");
  const aVenir = () => S.evenements.filter((e) => e.date >= aujourdhui()).sort((a, b) => cmpFr(a.date + (a.heure || ""), b.date + (b.heure || "")));
  const passes = () => S.evenements.filter((e) => e.date < aujourdhui()).sort((a, b) => cmpFr(b.date + (b.heure || ""), a.date + (a.heure || "")));
  function evenementsPointes() {
    return S.evenements.filter((e) => e.date <= aujourdhui() && estPointe(e)).sort((a, b) => cmpFr(b.date + (b.heure || ""), a.date + (a.heure || "")));
  }
  function suiviPastoral() {
    const pts = evenementsPointes();
    if (pts.length < 3) return { pret: false, liste: [], n: pts.length };
    const depuis = pts[2].date;
    const liste = membresActifs().filter((m) => {
      const evs = pts.filter((e) => !m.adhesion || e.date >= m.adhesion).slice(0, 3);
      if (evs.length < 3) return false;
      const vals = evs.map((e) => presentsEffectifs(e)[m.id]);
      return !vals.some(estPresent) && !vals.every((v) => v === "excuse");
    });
    return { pret: true, liste, depuis };
  }

  /* Décisions */
  const enCours = (d) => d.etat === "À faire" || d.etat === "En cours" || !d.etat;
  const enRetard = (d) => enCours(d) && d.echeance && d.echeance < aujourdhui();
  const decision = (id) => S.decisions.find((d) => d.id === id) || null;

  /* Finances */
  function totauxOps(cle) {
    let e = 0, s = 0, n = 0;
    for (const o of S.ops[cle] || []) {
      if (o.annule) continue;
      n += 1;
      if (o.sens === "E") e += Number(o.montant) || 0; else s += Number(o.montant) || 0;
    }
    return { e, s, n };
  }
  function totauxMois(cle) {
    if (S.opsPret[cle]) return totauxOps(cle);
    const d = S.moisDocs[cle];
    return d ? { e: Number(d.entrees) || 0, s: Number(d.sorties) || 0, n: Number(d.nb) || 0 } : { e: 0, s: 0, n: 0 };
  }
  function soldeFin(cle) {
    const si = cfg().soldeInitial || {};
    const debut = si.mois || "0000-00";
    if (cle < debut) return null;
    let s = Number(si.montant) || 0;
    const cles = new Set([...Object.keys(S.moisDocs), ...Object.keys(S.ops).filter((k) => S.opsPret[k])]);
    for (const k of cles) if (k >= debut && k <= cle) { const t = totauxMois(k); s += t.e - t.s; }
    return s;
  }
  const moisClos = (cle) => !!(S.moisDocs[cle] && S.moisDocs[cle].cloture);
  const opDe = (cle, id) => (S.ops[cle] || []).find((o) => o.id === id) || null;
  const categoriesDe = (sens) => (sens === "S" ? cfg().categoriesSortie : cfg().categoriesEntree);

  /* Noms des personnes qui saisissent (résolus par la plateforme, jamais stockés) */
  const nomsAttente = new Set();
  let nomsTimer = 0;
  function nomDe(id) {
    if (!id) return "";
    if (Object.prototype.hasOwnProperty.call(S.noms, id)) return S.noms[id] || "un responsable";
    nomsAttente.add(id);
    if (!nomsTimer) nomsTimer = setTimeout(resoudreNoms, 0);
    return "…";
  }
  async function resoudreNoms() {
    nomsTimer = 0;
    const ids = [...nomsAttente];
    nomsAttente.clear();
    if (!ids.length) return;
    let ps = {};
    if (S.user) { try { ps = await S.user.profiles(ids); } catch (e) { ps = {}; } }
    for (const id of ids) S.noms[id] = (ps[id] && ps[id].name) || "";
    render();
  }

  /* ════════════════════════ Connexion aux données ════════════════════════ */
  const abos = [];
  const subsMois = new Map();
  let reabo = 0;

  function noteCache(cle, meta) { S.caches[cle] = !!(meta && meta.fromCache); }
  function erreurAbo(e) {
    const code = e && e.code;
    if (code === "revoked") { S.etat = "revoque"; render(); return; }
    if (code === "unavailable" && !reabo) {
      reabo = setTimeout(() => { reabo = 0; desabonner(); abonner(); }, 3000);
      return;
    }
    if (code === "resource_exhausted") toast("Trop de demandes en même temps : rechargez la page dans un instant.", "err");
  }
  function desabonner() {
    while (abos.length) { try { abos.pop()(); } catch (e) { /* déjà fermé */ } }
    for (const [, u] of subsMois) { try { u(); } catch (e) { /* déjà fermé */ } }
    subsMois.clear();
  }
  function abonner() {
    const db = S.db;
    if (!db) return;
    abos.push(db.doc("config/general").onSnapshot((s) => {
      S.cfgDoc = s.exists ? s.data() : null; S.pret.config = true; noteCache("config", s.metadata); render();
    }, erreurAbo));
    abos.push(db.collection("evenements").orderBy("date", "desc").limit(400).onSnapshot((q) => {
      S.evenements = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.evenements = true; noteCache("evenements", q.metadata); render();
    }, erreurAbo));
    if (accesRegistre()) {
      abos.push(db.collection("membres").onSnapshot((q) => {
        S.membres = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.membres = true; noteCache("membres", q.metadata); render();
      }, erreurAbo));
      abos.push(db.collection("decisions").orderBy("date", "desc").limit(500).onSnapshot((q) => {
        S.decisions = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.decisions = true; noteCache("decisions", q.metadata); render();
      }, erreurAbo));
    } else { S.pret.membres = true; S.pret.decisions = true; }
    if (accesFinances()) {
      abos.push(db.collection("finances").onSnapshot((q) => {
        const o = {}; q.docs.forEach((d) => { o[d.id] = { id: d.id, ...d.data() }; });
        S.moisDocs = o; S.pret.finances = true; noteCache("finances", q.metadata); render();
      }, erreurAbo));
      abos.push(db.collection("cotisations").onSnapshot((q) => {
        const o = {}; q.docs.forEach((d) => { o[d.id] = { id: d.id, ...d.data() }; });
        S.cotisations = o; S.pret.cotisations = true; noteCache("cotisations", q.metadata); render();
      }, erreurAbo));
      abos.push(db.collection("discipline").orderBy("date", "desc").limit(500).onSnapshot((q) => {
        S.discipline = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.discipline = true; noteCache("discipline", q.metadata); render();
      }, erreurAbo));
      abonnerMois(moisCourant());
      if (S.mois !== moisCourant()) abonnerMois(S.mois);
    } else { S.pret.finances = true; S.pret.cotisations = true; S.pret.discipline = true; }
  }
  function abonnerMois(cle) {
    if (!S.db || !accesFinances() || subsMois.has(cle)) return;
    const u = S.db.collection(`finances/${cle}/ops`).onSnapshot((q) => {
      S.ops[cle] = q.docs.map((d) => ({ id: d.id, mois: cle, ...d.data() })); S.opsPret[cle] = true; noteCache("ops-" + cle, q.metadata); render();
    }, erreurAbo);
    subsMois.set(cle, u);
    const garder = new Set([moisCourant(), cle, S.mois]);
    for (const [k, un] of subsMois) {
      if (garder.has(k)) continue;
      try { un(); } catch (e) { /* déjà fermé */ }
      subsMois.delete(k); delete S.ops[k]; delete S.opsPret[k]; delete S.caches["ops-" + k];
    }
  }

  /* Écritures */
  function messageErreur(e) {
    const code = e && e.code;
    if (code === "invalid_argument") return "Enregistrement refusé : votre niveau d’accès ne permet pas cette modification, ou une donnée est invalide.";
    if (code === "quota_exceeded") return "La base de données est pleine. Archivez ou supprimez d’anciennes données avant d’en ajouter.";
    if (code === "resource_exhausted") return "Trop d’enregistrements en peu de temps. Patientez quelques secondes puis réessayez.";
    if (code === "revoked") return "Votre accès a changé. Rechargez la page.";
    return "L’enregistrement a échoué. Vérifiez la connexion puis réessayez.";
  }
  async function ecrire(fn, ok) {
    if (!S.db) { toast("Les données ne sont pas disponibles dans cette vue.", "err"); return false; }
    S.attente += 1; majSync();
    try {
      try { await fn(); }
      catch (e) {
        if (!e || e.code !== "unavailable") throw e;
        await sleep(400 + Math.random() * 700);
        await fn();
      }
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast(messageErreur(e), "err");
      if (e && e.code === "invalid_argument" && S.peutEcrire === null && !S.estAdmin) { S.peutEcrire = false; render(); }
      if (e && e.code === "revoked") { S.etat = "revoque"; render(); }
      return false;
    } finally { S.attente -= 1; majSync(); }
  }
  const files = new Map();
  function enFile(cle, fn) {
    const p = (files.get(cle) || Promise.resolve()).catch(() => {}).then(fn);
    files.set(cle, p);
    p.finally(() => { if (files.get(cle) === p) files.delete(cle); }).catch(() => {});
    return p;
  }
  const creation = () => ({ creePar: S.me.id || null, creeLe: Date.now(), modifiePar: S.me.id || null, modifieLe: Date.now() });
  const tampon = () => ({ modifiePar: S.me.id || null, modifieLe: Date.now() });

  async function recalcMois(cle, extra) {
    return enFile("mois:" + cle, async () => {
      const q = await S.db.collection(`finances/${cle}/ops`).get();
      let e = 0, s = 0, n = 0;
      q.docs.forEach((d) => { const o = d.data() || {}; if (o.annule) return; n += 1; if (o.sens === "E") e += Number(o.montant) || 0; else s += Number(o.montant) || 0; });
      const ref = S.db.doc(`finances/${cle}`);
      const cur = await ref.get();
      const base = cur.exists ? { ...cur.data() } : {};
      await ref.set({ ...base, mois: cle, entrees: e, sorties: s, nb: n, calculeLe: Date.now(), ...(extra || {}) });
    });
  }

  /* ════════════════════════ Interface générale ════════════════════════ */
  function majSync() {
    const el = $("#sync"), t = $("#sync-t");
    if (!el) return;
    let cls = "", txt = "À jour";
    const cache = Object.values(S.caches).some(Boolean);
    if (S.etat === "connexion") { cls = "wait"; txt = "Connexion…"; }
    else if (S.etat === "absent") { cls = "off"; txt = "Non connecté"; }
    else if (S.etat === "revoque") { cls = "off"; txt = "Accès retiré"; }
    else if (!S.enLigne) { cls = "off"; txt = "Hors ligne"; }
    else if (S.attente > 0) { cls = "wait"; txt = "Enregistrement…"; }
    else if (cache) { cls = "wait"; txt = "Synchronisation…"; }
    el.className = "sync" + (cls ? " " + cls : "");
    el.title = txt;
    t.textContent = txt;
  }
  function toast(msg, type) {
    const box = $("#toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast" + (type === "err" ? " err" : "");
    el.setAttribute("role", type === "err" ? "alert" : "status");
    el.textContent = msg;
    box.append(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => el.remove(), type === "err" ? 6500 : 3200);
  }
  let rafId = 0;
  function render() { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; renderNow(); }); }
  function renderNow() {
    majSync();
    const c = cfg();
    $("#brand-mark").textContent = c.nomCourt;
    $("#brand-sub").textContent = c.sousTitre;
    renderBanniere();
    renderNav();
    renderMain();
    rafraichirSheet();
  }
  const dernier = { banniere: null, nav: null, main: null, sheet: null };
  function renderBanniere() {
    let html = "";
    if (S.etat === "absent") html = `<div class="banner warn"><span>Les données du mouvement s’affichent uniquement dans Claude, pour une personne connectée qui a accès à cette application.</span></div>`;
    else if (S.etat === "revoque") html = `<div class="banner danger"><span>Votre accès à ces données a changé. Rechargez la page pour continuer.</span></div>`;
    else if (!S.enLigne) html = `<div class="banner warn"><span>Connexion perdue : attendez son retour avant d’enregistrer de nouvelles données.</span></div>`;
    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda des rassemblements.</span></div>`;
    if (dernier.banniere === html) return;
    dernier.banniere = html;
    $("#banner").innerHTML = html;
  }
  function renderNav() {
    const vis = ongletsVisibles();
    if (S.etat !== "connexion" && !vis.some((o) => o.id === S.vue)) S.vue = "accueil";
    const html = vis.map((o) => `<button class="nav-btn${o.id === S.vue ? " on" : ""}" type="button" data-vue="${o.id}"${o.id === S.vue ? ' aria-current="page"' : ""}>${I(o.ico)}<span class="l-short">${o.court}</span><span class="l-long">${o.long}</span></button>`).join("");
    if (dernier.nav === html) return;
    dernier.nav = html;
    $("#nav").innerHTML = html;
  }
  const VUES = {};
  function renderMain() {
    const main = $("#main");
    const act = document.activeElement;
    const garde = act && main.contains(act) && act.id ? { id: act.id, s: act.selectionStart, e: act.selectionEnd } : null;
    const html = `<div class="view">${(VUES[S.vue] || VUES.accueil)()}</div>`;
    if (dernier.main === html) return;
    dernier.main = html;
    main.innerHTML = html;
    if (garde) {
      const el = document.getElementById(garde.id);
      if (el) { el.focus({ preventScroll: true }); try { if (garde.s != null) el.setSelectionRange(garde.s, garde.e); } catch (e) { /* champ sans sélection */ } }
    }
  }
  function allerA(v, sous) {
    if (!ongletsVisibles().some((o) => o.id === v)) v = "accueil";
    const change = v !== S.vue;
    S.vue = v;
    if (sous) S.sous[v] = sous;
    S.limite = 80;
    try { localStorage.setItem("sde-vue", v); } catch (e) { /* stockage indisponible */ }
    if (v === "finances") abonnerMois(S.mois);
    render();
    if (change) { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }
  }

  /* Petits gabarits */
  function secHead(titre, { eyebrow = "", devise = "", verset = null, actions = "" } = {}) {
    return `<div class="sec-head"><div class="sec-titles">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h1 class="sec-title">${esc(titre)}</h1>${devise ? `<p class="devise">${esc(devise)}</p>` : ""}${verset ? `<p class="verse">${esc(guill(verset[0]))}<cite>${esc(verset[1])}</cite></p>` : ""}</div>${actions ? `<div class="btn-row">${actions}</div>` : ""}</div>`;
  }
  const chargement = (t) => `<p class="loading"><i></i>${esc(t)}</p>`;
  const vide = (ico, html, actions = "", box = true) => `<div class="empty${box ? " box" : ""}">${I(ico)}<p>${html}</p>${actions ? `<div class="btn-row">${actions}</div>` : ""}</div>`;
  function carte(titre, corps, { actions = "", cls = "", pied = "" } = {}) {
    const id = "c-" + hash(titre);
    return `<section class="card ${cls}" aria-labelledby="${id}"><div class="card-h"><h2 class="card-t" id="${id}">${esc(titre)}</h2>${actions}</div>${corps}${pied ? `<div class="card-f">${pied}</div>` : ""}</section>`;
  }
  const btn = (act, label, { ico = "", cls = "btn-ghost", data = "", sm = false, attrs = "" } = {}) => `<button class="btn ${cls}${sm ? " btn-sm" : ""}" type="button" data-act="${act}"${data ? " " + data : ""}${attrs ? " " + attrs : ""}>${ico ? I(ico) : ""}${label}</button>`;
  const sousOnglets = (vue, items) => `<div class="subtabs" role="group" aria-label="Filtrer la liste">${items.map(([id, label, n]) => `<button class="subtab${S.sous[vue] === id ? " on" : ""}" type="button" data-act="sous" data-vue-cible="${vue}" data-sous="${id}" aria-pressed="${S.sous[vue] === id}">${esc(label)}${n != null ? `<span class="count">${nb(n)}</span>` : ""}</button>`).join("")}</div>`;
  const options = (liste, val, vide1) => {
    const arr = (vide1 ? [["", vide1]] : []).concat(liste.map((o) => (Array.isArray(o) ? o : [o, o])));
    if (val && !arr.some(([v]) => String(v) === String(val))) arr.push([val, val + " (ancienne valeur)"]);
    return arr.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("");
  };
  const nonConnecte = (quoi) => vide("i-lock", `${esc(quoi)} s’afficheront ici dès que l’application sera ouverte dans Claude par une personne connectée qui y a accès.`);

  /* ════════════════════════ Accueil ════════════════════════ */
  VUES.accueil = function () {
    const c = cfg();
    const h = new Date().getHours();
    const salut = h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
    const prenom = (S.me.name || "").trim().split(/\s+/)[0] || "";
    const eyebrow = `${salut}${prenom ? ", " + esc(prenom) : ""} · ${esc(fmtLong(aujourdhui()))}`;
    let out = secHead("Poste de commandement", { eyebrow, devise: c.devise }).replace('<div class="sec-head">', '<div class="sec-head crest"><span class="logo lg" aria-hidden="true"></span>');
    if (S.etat === "absent") return out + nonConnecte("Les membres, les finances, l’agenda et les décisions du mouvement");
    const cartes = [];
    if (accesFinances()) cartes.push(carteCaisse());
    if (accesRegistre()) cartes.push(carteAnniv());
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteCotis());
    if (accesRegistre()) { cartes.push(carteDecisions()); cartes.push(carteEffectif()); cartes.push(carteSuivi()); }
    return out + `<div class="grid g3">${cartes.join("")}</div>`;
  };
  function carteCaisse() {
    const cur = moisCourant();
    const act = peutAdmin() ? btn("ajout-op", "Saisir une opération", { ico: "i-plus", cls: "btn-primary", sm: true }) : "";
    if (!S.pret.finances) return carte("Caisse", chargement("Calcul des soldes…"), { cls: "hero span2", actions: act });
    const t = totauxMois(cur);
    const solde = soldeFin(cur);
    const si = cfg().soldeInitial || {};
    const mois6 = Array.from({ length: 6 }, (_, i) => ajoutMois(cur, i - 5));
    const vals = mois6.map((k) => totauxMois(k));
    const max = Math.max(1, ...vals.map((v) => Math.max(v.e, v.s)));
    const resume = mois6.map((k, i) => `${fmtMois(k)} : entrées ${fcfa(vals[i].e)}, sorties ${fcfa(vals[i].s)}`).join(" ; ");
    const cols = mois6.map((k, i) => `<div class="mini-col${k === cur ? " cur" : ""}"><div class="mini-bars"><i class="in" style="height:${((vals[i].e / max) * 100).toFixed(1)}%"></i><i class="out" style="height:${((vals[i].s / max) * 100).toFixed(1)}%"></i></div><span>${esc(fmtMoisC(k))}</span></div>`).join("");
    const corps = `<p class="eyebrow">Solde de caisse · ${esc(fmtJM(aujourdhui()))}</p>
      <p class="big-figure num">${solde == null ? "—" : esc(signe(solde).replace(/^\+/, ""))}<small>FCFA</small></p>
      ${!si.mois && !Number(si.montant) ? `<p class="hint">Calculé depuis la première opération enregistrée. Le solde de départ se règle dans les réglages.</p>` : ""}
      <div class="split"><div><span>Entrées ${esc(fmtMoisC(cur))}</span><b>${nb(t.e)}</b></div><div><span>Sorties ${esc(fmtMoisC(cur))}</span><b>${nb(t.s)}</b></div><div><span>Solde du mois</span><b>${esc(signe(t.e - t.s))}</b></div></div>
      <div class="mini" role="img" aria-label="${esc(resume)}">${cols}</div>
      <div class="legend"><span><i class="in"></i>Entrées</span><span><i class="out"></i>Sorties</span><span>Six derniers mois, en FCFA</span></div>`;
    return carte("Caisse", corps, { cls: "hero span2", actions: act, pied: `<button class="link" type="button" data-vue="finances">Ouvrir les finances</button>` });
  }
  function carteAnniv() {
    if (!S.pret.membres) return carte("Anniversaires", chargement("Lecture du registre…"));
    const liste = membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= 7).sort((x, y) => x.a.dans - y.a.dans);
    const corps = liste.length
      ? `<div class="list flat">${liste.map(({ m, a }) => `<button class="row${a.dans === 0 ? " today" : ""}" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomUsuel(m))}</span><span class="row-m">${esc(fmtJM(a.date))}${a.age ? ` · ${a.age} ans` : ""}</span></span><span class="row-r"><span class="chip ${a.dans === 0 ? "warn" : "gold"}">${a.dans === 0 ? "Aujourd’hui" : a.dans === 1 ? "Demain" : `Dans ${a.dans} j`}</span></span></button>`).join("")}</div>`
      : `<p class="hint">Aucun anniversaire dans les sept prochains jours.</p>`;
    return carte("Anniversaires", corps, { actions: `<span class="chip">7 jours</span>` });
  }
  function carteRassemblements() {
    if (!S.pret.evenements) return carte("Prochains rassemblements", chargement("Lecture de l’agenda…"));
    const prochains = aVenir().slice(0, 3);
    const act = peutEcrire() ? btn("ajout-evt", "Programmer", { ico: "i-plus", sm: true }) : "";
    const corps = prochains.length
      ? `<div class="list flat">${prochains.map(rowEvt).join("")}</div>`
      : `<p class="hint">Aucun rassemblement programmé pour l’instant.</p>`;
    return carte("Prochains rassemblements", corps, { actions: act, pied: `<button class="link" type="button" data-vue="agenda">Voir l’agenda</button>` });
  }
  function carteDecisions() {
    if (!S.pret.decisions) return carte("Décisions à suivre", chargement("Lecture du registre des décisions…"));
    const liste = S.decisions.filter(enCours).sort((a, b) => (enRetard(b) - enRetard(a)) || cmpFr(a.echeance || "9999", b.echeance || "9999") || cmpFr(b.date || "", a.date || ""));
    const retard = liste.filter(enRetard).length;
    const corps = liste.length
      ? `<div class="list flat">${liste.slice(0, 4).map(rowDec).join("")}</div>`
      : `<p class="hint">Aucune décision en cours d’exécution.</p>`;
    return carte("Décisions à suivre", corps, { actions: retard ? `<span class="chip danger">${pluriel(retard, "en retard", "en retard")}</span>` : "", pied: `<button class="link" type="button" data-vue="secretariat">Ouvrir le secrétariat</button>` });
  }
  function carteEffectif() {
    if (!S.pret.membres) return carte("Effectif", chargement("Comptage…"));
    const actifs = membresActifs();
    const cur = moisCourant();
    const nouveaux = actifs.filter((m) => (m.adhesion ? m.adhesion.slice(0, 7) === cur : m.creeLe && moisCle(new Date(m.creeLe)) === cur)).length;
    const parPole = {};
    actifs.forEach((m) => { const k = m.pole || "Sans pôle"; parPole[k] = (parPole[k] || 0) + 1; });
    const ordre = [...cfg().poles, "Sans pôle"].filter((p) => parPole[p]).concat(Object.keys(parPole).filter((p) => p !== "Sans pôle" && !cfg().poles.includes(p)));
    const max = Math.max(1, ...Object.values(parPole));
    const barres = ordre.map((p) => `<div class="bar-row"><div class="bar-top"><span>${esc(p)}</span><b>${nb(parPole[p])}</b></div><div class="bar"><i style="width:${((parPole[p] / max) * 100).toFixed(1)}%"></i></div></div>`).join("");
    const corps = actifs.length
      ? `<p class="big-figure num">${nb(actifs.length)}<small>${actifs.length > 1 ? "membres actifs" : "membre actif"}</small></p><p class="hint">${nouveaux ? `${pluriel(nouveaux, "nouvelle inscription", "nouvelles inscriptions")} ce mois-ci` : "Aucune nouvelle inscription ce mois-ci"}</p><hr class="sep"><div class="bars">${barres}</div>`
      : vide("i-users", "Le registre est vide. Ajoutez le premier membre ou importez une liste existante.", peutEcrire() ? btn("ajout-membre", "Ajouter un membre", { ico: "i-plus", cls: "btn-primary", sm: true }) + btn("import-membres", "Importer une liste", { ico: "i-up", sm: true }) : "", false);
    return carte("Effectif", corps, { pied: actifs.length ? `<button class="link" type="button" data-vue="membres">Ouvrir le registre</button>` : "" });
  }
  function carteSuivi() {
    if (!S.pret.membres || !S.pret.evenements) return carte("Suivi pastoral", chargement("Analyse des présences…"));
    const sp = suiviPastoral();
    let corps;
    if (!sp.pret) corps = `<p class="hint">Le suivi s’active après trois rassemblements pointés. ${sp.n ? `${pluriel(sp.n, "rassemblement pointé", "rassemblements pointés")} pour l’instant.` : "Aucun rassemblement pointé pour l’instant."}</p>`;
    else if (!sp.liste.length) corps = `<p class="hint">Tous les membres actifs ont participé à au moins un des trois derniers rassemblements pointés.</p>`;
    else corps = `<p class="hint">Absents des trois derniers rassemblements pointés, depuis le ${esc(fmtJM(sp.depuis))}.</p><div class="list flat" style="margin-top:10px">${sp.liste.slice(0, 5).map(rowMembre).join("")}</div>`;
    return carte("Suivi pastoral", corps, { actions: sp.pret && sp.liste.length ? `<span class="chip warn">${nb(sp.liste.length)}</span>` : "", pied: sp.pret && sp.liste.length > 5 ? `<button class="link" type="button" data-act="aller-suivi">Voir les ${nb(sp.liste.length)} membres</button>` : "" });
  }

  /* ════════════════════════ Membres ════════════════════════ */
  function rowMembre(m) {
    const meta = [m.fonction, m.eglise || m.quartier, poleCourt(m.pole)].filter(Boolean).join(" · ") || (m.telephone ? telAffiche(m.telephone) : "");
    return `<button class="row" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r">${m.statut ? `<span class="chip">${esc(m.statut)}</span>` : ""}${m.actif === false ? `<span class="chip">Archivé</span>` : ""}</span></button>`;
  }
  VUES.membres = function () {
    const c = cfg();
    const ecr = peutEcrire();
    const actions = ecr ? btn("ajout-membre", "Ajouter un membre", { ico: "i-plus", cls: "btn-primary" }) : "";
    let out = secHead("Registre des membres", { verset: VERSETS.membres, actions });
    if (S.etat === "absent") return out + nonConnecte("Les fiches des membres");
    if (!S.pret.membres) return out + chargement("Lecture du registre…");
    const actifs = membresActifs();
    const archives = S.membres.filter((m) => m.actif === false).sort(parNom);
    const sp = suiviPastoral();
    const ongM = [["tous", "Membres", actifs.length], ["anniv", "Anniversaires", null], ["suivi", "À suivre", sp.pret ? sp.liste.length : null]];
    if (accesDirection()) ongM.push(["discipline", "Discipline", S.pret.discipline ? S.discipline.filter(mesureEnCours).length : null]);
    ongM.push(["archives", "Archivés", archives.length]);
    out += sousOnglets("membres", ongM);
    if (S.sous.membres === "discipline" && !accesDirection()) S.sous.membres = "tous";
    const sous = S.sous.membres;
    if (sous === "discipline") return out + vueDiscipline();
    if (sous === "anniv") return out + listeAnniversaires(actifs);
    if (sous === "suivi") {
      if (!sp.pret) return out + vide("i-ucheck", `Le suivi pastoral s’active après <b>trois rassemblements pointés</b>. Il signale alors les membres absents des trois derniers, pour que les responsables prennent de leurs nouvelles.`, btn("vue-agenda", "Ouvrir l’agenda", { ico: "i-cal", sm: true }));
      if (!sp.liste.length) return out + vide("i-check", "Tous les membres actifs ont participé à au moins un des trois derniers rassemblements pointés.");
      return out + `<p class="note">Membres actifs absents des trois derniers rassemblements pointés, depuis le ${esc(fmtJour(sp.depuis))}. Appelez-les ou écrivez-leur pour prendre de leurs nouvelles.</p><div class="list">${sp.liste.map(rowMembre).join("")}</div>`;
    }
    const f = S.f.membres;
    out += `<div class="filters"><label class="sr" for="q-membres">Rechercher un membre</label><input class="search" id="q-membres" type="search" placeholder="Nom, matricule, téléphone, église…" value="${esc(f.q)}" data-filtre="membres.q" autocomplete="off">
      <label class="sr" for="f-pole">Pôle</label><select class="sel" id="f-pole" data-filtre="membres.pole">${options(c.poles, f.pole === "__aucun" ? "" : f.pole, "Tous les pôles")}<option value="__aucun"${f.pole === "__aucun" ? " selected" : ""}>Sans pôle</option></select>
      <label class="sr" for="f-statut">Statut</label><select class="sel" id="f-statut" data-filtre="membres.statut">${options(c.statuts, f.statut, "Tous les statuts")}</select>
      <div class="btn-row">${peutAdmin() ? btn("cartes", "Cartes", { ico: "i-card", sm: true }) : ""}${ecr ? btn("import-membres", "Importer", { ico: "i-up", sm: true }) : ""}${btn("export-membres", "Exporter", { ico: "i-down", sm: true })}</div></div>`;
    const base = sous === "archives" ? archives : actifs;
    if (!S.membres.length) return out + vide("i-users", "Le registre est vide. <b>Ajoutez le premier membre</b> ou importez une liste existante, depuis Excel, Google Sheets ou un fichier CSV.", ecr ? btn("ajout-membre", "Ajouter un membre", { ico: "i-plus", cls: "btn-primary", sm: true }) + btn("import-membres", "Importer une liste", { ico: "i-up", sm: true }) : "");
    const q = norm(f.q);
    const qTel = f.q.replace(/\D/g, "");
    const liste = base.filter((m) => {
      if (f.pole === "__aucun" ? m.pole : f.pole && m.pole !== f.pole) return false;
      if (f.statut && m.statut !== f.statut) return false;
      if (!q) return true;
      const hay = norm([m.nom, m.prenoms, m.matricule, m.eglise, m.implantation, m.quartier, m.fonction, m.departement, m.email, m.statut].join(" "));
      return q.split(" ").every((w) => hay.includes(w)) || (qTel.length >= 3 && String(m.telephone || "").replace(/\D/g, "").includes(qTel));
    });
    if (!liste.length) return out + vide("i-search", sous === "archives" ? "Aucun membre archivé ne correspond." : "Aucun membre ne correspond à cette recherche.");
    const visibles = liste.slice(0, S.limite);
    return out + `<p class="hint" style="margin:0 0 8px">${pluriel(liste.length, "fiche", "fiches")}</p><div class="list">${visibles.map(rowMembre).join("")}${liste.length > visibles.length ? `<button class="more" type="button" data-act="plus">Afficher ${nb(Math.min(80, liste.length - visibles.length))} fiches de plus</button>` : ""}</div>`;
  };
  function listeAnniversaires(actifs) {
    const avec = actifs.filter((m) => m.anniv && /^\d{2}-\d{2}$/.test(m.anniv));
    if (!avec.length) return vide("i-cake", "Aucune date de naissance n’est encore renseignée. Ajoutez-la dans la fiche de chaque membre (le jour et le mois suffisent).");
    const cur = new Date().getMonth() + 1;
    const blocs = [];
    for (let i = 0; i < 12; i += 1) {
      const m = ((cur - 1 + i) % 12) + 1;
      const du = avec.filter((x) => Number(x.anniv.slice(0, 2)) === m).sort((a, b) => cmpFr(a.anniv, b.anniv) || parNom(a, b));
      if (!du.length) continue;
      blocs.push(`<h2 class="day-h">${esc(cap(MOIS_NOMS[m - 1]))} · ${pluriel(du.length, "anniversaire", "anniversaires")}</h2><div class="list">${du.map((x) => {
        const a = prochainAnniv(x);
        const chip = a.dans === 0 ? `<span class="chip warn">Aujourd’hui</span>` : a.dans <= 7 ? `<span class="chip gold">Dans ${a.dans} j</span>` : "";
        return `<button class="row${a.dans === 0 ? " today" : ""}" type="button" data-act="voir-membre" data-id="${esc(x.id)}">${avatar(x)}<span class="row-main"><span class="row-t">${esc(nomUsuel(x))}</span><span class="row-m">${esc(fmtJM(a.date))}${a.age ? ` · ${a.age} ans` : ""}</span></span><span class="row-r">${chip}</span></button>`;
      }).join("")}</div>`);
    }
    return blocs.join("");
  }

  /* ════════════════════════ Finances ════════════════════════ */
  function rowOp(o) {
    const m = o.membreId ? membre(o.membreId) : null;
    const titre = o.libelle || o.categorie || (o.sens === "E" ? "Entrée" : "Sortie");
    const meta = [o.libelle ? o.categorie : "", o.moyen, m ? nomComplet(m) : ""].filter(Boolean).join(" · ");
    const io = o.sens === "E" ? "in" : "out";
    return `<button class="row${o.annule ? " reversed" : ""}" type="button" data-act="voir-op" data-id="${esc(o.id)}" data-mois="${esc(o.mois)}"><span class="mark-io ${o.annule ? "neutral" : io}">${I(o.sens === "E" ? "i-in" : "i-out")}</span><span class="row-main"><span class="row-t">${esc(titre)}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r"><span class="amt ${o.annule ? "" : io}">${o.sens === "E" ? "+" : "−"}${nb(o.montant)}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</span></button>`;
  }
  function barresGroupe(map, cls) {
    const ent = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!ent.length) return `<p class="hint">Rien ce mois-ci.</p>`;
    const max = Math.max(1, ...ent.map((x) => x[1]));
    return `<div class="bars">${ent.map(([k, v]) => `<div class="bar-row"><div class="bar-top"><span>${esc(k)}</span><b>${nb(v)}</b></div><div class="bar ${cls}"><i style="width:${((v / max) * 100).toFixed(1)}%"></i></div></div>`).join("")}</div>`;
  }
  VUES.finances = function () {
    const cle = S.mois;
    const cur = moisCourant();
    const adm = peutAdmin();
    const clos = moisClos(cle);
    let out = secHead("Finances", { verset: VERSETS.finances });
    if (S.etat === "absent") return out + nonConnecte("Les entrées, les sorties et les soldes de caisse");
    if (S.etat === "connexion") return out + chargement("Vérification de votre accès…");
    if (!accesFinances()) return out + `<div class="lock">${I("i-lock")}<p>Les finances sont réservées au propriétaire et aux éditeurs de l’application.</p></div>`;
    out += `<div class="seg fseg" role="group" aria-label="Vue des finances"><button type="button" class="${S.fvue === "journal" ? "on" : ""}" data-act="fvue" data-v="journal" aria-pressed="${S.fvue === "journal"}">${I("i-wallet")}Journal de caisse</button><button type="button" class="${S.fvue === "cotisations" ? "on" : ""}" data-act="fvue" data-v="cotisations" aria-pressed="${S.fvue === "cotisations"}">${I("i-users")}Cotisations</button></div>`;
    if (S.fvue === "cotisations") return out + vueCotisations();
    out += `<div class="toolbar"><div class="mnav"><button class="icon-btn" type="button" data-act="mois-prec" aria-label="Mois précédent">${I("i-left")}</button><span class="mnav-l" aria-live="polite">${esc(fmtMois(cle))}</span><button class="icon-btn" type="button" data-act="mois-suiv" aria-label="Mois suivant"${cle >= cur ? " disabled" : ""}>${I("i-right")}</button></div>
      <div class="btn-row">${adm && !clos ? btn("ajout-op", "Nouvelle opération", { ico: "i-plus", cls: "btn-primary" }) : ""}${btn("rapport-mois", `<span class="hide-s">Rapport</span>`, { ico: "i-report", cls: "btn-ghost ico-s", attrs: 'aria-label="Rapport du mois"' })}${btn("export-mois", `<span class="hide-s">Exporter</span>`, { ico: "i-down", cls: "btn-ghost ico-s", attrs: 'aria-label="Exporter le mois en CSV"' })}</div></div>`;
    if (!S.opsPret[cle]) return out + chargement(`Lecture des opérations de ${fmtMois(cle)}…`);
    const ops = (S.ops[cle] || []).slice().sort((a, b) => cmpFr(b.date || "", a.date || "") || (b.creeLe || 0) - (a.creeLe || 0));
    const t = totauxOps(cle);
    const sf = soldeFin(cle);
    const doc = S.moisDocs[cle];
    out += `<div class="stats s4">
      <div class="stat in"><span class="stat-l">${I("i-in")}Entrées</span><span class="stat-v">${nb(t.e)}<small>FCFA</small></span><span class="stat-m">${pluriel(ops.filter((o) => o.sens === "E" && !o.annule).length, "opération", "opérations")}</span></div>
      <div class="stat out"><span class="stat-l">${I("i-out")}Sorties</span><span class="stat-v">${nb(t.s)}<small>FCFA</small></span><span class="stat-m">${pluriel(ops.filter((o) => o.sens === "S" && !o.annule).length, "opération", "opérations")}</span></div>
      <div class="stat"><span class="stat-l">Solde du mois</span><span class="stat-v">${esc(signe(t.e - t.s))}<small>FCFA</small></span><span class="stat-m">Entrées moins sorties</span></div>
      <div class="stat"><span class="stat-l">Caisse en fin de mois</span><span class="stat-v">${sf == null ? "—" : esc(signe(sf).replace(/^\+/, ""))}<small>FCFA</small></span><span class="stat-m">${sf == null ? "Avant le solde de départ" : "Solde cumulé"}</span></div></div>`;
    if (clos) out += `<div class="note">${I("i-lock")} Mois clôturé le ${esc(fmtStamp(doc.clotureLe))}${doc.cloturePar ? ` par ${esc(nomDe(doc.cloturePar))}` : ""}. Ses opérations ne peuvent plus être modifiées.${S.estProprio ? ` <button class="link" type="button" data-act="rouvrir-mois">Rouvrir le mois</button>` : ""}</div>`;
    const ecart = !S.caches["ops-" + cle] && !files.has("mois:" + cle) && S.attente === 0 && ops.length && (!doc || Number(doc.entrees) !== t.e || Number(doc.sorties) !== t.s);
    if (ecart && adm) out += `<div class="note warn">Les totaux enregistrés pour ce mois ne correspondent pas au détail des opérations. <button class="link" type="button" data-act="recalc-mois">Mettre à jour les totaux</button></div>`;
    const f = S.f.finances;
    const sous = S.sous.finances;
    out += `<div class="filters"><div class="chips" role="group" aria-label="Type d’opération">${[["toutes", "Toutes"], ["E", "Entrées"], ["S", "Sorties"], ["annulees", "Annulées"]].map(([id, l]) => `<button class="chip-btn${sous === id ? " on" : ""}" type="button" data-act="sous" data-vue-cible="finances" data-sous="${id}" aria-pressed="${sous === id}">${l}</button>`).join("")}</div>
      <label class="sr" for="q-fin">Rechercher une opération</label><input class="search" id="q-fin" type="search" placeholder="Libellé, catégorie, membre, référence…" value="${esc(f.q)}" data-filtre="finances.q" autocomplete="off"></div>`;
    if (!ops.length) {
      out += vide("i-wallet", `Aucune opération en ${esc(fmtMois(cle))}. ${adm && !clos ? "Saisissez la première entrée ou sortie du mois." : ""}`, adm && !clos ? btn("ajout-op", "Nouvelle opération", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    } else {
      const q = norm(f.q);
      const filt = ops.filter((o) => {
        if (sous === "E" && (o.sens !== "E" || o.annule)) return false;
        if (sous === "S" && (o.sens !== "S" || o.annule)) return false;
        if (sous === "annulees" && !o.annule) return false;
        if (!q) return true;
        const m = o.membreId ? membre(o.membreId) : null;
        return norm([o.libelle, o.categorie, o.moyen, o.piece, m ? nomComplet(m) : "", String(o.montant)].join(" ")).includes(q);
      });
      if (!filt.length) out += vide("i-search", "Aucune opération ne correspond.");
      else {
        const parJour = [];
        filt.forEach((o) => { const last = parJour[parJour.length - 1]; if (last && last.d === o.date) last.l.push(o); else parJour.push({ d: o.date, l: [o] }); });
        out += parJour.map(({ d, l }) => `<h2 class="day-h">${esc(fmtLong(d))}</h2><div class="list">${l.map(rowOp).join("")}</div>`).join("");
      }
      const catE = {}, catS = {}, moy = {};
      ops.forEach((o) => {
        if (o.annule) return;
        const tgt = o.sens === "E" ? catE : catS;
        tgt[o.categorie || "Sans catégorie"] = (tgt[o.categorie || "Sans catégorie"] || 0) + (Number(o.montant) || 0);
        const k = o.moyen || "Non précisé";
        moy[k] = moy[k] || { e: 0, s: 0 };
        moy[k][o.sens === "E" ? "e" : "s"] += Number(o.montant) || 0;
      });
      const lignesMoy = Object.entries(moy).sort((a, b) => (b[1].e + b[1].s) - (a[1].e + a[1].s)).map(([k, v]) => `<div class="kv-l"><span>${esc(k)}</span><span class="num">${[v.e ? `<span class="amt in">+${nb(v.e)}</span>` : "", v.s ? `<span class="amt out">−${nb(v.s)}</span>` : ""].filter(Boolean).join(" · ")}</span></div>`).join("");
      out += `<h2 class="h3" style="margin-top:26px">Synthèse de ${esc(fmtMois(cle))}</h2><div class="grid g3">
        ${carte("Entrées par catégorie", barresGroupe(catE, "in"))}
        ${carte("Sorties par catégorie", barresGroupe(catS, "out"))}
        ${carte("Par moyen de paiement", `<div class="kvl">${lignesMoy || `<p class="hint">Rien ce mois-ci.</p>`}</div>`)}
      </div>`;
    }
    if (adm && !clos && cle < cur) out += `<div class="card" style="margin-top:14px"><div class="card-h"><h2 class="card-t">Clôture du mois</h2></div><p class="hint">Une fois le mois vérifié et le rapport transmis, clôturez-le : ses opérations ne pourront plus être modifiées.</p><div class="actions">${btn("cloturer-mois", `Clôturer ${esc(fmtMois(cle))}`, { ico: "i-lock" })}</div></div>`;
    return out;
  };

  /* ════════════════════════ Agenda ════════════════════════ */
  function rowEvt(e) {
    const d = versDate(e.date);
    const today = e.date === aujourdhui();
    const passe = e.date < aujourdhui();
    const tot = totalPresence(e);
    const meta = [e.type, fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · ");
    const chip = passe ? (tot ? `<span class="chip ok">${pluriel(tot, "présent", "présents")}</span>` : `<span class="chip">Non pointé</span>`) : today ? `<span class="chip warn">Aujourd’hui</span>` : `<span class="chip gold">${esc(relCourt(e.date))}</span>`;
    return `<button class="row${today ? " today" : ""}" type="button" data-act="voir-evt" data-id="${esc(e.id)}"><span class="datebox${today ? " today" : ""}" aria-hidden="true"><span>${esc(F_SEM_C.format(d).replace(".", ""))}</span><b>${d.getDate()}</b><small>${esc(F_MOIS_C.format(d).replace(".", ""))}</small></span><span class="row-main"><span class="row-t">${esc(e.titre || "Rassemblement")}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r">${chip}</span></button>`;
  }
  VUES.agenda = function () {
    const c = cfg();
    const ecr = peutEcrire();
    let out = secHead("Agenda et présences", { verset: VERSETS.agenda, actions: ecr ? btn("ajout-evt", "Nouveau rassemblement", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les cultes, réunions, formations et conférences");
    if (!S.pret.evenements) return out + chargement("Lecture de l’agenda…");
    const av = aVenir(), pa = passes();
    out += sousOnglets("agenda", [["avenir", "À venir", av.length], ["passes", "Passés", pa.length], ["assiduite", "Assiduité", null]]);
    if (S.sous.agenda === "assiduite") return out + (accesRegistre() ? vueAssiduite() : vide("i-lock", "L’assiduité des membres est réservée aux responsables qui ont accès au registre."));
    const f = S.f.agenda;
    out += `<div class="filters"><label class="sr" for="q-agenda">Rechercher un rassemblement</label><input class="search" id="q-agenda" type="search" placeholder="Titre, lieu, responsable…" value="${esc(f.q)}" data-filtre="agenda.q" autocomplete="off"><label class="sr" for="f-type">Type</label><select class="sel" id="f-type" data-filtre="agenda.type">${options(c.typesEvenement, f.type, "Tous les types")}</select></div>`;
    const base = S.sous.agenda === "passes" ? pa : av;
    const q = norm(f.q);
    const liste = base.filter((e) => (!f.type || e.type === f.type) && (!q || norm([e.titre, e.lieu, e.responsable, e.description, e.type].join(" ")).includes(q)));
    if (!liste.length) {
      if (!base.length && S.sous.agenda === "avenir") return out + vide("i-cal", "Aucun rassemblement à venir. Programmez le prochain culte, la prochaine réunion ou la prochaine formation.", ecr ? btn("ajout-evt", "Nouveau rassemblement", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
      return out + vide("i-search", base.length ? "Aucun rassemblement ne correspond." : "Aucun rassemblement passé n’est enregistré.");
    }
    const groupes = [];
    liste.slice(0, S.limite).forEach((e) => { const k = e.date.slice(0, 7); const g = groupes[groupes.length - 1]; if (g && g.k === k) g.l.push(e); else groupes.push({ k, l: [e] }); });
    out += groupes.map((g) => `<h2 class="day-h">${esc(cap(fmtMois(g.k)))}</h2><div class="list">${g.l.map(rowEvt).join("")}</div>`).join("");
    if (liste.length > S.limite) out += `<div class="list" style="margin-top:10px"><button class="more" type="button" data-act="plus">Afficher plus de rassemblements</button></div>`;
    return out;
  };

  /* ════════════════════════ Secrétariat ════════════════════════ */
  function chipEtat(d) {
    const cls = d.etat === "Fait" ? "ok" : d.etat === "Abandonné" ? "" : d.etat === "En cours" ? "info" : "warn";
    return `<span class="chip ${cls}">${esc(d.etat || "À faire")}</span>`;
  }
  function rowDec(d) {
    const meta = [d.instance, d.date ? "décidé le " + fmtCourt(d.date) : "", d.responsable ? "resp. " + d.responsable : "", d.echeance ? "échéance " + fmtCourt(d.echeance) : ""].filter(Boolean).join(" · ");
    const retard = enRetard(d) ? `<span class="chip danger">Retard ${joursEntre(d.echeance, aujourdhui())} j</span>` : "";
    return `<button class="row nolead" type="button" data-act="voir-dec" data-id="${esc(d.id)}"><span class="row-main"><span class="row-t">${esc(d.intitule || "Décision")}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r">${chipEtat(d)}${retard}</span></button>`;
  }
  VUES.secretariat = function () {
    const ecr = peutEcrire();
    let out = secHead("Secrétariat", { eyebrow: "Registre des décisions et suivi des actions", verset: VERSETS.secretariat, actions: ecr ? btn("ajout-dec", "Nouvelle décision", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les décisions et leur suivi");
    if (!S.pret.decisions) return out + chargement("Lecture du registre…");
    const enC = S.decisions.filter(enCours), ret = S.decisions.filter(enRetard), finies = S.decisions.filter((d) => !enCours(d));
    out += sousOnglets("secretariat", [["encours", "En cours", enC.length], ["retard", "En retard", ret.length], ["terminees", "Terminées", finies.length]]);
    out += `<div class="filters"><label class="sr" for="q-dec">Rechercher une décision</label><input class="search" id="q-dec" type="search" placeholder="Décision, responsable, instance…" value="${esc(S.f.secretariat.q)}" data-filtre="secretariat.q" autocomplete="off"></div>`;
    if (!S.decisions.length) return out + vide("i-scroll", "Aucune décision enregistrée. Notez ici chaque décision prise en réunion, la personne chargée de l’exécuter et l’échéance : le tableau de bord signalera les retards.", ecr ? btn("ajout-dec", "Nouvelle décision", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const base = S.sous.secretariat === "retard" ? ret : S.sous.secretariat === "terminees" ? finies : enC;
    const q = norm(S.f.secretariat.q);
    const liste = base.filter((d) => !q || norm([d.intitule, d.action, d.responsable, d.instance, d.notes].join(" ")).includes(q))
      .sort((a, b) => (S.sous.secretariat === "terminees" ? cmpFr(b.date || "", a.date || "") : cmpFr(a.echeance || "9999", b.echeance || "9999") || cmpFr(b.date || "", a.date || "")));
    if (!liste.length) return out + vide(S.sous.secretariat === "retard" ? "i-check" : "i-search", S.sous.secretariat === "retard" && !q ? "Aucune décision en retard." : "Aucune décision ne correspond.");
    return out + `<div class="list">${liste.slice(0, S.limite).map(rowDec).join("")}${liste.length > S.limite ? `<button class="more" type="button" data-act="plus">Afficher plus de décisions</button>` : ""}</div>`;
  };

  /* ════════════════════════ Feuilles (dialogues) ════════════════════════ */
  const SH = { refresh: null, onSubmit: null, retour: null, formulaire: false };
  function ouvrir({ titre, html = "", refresh = null, onSubmit = null, wide = false, apres = null }) {
    const sheet = $("#sheet");
    if (sheet.hidden) SH.retour = document.activeElement;
    SH.refresh = refresh; SH.onSubmit = onSubmit; SH.formulaire = !!onSubmit;
    sheet.className = "sheet" + (wide ? " wide" : "");
    const corps = refresh ? refresh() : html;
    if (corps === null) { fermer(); return; }
    dernier.sheet = corps;
    sheet.innerHTML = `<div class="sheet-h"><h2 class="sheet-t" id="sheet-title">${esc(titre)}</h2><button class="icon-btn" type="button" data-act="fermer" aria-label="Fermer">${I("i-x")}</button></div><div class="sheet-b" id="sheet-b">${corps}</div>`;
    sheet.hidden = false;
    $("#scrim").hidden = false;
    document.body.classList.add("locked");
    if (apres) apres(sheet);
    const cible = (fin && sheet.querySelector(".sheet-b [autofocus]")) || sheet.querySelector("[data-act=fermer]");
    if (cible) cible.focus({ preventScroll: true });
  }
  function fermer() {
    const sheet = $("#sheet");
    if (sheet.hidden) return;
    if (S.pt.id) envoyerPointage(S.pt, true);
    sheet.hidden = true;
    sheet.innerHTML = "";
    $("#scrim").hidden = true;
    document.body.classList.remove("locked");
    SH.refresh = null; SH.onSubmit = null; SH.formulaire = false;
    const r = SH.retour; SH.retour = null;
    if (r && document.contains(r)) r.focus({ preventScroll: true });
  }
  function rafraichirSheet() {
    if (!SH.refresh || $("#sheet").hidden) return;
    const b = $("#sheet-b");
    const html = SH.refresh();
    if (html === null) { fermer(); return; }
    if (dernier.sheet === html) return;
    dernier.sheet = html;
    const act = document.activeElement;
    const garde = act && b.contains(act) ? { id: act.id, s: act.selectionStart, e: act.selectionEnd, mid: act.dataset && act.dataset.mid, etat: act.dataset && act.dataset.etat } : null;
    const st = b.scrollTop;
    b.innerHTML = html;
    b.scrollTop = st;
    if (garde) {
      const el = garde.id ? document.getElementById(garde.id) : garde.mid ? b.querySelector(`[data-mid="${CSS.escape(garde.mid)}"]${garde.etat ? `[data-etat="${CSS.escape(garde.etat)}"]` : ":not([data-etat])"}`) : null;
      if (el) { el.focus({ preventScroll: true }); try { if (garde.s != null) el.setSelectionRange(garde.s, garde.e); } catch (e) { /* bouton */ } }
    }
  }
  /* Une fiche ouverte juste après un enregistrement peut précéder l’arrivée des données : on patiente. */
  function surveiller(fn) {
    let vu = false;
    const debut = Date.now();
    return () => {
      const h = fn();
      if (h !== null) { vu = true; return h; }
      if (vu || Date.now() - debut > 10000) return null;
      setTimeout(render, 400);
      return chargement("Enregistrement en cours…");
    };
  }
  const champ = (id, label, inner, { req = false, hint = "", cls = "" } = {}) => `<div class="field${cls ? " " + cls : ""}"><label for="${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>${inner}${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  const inp = (id, name, val, attrs = "") => `<input class="inp" id="${id}" name="${name}" value="${esc(val ?? "")}" ${attrs}>`;
  const sel = (id, name, opts, val, vide1, attrs = "") => `<select class="inp" id="${id}" name="${name}" ${attrs}>${options(opts, val, vide1)}</select>`;
  const zone = (id, name, val, attrs = "") => `<textarea class="inp" id="${id}" name="${name}" ${attrs}>${esc(val ?? "")}</textarea>`;
  const pied = (label = "Enregistrer", extra = "") => `<p class="err" id="f-err" role="alert" hidden></p><div class="sheet-f">${extra}<button class="btn btn-ghost" type="button" data-act="fermer">Annuler</button><button class="btn btn-primary" type="submit">${label}</button></div>`;
  function erreurForm(msg) { const el = $("#f-err"); if (el) { el.textContent = msg; el.hidden = !msg; if (msg) el.scrollIntoView({ block: "nearest" }); } }
  const kv = (lignes) => `<dl class="kv">${lignes.filter((l) => l && l[1] !== "" && l[1] != null).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  function boutonArme(el, texte, fn) {
    if (el.classList.contains("armed")) { el.classList.remove("armed"); fn(); return; }
    const ancien = el.innerHTML;
    el.classList.add("armed");
    el.textContent = texte;
    setTimeout(() => { if (document.contains(el) && el.classList.contains("armed")) { el.classList.remove("armed"); el.innerHTML = ancien; } }, 4500);
  }
  function ouvrirTexte(titre, texte, { wa = null, intro = "" } = {}) {
    ouvrir({
      titre,
      html: `${intro ? `<p class="hint" style="margin-bottom:10px">${intro}</p>` : ""}<label class="sr" for="copie-txt">Texte à copier</label><textarea class="copybox" id="copie-txt" readonly rows="10">${esc(texte)}</textarea>
        <div class="actions"><button class="btn btn-primary" type="button" data-act="copier" data-cible="copie-txt">${I("i-copy")}Copier le texte</button>${wa !== null ? `<a class="btn btn-ghost" href="${esc(lienWa(wa, texte))}" target="_blank" rel="noopener">${I("i-msg")}${wa ? "Ouvrir WhatsApp" : "Partager sur WhatsApp"}</a>` : ""}</div>`,
    });
  }
  async function copier(texte, cible) {
    try {
      await navigator.clipboard.writeText(texte);
      toast("Texte copié");
    } catch (e) {
      if (cible) { cible.focus(); cible.select(); }
      toast("Copie automatique impossible ici : le texte est sélectionné, copiez-le avec votre appareil.", "err");
    }
  }

  /* — Membre : fiche — */
  function ficheMembre(id) {
    const m = membre(id);
    if (!m) return null;
    const a = prochainAnniv(m);
    const ecr = peutEcrire();
    const adm = peutAdmin();
    const tel = m.telephone ? `<span class="num">${esc(telAffiche(m.telephone))}</span><span class="inline-actions"><a class="btn btn-ghost btn-sm" href="${esc(lienWa(m.telephone))}" target="_blank" rel="noopener">${I("i-msg")}WhatsApp</a><button class="btn btn-ghost btn-sm" type="button" data-act="copier-val" data-val="${esc(telAffiche(m.telephone))}">${I("i-copy")}Copier</button></span>` : "";
    const naiss = m.anniv ? `${esc(fmtJM((a ? a.date.slice(0, 4) : "2000") + "-" + m.anniv))}${m.annee ? " " + esc(m.annee) : ""}${a ? ` <span class="chip ${a.dans === 0 ? "warn" : "gold"}">${a.dans === 0 ? "C’est aujourd’hui" : a.age ? `${a.age} ans ${relLong(a.date)}` : "Anniversaire " + relLong(a.date)}</span>` : ""}` : "";
    const voeux = a && a.dans <= 14 ? `<div class="note${a.dans === 0 ? " warn" : ""}"><p><b>${a.dans === 0 ? "C’est son anniversaire aujourd’hui." : `Anniversaire ${relLong(a.date)}.`}</b> Le message est prêt.</p><div class="btn-row">${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}</div></div>` : "";
    const saisie = [m.creeLe ? `Ajouté le ${fmtStamp(m.creeLe)}${m.creePar ? " par " + nomDe(m.creePar) : ""}` : "", m.modifieLe && m.modifieLe !== m.creeLe ? `modifié le ${fmtStamp(m.modifieLe)}${m.modifiePar ? " par " + nomDe(m.modifiePar) : ""}` : ""].filter(Boolean).join(", ");
    const photo = adm && S.assets ? `<div class="btn-row" style="margin:-4px 0 14px">${btn("choisir-photo", m.photoId ? "Changer la photo" : "Ajouter une photo", { ico: "i-up", sm: true, data: `data-id="${esc(m.id)}"` })}${m.photoId ? btn("retirer-photo", "Retirer", { ico: "i-x", sm: true, data: `data-id="${esc(m.id)}"` }) : ""}</div>` : "";
    const an = new Date().getFullYear();
    let cotis = "";
    if (accesDirection() && S.pret.cotisations) {
      const e = etatCotis(m, an);
      cotis = `<h3 class="h3">Cotisations ${an}</h3><p class="tally">${e.exempt ? `<span class="chip">Exemption de cotisation</span>` : e.retard.length ? `<span class="chip danger">${e.retard.length} mois ${e.retard.length > 1 ? "dus" : "dû"}</span><span>${esc(libListeMois(e.retard, an))}</span>` : e.dus.length ? `<span class="chip ok">À jour</span>` : `<span class="chip">Rien de dû pour l’instant</span>`}<span>${esc(fcfa(e.verse))} versés</span></p>${cellulesCotis(e, an)}
        <div class="btn-row" style="margin-top:10px">${adm ? btn("ajout-cotis", "Enregistrer une cotisation", { ico: "i-plus", sm: true, data: `data-id="${esc(m.id)}" data-annee="${an}"` }) : ""}${e.retard.length ? btn("relance-cotis", "Relancer", { ico: "i-msg", sm: true, data: `data-id="${esc(m.id)}" data-annee="${an}"` }) : ""}</div>`;
    }
    const disc = accesDirection() && S.pret.discipline ? `<h3 class="h3">Discipline</h3>${blocDiscipline(m)}` : "";
    return `<div class="ident">${avatar(m, true)}<div><h3>${esc(nomUsuel(m) || nomComplet(m))}</h3><p>${esc([m.fonction, m.statut].filter(Boolean).join(" · ") || "Membre du mouvement")}${m.actif === false ? " · archivé" : ""}</p></div></div>
      ${photo}${voeux}
      ${kv([["Matricule", m.matricule ? `<span class="num">${esc(m.matricule)}</span>` : ""], ["Téléphone", tel], ["Autre numéro", m.telephone2 ? `<span class="num">${esc(telAffiche(m.telephone2))}</span>` : ""], ["E-mail", m.email ? esc(m.email) : ""], ["Naissance", naiss], ["Sexe", m.sexe === "H" ? "Homme" : m.sexe === "F" ? "Femme" : ""], ["Situation", esc(m.situation || "")], ["Baptême", esc(baptiseLib(m))], ["Quartier", esc(m.quartier || "")], ["Église", esc(m.eglise || "")], ["Implantation", esc(m.implantation || "")], ["Pôle", esc(m.pole || "")], ["Département", esc(m.departement || "")], ["Membre depuis", m.adhesion ? esc(fmtJour(m.adhesion)) : ""], ["Observations", m.notes ? `<span style="white-space:pre-wrap">${esc(m.notes)}</span>` : ""]])}
      <h3 class="h3">Assiduité</h3>${blocAssiduite(m)}
      ${cotis}${disc}
      ${saisie ? `<p class="hint" style="margin-top:14px">${esc(cap(saisie))}.</p>` : ""}
      ${ecr ? `<div class="actions">${btn("editer-membre", "Modifier", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(m.id)}"` })}${adm ? btn("carte", "Carte de membre", { ico: "i-card", data: `data-id="${esc(m.id)}"` }) : ""}${m.actif === false ? btn("reactiver-membre", "Réactiver", { ico: "i-undo", data: `data-id="${esc(m.id)}"` }) : btn("archiver-membre", "Archiver", { ico: "i-archive", data: `data-id="${esc(m.id)}"` })}${adm ? btn("supprimer-membre", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(m.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirMembre = (id) => ouvrir({ titre: "Fiche membre", refresh: surveiller(() => ficheMembre(id)) });

  /* — Membre : formulaire — */
  function ouvrirFormMembre(id) {
    const c = cfg();
    const m = id ? membre(id) : {};
    if (id && !m) return;
    const [mm, jj] = (m.anniv || "").split("-");
    const jours = Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)]);
    const mois = MOIS_NOMS.map((n, i) => [String(i + 1), cap(n)]);
    const html = `<form class="form" id="f-membre" novalidate>
      <fieldset class="fs"><legend>Identité</legend>
        <div class="f2">${champ("m-nom", "Nom", inp("m-nom", "nom", m.nom, 'autocomplete="off" autocapitalize="characters" required autofocus'), { req: true })}${champ("m-prenoms", "Prénoms", inp("m-prenoms", "prenoms", m.prenoms, 'autocomplete="off" autocapitalize="words"'))}</div>
        <div class="f2">${champ("m-mat", "Matricule", inp("m-mat", "matricule", id ? m.matricule : prochainMatricule(), 'autocomplete="off" autocapitalize="characters"'), { hint: id ? "" : "Proposé automatiquement, modifiable." })}${champ("m-sexe", "Sexe", sel("m-sexe", "sexe", [["H", "Homme"], ["F", "Femme"]], m.sexe, "—"))}</div>
        <div class="f2">${champ("m-situation", "Situation familiale", sel("m-situation", "situation", SITUATIONS, m.situation, "—"))}${champ("m-bapt", "Baptême", sel("m-bapt", "baptise", [["Oui", "Baptisé(e)"], ["Non", "Non baptisé(e)"]], m.baptise, "Non précisé"))}</div>
        <div class="field"><span class="lab" id="lab-naiss">Date de naissance</span><div class="f3" role="group" aria-labelledby="lab-naiss">${sel("m-jour", "jour", jours, jj ? String(Number(jj)) : "", "Jour", 'aria-label="Jour de naissance"')}${sel("m-mois", "mois", mois, mm ? String(Number(mm)) : "", "Mois", 'aria-label="Mois de naissance"')}${inp("m-annee", "annee", m.annee || "", 'inputmode="numeric" maxlength="4" placeholder="Année" aria-label="Année de naissance"')}</div><p class="hint">L’année est facultative : le jour et le mois suffisent pour les anniversaires.</p></div>
      </fieldset>
      <fieldset class="fs"><legend>Contact</legend>
        <div class="f2">${champ("m-tel", "Téléphone", inp("m-tel", "telephone", m.telephone, 'type="tel" inputmode="tel" autocomplete="off" placeholder="07 00 00 00 00"'))}${champ("m-tel2", "Autre numéro", inp("m-tel2", "telephone2", m.telephone2, 'type="tel" inputmode="tel" autocomplete="off"'))}</div>
        <div class="f2">${champ("m-email", "E-mail", inp("m-email", "email", m.email, 'type="email" autocomplete="off"'))}${champ("m-quartier", "Quartier ou commune", inp("m-quartier", "quartier", m.quartier, 'autocomplete="off" placeholder="Cocody, Yopougon…"'))}</div>
      </fieldset>
      <fieldset class="fs"><legend>Engagement</legend>
        <div class="f2">${champ("m-eglise", "Église ou communauté", inp("m-eglise", "eglise", m.eglise, 'autocomplete="off"'))}${champ("m-impl", "Implantation", inp("m-impl", "implantation", m.implantation, 'autocomplete="off" placeholder="Siège, Italie, Canada…"'))}</div>
        <div class="f2">${champ("m-pole", "Pôle", sel("m-pole", "pole", c.poles, m.pole, "Aucun pôle"))}${champ("m-dep", "Département ou cellule", inp("m-dep", "departement", m.departement, 'autocomplete="off"'))}</div>
        <div class="f2">${champ("m-fonction", "Fonction", inp("m-fonction", "fonction", m.fonction, 'autocomplete="off" placeholder="Responsable de cellule…"'))}${champ("m-statut", "Statut", sel("m-statut", "statut", c.statuts, m.statut || (id ? "" : c.statuts.includes("Membre") ? "Membre" : ""), "—"))}</div>
        <div class="f2">${champ("m-adh", "Membre depuis le", inp("m-adh", "adhesion", id ? m.adhesion : aujourdhui(), 'type="date"'), { hint: "Les présences et les cotisations se comptent à partir de cette date." })}<div class="field"><span class="lab">Cotisation</span><label class="check"><input type="checkbox" name="cotisationExempte" value="1"${m.cotisationExempte ? " checked" : ""}> Exemption de cotisation</label></div></div>
        ${champ("m-notes", "Observations", zone("m-notes", "notes", m.notes, 'rows="3" placeholder="Suivi pastoral, besoins particuliers…"'), { hint: "Visibles uniquement par les responsables qui ont accès au registre." })}
      </fieldset>
      ${pied(id ? "Enregistrer les modifications" : "Ajouter au registre")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la fiche" : "Nouveau membre", html, onSubmit: (fd, form) => enregistrerMembre(fd, form, id), wide: true });
  }
  async function enregistrerMembre(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    const nom = g("nom");
    if (!nom) { erreurForm("Indiquez au moins le nom du membre."); $("#m-nom").focus(); return; }
    const jour = g("jour"), mois = g("mois"), anneeTxt = g("annee");
    if ((jour && !mois) || (!jour && mois)) { erreurForm("Pour la date de naissance, indiquez le jour et le mois."); return; }
    let annee = null;
    if (anneeTxt) {
      annee = Number(anneeTxt);
      if (!/^\d{4}$/.test(anneeTxt) || annee < 1900 || annee > new Date().getFullYear()) { erreurForm("L’année de naissance doit comporter quatre chiffres, par exemple 1990."); return; }
    }
    let anniv = null;
    if (jour && mois) {
      if (Number(jour) > joursDuMois(Number(mois), annee)) { erreurForm(`Le ${jour} ${MOIS_NOMS[Number(mois) - 1]} n’existe pas${annee ? " en " + annee : ""}.`); return; }
      anniv = `${pad(mois)}-${pad(jour)}`;
    }
    const email = g("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erreurForm("L’adresse e-mail semble incomplète."); return; }
    const matricule = g("matricule").toUpperCase();
    const pris = matricule && S.membres.find((x) => x.id !== id && String(x.matricule || "").toUpperCase() === matricule);
    if (pris) { erreurForm(`Le matricule ${matricule} est déjà attribué à ${nomComplet(pris)}.`); $("#m-mat").focus(); return; }
    const data = { matricule, nom, prenoms: g("prenoms"), sexe: g("sexe"), situation: g("situation"), baptise: g("baptise"), anniv, annee, telephone: g("telephone"), telephone2: g("telephone2"), email, quartier: g("quartier"), eglise: g("eglise"), implantation: g("implantation"), pole: g("pole"), departement: g("departement"), fonction: g("fonction"), statut: g("statut"), adhesion: g("adhesion"), notes: g("notes"), cotisationExempte: fd.get("cotisationExempte") === "1" };
    if (!id && form.dataset.doublon !== "ok") {
      const tel = telChiffres(data.telephone);
      const cle = norm(data.nom + " " + data.prenoms);
      const dbl = S.membres.find((m) => (tel && telChiffres(m.telephone) === tel) || norm((m.nom || "") + " " + (m.prenoms || "")) === cle);
      if (dbl) { form.dataset.doublon = "ok"; erreurForm(`Une fiche existe déjà pour ${nomComplet(dbl)}${tel && telChiffres(dbl.telephone) === tel ? " avec ce numéro" : ""}. Appuyez de nouveau pour l’ajouter quand même.`); return; }
    }
    const btnS = form.querySelector("[type=submit]");
    btnS.disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("membres/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("membres").doc(); await ref.set({ ...data, actif: true, ...creation() }); }
    }, id ? "Fiche mise à jour" : "Membre ajouté au registre");
    btnS.disabled = false;
    if (ok) ouvrirMembre(id || ref.id);
  }

  /* — Opération : formulaire — */
  function ouvrirFormOp(cle, id, sensDefaut) {
    const c = cfg();
    const o = id ? opDe(cle, id) : null;
    if (id && !o) return;
    const sens = o ? o.sens : sensDefaut || "E";
    const dDefaut = S.mois === moisCourant() ? aujourdhui() : dernierJour(S.mois);
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    if (o && o.membreId && !mbs.some(([v]) => v === o.membreId)) { const mm = membre(o.membreId); if (mm) mbs.push([mm.id, nomComplet(mm) + " (archivé)"]); }
    const evs = S.evenements.filter((e) => e.date >= ajoutJours(aujourdhui(), -150) && e.date <= ajoutJours(aujourdhui(), 90)).sort((a, b) => cmpFr(b.date, a.date)).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre || "Rassemblement"}`]);
    if (o && o.evenementId && !evs.some(([v]) => v === o.evenementId)) { const ee = evt(o.evenementId); if (ee) evs.push([ee.id, `${fmtCourt(ee.date)} · ${ee.titre}`]); }
    const html = `<form class="form" id="f-op" novalidate>
      <div class="seg" role="radiogroup" aria-label="Sens de l’opération"><input type="radio" class="in" name="sens" id="o-e" value="E"${sens === "E" ? " checked" : ""}><label for="o-e">${I("i-in")}Entrée</label><input type="radio" class="out" name="sens" id="o-s" value="S"${sens === "S" ? " checked" : ""}><label for="o-s">${I("i-out")}Sortie</label></div>
      <div class="f2">${champ("o-montant", "Montant (FCFA)", inp("o-montant", "montant", o ? nb(o.montant) : "", 'class="inp big" inputmode="numeric" autocomplete="off" placeholder="0" required autofocus'), { req: true })}${champ("o-date", "Date", inp("o-date", "date", o ? o.date : dDefaut, 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("o-cat", "Catégorie", sel("o-cat", "categorie", categoriesDe(sens), o ? o.categorie : "", null))}${champ("o-moyen", "Moyen de paiement", sel("o-moyen", "moyen", c.moyens, o ? o.moyen : c.moyens[0], null))}</div>
      ${champ("o-lib", "Libellé", inp("o-lib", "libelle", o ? o.libelle : "", 'autocomplete="off" placeholder="Offrande du culte de dimanche, loyer d’octobre…"'))}
      <div class="f2">${champ("o-membre", "Membre concerné", sel("o-membre", "membreId", mbs, o ? o.membreId : "", "Aucun"), { hint: "Donateur, bénéficiaire ou personne payée." })}${champ("o-evt", "Rassemblement lié", sel("o-evt", "evenementId", evs, o ? o.evenementId : "", "Aucun"))}</div>
      ${champ("o-piece", "N° de pièce ou référence", inp("o-piece", "piece", o ? o.piece : "", 'autocomplete="off" placeholder="Reçu, facture, transaction Mobile Money…"'))}
      ${pied(id ? "Enregistrer les modifications" : "Enregistrer l’opération")}
    </form>`;
    ouvrir({
      titre: id ? "Modifier l’opération" : "Nouvelle opération", html, wide: true,
      onSubmit: (fd, form) => enregistrerOp(fd, form, o),
      apres: (sheet) => {
        const m = sheet.querySelector("#o-montant");
        m.addEventListener("blur", () => { const v = Number(m.value.replace(/\D/g, "")); m.value = v ? nb(v) : ""; });
        m.addEventListener("focus", () => { m.value = m.value.replace(/\D/g, ""); });
        sheet.querySelectorAll("input[name=sens]").forEach((r) => r.addEventListener("change", () => {
          const s = sheet.querySelector("input[name=sens]:checked").value;
          const catSel = sheet.querySelector("#o-cat");
          const avant = catSel.value;
          catSel.innerHTML = options(categoriesDe(s), categoriesDe(s).includes(avant) ? avant : "", null);
        }));
      },
    });
  }
  async function enregistrerOp(fd, form, o) {
    const g = (k) => String(fd.get(k) || "").trim();
    const montant = Number(g("montant").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez un montant supérieur à zéro."); $("#o-montant").focus(); return; }
    const date = g("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { erreurForm("Indiquez la date de l’opération."); return; }
    if (date > aujourdhui()) { erreurForm("La date ne peut pas être dans le futur."); return; }
    const cle = date.slice(0, 7);
    if (moisClos(cle)) { erreurForm(`${cap(fmtMois(cle))} est clôturé : choisissez une date dans un mois ouvert.`); return; }
    if (o && moisClos(o.mois)) { erreurForm("Le mois d’origine de cette opération est clôturé."); return; }
    const data = { sens: g("sens") === "S" ? "S" : "E", montant, date, categorie: g("categorie"), moyen: g("moyen"), libelle: g("libelle"), membreId: g("membreId") || null, evenementId: g("evenementId") || null, piece: g("piece") };
    const btnS = form.querySelector("[type=submit]");
    btnS.disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (o && o.mois === cle) await S.db.doc(`finances/${cle}/ops/${o.id}`).update({ ...data, ...tampon() });
      else if (o) {
        const { id: _i, mois: _m, ...ancien } = o;
        await S.db.doc(`finances/${cle}/ops/${o.id}`).set({ ...ancien, ...data, ...tampon() });
        await S.db.doc(`finances/${o.mois}/ops/${o.id}`).delete();
      } else { ref = ref || S.db.collection(`finances/${cle}/ops`).doc(); await ref.set({ ...data, annule: false, ...creation() }); }
    }, o ? "Opération modifiée" : "Opération enregistrée");
    btnS.disabled = false;
    if (!ok) return;
    const nouvelId = o ? o.id : ref.id;
    if (S.mois !== cle) { S.mois = cle; abonnerMois(cle); }
    if (o) ouvrirOp(cle, nouvelId); else fermer();
    render();
    const touches = new Set([cle]);
    if (o && o.mois !== cle) touches.add(o.mois);
    for (const k of touches) { try { await recalcMois(k); } catch (e) { /* signalé dans la vue */ } }
  }

  /* — Opération : fiche — */
  function ficheOp(cle, id) {
    const o = opDe(cle, id);
    if (!o) return null;
    const m = o.membreId ? membre(o.membreId) : null;
    const e = o.evenementId ? evt(o.evenementId) : null;
    const io = o.sens === "E" ? "in" : "out";
    const ouvert = !moisClos(cle);
    const adm = peutAdmin();
    return `<div class="figure"><span class="big-figure ${o.annule ? "" : io}">${o.sens === "E" ? "+" : "−"}${nb(o.montant)}<small>FCFA</small></span><span class="chip ${io}">${o.sens === "E" ? "Entrée" : "Sortie"}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</div>
      <p class="hint" style="margin-bottom:12px">${esc(cap(enLettres(o.montant)))} francs CFA</p>
      ${o.annule ? `<div class="note danger"><p><b>Opération annulée</b>${o.annulePar ? " par " + esc(nomDe(o.annulePar)) : ""}${o.annuleLe ? " le " + esc(fmtStamp(o.annuleLe)) : ""}. Elle n’entre plus dans les totaux.</p>${o.annuleMotif ? `<p>Motif : ${esc(o.annuleMotif)}</p>` : ""}</div>` : ""}
      ${kv([["Date", esc(fmtLong(o.date))], ["Catégorie", esc(o.categorie || "")], ["Libellé", esc(o.libelle || "")], ["Moyen", esc(o.moyen || "")], ["Membre", m ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button>` : ""], ["Rassemblement", e ? esc(`${e.titre} · ${fmtCourt(e.date)}`) : ""], ["Référence", esc(o.piece || "")], ["Saisie", esc([o.creeLe ? fmtStamp(o.creeLe) : "", o.creePar ? "par " + nomDe(o.creePar) : ""].filter(Boolean).join(" "))], ["Modification", o.modifieLe && o.modifieLe !== o.creeLe ? esc(`${fmtStamp(o.modifieLe)}${o.modifiePar ? " par " + nomDe(o.modifiePar) : ""}`) : ""]])}
      ${!ouvert ? `<p class="note">${I("i-lock")} ${esc(cap(fmtMois(cle)))} est clôturé : cette opération ne peut plus être modifiée.</p>` : ""}
      ${o.cotisation ? `<p class="note">Cotisation de ${esc(libListeMois(o.cotisation.mois || [], o.cotisation.annee))}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis les cotisations.</p>` : ""}
      <div class="actions">
        ${o.sens === "E" && !o.annule ? btn("recu-op", "Reçu", { ico: "i-receipt", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}
        ${adm && ouvert && !o.annule && !o.cotisation ? btn("editer-op", "Modifier", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}${adm && ouvert && !o.annule ? btn("annuler-op", "Annuler l’opération", { ico: "i-x", cls: "btn-danger", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}
        ${adm && ouvert && o.annule ? btn("retablir-op", "Rétablir l’opération", { ico: "i-undo", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}
      </div>`;
  }
  const ouvrirOp = (cle, id) => ouvrir({ titre: "Opération", refresh: surveiller(() => ficheOp(cle, id)) });
  function ouvrirAnnulation(cle, id) {
    const o = opDe(cle, id);
    if (!o) return;
    ouvrir({
      titre: "Annuler l’opération",
      html: `<form class="form" novalidate><p>${o.sens === "E" ? "Entrée" : "Sortie"} de <b>${esc(fcfa(o.montant))}</b> du ${esc(fmtJour(o.date))}${o.libelle ? ` · ${esc(o.libelle)}` : ""}.</p><p class="hint">L’opération reste visible, barrée, avec le motif et le nom de la personne qui l’a annulée. Elle ne compte plus dans les totaux. Vous pourrez la rétablir.</p>${champ("a-motif", "Motif de l’annulation", zone("a-motif", "motif", "", 'rows="3" required autofocus placeholder="Erreur de saisie, doublon, remboursement…"'), { req: true })}${pied("Confirmer l’annulation")}</form>`,
      onSubmit: async (fd, form) => {
        const motif = String(fd.get("motif") || "").trim();
        if (!motif) { erreurForm("Indiquez le motif de l’annulation."); return; }
        form.querySelector("[type=submit]").disabled = true;
        const ok = await ecrire(() => S.db.doc(`finances/${cle}/ops/${id}`).update({ annule: true, annuleMotif: motif, annulePar: S.me.id || null, annuleLe: Date.now(), ...tampon() }), "Opération annulée");
        if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
        ouvrirOp(cle, id);
        try { await synchroCotisOp(o, true); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }
        try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
      },
    });
  }
  function texteRecu(o) {
    const c = cfg();
    const m = o.membreId ? membre(o.membreId) : null;
    const num = o.piece || `R-${o.mois.replace("-", "")}-${String(o.id).slice(-5).toUpperCase()}`;
    const lettres = cap(enLettres(o.montant));
    return [
      c.nomOfficiel + " (" + c.nomCourt + ")",
      "",
      `REÇU N° ${num}`,
      "",
      `Reçu de : ${m ? nomUsuel(m) : "...................................................."}`,
      `La somme de : ${lettres} francs CFA (${nb(o.montant)} FCFA)`,
      `Au titre de : ${[o.categorie, o.libelle].filter(Boolean).join(" – ") || "Contribution"}`,
      `Mode de paiement : ${o.moyen || "Espèces"}${o.piece ? " (réf. " + o.piece + ")" : ""}`,
      `Date du versement : ${fmtJour(o.date)}`,
      "",
      `Arrêté le présent reçu à la somme de ${enLettres(o.montant)} francs CFA.`,
      "",
      `Fait à ${c.ville}, le ${fmtJour(aujourdhui())}.`,
      "",
      "Le Trésorier",
    ].join("\n");
  }
  function texteRapport(cle) {
    const c = cfg();
    const ops = (S.ops[cle] || []);
    const t = totauxOps(cle);
    const sf = soldeFin(cle);
    const grp = (sens) => {
      const g = {};
      ops.filter((o) => !o.annule && o.sens === sens).forEach((o) => { g[o.categorie || "Sans catégorie"] = (g[o.categorie || "Sans catégorie"] || 0) + (Number(o.montant) || 0); });
      return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${k} : ${fcfa(v)}`);
    };
    const nE = ops.filter((o) => !o.annule && o.sens === "E").length, nS = ops.filter((o) => !o.annule && o.sens === "S").length;
    const ann = ops.filter((o) => o.annule).length;
    return [
      `${c.nomCourt} — Rapport financier`,
      cap(fmtMois(cle)),
      "",
      `Entrées : ${fcfa(t.e)} (${pluriel(nE, "opération", "opérations")})`,
      `Sorties : ${fcfa(t.s)} (${pluriel(nS, "opération", "opérations")})`,
      `Solde du mois : ${signe(t.e - t.s)} FCFA`,
      sf == null ? "" : `Solde de caisse en fin de mois : ${fcfa(sf)}`,
      "",
      grp("E").length ? "Entrées par catégorie" : "",
      ...grp("E"),
      grp("S").length ? "" : "",
      grp("S").length ? "Sorties par catégorie" : "",
      ...grp("S"),
      ann ? "" : "",
      ann ? `${pluriel(ann, "opération annulée", "opérations annulées")}, non comptée${ann > 1 ? "s" : ""}.` : "",
      "",
      `${moisClos(cle) ? "Mois clôturé. " : ""}Établi le ${fmtJour(aujourdhui())}.`,
    ].filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n").trim();
  }

  /* — Rassemblement : formulaire, fiche, pointage — */
  function ouvrirFormEvt(id) {
    const c = cfg();
    const e = id ? evt(id) : {};
    if (id && !e) return;
    const html = `<form class="form" id="f-evt" novalidate>
      ${champ("e-titre", "Intitulé", inp("e-titre", "titre", e.titre, 'autocomplete="off" required autofocus placeholder="Culte d’adoration, réunion des responsables…"'), { req: true })}
      <div class="f2">${champ("e-type", "Type", sel("e-type", "type", c.typesEvenement, e.type || c.typesEvenement[0], null))}${champ("e-date", "Date", inp("e-date", "date", e.date || aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("e-heure", "Heure de début", inp("e-heure", "heure", e.heure, 'type="time"'))}${champ("e-fin", "Heure de fin", inp("e-fin", "fin", e.fin, 'type="time"'))}</div>
      ${champ("e-lieu", "Lieu", inp("e-lieu", "lieu", e.lieu, 'autocomplete="off"'))}
      ${champ("e-resp", "Responsable", inp("e-resp", "responsable", e.responsable, 'autocomplete="off"'))}
      ${champ("e-desc", "Description", zone("e-desc", "description", e.description, 'rows="4" placeholder="Thème, orateurs, consignes…"'))}
      ${pied(id ? "Enregistrer les modifications" : "Programmer")}
    </form>`;
    ouvrir({ titre: id ? "Modifier le rassemblement" : "Nouveau rassemblement", html, wide: true, onSubmit: (fd, form) => enregistrerEvt(fd, form, id) });
  }
  async function enregistrerEvt(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    const titre = g("titre"), date = g("date");
    if (!titre) { erreurForm("Indiquez l’intitulé du rassemblement."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { erreurForm("Indiquez la date du rassemblement."); return; }
    if (g("heure") && g("fin") && g("fin") <= g("heure")) { erreurForm("L’heure de fin doit suivre l’heure de début."); return; }
    const data = { titre, type: g("type"), date, heure: g("heure"), fin: g("fin"), lieu: g("lieu"), responsable: g("responsable"), description: g("description") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("evenements/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("evenements").doc(); await ref.set({ ...data, presents: {}, visiteurs: 0, nouveaux: 0, ...creation() }); }
    }, id ? "Rassemblement modifié" : "Rassemblement programmé");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirEvt(id || ref.id);
  }
  function ficheEvt(id) {
    const e = evt(id);
    if (!e) return null;
    const ecr = peutEcrire();
    const np = nbPresents(e), nr = nbEtat(e, "retard"), nx = nbEtat(e, "excuse"), vi = compteur(e, "visiteurs"), nv = compteur(e, "nouveaux"), tot = np + vi + nv;
    const passe = e.date < aujourdhui();
    const horaire = [fmtHeure(e.heure), fmtHeure(e.fin)].filter(Boolean).join(" – ");
    return `<div class="ident"><span class="datebox${e.date === aujourdhui() ? " today" : ""}" aria-hidden="true"><span>${esc(F_SEM_C.format(versDate(e.date)).replace(".", ""))}</span><b>${versDate(e.date).getDate()}</b><small>${esc(fmtMoisC(e.date.slice(0, 7)))}</small></span><div><h3>${esc(e.titre || "Rassemblement")}</h3><p>${esc([e.type, cap(relLong(e.date))].filter(Boolean).join(" · "))}</p></div></div>
      ${kv([["Date", esc(fmtLong(e.date))], ["Horaire", esc(horaire)], ["Lieu", esc(e.lieu || "")], ["Responsable", esc(e.responsable || "")], ["Description", e.description ? `<span style="white-space:pre-wrap">${esc(e.description)}</span>` : ""]])}
      <h3 class="h3">Présences</h3>
      ${tot || nx ? `<p class="tally"><span><b>${nb(tot)}</b> au total</span><span>${pluriel(np, "membre", "membres")}${nr ? ` dont ${pluriel(nr, "retard", "retards")}` : ""}</span>${nx ? `<span>${pluriel(nx, "absence excusée", "absences excusées")}</span>` : ""}<span>${pluriel(vi, "visiteur", "visiteurs")}</span><span>${pluriel(nv, "nouveau venu", "nouveaux venus")}</span></p>` : `<p class="hint">${passe ? "Les présences n’ont pas été pointées." : "Le pointage se fait le jour du rassemblement."}</p>`}
      <div class="actions">
        ${ecr ? btn("pointer-evt", tot ? "Compléter le pointage" : "Pointer les présences", { ico: "i-ucheck", cls: "btn-primary", data: `data-id="${esc(e.id)}"` }) : ""}
        ${btn("annonce-evt", "Message d’annonce", { ico: "i-horn", data: `data-id="${esc(e.id)}"` })}
        ${tot ? btn("bilan-evt", "Bilan de présence", { ico: "i-report", data: `data-id="${esc(e.id)}"` }) : ""}
      </div>
      ${ecr ? `<hr class="sep"><div class="btn-row">${btn("editer-evt", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(e.id)}"` })}${peutAdmin() ? btn("supprimer-evt", "Supprimer", { ico: "i-trash", cls: "btn-danger", sm: true, data: `data-id="${esc(e.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirEvt = (id) => ouvrir({ titre: "Rassemblement", refresh: surveiller(() => ficheEvt(id)) });
  function fichePointage(id) {
    const e = evt(id);
    if (!e) return null;
    const pres = presentsEffectifs(e);
    const f = S.f.pointage;
    const q = norm(f.q);
    const actifs = membresActifs();
    const liste = actifs.filter((m) => (!f.seuls || pres[m.id] === true || pres[m.id] === "retard" || pres[m.id] === "excuse") && (!q || norm(nomComplet(m) + " " + (m.matricule || "") + " " + (m.quartier || "") + " " + (m.fonction || "")).includes(q)));
    const np = nbPresents(e), nr = nbEtat(e, "retard"), nx = nbEtat(e, "excuse"), vi = compteur(e, "visiteurs"), nv = compteur(e, "nouveaux");
    const rows = liste.slice(0, 400).map((m) => {
      const v = pres[m.id];
      const et = v === true ? "p" : v === "retard" ? "r" : v === "excuse" ? "e" : "";
      const meta = [v === "retard" ? "En retard" : v === "excuse" ? "Absence excusée" : v === true ? "Présent" : "", poleCourt(m.pole), m.fonction].filter(Boolean).join(" · ");
      return `<div class="pt-row${et ? " " + et : ""}"><button class="pt-main" type="button" data-act="pointer" data-mid="${esc(m.id)}" aria-pressed="${estPresent(v)}"><span class="tick">${I("i-check")}</span><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span></button><span class="pt-opts"><button class="pt-opt${v === "retard" ? " on" : ""}" type="button" data-act="pointer-etat" data-etat="retard" data-mid="${esc(m.id)}" aria-pressed="${v === "retard"}" aria-label="En retard : ${esc(nomComplet(m))}">Retard</button><button class="pt-opt${v === "excuse" ? " on" : ""}" type="button" data-act="pointer-etat" data-etat="excuse" data-mid="${esc(m.id)}" aria-pressed="${v === "excuse"}" aria-label="Absence excusée : ${esc(nomComplet(m))}">Excusé</button></span></div>`;
    }).join("");
    return `<p class="hint" style="margin-bottom:10px">${esc(e.titre)} · ${esc(fmtLong(e.date))}. Touchez un nom pour le marquer présent ; « Retard » et « Excusé » précisent les autres cas. Chaque appui est enregistré aussitôt, et plusieurs responsables peuvent pointer en même temps.</p>
      <p class="tally"><span><b>${nb(np + vi + nv)}</b> au total</span><span>${pluriel(np, "membre présent", "membres présents")} sur ${nb(actifs.length)}</span>${nr ? `<span>dont ${pluriel(nr, "retard", "retards")}</span>` : ""}${nx ? `<span>${pluriel(nx, "excusé", "excusés")}</span>` : ""}</p>
      <div class="counters">
        <div class="counter"><span class="lab" id="lab-vi">Visiteurs</span><div class="counter-c"><button class="icon-btn" type="button" data-act="compteur" data-k="visiteurs" data-d="-1" aria-label="Retirer un visiteur">${I("i-minus")}</button><b aria-labelledby="lab-vi">${nb(vi)}</b><button class="icon-btn" type="button" data-act="compteur" data-k="visiteurs" data-d="1" aria-label="Ajouter un visiteur">${I("i-plus")}</button></div></div>
        <div class="counter"><span class="lab" id="lab-nv">Nouveaux venus</span><div class="counter-c"><button class="icon-btn" type="button" data-act="compteur" data-k="nouveaux" data-d="-1" aria-label="Retirer un nouveau venu">${I("i-minus")}</button><b aria-labelledby="lab-nv">${nb(nv)}</b><button class="icon-btn" type="button" data-act="compteur" data-k="nouveaux" data-d="1" aria-label="Ajouter un nouveau venu">${I("i-plus")}</button></div></div>
      </div>
      <div class="filters"><label class="sr" for="q-pt">Rechercher un membre</label><input class="search" id="q-pt" type="search" placeholder="Rechercher un membre…" value="${esc(f.q)}" data-filtre="pointage.q" autocomplete="off"><button class="chip-btn solo${f.seuls ? " on" : ""}" type="button" data-act="pt-seuls" aria-pressed="${f.seuls}">Pointés seulement</button></div>
      ${actifs.length ? (liste.length ? `<div class="list">${rows}</div>${liste.length > 400 ? `<p class="hint" style="margin-top:8px">Affinez la recherche pour voir les autres membres.</p>` : ""}` : vide("i-search", "Aucun membre ne correspond.")) : vide("i-users", "Le registre est vide : ajoutez des membres pour les pointer. Les visiteurs et nouveaux venus se comptent ci-dessus.")}`;
  }
  function ouvrirPointage(id) {
    if (S.pt.id && S.pt.id !== id) envoyerPointage(S.pt, true);
    if (S.pt.id !== id) S.pt = nouveauPointage(id);
    S.f.pointage = { q: "", seuls: false };
    ouvrir({ titre: "Pointage des présences", refresh: surveiller(() => fichePointage(id)), wide: true });
  }
  function planifierEnvoi(pt) { clearTimeout(pt.timer); pt.timer = setTimeout(() => envoyerPointage(pt, false), 650); }
  /* Les appuis sont regroupés puis envoyés en une seule écriture fusionnée : chaque membre est une clé
     distincte de « presents », si bien que deux responsables qui pointent en même temps ne s’écrasent pas. */
  async function envoyerPointage(pt, final) {
    if (!pt || !pt.id || !S.db) return;
    clearTimeout(pt.timer);
    if (final) pt.final = true;
    if (pt.envoi) return;
    const lot = pt.attente, cpt = pt.compteurs;
    if (!Object.keys(lot).length && !Object.keys(cpt).length) return;
    pt.attente = {}; pt.compteurs = {};
    pt.vol = { ...pt.vol, ...lot }; pt.volC = { ...pt.volC, ...cpt };
    pt.envoi = true;
    const payload = { ...tampon(), ...cpt };
    if (Object.keys(lot).length) payload.presents = lot;
    const id = pt.id;
    const ok = await enFile("evt:" + id, () => ecrire(() => S.db.doc("evenements/" + id).update(payload)));
    pt.envoi = false;
    for (const k of Object.keys(lot)) if (!(k in pt.attente)) delete pt.vol[k];
    for (const k of Object.keys(cpt)) if (!(k in pt.compteurs)) delete pt.volC[k];
    if (!ok) toast("Le dernier pointage n’a pas été enregistré.", "err");
    if (Object.keys(pt.attente).length || Object.keys(pt.compteurs).length) { if (pt.final) envoyerPointage(pt, true); else planifierEnvoi(pt); }
    render();
  }

  /* — Décision : formulaire, fiche — */
  function ouvrirFormDec(id) {
    const c = cfg();
    const d = id ? decision(id) : {};
    if (id && !d) return;
    const html = `<form class="form" id="f-dec" novalidate>
      <div class="f2">${champ("d-date", "Date de la décision", inp("d-date", "date", d.date || aujourdhui(), 'type="date" required'), { req: true })}${champ("d-inst", "Instance", sel("d-inst", "instance", c.instances, d.instance || c.instances[0], null))}</div>
      ${champ("d-int", "Décision", zone("d-int", "intitule", d.intitule, 'rows="2" required autofocus placeholder="Ce qui a été décidé, en une ou deux phrases"'), { req: true })}
      ${champ("d-action", "Action à mener", zone("d-action", "action", d.action, 'rows="2" placeholder="Ce qu’il faut faire concrètement"'))}
      <div class="f2">${champ("d-resp", "Responsable", inp("d-resp", "responsable", d.responsable, 'autocomplete="off" placeholder="Nom ou fonction"'))}${champ("d-ech", "Échéance", inp("d-ech", "echeance", d.echeance, 'type="date"'))}</div>
      ${champ("d-etat", "État", sel("d-etat", "etat", ETATS, d.etat || "À faire", null))}
      ${champ("d-notes", "Observations", zone("d-notes", "notes", d.notes, 'rows="3"'))}
      ${pied(id ? "Enregistrer les modifications" : "Inscrire au registre")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la décision" : "Nouvelle décision", html, wide: true, onSubmit: (fd, form) => enregistrerDec(fd, form, id) });
  }
  async function enregistrerDec(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("intitule")) { erreurForm("Décrivez la décision prise."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g("date"))) { erreurForm("Indiquez la date de la décision."); return; }
    const data = { date: g("date"), instance: g("instance"), intitule: g("intitule"), action: g("action"), responsable: g("responsable"), echeance: g("echeance"), etat: g("etat") || "À faire", notes: g("notes") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("decisions/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("decisions").doc(); await ref.set({ ...data, ...creation() }); }
    }, id ? "Décision modifiée" : "Décision inscrite au registre");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirDec(id || ref.id);
  }
  function ficheDec(id) {
    const d = decision(id);
    if (!d) return null;
    const ecr = peutEcrire();
    return `<div class="figure">${chipEtat(d)}${enRetard(d) ? `<span class="chip danger">En retard de ${pluriel(joursEntre(d.echeance, aujourdhui()), "jour", "jours")}</span>` : ""}</div>
      <p style="margin:0 0 14px;font-size:17px;font-weight:700;white-space:pre-wrap">${esc(d.intitule)}</p>
      ${kv([["Instance", esc(d.instance || "")], ["Décidée le", d.date ? esc(fmtJour(d.date)) : ""], ["Action à mener", d.action ? `<span style="white-space:pre-wrap">${esc(d.action)}</span>` : ""], ["Responsable", esc(d.responsable || "")], ["Échéance", d.echeance ? esc(`${fmtJour(d.echeance)} (${relLong(d.echeance)})`) : ""], ["Observations", d.notes ? `<span style="white-space:pre-wrap">${esc(d.notes)}</span>` : ""], ["Inscrite", esc([d.creeLe ? fmtStamp(d.creeLe) : "", d.creePar ? "par " + nomDe(d.creePar) : ""].filter(Boolean).join(" "))]])}
      ${ecr ? `<h3 class="h3">Changer l’état</h3><div class="seg s4" role="group" aria-label="État de la décision">${ETATS.map((e) => `<button type="button" class="${(d.etat || "À faire") === e ? "on" : ""}" data-act="etat-dec" data-id="${esc(d.id)}" data-etat="${esc(e)}" aria-pressed="${(d.etat || "À faire") === e}">${esc(e)}</button>`).join("")}</div>
      <div class="actions">${btn("editer-dec", "Modifier", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(d.id)}"` })}${peutAdmin() ? btn("supprimer-dec", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(d.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirDec = (id) => ouvrir({ titre: "Décision", refresh: surveiller(() => ficheDec(id)) });

  /* — Réglages — */
  function niveauLibelle() {
    if (S.etat === "absent") return "Non connecté";
    if (S.estProprio) return "Propriétaire";
    if (S.estAdmin) return "Éditeur";
    if (S.peutEcrire === true) return "Contributeur";
    if (S.peutEcrire === false) return "Lecture seule";
    return "Non déterminé";
  }
  function ouvrirReglages() {
    const c = cfg();
    const adm = peutAdmin();
    const dis = adm ? "" : " disabled";
    const lignes = (a) => (Array.isArray(a) ? a.join("\n") : "");
    const si = c.soldeInitial || {};
    const [siA, siM] = si.mois ? si.mois.split("-") : ["", ""];
    const [cdA, cdM] = c.cotisationDebut ? String(c.cotisationDebut).split("-") : ["", ""];
    const annees = []; for (let y = new Date().getFullYear(); y >= 2015; y -= 1) annees.push([String(y), String(y)]);
    const html = `<form class="form" id="f-reglages" novalidate>
      <fieldset class="fs"><legend>Votre accès</legend>
        <p><span class="chip info">${esc(niveauLibelle())}</span></p>
        <ul class="hint" style="margin:0;padding-left:18px;display:grid;gap:4px">
          <li><b>Lecture seule</b> : agenda des rassemblements.</li>
          <li><b>Contributeur</b> : en plus, registre des membres, pointage des présences et secrétariat.</li>
          <li><b>Éditeur et propriétaire</b> : en plus, finances et réglages.</li>
        </ul>
        <p class="hint">Les niveaux se règlent dans le menu de partage de cette application. Ces protections sont appliquées par le serveur, pas seulement par l’affichage.</p>
      </fieldset>
      ${adm ? "" : `<p class="note">Seuls les éditeurs et le propriétaire peuvent modifier les réglages.</p>`}
      <fieldset class="fs"${dis}><legend>Identité</legend>
        <div class="f2">${champ("r-court", "Nom court", inp("r-court", "nomCourt", c.nomCourt, 'autocomplete="off"'))}${champ("r-sous", "Sous-titre", inp("r-sous", "sousTitre", c.sousTitre, 'autocomplete="off"'))}</div>
        ${champ("r-off", "Nom officiel", inp("r-off", "nomOfficiel", c.nomOfficiel, 'autocomplete="off"'), { hint: "Utilisé en tête des reçus." })}
        <div class="f2">${champ("r-devise", "Devise", inp("r-devise", "devise", c.devise, 'autocomplete="off"'))}${champ("r-ville", "Ville des reçus", inp("r-ville", "ville", c.ville, 'autocomplete="off"'))}</div>
      </fieldset>
      ${accesFinances() ? `<fieldset class="fs"${dis}><legend>Finances</legend>
        <div class="f2">${champ("r-si", "Solde de caisse de départ (FCFA)", inp("r-si", "siMontant", si.montant ? nb(si.montant) : "", 'inputmode="numeric" autocomplete="off" placeholder="0"'))}<div class="field"><span class="lab" id="lab-sim">Au début du mois de</span><div class="f2" role="group" aria-labelledby="lab-sim" style="gap:8px">${sel("r-sim", "siMois", MOIS_NOMS.map((n, i) => [pad(i + 1), cap(n)]), siM, "Mois", 'aria-label="Mois de départ"')}${sel("r-sia", "siAnnee", annees, siA, "Année", 'aria-label="Année de départ"')}</div></div></div>
        <p class="hint">Les opérations antérieures à ce mois ne sont pas comptées dans le solde de caisse.</p>
        <div class="f2">${champ("r-ce", "Catégories d’entrées", zone("r-ce", "categoriesEntree", lignes(c.categoriesEntree), 'rows="6"'), { hint: "Une par ligne." })}${champ("r-cs", "Catégories de sorties", zone("r-cs", "categoriesSortie", lignes(c.categoriesSortie), 'rows="6"'), { hint: "Une par ligne." })}</div>
        ${champ("r-moy", "Moyens de paiement", zone("r-moy", "moyens", lignes(c.moyens), 'rows="5"'), { hint: "Un par ligne." })}
        <div class="f2">${champ("r-cot", "Cotisation mensuelle (FCFA)", inp("r-cot", "cotisationMensuelle", Number(c.cotisationMensuelle) ? nb(c.cotisationMensuelle) : "", 'inputmode="numeric" autocomplete="off" placeholder="0"'))}<div class="field"><span class="lab" id="lab-cd">Cotisations dues à partir de</span><div class="f2" role="group" aria-labelledby="lab-cd" style="gap:8px">${sel("r-cdm", "cdMois", MOIS_NOMS.map((n, i) => [pad(i + 1), cap(n)]), cdM, "Mois", 'aria-label="Mois de début des cotisations"')}${sel("r-cda", "cdAnnee", annees, cdA, "Année", 'aria-label="Année de début des cotisations"')}</div><p class="hint">Sans date, elles sont dues à partir du mois où le montant est défini. Un membre arrivé plus tard doit à partir de son adhésion.</p></div></div>
      </fieldset>
      <fieldset class="fs"${dis}><legend>Cartes de membre</legend>
        <div class="f2">${champ("r-sig", "Signataire", inp("r-sig", "signataire", c.signataire, 'autocomplete="off"'))}${champ("r-sigt", "Titre du signataire", inp("r-sigt", "signataireTitre", c.signataireTitre, 'autocomplete="off"'))}</div>
        ${champ("r-can", "Cartes valables jusqu’au 31 décembre", sel("r-can", "carteAnnee", [0, 1, 2].map((k) => { const y = new Date().getFullYear() + k; return [String(y), String(y)]; }), String(anneeCarte()), null))}
      </fieldset>` : ""}
      <fieldset class="fs"${dis}><legend>Registre et agenda</legend>
        ${champ("r-poles", "Pôles", zone("r-poles", "poles", lignes(c.poles), 'rows="5"'), { hint: "Un par ligne. « Pôle 1 · Intitulé » s’affiche en abrégé « Pôle 1 » dans les listes." })}
        <div class="f2">${champ("r-statuts", "Statuts des membres", zone("r-statuts", "statuts", lignes(c.statuts), 'rows="4"'))}${champ("r-types", "Types de rassemblements", zone("r-types", "typesEvenement", lignes(c.typesEvenement), 'rows="4"'))}</div>
        ${champ("r-inst", "Instances de décision", zone("r-inst", "instances", lignes(c.instances), 'rows="4"'))}
        ${champ("r-msg", "Message d’anniversaire", zone("r-msg", "messageAnniv", c.messageAnniv, 'rows="4"'), { hint: "{prenom}, {mouvement} et {verset} sont remplacés automatiquement." })}
      </fieldset>
      <fieldset class="fs"><legend>Données</legend>
        <p class="hint">Les exports restent sur votre appareil. Gardez-les en lieu sûr : ils contiennent des données personnelles.</p>
        <div class="btn-row">${accesRegistre() ? btn("export-membres", "Membres (CSV)", { ico: "i-down", sm: true }) : ""}${peutEcrire() && accesRegistre() ? btn("import-membres", "Importer des membres", { ico: "i-up", sm: true }) : ""}${accesRegistre() ? btn("export-tout", "Sauvegarde complète (JSON)", { ico: "i-down", sm: true }) : ""}</div>
      </fieldset>
      ${adm ? pied("Enregistrer les réglages") : `<div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Fermer</button></div>`}
    </form>`;
    ouvrir({ titre: "Réglages et données", html, wide: true, onSubmit: adm ? enregistrerReglages : null });
  }
  async function enregistrerReglages(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const liste = (k, def) => { const v = [...new Set(String(fd.get(k) || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean))]; return v.length ? v : def; };
    const c = cfg();
    const data = {
      nomCourt: g("nomCourt") || DEFAUTS.nomCourt, sousTitre: g("sousTitre") || DEFAUTS.sousTitre, nomOfficiel: g("nomOfficiel") || DEFAUTS.nomOfficiel,
      devise: g("devise"), ville: g("ville") || DEFAUTS.ville,
      poles: liste("poles", c.poles), statuts: liste("statuts", c.statuts), typesEvenement: liste("typesEvenement", c.typesEvenement), instances: liste("instances", c.instances),
      messageAnniv: g("messageAnniv") || DEFAUTS.messageAnniv,
    };
    if (accesFinances()) {
      const mo = g("siMois"), an = g("siAnnee");
      if ((mo && !an) || (!mo && an)) { erreurForm("Pour le solde de départ, choisissez le mois et l’année."); return; }
      data.soldeInitial = { montant: Number(g("siMontant").replace(/\D/g, "")) || 0, mois: mo && an ? `${an}-${mo}` : null };
      data.categoriesEntree = liste("categoriesEntree", c.categoriesEntree);
      data.categoriesSortie = liste("categoriesSortie", c.categoriesSortie);
      data.moyens = liste("moyens", c.moyens);
      const cm = g("cdMois"), ca = g("cdAnnee");
      if ((cm && !ca) || (!cm && ca)) { erreurForm("Pour le début des cotisations, choisissez le mois et l’année."); return; }
      data.cotisationMensuelle = Number(g("cotisationMensuelle").replace(/\D/g, "")) || 0;
      data.cotisationDebut = cm && ca ? `${ca}-${cm}` : data.cotisationMensuelle ? c.cotisationDebut || moisCourant() : null;
      data.signataire = g("signataire") || DEFAUTS.signataire;
      data.signataireTitre = g("signataireTitre") || DEFAUTS.signataireTitre;
      data.carteAnnee = Number(g("carteAnnee")) || null;
    }
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(() => S.db.doc("config/general").set({ ...(S.cfgDoc || {}), ...data, ...tampon() }), "Réglages enregistrés");
    if (ok) fermer(); else form.querySelector("[type=submit]").disabled = false;
  }

  /* ════════════════════════ Assiduité ════════════════════════ */
  function debutPeriode(code) {
    const d = new Date();
    if (code === "3m") d.setMonth(d.getMonth() - 3);
    else if (code === "6m") d.setMonth(d.getMonth() - 6);
    else if (code === "an") return `${d.getFullYear()}-01-01`;
    else return "0000-01-01";
    return isoJour(d);
  }
  const libPeriode = (code) => ({ "3m": "les trois derniers mois", "6m": "les six derniers mois", an: "cette année", tout: "depuis le début" })[code] || "";
  function evtsPeriode(code, type) {
    const deb = debutPeriode(code);
    return evenementsPointes().filter((e) => e.date >= deb && (!type || e.type === type));
  }
  function statsMembre(m, evts) {
    const ev = evts.filter((e) => !m.adhesion || e.date >= m.adhesion);
    let p = 0, r = 0, x = 0, a = 0;
    for (const e of ev) {
      const v = presentsEffectifs(e)[m.id];
      if (v === true) p += 1; else if (v === "retard") r += 1; else if (v === "excuse") x += 1; else a += 1;
    }
    const base = ev.length - x;
    return { n: ev.length, p, r, x, a, taux: base > 0 ? (p + r) / base : null };
  }
  function niveauAssiduite(taux) {
    if (taux == null) return { lib: "Sans données", cls: "" };
    if (taux >= 0.8) return { lib: "Excellent", cls: "ok" };
    if (taux >= 0.6) return { lib: "Régulier", cls: "info" };
    if (taux >= 0.3) return { lib: "Irrégulier", cls: "warn" };
    return { lib: "À relancer", cls: "danger" };
  }
  const pct = (t) => (t == null ? "—" : Math.round(t * 100) + " %");
  /* Signaux tirés du pointage : absences non justifiées d’affilée, retards répétés. Ce ne sont pas des sanctions. */
  function vigilances() {
    const pts = evenementsPointes();
    const deb = debutPeriode("3m");
    const out = [];
    for (const m of membresActifs()) {
      const evs = pts.filter((e) => !m.adhesion || e.date >= m.adhesion);
      let serie = 0;
      for (const e of evs) { const v = presentsEffectifs(e)[m.id]; if (estPresent(v) || v === "excuse") break; serie += 1; }
      const retards = evs.filter((e) => e.date >= deb && presentsEffectifs(e)[m.id] === "retard").length;
      const raisons = [];
      if (serie >= 3) raisons.push({ motif: MOTIFS_DISC[0], texte: `${serie} absences non justifiées d’affilée` });
      if (retards >= 3) raisons.push({ motif: MOTIFS_DISC[1], texte: `${retards} retards en trois mois` });
      if (raisons.length) out.push({ m, raisons });
    }
    return out;
  }
  function graphePresence(evts, petit) {
    const max = Math.max(1, ...evts.map(totalPresence));
    const resume = evts.map((e) => `${fmtCourt(e.date)} : ${totalPresence(e)} personnes`).join(" ; ");
    return `<div class="evchart${petit ? " sm" : ""}" role="img" aria-label="${esc(resume)}" style="grid-template-columns:repeat(${evts.length},minmax(0,1fr))">${evts.map((e) => {
      const mb = nbPresents(e), ext = compteur(e, "visiteurs") + compteur(e, "nouveaux");
      return `<div class="ev-col" title="${esc(`${e.titre} · ${fmtCourt(e.date)} : ${mb} membres, ${ext} visiteurs et nouveaux venus`)}"><b>${nb(mb + ext)}</b><div class="ev-bars"><i class="ext" style="height:${((ext / max) * 100).toFixed(1)}%"></i><i class="mb" style="height:${((mb / max) * 100).toFixed(1)}%"></i></div><span>${esc(fmtCourt(e.date))}</span></div>`;
    }).join("")}</div><div class="legend"><span><i class="mb"></i>Membres</span><span><i class="ext"></i>Visiteurs et nouveaux venus</span></div>`;
  }
  function rowAssiduite(m, s) {
    const nv = niveauAssiduite(s.taux);
    const compte = s.n - s.x;
    const detail = s.n ? `${s.p + s.r} présence${s.p + s.r > 1 ? "s" : ""} sur ${compte}${s.r ? ` · ${pluriel(s.r, "retard", "retards")}` : ""}${s.x ? ` · ${pluriel(s.x, "absence excusée", "absences excusées")}` : ""}` : "Aucun rassemblement pointé depuis son arrivée";
    return `<button class="row" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${esc(detail)}</span>${s.taux != null ? `<span class="bar slim ${nv.cls}" aria-hidden="true"><i style="width:${(s.taux * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r"><b class="taux">${pct(s.taux)}</b><span class="chip ${nv.cls}">${nv.lib}</span></span></button>`;
  }
  function vueAssiduite() {
    const c = cfg();
    const f = S.f.assiduite;
    if (!S.pret.membres) return chargement("Lecture du registre…");
    const evts = evtsPeriode(f.periode, f.type);
    let out = `<div class="filters"><div class="chips" role="group" aria-label="Période">${PERIODES.map(([id, l]) => `<button class="chip-btn${f.periode === id ? " on" : ""}" type="button" data-act="assid-periode" data-v="${id}" aria-pressed="${f.periode === id}">${l}</button>`).join("")}</div><label class="sr" for="f-assid-type">Type de rassemblement</label><select class="sel" id="f-assid-type" data-filtre="assiduite.type">${options(c.typesEvenement, f.type, "Tous les types")}</select><div class="btn-row">${btn("export-assiduite", `<span class="hide-s">Exporter</span>`, { ico: "i-down", cls: "btn-ghost ico-s", attrs: 'aria-label="Exporter la feuille de présence en CSV"' })}</div></div>`;
    if (!evts.length) return out + vide("i-ucheck", `Aucun rassemblement pointé sur ${esc(libPeriode(f.periode))}. Ouvrez un rassemblement de l’agenda et pointez les présences : l’assiduité de chaque membre se calcule ensuite toute seule.`, btn("sous", "Voir les rassemblements passés", { ico: "i-cal", sm: true, data: 'data-vue-cible="agenda" data-sous="passes"' }));
    const actifs = membresActifs();
    const stats = actifs.map((m) => ({ m, s: statsMembre(m, evts) }));
    const avec = stats.filter((x) => x.s.taux != null);
    const moyen = avec.length ? avec.reduce((t, x) => t + x.s.taux, 0) / avec.length : null;
    const presMoy = evts.reduce((t, e) => t + totalPresence(e), 0) / evts.length;
    const retards = evts.reduce((t, e) => t + nbEtat(e, "retard"), 0);
    const aRelancer = avec.filter((x) => x.s.taux < 0.3).length;
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">Taux moyen</span><span class="stat-v">${pct(moyen)}</span><span class="stat-m">Membres actifs</span></div>
      <div class="stat"><span class="stat-l">Rassemblements pointés</span><span class="stat-v">${nb(evts.length)}</span><span class="stat-m">${esc(cap(libPeriode(f.periode)))}</span></div>
      <div class="stat"><span class="stat-l">Présence moyenne</span><span class="stat-v">${nb(presMoy)}</span><span class="stat-m">Personnes par rassemblement</span></div>
      <div class="stat"><span class="stat-l">À relancer</span><span class="stat-v">${nb(aRelancer)}</span><span class="stat-m">${pluriel(retards, "retard", "retards")} au total</span></div></div>`;
    out += carte("Présence par rassemblement", graphePresence(evts.slice(0, 12).reverse(), false));
    const tri = stats.slice().sort((a, b) => (a.s.taux == null) - (b.s.taux == null) || (a.s.taux ?? 0) - (b.s.taux ?? 0) || parNom(a.m, b.m));
    out += `<h2 class="h3" style="margin-top:22px">Assiduité par membre</h2><p class="hint" style="margin:0 0 8px">Du moins assidu au plus assidu. Les absences excusées ne comptent pas contre le membre.</p><div class="list">${tri.map((x) => rowAssiduite(x.m, x.s)).join("")}</div>`;
    const cols = evts.slice(0, 10).reverse();
    out += `<h2 class="h3" style="margin-top:22px">Feuille de présence</h2><p class="hint" style="margin:0 0 8px">${pluriel(cols.length, "dernier rassemblement pointé", "derniers rassemblements pointés")}. P présent · R retard · E excusé · point : absent · tiret : pas encore membre.</p>
      <div class="table-wrap"><table class="t feuille"><thead><tr><th scope="col">Membre</th>${cols.map((e) => `<th scope="col" title="${esc(e.titre)}">${esc(fmtCourt(e.date))}</th>`).join("")}<th scope="col">Taux</th></tr></thead><tbody>${tri.map(({ m, s }) => `<tr><th scope="row">${esc(nomComplet(m))}</th>${cols.map((e) => {
        if (m.adhesion && e.date < m.adhesion) return `<td class="na">–</td>`;
        const v = presentsEffectifs(e)[m.id];
        return v === true ? `<td class="p">P</td>` : v === "retard" ? `<td class="r">R</td>` : v === "excuse" ? `<td class="e">E</td>` : `<td class="a">·</td>`;
      }).join("")}<td class="num">${pct(s.taux)}</td></tr>`).join("")}</tbody></table></div>`;
    return out;
  }
  function carteAssiduite() {
    const pied = `<button class="link" type="button" data-act="aller-assiduite">Ouvrir l’assiduité</button>`;
    if (!S.pret.membres || !S.pret.evenements) return carte("Assiduité", chargement("Analyse des présences…"));
    const evts = evtsPeriode("3m", "");
    if (!evts.length) return carte("Assiduité", `<p class="hint">Aucun rassemblement pointé depuis trois mois. Le taux d’assiduité apparaîtra après le premier pointage.</p>`, { pied });
    const stats = membresActifs().map((m) => statsMembre(m, evts)).filter((s) => s.taux != null);
    const moyen = stats.length ? stats.reduce((t, s) => t + s.taux, 0) / stats.length : null;
    const vig = accesDirection() && S.pret.discipline ? vigilances().filter((v) => !S.discipline.some((d) => d.membreId === v.m.id && mesureEnCours(d))).length : 0;
    const corps = `<p class="big-figure num">${pct(moyen)}<small>de taux moyen</small></p><p class="hint">Sur ${pluriel(evts.length, "rassemblement pointé", "rassemblements pointés")} depuis trois mois.</p>${graphePresence(evts.slice(0, 8).reverse(), true)}${vig ? `<p class="note warn" style="margin-bottom:0">${pluriel(vig, "point de vigilance", "points de vigilance")} : absences ou retards répétés. <button class="link" type="button" data-act="aller-discipline">Voir</button></p>` : ""}`;
    return carte("Assiduité", corps, { actions: `<span class="chip">3 mois</span>`, pied });
  }
  function blocAssiduite(m) {
    const pts = evenementsPointes().filter((e) => !m.adhesion || e.date >= m.adhesion);
    if (!pts.length) return `<p class="hint">Aucun rassemblement pointé pour l’instant.</p>`;
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    const nv = niveauAssiduite(s3.taux);
    const dots = pts.slice(0, 12).reverse().map((e) => {
      const v = presentsEffectifs(e)[m.id];
      const cls = v === true ? "p" : v === "retard" ? "r" : v === "excuse" ? "e" : "";
      const lib = v === true ? "présent" : v === "retard" ? "en retard" : v === "excuse" ? "absence excusée" : "absent";
      return `<i class="${cls}" title="${esc(`${fmtCourt(e.date)} · ${e.titre || ""} : ${lib}`)}"></i>`;
    }).join("");
    return `<p class="tally"><span><b>${pct(s3.taux)}</b> sur trois mois</span><span class="chip ${nv.cls}">${nv.lib}</span></p>
      <p class="hint">${s3.n ? `${pluriel(s3.p + s3.r, "présence", "présences")} sur ${pluriel(s3.n - s3.x, "rassemblement compté", "rassemblements comptés")}${s3.r ? `, dont ${pluriel(s3.r, "retard", "retards")}` : ""}${s3.x ? ` · ${pluriel(s3.x, "absence excusée", "absences excusées")}` : ""}.` : "Aucun rassemblement pointé depuis trois mois."}</p>
      <div class="dots" role="img" aria-label="${esc(`${Math.min(12, pts.length)} derniers rassemblements pointés`)}">${dots}</div>
      <div class="legend"><span><i class="d-p"></i>Présent</span><span><i class="d-r"></i>Retard</span><span><i class="d-e"></i>Excusé</span><span><i class="d-a"></i>Absent</span></div>`;
  }
  function exporterAssiduite() {
    const f = S.f.assiduite;
    const evts = evtsPeriode(f.periode, f.type).slice().reverse();
    const rows = [["Matricule", "Nom", "Prénoms", ...evts.map((e) => `${e.date.split("-").reverse().join("/")} ${e.titre || ""}`.trim()), "Présences", "Retards", "Excusés", "Absences", "Taux"]];
    membresActifs().forEach((m) => {
      const s = statsMembre(m, evts);
      rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", ...evts.map((e) => {
        if (m.adhesion && e.date < m.adhesion) return "";
        const v = presentsEffectifs(e)[m.id];
        return v === true ? "P" : v === "retard" ? "R" : v === "excuse" ? "E" : "A";
      }), String(s.p), String(s.r), String(s.x), String(s.a), s.taux == null ? "" : Math.round(s.taux * 100) + " %"]);
    });
    telecharger(`assiduite-${aujourdhui()}.csv`, versCSV(rows));
  }

  /* ════════════════════════ Cotisations ════════════════════════ */
  const cleCotis = (mid, annee) => `${mid}-${annee}`;
  const ledger = (mid, annee) => S.cotisations[cleCotis(mid, annee)] || null;
  function moisPayes(mid, annee) {
    const l = ledger(mid, annee);
    const o = {};
    if (l && l.mois) for (const [k, v] of Object.entries(l.mois)) if (v && typeof v === "object") o[k] = v;
    return o;
  }
  function moisDus(m, annee) {
    if (m.cotisationExempte) return [];
    const c = cfg();
    if (!Number(c.cotisationMensuelle) && !c.cotisationDebut) return [];
    let debut = `${annee}-01`;
    if (c.cotisationDebut && c.cotisationDebut > debut) debut = c.cotisationDebut;
    if (m.adhesion && m.adhesion.slice(0, 7) > debut) debut = m.adhesion.slice(0, 7);
    const fin = `${annee}-12` < moisCourant() ? `${annee}-12` : moisCourant();
    const out = [];
    for (let k = 1; k <= 12; k += 1) { const cle = `${annee}-${pad(k)}`; if (cle >= debut && cle <= fin) out.push(pad(k)); }
    return out;
  }
  function etatCotis(m, annee) {
    const payes = moisPayes(m.id, annee);
    const dus = moisDus(m, annee);
    return { payes, dus, retard: dus.filter((k) => !payes[k]), verse: Object.values(payes).reduce((t, v) => t + (Number(v.montant) || 0), 0), exempt: !!m.cotisationExempte };
  }
  const libMois = (k) => MOIS_NOMS[Number(k) - 1] || "";
  function libListeMois(ks, annee) {
    const s = (ks || []).slice().sort();
    if (!s.length) return "";
    if (s.length === 1) return `${libMois(s[0])} ${annee}`;
    const suite = s.every((k, i) => i === 0 || Number(k) === Number(s[i - 1]) + 1);
    if (suite && s.length > 2) return `${libMois(s[0])} à ${libMois(s[s.length - 1])} ${annee}`;
    return `${s.slice(0, -1).map(libMois).join(", ")} et ${libMois(s[s.length - 1])} ${annee}`;
  }
  function cellulesCotis(e, annee, grand) {
    return `<span class="cot-mois${grand ? " lg" : ""}" aria-hidden="true">${MOIS_INI.map((l, i) => {
      const k = pad(i + 1);
      const cls = e.payes[k] ? "ok" : e.exempt ? "ex" : e.dus.includes(k) ? "du" : `${annee}-${k}` > moisCourant() ? "fut" : "na";
      return `<i class="${cls}">${l}</i>`;
    }).join("")}</span>`;
  }
  const chipCotis = (e) => (e.exempt ? `<span class="chip">Exemption</span>` : e.retard.length ? `<span class="chip danger">${e.retard.length} mois ${e.retard.length > 1 ? "dus" : "dû"}</span>` : e.dus.length ? `<span class="chip ok">À jour</span>` : `<span class="chip">Rien de dû</span>`);
  function rowCotis(m, annee) {
    const e = etatCotis(m, annee);
    return `<button class="row nolead" type="button" data-act="voir-cotis" data-id="${esc(m.id)}"><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${cellulesCotis(e, annee)}<span class="sr">${esc(`${Object.keys(e.payes).length} mois réglés, ${e.retard.length} en retard`)}</span></span><span class="row-r">${chipCotis(e)}<span class="amt">${nb(e.verse)}</span></span></button>`;
  }
  function vueCotisations() {
    const c = cfg();
    const an = S.annee;
    const adm = peutAdmin();
    const curY = new Date().getFullYear();
    let out = `<div class="toolbar"><div class="mnav"><button class="icon-btn" type="button" data-act="annee-prec" aria-label="Année précédente">${I("i-left")}</button><span class="mnav-l" aria-live="polite">Année ${an}</span><button class="icon-btn" type="button" data-act="annee-suiv" aria-label="Année suivante"${an >= curY + 1 ? " disabled" : ""}>${I("i-right")}</button></div><div class="btn-row">${adm ? btn("ajout-cotis", "Enregistrer une cotisation", { ico: "i-plus", cls: "btn-primary" }) : ""}${btn("export-cotis", `<span class="hide-s">Exporter</span>`, { ico: "i-down", cls: "btn-ghost ico-s", attrs: 'aria-label="Exporter les cotisations en CSV"' })}</div></div>`;
    if (!S.pret.cotisations || !S.pret.membres) return out + chargement("Lecture des cotisations…");
    const mens = Number(c.cotisationMensuelle) || 0;
    out += mens
      ? `<p class="hint" style="margin:0 0 12px">Cotisation mensuelle : <b>${esc(fcfa(mens))}</b>${c.cotisationDebut ? `, due depuis ${esc(fmtMois(c.cotisationDebut))}` : ""}.</p>`
      : `<p class="note warn">Le montant de la cotisation mensuelle n’est pas encore défini : aucun mois n’est compté comme dû, mais les versements peuvent déjà être enregistrés. ${adm ? `<button class="link" type="button" data-act="reglages">Définir le montant</button>` : "Un éditeur peut le définir dans les réglages."}</p>`;
    const actifs = membresActifs();
    const etats = actifs.map((m) => ({ m, e: etatCotis(m, an) }));
    const verse = etats.reduce((t, x) => t + x.e.verse, 0);
    const aJour = etats.filter((x) => !x.e.exempt && x.e.dus.length && !x.e.retard.length).length;
    const enRet = etats.filter((x) => x.e.retard.length).length;
    const dusTot = etats.reduce((t, x) => t + x.e.dus.length, 0);
    const regles = etats.reduce((t, x) => t + x.e.dus.filter((k) => x.e.payes[k]).length, 0);
    const reste = mens ? etats.reduce((t, x) => t + x.e.retard.length, 0) * mens : null;
    out += `<div class="stats s4">
      <div class="stat in"><span class="stat-l">${I("i-in")}Collecté en ${an}</span><span class="stat-v">${nb(verse)}<small>FCFA</small></span><span class="stat-m">${pluriel(etats.reduce((t, x) => t + Object.keys(x.e.payes).length, 0), "mois réglé", "mois réglés")}</span></div>
      <div class="stat"><span class="stat-l">À jour</span><span class="stat-v">${nb(aJour)}</span><span class="stat-m">sur ${pluriel(actifs.length, "membre actif", "membres actifs")}</span></div>
      <div class="stat out"><span class="stat-l">En retard</span><span class="stat-v">${nb(enRet)}</span><span class="stat-m">${reste != null ? `${esc(fcfa(reste))} à recouvrer` : "Montant non défini"}</span></div>
      <div class="stat"><span class="stat-l">Recouvrement</span><span class="stat-v">${pct(dusTot ? regles / dusTot : null)}</span><span class="stat-m">Des mois dus, réglés</span></div></div>`;
    const f = S.f.cotis;
    out += `<div class="filters"><div class="chips" role="group" aria-label="Filtrer les membres">${[["tous", "Tous"], ["retard", "En retard"], ["ajour", "À jour"]].map(([id, l]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="cotis-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l}</button>`).join("")}</div><label class="sr" for="q-cotis">Rechercher un membre</label><input class="search" id="q-cotis" type="search" placeholder="Nom ou matricule…" value="${esc(f.q)}" data-filtre="cotis.q" autocomplete="off"></div>
      <div class="legend" style="margin:-4px 0 10px"><span><i class="c-ok"></i>Réglé</span><span><i class="c-du"></i>Dû</span><span><i class="c-fut"></i>À venir</span><span><i class="c-na"></i>Non dû</span></div>`;
    if (!actifs.length) return out + vide("i-users", "Aucun membre actif dans le registre.");
    const q = norm(f.q);
    const liste = etats.filter((x) => (f.filtre === "retard" ? x.e.retard.length : f.filtre === "ajour" ? !x.e.retard.length && !x.e.exempt && x.e.dus.length : true) && (!q || norm(nomComplet(x.m) + " " + (x.m.matricule || "")).includes(q)))
      .sort((a, b) => b.e.retard.length - a.e.retard.length || parNom(a.m, b.m));
    if (!liste.length) return out + vide("i-search", "Aucun membre ne correspond.");
    return out + `<div class="list">${liste.map((x) => rowCotis(x.m, an)).join("")}</div>`;
  }
  function ficheCotis(mid) {
    const m = membre(mid);
    if (!m) return null;
    const an = S.annee;
    const e = etatCotis(m, an);
    const mens = Number(cfg().cotisationMensuelle) || 0;
    const lignes = Object.entries(e.payes).sort((a, b) => cmpFr(a[0], b[0])).map(([k, v]) => `<div class="kv-l"><span>${esc(cap(libMois(k)))} ${an}</span><span class="num">${esc(fcfa(v.montant))} · versé le ${esc(fmtCourt(v.date))}</span></div>`).join("");
    return `<div class="ident">${avatar(m, true)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc([m.matricule, m.fonction].filter(Boolean).join(" · "))}</p></div></div>
      <div class="figure">${chipCotis(e)}${e.retard.length ? `<span>${esc(cap(libListeMois(e.retard, an)))}</span>` : ""}</div>
      ${cellulesCotis(e, an, true)}
      <h3 class="h3">Versements ${an}</h3>${lignes ? `<div class="kvl">${lignes}</div>` : `<p class="hint">Aucun versement enregistré pour ${an}.</p>`}
      <p class="hint" style="margin-top:8px">Total versé : <b>${esc(fcfa(e.verse))}</b>${mens && e.retard.length ? ` · reste dû : <b>${esc(fcfa(e.retard.length * mens))}</b>` : ""}.</p>
      <div class="actions">${peutAdmin() ? btn("ajout-cotis", "Enregistrer une cotisation", { ico: "i-plus", cls: "btn-primary", data: `data-id="${esc(m.id)}" data-annee="${an}"` }) : ""}${e.retard.length ? btn("relance-cotis", "Relancer sur WhatsApp", { ico: "i-msg", data: `data-id="${esc(m.id)}" data-annee="${an}"` }) : ""}${btn("voir-membre", "Fiche du membre", { ico: "i-users", data: `data-id="${esc(m.id)}"` })}</div>`;
  }
  const ouvrirCotis = (mid) => ouvrir({ titre: "Cotisations", refresh: surveiller(() => ficheCotis(mid)) });
  const categorieCotis = () => cfg().categoriesEntree.find((x) => norm(x).startsWith("cotisation")) || "Cotisations";
  function ouvrirFormCotis(mid, annee) {
    const c = cfg();
    const curY = new Date().getFullYear();
    const an = annee || S.annee;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m) + (m.matricule ? ` · ${m.matricule}` : "")]);
    const html = `<form class="form" id="f-cotis" novalidate>
      ${champ("c-membre", "Membre", sel("c-membre", "membreId", mbs, mid || "", "Choisir un membre", "required"), { req: true })}
      <div class="f2">${champ("c-annee", "Année des mois réglés", sel("c-annee", "annee", [curY - 1, curY, curY + 1].map((y) => [String(y), String(y)]), String(an), null))}${champ("c-date", "Date du versement", inp("c-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="field"><span class="lab" id="lab-cm">Mois réglés</span><div class="mois-choix" id="c-mois" role="group" aria-labelledby="lab-cm"></div><p class="hint" id="c-mois-hint">Choisissez d’abord le membre.</p></div>
      <div class="f2">${champ("c-montant", "Montant total (FCFA)", inp("c-montant", "montant", "", 'class="inp big" inputmode="numeric" autocomplete="off" placeholder="0" required'), { req: true })}${champ("c-moyen", "Moyen de paiement", sel("c-moyen", "moyen", c.moyens, c.moyens[0], null))}</div>
      ${champ("c-piece", "N° de pièce ou référence", inp("c-piece", "piece", "", 'autocomplete="off" placeholder="Reçu, transaction Mobile Money…"'))}
      <p class="hint">Le versement entre aussi dans le journal de caisse, dans la catégorie « ${esc(categorieCotis())} ».</p>
      ${pied("Enregistrer la cotisation")}
    </form>`;
    ouvrir({
      titre: "Enregistrer une cotisation", html, wide: true, onSubmit: enregistrerCotis,
      apres: (sheet) => {
        const maj = () => majChoixMois(sheet);
        sheet.querySelector("#c-membre").addEventListener("change", maj);
        sheet.querySelector("#c-annee").addEventListener("change", maj);
        sheet.querySelector("#c-mois").addEventListener("change", () => majMontantCotis(sheet, false));
        const mt = sheet.querySelector("#c-montant");
        mt.addEventListener("input", () => { mt.dataset.manuel = "1"; });
        mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); });
        mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; });
        maj();
      },
    });
  }
  function majChoixMois(sheet) {
    const m = membre(sheet.querySelector("#c-membre").value);
    const an = Number(sheet.querySelector("#c-annee").value);
    const box = sheet.querySelector("#c-mois");
    const hint = sheet.querySelector("#c-mois-hint");
    if (!m) { box.innerHTML = ""; hint.textContent = "Choisissez d’abord le membre."; majMontantCotis(sheet, true); return; }
    const e = etatCotis(m, an);
    let propose = e.retard[0];
    if (!propose) for (let k = 1; k <= 12 && !propose; k += 1) { const kk = pad(k); if (!e.payes[kk] && `${an}-${kk}` >= moisCourant()) propose = kk; }
    box.innerHTML = MOIS_ABR.map((n, i) => {
      const k = pad(i + 1);
      const paye = !!e.payes[k];
      const du = e.retard.includes(k);
      return `<label class="mc${paye ? " paye" : ""}${du ? " du" : ""}"><input type="checkbox" name="mois" value="${k}"${paye ? " disabled" : ""}${k === propose ? " checked" : ""}><span>${esc(n)}</span><small>${paye ? "réglé" : du ? "dû" : " "}</small></label>`;
    }).join("");
    hint.textContent = e.exempt ? "Ce membre bénéficie d’une exemption de cotisation ; un versement reste possible." : e.retard.length ? `${pluriel(e.retard.length, "mois dû", "mois dus")} : ${libListeMois(e.retard, an)}.` : "Aucun mois en retard pour cette année.";
    majMontantCotis(sheet, true);
  }
  function majMontantCotis(sheet, force) {
    const mt = sheet.querySelector("#c-montant");
    const n = sheet.querySelectorAll("#c-mois input:checked").length;
    const mens = Number(cfg().cotisationMensuelle) || 0;
    if (mens && (force || !mt.dataset.manuel)) { mt.value = n ? nb(n * mens) : ""; delete mt.dataset.manuel; }
  }
  async function majLedger(mid, an, entrees) {
    return enFile("cotis:" + cleCotis(mid, an), async () => {
      const ref = S.db.doc(`cotisations/${cleCotis(mid, an)}`);
      const cur = await ref.get();
      if (cur.exists) await ref.update({ mois: entrees, ...tampon() });
      else await ref.set({ membreId: mid, annee: an, mois: entrees, ...creation() });
    });
  }
  async function enregistrerCotis(fd, form) {
    const mid = String(fd.get("membreId") || "");
    const m = membre(mid);
    if (!m) { erreurForm("Choisissez le membre."); return; }
    const an = Number(fd.get("annee"));
    const mois = fd.getAll("mois").map(String).sort();
    if (!mois.length) { erreurForm("Cochez au moins un mois réglé."); return; }
    const montant = Number(String(fd.get("montant") || "").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant versé."); $("#c-montant").focus(); return; }
    const date = String(fd.get("date") || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > aujourdhui()) { erreurForm("Indiquez une date de versement valide, au plus tard aujourd’hui."); return; }
    const cle = date.slice(0, 7);
    if (moisClos(cle)) { erreurForm(`${cap(fmtMois(cle))} est clôturé dans la caisse : choisissez une date dans un mois ouvert.`); return; }
    const deja = mois.filter((k) => moisPayes(mid, an)[k]);
    if (deja.length) { erreurForm(`${cap(libListeMois(deja, an))} : déjà réglé.`); return; }
    form.querySelector("[type=submit]").disabled = true;
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const parMois = Math.round(montant / mois.length);
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: categorieCotis(), moyen: String(fd.get("moyen") || ""), libelle: `Cotisation ${libListeMois(mois, an)} · ${nomComplet(m)}`, membreId: mid, evenementId: null, piece: String(fd.get("piece") || "").trim(), cotisation: { annee: an, mois }, annule: false, ...creation() });
      await majLedger(mid, an, Object.fromEntries(mois.map((k) => [k, { montant: parMois, date, opId: opRef.id, opMois: cle }])));
    }, `Cotisation enregistrée : ${libListeMois(mois, an)}`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    S.annee = an;
    ouvrirCotis(mid);
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  /* Une cotisation annulée libère ses mois ; rétablie, elle les reprend s’ils sont encore libres. */
  async function synchroCotisOp(op, annule) {
    if (!op || !op.cotisation || !op.membreId) return;
    const an = op.cotisation.annee, mois = op.cotisation.mois || [];
    const l = ledger(op.membreId, an);
    const entrees = {};
    let pris = 0;
    for (const k of mois) {
      const v = l && l.mois ? l.mois[k] : null;
      if (annule) { if (v && v.opId === op.id) entrees[k] = null; }
      else if (!v || v.opId === op.id) entrees[k] = { montant: Math.round((Number(op.montant) || 0) / mois.length), date: op.date, opId: op.id, opMois: op.mois };
      else pris += 1;
    }
    if (Object.keys(entrees).length) await majLedger(op.membreId, an, entrees);
    if (pris) toast(`${pluriel(pris, "mois a", "mois ont")} été réglé${pris > 1 ? "s" : ""} entre-temps : la cotisation rétablie ne les reprend pas.`, "err");
  }
  function messageRelance(m, e, an) {
    const c = cfg();
    const mens = Number(c.cotisationMensuelle) || 0;
    return `Bonjour ${prenomUsuel(m)}, que la grâce de Dieu soit avec toi. Petit rappel fraternel : ta cotisation au mouvement ${c.nomCourt} pour ${libListeMois(e.retard, an)} reste à régler${mens ? ` (${fcfa(e.retard.length * mens)})` : ""}. Merci pour ta fidélité et ton engagement !`;
  }
  function carteCotis() {
    const pied = `<button class="link" type="button" data-act="aller-cotis">Ouvrir les cotisations</button>`;
    if (!S.pret.cotisations || !S.pret.membres) return carte("Cotisations", chargement("Lecture des cotisations…"));
    const an = new Date().getFullYear();
    const etats = membresActifs().map((m) => etatCotis(m, an));
    const verse = etats.reduce((t, e) => t + e.verse, 0);
    const enRet = etats.filter((e) => e.retard.length).length;
    const aJour = etats.filter((e) => !e.exempt && e.dus.length && !e.retard.length).length;
    const mens = Number(cfg().cotisationMensuelle) || 0;
    return carte("Cotisations", `<p class="big-figure num">${nb(verse)}<small>FCFA en ${an}</small></p><div class="split"><div><span>À jour</span><b>${nb(aJour)}</b></div><div><span>En retard</span><b>${nb(enRet)}</b></div><div><span>Par mois</span><b>${mens ? nb(mens) : "—"}</b></div></div>${mens ? "" : `<p class="hint" style="margin-top:10px">Montant mensuel à définir dans les réglages.</p>`}`, { pied });
  }
  function exporterCotis() {
    const an = S.annee;
    const rows = [["Matricule", "Nom", "Prénoms", ...MOIS_NOMS.map(cap), "Total versé (FCFA)", "Mois dus non réglés"]];
    membresActifs().forEach((m) => {
      const e = etatCotis(m, an);
      rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", ...MOIS_NOMS.map((_, i) => { const k = pad(i + 1); return e.payes[k] ? String(e.payes[k].montant) : e.exempt ? "exemption" : e.retard.includes(k) ? "dû" : ""; }), String(e.verse), String(e.retard.length)]);
    });
    telecharger(`cotisations-${an}.csv`, versCSV(rows));
  }

  /* ════════════════════════ Discipline ════════════════════════ */
  const mesureEnCours = (d) => d.statut !== "Levée";
  function rowDisc(d) {
    const m = membre(d.membreId);
    const meta = [d.motif, d.date ? fmtCourt(d.date) : "", d.echeance ? `jusqu’au ${fmtCourt(d.echeance)}` : ""].filter(Boolean).join(" · ");
    return `<button class="row" type="button" data-act="voir-disc" data-id="${esc(d.id)}">${m ? avatar(m) : `<span class="av" aria-hidden="true">?</span>`}<span class="row-main"><span class="row-t">${esc(m ? nomComplet(m) : "Membre supprimé")}</span><span class="row-m">${esc(meta)}</span></span><span class="row-r"><span class="chip ${mesureEnCours(d) ? "warn" : ""}">${esc(d.mesure || "Mesure")}</span>${mesureEnCours(d) ? "" : `<span class="chip ok">Levée</span>`}</span></button>`;
  }
  function vueDiscipline() {
    if (!S.pret.discipline || !S.pret.evenements) return chargement("Lecture du registre de discipline…");
    const adm = peutAdmin();
    let out = `<p class="note">${I("i-lock")} Registre confidentiel : seuls le propriétaire et les éditeurs y ont accès. Une mesure reste visible sur la fiche du membre jusqu’à sa levée.</p>`;
    const vig = vigilances().filter((v) => !S.discipline.some((d) => d.membreId === v.m.id && mesureEnCours(d)));
    if (vig.length) out += `<h2 class="h3">Points de vigilance</h2><p class="hint" style="margin:0 0 8px">Tirés du pointage des présences. Un entretien pastoral précède souvent toute mesure.</p><div class="list">${vig.map((v) => `<div class="row nolead"><span class="row-main"><span class="row-t">${esc(nomComplet(v.m))}</span><span class="row-m">${esc(v.raisons.map((r) => r.texte).join(" · "))}</span></span><span class="row-r"><span class="btn-row">${btn("voir-membre", "Fiche", { sm: true, data: `data-id="${esc(v.m.id)}"` })}${adm ? btn("ajout-disc", "Mesure", { ico: "i-plus", sm: true, data: `data-id="${esc(v.m.id)}" data-motif="${esc(v.raisons[0].motif)}"` }) : ""}</span></span></div>`).join("")}</div>`;
    const f = S.f.discipline;
    const enC = S.discipline.filter(mesureEnCours), lev = S.discipline.filter((d) => !mesureEnCours(d));
    out += `<div class="toolbar" style="margin-top:18px"><div class="chips" role="group" aria-label="Statut des mesures">${[["encours", `En cours (${enC.length})`], ["levees", `Levées (${lev.length})`]].map(([id, l]) => `<button class="chip-btn${f.statut === id ? " on" : ""}" type="button" data-act="disc-statut" data-v="${id}" aria-pressed="${f.statut === id}">${l}</button>`).join("")}</div>${adm ? btn("ajout-disc", "Nouvelle mesure", { ico: "i-plus", cls: "btn-primary" }) : ""}</div>`;
    const liste = f.statut === "levees" ? lev : enC;
    if (!liste.length) return out + vide("i-scroll", f.statut === "levees" ? "Aucune mesure levée pour l’instant." : "Aucune mesure disciplinaire en cours.");
    return out + `<div class="list">${liste.map(rowDisc).join("")}</div>`;
  }
  function blocDiscipline(m) {
    const ds = S.discipline.filter((d) => d.membreId === m.id);
    const enC = ds.filter(mesureEnCours);
    return `${enC.length ? `<div class="list">${enC.map(rowDisc).join("")}</div>` : `<p class="hint">Aucune mesure en cours.</p>`}${ds.length > enC.length ? `<p class="hint" style="margin-top:6px">${pluriel(ds.length - enC.length, "mesure levée", "mesures levées")} dans l’historique.</p>` : ""}${peutAdmin() ? `<div class="btn-row" style="margin-top:8px">${btn("ajout-disc", "Nouvelle mesure", { ico: "i-plus", sm: true, data: `data-id="${esc(m.id)}"` })}</div>` : ""}`;
  }
  function ouvrirFormDisc(id, mid, motif) {
    const d = id ? S.discipline.find((x) => x.id === id) : {};
    if (id && !d) return;
    const mbs = S.membres.slice().sort(parNom).map((m) => [m.id, nomComplet(m) + (m.actif === false ? " (archivé)" : "")]);
    const html = `<form class="form" id="f-disc" novalidate>
      ${champ("di-membre", "Membre", sel("di-membre", "membreId", mbs, d.membreId || mid || "", "Choisir un membre", "required"), { req: true })}
      <div class="f2">${champ("di-date", "Date", inp("di-date", "date", d.date || aujourdhui(), 'type="date" required'), { req: true })}${champ("di-motif", "Motif", sel("di-motif", "motif", MOTIFS_DISC, d.motif || motif || MOTIFS_DISC[0], null))}</div>
      <div class="f2">${champ("di-mesure", "Mesure", sel("di-mesure", "mesure", MESURES_DISC, d.mesure || MESURES_DISC[0], null))}${champ("di-ech", "Jusqu’au", inp("di-ech", "echeance", d.echeance, 'type="date"'), { hint: "Facultatif : fin prévue de la mesure." })}</div>
      ${champ("di-desc", "Faits et décision", zone("di-desc", "description", d.description, 'rows="4" placeholder="Ce qui s’est passé, l’entretien mené, ce qui a été décidé…"'))}
      ${champ("di-par", "Décidée par", inp("di-par", "decidePar", d.decidePar || "Directoire", 'autocomplete="off"'))}
      ${pied(id ? "Enregistrer les modifications" : "Inscrire la mesure")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la mesure" : "Nouvelle mesure", html, wide: true, onSubmit: (fd, form) => enregistrerDisc(fd, form, id) });
  }
  async function enregistrerDisc(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!membre(g("membreId"))) { erreurForm("Choisissez le membre concerné."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g("date"))) { erreurForm("Indiquez la date."); return; }
    if (g("echeance") && g("echeance") < g("date")) { erreurForm("La fin de la mesure doit suivre sa date."); return; }
    const data = { membreId: g("membreId"), date: g("date"), motif: g("motif"), mesure: g("mesure"), echeance: g("echeance"), description: g("description"), decidePar: g("decidePar") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("discipline/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("discipline").doc(); await ref.set({ ...data, statut: "En cours", ...creation() }); }
    }, id ? "Mesure modifiée" : "Mesure inscrite au registre");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirDisc(id || ref.id);
  }
  function ficheDisc(id) {
    const d = S.discipline.find((x) => x.id === id);
    if (!d) return null;
    const m = membre(d.membreId);
    const adm = peutAdmin();
    return `<div class="figure"><span class="chip ${mesureEnCours(d) ? "warn" : ""}">${esc(d.mesure || "Mesure")}</span>${mesureEnCours(d) ? `<span class="chip">En cours</span>` : `<span class="chip ok">Levée</span>`}</div>
      ${kv([["Membre", m ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button>` : "Membre supprimé"], ["Date", d.date ? esc(fmtJour(d.date)) : ""], ["Motif", esc(d.motif || "")], ["Jusqu’au", d.echeance ? esc(`${fmtJour(d.echeance)} (${relLong(d.echeance)})`) : ""], ["Faits et décision", d.description ? `<span style="white-space:pre-wrap">${esc(d.description)}</span>` : ""], ["Décidée par", esc(d.decidePar || "")], ["Levée", !mesureEnCours(d) ? esc([d.leveeLe ? fmtStamp(d.leveeLe) : "", d.leveePar ? "par " + nomDe(d.leveePar) : ""].filter(Boolean).join(" ")) : ""], ["Inscrite", esc([d.creeLe ? fmtStamp(d.creeLe) : "", d.creePar ? "par " + nomDe(d.creePar) : ""].filter(Boolean).join(" "))]])}
      ${adm ? `<div class="actions">${mesureEnCours(d) ? btn("lever-disc", "Lever la mesure", { ico: "i-check", cls: "btn-primary", data: `data-id="${esc(d.id)}"` }) : btn("reprendre-disc", "Remettre en cours", { ico: "i-undo", data: `data-id="${esc(d.id)}"` })}${btn("editer-disc", "Modifier", { ico: "i-edit", data: `data-id="${esc(d.id)}"` })}${btn("supprimer-disc", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(d.id)}"` })}</div>` : ""}`;
  }
  const ouvrirDisc = (id) => ouvrir({ titre: "Mesure disciplinaire", refresh: surveiller(() => ficheDisc(id)) });

  /* ════════════════════════ Photos ════════════════════════ */
  async function televerserPhoto(input) {
    const mid = input.dataset.mid;
    const file = input.files && input.files[0];
    input.value = "";
    const m = membre(mid);
    if (!file || !m || !S.assets) return;
    if (!/^image\//.test(file.type)) { toast("Choisissez une image (JPEG ou PNG).", "err"); return; }
    S.attente += 1; majSync();
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.86));
      const res = await S.assets.upload(blob, { type: "image/jpeg" });
      const ancien = m.photoId;
      await S.db.doc("membres/" + mid).update({ photoId: res.id, ...tampon() });
      if (ancien) { try { await S.assets.delete(ancien); } catch (e) { /* l’ancienne photo reste stockée */ } }
      toast("Photo enregistrée");
    } catch (e) {
      const code = e && e.code;
      toast(code === "too_large" ? "Image trop lourde : choisissez une photo plus légère." : code === "quota_or_state" ? "L’espace de stockage des photos est plein." : code === "not_granted" || code === "capability_disabled" ? "L’ajout de photos n’est pas disponible pour votre accès." : "La photo n’a pas pu être enregistrée.", "err");
    } finally { S.attente -= 1; majSync(); }
  }

  /* ════════════════════════ Cartes de membre ════════════════════════ */
  const libs = {};
  function chargerScript(url) {
    if (!libs[url]) {
      libs[url] = new Promise((ok, ko) => {
        const sc = document.createElement("script");
        sc.src = url; sc.async = true;
        sc.onload = () => ok();
        sc.onerror = () => { delete libs[url]; sc.remove(); ko(Object.assign(new Error("bibliotheque"), { code: "bibliotheque" })); };
        document.head.appendChild(sc);
      });
    }
    return libs[url];
  }
  let logoImg = null;
  function imageLogo() {
    if (!logoImg) {
      logoImg = new Promise((ok) => {
        const el = document.querySelector(".logo");
        const bg = el ? getComputedStyle(el).backgroundImage : "";
        const r = /url\(["']?(.*?)["']?\)\s*$/.exec(bg);
        if (!r) { ok(null); return; }
        const im = new Image();
        im.onload = () => ok(im); im.onerror = () => ok(null);
        im.src = r[1];
      });
    }
    return logoImg;
  }
  async function polices() {
    if (!document.fonts || !document.fonts.load) return;
    const att = Promise.all(['700 48px "Saira Condensed"', '600 24px "Saira Condensed"', '400 52px "Great Vibes"', '400 22px "Atkinson Hyperlegible"', '700 22px "Atkinson Hyperlegible"'].map((f) => document.fonts.load(f).catch(() => null)));
    await Promise.race([att, sleep(3000)]);
  }
  const anneeCarte = () => Number(cfg().carteAnnee) || new Date().getFullYear();
  async function codeControle(m, annee) {
    const txt = `S.D.E.|${m.matricule || m.id}|${String(m.nom || "").toUpperCase()}|${m.prenoms || ""}|${annee}`;
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch (e) { return (hash(txt) >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(-6); }
  }
  async function photoBitmap(m) {
    if (!m.photoId) return null;
    try { const r = await fetch("/_blob/" + m.photoId); if (!r.ok) return null; return await createImageBitmap(await r.blob()); } catch (e) { return null; }
  }
  function arrondi(x, l, t, w, hh, r) {
    x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + hh, r); x.arcTo(l + w, t + hh, l, t + hh, r); x.arcTo(l, t + hh, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }
  function ecrireAjuste(x, texte, l, t, max, taille, police, min = 14) {
    let tt = taille;
    x.font = police.replace("{t}", tt);
    while (x.measureText(texte).width > max && tt > min) { tt -= 1; x.font = police.replace("{t}", tt); }
    x.fillText(texte, l, t);
  }
  const espacer = (x, v) => { if ("letterSpacing" in x) x.letterSpacing = v; };
  async function rendreCarte(m) {
    await Promise.all([polices(), chargerScript(LIB_QR)]);
    const c = cfg();
    const an = anneeCarte();
    const code = await codeControle(m, an);
    const [logo, photo] = await Promise.all([imageLogo(), photoBitmap(m)]);
    const W = 1012, H = 638;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const OR = "#d4ad48", OR_CLAIR = "#e2c26a", NUIT = "#0f1e3d", BRUME = "#b8c1d8";
    const COND = '"Saira Condensed", "Arial Narrow", sans-serif', CORPS = '"Atkinson Hyperlegible", Arial, sans-serif';
    // Fond
    x.save(); arrondi(x, 0, 0, W, H, 34); x.clip();
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, NUIT); g.addColorStop(1, "#1b2f5b");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (logo) { x.globalAlpha = 0.06; x.drawImage(logo, W - 400, H - 360, 500, 500); x.globalAlpha = 1; }
    x.restore();
    x.strokeStyle = OR; x.lineWidth = 3; arrondi(x, 16, 16, W - 32, H - 32, 24); x.stroke();
    x.strokeStyle = "rgba(212,173,72,.42)"; x.lineWidth = 1; arrondi(x, 24, 24, W - 48, H - 48, 19); x.stroke();
    // En-tête
    if (logo) x.drawImage(logo, 42, 38, 116, 116);
    const off = c.nomOfficiel || "";
    const i = off.toLowerCase().indexOf("soldats");
    const l1 = (i > 0 ? off.slice(0, i) : "Mouvement").trim().toUpperCase();
    const l2 = (i > 0 ? off.slice(i) : off || c.nomCourt).trim().toUpperCase();
    x.textBaseline = "alphabetic"; x.textAlign = "left";
    x.font = `700 21px ${COND}`; espacer(x, "3px");
    const lib = "CARTE DE MEMBRE";
    const lw = x.measureText(lib).width + 34;
    const maxEntete = W - 44 - lw - 24 - 176;
    x.fillStyle = OR_CLAIR; espacer(x, "3px"); ecrireAjuste(x, l1, 176, 78, maxEntete, 21, `600 {t}px ${COND}`, 12);
    x.fillStyle = "#ffffff"; espacer(x, "1px"); ecrireAjuste(x, l2, 176, 124, 520, 44, `700 {t}px ${COND}`);
    x.fillStyle = BRUME; espacer(x, "2px"); ecrireAjuste(x, (c.devise || "").toUpperCase(), 176, 152, 520, 15, `600 {t}px ${COND}`, 10);
    espacer(x, "0px");
    // Pastille « Carte de membre »
    x.font = `700 21px ${COND}`; espacer(x, "3px");
    x.fillStyle = OR_CLAIR; arrondi(x, W - 44 - lw, 46, lw, 40, 20); x.fill();
    x.fillStyle = NUIT; x.textAlign = "center"; x.fillText(lib, W - 44 - lw / 2, 73);
    espacer(x, "0px"); x.textAlign = "right"; x.fillStyle = BRUME; x.font = `600 18px ${COND}`; x.fillText(`EXERCICE ${an}`, W - 46, 116);
    x.textAlign = "left";
    x.strokeStyle = "rgba(212,173,72,.55)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(42, 176); x.lineTo(W - 42, 176); x.stroke();
    // Photo ou initiales
    const cx = 132, cy = 296, r = 88;
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.closePath(); x.clip();
    if (photo) {
      const k = Math.max((2 * r) / photo.width, (2 * r) / photo.height);
      x.drawImage(photo, cx - (photo.width * k) / 2, cy - (photo.height * k) / 2, photo.width * k, photo.height * k);
    } else {
      x.fillStyle = "#2c4377"; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      x.fillStyle = "#ffffff"; x.font = `700 64px ${COND}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(initiales(m), cx, cy + 2);
      x.textAlign = "left"; x.textBaseline = "alphabetic";
    }
    x.restore();
    x.strokeStyle = OR; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, r + 2, 0, Math.PI * 2); x.stroke();
    // Identité
    const tx = 250, tmax = 470;
    x.fillStyle = "#ffffff"; ecrireAjuste(x, String(m.nom || "").toUpperCase(), tx, 246, tmax, 48, `700 {t}px ${COND}`, 22);
    x.fillStyle = "#ffffff"; ecrireAjuste(x, m.prenoms || "", tx, 284, tmax, 30, `400 {t}px ${CORPS}`, 16);
    if (m.fonction) { x.fillStyle = OR_CLAIR; ecrireAjuste(x, m.fonction, tx, 322, tmax, 24, `700 {t}px ${CORPS}`, 14); }
    x.fillStyle = BRUME; x.font = `600 17px ${COND}`; espacer(x, "2px"); x.fillText("MATRICULE", tx, 366); espacer(x, "0px");
    x.fillStyle = "#ffffff"; x.font = `700 32px ${COND}`; x.fillText(m.matricule || "—", tx, 400);
    const sous = [m.eglise, poleCourt(m.pole)].filter(Boolean).join(" · ");
    if (sous) { x.fillStyle = BRUME; ecrireAjuste(x, sous, tx, 434, tmax, 19, `400 {t}px ${CORPS}`, 12); }
    // Code QR
    const qrT = [`${c.nomCourt} · Carte de membre`, `${m.matricule || "Sans matricule"} · ${nomComplet(m)}`, `Valable jusqu’au 31/12/${an}`, `Code de contrôle ${code}`].join("\n");
    const qg = window.qrcode;
    qg.stringToBytes = qg.stringToBytesFuncs["UTF-8"];
    const q = qg(0, "M"); q.addData(qrT, "Byte"); q.make();
    const n = q.getModuleCount();
    const qs = 226, qx = W - 44 - qs, qy = 196;
    x.fillStyle = "#ffffff"; arrondi(x, qx, qy, qs, qs, 14); x.fill();
    const t = Math.floor((qs - 20) / n), o = (qs - t * n) / 2;
    x.fillStyle = NUIT;
    for (let rr = 0; rr < n; rr += 1) for (let cc = 0; cc < n; cc += 1) if (q.isDark(rr, cc)) x.fillRect(qx + o + cc * t, qy + o + rr * t, t, t);
    x.textAlign = "center"; x.fillStyle = BRUME; x.font = `600 17px ${COND}`; espacer(x, "2px");
    x.fillText(`CONTRÔLE ${code}`, qx + qs / 2, qy + qs + 30); espacer(x, "0px");
    // Signature du leader
    x.textAlign = "left";
    x.fillStyle = BRUME; x.font = `600 15px ${COND}`; espacer(x, "2px"); x.fillText("LE LEADER DU MOUVEMENT", 44, 482); espacer(x, "0px");
    x.fillStyle = "#f3e3b0"; ecrireAjuste(x, c.signataire, 52, 548, 520, 52, `400 {t}px "Great Vibes", "Brush Script MT", cursive`, 26);
    const sw = Math.min(520, x.measureText(c.signataire).width);
    x.strokeStyle = "rgba(243,227,176,.75)"; x.lineWidth = 2; x.beginPath(); x.moveTo(50, 562); x.bezierCurveTo(50 + sw * 0.35, 572, 50 + sw * 0.7, 552, 56 + sw, 560); x.stroke();
    x.fillStyle = BRUME; ecrireAjuste(x, `${c.signataire} · ${c.signataireTitre}`, 44, 594, 560, 17, `400 {t}px ${CORPS}`, 11);
    // Validité
    x.textAlign = "right";
    x.fillStyle = "#ffffff"; x.font = `700 21px ${COND}`; x.fillText(`VALABLE JUSQU’AU 31/12/${an}`, W - 44, 548);
    x.fillStyle = BRUME; x.font = `400 16px ${CORPS}`; x.fillText(`Délivrée le ${aujourdhui().split("-").reverse().join("/")}`, W - 44, 576);
    x.textAlign = "left";
    return { cv, code };
  }
  const nomFichierCarte = (m) => `carte-${[m.matricule || "", sansAccents(String(m.nom || "")), sansAccents(String(m.prenoms || "").split(/\s+/)[0] || "")].filter(Boolean).join("-").replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-")}.png`;
  async function telechargerBlob(nom, blob) {
    if (!S.dl) { toast("Le téléchargement n’est pas disponible ici : appuyez longuement sur l’image pour l’enregistrer.", "err"); return; }
    try { await S.dl.save({ filename: nom, data: blob }); toast("Fichier enregistré"); }
    catch (e) {
      const code = e && e.code;
      if (code === "declined") return;
      toast(code === "rate_limited" ? "Un téléchargement attend déjà votre confirmation." : code === "too_large" ? "Fichier trop lourd pour ce téléchargement." : "Le téléchargement a échoué.", "err");
    }
  }
  async function ouvrirCarte(mid) {
    const m = membre(mid);
    if (!m) return;
    ouvrir({ titre: "Carte de membre", wide: true, html: chargement("Préparation de la carte…") });
    let res;
    try { res = await rendreCarte(m); }
    catch (e) {
      if (!$("#sheet").hidden) $("#sheet-b").innerHTML = `<p class="note danger">${e && e.code === "bibliotheque" ? "Le générateur de code QR n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "La carte n’a pas pu être préparée."}</p>`;
      return;
    }
    if ($("#sheet").hidden) return;
    S.carte = { id: m.id, cv: res.cv };
    $("#sheet-b").innerHTML = `<img class="carte-img" src="${res.cv.toDataURL("image/png")}" alt="Carte de membre de ${esc(nomUsuel(m))}, matricule ${esc(m.matricule || "non attribué")}">
      <p class="hint" style="margin-top:10px">Format carte bancaire (85,6 × 54 mm à 300 dpi), signée « ${esc(cfg().signataire)} ». Code de contrôle : <b class="num">${esc(res.code)}</b>.${m.matricule ? "" : " Ce membre n’a pas encore de matricule : ajoutez-le dans sa fiche."}</p>
      <div class="actions">${btn("dl-carte", "Télécharger l’image (PNG)", { ico: "i-down", cls: "btn-primary" })}${btn("voir-membre", "Fiche du membre", { ico: "i-users", data: `data-id="${esc(m.id)}"` })}</div>`;
  }
  function ouvrirCartes() {
    const actifs = membresActifs();
    ouvrir({
      titre: "Cartes de membre", wide: true,
      html: `<p>Cartes ${anneeCarte()} signées « ${esc(cfg().signataire)} », avec la photo du membre lorsqu’elle existe, un code QR et un code de contrôle.</p>
        <div class="actions">${btn("zip-cartes", `Télécharger les ${nb(actifs.length)} cartes (ZIP)`, { ico: "i-down", cls: "btn-primary", attrs: actifs.length ? "" : "disabled" })}</div>
        <div class="progress" id="zip-prog" hidden style="margin-top:12px"><i></i></div><p class="hint" id="zip-etat"></p>
        <p class="hint">Chaque carte est une image PNG au format carte bancaire, prête pour l’imprimeur. Pour une seule carte, ouvrez la fiche du membre.</p>
        <hr class="sep"><h3 class="h3">Vérifier une carte</h3><p class="hint">Saisissez le matricule et le code de contrôle imprimés sur la carte, ou lus dans son code QR.</p>
        <div class="f2" style="margin-top:10px">${champ("v-mat", "Matricule", inp("v-mat", "vmat", "", 'autocomplete="off" autocapitalize="characters" placeholder="SDE-0001"'))}${champ("v-code", "Code de contrôle", inp("v-code", "vcode", "", 'autocomplete="off" autocapitalize="characters" placeholder="6 caractères"'))}</div>
        <div class="actions">${btn("verifier-carte", "Vérifier", { ico: "i-check" })}</div><div id="v-res" aria-live="polite"></div>`,
    });
  }
  async function zipCartes() {
    const actifs = membresActifs();
    const b = document.querySelector('[data-act="zip-cartes"]');
    if (b) b.disabled = true;
    const prog = $("#zip-prog");
    if (prog) prog.hidden = false;
    const etat = (txt, p) => { const e1 = $("#zip-etat"); if (e1) e1.textContent = txt; const p1 = $("#zip-prog i"); if (p1) p1.style.width = p.toFixed(1) + "%"; };
    try {
      await chargerScript(LIB_ZIP);
      const zip = new window.JSZip();
      let i = 0;
      for (const m of actifs) {
        const { cv } = await rendreCarte(m);
        const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
        zip.file(nomFichierCarte(m), blob);
        i += 1;
        etat(`${i} sur ${actifs.length} cartes préparées…`, (i / actifs.length) * 90);
      }
      etat("Compression…", 95);
      const out = await zip.generateAsync({ type: "blob" });
      etat(`${pluriel(actifs.length, "carte prête", "cartes prêtes")}.`, 100);
      await telechargerBlob(`cartes-membres-${cfg().nomCourt.replace(/\W+/g, "")}-${anneeCarte()}.zip`, out);
    } catch (e) {
      etat("", 0);
      toast(e && e.code === "bibliotheque" ? "Un module nécessaire n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "Les cartes n’ont pas pu être préparées.", "err");
    } finally { if (b && document.contains(b)) b.disabled = false; }
  }
  async function verifierCarte() {
    const zoneR = $("#v-res");
    const mat = String(($("#v-mat") || {}).value || "").trim().toUpperCase();
    const code = String(($("#v-code") || {}).value || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!zoneR) return;
    if (!mat || !code) { zoneR.innerHTML = `<p class="err">Indiquez le matricule et le code de contrôle.</p>`; return; }
    const m = S.membres.find((x) => String(x.matricule || "").toUpperCase() === mat);
    if (!m) { zoneR.innerHTML = `<p class="note danger">Aucun membre du registre ne porte le matricule ${esc(mat)}.</p>`; return; }
    const an = anneeCarte();
    let annee = null;
    for (const y of [an, an - 1, an + 1]) if ((await codeControle(m, y)) === code) { annee = y; break; }
    if (!annee) { zoneR.innerHTML = `<p class="note danger">Le code ${esc(code)} ne correspond pas à la carte de ${esc(nomComplet(m))}. La carte a pu être modifiée, ou le nom a changé depuis son impression.</p>`; return; }
    const expiree = annee < new Date().getFullYear();
    zoneR.innerHTML = `<div class="note ${m.actif === false || expiree ? "warn" : ""}"><p><b>Carte authentique</b> : ${esc(nomComplet(m))}${m.fonction ? `, ${esc(m.fonction)}` : ""}.</p><p>Valable jusqu’au 31/12/${annee}${expiree ? " : carte expirée" : ""}. ${m.actif === false ? "Ce membre est archivé." : "Membre actif."}</p></div>`;
  }

  /* ════════════════════════ Import et export ════════════════════════ */
  function parseCSV(texte) {
    texte = String(texte || "").replace(/^﻿/, "");
    const premiere = texte.split(/\r?\n/).find((l) => l.trim()) || "";
    const sep = ["\t", ";", ","].map((s) => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const lignes = [];
    let ligne = [], cell = "", q = false;
    for (let i = 0; i < texte.length; i += 1) {
      const ch = texte[i];
      if (q) {
        if (ch === '"') { if (texte[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += ch;
      } else if (ch === '"' && cell === "") q = true;
      else if (ch === sep) { ligne.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texte[i + 1] === "\n") i += 1;
        ligne.push(cell); cell = "";
        if (ligne.some((c) => c.trim())) lignes.push(ligne);
        ligne = [];
      } else cell += ch;
    }
    ligne.push(cell);
    if (ligne.some((c) => c.trim())) lignes.push(ligne);
    return lignes;
  }
  const COLONNES = {
    nom: ["nom", "nomdefamille", "name", "lastname"],
    prenoms: ["prenom", "prenoms", "firstname"],
    complet: ["nomcomplet", "nometprenoms", "nometprenom", "nomprenoms", "nomprenom", "membre", "fullname", "identite"],
    telephone: ["telephone", "tel", "contact", "contacts", "numero", "phone", "portable", "cel", "cellulaire", "whatsapp", "numerodetelephone", "numerotelephone", "ndetelephone", "notelephone", "ntelephone", "ntel", "numerowhatsapp"],
    telephone2: ["autrenumero", "telephone2", "tel2", "contact2"],
    naissance: ["naissance", "datedenaissance", "datenaissance", "anniversaire", "nele", "neele", "ne", "dateanniversaire"],
    quartier: ["quartier", "commune", "communeouquartier", "quartieroucommune", "adresse", "habitation", "lieudhabitation", "residence", "lieuderesidence"],
    matricule: ["matricule", "numerodemembre", "numeromembre", "nmembre", "idmembre", "identifiant"],
    eglise: ["eglise", "egliseoucommunaute", "communaute", "assemblee", "eglisedorigine", "egliselocale"],
    implantation: ["implantation", "antenne", "branche", "site", "campus", "pays"],
    baptise: ["baptise", "baptisee", "bapteme"],
    pole: ["pole"],
    departement: ["departement", "cellule", "service", "ministere"],
    fonction: ["fonction", "role", "responsabilite", "poste"],
    statut: ["statut", "niveau", "engagement"],
    sexe: ["sexe", "genre"],
    situation: ["situation", "situationfamiliale", "situationmatrimoniale"],
    adhesion: ["adhesion", "datedadhesion", "membredepuis", "arrivee", "datedarrivee", "dateadhesion"],
    email: ["email", "mail", "courriel", "adresseemail", "adressemail"],
    notes: ["notes", "observations", "observation", "remarques", "commentaire", "commentaires"],
  };
  function lireDate(v, anneeRequise) {
    v = String(v || "").trim();
    if (!v) return null;
    const mk = (j, m, y) => {
      j = Number(j); m = Number(m); y = y ? Number(y) : null;
      if (y && y < 100) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
      if (!(m >= 1 && m <= 12) || !(j >= 1 && j <= joursDuMois(m, y))) return null;
      if (y && (y < 1900 || y > new Date().getFullYear())) return null;
      if (anneeRequise && !y) return null;
      return { anniv: `${pad(m)}-${pad(j)}`, annee: y, iso: y ? `${y}-${pad(m)}-${pad(j)}` : null };
    };
    let r;
    if ((r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return mk(r[3], r[2], r[1]);
    if ((r = v.match(/^(\d{1,2})[/.\- ](\d{1,2})(?:[/.\- ](\d{2,4}))?$/))) return mk(r[1], r[2], r[3]);
    const w = norm(v).replace(/,/g, " ");
    if ((r = w.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?$/))) {
      const idx = MOIS_NOMS.map((n) => norm(n)).findIndex((n) => n === r[2] || (r[2].length >= 3 && n.startsWith(r[2])));
      if (idx >= 0) return mk(r[1], idx + 1, r[3]);
    }
    return null;
  }
  function analyserImport(texte) {
    const c = cfg();
    const lignes = parseCSV(texte);
    if (lignes.length < 2) return { erreur: "Le tableau doit contenir une ligne d’en-têtes (Nom, Prénoms, Téléphone…) puis au moins une ligne de membre." };
    const entetes = lignes[0].map((h) => norm(h).replace(/[^a-z0-9]/g, ""));
    const index = {};
    for (const [cle, alias] of Object.entries(COLONNES)) { const ii = entetes.map((h, i) => (alias.includes(h) ? i : -1)).filter((i) => i >= 0); if (ii.length) index[cle] = ii; }
    if (index.nom === undefined && index.complet === undefined) return { erreur: "Aucune colonne « Nom » n’a été trouvée dans la première ligne du tableau." };
    const reconnues = Object.values(index).flat().map((i) => lignes[0][i].trim());
    const existants = new Set(S.membres.flatMap((m) => [telChiffres(m.telephone) ? "t:" + telChiffres(m.telephone) : null, "n:" + norm((m.nom || "") + " " + (m.prenoms || "")), m.matricule ? "m:" + norm(m.matricule) : null]).filter(Boolean));
    const vus = new Set();
    const nouveaux = [];
    let doublons = 0, vides = 0, datesIgnorees = 0;
    for (const l of lignes.slice(1)) {
      const v = (k) => { for (const i of index[k] || []) { const x = String(l[i] ?? "").trim(); if (x) return x; } return ""; };
      let nom = v("nom"), prenoms = v("prenoms");
      if (!nom && v("complet")) {
        const mots = v("complet").split(/\s+/).filter(Boolean);
        const majIdx = mots.findIndex((w2) => w2.length > 1 && w2 === w2.toUpperCase() && /\p{L}/u.test(w2));
        if (majIdx > 0 && majIdx === mots.length - 1) { nom = mots[majIdx]; prenoms = mots.slice(0, -1).join(" "); }
        else { nom = mots[0] || ""; prenoms = mots.slice(1).join(" "); }
      }
      if (!nom) { vides += 1; continue; }
      const tel = v("telephone");
      const cleT = telChiffres(tel) ? "t:" + telChiffres(tel) : null;
      const cleN = "n:" + norm(nom + " " + prenoms);
      const cleM = v("matricule") ? "m:" + norm(v("matricule")) : null;
      if ((cleT && (existants.has(cleT) || vus.has(cleT))) || existants.has(cleN) || vus.has(cleN) || (cleM && (existants.has(cleM) || vus.has(cleM)))) { doublons += 1; continue; }
      if (cleM) vus.add(cleM);
      if (cleT) vus.add(cleT);
      vus.add(cleN);
      const nais = lireDate(v("naissance"), false);
      if (v("naissance") && !nais) datesIgnorees += 1;
      const adh = lireDate(v("adhesion"), true);
      const sx = norm(v("sexe"));
      const poleBrut = v("pole");
      const pole = poleBrut ? (c.poles.find((p) => norm(p) === norm(poleBrut) || norm(poleCourt(p)) === norm(poleBrut) || norm(poleCourt(p)) === "pole " + norm(poleBrut)) || c.poles.find((p) => norm(p).includes(norm(poleBrut))) || poleBrut) : "";
      const statutBrut = v("statut");
      const stN = norm(statutBrut);
      const inactif = /^(inactif|inactive|archive|archivee|ancien|ancienne)$/.test(stN);
      const statutLu = /^(actif|active|inactif|inactive|archive|archivee|ancien|ancienne)$/.test(stN) ? "Membre" : statutBrut;
      const bp = norm(v("baptise"));
      nouveaux.push({
        nom, prenoms, telephone: tel, telephone2: v("telephone2"), email: v("email"), quartier: v("quartier"), pole, departement: v("departement"), fonction: v("fonction"),
        statut: statutLu ? c.statuts.find((s) => norm(s) === norm(statutLu)) || statutLu : "", actif: !inactif,
        matricule: v("matricule").toUpperCase(), eglise: v("eglise"), implantation: v("implantation"), baptise: /^(oui|o|yes|x|1)$/.test(bp) ? "Oui" : /^(non|n|no|0)$/.test(bp) ? "Non" : "",
        sexe: /^(h|m|homme|masculin|garcon)$/.test(sx) ? "H" : /^(f|femme|feminin|fille)$/.test(sx) ? "F" : "",
        situation: v("situation"), anniv: nais ? nais.anniv : null, annee: nais ? nais.annee : null, adhesion: adh ? adh.iso : "", notes: v("notes"),
      });
    }
    return { nouveaux, doublons, vides, datesIgnorees, reconnues, total: lignes.length - 1 };
  }
  let importEnCours = null;
  function ouvrirImport() {
    importEnCours = null;
    ouvrir({
      titre: "Importer des membres", wide: true,
      html: `<p class="hint" style="margin-bottom:12px">Choisissez un fichier CSV, ou copiez un tableau depuis Excel ou Google Sheets et collez-le ci-dessous. La première ligne doit contenir les en-têtes : Matricule, Nom, Prénoms, Téléphone, Date de naissance, Église, Pôle, Fonction… Les colonnes inconnues sont ignorées et les doublons écartés.</p>
        <div class="drop" id="drop">${I("i-up")}<label class="btn btn-ghost btn-sm" for="imp-fichier">Choisir un fichier CSV</label><input class="sr" type="file" id="imp-fichier" accept=".csv,.tsv,.txt,text/csv,text/plain"><span class="hint">ou glissez-le ici</span></div>
        <div class="field" style="margin-top:12px"><label for="imp-texte">Ou collez le tableau</label><textarea class="inp" id="imp-texte" rows="5" placeholder="Nom;Prénoms;Téléphone;Date de naissance&#10;KOUASSI;Jean Marc;07 00 00 00 00;15/03/1990"></textarea></div>
        <div class="actions"><button class="btn btn-ghost" type="button" data-act="imp-analyser">Analyser le tableau</button></div>
        <div id="imp-resultat"></div>`,
      apres: (sheet) => {
        const f = sheet.querySelector("#imp-fichier");
        const drop = sheet.querySelector("#drop");
        const lire = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => { sheet.querySelector("#imp-texte").value = String(r.result || ""); afficherAnalyse(); }; r.onerror = () => toast("Le fichier n’a pas pu être lu.", "err"); r.readAsText(file); };
        f.addEventListener("change", () => lire(f.files[0]));
        drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("over"));
        drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); lire(e.dataTransfer.files[0]); });
      },
    });
  }
  function afficherAnalyse() {
    const zoneR = $("#imp-resultat");
    const texte = ($("#imp-texte") || {}).value || "";
    if (!zoneR) return;
    if (!texte.trim()) { zoneR.innerHTML = `<p class="err">Choisissez un fichier ou collez un tableau.</p>`; return; }
    const r = analyserImport(texte);
    if (r.erreur) { importEnCours = null; zoneR.innerHTML = `<p class="note danger">${esc(r.erreur)}</p>`; return; }
    importEnCours = r.nouveaux;
    const apercu = r.nouveaux.slice(0, 6);
    zoneR.innerHTML = `<div class="note"><p><b>${pluriel(r.nouveaux.length, "membre à importer", "membres à importer")}</b> sur ${pluriel(r.total, "ligne", "lignes")}.${r.doublons ? ` ${pluriel(r.doublons, "doublon écarté", "doublons écartés")} (même numéro ou même nom).` : ""}${r.vides ? ` ${pluriel(r.vides, "ligne sans nom ignorée", "lignes sans nom ignorées")}.` : ""}${r.datesIgnorees ? ` ${pluriel(r.datesIgnorees, "date de naissance illisible ignorée", "dates de naissance illisibles ignorées")}.` : ""}</p><p class="hint">Colonnes reconnues : ${esc(r.reconnues.join(", "))}.</p></div>
      ${apercu.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Matricule</th><th>Nom</th><th>Prénoms</th><th>Téléphone</th><th>Naissance</th><th>Pôle</th></tr></thead><tbody>${apercu.map((m) => `<tr><td>${esc(m.matricule || "")}</td><td>${esc(String(m.nom).toUpperCase())}</td><td>${esc(m.prenoms)}</td><td>${esc(telAffiche(m.telephone))}</td><td>${m.anniv ? esc(fmtJM("2000-" + m.anniv) + (m.annee ? " " + m.annee : "")) : ""}</td><td>${esc(poleCourt(m.pole))}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${r.nouveaux.length ? `<div class="actions"><button class="btn btn-primary" type="button" data-act="imp-lancer">${I("i-up")}Importer ${pluriel(r.nouveaux.length, "membre", "membres")}</button></div><div class="progress" id="imp-prog" hidden style="margin-top:12px"><i></i></div><p class="hint" id="imp-etat"></p>` : ""}`;
  }
  async function lancerImport() {
    const liste = importEnCours;
    if (!liste || !liste.length || !S.db) return;
    importEnCours = null;
    const b = document.querySelector("[data-act=imp-lancer]");
    if (b) b.disabled = true;
    const prog = $("#imp-prog"), etat = $("#imp-etat");
    if (prog) prog.hidden = false;
    let faits = 0, echecs = 0, arret = null;
    S.attente += 1; majSync();
    for (const m of liste) {
      const ref = S.db.collection("membres").doc();
      let ok = false;
      for (let essai = 0; essai < 4 && !ok && !arret; essai += 1) {
        try { await ref.set({ ...m, importe: true, ...creation() }); ok = true; }
        catch (e) {
          const code = e && e.code;
          if (code === "resource_exhausted" || code === "unavailable") { await sleep(1500 * (essai + 1)); continue; }
          if (code === "quota_exceeded" || code === "invalid_argument" || code === "revoked") arret = e;
          break;
        }
      }
      if (ok) faits += 1; else echecs += 1;
      const p = $("#imp-prog i"); if (p) p.style.width = (((faits + echecs) / liste.length) * 100).toFixed(1) + "%";
      const t = $("#imp-etat"); if (t) t.textContent = `${nb(faits)} sur ${nb(liste.length)} enregistrés…`;
      if (arret || (faits === 0 && echecs >= 3)) break;
    }
    S.attente -= 1; majSync();
    const restants = liste.length - faits;
    const bilan = restants ? `${pluriel(faits, "membre importé", "membres importés")}, ${pluriel(restants, "non enregistré", "non enregistrés")}.` : `${pluriel(faits, "membre importé", "membres importés")}.`;
    if (etat && document.contains(etat)) etat.textContent = bilan + (arret ? " " + messageErreur(arret) : "");
    toast(restants ? `Import interrompu : ${bilan}` : `${bilan.replace(/\.$/, "")} dans le registre.`, restants ? "err" : "");
  }
  const cellCSV = (v) => { v = String(v ?? ""); return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const versCSV = (rows) => "﻿" + rows.map((r) => r.map(cellCSV).join(";")).join("\r\n");
  async function telecharger(nom, contenu) {
    if (!S.dl) { ouvrirTexte("Contenu à copier", contenu, { intro: "Le téléchargement n’est pas disponible dans cette vue : copiez le contenu puis collez-le dans un fichier." }); return; }
    try { await S.dl.save({ filename: nom, data: contenu }); toast("Fichier enregistré"); }
    catch (e) {
      const code = e && e.code;
      if (code === "declined") return;
      if (code === "rate_limited") { toast("Un téléchargement attend déjà votre confirmation.", "err"); return; }
      ouvrirTexte("Contenu à copier", contenu, { intro: "Le téléchargement a échoué : copiez le contenu puis collez-le dans un fichier." });
    }
  }
  function exporterMembres() {
    const rows = [["Matricule", "Nom", "Prénoms", "Sexe", "Date de naissance", "Téléphone", "Autre numéro", "E-mail", "Commune ou quartier", "Église ou communauté", "Implantation", "Pôle", "Département", "Fonction", "Statut", "Baptisé(e)", "Situation familiale", "Membre depuis", "Observations", "Archivé"]];
    S.membres.slice().sort((a, b) => cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b)).forEach((m) => {
      const n = m.anniv ? `${m.anniv.slice(3)}/${m.anniv.slice(0, 2)}${m.annee ? "/" + m.annee : ""}` : "";
      rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms, m.sexe === "H" ? "Homme" : m.sexe === "F" ? "Femme" : "", n, telAffiche(m.telephone), telAffiche(m.telephone2), m.email, m.quartier, m.eglise || "", m.implantation || "", m.pole, m.departement, m.fonction, m.statut, m.baptise || "", m.situation, m.adhesion ? m.adhesion.split("-").reverse().join("/") : "", m.notes, m.actif === false ? "Oui" : "Non"]);
    });
    telecharger(`membres-${cfg().nomCourt.replace(/\W+/g, "")}-${aujourdhui()}.csv`, versCSV(rows));
  }
  function exporterMois(cle) {
    const rows = [["Date", "Sens", "Catégorie", "Libellé", "Montant (FCFA)", "Moyen", "Membre", "Rassemblement", "Référence", "Saisie le", "Annulée", "Motif d’annulation"]];
    (S.ops[cle] || []).slice().sort((a, b) => cmpFr(a.date, b.date)).forEach((o) => {
      const m = o.membreId ? membre(o.membreId) : null;
      const e = o.evenementId ? evt(o.evenementId) : null;
      rows.push([o.date.split("-").reverse().join("/"), o.sens === "E" ? "Entrée" : "Sortie", o.categorie, o.libelle, String(o.montant), o.moyen, m ? nomComplet(m) : "", e ? e.titre : "", o.piece, fmtStamp(o.creeLe), o.annule ? "Oui" : "Non", o.annuleMotif || ""]);
    });
    telecharger(`finances-${cle}.csv`, versCSV(rows));
  }
  async function exporterTout() {
    toast("Préparation de la sauvegarde…");
    const finances = {};
    if (accesFinances() && S.db) {
      for (const cle of Object.keys(S.moisDocs).sort()) {
        try { const q = await S.db.collection(`finances/${cle}/ops`).get(); finances[cle] = { ...S.moisDocs[cle], operations: q.docs.map((d) => ({ id: d.id, ...d.data() })) }; }
        catch (e) { finances[cle] = { ...S.moisDocs[cle], operations: null, erreur: "non lu" }; }
        await sleep(120);
      }
    }
    const data = { application: "S.D.E. Gestion", exporteLe: new Date().toISOString(), reglages: cfg(), membres: S.membres, evenements: S.evenements, decisions: S.decisions, ...(accesFinances() ? { finances } : {}) };
    telecharger(`sauvegarde-sde-${aujourdhui()}.json`, JSON.stringify(data, null, 2));
  }

  /* ════════════════════════ Actions ════════════════════════ */
  const A = {
    fermer: () => fermer(),
    sous: (t) => { S.sous[t.dataset.vueCible] = t.dataset.sous; S.limite = 80; render(); },
    plus: () => { S.limite += 80; render(); },
    "aller-suivi": () => allerA("membres", "suivi"),
    "vue-agenda": () => allerA("agenda"),
    "copier": (t) => { const el = document.getElementById(t.dataset.cible); if (el) copier(el.value, el); },
    "copier-val": (t) => copier(t.dataset.val || ""),
    "ajout-membre": () => ouvrirFormMembre(null),
    "voir-membre": (t) => ouvrirMembre(t.dataset.id),
    "editer-membre": (t) => ouvrirFormMembre(t.dataset.id),
    "archiver-membre": (t) => ecrire(() => S.db.doc("membres/" + t.dataset.id).update({ actif: false, archiveLe: Date.now(), ...tampon() }), "Fiche archivée"),
    "reactiver-membre": (t) => ecrire(() => S.db.doc("membres/" + t.dataset.id).update({ actif: true, ...tampon() }), "Fiche réactivée"),
    "supprimer-membre": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("membres/" + t.dataset.id).delete(), "Fiche supprimée")) fermer(); }),
    voeux: (t) => { const m = membre(t.dataset.id); if (m) ouvrirTexte(`Anniversaire de ${prenomUsuel(m)}`, messageAnniv(m), { wa: m.telephone || "", intro: "Relisez et personnalisez le message si besoin, puis envoyez-le." }); },
    "import-membres": () => ouvrirImport(),
    "imp-analyser": () => afficherAnalyse(),
    "imp-lancer": () => lancerImport(),
    "export-membres": () => exporterMembres(),
    "export-tout": () => exporterTout(),
    "ajout-op": () => {
      if (S.vue !== "finances" || (moisClos(S.mois) && S.mois !== moisCourant())) S.mois = moisCourant();
      abonnerMois(S.mois);
      ouvrirFormOp(S.mois, null);
    },
    "voir-op": (t) => ouvrirOp(t.dataset.mois, t.dataset.id),
    "editer-op": (t) => ouvrirFormOp(t.dataset.mois, t.dataset.id),
    "annuler-op": (t) => ouvrirAnnulation(t.dataset.mois, t.dataset.id),
    "retablir-op": async (t) => {
      const cle = t.dataset.mois;
      const o = opDe(cle, t.dataset.id);
      if (!(await ecrire(() => S.db.doc(`finances/${cle}/ops/${t.dataset.id}`).update({ annule: false, retabliPar: S.me.id || null, retabliLe: Date.now(), ...tampon() }), "Opération rétablie"))) return;
      try { await synchroCotisOp(o, false); } catch (e) { toast("La grille des cotisations n’a pas pu être mise à jour.", "err"); }
      try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
    },
    "recu-op": (t) => { const o = opDe(t.dataset.mois, t.dataset.id); if (o) { const m = o.membreId ? membre(o.membreId) : null; ouvrirTexte("Reçu", texteRecu(o), { wa: m ? m.telephone || "" : "", intro: "Copiez le reçu pour l’envoyer au donateur ou l’imprimer depuis votre traitement de texte." }); } },
    "mois-prec": () => { S.mois = ajoutMois(S.mois, -1); abonnerMois(S.mois); render(); },
    "mois-suiv": () => { if (S.mois < moisCourant()) { S.mois = ajoutMois(S.mois, 1); abonnerMois(S.mois); render(); } },
    "rapport-mois": () => { if (!S.opsPret[S.mois]) return; ouvrirTexte(`Rapport · ${fmtMois(S.mois)}`, texteRapport(S.mois), { wa: "", intro: "Rapport prêt à partager avec la direction." }); },
    "export-mois": () => { if (S.opsPret[S.mois]) exporterMois(S.mois); },
    "recalc-mois": async () => { const cle = S.mois; S.attente += 1; majSync(); try { await recalcMois(cle); toast("Totaux mis à jour"); } catch (e) { toast(messageErreur(e), "err"); } finally { S.attente -= 1; majSync(); } },
    "cloturer-mois": (t) => boutonArme(t, "Confirmer la clôture", async () => { const cle = S.mois; S.attente += 1; majSync(); try { await recalcMois(cle, { cloture: true, cloturePar: S.me.id || null, clotureLe: Date.now() }); toast(`${cap(fmtMois(cle))} est clôturé`); } catch (e) { toast(messageErreur(e), "err"); } finally { S.attente -= 1; majSync(); } }),
    "rouvrir-mois": async () => { const cle = S.mois; S.attente += 1; majSync(); try { await recalcMois(cle, { cloture: false, rouvertPar: S.me.id || null, rouvertLe: Date.now() }); toast("Mois rouvert"); } catch (e) { toast(messageErreur(e), "err"); } finally { S.attente -= 1; majSync(); } },
    "ajout-evt": () => ouvrirFormEvt(null),
    "voir-evt": (t) => ouvrirEvt(t.dataset.id),
    "editer-evt": (t) => ouvrirFormEvt(t.dataset.id),
    "supprimer-evt": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("evenements/" + t.dataset.id).delete(), "Rassemblement supprimé")) fermer(); }),
    "pointer-evt": (t) => ouvrirPointage(t.dataset.id),
    pointer: (t) => {
      const e = evt(S.pt.id);
      if (!e || !peutEcrire()) return;
      const mid = t.dataset.mid;
      S.pt.attente[mid] = presentsEffectifs(e)[mid] === true ? null : true;
      planifierEnvoi(S.pt);
      render();
    },
    "pointer-etat": (t) => {
      const e = evt(S.pt.id);
      if (!e || !peutEcrire()) return;
      const mid = t.dataset.mid, etat = t.dataset.etat;
      S.pt.attente[mid] = presentsEffectifs(e)[mid] === etat ? null : etat;
      planifierEnvoi(S.pt);
      render();
    },
    compteur: (t) => {
      const e = evt(S.pt.id);
      if (!e || !peutEcrire()) return;
      const k = t.dataset.k;
      S.pt.compteurs[k] = Math.max(0, compteur(e, k) + Number(t.dataset.d));
      planifierEnvoi(S.pt);
      render();
    },
    "pt-seuls": () => { S.f.pointage.seuls = !S.f.pointage.seuls; render(); },
    "annonce-evt": (t) => {
      const e = evt(t.dataset.id); if (!e) return;
      const c = cfg();
      const lignes = [e.titre, `${fmtLong(e.date)}${e.heure ? " à " + fmtHeure(e.heure) : ""}`, e.lieu ? `Lieu : ${e.lieu}` : "", e.description ? "\n" + e.description : "", "", `${c.nomCourt}${c.devise ? " — " + c.devise : ""}`];
      ouvrirTexte("Message d’annonce", lignes.filter((l, i) => l !== "" || i === 4).join("\n").trim(), { wa: "", intro: "Texte prêt à envoyer dans les groupes WhatsApp du mouvement." });
    },
    "bilan-evt": (t) => {
      const e = evt(t.dataset.id); if (!e) return;
      const np = nbPresents(e), nr = nbEtat(e, "retard"), nx = nbEtat(e, "excuse"), vi = compteur(e, "visiteurs"), nv = compteur(e, "nouveaux");
      ouvrirTexte("Bilan de présence", `${e.titre} — ${fmtJour(e.date)}\nTotal : ${pluriel(np + vi + nv, "personne", "personnes")}\n• ${pluriel(np, "membre présent", "membres présents")} sur ${nb(membresActifs().length)}${nr ? `, dont ${pluriel(nr, "retard", "retards")}` : ""}${nx ? `\n• ${pluriel(nx, "absence excusée", "absences excusées")}` : ""}\n• ${pluriel(vi, "visiteur", "visiteurs")}\n• ${pluriel(nv, "nouveau venu", "nouveaux venus")}`, { wa: "" });
    },
    reglages: () => ouvrirReglages(),
    fvue: (t) => { S.fvue = t.dataset.v; S.limite = 80; render(); },
    "aller-assiduite": () => allerA("agenda", "assiduite"),
    "aller-cotis": () => { S.fvue = "cotisations"; S.annee = new Date().getFullYear(); allerA("finances"); },
    "aller-discipline": () => allerA("membres", "discipline"),
    "assid-periode": (t) => { S.f.assiduite.periode = t.dataset.v; render(); },
    "export-assiduite": () => exporterAssiduite(),
    "annee-prec": () => { S.annee -= 1; render(); },
    "annee-suiv": () => { if (S.annee < new Date().getFullYear() + 1) { S.annee += 1; render(); } },
    "cotis-filtre": (t) => { S.f.cotis.filtre = t.dataset.v; render(); },
    "voir-cotis": (t) => ouvrirCotis(t.dataset.id),
    "ajout-cotis": (t) => { if (t.dataset.annee) S.annee = Number(t.dataset.annee); ouvrirFormCotis(t.dataset.id || null, S.annee); },
    "relance-cotis": (t) => {
      const m = membre(t.dataset.id);
      if (!m) return;
      const an = Number(t.dataset.annee) || S.annee;
      const e = etatCotis(m, an);
      ouvrirTexte("Relance de cotisation", messageRelance(m, e, an), { wa: m.telephone || "", intro: "Message fraternel prêt à envoyer. Relisez-le et adaptez-le si besoin." });
    },
    "export-cotis": () => exporterCotis(),
    "disc-statut": (t) => { S.f.discipline.statut = t.dataset.v; render(); },
    "ajout-disc": (t) => ouvrirFormDisc(null, t.dataset.id || "", t.dataset.motif || ""),
    "voir-disc": (t) => ouvrirDisc(t.dataset.id),
    "editer-disc": (t) => ouvrirFormDisc(t.dataset.id),
    "lever-disc": (t) => ecrire(() => S.db.doc("discipline/" + t.dataset.id).update({ statut: "Levée", leveeLe: Date.now(), leveePar: S.me.id || null, ...tampon() }), "Mesure levée"),
    "reprendre-disc": (t) => ecrire(() => S.db.doc("discipline/" + t.dataset.id).update({ statut: "En cours", ...tampon() }), "Mesure remise en cours"),
    "supprimer-disc": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("discipline/" + t.dataset.id).delete(), "Mesure supprimée")) fermer(); }),
    "choisir-photo": (t) => { const inp = $("#photo-input"); inp.dataset.mid = t.dataset.id; inp.click(); },
    "retirer-photo": (t) => boutonArme(t, "Confirmer", async () => {
      const m = membre(t.dataset.id);
      if (!m || !m.photoId) return;
      const ancien = m.photoId;
      if (!(await ecrire(() => S.db.doc("membres/" + m.id).update({ photoId: null, ...tampon() }), "Photo retirée"))) return;
      if (S.assets) { try { await S.assets.delete(ancien); } catch (e) { /* la photo reste stockée */ } }
    }),
    carte: (t) => ouvrirCarte(t.dataset.id),
    cartes: () => ouvrirCartes(),
    "dl-carte": () => {
      const c0 = S.carte;
      if (!c0) return;
      const m = membre(c0.id);
      c0.cv.toBlob((b) => { if (b) telechargerBlob(nomFichierCarte(m || { id: c0.id }), b); }, "image/png");
    },
    "zip-cartes": () => zipCartes(),
    "verifier-carte": () => verifierCarte(),
    "ajout-dec": () => ouvrirFormDec(null),
    "voir-dec": (t) => ouvrirDec(t.dataset.id),
    "editer-dec": (t) => ouvrirFormDec(t.dataset.id),
    "etat-dec": (t) => { const d = decision(t.dataset.id); if (d && d.etat !== t.dataset.etat) ecrire(() => S.db.doc("decisions/" + d.id).update({ etat: t.dataset.etat, ...tampon() }), `État : ${t.dataset.etat}`); },
    "supprimer-dec": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("decisions/" + t.dataset.id).delete(), "Décision supprimée")) fermer(); }),
  };

  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-act],[data-vue]");
    if (!t || t.disabled) return;
    if (t.dataset.vue && !t.dataset.act) { if ($("#sheet").contains(t)) fermer(); allerA(t.dataset.vue); return; }
    const h = A[t.dataset.act];
    if (h) h(t, ev);
  });
  function majFiltre(t) {
    const [vue, cle] = t.dataset.filtre.split(".");
    if (!S.f[vue]) return;
    const val = t.type === "checkbox" ? t.checked : t.value;
    if (S.f[vue][cle] === val) return;
    S.f[vue][cle] = val;
    S.limite = 80;
    render();
  }
  document.addEventListener("input", (ev) => { const t = ev.target; if (t.dataset && t.dataset.filtre && t.tagName === "INPUT") majFiltre(t); });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "photo-input") { televerserPhoto(t); return; }
    if (t.dataset && t.dataset.filtre) majFiltre(t);
  });
  document.addEventListener("error", (ev) => {
    const im = ev.target;
    if (!(im instanceof HTMLImageElement) || !im.classList.contains("photo")) return;
    const sp = document.createElement("span");
    sp.className = `av ${im.dataset.av || ""}${im.classList.contains("lg") ? " lg" : ""}`;
    sp.setAttribute("aria-hidden", "true");
    sp.textContent = im.dataset.ini || "?";
    im.replaceWith(sp);
  }, true);
  $("#sheet").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!SH.onSubmit) return;
    const form = ev.target;
    erreurForm("");
    SH.onSubmit(new FormData(form), form);
  });
  $("#scrim").addEventListener("click", () => { if (!SH.formulaire) fermer(); });
  document.addEventListener("keydown", (ev) => {
    const sheet = $("#sheet");
    if (sheet.hidden) return;
    if (ev.key === "Escape") { ev.preventDefault(); fermer(); return; }
    if (ev.key === "Tab") {
      const f = Array.from(sheet.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled])")).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const premierEl = f[0], dernier = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === premierEl) { ev.preventDefault(); dernier.focus(); }
      else if (!ev.shiftKey && document.activeElement === dernier) { ev.preventDefault(); premierEl.focus(); }
    }
  });
  $("#brand").addEventListener("click", () => allerA("accueil"));
  $("#btn-reglages").addEventListener("click", () => ouvrirReglages());
  window.addEventListener("online", () => { S.enLigne = true; render(); });
  window.addEventListener("offline", () => { S.enLigne = false; render(); });
  let jourAffiche = aujourdhui();
  setInterval(() => { if (aujourdhui() !== jourAffiche) { jourAffiche = aujourdhui(); render(); } }, 60000);

  /* ════════════════════════ Démarrage ════════════════════════ */
  async function demarrer() {
    const h = (location.hash || "").replace("#", "");
    try { const v = localStorage.getItem("sde-vue"); if (v) S.vue = v; } catch (e) { /* stockage indisponible */ }
    if (ONGLETS.some((o) => o.id === h)) S.vue = h;
    render();
    const c = window.claude;
    if (!c || typeof c.use !== "function") { S.etat = "absent"; render(); return; }
    const sur = (p) => Promise.resolve(p).catch(() => null);
    const [db, user, dl, assets] = await Promise.all([sur(c.use("db")), sur(c.use("user")), sur(c.use("downloads")), sur(c.use("assets"))]);
    S.user = user; S.dl = dl; S.assets = assets;
    if (user) {
      try { const me = await user.me(); S.me = { id: me.id || null, name: me.name || "" }; S.estProprio = !!me.isOwner; S.estAdmin = !!me.canEdit || S.estProprio; } catch (e) { /* lecture impossible */ }
      try { S.peutEcrire = await user.can("data.write"); } catch (e) { S.peutEcrire = null; }
      if (S.estAdmin) S.peutEcrire = true;
    }
    if (!db) { S.etat = "absent"; render(); return; }
    S.db = db;
    S.etat = "pret";
    abonner();
    render();
  }
  demarrer();
})();
