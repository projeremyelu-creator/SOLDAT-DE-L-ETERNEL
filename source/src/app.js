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
    programmes: ["Soldier’s Academy", "Love School", "Spiritual War School"],
    typesGarnison: ["Point SDE", "Siège", "Antenne", "Cellule", "Département", "Groupe"],
    cotisationMensuelle: 0,
    cotisationDebut: null,
    carteAnnee: null,
    signataire: "Jérémy Octave GLAZAÏ",
    signataireTitre: "Leader du Mouvement",
    signatureCarte: "Jérémy Octave",
    versetCarte: "Souffre avec moi, comme un bon soldat de Jésus-Christ.",
    versetCarteRef: "2 Timothée 2.3",
    contactCarte: "infosoldat@gmail.com · +225 07 78 68 95 73",
    lienApp: "https://claude.ai/artifact/GoENFgrqfSdyNhanWp5iaR",
    contactPriere: "",
    derniereSauvegarde: "",
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
    garnisons: ["Ils persévéraient dans l’enseignement des apôtres, dans la communion fraternelle, dans la fraction du pain, et dans les prières.", "Actes 2.42"],
    academie: ["Ce que tu as entendu de moi en présence de beaucoup de témoins, confie-le à des hommes fidèles, qui soient capables de l’enseigner aussi à d’autres.", "2 Timothée 2.2"],
    portevoix: ["Ce que je vous dis dans les ténèbres, dites-le en plein jour ; et ce qui vous est dit à l’oreille, prêchez-le sur les toits.", "Matthieu 10.27"],
    chambre: ["Tous, d’un commun accord, persévéraient dans la prière.", "Actes 1.14"],
    projets: ["Ils dirent : Levons-nous, et bâtissons ! Et ils se fortifièrent dans cette bonne résolution.", "Néhémie 2.18"],
    arsenal: ["Prenez aussi le casque du salut, et l’épée de l’Esprit, qui est la parole de Dieu.", "Éphésiens 6.17"],
  };
  const VERSETS_ANNIV = [
    "« Que l’Éternel te bénisse, et qu’il te garde ! Que l’Éternel fasse luire sa face sur toi, et qu’il t’accorde sa grâce ! » (Nombres 6.24-25)",
    "« Enseigne-nous à bien compter nos jours, afin que nous appliquions notre cœur à la sagesse. » (Psaume 90.12)",
    "« Car je connais les projets que j’ai formés sur vous, dit l’Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l’espérance. » (Jérémie 29.11)",
    "« Qu’il te donne ce que ton cœur désire, et qu’il accomplisse tous tes desseins ! » (Psaume 20.5)",
    "« C’est par moi que tes jours se multiplieront, et que les années de ta vie augmenteront. » (Proverbes 9.11)",
  ];
  const ONGLETS = [
    { id: "accueil", ico: "i-home", court: "Accueil", long: "Poste de commandement", desc: "Ézéchiel 37 · la vie du mouvement" },
    { id: "espace", ico: "i-card", court: "Mon espace", long: "Espace soldat", desc: "Ma carte, mes présences, mes cotisations, ma requête de prière" },
    { id: "membres", ico: "i-users", court: "Membres", long: "Registre des membres", desc: "Fiches, anniversaires, discipline, cartes" },
    { id: "agenda", ico: "i-cal", court: "Agenda", long: "Agenda et présences", desc: "Rassemblements et assiduité" },
    { id: "finances", ico: "i-wallet", court: "Finances", long: "Finances", desc: "Caisse, cotisations et offrandes" },
    { id: "assistant", ico: "i-spark", court: "Éliézer", long: "Assistant Éliézer", desc: "Assistant IA : questions, textes, synthèses" },
    { id: "garnisons", ico: "i-fort", court: "Garnisons", long: "Garnisons", desc: "Points SDE, carte, structures et cellules" },
    { id: "academie", ico: "i-cap", court: "Académie", long: "Académie", desc: "Formations et attestations" },
    { id: "portevoix", ico: "i-horn", court: "Porte-Voix", long: "Porte-Voix", desc: "Annonces et messages" },
    { id: "chambre", ico: "i-flame", court: "Chambre Haute", long: "Chambre Haute", desc: "Intercession et prière" },
    { id: "arsenal", ico: "i-shelf", court: "Arsenal", long: "Arsenal", desc: "Médias et bibliothèque" },
    { id: "projets", ico: "i-proj", court: "Projets", long: "Projets", desc: "Projets, tâches et cotisations de projets" },
    { id: "secretariat", ico: "i-scroll", court: "Décisions", long: "Secrétariat", desc: "Registre des décisions" },
  ];
  const PRIMAIRES = ["accueil", "membres", "agenda", "finances"];

  /* ════════════════════════ État ════════════════════════ */
  const S = {
    db: null, user: null, dl: null,
    etat: "connexion",
    me: { id: null, name: "" }, peutEcrire: null, estAdmin: false, estProprio: false,
    attente: 0, enLigne: navigator.onLine !== false, caches: {},
    cfgDoc: null,
    membres: [], evenements: [], decisions: [], moisDocs: {}, ops: {}, opsPret: {}, cotisations: {}, discipline: [], assets: null,
    garnisons: [], formations: [], annonces: [], diffusions: [], prieres: [], prieresConf: [], chaine: null, ressources: [], attest: null,
    pret: { config: false, membres: false, evenements: false, decisions: false, finances: false, cotisations: false, discipline: false, garnisons: false, formations: false, annonces: false, diffusions: false, prieres: false, prieresConf: false, chaine: false, ressources: false, suivi: false, speciales: false, offrandes: false, projets: false, projetsFin: false, affiches: false, rappels: false, acces: false },
    affiches: [], sample: null,
    projets: [], projetsFin: [], projetOnglet: "apercu", rappels: [], acces: [], horsLigne: false, cacheT: 0,
    suivi: [], speciales: [], offrandes: [], carteV: null, carteSel: "", carteLargeur: 0,
    fvue: "journal", annee: new Date().getFullYear(), carte: null,
    noms: {},
    vue: "accueil",
    sous: { membres: "tous", agenda: "avenir", secretariat: "encours", finances: "toutes", garnisons: "carte", cotis: "fixes", projets: "actifs", academie: "encours", portevoix: "annonces", chambre: "requetes", arsenal: "biblio" },
    f: { membres: { q: "", pole: "", statut: "", garnison: "" }, finances: { q: "" }, agenda: { q: "", type: "", garnison: "" }, secretariat: { q: "" }, pointage: { q: "", seuls: false, tous: false }, academie: { q: "", programme: "" }, arsenal: { q: "", type: "", theme: "" }, sel: { q: "" }, assiduite: { periode: "3m", type: "" }, cotis: { q: "", filtre: "tous" }, discipline: { statut: "encours" }, voyants: { filtre: "tous" }, speciales: { filtre: "ouvertes" }, offrandes: { type: "", q: "" }, projets: { q: "", cat: "", taches: "toutes" } },
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
  const ongletsVisibles = () => ONGLETS.filter((o) => (["membres", "secretariat", "garnisons", "academie", "portevoix", "chambre", "projets"].includes(o.id) ? accesRegistre() : o.id === "finances" ? accesFinances() || (S.etat === "connexion" && S.vue === "finances") : true));

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
      const evs = pts.filter((e) => compte(e, m)).slice(0, 3);
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
      S.evenements = q.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret.evenements = true; noteCache("evenements", q.metadata); delete S.caches.local; S.horsLigne = false; render();
    }, erreurAbo));
    const suivre = (col, cle, tri) => {
      let q = db.collection(col);
      if (tri) q = q.orderBy(tri[0], tri[1]).limit(tri[2]);
      abos.push(q.onSnapshot((snap) => { S[cle] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); S.pret[cle] = true; noteCache(cle, snap.metadata); render(); }, erreurAbo));
    };
    suivre("annonces", "annonces", ["creeLe", "desc", 200]);
    suivre("ressources", "ressources", null);
    if (accesRegistre()) {
      suivre("garnisons", "garnisons", null);
      suivre("formations", "formations", ["dateDebut", "desc", 300]);
      suivre("diffusions", "diffusions", ["creeLe", "desc", 300]);
      suivre("prieres", "prieres", ["date", "desc", 500]);
      abos.push(db.doc("chaine/semaine").onSnapshot((snap) => { S.chaine = snap.exists ? snap.data() : null; S.pret.chaine = true; noteCache("chaine", snap.metadata); render(); }, erreurAbo));
    } else { S.pret.garnisons = S.pret.formations = S.pret.diffusions = S.pret.prieres = S.pret.chaine = true; }
    if (accesFinances()) suivre("prieres_conf", "prieresConf", ["date", "desc", 300]);
    else S.pret.prieresConf = true;
    if (accesFinances()) { suivre("suivi", "suivi", null); suivre("cotis_speciales", "speciales", null); suivre("offrandes", "offrandes", ["date", "desc", 3000]); }
    else { S.pret.suivi = true; S.pret.speciales = true; S.pret.offrandes = true; }
    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;
    if (accesRegistre()) suivre("affiches", "affiches", ["creeLe", "desc", 200]); else S.pret.affiches = true;
    if (accesFinances()) suivre("projets_fin", "projetsFin", null); else S.pret.projetsFin = true;
    if (accesRegistre()) suivre("rappels", "rappels", ["jour", "desc", 60]); else S.pret.rappels = true;
    if (accesFinances()) suivre("acces", "acces", null); else S.pret.acces = true;
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
    apresRenduIA();
    apresRenduEspace();
    planifierSynchro();
    planifierCache();
    rafraichirSheet();
  }
  const dernier = { banniere: null, nav: null, main: null, sheet: null };
  function renderBanniere() {
    let html = "";
    if (S.etat === "absent") html = `<div class="banner warn"><span>Les données du mouvement s’affichent uniquement dans Claude, pour une personne connectée qui a accès à cette application.</span></div>`;
    else if (S.etat === "revoque") html = `<div class="banner danger"><span>Votre accès à ces données a changé. Rechargez la page pour continuer.</span></div>`;
    else if (S.horsLigne) html = `<div class="banner warn"><span>Mode hors ligne : vous consultez les données enregistrées sur cet appareil${S.cacheT ? " le " + fmtStamp(S.cacheT) : ""}. Les modifications reprendront au retour du réseau.</span></div>`;
    else if (!S.enLigne) html = `<div class="banner warn"><span>Connexion perdue : attendez son retour avant d’enregistrer de nouvelles données.</span></div>`;
    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda, les annonces et l’Arsenal.</span></div>`;
    if (dernier.banniere === html) return;
    dernier.banniere = html;
    $("#banner").innerHTML = html;
  }
  function renderNav() {
    const vis = ongletsVisibles();
    if (S.etat !== "connexion" && S.vue !== "plus" && !vis.some((o) => o.id === S.vue)) S.vue = "accueil";
    const estPrim = (o) => PRIMAIRES.includes(o.id) || (o.id === "espace" && !accesRegistre());
    const prim = vis.filter(estPrim);
    const autres = vis.filter((o) => !estPrim(o));
    const compact = prim.length + autres.length > 5;
    const b = (o, x) => `<button class="nav-btn${x ? " nav-x" : ""}${o.id === S.vue ? " on" : ""}" type="button" data-vue="${o.id}"${o.id === S.vue ? ' aria-current="page"' : ""}>${I(o.ico)}<span class="l-short">${o.court}</span><span class="l-long">${o.long}</span></button>`;
    const plusOn = S.vue === "plus" || autres.some((o) => o.id === S.vue);
    const html = prim.map((o) => b(o, false)).join("") + (autres.length ? `<span class="nav-sep${compact ? " nav-x" : ""}" aria-hidden="true">Modules</span>` : "") + autres.map((o) => b(o, compact)).join("")
      + (compact ? `<button class="nav-btn nav-plus${plusOn ? " on" : ""}" type="button" data-vue="plus"${S.vue === "plus" ? ' aria-current="page"' : ""}>${I("i-grid")}<span class="l-short">Plus</span><span class="l-long">Tous les modules</span></button>` : "");
    if (dernier.nav === html) return;
    dernier.nav = html;
    const nav = $("#nav");
    nav.className = "nav" + (compact ? " compact" : "");
    nav.innerHTML = html;
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
    apresRenduMain();
    initHero();
    if (garde) {
      const el = document.getElementById(garde.id);
      if (el) { el.focus({ preventScroll: true }); try { if (garde.s != null) el.setSelectionRange(garde.s, garde.e); } catch (e) { /* champ sans sélection */ } }
    }
  }
  function allerA(v, sous) {
    if (v !== "plus" && !ongletsVisibles().some((o) => o.id === v)) v = "accueil";
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
    const ann = carteAnnonces();
    if (ann) cartes.push(ann);
    if (accesRegistre()) cartes.push(carteAnniv());
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteChambre());
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesDirection()) cartes.push(carteVeille());
    if (accesDirection()) cartes.push(carteCotis());
    if (accesRegistre()) cartes.push(carteLieux());
    if (accesRegistre()) cartes.push(carteProjets());
    if (accesRegistre()) cartes.push(carteAcademie());
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
    return `<button class="row" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r">${pastilleEtat(m)}${m.statut ? `<span class="chip">${esc(m.statut)}</span>` : ""}${m.actif === false ? `<span class="chip">Archivé</span>` : ""}</span></button>`;
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
    if (accesDirection()) ongM.push(["voyants", "Voyants", null]);
    if (accesDirection()) ongM.push(["discipline", "Discipline", S.pret.discipline ? S.discipline.filter(mesureEnCours).length : null]);
    ongM.push(["archives", "Archivés", archives.length]);
    out += sousOnglets("membres", ongM);
    if ((S.sous.membres === "discipline" || S.sous.membres === "voyants") && !accesDirection()) S.sous.membres = "tous";
    const sous = S.sous.membres;
    if (sous === "discipline") return out + vueDiscipline();
    if (sous === "voyants") return out + vueVoyants();
    if (sous === "anniv") return out + listeAnniversaires(actifs);
    if (sous === "suivi") {
      if (!sp.pret) return out + vide("i-ucheck", `Le suivi pastoral s’active après <b>trois rassemblements pointés</b>. Il signale alors les membres absents des trois derniers, pour que les responsables prennent de leurs nouvelles.`, btn("vue-agenda", "Ouvrir l’agenda", { ico: "i-cal", sm: true }));
      if (!sp.liste.length) return out + vide("i-check", "Tous les membres actifs ont participé à au moins un des trois derniers rassemblements pointés.");
      return out + `<p class="note">Membres actifs absents des trois derniers rassemblements pointés, depuis le ${esc(fmtJour(sp.depuis))}. Appelez-les ou écrivez-leur pour prendre de leurs nouvelles.</p><div class="list">${sp.liste.map(rowMembre).join("")}</div>`;
    }
    const f = S.f.membres;
    out += `<div class="filters"><label class="sr" for="q-membres">Rechercher un membre</label><input class="search" id="q-membres" type="search" placeholder="Nom, matricule, téléphone, église…" value="${esc(f.q)}" data-filtre="membres.q" autocomplete="off">
      <label class="sr" for="f-pole">Pôle</label><select class="sel" id="f-pole" data-filtre="membres.pole">${options(c.poles, f.pole === "__aucun" ? "" : f.pole, "Tous les pôles")}<option value="__aucun"${f.pole === "__aucun" ? " selected" : ""}>Sans pôle</option></select>
      <label class="sr" for="f-statut">Statut</label><select class="sel" id="f-statut" data-filtre="membres.statut">${options(c.statuts, f.statut, "Tous les statuts")}</select>${S.garnisons.length ? `<label class="sr" for="f-garn">Garnison</label><select class="sel" id="f-garn" data-filtre="membres.garnison">${options(optionsGarnisons(), f.garnison === "__aucune" ? "" : f.garnison, "Toutes les garnisons")}<option value="__aucune"${f.garnison === "__aucune" ? " selected" : ""}>Sans garnison</option></select>` : ""}
      <div class="btn-row">${peutAdmin() ? btn("cartes", "Cartes", { ico: "i-card", sm: true }) : ""}${ecr ? btn("matricules", "Matricules", { ico: "i-edit", sm: true }) : ""}${peutAdmin() ? btn("espaces", "Espaces soldats", { ico: "i-card", sm: true }) : ""}${ecr ? btn("import-membres", "Importer", { ico: "i-up", sm: true }) : ""}${btn("export-membres", "Exporter", { ico: "i-down", sm: true })}</div></div>`;
    const base = sous === "archives" ? archives : actifs;
    if (!S.membres.length) return out + vide("i-users", "Le registre est vide. <b>Ajoutez le premier membre</b> ou importez une liste existante, depuis Excel, Google Sheets ou un fichier CSV.", ecr ? btn("ajout-membre", "Ajouter un membre", { ico: "i-plus", cls: "btn-primary", sm: true }) + btn("import-membres", "Importer une liste", { ico: "i-up", sm: true }) : "");
    const q = norm(f.q);
    const qTel = f.q.replace(/\D/g, "");
    const liste = base.filter((m) => {
      if (f.pole === "__aucun" ? m.pole : f.pole && m.pole !== f.pole) return false;
      if (f.statut && m.statut !== f.statut) return false;
      if (f.garnison === "__aucune" ? garnison(m.garnisonId) : f.garnison && !dansG(m, f.garnison)) return false;
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
    out += `<div class="seg fseg" role="group" aria-label="Vue des finances"><button type="button" class="${S.fvue === "journal" ? "on" : ""}" data-act="fvue" data-v="journal" aria-pressed="${S.fvue === "journal"}">${I("i-wallet")}Journal de caisse</button><button type="button" class="${S.fvue === "cotisations" ? "on" : ""}" data-act="fvue" data-v="cotisations" aria-pressed="${S.fvue === "cotisations"}">${I("i-users")}Cotisations et offrandes</button></div>`;
    if (S.fvue === "cotisations") return out + vueCotisationsTout();
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
    const meta = [e.type, fmtHeure(e.heure), garnison(e.garnisonId) ? garnison(e.garnisonId).nom : e.lieu].filter(Boolean).join(" · ");
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
    out += `<div class="filters"><label class="sr" for="q-agenda">Rechercher un rassemblement</label><input class="search" id="q-agenda" type="search" placeholder="Titre, lieu, responsable…" value="${esc(f.q)}" data-filtre="agenda.q" autocomplete="off"><label class="sr" for="f-type">Type</label><select class="sel" id="f-type" data-filtre="agenda.type">${options(c.typesEvenement, f.type, "Tous les types")}</select>${S.garnisons.length ? `<label class="sr" for="f-ag-garn">Garnison</label><select class="sel" id="f-ag-garn" data-filtre="agenda.garnison">${options(optionsGarnisons(), f.garnison, "Toutes les garnisons")}</select>` : ""}</div>`;
    const base = S.sous.agenda === "passes" ? pa : av;
    const q = norm(f.q);
    const liste = base.filter((e) => (!f.type || e.type === f.type) && (!f.garnison || e.garnisonId === f.garnison) && (!q || norm([e.titre, e.lieu, e.responsable, e.description, e.type].join(" ")).includes(q)));
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
    const voeux = a && a.dans <= 14 ? `<div class="note${a.dans === 0 ? " warn" : ""}"><p><b>${a.dans === 0 ? "C’est son anniversaire aujourd’hui." : `Anniversaire ${relLong(a.date)}.`}</b> Le message est prêt.</p><div class="btn-row">${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}${btn("affiche-anniv", "Affiche d’anniversaire", { ico: "i-image", sm: true, data: `data-id="${esc(m.id)}"` })}</div></div>` : "";
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
      ${blocVoyants(m)}
      ${kv([["Matricule", `${m.matricule ? `<span class="num">${esc(m.matricule)}</span>` : `<span class="muted">Aucun</span>`}${ecr ? ` <button class="link" type="button" data-act="editer-matricule" data-id="${esc(m.id)}">Modifier</button>` : ""}`], ["Téléphone", tel], ["Autre numéro", m.telephone2 ? `<span class="num">${esc(telAffiche(m.telephone2))}</span>` : ""], ["E-mail", m.email ? esc(m.email) : ""], ["Naissance", naiss], ["Sexe", m.sexe === "H" ? "Homme" : m.sexe === "F" ? "Femme" : ""], ["Situation", esc(m.situation || "")], ["Baptême", esc(baptiseLib(m))], ["Quartier", esc(m.quartier || "")], ["Église", esc(m.eglise || "")], ["Implantation", esc(m.implantation || "")], ["Garnison", garnison(m.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(m.garnisonId)}">${esc(cheminG(m.garnisonId))}</button>` : ""], ["Pôle", esc(m.pole || "")], ["Département", esc(m.departement || "")], ["Membre depuis", m.adhesion ? esc(fmtJour(m.adhesion)) : ""], ["Observations", m.notes ? `<span style="white-space:pre-wrap">${esc(m.notes)}</span>` : ""]])}
      <h3 class="h3">Assiduité</h3>${blocAssiduite(m)}
      ${blocParcours(m)}${blocProjetsMembre(m)}${cotis}${blocEspaceMembre(m)}${accesDirection() ? blocCotisAutres(m) : ""}${disc}
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
        ${S.garnisons.length ? `<div class="f2">${champ("m-garn", "Garnison", sel("m-garn", "garnisonId", optionsGarnisons(), m.garnisonId, "Aucune"))}<div></div></div>` : ""}
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
    const data = { matricule, nom, prenoms: g("prenoms"), sexe: g("sexe"), situation: g("situation"), baptise: g("baptise"), anniv, annee, telephone: g("telephone"), telephone2: g("telephone2"), email, quartier: g("quartier"), eglise: g("eglise"), implantation: g("implantation"), pole: g("pole"), departement: g("departement"), fonction: g("fonction"), statut: g("statut"), adhesion: g("adhesion"), notes: g("notes"), cotisationExempte: fd.get("cotisationExempte") === "1", ...(S.garnisons.length ? { garnisonId: g("garnisonId") } : {}) };
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
      ${o.cotisation ? `<p class="note">Cotisation de ${esc(libListeMois(o.cotisation.mois || [], o.cotisation.annee))}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis les cotisations.</p>` : ""}${noteOpLiee(o)}
      <div class="actions">
        ${o.sens === "E" && !o.annule ? btn("recu-op", "Reçu", { ico: "i-receipt", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}
        ${adm && ouvert && !o.annule && !o.cotisation && !o.speciale && !o.offrande && !o.projet ? btn("editer-op", "Modifier", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}${adm && ouvert && !o.annule ? btn("annuler-op", "Annuler l’opération", { ico: "i-x", cls: "btn-danger", data: `data-id="${esc(o.id)}" data-mois="${esc(cle)}"` }) : ""}
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
        try { await synchroAutresOp(o, true); } catch (e) { toast("La cotisation spéciale ou l’offrande liée n’a pas pu être mise à jour.", "err"); }
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
  function ouvrirFormEvt(id, preset) {
    const c = cfg();
    const e = id ? evt(id) : { ...(preset || {}) };
    if (!id && e.garnisonId && garnison(e.garnisonId) && !e.titre) e.titre = `${e.type || "Réunion"} · ${garnison(e.garnisonId).nom}`;
    if (!id && e.garnisonId && garnison(e.garnisonId) && !e.lieu) { const g0 = garnison(e.garnisonId); e.lieu = g0.lieuReunion || ""; e.heure = g0.heure || ""; }
    if (id && !e) return;
    const html = `<form class="form" id="f-evt" novalidate>
      ${champ("e-titre", "Intitulé", inp("e-titre", "titre", e.titre, 'autocomplete="off" required autofocus placeholder="Culte d’adoration, réunion des responsables…"'), { req: true })}
      <div class="f2">${champ("e-type", "Type", sel("e-type", "type", c.typesEvenement, e.type || c.typesEvenement[0], null))}${champ("e-date", "Date", inp("e-date", "date", e.date || aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("e-heure", "Heure de début", inp("e-heure", "heure", e.heure, 'type="time"'))}${champ("e-fin", "Heure de fin", inp("e-fin", "fin", e.fin, 'type="time"'))}</div>
      ${champ("e-lieu", "Lieu", inp("e-lieu", "lieu", e.lieu, 'autocomplete="off"'))}
      ${champ("e-resp", "Responsable", inp("e-resp", "responsable", e.responsable, 'autocomplete="off"'))}
      ${S.garnisons.length ? champ("e-garn", "Garnison concernée", sel("e-garn", "garnisonId", optionsGarnisons(), e.garnisonId, "Tout le mouvement"), { hint: "Pour une réunion de cellule ou d’antenne : seuls ses membres sont pointés et comptés dans l’assiduité." }) : ""}
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
    const data = { titre, type: g("type"), date, heure: g("heure"), fin: g("fin"), lieu: g("lieu"), responsable: g("responsable"), description: g("description"), garnisonId: g("garnisonId") };
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
      ${kv([["Date", esc(fmtLong(e.date))], ["Horaire", esc(horaire)], ["Lieu", esc(e.lieu || "")], ["Garnison", garnison(e.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(e.garnisonId)}">${esc(cheminG(e.garnisonId))}</button>` : ""], ["Responsable", esc(e.responsable || "")], ["Description", e.description ? `<span style="white-space:pre-wrap">${esc(e.description)}</span>` : ""]])}
      <h3 class="h3">Présences</h3>
      ${tot || nx ? `<p class="tally"><span><b>${nb(tot)}</b> au total</span><span>${pluriel(np, "membre", "membres")}${nr ? ` dont ${pluriel(nr, "retard", "retards")}` : ""}</span>${nx ? `<span>${pluriel(nx, "absence excusée", "absences excusées")}</span>` : ""}<span>${pluriel(vi, "visiteur", "visiteurs")}</span><span>${pluriel(nv, "nouveau venu", "nouveaux venus")}</span></p>` : `<p class="hint">${passe ? "Les présences n’ont pas été pointées." : "Le pointage se fait le jour du rassemblement."}</p>`}
      <div class="actions">
        ${ecr ? btn("pointer-evt", tot ? "Compléter le pointage" : "Pointer les présences", { ico: "i-ucheck", cls: "btn-primary", data: `data-id="${esc(e.id)}"` }) : ""}
        ${btn("annonce-evt", "Message d’annonce", { ico: "i-horn", data: `data-id="${esc(e.id)}"` })}
        ${btn("affiche-evt", "Créer l’affiche", { ico: "i-image", data: `data-id="${esc(e.id)}"` })}
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
    const actifs = membresActifs().filter((m) => f.tous || concerne(e, m));
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
      <div class="filters"><label class="sr" for="q-pt">Rechercher un membre</label><input class="search" id="q-pt" type="search" placeholder="Rechercher un membre…" value="${esc(f.q)}" data-filtre="pointage.q" autocomplete="off"><button class="chip-btn solo${f.seuls ? " on" : ""}" type="button" data-act="pt-seuls" aria-pressed="${f.seuls}">Pointés seulement</button>${e.garnisonId && garnison(e.garnisonId) ? `<button class="chip-btn solo${f.tous ? " on" : ""}" type="button" data-act="pt-tous" aria-pressed="${!!f.tous}">Afficher tout le mouvement</button>` : ""}</div>${e.garnisonId && garnison(e.garnisonId) && !f.tous ? `<p class="hint" style="margin:-6px 0 10px">Réunion de ${esc(garnison(e.garnisonId).nom)} : seuls ses membres sont listés et comptés.</p>` : ""}
      ${actifs.length ? (liste.length ? `<div class="list">${rows}</div>${liste.length > 400 ? `<p class="hint" style="margin-top:8px">Affinez la recherche pour voir les autres membres.</p>` : ""}` : vide("i-search", "Aucun membre ne correspond.")) : vide("i-users", "Le registre est vide : ajoutez des membres pour les pointer. Les visiteurs et nouveaux venus se comptent ci-dessus.")}`;
  }
  function ouvrirPointage(id) {
    if (S.pt.id && S.pt.id !== id) envoyerPointage(S.pt, true);
    if (S.pt.id !== id) S.pt = nouveauPointage(id);
    S.f.pointage = { q: "", seuls: false, tous: false };
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
          <li><b>Lecture seule</b> : agenda, annonces et Arsenal.</li>
          <li><b>Contributeur</b> : en plus, registre des membres, présences, garnisons, Académie, Porte-Voix, Chambre Haute et secrétariat.</li>
          <li><b>Éditeur et propriétaire</b> : en plus, finances, cotisations, discipline, requêtes confidentielles, dépôt de fichiers et réglages.</li>
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
        <div class="f2">${champ("r-sigc", "Signature imprimée sur la carte", inp("r-sigc", "signatureCarte", signatureCarte(), 'autocomplete="off"'), { hint: "Le signataire ci-dessus reste utilisé pour les attestations." })}${champ("r-cont", "Contact au verso", inp("r-cont", "contactCarte", c.contactCarte, 'autocomplete="off"'), { hint: "Séparez deux lignes par « · »." })}</div>
        <div class="f2">${champ("r-vc", "Verset du verso", zone("r-vc", "versetCarte", c.versetCarte, 'rows="2"'))}${champ("r-vcr", "Référence du verset", inp("r-vcr", "versetCarteRef", c.versetCarteRef, 'autocomplete="off"'))}</div>
        ${champ("r-can", "Cartes valables jusqu’au 31 décembre", sel("r-can", "carteAnnee", [0, 1, 2].map((k) => { const y = new Date().getFullYear() + k; return [String(y), String(y)]; }), String(anneeCarte()), null))}
      </fieldset>` : ""}
      <fieldset class="fs"${dis}><legend>Registre et agenda</legend>
        ${champ("r-poles", "Pôles", zone("r-poles", "poles", lignes(c.poles), 'rows="5"'), { hint: "Un par ligne. « Pôle 1 · Intitulé » s’affiche en abrégé « Pôle 1 » dans les listes." })}
        <div class="f2">${champ("r-statuts", "Statuts des membres", zone("r-statuts", "statuts", lignes(c.statuts), 'rows="4"'))}${champ("r-types", "Types de rassemblements", zone("r-types", "typesEvenement", lignes(c.typesEvenement), 'rows="4"'))}</div>
        ${champ("r-inst", "Instances de décision", zone("r-inst", "instances", lignes(c.instances), 'rows="4"'))}
        <div class="f2">${champ("r-prog", "Programmes de l’Académie", zone("r-prog", "programmes", lignes(c.programmes), 'rows="4"'))}${champ("r-tg", "Types de garnisons", zone("r-tg", "typesGarnison", lignes(c.typesGarnison), 'rows="4"'))}</div>
        ${champ("r-msg", "Message d’anniversaire", zone("r-msg", "messageAnniv", c.messageAnniv, 'rows="4"'), { hint: "{prenom}, {mouvement} et {verset} sont remplacés automatiquement." })}
      </fieldset>
      <fieldset class="fs"><legend>Données</legend>
        <p class="hint">Les exports restent sur votre appareil. Gardez-les en lieu sûr : ils contiennent des données personnelles.</p>
        <div class="btn-row">${accesRegistre() ? btn("export-membres", "Membres (CSV)", { ico: "i-down", sm: true }) : ""}${peutEcrire() && accesRegistre() ? btn("import-membres", "Importer des membres", { ico: "i-up", sm: true }) : ""}${accesRegistre() ? btn("export-tout", "Sauvegarde complète (JSON)", { ico: "i-down", sm: true }) : ""}${accesRegistre() ? btn("sauvegarde-excel", "Sauvegarde Excel", { ico: "i-down", sm: true }) : ""}${accesRegistre() ? btn("copie-poche", "Copie de poche (hors ligne)", { ico: "i-down", sm: true }) : ""}${btn("installer", "Installer sur le téléphone", { ico: "i-phone", sm: true })}</div>
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
      poles: liste("poles", c.poles), statuts: liste("statuts", c.statuts), typesEvenement: liste("typesEvenement", c.typesEvenement), instances: liste("instances", c.instances), programmes: liste("programmes", c.programmes), typesGarnison: liste("typesGarnison", c.typesGarnison),
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
      data.signatureCarte = g("signatureCarte") || DEFAUTS.signatureCarte;
      data.contactCarte = g("contactCarte");
      data.versetCarte = g("versetCarte") || DEFAUTS.versetCarte;
      data.versetCarteRef = g("versetCarteRef") || DEFAUTS.versetCarteRef;
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
    const ev = evts.filter((e) => compte(e, m));
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
      const evs = pts.filter((e) => compte(e, m));
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
    out += `<h2 class="h3" style="margin-top:22px">Feuille de présence</h2><p class="hint" style="margin:0 0 8px">${pluriel(cols.length, "dernier rassemblement pointé", "derniers rassemblements pointés")}. P présent · R retard · E excusé · point : absent · tiret : non concerné (pas encore membre, ou réunion d’une autre garnison).</p>
      <div class="table-wrap"><table class="t feuille"><thead><tr><th scope="col">Membre</th>${cols.map((e) => `<th scope="col" title="${esc(e.titre)}">${esc(fmtCourt(e.date))}</th>`).join("")}<th scope="col">Taux</th></tr></thead><tbody>${tri.map(({ m, s }) => `<tr><th scope="row">${esc(nomComplet(m))}</th>${cols.map((e) => {
        if (!compte(e, m)) return `<td class="na">–</td>`;
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
    const pts = evenementsPointes().filter((e) => compte(e, m));
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
        if (!compte(e, m)) return "";
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
    x.fillStyle = "#f3e3b0"; ecrireAjuste(x, signatureCarte(), 52, 548, 520, 52, `400 {t}px "Great Vibes", "Brush Script MT", cursive`, 26);
    const sw = Math.min(520, x.measureText(signatureCarte()).width);
    x.strokeStyle = "rgba(243,227,176,.75)"; x.lineWidth = 2; x.beginPath(); x.moveTo(50, 562); x.bezierCurveTo(50 + sw * 0.35, 572, 50 + sw * 0.7, 552, 56 + sw, 560); x.stroke();
    x.fillStyle = BRUME; ecrireAjuste(x, `${signatureCarte()} · ${c.signataireTitre}`, 44, 594, 560, 17, `400 {t}px ${CORPS}`, 11);
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
  function ouvrirCartes() {
    const actifs = membresActifs();
    ouvrir({
      titre: "Cartes de membre", wide: true,
      html: `<p>Cartes ${anneeCarte()} recto-verso signées « ${esc(signatureCarte())} », avec la photo du membre lorsqu’elle existe, un code QR, le point SDE et un code de contrôle.</p>
        <div class="actions">${btn("pdf-cartes", `Toutes les cartes en PDF (${nb(actifs.length)})`, { ico: "i-down", cls: "btn-primary", attrs: actifs.length ? "" : "disabled" })}${btn("zip-cartes", "Images PNG (ZIP)", { ico: "i-image", attrs: actifs.length ? "" : "disabled" })}</div>
        <div class="progress" id="zip-prog" hidden style="margin-top:12px"><i></i></div><p class="hint" id="zip-etat"></p>
        <p class="hint">Le PDF contient le recto puis le verso de chaque carte, au format carte bancaire (85,6 × 54 mm), prêt pour l’imprimeur. Le ZIP contient deux images PNG par membre. Pour une seule carte, ouvrez la fiche du membre.</p>
        <hr class="sep"><h3 class="h3">Vérifier une carte ou une attestation</h3><p class="hint">Saisissez le matricule et le code de contrôle imprimés sur le document, ou lus dans son code QR.</p>
        <div class="f2" style="margin-top:10px">${champ("v-mat", "Matricule", inp("v-mat", "vmat", "", 'autocomplete="off" autocapitalize="characters" placeholder="SDE-0001"'))}${champ("v-code", "Code de contrôle", inp("v-code", "vcode", "", 'autocomplete="off" autocapitalize="characters" placeholder="6 caractères"'))}</div>
        <div class="actions">${btn("verifier-carte", "Vérifier", { ico: "i-check" })}</div><div id="v-res" aria-live="polite"></div>`,
    });
  }
  async function zipCartes() { return lotCartes("zip"); }
  async function verifierCarte() {
    const zoneR = $("#v-res");
    const mat = String(($("#v-mat") || {}).value || "").trim().toUpperCase();
    const code = String(($("#v-code") || {}).value || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!zoneR) return;
    if (!mat || !code) { zoneR.innerHTML = `<p class="err">Indiquez le matricule et le code de contrôle.</p>`; return; }
    const mActuel = S.membres.find((x) => String(x.matricule || "").toUpperCase() === mat);
    const mAncien = mActuel ? null : S.membres.find((x) => (x.anciensMatricules || []).some((a) => String(a).toUpperCase() === mat));
    const m = mActuel || (mAncien ? { ...mAncien, matricule: mat } : null);
    if (!m) { zoneR.innerHTML = `<p class="note danger">Aucun membre du registre ne porte le matricule ${esc(mat)}.</p>`; return; }
    if (mAncien) zoneR.innerHTML = `<p class="hint">${esc(mat)} est un ancien matricule de ${esc(nomComplet(mAncien))}, remplacé par ${esc(mAncien.matricule || "—")}.</p>`;
    const an = anneeCarte();
    let annee = null;
    for (const y of [an, an - 1, an + 1]) if ((await codeControle(m, y)) === code) { annee = y; break; }
    if (!annee) for (const f of S.formations) {
      const p = (f.participants || {})[m.id];
      if (p && p.statut === "Certifié" && (await codeAttestation(m, f)) === code) { zoneR.innerHTML = `<div class="note"><p><b>Attestation authentique</b> : ${esc(nomComplet(m))}, formation « ${esc(f.titre)} »${p.mention && p.mention !== "Sans mention" ? `, mention ${esc(p.mention)}` : ""}.</p>${p.certifieLe ? `<p>Certifiée le ${esc(fmtJour(p.certifieLe))}.</p>` : ""}</div>`; return; }
    }
    if (!annee) { zoneR.innerHTML = `<p class="note danger">Le code ${esc(code)} ne correspond ni à la carte ni à une attestation de ${esc(nomComplet(m))}. La carte a pu être modifiée, ou le nom a changé depuis son impression.</p>`; return; }
    const expiree = annee < new Date().getFullYear();
    zoneR.innerHTML = `<div class="note ${m.actif === false || expiree ? "warn" : ""}"><p><b>Carte authentique</b> : ${esc(nomComplet(m))}${m.fonction ? `, ${esc(m.fonction)}` : ""}.</p><p>Valable jusqu’au 31/12/${annee}${expiree ? " : carte expirée" : ""}. ${m.actif === false ? "Ce membre est archivé." : "Membre actif."}</p></div>`;
  }

  /* ════════════════════════ Outils communs aux modules ════════════════════════ */
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const jourIdx = (iso) => ((versDate(iso).getDay() + 6) % 7) + 1;
  const urlSure = (u) => (/^https?:\/\/[^\s<>"]+$/i.test(String(u || "").trim()) ? String(u).trim() : "");
  const nomCourtM = (m) => (m ? `${prenomUsuel(m)} ${String(m.nom || "").toUpperCase()}`.trim() : "");
  const plusieurs = (ids) => ids.map((id) => membre(id)).filter(Boolean);
  async function upsert(path, data) {
    return enFile("doc:" + path, async () => {
      const ref = S.db.doc(path);
      const cur = await ref.get();
      if (cur.exists) await ref.update({ ...data, ...tampon() });
      else await ref.set({ ...data, ...creation() });
    });
  }
  /* Plusieurs écritures à la suite, avec reprise si la plateforme demande de ralentir. */
  async function lot(ops, ok) {
    if (!S.db || !ops.length) return true;
    S.attente += 1; majSync();
    let faits = 0, err = null;
    for (const op of ops) {
      let reussi = false;
      for (let essai = 0; essai < 4 && !reussi && !err; essai += 1) {
        try { await op(); reussi = true; }
        catch (e) { if (e && (e.code === "resource_exhausted" || e.code === "unavailable")) { await sleep(800 * (essai + 1)); continue; } err = e; }
      }
      if (reussi) faits += 1;
      if (err) break;
    }
    S.attente -= 1; majSync();
    if (faits < ops.length) toast(`${nb(faits)} sur ${nb(ops.length)} enregistrés. ${messageErreur(err)}`, "err");
    else if (ok) toast(ok);
    return faits === ops.length;
  }

  /* Choix de membres dans une liste à cocher, réutilisé par plusieurs modules */
  const CHK = { ids: new Set(), base: null, meta: null, onValider: null, libelle: "Valider", intro: "" };
  function ouvrirChoix({ titre, intro = "", selection = [], base = null, meta = null, onValider, libelle = "Valider" }) {
    CHK.ids = new Set(selection); CHK.base = base; CHK.meta = meta; CHK.onValider = onValider; CHK.libelle = libelle; CHK.intro = intro;
    S.f.sel = { q: "" };
    ouvrir({ titre, wide: true, refresh: ficheChoix });
  }
  function listeChoix() {
    const base = CHK.base ? CHK.base() : membresActifs();
    const q = norm(S.f.sel.q);
    return base.filter((m) => !q || norm(`${nomComplet(m)} ${m.matricule || ""} ${m.fonction || ""} ${m.quartier || ""}`).includes(q));
  }
  function ficheChoix() {
    const liste = listeChoix();
    const rows = liste.map((m) => {
      const meta = CHK.meta ? CHK.meta(m) : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · ");
      return `<button class="row" type="button" data-act="sel-basculer" data-mid="${esc(m.id)}" aria-pressed="${CHK.ids.has(m.id)}"><span class="tick">${I("i-check")}</span><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span></button>`;
    }).join("");
    return `${CHK.intro ? `<p class="hint" style="margin-bottom:10px">${CHK.intro}</p>` : ""}<p class="tally"><span><b>${nb(CHK.ids.size)}</b> ${CHK.ids.size > 1 ? "sélectionnés" : "sélectionné"}</span></p>
      <div class="filters"><label class="sr" for="q-sel">Rechercher un membre</label><input class="search" id="q-sel" type="search" placeholder="Rechercher un membre…" value="${esc(S.f.sel.q)}" data-filtre="sel.q" autocomplete="off"><div class="btn-row">${btn("sel-tous", "Tout cocher", { sm: true })}${btn("sel-aucun", "Tout décocher", { sm: true })}</div></div>
      ${liste.length ? `<div class="list">${rows}</div>` : vide("i-search", "Aucun membre ne correspond.")}
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Annuler</button><button class="btn btn-primary" type="button" data-act="sel-valider">${esc(CHK.libelle)}</button></div>`;
  }

  /* ════════════════════════ Garnisons ════════════════════════ */
  const STATUTS_G = ["Active", "En ouverture", "En sommeil"];
  const garnison = (id) => (id ? S.garnisons.find((g) => g.id === id) || null : null);
  function ordreG(a, b) {
    const t = cfg().typesGarnison;
    const ia = t.indexOf(a.type), ib = t.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || cmpFr(a.nom || "", b.nom || "");
  }
  const enfantsG = (gid) => S.garnisons.filter((g) => (garnison(g.parentId) ? g.parentId : "") === (gid || "")).sort(ordreG);
  function ancetresG(gid) {
    const out = [];
    let g = garnison(gid);
    const vus = new Set();
    while (g && !vus.has(g.id)) { out.push(g.id); vus.add(g.id); g = garnison(g.parentId); }
    return out;
  }
  function descendantsG(gid) {
    const out = new Set([gid]);
    let ajout = true;
    while (ajout) { ajout = false; for (const g of S.garnisons) if (g.parentId && out.has(g.parentId) && !out.has(g.id)) { out.add(g.id); ajout = true; } }
    return out;
  }
  const dansG = (m, gid) => !!m.garnisonId && ancetresG(m.garnisonId).includes(gid);
  const membresDeG = (gid, inclureSous) => membresActifs().filter((m) => (inclureSous ? dansG(m, gid) : m.garnisonId === gid));
  const cheminG = (gid) => ancetresG(gid).map((id) => garnison(id).nom).reverse().join(" › ");
  /* Un rassemblement lié à une garnison ne compte que pour ses membres (et ceux des structures qui en dépendent). */
  function concerne(e, m) {
    if (!e.garnisonId || !garnison(e.garnisonId)) return true;
    const v = presentsEffectifs(e)[m.id];
    if (v !== undefined && v !== null) return true;
    return dansG(m, e.garnisonId);
  }
  const compte = (e, m) => (!m.adhesion || e.date >= m.adhesion) && concerne(e, m);
  function optionsGarnisons(exclure) {
    const out = [];
    const parcourir = (gid, niv) => { for (const g of enfantsG(gid)) { if (exclure && exclure.has(g.id)) continue; out.push([g.id, `${"— ".repeat(niv)}${g.nom}`]); parcourir(g.id, niv + 1); } };
    parcourir("", 0);
    return out;
  }
  function rowGarnison(g, niv) {
    const n = membresDeG(g.id, false).length;
    const resp = membre(g.responsableId);
    const meta = [g.type, [g.ville || g.quartier, g.pays].filter(Boolean).join(", "), g.jour ? `${g.jour}${g.heure ? " " + fmtHeure(g.heure) : ""}` : "", resp ? "resp. " + nomCourtM(resp) : ""].filter(Boolean).join(" · ");
    return `<button class="row g-row" style="--niv:${niv}" type="button" data-act="voir-garnison" data-id="${esc(g.id)}"><span class="g-ico" aria-hidden="true">${I("i-fort")}</span><span class="row-main"><span class="row-t">${esc(g.nom || "Sans nom")}</span>${meta ? `<span class="row-m">${esc(meta)}</span>` : ""}</span><span class="row-r"><span class="chip">${pluriel(n, "membre", "membres")}</span>${g.statut && g.statut !== "Active" ? `<span class="chip warn">${esc(g.statut)}</span>` : ""}</span></button>`;
  }
  function arbreGarnisons() {
    const lignes = [];
    const parcourir = (gid, niv) => { for (const g of enfantsG(gid)) { lignes.push(rowGarnison(g, niv)); parcourir(g.id, niv + 1); } };
    parcourir("", 0);
    return lignes.join("");
  }
  VUES.garnisons = function () {
    const ecr = peutEcrire();
    let out = secHead("Garnisons", { eyebrow: "Points SDE, structures et cellules", verset: VERSETS.garnisons, actions: ecr ? btn("ouvrir-point", "Nouveau point SDE", { ico: "i-pin" }) + btn("ajout-garnison", "Nouvelle garnison", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les structures et cellules du mouvement");
    if (!S.pret.garnisons || !S.pret.membres) return out + chargement("Lecture des garnisons…");
    const actifs = membresActifs();
    const sans = actifs.filter((m) => !garnison(m.garnisonId));
    out += sousOnglets("garnisons", [["carte", "Cartographie", pointsSDE().length], ["structures", "Structures", S.garnisons.length], ["sans", "Non rattachés", sans.length]]);
    if (S.sous.garnisons === "carte") return out + vueCartographie();
    if (S.sous.garnisons === "sans") {
      if (!sans.length) return out + vide("i-check", "Tous les membres actifs sont rattachés à une garnison.");
      return out + `<p class="note">Pour rattacher plusieurs membres d’un coup, ouvrez une garnison puis « Ajouter ou retirer des membres ». Pour un seul membre, modifiez sa fiche.</p><div class="list">${sans.map(rowMembre).join("")}</div>`;
    }
    if (!S.garnisons.length) return out + vide("i-fort", "Aucune garnison enregistrée. Créez le siège, les antennes et les cellules du mouvement, puis rattachez-y les membres : chaque garnison aura son effectif, ses réunions et son assiduité.", ecr ? btn("ajout-garnison", "Créer la première garnison", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const actives = S.garnisons.filter((g) => (g.statut || "Active") === "Active").length;
    const pays = new Set(S.garnisons.map((g) => isoDePays(g.pays) || norm(g.pays)).filter(Boolean)).size;
    const cellules = S.garnisons.filter((g) => g.type === "Cellule").length;
    const nbPoints = pointsSDE().length;
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-fort")}Garnisons actives</span><span class="stat-v">${nb(actives)}</span><span class="stat-m">sur ${pluriel(S.garnisons.length, "structure", "structures")}</span></div>
      <div class="stat"><span class="stat-l">Points SDE</span><span class="stat-v">${nb(nbPoints)}</span><span class="stat-m">${pluriel(cellules, "cellule", "cellules")}</span></div>
      <div class="stat"><span class="stat-l">Membres rattachés</span><span class="stat-v">${nb(actifs.length - sans.length)}</span><span class="stat-m">${pluriel(sans.length, "non rattaché", "non rattachés")}</span></div>
      <div class="stat"><span class="stat-l">Pays</span><span class="stat-v">${nb(pays)}</span><span class="stat-m">Où le mouvement est implanté</span></div></div>`;
    return out + `<div class="list">${arbreGarnisons()}</div>`;
  };
  function ficheGarnison(id) {
    const g = garnison(id);
    if (!g) return null;
    const ecr = peutEcrire();
    const parent = garnison(g.parentId);
    const resp = membre(g.responsableId), adj = membre(g.adjointId);
    const mbs = membresDeG(g.id, false);
    const tous = membresDeG(g.id, true);
    const evts3 = evtsPeriode("3m", "");
    const taux = tous.map((m) => statsMembre(m, evts3).taux).filter((t) => t != null);
    const moy = taux.length ? taux.reduce((a, b) => a + b, 0) / taux.length : null;
    const sous = enfantsG(g.id);
    const prochains = aVenir().filter((e) => e.garnisonId === g.id).slice(0, 4);
    const lien = (m) => (m ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomUsuel(m))}</button>${m.telephone ? ` <span class="num muted">${esc(telAffiche(m.telephone))}</span>` : ""}` : "");
    const reunion = [g.jour, g.heure ? fmtHeure(g.heure) : "", g.lieuReunion].filter(Boolean).join(" · ");
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-fort")}</span><div><h3>${esc(g.nom)}</h3><p>${esc([g.type, g.statut && g.statut !== "Active" ? g.statut : ""].filter(Boolean).join(" · "))}</p></div></div>
      <div class="counters"><div class="counter"><span class="lab">Effectif</span><div class="counter-c"><b>${nb(tous.length)}</b></div><span class="hint">${sous.length ? `dont ${nb(mbs.length)} rattachés directement` : "membres actifs"}</span></div><div class="counter"><span class="lab">Assiduité · 3 mois</span><div class="counter-c"><b>${pct(moy)}</b></div><span class="hint">Moyenne des membres</span></div></div>
      ${kv([["Rattachée à", parent ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(parent.id)}">${esc(parent.nom)}</button>` : ""], ["Implantation", esc([g.quartier, g.ville, g.pays].filter(Boolean).join(", "))], ["Réunions", esc(reunion)], ["Responsable", lien(resp)], ["Adjoint", lien(adj)], ["Description", g.description ? `<span style="white-space:pre-wrap">${esc(g.description)}</span>` : ""]])}
      ${sous.length ? `<h3 class="h3">Structures rattachées</h3><div class="list">${sous.map((x) => rowGarnison(x, 0)).join("")}</div>` : ""}
      <h3 class="h3">Prochaines réunions</h3>${prochains.length ? `<div class="list">${prochains.map(rowEvt).join("")}</div>` : `<p class="hint">Aucune réunion programmée pour cette garnison.</p>`}
      <h3 class="h3">Membres (${nb(mbs.length)})</h3>${mbs.length ? `<div class="list">${mbs.map(rowMembre).join("")}</div>` : `<p class="hint">Aucun membre rattaché directement.</p>`}
      ${estPoint(g) || isoDePays(g.pays) ? `<div class="btn-row" style="margin-top:12px">${btn("carte-voir", "Voir sur la carte", { ico: "i-pin", sm: true, data: `data-id="${esc(estPoint(g) ? g.id : (pointDeGarnison(g.id) || g).id)}"` })}</div>` : ""}
      ${ecr ? `<div class="actions">${btn("membres-garnison", "Ajouter ou retirer des membres", { ico: "i-users", cls: "btn-primary", data: `data-id="${esc(g.id)}"` })}${btn("ajout-evt", "Programmer une réunion", { ico: "i-cal", data: `data-garnison="${esc(g.id)}" data-type="Réunion"` })}${btn("ecrire", "Écrire aux membres", { ico: "i-horn", data: `data-aud="garnison" data-val="${esc(g.id)}"` })}${btn("editer-garnison", "Modifier", { ico: "i-edit", data: `data-id="${esc(g.id)}"` })}${peutAdmin() ? btn("supprimer-garnison", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(g.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirGarnison = (id) => ouvrir({ titre: "Garnison", refresh: surveiller(() => ficheGarnison(id)) });
  function ouvrirFormGarnison(id, parentId, preset) {
    const c = cfg();
    const g = id ? garnison(id) : { parentId: parentId || "", pays: garnison(parentId) ? garnison(parentId).pays || "" : "Côte d’Ivoire", statut: "Active", ...(preset || {}) };
    if (id && !g) return;
    const exclus = id ? descendantsG(id) : null;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const html = `<form class="form" id="f-garnison" novalidate>
      ${champ("g-nom", "Nom", inp("g-nom", "nom", g.nom, 'autocomplete="off" required autofocus placeholder="Siège, Antenne Italie, Cellule de Yopougon…"'), { req: true })}
      <div class="f2">${champ("g-type", "Type", sel("g-type", "type", c.typesGarnison, g.type || c.typesGarnison[0], null))}${champ("g-parent", "Rattachée à", sel("g-parent", "parentId", optionsGarnisons(exclus), g.parentId, "Aucune (niveau principal)"))}</div>
      <div class="f2">${champ("g-statut", "Statut", sel("g-statut", "statut", STATUTS_G, g.statut || "Active", null))}${champ("g-pays", "Pays", inp("g-pays", "pays", g.pays, 'autocomplete="off" list="dl-pays"') + `<datalist id="dl-pays">${PAYS_SDE.concat(PAYS_GEO.map((p) => p[1]).filter((n) => !PAYS_SDE.includes(n)).sort(cmpFr)).map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>`, { hint: "Place le point sur la carte." })}</div>
      <div class="f2">${champ("g-ville", "Ville", inp("g-ville", "ville", g.ville, 'autocomplete="off" placeholder="Abidjan"'))}${champ("g-quartier", "Commune, quartier ou adresse", inp("g-quartier", "quartier", g.quartier, 'autocomplete="off" placeholder="Cocody Deux-Plateaux"'))}</div>
      <fieldset class="fs"><legend>Réunions habituelles</legend>
        <div class="f2">${champ("g-jour", "Jour", sel("g-jour", "jour", JOURS, g.jour, "Non fixé"))}${champ("g-heure", "Heure", inp("g-heure", "heure", g.heure, 'type="time"'))}</div>
        ${champ("g-lieu", "Lieu de réunion", inp("g-lieu", "lieuReunion", g.lieuReunion, 'autocomplete="off"'))}
      </fieldset>
      <fieldset class="fs"><legend>Encadrement</legend>
        <div class="f2">${champ("g-resp", "Responsable", sel("g-resp", "responsableId", mbs, g.responsableId, "Non désigné"))}${champ("g-adj", "Adjoint", sel("g-adj", "adjointId", mbs, g.adjointId, "Non désigné"))}</div>
        ${champ("g-desc", "Description", zone("g-desc", "description", g.description, 'rows="3" placeholder="Mission, public, particularités…"'))}
      </fieldset>
      ${pied(id ? "Enregistrer les modifications" : "Créer la garnison")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la garnison" : "Nouvelle garnison", html, wide: true, onSubmit: (fd, form) => enregistrerGarnison(fd, form, id) });
  }
  async function enregistrerGarnison(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("nom")) { erreurForm("Indiquez le nom de la garnison."); $("#g-nom").focus(); return; }
    const doublon = S.garnisons.find((x) => x.id !== id && norm(x.nom) === norm(g("nom")));
    if (doublon) { erreurForm(`Une garnison porte déjà le nom « ${doublon.nom} ».`); return; }
    if (g("responsableId") && g("responsableId") === g("adjointId")) { erreurForm("Le responsable et l’adjoint doivent être deux personnes différentes."); return; }
    const data = { nom: g("nom"), type: g("type"), parentId: g("parentId"), statut: g("statut"), pays: g("pays"), ville: g("ville"), quartier: g("quartier"), jour: g("jour"), heure: g("heure"), lieuReunion: g("lieuReunion"), responsableId: g("responsableId"), adjointId: g("adjointId"), description: g("description") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("garnisons/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("garnisons").doc(); await ref.set({ ...data, ...creation() }); }
    }, id ? "Garnison modifiée" : "Garnison créée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirGarnison(id || ref.id);
  }
  function choisirMembresGarnison(gid) {
    const g = garnison(gid);
    if (!g) return;
    const avant = membresDeG(gid, false).map((m) => m.id);
    ouvrirChoix({
      titre: `Membres · ${g.nom}`,
      intro: "Cochez les membres à rattacher directement à cette garnison. Un membre rattaché ailleurs y sera déplacé ; un membre décoché n’aura plus de garnison.",
      selection: avant,
      meta: (m) => { const x = garnison(m.garnisonId); return x && x.id !== gid ? `Actuellement : ${x.nom}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      libelle: "Enregistrer",
      onValider: async (ids) => {
        const choisis = new Set(ids);
        const ops = [];
        for (const id of ids) if (membre(id) && membre(id).garnisonId !== gid) ops.push(() => S.db.doc("membres/" + id).update({ garnisonId: gid, ...tampon() }));
        for (const id of avant) if (!choisis.has(id)) ops.push(() => S.db.doc("membres/" + id).update({ garnisonId: "", ...tampon() }));
        if (!ops.length) { ouvrirGarnison(gid); return; }
        if (await lot(ops, `${pluriel(ops.length, "fiche mise à jour", "fiches mises à jour")}`)) ouvrirGarnison(gid);
      },
    });
  }

  /* ════════════════════════ Académie ════════════════════════ */
  const MODES_F = ["Présentiel", "En ligne", "Mixte"];
  const MENTIONS = ["Sans mention", "Assez bien", "Bien", "Très bien", "Excellent"];
  const formation = (id) => S.formations.find((f) => f.id === id) || null;
  function etatFormation(f) {
    const t = aujourdhui();
    if (!f.dateDebut || f.dateDebut > t) return "avenir";
    if (f.dateFin && f.dateFin < t) return "terminee";
    return "encours";
  }
  const LIB_ETAT_F = { avenir: "À venir", encours: "En cours", terminee: "Terminée" };
  const CLS_ETAT_F = { avenir: "gold", encours: "info", terminee: "" };
  const actifF = (p) => p && p.statut !== "Retiré";
  const participantsF = (f) => Object.entries(f.participants || {}).filter(([mid, p]) => actifF(p) && membre(mid)).map(([mid, p]) => ({ m: membre(mid), p }));
  const modulesF = (f) => (Array.isArray(f.modules) ? f.modules : []);
  function progressionP(f, p) {
    const mods = modulesF(f);
    const faits = mods.filter((x) => p && p.suivis && p.suivis[x.id]).length;
    return { faits, total: mods.length, taux: mods.length ? faits / mods.length : null };
  }
  function datesF(f) {
    if (!f.dateDebut) return "Dates à fixer";
    if (!f.dateFin || f.dateFin === f.dateDebut) return fmtJour(f.dateDebut);
    return `Du ${fmtCourt(f.dateDebut)} au ${fmtJour(f.dateFin)}`;
  }
  function rowFormation(f) {
    const et = etatFormation(f);
    const n = participantsF(f).filter(({ p }) => p.statut !== "Abandon").length;
    const meta = [f.programme, datesF(f), f.formateur].filter(Boolean).join(" · ");
    return `<button class="row" type="button" data-act="voir-formation" data-id="${esc(f.id)}"><span class="g-ico" aria-hidden="true">${I("i-cap")}</span><span class="row-main"><span class="row-t">${esc(f.titre || "Formation")}</span><span class="row-m">${esc(meta)}</span></span><span class="row-r"><span class="chip ${CLS_ETAT_F[et]}">${LIB_ETAT_F[et]}</span><span class="chip">${pluriel(n, "inscrit", "inscrits")}</span></span></button>`;
  }
  function formationsDe(mid) {
    return S.formations.filter((f) => actifF((f.participants || {})[mid])).map((f) => ({ f, p: f.participants[mid] })).sort((a, b) => cmpFr(b.f.dateDebut || "", a.f.dateDebut || ""));
  }
  VUES.academie = function () {
    const c = cfg();
    const ecr = peutEcrire();
    let out = secHead("Académie", { eyebrow: "Formations", verset: VERSETS.academie, actions: ecr ? btn("ajout-formation", "Nouvelle formation", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les formations et les parcours des membres");
    if (!S.pret.formations || !S.pret.membres) return out + chargement("Lecture des formations…");
    const par = { avenir: [], encours: [], terminee: [] };
    S.formations.forEach((f) => par[etatFormation(f)].push(f));
    const apprenants = membresActifs().filter((m) => formationsDe(m.id).length);
    const an = String(new Date().getFullYear());
    const certifies = S.formations.reduce((t, f) => t + participantsF(f).filter(({ p }) => p.statut === "Certifié" && String(p.certifieLe || "").startsWith(an)).length, 0);
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-cap")}En cours</span><span class="stat-v">${nb(par.encours.length)}</span><span class="stat-m">${pluriel(par.avenir.length, "formation à venir", "formations à venir")}</span></div>
      <div class="stat"><span class="stat-l">Apprenants</span><span class="stat-v">${nb(apprenants.length)}</span><span class="stat-m">Membres inscrits au moins une fois</span></div>
      <div class="stat"><span class="stat-l">${I("i-award")}Certifiés en ${an}</span><span class="stat-v">${nb(certifies)}</span><span class="stat-m">Attestations délivrables</span></div>
      <div class="stat"><span class="stat-l">Programmes</span><span class="stat-v">${nb(c.programmes.length)}</span><span class="stat-m">${esc(c.programmes.slice(0, 2).join(", "))}${c.programmes.length > 2 ? "…" : ""}</span></div></div>`;
    out += sousOnglets("academie", [["encours", "En cours", par.encours.length], ["avenir", "À venir", par.avenir.length], ["terminees", "Terminées", par.terminee.length], ["apprenants", "Apprenants", apprenants.length]]);
    if (S.sous.academie === "apprenants") {
      if (!apprenants.length) return out + vide("i-cap", "Aucun membre n’est encore inscrit à une formation.");
      return out + `<div class="list">${apprenants.map((m) => {
        const fs = formationsDe(m.id);
        const cert = fs.filter(({ p }) => p.statut === "Certifié").length;
        return `<button class="row" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${esc(fs.map(({ f }) => f.titre).join(" · "))}</span></span><span class="row-r"><span class="chip">${pluriel(fs.length, "formation", "formations")}</span>${cert ? `<span class="chip ok">${pluriel(cert, "certificat", "certificats")}</span>` : ""}</span></button>`;
      }).join("")}</div>`;
    }
    const f = S.f.academie;
    const cle = { encours: "encours", avenir: "avenir", terminees: "terminee" }[S.sous.academie] || "encours";
    out += `<div class="filters"><label class="sr" for="q-acad">Rechercher une formation</label><input class="search" id="q-acad" type="search" placeholder="Titre, formateur…" value="${esc(f.q)}" data-filtre="academie.q" autocomplete="off"><label class="sr" for="f-prog">Programme</label><select class="sel" id="f-prog" data-filtre="academie.programme">${options(c.programmes, f.programme, "Tous les programmes")}</select></div>`;
    if (!S.formations.length) return out + vide("i-cap", `Aucune formation enregistrée. Créez une session de ${esc(c.programmes[0] || "formation")} : vous pourrez y inscrire des membres, suivre leur présence module par module et délivrer des attestations signées.`, ecr ? btn("ajout-formation", "Créer une formation", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const q = norm(f.q);
    const liste = par[cle].filter((x) => (!f.programme || x.programme === f.programme) && (!q || norm([x.titre, x.formateur, x.programme, x.parcours].join(" ")).includes(q)))
      .sort((a, b) => (cle === "terminee" ? cmpFr(b.dateFin || b.dateDebut || "", a.dateFin || a.dateDebut || "") : cmpFr(a.dateDebut || "9999", b.dateDebut || "9999")));
    if (!liste.length) return out + vide("i-search", par[cle].length ? "Aucune formation ne correspond." : `Aucune formation ${LIB_ETAT_F[cle].toLowerCase()}.`);
    return out + `<div class="list">${liste.map(rowFormation).join("")}</div>`;
  };
  function ficheFormation(id) {
    const f = formation(id);
    if (!f) return null;
    const ecr = peutEcrire();
    const et = etatFormation(f);
    const parts = participantsF(f).sort((a, b) => parNom(a.m, b.m));
    const actifs = parts.filter(({ p }) => p.statut !== "Abandon");
    const certifies = parts.filter(({ p }) => p.statut === "Certifié");
    const mods = modulesF(f);
    const prog = actifs.map(({ p }) => progressionP(f, p).taux).filter((t) => t != null);
    const moy = prog.length ? prog.reduce((a, b) => a + b, 0) / prog.length : null;
    const lieu = [f.mode, f.lieu].filter(Boolean).join(" · ");
    const rowsMods = mods.map((x, i) => {
      const n = actifs.filter(({ p }) => p.suivis && p.suivis[x.id]).length;
      return `<div class="row nolead"><span class="row-main"><span class="row-t">${i + 1}. ${esc(x.titre)}</span><span class="row-m">${x.date ? esc(fmtJour(x.date)) : "Date à fixer"} · ${pluriel(n, "présent", "présents")} sur ${nb(actifs.length)}</span></span><span class="row-r">${ecr && actifs.length ? btn("pointer-module", "Pointer", { ico: "i-ucheck", sm: true, data: `data-id="${esc(f.id)}" data-mod="${esc(x.id)}"` }) : ""}</span></div>`;
    }).join("");
    const rowsParts = parts.map(({ m, p }) => {
      const pr = progressionP(f, p);
      const chip = p.statut === "Certifié" ? `<span class="chip ok">Certifié</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">Inscrit</span>`;
      return `<button class="row" type="button" data-act="voir-participant" data-id="${esc(f.id)}" data-mid="${esc(m.id)}">${avatar(m)}<span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : "Aucun module défini"}</span>${pr.taux != null ? `<span class="bar slim ${pr.taux >= 0.8 ? "ok" : pr.taux >= 0.5 ? "info" : "warn"}" aria-hidden="true"><i style="width:${(pr.taux * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r">${chip}</span></button>`;
    }).join("");
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-cap")}</span><div><h3>${esc(f.titre)}</h3><p>${esc([f.programme, f.parcours].filter(Boolean).join(" · "))}</p></div></div>
      <div class="figure"><span class="chip ${CLS_ETAT_F[et]}">${LIB_ETAT_F[et]}</span><span>${esc(datesF(f))}</span></div>
      <div class="counters"><div class="counter"><span class="lab">Inscrits</span><div class="counter-c"><b>${nb(actifs.length)}${f.capacite ? `<small class="muted"> / ${nb(f.capacite)}</small>` : ""}</b></div></div><div class="counter"><span class="lab">Progression moyenne</span><div class="counter-c"><b>${pct(moy)}</b></div></div></div>
      ${kv([["Formateur", esc(f.formateur || "")], ["Lieu", esc(lieu)], ["Frais", Number(f.frais) ? esc(fcfa(f.frais)) : ""], ["Certifiés", certifies.length ? esc(pluriel(certifies.length, "participant", "participants")) : ""], ["Description", f.description ? `<span style="white-space:pre-wrap">${esc(f.description)}</span>` : ""]])}
      <h3 class="h3">Modules (${nb(mods.length)})</h3>${mods.length ? `<div class="list">${rowsMods}</div>` : `<p class="hint">Aucun module défini. Ajoutez-les en modifiant la formation, un par ligne.</p>`}
      <h3 class="h3">Participants (${nb(parts.length)})</h3>${parts.length ? `<div class="list">${rowsParts}</div>` : `<p class="hint">Aucun inscrit pour l’instant.</p>`}
      <div class="actions">${ecr ? btn("inscrire-formation", "Inscrire des membres", { ico: "i-users", cls: "btn-primary", data: `data-id="${esc(f.id)}"` }) : ""}${ecr && actifs.length ? btn("ecrire", "Écrire aux participants", { ico: "i-horn", data: `data-aud="formation" data-val="${esc(f.id)}" data-modele="formation"` }) : ""}${certifies.length ? btn("zip-attestations", `Attestations (${nb(certifies.length)})`, { ico: "i-award", data: `data-id="${esc(f.id)}"` }) : ""}${ecr ? btn("editer-formation", "Modifier", { ico: "i-edit", data: `data-id="${esc(f.id)}"` }) : ""}${peutAdmin() ? btn("supprimer-formation", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(f.id)}"` }) : ""}</div>`;
  }
  const ouvrirFormation = (id) => ouvrir({ titre: "Formation", refresh: surveiller(() => ficheFormation(id)) });
  const ligneModule = (x) => `${x.date ? x.date.split("-").reverse().join("/") + " " : ""}${x.titre}`;
  function lireModules(texte, anciens) {
    const pris = new Set();
    return String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      let date = "", titre = l;
      const r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*[-–—:]?\s*(.*)$/.exec(l) || null;
      const r2 = r ? null : /^(\d{4})-(\d{2})-(\d{2})\s*[-–—:]?\s*(.*)$/.exec(l);
      if (r && r[4]) { date = `${r[3]}-${pad(r[2])}-${pad(r[1])}`; titre = r[4]; }
      else if (r2 && r2[4]) { date = `${r2[1]}-${r2[2]}-${r2[3]}`; titre = r2[4]; }
      const ancien = anciens.find((a) => !pris.has(a.id) && norm(a.titre) === norm(titre));
      const id = ancien ? ancien.id : "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      pris.add(id);
      return { id, titre, date };
    });
  }
  function ouvrirFormFormation(id) {
    const c = cfg();
    const f = id ? formation(id) : { programme: c.programmes[0], mode: "Présentiel" };
    if (id && !f) return;
    const html = `<form class="form" id="f-formation" novalidate>
      ${champ("f-titre", "Intitulé", inp("f-titre", "titre", f.titre, 'autocomplete="off" required autofocus placeholder="Soldier’s Academy · Promotion 2026"'), { req: true })}
      <div class="f2">${champ("f-programme", "Programme", sel("f-programme", "programme", c.programmes, f.programme, null))}${champ("f-parcours", "Parcours ou niveau", inp("f-parcours", "parcours", f.parcours, 'autocomplete="off" placeholder="Fondations, Niveau 1…"'))}</div>
      <div class="f2">${champ("f-debut", "Début", inp("f-debut", "dateDebut", f.dateDebut, 'type="date"'))}${champ("f-fin", "Fin", inp("f-fin", "dateFin", f.dateFin, 'type="date"'))}</div>
      <div class="f2">${champ("f-formateur", "Formateur", inp("f-formateur", "formateur", f.formateur, 'autocomplete="off"'))}${champ("f-mode", "Mode", sel("f-mode", "mode", MODES_F, f.mode, null))}</div>
      <div class="f2">${champ("f-lieu", "Lieu ou lien de connexion", inp("f-lieu", "lieu", f.lieu, 'autocomplete="off"'))}${champ("f-cap", "Places disponibles", inp("f-cap", "capacite", f.capacite || "", 'inputmode="numeric" autocomplete="off" placeholder="Sans limite"'))}</div>
      ${champ("f-frais", "Frais d’inscription (FCFA)", inp("f-frais", "frais", Number(f.frais) ? nb(f.frais) : "", 'inputmode="numeric" autocomplete="off" placeholder="Gratuit"'))}
      ${champ("f-mods", "Modules", zone("f-mods", "modules", modulesF(f).map(ligneModule).join("\n"), 'rows="6" placeholder="12/11/2026 Les fondements du combat spirituel&#10;19/11/2026 Les armes de notre guerre&#10;L’intercession prophétique"'), { hint: "Un module par ligne, avec sa date au début si elle est connue. Retirer une ligne efface la présence enregistrée pour ce module." })}
      ${champ("f-desc", "Description", zone("f-desc", "description", f.description, 'rows="3"'))}
      ${pied(id ? "Enregistrer les modifications" : "Créer la formation")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la formation" : "Nouvelle formation", html, wide: true, onSubmit: (fd, form) => enregistrerFormation(fd, form, id) });
  }
  async function enregistrerFormation(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé de la formation."); $("#f-titre").focus(); return; }
    if (g("dateDebut") && g("dateFin") && g("dateFin") < g("dateDebut")) { erreurForm("La date de fin doit suivre la date de début."); return; }
    const anciens = id ? modulesF(formation(id) || {}) : [];
    const data = { titre: g("titre"), programme: g("programme"), parcours: g("parcours"), dateDebut: g("dateDebut"), dateFin: g("dateFin"), formateur: g("formateur"), mode: g("mode"), lieu: g("lieu"), capacite: Number(g("capacite").replace(/\D/g, "")) || null, frais: Number(g("frais").replace(/\D/g, "")) || 0, modules: lireModules(g("modules"), anciens), description: g("description") };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("formations/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("formations").doc(); await ref.set({ ...data, participants: {}, ...creation() }); }
    }, id ? "Formation modifiée" : "Formation créée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirFormation(id || ref.id);
  }
  function inscrireFormation(fid) {
    const f = formation(fid);
    if (!f) return;
    const avant = participantsF(f).map(({ m }) => m.id);
    ouvrirChoix({
      titre: `Inscriptions · ${f.titre}`,
      intro: `Cochez les membres inscrits à cette formation${f.capacite ? ` (${pluriel(f.capacite, "place", "places")})` : ""}. Un membre décoché garde sa progression s’il est réinscrit plus tard.`,
      selection: avant,
      libelle: "Enregistrer les inscriptions",
      meta: (m) => { const fs = formationsDe(m.id).filter((x) => x.f.id !== fid); return fs.length ? `Déjà : ${fs.map((x) => x.f.titre).join(", ")}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      onValider: async (ids) => {
        const choisis = new Set(ids);
        const maj = {};
        for (const mid of ids) { const p = (f.participants || {})[mid]; if (!actifF(p)) maj[mid] = { statut: "Inscrit", inscritLe: aujourdhui() }; }
        for (const mid of avant) if (!choisis.has(mid)) maj[mid] = { statut: "Retiré" };
        if (f.capacite && ids.length > f.capacite) toast(`Attention : ${nb(ids.length)} inscrits pour ${pluriel(f.capacite, "place", "places")}.`, "err");
        if (!Object.keys(maj).length) { ouvrirFormation(fid); return; }
        if (await ecrire(() => S.db.doc("formations/" + fid).update({ participants: maj, ...tampon() }), "Inscriptions enregistrées")) ouvrirFormation(fid);
      },
    });
  }
  function fichePointageModule(fid, modId) {
    const f = formation(fid);
    if (!f) return null;
    const x = modulesF(f).find((y) => y.id === modId);
    if (!x) return null;
    const parts = participantsF(f).filter(({ p }) => p.statut !== "Abandon").sort((a, b) => parNom(a.m, b.m));
    const n = parts.filter(({ p }) => p.suivis && p.suivis[modId]).length;
    return `<p class="hint" style="margin-bottom:10px">${esc(f.titre)} · ${x.date ? esc(fmtLong(x.date)) : "date à fixer"}. Touchez un nom pour marquer sa présence à ce module ; chaque appui est enregistré aussitôt.</p>
      <p class="tally"><span><b>${nb(n)}</b> présent${n > 1 ? "s" : ""}</span><span>sur ${pluriel(parts.length, "participant", "participants")}</span></p>
      <div class="list">${parts.map(({ m, p }) => `<button class="row" type="button" data-act="basculer-module" data-id="${esc(fid)}" data-mod="${esc(modId)}" data-mid="${esc(m.id)}" aria-pressed="${!!(p.suivis && p.suivis[modId])}"><span class="tick">${I("i-check")}</span><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span></span></button>`).join("")}</div>
      <div class="actions">${btn("voir-formation", "Retour à la formation", { ico: "i-left", data: `data-id="${esc(fid)}"` })}</div>`;
  }
  function ficheParticipant(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return null;
    const p = (f.participants || {})[mid];
    if (!actifF(p)) return null;
    const pr = progressionP(f, p);
    const ecr = peutEcrire();
    const mods = modulesF(f).map((x) => `<div class="kv-l"><span>${esc(x.titre)}</span><span class="${p.suivis && p.suivis[x.id] ? "amt in" : "muted"}">${p.suivis && p.suivis[x.id] ? "Présent" : "Absent"}</span></div>`).join("");
    return `<div class="ident">${avatar(m, true)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(f.titre)}</p></div></div>
      <div class="figure">${p.statut === "Certifié" ? `<span class="chip ok">Certifié${p.mention && p.mention !== "Sans mention" ? " · " + esc(p.mention) : ""}</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">Inscrit</span>`}<span>${pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} suivi${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""}</span></div>
      ${kv([["Inscrit le", p.inscritLe ? esc(fmtJour(p.inscritLe)) : ""], ["Certifié le", p.statut === "Certifié" && p.certifieLe ? esc(fmtJour(p.certifieLe)) : ""]])}
      ${mods ? `<h3 class="h3">Modules</h3><div class="kvl">${mods}</div>` : ""}
      <div class="actions">
        ${p.statut === "Certifié" ? btn("attestation", "Attestation (PNG)", { ico: "i-award", cls: "btn-primary", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` }) : ""}
        ${ecr && p.statut !== "Certifié" && p.statut !== "Abandon" ? btn("certifier", "Certifier", { ico: "i-award", cls: "btn-primary", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` }) : ""}
        ${ecr && p.statut === "Certifié" ? btn("statut-participant", "Annuler la certification", { ico: "i-undo", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Inscrit"` }) : ""}
        ${ecr && p.statut === "Inscrit" ? btn("statut-participant", "Marquer l’abandon", { ico: "i-x", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Abandon"` }) : ""}
        ${ecr && p.statut === "Abandon" ? btn("statut-participant", "Réintégrer", { ico: "i-undo", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}" data-statut="Inscrit"` }) : ""}
        ${btn("voir-formation", "Retour à la formation", { ico: "i-left", data: `data-id="${esc(fid)}"` })}
      </div>`;
  }
  function ouvrirCertification(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return;
    const p = f.participants[mid] || {};
    const pr = progressionP(f, p);
    ouvrir({
      titre: "Certifier",
      html: `<form class="form" novalidate><p><b>${esc(nomUsuel(m))}</b> · ${esc(f.titre)}</p>${pr.total && pr.faits < pr.total ? `<p class="note warn">${pr.faits} module${pr.faits > 1 ? "s" : ""} suivi${pr.faits > 1 ? "s" : ""} sur ${pr.total}. Vous pouvez certifier quand même si les absences ont été rattrapées.</p>` : ""}
        <div class="f2">${champ("ce-date", "Date de certification", inp("ce-date", "date", f.dateFin && f.dateFin <= aujourdhui() ? f.dateFin : aujourdhui(), 'type="date" required'), { req: true })}${champ("ce-mention", "Mention", sel("ce-mention", "mention", MENTIONS, "Sans mention", null))}</div>
        ${pied("Certifier")}</form>`,
      onSubmit: async (fd, form) => {
        const date = String(fd.get("date") || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { erreurForm("Indiquez la date de certification."); return; }
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => S.db.doc("formations/" + fid).update({ participants: { [mid]: { statut: "Certifié", certifieLe: date, mention: String(fd.get("mention") || "") } }, ...tampon() }), "Participant certifié")) ouvrirParticipant(fid, mid);
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  const ouvrirParticipant = (fid, mid) => ouvrir({ titre: "Parcours du participant", refresh: surveiller(() => ficheParticipant(fid, mid)) });

  /* Attestations de formation */
  async function codeAttestation(m, f) {
    const txt = `S.D.E.|ATT|${m.matricule || m.id}|${f.id}|${String(m.nom || "").toUpperCase()}`;
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch (e) { return (hash(txt) >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(-6); }
  }
  function dessinerQR(x, texte, qx, qy, qs, encre) {
    const qg = window.qrcode;
    qg.stringToBytes = qg.stringToBytesFuncs["UTF-8"];
    const q = qg(0, "M"); q.addData(texte, "Byte"); q.make();
    const n = q.getModuleCount();
    x.fillStyle = "#ffffff"; x.fillRect(qx, qy, qs, qs);
    const t = Math.floor((qs - 16) / n), o = (qs - t * n) / 2;
    x.fillStyle = encre;
    for (let r = 0; r < n; r += 1) for (let cc = 0; cc < n; cc += 1) if (q.isDark(r, cc)) x.fillRect(qx + o + cc * t, qy + o + r * t, t, t);
  }
  async function rendreAttestation(m, f) {
    await Promise.all([polices(), chargerScript(LIB_QR)]);
    const c = cfg();
    const p = (f.participants || {})[m.id] || {};
    const code = await codeAttestation(m, f);
    const logo = await imageLogo();
    const W = 1754, H = 1240;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const NUIT = "#0f1e3d", OR = "#b8901f", OR_F = "#85650f", GRIS = "#535c75";
    const COND = '"Saira Condensed", "Arial Narrow", sans-serif', CORPS = '"Atkinson Hyperlegible", Arial, sans-serif', PLUME = '"Great Vibes", "Brush Script MT", cursive';
    x.fillStyle = "#fbf8f0"; x.fillRect(0, 0, W, H);
    x.fillStyle = NUIT; x.fillRect(0, 0, W, 26); x.fillRect(0, H - 26, W, 26); x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H);
    x.strokeStyle = OR; x.lineWidth = 4; x.strokeRect(52, 52, W - 104, H - 104);
    x.strokeStyle = "rgba(184,144,31,.45)"; x.lineWidth = 1.5; x.strokeRect(64, 64, W - 128, H - 128);
    if (logo) { x.globalAlpha = 0.05; x.drawImage(logo, W / 2 - 380, H / 2 - 330, 760, 760); x.globalAlpha = 1; }
    const cx = W / 2;
    x.fillStyle = NUIT; x.beginPath(); x.arc(cx, 190, 96, 0, Math.PI * 2); x.fill();
    x.strokeStyle = OR; x.lineWidth = 4; x.beginPath(); x.arc(cx, 190, 100, 0, Math.PI * 2); x.stroke();
    if (logo) x.drawImage(logo, cx - 82, 108, 164, 164);
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    x.fillStyle = OR_F; espacer(x, "4px"); ecrireAjuste(x, (c.nomOfficiel || c.nomCourt).toUpperCase(), cx, 340, W - 300, 26, `600 {t}px ${COND}`, 14);
    x.fillStyle = NUIT; espacer(x, "8px"); x.font = `700 84px ${COND}`; x.fillText("ATTESTATION DE FORMATION", cx, 440); espacer(x, "0px");
    x.strokeStyle = OR; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 220, 474); x.lineTo(cx + 220, 474); x.stroke();
    x.fillStyle = GRIS; x.font = `400 30px ${CORPS}`; x.fillText("Le Mouvement atteste que", cx, 548);
    x.fillStyle = NUIT; ecrireAjuste(x, nomUsuel(m), cx, 650, W - 360, 92, `400 {t}px ${PLUME}`, 40);
    x.fillStyle = GRIS; x.font = `400 24px ${CORPS}`; x.fillText(m.matricule ? `Matricule ${m.matricule}` : "", cx, 698);
    x.fillStyle = GRIS; x.font = `400 30px ${CORPS}`; x.fillText("a suivi avec succès la formation", cx, 770);
    x.fillStyle = NUIT; ecrireAjuste(x, f.titre || "", cx, 846, W - 320, 58, `700 {t}px ${COND}`, 28);
    const pr = progressionP(f, p);
    const details = [f.programme, f.parcours, f.dateDebut ? datesF(f).replace(/^Du /, "du ") : "", pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""].filter(Boolean).join(" · ");
    x.fillStyle = GRIS; ecrireAjuste(x, details, cx, 900, W - 360, 26, `400 {t}px ${CORPS}`, 16);
    if (p.mention && p.mention !== "Sans mention") { x.fillStyle = OR_F; x.font = `700 30px ${COND}`; espacer(x, "3px"); x.fillText(`MENTION ${p.mention.toUpperCase()}`, cx, 952); espacer(x, "0px"); }
    const qs = 236, qx = 120, qy = H - 118 - qs;
    dessinerQR(x, [`${c.nomCourt} · Attestation`, `${m.matricule || "Sans matricule"} · ${nomComplet(m)}`, String(f.titre || "").slice(0, 48), `Code de contrôle ${code}`].join("\n"), qx, qy, qs, NUIT);
    x.textAlign = "left"; x.fillStyle = GRIS; x.font = `600 18px ${COND}`; espacer(x, "2px"); x.fillText(`CONTRÔLE ${code}`, qx, qy + qs + 30); espacer(x, "0px");
    x.font = `400 24px ${CORPS}`; x.fillText(`Fait à ${c.ville}, le ${fmtJour(p.certifieLe || aujourdhui())}`, qx + qs + 36, qy + qs - 70);
    if (f.formateur) { x.fillStyle = GRIS; x.fillText(`Formateur : ${f.formateur}`, qx + qs + 36, qy + qs - 30); }
    x.textAlign = "center";
    const sx = W - 420;
    x.fillStyle = GRIS; x.font = `600 18px ${COND}`; espacer(x, "2px"); x.fillText("LE LEADER DU MOUVEMENT", sx, H - 300); espacer(x, "0px");
    x.fillStyle = NUIT; ecrireAjuste(x, c.signataire, sx, H - 220, 520, 62, `400 {t}px ${PLUME}`, 30);
    x.strokeStyle = OR; x.lineWidth = 2; x.beginPath(); x.moveTo(sx - 230, H - 196); x.lineTo(sx + 230, H - 196); x.stroke();
    x.fillStyle = GRIS; ecrireAjuste(x, `${c.signataire} · ${c.signataireTitre}`, sx, H - 160, 520, 22, `400 {t}px ${CORPS}`, 12);
    x.textAlign = "left";
    return { cv, code };
  }
  const nomFichierAttestation = (m, f) => `attestation-${[m.matricule || "", sansAccents(String(m.nom || "")), sansAccents(String(f.titre || "")).slice(0, 40)].filter(Boolean).join("-").replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "")}.png`;
  async function ouvrirAttestation(fid, mid) {
    const f = formation(fid), m = membre(mid);
    if (!f || !m) return;
    ouvrir({ titre: "Attestation de formation", wide: true, html: chargement("Préparation de l’attestation…") });
    let res;
    try { res = await rendreAttestation(m, f); }
    catch (e) { if (!$("#sheet").hidden) $("#sheet-b").innerHTML = `<p class="note danger">${e && e.code === "bibliotheque" ? "Le générateur de code QR n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "L’attestation n’a pas pu être préparée."}</p>`; return; }
    if ($("#sheet").hidden) return;
    S.attest = { fid, mid, cv: res.cv };
    $("#sheet-b").innerHTML = `<img class="carte-img" src="${res.cv.toDataURL("image/png")}" alt="Attestation de formation de ${esc(nomUsuel(m))} pour ${esc(f.titre)}">
      <p class="hint" style="margin-top:10px">Format A4 paysage, signée « ${esc(cfg().signataire)} ». Code de contrôle : <b class="num">${esc(res.code)}</b>, vérifiable depuis Membres → Cartes.</p>
      <div class="actions">${btn("dl-attestation", "Télécharger l’image (PNG)", { ico: "i-down", cls: "btn-primary" })}${btn("voir-participant", "Retour", { ico: "i-left", data: `data-id="${esc(fid)}" data-mid="${esc(mid)}"` })}</div>`;
  }
  async function zipAttestations(fid) {
    const f = formation(fid);
    if (!f) return;
    const certs = participantsF(f).filter(({ p }) => p.statut === "Certifié");
    const b = document.querySelector('[data-act="zip-attestations"]');
    if (b) b.disabled = true;
    S.attente += 1; majSync();
    try {
      await chargerScript(LIB_ZIP);
      const zip = new window.JSZip();
      for (const { m } of certs) {
        const { cv } = await rendreAttestation(m, f);
        zip.file(nomFichierAttestation(m, f), await new Promise((ok) => cv.toBlob(ok, "image/png")));
      }
      const out = await zip.generateAsync({ type: "blob" });
      await telechargerBlob(`attestations-${sansAccents(f.titre || "formation").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 50)}.zip`, out);
    } catch (e) {
      toast(e && e.code === "bibliotheque" ? "Un module nécessaire n’a pas pu être chargé. Vérifiez la connexion puis réessayez." : "Les attestations n’ont pas pu être préparées.", "err");
    } finally { S.attente -= 1; majSync(); if (b && document.contains(b)) b.disabled = false; }
  }
  function carteAcademie() {
    const pied = `<button class="link" type="button" data-vue="academie">Ouvrir l’Académie</button>`;
    if (!S.pret.formations) return carte("Académie", chargement("Lecture des formations…"));
    const encours = S.formations.filter((f) => etatFormation(f) === "encours");
    const avenir = S.formations.filter((f) => etatFormation(f) === "avenir" && f.dateDebut).sort((a, b) => cmpFr(a.dateDebut, b.dateDebut));
    if (!encours.length && !avenir.length) return carte("Académie", `<p class="hint">Aucune formation en cours ni programmée.</p>`, { pied });
    const corps = `<div class="list flat">${encours.concat(avenir.slice(0, Math.max(0, 3 - encours.length))).slice(0, 4).map(rowFormation).join("")}</div>`;
    return carte("Académie", corps, { actions: encours.length ? `<span class="chip info">${pluriel(encours.length, "en cours", "en cours")}</span>` : "", pied });
  }

  /* ════════════════════════ Porte-Voix ════════════════════════ */
  const annoncesActives = () => S.annonces.filter((a) => !a.expireLe || a.expireLe >= aujourdhui()).sort((a, b) => (!!b.epingle - !!a.epingle) || (b.creeLe || 0) - (a.creeLe || 0));
  function blocAnnonce(a, ecr) {
    const expiree = a.expireLe && a.expireLe < aujourdhui();
    return `<article class="annonce${a.epingle ? " epingle" : ""}${expiree ? " passee" : ""}"><div class="annonce-h"><h3>${esc(a.titre)}</h3><span class="btn-row">${a.epingle ? `<span class="chip gold">${I("i-pin")}Épinglée</span>` : ""}${expiree ? `<span class="chip">Expirée</span>` : a.expireLe ? `<span class="chip">Jusqu’au ${esc(fmtCourt(a.expireLe))}</span>` : ""}</span></div>
      <p class="annonce-t">${esc(a.texte)}</p><p class="hint">${esc(a.creeLe ? `Publiée le ${fmtStamp(a.creeLe)}${a.creePar ? " par " + nomDe(a.creePar) : ""}` : "")}</p>
      <div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}${btn("affiche-annonce", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(a.id)}"` })}${ecr ? btn("editer-annonce", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(a.id)}"` }) + btn("supprimer-annonce", "Supprimer", { ico: "i-trash", sm: true, cls: "btn-danger", data: `data-id="${esc(a.id)}"` }) : ""}</div></article>`;
  }
  function carteAnnonces() {
    if (!S.pret.annonces) return carte("Annonces", chargement("Lecture des annonces…"));
    const actives = annoncesActives();
    const ecr = peutEcrire();
    if (!actives.length && !ecr) return "";
    const corps = actives.length ? actives.slice(0, 3).map((a) => `<div class="annonce-mini${a.epingle ? " epingle" : ""}"><b>${esc(a.titre)}</b><p>${esc(a.texte)}</p></div>`).join("") : `<p class="hint">Aucune annonce en cours. Publiez la prochaine depuis le Porte-Voix : elle s’affichera ici pour tous.</p>`;
    return carte("Annonces", corps, { cls: "span2", actions: ecr ? btn("ajout-annonce", "Publier", { ico: "i-plus", sm: true }) : "", pied: accesRegistre() ? `<button class="link" type="button" data-act="aller-annonces">Ouvrir le Porte-Voix</button>` : "" });
  }
  function ouvrirFormAnnonce(id) {
    const a = id ? S.annonces.find((x) => x.id === id) : {};
    if (id && !a) return;
    const html = `<form class="form" id="f-annonce" novalidate>
      ${champ("an-titre", "Titre", inp("an-titre", "titre", a.titre, 'autocomplete="off" required autofocus maxlength="120"'), { req: true })}
      ${champ("an-texte", "Texte", zone("an-texte", "texte", a.texte, 'rows="6" required'), { req: true })}
      <div class="f2">${champ("an-exp", "Visible jusqu’au", inp("an-exp", "expireLe", a.expireLe, 'type="date"'), { hint: "Facultatif : l’annonce disparaît de l’accueil après cette date." })}<div class="field"><span class="lab">Mise en avant</span><label class="check"><input type="checkbox" name="epingle" value="1"${a.epingle ? " checked" : ""}> Épingler en tête</label></div></div>
      <p class="hint">Les annonces s’affichent sur l’accueil de toutes les personnes qui ont accès à l’application, y compris en lecture seule.</p>
      ${pied(id ? "Enregistrer" : "Publier l’annonce")}
    </form>`;
    ouvrir({
      titre: id ? "Modifier l’annonce" : "Nouvelle annonce", html,
      onSubmit: async (fd, form) => {
        const g = (k) => String(fd.get(k) || "").trim();
        if (!g("titre") || !g("texte")) { erreurForm("Indiquez le titre et le texte de l’annonce."); return; }
        if (g("expireLe") && g("expireLe") < aujourdhui()) { erreurForm("La date de fin est déjà passée."); return; }
        const data = { titre: g("titre"), texte: g("texte"), expireLe: g("expireLe"), epingle: fd.get("epingle") === "1" };
        form.querySelector("[type=submit]").disabled = true;
        const ok = await ecrire(async () => { if (id) await S.db.doc("annonces/" + id).update({ ...data, ...tampon() }); else await S.db.collection("annonces").doc().set({ ...data, ...creation() }); }, id ? "Annonce modifiée" : "Annonce publiée");
        if (ok) fermer(); else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }

  /* Messages ciblés */
  const AUDIENCES = [
    ["tous", "Tous les membres actifs"], ["pole", "Un pôle"], ["garnison", "Une garnison"], ["formation", "Les participants d’une formation"], ["statut", "Un statut"],
    ["suivi", "Les membres à suivre (absents)"], ["anniv", "Les anniversaires des 7 prochains jours"], ["chaine", "Les intercesseurs de la chaîne de prière"], ["cotis", "Les membres en retard de cotisation"], ["manuel", "Une sélection de membres"],
  ];
  const audiencesPermises = () => AUDIENCES.filter(([k]) => k !== "cotis" || accesDirection());
  function valeursAudience(type) {
    if (type === "pole") return cfg().poles.map((p) => [p, p]);
    if (type === "garnison") return optionsGarnisons();
    if (type === "formation") return S.formations.slice().sort((a, b) => cmpFr(b.dateDebut || "", a.dateDebut || "")).map((f) => [f.id, f.titre]);
    if (type === "statut") return cfg().statuts.map((s) => [s, s]);
    if (type === "chaine") return [["jour", "Intercesseurs d’aujourd’hui"], ["tous", "Tous les intercesseurs de la semaine"]];
    return null;
  }
  function destinatairesDe(aud) {
    const actifs = membresActifs();
    const t = aud.type, v = aud.valeur;
    let l = [];
    if (t === "tous") l = actifs;
    else if (t === "pole") l = actifs.filter((m) => m.pole === v);
    else if (t === "garnison") l = actifs.filter((m) => dansG(m, v));
    else if (t === "formation") { const f = formation(v); l = f ? participantsF(f).filter(({ p }) => p.statut !== "Abandon").map(({ m }) => m).filter((m) => m.actif !== false) : []; }
    else if (t === "statut") l = actifs.filter((m) => m.statut === v);
    else if (t === "suivi") l = suiviPastoral().liste;
    else if (t === "anniv") l = actifs.filter((m) => { const a = prochainAnniv(m); return a && a.dans <= 7; });
    else if (t === "chaine") { const ids = new Set(v === "tous" ? intercesseursSemaine() : intercesseursDuJour(aujourdhui()).flatMap((x) => x.ids)); l = actifs.filter((m) => ids.has(m.id)); }
    else if (t === "cotis") { const an = new Date().getFullYear(); l = accesDirection() ? actifs.filter((m) => etatCotis(m, an).retard.length) : []; }
    else if (t === "manuel") { const ids = new Set(aud.ids || []); l = actifs.filter((m) => ids.has(m.id)); }
    return l.map((m) => m.id);
  }
  function libAudience(aud) {
    const base = (AUDIENCES.find(([k]) => k === aud.type) || [0, "Destinataires"])[1];
    const vals = valeursAudience(aud.type);
    const v = vals ? (vals.find(([k]) => k === aud.valeur) || [0, ""])[1] : "";
    if (aud.type === "pole" || aud.type === "garnison" || aud.type === "statut") return v ? `${aud.type === "pole" ? "Pôle" : aud.type === "garnison" ? "Garnison" : "Statut"} : ${v.replace(/^(— )+/, "")}` : base;
    if (aud.type === "formation") return v ? `Formation : ${v}` : base;
    if (aud.type === "chaine") return v || base;
    return base;
  }
  const MODELES = [["libre", "Message libre"], ["rassemblement", "Annonce d’un rassemblement"], ["convocation", "Convocation à une réunion"], ["priere", "Appel à la prière"], ["formation", "Rappel de formation"], ["cotis", "Rappel de cotisation"]];
  function texteModele(type, { evtId, formationId } = {}) {
    const c = cfg();
    if (type === "rassemblement") {
      const e = evt(evtId);
      if (!e) return "";
      return `Bonjour {prenom} ! ${e.titre} : ${fmtLong(e.date)}${e.heure ? " à " + fmtHeure(e.heure) : ""}${e.lieu ? ", " + e.lieu : ""}.${e.description ? "\n" + e.description : ""}\nNous comptons sur ta présence. Que Dieu te bénisse !\n— ${c.nomCourt}`;
    }
    if (type === "convocation") return `Bonjour {prenom}, que la paix du Seigneur soit avec toi. Tu es convoqué(e) à une réunion le [date] à [heure], [lieu].\nOrdre du jour : [à préciser].\nTa présence est importante.\n— ${c.nomCourt}`;
    if (type === "priere") { const ch = chaine(); return `Bien-aimé(e) {prenom}, la Chambre Haute t’appelle à la prière${ch.sujetSemaine ? ` pour : ${ch.sujetSemaine}` : "."}${ch.versetSemaine ? `\n« ${ch.versetSemaine} »` : ""}\nTenons-nous à la brèche ensemble.\n— ${c.nomCourt}`; }
    if (type === "formation") {
      const f = formation(formationId);
      return `Bonjour {prenom}, rappel : la formation « ${f ? f.titre : "[formation]"} »${f && f.programme ? ` (${f.programme})` : ""} se poursuit${f && f.dateDebut ? ` (${datesF(f).toLowerCase()})` : ""}${f && f.lieu ? `, ${f.lieu}` : ""}. Prépare-toi et sois à l’heure !\n— ${c.nomCourt}`;
    }
    if (type === "cotis") return `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Petit rappel fraternel : ta cotisation au mouvement ${c.nomCourt} est attendue. Merci pour ta fidélité et ton engagement !`;
    return "";
  }
  function ouvrirCompose(preset = {}) {
    const auds = audiencesPermises();
    const evts = aVenir().slice(0, 30).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre}`]);
    const fms = S.formations.map((f) => [f.id, f.titre]);
    const modeles = MODELES.filter(([k]) => k !== "cotis" || accesDirection());
    const aud = preset.aud || "tous";
    const html = `<form class="form" id="f-diff" novalidate>
      ${champ("d-titre", "Titre", inp("d-titre", "titre", preset.titre || "", 'autocomplete="off" placeholder="Pour retrouver ce message dans l’historique"'))}
      <div class="f2">${champ("d-modele", "Modèle", sel("d-modele", "modele", modeles, preset.modele || "libre", null))}<div class="field" id="d-evt-w" hidden><label for="d-evt">Rassemblement</label>${sel("d-evt", "evtId", evts, preset.evtId || "", evts.length ? null : "Aucun rassemblement à venir")}</div><div class="field" id="d-fo-w" hidden><label for="d-fo">Formation</label>${sel("d-fo", "formationId", fms, preset.formationId || (preset.aud === "formation" ? preset.val : "") || "", fms.length ? null : "Aucune formation")}</div></div>
      <div class="f2">${champ("d-aud", "Destinataires", sel("d-aud", "aud", auds, aud, null))}<div class="field" id="d-val-w" hidden><label for="d-val">Précisez</label><select class="inp" id="d-val" name="val"></select></div></div>
      <div class="field" id="d-pick" hidden><span class="lab">Membres choisis</span><input class="search" id="d-pick-q" type="search" placeholder="Filtrer la liste…" autocomplete="off" aria-label="Filtrer la liste des membres"><div class="pick">${membresActifs().map((m) => `<label class="pick-l" data-n="${esc(norm(nomComplet(m)))}"><input type="checkbox" name="ids" value="${esc(m.id)}"${(preset.ids || []).includes(m.id) ? " checked" : ""}> <span>${esc(nomComplet(m))}</span>${m.telephone ? "" : ` <small class="muted">sans numéro</small>`}</label>`).join("")}</div></div>
      <p class="note" id="d-compte" aria-live="polite"></p>
      ${champ("d-msg", "Message", zone("d-msg", "message", preset.message || "", 'rows="8" required'), { req: true, hint: "{prenom} est remplacé par le prénom de chaque destinataire." })}
      ${pied("Préparer l’envoi")}
    </form>`;
    ouvrir({
      titre: "Nouveau message", html, wide: true, onSubmit: enregistrerDiffusion,
      apres: (sheet) => {
        const $s = (q) => sheet.querySelector(q);
        const msg = $s("#d-msg");
        let auto = !msg.value;
        msg.addEventListener("input", () => { auto = !msg.value; });
        const majValeurs = (garder) => {
          const t = $s("#d-aud").value;
          const vals = valeursAudience(t);
          $s("#d-val-w").hidden = !vals;
          if (vals) {
            const cur = garder ? preset.val : $s("#d-val").value;
            $s("#d-val").innerHTML = options(vals, vals.some(([k]) => k === cur) ? cur : vals[0] ? vals[0][0] : "", vals.length ? null : "Aucun choix disponible");
          }
          $s("#d-pick").hidden = t !== "manuel";
        };
        const majModele = () => {
          const m = $s("#d-modele").value;
          $s("#d-evt-w").hidden = m !== "rassemblement";
          $s("#d-fo-w").hidden = m !== "formation";
          if (auto) { msg.value = texteModele(m, { evtId: $s("#d-evt").value, formationId: $s("#d-fo").value }); auto = true; }
        };
        const majCompte = () => {
          const t = $s("#d-aud").value;
          const ids = destinatairesDe({ type: t, valeur: $s("#d-val").value, ids: Array.from(sheet.querySelectorAll('#d-pick input[name="ids"]:checked')).map((i) => i.value) });
          const sans = ids.filter((id) => !telChiffres((membre(id) || {}).telephone)).length;
          $s("#d-compte").textContent = ids.length ? `${pluriel(ids.length, "destinataire", "destinataires")}${sans ? `, dont ${nb(sans)} sans numéro de téléphone` : ""}.` : "Aucun destinataire pour ce choix.";
        };
        $s("#d-aud").addEventListener("change", () => { majValeurs(false); majCompte(); });
        $s("#d-val").addEventListener("change", majCompte);
        $s("#d-modele").addEventListener("change", majModele);
        $s("#d-evt").addEventListener("change", majModele);
        $s("#d-fo").addEventListener("change", majModele);
        $s("#d-pick").addEventListener("change", majCompte);
        $s("#d-pick-q").addEventListener("input", (ev) => { const q = norm(ev.target.value); sheet.querySelectorAll(".pick-l").forEach((l) => { l.hidden = !!q && !l.dataset.n.includes(q); }); });
        majValeurs(true); majModele(); majCompte();
      },
    });
  }
  async function enregistrerDiffusion(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const aud = { type: g("aud"), valeur: g("val"), ids: fd.getAll("ids").map(String) };
    const ids = destinatairesDe(aud);
    if (!ids.length) { erreurForm("Aucun destinataire : changez le choix des destinataires."); return; }
    const message = g("message").replace(/\{mouvement\}/g, cfg().nomCourt);
    if (!message) { erreurForm("Écrivez le message."); $("#d-msg").focus(); return; }
    const titre = g("titre") || message.replace(/\{prenom\}/g, "").replace(/\s+/g, " ").slice(0, 60);
    form.querySelector("[type=submit]").disabled = true;
    const ref = S.db.collection("diffusions").doc();
    const ok = await ecrire(() => ref.set({ titre, message, audience: { type: aud.type, valeur: aud.type === "manuel" ? "" : aud.valeur, lib: libAudience(aud) }, destinataires: ids, envoyes: {}, ...creation() }), "Message prêt à envoyer");
    if (ok) ouvrirDiffusion(ref.id); else form.querySelector("[type=submit]").disabled = false;
  }
  const diffusion = (id) => S.diffusions.find((d) => d.id === id) || null;
  const msgPour = (d, m) => String(d.message || "").replace(/\{prenom\}/g, m ? prenomUsuel(m) : "");
  const msgGroupe = (d) => String(d.message || "").replace(/\s*\{prenom\}\s*/g, " ").replace(/ +([,.!?])/g, "$1").replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").trim();
  const envoyesD = (d) => (d.destinataires || []).filter((id) => d.envoyes && d.envoyes[id]).length;
  function rowDiffusion(d) {
    const n = (d.destinataires || []).length, e = envoyesD(d);
    return `<button class="row nolead" type="button" data-act="voir-diffusion" data-id="${esc(d.id)}"><span class="row-main"><span class="row-t">${esc(d.titre || "Message")}</span><span class="row-m">${esc([(d.audience || {}).lib, d.creeLe ? fmtStamp(d.creeLe) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="chip ${e >= n ? "ok" : e ? "info" : "warn"}">${nb(e)}/${nb(n)} envoyés</span></span></button>`;
  }
  function ficheDiffusion(id) {
    const d = diffusion(id);
    if (!d) return null;
    const ecr = peutEcrire();
    const dest = (d.destinataires || []).map((mid) => membre(mid)).filter(Boolean).sort(parNom);
    const n = dest.length, e = dest.filter((m) => d.envoyes && d.envoyes[m.id]).length;
    const suivant = dest.find((m) => !(d.envoyes && d.envoyes[m.id]) && telChiffres(m.telephone));
    const rows = dest.map((m) => {
      const fait = d.envoyes && d.envoyes[m.id];
      const tel = telChiffres(m.telephone);
      return `<div class="row nolead${fait ? " envoye" : ""}"><span class="row-main"><span class="row-t">${esc(nomComplet(m))}</span><span class="row-m">${tel ? esc(telAffiche(m.telephone)) : "Sans numéro de téléphone"}${fait ? ` · envoyé ${esc(fmtStamp(fait))}` : ""}</span></span><span class="row-r"><span class="btn-row">${tel && ecr ? `<a class="btn btn-sm ${fait ? "btn-ghost" : "btn-primary"}" href="${esc(lienWa(m.telephone, msgPour(d, m)))}" target="_blank" rel="noopener" data-act="envoi-wa" data-id="${esc(d.id)}" data-mid="${esc(m.id)}">${I("i-msg")}${fait ? "Renvoyer" : "Envoyer"}</a>` : ""}${ecr ? `<button class="icon-btn" type="button" data-act="envoi-bascule" data-id="${esc(d.id)}" data-mid="${esc(m.id)}" aria-pressed="${!!fait}" aria-label="${fait ? "Marquer comme non envoyé" : "Marquer comme envoyé"} : ${esc(nomComplet(m))}">${I(fait ? "i-undo" : "i-check")}</button>` : ""}</span></span></div>`;
    }).join("");
    return `<div class="figure"><span class="chip ${e >= n ? "ok" : "info"}">${nb(e)} envoyé${e > 1 ? "s" : ""} sur ${nb(n)}</span><span>${esc((d.audience || {}).lib || "")}</span></div>
      <div class="bar" aria-hidden="true" style="margin-bottom:14px"><i style="width:${n ? ((e / n) * 100).toFixed(1) : 0}%"></i></div>
      <div class="msgbox">${esc(d.message)}</div>
      <div class="actions">${suivant && ecr ? `<a class="btn btn-primary" href="${esc(lienWa(suivant.telephone, msgPour(d, suivant)))}" target="_blank" rel="noopener" data-act="envoi-wa" data-id="${esc(d.id)}" data-mid="${esc(suivant.id)}">${I("i-msg")}Envoyer à ${esc(prenomUsuel(suivant))}</a>` : ""}${btn("copier-msg-groupe", "Copier pour un groupe", { ico: "i-copy", data: `data-id="${esc(d.id)}"` })}${btn("copier-numeros", "Copier les numéros", { ico: "i-phone", data: `data-id="${esc(d.id)}"` })}${btn("export-diffusion", "Exporter", { ico: "i-down", data: `data-id="${esc(d.id)}"` })}</div>
      <p class="hint">WhatsApp s’ouvre avec le message déjà personnalisé : il reste à appuyer sur « Envoyer ». Pour une liste de diffusion WhatsApp, copiez les numéros puis le message de groupe.</p>
      <h3 class="h3">Destinataires (${nb(n)})</h3><div class="list">${rows}</div>
      ${ecr ? `<div class="actions">${btn("supprimer-diffusion", "Supprimer ce message", { ico: "i-trash", cls: "btn-danger", sm: true, data: `data-id="${esc(d.id)}"` })}</div>` : ""}`;
  }
  const ouvrirDiffusion = (id) => ouvrir({ titre: "Message", wide: true, refresh: surveiller(() => ficheDiffusion(id)) });
  VUES.portevoix = function () {
    const ecr = peutEcrire();
    let out = secHead("Porte-Voix", { eyebrow: "Communication", verset: VERSETS.portevoix, actions: (ecr ? btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) : "") + btn("nouvelle-affiche", "Nouvelle affiche", { ico: "i-image", data: 'data-modele="evenement"' }) + (ecr ? btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "") });
    if (S.etat === "absent") return out + nonConnecte("Les annonces et les messages du mouvement");
    if (!S.pret.annonces || !S.pret.diffusions || !S.pret.membres) return out + chargement("Lecture des communications…");
    const actives = annoncesActives();
    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length], ["affiches", "Affiches", (S.affiches || []).length || null], ["rappels", "Rappels du jour", rappelsEnAttente() || null]]);
    if (S.sous.portevoix === "rappels") return out + vueRappels();
    if (S.sous.portevoix === "affiches") return out + vueAffiches();
    if (S.sous.portevoix === "messages") {
      if (!S.diffusions.length) return out + vide("i-horn", "Aucun message préparé. Choisissez des destinataires (une garnison, un pôle, les participants d’une formation, les membres à suivre…) et un modèle : l’application prépare un message WhatsApp personnalisé pour chacun et suit les envois.", ecr ? btn("ecrire", "Préparer un message", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
      const liste = S.diffusions.slice().sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));
      return out + `<div class="list">${liste.map(rowDiffusion).join("")}</div>`;
    }
    const passees = S.annonces.filter((a) => a.expireLe && a.expireLe < aujourdhui()).sort((a, b) => cmpFr(b.expireLe, a.expireLe));
    if (!actives.length && !passees.length) return out + vide("i-pin", "Aucune annonce. Une annonce publiée ici s’affiche sur l’accueil de tous, y compris des personnes en lecture seule.", ecr ? btn("ajout-annonce", "Publier une annonce", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    return out + `<div class="col">${actives.map((a) => blocAnnonce(a, ecr)).join("")}</div>${passees.length ? `<h2 class="h3" style="margin-top:22px">Annonces expirées</h2><div class="col">${passees.slice(0, 10).map((a) => blocAnnonce(a, ecr)).join("")}</div>` : ""}`;
  };

  /* ════════════════════════ Chambre Haute ════════════════════════ */
  const CATEGORIES_PRIERE = ["Santé et guérison", "Famille", "Travail et finances", "Délivrance", "Études", "Ministère et mouvement", "Nations", "Autre"];
  const CRENEAUX_DEFAUT = ["05:00", "12:00", "18:00", "00:00"];
  const chaine = () => ({ creneaux: CRENEAUX_DEFAUT, affectations: {}, sujetSemaine: "", versetSemaine: "", ...(S.chaine || {}) });
  const heureC = (h) => (h === "00:00" ? "minuit" : fmtHeure(h));
  const cleCreneau = (j, h) => `${j}_${String(h).replace(":", "")}`;
  function intercesseursDuJour(iso) {
    const ch = chaine(), j = jourIdx(iso);
    return ch.creneaux.map((h) => ({ h, ids: ((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id)) }));
  }
  function intercesseursSemaine() {
    const out = new Set();
    for (const v of Object.values(chaine().affectations || {})) if (Array.isArray(v)) v.forEach((id) => out.add(id));
    return [...out].filter((id) => membre(id));
  }
  function creneauxDe(mid) {
    const ch = chaine(), out = [];
    for (let j = 1; j <= 7; j += 1) for (const h of ch.creneaux) if (((ch.affectations || {})[cleCreneau(j, h)] || []).includes(mid)) out.push(`${JOURS[j - 1]} ${heureC(h)}`);
    return out;
  }
  const priere = (id, conf) => (conf ? S.prieresConf : S.prieres).find((p) => p.id === id) || null;
  const nbPriants = (p) => Object.values(p.priants || {}).filter(Boolean).length;
  function rowPriere(p, conf) {
    const pour = membre(p.pourId);
    const meta = [p.categorie, pour ? "pour " + nomCourtM(pour) : p.pour ? "pour " + p.pour : "", p.date ? fmtCourt(p.date) : ""].filter(Boolean).join(" · ");
    const n = nbPriants(p);
    const moi = S.me.id && p.priants && p.priants[S.me.id];
    const enPriere = (p.statut || "En prière") === "En prière";
    return `<div class="pr-row${p.urgent && enPriere ? " urgent" : ""}"><button class="pr-main" type="button" data-act="voir-priere" data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}><span class="row-main"><span class="row-t">${p.urgent && enPriere ? `<span class="chip danger">Urgent</span> ` : ""}${esc(p.sujet || "Requête")}</span><span class="row-m">${esc(meta)}</span>${p.statut === "Exaucée" && p.temoignage ? `<span class="row-q">${esc(p.temoignage)}</span>` : ""}</span></button><span class="pr-side">${enPriere && peutEcrire() && S.me.id ? `<button class="btn btn-sm ${moi ? "btn-ghost" : "btn-primary"}" type="button" data-act="j-ai-prie" data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""} aria-pressed="${!!moi}">${I("i-flame")}${moi ? "Prié" : "J’ai prié"}</button>` : ""}<span class="chip">${pluriel(n, "intercesseur", "intercesseurs")}</span></span></div>`;
  }
  VUES.chambre = function () {
    const ecr = peutEcrire();
    let out = secHead("Chambre Haute", { eyebrow: "Intercession et prière", verset: VERSETS.chambre, actions: ecr ? btn("ajout-priere", "Nouvelle requête", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les requêtes de prière et la chaîne d’intercession");
    if (!S.pret.prieres || !S.pret.chaine || !S.pret.membres) return out + chargement("Lecture de la Chambre Haute…");
    const ch = chaine();
    out += `<section class="card hero sujet"><div class="card-h"><h2 class="card-t">Sujet de la semaine</h2>${ecr ? btn("editer-sujet", "Modifier", { ico: "i-edit", sm: true }) : ""}</div>${ch.sujetSemaine ? `<p class="sujet-t">${esc(ch.sujetSemaine)}</p>${ch.versetSemaine ? `<p class="hint">« ${esc(ch.versetSemaine)} »</p>` : ""}` : `<p class="hint">Aucun sujet défini. Fixez le sujet de prière de la semaine : il s’affichera sur l’accueil et dans les appels à la prière.</p>`}</section>`;
    const enP = S.prieres.filter((p) => (p.statut || "En prière") === "En prière");
    const exa = S.prieres.filter((p) => p.statut === "Exaucée");
    const ong = [["requetes", "En prière", enP.length], ["exaucees", "Témoignages", exa.length], ["chaine", "Chaîne de prière", null]];
    if (accesDirection()) ong.push(["confidentielles", "Confidentielles", S.pret.prieresConf ? S.prieresConf.filter((p) => (p.statut || "En prière") === "En prière").length : null]);
    ong.push(["closes", "Closes", S.prieres.filter((p) => p.statut === "Close").length]);
    out += `<div style="margin-top:16px">${sousOnglets("chambre", ong)}</div>`;
    const s = S.sous.chambre;
    if (s === "confidentielles" && !accesDirection()) S.sous.chambre = "requetes";
    if (s === "chaine") return out + vueChaine();
    if (s === "confidentielles") {
      if (!S.pret.prieresConf) return out + chargement("Lecture des requêtes confidentielles…");
      const l = S.prieresConf.slice().sort((a, b) => ((a.statut || "En prière") !== "En prière") - ((b.statut || "En prière") !== "En prière") || cmpFr(b.date || "", a.date || ""));
      return out + `<p class="note">${I("i-lock")} Requêtes confidentielles : seuls le propriétaire et les éditeurs y ont accès.</p>${l.length ? `<div class="list">${l.map((p) => rowPriere(p, true)).join("")}</div>` : vide("i-lock", "Aucune requête confidentielle.")}`;
    }
    const l = s === "exaucees" ? exa : s === "closes" ? S.prieres.filter((p) => p.statut === "Close") : enP;
    l.sort((a, b) => (s === "requetes" ? (!!b.urgent - !!a.urgent) : 0) || cmpFr(b.date || "", a.date || ""));
    if (!l.length) return out + vide("i-flame", s === "exaucees" ? "Aucun témoignage pour l’instant. Quand une requête est exaucée, marquez-la comme telle et notez le témoignage : il apparaîtra ici." : s === "closes" ? "Aucune requête close." : "Aucune requête en cours. Déposez les sujets de prière des membres et du mouvement : chacun pourra indiquer qu’il a prié.", ecr && s === "requetes" ? btn("ajout-priere", "Déposer une requête", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    return out + `<div class="list">${l.map((p) => rowPriere(p, false)).join("")}</div>`;
  };
  function vueChaine() {
    const ch = chaine();
    const ecr = peutEcrire();
    const today = jourIdx(aujourdhui());
    const tot = intercesseursSemaine().length;
    const vides = (() => { let n = 0; for (let j = 1; j <= 7; j += 1) for (const h of ch.creneaux) if (!((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id)).length) n += 1; return n; })();
    let out = `<div class="toolbar"><p class="hint" style="margin:0">${pluriel(tot, "intercesseur engagé", "intercesseurs engagés")} · ${pluriel(ch.creneaux.length, "créneau", "créneaux")} par jour${vides ? ` · ${pluriel(vides, "créneau libre", "créneaux libres")}` : ""}</p><div class="btn-row">${ecr ? btn("ecrire", "Rappeler ceux d’aujourd’hui", { ico: "i-msg", sm: true, data: 'data-aud="chaine" data-val="jour" data-modele="priere"' }) + btn("editer-creneaux", "Modifier les créneaux", { ico: "i-clock", sm: true }) : ""}</div></div>`;
    const ordre = [0, 1, 2, 3, 4, 5, 6].map((k) => ((today - 1 + k) % 7) + 1);
    out += `<div class="grid g3">${ordre.map((j) => {
      const lignes = ch.creneaux.map((h) => {
        const ids = ((ch.affectations || {})[cleCreneau(j, h)] || []).filter((id) => membre(id));
        return `<div class="cr-row"><span class="cr-h num">${esc(heureC(h))}</span><span class="cr-n">${ids.length ? esc(ids.map((id) => nomCourtM(membre(id))).join(", ")) : `<span class="muted">Personne</span>`}</span>${ecr ? `<button class="icon-btn" type="button" data-act="editer-creneau" data-j="${j}" data-h="${esc(h)}" aria-label="Choisir les intercesseurs du ${esc(JOURS[j - 1].toLowerCase())} à ${esc(heureC(h))}">${I("i-edit")}</button>` : ""}</div>`;
      }).join("");
      return `<section class="card cr-jour${j === today ? " auj" : ""}"><div class="card-h"><h2 class="card-t">${esc(JOURS[j - 1])}</h2>${j === today ? `<span class="chip warn">Aujourd’hui</span>` : ""}</div>${lignes}</section>`;
    }).join("")}</div>`;
    return out;
  }
  function ouvrirFormPriere(id, conf) {
    const p = id ? priere(id, conf) : { date: aujourdhui(), categorie: CATEGORIES_PRIERE[0] };
    if (id && !p) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const html = `<form class="form" id="f-priere" novalidate>
      ${champ("p-sujet", "Sujet", inp("p-sujet", "sujet", p.sujet, 'autocomplete="off" required autofocus maxlength="140" placeholder="Guérison de maman, examen de fin d’année…"'), { req: true })}
      ${champ("p-det", "Détails", zone("p-det", "details", p.details, 'rows="4"'))}
      <div class="f2">${champ("p-cat", "Catégorie", sel("p-cat", "categorie", CATEGORIES_PRIERE, p.categorie, null))}${champ("p-date", "Date", inp("p-date", "date", p.date, 'type="date"'))}</div>
      <div class="f2">${champ("p-pour", "Pour un membre", sel("p-pour", "pourId", mbs, p.pourId, "—"))}${champ("p-autre", "Ou pour une autre personne", inp("p-autre", "pour", p.pour, 'autocomplete="off" placeholder="Un proche, une nation…"'))}</div>
      <label class="check"><input type="checkbox" name="urgent" value="1"${p.urgent ? " checked" : ""}> Requête urgente</label>
      ${!id && accesDirection() ? `<label class="check"><input type="checkbox" name="conf" value="1"> Confidentielle : visible seulement par la direction</label>` : !id ? `<p class="hint">Pour une requête confidentielle, adressez-vous à la direction : elle seule peut l’enregistrer à l’abri des autres responsables.</p>` : ""}
      ${pied(id ? "Enregistrer" : "Déposer la requête")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la requête" : "Nouvelle requête", html, wide: true, onSubmit: (fd, form) => enregistrerPriere(fd, form, id, conf) });
  }
  async function enregistrerPriere(fd, form, id, conf) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("sujet")) { erreurForm("Indiquez le sujet de la requête."); $("#p-sujet").focus(); return; }
    const vers = id ? (conf ? "prieres_conf" : "prieres") : fd.get("conf") === "1" && accesDirection() ? "prieres_conf" : "prieres";
    const data = { sujet: g("sujet"), details: g("details"), categorie: g("categorie"), date: g("date") || aujourdhui(), pourId: g("pourId"), pour: g("pourId") ? "" : g("pour"), urgent: fd.get("urgent") === "1" };
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc(`${vers}/${id}`).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection(vers).doc(); await ref.set({ ...data, statut: "En prière", priants: {}, ...creation() }); }
    }, id ? "Requête modifiée" : "Requête déposée");
    form.querySelector("[type=submit]").disabled = false;
    if (ok) ouvrirPriere(id || ref.id, vers === "prieres_conf");
  }
  function fichePriere(id, conf) {
    const p = priere(id, conf);
    if (!p) return null;
    const ecr = peutEcrire();
    const pour = membre(p.pourId);
    const st = p.statut || "En prière";
    const priants = Object.entries(p.priants || {}).filter(([, v]) => v).map(([uid]) => uid);
    const moi = S.me.id && p.priants && p.priants[S.me.id];
    return `<div class="figure"><span class="chip ${st === "Exaucée" ? "ok" : st === "Close" ? "" : "info"}">${esc(st)}</span>${p.urgent && st === "En prière" ? `<span class="chip danger">Urgent</span>` : ""}${conf ? `<span class="chip">${I("i-lock")}Confidentielle</span>` : ""}</div>
      <p style="margin:0 0 12px;font-size:18px;font-weight:700">${esc(p.sujet)}</p>
      ${p.details ? `<div class="msgbox">${esc(p.details)}</div>` : ""}
      ${kv([["Catégorie", esc(p.categorie || "")], ["Pour", pour ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(pour.id)}">${esc(nomUsuel(pour))}</button>` : esc(p.pour || "")], ["Déposée le", p.date ? esc(fmtJour(p.date)) : ""], ["Déposée par", p.creePar ? esc(nomDe(p.creePar)) : ""], ["Ont prié", priants.length ? esc(priants.map((u) => nomDe(u)).join(", ")) : "Personne pour l’instant"], ["Exaucée le", st === "Exaucée" && p.exauceeLe ? esc(fmtJour(p.exauceeLe)) : ""], ["Témoignage", p.temoignage ? `<span style="white-space:pre-wrap">${esc(p.temoignage)}</span>` : ""]])}
      <div class="actions">
        ${st === "En prière" && ecr && S.me.id ? btn("j-ai-prie", moi ? "Retirer « J’ai prié »" : "J’ai prié", { ico: "i-flame", cls: moi ? "btn-ghost" : "btn-primary", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${st === "En prière" && ecr ? btn("exaucer", "Marquer exaucée", { ico: "i-check", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) + btn("statut-priere", "Clore", { ico: "i-archive", data: `data-id="${esc(p.id)}" data-statut="Close"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${st !== "En prière" && ecr ? btn("statut-priere", "Remettre en prière", { ico: "i-undo", data: `data-id="${esc(p.id)}" data-statut="En prière"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${!conf ? btn("partager-priere", "Partager", { ico: "i-msg", data: `data-id="${esc(p.id)}"` }) : ""}
        ${ecr ? btn("editer-priere", "Modifier", { ico: "i-edit", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
        ${peutAdmin() ? btn("supprimer-priere", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(p.id)}"${conf ? ' data-conf="1"' : ""}` }) : ""}
      </div>`;
  }
  const ouvrirPriere = (id, conf) => ouvrir({ titre: conf ? "Requête confidentielle" : "Requête de prière", refresh: surveiller(() => fichePriere(id, conf)) });
  function ouvrirExaucement(id, conf) {
    const p = priere(id, conf);
    if (!p) return;
    ouvrir({
      titre: "Requête exaucée",
      html: `<form class="form" novalidate><p><b>${esc(p.sujet)}</b></p>${champ("ex-date", "Exaucée le", inp("ex-date", "date", aujourdhui(), 'type="date"'))}${champ("ex-tem", "Témoignage", zone("ex-tem", "temoignage", p.temoignage, 'rows="5" autofocus placeholder="Ce que le Seigneur a fait…"'))}${pied("Rendre gloire")}</form>`,
      onSubmit: async (fd, form) => {
        form.querySelector("[type=submit]").disabled = true;
        const ok = await ecrire(() => S.db.doc(`${conf ? "prieres_conf" : "prieres"}/${id}`).update({ statut: "Exaucée", exauceeLe: String(fd.get("date") || aujourdhui()), temoignage: String(fd.get("temoignage") || "").trim(), ...tampon() }), "Gloire à Dieu ! Requête exaucée");
        if (ok) ouvrirPriere(id, conf); else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function ouvrirSujet() {
    const ch = chaine();
    ouvrir({
      titre: "Sujet de la semaine",
      html: `<form class="form" novalidate>${champ("su-t", "Sujet de prière", zone("su-t", "sujet", ch.sujetSemaine, 'rows="3" autofocus placeholder="IN FIRE 2026 : que le feu du réveil embrase les nations"'))}${champ("su-v", "Verset d’appui", inp("su-v", "verset", ch.versetSemaine, 'autocomplete="off" placeholder="Car là où deux ou trois sont assemblés en mon nom… (Matthieu 18.20)"'))}${pied("Enregistrer")}</form>`,
      onSubmit: async (fd, form) => {
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => upsert("chaine/semaine", { sujetSemaine: String(fd.get("sujet") || "").trim(), versetSemaine: String(fd.get("verset") || "").trim() }), "Sujet de la semaine enregistré")) fermer();
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function ouvrirCreneaux() {
    const ch = chaine();
    ouvrir({
      titre: "Créneaux de prière",
      html: `<form class="form" novalidate>${champ("cr-l", "Heures des créneaux", zone("cr-l", "creneaux", ch.creneaux.join("\n"), 'rows="6" autofocus'), { hint: "Une heure par ligne, au format 05:00. Les intercesseurs déjà affectés à une heure conservée restent en place." })}${pied("Enregistrer")}</form>`,
      onSubmit: async (fd, form) => {
        const lignes = [...new Set(String(fd.get("creneaux") || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
        const mal = lignes.filter((l) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(l));
        if (!lignes.length || mal.length) { erreurForm(mal.length ? `Format d’heure invalide : ${mal.join(", ")}. Écrivez par exemple 05:00 ou 18:30.` : "Indiquez au moins un créneau."); return; }
        lignes.sort((a, b) => (a === "00:00") - (b === "00:00") || cmpFr(a, b));
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => upsert("chaine/semaine", { creneaux: lignes }), "Créneaux enregistrés")) fermer();
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function choisirIntercesseurs(j, h) {
    const k = cleCreneau(j, h);
    ouvrirChoix({
      titre: `${JOURS[j - 1]} · ${heureC(h)}`,
      intro: "Cochez les intercesseurs qui tiennent ce créneau chaque semaine.",
      selection: ((chaine().affectations || {})[k] || []).filter((id) => membre(id)),
      libelle: "Enregistrer",
      meta: (m) => { const c = creneauxDe(m.id); return c.length ? `Déjà : ${c.slice(0, 3).join(", ")}${c.length > 3 ? "…" : ""}` : [m.fonction, poleCourt(m.pole)].filter(Boolean).join(" · "); },
      onValider: async (ids) => {
        if (await ecrire(() => upsert("chaine/semaine", { affectations: { [k]: ids } }), "Créneau mis à jour")) { fermer(); allerA("chambre", "chaine"); }
      },
    });
  }
  function carteChambre() {
    const pied = `<button class="link" type="button" data-vue="chambre">Ouvrir la Chambre Haute</button>`;
    if (!S.pret.prieres || !S.pret.chaine || !S.pret.membres) return carte("Chambre Haute", chargement("Lecture des requêtes…"));
    const ch = chaine();
    const enP = S.prieres.filter((p) => (p.statut || "En prière") === "En prière");
    const urg = enP.filter((p) => p.urgent).length;
    const auj = intercesseursDuJour(aujourdhui()).filter((x) => x.ids.length);
    const corps = `${ch.sujetSemaine ? `<p class="eyebrow">Sujet de la semaine</p><p class="sujet-mini">${esc(ch.sujetSemaine)}</p>` : ""}
      <div class="split"><div><span>En prière</span><b>${nb(enP.length)}</b></div><div><span>Urgentes</span><b>${nb(urg)}</b></div><div><span>Exaucées</span><b>${nb(S.prieres.filter((p) => p.statut === "Exaucée").length)}</b></div></div>
      <p class="hint" style="margin-top:12px">${auj.length ? `Aujourd’hui : ${esc(auj.map((x) => `${heureC(x.h)} ${x.ids.map((id) => prenomUsuel(membre(id))).join(", ")}`).join(" · "))}` : "Aucun intercesseur affecté aujourd’hui dans la chaîne de prière."}</p>`;
    return carte("Chambre Haute", corps, { actions: urg ? `<span class="chip danger">${pluriel(urg, "urgente", "urgentes")}</span>` : "", pied });
  }

  /* ════════════════════════ Arsenal ════════════════════════ */
  const TYPES_R = [["livre", "Livre", "i-shelf"], ["video", "Enseignement vidéo", "i-play"], ["audio", "Enseignement audio", "i-audio"], ["document", "Document", "i-file"], ["image", "Image", "i-image"], ["lien", "Lien", "i-link"]];
  const typeR = (r) => TYPES_R.find(([k]) => k === r.type) || TYPES_R[5];
  const ressource = (id) => S.ressources.find((r) => r.id === id) || null;
  const pretsEnCours = (r) => Object.entries(r.prets || {}).filter(([, p]) => p && !p.renduLe).map(([id, p]) => ({ id, ...p }));
  const disponibles = (r) => (Number(r.exemplaires) ? Number(r.exemplaires) - pretsEnCours(r).length : null);
  const TYPES_FICHIER = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
  const taille = (o) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
  function rowRessource(r) {
    const t = typeR(r);
    const dispo = disponibles(r);
    const meta = [t[1], r.auteur, r.annee, r.theme].filter(Boolean).join(" · ");
    return `<button class="row" type="button" data-act="voir-ressource" data-id="${esc(r.id)}"><span class="r-ico t-${esc(t[0])}" aria-hidden="true">${I(t[2])}</span><span class="row-main"><span class="row-t">${esc(r.titre || "Ressource")}</span><span class="row-m">${esc(meta)}</span></span><span class="row-r">${dispo != null ? `<span class="chip ${dispo > 0 ? "ok" : "warn"}">${dispo > 0 ? `${nb(dispo)} dispo.` : "Tous prêtés"}</span>` : ""}${r.fichierId ? `<span class="chip">${I("i-file")}Fichier</span>` : urlSure(r.lien) ? `<span class="chip">${I("i-link")}Lien</span>` : ""}</span></button>`;
  }
  VUES.arsenal = function () {
    const ecr = peutEcrire();
    let out = secHead("Arsenal", { eyebrow: "Médias et bibliothèque", verset: VERSETS.arsenal, actions: ecr ? btn("ajout-ressource", "Ajouter une ressource", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les livres, enseignements et médias du mouvement");
    if (!S.pret.ressources) return out + chargement("Lecture de l’Arsenal…");
    const prets = S.ressources.flatMap((r) => pretsEnCours(r).map((p) => ({ r, p })));
    const retard = prets.filter(({ p }) => p.retourPrevu && p.retourPrevu < aujourdhui()).length;
    if (accesRegistre()) out += sousOnglets("arsenal", [["biblio", "Bibliothèque", S.ressources.length], ["prets", "Prêts en cours", prets.length]]);
    if (S.sous.arsenal === "prets" && accesRegistre()) {
      if (!prets.length) return out + vide("i-shelf", "Aucun livre prêté en ce moment. Indiquez le nombre d’exemplaires d’un livre dans sa fiche pour pouvoir le prêter.");
      prets.sort((a, b) => cmpFr(a.p.retourPrevu || "9999", b.p.retourPrevu || "9999"));
      return out + `<div class="list">${prets.map(({ r, p }) => { const m = membre(p.membreId); const tard = p.retourPrevu && p.retourPrevu < aujourdhui(); return `<div class="row nolead"><span class="row-main"><span class="row-t">${esc(r.titre)}</span><span class="row-m">${esc([m ? nomComplet(m) : "Membre inconnu", p.date ? "prêté le " + fmtCourt(p.date) : "", p.retourPrevu ? "retour prévu le " + fmtCourt(p.retourPrevu) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${tard ? `<span class="chip danger">En retard</span>` : ""}${ecr ? btn("rendre-pret", "Rendu", { ico: "i-check", sm: true, data: `data-id="${esc(r.id)}" data-pret="${esc(p.id)}"` }) : ""}</span></div>`; }).join("")}</div>`;
    }
    const livres = S.ressources.filter((r) => r.type === "livre").length;
    const medias = S.ressources.filter((r) => r.type === "video" || r.type === "audio").length;
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-shelf")}Ressources</span><span class="stat-v">${nb(S.ressources.length)}</span><span class="stat-m">Dans l’Arsenal</span></div>
      <div class="stat"><span class="stat-l">Livres</span><span class="stat-v">${nb(livres)}</span><span class="stat-m">Ouvrages et manuels</span></div>
      <div class="stat"><span class="stat-l">${I("i-play")}Enseignements</span><span class="stat-v">${nb(medias)}</span><span class="stat-m">Vidéos et audios</span></div>
      <div class="stat"><span class="stat-l">Prêts en cours</span><span class="stat-v">${nb(prets.length)}</span><span class="stat-m">${retard ? `${nb(retard)} en retard` : "Aucun retard"}</span></div></div>`;
    const f = S.f.arsenal;
    const themes = [...new Set(S.ressources.map((r) => (r.theme || "").trim()).filter(Boolean))].sort(cmpFr);
    out += `<div class="filters"><div class="chips" role="group" aria-label="Type de ressource">${[["", "Tout"], ...TYPES_R.map(([k, l]) => [k, l.replace("Enseignement ", "")])].map(([k, l]) => `<button class="chip-btn${f.type === k ? " on" : ""}" type="button" data-act="arsenal-type" data-v="${k}" aria-pressed="${f.type === k}">${esc(cap(l))}</button>`).join("")}</div>
      <label class="sr" for="q-ars">Rechercher une ressource</label><input class="search" id="q-ars" type="search" placeholder="Titre, auteur, thème…" value="${esc(f.q)}" data-filtre="arsenal.q" autocomplete="off">${themes.length ? `<label class="sr" for="f-theme">Thème</label><select class="sel" id="f-theme" data-filtre="arsenal.theme">${options(themes, f.theme, "Tous les thèmes")}</select>` : ""}</div>`;
    if (!S.ressources.length) return out + vide("i-shelf", "L’Arsenal est vide. Ajoutez les livres du mouvement, les enseignements (lien YouTube ou Drive), les documents PDF et les images à partager.", ecr ? btn("ajout-ressource", "Ajouter une ressource", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const q = norm(f.q);
    const liste = S.ressources.filter((r) => (!f.type || r.type === f.type) && (!f.theme || (r.theme || "").trim() === f.theme) && (!q || norm([r.titre, r.auteur, r.theme, r.description].join(" ")).includes(q)))
      .sort((a, b) => (!!b.enAvant - !!a.enAvant) || cmpFr(a.titre || "", b.titre || ""));
    if (!liste.length) return out + vide("i-search", "Aucune ressource ne correspond.");
    return out + `<div class="list">${liste.slice(0, S.limite).map(rowRessource).join("")}${liste.length > S.limite ? `<button class="more" type="button" data-act="plus">Afficher plus de ressources</button>` : ""}</div>`;
  };
  function ficheRessource(id) {
    const r = ressource(id);
    if (!r) return null;
    const t = typeR(r);
    const ecr = peutEcrire();
    const lien = urlSure(r.lien);
    const prets = pretsEnCours(r);
    const dispo = disponibles(r);
    const histo = Object.entries(r.prets || {}).filter(([, p]) => p && p.renduLe).map(([pid, p]) => ({ id: pid, ...p })).sort((a, b) => cmpFr(b.renduLe, a.renduLe)).slice(0, 5);
    const nomP = (p) => { const m = membre(p.membreId); return m ? nomComplet(m) : "Emprunteur"; };
    return `<div class="ident"><span class="r-ico lg t-${esc(t[0])}" aria-hidden="true">${I(t[2])}</span><div><h3>${esc(r.titre)}</h3><p>${esc([t[1], r.auteur].filter(Boolean).join(" · "))}</p></div></div>
      ${r.description ? `<div class="msgbox">${esc(r.description)}</div>` : ""}
      ${kv([["Auteur ou orateur", esc(r.auteur || "")], ["Année", esc(r.annee || "")], ["Thème", esc(r.theme || "")], ["Exemplaires", Number(r.exemplaires) ? esc(`${nb(r.exemplaires)} · ${nb(Math.max(0, dispo))} disponible${dispo > 1 ? "s" : ""}`) : ""], ["Fichier", r.fichierId ? esc(`${r.fichierNom || "Fichier"}${r.fichierTaille ? " · " + taille(r.fichierTaille) : ""}`) : ""], ["Lien", lien ? `<a class="link" href="${esc(lien)}" target="_blank" rel="noopener">${esc(lien.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : ""]])}
      <div class="actions">${lien ? `<a class="btn btn-primary" href="${esc(lien)}" target="_blank" rel="noopener">${I(r.type === "video" ? "i-play" : r.type === "audio" ? "i-audio" : "i-link")}Ouvrir</a>` : ""}${r.fichierId ? `<a class="btn ${lien ? "btn-ghost" : "btn-primary"}" href="/_blob/${esc(r.fichierId)}" target="_blank" rel="noopener">${I("i-file")}Consulter le fichier</a>${btn("dl-ressource", "Télécharger", { ico: "i-down", data: `data-id="${esc(r.id)}"` })}` : ""}${btn("partager-ressource", "Partager", { ico: "i-msg", data: `data-id="${esc(r.id)}"` })}</div>
      ${accesRegistre() && (Number(r.exemplaires) || prets.length) ? `<h3 class="h3">Prêts</h3>${prets.length ? `<div class="list">${prets.map((p) => `<div class="row nolead"><span class="row-main"><span class="row-t">${esc(nomP(p))}</span><span class="row-m">${esc([p.date ? "prêté le " + fmtCourt(p.date) : "", p.retourPrevu ? "retour prévu le " + fmtCourt(p.retourPrevu) : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${p.retourPrevu && p.retourPrevu < aujourdhui() ? `<span class="chip danger">En retard</span>` : ""}${ecr ? btn("rendre-pret", "Rendu", { ico: "i-check", sm: true, data: `data-id="${esc(r.id)}" data-pret="${esc(p.id)}"` }) : ""}</span></div>`).join("")}</div>` : `<p class="hint">Aucun exemplaire prêté.</p>`}
        ${ecr && dispo > 0 ? `<div class="btn-row" style="margin-top:10px">${btn("preter", "Prêter un exemplaire", { ico: "i-plus", sm: true, data: `data-id="${esc(r.id)}"` })}</div>` : ""}
        ${histo.length ? `<p class="hint" style="margin-top:10px">Derniers retours : ${esc(histo.map((p) => `${nomP(p)} (${fmtCourt(p.renduLe)})`).join(", "))}.</p>` : ""}` : ""}
      ${ecr ? `<hr class="sep"><div class="btn-row">${btn("editer-ressource", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(r.id)}"` })}${peutAdmin() ? btn("supprimer-ressource", "Supprimer", { ico: "i-trash", cls: "btn-danger", sm: true, data: `data-id="${esc(r.id)}"` }) : ""}</div>` : ""}`;
  }
  const ouvrirRessource = (id) => ouvrir({ titre: "Arsenal", refresh: surveiller(() => ficheRessource(id)) });
  function ouvrirFormRessource(id) {
    const r = id ? ressource(id) : { type: "livre" };
    if (id && !r) return;
    const peutFichier = !!S.assets && peutAdmin();
    const html = `<form class="form" id="f-ressource" novalidate>
      ${champ("r-titre", "Titre", inp("r-titre", "titre", r.titre, 'autocomplete="off" required autofocus'), { req: true })}
      <div class="f2">${champ("r-type", "Type", sel("r-type", "type", TYPES_R.map(([k, l]) => [k, l]), r.type, null))}${champ("r-auteur", "Auteur ou orateur", inp("r-auteur", "auteur", r.auteur, 'autocomplete="off"'))}</div>
      <div class="f2">${champ("r-annee", "Année", inp("r-annee", "annee", r.annee, 'inputmode="numeric" maxlength="4" autocomplete="off"'))}${champ("r-theme", "Thème", inp("r-theme", "theme", r.theme, 'autocomplete="off" placeholder="Combat spirituel, Prière, Famille…" list="themes-l"'))}<datalist id="themes-l">${[...new Set(S.ressources.map((x) => x.theme).filter(Boolean))].map((x) => `<option value="${esc(x)}">`).join("")}</datalist></div>
      ${champ("r-desc", "Description", zone("r-desc", "description", r.description, 'rows="3"'))}
      ${champ("r-lien", "Lien (YouTube, Drive, site…)", inp("r-lien", "lien", r.lien, 'type="url" inputmode="url" autocomplete="off" placeholder="https://"'), { hint: "Pour un enseignement audio ou une vidéo lourde, mettez le lien de la plateforme où il est hébergé." })}
      <div class="f2">${champ("r-ex", "Exemplaires physiques", inp("r-ex", "exemplaires", r.exemplaires || "", 'inputmode="numeric" autocomplete="off" placeholder="0"'), { hint: "Pour les livres que le mouvement peut prêter." })}<div class="field"><span class="lab">Mise en avant</span><label class="check"><input type="checkbox" name="enAvant" value="1"${r.enAvant ? " checked" : ""}> Afficher en tête</label></div></div>
      ${peutFichier ? `<div class="field"><label for="r-fichier">Fichier</label><input class="inp" type="file" id="r-fichier" name="fichier" accept="${TYPES_FICHIER.join(",")}"><p class="hint">PDF, image ou vidéo MP4/WebM, 20 Mo au plus. ${r.fichierId ? `Fichier actuel : ${esc(r.fichierNom || "fichier")} ; un nouveau fichier le remplacera.` : ""}</p>${r.fichierId ? `<label class="check"><input type="checkbox" name="retirerFichier" value="1"> Retirer le fichier actuel</label>` : ""}</div>` : `<p class="hint">Le dépôt de fichiers est réservé aux éditeurs ; vous pouvez indiquer un lien.</p>`}
      ${pied(id ? "Enregistrer" : "Ajouter à l’Arsenal")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la ressource" : "Nouvelle ressource", html, wide: true, onSubmit: (fd, form) => enregistrerRessource(fd, form, id) });
  }
  async function enregistrerRessource(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez le titre."); $("#r-titre").focus(); return; }
    if (g("lien") && !urlSure(g("lien"))) { erreurForm("Le lien doit commencer par https:// ou http://"); return; }
    if (g("annee") && !/^\d{4}$/.test(g("annee"))) { erreurForm("L’année doit comporter quatre chiffres."); return; }
    const ancien = id ? ressource(id) : null;
    const data = { titre: g("titre"), type: g("type"), auteur: g("auteur"), annee: g("annee"), theme: g("theme"), description: g("description"), lien: g("lien"), exemplaires: Number(g("exemplaires").replace(/\D/g, "")) || 0, enAvant: fd.get("enAvant") === "1" };
    const fichier = fd.get("fichier");
    const btnS = form.querySelector("[type=submit]");
    btnS.disabled = true;
    let aSupprimer = null;
    if (fichier && fichier.size) {
      if (!TYPES_FICHIER.includes(fichier.type)) { erreurForm("Ce format n’est pas accepté : choisissez un PDF, une image (JPEG, PNG, WebP, GIF) ou une vidéo MP4/WebM. Pour un audio, indiquez un lien."); btnS.disabled = false; return; }
      if (fichier.size > 20 * 1048576) { erreurForm(`Fichier trop lourd (${taille(fichier.size)}) : 20 Mo au plus.`); btnS.disabled = false; return; }
      S.attente += 1; majSync();
      try {
        const res = await S.assets.upload(fichier, { type: fichier.type });
        Object.assign(data, { fichierId: res.id, fichierNom: fichier.name, fichierType: fichier.type, fichierTaille: res.sizeBytes || fichier.size });
        if (ancien && ancien.fichierId) aSupprimer = ancien.fichierId;
      } catch (e) {
        const code = e && e.code;
        erreurForm(code === "too_large" ? "Fichier trop lourd pour le stockage." : code === "unsupported_type" ? "Ce format de fichier n’est pas accepté." : code === "quota_or_state" ? "L’espace de stockage de l’application est plein." : "Le fichier n’a pas pu être envoyé. Réessayez.");
        btnS.disabled = false; return;
      } finally { S.attente -= 1; majSync(); }
    } else if (fd.get("retirerFichier") === "1" && ancien && ancien.fichierId) {
      Object.assign(data, { fichierId: "", fichierNom: "", fichierType: "", fichierTaille: 0 });
      aSupprimer = ancien.fichierId;
    }
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("ressources/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("ressources").doc(); await ref.set({ ...data, prets: {}, ...creation() }); }
    }, id ? "Ressource modifiée" : "Ressource ajoutée à l’Arsenal");
    btnS.disabled = false;
    if (!ok) return;
    if (aSupprimer && S.assets) { try { await S.assets.delete(aSupprimer); } catch (e) { /* l’ancien fichier reste stocké */ } }
    ouvrirRessource(id || ref.id);
  }
  function ouvrirPret(rid) {
    const r = ressource(rid);
    if (!r) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    ouvrir({
      titre: "Prêter un exemplaire",
      html: `<form class="form" novalidate><p><b>${esc(r.titre)}</b> · ${pluriel(Math.max(0, disponibles(r)), "exemplaire disponible", "exemplaires disponibles")}</p>
        ${champ("pr-m", "Emprunteur", sel("pr-m", "membreId", mbs, "", "Choisir un membre", "required autofocus"), { req: true })}
        <div class="f2">${champ("pr-d", "Date du prêt", inp("pr-d", "date", aujourdhui(), 'type="date"'))}${champ("pr-r", "Retour prévu", inp("pr-r", "retourPrevu", ajoutJours(aujourdhui(), 21), 'type="date"'))}</div>${pied("Enregistrer le prêt")}</form>`,
      onSubmit: async (fd, form) => {
        const mid = String(fd.get("membreId") || "");
        if (!membre(mid)) { erreurForm("Choisissez l’emprunteur."); return; }
        if (!(disponibles(ressource(rid)) > 0)) { erreurForm("Plus aucun exemplaire disponible."); return; }
        const pid = "p" + Date.now().toString(36);
        form.querySelector("[type=submit]").disabled = true;
        if (await ecrire(() => S.db.doc("ressources/" + rid).update({ prets: { [pid]: { membreId: mid, date: String(fd.get("date") || aujourdhui()), retourPrevu: String(fd.get("retourPrevu") || ""), creePar: S.me.id || null } }, ...tampon() }), "Prêt enregistré")) ouvrirRessource(rid);
        else form.querySelector("[type=submit]").disabled = false;
      },
    });
  }
  function livresDe(mid) {
    return S.ressources.flatMap((r) => pretsEnCours(r).filter((p) => p.membreId === mid).map((p) => ({ r, p })));
  }

  /* ════════════════════════ Modules (accès rapide) ════════════════════════ */
  function resumeModule(id) {
    if (id === "membres") return S.pret.membres ? pluriel(membresActifs().length, "membre actif", "membres actifs") : "";
    if (id === "finances") { const s = S.pret.finances ? soldeFin(moisCourant()) : null; return s == null ? "Journal et cotisations" : `Caisse : ${fcfa(s)}`; }
    if (id === "agenda") { const e = aVenir()[0]; return e ? `Prochain : ${e.titre} · ${fmtCourt(e.date)}` : "Aucun rassemblement programmé"; }
    if (id === "garnisons") return S.pret.garnisons ? `${pluriel(pointsSDE().length, "point SDE", "points SDE")} · ${pluriel(S.garnisons.length, "structure", "structures")}` : "";
    if (id === "academie") { const n = S.formations.filter((f) => etatFormation(f) === "encours").length; return S.pret.formations ? (n ? `${pluriel(n, "formation en cours", "formations en cours")}` : `${pluriel(S.formations.length, "formation", "formations")}`) : ""; }
    if (id === "portevoix") return S.pret.annonces ? pluriel(annoncesActives().length, "annonce active", "annonces actives") : "";
    if (id === "chambre") return S.pret.prieres ? pluriel(S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length, "requête en prière", "requêtes en prière") : "";
    if (id === "assistant") return S.sample ? "Questions, textes et synthèses" : "Disponible dans Claude";
    if (id === "projets") return S.pret.projets ? pluriel((S.projets || []).filter(estActifP).length, "projet en cours", "projets en cours") : "";
    if (id === "arsenal") return S.pret.ressources ? pluriel(S.ressources.length, "ressource", "ressources") : "";
    if (id === "secretariat") return S.pret.decisions ? pluriel(S.decisions.filter(enCours).length, "décision en cours", "décisions en cours") : "";
    return "";
  }
  VUES.plus = function () {
    let out = secHead("Modules", { eyebrow: "Toutes les sections du Quartier Général" });
    const vis = ongletsVisibles().filter((o) => o.id !== "accueil");
    return out + `<div class="tiles">${vis.map((o) => `<button class="tile" type="button" data-vue="${o.id}"><span class="tile-ico" aria-hidden="true">${I(o.ico)}</span><span class="tile-t">${esc(o.long)}</span><span class="tile-d">${esc(o.desc || "")}</span><span class="tile-m">${esc(resumeModule(o.id))}</span></button>`).join("")}</div>`;
  };
  /* Parcours du membre dans les modules : formations, chaîne de prière, livres empruntés */
  function blocParcours(m) {
    let out = "";
    if (S.pret.formations) {
      const fs = formationsDe(m.id);
      out += `<h3 class="h3">Formations</h3>` + (fs.length ? `<div class="list">${fs.map(({ f, p }) => {
        const pr = progressionP(f, p);
        const chip = p.statut === "Certifié" ? `<span class="chip ok">Certifié</span>` : p.statut === "Abandon" ? `<span class="chip">Abandon</span>` : `<span class="chip info">${LIB_ETAT_F[etatFormation(f)]}</span>`;
        return `<button class="row nolead" type="button" data-act="voir-participant" data-id="${esc(f.id)}" data-mid="${esc(m.id)}"><span class="row-main"><span class="row-t">${esc(f.titre)}</span><span class="row-m">${esc([f.programme, pr.total ? `${pr.faits} module${pr.faits > 1 ? "s" : ""} sur ${pr.total}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${chip}</span></button>`;
      }).join("")}</div>` : `<p class="hint">Aucune formation suivie.</p>`);
    }
    if (S.pret.chaine) {
      const cr = creneauxDe(m.id);
      if (cr.length) out += `<h3 class="h3">Chaîne de prière</h3><p class="hint">${esc(cr.join(" · "))}</p>`;
    }
    if (S.pret.ressources) {
      const l = livresDe(m.id);
      if (l.length) out += `<h3 class="h3">Livres empruntés</h3><p class="hint">${esc(l.map(({ r, p }) => `${r.titre}${p.retourPrevu ? ` (retour prévu le ${fmtCourt(p.retourPrevu)})` : ""}`).join(" · "))}</p>`;
    }
    return out;
  }

  /* Contours des pays : world.geo.json (domaine public), projection Natural Earth. */
  const CARTE_W = 1000, CARTE_H = 437.7, CARTE_Y0 = -252.6780552576031, CARTE_XM = 2.735384723480633, CARTE_S = 182.78964407016807;
  const PAYS_GEO = [["AFG","Afghanistan","M659.7 137.7 L662.5 138.9 L664.4 138.5 L664.7 137 L666.7 136.5 L667.9 135.5 L667.9 133 L670 132.3 L670.1 131.2 L671.5 132.1 L672.3 132.2 L673.8 132.2 L675.9 132.9 L676.8 133.3 L678.4 132.2 L679.4 132.8 L679.9 131.4 L681.5 131.4 L681.8 129.7 L682.6 128.5 L684.2 129.3 L684.1 130.3 L685 130.4 L685.3 133.1 L686.6 134.2 L687.4 133.5 L688.4 133.2 L689.7 131.7 L691.6 132 L694.2 132 L694.9 132.9 L693.5 133.3 L692.3 133.9 L689.4 134.2 L686.8 134.9 L685.6 136.3 L686.5 137.7 L687.1 139.3 L686.1 140.6 L686.5 141.9 L686 143.1 L683.5 142.9 L685 145.1 L683.4 145.9 L682.7 147.9 L683.2 149.8 L682.3 150.7 L681.3 150.4 L679.4 150.8 L679.2 151.7 L677.3 151.7 L676.1 153.6 L676.5 156.3 L673.2 157.7 L671.3 157.4 L670.9 158.1 L669.3 157.7 L666.7 158.2 L662 156.5 L663.9 153.6 L663.4 151.5 L661.3 150.9 L660.7 148.9 L659.4 146.3 L660.2 144.5 L659 144.1 L659.3 141.7 L659.7 137.7Z",673.4,143.5],["AGO","Angola","M545.3 271.6 L545.9 274 L546.7 275.9 L547.3 276.9 L548.4 278.6 L550.2 278.4 L551.1 277.9 L552.7 278.4 L553.1 277.6 L553.8 275.7 L555.5 275.6 L555.7 275 L557.1 275 L556.8 276.1 L560.2 276.1 L560.2 278.1 L560.8 279.4 L560.3 281.3 L560.5 283.3 L561.4 284.5 L561.2 288.3 L561.9 288 L563.1 288.1 L564.8 287.6 L566.1 287.8 L566.3 288.8 L566 290.4 L566.4 291.9 L566 293.1 L566.2 294.2 L560.5 294.2 L560.1 304.4 L561.8 307 L563.6 309.1 L558.5 310.4 L551.9 309.9 L550 308.4 L538.9 308.5 L536.9 307.3 L535.1 307.2 L533.5 307.7 L532.1 308.3 L531.9 306.3 L532.3 303.5 L533.3 300.5 L533.5 299.2 L534.4 296.2 L535.1 294.9 L536.7 292.8 L537.6 291.4 L537.9 289 L537.8 287.2 L537 286 L536.3 284.1 L535.6 282.1 L535.8 281.5 L536.6 280.2 L535.8 277.1 L535.3 274.9 L533.9 272.9 L535.3 271.9 L536.1 271.9 L537.1 271.5 L545.3 271.6ZM534.5 270.9 L533.8 271.3 L533.1 268.9 L534.2 267.5 L535 266.9 L536.1 268 L535 268.7 L534.6 269.5 L534.5 270.9Z",548.3,292.2],["ALB","Albanie","M552.3 117.7 L552.1 118.8 L552.5 120.2 L553.7 121 L553.7 121.8 L552.9 122.3 L552.8 123.3 L551.7 124.9 L551.2 123.9 L549.7 122.9 L549.3 121.3 L549.4 119.2 L549.7 118.2 L549 116.6 L550 115.1 L550.2 115.7 L551.4 116.2 L552.1 116.6 L552.3 117.7Z",551.1,120.0],["ARE","Émirats arabes unis","M639.3 174.6 L640 175.3 L642 174.8 L644.3 174.9 L645.9 175 L647.5 172.8 L649.3 170.7 L650.8 168.7 L651.4 169.8 L652.1 172.4 L650.7 172.4 L650.7 174.5 L650.1 175.6 L650.2 176.9 L649.6 178.2 L649.6 179.5 L649.2 180.2 L640.9 178.6 L639.5 175.3 L639.3 174.6Z",646.5,175.8],["ARG","Argentine","M345.8 429.3 L343.6 429.5 L342 428.4 L340.6 428.3 L338 428.3 L335.6 421.5 L337 422.9 L339 425.2 L342.7 427 L346.3 427.8 L345.8 429.3ZM323.7 323.8 L325.5 326.1 L326.3 323.5 L329.4 323.6 L329.9 324.3 L335.5 329.6 L337.8 330.1 L341.4 332.5 L344.3 333.7 L344.9 335.2 L342.8 340.1 L345.7 341 L348.7 341.5 L350.8 340.9 L352.9 338.5 L353 335.6 L354.3 335 L355.8 336.9 L356.1 339.4 L354 341.2 L352.4 342.5 L349.8 345.7 L346.9 350.1 L346.6 352.7 L346.4 356 L346.9 359.2 L346.5 360 L346.6 362 L346.7 363.7 L350.5 366.5 L350.6 368.7 L352.4 370.1 L352.6 371.7 L350.9 375.8 L347.4 377.6 L342.4 378.2 L339.5 377.9 L340.4 379.8 L340.4 382.2 L341.2 383.9 L340 385 L337.4 385.4 L334.7 384.3 L333.9 385.1 L335 388.3 L337 389.2 L338.1 388.2 L339.3 389.9 L337.2 390.9 L335.7 392.9 L336.1 396.1 L336 397.8 L333.6 397.8 L332.1 399.4 L332.1 401.8 L335.1 404.1 L337.7 404.7 L337.7 407.5 L335.3 409.3 L334.8 412.9 L333 414.2 L332.5 415.6 L334.3 418.8 L336.5 420.6 L335.4 420.5 L333 420 L327.1 419.6 L325.5 417.8 L324.7 415.5 L323.2 415.7 L321.9 414.5 L320.6 411.2 L322 409.9 L322.2 407.9 L321.4 406.3 L321.8 403.6 L321.5 399.4 L320.7 397.6 L321.6 397 L321 395.8 L319.6 395.1 L320.1 393.8 L318.6 392.6 L317 388.9 L317.9 388.3 L316.4 384.3 L316.2 381.1 L316.2 378.2 L317.4 377 L315.9 373.9 L315.2 370.9 L316.7 368.8 L316.1 366.1 L316.9 363 L316.3 360 L315.5 359.4 L313.2 353.8 L314.3 350.5 L313.5 347.4 L313.9 344.4 L315.2 341.4 L316.8 339.4 L315.8 338.1 L316.2 337.1 L315.3 331.7 L318.1 330.1 L318.5 326.7 L318.1 325.9 L320 323 L323.7 323.8Z",330.6,365.3],["ARM","Arménie","M611.1 120.2 L614.6 119.7 L615.3 120.5 L616.3 121.1 L615.9 121.9 L617.5 123 L616.9 124 L618.2 124.9 L619.4 125.4 L619.8 127.6 L618.9 127.7 L617.5 125.9 L616.3 125.4 L615.4 124.5 L613.8 123.7 L611.7 122.9 L611.7 121.3 L611.1 120.2Z",615.2,123.0],["AUS","Australie","M871.3 384.2 L873.1 385.3 L874.8 384.9 L877.1 384.3 L878.5 384.5 L876.6 388.3 L875.1 389.4 L873.4 392 L873 391.1 L870 393.3 L868.1 393 L868.1 390.3 L868.9 388.2 L868.9 385.4 L869.7 383.9 L871.3 384.2ZM895.3 296.9 L895.9 299.5 L897.8 298.3 L898.5 299.6 L899.6 300.9 L899.1 302.3 L899.1 305.1 L899.2 306.7 L900 309.8 L899.4 311.5 L899.8 313.7 L902.4 315.4 L903.9 316.9 L905.4 318.3 L904.9 319.1 L905.9 321.1 L906 324.6 L907.3 323.9 L908 325.3 L908.8 324.8 L908.3 328.2 L909.7 330.2 L910.5 331.5 L911.8 334.1 L911.7 336.7 L911.2 338.5 L910.3 340.5 L910.6 343.3 L909.4 346.1 L908.4 347.6 L906.6 350.5 L905.9 352.4 L904.4 354.7 L902.1 357.7 L899.4 359.2 L897.4 361.7 L895.8 363.3 L893.8 366.1 L892.1 367.7 L890.3 370.2 L888.9 372.4 L888.5 373.4 L886.5 374.5 L883.6 374.6 L880.5 376 L878.7 377.2 L876.5 378.6 L875.1 377.2 L873.8 376.6 L875 374.9 L873.3 375.5 L869.9 377.9 L868.1 377 L866.8 376.5 L865.5 376.2 L863.4 375.3 L862.7 373.3 L863.3 370.9 L863.4 369.2 L862.7 367.9 L860.3 367.6 L861.8 366 L862.2 363.6 L860 365.8 L857.4 366.4 L859.5 364.6 L860.7 362.8 L862.3 361.2 L863 358.8 L859.8 361.5 L857.7 362.6 L855.7 365.2 L854.2 363.9 L854.9 362.2 L854.2 359.8 L853.3 358.6 L854 357.9 L851.4 355.9 L849.6 355.8 L847.6 354.2 L842.7 354.5 L838.9 355.7 L835.5 356.8 L833.1 356.6 L829.7 358.2 L827.2 359 L826.1 360.7 L824.6 362 L822.4 362.1 L820.6 362.4 L818.5 361.8 L816.5 362.1 L814.6 362.3 L812.5 364 L811.8 363.8 L810.1 364.8 L808.5 365.8 L806.7 365.7 L804.9 365.7 L802.8 363.6 L801.6 363 L802.3 361.1 L803.8 360.7 L804.4 359.9 L804.7 358.8 L805.8 356.5 L806.1 354.6 L805.6 351.3 L805.8 349.5 L806.4 347.7 L805.9 345.5 L806.1 344.6 L805.3 343.3 L805.6 340.8 L804.7 338.2 L804.7 336.8 L805.5 338.2 L805.4 335.2 L806.5 336.2 L807 337.4 L807.3 335.8 L806.6 333.2 L806.6 332.2 L806.2 331.2 L806.9 329.4 L807.6 328.6 L808.3 326.9 L808.4 325.1 L810 322.7 L809.7 325.2 L811.4 323 L813.8 321.9 L815.4 320.5 L817.7 319.3 L819 319.1 L819.7 319.5 L822 318.3 L823.8 317.9 L824.3 317.2 L825.1 316.9 L826.6 317 L829.6 316 L831.4 314.6 L832.4 312.9 L834.3 311.2 L834.7 310 L835 308.2 L837.4 305.5 L838.1 308.2 L839.4 307.6 L838.7 306.1 L839.8 304.5 L840.9 305.2 L841.6 302.8 L843.3 301.2 L844.2 299.9 L845.7 299.3 L845.8 298.4 L847 298.8 L847.2 298 L848.4 297.6 L849.8 297.1 L851.6 298.6 L852.9 300.5 L854.6 300.5 L856.3 300.8 L856 299.1 L857.7 296.5 L859.1 295.6 L858.7 294.8 L860.2 293 L862 291.9 L863.4 292.2 L865.8 291.6 L865.9 290 L864 288.9 L865.5 288.5 L867.3 289.3 L868.6 290.6 L870.8 291.4 L871.6 291.1 L873.2 292.1 L874.9 291.1 L875.9 291.4 L876.7 290.8 L877.7 292.4 L876.8 294.1 L875.5 295.4 L874.6 295.5 L874.7 296.8 L873.6 298.4 L872.4 300 L872.5 300.9 L874.3 302.7 L876.3 303.7 L877.5 304.8 L879.1 306.8 L879.9 306.8 L881.2 307.6 L881.4 308.6 L883.8 309.7 L885.8 308.6 L886.7 306.8 L887.5 305.4 L888.2 303.6 L889.5 301.1 L889.4 299.5 L889.7 298.6 L889.7 296.7 L890.4 294.3 L891 293.7 L890.8 292.6 L891.7 290.9 L892.4 289.1 L892.6 288.2 L893.8 287 L894.4 288.6 L894.3 290.6 L894.9 291 L894.9 292.3 L895.6 293.9 L895.6 295.8 L895.3 296.9Z",861.0,334.8],["AUT","Autriche","M541.8 97.9 L541.7 99.1 L540.3 99.2 L540.1 101.9 L537.5 102.5 L536.3 103.2 L534.3 102.9 L530.7 102.1 L530.1 101 L527.7 101.6 L527.4 102.2 L525.9 101.7 L524.6 101.6 L523.5 101.1 L523.8 100.3 L524.4 99.6 L525.7 100.4 L526 99.6 L528.2 99.7 L529.9 99.2 L531.1 99.3 L531.9 99.9 L531.7 97.3 L532.5 96.9 L533.3 95.5 L535.2 96.5 L536.5 95.2 L537.3 95 L539.3 96 L540.4 95.8 L541.6 96.4 L541.8 97.9Z",534.7,99.5],["AZE","Azerbaïdjan","M615.4 124.5 L616.3 125.4 L617.5 125.4 L618.9 127.7 L617 127.3 L615.5 125.8 L614.9 124.6ZM620.7 119.8 L621.9 120 L622.2 119.2 L623.5 117.9 L625.1 119.6 L626.8 121.8 L628 122 L629 122.9 L626.9 123.1 L626.9 125.6 L626.6 126.7 L625.8 127.5 L626.2 129.1 L625.5 129.2 L623.7 127.6 L624.3 126 L623.4 125 L622.4 125.3 L619.8 127.6 L619.4 125.4 L618.2 124.9 L616.9 124 L617.5 123 L615.9 121.9 L616.3 121.1 L615.3 120.5 L614.6 119.7 L617.2 120.1 L618.6 120.3 L617.3 118.2 L617.9 117.7 L618.6 117.8 L620.7 119.8Z",622.0,122.8],["BDI","Burundi","M581.4 267.1 L581.3 263.3 L580.6 261.8 L582.3 262.1 L583.1 260.2 L584.6 260.4 L584.8 261.7 L585.4 262.4 L585.4 263.5 L584.7 264.1 L583.6 265.8 L582.6 267 L581.4 267.1Z",583.0,263.5],["BEL","Belgique","M508 87.8 L509.8 88.1 L512 87.4 L513.6 88.8 L514.9 89.5 L514.7 91.6 L514.1 91.7 L513.8 93.5 L511.7 92.1 L510.4 92.3 L508.7 90.8 L507.6 89.6 L506.4 89.5 L506.1 88.4 L508 87.8Z",511.1,90.0],["BEN","Bénin","M507.5 232.6 L505.2 232.9 L504.5 230.7 L504.6 223.3 L504 222.7 L503.9 221.1 L503 220 L502.1 219 L502.5 217.3 L503.4 217 L504 215.5 L505.3 215.2 L505.9 214.3 L506.9 213.3 L507.9 213.3 L510 215.2 L509.9 216.3 L510.5 218.2 L510 219.5 L510.2 220.3 L508.9 222.3 L508.1 223.3 L507.5 225.3 L507.6 227.4 L507.5 232.6Z",506.5,221.7],["BFA","Burkina Faso","M492.2 221.7 L490.3 220.9 L489 221 L488 221.8 L486.8 221.1 L486.3 220 L485.1 219.3 L484.9 217.5 L485.6 216.1 L485.6 215 L487.8 212.3 L488.2 210.1 L489 209.4 L490.3 209.8 L491.5 209.1 L491.8 208.3 L494 206.9 L494.5 205.9 L497.1 204.5 L498.6 204.1 L499.3 204.7 L501 204.7 L500.8 206.2 L501.2 207.7 L502.7 209.8 L502.8 211.3 L506 212.1 L505.9 214.3 L505.3 215.2 L504 215.5 L503.4 217 L502.5 217.3 L500.1 217.3 L498.8 217 L497.9 217.5 L496.7 217.3 L491.9 217.4 L491.8 219.3 L492.2 221.7Z",495.1,213.1],["BGD","Bangladesh","M751.6 181.7 L751.9 184 L750.9 183.5 L751.4 186.1 L750.4 184.4 L750 182.8 L749.2 181.2 L747.8 179.4 L745.2 179.2 L745.7 180.6 L745.2 182.4 L743.9 181.7 L743.6 182.3 L742.8 181.9 L741.7 181.7 L740.8 179 L739.5 176.6 L739.6 174.6 L737.8 173.7 L738.2 172.6 L739.6 171.4 L737.4 169.7 L737.9 167.5 L740.3 168.9 L741.6 169 L742.3 171.3 L744.9 171.7 L747.4 171.7 L749.1 172.2 L748.3 174.9 L747.2 175.1 L746.6 177 L748.4 178.7 L748.5 176.6 L749.2 176.6 L751.6 181.7Z",744.0,175.9],["BGR","Bulgarie","M556.9 110.1 L557.8 111.5 L558.7 111.2 L560.7 111.7 L564.4 111.9 L565.6 111.1 L568.5 110.3 L570.4 111.5 L571.9 111.8 L570.8 113.1 L570.1 115.4 L571.1 117.2 L568.9 116.8 L566.4 117.8 L566.5 119.4 L564.2 119.7 L562.3 118.6 L560.4 119.5 L558.5 119.4 L558.1 117.3 L556.7 116.2 L556.8 115.4 L557.2 114.4 L558 113.4 L556.7 112 L556.4 110.9 L556.9 110.1Z",563.7,114.9],["BHS","Bahamas","M290.3 176.1 L289.7 176.3 L289.3 174.4 L288.4 173.5 L289.3 171.5 L290.1 171.6 L290.6 174.3 L290.3 176.1ZM291 167 L288 167.5 L288 166.3 L289.4 166.1 L291.1 166.2 L291 167ZM293.3 167 L292.4 169.3 L292.3 167.2 L291.3 165.9 L293.3 167Z",289.7,173.7],["BIH","Bosnie-Herzégovine","M547.6 108.2 L548.5 108.2 L548 109.5 L549.3 110.8 L549 112.3 L548.4 112.4 L547.2 113.4 L547 115.2 L544.7 114 L543.6 112.7 L542.6 111.9 L541.4 110.8 L540.8 109.8 L539.4 108.3 L539.9 107 L540.8 107.7 L541.3 107 L542.5 107 L544.7 107.5 L546.4 107.5 L547.6 108.2Z",544.8,110.3],["BLR","Biélorussie","M555.8 80 L558.1 80 L560.5 78.8 L560.8 77.1 L562.6 76.1 L562.2 74.8 L563.6 74.3 L565.9 73.1 L568.5 73.9 L568.9 74.6 L570.1 74.3 L572.5 75 L573 76.4 L572.6 77.2 L574.4 79.2 L575.5 79.8 L577.1 80.9 L577.9 81.7 L577.1 82.3 L575.2 82.2 L575.5 83.5 L576.4 85.5 L574.3 85.7 L573.7 86.4 L573.8 87.9 L572.8 87.6 L570.6 87.8 L569.9 87 L569.1 87.6 L568.1 87.1 L566.2 87.1 L563.4 86.3 L560.9 86.1 L559.1 86.2 L557.9 87 L556.7 87.1 L556.5 85.7 L555.6 84.3 L557 83.7 L556.8 82.5 L556 81.3 L555.8 80Z",566.6,81.3],["BLZ","Belize","M256 195.4 L256.4 194.7 L258.1 193.2 L259.1 193.6 L258.9 194.5 L258.3 195.9 L258.1 197.6 L257.7 199.5 L257.1 200.3 L256.5 200.5 L255.9 201.6 L255.1 201.6 L255.7 197.9 L256 195.4Z",257.0,197.3],["BOL","Bolivie","M329.4 323.6 L326.3 323.5 L325.5 326.1 L323.7 323.8 L320 323 L318.1 325.9 L316.2 326.3 L314.6 321.9 L312.7 318.3 L313.2 315.1 L311.6 313.8 L311 311.4 L309.5 309.2 L310.9 305.8 L309.5 303.1 L310 302 L309.4 300.8 L310.3 299.2 L310.2 296.4 L310.1 294.2 L310.7 293.1 L307.9 287.9 L310 288.2 L311.4 288.1 L312 287.1 L314.3 285.8 L315.7 284.6 L319.3 284.1 L319.1 286.5 L319.5 287.7 L319.5 289.9 L322.6 292.8 L325.8 293.3 L326.9 294.5 L328.8 295.1 L330 296.1 L331.8 296 L333.4 297 L333.7 298.8 L334.3 299.8 L334.4 301.2 L333.6 301.2 L335 305 L340.2 305.1 L340 307 L340.4 308.3 L341.9 309.2 L342.7 311.2 L342.5 313.7 L341.9 315.1 L342.3 317 L341.5 317.6 L341.4 316.6 L338.7 315 L336.1 314.9 L331.5 315.9 L330.4 318.7 L330.6 320.5 L329.9 324.3 L329.4 323.6Z",322.8,306.5],["BRA","Brésil","M346.9 350.1 L349.8 345.7 L352.4 342.5 L354 341.2 L356.1 339.4 L355.8 336.9 L354.3 335 L353 335.6 L353.3 333.7 L353.5 331.8 L353.3 330.1 L352.2 329.5 L351.3 330 L350.3 329.8 L349.8 328.6 L349.2 325.6 L348.6 324.7 L346.7 323.8 L345.7 324.4 L342.7 323.8 L342.5 319.4 L341.5 317.6 L342.3 317 L341.9 315.1 L342.5 313.7 L342.7 311.2 L341.9 309.2 L340.4 308.3 L340 307 L340.2 305.1 L335 305 L333.6 301.2 L334.4 301.2 L334.3 299.8 L333.7 298.8 L333.4 297 L331.8 296 L330 296.1 L328.8 295.1 L326.9 294.5 L325.8 293.3 L322.6 292.8 L319.5 289.9 L319.5 287.7 L319.1 286.5 L319.3 284.1 L315.7 284.6 L314.3 285.8 L312 287.1 L311.4 288.1 L310 288.2 L307.9 287.9 L306.4 288.4 L305.1 288.1 L305 283.2 L302.9 285.1 L300.4 285 L299.3 283.3 L297.4 283.1 L297.9 281.7 L296.3 279.8 L295 276.9 L295.7 276.3 L295.7 274.9 L297.3 274 L297 272.2 L297.6 271.1 L297.8 269.6 L300.9 267.4 L303.2 266.8 L306 266.5 L307.1 257.7 L307.2 256.3 L306.7 254.4 L305.5 253.3 L305.5 250.9 L307.1 250.4 L307.7 249.5 L306.1 249.2 L306.1 247.2 L311.5 247.2 L312.4 246.1 L313.2 247.2 L313.7 249 L315.8 250.4 L317.9 250.1 L318.5 249.2 L320.5 248.4 L321.7 247.9 L322 246.5 L324 245.6 L323.9 244.9 L321.5 244.7 L321.2 242.6 L321.3 240.5 L320.1 239.6 L322.7 239.8 L324.9 240.6 L325.7 239.8 L327.7 239.3 L330.8 238.1 L331.9 236.9 L331.5 236 L333 235.8 L333.6 236.6 L333.2 238 L334.1 238.5 L334.7 240 L333.9 241.1 L333.5 243.8 L334.2 245.4 L334.3 246.9 L336 248.4 L337.4 248.6 L338.6 247.8 L339.9 247.3 L340.8 246.4 L342.3 246.7 L343 246.6 L344.5 246.8 L344.7 246.2 L344.3 245.5 L344.6 244.6 L345.7 244.9 L347 244.6 L348.6 245.2 L349.8 245.9 L350.7 245 L351.3 245.2 L351.6 246.1 L353 245.9 L354.1 244.6 L354.9 242.3 L356.6 239.3 L357.6 239.2 L358.2 240.9 L359.7 246.6 L361.2 247.1 L361.3 249.3 L359.2 252 L360 252.9 L364.9 253.4 L365.1 256.7 L367.2 254.5 L370.7 255.7 L375.3 257.7 L376.6 259.5 L376.2 261.3 L379.4 260.3 L384.8 262 L389 261.9 L393.1 264.6 L396.7 268.2 L398.9 269.1 L401.2 269.2 L402.3 270.2 L403.3 274.3 L403.8 276.3 L402.8 281.6 L401.4 283.7 L397.7 288.2 L396 291.8 L394.1 294.6 L393.4 294.7 L392.8 297 L393.2 303.1 L392.7 308 L392.5 310.2 L391.8 311.4 L391.5 315.8 L389.1 320 L388.8 323.3 L386.7 324.7 L386.3 326.7 L383.3 326.6 L379.2 327.9 L377.4 329.3 L374.4 330.3 L371.5 332.8 L369.5 336.1 L369.4 338.5 L370 340.3 L369.9 343.5 L369.5 345.1 L367.8 346.9 L365.6 352.6 L363.6 355.2 L362 356.7 L361.3 359.7 L359.8 361.6 L358.8 359.8 L359.8 358.2 L357.9 356 L355.6 354.2 L352.5 352.2 L351.6 352.3 L348.5 349.8 L346.9 350.1Z",353.8,287.3],["BRN","Brunei","M816.9 238.1 L818 236.9 L820.3 235.2 L820.2 236.8 L820.1 238.8 L818.8 238.7 L818.3 239.8 L816.9 238.1Z",818.9,237.6],["BTN","Bhoutan","M745.4 163.2 L746.7 164.2 L747 166.2 L744.8 166.3 L742.5 166.1 L740.9 166.6 L738.2 165.3 L738 164.7 L739.3 162.3 L740.6 161.5 L742.6 162.2 L744.1 162.3 L745.4 163.2Z",742.4,164.3],["BWA","Botswana","M570.1 312.3 L571.4 314.8 L574.3 318.3 L575.5 318.7 L575.5 319.8 L576.2 321.9 L578.2 322.4 L579.9 323.8 L575.9 326.2 L573.4 328.6 L572.4 330.8 L571.5 332 L570 332.2 L569.4 333.8 L569.1 334.8 L567.3 335.5 L565.2 335.4 L563.9 334.5 L562.8 334.1 L561.5 334.8 L560.7 336.4 L559.4 337.4 L558 338.8 L556.1 339.1 L555.5 338 L555.8 336 L554.4 333 L553.7 332.5 L554 323 L556.7 322.9 L557.2 311.4 L559.2 311.3 L563.5 310.2 L564.5 311.5 L566.3 310.2 L567.1 310.2 L568.7 309.5 L570.1 312.3Z",564.5,323.8],["CAF","République centrafricaine","M542.3 228.8 L544.6 228.6 L545.1 227.8 L546.3 228.5 L549.8 227.3 L550.9 226.1 L552.3 224.9 L552.1 223.8 L552.8 223.5 L555.5 223.7 L558.1 222.2 L560 218.7 L561.4 217.4 L563.1 216.9 L563.5 218.2 L565.1 220.2 L565.2 221.6 L564.7 222.9 L564.9 223.9 L565.9 224.8 L568 226.2 L569.6 227.5 L569.6 228.6 L571.5 230.2 L572.7 231.6 L573.4 233.6 L575.5 234.8 L575.9 235.9 L575 236.2 L573.3 236.1 L571.2 235.8 L570.1 236.1 L569.7 236.8 L568.8 236.9 L567.7 236.3 L564.7 237.9 L563.4 237.5 L562.2 239.7 L560.1 239.1 L558.1 238.8 L556.3 237.6 L554 236.5 L552.5 237.5 L551.5 239.2 L551.2 241.4 L549.4 241.2 L547.6 240.7 L545.9 242.4 L544.5 245.4 L544.2 244.5 L544 243 L542.8 242 L541.7 240.3 L541.5 239.1 L540.2 237.5 L540.4 236.5 L540.1 235.2 L540.3 232.7 L541 232.1 L542.3 228.8Z",556.5,231.7],["CAN","Canada","M342 102.8 L343.7 103.2 L346 103.2 L344.4 104.4 L343.5 104.7 L340.7 103.3 L340.3 102.3 L341.5 101.3 L342 102.8ZM348.8 94.8 L347.6 94.8 L344.7 93.9 L342.8 92.4 L343.8 92.1 L346.7 92.9 L348.9 94.2ZM196.8 96.7 L195.3 97.1 L192.1 95.7 L192 94.6 L190.4 93.5 L190.5 92.6 L188.3 92 L188.4 90.3 L189 89.6 L191.2 90.3 L192.4 90.8 L194.5 91.1 L194.7 92.2 L195 93.6 L196.7 94.9 L196.8 96.7ZM363.9 89.9 L361.6 92.6 L363.5 91.5 L364.9 92.2 L363.8 93.3 L365.8 94.1 L367.1 93.4 L369.3 94.3 L368 96.6 L369.8 96.1 L369.7 97.8 L370 99.7 L368.4 102.5 L367.2 102.6 L365.7 102 L366.9 99.4 L362.8 101.8 L361.3 101.6 L363.4 100.2 L361.2 99.4 L358.5 99.6 L353.8 99.5 L353.6 98.6 L355.4 97.5 L354.6 96.6 L357.1 94.7 L361 89.8 L363 88 L365.4 86.9 L366.4 87.1 L365.7 87.9 L363.9 89.9ZM185.1 79.6 L187.5 79.3 L184.5 82.8 L185 85.3 L184 85.3 L183.5 83.8 L183.5 82.4 L183 81.5 L183.4 80.1 L184.2 79.2 L185.1 79.6ZM322.7 55.5 L321.1 57 L320.2 56.7 L320 55.9 L321.5 54.8 L322.4 54.9 L322.7 55.5ZM317.6 53.9 L314.2 55.5 L312.6 55.4 L312.6 54.6 L314.9 53.3 L317.9 53.3 L317.6 53.9ZM314.9 45.5 L314.6 46.7 L316 46.3 L316.8 47 L318.7 48 L320.8 48.9 L320.2 50.2 L322 50 L323.1 51 L320.6 51.9 L317.6 51.2 L317 49.9 L314 51.4 L310.1 52.9 L310.2 51.2 L307.1 51.5 L309.7 50.1 L311.3 47.9 L313.5 45.3 L314.9 45.5ZM337.2 41.3 L334.7 41.5 L334.9 40.1 L336.6 38.6 L338.8 38.2 L340.1 39 L339.5 40.1 L337.2 41.3ZM298.3 35.9 L296.4 36.9 L294.1 36.1 L292.2 36.4 L290.1 35.2 L292.6 34.3 L294.9 33.1 L296.6 33.9 L297.5 34.4 L298.3 35.9ZM309.8 34.9 L308 37.7 L312.2 35.5 L313.6 37.3 L311.7 39.3 L312.7 41.2 L316.1 39.2 L319 36.8 L321 33.8 L323.8 34.1 L326.7 34.5 L328.7 35.8 L328.1 37.2 L325.7 38.6 L326.3 40.1 L325.3 41.4 L320 43.4 L316.8 43.8 L315 43 L313.6 44.4 L310.1 46.7 L308.8 48 L305.2 49.9 L301.9 50.1 L299.5 51.3 L298.3 53.2 L295.5 53.5 L291.4 55.8 L287.1 59.1 L284.9 61.4 L282.9 64.8 L286 65.3 L285.6 68.1 L285.5 70.4 L289.1 69.8 L292.7 71.1 L294.5 72.2 L295.5 73.6 L298.1 74.5 L300 75.7 L303.8 75.9 L306.2 76.2 L304.7 78.8 L304.1 81.9 L304.5 85.3 L306.9 88.3 L309.2 87.3 L311.7 84.1 L312.4 79.3 L311.4 77.7 L315.7 76.2 L319.3 74.1 L321.4 72 L322.1 70 L321.6 67.5 L319.8 65.3 L323.9 62.2 L324.1 59.5 L325.5 55 L327.4 54.3 L330.8 55.1 L333 55.4 L335.2 54.6 L336.8 55.6 L338.9 57.3 L339.1 58.4 L343 58.6 L341.9 61.1 L341.1 64.8 L343.1 65.3 L344.1 67 L348 65.4 L351.4 62.1 L353.5 60.8 L354.2 63.4 L355.9 67.1 L357.2 70.7 L355.6 72.6 L358.2 74.3 L359.7 76 L363.3 76.8 L364.5 77.8 L364.7 80.4 L366.4 80.8 L367 81.9 L366.2 85.4 L364.2 86.5 L362.1 87.6 L357.9 88.7 L354.1 91.3 L349.8 91.8 L344.8 91.1 L341.2 91.1 L338.6 91.3 L335.9 93.5 L332.3 94.9 L327.5 99.1 L323.8 102 L326 101.4 L331.3 97.3 L337.2 94.7 L340.9 94.4 L342.7 95.9 L339.7 98 L339.6 101.4 L339.7 103.8 L342.5 105.4 L346.8 104.9 L350.2 101.4 L349.8 103.7 L351.1 104.8 L347.5 106.9 L341.5 108.8 L338.6 110 L335.2 112.3 L333.4 112.1 L334 109.4 L339 106.8 L335 106.9 L332.1 107.3 L331 105.5 L332.2 101.2 L331.4 100.3 L329.6 100.8 L329 100 L326.4 102.4 L324.9 104.8 L323.6 106.3 L322.4 106.7 L321.6 106.9 L321.1 107.7 L316.5 107.7 L312.7 107.7 L311.4 108.3 L308 110.6 L306.5 112.1 L304.1 112.1 L301.7 112.1 L300.4 112.6 L300.6 113.2 L300.5 114.2 L296.6 116.1 L293.8 116.6 L290.3 118.3 L289.7 118.3 L289 117.8 L289 117 L289.9 115.9 L291.7 114.1 L293 112.3 L293.4 109.5 L293.8 106.6 L291.7 105.1 L292 104.2 L291.3 104.2 L291.1 102.9 L290.5 103.3 L289.9 103.2 L289.7 102.5 L289.7 101.7 L288.2 100.7 L286.6 99.7 L284.6 98.4 L282.8 97.3 L280.2 98.2 L279.4 98.2 L276.7 97.4 L274.5 97.8 L272.6 96.8 L270.3 96.3 L268.6 96.2 L268.1 95.6 L268.4 93.9 L267.6 93.9 L267 95.1 L262 95.1 L253.6 95.1 L245.3 95.1 L237.9 95.1 L230.6 95.1 L223.4 95.1 L215.9 95.1 L213.5 95.1 L206.2 95.1 L199.3 95.1 L196 92.1 L195 90.7 L191.4 89.4 L191.7 86.7 L193.2 84.8 L191 83.5 L192.2 81 L190.8 78.8 L191.8 77.2 L194.1 75.8 L195.4 73.9 L192.8 72 L192.9 68.6 L193 66.4 L191.9 65.1 L191.3 63.9 L191.3 62.4 L188.3 63.3 L184.8 65 L184.3 63 L183.7 61.7 L182.2 60.9 L180 60.8 L194.5 44.5 L204.4 34.3 L207.6 35 L209.7 36.3 L211.6 36.5 L214.6 35.4 L217.9 34.5 L220.7 34.9 L225 33.7 L229.1 33 L229.5 34.1 L231.6 33.5 L233.2 32.2 L234.4 32.5 L235.8 34.9 L240.2 33.1 L238.6 35.2 L241.6 34.7 L243.1 33.9 L245.5 34.1 L247.7 35.2 L251.8 36.2 L254.4 36.7 L256.6 36.5 L258.3 37.9 L254.2 39.3 L257.6 39.8 L263.6 39.5 L265.8 39 L266.9 40.7 L270.2 39.3 L268.9 38.1 L271 37.2 L273.7 37.1 L275.6 36.8 L276.8 37.4 L277.8 38.9 L280.4 38.7 L283.3 40 L286.9 39.5 L290 39.6 L290.9 37.9 L293.1 37.4 L295.7 38.3 L294 40.9 L296.8 38.7 L298.5 38.8 L301.2 36.1 L300.1 34.4 L298.4 33.3 L300.7 30.3 L304.5 28.4 L306.9 28.8 L308.2 30 L309 33 L306.2 34.3 L309.8 34.9ZM268.3 25.2 L266.2 26.5 L271.4 25.7 L273.1 27 L276.6 25.6 L277.7 26.5 L277.3 29.1 L279.2 28 L279.9 25.3 L282.1 24.9 L283.7 25.3 L285.1 26.4 L284.4 29 L283.6 30.9 L286.1 32.2 L288.9 33.5 L287.8 34.7 L284.2 34.9 L284.8 35.9 L283.3 36.9 L279.8 36.5 L276.7 35.8 L274.2 35.9 L269.5 36.8 L263.8 37.3 L259.8 37.5 L259.7 36.2 L257.4 35.5 L255.3 35.8 L254.5 33.6 L256.2 33.3 L259.8 32.9 L262.6 33 L265.7 32.5 L262.2 31.9 L257.6 32.1 L254.7 32.1 L254.4 31.1 L260.2 30 L256.9 30 L254 29.3 L257.4 27.4 L259.8 26.3 L266.7 24.7 L268.3 25.2ZM288.6 24.4 L285.4 26.2 L283.7 24.3 L284.7 24 L287.5 23.9 L288.6 24.4ZM345 25.3 L344.8 26 L342.7 25.9 L340.5 25.9 L338.1 26.2 L336.2 24.7 L336.9 23.7 L338 23.6 L342.4 23.8 L345 25.3ZM324.4 25.1 L324.9 26.8 L328.2 24.7 L334 23.6 L335.8 26.3 L334.4 28 L338.9 27.2 L341.5 26.2 L345.2 27.5 L347.3 28.8 L347 30 L351.1 29.4 L352.4 31.1 L356.9 32.1 L358.1 33.2 L358.9 35.7 L354.4 37 L358.6 38.8 L361.7 39.4 L363.7 41.9 L367 42.1 L365.5 44.1 L360.3 47.4 L358.1 46.1 L355.9 43.5 L352.9 43.8 L351.9 45.4 L353.5 47 L355.9 48.3 L356.5 49.1 L356.8 51.9 L355.2 54 L352.7 53.2 L348.1 50.9 L350.2 53.4 L351.8 55.1 L351.7 56.1 L346.1 55 L342.1 53.3 L340 51.9 L341.2 51.1 L338.5 49.6 L336 48.3 L335.6 49.1 L329.1 49.5 L327.7 48.6 L330.2 46.5 L334.3 46.4 L339 46.1 L338.7 45.1 L340.2 43.7 L344.3 41 L344.3 39.7 L344 38.8 L341.4 37.5 L337.6 36.5 L339.3 35.8 L338 34.2 L336.3 34 L335.1 33.1 L333.6 33.9 L329.6 34.2 L322.3 33.6 L318.4 32.8 L315.3 32.4 L314.1 31.5 L317.1 30.3 L314.2 30.2 L315.3 27.6 L318.5 25.2 L321.3 24.1 L327 23.5 L324.4 25.1ZM297.8 23.3 L299.8 23.9 L303.6 23.6 L303.6 24.3 L300.7 25.6 L303 26.7 L300.9 29.1 L296.8 30.1 L294.9 29.9 L294.3 28.9 L290.7 26.8 L291.4 26 L295.3 26.3 L294.4 24.6 L297.8 23.3ZM310.2 26.1 L306.6 28.1 L304.3 28 L304.8 25.7 L305.8 24.4 L307.6 23.3 L310.2 22.6 L314.3 22.7 L317.7 23.3 L313 25.6 L310.2 26.1ZM251.4 29.8 L244.8 31.1 L244.7 29.9 L241.3 28.5 L243.2 27.4 L246.5 25.5 L249.9 23.8 L249.5 22.2 L256.6 21.8 L259 22.3 L264 22.5 L265.2 23.2 L266.4 24.3 L263.3 25 L256.6 26.8 L252.4 28.7 L251.4 29.8ZM313.6 20.4 L311.8 21.4 L309 21.2 L307.1 20.6 L309.1 19.4 L312.5 18.7 L313.5 19.6 L313.6 20.4ZM307.5 16.1 L308 17.2 L307 18.5 L304.6 20.4 L301.1 20.6 L299.3 20.2 L300.6 18.8 L297.2 19 L298.7 17 L300.8 17.1 L304.5 16.3 L307.1 16.4ZM287.3 17.4 L287.3 18.2 L289.4 17.8 L291.4 17.9 L290.6 19.2 L288.4 20.4 L281.3 20.8 L275.2 21.9 L272.1 21.9 L272.6 21.1 L277.8 20 L268.6 20.3 L266.2 19.8 L271.3 17.4 L273.9 16.7 L278.6 17.5 L280.7 19 L284 19.2 L283.4 16.8 L286 15.9 L287.8 16.2 L287.3 17.4ZM315.8 15.1 L317.3 15.9 L321.1 15.9 L322.1 16.7 L321 17.7 L322.8 18.2 L323.6 18.8 L326.2 18.9 L328.9 19.2 L332.5 18.6 L336.6 18.4 L339.7 18.6 L341.2 19.5 L340.9 20.6 L339.2 21.3 L335.9 21.8 L333.6 21.5 L327.5 21.9 L323.4 21.9 L320.4 21.6 L315.7 20.8 L316.1 19.4 L316.8 18.2 L315.7 17.1 L311.9 16.8 L310.3 16 L311.9 15 L315.8 15.1ZM275.3 13.8 L273.1 15.7 L270.7 16.5 L268.7 16.7 L264 17.7 L260.4 18.1 L258.3 17.6 L263.6 15.7 L269.3 14.1 L272.3 14.2 L275.3 13.8ZM318.3 14.1 L317.3 14.2 L313.8 14 L317.8 13.4 L318.8 13.8ZM287.1 13.7 L282.7 14.4 L280.7 13.6 L283.1 12.8 L286.1 12.6 L288.4 13 L287.1 13.7ZM290.3 11.5 L287.5 12 L284.3 12 L287.5 10.9 L288.4 11 L290.3 11.5ZM315.6 12.8 L312.3 13.3 L311.2 12.8 L311.3 11.9 L312 10.9 L314.4 11 L315.4 11.1 L316.9 12 L315.6 12.8ZM308.1 12.2 L307.9 13.2 L305 12.9 L302.6 12.1 L298.4 12 L300.9 11.3 L299.2 10.8 L300 9.9 L303.4 10.2 L307.7 11.1 L308.1 12.2ZM335.8 9.1 L337.4 9.8 L334.2 10.5 L329.1 12.3 L325.6 12.4 L321.9 12.1 L320.7 11.2 L321.5 10.3 L323.6 9.7 L320.1 9.7 L318.8 9 L318.7 7.9 L321.1 6.9 L323.1 6.3 L325.2 6.1 L329.3 5.5 L330.4 6.7 L333.1 7.1 L335.7 7.6 L335.8 9.1ZM376.9 1.7 L381.6 1.8 L385.2 2.1 L388.1 2.6 L387.5 3.2 L382.3 4.1 L377.5 4.5 L375.5 5 L379.5 5 L374.1 6.3 L370.6 6.9 L365.9 8.7 L361.8 9.1 L360.2 9.6 L354.3 9.8 L356.6 10.1 L355 10.5 L355.7 11.7 L353.3 12.5 L349.8 13.2 L348.2 14.1 L345 14.9 L348.3 15.3 L341.6 17.4 L337 16.7 L330.9 17.1 L328.3 16.8 L324.6 16.7 L325.3 15.5 L329.4 14.9 L329.8 13.2 L331.2 13 L335.5 14.1 L334.1 12.5 L331.4 12.1 L333.7 11.1 L337.6 10.6 L338.8 9.8 L336.9 8.9 L337.2 7.7 L342.3 7.8 L343.5 8.1 L347.2 7.2 L343.2 7 L336.6 7.1 L334 6.4 L333.4 5.5 L332 4.9 L332.4 4.1 L335.6 3.7 L337.8 3.7 L341.7 3.3 L345.3 2.6 L347.4 2.7 L348.7 3.3 L351.4 2.2 L354.1 1.9 L357.6 1.6 L363.2 1.6 L363.9 1.8 L369.4 1.4 L373.2 1.6 L376.9 1.7Z",268.0,70.6],["CHE","Suisse","M523.7 99.7 L523.5 101.1 L524.6 101.6 L525.9 101.7 L525.7 103 L524.7 103.6 L522.8 103.2 L522.3 104.4 L521.1 104.5 L519.3 105.1 L518.1 105.3 L517 104.6 L516.1 103.2 L515 103.7 L515 102.3 L516.7 100.5 L516.6 99.7 L517.8 100 L518.4 99.4 L520.5 99.5 L521 98.8 L523.7 99.7Z",520.1,102.1],["CHL","Chili","M335.6 421.5 L338 428.3 L340.6 428.3 L342 428.4 L341.7 429.6 L340 430.6 L338.8 430.5 L337.3 430.2 L335.3 429.3 L332.6 428.9 L329 427.2 L326 425.5 L321.4 422.1 L323.6 422.8 L327.7 424.8 L331.3 425.9 L332 424.5 L332 422.4 L333.8 421.1 L335.6 421.5ZM314.6 321.9 L316.2 326.3 L318.1 325.9 L318.5 326.7 L318.1 330.1 L315.3 331.7 L316.2 337.1 L315.8 338.1 L316.8 339.4 L315.2 341.4 L313.9 344.4 L313.5 347.4 L314.3 350.5 L313.2 353.8 L315.5 359.4 L316.3 360 L316.9 363 L316.1 366.1 L316.7 368.8 L315.2 370.9 L315.9 373.9 L317.4 377 L316.2 378.2 L316.2 381.1 L316.4 384.3 L317.9 388.3 L317 388.9 L318.6 392.6 L320.1 393.8 L319.6 395.1 L321 395.8 L321.6 397 L320.7 397.6 L321.5 399.4 L321.8 403.6 L321.4 406.3 L322.2 407.9 L322 409.9 L320.6 411.2 L321.9 414.5 L323.2 415.7 L324.7 415.5 L325.5 417.8 L327.1 419.6 L333 420 L335.4 420.5 L333.3 420.4 L332.4 421.2 L330.6 422.3 L331.3 425.2 L330.3 425.2 L327.2 424.2 L323.7 422.1 L320.1 420.4 L318.6 418.4 L318.7 416.6 L316.7 414.5 L314.5 409.2 L314.6 406.2 L316.4 403.8 L312.4 402.8 L313.8 400.1 L313.1 394.8 L316.2 395.9 L315.7 389.3 L313.7 388.5 L314.1 392.4 L312.4 392 L311.9 387.4 L311.2 381.5 L311.8 379.3 L310.3 376.2 L309.2 372.5 L310.2 372.4 L310.7 367.2 L311.4 362 L311.5 357.2 L310 352.4 L310.3 349.7 L309.3 345.7 L310.2 341.8 L309.7 335.5 L309.6 328.8 L309.5 321.6 L308.7 316.3 L307.6 311.7 L308.9 310.9 L309.5 309.2 L311 311.4 L311.6 313.8 L313.2 315.1 L312.7 318.3 L314.6 321.9Z",315.5,371.0],["CHN","Chine","M801.5 192.6 L799.4 194.1 L797 193.1 L796.5 190.3 L797.5 188.9 L800.4 188 L801.9 188 L802.8 189.3 L801.8 190.7 L801.5 192.6ZM811.1 92.8 L816 93.7 L820.2 96 L822.9 98.9 L826.6 98.9 L828 97.7 L831.6 96.8 L831.9 99.6 L831.7 100.7 L832.8 104.2 L832.8 107.3 L829.4 106.7 L827.9 107.8 L830 110.5 L831.5 114.3 L830.3 114.4 L831.1 116 L828.5 114.1 L828.4 115.9 L825.2 117.3 L826.4 119 L824.1 118.9 L822.4 117.9 L821.7 120.1 L819.7 121.8 L818.5 123.9 L815.3 124.8 L814.1 126.3 L811.7 127.2 L812.4 125.7 L811.4 124.5 L812.5 122.3 L810.4 120.6 L808.6 121.8 L806.7 124 L806 126.1 L803.5 126.2 L802.8 127.7 L805 129.9 L807.3 130.4 L808 131.9 L810.4 132.8 L812.4 130.5 L815.2 131.8 L816.9 131.9 L818 133.6 L814.7 134.5 L814.1 136.2 L812.2 137.8 L811.6 140.1 L815.1 141.8 L817.2 145 L819.8 148 L822.4 150.5 L823.2 152.9 L821.8 153.8 L822.9 155.5 L824.8 156.5 L825.2 159.1 L825.3 161.7 L823.9 162 L822.9 165.5 L821.8 169.7 L820.3 173.6 L817.2 176.6 L814.1 179.3 L811.1 179.7 L809.7 181.1 L808.6 180.1 L807.4 181.7 L803.9 183.3 L801.1 183.8 L800.9 187.2 L799.4 187.4 L798.2 185 L798.6 183.8 L794.8 182.8 L793.6 183.3 L790.7 182.4 L789.2 181.1 L789.2 179.3 L786.6 178.7 L785.1 177.5 L783.1 179.2 L780.6 179.6 L778.4 179.5 L777.1 180.3 L775.8 180.8 L776.8 184.5 L775.4 184.4 L775 183.7 L774.7 182.3 L772.9 183.3 L771.6 182.7 L769.3 181.5 L769.6 178.8 L767.8 178.1 L766.6 175.2 L763.8 175.7 L763.4 171.9 L765.4 169.2 L764.9 166.5 L764.3 164 L763 163.2 L761.6 161.3 L760.1 161.6 L757.1 161.1 L757.7 159.7 L756 157.7 L754.4 159.1 L752 158.3 L749.4 160.4 L747.5 162.8 L745.4 163.2 L744.1 162.3 L742.6 162.2 L740.6 161.5 L739.3 162.3 L738 164.7 L737.3 162.1 L735.8 162.8 L732.6 162.5 L729.4 161.8 L727 160.3 L724.8 159.7 L723.5 158.2 L722 157.7 L718.8 155.6 L716.5 154.6 L715.6 155.4 L711.4 153.1 L708.4 151 L706.9 147.5 L708.9 147.9 L708.6 146.3 L707.2 144.6 L706.8 142 L703.1 138.2 L698.5 136.9 L697.2 134.4 L694.9 132.9 L694.2 132 L693.4 130.1 L693.2 128.9 L691.4 128.2 L690.6 128.5 L689.3 125.5 L689.8 124.8 L689.2 124 L691.3 122.5 L692.9 121.9 L695.7 122.3 L696.1 120.3 L699.3 119.9 L699.8 118.6 L703.3 116.9 L703.5 116.2 L702.7 114.3 L704.2 113.5 L700.2 108 L704.7 106.7 L705.8 106 L705.6 100.4 L710.9 101.4 L711.7 100 L710.6 96.8 L712.6 96.5 L713.6 94.5 L714.5 94.2 L716 96.4 L718.7 98 L722.7 99.2 L725.4 101.7 L725.8 105.4 L727.2 106.8 L730.4 107.4 L733.9 107.8 L737.7 109.8 L739.4 110.1 L741.6 113.1 L743.8 115 L746.6 114.9 L752.1 115.6 L755.3 115.1 L758 115.6 L762.5 117.6 L765.5 117.6 L767 118.6 L769.3 116.8 L773 115.7 L776.7 115.6 L779.2 114.5 L780.3 112.8 L781.6 111.7 L780.7 110.7 L779.4 109.4 L779.8 107.4 L781.3 107.7 L784.2 108.3 L785.9 106.6 L789.1 105.4 L789.9 103.3 L791.2 102.4 L794.6 102 L796.8 102.4 L796.5 101.2 L793.1 99 L790.6 98 L789.3 99.2 L786.6 98.7 L785.4 99.1 L784.1 97.8 L784.2 94.7 L784.2 92.4 L787.7 93.5 L790.1 91.6 L789.3 90.2 L789.6 86.9 L790.4 85.9 L789.3 84.2 L787.6 83.5 L788.6 82 L791.3 81.4 L794.4 81.3 L798.5 82.2 L801.3 83.4 L804.7 86.5 L806.4 87.8 L808.4 89.7 L811.1 92.8Z",768.8,135.5],["CIV","Côte d’Ivoire","M492.1 236.6 L490.8 236.7 L488.9 236 L487.1 236.1 L483.8 236.6 L481.9 237.6 L479.1 238.7 L478.8 236 L479 234.3 L477.8 233 L477 232.8 L476.1 231.9 L476.8 230.5 L476.5 228.9 L476.6 228 L477.2 226.6 L477 225.9 L478.3 225.1 L477.6 222.5 L477 221.2 L477.2 220.1 L477.8 219.9 L478.9 220.1 L481.1 220.1 L481.6 219.1 L482.9 218.8 L483.3 220.2 L485.1 219.3 L486.3 220 L486.8 221.1 L488 221.8 L489 221 L490.3 220.9 L492.2 221.7 L492.9 226.3 L491.7 229 L491 232.6 L492.2 235.4 L492.1 236.6Z",484.5,228.4],["CMR","Cameroun","M536.3 245.4 L534.3 245.6 L532.6 245.2 L531.3 245.4 L526.8 245.3 L527.2 242.8 L526.1 240.7 L524.8 240.1 L524.3 238.7 L523.6 238.2 L523.6 237.3 L524.3 235.1 L525.6 232 L526.4 231.9 L528 230.1 L529.1 230 L530.7 231.3 L532.6 230.2 L532.8 228.9 L533.4 227.6 L533.8 226 L535.3 224.7 L535.8 222.4 L536.4 221.7 L536.8 220 L537.5 218 L539.8 215.5 L539.9 214.4 L539.1 212.5 L539.2 211.5 L540 211.3 L541.1 213.4 L541.3 215.5 L541.2 217.7 L542.8 220.6 L541.2 220.6 L540.4 220.8 L539.2 220.5 L538.6 222 L540.3 223.9 L541.5 224.4 L541.9 225.7 L542.8 228 L542.3 228.8 L541 232.1 L540.3 232.7 L540.1 235.2 L540.4 236.5 L540.2 237.5 L541.5 239.1 L541.7 240.3 L542.8 242 L544 243 L544.2 244.5 L544.5 245.4 L544.3 247.1 L542.1 246.4 L539.8 245.5 L536.3 245.4Z",535.0,234.5],["COD","Congo-Kinshasa","M585.6 241.4 L585.5 245.2 L586.6 245.6 L585.7 246.7 L584.6 247.6 L583.6 249.3 L583 250.8 L582.8 253.3 L582.2 254.6 L582.2 257 L581.4 257.9 L581.2 259.8 L580.6 261.8 L581.3 263.3 L581.4 267.1 L581.9 270.1 L581.6 271.8 L582.1 273.6 L583.7 275.4 L585.1 279.5 L584 279.2 L580.3 279.7 L579.6 280.1 L578.7 282.1 L579.3 283.6 L578.7 287.4 L578.3 290.6 L579 291.2 L580.9 292.4 L581.7 291.8 L581.8 295.3 L579.7 295.3 L578.6 293.5 L577.7 292.1 L575.6 291.7 L575 290 L573.3 291 L571.1 290.6 L570.2 289.1 L568.4 288.8 L567.1 288.9 L567 287.9 L566.1 287.8 L564.8 287.6 L563.1 288.1 L561.9 288 L561.2 288.3 L561.4 284.5 L560.5 283.3 L560.3 281.3 L560.8 279.4 L560.2 278.1 L560.2 276.1 L556.8 276.1 L557.1 275 L555.7 275 L555.5 275.6 L553.8 275.7 L553.1 277.6 L552.7 278.4 L551.1 277.9 L550.2 278.4 L548.4 278.6 L547.3 276.9 L546.7 275.9 L545.9 274 L545.3 271.6 L537.1 271.5 L536.1 271.9 L535.3 271.9 L534.2 272.3 L533.8 271.3 L534.5 270.9 L534.6 269.5 L535 268.7 L536.1 268 L536.8 268.4 L537.7 267.1 L539.3 267.2 L539.4 268.1 L540.5 268.7 L542.1 266.6 L543.7 265.1 L544.4 264 L544.4 261.4 L545.6 258.3 L546.8 256.6 L548.7 255.1 L549 254 L549.1 252.9 L549.5 251.7 L549.4 249.9 L549.7 247.1 L550.2 245.1 L551.1 243.4 L551.2 241.4 L551.5 239.2 L552.5 237.5 L554 236.5 L556.3 237.6 L558.1 238.8 L560.1 239.1 L562.2 239.7 L563 237.8 L564.7 237.9 L567.7 236.3 L568.8 236.9 L569.7 236.8 L570.1 236.1 L571.2 235.8 L573.3 236.1 L575 236.2 L575.9 235.9 L577.7 238.5 L578.9 238.9 L579.6 238.4 L580.9 238.6 L582.5 237.9 L583.1 239.3 L585.6 241.4Z",565.4,261.8],["COG","Congo-Brazzaville","M536.1 268 L535 266.9 L534.2 267.5 L533.1 268.9 L530.8 265.5 L532.9 263.7 L531.9 261.6 L532.8 260.8 L534.7 260.4 L534.9 258.9 L536.4 260.5 L538.9 260.6 L539.7 259.1 L540.1 257 L539.8 254.5 L538.5 252.6 L539.7 248.8 L539 248.2 L536.9 248.5 L536.1 246.8 L536.3 245.4 L539.8 245.5 L542.1 246.4 L544.3 247.1 L544.5 245.4 L545.9 242.4 L547.6 240.7 L549.4 241.2 L551.2 241.4 L551.1 243.4 L550.2 245.1 L549.7 247.1 L549.4 249.9 L549.5 251.7 L549.1 252.9 L549 254 L548.7 255.1 L546.8 256.6 L545.6 258.3 L544.4 261.4 L544.4 264 L543.7 265.1 L542.1 266.6 L540.5 268.7 L539.4 268.1 L539.3 267.2 L537.7 267.1 L536.8 268.4 L536.1 268Z",542.0,255.4],["COL","Colombie","M290.6 253.2 L289.4 252.4 L288.1 251.3 L287.3 251.9 L284.9 251.4 L284.3 250 L283.7 250.1 L281 248.2 L280.6 247.2 L281.6 247 L281.5 245.4 L282.2 244.2 L283.6 244 L284.8 242 L285.9 240.3 L284.9 239.5 L285.5 237.7 L284.9 234.7 L285.6 233.9 L285.2 231.2 L284.2 229.5 L284.6 227.9 L285.5 228.1 L286.1 227.2 L285.5 225.3 L287.3 224.9 L289.5 222.7 L290.7 222.3 L290.8 221.3 L291.4 218.5 L293.1 217 L294.9 217 L295.1 216.3 L297.3 216.6 L299.5 215 L300.7 214.2 L302.1 212.7 L303.1 212.9 L303.7 213.7 L303.1 214.8 L301.3 215.4 L300.5 217 L299.4 217.9 L298.5 219.1 L298 221.4 L297.2 223.3 L298.6 223.5 L298.9 225 L299.4 225.7 L299.6 227 L299.2 228.1 L299.3 228.8 L300.6 230.2 L304.1 229.9 L305.7 230.3 L307.6 233.1 L308.7 232.7 L310.7 232.9 L312.3 232.5 L313.3 233.1 L312.7 234.8 L312.1 235.9 L311.8 238.2 L312.3 240.3 L313.1 241.3 L313.1 242 L311.7 243.6 L312.7 244.3 L313.4 245.4 L314.2 248.7 L313.2 247.2 L312.4 246.1 L311.5 247.2 L306.1 247.2 L306.1 249.2 L307.7 249.5 L307.6 250.7 L305.5 250.9 L305.5 253.3 L306.7 254.4 L307.2 256.3 L307.1 257.7 L306 266.5 L304.6 264.8 L303.8 264.7 L305.5 261.4 L303.3 259.9 L301.7 260.2 L300.7 259.7 L299.2 260.5 L297.1 260.1 L295.4 256.7 L294.1 255.9 L293.2 254.4 L291.4 252.9 L290.6 253.2Z",297.3,240.1],["CRI","Costa Rica","M270.3 226.2 L268.8 225.5 L268.6 224.3 L268.6 223.6 L267.8 222.8 L266.8 222.2 L265.9 221.8 L265.8 220.8 L265.1 220.3 L265.2 221.2 L264.6 222 L264 221.1 L263.1 220.7 L262.9 219.1 L263.3 218.1 L262.6 217.6 L263.3 217 L265.5 217.5 L266.1 217 L267 217.3 L267.4 218 L268.2 218.2 L268.9 217.5 L269.5 219.3 L270.5 220.6 L271.7 221.9 L270.6 222.2 L270.5 223.5 L271.1 224 L270.7 224.9 L270.4 225.6Z",267.3,220.6],["CUB","Cuba","M277.2 178 L279.6 178.2 L281.7 178.3 L284.1 179.4 L285 180.5 L287.5 180.2 L288.4 180.9 L290.4 182.9 L291.9 184.4 L292.8 184.4 L294.3 185 L294 185.9 L296 186.1 L297.9 187.4 L297.5 188.1 L295.6 188.5 L293.8 188.7 L291.9 188.5 L288 188.8 L290 187 L289 186.1 L287.3 185.9 L286.5 185 L286.1 183.1 L284.6 183.3 L282.1 182.4 L281.4 181.7 L278 181.2 L277.1 180.6 L278.3 179.8 L275.6 179.6 L273.4 181.3 L272.3 181.3 L271.8 182.1 L270.4 182.5 L269.3 182.2 L270.8 181.2 L271.6 180 L273 179.3 L274.4 178.7 L276.5 178.4 L277.2 178Z",285.5,183.0],["-99","Northern Cyprus","M585.5 139.3 L586 138.5 L587.9 138.6 L590.2 137.6 L588.6 139 L588 139.7 L587.4 139.5 L586.7 139.2 L586 139.5Z",587.7,138.9],["CYP","Chypre","M588.8 139.6 L586.4 141.2 L585 140.7 L584.3 139.4 L585.5 139.3 L586.7 139.2 L587.4 139.5 L588 139.7 L588.8 139.6Z",586.4,140.1],["CZE","Tchéquie","M541.6 96.4 L540.4 95.8 L539.3 96 L537.3 95 L536.5 95.2 L535.2 96.5 L533.3 95.5 L531.8 94.2 L530.6 93.4 L530.2 92.1 L529.7 91.2 L531.5 90.5 L532.3 89.7 L534 89.1 L534.6 88.5 L535.3 88.9 L536.3 88.6 L537.5 89.6 L539.4 89.8 L539.3 90.7 L540.6 91.3 L540.9 90.5 L542.6 90.9 L542.9 91.9 L544.8 92 L546 93.6 L545.3 93.6 L544.4 94.3 L544.3 95 L543 95.7 L541.9 95.7 L541.6 96.4Z",537.4,92.7],["DEU","Allemagne","M523.4 76.7 L523.5 77.9 L525.9 78.6 L526 79.7 L528.3 79.1 L529.6 78.3 L532.4 79.5 L533.6 80.4 L534.2 82 L533.6 82.8 L534.6 83.9 L535.3 85.5 L535.2 86.6 L536.3 88.6 L535.3 88.9 L534.6 88.5 L534 89.1 L532.3 89.7 L531.5 90.5 L529.7 91.2 L530.2 92.1 L530.6 93.4 L531.8 94.2 L533.3 95.5 L532.5 96.9 L531.7 97.3 L532.1 99.4 L531.1 99.3 L529.9 99.2 L528.2 99.7 L526 99.6 L525.7 100.4 L524.4 99.6 L523.7 99.7 L521 98.8 L520.5 99.5 L518.4 99.4 L518.7 97.2 L519.8 95.1 L516.3 94.5 L515.1 93.7 L515.2 92.3 L514.7 91.6 L514.9 89.5 L514.4 86.3 L515.9 86.3 L516.4 85.1 L516.9 82.3 L516.4 81.3 L516.9 80.6 L518.9 80.5 L520.9 79.6 L520.3 78.5 L520.1 76.8 L521.9 77.2 L523.4 76.7Z",524.9,88.6],["DJI","Djibouti","M618.8 211.8 L619.5 212.8 L619.4 214.2 L617.9 214.9 L619.1 215.8 L618.2 217.5 L617.5 217 L616.9 217.2 L615.3 217.1 L615.3 216.2 L615 215.3 L615.9 213.8 L616.8 212.3 L618 212.6 L618.8 211.8Z",617.3,214.8],["DNK","Danemark","M529.8 74.8 L528.5 77.3 L526 75.5 L525.6 74.3 L528.9 73.3 L529.8 74.8ZM525.5 72.2 L525 73.4 L524.3 73.1 L522.7 75.2 L523.4 76.7 L521.9 77.2 L520.1 76.8 L519.1 75.1 L518.9 72 L519.2 71.2 L519.9 70.3 L521.9 70.1 L522.7 69.3 L524.5 68.4 L524.5 70 L523.9 71 L524.2 71.8 L525.5 72.2Z",521.8,73.0],["DOM","République dominicaine","M304.4 189.2 L306.9 188.7 L308.5 189.5 L309.2 189.4 L309.6 190.6 L311.1 190.5 L310.9 191.5 L312.1 191.6 L313.3 192.8 L312.1 194.1 L310.9 193.4 L309.6 193.5 L308.8 193.4 L308.2 194 L307.1 194.2 L306.8 193.4 L305.9 193.8 L304.5 196.1 L303.9 195.5 L303.8 194.6 L304 193.7 L303.4 192.8 L304.1 192.2 L304.5 191 L304.4 189.2Z",307.5,191.9],["DZA","Algérie","M532.5 177.1 L523.3 183.2 L515.5 189.6 L511.7 191 L508.6 191.3 L508.6 189.3 L507.3 188.8 L505.6 187.8 L505 186.3 L495.8 179.3 L486.7 172.2 L476.7 164.4 L476.8 163.5 L476.9 159.7 L481.2 157.3 L483.9 156.8 L486.1 156 L487.1 154.3 L490.2 153.1 L490.4 150.7 L491.9 150.4 L493.1 149.2 L496.5 148.6 L497 147.4 L496.3 146.7 L495.4 143.3 L495.3 141.3 L494.3 139.2 L496.8 137.5 L499.7 136.9 L501.3 135.6 L503.8 134.6 L508.2 134 L512.5 133.8 L513.8 134.2 L516.2 133 L519 132.9 L520.1 133.7 L521.9 133.5 L521.4 135.2 L521.9 138.2 L521.3 140.9 L519.7 142.7 L520 145.1 L522.2 147.1 L522.3 147.8 L523.9 149.2 L525.2 155 L526.1 157.8 L526.3 159.3 L525.9 162 L526.1 163.4 L525.8 165.2 L526.1 167.2 L525.1 168.6 L526.7 171 L526.8 172.3 L527.8 174.1 L529.1 173.6 L531.2 175.1 L532.5 177.1Z",506.9,162.0],["ECU","Équateur","M277.1 263.6 L278.5 261.2 L277.9 259.8 L276.8 261.3 L275.1 259.9 L275.7 259 L275.2 256.1 L276.2 255.6 L276.7 253.6 L277.7 251.5 L277.5 250.2 L279.1 249.5 L281 248.2 L283.7 250.1 L284.3 250 L284.9 251.4 L287.3 251.9 L288.1 251.3 L289.4 252.4 L290.6 253.2 L291 255.6 L290.2 257.7 L287.2 261.1 L283.9 262.3 L282.2 265.1 L281.8 267.3 L280.2 268.6 L279 267 L277.9 266.6 L276.8 266.9 L276.6 265.7 L277.4 265 L277.1 263.6Z",282.3,257.4],["EGY","Égypte","M593 157.6 L592.4 158.9 L592 161.3 L591.4 163 L590.8 163.6 L589.8 162.5 L588.5 161.1 L586.3 156.4 L587.4 160.1 L589.3 163.4 L591.7 168.4 L592.8 170.2 L593.8 172 L596.5 175.6 L596.2 178.3 L599.6 181.2 L600.1 181.8 L589.3 181.8 L578.8 181.8 L567.9 181.8 L567.3 169.9 L566.6 158.4 L565.7 155.8 L566.2 153.8 L565.7 152.4 L566.6 150.9 L570.1 150.8 L572.7 151.7 L575.4 152.6 L576.7 153.1 L578.6 152.1 L579.7 151.2 L582 150.9 L583.9 151.3 L584.7 152.9 L585.3 151.9 L587.5 152.6 L589.5 152.8 L590.8 152 L593 157.6Z",580.1,167.3],["ERI","Érythrée","M616.8 212.3 L615.8 211.3 L614.6 209.4 L613.3 208.4 L612.5 207.3 L610.1 206 L608.2 205.9 L607.5 205.3 L605.9 206 L604.2 204.6 L603.4 207 L600.2 206.3 L599.9 205 L600.8 200.3 L601 198.1 L601.8 197.1 L603.8 196.6 L605.1 194.8 L606.9 198.5 L607.8 201.5 L609.4 203 L613.3 206.1 L614.9 207.9 L616.5 209.8 L617.4 210.9 L618.8 211.8 L618 212.6 L616.8 212.3Z",606.3,203.1],["ESP","Espagne","M477 117.7 L477.2 115.4 L476.3 114 L479.9 111.7 L483 112.3 L486.4 112.2 L489 112.8 L491.1 112.6 L495.2 112.7 L496.2 114 L500.9 115.4 L501.8 114.7 L504.6 116.2 L507.6 115.8 L507.7 117.6 L505.3 119.7 L502.1 120.4 L501.8 121.5 L500.3 123.3 L499.3 125.9 L500.3 127.7 L498.8 129.2 L498.2 131.3 L496.3 131.9 L494.4 134.4 L491.1 134.4 L488.6 134.4 L487 135.5 L486 136.7 L484.7 136.5 L483.8 135.4 L483.1 133.5 L480.7 133 L480.5 131.9 L481.5 130.7 L481.8 129.9 L481 128.9 L481.7 126.8 L480.8 124.9 L481.9 124.6 L482 123.1 L482.5 120.1 L483.7 119.2 L483.1 117.6 L481.6 117.5 L479.6 117.9 L479 116.4 L478 116.8 L477 117.7Z",490.7,122.6],["EST","Estonie","M556.2 68.3 L556.2 66.5 L555.4 66.9 L553.8 65.8 L553.4 64.1 L556.2 63.3 L559 62.9 L561.6 63.4 L563.9 63.3 L563 65.5 L564.1 68.3 L563.2 69.2 L561.3 69.2 L559.2 68.1 L558.1 67.7 L556.2 68.3Z",559.3,65.8],["ETH","Éthiopie","M604.2 204.6 L605.9 206 L607.5 205.3 L608.2 205.9 L610.1 206 L612.5 207.3 L613.3 208.4 L614.6 209.4 L615.8 211.3 L616.8 212.3 L615.9 213.8 L615 215.3 L615.3 216.2 L615.3 217.1 L616.9 217.2 L617.5 217 L618.2 217.5 L617.6 218.7 L618.7 220.5 L619.8 222 L620.9 223.2 L630 227 L632.4 227 L624.8 236.6 L621.1 236.7 L618.7 239 L616.9 239.1 L616.2 240.1 L614.3 240.1 L613.2 239 L610.6 240.3 L609.8 241.7 L608 241.4 L607.4 241.1 L606.7 241.1 L605.8 241.1 L602.3 238.4 L600.4 238.4 L599.4 237.3 L599.4 235.5 L597.9 235 L596.2 231.5 L594.9 230.7 L594.4 229.5 L593 227.9 L591.3 227.7 L592.2 225.8 L593.7 225.7 L594 224.8 L593.9 221.9 L594.7 218.5 L595.9 217.6 L596.2 216.3 L597.3 213.8 L598.9 212.2 L599.9 209.1 L600.2 206.3 L603.4 207 L604.2 204.6Z",609.5,224.9],["FIN","Finlande","M560.3 36.1 L560.4 38 L564 39.8 L562.5 41.9 L565.6 45.1 L564.6 47.5 L567 49.6 L566.4 51.5 L570.1 53.4 L569.5 54.9 L567.8 56.6 L563.6 60.3 L559.5 60.5 L555.7 61.6 L552.1 62.2 L550.6 60.6 L548.2 59.6 L548.4 56.8 L546.9 54.2 L547.8 52.5 L549.5 50.7 L554.1 47.6 L555.5 47 L555 45.8 L551.8 44.5 L550.9 43.4 L550.2 39.2 L546.5 37.3 L543.5 36 L544.7 35.2 L547.3 36.7 L550 36.5 L552.4 37.2 L554.2 36 L554.8 34 L557.9 33.1 L560.8 34.2 L560.3 36.1Z",557.5,49.2],["FJI","Fidji","M988.5 308.5 L989.2 309.4 L988.4 311.1 L986.5 311.5 L985.1 311.1 L985.2 309.7 L986.6 308.6 L987.7 309 L988.5 308.5ZM991.7 306.7 L989.8 307.4 L989.7 306.2 L991.2 305.5 L992.1 305.4 L994 304.4 L993.6 305.9 L991.7 306.7ZM6.6 305.8 L6 304.4 L6.6 305.8Z",987.1,310.1],["FLK","Îles Malouines","M352.7 419.1 L355.1 417.2 L357.3 418 L358.4 416.8 L360.8 418.2 L360.3 419.2 L357.4 420.2 L356 419.1 L354.3 420.5 L352.7 419.1Z",356.9,418.7],["FRA","France","M524.3 116.8 L523.5 119.3 L522.3 118.6 L521.7 116.4 L522.1 115.3 L523.7 114 L524.3 116.8ZM508.7 90.8 L510.4 92.3 L511.7 92.1 L513.8 93.5 L514.4 93.7 L515.1 93.7 L516.3 94.5 L519.8 95.1 L518.7 97.2 L518.4 99.4 L517.8 100 L516.6 99.7 L516.7 100.5 L515 102.3 L515 103.7 L516.1 103.2 L517 104.6 L517 105.5 L517.7 106.7 L516.9 107.6 L517.6 110.1 L519 110.5 L518.7 111.9 L516.5 113.7 L511.5 112.8 L507.8 113.8 L507.6 115.8 L504.6 116.2 L501.8 114.7 L500.9 115.4 L496.2 114 L495.2 112.7 L496.5 110.8 L497 104.5 L494.5 101.2 L492.7 99.6 L488.9 98.4 L488.7 96.1 L491.9 95.4 L496 96.2 L495.3 92.7 L497.6 94 L503.3 91.6 L504 89.1 L506.1 88.4 L506.4 89.5 L507.6 89.6 L508.7 90.8Z",505.8,102.8],["GAB","Gabon","M530.8 265.5 L528 262.2 L526.1 259.6 L524.4 256.2 L524.5 255.2 L525.1 254.2 L525.8 251.8 L526.4 249.4 L527.3 249.2 L531.3 249.3 L531.3 245.4 L532.6 245.2 L534.3 245.6 L536 245.2 L536.1 246.8 L536.9 248.5 L539 248.2 L539.7 248.8 L538.5 252.6 L539.8 254.5 L540.1 257 L539.7 259.1 L538.9 260.6 L536.4 260.5 L534.9 258.9 L534.7 260.4 L532.8 260.8 L531.9 261.6 L532.9 263.7 L530.8 265.5Z",532.5,254.8],["GBR","Royaume-Uni","M486.6 78 L485.3 80.1 L483.5 79.5 L482 79.5 L482.6 77.9 L482.2 76.2 L484.1 76.1 L486.6 78ZM493.1 65.8 L490.6 69 L492.9 68.6 L495.5 68.6 L494.8 71 L492.7 73.7 L495.1 73.9 L497.4 77.8 L499 78.3 L500.4 81.7 L501.1 83 L504 83.5 L503.7 85.5 L502.5 86.4 L503.5 88 L501.3 89.6 L498.1 89.6 L494 90.5 L492.8 89.8 L491.2 91.3 L489 90.9 L487.2 92.1 L486 91.5 L489.6 88.3 L491.8 87.6 L488 87.1 L487.3 85.8 L489.9 84.9 L488.6 83.2 L489.1 81.2 L492.6 81.5 L493 79.7 L491.5 77.9 L488.6 77.3 L488 76.5 L488.9 75.1 L488.2 74.3 L486.9 75.7 L486.8 72.8 L485.7 71.3 L486.6 68.2 L488.5 65.8 L490.3 66 L493.1 65.8Z",493.8,80.3],["GEO","Géorgie","M605.7 118.8 L605.9 117.4 L604.9 115.2 L603.3 114 L601.8 113.7 L600.8 112.7 L603.2 112.9 L607 113.4 L610.7 114.9 L612.7 115 L615.2 115.7 L616.2 117 L617.9 117.7 L617.3 118.2 L618.9 119.9 L617.2 120.1 L615.1 119.2 L611.1 120.2 L608.4 118.6 L605.7 118.8Z",610.3,116.8],["GHA","Ghana","M502.9 233.6 L498.6 235.5 L497 236.6 L494.5 237.5 L492.1 236.6 L492.2 235.4 L491 232.6 L491.7 229 L492.9 226.3 L492.2 221.7 L491.8 219.3 L491.9 217.4 L496.7 217.3 L497.9 217.5 L498.8 217 L500.1 217.3 L499.9 218.3 L501 219.9 L501 222.3 L501.3 224.8 L502 226 L501.4 228.9 L501.6 230.5 L502.3 232.5 L502.9 233.6Z",496.6,227.2],["GIN","Guinée","M476.6 228 L475.8 227.9 L475.3 229.2 L474.5 229.2 L473.9 228.5 L474.1 227.2 L473 225.2 L472.3 225.6 L471.7 225.7 L470.9 225.8 L471 224.7 L470.5 223.8 L470.6 222.9 L470 221.5 L469.3 220.4 L467.1 220.4 L466.4 221 L465.6 221.1 L465.2 221.8 L464.8 222.6 L463.3 224.1 L462.1 222.2 L461.1 220.9 L460.4 220.5 L459.7 219.8 L459.4 218.4 L459 217.7 L458.2 217.2 L459.5 215.6 L460.3 215.7 L461 215.1 L461.6 215.1 L461.9 213.6 L462.2 212.2 L463.6 212.2 L465.5 213 L466.1 213 L467.8 212.8 L468.4 213.8 L469.6 213.4 L470.8 214.3 L471.9 214.6 L472.7 213.9 L473.6 213.5 L474.3 213 L475.4 213.8 L475.8 214.7 L476.9 216 L476.3 216.9 L476.2 217.9 L476.8 217.6 L477 218.9 L477.8 219.9 L477.2 220.1 L477 221.2 L477.6 222.5 L478.3 225.1 L477.3 225.5 L477.2 226.6 L477.1 228Z",469.4,219.1],["GMB","Gambie","M453.6 210.4 L454 209 L457 208.9 L457.6 208.1 L458.5 208 L459.6 208.8 L460.4 208.9 L461.3 208.3 L461.9 209.2 L460.7 210 L459.5 209.9 L458.3 209.2 L457.3 210 L456.1 210.5 L453.6 210.4Z",457.5,209.3],["GNB","Guinée-Bissau","M458.2 217.2 L456.8 215.8 L455.6 215.6 L455 214.7 L454.2 213.5 L455.5 212.3 L456.4 212.4 L457.1 212.1 L462.2 212.2 L462.2 213.3 L462.1 214.7 L461 215.1 L460.3 215.7 L459.5 215.6 L458.2 217.2Z",458.3,214.0],["GNQ","Guinée équatoriale","M526.4 249.4 L525.8 248.9 L526.8 245.3 L531.3 245.4 L531.3 249.3 L527.3 249.2 L526.4 249.4Z",528.8,247.4],["GRC","Grèce","M561.8 137.5 L563.3 138.6 L565.3 138.4 L567.3 138.6 L568.7 138.8 L568.4 139.8 L564.7 140 L561.4 138.9 L561.8 137.5ZM567.7 118.7 L567.1 120.7 L566.5 121 L565 120.9 L563.6 120.6 L560.6 121.5 L562.5 123.3 L561.3 123.8 L559.8 123.8 L558.3 122.1 L557.9 122.9 L558.6 124.8 L560 126.3 L559.1 127 L560.7 128.5 L562 129.4 L562.2 131.2 L559.8 130.4 L560.6 132 L559 132.3 L560.2 135.2 L558.5 135.2 L556.3 133.8 L555.1 131.2 L554.5 129.1 L553.4 127.6 L552 125.8 L551.7 124.9 L552.8 123.3 L552.9 122.3 L553.7 121.8 L553.7 121 L555.3 120.7 L556.2 120 L557.6 120.1 L558.5 119.4 L560.4 119.5 L562.3 118.6 L564.2 119.7 L566.5 119.4 L566.4 117.8 L567.7 118.7Z",558.0,125.8],["GRL","Groenland","M415.4 2.6 L422.2 1.5 L428.4 1.5 L431.1 0.8 L437.5 0.7 L451.6 0.9 L462.3 2.4 L458.7 3.2 L451.8 3.3 L441.9 3.5 L442.6 3.9 L449.2 3.7 L454.5 4.4 L458.2 3.7 L459.5 4.5 L457.1 5.7 L462.1 4.9 L471.1 4.1 L476.6 4.5 L477.5 5.4 L469.6 7 L468.5 7.5 L462.4 7.9 L466.7 8 L464.2 9.7 L462.4 11.2 L462 13.8 L464 15.4 L460.9 15.5 L457.6 16.3 L461 17.6 L461.1 19.8 L458.9 20 L461.1 22.2 L456.7 22.4 L458.8 23.4 L458 24.3 L455.1 24.7 L452.3 24.7 L454.5 26.5 L454.3 27.7 L450.5 26.6 L449.3 27.3 L451.9 28 L454.4 29.6 L454.8 31.7 L451 32.3 L449.6 31.2 L447.3 29.7 L447.7 31.5 L445 32.9 L450.5 33 L453.3 33.2 L447.3 35.5 L441.2 37.7 L434.8 38.6 L432.4 38.7 L430 39.7 L426.3 42.6 L421.2 44.6 L419.7 44.7 L416.6 45.4 L413.3 46.1 L411 47.8 L410.4 49.8 L408.8 51.7 L404.6 54 L404.9 56.2 L403.3 58.6 L401.4 61.5 L398.1 61.6 L395.4 59.2 L390.9 59.2 L389.2 57.6 L388.6 54.8 L385.9 51.2 L385.4 49.4 L385.9 46.9 L383.8 44.3 L385.3 42.2 L384.2 41.2 L387.5 38 L391.1 37 L392.3 35.8 L393.5 33.7 L390.8 34.7 L389.5 35.1 L387.5 35.5 L385.2 34.6 L385.8 32.7 L387.2 31.3 L389.1 31.3 L393.1 32 L390.2 30.3 L388.7 29.4 L386.5 29.8 L385 29.1 L388.4 26.6 L387.5 25.7 L386.7 23.9 L385.5 21.1 L383.5 20.1 L384 19.1 L379.5 17.6 L375.4 17.4 L370.1 17.5 L365.2 17.7 L363.4 16.9 L360.9 15.4 L366.5 14.6 L370.5 14.5 L362.6 13.8 L358.9 12.8 L359.8 11.9 L367.9 10.8 L375.6 9.7 L376.9 8.8 L372.4 8 L374.7 7.1 L382.3 5.6 L385.2 5.4 L385.1 4.4 L389.9 3.9 L395.8 3.5 L401.4 3.5 L402.9 4.2 L408.5 3 L412.4 3.8 L414.8 4 L418.2 4.6 L414.6 3.5 L415.4 2.6Z",416.5,23.6],["GTM","Guatemala","M251.9 208.5 L250.6 207.9 L248.9 207.9 L247.7 207.2 L246.3 205.9 L246.5 205 L246.9 204.2 L248.2 201 L251.7 201 L251.9 199.9 L251.3 199 L250.4 198.2 L249.5 197.2 L250.7 197.2 L251 195.3 L253.5 195.3 L256 195.4 L255.7 197.9 L255.1 201.6 L255.9 201.6 L256.7 202.2 L257.8 202.1 L256.4 203.3 L255 204.2 L254.7 204.8 L254.9 205.5 L254.2 206.3 L253.5 206.5 L253.1 207.2 L252.1 208Z",251.9,202.2],["GUF","Guyane française","M354.1 244.6 L353 245.9 L351.6 246.1 L351.3 245.2 L350.7 245 L349.8 245.9 L348.6 245.2 L349.3 243.9 L349.6 242.4 L350.1 241 L349 239.1 L348.8 236.9 L350.3 234.2 L351.3 234.5 L353.3 235.3 L356.2 238 L356.6 239.3 L354.9 242.3 L354.1 244.6Z",352.2,240.1],["GUY","Guyana","M334.5 225.8 L336.3 227 L338 229.1 L338 230.7 L339 230.8 L340.5 232.4 L341.5 233.5 L341 236.4 L339.3 237.2 L339.4 238 L338.9 239.6 L340.1 242 L341 242 L341.3 243.8 L343 246.6 L342.3 246.7 L340.8 246.4 L339.9 247.3 L338.6 247.8 L337.7 248 L336 248.4 L334.3 246.9 L334.2 245.4 L333.5 243.8 L333.9 241.1 L334.7 240 L334.1 238.5 L333.2 238 L333.6 236.6 L333 235.8 L331.5 236 L329.7 233.5 L330.5 232.6 L330.5 231.2 L332.2 230.6 L332.9 230 L332 228.8 L332.3 227.7 L334.5 225.8Z",336.4,237.3],["HND","Honduras","M259.4 210.9 L259 209.9 L258.2 209.6 L258.5 208.3 L257.6 207.8 L256.3 208.1 L255.5 207.2 L254.2 206.3 L254.9 205.5 L254.7 204.8 L255 204.2 L256.4 203.3 L257.8 202.1 L258.7 201.6 L259.5 201.6 L260.1 201.7 L261.4 202 L262.7 201.9 L263.6 201.5 L264.8 201.4 L266.2 201.5 L268 201.7 L269.2 202.3 L269.9 203.1 L270.8 203.6 L271.5 204.4 L270.5 204.4 L269.1 205.2 L268.4 205.2 L267.7 205.6 L266.8 205 L266.1 205.9 L264.6 207.4 L263.8 208.2 L263 207.5 L262.4 208.4 L261.1 208.4 L261 210 L260.2 210.8 L259.4 210.9Z",261.9,205.0],["HRV","Croatie","M546.9 104.8 L547.6 106.1 L548.5 107 L547.6 108.2 L546.4 107.5 L544.7 107.5 L542.5 107 L541.3 107 L540.8 107.7 L539.9 107 L539.4 108.3 L540.8 109.8 L541.4 110.8 L542.6 111.9 L543.6 112.7 L544.7 114 L547 115.2 L544.3 114.6 L542.7 113.4 L540.4 112.5 L538.1 110.1 L537.4 108.5 L537.3 107.5 L535.6 107 L534.9 108.3 L534.1 107.3 L534.1 106.2 L536 106.2 L537.3 106.2 L538.3 106.3 L538.2 105.4 L539 105.1 L539.2 103.8 L541.1 103 L541.9 103.3 L543.9 104.7 L546 105.3 L546.9 104.8Z",541.4,107.7],["HTI","Haïti","M300.5 188.6 L302.1 188.7 L304.4 189.2 L304.5 191 L304.1 192.2 L303.4 192.8 L304 193.7 L303.8 194.6 L302.1 194.1 L300.8 194.3 L299.1 194.1 L297.8 194.7 L296.4 193.6 L296.8 192.6 L299.2 193.1 L301.3 193.3 L302.3 192.6 L301.2 191.2 L301.4 190 L299.7 189.5 L300.5 188.6Z",301.5,191.8],["HUN","Hongrie","M540.1 101.9 L540.8 99.8 L541.7 99.1 L541.8 97.9 L543.1 98.7 L544 99 L546.1 98.6 L547.2 97.9 L548.3 97.4 L549.7 97.2 L550.2 96.5 L551 96.3 L553.8 97.2 L555.7 97.8 L556 98.6 L554.5 99.3 L553.5 101.4 L552.2 103.6 L550.3 104.1 L548.7 104 L546.9 104.8 L546 105.3 L543.9 104.7 L541.9 103.3 L541.1 103 L540.6 101.9Z",547.9,100.8],["IDN","Indonésie","M833.7 285.6 L832.5 285.7 L829.1 283.4 L831.7 282.8 L833.1 283.8 L833.9 284.7 L833.7 285.6ZM844 285.3 L841.6 286 L841.6 284.5 L843 282.5 L845.9 281.3 L846 282.9 L844 285.3ZM826.5 278.7 L827.4 279.6 L829.2 279.3 L829.7 280.7 L826.5 281.3 L824.5 281.7 L823.1 281.7 L824.2 279.9 L825.7 279.8 L826.5 278.7ZM840.4 278.7 L839.8 280.5 L835.6 281.4 L831.9 281 L832 279.8 L834.3 279.2 L835.9 280.1 L837.8 279.9 L840.4 278.7ZM801.1 274.5 L806.4 274.8 L807.1 273.5 L812.1 275 L813 277.1 L817.1 277.7 L820.4 279.6 L817.1 280.8 L814.2 279.5 L811.7 279.6 L808.8 279.4 L806.2 278.8 L803.1 277.6 L801.1 277.2 L799.9 277.6 L795 276.3 L794.6 274.9 L792 274.7 L794.1 271.6 L797.5 271.8 L799.6 273.1 L800.8 273.3 L801.1 274.5ZM873.6 272.7 L872 274.8 L871.9 272.4 L872.5 271.3 L873.1 270.2 L873.7 271.1 L873.6 272.7ZM853.3 263.8 L852.2 264.9 L850.3 264.3 L849.8 262.9 L852.6 262.7 L853.3 263.8ZM862.3 262.6 L863.2 265.1 L860.9 263.8 L858.6 263.5 L857 263.7 L855.1 263.6 L855.8 261.8 L859.2 261.7 L862.3 262.6ZM872.6 256.4 L873.3 261.6 L876.1 263.5 L878.5 260.1 L881.7 258.2 L884.2 258.1 L886.5 259.3 L888.6 260.4 L891.5 261 L891.1 271.5 L890.3 282 L888 279.3 L885.3 278.7 L884.5 279.6 L881 279.7 L882.4 277.1 L884.2 276.2 L883.8 272.7 L882.6 270 L877.4 267.3 L875.1 267 L871.1 264.1 L870.2 265.6 L869.1 265.9 L868.5 264.7 L868.6 263.3 L866.5 261.7 L869.5 260.6 L871.5 260.6 L871.3 259.8 L867.2 259.8 L866.2 257.9 L863.7 257.3 L862.5 255.7 L866.3 254.9 L867.7 253.9 L872.2 255.2 L872.6 256.4ZM847.9 248.1 L845.7 251.3 L843.6 251.9 L840.9 251.3 L836.3 251.5 L833.8 251.9 L833.4 254.3 L835.9 257.2 L837.4 255.7 L842.6 254.7 L842.4 256.1 L841.2 255.7 L839.9 257.6 L837.5 258.8 L840 262.9 L839.4 264 L841.8 267.7 L841.7 269.8 L840.1 270.8 L839.1 269.7 L840.6 267 L837.8 268.3 L837.1 267.4 L837.6 266.1 L835.6 264.3 L835.9 261.1 L834 262.1 L834.2 265.8 L834.1 270.4 L832.3 270.9 L831.1 270 L832.1 267 L831.8 263.9 L830.6 263.9 L829.8 261.7 L831 259.6 L831.4 257 L832.8 252.2 L833.4 250.9 L835.8 248.5 L837.9 249.4 L841.5 249.9 L844.6 249.7 L847.4 247.4 L847.9 248.1ZM857.4 249 L857.3 251.8 L855.9 251.5 L855.5 253.5 L856.6 255.2 L855.8 255.6 L854.7 253.5 L853.9 249.4 L854.4 246.9 L855.3 245.7 L855.5 247.4 L857.2 247.7 L857.4 249ZM827.4 246.8 L830.5 249.8 L827.2 250.2 L826.3 252.3 L826.4 255.3 L823.7 257.5 L823.6 260.7 L822.4 265.6 L822 264.4 L818.8 265.9 L817.8 263.9 L815.8 263.7 L814.5 262.7 L811.1 263.9 L810.2 262.3 L808.3 262.5 L806.1 262.1 L805.7 257.8 L804.3 256.9 L803 254.2 L802.6 251.3 L802.9 248.4 L804.6 246.2 L805.1 248.4 L807 250.2 L808.8 249.5 L810.5 249.8 L812.1 248.1 L813.5 247.9 L816.1 248.8 L818.4 248.1 L819.7 243.6 L820.7 242.5 L821.6 238.8 L824.8 238.8 L827.2 239.4 L825.7 242.3 L827.8 245.3 L827.4 246.8ZM793.5 271.5 L790.4 271.6 L788.2 268.9 L784.7 266.2 L783.6 264.3 L781.6 261.7 L780.2 259.3 L778.2 254.8 L775.7 252.1 L774.9 249.3 L773.9 246.8 L771.3 244.8 L769.8 242 L767.7 240.2 L764.6 236.7 L764.3 235.1 L766.1 235.2 L770.4 235.8 L773 239 L775.2 241.1 L776.8 242.5 L779.5 245.9 L782.3 246 L784.7 248.2 L786.3 250.9 L788.4 252.3 L787.3 255 L788.9 256.1 L789.9 256.2 L790.3 258.4 L791.3 260.2 L793.3 260.5 L794.6 262.5 L793.8 266.5 L793.5 271.5Z",816.7,253.5],["IND","Inde","M703.1 138.2 L706.8 142 L707.2 144.6 L708.6 146.3 L708.9 147.9 L706.9 147.5 L708.4 151 L711.4 153.1 L715.6 155.4 L714.2 156.8 L713.7 159.9 L716.5 161.1 L719.4 162.7 L723.2 164.5 L727 164.9 L728.8 166.6 L731 166.9 L734.3 167.6 L736.6 167.6 L736.6 166.3 L735.9 164.2 L735.8 162.8 L737.3 162.1 L738 164.7 L738.2 165.3 L740.9 166.6 L742.5 166.1 L744.8 166.3 L747 166.2 L746.7 164.2 L745.4 163.2 L747.5 162.8 L749.4 160.4 L752 158.3 L754.4 159.1 L756 157.7 L757.7 159.7 L757.1 161.1 L760.1 161.6 L760.6 162.8 L759.8 163.4 L760.5 165.4 L758.4 164.8 L755.4 167 L755.9 168.9 L754.9 171.6 L755.1 173.2 L754.4 175.9 L752.2 175.1 L752.7 178.5 L752.2 179.6 L752.8 180.9 L751.6 181.7 L749.2 176.6 L748.5 176.6 L748.4 178.7 L746.6 177 L747.2 175.1 L748.3 174.9 L749.1 172.2 L747.4 171.7 L744.9 171.7 L742.3 171.3 L741.6 169 L740.3 168.9 L737.9 167.5 L737.4 169.7 L739.6 171.4 L738.2 172.6 L737.8 173.7 L739.6 174.6 L739.5 176.6 L740.8 179 L741.7 181.7 L741.5 182.8 L739.6 182.8 L736.4 183.5 L736.9 185.9 L735.7 187.8 L732.1 190 L729.5 193.8 L727.7 195.8 L725.2 197.9 L725.4 199.4 L724.1 200.2 L721.8 201.4 L720.5 201.5 L719.9 204 L720.9 208.2 L721.3 210.9 L720.3 213.9 L720.7 219.4 L719.3 219.5 L718.2 222 L719.1 223.1 L716.6 224 L715.8 226.2 L714.8 227.1 L712 224.1 L710.4 219.6 L709.2 216.3 L708.1 214.8 L706.4 211.7 L705.4 207.7 L704.7 205.7 L701.8 201.2 L700.1 195 L698.8 190.9 L698.3 186.9 L697.4 183.9 L693.7 185.9 L691.8 185.5 L687.7 181.5 L688.9 180.4 L687.9 179.1 L684.4 176.4 L685.9 174.2 L691.8 174.2 L690.9 171.4 L689.1 169.8 L688.5 167.3 L686.5 165.9 L688.9 162.5 L692 162.7 L694.2 159.3 L695.3 156 L697.3 152.8 L696.8 150.5 L698.7 148.6 L696.2 147 L694.8 144.8 L693.3 142 L694.3 140.6 L698.4 141.4 L701.2 140.9 L703.1 138.2Z",715.3,179.0],["IRL","Irlande","M485.3 80.1 L485.6 82.3 L483.7 85 L479.4 86.8 L476 86.4 L478.1 83.2 L477 80 L480.3 77.7 L482.2 76.2 L482.6 77.9 L482 79.5 L483.5 79.5 L485.3 80.1Z",480.9,82.2],["IRN","Iran","M639.8 132.7 L642 132.1 L643.5 130.2 L645.2 130.3 L646.2 129.7 L648.1 130 L651.3 131.6 L653.4 132 L657 134.9 L658.9 135 L659.7 137.7 L659.3 141.7 L659 144.1 L660.2 144.5 L659.4 146.3 L660.7 148.9 L661.3 150.9 L663.4 151.5 L663.9 153.6 L662 156.5 L663.5 158.2 L664.9 160.2 L667.7 161.6 L668.1 164.4 L669.5 165 L669.9 166.5 L666.3 168.1 L665.8 171.9 L660.6 170.9 L657.5 170.2 L654.5 169.7 L652.8 165.8 L651.5 165.2 L649.5 165.8 L647 167.3 L643.5 166.3 L640.5 163.8 L637.9 162.9 L635.7 159.8 L633.2 155.5 L631.8 156 L630 154.9 L629.2 156.2 L627.5 154.5 L627.3 152.8 L626.4 152.8 L626.5 150.4 L624.9 148 L621.4 146.2 L619.2 143.1 L619.5 140.6 L620.6 139.5 L620.2 137.6 L618.3 136.6 L616.1 132.8 L614.3 130.2 L614.7 129.2 L613.3 125.5 L614.9 124.6 L615.5 125.8 L617 127.3 L618.9 127.7 L619.8 127.6 L622.4 125.3 L623.4 125 L624.3 126 L623.7 127.6 L625.5 129.2 L626.2 129.1 L627.4 131.5 L629.9 132.1 L632 133.7 L635.8 134.3 L639.7 133.4 L639.8 132.7Z",643.2,148.0],["IRQ","Irak","M618.3 136.6 L620.2 137.6 L620.6 139.5 L619.5 140.6 L619.2 143.1 L621.4 146.2 L624.9 148 L626.5 150.4 L626.4 152.8 L627.3 152.8 L627.5 154.5 L629.2 156.2 L627.6 156 L625.8 155.8 L624.2 158.9 L619.2 158.6 L611 152.1 L606.8 149.8 L603.5 149 L602 145 L607.4 141.7 L607.9 137.8 L607.4 135.4 L608.7 134.6 L609.8 132.6 L610.8 132.1 L613.9 132.5 L614.9 133.3 L616.1 132.8 L618.3 136.6Z",615.2,146.2],["ISL","Islande","M468.7 43.3 L468 45.1 L470.3 47 L467.2 49.2 L460.7 51.1 L458.7 51.6 L455.9 51.2 L449.8 50.3 L452.2 49 L447.6 47.7 L451.5 47.1 L451.6 46.3 L447.1 45.6 L448.9 43.8 L452.2 43.4 L455.3 45.3 L458.8 43.8 L461.4 44.6 L465.1 43.1 L468.7 43.3Z",459.0,47.2],["ISR","Israël","M594.2 147.2 L593.8 148.2 L592.8 147.8 L592.5 149.9 L593.1 150.3 L592.5 150.7 L592.5 151.6 L593.7 151.1 L593.9 152.4 L593 157.6 L590.8 152 L591.4 150.9 L591.8 149.2 L592.1 146.8 L592.4 146 L593.4 146 L594.2 145.4 L594.4 146.7Z",592.6,151.2],["ITA","Italie","M540.1 129.4 L539.3 131.9 L539.7 132.9 L539.2 134.6 L537.2 133.3 L535.9 133 L532.2 131.4 L532.5 129.7 L535.5 130 L538.1 129.6 L540.1 129.4ZM523.5 119.8 L525.1 122.1 L524.9 126.3 L523.7 126.1 L522.7 127.2 L521.7 126.3 L521.5 122.5 L520.8 120.6 L522.2 120.8 L523.5 119.8ZM530.7 102.1 L534.3 102.9 L534.1 104.5 L534.8 105.8 L532.8 105.4 L530.8 106.5 L531 108.1 L530.7 109 L531.6 110.6 L534.1 112.2 L535.5 114.8 L538.5 117.4 L540.4 117.4 L541.1 118.1 L540.4 118.7 L542.8 119.9 L544.7 120.9 L547 122.5 L546.9 124.3 L545.4 122.8 L543.1 122.3 L542.2 124.3 L544.1 125.5 L543.9 127.2 L542.8 127.4 L541.6 130.2 L540.5 130.4 L540.5 129.4 L540.9 127.7 L541.5 127 L540.4 125.1 L539.5 123.5 L538.4 123.1 L537.6 121.7 L535.9 121.2 L534.7 119.9 L532.8 119.7 L530.8 118.2 L528.4 116.1 L526.6 114.3 L525.7 111.1 L524.4 110.8 L522.3 109.7 L521.2 110.2 L519.8 111.6 L518.7 111.9 L519 110.5 L517.6 110.1 L516.9 107.6 L517.7 106.7 L517 105.5 L517 104.6 L518.1 105.3 L519.3 105.1 L520.7 104 L522.3 104.4 L522.8 103.2 L524.7 103.6 L525.7 103 L525.9 101.7 L527.4 102.2 L527.7 101.6 L530.1 101 L530.7 102.1Z",530.9,112.7],["JAM","Jamaïque","M288 193.2 L289.8 193.5 L291.1 194.2 L291.5 195.1 L289.6 195.2 L288.7 195.7 L287.2 195.2 L285.8 194 L286.2 193.3 L287.4 193.1 L288 193.2Z",288.5,194.3],["JOR","Jordanie","M593.8 148.2 L594.2 147.2 L597.2 148.5 L602 145 L603.5 149 L597.9 151.1 L600.9 154.3 L600.1 154.9 L599.7 155.9 L597.7 156.4 L597.2 157.6 L596.1 158.6 L593.1 158 L593.9 152.4 L593.7 151.1 L594 150.2 L593.8 148.2Z",597.4,151.9],["JPN","Japon","M853.1 142.5 L853.9 143.6 L853.2 145.6 L851.7 144.6 L850.6 145.3 L850.6 147.2 L848.6 146.3 L848 144.7 L848.7 142.8 L850.4 143.2 L850.9 141.8 L853.1 142.5ZM865.6 132.9 L865.7 135.4 L866.9 137.1 L866.5 139.3 L863.8 140.9 L859.3 141.1 L857 144.7 L854.8 143.5 L853.7 141.1 L849.4 141.8 L846.9 143.3 L843.9 143.4 L847.4 145.8 L847.6 151.3 L846.4 152.6 L844.7 151.4 L844.3 148.4 L842.3 147.5 L840.4 145.3 L842.5 144.3 L843.2 142.3 L845.1 140.6 L846.2 138.4 L851 137.4 L854 138.1 L854.3 132.3 L856.7 133.9 L859.1 130.7 L860 129.4 L859.8 125.5 L857.5 121.9 L857.6 119.8 L860 119.3 L863.7 123.7 L864.9 126.3 L864 129.5 L865.6 132.9ZM861.6 110.3 L863.8 111 L864.8 109.7 L867.4 113.2 L864.1 114.1 L863.6 117.3 L858.4 115.1 L858.9 118.6 L856.1 118.6 L854.1 115.5 L854 113 L856.6 112.8 L854.9 108.4 L854.2 106 L859.1 109.3 L861.6 110.3Z",856.3,136.6],["KAZ","Kazakhstan","M680 116.4 L678.7 117 L675.9 119.2 L675.3 121.5 L674.4 121.6 L673.3 120 L670.1 119.9 L668.9 117.3 L667.7 117.3 L667 114.1 L663.4 111.8 L659.2 112 L656.3 112.5 L653.2 109.6 L650.9 108.4 L646.5 106.1 L645.9 105.9 L639.9 107.7 L642.6 119.5 L641.3 119.6 L639 117.1 L637.1 116.2 L634.4 116.9 L633.5 118 L633.2 117.2 L633.5 115.9 L632.8 114.7 L629.7 113.7 L628 110.8 L626.4 110 L626.1 109 L628.6 109.3 L628.2 106.9 L630.3 106.4 L632.5 106.9 L632.3 103.8 L631.4 101.9 L629 102 L626.7 101.2 L624.1 102.6 L622 103.3 L620.6 102.8 L620.5 101.2 L618.5 99.1 L616.7 99.1 L614.2 97 L615.1 94.6 L614.2 94 L615.4 90.6 L618.3 92.4 L618.1 90.1 L622.3 86.8 L626 86.7 L631.9 88.8 L635.1 90.1 L637.3 88.8 L641.1 88.7 L644.7 90.3 L645.1 89.4 L648.6 89.5 L648.8 88.1 L644.2 85.9 L646.1 84.4 L645.4 83.6 L647.4 82.8 L645.1 80.7 L645.8 79.7 L654.3 78.6 L655.2 77.9 L660.8 76.7 L662.4 75.5 L666.9 76.1 L668.8 79.3 L671 78.5 L674.4 79.6 L674.9 81.2 L677.1 81.1 L681.9 78.2 L681.4 79.1 L685.4 81.5 L693.8 89.3 L694.5 87.7 L698.5 89.5 L701.6 88.7 L703.2 89.2 L705.1 91 L707 91.6 L708.6 93 L711.6 92.5 L713.6 94.5 L712.6 96.5 L710.6 96.8 L711.7 100 L710.9 101.4 L705.6 100.4 L705.8 106 L704.7 106.7 L700.2 108 L704.2 113.5 L702.7 114.3 L703.5 116.2 L701.8 115.7 L700.1 114.5 L696.3 114.2 L692.1 114.1 L691.3 114.5 L687.3 113.1 L686 113.8 L686.2 115.7 L681.7 114.6 L680.2 115 L680 116.4Z",665.4,98.0],["KEN","Kenya","M613.9 255.4 L615.5 258.1 L613.5 259.4 L612.9 260.7 L611.8 260.9 L611.4 263.2 L610.5 264.5 L609.9 266.6 L608.8 267.7 L604.8 264.5 L604.7 262.6 L594.6 256.1 L594.1 252.3 L594.9 251 L596.3 248.9 L597.3 246.6 L596.1 242.9 L595.7 241.3 L594.4 239 L596.1 237.1 L597.9 235 L599.4 235.5 L599.4 237.3 L600.4 238.4 L602.3 238.4 L605.8 241.1 L606.7 241.1 L607.4 241.1 L608 241.4 L609.8 241.7 L610.6 240.3 L613.2 239 L614.3 240.1 L616.2 240.1 L613.8 243.7 L613.9 255.4Z",604.9,250.8],["KGZ","Kirghizstan","M680 116.4 L680.2 115 L681.7 114.6 L686.2 115.7 L686 113.8 L687.3 113.1 L691.3 114.5 L692.1 114.1 L696.3 114.2 L700.1 114.5 L701.8 115.7 L703.5 116.2 L703.3 116.9 L699.8 118.6 L699.3 119.9 L696.1 120.3 L695.7 122.3 L692.9 121.9 L691.3 122.5 L689.2 124 L689.8 124.8 L689.3 125.5 L684.5 126 L681.1 124.9 L678.4 125.2 L678.2 123.3 L681.1 123.9 L681.8 122.9 L683.8 123.2 L686.5 120.9 L683 119.2 L681.4 120 L679.2 118.8 L680.8 116.7 L680 116.4Z",689.9,118.9],["KHM","Cambodge","M786 218.5 L784.7 216.8 L783 213.5 L781.9 209.6 L783.4 206.9 L786.9 206.3 L789.5 206.8 L791.9 208 L792.9 205.8 L795.5 207 L796.4 209.1 L796.5 213 L792.1 215.5 L793.5 217.4 L790.6 217.7 L788.3 219 L786 218.5Z",789.1,211.9],["KOR","Corée du Sud","M830.8 128.1 L834.7 131.9 L836.2 134 L837.7 137.7 L837.4 139.5 L835.3 140.1 L833.7 141.5 L831.4 141.8 L830.5 140 L830.1 137.6 L827.6 134.2 L829.3 133.7 L826.4 130.9 L827.6 130.7 L828 129.3 L829.8 129.1 L830.8 128.9 L830.8 128.1Z",832.4,135.2],["CS-KM","Kosovo","M552.7 117.1 L552.6 117.8 L552.1 116.6 L551.4 116.2 L550.8 115.4 L551.2 114.7 L552.1 113.4 L552.9 113.7 L553.8 114.4 L554.8 115.1 L554.9 115.9 L554.2 116.6 L552.7 117.1Z",552.9,115.4],["KWT","Koweït","M627.6 156 L628.3 157.5 L628.2 158.2 L629.3 160.6 L627.4 160.7 L626.6 159.2 L624.2 158.9 L625.8 155.8 L627.6 156Z",626.8,158.2],["LAO","Laos","M789.5 206.8 L790.2 205.3 L790 202.6 L787.4 199.8 L786.8 196.6 L784.3 194 L782.2 193.8 L781.8 194.9 L780.2 195 L779.3 194.4 L776.7 196.3 L776.2 193.4 L776.4 190 L774.5 189.9 L774 187.9 L772.7 186.9 L773.1 185.8 L775 183.7 L775.4 184.4 L776.8 184.5 L775.8 180.8 L777.1 180.3 L779.1 182.9 L780.9 185.8 L784.2 185.8 L785.8 188.7 L784.2 189.5 L783.6 190.7 L787.2 192.6 L790 196.4 L792.2 199.3 L794.6 201.5 L795.6 203.8 L795.5 207 L792.9 205.8 L791.9 208 L789.5 206.8Z",783.6,193.3],["LBN","Liban","M594.2 145.4 L593.5 145.4 L592.5 146 L593.1 143.3 L594.2 141 L595.4 141.1 L596 142.4 L594.7 143.6 L594.2 145.4Z",594.2,143.3],["LBR","Liberia","M478.6 238.7 L477.9 238.7 L475 237.1 L472.5 234.7 L470.1 232.9 L468.3 230.9 L469 229.8 L469.1 228.9 L470.4 227.2 L471.7 225.7 L472.3 225.6 L473 225.2 L474.1 227.2 L473.9 228.5 L474.5 229.2 L475.3 229.2 L475.8 227.9 L476.6 228 L476.5 228.9 L476.8 230.5 L476.1 231.9 L477 232.8 L477.8 233 L479 234.3 L479.1 235.6 L478.6 238.7Z",473.9,232.0],["LBY","Libye","M540.2 179 L538.4 180.2 L536.8 178.5 L532.5 177.1 L531.2 175.1 L529.1 173.6 L527.8 174.1 L526.8 172.3 L526.7 171 L525.1 168.6 L526.1 167.2 L525.8 165.2 L526.1 163.4 L525.9 162 L526.3 159.3 L526.1 157.8 L525.2 155 L526.5 154.2 L526.7 152.8 L526.3 151.5 L528.1 150.3 L528.9 149.2 L530.2 148.3 L530.2 145.8 L533.4 146.9 L534.5 146.6 L536.7 147.2 L540.2 148.6 L541.6 151.5 L544 152.1 L547.8 153.5 L550.7 155.1 L552 154.3 L553.2 152.8 L552.4 150.3 L553.2 148.7 L555 147.2 L556.8 146.8 L560.4 147.4 L561.4 148.9 L562.3 148.9 L563.2 149.4 L565.9 149.8 L566.6 150.9 L565.7 152.4 L566.2 153.8 L565.7 155.8 L566.6 158.4 L567.3 169.9 L567.9 181.8 L568.1 188.3 L565 188.3 L565 189.7 L553.9 183.5 L542.9 177.3 L540.2 179Z",548.2,165.7],["LKA","Sri Lanka","M726.6 228.5 L726.3 231.8 L725.2 232.8 L722.8 233.5 L721.4 230.9 L720.7 226.3 L721.6 221.1 L723.7 222.9 L725.1 225.1 L726.6 228.5Z",723.5,227.9],["LSO","Lesotho","M577.3 346 L578.2 347 L577.2 348.6 L576.7 349.6 L575.2 350.1 L574.6 351.2 L573.6 351.5 L571.8 349 L573.4 346.9 L574.9 345.7 L576.2 345 L577.3 346Z",575.0,348.2],["LTU","Lituanie","M553.8 78.7 L553.6 77.9 L553.7 77.1 L552.6 76.6 L550.1 76.1 L549.3 73.5 L551.9 72.6 L555.8 72.8 L558.1 72.5 L559.8 73.3 L562.2 74.8 L562.6 76.1 L560.8 77.1 L560.5 78.8 L558.1 80 L555.8 80 L555.1 79 L553.8 78.7Z",556.2,75.8],["LUX","Luxembourg","M514.7 91.6 L515.2 92.3 L515.1 93.7 L514.4 93.7 L513.8 93.5 L514.1 91.7 L514.7 91.6Z",514.5,92.7],["LVA","Lettonie","M549.3 73.5 L549.1 71.3 L550 69.4 L552.1 68.4 L554.2 70.6 L556.1 70.6 L556.2 68.3 L558.1 67.7 L559.2 68.1 L561.3 69.2 L563.2 69.2 L564.5 69.9 L564.9 71.3 L565.9 73.1 L563.6 74.3 L562.2 74.8 L559.8 73.3 L558.5 73.1 L555.8 72.8 L551.9 72.6 L549.3 73.5Z",557.8,71.2],["MAR","Maroc","M486.5 137.3 L488 138.7 L490.5 138.5 L493.2 139.2 L494.3 139.2 L495.3 141.3 L495.4 143.3 L496.3 146.7 L497 147.4 L496.5 148.6 L493.1 149.2 L491.9 150.4 L490.4 150.7 L490.2 153.1 L487.1 154.3 L486.1 156 L483.9 156.8 L481.2 157.3 L476.9 159.7 L476.8 163.5 L476.4 165.3 L474.8 165.4 L473.9 166.1 L472.7 166.1 L471.7 165.7 L469.4 166 L468.5 168.6 L467.6 168.8 L466.3 172.9 L462.4 176.4 L461.4 180.8 L460.3 182.3 L459.9 183.5 L453.8 183.7 L453.9 182.2 L455 181.3 L455.9 179.6 L455.8 178.5 L456.8 176.3 L458.3 174.2 L459.3 173.7 L460 171.8 L460.2 170.1 L461.2 168.1 L463 166.9 L464.8 163.6 L466.3 162.3 L468.7 161.9 L470.9 159.7 L472.3 158.9 L474.6 156.2 L474 152.1 L475.1 149.4 L475.5 147.7 L477.2 145.5 L479.9 144 L481.9 142.7 L483.7 139.3 L484.5 137.3 L486.5 137.3Z",477.4,156.5],["MDA","Moldavie","M565.5 97.6 L567.6 96.8 L569.5 97.8 L570.5 97.9 L571.8 98.7 L571.7 99.8 L572.7 100.3 L573.2 101.6 L574.2 102.4 L574.6 103.2 L573.9 103.4 L572.5 103.4 L571.7 103.2 L571.4 104.7 L571.1 105.8 L570.5 106.2 L569.9 104.7 L570 103.4 L569.7 102 L568.1 100.1 L567.1 98.8 L566.2 97.9 L565.5 97.6Z",570.3,100.8],["MDG","Madagascar","M636.6 292.8 L637.3 294.1 L637.9 296.3 L638.1 300.1 L638.7 301.7 L638.3 303.2 L637.8 304.2 L637 302.3 L636.4 303.2 L636.8 305.6 L636.4 307 L635.6 307.7 L635.3 310.4 L633.9 314.2 L632.2 318.7 L630 324.8 L628.6 329.3 L627 333 L624.7 333.8 L622.2 335.2 L620.8 334.3 L618.7 333.2 L618.1 331.5 L618.2 328.6 L617.5 326 L617.4 323.7 L618.1 321.4 L619.4 320.8 L619.5 319.7 L620.9 317.3 L621.3 315.2 L620.8 313.7 L620.4 311.7 L620.4 308.7 L621.5 306.9 L622 304.8 L623.3 304.7 L624.9 304.1 L625.9 303.5 L627.2 303.4 L628.8 301.6 L631.2 299.6 L632.1 298 L631.8 296.6 L633 297 L634.6 294.8 L634.7 292.8 L635.7 291.4 L636.6 292.8Z",627.4,314.9],["MEX","Mexique","M238.7 169.3 L237.1 172.2 L236.1 174.5 L235.1 178.8 L234.6 180.4 L234.7 182.2 L235.3 183.7 L235.4 186.2 L236.8 188.7 L237.2 190.5 L238 192.1 L240.8 192.9 L241.7 194.3 L244.3 193.4 L246.4 193.1 L248.5 192.5 L250.3 191.9 L252.2 190.6 L253.2 188.7 L253.8 186 L254.4 185.1 L256.4 184.2 L259.4 183.5 L261.8 183.6 L263.4 183.3 L264 184 L263.7 185.6 L261.9 187.5 L261 189.4 L260.8 191.4 L259.8 193.9 L259.2 193.1 L258.1 193.2 L256.9 195.1 L256.1 194.9 L253.5 195.3 L251 195.3 L250.7 197.2 L249.5 197.2 L250.4 198.2 L251.3 199 L251.5 199.7 L251.7 201 L248.2 201 L246.6 203.6 L246.5 205 L246.3 205.9 L243.6 202.4 L242.3 201.4 L240.2 200.6 L238.6 200.8 L236.3 202 L234.8 202.3 L233 201.5 L231 200.9 L228.7 199.4 L226.7 198.9 L223.8 197.4 L221.7 195.9 L221.1 195 L219.6 194.8 L217 193.8 L216.1 192.3 L213.4 190.5 L212.4 188.5 L212 186.9 L213 186.6 L212.9 185.7 L213.7 184.8 L213.9 183.7 L213.2 182.3 L213.2 181 L212.6 179.3 L210.9 176.1 L208.7 173.6 L207.9 171.6 L205.9 170.3 L205.5 169.5 L206.4 167.5 L205.2 166.7 L204 165.1 L203.9 162.9 L202.6 162.6 L201.5 160.9 L200.6 159.3 L200.8 158.3 L200.1 155.9 L199.8 153.4 L200.2 152.2 L198.7 150.9 L197.8 151 L196.5 150.1 L195.7 151.4 L195.7 153 L195.2 155.4 L195.8 156.8 L197.1 159 L197.3 159.8 L197.7 161.1 L198.2 163.1 L198.8 164 L199.1 165.1 L200.4 166.8 L200.5 169.8 L201 171.2 L201.4 172.7 L201.2 174.4 L202.4 174.5 L203.2 176 L203.9 177.4 L202.3 179.2 L201.5 177.2 L200.2 175.4 L198.6 173.8 L197.4 173 L198 170.6 L198 168.9 L197 167.9 L195.5 166.4 L194.6 166 L193.1 165.2 L192 163.3 L193.3 163.3 L194.6 162.1 L195.1 160.6 L193.7 158.3 L192.4 157.4 L192 155.4 L191.7 153.2 L191.2 150.7 L191.1 147.8 L194.2 147.5 L197.6 147.2 L197.2 147.8 L200.7 149.4 L206 151.6 L211.3 151.6 L213.4 151.6 L213.8 150.3 L218.4 150.3 L219 151.4 L220.1 152.4 L221.3 153.9 L221.7 155.6 L221.9 157.3 L223 158.3 L225 159.3 L227.3 156.7 L229.5 156.7 L231 158 L231.8 160.2 L232.3 162.1 L233.5 163.9 L233.6 166.2 L234 167.7 L235.9 168.7 L237.6 169.4 L238.7 169.3Z",223.3,175.7],["MKD","Macédoine du Nord","M552.3 117.7 L552.7 117.1 L554.2 116.6 L555.6 116.3 L556.7 116.2 L558.1 117.3 L558.5 119.4 L557.6 120.1 L556.2 120 L555.3 120.7 L553.7 121 L552.5 120.2 L552.1 118.8 L552.3 117.7Z",555.2,118.5],["MLI","Mali","M466.5 205.7 L467.5 205.1 L468 203.2 L468.8 203.1 L470.7 204 L472.3 203.4 L473.3 203.6 L473.8 202.9 L484.8 202.8 L485.4 200.6 L483.7 186.2 L482.6 172.3 L486.7 172.2 L495.8 179.3 L505 186.3 L505.6 187.8 L507.3 188.8 L508.6 189.3 L508.6 191.3 L511.7 191 L511.7 198.5 L510.2 200.6 L510 202.6 L507.6 203.1 L503.8 203.4 L502.8 204.5 L501 204.7 L499.3 204.7 L498.6 204.1 L497.1 204.5 L494.5 205.9 L494 206.9 L491.8 208.3 L491.5 209.1 L490.3 209.8 L489 209.4 L488.2 210.1 L487.8 212.3 L485.6 215 L485.6 216.1 L484.9 217.5 L485.1 219.3 L483.9 219.8 L482.9 218.8 L482.1 219.2 L481.1 220.1 L478.9 220.1 L478.2 219.6 L477 218.9 L477.1 218 L476.2 217.9 L476.3 216.9 L476.9 216 L475.8 214.7 L475.4 213.8 L474.8 213.1 L473.6 213.5 L472.7 213.9 L471.9 214.6 L470.8 214.3 L470 213.5 L468.8 213.8 L468.2 212.7 L468.4 211.7 L468.2 210.4 L467.1 209.5 L466.6 207.7 L466.5 205.7Z",490.3,197.2],["MLT","Malte","M538 137 L537.4 137 L538 137Z",537.6,136.9],["MMR","Myanmar (Birmanie)","M771.2 187.7 L769.9 189.1 L768 189.2 L767.3 192.7 L766.2 193.3 L767.9 196.1 L770 198.5 L771.4 200.6 L770.7 203.4 L769.9 204 L770.7 205.6 L772.8 208.2 L773.3 210 L773.4 211.5 L774.8 214.4 L773.6 217.4 L772.5 220.7 L772 218.4 L772.7 215.9 L771.6 214 L771.5 210.5 L770.2 208.8 L768.8 205 L767.8 200.9 L766.3 198.2 L764.7 199.8 L761.9 202.1 L760.3 201.8 L758.5 201.1 L758.9 197.1 L758 194.1 L755.3 190.3 L755.4 189.2 L753.8 188.8 L751.4 186.1 L750.9 183.5 L751.9 184 L751.6 181.7 L752.8 180.9 L752.2 179.6 L752.7 178.5 L752.2 175.1 L754.4 175.9 L755.1 173.2 L754.9 171.6 L755.9 168.9 L755.4 167 L758.4 164.8 L760.5 165.4 L759.8 163.4 L760.6 162.8 L760.1 161.6 L761.6 161.3 L763 163.2 L764.3 164 L764.9 166.5 L765.4 169.2 L763.4 171.9 L763.8 175.7 L766.6 175.2 L767.8 178.1 L769.6 178.8 L769.3 181.5 L771.6 182.7 L772.9 183.3 L774.7 182.3 L775 183.7 L773.1 185.8 L772.7 186.9 L771.2 187.7Z",762.4,185.1],["MNE","Monténégro","M550.2 115.7 L550 115.1 L549 116.6 L549.2 117.7 L547.9 116.4 L546.7 115.7 L547.2 113.4 L548 112.7 L549.2 113 L550.4 113.7 L551.4 114.4 L550.8 115.4Z",548.8,114.8],["MNG","Mongolie","M714.5 94.2 L716.8 93.7 L720.4 91 L723.4 89.5 L725.9 90.5 L728.5 90.5 L730.8 92 L733.2 92.1 L737.1 92.9 L738.5 90.7 L736.7 88.9 L737.6 85.7 L740.9 86.9 L743.3 87.3 L746.5 88.1 L748.1 90.4 L752.2 91.7 L754.2 91.1 L757.1 90.7 L759.7 91.2 L762.9 92.6 L765.1 94.2 L767.4 94.2 L770.7 94.7 L772.6 93.9 L775.5 93.4 L777.9 91.2 L779.6 91.6 L781.4 92.6 L784.2 92.4 L784.2 94.7 L784.1 97.8 L785.4 99.1 L786.6 98.7 L789.3 99.2 L790.6 98 L793.1 99 L796.5 101.2 L796.8 102.4 L794.6 102 L791.2 102.4 L789.9 103.3 L789.1 105.4 L785.9 106.6 L784.2 108.3 L781.3 107.7 L779.8 107.4 L779.4 109.4 L780.7 110.7 L781.6 111.7 L780.3 112.8 L779.2 114.5 L776.7 115.6 L773 115.7 L769.3 116.8 L767 118.6 L765.5 117.6 L762.5 117.6 L758 115.6 L755.3 115.1 L752.1 115.6 L746.6 114.9 L743.8 115 L741.6 113.1 L739.4 110.1 L737.7 109.8 L733.9 107.8 L730.4 107.4 L727.2 106.8 L725.8 105.4 L725.4 101.7 L722.7 99.2 L718.7 98 L716 96.4 L714.5 94.2Z",755.2,102.1],["MOZ","Mozambique","M595.4 289.7 L597.5 289.5 L600.8 290.4 L601.5 290 L603.4 289.9 L604.5 288.9 L606.1 289 L609.2 287.7 L611.4 285.8 L611.8 287.3 L611.6 290.5 L611.8 293.3 L611.7 298.4 L612.1 299.9 L611.2 302.2 L610 304.5 L608.2 306.5 L605.6 307.7 L602.4 309.3 L599.1 312.7 L598.1 313.3 L596 315.6 L594.9 316.4 L594.5 318.7 L595.6 321.1 L596.1 323 L596 324 L596.2 327 L595.7 328.5 L595.8 330.4 L594.6 331.5 L592.3 332.6 L588.9 334.4 L587.7 335.6 L587.8 336.9 L588.5 337.2 L588.1 338.9 L586.1 338.8 L586 337.4 L585.7 335.9 L585.5 334.8 L586.2 331.2 L585.7 328.9 L584.6 324.3 L587.7 320.7 L588.5 318.3 L589.4 316.1 L589 315.2 L589.2 312.8 L589.9 310.5 L590.1 306.5 L588.7 305.4 L587.4 305.2 L586.8 304.4 L585.6 303.7 L583.3 303.8 L583.2 302.6 L583 300.3 L591.4 297.6 L592.9 299.2 L593.7 298.9 L594.8 299.7 L594.9 301 L594.2 302.5 L594.3 304.7 L596 306.7 L597 304.5 L598.2 303.8 L598.1 299.7 L597.1 297.3 L596.1 296.3 L595.2 296.4 L594.6 292.2 L595.4 289.7Z",597.1,308.1],["MRT","Mauritanie","M466.5 205.7 L464.7 203.5 L463.1 201.1 L461.3 200.2 L460 199.3 L458.5 199.3 L457.1 200 L455.8 199.7 L454.8 200.8 L454.6 199 L455.4 197.4 L455.8 194.4 L455.6 191.2 L455.3 189.6 L455.6 188 L455 186.5 L453.6 185.1 L454.2 184 L464.9 184 L464.4 179.3 L465.1 177.7 L467.7 177.4 L467.8 169.1 L476.6 169.3 L476.7 164.4 L486.7 172.2 L482.6 172.3 L483.7 186.2 L484.9 200.2 L484.8 202.8 L473.8 202.9 L473.3 203.6 L472.3 203.4 L470.7 204 L468.8 203.1 L468 203.2 L467.5 205.1 L466.5 205.7Z",471.9,187.7],["MWI","Malawi","M595.4 289.7 L594.6 292.2 L595.2 296.4 L596.1 296.3 L597.1 297.3 L598.1 299.7 L598.2 303.8 L597 304.5 L596 306.7 L594.3 304.7 L594.2 302.5 L594.9 301 L594.8 299.7 L593.7 298.9 L592.9 299.2 L591.4 297.6 L590 296.8 L590.9 293.8 L591.9 292.7 L591.4 290 L592 287.4 L592.5 286.5 L591.9 283.8 L590.6 282.4 L593.3 283 L593.9 283.8 L594.8 285.3 L595.4 289.7Z",594.2,295.0],["MYS","Malaisie","M780.3 232.7 L780.6 234.4 L782.4 234 L783.2 232.7 L783.9 233 L785.6 234.9 L786.9 237.1 L787.1 239.2 L786.8 240.7 L787.2 241.8 L787.4 243.7 L788.4 244.6 L789.5 247.4 L789.5 248.5 L787.5 248.7 L784.9 246.4 L781.5 243.8 L781.2 242.2 L779.5 240 L779 237.4 L778 235.6 L778.2 233.3 L777.5 231.9 L780.3 232.7ZM829.2 238.3 L827.2 239.4 L824.8 238.8 L821.6 238.8 L820.7 242.5 L819.7 243.6 L818.4 248.1 L816.1 248.8 L813.5 247.9 L812.1 248.1 L810.5 249.8 L808.8 249.5 L807 250.2 L805.1 248.4 L804.6 246.2 L806.6 247.3 L808.8 246.7 L809.3 244 L810.4 243.4 L813.7 242.7 L815.6 240.2 L816.9 238.1 L818.3 239.8 L818.8 238.7 L820.1 238.8 L820.2 236.8 L820.3 235.2 L822.3 232.9 L823.5 230.4 L824.6 230.4 L826.2 232 L826.4 233.4 L828.2 234.3 L830.6 235.3 L830.5 236.6 L828.6 236.7 L829.2 238.3Z",818.3,241.3],["NAM","Namibie","M543.6 344.8 L541.8 342.3 L540.8 340 L540.3 336.8 L539.7 334.5 L539 329.5 L539 325.6 L538.7 323.9 L537.7 322.5 L536.3 319.9 L535 316 L534.4 314 L532.3 310.8 L532.1 308.3 L533.5 307.7 L535.1 307.2 L536.9 307.3 L538.5 308.7 L550 308.4 L551.9 309.9 L558.5 310.4 L563.6 309.1 L565.8 308.3 L567.6 308.5 L568.7 309.2 L567.1 310.2 L566.3 310.2 L564.5 311.5 L563.5 310.2 L559.2 311.3 L557.2 311.4 L556.7 322.9 L554 323 L553.7 332.5 L553.1 344.4 L550.7 346.1 L549.2 346.3 L547.6 345.7 L546.4 345.5 L546 344.1 L545 343.2 L543.6 344.8Z",546.5,323.8],["NCL","Nouvelle-Calédonie","M950.9 320.5 L952.6 322.5 L953.5 324 L952.3 324.8 L951 323.9 L949.5 322.5 L948.3 320.8 L947.1 318.5 L947 317.4 L948.2 317.4 L949.4 318.5 L950.3 319.6 L950.9 320.5Z",950.1,321.1],["NER","Niger","M505.9 214.3 L506 212.1 L502.8 211.3 L502.7 209.8 L501.2 207.7 L500.8 206.2 L501 204.7 L502.8 204.5 L503.8 203.4 L507.6 203.1 L510 202.6 L510.2 200.6 L511.7 198.5 L511.7 191 L515.5 189.6 L523.3 183.2 L532.5 177.1 L536.8 178.5 L538.4 180.2 L540.2 179 L541 184.1 L542.1 184.9 L542.2 185.9 L543.3 187 L542.8 188.4 L541.9 195 L541.8 199.2 L538.4 202.2 L537.3 206.5 L538.4 207.7 L538.4 209.7 L540.2 209.8 L540 211.3 L539.2 211.5 L539.1 212.5 L536.7 209.1 L536 209 L533.9 210.8 L531.8 209.8 L530.3 209.6 L529.5 210.1 L527.9 210 L526.3 211.4 L524.9 211.4 L521.5 209.8 L520.2 210.6 L518.8 210.5 L517.8 209.3 L515 208.1 L512 208.5 L511.3 209.2 L510.9 211 L510.1 212.3 L510 215.2 L507.9 213.3 L506.9 213.3 L505.9 214.3Z",525.5,196.9],["NGA","Nigeria","M523.6 237.3 L520.7 238.5 L519.7 238.3 L518.6 239.1 L516.4 239 L514.9 237 L514 234.6 L512 232.5 L509.9 232.6 L507.5 232.6 L507.6 227.4 L507.5 225.3 L508.1 223.3 L508.9 222.3 L510.2 220.3 L510 219.5 L510.5 218.2 L509.9 216.3 L510 215.2 L510.1 212.3 L510.9 211 L511.3 209.2 L512 208.5 L515 208.1 L517.8 209.3 L518.8 210.5 L520.2 210.6 L521.5 209.8 L524.9 211.4 L526.3 211.4 L527.9 210 L529.5 210.1 L530.3 209.6 L531.8 209.8 L533.9 210.8 L536 209 L536.7 209.1 L538.6 212.6 L540.2 213.8 L539.8 215.5 L537.5 218 L536.8 220 L536.4 221.7 L535.8 222.4 L535.3 224.7 L533.8 226 L533.4 227.6 L532.8 228.9 L532.6 230.2 L530.7 231.3 L529.1 230 L528 230.1 L526.4 231.9 L525.6 232 L524.3 235.1 L523.6 237.3Z",522.1,222.0],["NIC","Nicaragua","M263.3 217 L262.4 216 L261.2 214.7 L260.7 213.6 L259.6 212.6 L258.4 211.2 L259.1 211.1 L260.2 210.8 L260.6 210.1 L261.1 208.4 L261.8 208.4 L263 207.5 L263.8 208.2 L264.6 207.4 L265.7 206.5 L265.8 205.8 L266.5 205.1 L267.2 205.5 L268.4 205.2 L269.1 205.2 L270.1 204.8 L271.5 204.4 L271 205.5 L271.1 206.7 L270.4 207.7 L270 209 L269.8 210.5 L269.8 211.3 L269.8 212.7 L269 214.4 L269.1 215.3 L268.5 216.1 L268.5 217 L268.2 218.2 L267.4 218 L267 217.3 L266.1 217 L265.5 217.5 L263.7 216.6Z",265.7,211.4],["NLD","Pays-Bas","M514.5 81.2 L516.4 81.3 L516.9 82.3 L516.4 85.1 L515.9 86.3 L514.4 86.3 L514.9 89.5 L513.6 88.8 L512 87.4 L509.8 88.1 L508 87.8 L509.2 87 L511.2 82.5 L514.5 81.2Z",513.2,84.9],["NOR","Norvège","M558.2 30.3 L565.2 32.3 L562.6 33 L565.3 34.7 L562 35.8 L560.3 36.1 L560.8 34.2 L557.9 33.1 L554.8 34 L554.2 36 L552.4 37.2 L550 36.5 L547.3 36.7 L544.7 35.2 L543.5 36 L542.2 36.1 L542.2 37.9 L538.1 37.4 L537.8 39 L535.7 38.9 L534.5 40.9 L532.7 44 L529.7 48 L530.6 48.9 L529.9 50 L527.7 50 L526.5 52.7 L526.9 56.5 L528.4 58 L528 61.4 L526.2 63.4 L525.3 65.1 L523.7 63.3 L519.3 66.7 L516.3 67.4 L513 65.9 L512.1 62.7 L511.2 56 L513.2 54.1 L518.9 51.7 L523.1 48.8 L526.8 44.9 L531.5 39.5 L534.8 37.4 L540.2 34 L544.6 32.8 L548.1 33 L550.8 30.8 L554.6 30.9 L558.2 30.3ZM547.7 13.3 L543.6 14.3 L540.1 13.7 L541.3 13.1 L540 12.3 L543.8 11.9 L544.8 12.8 L547.7 13.3ZM534.4 9 L541 10.7 L536.4 11.6 L535.6 13.4 L534 13.8 L533.4 15.8 L531.1 15.9 L526.7 14.5 L528.3 13.6 L525.4 12.9 L521.4 10.9 L519.7 9.1 L524.7 8.3 L525.9 9.1 L528.6 9 L529.2 8.2 L531.9 8.2 L534.4 9ZM547.6 7.4 L551.5 8.2 L549 9.4 L543.6 9.7 L537.9 9.3 L537.5 8.6 L534.7 8.6 L532.5 7.6 L538.1 6.9 L541 7.5 L542.7 6.8 L547.6 7.4Z",529.9,49.6],["NPL","Népal","M735.8 162.8 L735.9 164.2 L736.6 166.3 L736.6 167.6 L734.3 167.6 L731 166.9 L728.8 166.6 L727 164.9 L723.2 164.5 L719.4 162.7 L716.5 161.1 L713.7 159.9 L714.2 156.8 L715.6 155.4 L716.5 154.6 L718.8 155.6 L722 157.7 L723.5 158.2 L724.8 159.7 L727 160.3 L729.4 161.8 L732.6 162.5 L735.8 162.8Z",724.6,161.7],["NZL","Nouvelle-Zélande","M941.5 384.6 L941.3 385.9 L943.9 384.7 L943.8 386 L942.9 387.4 L941 388.8 L937.8 391.2 L935.7 392.5 L935.6 394 L933.6 394 L930.7 395.2 L928.6 397.3 L924.9 400.5 L921.9 401.9 L920.1 402.8 L917.8 402.8 L916.9 401.7 L914.4 401.5 L914.8 400.3 L917.7 398 L923 394.9 L925 394.3 L927.6 393 L930.9 391.4 L933.5 389.7 L936.1 387.3 L937.6 386.5 L939.1 384.7 L941.8 383.3 L941.5 384.6ZM954.6 369.3 L954.6 372.7 L955.8 370.5 L956.5 371.4 L955.5 373.8 L957 374.9 L958.6 375.1 L960.8 373.9 L961.9 374.3 L959.6 377.1 L957.7 379 L955.8 378.9 L954.5 379.9 L953.9 381.3 L953.1 381.9 L951.1 383.6 L948.4 385.8 L945.6 387.1 L945.7 386.3 L945 385.8 L948.1 383.2 L948.3 381.4 L946.4 380.1 L947.1 378.9 L949.6 377.8 L951.5 375.3 L952.6 373.3 L952.7 371.1 L953.1 370.5 L952.6 369.2 L952.1 366.3 L952.2 364.1 L953.3 363.8 L953.8 365.6 L955.4 366.4 L954.6 369.3Z",928.9,394.3],["OMN","Oman","M660.1 184.7 L659.3 186.9 L658 186.7 L657.5 187.5 L657.3 189.2 L657.8 191.3 L656.3 191.7 L654.7 192.9 L654.6 194.5 L654 195.2 L652.3 195.1 L651.3 195.9 L651.4 197.2 L650.2 198.1 L648.6 197.8 L646.9 198.9 L645.6 199.1 L644.6 196.9 L642 191.5 L649.9 188.3 L651.1 181.8 L649.6 179.5 L649.6 178.2 L650.2 176.9 L650.1 175.6 L651.2 174.9 L650.7 172.4 L652.1 172.4 L653.5 174.6 L655.2 175.8 L657.2 176.2 L658.9 176.8 L660.3 178.6 L661.2 179.7 L662.2 180.1 L662.2 180.8 L661.5 182.8 L661.1 183.7 L660.1 184.7ZM651.7 169.2 L651.4 169.8 L650.8 168.7 L651.4 167.6 L651.7 169.2Z",652.7,186.4],["PAK","Pakistan","M694.9 132.9 L697.2 134.4 L698.5 136.9 L703.1 138.2 L701.2 140.9 L698.4 141.4 L694.3 140.6 L693.3 142 L694.8 144.8 L696.2 147 L698.7 148.6 L696.8 150.5 L697.3 152.8 L695.3 156 L694.2 159.3 L692 162.7 L688.9 162.5 L686.5 165.9 L688.5 167.3 L689.1 169.8 L690.9 171.4 L691.8 174.2 L685.9 174.2 L684.4 176.4 L682.3 175.6 L681.2 173.2 L678.8 170.8 L673.9 171.4 L669.5 171.4 L665.8 171.9 L666.3 168.1 L669.9 166.5 L669.5 165 L668.1 164.4 L667.7 161.6 L664.9 160.2 L663.5 158.2 L662 156.5 L666.7 158.2 L669.3 157.7 L670.9 158.1 L671.3 157.4 L673.2 157.7 L676.5 156.3 L676.1 153.6 L677.3 151.7 L679.2 151.7 L679.4 150.8 L681.3 150.4 L682.3 150.7 L683.2 149.8 L682.7 147.9 L683.4 145.9 L685 145.1 L683.5 142.9 L686 143.1 L686.5 141.9 L686.1 140.6 L687.1 139.3 L686.5 137.7 L685.6 136.3 L686.8 134.9 L689.4 134.2 L692.3 133.9 L693.5 133.3 L694.9 132.9Z",684.3,156.2],["PAN","Panama","M284.2 229.5 L283.3 228.5 L282.8 226.8 L283.5 225.9 L282.8 225.7 L282.4 224.7 L281 223.8 L279.8 224 L279.2 225.1 L278 225.9 L277.4 226 L277.1 226.7 L278.4 228.4 L277.6 228.8 L275.9 229.5 L275.5 227.5 L274.2 227.9 L273.7 226.6 L272.6 226.4 L271.9 226 L270.7 226 L270.6 226.7 L270.4 225.6 L270.7 224.9 L271.1 224 L270.5 223.5 L270.6 222.2 L271.7 221.9 L272.6 223.1 L272.5 223.8 L273.6 223.9 L274.6 224.4 L276 224.2 L277.2 223.4 L278.9 222.7 L279.9 221.8 L281.4 222 L282.8 222.4 L284 223 L284.9 223.9 L285.9 224.8 L286.1 227.2 L285.5 228.1 L284.6 227.9 L284.2 229.5Z",278.2,225.3],["PER","Pérou","M309.5 309.2 L308.9 310.9 L307.6 311.7 L304.7 309.9 L304.3 308.5 L298.5 305.3 L293.3 301.8 L291 299.8 L289.6 297.1 L290 296.2 L287.3 292 L284.2 286 L281.2 279.6 L280 278.2 L279 275.8 L276.7 273.7 L274.7 272.4 L275.5 271 L274.1 267.9 L274.9 265.6 L277.1 263.6 L277.4 265 L276.6 265.7 L276.8 266.9 L277.9 266.6 L279 267 L280.2 268.6 L281.8 267.3 L282.2 265.1 L283.9 262.3 L287.2 261.1 L290.2 257.7 L291 255.6 L290.6 253.2 L291.4 252.9 L293.2 254.4 L294.1 255.9 L295.4 256.7 L297.1 260.1 L299.2 260.5 L300.7 259.7 L301.7 260.2 L303.3 259.9 L305.5 261.4 L303.8 264.7 L304.6 264.8 L306 266.5 L303.5 266.3 L300.9 267.4 L297.8 269.6 L297.6 271.1 L297 272.2 L297.3 274 L295.7 274.9 L295.7 276.3 L295 276.9 L296.3 279.8 L297.9 281.7 L297.4 283.1 L299.3 283.3 L300.4 285 L302.9 285.1 L305 283.2 L305.1 288.1 L306.4 288.4 L307.9 287.9 L310.7 293.1 L310.1 294.2 L310.2 296.4 L310.3 299.2 L309.4 300.8 L310 302 L309.5 303.1 L310.9 305.8 L309.5 309.2Z",294.3,282.2],["PHL","Philippines","M849.9 225.6 L850.4 227.8 L850.7 229.6 L849.9 232.5 L848.7 229.2 L847.5 230.9 L848.5 233.2 L847.8 234.7 L844.4 232.9 L843.5 230.5 L844.3 229 L842.4 227.5 L841.6 228.8 L840.3 228.7 L838.4 230.5 L837.9 229.6 L838.7 226.9 L840.4 225.9 L841.8 224.7 L842.9 226.2 L845 225.3 L845.3 223.9 L847.2 223.8 L846.8 221.3 L849.2 222.8 L849.6 224.4 L849.9 225.6ZM842.7 219.6 L841.8 220.7 L841.2 222.7 L840.4 223.7 L838.5 221.5 L838.9 220.6 L839.5 219.7 L839.6 217.7 L841.1 217.5 L840.9 219.7 L842.6 216.6 L842.7 219.6ZM827.9 222.7 L824.4 225.8 L825.6 223.5 L827.4 221.5 L828.9 219.3 L830 216.1 L830.8 218.7 L829.1 220.5 L827.9 222.7ZM836.3 214.4 L838.1 215.4 L839.9 215.4 L840 216.8 L838.8 218.1 L837.2 219.1 L836.9 217.6 L836.9 216 L836.3 214.4ZM846.2 213.6 L847.4 217.2 L845.2 216.3 L845.4 217.4 L846.3 219.4 L845 220.1 L844.7 217.8 L843.8 217.7 L843.2 215.7 L844.8 216 L844.6 214.8 L842.7 212.3 L845.3 212.4 L846.2 213.6ZM834.9 210.6 L834.5 213.4 L833.1 211.8 L831.4 209.4 L833.8 209.5 L834.9 210.6ZM831.6 193.1 L833.5 194 L834.2 193.2 L834.6 194 L834.4 195.4 L835.7 197.7 L835.4 200.4 L834 201.4 L833.9 204 L834.9 206.6 L836.4 206.9 L837.6 206.6 L841.3 208.4 L841.2 210.1 L842.2 210.9 L842.1 212.4 L839.8 210.8 L838.6 209.1 L838 210.3 L836 208.3 L833.6 208.8 L832.1 208.1 L832 206.8 L832.8 206 L831.9 205.2 L831.7 206.4 L830.1 204.5 L829.4 203.1 L828.9 200 L830.1 201.1 L829.6 196 L830 193.1 L831.6 193.1Z",833.7,202.0],["PNG","Papouasie-Nouvelle-Guinée","M932.1 274.6 L931.3 274.9 L930.2 273.7 L929.1 271.6 L928.7 269.2 L929.3 269.8 L930.1 270.6 L931.3 272.6 L932.5 273.7 L932.1 274.6ZM921.6 270.3 L920.1 270.5 L919.6 271.4 L918 272.2 L916.6 273 L915.1 273 L912.9 272 L911.4 271.1 L911.7 270.2 L914.1 270.6 L915.7 270.4 L916.2 268.8 L916.7 270.5 L918.3 270.2 L919.2 269.1 L920.8 268 L920.6 266.1 L922.3 266 L922.6 268.3 L921.6 270.3ZM907.8 276.4 L910.1 278.5 L911.6 281.9 L913.2 281.8 L912.9 283.3 L915 283.8 L914.1 284.4 L916.8 285.8 L916.4 286.7 L914.6 286.9 L914 286.1 L911.6 285.7 L908.9 285.2 L907 283.2 L905.6 281.4 L904.5 278.6 L901 277.2 L898.6 278.1 L896.8 279.2 L896.9 281.6 L894.6 282.7 L893.1 282.1 L890.3 282 L891.1 271.5 L891.5 261 L896.3 263.2 L901.3 265.1 L903.2 266.7 L904.6 268.3 L904.9 270.2 L909.4 272.2 L910 273.9 L907.4 274.3 L907.8 276.4ZM925 267.1 L924.1 268 L923.7 266.1 L923.1 264.9 L921.9 263.8 L920.3 262.4 L918.4 261.5 L919.2 260.7 L920.6 261.6 L921.5 262.3 L922.7 263.1 L923.7 264.4 L924.7 265.5 L925 267.1Z",900.0,274.0],["POL","Pologne","M536.3 88.6 L535.2 86.6 L535.3 85.5 L534.6 83.9 L533.6 82.8 L534.2 82 L533.6 80.4 L535.1 79.5 L538.7 78.1 L541.6 77.1 L544 77.6 L544.2 78.4 L546.5 78.4 L549.5 78.7 L553.8 78.7 L555.1 79 L555.8 80 L556 81.3 L556.8 82.5 L557 83.7 L555.6 84.3 L556.5 85.7 L556.7 87.1 L558.2 89.8 L558.1 90.7 L556.9 91 L555 93.6 L555.8 95 L552.8 93.7 L551 94.1 L549.9 93.8 L548.5 94.4 L547.1 93.3 L546.2 93.8 L544.8 92 L542.9 91.9 L542.6 90.9 L540.9 90.5 L540.6 91.3 L539.3 90.7 L539.4 89.8 L537.5 89.6 L536.3 88.6Z",546.4,85.4],["PRI","Porto Rico","M318.8 193.1 L320.2 193.4 L319.8 194.8 L317.8 194.8 L316.2 194.9 L316.2 193.5 L318.8 193.1Z",318.2,194.0],["PRK","Corée du Nord","M831.1 116 L831.7 116.6 L830.7 116.4 L830.1 117.5 L829.9 118.5 L831.1 120.8 L830.1 121.6 L829.3 123.1 L827.9 123.6 L827.1 124.5 L827.7 125.8 L828.8 126.7 L830.8 128.1 L830.8 128.9 L829.8 129.1 L828 129.3 L827.6 130.7 L826.4 130.6 L824.9 130.3 L824.2 131.2 L823 130.3 L822.1 129.8 L822.3 128.3 L822.2 127.4 L822.1 125.6 L820.1 124.8 L818.5 123.9 L819.7 121.8 L821.7 120.1 L822.4 117.9 L824.1 118.9 L826.4 119 L825.2 117.3 L828.4 115.9 L828.5 114.1 L831.1 116Z",825.6,123.3],["PRT","Portugal","M477 117.7 L478 116.8 L479 116.4 L479.6 117.9 L481.1 117.9 L483.1 117.6 L483.7 119.2 L482.5 120.1 L482.4 122.6 L481.9 124.6 L480.8 124.9 L481.7 126.8 L481 128.9 L481.8 129.9 L481.5 130.7 L480.5 131.9 L480.7 133 L479.6 133.9 L478.2 133.4 L476.9 133.8 L477.4 131.2 L477.2 129.2 L476 129 L475.5 127.7 L475.7 125.6 L476.8 124.5 L477 123.2 L477.6 121.2 L477.6 119.9 L477.1 118.7 L477 117.7Z",479.3,124.9],["PRY","Paraguay","M329.9 324.3 L330.6 320.5 L330.4 318.7 L331.5 315.9 L336.1 314.9 L338.7 315 L341.4 316.6 L341.5 317.6 L342.5 319.4 L342.7 323.8 L345.7 324.4 L346.7 323.8 L348.6 324.7 L349.2 325.6 L349.8 328.6 L350.3 329.8 L351.3 330 L352.2 329.5 L353.3 330.1 L353.5 331.8 L353.3 333.7 L353 335.6 L352.9 338.5 L350.8 340.9 L348.7 341.5 L345.7 341 L342.8 340.1 L344.9 335.2 L344.3 333.7 L341.4 332.5 L337.8 330.1 L335.5 329.6 L329.9 324.3Z",341.9,327.5],["QAT","Qatar","M637.1 172.9 L636.6 170.6 L637.2 168.9 L637.9 168.5 L638.8 169.5 L639.1 171.4 L638.7 173.3 L638 173.6 L637.1 172.9Z",637.9,171.1],["ROU","Roumanie","M556 98.6 L556.9 98 L558.5 98.3 L560.1 98.3 L561.3 99.1 L562.1 98.6 L563.9 98.3 L564.4 97.6 L565.5 97.6 L566.2 97.9 L567.1 98.8 L568.1 100.1 L569.7 102 L570 103.4 L569.9 104.7 L570.5 106.2 L571.6 106.8 L572.8 106.2 L574 106.8 L574.1 107.6 L573 108.3 L572.2 108 L571.9 111.8 L570.4 111.5 L568.5 110.3 L565.6 111.1 L564.4 111.9 L560.7 111.7 L558.7 111.2 L557.8 111.5 L556.9 110.1 L556.9 109.1 L556.3 108.7 L555.6 109.4 L554 108.4 L553.7 107.1 L552.1 106.4 L551.8 105.4 L550.3 104.1 L552.2 103.6 L553.5 101.4 L554.5 99.3 L556 98.6Z",562.1,105.0],["RUS","Russie","M848.1 89.7 L854.2 95.2 L849.9 94.2 L851.3 98.7 L855.7 101.9 L856.9 104.1 L853.9 102.2 L853.8 104.7 L851.7 102 L850.1 98.9 L847.7 95.6 L846.7 93.2 L844.1 89 L840.6 86 L837.8 81.8 L839 80.4 L837.1 79 L837.8 78.6 L839.9 80.6 L842.8 83.5 L844.9 86.6 L848.1 89.7ZM553.8 78.7 L549.5 78.7 L546.5 78.4 L546.9 77.1 L550.1 76.1 L552.6 76.6 L553.7 77.1 L553.6 77.9 L553.8 78.7ZM122.6 42.9 L123.3 43.6 L125.1 41.6 L130.5 42 L131.7 44.6 L128.2 45.8 L124.3 46.1 L121.2 48.9 L119.6 49.5 L117.7 49.4 L117.1 48.4 L115.1 47.6 L116 46.3 L114.4 45.9 L111.5 46.2 L111.4 45.3 L113.1 44.2 L109.8 44.9 L109.2 46.2 L106.5 47.4 L120 36.3 L122.6 38.4 L124.9 41.2 L122.6 42.9ZM873.5 31.3 L871.4 31.4 L869.9 30.6 L871.1 29.5 L873.5 31.3ZM129.4 31.1 L126.5 31.3 L128.9 29.5 L131.1 29.4 L133.1 30.1 L132.4 30.5 L129.4 31.1ZM791.2 25 L788.1 25 L783.6 24.7 L783.9 23.6 L786.2 23.3 L790.2 24.3 L791.2 25ZM799.8 20.2 L798.7 21.2 L795.3 20.9 L790.4 19.9 L789.8 19.1 L794 19.5 L799.8 20.2ZM787.1 19 L787.8 20.8 L780.4 20.8 L777.8 21.4 L771.9 19.7 L771 18 L773 17.5 L778.4 17.6 L787.1 19ZM619.5 31.6 L618.4 31.8 L611.5 31.5 L610.4 30.3 L606.4 29.6 L605.6 28.1 L607.4 27.6 L606.8 26.1 L609.9 23.9 L607.9 23.6 L611.7 21.3 L610.7 20.2 L614.5 18.8 L620.2 17.2 L626.4 16.8 L629.3 15.8 L632.9 15.5 L634.8 16.5 L633.9 17.3 L627.7 18.5 L622.3 19.7 L617.3 22.1 L615.4 24.7 L613.3 27.2 L614.6 29.4 L619.5 31.6ZM708.4 15.4 L710.1 16.7 L711.3 16.1 L717.1 16.1 L722.7 17.3 L725.2 18.2 L725.9 19.6 L724.4 20.3 L720.5 21.7 L719.7 22.5 L722.5 22.8 L726 23.5 L727.4 23 L729.9 24.7 L730.2 24 L733.1 23.6 L739.9 24 L741.5 25.2 L750.4 25.6 L748.6 23.6 L753.3 24.1 L756.5 24.1 L761.2 25.4 L763.8 27.1 L763.6 28.2 L768.2 30.3 L772.5 31.4 L771.8 28.6 L776.3 29.8 L779.1 29.1 L783.9 29.9 L784.7 29.2 L788.4 29.5 L784.4 27.1 L785.8 25.9 L806.2 27.6 L809.7 29.2 L817.4 31.3 L825.2 30.8 L829.8 31.2 L832.8 32.3 L834.8 34.3 L838.3 35.1 L840.5 34.5 L844.1 34.4 L848.7 35 L852.3 34.7 L858.9 37.1 L860.5 36.2 L856.7 34.5 L856.1 33.3 L863.7 34 L867.9 33.9 L875.6 35.2 L880 36.3 L893.5 47.4 L892.1 48.7 L889 48.5 L892.7 50 L896.7 52.3 L898.6 53.1 L900.2 54.3 L900.5 55 L895.6 54.4 L891.7 56.6 L890.1 56.9 L888.8 59 L887.3 60.8 L887.8 62.1 L882.5 60.1 L878.9 62.4 L876.8 61.3 L875.8 62.5 L872.4 62.1 L873.5 64.1 L873.4 66.9 L874.6 68.1 L877.8 68.8 L881.4 73.1 L879.3 73.3 L880.5 75.8 L882.6 77.1 L879.8 78.6 L881.8 82.1 L878.9 82.9 L880.6 86 L879.3 88.9 L876.8 86.7 L872.3 82.3 L865.5 75.5 L863.2 71.3 L863.6 69.5 L862.5 68.1 L865.5 67.5 L866.2 63.8 L867.3 60.7 L869.1 58.4 L866.8 54.3 L864.3 54.6 L865.3 57 L862.7 60.1 L857.4 56.6 L852.6 57.6 L851.4 62.5 L855 64.3 L850.5 65 L847.2 65.3 L845.5 63.2 L841.6 62.8 L840 64.2 L832.6 63.7 L825.8 64.6 L822.9 70.4 L819.2 77.5 L823.2 77.9 L825.7 79.8 L828.5 80.4 L828.9 78.9 L831.7 79.1 L837.5 82.5 L839.4 85.1 L839.6 88.2 L841.9 91.9 L844 96.9 L843 101.4 L843.5 103.6 L842.2 107.3 L840.8 110.9 L840.2 112.8 L837.8 114.7 L836.2 114.7 L833.8 113.2 L831.6 115.5 L831.7 116.6 L831.1 116 L830.3 114.4 L831.5 114.3 L830 110.5 L827.9 107.8 L829.4 106.7 L832.8 107.3 L832.8 104.2 L831.7 100.7 L831.9 99.6 L831.6 96.8 L828 97.7 L826.6 98.9 L822.9 98.9 L820.2 96 L816 93.7 L811.1 92.8 L808.4 89.7 L806.4 87.8 L804.7 86.5 L801.3 83.4 L798.5 82.2 L794.4 81.3 L791.3 81.4 L788.6 82 L787.6 83.5 L789.3 84.2 L790.4 85.9 L789.6 86.9 L789.3 90.2 L790.1 91.6 L787.7 93.5 L784.2 92.4 L781.4 92.6 L779.6 91.6 L777.9 91.2 L775.5 93.4 L772.6 93.9 L770.7 94.7 L767.4 94.2 L765.1 94.2 L762.9 92.6 L759.7 91.2 L757.1 90.7 L754.2 91.1 L752.2 91.7 L748.1 90.4 L746.5 88.1 L743.3 87.3 L740.9 86.9 L737.6 85.7 L736.7 88.9 L738.5 90.7 L737.1 92.9 L733.2 92.1 L730.8 92 L728.5 90.5 L725.9 90.5 L723.4 89.5 L720.4 91 L716.8 93.7 L714.5 94.2 L713.6 94.5 L711.6 92.5 L708.6 93 L707 91.6 L705.1 91 L703.2 89.2 L701.6 88.7 L698.5 89.5 L694.5 87.7 L693.8 89.3 L685.4 81.5 L681.4 79.1 L681.9 78.2 L677.1 81.1 L674.9 81.2 L674.4 79.6 L671 78.5 L668.8 79.3 L666.9 76.1 L662.4 75.5 L660.8 76.7 L655.2 77.9 L654.3 78.6 L645.8 79.7 L645.1 80.7 L647.4 82.8 L645.4 83.6 L646.1 84.4 L644.2 85.9 L648.8 88.1 L648.6 89.5 L645.1 89.4 L644.7 90.3 L641.1 88.7 L637.3 88.8 L635.1 90.1 L631.9 88.8 L626 86.7 L622.3 86.8 L618.1 90.1 L618.3 92.4 L615.4 90.6 L614.2 94 L615.1 94.6 L614.2 97 L616.7 99.1 L618.5 99.1 L620.5 101.2 L620.6 102.8 L622 103.3 L621.2 105.2 L618.9 105.7 L617 109 L619.9 112 L620 114.1 L623.5 117.9 L622.2 119.2 L621.9 120 L620.7 119.8 L618.6 117.8 L617.9 117.7 L616.2 117 L615.2 115.7 L612.7 115 L611.3 115.5 L607 113.4 L603.2 112.9 L601 112.3 L597.1 110 L594.1 108.8 L591.7 106.9 L593.4 106.4 L595 103.8 L593.5 102.5 L596.9 101.3 L596.7 100.6 L594.6 101.1 L594.4 99.7 L595.6 98.8 L597.9 98.6 L598.1 97.5 L597.3 95.8 L598 94.2 L597.8 93.2 L594 92.2 L592.6 92.3 L590.8 90.8 L589 91.3 L585.8 90.2 L585.7 89.6 L584.6 88.3 L582.7 88.1 L582.3 87.2 L582.8 86.5 L581 84.8 L578.5 85.1 L577.8 84.9 L577.3 85.6 L576.4 85.5 L575.5 83.5 L574.8 82.5 L577.1 82.3 L577.9 81.7 L577.1 80.9 L575.4 80.3 L574.4 79.2 L572.6 77.2 L573 76.4 L572.5 75 L570.1 74.3 L568.9 74.6 L568.5 73.9 L565.9 73.1 L564.9 71.3 L564.5 69.9 L563.2 69.2 L564.1 68.3 L563 65.5 L564.3 63.8 L566.2 61.7 L563.6 60.3 L567.8 56.6 L569.5 54.9 L570.1 53.4 L566.4 51.5 L567 49.6 L564.6 47.5 L565.6 45.1 L562.5 41.9 L564 39.8 L560.4 38 L560.3 36.1 L562 35.8 L565.3 34.7 L567.3 33.8 L571.1 35.4 L577 36.1 L585.9 39.2 L587.9 40.5 L588.5 42.3 L586.5 43.8 L583.2 44.5 L573 42.4 L571.5 42.8 L575.5 44.8 L575.9 46.1 L576.7 49 L579.8 49.9 L581.7 50.6 L581.6 49.2 L580 48 L581.2 46.9 L586.9 48.7 L588.5 48 L586.5 46 L590.8 43.2 L592.9 43.4 L595.2 44.3 L595.9 42.4 L593.6 40.8 L594.1 39.1 L592.1 37.4 L598.3 38.3 L600 39.8 L597.4 40.2 L597.9 41.7 L599.9 42.7 L603 42.1 L602.9 40.3 L607 39 L613.5 36.6 L615.2 36.8 L613.7 38.4 L616.4 38.7 L617.6 37.8 L621.6 37.7 L624.2 36.6 L627.3 38.2 L629 36.4 L626.1 34.8 L626.8 33.9 L633.4 34.8 L636.7 35.6 L645.8 38.7 L646.5 37.3 L643.7 35.8 L640.7 35 L640.7 33.7 L638.6 31.6 L638.1 30.8 L640.7 28.3 L640.8 26 L642.1 25.4 L647.8 26.1 L649.1 27.6 L648.3 29.7 L650 30.6 L651.7 32.5 L653.1 36.2 L656.3 37.9 L656.3 39.7 L654 43.6 L656.7 44.1 L657.1 43.1 L659.1 42.3 L659 41 L660.2 39.6 L658.1 38.1 L658.2 36.3 L655.7 36 L654.4 34.5 L654.7 31.8 L650.8 29.6 L653.5 27.9 L652 26 L652.9 25.9 L654.8 27.4 L655.5 29.9 L658 30.4 L655.9 28.5 L658.8 27.5 L662.9 27.3 L667.6 28.8 L664.5 26.6 L662.5 23.9 L665.7 23.3 L670.6 23.4 L674.8 23.1 L672.2 21.8 L673.3 20.1 L675.6 20 L678.5 18.8 L683.4 18.4 L683.5 17.7 L688.5 17.5 L690.6 18.1 L693.9 16.7 L697.5 16.8 L697.1 15.7 L698 14.7 L701.7 13.7 L705.7 14.5 L703.7 15.1 L708.4 15.4ZM701.6 12.2 L691.7 13.1 L692.1 10 L693.4 9.8 L695 9.9 L701.2 11.3 L701.6 12.2ZM595.4 7.1 L593 7.3 L591.4 7.5 L589.4 8.3 L587.1 7.7 L587.8 7 L583.6 7 L587 6.6 L589.8 6.5 L590.5 7.1 L591.3 6.6 L592.9 6.2 L595.9 6.7ZM690.4 10.9 L686.6 11.2 L680.6 10.5 L676.6 9.6 L673.5 8 L670.5 7.5 L673.8 6 L677.2 5.5 L682.1 6.6 L688.8 8.8 L690.4 10.9Z",720.4,59.4],["RWA","Rwanda","M584.5 256.3 L585.6 258.1 L585.4 260 L584.6 260.4 L583.1 260.2 L582.3 262.1 L580.6 261.8 L580.9 260 L581.4 257.9 L582.2 257 L584.5 256.3Z",583.1,259.1],["ESH","Sahara occidental","M476.4 165.3 L476.4 163.5 L476.7 164.4 L476.6 169.3 L467.8 169.1 L467.7 177.4 L465.1 177.7 L464.4 179.3 L464.9 184 L454.2 184 L453.6 185.1 L453.7 183.7 L459.9 183.5 L460.3 182.3 L461.4 180.8 L462.4 176.4 L466.3 172.9 L467.6 168.8 L468.5 168.6 L469.4 166 L471.7 165.7 L472.7 166.1 L473.9 166.1 L474.8 165.4 L476.4 165.3Z",467.2,174.5],["SAU","Arabie saoudite","M617.4 200.1 L616.9 198.7 L616 197.7 L615.7 196.4 L614.3 195.3 L612.6 192.6 L611.7 190 L609.7 187.7 L608.4 187.2 L606.4 184.1 L605.9 181.9 L605.9 180 L604.1 176.4 L602.7 175.1 L601.2 174.4 L600.2 172.6 L600.3 171.9 L599.4 170.2 L598.6 169.5 L597.3 167.1 L595.5 164.4 L593.9 162.2 L592.6 162.2 L592.9 160.5 L592.9 159.3 L593.1 158 L596.1 158.6 L597.2 157.6 L597.7 156.4 L599.7 155.9 L600.1 154.9 L600.9 154.3 L597.9 151.1 L603.1 149.4 L606.8 149.8 L611 152.1 L619.2 158.6 L624.2 158.9 L626.6 159.2 L627.4 160.7 L629.3 160.6 L630.7 163.4 L632.1 164.2 L632.6 165.3 L634.6 166.7 L634.9 168 L634.8 169.1 L635.2 170.2 L636.1 171.1 L636.6 172.1 L637.1 172.9 L638 173.6 L638.7 173.3 L639.3 174.6 L639.5 175.3 L640.9 178.6 L649.2 180.2 L649.6 179.5 L651.1 181.8 L649.9 188.3 L642 191.5 L634.2 192.8 L631.8 194.2 L630.1 197.6 L628.8 198.1 L628.1 197.1 L627 197.2 L624.3 196.9 L620.7 196.7 L619.9 196.9 L618.8 196.1 L618.1 197.7 L618.5 199.1 L617.4 200.1Z",620.3,175.1],["SDN","Soudan","M594 222.3 L593.6 220.6 L593.2 219.5 L591.8 218.2 L591.3 215.9 L591.6 213.5 L590.3 213.3 L590.2 214 L588.5 214.2 L589.2 215.1 L589.5 217.1 L588 218.8 L586.7 221.1 L585.3 221.5 L582.9 219.6 L581.9 220.3 L581.6 221.2 L580.2 221.8 L580.1 222.5 L577.4 222.5 L577 221.8 L575 221.7 L574 222.2 L573.2 222 L571.8 220.1 L571.3 219.2 L569.3 219.6 L568.6 221.1 L567.9 224 L567 224.6 L566.1 225 L564.9 223.9 L564.7 222.9 L565.2 221.6 L565.1 220.2 L563.5 218.2 L563.1 216.9 L563.2 216.1 L562.1 215.1 L562.1 213.3 L561.5 212 L560.5 212.2 L560.7 211 L561.4 209.7 L561.1 208.3 L562 207.4 L561.4 206.6 L562 204.6 L563.2 202.2 L565.6 202.5 L565 189.7 L565 188.3 L568.1 188.3 L567.9 181.8 L578.8 181.8 L589.3 181.8 L600.1 181.8 L601.2 185 L600.6 185.6 L601.2 188.9 L602.4 192.8 L603.5 193.6 L605.1 194.8 L603.8 196.6 L601.8 197.1 L601 198.1 L600.8 200.3 L599.9 205 L600.2 206.3 L599.9 209.1 L598.9 212.2 L597.3 213.8 L596.2 216.3 L595.9 217.6 L594.7 218.5 L593.9 221.9Z",581.9,201.3],["SSD","Soudan du Sud","M594 222.3 L594 224.8 L593.7 225.7 L592.2 225.8 L591.3 227.7 L593 227.9 L594.4 229.5 L594.9 230.7 L596.2 231.5 L597.9 235 L596.1 237.1 L594.4 239 L592.7 240.5 L590.7 240.5 L588.5 241.2 L586.7 240.5 L585.6 241.4 L583.1 239.3 L582.5 237.9 L580.9 238.6 L579.6 238.4 L578.9 238.9 L577.7 238.5 L575.9 235.9 L575.5 234.8 L573.4 233.6 L572.7 231.6 L571.5 230.2 L569.6 228.6 L569.6 227.5 L568 226.2 L566.1 225 L567 224.6 L567.9 224 L568.6 221.1 L569.3 219.6 L571.3 219.2 L571.8 220.1 L573.2 222 L574 222.2 L575 221.7 L577 221.8 L577.4 222.5 L580.1 222.5 L580.2 221.8 L581.6 221.2 L581.9 220.3 L582.9 219.6 L585.3 221.5 L586.7 221.1 L588 218.8 L589.5 217.1 L589.2 215.1 L588.5 214.2 L590.2 214 L590.3 213.3 L591.6 213.5 L591.3 215.9 L591.8 218.2 L593.2 219.5 L593.6 220.6 L593.6 222.2Z",583.7,229.2],["SEN","Sénégal","M454 209 L452.9 206.4 L451.5 205.3 L452.8 204.7 L454.1 202.4 L454.8 200.8 L455.8 199.7 L457.1 200 L458.5 199.3 L460 199.3 L461.3 200.2 L463.1 201.1 L464.7 203.5 L466.5 205.7 L466.6 207.7 L467.1 209.5 L468.2 210.4 L468.4 211.7 L468.2 212.7 L466.3 212.6 L465.5 213 L463.6 212.2 L462.2 212.2 L457.1 212.1 L456.4 212.4 L455.5 212.3 L454 212.9 L453.6 210.4 L456.1 210.5 L456.8 210 L458.3 209.2 L459.5 209.9 L460.7 210 L461.9 209.2 L461.3 208.3 L460.4 208.9 L459.6 208.8 L458.5 208 L457.6 208.1 L457 208.9 L454 209Z",460.1,206.5],["SLB","Îles Salomon","M948 286.4 L948.7 287.5 L946.7 287.5 L945.9 285.5 L947.5 286.3ZM944.8 284.4 L943.7 284.5 L942.1 284.2 L941.5 283.7 L941.9 282.4 L943.6 282.9 L944.4 283.6 L944.8 284.4ZM947.2 283.5 L946.7 284.1 L945 281.3 L944.6 279.4 L945.6 279.4 L946.3 282 L947.2 283.5ZM942.7 279.5 L942.7 280.1 L940.7 278.8 L939.3 277.6 L938.4 276.5 L940 277 L942.1 278.5 L942.7 279.5ZM936.5 276.3 L935.9 276.5 L934.8 275.7 L933.8 274.4 L935.5 275.2 L936.5 276.3Z",940.7,278.1],["SLE","Sierra Leone","M468.3 230.9 L467.5 230.6 L465.6 229.3 L464.1 227.6 L463.7 226.4 L463.3 224.1 L464.8 222.6 L465.2 221.8 L465.6 221.1 L466.4 221 L467.1 220.4 L469.3 220.4 L470 221.5 L470.6 222.9 L470.5 223.8 L471 224.7 L470.9 225.8 L471.7 225.7 L470.4 227.2 L469.1 228.9 L469 229.8 L468.3 230.9Z",467.3,225.3],["SLV","Salvador","M258.2 209.6 L257.8 210.4 L256.2 210.3 L255.2 210 L254.2 209.4 L252.6 209.2 L251.9 208.5 L253.1 207.2 L253.5 206.5 L254.2 206.3 L255 206.6 L256.3 207.7 L257.6 207.8 L258.5 208.3 L258.2 209.6Z",255.3,208.5],["-99","Somaliland","M635.4 222.3 L634.2 224.3 L632.4 227 L630 227 L620.9 223.2 L619.8 222 L618.7 220.5 L617.6 218.7 L618.2 217.5 L619.1 215.8 L620 216.4 L620.6 217.7 L621.9 219.1 L623.3 219.1 L625.9 218.3 L628.9 217.9 L631.3 216.9 L632.6 216.7 L633.6 216.1 L635.1 216 L635.2 217.4 L635.3 220.6 L635.4 222.3Z",627.8,221.3],["SOM","Somalie","M637.3 215.4 L638.7 215.1 L640 214 L641 214 L641.1 214.9 L641 216.8 L641 218.5 L640.5 219.6 L639.9 223.1 L638.7 226.7 L637.1 230.8 L634.8 235.5 L632.5 239.1 L629.3 243.5 L626.5 246.1 L622.4 249.3 L619.8 251.7 L616.8 255.6 L616.1 257.3 L615.5 258.1 L613.9 255.4 L613.8 243.7 L616.2 240.1 L616.9 239.1 L618.7 239 L621.1 236.7 L624.8 236.6 L632.4 227 L634.2 224.3 L635.4 222.3 L635.3 220.6 L635.2 217.4 L635.1 216 L636 215.9 L637.3 215.4Z",626.8,237.4],["SRB","Serbie","M552.1 106.4 L553.7 107.1 L554 108.4 L555.6 109.4 L556.3 108.7 L556.9 109.1 L556.9 110.1 L556.4 110.9 L556.7 112 L558 113.4 L557.2 114.4 L556.8 115.4 L556.7 116.2 L555.6 116.3 L554.7 116.5 L555.1 115.1 L554.2 114.5 L553.4 113.9 L552.5 113.2 L551.8 114.4 L550.4 113.7 L549.6 113.4 L548.4 112.4 L549 112.3 L549.3 110.8 L548 109.5 L548.5 108.2 L547.6 108.2 L548.5 107 L547.6 106.1 L546.9 104.8 L548.7 104 L550.3 104.1 L551.8 105.4 L552.1 106.4Z",552.3,110.2],["SUR","Suriname","M341.5 233.5 L344.8 234.1 L347.4 233.3 L350.3 234.2 L348.8 236.9 L349 239.1 L350.1 241 L349.6 242.4 L349.3 243.9 L348.6 245.2 L347 244.6 L345.7 244.9 L344.6 244.6 L344.3 245.5 L344.7 246.2 L344.5 246.8 L343 246.6 L341.3 243.8 L341 242 L340.1 242 L338.9 239.6 L339.4 238 L339.3 237.2 L341 236.4 L341.5 233.5Z",344.8,239.4],["SVK","Slovaquie","M546 93.6 L547.1 93.3 L548.5 94.4 L549.9 93.8 L551 94.1 L552.8 93.7 L555.2 94.9 L554.6 95.7 L554.2 96.9 L551 96.3 L550.2 96.5 L549.7 97.2 L548.6 97.6 L547.2 97.9 L546.2 98 L544 99 L543.1 98.7 L541.8 97.9 L541.5 96.8 L541.9 95.7 L543 95.7 L543.8 95.4 L544.4 94.3 L545 94.1 L546 93.6Z",547.8,96.0],["SVN","Slovénie","M534.3 102.9 L536.3 103.2 L537.5 102.5 L539.7 102.4 L540.6 101.9 L541.1 103 L539.2 103.8 L539 105.1 L538.2 105.4 L538.3 106.3 L537.3 106.2 L536.4 105.7 L534.2 106.1 L534.1 104.5 L534.3 102.9Z",537.2,104.2],["SWE","Suède","M548.2 45.3 L546.4 47.3 L546.9 49 L543.7 51.3 L539.7 53.8 L538.5 57.8 L540.4 59.9 L542.7 61.5 L541 64.8 L538.7 65.5 L538.2 70.5 L537.2 73.3 L534.3 73 L533.2 75.4 L530.4 75.6 L529.5 72.7 L527.3 69.3 L525.3 65.1 L526.2 63.4 L528 61.4 L528.4 58 L526.9 56.5 L526.5 52.7 L527.7 50 L529.9 50 L530.6 48.9 L529.7 48 L532.7 44 L534.5 40.9 L535.7 38.9 L537.8 39 L538.1 37.4 L542.2 37.9 L542.2 36.1 L543.5 36 L546.5 37.3 L550.2 39.2 L550.9 43.4 L551.8 44.5 L548.2 45.3ZM539.6 69.5 L538.4 73.1 L538.2 72 L539.6 69.5ZM544.7 67.8 L543.5 68.7 L544 69.5 L543.4 69.7 L542.6 70.8 L541.9 69.8 L541.9 69 L543.1 67.9 L544 67.8 L544.7 67.7ZM546 50.7 L546.1 51.4 L545.9 50.8Z",536.6,54.3],["SWZ","Eswatini","M586.1 338.8 L585.4 340.3 L583.8 340.6 L582.4 338.9 L582.4 337.7 L583.2 336.5 L583.5 335.6 L584.3 335.4 L585.7 335.9 L586 337.4 L586.1 338.8Z",584.3,338.0],["SYR","Syrie","M602 145 L597.2 148.5 L594.2 147.2 L594.2 145.4 L594.7 143.6 L596 142.4 L595.4 141.1 L594.2 140.9 L593.7 138.5 L594.2 137.1 L594.8 136.4 L595.5 135.7 L595.4 133.9 L596.3 134.5 L599.1 133.6 L600.5 134.3 L602.7 134.2 L605.5 133 L606.9 133.1 L609.8 132.6 L608.7 134.6 L607.4 135.4 L607.9 137.8 L607.4 141.7 L602 145Z",600.7,139.8],["TCD","Tchad","M540 211.3 L540.2 209.8 L538.4 209.7 L538.4 207.7 L537.3 206.5 L538.4 202.2 L541.8 199.2 L541.9 195 L542.8 188.4 L543.3 187 L542.2 185.9 L542.1 184.9 L541 184.1 L540.2 179 L542.9 177.3 L553.9 183.5 L565 189.7 L565.6 202.5 L563.2 202.2 L562 204.6 L561.4 206.6 L562 207.4 L561.1 208.3 L561.4 209.7 L560.7 211 L560.5 212.2 L561.5 212 L562.1 213.3 L562.1 215.1 L563.2 216.1 L563.1 216.9 L561.4 217.4 L560 218.7 L558.1 222.2 L555.5 223.7 L552.8 223.5 L552.1 223.8 L552.3 224.9 L550.9 226.1 L549.8 227.3 L546.3 228.5 L545.6 227.8 L544.6 228.6 L542.3 228.8 L542.8 228 L541.9 225.7 L541.5 224.4 L540.3 223.9 L538.6 222 L539.2 220.5 L540.4 220.8 L541.2 220.6 L542.8 220.6 L541.2 217.7 L541.3 215.5 L541.1 213.4 L540 211.3Z",551.0,203.4],["TGO","Togo","M505.2 232.9 L502.9 233.6 L502.3 232.5 L501.6 230.5 L501.4 228.9 L502 226 L501.3 224.8 L501 222.3 L501 219.9 L499.9 218.3 L500.1 217.3 L502.5 217.3 L502.1 219 L503 220 L503.9 221.1 L504 222.7 L504.6 223.3 L504.5 230.7 L505.2 232.9Z",502.8,225.6],["THA","Thaïlande","M783 213.5 L780.4 212 L778 212.1 L778.2 209.5 L775.7 209.6 L775.9 213.1 L774.8 217.8 L774.2 220.6 L774.5 223 L776.3 223.1 L777.7 226 L778.3 228.8 L780 230.6 L781.7 231 L783.2 232.7 L782.4 234 L780.6 234.4 L780.3 232.7 L777.9 231.3 L776.3 230.7 L775.8 229.1 L774.2 227.3 L772.7 225.7 L772.4 227.6 L771.8 225.8 L771.9 223.8 L772.5 220.7 L773.6 217.4 L774.8 214.4 L773.4 211.5 L773.3 210 L772.8 208.2 L770.7 205.6 L769.9 204 L770.7 203.4 L771.4 200.6 L770 198.5 L767.9 196.1 L766.2 193.3 L767.3 192.7 L768 189.2 L769.9 189.1 L771.2 187.7 L772.7 186.9 L774 187.9 L774.5 189.9 L776.4 190 L776.2 193.4 L776.7 196.3 L779.3 194.4 L780.2 195 L781.8 194.9 L782.2 193.8 L784.3 194 L786.8 196.6 L787.4 199.8 L790 202.6 L790.2 205.3 L789.5 206.8 L786.9 206.3 L783.4 206.9 L781.9 209.6 L783 213.5Z",777.5,204.4],["TJK","Tadjikistan","M681.8 122.9 L681.1 123.9 L678.2 123.3 L678.4 125.2 L681.1 124.9 L684.5 126 L689.3 125.5 L690.6 128.5 L691.4 128.2 L693.2 128.9 L693.4 130.1 L694.2 132 L691.6 132 L689.7 131.7 L688.4 133.2 L687.4 133.5 L686.6 134.2 L685.3 133.1 L685 130.4 L684.1 130.3 L684.2 129.3 L682.6 128.5 L681.8 129.7 L681.8 131 L679.9 131.4 L679.4 132.8 L678.4 132.2 L676.8 133.3 L675.9 132.9 L676.6 129.6 L675.5 127.2 L673.5 126.4 L673.8 125 L676 125.2 L676.8 123.4 L677.1 121.3 L680.3 120.6 L680.1 122.1 L680.7 123 L681.8 122.9Z",683.1,128.2],["TKM","Turkménistan","M659.7 137.7 L658.9 135 L657 134.9 L653.4 132 L651.3 131.6 L648.1 130 L646.2 129.7 L645.2 130.3 L643.5 130.2 L642 132.1 L639.8 132.7 L638.9 130.4 L638.7 127 L636.5 126 L636.7 123.8 L635 123.6 L635.1 120.9 L637.6 121.7 L639.7 120.6 L637.4 118.7 L636.3 116.9 L634.5 117.7 L634.6 120 L633.5 118 L634.4 116.9 L637.1 116.2 L639 117.1 L641.3 119.6 L642.6 119.5 L645.4 119.4 L644.7 117.8 L646.6 116.7 L648.3 114.9 L652.1 116.6 L653 119.1 L654.1 119.8 L656.8 119.6 L657.8 120.2 L659.8 123.5 L663.2 125.7 L665.2 127.2 L668.3 128.8 L672 130.2 L672.3 132.2 L671.5 132.1 L670.1 131.2 L670 132.3 L667.9 133 L667.9 135.5 L666.7 136.5 L664.7 137 L664.4 138.5 L662.5 138.9 L659.7 137.7Z",652.5,126.6],["TLS","Timor oriental","M845.9 281.3 L846.3 280.5 L848.7 279.8 L850.6 279.7 L851.5 279.3 L852.6 279.7 L851.5 280.5 L848.5 281.9 L846 282.9 L846.1 281.9Z",848.7,280.9],["TTO","Trinité-et-Tobago","M329.6 218.1 L331.2 217.7 L331.8 217.8 L331.5 220.2 L329.2 220.5 L329.6 219.4 L329.6 218.1Z",330.5,219.2],["TUN","Tunisie","M525.2 155 L523.9 149.2 L522.3 147.8 L522.2 147.1 L520 145.1 L519.7 142.7 L521.3 140.9 L521.9 138.2 L521.4 135.2 L521.9 133.5 L524.6 132.2 L526.5 132.6 L526.4 134.2 L528.6 133 L528.8 133.7 L527.6 135.2 L527.6 136.7 L528.5 137.5 L528.3 140.3 L526.6 141.9 L527.2 143.7 L528.5 143.8 L529.2 145.3 L530.2 145.8 L530.2 148.3 L528.9 149.2 L528.1 150.3 L526.3 151.5 L526.7 152.8 L526.5 154.2 L525.2 155Z",525.0,142.5],["TUR","Turquie","M594 119.4 L597.8 120.6 L600.7 120.1 L603 120.4 L605.7 118.8 L608.4 118.6 L611.1 120.2 L611.7 121.3 L611.7 122.9 L613.8 123.7 L614.9 124.6 L613.3 125.5 L614.7 129.2 L614.3 130.2 L616.1 132.8 L614.9 133.3 L613.9 132.5 L610.8 132.1 L609.8 132.6 L606.9 133.1 L605.5 133 L602.7 134.2 L600.5 134.3 L599.1 133.6 L596.3 134.5 L595.4 133.9 L595.5 135.7 L594.8 136.4 L594.2 137.1 L593.1 135.7 L594 134.5 L592.4 134.7 L590.1 134 L588.6 135.8 L584.6 136.2 L582.4 134.5 L579.6 134.4 L579.1 135.7 L577.3 136.1 L574.6 134.4 L571.8 134.4 L570 131.2 L568 129.4 L569 126.9 L567.2 125.4 L569.8 122.3 L573.7 122.2 L574.5 119.8 L579.4 120.2 L582.2 118.1 L585.1 117.2 L589.3 117.1 L594 119.4ZM569.5 121.5 L567.5 123.2 L566.6 121.7 L566.5 121 L567.1 120.7 L567.7 118.7 L566.4 117.8 L568.9 116.8 L571.1 117.2 L571.5 118.5 L573.8 119.5 L573.5 120.3 L570.5 120.5 L569.5 121.5Z",591.1,127.0],["TWN","Taïwan","M828.8 174.1 L828.4 179.3 L827.8 181.9 L825.8 179.2 L824.9 176.8 L825.8 173.6 L827.3 171.2 L828.8 172.1 L828.8 174.1Z",827.1,176.2],["TZA","Tanzanie","M594.2 255.7 L604.7 262.6 L604.8 264.5 L608.8 267.7 L607.4 271.7 L607.6 273.5 L609.3 274.7 L609.4 275.5 L608.6 277.4 L608.7 278.4 L608.5 280 L609.4 282 L610.4 285.1 L611.4 285.8 L609.2 287.7 L606.1 289 L604.5 288.9 L603.4 289.9 L601.5 290 L600.8 290.4 L597.5 289.5 L595.4 289.7 L594.8 285.3 L593.9 283.8 L593.3 283 L590.6 282.4 L589.1 281.4 L587.3 280.8 L586.3 280.3 L585.1 279.5 L583.7 275.4 L582.1 273.6 L581.6 271.8 L581.9 270.1 L581.4 267.1 L582.6 267 L583.6 265.8 L584.7 264.1 L585.4 263.5 L585.4 262.4 L584.8 261.7 L584.6 260.4 L585.4 260 L585.6 258.1 L584.5 256.3 L585.5 255.9 L588.5 256 L594.2 255.7Z",596.3,272.8],["UGA","Ouganda","M588.5 256 L585.5 255.9 L584.5 256.3 L582.8 257.3 L582.2 254.6 L582.8 253.3 L583 250.8 L583.6 249.3 L584.6 247.6 L585.7 246.7 L586.6 245.6 L585.5 245.2 L585.6 241.4 L586.7 240.5 L588.5 241.2 L590.7 240.5 L592.7 240.5 L594.4 239 L595.7 241.3 L596.1 242.9 L597.3 246.6 L596.3 248.9 L594.9 251 L594.1 252.3 L594.2 255.7 L588.5 256Z",589.9,248.5],["UKR","Ukraine","M576.4 85.5 L577.3 85.6 L577.8 84.9 L578.5 85.1 L581 84.8 L582.8 86.5 L582.3 87.2 L582.7 88.1 L584.6 88.3 L585.7 89.6 L585.8 90.2 L589 91.3 L590.8 90.8 L592.6 92.3 L594 92.2 L597.8 93.2 L598 94.2 L597.3 95.8 L598.1 97.5 L597.9 98.6 L595.6 98.8 L594.4 99.7 L594.6 101.1 L592.6 101.3 L591.2 102.3 L588.9 102.5 L586.9 103.7 L587.3 105.7 L588.7 106.4 L591.2 106.2 L590.9 107.4 L588.2 107.9 L585.1 109.7 L583.6 109.1 L583.9 107.6 L581.1 106.7 L581.4 106.1 L583.7 105 L582.9 104.3 L578.9 103.5 L578.5 102.3 L576.3 102.7 L575.6 104.4 L574 106.8 L572.8 106.2 L571.6 106.8 L570.5 106.2 L571.1 105.8 L571.4 104.7 L571.9 103.7 L572.2 102.9 L573.9 103.4 L574.6 103.2 L574.2 102.4 L573.2 101.6 L572.7 100.3 L571.7 99.8 L571.8 98.7 L570.5 97.9 L569.5 97.8 L567.6 96.8 L566 97.1 L564.4 97.6 L563.9 98.3 L562.1 98.6 L561.3 99.1 L560.1 98.3 L558.5 98.3 L556.9 98 L556 98.6 L555.7 97.8 L554.2 96.9 L554.6 95.7 L555.2 94.9 L555 93.6 L556.9 91 L558.1 90.7 L558.2 89.8 L556.7 87.1 L557.9 87 L559.1 86.2 L560.9 86.1 L563.4 86.3 L566.2 87.1 L568.1 87.1 L569.1 87.6 L569.9 87 L570.6 87.8 L572.8 87.6 L573.8 87.9 L573.7 86.4 L574.3 85.7 L576.4 85.5Z",576.9,95.3],["URY","Uruguay","M346.9 350.1 L348.5 349.8 L351.6 352.3 L352.5 352.2 L355.6 354.2 L357.9 356 L359.8 358.2 L358.8 359.8 L359.8 361.6 L359 363.6 L356.3 365.4 L354.3 364.8 L352.9 365.1 L350.3 363.7 L348.5 363.8 L346.6 362 L346.5 360 L346.9 359.2 L346.4 356 L346.6 352.7 L346.9 350.1Z",352.4,358.4],["USA","États-Unis","M75.3 191.3 L74.2 191.3 L74.5 190.4 L74.3 189.3 L75.2 188.4 L75.1 187.7 L76.5 188 L77.2 188.8 L77.6 189.9 L76.3 190.8 L75.3 191.3ZM75.1 186.2 L74.1 186.5 L73.8 185.8 L74 185 L74.8 185.3 L75.4 185.8ZM73.7 184.5 L72.1 184.8 L73.7 184.5ZM71.4 184 L70.1 184.1 L70 183.3 L70.7 182.8 L71.4 184ZM67.4 181.9 L66.2 181.6 L67 181.1 L67.4 181.9ZM268.4 93.9 L268.1 95.6 L268.6 96.2 L270.3 96.3 L272.6 96.8 L274.5 97.8 L276.7 97.4 L279.4 98.2 L280.2 98.2 L282.8 97.3 L284.6 98.4 L286.6 99.7 L288.2 100.7 L289.7 101.7 L289.7 102.5 L289.9 103.2 L290.5 103.3 L291.1 102.9 L291 103.7 L292 104.2 L291.7 105.1 L293.8 106.6 L293.4 109.5 L293 112.3 L291.7 114.1 L289.9 115.9 L289 117 L289 117.8 L289.7 118.3 L290.3 118.3 L293.8 116.6 L296.6 116.1 L300.4 114.5 L300.6 113.2 L300.4 112.6 L301.7 112.1 L304.1 112.1 L306.5 112.1 L307.6 110.8 L311.4 108.3 L312.7 107.7 L316.5 107.7 L321.1 107.7 L321.6 106.9 L322.4 106.7 L323.6 106.3 L324.9 104.8 L326.4 102.4 L329 100 L329.6 100.8 L331.4 100.3 L332.2 101.2 L331 105.5 L332.1 107.3 L332.3 108.3 L329.2 109.9 L326.3 111 L323.4 111.9 L321.5 113.8 L320.9 114.5 L320.4 116.2 L320.8 117.9 L321.9 118 L321.9 116.8 L322.5 117.5 L322 118.4 L320.2 118.9 L319 118.9 L317 119.4 L315.8 119.6 L314.3 119.8 L311.9 120.7 L315.8 120.1 L316.4 120.7 L312.6 121.7 L311 121.7 L310.1 122.2 L310.8 122.3 L309.7 124.6 L307.2 127.1 L307.2 126.3 L306 125.3 L306.1 127 L306.4 128.8 L305.2 130.1 L303.1 132.6 L304.3 130.3 L303.3 129.1 L303.6 126.4 L302.8 127.8 L302.8 129.8 L301.2 129.3 L302.8 130.4 L302.1 133.4 L302.8 133.7 L302.8 134.8 L302.4 138 L300.2 140.4 L297.3 141.4 L295.1 143.3 L293.8 143.5 L292.2 144.7 L291.5 145.7 L288.2 147.8 L286.4 149.4 L284.7 151.3 L283.8 153.6 L283.8 155.8 L284.1 158.6 L284.9 160.9 L284.6 162.3 L285.2 166.1 L284.7 168.2 L284.4 169.5 L283.4 171.5 L282.5 171.9 L281.3 171.5 L281.1 170.1 L280.2 169.3 L279.3 166.5 L278.5 164.1 L278.3 162.8 L279.3 160.6 L278.9 158.9 L277.4 156.2 L276.4 155.7 L273.4 157.1 L272 155.5 L270.5 154.7 L267.4 155.1 L265.2 154.7 L263.1 154.9 L261.9 155.4 L262.2 156.3 L261.8 157.6 L261.7 158.7 L260.8 158.2 L259.6 158.8 L257.7 158.7 L256.1 157 L253.7 157.4 L251.9 156.7 L250.2 156.9 L247.8 157.6 L244.8 160 L241.9 161.4 L240.1 163 L239.1 164.4 L238.6 166.7 L238.4 168.2 L238.7 169.3 L237.6 169.4 L235.9 168.7 L234 167.7 L233.6 166.2 L233.5 163.9 L232.3 162.1 L231.8 160.2 L231 158 L229.5 156.7 L227.3 156.7 L225 159.3 L223 158.3 L221.9 157.3 L221.7 155.6 L221.3 153.9 L220.1 152.4 L219 151.4 L218.4 150.3 L213.8 150.3 L213.4 151.6 L211.3 151.6 L206 151.6 L200.7 149.4 L197.2 147.8 L197.6 147.2 L194.2 147.5 L191.1 147.8 L191.2 146.1 L190.1 144.2 L189 143.9 L189 142.9 L187.6 142.8 L187 141.9 L184.6 141.6 L184.5 139.3 L183.2 136 L182.7 131.6 L183.1 130.8 L182.4 129.7 L181.5 127 L182.3 124.4 L181.7 122.7 L183.4 120 L184.6 117.3 L184.9 114.8 L187.3 111.8 L189.1 108.9 L190.8 106.1 L192.6 101.8 L193.2 99.1 L193.3 97.7 L194 97.1 L196.9 98.1 L196.7 101.1 L197.7 100.3 L198.7 97.7 L199.3 95.1 L206.2 95.1 L213.5 95.1 L215.9 95.1 L223.4 95.1 L230.6 95.1 L237.9 95.1 L245.3 95.1 L253.6 95.1 L262 95.1 L267 95.1 L267.6 93.9 L268.4 93.9ZM144.5 70.3 L141.2 71.4 L140.7 70.6 L141.5 69.2 L144.5 68.2 L146.1 67.7 L147.5 67.9 L147.7 68.9 L144.5 70.3ZM123.1 62 L121.3 62.5 L120.3 61.9 L119.7 61.1 L122.4 60.6 L124 60.9 L123.1 62ZM120.9 50.8 L121.6 51.3 L123.3 51.1 L124.3 51.8 L126.1 52.2 L123.3 53.1 L122.2 52.5 L119.8 52.1 L120.9 50.8ZM179.2 30.4 L179.3 31.7 L180.8 31.1 L184.2 31.3 L183.4 31.9 L186 32.4 L188.4 32.1 L191.9 32.9 L195.7 33.2 L196.9 33.6 L200.2 33.1 L202.5 33.9 L204.4 34.3 L194.5 44.5 L180 60.8 L182.2 60.9 L183.7 61.7 L184.3 63 L184.8 65 L188.3 63.3 L191.3 62.4 L191.3 63.9 L191.9 65.1 L193 66.4 L192.9 68.6 L192.8 72 L195.4 73.9 L194.1 75.8 L191.8 77.2 L191.3 76.1 L189.9 75.1 L191.1 72.5 L189.9 70.1 L190.7 67.3 L188.7 67.1 L185 67 L183 66.2 L180.7 63.1 L179 62.5 L175.9 61.5 L172.5 61.7 L169.2 60.4 L167.6 59.2 L164.6 59.8 L163.2 61.8 L161.8 62 L158.6 62.6 L155.8 63.6 L152.7 64.2 L153.9 62.5 L157.5 59.6 L160.7 58.7 L160.7 58 L156.4 59.6 L153.1 61.6 L147.9 63.7 L148.3 65.1 L144.3 67.2 L140.7 68.5 L137.6 69.4 L135.9 70.7 L130.9 72.2 L129 73.6 L125.1 74.9 L123.7 74.7 L120.8 75.5 L117.5 76.6 L114.7 77.6 L109.9 78.5 L113.8 76.5 L116.9 75.6 L120.8 73.9 L124 73.6 L126.2 72.4 L131 70.6 L132.1 70 L134.7 68.9 L137.1 66.7 L139.9 64.9 L136.4 65.8 L133.9 66.4 L133.8 64.9 L132.2 65.9 L132.7 64.5 L129.3 65.7 L127.9 65.7 L129.3 63.9 L130.8 62.8 L130.3 61.8 L126.8 62.3 L126.2 61 L125.3 60.3 L127 58.6 L126.5 57.4 L129 55.7 L132.5 54.1 L134.8 52.6 L136.8 52.4 L137.9 52.9 L141.1 51.5 L142.4 51.7 L145 50.9 L145.9 49.6 L145.2 49 L148 47.9 L146.6 48 L143.6 48.6 L142.3 49.2 L141.2 48.6 L137.8 48.9 L135.3 48.2 L135.6 47.1 L134.7 45.5 L139 44.3 L145.3 42.9 L147.1 42.9 L145.3 44.3 L150 44.2 L150.1 42.5 L148.6 41.4 L148.6 40 L147.9 38.9 L146 38 L148.9 36.6 L152.7 36.5 L156.8 35.2 L158.8 33.9 L162.5 32.6 L164.9 32.3 L170.2 31.1 L171.9 31.3 L176.7 29.9 L179.2 30.4Z",246.2,125.9],["UZB","Ouzbékistan","M672.3 132.2 L672 130.2 L668.3 128.8 L665.2 127.2 L663.2 125.7 L659.8 123.5 L657.8 120.2 L656.8 119.6 L654.1 119.8 L653 119.1 L652.1 116.6 L648.3 114.9 L646.6 116.7 L644.7 117.8 L645.4 119.4 L642.6 119.5 L639.9 107.7 L645.9 105.9 L646.5 106.1 L650.9 108.4 L653.2 109.6 L656.3 112.5 L659.2 112 L663.4 111.8 L667 114.1 L667.7 117.3 L668.9 117.3 L670.1 119.9 L673.3 120 L674.4 121.6 L675.3 121.5 L675.9 119.2 L678.7 117 L680 116.4 L680.8 116.7 L679.2 118.8 L681.4 120 L683 119.2 L686.5 120.9 L683.8 123.2 L681.8 122.9 L680.7 123 L680.1 122.1 L680.3 120.6 L677.1 121.3 L676.8 123.4 L676 125.2 L673.8 125 L673.5 126.4 L675.5 127.2 L676.6 129.6 L675.9 132.9 L673.8 132.2 L672.3 132.2Z",660.8,118.2],["VEN","Venezuela","M303.1 214.8 L303 215.6 L301.4 215.9 L302.2 217.4 L302 219.1 L300.7 221 L301.6 223.5 L302.8 223.3 L303.6 221 L302.8 219.8 L302.8 217.4 L306.3 216.1 L306 214.6 L307 213.6 L307.9 215.8 L309.8 215.9 L311.5 217.7 L311.5 218.7 L314 218.8 L317 218.4 L318.5 219.9 L320.6 220.3 L322.2 219.3 L322.3 218.5 L325.7 218.3 L329 218.2 L326.6 219.2 L327.5 220.7 L329.7 220.9 L331.7 222.5 L332 225.1 L333.5 225 L334.5 225.8 L332.3 227.7 L332 228.8 L332.9 230 L332.2 230.6 L330.5 231.2 L330.5 232.6 L329.7 233.5 L331.5 236 L331.9 236.9 L330.8 238.1 L327.7 239.3 L325.7 239.8 L324.9 240.6 L322.7 239.8 L320.6 239.3 L321.3 240.5 L321.2 242.6 L321.5 244.7 L323.9 244.9 L324 245.6 L322 246.5 L321.7 247.9 L320.5 248.4 L318.5 249.2 L317.9 250.1 L315.8 250.4 L314.2 248.7 L313.4 245.4 L312.7 244.3 L311.7 243.6 L313.1 242 L313.1 241.3 L312.3 240.3 L311.8 238.2 L312.1 235.9 L312.7 234.8 L313.3 233.1 L312.3 232.5 L310.7 232.9 L308.7 232.7 L307.6 233.1 L305.7 230.3 L304.1 229.9 L300.6 230.2 L299.9 229.1 L299.2 228.1 L299.6 227 L299.4 225.7 L298.9 225 L298.6 223.5 L297.2 223.3 L298 221.4 L298.5 219.1 L299.4 217.9 L300.5 217 L301.3 215.4 L303.1 214.8Z",316.7,229.7],["VNM","Viêt Nam","M793.6 183.3 L790.5 186 L788.8 189.1 L788.5 191.3 L791.2 194.7 L794.4 199 L797.1 200.9 L799.2 203.5 L801.2 209.5 L801.4 215.2 L799.3 217.3 L796.4 219.4 L794.3 222 L791.1 225 L789.9 223 L790.5 220.8 L788.3 219 L790.6 217.7 L793.5 217.4 L792.1 215.5 L796.5 213 L796.4 209.1 L795.5 207 L795.6 203.8 L794.6 201.5 L792.2 199.3 L790 196.4 L787.2 192.6 L783.6 190.7 L784.2 189.5 L785.8 188.7 L784.2 185.8 L780.9 185.8 L779.1 182.9 L777.1 180.3 L778.4 179.5 L780.6 179.6 L783.1 179.2 L785.1 177.5 L786.6 178.7 L789.2 179.3 L789.2 181.1 L790.7 182.4 L793.6 183.3Z",791.2,199.1],["VUT","Vanuatu","M960.3 305.7 L959.3 306.1 L958.7 304.7 L959 303.8 L960.3 305.7ZM959.4 300.7 L959.3 303.3 L958.6 302.9 L958 303.1 L957.8 302.2 L958.3 299.7 L959.4 300.7Z",958.6,301.6],["PSE","Territoires palestiniens","M593.8 148.2 L594 150.2 L593.7 151.1 L592.5 151.6 L592.5 150.7 L593.1 150.3 L592.5 149.9 L592.8 147.8 L593.8 148.2Z",593.2,149.7],["YEM","Yémen","M645.6 199.1 L643.7 200 L643.3 201.4 L643.3 202.5 L640.6 203.9 L636.3 205.4 L634 207.6 L632.8 207.8 L631.9 207.6 L630.4 209 L628.7 209.6 L626.4 209.8 L625.7 209.9 L625.1 210.8 L624.4 211 L624 211.8 L622.7 211.8 L621.8 212.2 L619.9 212 L619.1 210.2 L619.1 208.4 L618.6 207.4 L617.9 205.1 L617.1 203.7 L617.3 202.1 L617.4 200.1 L618.5 199.1 L618.1 197.7 L618.8 196.1 L619.9 196.9 L620.7 196.7 L623.8 196.6 L627 197.2 L628.1 197.1 L628.8 198.1 L630.1 197.6 L631.8 194.2 L634.2 192.8 L642 191.5 L644.6 196.9 L645.6 199.1Z",630.5,201.5],["ZAF","Afrique du Sud","M584 347 L583.4 347.5 L582.2 349.1 L581.3 350.8 L579.6 353.1 L576.4 356.4 L574.4 358.4 L572.3 359.8 L569.4 361.1 L568.1 361.3 L567.7 362.2 L566.1 361.7 L564.8 362.3 L562 361.7 L560.3 362.1 L559.3 361.9 L556.5 363.2 L554.2 363.7 L552.5 364.9 L551.3 365 L550.3 363.8 L549.4 363.8 L548.3 362.3 L548 360 L547.3 357.9 L548.1 357.3 L548.2 354.8 L546.6 351.7 L545.4 349 L543.6 344.8 L545 343.2 L546 344.1 L546.4 345.5 L547.6 345.7 L549.2 346.3 L550.7 346.1 L553.1 344.4 L553.7 332.5 L554.4 333 L555.8 336 L555.5 338 L556.1 339.1 L558 338.8 L559.4 337.4 L560.7 336.4 L561.5 334.8 L562.8 334.1 L563.9 334.5 L565.2 335.4 L567.3 335.5 L569.1 334.8 L569.4 333.8 L570 332.2 L571.5 332 L572.4 330.8 L573.4 328.6 L575.9 326.2 L579.9 323.8 L581 323.8 L582.3 324.4 L583.2 324 L584.6 324.3 L585.7 328.9 L586.2 331.2 L585.5 334.8 L585.7 335.9 L584.3 335.4 L583.5 335.6 L583.2 336.5 L582.4 337.7 L582.4 338.9 L583.8 340.6 L585.4 340.3 L586.1 338.8 L588.1 338.9 L587.3 341.2 L586.8 343.9 L585.9 345.4 L584 347Z",567.1,346.0],["ZMB","Zambie","M590.6 282.4 L591.9 283.8 L592.5 286.5 L592 287.4 L591.4 290 L591.9 292.7 L590.9 293.8 L590 296.8 L591.4 297.6 L583 300.3 L583.2 302.6 L581.1 303 L579.4 304.3 L579.1 305.4 L578.1 305.7 L575.6 308.3 L574 310.4 L573.1 310.5 L572.2 310.1 L569.1 309.8 L568.7 309.2 L567.6 308.5 L565.8 308.3 L563.6 309.1 L561.8 307 L560.1 304.4 L560.5 294.2 L566.2 294.2 L566 293.1 L566.4 291.9 L566 290.4 L566.3 288.8 L566.1 287.8 L567 287.9 L567.1 288.9 L568.4 288.8 L570.2 289.1 L571.1 290.6 L573.3 291 L575 290 L575.6 291.7 L577.7 292.1 L578.6 293.5 L579.7 295.3 L581.8 295.3 L581.7 291.8 L580.9 292.4 L579 291.2 L578.3 290.6 L578.7 287.4 L579.3 283.6 L578.7 282.1 L579.6 280.1 L580.3 279.7 L584 279.2 L585.1 279.5 L586.3 280.3 L587.3 280.8 L589.1 281.4 L590.6 282.4Z",576.4,295.7],["ZWE","Zimbabwe","M584.6 324.3 L583.2 324 L582.3 324.4 L581 323.8 L579.9 323.8 L578.2 322.4 L576.2 321.9 L575.5 319.8 L575.5 318.7 L574.3 318.3 L571.4 314.8 L570.6 312.9 L569.1 309.8 L572.2 310.1 L573.1 310.5 L574 310.4 L575.6 308.3 L578.1 305.7 L579.1 305.4 L579.4 304.3 L581.1 303 L583.2 302.6 L583.3 303.8 L585.6 303.7 L586.8 304.4 L587.4 305.2 L588.7 305.4 L590.1 306.5 L589.9 310.5 L589.2 312.8 L589 315.2 L589.4 316.1 L589 318 L587.7 320.7 L584.6 324.3Z",581.4,313.5]];
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
  /* ════════════════════════ Voyants du membre ════════════════════════ */
  /* Niveaux : 0 non évalué (gris), 1 vert, 2 jaune, 3 orange, 4 rouge. */
  const NIV_CLS = ["off", "g", "y", "o", "r"];
  const NIV_SANTE = ["Non évalué", "Au vert", "Fragile", "Difficile", "Critique"];
  /* Dimensions de la veille pastorale : modifiables par la direction (Réglages de la veille). */
  const COURT_VEILLE = { physique: "Physique", moral: "Moral", spirituel: "Spirituel", financier: "Finances", professionnel: "Travail", familial: "Famille", relationnel: "Relations" };
  const DIM_VEILLE_DEFAUT = [["physique", "Santé physique"], ["moral", "Moral et émotionnel"], ["spirituel", "Vie spirituelle"], ["financier", "Situation financière"], ["professionnel", "Vie professionnelle ou études"], ["familial", "Famille et couple"], ["relationnel", "Relations et intégration"]];
  DEFAUTS.veilleDims = DIM_VEILLE_DEFAUT.map(([k, l]) => ({ k, l, actif: true }));
  const dimsSante = () => {
    const c = cfg().veilleDims;
    const l = (Array.isArray(c) ? c : []).filter((d) => d && d.k && d.l && d.actif !== false).map((d) => [String(d.k), String(d.l)]);
    return l.length ? l : DIM_VEILLE_DEFAUT;
  };
  /* Tendance d’un voyant : comparaison avec l’évaluation précédente */
  function tendance(s, k, n) {
    if (!s || !s.historique || !n) return 0;
    const h = Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).map(([, x]) => Number(((x || {}).niveaux || {})[k]) || 0).filter((x) => x > 0);
    const prec = h.length > 1 ? h[1] : 0;
    return !prec || prec === n ? 0 : n < prec ? 1 : -1;
  }
  const fleche = (t) => (t > 0 ? `<span class="vy-tend up" title="En amélioration" aria-label="En amélioration">▲</span>` : t < 0 ? `<span class="vy-tend down" title="En dégradation" aria-label="En dégradation">▼</span>` : "");
  const ETAT_GLOBAL = ["Non évalué", "Au vert", "À surveiller", "Préoccupant", "Alerte"];
  const suiviDe = (mid) => (S.suivi || []).find((d) => d.id === mid) || null;
  function implication(m) {
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    const facteurs = [];
    let autres = 0;
    const fonction = String(m.fonction || "").trim();
    const resp = S.garnisons.some((g) => g.responsableId === m.id || g.adjointId === m.id);
    if (fonction || resp) { autres += 15; facteurs.push(resp ? "encadre une garnison" : "exerce une fonction"); }
    const eng = norm(m.statut || "");
    if (/engage|leader|co-leader/.test(eng)) { autres += 15; facteurs.push(m.statut); }
    if (S.pret.formations && formationsDe(m.id).some(({ p }) => p.statut === "Inscrit" || p.statut === "Certifié")) { autres += 10; facteurs.push("en formation à l’Académie"); }
    if (S.pret.chaine && creneauxDe(m.id).length) { autres += 10; facteurs.push("intercesseur de la chaîne"); }
    let score;
    if (s3.taux == null) {
      if (!autres) return { n: 0, score: null, lib: "Données insuffisantes", detail: "Aucun rassemblement pointé depuis trois mois.", facteurs };
      score = Math.round((autres / 50) * 100 * 0.8);
    } else {
      score = Math.round(s3.taux * 50 + autres);
      facteurs.unshift(`${pct(s3.taux)} de présence`);
    }
    const n = score >= 70 ? 1 : score >= 45 ? 2 : score >= 25 ? 3 : 4;
    return { n, score, lib: ["", "Forte", "Moyenne", "Faible", "Très faible"][n], detail: facteurs.join(" · ") || "Présence seule", facteurs };
  }
  function voyantAssiduite(m) {
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    if (s3.taux == null) return { n: 0, lib: "Sans données", detail: "Aucun rassemblement pointé depuis trois mois" };
    const n = s3.taux >= 0.75 ? 1 : s3.taux >= 0.5 ? 2 : s3.taux >= 0.3 ? 3 : 4;
    return { n, lib: pct(s3.taux), detail: `${pluriel(s3.p + s3.r, "présence", "présences")} sur ${nb(s3.n - s3.x)} · 3 mois` };
  }
  function voyantCotis(m) {
    const an = new Date().getFullYear();
    const e = etatCotis(m, an);
    if (e.exempt) return { n: 0, lib: "Exempté", detail: "Exemption de cotisation" };
    if (!e.dus.length) return { n: 0, lib: "Rien de dû", detail: `Aucun mois dû en ${an}` };
    const k = e.retard.length;
    const n = k === 0 ? 1 : k === 1 ? 2 : k === 2 ? 3 : 4;
    return { n, lib: k ? `${k} mois dû${k > 1 ? "s" : ""}` : "À jour", detail: k ? libListeMois(e.retard, an) : `${fcfa(e.verse)} versés en ${an}` };
  }
  function voyantDiscipline(m) {
    const enC = S.discipline.filter((d) => d.membreId === m.id && mesureEnCours(d));
    if (!enC.length) return { n: 1, lib: "Aucune mesure", detail: "Pas de mesure en cours" };
    const grave = enC.some((d) => /suspension/i.test(d.mesure || ""));
    return { n: grave ? 4 : 3, lib: enC.length > 1 ? `${enC.length} mesures` : "Mesure en cours", detail: enC.map((d) => d.mesure || d.motif).filter(Boolean).join(" · ") };
  }
  /* Les voyants calculés peuvent être ajustés à la main par la direction (forçage), puis remis en automatique. */
  const LIB_AUTO = {
    implication: ["", "Forte", "Moyenne", "Faible", "Très faible"],
    assiduite: ["", "Excellente", "Régulière", "Irrégulière", "À relancer"],
    cotis: ["", "À jour", "Léger retard", "Retard", "Retard important"],
    discipline: ["", "Aucune mesure", "Avertissement", "Mesure en cours", "Mesure grave"],
    global: ETAT_GLOBAL,
  };
  const DIM_AUTO = [["implication", "Implication"], ["assiduite", "Assiduité"], ["cotis", "Cotisations"], ["discipline", "Discipline"]];
  function forcage(s, k) {
    const f = s && s.forcages && s.forcages[k];
    const n = f ? Number(f.n) || 0 : 0;
    return n >= 1 && n <= 4 ? { n, note: f.note || "", le: f.le || null, par: f.par || null } : null;
  }
  function voyantsDe(m) {
    const auto = [["implication", "Implication", implication(m)], ["assiduite", "Assiduité", voyantAssiduite(m)]];
    if (accesDirection()) {
      if (S.pret.cotisations) auto.push(["cotis", "Cotisations", voyantCotis(m)]);
      if (S.pret.discipline) auto.push(["discipline", "Discipline", voyantDiscipline(m)]);
    }
    const s = accesDirection() && S.pret.suivi ? suiviDe(m.id) : null;
    for (const x of auto) {
      const f = forcage(s, x[0]);
      if (f) x[2] = { n: f.n, lib: LIB_AUTO[x[0]][f.n], detail: f.note || `Calcul automatique : ${x[2].lib}`, force: true, calcule: x[2] };
    }
    const sante = [];
    if (s || (accesDirection() && S.pret.suivi)) {
      const sv = s || {};
      for (const [k, l] of dimsSante()) {
        const v = sv[k] || {};
        const n = Math.max(0, Math.min(4, Number(v.n) || 0));
        sante.push([k, l, { n, lib: NIV_SANTE[n], detail: v.note || "", tend: tendance(s, k, n), sante: true }]);
      }
    }
    // L’état général suit l’implication, l’assiduité, la discipline et la santé ; un retard de cotisation garde son propre voyant.
    const tous = auto.concat(sante).filter((x) => x[0] !== "cotis").map((x) => x[2].n).filter((n) => n > 0);
    const calcule = tous.length ? Math.max(...tous) : 0;
    const fg = forcage(s, "global");
    return { auto, sante, global: fg ? fg.n : calcule, globalCalcule: calcule, globalForce: fg };
  }
  const led = (n, grand) => `<span class="led ${NIV_CLS[n] || "off"}${grand ? " lg" : ""}" aria-hidden="true"></span>`;
  function tuileVoyant([k, l, v], mid) {
    const corps = `${led(v.n)}<span class="vy-x"><span class="vy-l">${esc(l)}${v.force ? `<span class="vy-f">ajusté</span>` : ""}</span><b class="vy-v">${esc(v.lib)}${fleche(v.tend)}</b>${v.detail ? `<span class="vy-d">${esc(v.detail)}</span>` : ""}</span>`;
    if (mid && peutAdmin() && S.pret.suivi) return `<button class="vy-t edit" type="button" data-act="${v.sante ? "veille-niveau" : "evaluer-membre"}" data-id="${esc(mid)}" data-k="${esc(k)}" aria-label="${esc(`Modifier le voyant ${l} : ${v.lib}`)}">${corps}${I("i-edit", "ico vy-e")}</button>`;
    return `<div class="vy-t" data-k="${esc(k)}">${corps}</div>`;
  }
  function blocVoyants(m) {
    const v = voyantsDe(m);
    const s = accesDirection() && S.pret.suivi ? suiviDe(m.id) : null;
    const adm = peutAdmin() && S.pret.suivi;
    const relance = s && s.prochainSuivi ? (s.prochainSuivi <= aujourdhui() ? `<span class="chip warn">Suivi prévu ${esc(relLong(s.prochainSuivi))}</span>` : `<span class="chip">Prochain suivi le ${esc(fmtJour(s.prochainSuivi))}</span>`) : "";
    const gNote = v.globalForce ? `<p class="vy-d" style="margin:2px 0 0">${esc(v.globalForce.note || `Calcul automatique : ${ETAT_GLOBAL[v.globalCalcule]}`)}</p>` : "";
    let out = `<section class="voyants" aria-label="Voyants du membre">
      <div class="vy-h">${led(v.global, true)}<div><p class="vy-k">État général${v.globalForce ? `<span class="vy-f">ajusté</span>` : ""}</p><p class="vy-g">${esc(ETAT_GLOBAL[v.global])}</p>${gNote}</div>${relance}${adm ? btn("evaluer-membre", "Modifier", { ico: "i-edit", sm: true, data: `data-id="${esc(m.id)}" data-k="global"` }) : ""}</div>
      <div class="vy-grid">${v.auto.map((x) => tuileVoyant(x, m.id)).join("")}</div>`;
    if (accesDirection()) {
      if (!S.pret.suivi) out += chargement("Lecture du suivi pastoral…");
      else {
        out += `<p class="vy-sep">${I("i-lock")}Veille pastorale · visible par la direction seulement${adm ? " · touchez un voyant pour le changer" : ""}</p><div class="vy-grid">${v.sante.map((x) => tuileVoyant(x, m.id)).join("")}</div>`;
        if (s && s.besoin) out += `<p class="note" style="margin:10px 0 0"><b>Accompagnement :</b> ${esc(s.besoin)}</p>`;
        if (s && s.evalueLe) out += `<p class="hint" style="margin-top:8px">Mis à jour le ${esc(fmtStamp(s.evalueLe))}${s.evaluePar ? ` par ${esc(nomDe(s.evaluePar))}` : ""}.</p>`;
        const hist = s && s.historique ? Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).slice(1, 6) : [];
        if (hist.length) out += `<details class="vy-hist"><summary>Évaluations précédentes (${nb(hist.length)})</summary><ul>${hist.map(([ts, h]) => `<li><span>${esc(fmtJour(h.date || isoJour(new Date(Number(ts)))))}</span><span class="vy-mini">${dimsSante().map(([k, l]) => `<span title="${esc(`${l} : ${NIV_SANTE[(h.niveaux || {})[k] || 0]}`)}">${led((h.niveaux || {})[k] || 0)}</span>`).join("")}</span></li>`).join("")}</ul></details>`;
        if (adm) out += `<div class="btn-row" style="margin-top:12px">${btn("evaluer-membre", s ? "Mettre à jour les voyants" : "Évaluer l’état du soldat", { ico: "i-edit", sm: true, data: `data-id="${esc(m.id)}"` })}</div>`;
      }
    }
    return out + `</section>`;
  }
  function ouvrirEvaluation(mid, focus) {
    const m = membre(mid);
    if (!m) return;
    const s = suiviDe(mid) || {};
    const v = voyantsDe(m);
    const options = (k, libs, cur, autoTxt, autoN) => `<div class="eval-c" role="radiogroup">${autoTxt != null ? `<label class="eval-o"><input type="radio" name="${k}" value="0"${cur === 0 ? " checked" : ""}><span>${led(autoN)}Automatique · ${esc(autoTxt)}</span></label>` : ""}${libs.map((t, n) => (n === 0 && autoTxt != null ? "" : `<label class="eval-o ${NIV_CLS[n]}"><input type="radio" name="${k}" value="${n}"${n === cur ? " checked" : ""}><span>${led(n)}${esc(t)}</span></label>`)).join("")}</div>`;
    const ligneAuto = ([k, l]) => {
      const x = v.auto.find((y) => y[0] === k);
      if (!x) return "";
      const calc = x[2].calcule || x[2];
      const f = forcage(s, k);
      return `<fieldset class="fs eval" id="ev-${k}"><legend>${esc(l)}</legend>${options("f_" + k, LIB_AUTO[k], f ? f.n : 0, calc.lib, calc.n)}
        ${inp("e-f-" + k, "f_" + k + "Note", f ? f.note : "", `autocomplete="off" placeholder="Motif de l’ajustement (facultatif)" aria-label="Motif : ${esc(l)}"`)}</fieldset>`;
    };
    const fg = forcage(s, "global");
    const ligneSante = ([k, l]) => {
      const cur = Number((s[k] || {}).n) || 0;
      return `<fieldset class="fs eval" id="ev-${k}"><legend>${esc(l)}</legend>${options(k, NIV_SANTE, cur, null, 0)}
        ${inp("e-" + k, k + "Note", (s[k] || {}).note || "", `autocomplete="off" placeholder="Observation (facultatif)" aria-label="Observation : ${esc(l)}"`)}</fieldset>`;
    };
    const html = `<form class="form" id="f-eval" novalidate>
      <div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc([m.matricule, m.fonction].filter(Boolean).join(" · "))}</p></div></div>
      <p class="note">${I("i-lock")} Visible uniquement par le propriétaire et les éditeurs. « Automatique » laisse l’application calculer le voyant ; choisissez un niveau pour l’ajuster selon votre connaissance du soldat.</p>
      <fieldset class="fs eval" id="ev-global"><legend>État général</legend>${options("f_global", ETAT_GLOBAL, fg ? fg.n : 0, ETAT_GLOBAL[v.globalCalcule], v.globalCalcule)}
        ${inp("e-f-global", "f_globalNote", fg ? fg.note : "", 'autocomplete="off" placeholder="Motif de l’ajustement (facultatif)" aria-label="Motif : état général"')}</fieldset>
      <h3 class="h3">Voyants calculés</h3>
      ${DIM_AUTO.map(ligneAuto).join("")}
      <h3 class="h3">Veille pastorale</h3>
      <p class="hint">Observations pastorales, pas de diagnostic médical ni de jugement : elles servent à accompagner le soldat.</p>
      ${dimsSante().map(ligneSante).join("")}
      ${champ("e-besoin", "Accompagnement prévu", zone("e-besoin", "besoin", s.besoin || "", 'rows="3" placeholder="Visite, prière, aide matérielle, orientation…"'))}
      ${champ("e-suivi", "Prochain suivi", inp("e-suivi", "prochainSuivi", s.prochainSuivi || "", 'type="date"'), { hint: "Le tableau de bord rappelle les suivis arrivés à échéance." })}
      ${pied("Enregistrer les voyants")}
    </form>`;
    ouvrir({
      titre: "Voyants du soldat", html, wide: true, onSubmit: (fd, form) => enregistrerEvaluation(fd, form, mid),
      apres: (sheet) => {
        if (!focus) return;
        const fs = sheet.querySelector("#ev-" + CSS.escape(focus));
        if (!fs) return;
        fs.scrollIntoView({ block: "center" });
        fs.classList.add("vise");
        const r = fs.querySelector("input:checked") || fs.querySelector("input");
        if (r) r.focus({ preventScroll: true });
      },
    });
  }
  async function enregistrerEvaluation(fd, form, mid) {
    const data = {};
    const niveaux = {};
    const borne = (x) => Math.max(0, Math.min(4, Number(x) || 0));
    for (const [k] of dimsSante()) {
      const n = borne(fd.get(k));
      niveaux[k] = n;
      data[k] = { n, note: String(fd.get(k + "Note") || "").trim() };
    }
    const forcages = {};
    const forces = {};
    for (const k of ["global", ...DIM_AUTO.map((x) => x[0])]) {
      if (fd.get("f_" + k) === null) continue;
      const n = borne(fd.get("f_" + k));
      forcages[k] = { n, note: n ? String(fd.get("f_" + k + "Note") || "").trim() : "", le: Date.now(), par: S.me.id || null };
      forces[k] = n;
    }
    data.forcages = forcages;
    data.besoin = String(fd.get("besoin") || "").trim();
    data.prochainSuivi = String(fd.get("prochainSuivi") || "");
    data.membreId = mid;
    data.evalueLe = Date.now();
    data.evaluePar = S.me.id || null;
    data.historique = { [String(Date.now())]: { date: aujourdhui(), niveaux, forces, par: S.me.id || null } };
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(() => upsert("suivi/" + mid, data), "Voyants mis à jour");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirMembre(mid);
  }
  /* Évaluation rapide d’un voyant de veille : un toucher sur un niveau l’enregistre */
  const VR = { retour: false };
  function ouvrirVeilleRapide(mid, k) {
    const m = membre(mid);
    const d = dimsSante().find(([x]) => x === k);
    if (!m || !d) return;
    const s = suiviDe(mid) || {};
    const v = s[k] || {};
    const cur = Number(v.n) || 0;
    const hist = s.historique ? Object.entries(s.historique).sort((a, b) => Number(b[0]) - Number(a[0])).map(([ts, h]) => ({ ts: Number(ts), n: Number(((h || {}).niveaux || {})[k]) || 0, note: ((h || {}).notes || {})[k] || "" })).filter((x) => x.n > 0).slice(0, 8) : [];
    const html = `<div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(d[1])}</p></div></div>
      <p class="hint">Touchez un niveau : il est enregistré aussitôt, avec l’observation ci-dessous.</p>
      ${champ("vr-note", "Observation (facultatif)", zone("vr-note", "note", v.note || "", 'rows="2" maxlength="400" placeholder="Ce que vous avez constaté, ce qui est prévu…"'))}
      <div class="vr-niveaux" role="group" aria-label="Niveau">${[1, 2, 3, 4, 0].map((n) => `<button class="vr-n ${NIV_CLS[n]}${n === cur ? " on" : ""}" type="button" data-act="veille-choisir" data-id="${esc(mid)}" data-k="${esc(k)}" data-n="${n}" aria-pressed="${n === cur}">${led(n, true)}<b>${esc(NIV_SANTE[n])}</b></button>`).join("")}</div>
      ${hist.length ? `<details class="vy-hist" open><summary>Évolution (${nb(hist.length)})</summary><div class="vr-courbe">${hist.slice().reverse().map((x) => `<span title="${esc(`${fmtJour(isoJour(new Date(x.ts)))} : ${NIV_SANTE[x.n]}${x.note ? " · " + x.note : ""}`)}">${led(x.n)}<small>${esc(fmtCourt(isoJour(new Date(x.ts))))}</small></span>`).join("")}</div></details>` : ""}
      <div class="btn-row" style="margin-top:12px">${btn("evaluer-membre", "Évaluation complète", { ico: "i-edit", sm: true, data: `data-id="${esc(mid)}" data-k="${esc(k)}"` })}</div>`;
    VR.retour = !$("#sheet").hidden && !!document.querySelector("#sheet .voyants");
    ouvrir({ titre: "Veille pastorale", html });
  }
  async function enregistrerVeilleRapide(mid, k, n) {
    const s = suiviDe(mid) || {};
    const note = String(($("#vr-note") || {}).value || "").trim();
    const niveaux = {};
    for (const [x] of dimsSante()) niveaux[x] = x === k ? n : Number((s[x] || {}).n) || 0;
    const ts = String(Date.now());
    const data = { [k]: { n, note }, membreId: mid, evalueLe: Date.now(), evaluePar: S.me.id || null, historique: { [ts]: { date: aujourdhui(), niveaux, notes: { [k]: note }, par: S.me.id || null, rapide: k } } };
    document.querySelectorAll(".vr-n").forEach((b) => { b.disabled = true; });
    const ok = await ecrire(() => upsert("suivi/" + mid, data), `${(dimsSante().find(([x]) => x === k) || ["", "Voyant"])[1]} : ${NIV_SANTE[n]}`);
    if (ok) { if (VR.retour) ouvrirMembre(mid); else fermer(); } else document.querySelectorAll(".vr-n").forEach((b) => { b.disabled = false; });
  }
  /* Réglages de la veille : dimensions suivies (ajouter, renommer, masquer) */
  function ficheDimsVeille() {
    const c = cfg().veilleDims;
    const l = Array.isArray(c) && c.length ? c : DIM_VEILLE_DEFAUT.map(([k, x]) => ({ k, l: x, actif: true }));
    return `<form class="form" id="f-dims-veille" novalidate><p class="hint" style="margin-top:0">Ces dimensions apparaissent dans la fiche de chaque membre et dans le tableau de veille. Une dimension masquée garde son historique.</p>
      <div class="list">${l.map((d, i) => `<div class="row nolead dv-row"><label class="check"><input type="checkbox" name="actif_${i}"${d.actif !== false ? " checked" : ""}> <span class="sr">Suivre</span></label><input type="hidden" name="k_${i}" value="${esc(d.k)}"><label class="sr" for="dv-${i}">Nom de la dimension</label><input class="inp" id="dv-${i}" name="l_${i}" value="${esc(d.l)}" maxlength="60" required></div>`).join("")}</div>
      ${champ("dv-nouv", "Ajouter une dimension", inp("dv-nouv", "nouvelle", "", 'maxlength="60" placeholder="Par exemple : Logement, Santé mentale, Ministère…"'))}
      <input type="hidden" name="n" value="${l.length}">${pied("Enregistrer les dimensions")}</form>`;
  }
  async function enregistrerDimsVeille(fd) {
    const n = Number(fd.get("n")) || 0;
    const l = [];
    for (let i = 0; i < n; i += 1) { const lib = String(fd.get("l_" + i) || "").trim(); if (lib) l.push({ k: String(fd.get("k_" + i)), l: lib.slice(0, 60), actif: fd.get("actif_" + i) === "on" }); }
    const nouv = String(fd.get("nouvelle") || "").trim();
    if (nouv) l.push({ k: "d" + Date.now().toString(36), l: nouv.slice(0, 60), actif: true });
    if (!l.some((d) => d.actif)) { erreurForm("Gardez au moins une dimension suivie."); return; }
    const ok = await ecrire(() => S.db.doc("config/general").update({ veilleDims: l, ...tampon() }), "Dimensions de la veille enregistrées");
    if (ok) fermer();
  }

  /* Pastille d’état dans les listes (direction) */
  function pastilleEtat(m) {
    if (!accesDirection() || !S.pret.suivi) return "";
    const n = voyantsDe(m).global;
    return n >= 2 ? `<span class="led-s ${NIV_CLS[n]}" title="${esc(ETAT_GLOBAL[n])}" role="img" aria-label="${esc(ETAT_GLOBAL[n])}"></span>` : "";
  }
  function carteVeille() {
    const pied = `<button class="link" type="button" data-act="aller-veille">Voir tous les membres</button>`;
    if (!S.pret.suivi || !S.pret.membres) return carte("Veille pastorale", chargement("Lecture des voyants…"));
    const actifs = membresActifs();
    const etats = actifs.map((m) => ({ m, v: voyantsDe(m), s: suiviDe(m.id) }));
    const cpt = [0, 0, 0, 0, 0];
    etats.forEach((x) => { cpt[x.v.global] += 1; });
    const alerte = etats.filter((x) => x.v.global >= 3).sort((a, b) => b.v.global - a.v.global || parNom(a.m, b.m));
    const echus = etats.filter((x) => x.s && x.s.prochainSuivi && x.s.prochainSuivi <= aujourdhui());
    const evalues = etats.filter((x) => x.s && x.s.evalueLe).length;
    const corps = `<div class="vy-bar" role="img" aria-label="${esc(`${cpt[1]} au vert, ${cpt[2]} à surveiller, ${cpt[3]} préoccupants, ${cpt[4]} en alerte, ${cpt[0]} non évalués`)}">${[1, 2, 3, 4, 0].map((n) => cpt[n] ? `<i class="${NIV_CLS[n]}" style="flex:${cpt[n]}"></i>` : "").join("")}</div>
      <div class="legend" style="margin-top:8px">${[1, 2, 3, 4].map((n) => `<span>${led(n)}${esc(ETAT_GLOBAL[n])} <b>${nb(cpt[n])}</b></span>`).join("")}</div>
      ${alerte.length ? `<div class="list" style="margin-top:10px">${alerte.slice(0, 4).map((x) => `<button class="row" type="button" data-act="voir-membre" data-id="${esc(x.m.id)}">${avatar(x.m)}<span class="row-main"><span class="row-t">${esc(nomComplet(x.m))}</span><span class="row-m">${esc(x.v.auto.concat(x.v.sante).filter((y) => y[2].n >= 3).map((y) => y[1]).join(" · "))}</span></span><span class="row-r">${led(x.v.global)}</span></button>`).join("")}</div>` : `<p class="hint" style="margin-top:10px">Aucun membre en état préoccupant.</p>`}
      ${echus.length ? `<p class="note warn" style="margin:10px 0 0">${pluriel(echus.length, "suivi pastoral arrivé", "suivis pastoraux arrivés")} à échéance.</p>` : ""}
      <p class="hint" style="margin-top:8px">${pluriel(evalues, "soldat évalué", "soldats évalués")} sur ${nb(actifs.length)}.</p>`;
    return carte("Veille pastorale", corps, { pied });
  }
  function vueVoyants() {
    if (!S.pret.suivi) return chargement("Lecture des voyants…");
    const f = S.f.voyants;
    const adm = peutAdmin();
    const dims = dimsSante();
    const actifs = membresActifs();
    const lignes = actifs.map((m) => ({ m, v: voyantsDe(m), s: suiviDe(m.id) }));
    const q = norm(f.q || "");
    const val = (x, k) => (x.v.auto.concat(x.v.sante).find((y) => y[0] === k) || [, , { n: 0 }])[2].n;
    const filt = lignes.filter((x) => (f.filtre === "alerte" ? x.v.global >= 2 : f.filtre === "nonevalue" ? !(x.s && x.s.evalueLe) : f.filtre === "echus" ? x.s && x.s.prochainSuivi && x.s.prochainSuivi <= aujourdhui() : true)
      && (!f.dim || val(x, f.dim) >= 3) && (!q || norm(`${nomComplet(x.m)} ${x.m.matricule || ""}`).includes(q)))
      .sort((a, b) => (f.dim ? val(b, f.dim) - val(a, f.dim) : 0) || b.v.global - a.v.global || parNom(a.m, b.m));
    const cols = [["implication", "Implic.", "Implication"], ["assiduite", "Assid.", "Assiduité"], ["cotis", "Cotis.", "Cotisations"], ["discipline", "Discip.", "Discipline"]].concat(dims.map(([k, l]) => [k, COURT_VEILLE[k] || (l.length > 10 ? l.slice(0, 9) + "." : l), l]));
    const alertes = dims.map(([k, l]) => ({ k, l, n: lignes.filter((x) => val(x, k) >= 3).length }));
    const cpt = [0, 0, 0, 0, 0]; lignes.forEach((x) => { cpt[x.v.global] += 1; });
    let out = `<p class="note">${I("i-lock")} Veille pastorale réservée à la direction. Les quatre premiers voyants se calculent seuls (présences, engagements, cotisations, discipline) ; les autres viennent de l’observation pastorale.${adm ? " <b>Touchez un voyant pour le changer</b> : il est enregistré aussitôt." : ""}</p>
      <div class="vw-resume">${[4, 3, 2, 1, 0].map((n) => `<div class="vw-c ${NIV_CLS[n]}">${led(n, true)}<b>${nb(cpt[n])}</b><span>${esc(ETAT_GLOBAL[n])}</span></div>`).join("")}</div>
      <div class="vw-dims" role="group" aria-label="Difficultés par dimension">${alertes.map((a) => `<button class="chip-btn${f.dim === a.k ? " on" : ""}${a.n ? " vw-a" : ""}" type="button" data-act="veille-dim" data-k="${esc(a.k)}" aria-pressed="${f.dim === a.k}">${esc(a.l)} <b>${nb(a.n)}</b></button>`).join("")}${f.dim ? `<button class="link" type="button" data-act="veille-dim" data-k="">Toutes les dimensions</button>` : ""}</div>
      <div class="filters"><div class="chips" role="group" aria-label="Filtrer">${[["tous", "Tous"], ["alerte", "À surveiller et plus"], ["nonevalue", "Non évalués"], ["echus", "Suivis à faire"]].map(([id, l]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="voyants-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l}</button>`).join("")}</div><label class="sr" for="vw-q">Rechercher un membre</label><input class="inp vw-q" id="vw-q" type="search" placeholder="Rechercher un membre…" value="${esc(f.q || "")}" autocomplete="off">${adm ? btn("veille-dims", "Dimensions suivies", { ico: "i-sliders", sm: true }) : ""}</div>
      <div class="legend" style="margin:-4px 0 10px">${[1, 2, 3, 4, 0].map((n) => `<span>${led(n)}${esc(n ? NIV_SANTE[n] : "Non évalué")}</span>`).join("")}<span><span class="vy-tend up">▲</span> en mieux</span><span><span class="vy-tend down">▼</span> en baisse</span></div>`;
    if (!filt.length) return out + vide("i-check", "Aucun membre ne correspond.");
    out += `<div class="table-wrap"><table class="t vy-table"><thead><tr><th scope="col">Membre</th><th scope="col" title="État général">État</th>${cols.map(([k, c, l]) => `<th scope="col" title="${esc(l)}"${f.dim === k ? ' class="vw-on"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${filt.map(({ m, v }) => {
      const tous = Object.fromEntries(v.auto.concat(v.sante).map(([k, , x]) => [k, x]));
      return `<tr><th scope="row"><button class="link" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button></th><td title="${esc(ETAT_GLOBAL[v.global])}">${led(v.global)}<span class="sr">${esc(ETAT_GLOBAL[v.global])}</span></td>${cols.map(([k, , l]) => {
        const x = tous[k];
        if (!x) return `<td class="na">–</td>`;
        const t = esc(`${l} : ${x.lib}${x.detail ? " · " + x.detail : ""}`);
        const contenu = `${led(x.n)}${fleche(x.tend)}<span class="sr">${t}</span>`;
        return adm ? `<td><button class="vw-cell" type="button" data-act="${x.sante ? "veille-niveau" : "evaluer-membre"}" data-id="${esc(m.id)}" data-k="${esc(k)}" title="${t}" aria-label="${t}">${contenu}</button></td>` : `<td title="${t}">${contenu}</td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
    return out;
  }
  document.addEventListener("input", (ev) => {
    if (ev.target && ev.target.id === "vw-q") { S.f.voyants.q = ev.target.value; const pos = ev.target.selectionStart; render(); const el = $("#vw-q"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* sans effet */ } } }
  });
  /* ════════════════════════ Points SDE et cartographie ════════════════════════ */
  const TYPE_POINT = "Point SDE";
  const PAYS_SDE = ["Côte d’Ivoire", "Tunisie", "Burkina Faso", "Italie", "Canada", "États-Unis"];
  const normPays = (s) => norm(String(s || "").replace(/[’'`.\-]/g, " "));
  const VILLES = {
    abidjan: [-4.008, 5.36], yamoussoukro: [-5.276, 6.827], bouake: [-5.03, 7.69], "san pedro": [-6.64, 4.75], daloa: [-6.45, 6.88], korhogo: [-5.63, 9.46], tiassale: [-4.82, 5.9], "grand bassam": [-3.74, 5.21],
    tunis: [10.18, 36.81], sfax: [10.76, 34.74], sousse: [10.64, 35.83],
    ouagadougou: [-1.53, 12.37], "bobo dioulasso": [-4.3, 11.18], koudougou: [-2.36, 12.25],
    rome: [12.5, 41.9], roma: [12.5, 41.9], milan: [9.19, 45.46], milano: [9.19, 45.46], turin: [7.69, 45.07], torino: [7.69, 45.07], naples: [14.27, 40.85], napoli: [14.27, 40.85], brescia: [10.21, 45.54], bologne: [11.34, 44.49], bologna: [11.34, 44.49], florence: [11.25, 43.77], firenze: [11.25, 43.77], genes: [8.93, 44.41], genova: [8.93, 44.41], verone: [10.99, 45.44], verona: [10.99, 45.44], padoue: [11.88, 45.41], padova: [11.88, 45.41], parme: [10.33, 44.8], parma: [10.33, 44.8], bergame: [9.67, 45.7], bergamo: [9.67, 45.7],
    ottawa: [-75.7, 45.42], montreal: [-73.57, 45.5], quebec: [-71.21, 46.81], toronto: [-79.38, 43.65], gatineau: [-75.7, 45.48], laval: [-73.69, 45.57], calgary: [-114.07, 51.05], edmonton: [-113.49, 53.55], vancouver: [-123.12, 49.28], winnipeg: [-97.14, 49.9], sherbrooke: [-71.89, 45.4],
    washington: [-77.04, 38.91], "new york": [-74.01, 40.71], atlanta: [-84.39, 33.75], houston: [-95.37, 29.76], dallas: [-96.8, 32.78], chicago: [-87.63, 41.88], "los angeles": [-118.24, 34.05], philadelphie: [-75.17, 39.95], philadelphia: [-75.17, 39.95], boston: [-71.06, 42.36], miami: [-80.19, 25.76], minneapolis: [-93.27, 44.98], columbus: [-82.99, 39.96], charlotte: [-80.84, 35.23], baltimore: [-76.61, 39.29],
    paris: [2.35, 48.86], lyon: [4.84, 45.76], bruxelles: [4.35, 50.85], geneve: [6.14, 46.2], londres: [-0.13, 51.51], madrid: [-3.7, 40.42], berlin: [13.4, 52.52],
    dakar: [-17.45, 14.69], bamako: [-8, 12.64], lome: [1.22, 6.13], cotonou: [2.42, 6.37], accra: [-0.19, 5.6], conakry: [-13.68, 9.64], niamey: [2.11, 13.51], douala: [9.7, 4.05], yaounde: [11.5, 3.85], libreville: [9.45, 0.39], kinshasa: [15.27, -4.44], monrovia: [-10.8, 6.3],
  };
  const CAPITALES = { CIV: "abidjan", TUN: "tunis", BFA: "ouagadougou", ITA: "rome", CAN: "ottawa", USA: "washington", FRA: "paris", BEL: "bruxelles", CHE: "geneve", GBR: "londres", ESP: "madrid", DEU: "berlin", SEN: "dakar", MLI: "bamako", TGO: "lome", BEN: "cotonou", GHA: "accra", GIN: "conakry", NER: "niamey", CMR: "yaounde", GAB: "libreville", COD: "kinshasa", LBR: "monrovia" };
  const ALIAS_PAYS = { "cote d ivoire": "CIV", "cote divoire": "CIV", ci: "CIV", civ: "CIV", "ivory coast": "CIV", rci: "CIV", usa: "USA", us: "USA", "etats unis": "USA", "etats unis d amerique": "USA", "united states": "USA", amerique: "USA", burkina: "BFA", italy: "ITA", italia: "ITA", tunisia: "TUN", "royaume uni": "GBR", angleterre: "GBR", "rd congo": "COD", rdc: "COD", congo: "COG" };
  let indexPays = null;
  function isoDePays(nom) {
    if (!indexPays) { indexPays = new Map(); for (const p of PAYS_GEO) { indexPays.set(normPays(p[1]), p[0]); indexPays.set(p[0].toLowerCase(), p[0]); } }
    const k = normPays(nom);
    return k ? ALIAS_PAYS[k] || indexPays.get(k) || "" : "";
  }
  const paysGeo = (iso) => PAYS_GEO.find((p) => p[0] === iso) || null;
  function projeter(lon, lat) {
    const l = (lon * Math.PI) / 180, p = (Math.max(-89.9, Math.min(89.9, lat)) * Math.PI) / 180;
    const p2 = p * p, p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [(x + CARTE_XM) * CARTE_S, -y * CARTE_S - CARTE_Y0];
  }
  const estPoint = (g) => g && g.type === TYPE_POINT;
  const pointsSDE = () => S.garnisons.filter(estPoint).sort((a, b) => cmpFr(a.nom || "", b.nom || ""));
  function pointDeGarnison(gid) {
    for (const id of ancetresG(gid)) { const g = garnison(id); if (estPoint(g)) return g; }
    return null;
  }
  function paysDeGarnison(gid) {
    for (const id of ancetresG(gid)) { const g = garnison(id); const iso = g && isoDePays(g.pays); if (iso) return iso; }
    return "";
  }
  function positionPoint(g) {
    const iso = isoDePays(g.pays);
    const v = VILLES[normPays(g.ville)] || (iso && VILLES[CAPITALES[iso]]);
    if (v) return projeter(v[0], v[1]);
    const p = iso && paysGeo(iso);
    return p ? [p[3], p[4]] : null;
  }
  const siegeG = () => S.garnisons.find((g) => g.type === "Siège") || null;
  function pointCentral(pts) {
    const sg = siegeG();
    const viaSiege = sg ? pointDeGarnison(sg.id) : null;
    return viaSiege || pts.find((g) => isoDePays(g.pays) === "CIV") || pts[0] || null;
  }
  function vueParDefaut(marques) {
    const ratio = 1.6;
    if (!marques.length) return { x: 0, y: -60, w: 1000 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const mk of marques) { x0 = Math.min(x0, mk.x); y0 = Math.min(y0, mk.y); x1 = Math.max(x1, mk.x); y1 = Math.max(y1, mk.y); }
    let w = Math.max(x1 - x0 + 160, 240), h = Math.max(y1 - y0 + 140, w / ratio);
    w = Math.max(w, h * ratio);
    w = Math.min(w, 1100);
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / ratio / 2, w };
  }
  function bornerVue(v) {
    const w = Math.max(70, Math.min(1150, v.w)), h = w / 1.6;
    const x = Math.max(-140, Math.min(CARTE_W + 140 - w, v.x));
    const y = Math.max(-200, Math.min(CARTE_H + 200 - h, v.y));
    return { x, y, w };
  }
  const echelleMk = (v) => v.w / (S.carteLargeur || 800);
  function donneesCarte() {
    const pts = pointsSDE();
    const sans = membresActifs().filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId));
    const marques = pts.map((g) => { const pos = positionPoint(g); return pos ? { g, x: pos[0], y: pos[1], n: membresDeG(g.id, true).length } : null; }).filter(Boolean);
    const presence = new Set(S.garnisons.map((g) => paysDeGarnison(g.id)).filter(Boolean));
    return { pts, sans, marques, presence, centre: pointCentral(pts) };
  }
  function svgCarte(d, v) {
    const s = echelleMk(v);
    const sel = S.carteSel || "";
    const selIso = sel.startsWith("pays:") ? sel.slice(5) : "";
    const pays = PAYS_GEO.map(([iso, nom, path]) => `<path d="${path}" class="pz${d.presence.has(iso) ? " sde" : ""}${iso === selIso ? " sel" : ""}" data-act="carte-pays" data-iso="${iso}" data-nom="${esc(nom)}"/>`).join("");
    const c = d.centre && d.marques.find((mk) => mk.g.id === d.centre.id);
    const arcs = c ? d.marques.filter((mk) => mk !== c).map((mk) => {
      const mx = (c.x + mk.x) / 2, my = (c.y + mk.y) / 2, dist = Math.hypot(mk.x - c.x, mk.y - c.y);
      return `<path class="arc" d="M${c.x.toFixed(1)} ${c.y.toFixed(1)} Q${mx.toFixed(1)} ${(my - dist * 0.32).toFixed(1)} ${mk.x.toFixed(1)} ${mk.y.toFixed(1)}"/>`;
    }).join("") : "";
    const maxN = Math.max(1, ...d.marques.map((mk) => mk.n));
    const marques = d.marques.slice().sort((a, b) => a.y - b.y).map((mk) => {
      const r = 7 + 11 * Math.sqrt(mk.n / maxN);
      const siege = c && mk === c && siegeG();
      const lib = String(mk.g.nom || "").replace(/^(point\s+)?sde\s+/i, "");
      return `<g class="mk${mk.g.id === sel ? " on" : ""}${mk.n ? "" : " vide"}" data-act="carte-point" data-id="${esc(mk.g.id)}" data-nom="${esc(mk.g.nom)}" data-n="${mk.n}" data-x="${mk.x.toFixed(2)}" data-y="${mk.y.toFixed(2)}" data-r="${r.toFixed(1)}"${siege ? ' data-siege="1"' : ""} transform="translate(${mk.x.toFixed(1)} ${mk.y.toFixed(1)}) scale(${s.toFixed(4)})"><line class="lien" x1="0" y1="0" x2="0" y2="0"/><circle class="ancre" r="3" cx="0" cy="0"/><circle class="halo" r="${(r + 9).toFixed(1)}"/><circle class="pt" r="${r.toFixed(1)}"/>${siege ? `<path class="etoile" d="M0 ${-(r + 15)} l3.5 7 7.6 1.1 -5.5 5.4 1.3 7.6 -6.9 -3.6 -6.9 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1.1z"/>` : ""}<text class="mk-n" dy="0.36em">${nb(mk.n)}</text><text class="mk-l" y="${(r + 17).toFixed(1)}">${esc(lib)}</text></g>`;
    }).join("");
    return `<svg class="carte-svg" id="carte-svg" viewBox="${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${(v.w / 1.6).toFixed(1)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(`Carte des points SDE : ${d.marques.map((mk) => `${mk.g.nom}, ${pluriel(mk.n, "membre", "membres")}`).join(" ; ") || "aucun point placé"}`)}"><rect class="mer" x="-3000" y="-3000" width="7000" height="7000"/><g class="pays">${pays}</g><g class="arcs">${arcs}</g><g class="mks">${marques}</g></svg>`;
  }
  function panneauCarte(d) {
    const ecr = peutEcrire();
    const sel = S.carteSel || "";
    if (sel.startsWith("pays:")) {
      const iso = sel.slice(5);
      const p = paysGeo(iso);
      if (!p) return "";
      const gs = S.garnisons.filter((g) => paysDeGarnison(g.id) === iso);
      return `<div class="cp-h"><p class="eyebrow">Pays</p><h2 class="cp-t">${esc(p[1])}</h2></div>
        ${gs.length ? `<p class="hint">${pluriel(gs.length, "structure du mouvement", "structures du mouvement")} dans ce pays, sans point SDE.</p><div class="list">${gs.map((g) => rowGarnison(g, 0)).join("")}</div>` : `<p class="hint">Le mouvement n’a pas encore de point dans ce pays.</p>`}
        <div class="actions">${ecr ? btn("ouvrir-point", `Ouvrir un point SDE ${esc(enPays(p[1]))}`, { ico: "i-plus", cls: "btn-primary", data: `data-pays="${esc(p[1])}"` }) : ""}${btn("carte-tout", "Retour à la vue d’ensemble", { ico: "i-left" })}</div>`;
    }
    const g = sel ? garnison(sel) : null;
    if (g) {
      const mbs = membresDeG(g.id, true);
      const directs = membresDeG(g.id, false).length;
      const sous = enfantsG(g.id);
      const resp = membre(g.responsableId);
      const evts3 = evtsPeriode("3m", "");
      const taux = mbs.map((m) => statsMembre(m, evts3).taux).filter((t) => t != null);
      const moy = taux.length ? taux.reduce((a, b) => a + b, 0) / taux.length : null;
      return `<div class="cp-h"><p class="eyebrow">${esc([g.type, g.statut && g.statut !== "Active" ? g.statut : ""].filter(Boolean).join(" · "))}</p><h2 class="cp-t">${esc(g.nom)}</h2><p class="hint">${esc([g.quartier, g.ville, g.pays].filter(Boolean).join(", ") || "Localisation à préciser")}</p></div>
        <div class="cp-stats"><div><b>${nb(mbs.length)}</b><span>${mbs.length > 1 ? "membres" : "membre"}</span></div><div><b>${nb(sous.length)}</b><span>${sous.length > 1 ? "structures" : "structure"}</span></div><div><b>${pct(moy)}</b><span>assiduité</span></div></div>
        ${resp ? `<p class="hint">Responsable : <button class="link" type="button" data-act="voir-membre" data-id="${esc(resp.id)}">${esc(nomUsuel(resp))}</button></p>` : ""}
        ${sous.length ? `<h3 class="h3">Structures</h3><div class="list">${sous.map((x) => rowGarnison(x, 0)).join("")}</div>` : ""}
        <h3 class="h3">Membres${directs !== mbs.length ? ` <span class="muted">(${nb(directs)} rattachés au point, ${nb(mbs.length - directs)} dans ses structures)</span>` : ""}</h3>
        ${mbs.length ? `<div class="list">${mbs.map(rowMembre).join("")}</div>` : `<p class="hint">Aucun membre rattaché pour l’instant.</p>`}
        <div class="actions">${ecr ? btn("membres-garnison", "Préciser les membres", { ico: "i-users", cls: "btn-primary", data: `data-id="${esc(g.id)}"` }) : ""}${btn("voir-garnison", "Fiche du point", { ico: "i-fort", data: `data-id="${esc(g.id)}"` })}${ecr && mbs.length ? btn("ecrire", "Écrire aux membres", { ico: "i-horn", data: `data-aud="garnison" data-val="${esc(g.id)}"` }) : ""}${ecr ? btn("ajout-garnison", "Ajouter une cellule", { ico: "i-plus", data: `data-parent="${esc(g.id)}"` }) : ""}${btn("carte-tout", "Vue d’ensemble", { ico: "i-left" })}</div>`;
    }
    const total = membresActifs().length;
    const maxN = Math.max(1, ...d.pts.map((x) => membresDeG(x.id, true).length));
    return `<div class="cp-h"><p class="eyebrow">Vue d’ensemble</p><h2 class="cp-t">${pluriel(d.pts.length, "point SDE", "points SDE")}</h2><p class="hint">${pluriel(new Set(d.pts.map((x) => isoDePays(x.pays)).filter(Boolean)).size, "pays", "pays")} · ${pluriel(total - d.sans.length, "membre rattaché", "membres rattachés")} sur ${nb(total)}</p></div>
      ${d.pts.length ? `<div class="list">${d.pts.map((x) => { const n = membresDeG(x.id, true).length; return `<button class="row nolead" type="button" data-act="carte-point" data-id="${esc(x.id)}"><span class="row-main"><span class="row-t">${esc(x.nom)}</span><span class="row-m">${esc([x.ville, x.pays].filter(Boolean).join(", ") || "Localisation à préciser")}</span><span class="bar slim" aria-hidden="true"><i style="width:${((n / maxN) * 100).toFixed(1)}%"></i></span></span><span class="row-r"><b class="taux">${nb(n)}</b><span class="chip">${n > 1 ? "membres" : "membre"}</span></span></button>`; }).join("")}</div>` : `<p class="hint">Aucun point SDE n’est encore créé.</p>`}
      ${d.sans.length ? `<div class="note warn" style="margin-top:12px"><p>${pluriel(d.sans.length, "membre actif n’est rattaché", "membres actifs ne sont rattachés")} à aucun point SDE.</p><div class="btn-row">${btn("sous", "Voir la liste", { sm: true, data: 'data-vue-cible="garnisons" data-sous="sans"' })}</div></div>` : ""}
      ${ecr ? `<div class="actions">${btn("ouvrir-point", "Nouveau point SDE", { ico: "i-plus", cls: "btn-primary" })}</div>` : ""}`;
  }
  const enPays = (nom) => { const n = normPays(nom); if (/^(etats unis|pays bas|emirats|philippines|maldives|seychelles|comores)/.test(n)) return "aux " + nom; if (/^(canada|burkina|mali|niger|senegal|ghana|benin|togo|cameroun|gabon|congo|maroc|royaume|bresil|mexique|japon|portugal|luxembourg|danemark|nigeria|tchad|liberia|kenya|rwanda|burundi|zimbabwe|soudan)/.test(n)) return "au " + nom; return "en " + nom; };
  function vueCartographie() {
    const d = donneesCarte();
    if (!S.carteV) S.carteV = bornerVue(vueParDefaut(d.marques));
    const v = S.carteV;
    return `<div class="carto">
      <div class="carte-box" id="carte-box">${svgCarte(d, v)}
        <div class="carte-tip" id="carte-tip" hidden></div>
        <div class="carte-zoom" role="group" aria-label="Zoom de la carte"><button class="icon-btn" type="button" data-act="carte-zoom" data-k="0.6" aria-label="Zoomer">${I("i-plus")}</button><button class="icon-btn" type="button" data-act="carte-zoom" data-k="1.6" aria-label="Dézoomer">${I("i-minus")}</button><button class="icon-btn" type="button" data-act="carte-centrer" aria-label="Recentrer sur les points SDE">${I("i-pin")}</button><button class="icon-btn" type="button" data-act="carte-monde" aria-label="Voir le monde entier">${I("i-grid")}</button></div>
        <div class="carte-leg"><span><i class="lg-pt"></i>Point SDE (taille selon l’effectif)</span><span><i class="lg-pays"></i>Pays d’implantation</span>${siegeG() ? `<span><i class="lg-et"></i>Siège</span>` : ""}</div>
      </div>
      <aside class="carte-panel" aria-live="polite">${panneauCarte(d)}</aside>
    </div>
    <p class="hint" style="margin-top:8px">Faites glisser pour déplacer la carte, pincez ou utilisez la molette pour zoomer. Touchez un point pour voir ses membres, ou un pays pour y ouvrir un point.</p>`;
  }
  function carteLieux() {
    const pied = `<button class="link" type="button" data-act="aller-carte">Ouvrir la cartographie</button>`;
    if (!S.pret.garnisons || !S.pret.membres) return carte("Points SDE", chargement("Lecture des points…"));
    const pts = pointsSDE();
    if (!pts.length) return carte("Points SDE", `<p class="hint">Aucun point SDE n’est encore créé.</p>`, { pied });
    const lignes = pts.map((g) => ({ g, n: membresDeG(g.id, true).length })).sort((a, b) => b.n - a.n || cmpFr(a.g.nom, b.g.nom));
    const max = Math.max(1, ...lignes.map((x) => x.n));
    return carte("Points SDE", `<p class="big-figure num">${nb(pts.length)}<small>points dans ${pluriel(new Set(pts.map((g) => isoDePays(g.pays)).filter(Boolean)).size, "pays", "pays")}</small></p><div class="bars">${lignes.map(({ g, n }) => `<div class="bar-row"><div class="bar-top"><span>${esc(g.nom)}</span><b>${nb(n)}</b></div><div class="bar"><i style="width:${((n / max) * 100).toFixed(1)}%"></i></div></div>`).join("")}</div>`, { pied });
  }
  /* Interactions de la carte : glisser, pincer, molette, info-bulle (manipulent le DOM sans re-rendu) */
  const CT = { ptrs: new Map(), depart: null, glisse: false, pinch: null };
  function appliquerVue(svg, v) {
    S.carteV = v;
    svg.setAttribute("viewBox", `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${(v.w / 1.6).toFixed(1)}`);
    disposerMarques(svg);
  }
  /* Écarte les points trop proches à l’écran (avec un trait vers leur position réelle) et place chaque étiquette là où elle ne chevauche rien. */
  function disposerMarques(svg) {
    const v = S.carteV;
    if (!v) return;
    const r0 = svg.getBoundingClientRect();
    const s = r0.width ? v.w / r0.width : echelleMk(v);
    const it = [...svg.querySelectorAll(".mk")].map((g) => ({ g, x0: Number(g.dataset.x), y0: Number(g.dataset.y), r: Number(g.dataset.r) + 4 + (g.dataset.siege ? 9 : 0), siege: !!g.dataset.siege }));
    it.forEach((o) => { o.px = (o.x0 - v.x) / s; o.py = (o.y0 - v.y) / s; o.qx = o.px; o.qy = o.py; });
    for (let k = 0; k < 60; k += 1) {
      let bouge = false;
      for (let i = 0; i < it.length; i += 1) for (let j = i + 1; j < it.length; j += 1) {
        const a = it[i], b = it[j];
        let dx = b.qx - a.qx, dy = b.qy - a.qy, d = Math.hypot(dx, dy);
        const min = a.r + b.r + 4;
        if (d >= min) continue;
        if (d < 0.01) { dx = 1; dy = -0.4; d = Math.hypot(dx, dy); }
        const pousse = (min - d) / 2 + 0.5;
        a.qx -= (dx / d) * pousse; a.qy -= (dy / d) * pousse; b.qx += (dx / d) * pousse; b.qy += (dy / d) * pousse;
        bouge = true;
      }
      if (!bouge) break;
    }
    const boites = it.map((o) => ({ x: o.qx - o.r, y: o.qy - o.r - (o.siege ? 10 : 0), w: 2 * o.r, h: 2 * o.r + (o.siege ? 10 : 0) }));
    const touche = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const o of it) {
      const t = o.g.querySelector(".mk-l");
      if (!t) continue;
      let w = 60;
      try { w = t.getComputedTextLength() || w; } catch (e) { /* mesure indisponible */ }
      const rr = o.r - 4 - (o.siege ? 9 : 0);
      const cands = [[0, rr + 17, "middle"], [0, -(rr + (o.siege ? 24 : 8)), "middle"], [rr + 7, 4.5, "start"], [-(rr + 7), 4.5, "end"]];
      const boite = ([dx, dy, an]) => ({ x: o.qx + dx - (an === "middle" ? w / 2 : an === "end" ? w : 0) - 2, y: o.qy + dy - 12, w: w + 4, h: 16 });
      const choix = cands.find((c) => !boites.some((bx) => touche(boite(c), bx))) || cands[0];
      t.setAttribute("x", choix[0]); t.setAttribute("y", choix[1]); t.setAttribute("text-anchor", choix[2]);
      boites.push(boite(choix));
    }
    for (const o of it) {
      const x = v.x + o.qx * s, y = v.y + o.qy * s;
      o.g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})`);
      const lx = o.px - o.qx, ly = o.py - o.qy, ecart = Math.hypot(lx, ly) > 2;
      const l = o.g.querySelector(".lien"), an = o.g.querySelector(".ancre");
      if (l) { l.setAttribute("x2", lx.toFixed(1)); l.setAttribute("y2", ly.toFixed(1)); l.style.display = ecart ? "" : "none"; }
      if (an) { an.setAttribute("cx", lx.toFixed(1)); an.setAttribute("cy", ly.toFixed(1)); an.style.display = ecart ? "" : "none"; }
    }
  }
  function zoomer(svg, k, cx, cy) {
    const v = S.carteV || { x: 0, y: 0, w: 1000 };
    const r = svg.getBoundingClientRect();
    const px = cx == null ? 0.5 : (cx - r.left) / r.width, py = cy == null ? 0.5 : (cy - r.top) / r.height;
    const h = v.w / 1.6;
    const ux = v.x + px * v.w, uy = v.y + py * h;
    const w = Math.max(70, Math.min(1150, v.w * k));
    appliquerVue(svg, bornerVue({ x: ux - px * w, y: uy - py * (w / 1.6), w }));
  }
  function apresRenduMain() {
    const box = $("#carte-box");
    if (!box) return;
    const w = box.clientWidth;
    if (w) S.carteLargeur = w;
    const svg = $("#carte-svg");
    if (svg && S.carteV) disposerMarques(svg);
  }
  document.addEventListener("pointerdown", (ev) => {
    const svg = ev.target.closest && ev.target.closest("#carte-svg");
    if (!svg || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    CT.ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (CT.ptrs.size === 1) { CT.depart = { x: ev.clientX, y: ev.clientY, v: { ...(S.carteV || { x: 0, y: 0, w: 1000 }) } }; CT.glisse = false; CT.pinch = null; }
    else if (CT.ptrs.size === 2) { const [a, b] = [...CT.ptrs.values()]; CT.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: (S.carteV || { w: 1000 }).w }; CT.glisse = true; }
  });
  document.addEventListener("pointermove", (ev) => {
    const svg = $("#carte-svg");
    if (!svg) return;
    if (CT.ptrs.has(ev.pointerId)) {
      CT.ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const r = svg.getBoundingClientRect();
      if (CT.ptrs.size >= 2 && CT.pinch) {
        const [a, b] = [...CT.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const v = S.carteV;
        const k = (CT.pinch.w * (CT.pinch.d / d)) / v.w;
        zoomer(svg, k, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      if (CT.depart) {
        const dx = ev.clientX - CT.depart.x, dy = ev.clientY - CT.depart.y;
        if (!CT.glisse && Math.hypot(dx, dy) < 5) return;
        CT.glisse = true;
        const v0 = CT.depart.v;
        const u = v0.w / r.width;
        appliquerVue(svg, bornerVue({ x: v0.x - dx * u, y: v0.y - dy * u, w: v0.w }));
        svg.classList.add("drag");
      }
      return;
    }
    const tip = $("#carte-tip");
    if (!tip || ev.pointerType === "touch") return;
    const cible = ev.target.closest && ev.target.closest("#carte-svg [data-nom]");
    if (!cible) { tip.hidden = true; return; }
    const box = $("#carte-box").getBoundingClientRect();
    const iso = cible.dataset.iso;
    const n = cible.dataset.n != null ? Number(cible.dataset.n) : null;
    let txt = cible.dataset.nom;
    if (n != null) txt += ` · ${pluriel(n, "membre", "membres")}`;
    else if (iso) { const pts = pointsSDE().filter((g) => isoDePays(g.pays) === iso); if (pts.length) txt += ` · ${pluriel(pts.reduce((t, g) => t + membresDeG(g.id, true).length, 0), "membre", "membres")}`; }
    tip.textContent = txt;
    tip.hidden = false;
    tip.style.left = Math.min(box.width - 10, Math.max(10, ev.clientX - box.left)) + "px";
    tip.style.top = (ev.clientY - box.top - 14) + "px";
  });
  const finPointeur = (ev) => {
    if (!CT.ptrs.has(ev.pointerId)) return;
    CT.ptrs.delete(ev.pointerId);
    if (CT.ptrs.size < 2) CT.pinch = null;
    if (!CT.ptrs.size) { CT.depart = null; const svg = $("#carte-svg"); if (svg) svg.classList.remove("drag"); }
    else { const [a] = [...CT.ptrs.values()]; CT.depart = { x: a.x, y: a.y, v: { ...S.carteV } }; }
  };
  document.addEventListener("pointerup", finPointeur);
  document.addEventListener("pointercancel", finPointeur);
  document.addEventListener("pointerleave", (ev) => { if (ev.target && ev.target.id === "carte-svg") { const tip = $("#carte-tip"); if (tip) tip.hidden = true; } }, true);
  document.addEventListener("click", (ev) => {
    if (CT.glisse && ev.target.closest && ev.target.closest("#carte-svg")) { ev.stopPropagation(); ev.preventDefault(); }
    CT.glisse = false;
  }, true);
  document.addEventListener("wheel", (ev) => {
    const svg = ev.target.closest && ev.target.closest("#carte-svg");
    if (!svg) return;
    ev.preventDefault();
    zoomer(svg, Math.exp(Math.max(-0.5, Math.min(0.5, ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0018)))), ev.clientX, ev.clientY);
  }, { passive: false });
  window.addEventListener("resize", () => { if ($("#carte-box")) apresRenduMain(); });
  function ouvrirNouveauPoint(pays) {
    ouvrirFormGarnison(null, "", { type: TYPE_POINT, pays: pays || "", nom: pays ? `SDE ${pays}` : "" });
  }
  /* ════════════════════════ Cotisations spéciales et offrandes ════════════════════════ */
  const TYPES_OFFRANDE = [["Offrande", "Offrandes"], ["Dîme", "Dîmes"], ["Action de grâce", "Offrandes"], ["Prémices", "Offrandes"], ["Semence", "Offrandes"], ["Don", "Dons"]];
  const DONATEURS = [["membre", "Un membre"], ["collecte", "Collecte de l’assemblée"], ["anonyme", "Anonyme"], ["autre", "Autre personne"]];
  function categorieEntree(voulue) {
    const cats = cfg().categoriesEntree;
    return cats.find((x) => norm(x) === norm(voulue)) || cats.find((x) => norm(x).startsWith(norm(voulue).slice(0, 5))) || voulue;
  }
  const categorieOffrande = (type) => categorieEntree((TYPES_OFFRANDE.find(([t]) => t === type) || ["", "Offrandes"])[1]);
  const speciale = (id) => (S.speciales || []).find((x) => x.id === id) || null;
  const offrande = (id) => (S.offrandes || []).find((x) => x.id === id) || null;
  function cibleSp(sp) {
    const c = sp.cible || { type: "tous" };
    if (c.type === "garnison" && garnison(c.valeur)) return { lib: garnison(c.valeur).nom, liste: membresDeG(c.valeur, true) };
    if (c.type === "pole" && c.valeur) return { lib: c.valeur, liste: membresActifs().filter((m) => m.pole === c.valeur) };
    return { lib: "Tous les membres actifs", liste: membresActifs() };
  }
  const versementsSp = (sp) => Object.entries(sp.versements || {}).filter(([, v]) => v && typeof v === "object").map(([vid, v]) => ({ vid, ...v })).sort((a, b) => cmpFr(b.date || "", a.date || ""));
  function bilanSp(sp) {
    const vs = versementsSp(sp).filter((v) => !v.annule);
    const parM = {};
    vs.forEach((v) => { parM[v.membreId] = (parM[v.membreId] || 0) + (Number(v.montant) || 0); });
    const cible = cibleSp(sp);
    const mt = Number(sp.montant) || 0;
    const collecte = vs.reduce((t, v) => t + (Number(v.montant) || 0), 0);
    const attendu = mt ? mt * cible.liste.length : Number(sp.objectif) || 0;
    const soldes = mt ? cible.liste.filter((m) => (parM[m.id] || 0) >= mt).length : 0;
    return { vs, parM, cible, mt, collecte, attendu, soldes, contributeurs: Object.keys(parM).length, taux: attendu ? collecte / attendu : null };
  }
  const ouverteSp = (sp) => (sp.statut || "Ouverte") === "Ouverte";
  function rowSpeciale(sp) {
    const b = bilanSp(sp);
    const meta = [sp.echeance ? `échéance ${fmtCourt(sp.echeance)}` : "", b.cible.lib, b.mt ? `${fcfa(b.mt)} par membre` : sp.objectif ? `objectif ${fcfa(sp.objectif)}` : "montant libre"].filter(Boolean).join(" · ");
    const retard = ouverteSp(sp) && sp.echeance && sp.echeance < aujourdhui();
    return `<button class="row nolead" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}"><span class="row-main"><span class="row-t">${esc(sp.titre || "Sans titre")}</span><span class="row-m">${esc(meta)}</span>${b.attendu ? `<span class="bar slim${b.taux >= 1 ? " ok" : ""}" aria-hidden="true"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r"><span class="amt in">${nb(b.collecte)}</span>${b.attendu ? `<span class="chip${b.taux >= 1 ? " ok" : ""}">${pct(b.taux)}</span>` : ""}${!ouverteSp(sp) ? `<span class="chip">Close</span>` : retard ? `<span class="chip warn">Échue</span>` : ""}</span></button>`;
  }
  function vueSpeciales() {
    const adm = peutAdmin();
    let out = `<div class="toolbar"><p class="hint" style="margin:0">Collectes ponctuelles : conférence, mission, construction, solidarité…</p><div class="btn-row">${adm ? btn("ajout-speciale", "Nouvelle cotisation spéciale", { ico: "i-plus", cls: "btn-primary" }) : ""}</div></div>`;
    if (!S.pret.speciales || !S.pret.membres) return out + chargement("Lecture des cotisations spéciales…");
    const tout = (S.speciales || []).slice().sort((a, b) => cmpFr(b.debut || "", a.debut || "") || (b.creeLe || 0) - (a.creeLe || 0));
    if (!tout.length) return out + vide("i-flag", "Aucune cotisation spéciale. Créez-en une pour chaque occasion (IN FIRE, mission, construction, action sociale…) : montant attendu par membre ou objectif global, échéance, membres concernés. Chaque versement entre dans la caisse et la progression se suit ici.", adm ? btn("ajout-speciale", "Créer une cotisation spéciale", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const f = S.f.speciales;
    const ouv = tout.filter(ouverteSp), closes = tout.filter((x) => !ouverteSp(x));
    const collecte = tout.reduce((t, sp) => t + bilanSp(sp).collecte, 0);
    const an = new Date().getFullYear();
    const cetteAnnee = tout.filter((sp) => String(sp.debut || "").startsWith(String(an))).reduce((t, sp) => t + bilanSp(sp).collecte, 0);
    out += `<div class="stats s4">
      <div class="stat"><span class="stat-l">${I("i-flag")}En cours</span><span class="stat-v">${nb(ouv.length)}</span><span class="stat-m">${pluriel(closes.length, "close", "closes")}</span></div>
      <div class="stat in"><span class="stat-l">${I("i-in")}Collecté en ${an}</span><span class="stat-v">${nb(cetteAnnee)}<small>FCFA</small></span><span class="stat-m">Cotisations lancées cette année</span></div>
      <div class="stat"><span class="stat-l">Collecté au total</span><span class="stat-v">${nb(collecte)}<small>FCFA</small></span><span class="stat-m">Toutes les cotisations spéciales</span></div>
      <div class="stat"><span class="stat-l">Reste à collecter</span><span class="stat-v">${nb(ouv.reduce((t, sp) => { const b = bilanSp(sp); return t + Math.max(0, b.attendu - b.collecte); }, 0))}<small>FCFA</small></span><span class="stat-m">Sur les cotisations en cours</span></div></div>
      <div class="filters"><div class="chips" role="group" aria-label="Filtrer">${[["ouvertes", "En cours", ouv.length], ["closes", "Closes", closes.length], ["toutes", "Toutes", tout.length]].map(([id, l, n]) => `<button class="chip-btn${f.filtre === id ? " on" : ""}" type="button" data-act="sp-filtre" data-v="${id}" aria-pressed="${f.filtre === id}">${l} · ${nb(n)}</button>`).join("")}</div></div>`;
    const liste = f.filtre === "closes" ? closes : f.filtre === "toutes" ? tout : ouv;
    if (!liste.length) return out + vide("i-check", f.filtre === "closes" ? "Aucune cotisation spéciale close." : "Aucune cotisation spéciale en cours.");
    return out + `<div class="list">${liste.map(rowSpeciale).join("")}</div>`;
  }
  function ficheSpeciale(id) {
    const sp = speciale(id);
    if (!sp) return null;
    const adm = peutAdmin();
    const b = bilanSp(sp);
    const ouv = ouverteSp(sp);
    const concernes = b.cible.liste.slice().sort((x, y) => {
      const rx = b.mt ? Math.max(0, b.mt - (b.parM[x.id] || 0)) : -(b.parM[x.id] || 0), ry = b.mt ? Math.max(0, b.mt - (b.parM[y.id] || 0)) : -(b.parM[y.id] || 0);
      return ry - rx || parNom(x, y);
    });
    const ids = new Set(concernes.map((m) => m.id));
    const autres = Object.keys(b.parM).filter((mid) => !ids.has(mid)).map(membre).filter(Boolean);
    const ligneM = (m) => {
      const v = b.parM[m.id] || 0;
      const reste = b.mt ? Math.max(0, b.mt - v) : 0;
      const chip = b.mt ? (reste === 0 ? `<span class="chip ok">Soldé</span>` : v ? `<span class="chip warn">Reste ${nb(reste)}</span>` : `<span class="chip">Rien versé</span>`) : v ? `<span class="chip ok">A contribué</span>` : `<span class="chip">Pas encore</span>`;
      const msg = messageSpeciale(sp, m, reste);
      return `<div class="row nolead sp-row"><span class="row-main"><button class="link row-t" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button><span class="row-m">${v ? `${esc(fcfa(v))} versés` : "Aucun versement"}</span></span><span class="row-r">${chip}${adm && ouv && (!b.mt || reste) ? `<button class="icon-btn" type="button" data-act="ajout-versement-sp" data-id="${esc(sp.id)}" data-mid="${esc(m.id)}" aria-label="Enregistrer un versement de ${esc(nomComplet(m))}">${I("i-plus")}</button>` : ""}${ouv && (b.mt ? reste : !v) && m.telephone ? `<a class="icon-btn" href="${esc(lienWa(m.telephone, msg))}" target="_blank" rel="noopener" aria-label="Relancer ${esc(nomComplet(m))} sur WhatsApp">${I("i-msg")}</a>` : ""}</span></div>`;
    };
    const versements = b.vs.length || versementsSp(sp).length ? versementsSp(sp).map((v) => { const m = membre(v.membreId); return `<button class="row nolead${v.annule ? " reversed" : ""}" type="button" data-act="voir-op-de" data-mois="${esc(v.opMois || "")}" data-id="${esc(v.opId || "")}"><span class="row-main"><span class="row-t">${esc(m ? nomComplet(m) : "Membre retiré du registre")}</span><span class="row-m">${esc([fmtJour(v.date), v.moyen, v.piece].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${v.annule ? "" : "in"}">+${nb(v.montant)}</span>${v.annule ? `<span class="chip danger">Annulé</span>` : ""}</span></button>`; }).join("") : "";
    const relancer = concernes.filter((m) => (b.mt ? (b.parM[m.id] || 0) < b.mt : !b.parM[m.id]));
    return `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-flag")}</span><div><h3>${esc(sp.titre)}</h3><p>${esc(ouv ? (sp.echeance && sp.echeance < aujourdhui() ? "Échéance dépassée" : "En cours") : "Close")}</p></div></div>
      ${sp.description ? `<p style="white-space:pre-wrap;margin:0 0 12px">${esc(sp.description)}</p>` : ""}
      <div class="figure"><span class="big-figure in">${nb(b.collecte)}<small>FCFA collectés</small></span>${b.attendu ? `<span class="chip${b.taux >= 1 ? " ok" : ""}">${pct(b.taux)} de ${esc(fcfa(b.attendu))}</span>` : ""}</div>
      ${b.attendu ? `<div class="bar${b.taux >= 1 ? " ok" : ""}" style="margin:6px 0 14px" role="img" aria-label="${esc(`${pct(b.taux)} collectés`)}"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}
      ${kv([["Membres concernés", esc(`${b.cible.lib} (${nb(b.cible.liste.length)})`)], ["Montant par membre", b.mt ? esc(fcfa(b.mt)) : "Libre"], ["Objectif global", sp.objectif ? esc(fcfa(sp.objectif)) : ""], ["Lancée le", sp.debut ? esc(fmtJour(sp.debut)) : ""], ["Échéance", sp.echeance ? esc(fmtJour(sp.echeance)) : ""], ["Contributeurs", esc(`${nb(b.contributeurs)}${b.mt ? ` · ${nb(b.soldes)} soldés` : ""}`)]])}
      <div class="actions">${adm && ouv ? btn("ajout-versement-sp", "Enregistrer un versement", { ico: "i-plus", cls: "btn-primary", data: `data-id="${esc(sp.id)}"` }) : ""}${ouv && relancer.length && peutEcrire() ? btn("relancer-sp", `Relancer (${nb(relancer.length)})`, { ico: "i-horn", data: `data-id="${esc(sp.id)}"` }) : ""}${btn("export-sp", "Exporter", { ico: "i-down", data: `data-id="${esc(sp.id)}"` })}${adm ? btn("editer-speciale", "Modifier", { ico: "i-edit", data: `data-id="${esc(sp.id)}"` }) : ""}${adm ? btn("statut-speciale", ouv ? "Clôturer" : "Rouvrir", { ico: ouv ? "i-lock" : "i-undo", data: `data-id="${esc(sp.id)}"` }) : ""}${adm && !versementsSp(sp).length ? btn("supprimer-speciale", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(sp.id)}"` }) : ""}</div>
      <h3 class="h3">Membres concernés</h3>${concernes.length ? `<div class="list">${concernes.map(ligneM).join("")}</div>` : `<p class="hint">Aucun membre concerné.</p>`}
      ${autres.length ? `<h3 class="h3">Autres contributeurs</h3><div class="list">${autres.map(ligneM).join("")}</div>` : ""}
      <h3 class="h3">Versements</h3>${versements ? `<div class="list">${versements}</div>` : `<p class="hint">Aucun versement enregistré.</p>`}`;
  }
  function messageSpeciale(sp, m, reste) {
    const c = cfg();
    return `Bonjour ${prenomUsuel(m)}, que la grâce de Dieu soit avec toi. Rappel fraternel : la cotisation spéciale « ${sp.titre} » du mouvement ${c.nomCourt}${sp.echeance ? `, attendue pour le ${fmtJour(sp.echeance)},` : ""} ${reste ? `reste à compléter (${fcfa(reste)})` : "compte sur ta participation"}. Merci pour ta générosité et ton engagement !`;
  }
  const ouvrirSpeciale = (id) => ouvrir({ titre: "Cotisation spéciale", wide: true, refresh: surveiller(() => ficheSpeciale(id)) });
  function ouvrirFormSpeciale(id) {
    const sp = id ? speciale(id) : { debut: aujourdhui(), cible: { type: "tous" } };
    if (id && !sp) return;
    const c = cfg();
    const cibleVal = sp.cible && sp.cible.type === "garnison" ? "g:" + sp.cible.valeur : sp.cible && sp.cible.type === "pole" ? "p:" + sp.cible.valeur : "tous";
    const opts = `<option value="tous"${cibleVal === "tous" ? " selected" : ""}>Tous les membres actifs</option>${S.garnisons.length ? `<optgroup label="Une garnison ou un point SDE">${optionsGarnisons().map(([v, l]) => `<option value="g:${esc(v)}"${cibleVal === "g:" + v ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` : ""}<optgroup label="Un pôle">${c.poles.map((p) => `<option value="p:${esc(p)}"${cibleVal === "p:" + p ? " selected" : ""}>${esc(p)}</option>`).join("")}</optgroup>`;
    const html = `<form class="form" id="f-sp" novalidate>
      ${champ("sp-titre", "Intitulé", inp("sp-titre", "titre", sp.titre, 'autocomplete="off" required autofocus placeholder="IN FIRE 2026, Mission Tunisie, Construction…"'), { req: true })}
      ${champ("sp-desc", "Objet", zone("sp-desc", "description", sp.description, 'rows="3" placeholder="À quoi servira cette collecte"'))}
      ${champ("sp-cible", "Membres concernés", `<select class="inp" id="sp-cible" name="cible">${opts}</select>`)}
      <div class="f2">${champ("sp-mt", "Montant attendu par membre (FCFA)", inp("sp-mt", "montant", sp.montant ? nb(sp.montant) : "", 'inputmode="numeric" autocomplete="off" placeholder="Libre"'), { hint: "Laissez vide pour une contribution libre." })}${champ("sp-obj", "Objectif global (FCFA)", inp("sp-obj", "objectif", sp.objectif ? nb(sp.objectif) : "", 'inputmode="numeric" autocomplete="off" placeholder="Facultatif"'))}</div>
      <div class="f2">${champ("sp-debut", "Lancée le", inp("sp-debut", "debut", sp.debut || aujourdhui(), 'type="date"'))}${champ("sp-ech", "Échéance", inp("sp-ech", "echeance", sp.echeance, 'type="date"'))}</div>
      ${pied(id ? "Enregistrer les modifications" : "Lancer la cotisation")}
    </form>`;
    ouvrir({ titre: id ? "Modifier la cotisation spéciale" : "Nouvelle cotisation spéciale", html, wide: true, onSubmit: (fd, form) => enregistrerSpeciale(fd, form, id) });
  }
  async function enregistrerSpeciale(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé de la cotisation."); return; }
    const cv = g("cible");
    const cible = cv.startsWith("g:") ? { type: "garnison", valeur: cv.slice(2) } : cv.startsWith("p:") ? { type: "pole", valeur: cv.slice(2) } : { type: "tous", valeur: "" };
    const data = { titre: g("titre"), description: g("description"), cible, montant: Number(g("montant").replace(/\D/g, "")) || 0, objectif: Number(g("objectif").replace(/\D/g, "")) || 0, debut: g("debut") || aujourdhui(), echeance: g("echeance") };
    if (data.echeance && data.echeance < data.debut) { erreurForm("L’échéance doit suivre la date de lancement."); return; }
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(async () => {
      if (id) await S.db.doc("cotis_speciales/" + id).update({ ...data, ...tampon() });
      else { ref = ref || S.db.collection("cotis_speciales").doc(); await ref.set({ ...data, statut: "Ouverte", versements: {}, ...creation() }); }
    }, id ? "Cotisation modifiée" : "Cotisation spéciale lancée");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirSpeciale(id || ref.id);
  }
  function ouvrirFormVersementSp(id, mid) {
    const sp = speciale(id);
    if (!sp) return;
    const c = cfg();
    const b = bilanSp(sp);
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const lib = (m) => { const v = b.parM[m.id] || 0; return nomComplet(m) + (b.mt ? ` · ${v >= b.mt ? "soldé" : `reste ${nb(b.mt - v)}`}` : v ? ` · ${nb(v)} versés` : ""); };
    const groupe = (titre, liste) => liste.length ? `<optgroup label="${esc(titre)}">${liste.map((m) => `<option value="${esc(m.id)}"${m.id === mid ? " selected" : ""}>${esc(lib(m))}</option>`).join("")}</optgroup>` : "";
    const concernes = b.cible.liste.slice().sort(parNom), autres = membresActifs().filter((m) => !ids.has(m.id));
    const reste = (m) => (m && b.mt ? Math.max(0, b.mt - (b.parM[m.id] || 0)) : 0);
    const html = `<form class="form" id="f-vsp" novalidate>
      <p class="hint" style="margin-top:0">Cotisation spéciale <b>${esc(sp.titre)}</b>${b.mt ? ` · ${esc(fcfa(b.mt))} par membre` : ""}</p>
      ${champ("v-membre", "Membre", `<select class="inp" id="v-membre" name="membreId" required><option value="">Choisir un membre</option>${groupe("Membres concernés", concernes)}${groupe("Autres membres", autres)}</select>`, { req: true })}
      <div class="f2">${champ("v-mt", "Montant versé (FCFA)", inp("v-mt", "montant", mid && reste(membre(mid)) ? nb(reste(membre(mid))) : "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("v-date", "Date du versement", inp("v-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("v-moyen", "Moyen de paiement", sel("v-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("v-piece", "N° de pièce ou référence", inp("v-piece", "piece", "", 'autocomplete="off" placeholder="Reçu, transaction…"'))}</div>
      <p class="hint">Le versement entre aussi dans le journal de caisse, catégorie « ${esc(categorieCotis())} ».</p>
      ${pied("Enregistrer le versement")}
    </form>`;
    ouvrir({
      titre: "Versement", html, wide: true, onSubmit: (fd, form) => enregistrerVersementSp(fd, form, id),
      apres: (sheet) => {
        const mt = sheet.querySelector("#v-mt");
        sheet.querySelector("#v-membre").addEventListener("change", (ev) => { if (!mt.dataset.manuel) { const r = reste(membre(ev.target.value)); mt.value = r ? nb(r) : ""; } });
        mt.addEventListener("input", () => { mt.dataset.manuel = "1"; });
        mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); });
        mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; });
      },
    });
  }
  function verifierDateCaisse(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > aujourdhui()) return "Indiquez une date valide, au plus tard aujourd’hui.";
    if (moisClos(date.slice(0, 7))) return `${cap(fmtMois(date.slice(0, 7)))} est clôturé dans la caisse : choisissez une date dans un mois ouvert.`;
    return "";
  }
  async function enregistrerVersementSp(fd, form, id) {
    const sp = speciale(id);
    const mid = String(fd.get("membreId") || "");
    const m = membre(mid);
    if (!sp || !m) { erreurForm("Choisissez le membre."); return; }
    const montant = Number(String(fd.get("montant") || "").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant versé."); return; }
    const date = String(fd.get("date") || "");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const vid = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const moyen = String(fd.get("moyen") || ""), piece = String(fd.get("piece") || "").trim();
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: categorieCotis(), moyen, libelle: `Cotisation spéciale « ${sp.titre} » · ${nomComplet(m)}`, membreId: mid, evenementId: null, piece, speciale: { id, vid }, annule: false, ...creation() });
      await S.db.doc("cotis_speciales/" + id).update({ versements: { [vid]: { membreId: mid, montant, date, moyen, piece, opId: opRef.id, opMois: cle, annule: false } }, ...tampon() });
    }, `Versement de ${fcfa(montant)} enregistré`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirSpeciale(id);
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function exporterSpeciale(id) {
    const sp = speciale(id);
    if (!sp) return;
    const b = bilanSp(sp);
    const rows = [["Matricule", "Nom", "Prénoms", "Concerné", "Versé (FCFA)", "Attendu (FCFA)", "Reste (FCFA)"]];
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const liste = b.cible.liste.concat(Object.keys(b.parM).filter((x) => !ids.has(x)).map(membre).filter(Boolean));
    liste.forEach((m) => { const v = b.parM[m.id] || 0; rows.push([m.matricule || "", String(m.nom || "").toUpperCase(), m.prenoms || "", ids.has(m.id) ? "oui" : "non", String(v), b.mt && ids.has(m.id) ? String(b.mt) : "", b.mt && ids.has(m.id) ? String(Math.max(0, b.mt - v)) : ""]); });
    telecharger(`cotisation-speciale-${sansAccents(sp.titre).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.csv`, versCSV(rows));
  }

  /* — Offrandes, dîmes et dons — */
  const donateurOff = (o) => (o.donateur === "membre" ? (membre(o.membreId) ? nomComplet(membre(o.membreId)) : "Membre retiré du registre") : o.donateur === "collecte" ? "Collecte de l’assemblée" : o.donateur === "anonyme" ? "Anonyme" : o.nom || "Autre personne");
  function vueOffrandes() {
    const adm = peutAdmin();
    const an = S.annee;
    const curY = new Date().getFullYear();
    let out = `<div class="toolbar"><div class="mnav"><button class="icon-btn" type="button" data-act="annee-prec" aria-label="Année précédente">${I("i-left")}</button><span class="mnav-l" aria-live="polite">Année ${an}</span><button class="icon-btn" type="button" data-act="annee-suiv" aria-label="Année suivante"${an >= curY + 1 ? " disabled" : ""}>${I("i-right")}</button></div><div class="btn-row">${adm ? btn("ajout-offrande", "Enregistrer une offrande", { ico: "i-plus", cls: "btn-primary" }) : ""}${btn("export-offrandes", `<span class="hide-s">Exporter</span>`, { ico: "i-down", cls: "btn-ghost ico-s", attrs: 'aria-label="Exporter les offrandes en CSV"' })}</div></div>`;
    if (!S.pret.offrandes) return out + chargement("Lecture des offrandes…");
    const annee = (S.offrandes || []).filter((o) => String(o.date || "").startsWith(String(an)));
    const valides = annee.filter((o) => !o.annule);
    const tot = valides.reduce((t, o) => t + (Number(o.montant) || 0), 0);
    const parType = {};
    valides.forEach((o) => { parType[o.type || "Offrande"] = (parType[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
    const dimes = parType["Dîme"] || 0, dons = parType["Don"] || 0;
    out += `<div class="stats s4">
      <div class="stat in"><span class="stat-l">${I("i-in")}Total ${an}</span><span class="stat-v">${nb(tot)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.length, "enregistrement", "enregistrements")}</span></div>
      <div class="stat"><span class="stat-l">Offrandes</span><span class="stat-v">${nb(tot - dimes - dons)}<small>FCFA</small></span><span class="stat-m">Offrandes, actions de grâce, prémices, semences</span></div>
      <div class="stat"><span class="stat-l">Dîmes</span><span class="stat-v">${nb(dimes)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.filter((o) => o.type === "Dîme").length, "versement", "versements")}</span></div>
      <div class="stat"><span class="stat-l">Dons</span><span class="stat-v">${nb(dons)}<small>FCFA</small></span><span class="stat-m">${pluriel(valides.filter((o) => o.type === "Don").length, "don", "dons")}</span></div></div>`;
    if (!annee.length) return out + vide("i-in", `Aucune offrande enregistrée en ${an}. Enregistrez les offrandes, dîmes, actions de grâce, prémices, semences et dons : chacun entre dans la caisse avec sa catégorie et se retrouve ici, par mois et par type.`, adm ? btn("ajout-offrande", "Enregistrer une offrande", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    const parMois = Array.from({ length: 12 }, (_, i) => valides.filter((o) => o.date.slice(5, 7) === pad(i + 1)).reduce((t, o) => t + (Number(o.montant) || 0), 0));
    const max = Math.max(1, ...parMois);
    out += `<div class="grid g2">${carte("Par mois", `<div class="mbars" role="img" aria-label="${esc(parMois.map((v, i) => `${MOIS_NOMS[i]} : ${fcfa(v)}`).join(" ; "))}">${parMois.map((v, i) => `<div class="mb-col" title="${esc(`${cap(MOIS_NOMS[i])} : ${fcfa(v)}`)}"><div class="mb-bar"><i style="height:${((v / max) * 100).toFixed(1)}%"></i></div><span>${MOIS_INI[i]}</span></div>`).join("")}</div>`)}${carte("Par type", barresGroupe(parType, "in"))}</div>`;
    const f = S.f.offrandes;
    out += `<div class="filters" style="margin-top:14px"><div class="chips" role="group" aria-label="Type">${[["", "Tous"]].concat(TYPES_OFFRANDE.map(([t]) => [t, t])).map(([id, l]) => `<button class="chip-btn${f.type === id ? " on" : ""}" type="button" data-act="off-type" data-v="${esc(id)}" aria-pressed="${f.type === id}">${esc(l)}</button>`).join("")}</div><label class="sr" for="q-off">Rechercher</label><input class="search" id="q-off" type="search" placeholder="Donateur, occasion, référence…" value="${esc(f.q)}" data-filtre="offrandes.q" autocomplete="off"></div>`;
    const q = norm(f.q);
    const liste = annee.filter((o) => (!f.type || o.type === f.type) && (!q || norm([donateurOff(o), o.occasion, o.piece, o.note, o.type].join(" ")).includes(q))).sort((a, b) => cmpFr(b.date || "", a.date || "") || (b.creeLe || 0) - (a.creeLe || 0));
    if (!liste.length) return out + vide("i-search", "Aucune offrande ne correspond.");
    const groupes = [];
    liste.forEach((o) => { const k = o.date.slice(0, 7); const g = groupes[groupes.length - 1]; if (g && g.k === k) g.l.push(o); else groupes.push({ k, l: [o] }); });
    return out + groupes.map(({ k, l }) => `<h2 class="day-h">${esc(cap(fmtMois(k)))} · ${esc(fcfa(l.filter((o) => !o.annule).reduce((t, o) => t + (Number(o.montant) || 0), 0)))}</h2><div class="list">${l.map((o) => `<button class="row${o.annule ? " reversed" : ""}" type="button" data-act="voir-offrande" data-id="${esc(o.id)}"><span class="mark-io ${o.annule ? "neutral" : "in"}">${I("i-in")}</span><span class="row-main"><span class="row-t">${esc(o.type || "Offrande")} · ${esc(donateurOff(o))}</span><span class="row-m">${esc([fmtJour(o.date), o.occasion, o.moyen].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${o.annule ? "" : "in"}">+${nb(o.montant)}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</span></button>`).join("")}</div>`).join("");
  }
  function ficheOffrande(id) {
    const o = offrande(id);
    if (!o) return null;
    const e = o.evenementId ? evt(o.evenementId) : null;
    return `<div class="figure"><span class="big-figure ${o.annule ? "" : "in"}">+${nb(o.montant)}<small>FCFA</small></span><span class="chip in">${esc(o.type || "Offrande")}</span>${o.annule ? `<span class="chip danger">Annulée</span>` : ""}</div>
      <p class="hint" style="margin-bottom:12px">${esc(cap(enLettres(o.montant)))} francs CFA</p>
      ${kv([["Date", esc(fmtLong(o.date))], ["Donateur", o.donateur === "membre" && membre(o.membreId) ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(o.membreId)}">${esc(donateurOff(o))}</button>` : esc(donateurOff(o))], ["Rassemblement", e ? esc(`${e.titre} · ${fmtCourt(e.date)}`) : ""], ["Occasion", esc(o.occasion || "")], ["Moyen", esc(o.moyen || "")], ["Référence", esc(o.piece || "")], ["Note", o.note ? `<span style="white-space:pre-wrap">${esc(o.note)}</span>` : ""], ["Catégorie en caisse", esc(o.categorie || categorieOffrande(o.type))], ["Saisie", esc([o.creeLe ? fmtStamp(o.creeLe) : "", o.creePar ? "par " + nomDe(o.creePar) : ""].filter(Boolean).join(" "))]])}
      <p class="note">Pour corriger ou annuler cette offrande, ouvrez l’opération de caisse correspondante : l’annulation y est tracée avec son motif, puis reportée ici.</p>
      <div class="actions">${o.opId ? btn("voir-op-de", "Opération de caisse et reçu", { ico: "i-receipt", cls: "btn-primary", data: `data-mois="${esc(o.opMois || o.date.slice(0, 7))}" data-id="${esc(o.opId)}"` }) : ""}</div>`;
  }
  const ouvrirOffrande = (id) => ouvrir({ titre: "Offrande", refresh: surveiller(() => ficheOffrande(id)) });
  function ouvrirFormOffrande(preset = {}) {
    const c = cfg();
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m) + (m.matricule ? ` · ${m.matricule}` : "")]);
    const evts = S.evenements.filter((e) => e.date <= aujourdhui()).sort((a, b) => cmpFr(b.date, a.date)).slice(0, 40).map((e) => [e.id, `${fmtCourt(e.date)} · ${e.titre}`]);
    const don = preset.membreId ? "membre" : "collecte";
    const html = `<form class="form" id="f-off" novalidate>
      ${champ("o-type", "Nature", sel("o-type", "type", TYPES_OFFRANDE.map(([t]) => t), preset.type || "Offrande", null))}
      <div class="field"><span class="lab" id="lab-don">Donateur</span><div class="seg s4" role="radiogroup" aria-labelledby="lab-don">${DONATEURS.map(([v, l]) => `<input type="radio" name="donateur" id="o-d-${v}" value="${v}"${v === don ? " checked" : ""}><label for="o-d-${v}">${esc(l)}</label>`).join("")}</div></div>
      <div id="o-membre-w"${don === "membre" ? "" : " hidden"}>${champ("o-membre", "Membre", sel("o-membre", "membreId", mbs, preset.membreId || "", "Choisir un membre"))}</div>
      <div id="o-nom-w" hidden>${champ("o-nom", "Nom du donateur", inp("o-nom", "nom", "", 'autocomplete="off"'))}</div>
      <div class="f2">${champ("o-mt", "Montant (FCFA)", inp("o-mt", "montant", "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("o-date", "Date", inp("o-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("o-evt", "Rassemblement", sel("o-evt", "evenementId", evts, preset.evenementId || "", "Aucun"))}${champ("o-occ", "Occasion", inp("o-occ", "occasion", "", 'autocomplete="off" placeholder="Culte, anniversaire, naissance…"'))}</div>
      <div class="f2">${champ("o-moyen", "Moyen de paiement", sel("o-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("o-piece", "N° de pièce ou référence", inp("o-piece", "piece", "", 'autocomplete="off"'))}</div>
      ${champ("o-note", "Note", zone("o-note", "note", "", 'rows="2"'))}
      <p class="hint" id="o-cat">L’offrande entre aussi dans le journal de caisse.</p>
      ${pied("Enregistrer")}
    </form>`;
    ouvrir({
      titre: "Enregistrer une offrande", html, wide: true, onSubmit: enregistrerOffrande,
      apres: (sheet) => {
        const maj = () => {
          const v = (sheet.querySelector("input[name=donateur]:checked") || {}).value;
          sheet.querySelector("#o-membre-w").hidden = v !== "membre";
          sheet.querySelector("#o-nom-w").hidden = v !== "autre";
          sheet.querySelector("#o-cat").textContent = `L’offrande entre aussi dans le journal de caisse, catégorie « ${categorieOffrande(sheet.querySelector("#o-type").value)} ».`;
        };
        sheet.querySelectorAll("input[name=donateur]").forEach((r) => r.addEventListener("change", maj));
        sheet.querySelector("#o-type").addEventListener("change", maj);
        const mt = sheet.querySelector("#o-mt");
        mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); });
        mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; });
        maj();
      },
    });
  }
  async function enregistrerOffrande(fd, form) {
    const g = (k) => String(fd.get(k) || "").trim();
    const type = g("type") || "Offrande";
    const donateur = g("donateur") || "collecte";
    const membreId = donateur === "membre" ? g("membreId") : "";
    if (donateur === "membre" && !membre(membreId)) { erreurForm("Choisissez le membre."); return; }
    if (donateur === "autre" && !g("nom")) { erreurForm("Indiquez le nom du donateur."); return; }
    const montant = Number(g("montant").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant."); return; }
    const date = g("date");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const ref = S.db.collection("offrandes").doc();
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const o = { type, donateur, membreId, nom: donateur === "autre" ? g("nom") : "", montant, date, evenementId: g("evenementId") || null, occasion: g("occasion"), moyen: g("moyen"), piece: g("piece"), note: g("note"), categorie: categorieOffrande(type), opId: opRef.id, opMois: cle, annule: false };
    const libelle = `${type}${o.occasion ? ` · ${o.occasion}` : ""} · ${donateurOff(o)}`;
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: o.categorie, moyen: o.moyen, libelle, membreId: membreId || null, evenementId: o.evenementId, piece: o.piece, offrande: { id: ref.id }, annule: false, ...creation() });
      await ref.set({ ...o, ...creation() });
    }, `${type} de ${fcfa(montant)} enregistrée`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    S.annee = Number(date.slice(0, 4));
    ouvrirOffrande(ref.id);
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function exporterOffrandes() {
    const an = S.annee;
    const rows = [["Date", "Nature", "Donateur", "Matricule", "Montant (FCFA)", "Moyen", "Référence", "Occasion", "Rassemblement", "Annulée"]];
    (S.offrandes || []).filter((o) => String(o.date || "").startsWith(String(an))).sort((a, b) => cmpFr(a.date, b.date)).forEach((o) => {
      const m = membre(o.membreId), e = o.evenementId ? evt(o.evenementId) : null;
      rows.push([o.date.split("-").reverse().join("/"), o.type || "", donateurOff(o), m ? m.matricule || "" : "", String(o.montant || 0), o.moyen || "", o.piece || "", o.occasion || "", e ? e.titre : "", o.annule ? "oui" : ""]);
    });
    telecharger(`offrandes-${an}.csv`, versCSV(rows));
  }
  /* Une opération annulée ou rétablie dans la caisse se reporte sur la cotisation spéciale ou l’offrande liée. */
  async function synchroAutresOp(op, annule) {
    if (!op) return;
    if (op.speciale && op.speciale.id && op.speciale.vid && speciale(op.speciale.id)) await S.db.doc("cotis_speciales/" + op.speciale.id).update({ versements: { [op.speciale.vid]: { annule: !!annule } }, ...tampon() });
    if (op.offrande && op.offrande.id && offrande(op.offrande.id)) await S.db.doc("offrandes/" + op.offrande.id).update({ annule: !!annule, ...tampon() });
    if (op.projet && op.projet.id && (op.projet.vid || op.projet.did)) {
      const champ = op.projet.vid ? "versements" : "depenses";
      await S.db.doc("projets_fin/" + op.projet.id).update({ [champ]: { [op.projet.vid || op.projet.did]: { annule: !!annule } }, ...tampon() });
    }
  }
  function noteOpLiee(o) {
    if (o.speciale) { const sp = speciale(o.speciale.id); return `<p class="note">Versement pour la cotisation spéciale ${sp ? `<button class="link" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}">« ${esc(sp.titre)} »</button>` : ""}. Pour le corriger, annulez-le puis enregistrez-le de nouveau.</p>`; }
    if (o.projet) { const p = projet(o.projet.id); return `<p class="note">${o.projet.vid ? "Cotisation" : "Dépense"} du projet ${p ? `<button class="link" type="button" data-act="voir-projet" data-id="${esc(p.id)}" data-onglet="finances">« ${esc(p.titre)} »</button>` : ""}. Pour la corriger, annulez-la puis enregistrez-la de nouveau depuis le projet.</p>`; }
    if (o.offrande) return `<p class="note">${esc(offrande(o.offrande.id) ? offrande(o.offrande.id).type || "Offrande" : "Offrande")} enregistrée depuis le journal des offrandes${offrande(o.offrande.id) ? ` · <button class="link" type="button" data-act="voir-offrande" data-id="${esc(o.offrande.id)}">voir la fiche</button>` : ""}. Pour la corriger, annulez-la puis enregistrez-la de nouveau.</p>`;
    return "";
  }
  function vueCotisationsTout() {
    const cv = S.sous.cotis || "fixes";
    const n = (S.speciales || []).filter(ouverteSp).length;
    let out = sousOnglets("cotis", [["fixes", "Fixes (mensuelles)", null], ["speciales", "Spéciales", S.pret.speciales ? n : null], ["offrandes", "Offrandes, dîmes et dons", null]]);
    if (cv === "speciales") return out + vueSpeciales();
    if (cv === "offrandes") return out + vueOffrandes();
    return out + vueCotisations();
  }
  /* Résumé dans la fiche du membre (direction) */
  function blocCotisAutres(m) {
    let out = "";
    if (S.pret.speciales) {
      const sps = (S.speciales || []).map((sp) => ({ sp, b: bilanSp(sp) })).filter(({ sp, b }) => b.parM[m.id] || (ouverteSp(sp) && b.cible.liste.some((x) => x.id === m.id)));
      if (sps.length) out += `<p class="hint" style="margin:10px 0 4px"><b>Cotisations spéciales</b></p><div class="list">${sps.map(({ sp, b }) => { const v = b.parM[m.id] || 0; const reste = b.mt ? Math.max(0, b.mt - v) : 0; return `<button class="row nolead" type="button" data-act="voir-speciale" data-id="${esc(sp.id)}"><span class="row-main"><span class="row-t">${esc(sp.titre)}</span><span class="row-m">${esc(v ? `${fcfa(v)} versés` : "Aucun versement")}</span></span><span class="row-r">${b.mt ? (reste ? `<span class="chip${v ? " warn" : ""}">Reste ${nb(reste)}</span>` : `<span class="chip ok">Soldé</span>`) : v ? `<span class="chip ok">A contribué</span>` : ""}</span></button>`; }).join("")}</div>`;
    }
    if (S.pret.offrandes) {
      const an = new Date().getFullYear();
      const os = (S.offrandes || []).filter((o) => o.membreId === m.id && !o.annule && String(o.date || "").startsWith(String(an)));
      if (os.length) {
        const parT = {};
        os.forEach((o) => { parT[o.type || "Offrande"] = (parT[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
        out += `<p class="hint" style="margin:10px 0 0"><b>Offrandes, dîmes et dons ${an}</b> : ${esc(Object.entries(parT).map(([t, v]) => `${t} ${fcfa(v)}`).join(" · "))}</p>`;
      }
    }
    return out;
  }
  /* ════════════════════════ Projets ════════════════════════ */
  const CATEGORIES_PROJET = ["Construction et aménagement", "Mission et évangélisation", "Action sociale", "Médias et communication", "Formation", "Événement", "Équipement", "Autre"];
  const STATUTS_PROJET = ["Idée", "En préparation", "En cours", "Suspendu", "Terminé", "Abandonné"];
  const PRIORITES = ["Haute", "Normale", "Basse"];
  const STATUTS_TACHE = ["À faire", "En cours", "Fait"];
  const categorieProjet = () => cfg().categoriesEntree.find((x) => norm(x) === norm("Cotisations de projets")) || "Cotisations de projets";
  const projet = (id) => (S.projets || []).find((p) => p.id === id) || null;
  const finProjet = (id) => (S.projetsFin || []).find((x) => x.id === id) || {};
  const listeObj = (o) => Object.entries(o || {}).filter(([, v]) => v && typeof v === "object").map(([id, v]) => ({ id, ...v }));
  const somme = (l) => l.reduce((t, x) => t + (Number(x.montant) || 0), 0);
  const nouvelId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const jalonsP = (p) => listeObj(p.jalons).sort((a, b) => cmpFr(a.date || "9999", b.date || "9999") || (a.ordre || 0) - (b.ordre || 0));
  const RANG_T = { "En cours": 0, "À faire": 1, Fait: 2 };
  const tachesP = (p) => listeObj(p.taches).sort((a, b) => (RANG_T[a.statut] ?? 1) - (RANG_T[b.statut] ?? 1) || cmpFr(a.echeance || "9999", b.echeance || "9999") || (a.creeLe || 0) - (b.creeLe || 0));
  const lignesP = (p) => listeObj(p.lignes).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const notesP = (p) => listeObj(p.notes).sort((a, b) => (b.le || 0) - (a.le || 0));
  const budgetP = (p) => somme(lignesP(p)) || Number(p.budget) || 0;
  const statutP = (p) => p.statut || "En préparation";
  const estActifP = (p) => ["En préparation", "En cours", "Suspendu"].includes(statutP(p));
  const estClosP = (p) => ["Terminé", "Abandonné"].includes(statutP(p));
  const tacheEnRetard = (t) => t.statut !== "Fait" && t.echeance && t.echeance < aujourdhui();
  function avancementP(p) {
    const j = jalonsP(p), t = tachesP(p);
    const items = j.length ? j.map((x) => !!x.fait) : t.map((x) => x.statut === "Fait");
    if (!items.length) return statutP(p) === "Terminé" ? 1 : null;
    return items.filter(Boolean).length / items.length;
  }
  const CHIP_STATUT_P = { Idée: "", "En préparation": "info", "En cours": "ok", Suspendu: "warn", Terminé: "ok", Abandonné: "" };
  const chipStatutP = (p) => `<span class="chip ${CHIP_STATUT_P[statutP(p)] || ""}">${esc(statutP(p))}</span>`;
  function cibleP(p, f) {
    const c = f.cible || { type: "equipe" };
    if (c.type === "tous") return { lib: "Tous les membres actifs", liste: membresActifs() };
    if (c.type === "garnison" && garnison(c.valeur)) return { lib: garnison(c.valeur).nom, liste: membresDeG(c.valeur, true) };
    if (c.type === "pole" && c.valeur) return { lib: c.valeur, liste: membresActifs().filter((m) => m.pole === c.valeur) };
    const ids = new Set([...(p.equipe || []), p.responsableId].filter(Boolean));
    return { lib: "L’équipe du projet", liste: membresActifs().filter((m) => ids.has(m.id)) };
  }
  function bilanFinP(p) {
    const f = finProjet(p.id);
    const tousV = listeObj(f.versements).sort((a, b) => cmpFr(b.date || "", a.date || ""));
    const tousD = listeObj(f.depenses).sort((a, b) => cmpFr(b.date || "", a.date || ""));
    const vs = tousV.filter((v) => !v.annule), ds = tousD.filter((d) => !d.annule);
    const parM = {};
    vs.forEach((v) => { if (v.membreId) parM[v.membreId] = (parM[v.membreId] || 0) + (Number(v.montant) || 0); });
    const promesses = {};
    Object.entries(f.promesses || {}).forEach(([mid, x]) => { if (x && Number(x.montant) > 0) promesses[mid] = { montant: Number(x.montant), date: x.date || "" }; });
    const cible = cibleP(p, f);
    const mt = Number(f.montantParMembre) || 0;
    const collecte = somme(vs), depense = somme(ds);
    const objectif = Number(f.objectifCollecte) || (mt ? mt * cible.liste.length : budgetP(p));
    const depParLigne = {};
    ds.forEach((d) => { depParLigne[d.ligneId || ""] = (depParLigne[d.ligneId || ""] || 0) + (Number(d.montant) || 0); });
    const promis = Object.values(promesses).reduce((t, x) => t + x.montant, 0);
    return { f, tousV, tousD, vs, ds, parM, promesses, promis, cible, mt, collecte, depense, solde: collecte - depense, objectif, taux: objectif ? collecte / objectif : null, depParLigne };
  }
  const attenduMembreP = (b, mid) => Math.max(b.mt, (b.promesses[mid] || {}).montant || 0);
  function rowProjet(p) {
    const av = avancementP(p);
    const resp = membre(p.responsableId);
    const tOuvertes = tachesP(p).filter((t) => t.statut !== "Fait");
    const retard = tOuvertes.filter(tacheEnRetard).length;
    const meta = [p.categorie, resp ? "resp. " + nomCourtM(resp) : "", p.dateFin ? `fin ${fmtCourt(p.dateFin)}` : "", tOuvertes.length ? pluriel(tOuvertes.length, "tâche ouverte", "tâches ouvertes") : ""].filter(Boolean).join(" · ");
    const fin = accesDirection() && S.pret.projetsFin ? bilanFinP(p) : null;
    return `<button class="row" type="button" data-act="voir-projet" data-id="${esc(p.id)}"><span class="g-ico" aria-hidden="true">${I("i-proj")}</span><span class="row-main"><span class="row-t">${esc(p.titre || "Sans titre")}</span><span class="row-m">${esc(meta)}</span>${av != null ? `<span class="bar slim${av >= 1 ? " ok" : ""}" aria-hidden="true"><i style="width:${(av * 100).toFixed(1)}%"></i></span>` : ""}</span><span class="row-r">${av != null ? `<b class="taux">${pct(av)}</b>` : ""}${chipStatutP(p)}${p.priorite === "Haute" && !estClosP(p) ? `<span class="chip danger">Priorité haute</span>` : ""}${retard ? `<span class="chip warn">${pluriel(retard, "tâche en retard", "tâches en retard")}</span>` : ""}${fin && fin.collecte ? `<span class="amt in">${nb(fin.collecte)}</span>` : ""}</span></button>`;
  }
  VUES.projets = function () {
    const ecr = peutEcrire();
    let out = secHead("Projets", { eyebrow: "Bâtir ensemble", verset: VERSETS.projets, actions: ecr ? btn("ajout-projet", "Nouveau projet", { ico: "i-plus", cls: "btn-primary" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("Les projets du mouvement");
    if (!S.pret.projets || !S.pret.membres) return out + chargement("Lecture des projets…");
    const tous = S.projets || [];
    const actifs = tous.filter(estActifP), idees = tous.filter((p) => statutP(p) === "Idée"), clos = tous.filter(estClosP);
    const tOuv = tous.filter((p) => !estClosP(p)).flatMap((p) => tachesP(p).filter((t) => t.statut !== "Fait").map((t) => ({ t, p })));
    out += sousOnglets("projets", [["actifs", "En cours", actifs.length], ["idees", "Idées", idees.length], ["taches", "Tâches", tOuv.length], ["clos", "Terminés", clos.length]]);
    if (!tous.length) return out + vide("i-proj", "Aucun projet enregistré. Créez un projet (construction, mission, action sociale, équipement…) : objectifs, équipe, étapes, tâches, budget par poste, cotisations des membres et dépenses, tout est suivi au même endroit.", ecr ? btn("ajout-projet", "Créer le premier projet", { ico: "i-plus", cls: "btn-primary", sm: true }) : "");
    if (S.sous.projets === "taches") return out + vueTachesProjets(tOuv);
    if (S.sous.projets === "actifs") {
      const retard = tOuv.filter(({ t }) => tacheEnRetard(t)).length;
      const budget = actifs.reduce((t, p) => t + budgetP(p), 0);
      const fin = accesDirection() && S.pret.projetsFin ? actifs.map(bilanFinP) : null;
      const jal = actifs.flatMap(jalonsP);
      out += `<div class="stats s4">
        <div class="stat"><span class="stat-l">${I("i-proj")}Projets en cours</span><span class="stat-v">${nb(actifs.length)}</span><span class="stat-m">${pluriel(idees.length, "idée en attente", "idées en attente")}</span></div>
        <div class="stat${retard ? " out" : ""}"><span class="stat-l">Tâches ouvertes</span><span class="stat-v">${nb(tOuv.length)}</span><span class="stat-m">${retard ? pluriel(retard, "en retard", "en retard") : "Aucune en retard"}</span></div>
        <div class="stat"><span class="stat-l">Budget prévu</span><span class="stat-v">${nb(budget)}<small>FCFA</small></span><span class="stat-m">${pluriel(jal.filter((j) => j.fait).length, "étape atteinte", "étapes atteintes")} sur ${nb(jal.length)}</span></div>
        ${fin ? `<div class="stat in"><span class="stat-l">${I("i-in")}Collecté</span><span class="stat-v">${nb(fin.reduce((t, b) => t + b.collecte, 0))}<small>FCFA</small></span><span class="stat-m">${esc(fcfa(fin.reduce((t, b) => t + b.depense, 0)))} dépensés</span></div>` : `<div class="stat"><span class="stat-l">Avancement moyen</span><span class="stat-v">${pct((() => { const a = actifs.map(avancementP).filter((x) => x != null); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; })())}</span><span class="stat-m">Étapes ou tâches réalisées</span></div>`}</div>`;
    }
    const f = S.f.projets;
    out += `<div class="filters"><label class="sr" for="q-proj">Rechercher un projet</label><input class="search" id="q-proj" type="search" placeholder="Projet, responsable, catégorie…" value="${esc(f.q)}" data-filtre="projets.q" autocomplete="off"><label class="sr" for="f-pcat">Catégorie</label><select class="sel" id="f-pcat" data-filtre="projets.cat">${options(CATEGORIES_PROJET, f.cat, "Toutes les catégories")}</select></div>`;
    const base = S.sous.projets === "idees" ? idees : S.sous.projets === "clos" ? clos : actifs;
    const q = norm(f.q);
    const liste = base.filter((p) => (!f.cat || p.categorie === f.cat) && (!q || norm([p.titre, p.categorie, p.description, membre(p.responsableId) ? nomComplet(membre(p.responsableId)) : ""].join(" ")).includes(q)))
      .sort((a, b) => (PRIORITES.indexOf(a.priorite || "Normale") - PRIORITES.indexOf(b.priorite || "Normale")) || cmpFr(a.dateFin || "9999", b.dateFin || "9999") || cmpFr(a.titre || "", b.titre || ""));
    if (!liste.length) return out + vide(S.sous.projets === "idees" ? "i-proj" : "i-search", S.sous.projets === "idees" && !q ? "Aucune idée de projet en attente. Notez ici les projets à étudier : vous les lancerez en changeant leur statut." : S.sous.projets === "clos" && !q ? "Aucun projet terminé pour l’instant." : base.length ? "Aucun projet ne correspond." : "Aucun projet en cours.");
    return out + `<div class="list">${liste.map(rowProjet).join("")}</div>`;
  };
  function rowTacheGlobale({ t, p }) {
    const r = membre(t.responsableId);
    const retard = tacheEnRetard(t);
    return `<button class="row nolead" type="button" data-act="voir-projet" data-id="${esc(p.id)}" data-onglet="taches"><span class="row-main"><span class="row-t">${esc(t.titre)}</span><span class="row-m">${esc([p.titre, r ? nomCourtM(r) : "Sans responsable", t.echeance ? `échéance ${fmtCourt(t.echeance)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="chip${t.statut === "En cours" ? " info" : ""}">${esc(t.statut || "À faire")}</span>${retard ? `<span class="chip danger">${esc(relCourt(t.echeance))}</span>` : ""}</span></button>`;
  }
  function vueTachesProjets(tOuv) {
    const f = S.f.projets;
    const filtre = f.taches || "toutes";
    let out = `<div class="filters"><div class="chips" role="group" aria-label="Filtrer les tâches">${[["toutes", "Toutes"], ["retard", "En retard"], ["semaine", "Cette semaine"], ["sansresp", "Sans responsable"]].map(([id, l]) => `<button class="chip-btn${filtre === id ? " on" : ""}" type="button" data-act="ptache-filtre" data-v="${id}" aria-pressed="${filtre === id}">${l}</button>`).join("")}</div></div>`;
    const semaine = ajoutJours(aujourdhui(), 7);
    const liste = tOuv.filter(({ t }) => (filtre === "retard" ? tacheEnRetard(t) : filtre === "semaine" ? t.echeance && t.echeance <= semaine : filtre === "sansresp" ? !membre(t.responsableId) : true))
      .sort((a, b) => cmpFr(a.t.echeance || "9999", b.t.echeance || "9999") || cmpFr(a.p.titre || "", b.p.titre || ""));
    if (!liste.length) return out + vide("i-check", filtre === "toutes" ? "Aucune tâche ouverte. Ajoutez des tâches depuis la fiche d’un projet." : "Aucune tâche ne correspond.");
    return out + `<div class="list">${liste.map(rowTacheGlobale).join("")}</div>`;
  }

  /* — Fiche projet — */
  function ficheProjet(id) {
    const p = projet(id);
    if (!p) return null;
    const ecr = peutEcrire();
    const dir = accesDirection();
    const ong = S.projetOnglet || "apercu";
    const taches = tachesP(p), notes = notesP(p);
    const onglets = [["apercu", "Aperçu", null], ["taches", "Tâches", taches.filter((t) => t.statut !== "Fait").length], ...(dir ? [["finances", "Finances", null]] : []), ["journal", "Journal", notes.length]];
    const o = onglets.some(([k]) => k === ong) ? ong : "apercu";
    let out = `<div class="ident"><span class="av lg g-av" aria-hidden="true">${I("i-proj")}</span><div><h3>${esc(p.titre)}</h3><p>${esc([p.categorie, statutP(p), p.priorite && p.priorite !== "Normale" ? `priorité ${p.priorite.toLowerCase()}` : ""].filter(Boolean).join(" · "))}</p></div></div>
      <div class="subtabs" role="group" aria-label="Sections du projet">${onglets.map(([k, l, n]) => `<button class="subtab${o === k ? " on" : ""}" type="button" data-act="projet-onglet" data-v="${k}" aria-pressed="${o === k}">${esc(l)}${n ? `<span class="count">${nb(n)}</span>` : ""}</button>`).join("")}</div>`;
    if (o === "taches") return out + sectionTaches(p, ecr);
    if (o === "finances") return out + sectionFinances(p);
    if (o === "journal") return out + sectionJournal(p, ecr);
    const av = avancementP(p);
    const resp = membre(p.responsableId);
    const eq = (p.equipe || []).map(membre).filter(Boolean);
    const jal = jalonsP(p);
    const lignes = lignesP(p);
    const fin = dir && S.pret.projetsFin ? bilanFinP(p) : null;
    out += `${p.description ? `<p style="white-space:pre-wrap;margin:0 0 10px">${esc(p.description)}</p>` : ""}
      <div class="figure"><span class="big-figure">${pct(av)}</span><span class="chip">${jal.length ? `${nb(jal.filter((j) => j.fait).length)} étape${jal.filter((j) => j.fait).length > 1 ? "s" : ""} sur ${nb(jal.length)}` : taches.length ? `${nb(taches.filter((t) => t.statut === "Fait").length)} tâche${taches.filter((t) => t.statut === "Fait").length > 1 ? "s" : ""} sur ${nb(taches.length)}` : "Aucune étape"}</span>${chipStatutP(p)}</div>
      ${av != null ? `<div class="bar${av >= 1 ? " ok" : ""}" style="margin:-4px 0 14px" aria-hidden="true"><i style="width:${(av * 100).toFixed(1)}%"></i></div>` : ""}
      ${kv([["Objectifs", p.objectifs ? `<span style="white-space:pre-wrap">${esc(p.objectifs)}</span>` : ""], ["Responsable", resp ? `<button class="link" type="button" data-act="voir-membre" data-id="${esc(resp.id)}">${esc(nomUsuel(resp))}</button>` : ""], ["Garnison", garnison(p.garnisonId) ? `<button class="link" type="button" data-act="voir-garnison" data-id="${esc(p.garnisonId)}">${esc(cheminG(p.garnisonId))}</button>` : "Tout le mouvement"], ["Début", p.dateDebut ? esc(fmtJour(p.dateDebut)) : ""], ["Fin prévue", p.dateFin ? `${esc(fmtJour(p.dateFin))}${!estClosP(p) && p.dateFin < aujourdhui() ? ` <span class="chip danger">Dépassée</span>` : ""}` : ""], ["Budget prévu", budgetP(p) ? esc(fcfa(budgetP(p))) : ""], ["Collecté", fin ? `${esc(fcfa(fin.collecte))}${fin.objectif ? ` · ${pct(fin.taux)} de l’objectif` : ""}` : ""]])}
      <h3 class="h3">Équipe (${nb(eq.length + (resp && !eq.some((m) => m.id === resp.id) ? 1 : 0))})</h3>
      ${resp || eq.length ? `<div class="chips-l">${[resp, ...eq.filter((m) => !resp || m.id !== resp.id)].filter(Boolean).map((m) => `<button class="pill" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${avatar(m)}<span>${esc(nomCourtM(m))}${resp && m.id === resp.id ? " · responsable" : ""}</span></button>`).join("")}</div>` : `<p class="hint">Aucun membre dans l’équipe.</p>`}
      ${ecr ? `<div class="btn-row" style="margin-top:8px">${btn("equipe-projet", "Composer l’équipe", { ico: "i-users", sm: true, data: `data-id="${esc(p.id)}"` })}</div>` : ""}
      <h3 class="h3">Étapes</h3>
      ${jal.length ? `<div class="list">${jal.map((j) => `<div class="row nolead jal-row${j.fait ? " fait" : ""}">${ecr ? `<button class="tick-b" type="button" data-act="jalon-basculer" data-id="${esc(p.id)}" data-j="${esc(j.id)}" aria-pressed="${!!j.fait}" aria-label="${esc(`${j.fait ? "Rouvrir" : "Marquer atteinte"} : ${j.titre}`)}">${I("i-check")}</button>` : `<span class="tick-b" aria-hidden="true">${j.fait ? I("i-check") : ""}</span>`}<span class="row-main"><span class="row-t">${esc(j.titre)}</span><span class="row-m">${esc([j.date ? fmtJour(j.date) : "Sans date", j.fait && j.faitLe ? `atteinte le ${fmtJour(j.faitLe)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${!j.fait && j.date && j.date < aujourdhui() ? `<span class="chip danger">En retard</span>` : j.fait ? `<span class="chip ok">Atteinte</span>` : ""}</span></div>`).join("")}</div>` : `<p class="hint">Aucune étape définie. Ajoutez-les en modifiant le projet (une par ligne, avec sa date).</p>`}
      ${lignes.length ? `<h3 class="h3">Budget par poste</h3><div class="bars">${lignes.map((l) => { const dep = fin ? fin.depParLigne[l.id] || 0 : null; const taux = dep != null && l.montant ? dep / l.montant : null; return `<div class="bar-row"><div class="bar-top"><span>${esc(l.libelle)}</span><b>${dep != null ? `${nb(dep)} / ` : ""}${nb(l.montant)}</b></div>${dep != null ? `<div class="bar${taux > 1 ? " over" : ""}"><i style="width:${Math.min(100, (taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}</div>`; }).join("")}</div>${fin ? `<p class="hint" style="margin-top:6px">Dépensé / prévu, en FCFA.</p>` : ""}` : ""}
      <div class="actions">${ecr ? btn("editer-projet", "Modifier le projet", { ico: "i-edit", cls: "btn-primary", data: `data-id="${esc(p.id)}"` }) : ""}${ecr ? btn("ajout-tache", "Nouvelle tâche", { ico: "i-plus", data: `data-id="${esc(p.id)}"` }) : ""}${ecr && (eq.length || resp) ? btn("ecrire-equipe", "Écrire à l’équipe", { ico: "i-horn", data: `data-id="${esc(p.id)}"` }) : ""}${dir ? btn("export-projet", "Exporter", { ico: "i-down", data: `data-id="${esc(p.id)}"` }) : ""}${peutAdmin() ? btn("supprimer-projet", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(p.id)}"` }) : ""}</div>
      ${p.creeLe ? `<p class="hint" style="margin-top:12px">Créé le ${esc(fmtStamp(p.creeLe))}${p.creePar ? ` par ${esc(nomDe(p.creePar))}` : ""}.</p>` : ""}`;
    return out;
  }
  function sectionTaches(p, ecr) {
    const taches = tachesP(p);
    let out = ecr ? `<div class="btn-row" style="margin:4px 0 12px">${btn("ajout-tache", "Nouvelle tâche", { ico: "i-plus", cls: "btn-primary", sm: true, data: `data-id="${esc(p.id)}"` })}</div>` : "";
    if (!taches.length) return out + `<p class="hint">Aucune tâche. Découpez le projet en actions concrètes, chacune avec un responsable et une échéance.</p>`;
    for (const st of ["En cours", "À faire", "Fait"]) {
      const l = taches.filter((t) => (t.statut || "À faire") === st);
      if (!l.length) continue;
      out += `<h3 class="h3">${esc(st)} (${nb(l.length)})</h3><div class="list">${l.map((t) => {
        const r = membre(t.responsableId);
        const retard = tacheEnRetard(t);
        const suivant = st === "À faire" ? "En cours" : st === "En cours" ? "Fait" : "À faire";
        return `<div class="row nolead jal-row${st === "Fait" ? " fait" : ""}">${ecr ? `<button class="tick-b${st === "En cours" ? " mi" : ""}" type="button" data-act="tache-statut" data-id="${esc(p.id)}" data-t="${esc(t.id)}" data-v="${esc(suivant)}" aria-label="${esc(`${t.titre} : passer à « ${suivant} »`)}" title="Passer à « ${esc(suivant)} »">${I(st === "Fait" ? "i-check" : st === "En cours" ? "i-clock" : "i-check")}</button>` : `<span class="tick-b" aria-hidden="true">${st === "Fait" ? I("i-check") : ""}</span>`}<span class="row-main">${ecr ? `<button class="link row-t" type="button" data-act="editer-tache" data-id="${esc(p.id)}" data-t="${esc(t.id)}">${esc(t.titre)}</button>` : `<span class="row-t">${esc(t.titre)}</span>`}<span class="row-m">${esc([r ? nomCourtM(r) : "Sans responsable", t.echeance ? `échéance ${fmtJour(t.echeance)}` : "", t.note || ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${retard ? `<span class="chip danger">En retard</span>` : st === "Fait" && t.faiteLe ? `<span class="chip ok">${esc(fmtCourt(t.faiteLe))}</span>` : ""}${r && r.telephone && st !== "Fait" ? `<a class="icon-btn" href="${esc(lienWa(r.telephone, `Bonjour ${prenomUsuel(r)}, petit point sur le projet « ${p.titre} » : la tâche « ${t.titre} »${t.echeance ? ` est attendue pour le ${fmtJour(t.echeance)}` : " est en attente"}. Où en es-tu ? Merci !`))}" target="_blank" rel="noopener" aria-label="${esc(`Relancer ${nomComplet(r)} sur WhatsApp`)}">${I("i-msg")}</a>` : ""}</span></div>`;
      }).join("")}</div>`;
    }
    return out;
  }
  function sectionFinances(p) {
    if (!S.pret.projetsFin) return chargement("Lecture des finances du projet…");
    const adm = peutAdmin();
    const b = bilanFinP(p);
    const id = esc(p.id);
    let out = `<div class="stats s4" style="margin-top:4px">
      <div class="stat in"><span class="stat-l">${I("i-in")}Collecté</span><span class="stat-v">${nb(b.collecte)}<small>FCFA</small></span><span class="stat-m">${b.objectif ? `${pct(b.taux)} de ${esc(fcfa(b.objectif))}` : "Objectif non fixé"}</span></div>
      <div class="stat"><span class="stat-l">Promis</span><span class="stat-v">${nb(b.promis)}<small>FCFA</small></span><span class="stat-m">${pluriel(Object.keys(b.promesses).length, "promesse", "promesses")}</span></div>
      <div class="stat out"><span class="stat-l">${I("i-out")}Dépensé</span><span class="stat-v">${nb(b.depense)}<small>FCFA</small></span><span class="stat-m">${budgetP(p) ? `sur ${esc(fcfa(budgetP(p)))} prévus` : "Budget non défini"}</span></div>
      <div class="stat"><span class="stat-l">Solde du projet</span><span class="stat-v">${esc(signe(b.solde))}<small>FCFA</small></span><span class="stat-m">Collecté moins dépensé</span></div></div>
      ${b.objectif ? `<div class="bar${b.taux >= 1 ? " ok" : ""}" style="margin:0 0 6px" role="img" aria-label="${esc(`${pct(b.taux)} de l’objectif collecté`)}"><i style="width:${Math.min(100, (b.taux || 0) * 100).toFixed(1)}%"></i></div>` : ""}
      <p class="hint">Collecte auprès de : <b>${esc(b.cible.lib)}</b> (${nb(b.cible.liste.length)})${b.mt ? ` · ${esc(fcfa(b.mt))} par membre` : " · contribution libre"}${b.f.echeanceCollecte ? ` · jusqu’au ${esc(fmtJour(b.f.echeanceCollecte))}` : ""}.</p>
      ${adm ? `<div class="actions">${btn("cotis-projet", "Enregistrer une cotisation", { ico: "i-plus", cls: "btn-primary", data: `data-id="${id}"` })}${btn("promesse-projet", "Promesse", { ico: "i-flag", data: `data-id="${id}"` })}${btn("depense-projet", "Enregistrer une dépense", { ico: "i-out", data: `data-id="${id}"` })}${btn("collecte-projet", "Paramètres de la collecte", { ico: "i-sliders", data: `data-id="${id}"` })}</div>` : ""}`;
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const extra = [...new Set([...Object.keys(b.parM), ...Object.keys(b.promesses)])].filter((mid) => !ids.has(mid)).map(membre).filter(Boolean);
    const contributeurs = b.cible.liste.concat(extra).map((m) => ({ m, v: b.parM[m.id] || 0, att: attenduMembreP(b, m.id) })).sort((x, y) => (y.att - y.v) - (x.att - x.v) || y.v - x.v || parNom(x.m, y.m));
    const aRelancer = contributeurs.filter((x) => (x.att ? x.v < x.att : !x.v) && ids.has(x.m.id));
    out += `<h3 class="h3">Contributions des membres</h3>${aRelancer.length && peutEcrire() ? `<div class="btn-row" style="margin-bottom:8px">${btn("relancer-projet", `Relancer (${nb(aRelancer.length)})`, { ico: "i-horn", sm: true, data: `data-id="${id}"` })}</div>` : ""}`;
    out += contributeurs.length ? `<div class="list">${contributeurs.map(({ m, v, att }) => {
      const pr = b.promesses[m.id];
      const reste = att ? Math.max(0, att - v) : 0;
      const chip = att ? (reste === 0 ? `<span class="chip ok">Soldé</span>` : v ? `<span class="chip warn">Reste ${nb(reste)}</span>` : `<span class="chip">Rien versé</span>`) : v ? `<span class="chip ok">A contribué</span>` : `<span class="chip">Pas encore</span>`;
      return `<div class="row nolead sp-row"><span class="row-main"><button class="link row-t" type="button" data-act="voir-membre" data-id="${esc(m.id)}">${esc(nomComplet(m))}</button><span class="row-m">${esc([v ? `${fcfa(v)} versés` : "Aucun versement", pr ? `promesse de ${fcfa(pr.montant)}` : ""].filter(Boolean).join(" · "))}</span></span><span class="row-r">${chip}${adm ? `<button class="icon-btn" type="button" data-act="cotis-projet" data-id="${id}" data-mid="${esc(m.id)}" aria-label="${esc(`Enregistrer une cotisation de ${nomComplet(m)}`)}">${I("i-plus")}</button>` : ""}</span></div>`;
    }).join("")}</div>` : `<p class="hint">Aucun membre concerné par la collecte.</p>`;
    const rowMvt = (x, sens) => { const m = membre(x.membreId); const qui = sens === "E" ? (m ? nomComplet(m) : x.nom || (x.donateur === "anonyme" ? "Anonyme" : "Donateur")) : x.libelle || "Dépense"; const l = sens === "S" && x.ligneId ? lignesP(p).find((y) => y.id === x.ligneId) : null; return `<button class="row nolead${x.annule ? " reversed" : ""}" type="button" data-act="voir-op-de" data-mois="${esc(x.opMois || "")}" data-id="${esc(x.opId || "")}"><span class="row-main"><span class="row-t">${esc(qui)}</span><span class="row-m">${esc([fmtJour(x.date), l ? l.libelle : "", x.beneficiaire, x.moyen, x.piece].filter(Boolean).join(" · "))}</span></span><span class="row-r"><span class="amt ${x.annule ? "" : sens === "E" ? "in" : "out"}">${sens === "E" ? "+" : "−"}${nb(x.montant)}</span>${x.annule ? `<span class="chip danger">Annulé</span>` : ""}</span></button>`; };
    out += `<h3 class="h3">Cotisations reçues</h3>${b.tousV.length ? `<div class="list">${b.tousV.map((x) => rowMvt(x, "E")).join("")}</div>` : `<p class="hint">Aucune cotisation enregistrée.</p>`}`;
    out += `<h3 class="h3">Dépenses</h3>${b.tousD.length ? `<div class="list">${b.tousD.map((x) => rowMvt(x, "S")).join("")}</div>` : `<p class="hint">Aucune dépense enregistrée.</p>`}`;
    return out + `<p class="hint" style="margin-top:10px">Chaque cotisation et chaque dépense entre aussi dans le journal de caisse. Pour corriger un mouvement, ouvrez-le et annulez-le : l’annulation est reportée ici.</p>`;
  }
  function sectionJournal(p, ecr) {
    const notes = notesP(p);
    let out = ecr ? `<form class="form" id="f-note-projet" novalidate style="margin:4px 0 14px">${champ("pn-texte", "Nouvelle information", zone("pn-texte", "texte", "", 'rows="3" placeholder="Avancée des travaux, décision, difficulté, remerciement…"'))}<div class="btn-row">${btn("note-projet", "Publier dans le journal", { ico: "i-plus", cls: "btn-primary", sm: true, data: `data-id="${esc(p.id)}"` })}</div></form>` : "";
    if (!notes.length) return out + `<p class="hint">Le journal du projet est vide.</p>`;
    return out + `<ul class="journal">${notes.map((n) => `<li><p class="j-m">${esc(fmtStamp(n.le))}${n.par ? ` · ${esc(nomDe(n.par))}` : ""}</p><p style="white-space:pre-wrap;margin:0">${esc(n.texte)}</p></li>`).join("")}</ul>`;
  }
  const ouvrirProjet = (id, onglet) => { if (onglet) S.projetOnglet = onglet; ouvrir({ titre: "Projet", wide: true, refresh: surveiller(() => ficheProjet(id)) }); };

  /* — Formulaires — */
  function lireLignesBudget(texte, anciens) {
    const pris = new Set();
    return String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const r = /^(.*?)[\s:=–—-]+([\d][\d\s.  ]*)\s*(f\s?cfa|fcfa|f)?$/i.exec(l);
      const libelle = (r ? r[1] : l).replace(/[\s:=–—-]+$/, "").trim() || l;
      const montant = r ? Number(r[2].replace(/\D/g, "")) || 0 : 0;
      const ancien = anciens.find((a) => !pris.has(a.id) && norm(a.libelle) === norm(libelle));
      const id = ancien ? ancien.id : nouvelId("l");
      pris.add(id);
      return { id, libelle, montant, ordre: i };
    });
  }
  function ouvrirFormProjet(id) {
    const p = id ? projet(id) : { statut: "En préparation", priorite: "Normale", categorie: CATEGORIES_PROJET[0], dateDebut: aujourdhui() };
    if (id && !p) return;
    const mbs = membresActifs().map((m) => [m.id, nomComplet(m)]);
    const lignes = id ? lignesP(p).map((l) => `${l.libelle} : ${nb(l.montant)}`).join("\n") : "";
    const jalons = id ? jalonsP(p).map((j) => `${j.date ? j.date.split("-").reverse().join("/") + " " : ""}${j.titre}`).join("\n") : "";
    const html = `<form class="form" id="f-projet" novalidate>
      ${champ("p-titre", "Intitulé du projet", inp("p-titre", "titre", p.titre, 'autocomplete="off" required autofocus placeholder="Construction du siège, Mission Tunisie 2027…"'), { req: true })}
      <div class="f2">${champ("p-cat", "Catégorie", sel("p-cat", "categorie", CATEGORIES_PROJET, p.categorie, null))}${champ("p-statut", "Statut", sel("p-statut", "statut", STATUTS_PROJET, statutP(p), null))}</div>
      <div class="f2">${champ("p-prio", "Priorité", sel("p-prio", "priorite", PRIORITES, p.priorite || "Normale", null))}${champ("p-resp", "Responsable", sel("p-resp", "responsableId", mbs, p.responsableId, "Non désigné"))}</div>
      ${champ("p-desc", "Description", zone("p-desc", "description", p.description, 'rows="3" placeholder="De quoi s’agit-il, pour qui, pourquoi maintenant"'))}
      ${champ("p-obj", "Objectifs et résultats attendus", zone("p-obj", "objectifs", p.objectifs, 'rows="3"'))}
      <div class="f2">${champ("p-deb", "Début", inp("p-deb", "dateDebut", p.dateDebut, 'type="date"'))}${champ("p-fin", "Fin prévue", inp("p-fin", "dateFin", p.dateFin, 'type="date"'))}</div>
      ${S.garnisons.length ? champ("p-garn", "Garnison ou point SDE porteur", sel("p-garn", "garnisonId", optionsGarnisons(), p.garnisonId, "Tout le mouvement")) : ""}
      ${champ("p-lignes", "Budget par poste", zone("p-lignes", "lignes", lignes, 'rows="5" placeholder="Ciment et fer : 1 500 000\nMain-d’œuvre : 800 000\nToiture : 650 000"'), { hint: "Un poste par ligne, avec son montant en FCFA. Le budget total se calcule seul." })}
      ${champ("p-jal", "Étapes (jalons)", zone("p-jal", "jalons", jalons, 'rows="5" placeholder="15/11/2026 Achat du terrain\n31/01/2027 Fondations\n30/06/2027 Inauguration"'), { hint: "Une étape par ligne, précédée de sa date si elle est connue. L’avancement du projet se calcule sur les étapes atteintes." })}
      ${pied(id ? "Enregistrer les modifications" : "Créer le projet")}
    </form>`;
    ouvrir({ titre: id ? "Modifier le projet" : "Nouveau projet", html, wide: true, onSubmit: (fd, form) => enregistrerProjet(fd, form, id) });
  }
  async function enregistrerProjet(fd, form, id) {
    const g = (k) => String(fd.get(k) || "").trim();
    if (!g("titre")) { erreurForm("Indiquez l’intitulé du projet."); return; }
    if (g("dateDebut") && g("dateFin") && g("dateFin") < g("dateDebut")) { erreurForm("La fin prévue doit suivre le début."); return; }
    const p = id ? projet(id) : null;
    const lignes = lireLignesBudget(g("lignes"), p ? lignesP(p) : []);
    const anciensJ = p ? jalonsP(p) : [];
    const jal = lireModules(g("jalons"), anciensJ).map((j, i) => { const a = anciensJ.find((x) => x.id === j.id); return { ...j, ordre: i, fait: a ? !!a.fait : false, faitLe: a ? a.faitLe || "" : "" }; });
    const data = { titre: g("titre"), categorie: g("categorie"), statut: g("statut"), priorite: g("priorite"), responsableId: g("responsableId"), description: g("description"), objectifs: g("objectifs"), dateDebut: g("dateDebut"), dateFin: g("dateFin"), garnisonId: g("garnisonId"),
      lignes: Object.fromEntries(lignes.map(({ id: k, ...v }) => [k, v])), jalons: Object.fromEntries(jal.map(({ id: k, ...v }) => [k, v])), budget: lignes.reduce((t, l) => t + l.montant, 0) };
    if (statutP(data) === "Terminé" && (!p || statutP(p) !== "Terminé")) data.termineLe = aujourdhui();
    form.querySelector("[type=submit]").disabled = true;
    let ref;
    const ok = await ecrire(() => enFile("projet:" + (id || "nouveau"), async () => {
      if (id) {
        const r = S.db.doc("projets/" + id);
        const cur = await r.get();
        await r.set({ ...(cur.exists ? cur.data() : {}), ...data, ...tampon() });
      } else {
        ref = ref || S.db.collection("projets").doc();
        await ref.set({ ...data, equipe: data.responsableId ? [data.responsableId] : [], taches: {}, notes: {}, ...creation() });
      }
    }), id ? "Projet modifié" : "Projet créé");
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirProjet(id || ref.id, "apercu");
  }
  function choisirEquipe(id) {
    const p = projet(id);
    if (!p) return;
    ouvrirChoix({
      titre: `Équipe · ${p.titre}`, intro: "Cochez les membres qui portent ce projet. Le responsable en fait partie d’office.", selection: p.equipe || [], libelle: "Enregistrer l’équipe",
      onValider: async (ids) => {
        const eq = [...new Set([...(p.responsableId ? [p.responsableId] : []), ...ids])];
        if (await ecrire(() => S.db.doc("projets/" + id).update({ equipe: eq, ...tampon() }), "Équipe enregistrée")) ouvrirProjet(id, "apercu");
      },
    });
  }
  function ouvrirFormTache(id, tid) {
    const p = projet(id);
    if (!p) return;
    const t = tid ? (p.taches || {})[tid] : { statut: "À faire" };
    if (tid && !t) return;
    const eqIds = new Set([...(p.equipe || []), p.responsableId].filter(Boolean));
    const eq = membresActifs().filter((m) => eqIds.has(m.id)), autres = membresActifs().filter((m) => !eqIds.has(m.id));
    const grp = (titre, l) => (l.length ? `<optgroup label="${esc(titre)}">${l.map((m) => `<option value="${esc(m.id)}"${m.id === t.responsableId ? " selected" : ""}>${esc(nomComplet(m))}</option>`).join("")}</optgroup>` : "");
    const html = `<form class="form" id="f-tache" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b></p>
      ${champ("t-titre", "Tâche", inp("t-titre", "titre", t.titre, 'autocomplete="off" required autofocus placeholder="Obtenir trois devis, réserver la salle…"'), { req: true })}
      <div class="f2">${champ("t-resp", "Responsable", `<select class="inp" id="t-resp" name="responsableId"><option value="">Non désigné</option>${grp("Équipe du projet", eq)}${grp("Autres membres", autres)}</select>`)}${champ("t-ech", "Échéance", inp("t-ech", "echeance", t.echeance, 'type="date"'))}</div>
      ${champ("t-statut", "Statut", sel("t-statut", "statut", STATUTS_TACHE, t.statut || "À faire", null))}
      ${champ("t-note", "Précisions", zone("t-note", "note", t.note, 'rows="2"'))}
      ${pied(tid ? "Enregistrer" : "Ajouter la tâche", tid && peutEcrire() ? btn("supprimer-tache", "Supprimer", { ico: "i-trash", cls: "btn-danger", data: `data-id="${esc(id)}" data-t="${esc(tid)}"` }) : "")}
    </form>`;
    ouvrir({ titre: tid ? "Modifier la tâche" : "Nouvelle tâche", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      if (!g("titre")) { erreurForm("Décrivez la tâche."); return; }
      const k = tid || nouvelId("t");
      const statut = g("statut") || "À faire";
      const data = { titre: g("titre"), responsableId: g("responsableId"), echeance: g("echeance"), statut, note: g("note"), faiteLe: statut === "Fait" ? (t.faiteLe || aujourdhui()) : "", ...(tid ? {} : { creeLe: Date.now(), creePar: S.me.id || null }) };
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => S.db.doc("projets/" + id).update({ taches: { [k]: data }, ...tampon() }), tid ? "Tâche modifiée" : "Tâche ajoutée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "taches");
    } });
  }
  async function retirerCle(path, champ, cle, ok) {
    return ecrire(() => enFile("doc:" + path, async () => {
      const r = S.db.doc(path);
      const cur = await r.get();
      if (!cur.exists) return;
      const d = cur.data();
      const o = { ...(d[champ] || {}) };
      delete o[cle];
      await r.set({ ...d, [champ]: o, ...tampon() });
    }), ok);
  }
  function ouvrirFormCollecte(id) {
    const p = projet(id);
    if (!p) return;
    const f = finProjet(id);
    const c = cfg();
    const cv = f.cible ? (f.cible.type === "garnison" ? "g:" + f.cible.valeur : f.cible.type === "pole" ? "p:" + f.cible.valeur : f.cible.type) : "equipe";
    const opts = `<option value="equipe"${cv === "equipe" ? " selected" : ""}>L’équipe du projet</option><option value="tous"${cv === "tous" ? " selected" : ""}>Tous les membres actifs</option>${S.garnisons.length ? `<optgroup label="Une garnison ou un point SDE">${optionsGarnisons().map(([v, l]) => `<option value="g:${esc(v)}"${cv === "g:" + v ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` : ""}<optgroup label="Un pôle">${c.poles.map((x) => `<option value="p:${esc(x)}"${cv === "p:" + x ? " selected" : ""}>${esc(x)}</option>`).join("")}</optgroup>`;
    const html = `<form class="form" id="f-collecte" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b>${budgetP(p) ? ` · budget prévu ${esc(fcfa(budgetP(p)))}` : ""}</p>
      ${champ("cl-cible", "Membres sollicités", `<select class="inp" id="cl-cible" name="cible">${opts}</select>`)}
      <div class="f2">${champ("cl-mt", "Cotisation attendue par membre (FCFA)", inp("cl-mt", "montantParMembre", f.montantParMembre ? nb(f.montantParMembre) : "", 'inputmode="numeric" autocomplete="off" placeholder="Libre"'))}${champ("cl-obj", "Objectif de collecte (FCFA)", inp("cl-obj", "objectifCollecte", f.objectifCollecte ? nb(f.objectifCollecte) : "", 'inputmode="numeric" autocomplete="off" placeholder="Par défaut : le budget prévu"'))}</div>
      ${champ("cl-ech", "Collecte jusqu’au", inp("cl-ech", "echeanceCollecte", f.echeanceCollecte, 'type="date"'))}
      ${pied("Enregistrer")}
    </form>`;
    ouvrir({ titre: "Paramètres de la collecte", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      const v = g("cible");
      const cible = v.startsWith("g:") ? { type: "garnison", valeur: v.slice(2) } : v.startsWith("p:") ? { type: "pole", valeur: v.slice(2) } : { type: v || "equipe", valeur: "" };
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => upsert("projets_fin/" + id, { projetId: id, cible, montantParMembre: Number(g("montantParMembre").replace(/\D/g, "")) || 0, objectifCollecte: Number(g("objectifCollecte").replace(/\D/g, "")) || 0, echeanceCollecte: g("echeanceCollecte") }), "Collecte paramétrée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
    } });
  }
  function selectMembresProjet(b, mid, name = "membreId", vide1 = "Choisir un membre") {
    const ids = new Set(b.cible.liste.map((m) => m.id));
    const lib = (m) => { const v = b.parM[m.id] || 0, att = attenduMembreP(b, m.id); return nomComplet(m) + (att ? ` · ${v >= att ? "soldé" : `reste ${nb(att - v)}`}` : v ? ` · ${nb(v)} versés` : ""); };
    const grp = (titre, l) => (l.length ? `<optgroup label="${esc(titre)}">${l.map((m) => `<option value="${esc(m.id)}"${m.id === mid ? " selected" : ""}>${esc(lib(m))}</option>`).join("")}</optgroup>` : "");
    return `<select class="inp" id="pc-membre" name="${name}"><option value="">${esc(vide1)}</option>${grp("Membres sollicités", b.cible.liste.slice().sort(parNom))}${grp("Autres membres", membresActifs().filter((m) => !ids.has(m.id)))}</select>`;
  }
  const montantSaisi = (mt) => { mt.addEventListener("focus", () => { mt.value = mt.value.replace(/\D/g, ""); }); mt.addEventListener("blur", () => { const v = Number(mt.value.replace(/\D/g, "")); mt.value = v ? nb(v) : ""; }); };
  function ouvrirFormCotisProjet(id, mid) {
    const p = projet(id);
    if (!p) return;
    const b = bilanFinP(p);
    const c = cfg();
    const reste = (x) => (x ? Math.max(0, attenduMembreP(b, x) - (b.parM[x] || 0)) : 0);
    const html = `<form class="form" id="f-cp" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b>${b.mt ? ` · ${esc(fcfa(b.mt))} attendus par membre` : ""}</p>
      <div class="field"><span class="lab" id="lab-pcd">Donateur</span><div class="seg" role="radiogroup" aria-labelledby="lab-pcd" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[["membre", "Un membre"], ["anonyme", "Anonyme"], ["autre", "Autre personne"]].map(([v, l]) => `<input type="radio" name="donateur" id="pc-d-${v}" value="${v}"${v === "membre" ? " checked" : ""}><label for="pc-d-${v}">${esc(l)}</label>`).join("")}</div></div>
      <div id="pc-m-w">${champ("pc-membre", "Membre", selectMembresProjet(b, mid))}</div>
      <div id="pc-n-w" hidden>${champ("pc-nom", "Nom du donateur", inp("pc-nom", "nom", "", 'autocomplete="off"'))}</div>
      <div class="f2">${champ("pc-mt", "Montant versé (FCFA)", inp("pc-mt", "montant", reste(mid) ? nb(reste(mid)) : "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("pc-date", "Date", inp("pc-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("pc-moyen", "Moyen de paiement", sel("pc-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("pc-piece", "N° de pièce ou référence", inp("pc-piece", "piece", "", 'autocomplete="off"'))}</div>
      <p class="hint">La cotisation entre aussi dans le journal de caisse, catégorie « ${esc(categorieProjet())} ».</p>
      ${pied("Enregistrer la cotisation")}
    </form>`;
    ouvrir({ titre: "Cotisation de projet", html, wide: true, onSubmit: (fd, form) => enregistrerCotisProjet(fd, form, id),
      apres: (sheet) => {
        const mt = sheet.querySelector("#pc-mt");
        const maj = () => { const v = (sheet.querySelector("input[name=donateur]:checked") || {}).value; sheet.querySelector("#pc-m-w").hidden = v !== "membre"; sheet.querySelector("#pc-n-w").hidden = v !== "autre"; };
        sheet.querySelectorAll("input[name=donateur]").forEach((r) => r.addEventListener("change", maj));
        sheet.querySelector("#pc-membre").addEventListener("change", (ev) => { if (!mt.dataset.manuel) { const r = reste(ev.target.value); mt.value = r ? nb(r) : ""; } });
        mt.addEventListener("input", () => { mt.dataset.manuel = "1"; });
        montantSaisi(mt);
      } });
  }
  async function enregistrerCotisProjet(fd, form, id) {
    const p = projet(id);
    const g = (k) => String(fd.get(k) || "").trim();
    const donateur = g("donateur") || "membre";
    const m = donateur === "membre" ? membre(g("membreId")) : null;
    if (donateur === "membre" && !m) { erreurForm("Choisissez le membre."); return; }
    if (donateur === "autre" && !g("nom")) { erreurForm("Indiquez le nom du donateur."); return; }
    const montant = Number(g("montant").replace(/\D/g, ""));
    if (!montant) { erreurForm("Indiquez le montant versé."); return; }
    const date = g("date");
    const errD = verifierDateCaisse(date);
    if (errD) { erreurForm(errD); return; }
    const cle = date.slice(0, 7);
    const vid = nouvelId("v");
    const opRef = S.db.collection(`finances/${cle}/ops`).doc();
    const qui = m ? nomComplet(m) : donateur === "autre" ? g("nom") : "Anonyme";
    form.querySelector("[type=submit]").disabled = true;
    const ok = await ecrire(async () => {
      await opRef.set({ sens: "E", montant, date, categorie: categorieProjet(), moyen: g("moyen"), libelle: `Projet « ${p.titre} » · ${qui}`, membreId: m ? m.id : null, evenementId: null, piece: g("piece"), projet: { id, vid }, annule: false, ...creation() });
      await upsert("projets_fin/" + id, { projetId: id, versements: { [vid]: { membreId: m ? m.id : "", donateur, nom: donateur === "autre" ? g("nom") : "", montant, date, moyen: g("moyen"), piece: g("piece"), opId: opRef.id, opMois: cle, annule: false } } });
    }, `Cotisation de ${fcfa(montant)} enregistrée`);
    if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
    ouvrirProjet(id, "finances");
    try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
  }
  function ouvrirFormPromesse(id, mid) {
    const p = projet(id);
    if (!p) return;
    const b = bilanFinP(p);
    const html = `<form class="form" id="f-prom" novalidate>
      <p class="hint" style="margin-top:0">Une promesse n’entre pas en caisse : elle sert à suivre ce que chacun s’est engagé à donner.</p>
      ${champ("pc-membre", "Membre", selectMembresProjet(b, mid))}
      <div class="f2">${champ("pr-mt", "Montant promis (FCFA)", inp("pr-mt", "montant", mid && b.promesses[mid] ? nb(b.promesses[mid].montant) : "", 'class="inp big" inputmode="numeric" autocomplete="off" placeholder="0"'), { hint: "0 pour retirer la promesse." })}${champ("pr-date", "Date de la promesse", inp("pr-date", "date", aujourdhui(), 'type="date"'))}</div>
      ${pied("Enregistrer la promesse")}
    </form>`;
    ouvrir({ titre: "Promesse de don", html, wide: true, onSubmit: async (fd, form) => {
      const mid2 = String(fd.get("membreId") || "");
      if (!membre(mid2)) { erreurForm("Choisissez le membre."); return; }
      const montant = Number(String(fd.get("montant") || "").replace(/\D/g, "")) || 0;
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => upsert("projets_fin/" + id, { projetId: id, promesses: { [mid2]: { montant, date: String(fd.get("date") || "") } } }), montant ? "Promesse enregistrée" : "Promesse retirée");
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
    }, apres: (sheet) => montantSaisi(sheet.querySelector("#pr-mt")) });
  }
  function ouvrirFormDepenseProjet(id) {
    const p = projet(id);
    if (!p) return;
    const c = cfg();
    const lignes = lignesP(p).map((l) => [l.id, `${l.libelle} (${nb(l.montant)})`]);
    const html = `<form class="form" id="f-dp" novalidate>
      <p class="hint" style="margin-top:0">Projet <b>${esc(p.titre)}</b></p>
      ${champ("dp-lib", "Objet de la dépense", inp("dp-lib", "libelle", "", 'autocomplete="off" required autofocus placeholder="50 sacs de ciment, location du car…"'), { req: true })}
      <div class="f2">${champ("dp-ligne", "Poste du budget", sel("dp-ligne", "ligneId", lignes, "", "Hors budget"))}${champ("dp-cat", "Catégorie en caisse", sel("dp-cat", "categorie", c.categoriesSortie, c.categoriesSortie.find((x) => /logistique|mat/i.test(x)) || c.categoriesSortie[0], null))}</div>
      <div class="f2">${champ("dp-mt", "Montant (FCFA)", inp("dp-mt", "montant", "", 'class="inp big" inputmode="numeric" autocomplete="off" required placeholder="0"'), { req: true })}${champ("dp-date", "Date", inp("dp-date", "date", aujourdhui(), 'type="date" required'), { req: true })}</div>
      <div class="f2">${champ("dp-moyen", "Moyen de paiement", sel("dp-moyen", "moyen", c.moyens, c.moyens[0], null))}${champ("dp-benef", "Bénéficiaire", inp("dp-benef", "beneficiaire", "", 'autocomplete="off" placeholder="Fournisseur, prestataire…"'))}</div>
      ${champ("dp-piece", "N° de facture ou référence", inp("dp-piece", "piece", "", 'autocomplete="off"'))}
      <p class="hint">La dépense sort aussi de la caisse, dans la catégorie choisie.</p>
      ${pied("Enregistrer la dépense")}
    </form>`;
    ouvrir({ titre: "Dépense du projet", html, wide: true, onSubmit: async (fd, form) => {
      const g = (k) => String(fd.get(k) || "").trim();
      if (!g("libelle")) { erreurForm("Indiquez l’objet de la dépense."); return; }
      const montant = Number(g("montant").replace(/\D/g, ""));
      if (!montant) { erreurForm("Indiquez le montant."); return; }
      const date = g("date");
      const errD = verifierDateCaisse(date);
      if (errD) { erreurForm(errD); return; }
      const cle = date.slice(0, 7);
      const did = nouvelId("d");
      const opRef = S.db.collection(`finances/${cle}/ops`).doc();
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(async () => {
        await opRef.set({ sens: "S", montant, date, categorie: g("categorie"), moyen: g("moyen"), libelle: `Projet « ${p.titre} » · ${g("libelle")}${g("beneficiaire") ? ` · ${g("beneficiaire")}` : ""}`, membreId: null, evenementId: null, piece: g("piece"), projet: { id, did }, annule: false, ...creation() });
        await upsert("projets_fin/" + id, { projetId: id, depenses: { [did]: { libelle: g("libelle"), ligneId: g("ligneId"), categorie: g("categorie"), montant, date, moyen: g("moyen"), beneficiaire: g("beneficiaire"), piece: g("piece"), opId: opRef.id, opMois: cle, annule: false } } });
      }, `Dépense de ${fcfa(montant)} enregistrée`);
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirProjet(id, "finances");
      try { await recalcMois(cle); } catch (e) { /* signalé dans la vue */ }
    }, apres: (sheet) => montantSaisi(sheet.querySelector("#dp-mt")) });
  }
  function exporterProjet(id) {
    const p = projet(id);
    if (!p) return;
    const rows = [["Rubrique", "Date", "Intitulé", "Personne", "Montant (FCFA)", "Statut"]];
    lignesP(p).forEach((l) => rows.push(["Budget prévu", "", l.libelle, "", String(l.montant), ""]));
    jalonsP(p).forEach((j) => rows.push(["Étape", j.date ? j.date.split("-").reverse().join("/") : "", j.titre, "", "", j.fait ? "Atteinte" : "À venir"]));
    tachesP(p).forEach((t) => { const r = membre(t.responsableId); rows.push(["Tâche", t.echeance ? t.echeance.split("-").reverse().join("/") : "", t.titre, r ? nomComplet(r) : "", "", t.statut || "À faire"]); });
    if (accesDirection() && S.pret.projetsFin) {
      const b = bilanFinP(p);
      b.tousV.forEach((v) => { const m = membre(v.membreId); rows.push(["Cotisation", v.date.split("-").reverse().join("/"), v.moyen || "", m ? nomComplet(m) : v.nom || "Anonyme", String(v.montant), v.annule ? "Annulée" : ""]); });
      Object.entries(b.promesses).forEach(([mid, x]) => { const m = membre(mid); rows.push(["Promesse", x.date ? x.date.split("-").reverse().join("/") : "", "", m ? nomComplet(m) : "", String(x.montant), ""]); });
      b.tousD.forEach((d) => rows.push(["Dépense", d.date.split("-").reverse().join("/"), d.libelle, d.beneficiaire || "", String(d.montant), d.annule ? "Annulée" : ""]));
    }
    telecharger(`projet-${sansAccents(p.titre).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.csv`, versCSV(rows));
  }

  /* — Résumés — */
  function carteProjets() {
    const pied = `<button class="link" type="button" data-vue="projets">Ouvrir les projets</button>`;
    if (!S.pret.projets) return carte("Projets", chargement("Lecture des projets…"));
    const actifs = (S.projets || []).filter(estActifP);
    if (!actifs.length) return carte("Projets", `<p class="hint">Aucun projet en cours.</p>`, { pied });
    const retard = actifs.flatMap(tachesP).filter(tacheEnRetard).length;
    const top = actifs.slice().sort((a, b) => (PRIORITES.indexOf(a.priorite || "Normale") - PRIORITES.indexOf(b.priorite || "Normale")) || cmpFr(a.dateFin || "9999", b.dateFin || "9999")).slice(0, 4);
    return carte("Projets", `<p class="big-figure num">${nb(actifs.length)}<small>en cours</small></p><div class="bars">${top.map((p) => { const av = avancementP(p); return `<div class="bar-row"><div class="bar-top"><span>${esc(p.titre)}</span><b>${pct(av)}</b></div><div class="bar${av >= 1 ? " ok" : ""}"><i style="width:${((av || 0) * 100).toFixed(1)}%"></i></div></div>`; }).join("")}</div>${retard ? `<p class="note warn" style="margin:10px 0 0">${pluriel(retard, "tâche en retard", "tâches en retard")}. <button class="link" type="button" data-act="sous" data-vue-cible="projets" data-sous="taches">Voir</button></p>` : ""}`, { pied });
  }
  function blocProjetsMembre(m) {
    if (!S.pret.projets) return "";
    const ps = (S.projets || []).filter((p) => !estClosP(p) && (p.responsableId === m.id || (p.equipe || []).includes(m.id)));
    const ts = (S.projets || []).filter((p) => !estClosP(p)).flatMap((p) => tachesP(p).filter((t) => t.responsableId === m.id && t.statut !== "Fait").map((t) => ({ t, p })));
    let out = "";
    if (ps.length || ts.length) {
      out += `<h3 class="h3">Projets</h3>`;
      if (ps.length) out += `<div class="list">${ps.map((p) => `<button class="row nolead" type="button" data-act="voir-projet" data-id="${esc(p.id)}"><span class="row-main"><span class="row-t">${esc(p.titre)}</span><span class="row-m">${esc(p.responsableId === m.id ? "Responsable" : "Membre de l’équipe")}</span></span><span class="row-r">${chipStatutP(p)}</span></button>`).join("")}</div>`;
      if (ts.length) out += `<p class="hint" style="margin:8px 0 4px"><b>Tâches ouvertes</b></p><div class="list">${ts.map(rowTacheGlobale).join("")}</div>`;
    }
    if (accesDirection() && S.pret.projetsFin) {
      const contribs = (S.projets || []).map((p) => ({ p, v: bilanFinP(p).parM[m.id] || 0 })).filter((x) => x.v);
      if (contribs.length) out += `<p class="hint" style="margin:10px 0 0"><b>Cotisations de projets</b> : ${esc(contribs.map((x) => `${x.p.titre} ${fcfa(x.v)}`).join(" · "))}</p>`;
    }
    return out;
  }
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
  /* ════════════════════════ Assistant Éliézer ════════════════════════ */
  const IA = { tours: [], enCours: false, partiel: "", activite: "", erreur: "", brouillon: "", ctl: null, defiler: false };
  function messageIA(e) {
    const code = e && e.code;
    return ({
      not_granted: "Éliézer n’est pas autorisé pour cette application. Autorisez l’accès à Claude dans le menu des permissions de l’application.",
      sampling_disabled: "L’assistant n’est pas disponible pour ce compte.",
      not_declared: "L’assistant n’est pas activé dans cette version de l’application.",
      capability_disabled: "L’assistant n’est pas disponible dans cette vue.",
      rate_limited: "Trop de demandes pour le moment, ou limite d’utilisation atteinte : réessayez un peu plus tard.",
      session_expired: "Votre session a expiré : reconnectez-vous à Claude puis réessayez.",
      refused: "Éliézer ne peut pas répondre à cette demande telle qu’elle est formulée. Reformulez-la.",
      empty_completion: "Éliézer n’a rien répondu. Reformulez la demande plus simplement.",
      prompt_too_large: "La conversation est devenue trop longue : commencez une nouvelle conversation.",
      invalid_json: "La proposition n’a pas pu être lue. Réessayez.",
      tools_unavailable: "Éliézer ne peut pas consulter les données dans cette vue.",
    })[code] || "La réponse a été interrompue. Vérifiez la connexion puis réessayez.";
  }
  const libNiveau = () => (accesDirection() ? "direction (propriétaire ou éditeur)" : accesRegistre() ? "contributeur" : "lecture seule");
  const dateFr = (iso) => (iso ? fmtLong(iso) : "");
  /* — Données que l’assistant peut lire, filtrées selon le niveau d’accès — */
  function statsIA() {
    const actifs = membresActifs();
    const o = { aujourdhui: dateFr(aujourdhui()), prochainsRassemblements: aVenir().slice(0, 5).map((e) => ({ titre: e.titre, type: e.type, date: dateFr(e.date), heure: fmtHeure(e.heure), lieu: e.lieu || "" })), annoncesActives: annoncesActives().map((a) => ({ titre: a.titre, texte: a.texte })) };
    if (!accesRegistre()) return o;
    const parPole = {};
    actifs.forEach((m) => { const k = poleCourt(m.pole) || "Sans pôle"; parPole[k] = (parPole[k] || 0) + 1; });
    const evts = evtsPeriode("3m", "");
    const taux = actifs.map((m) => statsMembre(m, evts).taux).filter((t) => t != null);
    Object.assign(o, {
      membresActifs: actifs.length, membresArchives: S.membres.length - actifs.length, parPole,
      pointsSDE: pointsSDE().map((g) => ({ point: g.nom, pays: g.pays, membres: membresDeG(g.id, true).length })),
      membresSansPoint: actifs.filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId)).length,
      assiduiteMoyenne3Mois: taux.length ? pct(taux.reduce((x, y) => x + y, 0) / taux.length) : "pas de pointage",
      rassemblementsPointes3Mois: evts.length,
      membresAbsentsTroisDerniers: suiviPastoral().liste.map(nomComplet),
      formationsEnCours: S.formations.filter((f) => etatFormation(f) === "encours").map((f) => f.titre),
      requetesEnPriere: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length,
      projetsEnCours: (S.projets || []).filter(estActifP).map((p) => ({ titre: p.titre, avancement: pct(avancementP(p)) })),
      tachesEnRetard: (S.projets || []).filter((p) => !estClosP(p)).flatMap(tachesP).filter(tacheEnRetard).length,
    });
    if (accesDirection()) {
      const an = new Date().getFullYear();
      const ec = actifs.map((m) => etatCotis(m, an));
      o.caisseFinDuMoisCourant = S.pret.finances ? fcfa(soldeFin(moisCourant()) || 0) : "non chargée";
      o.cotisationsMensuelles = { montant: fcfa(Number(cfg().cotisationMensuelle) || 0), membresEnRetard: ec.filter((e) => e.retard.length).length, collecteAnnee: fcfa(ec.reduce((t, e) => t + e.verse, 0)) };
      o.veillePastorale = actifs.map((m) => ({ m, v: voyantsDe(m) })).filter((x) => x.v.global >= 3).map((x) => ({ membre: nomComplet(x.m), etat: ETAT_GLOBAL[x.v.global] }));
    }
    return o;
  }
  function trouverMembre(q) {
    const s = norm(String(q || ""));
    if (!s) return null;
    return S.membres.find((m) => m.id === q || norm(m.matricule) === s) || S.membres.find((m) => norm(nomComplet(m)) === s || norm(nomUsuel(m)) === s) || S.membres.find((m) => s.split(" ").every((w) => norm(`${nomComplet(m)} ${m.matricule || ""}`).includes(w))) || null;
  }
  function membreCourtIA(m) {
    const pt = m.garnisonId ? pointDeGarnison(m.garnisonId) : null;
    return { id: m.id, nom: nomComplet(m), matricule: m.matricule || "", fonction: m.fonction || "", statut: m.statut || "", pole: poleCourt(m.pole), pointSDE: pt ? pt.nom : "", garnison: garnison(m.garnisonId) ? garnison(m.garnisonId).nom : "", telephone: m.telephone ? telAffiche(m.telephone) : "" };
  }
  function ficheIA(m) {
    const o = { ...membreCourtIA(m), eglise: m.eglise || "", quartier: m.quartier || "", membreDepuis: m.adhesion ? dateFr(m.adhesion) : "", anniversaire: m.anniv ? fmtJM(`2000-${m.anniv}`) : "", archive: m.actif === false };
    const s3 = statsMembre(m, evtsPeriode("3m", ""));
    o.assiduite3Mois = s3.taux == null ? "aucun pointage" : `${pct(s3.taux)} (${s3.p + s3.r} présences sur ${s3.n - s3.x})`;
    const v = voyantsDe(m);
    o.voyants = { etatGeneral: ETAT_GLOBAL[v.global], ...Object.fromEntries(v.auto.concat(v.sante).map(([, l, x]) => [l, x.lib + (x.detail ? ` (${x.detail})` : "")])) };
    if (S.pret.formations) o.formations = formationsDe(m.id).map(({ f, p }) => `${f.titre} : ${p.statut}`);
    if (S.pret.projets) o.projets = (S.projets || []).filter((p) => p.responsableId === m.id || (p.equipe || []).includes(m.id)).map((p) => p.titre);
    if (accesDirection() && S.pret.discipline) o.discipline = S.discipline.filter((d) => d.membreId === m.id && mesureEnCours(d)).map((d) => `${d.mesure} (${d.motif})`);
    if (accesDirection() && S.pret.suivi) { const sv = suiviDe(m.id); if (sv) { o.accompagnementPrevu = sv.besoin || ""; o.prochainSuivi = sv.prochainSuivi ? dateFr(sv.prochainSuivi) : ""; } }
    return o;
  }
  function financesIA() {
    const cur = moisCourant();
    const mois = [];
    for (let k = 5; k >= 0; k -= 1) { const cle = ajoutMois(cur, -k); const t = totauxMois(cle); mois.push({ mois: fmtMois(cle), entrees: t.e, sorties: t.s }); }
    const an = new Date().getFullYear();
    const offr = (S.offrandes || []).filter((o) => !o.annule && String(o.date || "").startsWith(String(an)));
    const parType = {};
    offr.forEach((o) => { parType[o.type || "Offrande"] = (parType[o.type || "Offrande"] || 0) + (Number(o.montant) || 0); });
    return {
      soldeCaisseFinMoisCourant: soldeFin(cur), sixDerniersMois: mois,
      cotisationsSpecialesOuvertes: (S.speciales || []).filter(ouverteSp).map((sp) => { const b = bilanSp(sp); return { titre: sp.titre, collecte: b.collecte, attendu: b.attendu, echeance: sp.echeance || "" }; }),
      offrandesAnnee: parType,
      projets: (S.projets || []).filter((p) => !estClosP(p)).map((p) => { const b = bilanFinP(p); return { titre: p.titre, budget: budgetP(p), collecte: b.collecte, depense: b.depense, promis: b.promis }; }),
      montantsEnFCFA: true,
    };
  }
  function outilsIA() {
    const t = [];
    const act = (txt) => { IA.activite = txt; render(); };
    t.push({ name: "tableau_de_bord", description: "Vue chiffrée du mouvement : prochains rassemblements, annonces, effectif, pôles, points SDE, assiduité, absents, formations, prières, projets ; pour la direction aussi caisse, cotisations et veille pastorale. À appeler en premier pour toute question générale.", execute: () => { act("Consulte le tableau de bord…"); return statsIA(); } });
    t.push({ name: "agenda", description: "Liste des rassemblements (titre, type, date, heure, lieu, nombre de présents pour les passés). periode : \"avenir\" ou \"passes\".", inputSchema: { type: "object", properties: { periode: { type: "string", enum: ["avenir", "passes"] }, limite: { type: "number" } } }, execute: (i) => { act("Consulte l’agenda…"); const l = String(i.periode) === "passes" ? passes() : aVenir(); return l.slice(0, Math.min(30, Number(i.limite) || 10)).map((e) => ({ titre: e.titre, type: e.type, date: dateFr(e.date), heure: fmtHeure(e.heure), lieu: e.lieu || "", garnison: garnison(e.garnisonId) ? garnison(e.garnisonId).nom : "", presents: accesRegistre() && e.date <= aujourdhui() ? totalPresence(e) : undefined, description: e.description || "" })); } });
    if (accesRegistre()) {
      t.push({ name: "chercher_membres", description: "Cherche des membres actifs par nom, fonction, pôle, point SDE ou statut. Renvoie nom, matricule, fonction, statut, pôle, point SDE, téléphone.", inputSchema: { type: "object", properties: { texte: { type: "string" }, pole: { type: "string" }, point: { type: "string" }, statut: { type: "string" }, limite: { type: "number" } } }, execute: (i) => {
        act("Cherche dans le registre…");
        const q = norm(String(i.texte || "")), po = norm(String(i.pole || "")), pt = norm(String(i.point || "")), st = norm(String(i.statut || ""));
        const l = membresActifs().filter((m) => (!q || q.split(" ").every((w) => norm(`${nomComplet(m)} ${m.matricule || ""} ${m.fonction || ""} ${m.eglise || ""} ${m.quartier || ""}`).includes(w))) && (!po || norm(m.pole).includes(po)) && (!st || norm(m.statut).includes(st)) && (!pt || (m.garnisonId && norm(cheminG(m.garnisonId)).includes(pt))));
        return { total: l.length, membres: l.slice(0, Math.min(60, Number(i.limite) || 30)).map(membreCourtIA) };
      } });
      t.push({ name: "fiche_membre", description: "Fiche détaillée d’un membre (par nom, matricule ou identifiant) : coordonnées, point SDE, assiduité, voyants, formations, projets ; pour la direction aussi discipline et accompagnement.", inputSchema: { type: "object", properties: { membre: { type: "string" } }, required: ["membre"] }, execute: (i) => { act("Ouvre une fiche membre…"); const m = trouverMembre(i.membre); if (!m) throw new Error("Aucun membre ne correspond à « " + String(i.membre || "") + " »."); return ficheIA(m); } });
      t.push({ name: "anniversaires", description: "Anniversaires des prochains jours (nom, date, âge s’il est connu, téléphone).", inputSchema: { type: "object", properties: { jours: { type: "number" } } }, execute: (i) => { act("Regarde les anniversaires…"); const j = Math.min(366, Number(i.jours) || 30); return membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= j).sort((a, b) => a.a.dans - b.a.dans).map(({ m, a }) => ({ nom: nomUsuel(m), date: fmtJM(a.date), dansJours: a.dans, age: a.age || undefined, telephone: m.telephone ? telAffiche(m.telephone) : "" })); } });
      t.push({ name: "projets_et_prieres", description: "Projets (statut, avancement, étapes, tâches ouvertes avec responsable et échéance) et requêtes de prière en cours avec le sujet de la semaine de la chaîne.", execute: () => {
        act("Consulte les projets et la Chambre Haute…");
        return { projets: (S.projets || []).filter((p) => !estClosP(p)).map((p) => ({ titre: p.titre, statut: statutP(p), avancement: pct(avancementP(p)), finPrevue: p.dateFin ? dateFr(p.dateFin) : "", etapes: jalonsP(p).map((j) => `${j.titre}${j.date ? " (" + fmtCourt(j.date) + ")" : ""}${j.fait ? " ✓" : ""}`), tachesOuvertes: tachesP(p).filter((x) => x.statut !== "Fait").map((x) => ({ tache: x.titre, responsable: membre(x.responsableId) ? nomUsuel(membre(x.responsableId)) : "", echeance: x.echeance ? fmtCourt(x.echeance) : "", enRetard: tacheEnRetard(x) })) })),
          prieres: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").slice(0, 30).map((p) => ({ sujet: p.sujet, categorie: p.categorie, pour: membre(p.pourId) ? nomUsuel(membre(p.pourId)) : p.pour || "", urgent: !!p.urgent })),
          sujetDeLaSemaine: (S.chaine && S.chaine.sujetSemaine) || "", versetDeLaSemaine: (S.chaine && S.chaine.versetSemaine) || "" };
      } });
    }
    if (accesDirection()) t.push({ name: "finances", description: "Finances (direction) : solde de caisse, entrées et sorties des six derniers mois, cotisations spéciales ouvertes, offrandes de l’année par type, finances des projets. Montants en FCFA.", execute: () => { act("Consulte les finances…"); return financesIA(); } });
    const max = IA.limites && IA.limites.tools ? IA.limites.tools.maxCount : t.length;
    return t.slice(0, max);
  }
  function consigneIA() {
    const c = cfg();
    return `Tu es Éliézer, l’assistant intégré à l’application « S.D.E. Gestion » du ${c.nomOfficiel} (${c.nomCourt}), mouvement chrétien dont le siège est à Abidjan (Côte d’Ivoire), avec des points SDE en Tunisie, au Burkina Faso, en Italie, au Canada et aux États-Unis. Le leader du mouvement est l’Apôtre Jérémy Octave GLAZAÏ (« Jérémy l’Élu »). Ton nom vient de l’intendant fidèle d’Abraham (Genèse 24).
Tu sers les responsables du mouvement : réponds en français, avec clarté, chaleur fraternelle et sobriété, dans une perspective chrétienne centrée sur Jésus-Christ.
Règles :
- Pour toute information sur les membres, l’agenda, les finances, les projets ou les prières, consulte les outils de l’application ; n’invente jamais un nom, un chiffre ou une date. Si l’information manque, dis-le.
- Citations bibliques : Bible Louis Segond 1910, avec la référence ; si tu n’es pas certain du texte exact, signale-le.
- Confidentialité : ne transmets que ce que les outils renvoient à cette personne.
- Tu ne peux ni modifier ni enregistrer de données : tu lis et tu rédiges. L’utilisateur peut ensuite transformer ta réponse en annonce, en message WhatsApp ou en affiche avec les boutons sous ta réponse.
- Textes à publier (annonces, invitations, messages, vœux, prières, mots d’exhortation) : fournis un texte prêt à l’emploi, sans commentaire superflu autour.
- Mise en forme : paragraphes courts, listes à puces quand c’est utile, **gras** pour l’essentiel. Pas de tableaux.
Aujourd’hui : ${dateFr(aujourdhui())}. Personne qui écrit : ${S.me.name || "un responsable"}, accès ${libNiveau()}.`;
  }
  async function envoyerIA(texte) {
    const q = String(texte || "").trim();
    if (!q || IA.enCours || !S.sample) return;
    IA.tours.push({ role: "user", content: q });
    IA.enCours = true; IA.partiel = ""; IA.activite = "Éliézer réfléchit…"; IA.erreur = ""; IA.brouillon = ""; IA.defiler = true;
    render();
    const fenetre = IA.tours.slice(-12);
    while (fenetre.length && fenetre[0].role !== "user") fenetre.shift();
    const outils = IA.limites && IA.limites.tools ? outilsIA() : null;
    const contexte = outils ? "" : `\n\nDonnées de l’application (lecture seule) :\n${JSON.stringify(statsIA())}`;
    const input = fenetre.map((t, k) => (k === 0 ? { role: "user", content: `${consigneIA()}${contexte}\n\n---\n\n${t.content}` } : t));
    IA.ctl = new AbortController();
    try {
      const r = await S.sample(input, { modelTier: "default", cache: false, signal: IA.ctl.signal, ...(outils ? { tools: outils } : {}), onText: ({ text }) => { IA.partiel = text; IA.activite = ""; IA.defiler = true; render(); } });
      IA.tours.push({ role: "assistant", content: r.text, coupe: r.truncated });
    } catch (e) {
      if (e && e.code === "cancelled") { if (IA.partiel) IA.tours.push({ role: "assistant", content: IA.partiel, coupe: true }); else IA.tours.pop(); }
      else {
        if (e && e.text) IA.tours.push({ role: "assistant", content: e.text, coupe: true });
        else IA.tours.pop();
        IA.erreur = messageIA(e);
        if (!e || !e.text) IA.brouillon = q;
      }
    } finally { IA.enCours = false; IA.partiel = ""; IA.activite = ""; IA.ctl = null; IA.defiler = true; render(); }
  }
  /* Mise en forme légère et sûre des réponses (le texte est échappé avant tout balisage) */
  function mdLeger(t) {
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const out = [];
    let liste = null;
    const fermerListe = () => { if (liste) { out.push(`</${liste}>`); liste = null; } };
    for (const brute of esc(t).split(/\n/)) {
      const l = brute.trimEnd();
      let r;
      if ((r = /^\s*[-•*]\s+(.*)$/.exec(l))) { if (liste !== "ul") { fermerListe(); out.push("<ul>"); liste = "ul"; } out.push(`<li>${inline(r[1])}</li>`); }
      else if ((r = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (liste !== "ol") { fermerListe(); out.push("<ol>"); liste = "ol"; } out.push(`<li>${inline(r[1])}</li>`); }
      else if ((r = /^\s*#{1,4}\s+(.*)$/.exec(l))) { fermerListe(); out.push(`<p class="ia-h">${inline(r[1])}</p>`); }
      else if (!l.trim()) fermerListe();
      else { fermerListe(); out.push(`<p>${inline(l)}</p>`); }
    }
    fermerListe();
    return out.join("");
  }
  const SUGGESTIONS_IA = () => [
    ["Prochain rassemblement", "Rédige l’annonce WhatsApp du prochain rassemblement, prête à envoyer."],
    ["Anniversaires", "Qui fête son anniversaire dans les 7 prochains jours ? Propose un message de vœux pour chacun."],
    ["Bilan de la semaine", "Fais-moi le point de la semaine : assiduité, absents à visiter, projets et tâches en retard."],
    ...(accesDirection() ? [["Finances", "Résume la situation financière : caisse, cotisations, offrandes et projets."], ["Veille pastorale", "Quels membres demandent un accompagnement en priorité, et pourquoi ?"]] : []),
    ["Exhortation", "Écris une courte exhortation pour la chaîne de prière de cette semaine, avec un verset Louis Segond."],
    ["IN FIRE", "Propose trois thèmes et versets pour la prochaine conférence IN FIRE, avec une phrase d’accroche chacun."],
  ];
  VUES.assistant = function () {
    let out = secHead("Éliézer", { eyebrow: "Assistant IA du mouvement", verset: ["Éternel, Dieu de mon seigneur Abraham, fais-moi, je te prie, rencontrer aujourd’hui ce que je désire.", "Genèse 24.12"], actions: IA.tours.length && !IA.enCours ? btn("ia-nouveau", "Nouvelle conversation", { ico: "i-plus" }) : "" });
    if (S.etat === "absent") return out + nonConnecte("L’assistant");
    if (S.etat === "connexion") return out + chargement("Préparation de l’assistant…");
    if (!S.sample) return out + vide("i-spark", "L’assistant n’est pas disponible ici. Il fonctionne dans Claude, pour les personnes qui ont autorisé l’application à utiliser Claude.");
    const fil = IA.tours.map((t, i) => t.role === "user"
      ? `<div class="ia-msg moi"><div class="ia-bulle">${esc(t.content).replace(/\n/g, "<br>")}</div></div>`
      : `<div class="ia-msg lui"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle">${mdLeger(t.content)}${t.coupe ? `<p class="hint">Réponse incomplète.</p>` : ""}<div class="ia-act">${btn("ia-copier", "Copier", { ico: "i-copy", sm: true, data: `data-i="${i}"` })}${peutEcrire() ? btn("ia-annonce", "Annonce", { ico: "i-pin", sm: true, data: `data-i="${i}"` }) + btn("ia-message", "Message", { ico: "i-horn", sm: true, data: `data-i="${i}"` }) : ""}${btn("ia-affiche", "Affiche", { ico: "i-image", sm: true, data: `data-i="${i}"` })}</div></div></div>`).join("");
    const enCours = IA.enCours ? `<div class="ia-msg lui"><span class="ia-av" aria-hidden="true">${I("i-spark")}</span><div class="ia-bulle">${IA.partiel ? mdLeger(IA.partiel) : ""}${IA.activite ? `<p class="ia-attente"><i></i>${esc(IA.activite)}</p>` : ""}</div></div>` : "";
    const accueil = !IA.tours.length && !IA.enCours ? `<div class="ia-accueil"><p>Bonjour${S.me.name ? " " + esc(S.me.name.split(/\s+/)[0]) : ""}. Je consulte les données de l’application (membres, agenda, projets${accesDirection() ? ", finances" : ""}…) et je rédige pour vous annonces, messages, vœux, exhortations ou thèmes de conférence.</p><div class="ia-sugg">${SUGGESTIONS_IA().map(([l, q]) => `<button class="chip-btn" type="button" data-act="ia-suggestion" data-q="${esc(q)}">${esc(l)}</button>`).join("")}</div></div>` : "";
    out += `<div class="ia"><div class="ia-fil" id="ia-fil" aria-live="polite">${accueil}${fil}${enCours}</div>
      ${IA.erreur ? `<p class="note danger" role="alert" style="margin:10px 0 0">${esc(IA.erreur)}</p>` : ""}
      <form class="ia-saisie" id="ia-form" novalidate><label class="sr" for="ia-q">Votre demande à Éliézer</label><textarea class="inp" id="ia-q" rows="2" placeholder="Demandez à Éliézer…"${IA.enCours ? " disabled" : ""}>${esc(IA.brouillon)}</textarea>${IA.enCours ? btn("ia-stop", "Arrêter", { ico: "i-x" }) : `<button class="btn btn-primary" type="submit">${I("i-right")}Envoyer</button>`}</form>
      <p class="hint" style="margin-top:6px">Éliézer peut se tromper : vérifiez les chiffres importants. Les conversations ne sont pas enregistrées.</p></div>`;
    return out;
  };
  document.addEventListener("submit", (ev) => { if (ev.target && ev.target.id === "ia-form") { ev.preventDefault(); const q = $("#ia-q"); envoyerIA(q ? q.value : ""); } });
  document.addEventListener("keydown", (ev) => { if (ev.target && ev.target.id === "ia-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); envoyerIA(ev.target.value); } });
  document.addEventListener("input", (ev) => { if (ev.target && ev.target.id === "ia-q") IA.brouillon = ev.target.value; });
  function apresRenduIA() {
    const fil = $("#ia-fil");
    if (fil && IA.defiler) { fil.scrollTop = fil.scrollHeight; IA.defiler = false; }
    const fab = $("#fab-ia");
    if (fab) fab.hidden = !S.sample || S.vue === "assistant" || S.etat !== "pret";
  }
  const premiereLigne = (t) => String(t || "").split(/\n/).map((l) => l.replace(/[*#`>]/g, "").replace(/^\s*[-•\d.)]+\s*/, "").trim()).find(Boolean) || "";
  const sansMarques = (t) => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*#{1,4}\s+/gm, "").replace(/`/g, "").trim();
  /* ════════════════════════ Matricules ════════════════════════ */
  const CODES_PAYS = { CIV: "CI", TUN: "TN", BFA: "BF", ITA: "IT", CAN: "CA", USA: "US", FRA: "FR", BEL: "BE", CHE: "CH", SEN: "SN", MLI: "ML", TGO: "TG", BEN: "BJ", GHA: "GH", CMR: "CM", GAB: "GA", COD: "CD", GBR: "GB", DEU: "DE", ESP: "ES" };
  const normMat = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");
  function porteurMatricule(mat, saufId) {
    const k = normMat(mat);
    return k ? S.membres.find((x) => x.id !== saufId && normMat(x.matricule) === k) || null : null;
  }
  const anciensMat = (m, ancien, nouveau) => { const a = [...new Set([...(m.anciensMatricules || []), normMat(ancien)].filter(Boolean))].filter((x) => x !== normMat(nouveau)); return a.slice(-10); };
  /* — Un seul membre — */
  function ouvrirMatricule(mid) {
    const m = membre(mid);
    if (!m) return;
    const html = `<form class="form" id="f-mat" novalidate>
      <div class="ident">${avatar(m)}<div><h3>${esc(nomUsuel(m))}</h3><p>${esc(m.matricule ? `Matricule actuel : ${m.matricule}` : "Pas encore de matricule")}</p></div></div>
      ${champ("mt-val", "Nouveau matricule", inp("mt-val", "matricule", m.matricule || prochainMatricule(), 'autocomplete="off" autocapitalize="characters" required autofocus'), { req: true, hint: `Prochain numéro libre : ${esc(prochainMatricule())}.` })}
      <p class="note">La carte de membre et les attestations porteront le nouveau matricule. Les documents déjà imprimés restent vérifiables avec l’ancien.</p>
      ${(m.anciensMatricules || []).length ? `<p class="hint">Anciens matricules : ${esc(m.anciensMatricules.join(", "))}</p>` : ""}
      ${pied("Enregistrer le matricule")}
    </form>`;
    ouvrir({ titre: "Matricule", html, onSubmit: async (fd, form) => {
      const nv = normMat(fd.get("matricule"));
      if (!nv) { erreurForm("Indiquez le matricule."); return; }
      if (nv === normMat(m.matricule)) { ouvrirMembre(mid); return; }
      const pris = porteurMatricule(nv, mid);
      if (pris) { erreurForm(`Le matricule ${nv} est déjà attribué à ${nomComplet(pris)}.`); return; }
      form.querySelector("[type=submit]").disabled = true;
      const ok = await ecrire(() => S.db.doc("membres/" + mid).update({ matricule: nv, anciensMatricules: anciensMat(m, m.matricule, nv), ...tampon() }), `Matricule ${nv} enregistré`);
      if (!ok) { form.querySelector("[type=submit]").disabled = false; return; }
      ouvrirMembre(mid);
    } });
  }
  /* — Tous les membres : tableau et renumérotation — */
  const MT = { onglet: "tableau", saisies: {}, opts: null };
  const OPTS_MAT = () => ({ prefixe: "SDE", sep: "-", point: false, annee: false, chiffres: 4, depart: 1, ordre: "matricule", parPoint: false, archives: true });
  function membresMat() { return S.membres.slice().sort((a, b) => (a.actif === false) - (b.actif === false) || cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b)); }
  function codePoint(m) {
    const pt = m.garnisonId ? pointDeGarnison(m.garnisonId) : null;
    const iso = pt ? isoDePays(pt.pays) : m.garnisonId ? paysDeGarnison(m.garnisonId) : "";
    return iso ? CODES_PAYS[iso] || iso.slice(0, 2) : "XX";
  }
  function planRenum(o) {
    const base = S.membres.filter((m) => o.archives || m.actif !== false);
    const tri = base.slice().sort((a, b) => {
      if (o.ordre === "nom") return parNom(a, b);
      if (o.ordre === "adhesion") return cmpFr(a.adhesion || "9999", b.adhesion || "9999") || parNom(a, b);
      return cmpFr(a.matricule || "~", b.matricule || "~") || parNom(a, b);
    });
    const compteurs = {};
    const largeur = Math.max(2, Math.min(6, Number(o.chiffres) || 4));
    const dep = Math.max(0, Number(o.depart) || 1);
    const plan = tri.map((m) => {
      const parts = [o.prefixe.trim().toUpperCase()].filter(Boolean);
      if (o.point) parts.push(codePoint(m));
      if (o.annee) parts.push(m.adhesion ? m.adhesion.slice(0, 4) : String(new Date().getFullYear()));
      const cle = o.parPoint && o.point ? codePoint(m) : "_";
      compteurs[cle] = (compteurs[cle] ?? dep - 1) + 1;
      parts.push(String(compteurs[cle]).padStart(largeur, "0"));
      return { m, ancien: m.matricule || "", nouveau: parts.join(o.sep) };
    });
    const pris = new Set(plan.map((x) => x.nouveau));
    const exclus = S.membres.filter((m) => !base.includes(m));
    const conflits = exclus.filter((m) => pris.has(normMat(m.matricule)));
    const doublons = plan.length - pris.size;
    return { plan, changes: plan.filter((x) => normMat(x.ancien) !== x.nouveau), conflits, doublons };
  }
  function ficheMatricules() {
    if (!S.pret.membres) return chargement("Lecture du registre…");
    const adm = peutAdmin();
    const ong = adm ? MT.onglet : "tableau";
    let out = adm ? `<div class="subtabs" role="group" aria-label="Mode">${[["tableau", "Modifier un par un"], ["renum", "Renuméroter tout le registre"]].map(([k, l]) => `<button class="subtab${ong === k ? " on" : ""}" type="button" data-act="mat-onglet" data-v="${k}" aria-pressed="${ong === k}">${esc(l)}</button>`).join("")}</div>` : "";
    if (ong === "renum") {
      const o = MT.opts || (MT.opts = OPTS_MAT());
      const r = planRenum(o);
      const exemple = r.plan[0] ? r.plan[0].nouveau : "";
      out += `<form class="form" id="f-renum" novalidate>
        <div class="f2">${champ("rn-pre", "Préfixe", inp("rn-pre", "prefixe", o.prefixe, 'autocomplete="off" autocapitalize="characters" maxlength="12"'))}${champ("rn-sep", "Séparateur", sel("rn-sep", "sep", [["-", "Tiret ( - )"], ["/", "Barre ( / )"], [".", "Point ( . )"], ["", "Aucun"]], o.sep, null))}</div>
        <div class="f2">${champ("rn-chif", "Nombre de chiffres", sel("rn-chif", "chiffres", [["3", "3 (001)"], ["4", "4 (0001)"], ["5", "5 (00001)"]], String(o.chiffres), null))}${champ("rn-dep", "Premier numéro", inp("rn-dep", "depart", String(o.depart), 'inputmode="numeric" autocomplete="off"'))}</div>
        ${champ("rn-ordre", "Ordre de numérotation", sel("rn-ordre", "ordre", [["matricule", "Ordre des matricules actuels"], ["adhesion", "Date d’adhésion (les plus anciens d’abord)"], ["nom", "Ordre alphabétique"]], o.ordre, null))}
        <div class="field"><span class="lab">Options</span>
          <label class="check"><input type="checkbox" name="point" value="1"${o.point ? " checked" : ""}> Ajouter le code du point SDE (CI, TN, BF, IT, CA, US)</label>
          <label class="check"><input type="checkbox" name="parPoint" value="1"${o.parPoint ? " checked" : ""}${o.point ? "" : " disabled"}> Numéroter séparément dans chaque point</label>
          <label class="check"><input type="checkbox" name="annee" value="1"${o.annee ? " checked" : ""}> Ajouter l’année d’adhésion</label>
          <label class="check"><input type="checkbox" name="archives" value="1"${o.archives ? " checked" : ""}> Inclure les membres archivés</label>
        </div>
      </form>
      <p class="tally"><span>Exemple : <b class="num">${esc(exemple || "—")}</b></span><span>${pluriel(r.changes.length, "matricule changera", "matricules changeront")} sur ${nb(r.plan.length)}</span></p>
      ${r.conflits.length ? `<p class="note danger">Conflit avec des membres non renumérotés : ${esc(r.conflits.map((m) => `${nomComplet(m)} (${m.matricule})`).join(", "))}. Incluez les archivés ou changez le format.</p>` : ""}
      ${r.doublons ? `<p class="note danger">Le format produit des doublons : ajoutez un numéro par point ou changez les options.</p>` : ""}
      <div class="table-wrap"><table class="t"><thead><tr><th scope="col">Membre</th><th scope="col">Actuel</th><th scope="col">Nouveau</th></tr></thead><tbody>${r.plan.slice(0, 200).map((x) => `<tr${normMat(x.ancien) !== x.nouveau ? ' class="chg"' : ""}><th scope="row">${esc(nomComplet(x.m))}${x.m.actif === false ? ' <span class="chip">Archivé</span>' : ""}</th><td class="num">${esc(x.ancien || "—")}</td><td class="num"><b>${esc(x.nouveau)}</b></td></tr>`).join("")}</tbody></table></div>
      <p class="note" style="margin-top:12px">Les cartes et attestations déjà imprimées restent vérifiables avec l’ancien matricule. Pensez à réimprimer les cartes après la renumérotation.</p>
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Annuler</button><button class="btn btn-primary" type="button" data-act="mat-renum"${r.changes.length && !r.conflits.length && !r.doublons ? "" : " disabled"}>${I("i-check")}Appliquer à ${pluriel(r.changes.length, "membre", "membres")}</button></div>`;
      return out;
    }
    const liste = membresMat();
    const valeurs = liste.map((m) => ({ m, v: MT.saisies[m.id] != null ? MT.saisies[m.id] : m.matricule || "" }));
    const compte = {};
    valeurs.forEach(({ v }) => { const k = normMat(v); if (k) compte[k] = (compte[k] || 0) + 1; });
    const modifies = valeurs.filter(({ m, v }) => normMat(v) !== normMat(m.matricule));
    const erreurs = valeurs.filter(({ v }) => normMat(v) && compte[normMat(v)] > 1);
    out += `<p class="hint">Corrigez les matricules directement dans le tableau, puis enregistrez. Les doublons sont signalés en rouge.</p>
      <div class="table-wrap"><table class="t mat-t"><thead><tr><th scope="col">Membre</th><th scope="col">Matricule</th></tr></thead><tbody>${valeurs.map(({ m, v }) => {
        const dup = normMat(v) && compte[normMat(v)] > 1, chg = normMat(v) !== normMat(m.matricule);
        return `<tr class="${dup ? "dup" : chg ? "chg" : ""}"><th scope="row">${esc(nomComplet(m))}${m.actif === false ? ' <span class="chip">Archivé</span>' : ""}</th><td><label class="sr" for="mt-${esc(m.id)}">Matricule de ${esc(nomComplet(m))}</label><input class="inp mat-in" id="mt-${esc(m.id)}" data-mat="${esc(m.id)}" value="${esc(v)}" autocomplete="off" autocapitalize="characters" spellcheck="false"></td></tr>`;
      }).join("")}</tbody></table></div>
      ${erreurs.length ? `<p class="note danger" style="margin-top:10px">${pluriel(new Set(erreurs.map((x) => normMat(x.v))).size, "matricule est attribué", "matricules sont attribués")} à plusieurs membres.</p>` : ""}
      <div class="sheet-f"><button class="btn btn-ghost" type="button" data-act="fermer">Fermer</button><button class="btn btn-primary" type="button" data-act="mat-enregistrer"${modifies.length && !erreurs.length ? "" : " disabled"}>${I("i-check")}${modifies.length ? `Enregistrer ${pluriel(modifies.length, "modification", "modifications")}` : "Aucune modification"}</button></div>`;
    return out;
  }
  function ouvrirMatricules() { MT.saisies = {}; MT.onglet = "tableau"; MT.opts = null; ouvrir({ titre: "Matricules", wide: true, refresh: ficheMatricules }); }
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t && t.dataset && t.dataset.mat) { MT.saisies[t.dataset.mat] = t.value; clearTimeout(MT.timer); MT.timer = setTimeout(() => { dernier.sheet = null; render(); }, 350); return; }
    if (t && t.form && t.form.id === "f-renum") lireOptsRenum(t.form);
  });
  document.addEventListener("change", (ev) => { const t = ev.target; if (t && t.form && t.form.id === "f-renum") lireOptsRenum(t.form); });
  function lireOptsRenum(form) {
    const fd = new FormData(form);
    MT.opts = { prefixe: String(fd.get("prefixe") || ""), sep: String(fd.get("sep") ?? "-"), chiffres: Number(fd.get("chiffres")) || 4, depart: Number(String(fd.get("depart") || "1").replace(/\D/g, "")) || 0, ordre: String(fd.get("ordre") || "matricule"), point: fd.get("point") === "1", parPoint: fd.get("parPoint") === "1", annee: fd.get("annee") === "1", archives: fd.get("archives") === "1" };
    clearTimeout(MT.timer); MT.timer = setTimeout(() => { dernier.sheet = null; render(); }, 250);
  }
  async function enregistrerMatricules() {
    const ops = [];
    for (const [id, v] of Object.entries(MT.saisies)) {
      const m = membre(id);
      const nv = normMat(v);
      if (!m || nv === normMat(m.matricule)) continue;
      ops.push(() => S.db.doc("membres/" + id).update({ matricule: nv, anciensMatricules: anciensMat(m, m.matricule, nv), ...tampon() }));
    }
    if (!ops.length) return;
    if (await lot(ops, `${pluriel(ops.length, "matricule mis à jour", "matricules mis à jour")}`)) { MT.saisies = {}; dernier.sheet = null; render(); }
  }
  async function appliquerRenum() {
    const r = planRenum(MT.opts || OPTS_MAT());
    if (!r.changes.length || r.conflits.length || r.doublons) return;
    const ops = r.changes.map((x) => () => S.db.doc("membres/" + x.m.id).update({ matricule: x.nouveau, anciensMatricules: anciensMat(x.m, x.ancien, x.nouveau), ...tampon() }));
    if (await lot(ops, `${pluriel(ops.length, "membre renuméroté", "membres renumérotés")}`)) { MT.onglet = "tableau"; dernier.sheet = null; render(); }
  }
  /* ════════════════════════ Accueil (Ézéchiel 37) ════════════════════════ */
  /* Texte fondateur du mouvement : Ézéchiel 37, la vallée des ossements desséchés (Louis Segond 1910). */
  const EZ37 = [
    ["Fils de l’homme, ces os pourront-ils revivre ? Je répondis : Seigneur Éternel, tu le sais.", "Ézéchiel 37.3"],
    ["Ossements desséchés, écoutez la parole de l’Éternel !", "Ézéchiel 37.4"],
    ["Voici, je vais faire entrer en vous un esprit, et vous vivrez.", "Ézéchiel 37.5"],
    ["Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent !", "Ézéchiel 37.9"],
    ["Et l’esprit entra en eux, et ils reprirent vie, et ils se tinrent sur leurs pieds : c’était une armée nombreuse, très nombreuse.", "Ézéchiel 37.10"],
    ["Je mettrai mon esprit en vous, et vous vivrez ; je vous rétablirai dans votre pays, et vous saurez que moi, l’Éternel, j’ai parlé et agi.", "Ézéchiel 37.14"],
  ];
  const HERO = { idx: 4, timer: 0, raf: 0, cv: null, parts: [], souffle: 0, anime: false, cd: 0 };
  function versetHero(i) {
    const [t, r] = EZ37[i];
    return `<blockquote class="hero-v" id="hero-v"><p>« ${esc(t)} »</p><cite>${esc(r)}</cite></blockquote>`;
  }
  function decompte(e) {
    if (!e) return null;
    const [h, mi] = String(e.heure || "08:00").split(":").map(Number);
    const d = versDate(e.date); d.setHours(h || 0, mi || 0, 0, 0);
    return d;
  }
  function texteDecompte(cible, court) {
    const ms = cible - new Date();
    if (ms <= 0) return ms > -3 * 36e5 ? "C’est maintenant !" : "En cours";
    if (court) { const j = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5); return j ? `dans ${j} j ${pad(h)} h` : `dans ${h} h ${pad(Math.floor((ms % 36e5) / 6e4))} min`; }
    const j = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    return j ? `${j} j ${pad(h)} h ${pad(m)} min` : `${pad(h)} h ${pad(m)} min ${pad(s)} s`;
  }
  function compteurs() {
    const reg = accesRegistre();
    const out = [];
    if (reg && S.pret.membres) {
      const actifs = membresActifs();
      out.push({ n: actifs.length, l: "soldats", d: "dans l’armée", vue: "membres", ico: "i-users" });
      const pts = pointsSDE();
      out.push({ n: pts.length, l: pts.length > 1 ? "points SDE" : "point SDE", d: `${new Set(pts.map((g) => isoDePays(g.pays)).filter(Boolean)).size} pays`, vue: "garnisons", ico: "i-pin" });
      const evts = evtsPeriode("3m", "");
      const taux = actifs.map((m) => statsMembre(m, evts).taux).filter((t) => t != null);
      out.push({ n: taux.length ? Math.round((taux.reduce((a, b) => a + b, 0) / taux.length) * 100) : null, suf: " %", l: "d’assiduité", d: evts.length ? "sur trois mois" : "pointez un rassemblement", vue: "agenda", ico: "i-ucheck" });
    }
    if (reg && S.pret.projets) out.push({ n: (S.projets || []).filter(estActifP).length, l: "projets", d: "en cours", vue: "projets", ico: "i-proj" });
    if (reg && S.pret.prieres) out.push({ n: S.prieres.filter((p) => (p.statut || "En prière") === "En prière").length, l: "requêtes", d: "devant le trône", vue: "chambre", ico: "i-flame" });
    out.push({ n: aVenir().length, l: "rassemblements", d: "à venir", vue: "agenda", ico: "i-cal" });
    return out;
  }
  function priorites() {
    const l = [];
    if (!accesRegistre()) return l;
    const auj = aujourdhui();
    const nRap = rappelsEnAttente();
    if (nRap) l.push({ ico: "i-msg", t: `${pluriel(nRap, "rappel WhatsApp", "rappels WhatsApp")} à envoyer`, d: "Anniversaires, rassemblements, cotisations : messages prêts", act: "aller-sous", data: 'data-vue-cible="portevoix" data-sous="rappels"', cls: "gold" });
    if (sauvegardeDue()) l.push({ ico: "i-down", t: "Sauvegarde Excel du mois", d: cfg().derniereSauvegarde ? `Dernière le ${fmtCourt(cfg().derniereSauvegarde)}` : "Aucune sauvegarde Excel enregistrée", act: "sauvegarde-excel", data: "", cls: "warn" });
    const nonPointes = S.evenements.filter((e) => e.date < auj && e.date >= ajoutJours(auj, -14) && !estPointe(e) && !e.garnisonId).slice(0, 2);
    nonPointes.forEach((e) => l.push({ ico: "i-ucheck", t: `Pointer « ${e.titre} »`, d: `${fmtCourt(e.date)} · présences non saisies`, act: "pointer-evt", data: `data-id="${esc(e.id)}"`, cls: "warn" }));
    membresActifs().filter((m) => { const a = prochainAnniv(m); return a && a.dans === 0; }).forEach((m) => l.push({ ico: "i-cake", t: `Souhaiter l’anniversaire de ${nomCourtM(m)}`, d: "C’est aujourd’hui", act: "voeux", data: `data-id="${esc(m.id)}"`, cls: "gold" }));
    if (accesDirection() && S.pret.suivi) {
      const echus = (S.suivi || []).filter((s) => s.prochainSuivi && s.prochainSuivi <= auj && membre(s.membreId || s.id));
      if (echus.length) l.push({ ico: "i-users", t: `${pluriel(echus.length, "suivi pastoral", "suivis pastoraux")} à faire`, d: echus.map((s) => nomCourtM(membre(s.membreId || s.id))).slice(0, 3).join(", "), act: "aller-veille", data: "", cls: "warn" });
    }
    const sp = suiviPastoral();
    if (sp.pret && sp.liste.length) l.push({ ico: "i-phone", t: `${pluriel(sp.liste.length, "membre absent", "membres absents")} à appeler`, d: "Absents des trois derniers rassemblements", act: "aller-sous", data: 'data-vue-cible="membres" data-sous="suivi"', cls: "" });
    if (S.pret.projets) {
      const ret = (S.projets || []).filter((p) => !estClosP(p)).flatMap(tachesP).filter(tacheEnRetard).length;
      if (ret) l.push({ ico: "i-proj", t: `${pluriel(ret, "tâche de projet", "tâches de projet")} en retard`, d: "Relancer les responsables", act: "aller-sous", data: 'data-vue-cible="projets" data-sous="taches"', cls: "" });
    }
    if (S.pret.membres) {
      const sans = membresActifs().filter((m) => !m.garnisonId || !pointDeGarnison(m.garnisonId)).length;
      if (sans) l.push({ ico: "i-pin", t: `${pluriel(sans, "soldat sans point SDE", "soldats sans point SDE")}`, d: "À rattacher sur la cartographie", act: "aller-sous", data: 'data-vue-cible="garnisons" data-sous="sans"', cls: "" });
    }
    return l.slice(0, 6);
  }
  function actionsRapides() {
    const a = [];
    const prochain = aVenir()[0];
    if (peutEcrire() && prochain) a.push(["pointer-evt", "Pointer", "i-ucheck", `data-id="${esc(prochain.id)}"`]);
    if (peutEcrire() && accesRegistre()) a.push(["ajout-membre", "Nouveau soldat", "i-plus", ""]);
    if (peutEcrire()) a.push(["ajout-annonce", "Annonce", "i-horn", ""]);
    a.push(["nouvelle-affiche", "Affiche", "i-image", 'data-modele="evenement"']);
    if (S.sample) a.push(["aller-ia", "Éliézer", "i-spark", ""]);
    if (accesRegistre()) a.push(["aller-chambre", "Prier", "i-flame", ""]);
    if (accesRegistre()) a.push(["aller-sous", "Rappels", "i-msg", 'data-vue-cible="portevoix" data-sous="rappels"']);
    if (!accesRegistre()) a.unshift(["aller-sous", "Mon espace", "i-card", 'data-vue-cible="espace" data-sous=""']);
    if (peutAdmin()) a.push(["ajout-offrande", "Offrande", "i-in", ""]);
    a.push(["installer", "Installer", "i-phone", ""]);
    return `<nav class="rapides" aria-label="Actions rapides">${a.map(([act, l, ico, data]) => `<button class="rapide" type="button" data-act="${act}"${data ? " " + data : ""}><span class="rapide-i" aria-hidden="true">${I(ico)}</span><span>${esc(l)}</span></button>`).join("")}</nav>`;
  }
  function bandeauAujourdhui() {
    const tuiles = [];
    const e = aVenir()[0];
    if (e) {
      const cible = decompte(e);
      tuiles.push(`<section class="auj auj-evt" aria-label="Prochain rassemblement"><p class="auj-k">${I("i-cal")}Prochain rassemblement</p><h2 class="auj-t">${esc(e.titre)}</h2><p class="auj-m">${esc([fmtLong(e.date), fmtHeure(e.heure), e.lieu].filter(Boolean).join(" · "))}</p><p class="decompte" id="decompte" data-t="${cible.getTime()}" aria-live="off">${esc(texteDecompte(cible, true))}</p><div class="btn-row">${peutEcrire() && e.date === aujourdhui() ? btn("pointer-evt", "Pointer maintenant", { ico: "i-ucheck", sm: true, cls: "btn-primary", data: `data-id="${esc(e.id)}"` }) : ""}${btn("voir-evt", "Détails", { sm: true, data: `data-id="${esc(e.id)}"` })}${btn("affiche-evt", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(e.id)}"` })}${btn("annonce-evt", "Inviter", { ico: "i-msg", sm: true, data: `data-id="${esc(e.id)}"` })}</div></section>`);
    } else tuiles.push(`<section class="auj auj-evt"><p class="auj-k">${I("i-cal")}Prochain rassemblement</p><h2 class="auj-t">Rien de programmé</h2><p class="auj-m">Ajoutez le prochain culte, la prochaine veillée ou réunion.</p>${peutEcrire() ? `<div class="btn-row">${btn("ajout-evt", "Programmer", { ico: "i-plus", sm: true })}</div>` : ""}</section>`);
    if (accesRegistre() && S.pret.membres) {
      const ann = membresActifs().map((m) => ({ m, a: prochainAnniv(m) })).filter((x) => x.a && x.a.dans <= 7).sort((x, y) => x.a.dans - y.a.dans);
      tuiles.push(`<section class="auj auj-anniv" aria-label="Anniversaires"><p class="auj-k">${I("i-cake")}Anniversaires de la semaine</p>${ann.length ? `<ul class="auj-l">${ann.slice(0, 4).map(({ m, a }) => `<li>${avatar(m)}<span><b>${esc(nomCourtM(m))}</b><small>${esc(a.dans === 0 ? "Aujourd’hui !" : a.dans === 1 ? "Demain" : fmtJM(a.date))}</small></span><span class="auj-b"><button class="icon-btn" type="button" data-act="voeux" data-id="${esc(m.id)}" aria-label="${esc(`Souhaiter l’anniversaire de ${nomCourtM(m)}`)}">${I("i-msg")}</button><button class="icon-btn" type="button" data-act="affiche-anniv" data-id="${esc(m.id)}" aria-label="${esc(`Affiche d’anniversaire de ${nomCourtM(m)}`)}">${I("i-image")}</button></span></li>`).join("")}</ul>${ann.length > 4 ? `<p class="auj-m">et ${pluriel(ann.length - 4, "autre", "autres")}</p>` : ""}` : `<p class="auj-m">Aucun anniversaire dans les sept prochains jours.</p>`}</section>`);
    }
    if (accesRegistre() && S.pret.chaine) {
      const ch = chaine();
      tuiles.push(`<section class="auj auj-priere" aria-label="Chambre Haute"><p class="auj-k">${I("i-flame")}Sujet de la semaine</p><h2 class="auj-t">${esc(ch.sujetSemaine || "Que l’Esprit souffle sur les nations")}</h2>${ch.versetSemaine ? `<p class="auj-m"><i>${esc(ch.versetSemaine)}</i></p>` : ""}<div class="btn-row">${btn("aller-chambre", "Entrer dans la Chambre Haute", { ico: "i-flame", sm: true })}</div></section>`);
    }
    return `<div class="aujourdhui">${tuiles.join("")}</div>`;
  }
  VUES.accueil = function () {
    const c = cfg();
    const h = new Date().getHours();
    const salut = h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
    const prenom = (S.me.name || "").trim().split(/\s+/)[0] || "";
    const nbSoldats = accesRegistre() && S.pret.membres ? membresActifs().length : null;
    let out = `<section class="acc-hero" aria-label="Accueil">
      <canvas class="hero-cv" id="hero-cv" aria-hidden="true"></canvas>
      <svg class="hero-vallee" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 160 L0 98 C140 70 230 118 360 92 C500 64 560 112 700 86 C840 60 930 104 1060 80 C1120 70 1170 78 1200 74 L1200 160 Z"/><path class="v2" d="M0 160 L0 124 C180 104 300 140 470 118 C640 96 760 136 930 114 C1060 98 1140 110 1200 104 L1200 160 Z"/></svg>
      <div class="hero-c">
        <div class="hero-top"><span class="logo lg" aria-hidden="true"></span><div><p class="hero-k">${salut}${prenom ? ", " + esc(prenom) : ""} · ${esc(fmtLong(aujourdhui()))}</p><p class="hero-m">${esc(c.nomOfficiel)}</p></div></div>
        <p class="hero-fond">Texte fondateur · Ézéchiel 37</p>
        ${versetHero(HERO.idx)}
        <div class="hero-pts" role="group" aria-label="Versets d’Ézéchiel 37">${EZ37.map(([, r], i) => `<button type="button" class="hero-pt${i === HERO.idx ? " on" : ""}" data-act="hero-verset" data-i="${i}" aria-label="${esc(r)}" aria-pressed="${i === HERO.idx}"></button>`).join("")}</div>
        <div class="hero-a"><button class="btn btn-souffle" type="button" data-act="souffle">${I("i-spark")}Esprit, viens des quatre vents !</button>${nbSoldats != null ? `<p class="hero-armee" id="hero-armee" aria-live="polite"><b data-compte="${nbSoldats}">${nb(nbSoldats)}</b> soldats debout · ${esc(c.devise || "")}</p>` : `<p class="hero-armee">${esc(c.devise || "")}</p>`}</div>
      </div>
    </section>`;
    if (S.etat === "absent") return out + nonConnecte("Les membres, l’agenda et la vie du mouvement");
    out += actionsRapides();
    out += bandeauAujourdhui();
    if (!accesRegistre()) out += `<section class="card esp-promo"><div class="esp-entree-i" aria-hidden="true">${I("i-card")}</div><div><h2 class="h3" style="margin:0">Mon espace soldat</h2><p class="hint" style="margin:4px 0 10px">${ESP.data ? `Bonjour ${esc(prenomUsuel(ESP.data.m))} : votre carte, vos présences et vos cotisations vous attendent.` : "Avec votre code personnel : votre carte de membre, vos présences, vos cotisations et vos requêtes de prière."}</p><button class="btn btn-primary btn-sm" type="button" data-vue="espace">${I("i-right")}Ouvrir mon espace</button></div></section>`;
    const cs = compteurs();
    if (cs.length) out += `<div class="chiffres">${cs.map((k) => `<button class="chiffre" type="button" data-vue="${k.vue}"><span class="chiffre-i" aria-hidden="true">${I(k.ico)}</span><b data-compte="${k.n == null ? "" : k.n}" data-suf="${esc(k.suf || "")}">${k.n == null ? "—" : nb(k.n) + (k.suf || "")}</b><span class="chiffre-l">${esc(k.l)}</span><small>${esc(k.d)}</small></button>`).join("")}</div>`;
    const pr = priorites();
    if (pr.length) out += `<section class="prio" aria-labelledby="prio-t"><h2 class="h3" id="prio-t">À faire aujourd’hui</h2><div class="prio-l">${pr.map((p) => `<button class="prio-i ${p.cls}" type="button" data-act="${p.act}"${p.data ? " " + p.data : ""}><span class="prio-ico" aria-hidden="true">${I(p.ico)}</span><span class="prio-x"><b>${esc(p.t)}</b><small>${esc(p.d)}</small></span>${I("i-right", "ico prio-f")}</button>`).join("")}</div></section>`;
    const cartes = [];
    const ann = carteAnnonces();
    if (ann) cartes.push(ann);
    cartes.push(carteRassemblements());
    if (accesRegistre()) cartes.push(carteChambre());
    if (accesRegistre()) cartes.push(carteProjets());
    if (accesRegistre()) { cartes.push(carteLieux()); }
    if (accesRegistre()) cartes.push(carteAssiduite());
    if (accesRegistre()) cartes.push(carteAcademie());
    if (accesDirection()) cartes.push(carteVeille());
    if (accesRegistre()) { cartes.push(carteDecisions()); cartes.push(carteEffectif()); cartes.push(carteSuivi()); }
    out += `<h2 class="h3 acc-sec">La vie du mouvement</h2><div class="grid g3">${cartes.join("")}</div>`;
    if (accesFinances()) out += `<details class="direction" id="esp-direction"${S.accDirOuvert ? " open" : ""}><summary>${I("i-lock")}<span>Espace direction · caisse et cotisations</span>${I("i-right", "ico dir-f")}</summary><div class="btn-row dir-outils">${btn("sauvegarde-excel", "Sauvegarde Excel", { ico: "i-down", sm: true })}${btn("espaces", "Espaces soldats", { ico: "i-card", sm: true })}${btn("copie-poche", "Copie de poche", { ico: "i-down", sm: true })}</div><div class="grid g3" style="margin-top:12px">${carteCaisse()}${carteCotis()}</div></details>`;
    return out;
  };
  /* Animation : souffle de l’Esprit (particules qui montent de la vallée) */
  function initHero() {
    const cv = $("#hero-cv");
    if (!cv) { cancelAnimationFrame(HERO.raf); HERO.raf = 0; HERO.cv = null; clearInterval(HERO.timer); HERO.timer = 0; clearInterval(HERO.cd); HERO.cd = 0; HERO.anime = false; return; }
    const reduit = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (HERO.cv !== cv) {
      HERO.cv = cv;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      if (!HERO.parts.length) for (let i = 0; i < 70; i += 1) HERO.parts.push(nouvellePart(cv, true));
      if (!reduit && !HERO.raf) HERO.raf = requestAnimationFrame(boucleHero);
      if (reduit) dessinerHero();
    }
    if (!HERO.timer && !reduit) HERO.timer = setInterval(() => { if (document.hidden) return; changerVerset((HERO.idx + 1) % EZ37.length); }, 9000);
    if (!HERO.cd) HERO.cd = setInterval(majDecompte, 1000);
    if (!HERO.anime) { HERO.anime = true; animerCompteurs(); }
  }
  function nouvellePart(cv, partout) {
    const w = cv.width, h = cv.height;
    return { x: Math.random() * w, y: partout ? Math.random() * h : h + Math.random() * 40, r: 0.6 + Math.random() * 2.2, v: 0.15 + Math.random() * 0.55, a: 0.15 + Math.random() * 0.6, o: Math.random() * Math.PI * 2 };
  }
  function dessinerHero() {
    const cv = HERO.cv;
    if (!cv) return;
    const x = cv.getContext("2d");
    x.clearRect(0, 0, cv.width, cv.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const p of HERO.parts) {
      const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4 * dpr);
      g.addColorStop(0, `rgba(255,214,120,${p.a})`); g.addColorStop(1, "rgba(255,170,60,0)");
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 4 * dpr, 0, Math.PI * 2); x.fill();
    }
  }
  function boucleHero() {
    HERO.raf = 0;
    const cv = HERO.cv;
    if (!cv || !document.contains(cv)) return;
    if (!document.hidden) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const boost = 1 + HERO.souffle * 6;
      for (const p of HERO.parts) {
        p.o += 0.02;
        p.y -= p.v * dpr * boost;
        p.x += Math.sin(p.o) * 0.35 * dpr + (HERO.souffle ? (p.x < cv.width / 2 ? -1 : 1) * HERO.souffle * 1.2 * dpr : 0);
        if (p.y < -10 || p.x < -20 || p.x > cv.width + 20) Object.assign(p, nouvellePart(cv, false));
      }
      if (HERO.souffle) HERO.souffle = Math.max(0, HERO.souffle - 0.008);
      dessinerHero();
    }
    HERO.raf = requestAnimationFrame(boucleHero);
  }
  function changerVerset(i) {
    HERO.idx = i;
    const v = $("#hero-v");
    if (!v) return;
    v.classList.add("sort");
    setTimeout(() => {
      const n = $("#hero-v");
      if (n) { n.outerHTML = versetHero(HERO.idx); }
      document.querySelectorAll(".hero-pt").forEach((b, k) => { b.classList.toggle("on", k === HERO.idx); b.setAttribute("aria-pressed", String(k === HERO.idx)); });
    }, 350);
  }
  function majDecompte() {
    const el = $("#decompte");
    if (!el) return;
    const t = texteDecompte(new Date(Number(el.dataset.t))); el.textContent = /^\d/.test(t) ? "dans " + t : t;
  }
  function animerCompteurs() {
    const reduit = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return;
    document.querySelectorAll("[data-compte]").forEach((el) => {
      const fin = Number(el.dataset.compte);
      if (!el.dataset.compte || !isFinite(fin)) return;
      const suf = el.dataset.suf || "";
      const t0 = performance.now(), duree = 1100;
      const pas = (t) => { const k = Math.min(1, (t - t0) / duree); const e = 1 - Math.pow(1 - k, 3); if (document.contains(el)) el.textContent = nb(Math.round(fin * e)) + suf; if (k < 1) requestAnimationFrame(pas); };
      requestAnimationFrame(pas);
    });
  }
  function souffler() {
    HERO.souffle = 1;
    if (HERO.cv) for (let i = 0; i < 60; i += 1) HERO.parts.push(nouvellePart(HERO.cv, false));
    HERO.parts = HERO.parts.slice(-160);
    if (!HERO.raf && HERO.cv) HERO.raf = requestAnimationFrame(boucleHero);
    changerVerset(4);
    const ar = $("#hero-armee b");
    if (ar) { HERO.anime = true; ar.closest(".hero-armee").classList.add("eclat"); const fin = Number(ar.dataset.compte) || 0; const t0 = performance.now(); const pas = (t) => { const k = Math.min(1, (t - t0) / 1600); if (document.contains(ar)) ar.textContent = nb(Math.round(fin * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(pas); }; requestAnimationFrame(pas); setTimeout(() => { const p = $("#hero-armee"); if (p) p.classList.remove("eclat"); }, 2200); }
  }
  document.addEventListener("toggle", (ev) => { if (ev.target && ev.target.id === "esp-direction") { S.accDirOuvert = ev.target.open; dernier.main = null; } }, true);
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
    const data = { application: "S.D.E. Gestion", exporteLe: new Date().toISOString(), reglages: cfg(), membres: S.membres, evenements: S.evenements, decisions: S.decisions, garnisons: S.garnisons, formations: S.formations, annonces: S.annonces, messages: S.diffusions, prieres: S.prieres, chainePriere: S.chaine, arsenal: S.ressources, projets: S.projets, ...(accesFinances() ? { finances, cotisations: S.cotisations, discipline: S.discipline, prieresConfidentielles: S.prieresConf, cotisationsSpeciales: S.speciales, offrandes: S.offrandes, suiviPastoral: S.suivi, financesProjets: S.projetsFin } : {}) };
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
      try { await synchroAutresOp(o, false); } catch (e) { toast("La cotisation spéciale ou l’offrande liée n’a pas pu être mise à jour.", "err"); }
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
    "ajout-evt": (t) => ouvrirFormEvt(null, t && t.dataset && (t.dataset.garnison || t.dataset.type) ? { garnisonId: t.dataset.garnison || "", type: t.dataset.type || "" } : null),
    "pt-tous": () => { S.f.pointage.tous = !S.f.pointage.tous; render(); },
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
      ouvrirTexte("Bilan de présence", `${e.titre} — ${fmtJour(e.date)}\nTotal : ${pluriel(np + vi + nv, "personne", "personnes")}\n• ${pluriel(np, "membre présent", "membres présents")} sur ${nb(membresActifs().filter((m) => concerne(e, m)).length)}${nr ? `, dont ${pluriel(nr, "retard", "retards")}` : ""}${nx ? `\n• ${pluriel(nx, "absence excusée", "absences excusées")}` : ""}\n• ${pluriel(vi, "visiteur", "visiteurs")}\n• ${pluriel(nv, "nouveau venu", "nouveaux venus")}`, { wa: "" });
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
    "ajout-dec": () => ouvrirFormDec(null),
    "voir-dec": (t) => ouvrirDec(t.dataset.id),
    "editer-dec": (t) => ouvrirFormDec(t.dataset.id),
    "etat-dec": (t) => { const d = decision(t.dataset.id); if (d && d.etat !== t.dataset.etat) ecrire(() => S.db.doc("decisions/" + d.id).update({ etat: t.dataset.etat, ...tampon() }), `État : ${t.dataset.etat}`); },
    "supprimer-dec": (t) => boutonArme(t, "Confirmer la suppression", async () => { if (await ecrire(() => S.db.doc("decisions/" + t.dataset.id).delete(), "Décision supprimée")) fermer(); }),
  };
  Object.assign(A, {
    /* Cartes recto-verso */
    "dl-carte": (t) => telechargerCarte(t.dataset.face || "recto"),
    "zip-cartes": () => lotCartes("zip"),
    "pdf-cartes": () => lotCartes("pdf"),
    /* Voyants */
    "evaluer-membre": (t) => ouvrirEvaluation(t.dataset.id, t.dataset.k || ""),
    "aller-veille": () => { S.sous.membres = "voyants"; allerA("membres"); },
    "voyants-filtre": (t) => { S.f.voyants.filtre = t.dataset.v; render(); },
    "veille-niveau": (t) => ouvrirVeilleRapide(t.dataset.id, t.dataset.k),
    "veille-choisir": (t) => enregistrerVeilleRapide(t.dataset.id, t.dataset.k, Number(t.dataset.n) || 0),
    "veille-dim": (t) => { S.f.voyants.dim = S.f.voyants.dim === t.dataset.k ? "" : t.dataset.k; render(); },
    "veille-dims": () => ouvrir({ titre: "Dimensions de la veille", html: ficheDimsVeille(), onSubmit: enregistrerDimsVeille }),
    /* Cartographie */
    "carte-point": (t) => {
      S.carteSel = t.dataset.id; render();
      if (window.innerWidth < 960) requestAnimationFrame(() => { const p = $(".carte-panel"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); });
    },
    "carte-pays": (t) => {
      const iso = t.dataset.iso;
      const pts = pointsSDE().filter((g) => isoDePays(g.pays) === iso);
      S.carteSel = pts.length === 1 ? pts[0].id : "pays:" + iso;
      render();
      if (window.innerWidth < 960) requestAnimationFrame(() => { const p = $(".carte-panel"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); });
    },
    "carte-tout": () => { S.carteSel = ""; render(); },
    "carte-zoom": (t) => { const svg = $("#carte-svg"); if (svg) zoomer(svg, Number(t.dataset.k) || 1); },
    "carte-centrer": () => { const svg = $("#carte-svg"); const v = bornerVue(vueParDefaut(donneesCarte().marques)); if (svg) appliquerVue(svg, v); else S.carteV = v; },
    "carte-monde": () => { const svg = $("#carte-svg"); const v = bornerVue({ x: -75, y: -130, w: 1150 }); if (svg) appliquerVue(svg, v); else S.carteV = v; },
    "carte-voir": (t) => { S.carteSel = t.dataset.id; S.carteV = null; fermer(); S.sous.garnisons = "carte"; allerA("garnisons"); },
    "aller-carte": () => { S.sous.garnisons = "carte"; allerA("garnisons"); },
    "ouvrir-point": (t) => ouvrirNouveauPoint(t.dataset.pays || ""),
    /* Cotisations spéciales */
    "sp-filtre": (t) => { S.f.speciales.filtre = t.dataset.v; render(); },
    "ajout-speciale": () => ouvrirFormSpeciale(null),
    "voir-speciale": (t) => ouvrirSpeciale(t.dataset.id),
    "editer-speciale": (t) => ouvrirFormSpeciale(t.dataset.id),
    "ajout-versement-sp": (t) => ouvrirFormVersementSp(t.dataset.id, t.dataset.mid || ""),
    "export-sp": (t) => exporterSpeciale(t.dataset.id),
    "relancer-sp": (t) => {
      const sp = speciale(t.dataset.id);
      if (!sp) return;
      const b = bilanSp(sp);
      const ids = b.cible.liste.filter((m) => (b.mt ? (b.parM[m.id] || 0) < b.mt : !b.parM[m.id])).map((m) => m.id);
      const c = cfg();
      ouvrirCompose({ aud: "manuel", ids, titre: `Relance · ${sp.titre}`, message: `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Rappel fraternel : la cotisation spéciale « ${sp.titre} » du mouvement ${c.nomCourt}${sp.echeance ? `, attendue pour le ${fmtJour(sp.echeance)},` : ""} compte sur ta participation${b.mt ? ` (${fcfa(b.mt)} par membre)` : ""}. Merci pour ta générosité et ton engagement !` });
    },
    "statut-speciale": async (t) => {
      const sp = speciale(t.dataset.id);
      if (!sp) return;
      const ouv = ouverteSp(sp);
      await ecrire(() => S.db.doc("cotis_speciales/" + sp.id).update({ statut: ouv ? "Close" : "Ouverte", ...tampon() }), ouv ? "Cotisation clôturée" : "Cotisation rouverte");
    },
    "supprimer-speciale": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      if (await ecrire(() => S.db.doc("cotis_speciales/" + t.dataset.id).delete(), "Cotisation spéciale supprimée")) fermer();
    }),
    /* Offrandes */
    "off-type": (t) => { S.f.offrandes.type = t.dataset.v; render(); },
    "ajout-offrande": (t) => ouvrirFormOffrande({ membreId: t.dataset.mid || "" }),
    "voir-offrande": (t) => ouvrirOffrande(t.dataset.id),
    "export-offrandes": () => exporterOffrandes(),
    "voir-op-de": (t) => {
      const cle = t.dataset.mois, id = t.dataset.id;
      if (!cle || !id) return;
      S.mois = cle; S.fvue = "journal";
      allerA("finances");
      abonnerMois(cle);
      ouvrirOp(cle, id);
    },
  });
  Object.assign(A, {
    /* Projets */
    "ajout-projet": () => ouvrirFormProjet(null),
    "voir-projet": (t) => { if ($("#sheet").contains(t) && !t.dataset.onglet) S.projetOnglet = "apercu"; ouvrirProjet(t.dataset.id, t.dataset.onglet || (!$("#sheet").contains(t) ? "apercu" : "")); },
    "editer-projet": (t) => ouvrirFormProjet(t.dataset.id),
    "projet-onglet": (t) => { S.projetOnglet = t.dataset.v; dernier.sheet = null; render(); const b = $("#sheet-b"); if (b) b.scrollTop = 0; },
    "equipe-projet": (t) => choisirEquipe(t.dataset.id),
    "jalon-basculer": async (t) => {
      const p = projet(t.dataset.id);
      const j = p && (p.jalons || {})[t.dataset.j];
      if (!j) return;
      await ecrire(() => S.db.doc("projets/" + p.id).update({ jalons: { [t.dataset.j]: { fait: !j.fait, faitLe: !j.fait ? aujourdhui() : "" } }, ...tampon() }), !j.fait ? "Étape atteinte" : "Étape rouverte");
    },
    "ajout-tache": (t) => ouvrirFormTache(t.dataset.id, null),
    "editer-tache": (t) => ouvrirFormTache(t.dataset.id, t.dataset.t),
    "tache-statut": async (t) => {
      const v = t.dataset.v;
      await ecrire(() => S.db.doc("projets/" + t.dataset.id).update({ taches: { [t.dataset.t]: { statut: v, faiteLe: v === "Fait" ? aujourdhui() : "" } }, ...tampon() }), v === "Fait" ? "Tâche terminée" : `Tâche « ${v} »`);
    },
    "supprimer-tache": (t) => boutonArme(t, "Confirmer", async () => { if (await retirerCle("projets/" + t.dataset.id, "taches", t.dataset.t, "Tâche supprimée")) ouvrirProjet(t.dataset.id, "taches"); }),
    "note-projet": async (t) => {
      const zoneT = $("#pn-texte");
      const texte = zoneT ? zoneT.value.trim() : "";
      if (!texte) { if (zoneT) zoneT.focus(); toast("Écrivez d’abord l’information à publier.", "err"); return; }
      t.disabled = true;
      const nid = "n" + Date.now().toString(36);
      if (await ecrire(() => S.db.doc("projets/" + t.dataset.id).update({ notes: { [nid]: { texte, le: Date.now(), par: S.me.id || null } }, ...tampon() }), "Publié dans le journal") && zoneT) zoneT.value = "";
      t.disabled = false;
    },
    "cotis-projet": (t) => ouvrirFormCotisProjet(t.dataset.id, t.dataset.mid || ""),
    "promesse-projet": (t) => ouvrirFormPromesse(t.dataset.id, t.dataset.mid || ""),
    "depense-projet": (t) => ouvrirFormDepenseProjet(t.dataset.id),
    "collecte-projet": (t) => ouvrirFormCollecte(t.dataset.id),
    "relancer-projet": (t) => {
      const p = projet(t.dataset.id);
      if (!p) return;
      const b = bilanFinP(p);
      const ids = b.cible.liste.filter((m) => { const att = attenduMembreP(b, m.id); const v = b.parM[m.id] || 0; return att ? v < att : !v; }).map((m) => m.id);
      ouvrirCompose({ aud: "manuel", ids, titre: `Relance · projet ${p.titre}`, message: `Bonjour {prenom}, que la grâce de Dieu soit avec toi. Le projet « ${p.titre} » du mouvement ${cfg().nomCourt} avance${b.objectif ? ` : ${pct(b.taux)} de l’objectif est déjà réuni` : ""}. Ta cotisation${b.mt ? ` (${fcfa(b.mt)})` : ""} est attendue${b.f.echeanceCollecte ? ` avant le ${fmtJour(b.f.echeanceCollecte)}` : ""}. Merci pour ta générosité : ensemble, bâtissons !` });
    },
    "ecrire-equipe": (t) => {
      const p = projet(t.dataset.id);
      if (!p) return;
      ouvrirCompose({ aud: "manuel", ids: [...new Set([p.responsableId, ...(p.equipe || [])].filter(Boolean))], titre: `Équipe · ${p.titre}`, message: `Bonjour {prenom}, point d’étape sur le projet « ${p.titre} » : ` });
    },
    "export-projet": (t) => exporterProjet(t.dataset.id),
    "supprimer-projet": (t) => boutonArme(t, "Confirmer la suppression", async () => {
      const p = projet(t.dataset.id);
      if (!p) return;
      const b = S.pret.projetsFin ? bilanFinP(p) : null;
      if (b && (b.vs.length || b.ds.length)) { toast("Ce projet a des cotisations ou des dépenses en caisse : annulez-les d’abord, ou passez le projet en « Abandonné ».", "err"); return; }
      const ok = await ecrire(async () => {
        await S.db.doc("projets/" + p.id).delete();
        if (S.pret.projetsFin && (S.projetsFin || []).some((x) => x.id === p.id)) await S.db.doc("projets_fin/" + p.id).delete();
      }, "Projet supprimé");
      if (ok) fermer();
    }),
    "ptache-filtre": (t) => { S.f.projets.taches = t.dataset.v; render(); },
  });
  Object.assign(A, {
    /* Assistant */
    "ia-suggestion": (t) => envoyerIA(t.dataset.q),
    "ia-stop": () => { if (IA.ctl) IA.ctl.abort(); },
    "ia-nouveau": () => { IA.tours = []; IA.erreur = ""; IA.brouillon = ""; render(); },
    "ia-copier": (t) => { const x = IA.tours[Number(t.dataset.i)]; if (x) copier(sansMarques(x.content)); },
    "ia-annonce": (t) => {
      const x = IA.tours[Number(t.dataset.i)];
      if (!x) return;
      ouvrirFormAnnonce(null);
      const ti = $("#an-titre"), tx = $("#an-texte");
      if (ti) ti.value = premiereLigne(x.content).slice(0, 120);
      if (tx) tx.value = sansMarques(x.content);
    },
    "ia-message": (t) => { const x = IA.tours[Number(t.dataset.i)]; if (x) ouvrirCompose({ aud: "tous", titre: "Message rédigé avec Éliézer", message: sansMarques(x.content) }); },
    "ia-affiche": (t) => {
      const x = IA.tours[Number(t.dataset.i)];
      if (!x) return;
      const lignes = sansMarques(x.content).split(/\n+/).filter((l) => l.trim());
      ouvrirAffiche({ modele: "info", surtitre: "Information", titre: premiereLigne(x.content).slice(0, 70), texte: lignes.slice(1).join("\n").slice(0, 420) });
    },
    /* Affiches */
    "nouvelle-affiche": (t) => { const m = t.dataset.modele || "libre"; ouvrirAffiche({ modele: m, surtitre: m === "anniv" ? "Joyeux anniversaire" : m === "info" ? "Information" : "", theme: m === "anniv" ? "pourpre" : "nuit" }); },
    "affiche-evt": (t) => { const p = presetEvt(t.dataset.id); if (p) ouvrirAffiche(p); },
    "affiche-annonce": (t) => { const a = S.annonces.find((x) => x.id === t.dataset.id); if (a) ouvrirAffiche({ modele: "info", surtitre: "Communiqué", titre: a.titre, texte: a.texte, theme: a.epingle ? "feu" : "nuit" }); },
    "affiche-anniv": (t) => ouvrirAffiche({ modele: "anniv", membreId: t.dataset.id, theme: "pourpre", surtitre: "Joyeux anniversaire" }),
    "voir-affiche": (t) => { const a = (S.affiches || []).find((x) => x.id === t.dataset.id); if (!a) return; const p = {}; for (const k of Object.keys(AFF_VIDE)) if (a[k] != null) p[k] = a[k]; ouvrirAffiche(p, a.id); },
    "supprimer-affiche": (t) => boutonArme(t, "Supprimer ?", () => ecrire(() => S.db.doc("affiches/" + t.dataset.id).delete(), "Affiche supprimée")),
    "aff-dl": () => exporterAffiche("png").catch(() => toast("L’affiche n’a pas pu être préparée.", "err")),
    "aff-pdf": () => exporterAffiche("pdf").catch(() => toast("Le PDF n’a pas pu être préparé.", "err")),
    "aff-partager": () => exporterAffiche("partager").catch(() => toast("L’affiche n’a pas pu être partagée.", "err")),
    "aff-enregistrer": () => enregistrerAffiche(),
    "aff-ia": () => texteAffiche(),
    "aff-image-retirer": () => { AF.img = null; planifierApercu(0); },
  });
  Object.assign(A, {
    /* Matricules */
    "editer-matricule": (t) => ouvrirMatricule(t.dataset.id),
    matricules: () => ouvrirMatricules(),
    "mat-onglet": (t) => { MT.onglet = t.dataset.v; dernier.sheet = null; render(); },
    "mat-enregistrer": () => enregistrerMatricules(),
    "mat-renum": (t) => boutonArme(t, "Confirmer la renumérotation", () => appliquerRenum()),
  });
  Object.assign(A, {
    /* Accueil · Ézéchiel 37 */
    "hero-verset": (t) => { changerVerset(Number(t.dataset.i) || 0); clearInterval(HERO.timer); HERO.timer = 0; initHero(); },
    souffle: () => souffler(),
    "aller-chambre": () => allerA("chambre"),
    "aller-ia": () => allerA("assistant"),
    "aller-sous": (t) => allerA(t.dataset.vueCible, t.dataset.sous),
  });
  Object.assign(A, {
    /* Rappels */
    "rappel-envoye": (t) => { marquerRappel(t.dataset.jour, t.dataset.k); },
    "rappel-voir": (t) => { const g = rappelsDuJour().find((x) => x.id === t.dataset.g); const it = g && g.items[Number(t.dataset.i)]; if (it) { ouvrirTexte(it.titre, it.texte, { wa: it.tel || "", intro: "Relisez et personnalisez le message si besoin." }); marquerRappel(it.jour, it.k); } },
    "rappel-chacun": (t) => { const e = evt(t.dataset.id); if (e) ouvrirCompose({ aud: e.garnisonId ? "garnison" : "tous", val: e.garnisonId || "", modele: "rassemblement", evtId: e.id, titre: `Rappel · ${e.titre}` }); },
    /* Sauvegarde, copie de poche, installation */
    "sauvegarde-excel": (t) => sauvegardeExcel(t),
    "copie-poche": () => copieDePoche(),
    installer: () => ouvrirInstaller(),
    "installer-pwa": async () => { if (!invite) return; invite.prompt(); try { await invite.userChoice; } catch (e) { /* refus */ } invite = null; dernier.sheet = null; render(); },
    "effacer-cache": (t) => boutonArme(t, "Confirmer l’effacement", () => effacerCache()),
    /* Espace soldat */
    espaces: () => ouvrirEspaces(),
    "esp-creer": async (t) => { t.disabled = true; await creerAcces(t.dataset.id); dernier.sheet = null; render(); },
    "esp-creer-tous": async (t) => {
      t.disabled = true;
      const sans = membresActifs().filter((m) => !accesDe(m.id));
      let n = 0;
      for (const m of sans) { if (await creerAcces(m.id, true)) n += 1; t.textContent = `Création… ${n}/${sans.length}`; await sleep(100); }
      toast(`${pluriel(n, "code créé", "codes créés")}`);
      dernier.sheet = null; render();
    },
    "esp-nouveau": (t) => boutonArme(t, "Confirmer le nouveau code", async () => { await creerAcces(t.dataset.id); dernier.sheet = null; render(); }),
    "esp-retirer": (t) => boutonArme(t, "Confirmer le retrait", () => retirerAcces(t.dataset.id)),
    "esp-copier": (t) => { const m = membre(t.dataset.id), a = accesDe(t.dataset.id); if (m && a) ouvrirTexte("Code de l’espace soldat", messageCode(m, a.code), { wa: m.telephone || "", intro: "Message prêt à envoyer au soldat." }); },
    "esp-carte": (t) => telechargerCarteEspace(t.dataset.face),
    "esp-quitter": () => quitterEspace(),
  });

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
    if (ONGLETS.some((o) => o.id === h)) S.vue = h;
    render();
    if (navigator.onLine === false && appliquerCache(null, true)) { S.etat = "pret"; S.horsLigne = true; render(); }
    const c = window.claude;
    if (!c || typeof c.use !== "function") { if (S.horsLigne) return; S.etat = "absent"; render(); return; }
    const sur = (p) => Promise.resolve(p).catch(() => null);
    const [db, user, dl, assets, sample] = await Promise.all([sur(c.use("db")), sur(c.use("user")), sur(c.use("downloads")), sur(c.use("assets")), sur(c.use("sample"))]);
    S.sample = sample;
    if (sample && typeof sample.limits === "function") sample.limits().then((l) => { IA.limites = l; render(); }).catch(() => { IA.limites = null; });
    S.user = user; S.dl = dl; S.assets = assets;
    if (user) {
      try { const me = await user.me(); S.me = { id: me.id || null, name: me.name || "" }; S.estProprio = !!me.isOwner; S.estAdmin = !!me.canEdit || S.estProprio; } catch (e) { /* lecture impossible */ }
      try { S.peutEcrire = await user.can("data.write"); } catch (e) { S.peutEcrire = null; }
      if (S.estAdmin) S.peutEcrire = true;
    }
    if (!db) {
      if (S.horsLigne || (navigator.onLine === false && appliquerCache(null, true))) { S.etat = "pret"; S.horsLigne = true; render(); return; }
      S.etat = "absent"; render(); return;
    }
    S.db = db;
    S.etat = "pret";
    if (!S.horsLigne && appliquerCache(S.me.id, false)) render();
    abonner();
    render();
  }
  demarrer();
})();
