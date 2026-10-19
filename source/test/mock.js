// Simulation locale des capacités db / user / downloads / assets (test uniquement, jamais publiée).
(function () {
  const MODE = window.__MODE || "owner";
  const store = new Map();
  window.__store = store;
  const subs = new Set();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const segs = (p) => p.split("/");
  const parent = (p) => segs(p).slice(0, -1).join("/");
  const ADMIN = ["finances", "cotisations", "discipline", "prieres_conf", "suivi", "cotis_speciales", "offrandes", "projets_fin", "acces"];
  const VUE = ["evenements", "config", "annonces", "ressources", "espace"];
  const niveau = MODE === "viewer" ? 0 : MODE === "contrib" ? 1 : 2;
  function lisible(path) { const top = segs(path)[0]; if (niveau === 0) return VUE.includes(top); if (niveau === 1) return !ADMIN.includes(top); return true; }
  function inscriptible(path) { const top = segs(path)[0]; if (niveau === 0) return false; if (top === "config" || top === "espace") return niveau === 2; if (niveau === 1) return !ADMIN.includes(top); return true; }
  function snapDoc(path) {
    const d = lisible(path) ? store.get(path) : undefined;
    return { id: segs(path).pop(), exists: !!d, data: () => (d ? clone(d) : undefined), metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function runQuery(q) {
    let docs = lisible(q.path) ? [...store.keys()].filter((k) => parent(k) === q.path).map(snapDoc) : [];
    if (q.order) { const [f, dir] = q.order; docs.sort((a, b) => { const x = a.data()[f], y = b.data()[f]; if (x === y) return 0; if (x === undefined) return 1; if (y === undefined) return -1; return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1); }); }
    else docs.sort((a, b) => (a.id < b.id ? -1 : 1));
    if (q.lim) docs = docs.slice(0, q.lim);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function notify() { setTimeout(() => subs.forEach((s) => s()), 5); }
  const fail = (code) => { const e = new Error(code); e.code = code; return Promise.reject(e); };
  const merge = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], v); else a[k] = clone(v); } return a; };
  function docRef(path) {
    return {
      id: segs(path).pop(), path,
      get: async () => snapDoc(path),
      set: async (data) => { if (!inscriptible(path)) return fail("invalid_argument"); store.set(path, clone(data)); notify(); },
      update: async (data) => { if (!inscriptible(path)) return fail("invalid_argument"); const cur = store.get(path); if (!cur) return fail("invalid_argument"); store.set(path, merge(cur, data)); notify(); },
      delete: async () => { if (!inscriptible(path)) return fail("invalid_argument"); store.delete(path); notify(); },
      onSnapshot: (next) => { const fn = () => next(snapDoc(path)); subs.add(fn); setTimeout(fn, 20); return () => subs.delete(fn); },
      collection: (sub) => collRef(path + "/" + sub),
      acquire: async () => ({ acquired: true }),
    };
  }
  function query(path, order = null, lim = 0) {
    const q = { path, order, lim };
    return {
      where: () => query(path, order, lim),
      orderBy: (f, dir = "asc") => query(path, [f, dir], lim),
      limit: (n) => query(path, order, n),
      get: async () => runQuery(q),
      onSnapshot: (next) => { const fn = () => next(runQuery(q)); subs.add(fn); setTimeout(fn, 30); return () => subs.delete(fn); },
    };
  }
  let n = 0;
  function collRef(path) {
    return Object.assign(query(path), { path, doc: (id) => docRef(path + "/" + (id || "d" + Date.now().toString(36) + (n++).toString(36))), add: async (data) => { const r = docRef(path + "/d" + (n++)); await r.set(data); return r; } });
  }
  const db = { doc: docRef, collection: collRef };
  const names = { u_owner: "Jérémy GLAZAÏ", u_sec: "Esther KOFFI" };
  const me = MODE === "viewer" ? "u_view" : MODE === "contrib" ? "u_sec" : "u_owner";
  const user = {
    isOwner: async () => MODE === "owner", canEdit: async () => MODE === "owner", can: async () => (MODE === "viewer" ? false : true),
    me: async () => ({ id: me, name: names[me] || "Paul", avatarUrl: "", color: "#888", email: null, isOwner: MODE === "owner", canEdit: MODE === "owner" }),
    id: async () => me,
    profiles: async (ids) => Object.fromEntries([].concat(ids).map((id) => [id, { id, name: names[id] || "", avatarUrl: "", color: "#888", email: null, isMe: id === me, guest: false }])),
  };
  window.__saved = []; window.__files = {};
  const downloads = { save: async (r) => {
    window.__saved.push(r.filename);
    if (r.data instanceof Blob) window.__files[r.filename] = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(r.data); });
    else window.__files[r.filename] = String(r.data);
    return { status: "saved" };
  } };
  let na = 0;
  window.__uploads = [];
  const assets = MODE === "owner" ? { upload: async (b, o) => { const id = "asset" + (na++); window.__uploads.push({ id, type: (o && o.type) || b.type, size: b.size }); return { id, url: URL.createObjectURL(b), sizeBytes: b.size, contentType: b.type }; }, delete: async () => ({ deleted: true }), list: async () => ({ assets: [], usage: {} }) } : null;

  // Données d'essai
  const pad = (x) => String(x).padStart(2, "0");
  const t = new Date();
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const plus = (k) => { const d = new Date(t); d.setDate(d.getDate() + k); return iso(d); };
  const day = (k) => { const d = new Date(t); d.setDate(d.getDate() + k); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const P = ["Pôle 1 · Réveil, Évangélisation & Missions", "Pôle 2 · Impact Social & Humanitaire", "Pôle 3 · Logistique", "Pôle 4 · Communication, Médias & Digital", "Pôle 5 · Formation & Développement Intégral"];
  const gens = [
    ["KOUASSI", "Jean Marc", "H", "0778123456", "Cocody", 0, "Responsable de cellule", "Membre engagé", "g1"],
    ["YAO", "Akissi Grâce", "F", "0505112233", "Yopougon", 1, "", "Membre", "g3"],
    ["TRAORÉ", "Moussa", "H", "0102030405", "Abobo", 2, "Chauffeur", "Membre", "g3"],
    ["N'GUESSAN", "Ruth Emmanuella", "F", "0708091011", "Riviera 2", 3, "Chargée des médias", "Membre engagé", "g1"],
    ["BAMBA", "Fatou", "F", "0545454545", "Marcory", 4, "", "Nouveau venu", ""],
    ["KONÉ", "Ibrahim", "H", "0779797979", "Angré", 0, "Intercesseur", "Membre", "g2"],
    ["DIABATÉ", "Sarah", "F", "", "Cocody", 4, "", "Visiteur", ""],
    ["ASSI", "Jonathan", "H", "0707070707", "Bingerville", 1, "", "Membre", ""],
  ];
  if (MODE !== "empty") {
    gens.forEach((g, i) => store.set("membres/m" + i, { matricule: "SDE-000" + (i + 1), eglise: i % 2 ? "Église MPR" : "Vase d’Honneur Kodesh", nom: g[0], prenoms: g[1], sexe: g[2], telephone: g[3], quartier: g[4], pole: P[g[5]], fonction: g[6], statut: g[7], garnisonId: g[8], anniv: i === 0 ? day(0) : i === 3 ? day(3) : "0" + ((i % 9) + 1) + "-1" + i, annee: i % 2 ? 1990 + i : null, actif: i !== 7, creePar: "u_sec", creeLe: Date.now() - 864e5 * 90 }));
    store.set("garnisons/g1", { nom: "Siège — Cocody 2 Plateaux", type: "Siège", pays: "Côte d’Ivoire", ville: "Abidjan", quartier: "Cocody Deux-Plateaux", jour: "Dimanche", heure: "08:00", lieuReunion: "Église MADEG", responsableId: "m0", statut: "Active" });
    store.set("garnisons/g2", { nom: "Antenne Italie", type: "Antenne", pays: "Italie", statut: "Active", parentId: "g1" });
    store.set("garnisons/g3", { nom: "Cellule de Yopougon", type: "Cellule", pays: "Côte d’Ivoire", ville: "Abidjan", quartier: "Yopougon", jour: "Mercredi", heure: "18:30", parentId: "g1", responsableId: "m1", statut: "Active" });
    const ev = [["Culte d’adoration", "Culte", -28, { m0: true, m1: true, m2: true, m3: true, m4: true, m5: true }, ""], ["Prière et intercession", "Prière et intercession", -21, { m0: true, m3: "retard", m5: true, m1: "excuse" }, ""], ["Réunion de cellule", "Réunion", -17, { m1: true }, "g3"], ["Culte de dimanche", "Culte", -14, { m0: true, m1: true, m3: true, m5: "retard" }, ""], ["Culte d’adoration", "Culte", -7, { m0: true, m1: true, m3: "retard", m5: "retard", m4: "excuse" }, ""], ["Culte de dimanche", "Culte", -3, { m0: true, m1: "retard", m3: true, m5: "retard" }, ""], ["IN FIRE 2026", "Conférence", 14, {}, ""], ["Réunion de cellule", "Réunion", 2, {}, "g3"]];
    ev.forEach((e, i) => store.set("evenements/e" + i, { titre: e[0], type: e[1], date: plus(e[2]), heure: "08:00", fin: "12:30", lieu: "Église MADEG, Cocody Deux-Plateaux", description: "", presents: e[3], visiteurs: 2, nouveaux: 1, garnisonId: e[4] }));
    store.set("formations/f1", { titre: "Soldier’s Academy · Promotion 2026", programme: "Soldier’s Academy", parcours: "Fondations", dateDebut: plus(-30), dateFin: plus(30), formateur: "Jérémy l’Élu", mode: "Présentiel", lieu: "Siège", capacite: 20, modules: [{ id: "a", titre: "L’identité du Soldat", date: plus(-30) }, { id: "b", titre: "Les armes de notre guerre", date: plus(-23) }, { id: "c", titre: "L’intercession prophétique", date: plus(-16) }], participants: { m0: { statut: "Certifié", inscritLe: plus(-31), suivis: { a: true, b: true, c: true }, certifieLe: plus(-1), mention: "Très bien" }, m1: { statut: "Inscrit", inscritLe: plus(-31), suivis: { a: true } }, m3: { statut: "Inscrit", inscritLe: plus(-31), suivis: { a: true, b: true } } } });
    store.set("formations/f2", { titre: "Love School · Session de printemps", programme: "Love School", dateDebut: plus(40), dateFin: plus(70), modules: [], participants: {} });
    store.set("annonces/a1", { titre: "IN FIRE 2026", texte: "Samedi 31 octobre à 8 h, Église MADEG. Invitez vos proches !", epingle: true, creeLe: Date.now() - 864e5, creePar: "u_owner" });
    store.set("annonces/a2", { titre: "Jeûne de consécration", texte: "Trois jours de jeûne et de prière avant la conférence.", creeLe: Date.now() - 864e5 * 2, creePar: "u_sec", expireLe: plus(5) });
    store.set("prieres/p1", { sujet: "Guérison de la maman de Ruth", categorie: "Santé et guérison", pourId: "m3", date: plus(-2), statut: "En prière", urgent: true, priants: { u_owner: Date.now() } });
    store.set("prieres/p2", { sujet: "Réussite aux examens", categorie: "Études", pour: "Les étudiants du mouvement", date: plus(-6), statut: "En prière", priants: {} });
    store.set("prieres/p3", { sujet: "Travail pour Moussa", categorie: "Travail et finances", pourId: "m2", date: plus(-40), statut: "Exaucée", exauceeLe: plus(-3), temoignage: "Moussa a signé son contrat lundi. Gloire à Dieu !", priants: { u_owner: 1, u_sec: 1 } });
    store.set("prieres_conf/c1", { sujet: "Situation familiale délicate", categorie: "Famille", date: plus(-1), statut: "En prière", priants: {} });
    const j = ((t.getDay() + 6) % 7) + 1;
    store.set("chaine/semaine", { creneaux: ["05:00", "12:00", "18:00", "00:00"], affectations: { [`${j}_0500`]: ["m5", "m0"], [`${j}_1800`]: ["m3"], "3_0000": ["m5"] }, sujetSemaine: "Que le feu du réveil embrase IN FIRE 2026", versetSemaine: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d’eux. (Matthieu 18.20)" });
    store.set("ressources/r1", { titre: "Les Lois du Monde Spirituel", type: "livre", auteur: "Jérémy Octave GLAZAÏ", theme: "Doctrine", description: "23 lois spirituelles en quatre axes.", exemplaires: 3, prets: { p1: { membreId: "m1", date: plus(-30), retourPrevu: plus(-2) } } });
    store.set("ressources/r2", { titre: "L’onction et les dons spirituels — enseignement", type: "video", auteur: "Jérémy l’Élu", theme: "Formation", lien: "https://www.youtube.com/watch?v=exemple" });
    store.set("ressources/r3", { titre: "Le Pouvoir de la Femme", type: "livre", auteur: "Jérémy Octave GLAZAÏ", theme: "Famille" });
    store.set("diffusions/d1", { titre: "Convocation des responsables", message: "Bonjour {prenom}, réunion des responsables samedi à 10 h.", audience: { type: "tous", valeur: "", lib: "Tous les membres actifs" }, destinataires: ["m0", "m1", "m3", "m6"], envoyes: { m0: Date.now() - 3600e3 }, creeLe: Date.now() - 864e5 });
    store.set("config/general", { cotisationMensuelle: 2000 });
    if (!window.__V4) {
      store.set("garnisons/p-ci", { nom: "SDE Côte d’Ivoire", type: "Point SDE", pays: "Côte d’Ivoire", ville: "Abidjan", statut: "Active" });
      store.set("garnisons/p-it", { nom: "SDE Italie", type: "Point SDE", pays: "Italie", statut: "Active" });
      store.set("garnisons/p-tn", { nom: "SDE Tunisie", type: "Point SDE", pays: "Tunisie", statut: "En ouverture" });
      store.set("garnisons/p-bf", { nom: "SDE Burkina Faso", type: "Point SDE", pays: "Burkina Faso", statut: "Active" });
      store.set("garnisons/p-ca", { nom: "SDE Canada", type: "Point SDE", pays: "Canada", ville: "Montréal", statut: "Active" });
      store.set("garnisons/p-us", { nom: "SDE États-Unis", type: "Point SDE", pays: "États-Unis", statut: "Active" });
      store.get("garnisons/g1").parentId = "p-ci";
      store.get("garnisons/g2").parentId = "p-it";
      store.get("membres/m7").garnisonId = "p-ca";
      store.get("membres/m6").garnisonId = "p-us";
      store.set("suivi/m2", { membreId: "m2", physique: { n: 1, note: "" }, moral: { n: 3, note: "Découragé depuis la perte de son emploi" }, spirituel: { n: 2, note: "" }, financier: { n: 4, note: "Sans revenu" }, besoin: "Visite pastorale et soutien matériel", prochainSuivi: plus(-1), evalueLe: Date.now() - 864e5 * 10, evaluePar: "u_owner", historique: { [String(Date.now() - 864e5 * 40)]: { date: plus(-40), niveaux: { physique: 1, moral: 2, spirituel: 2, financier: 3 } }, [String(Date.now() - 864e5 * 10)]: { date: plus(-10), niveaux: { physique: 1, moral: 3, spirituel: 2, financier: 4 } } } });
      store.set("cotis_speciales/s1", { titre: "IN FIRE 2026", description: "Organisation de la conférence internationale.", cible: { type: "tous", valeur: "" }, montant: 5000, objectif: 0, debut: plus(-20), echeance: plus(10), statut: "Ouverte", versements: { v1: { membreId: "m0", montant: 5000, date: plus(-5), moyen: "Wave", opId: "x1", opMois: plus(-5).slice(0, 7), annule: false }, v2: { membreId: "m1", montant: 2000, date: plus(-2), moyen: "Espèces", opId: "x2", opMois: plus(-2).slice(0, 7), annule: false } } });
      store.set("offrandes/o1", { type: "Offrande", donateur: "collecte", montant: 45000, date: plus(-3), evenementId: "e5", occasion: "Culte", moyen: "Espèces", categorie: "Offrandes", opId: "y1", opMois: plus(-3).slice(0, 7), annule: false, creeLe: Date.now() - 864e5 * 3 });
      store.set("projets/pj1", { titre: "Construction du siège", categorie: "Construction et aménagement", statut: "En cours", priorite: "Haute", responsableId: "m0", equipe: ["m0", "m3", "m5"], description: "Bâtir un lieu de culte et de formation à Cocody.", objectifs: "Salle de 300 places, bureaux, salle de formation.", dateDebut: plus(-60), dateFin: plus(200), garnisonId: "g1", budget: 3000000,
        lignes: { l1: { libelle: "Gros œuvre", montant: 2000000, ordre: 0 }, l2: { libelle: "Toiture", montant: 1000000, ordre: 1 } },
        jalons: { j1: { titre: "Achat du terrain", date: plus(-30), fait: true, faitLe: plus(-31), ordre: 0 }, j2: { titre: "Fondations", date: plus(-2), fait: false, ordre: 1 }, j3: { titre: "Inauguration", date: plus(200), fait: false, ordre: 2 } },
        taches: { t1: { titre: "Obtenir trois devis de maçonnerie", responsableId: "m3", echeance: plus(-1), statut: "En cours", creeLe: 1 }, t2: { titre: "Permis de construire", responsableId: "m0", echeance: plus(20), statut: "À faire", creeLe: 2 }, t3: { titre: "Bornage du terrain", responsableId: "m5", statut: "Fait", faiteLe: plus(-20), creeLe: 3 } },
        notes: { n1: { texte: "Le terrain est acquis. Gloire à Dieu !", le: Date.now() - 864e5 * 30, par: "u_owner" } }, creeLe: Date.now() - 864e5 * 60, creePar: "u_owner" });
      store.set("projets/pj2", { titre: "Mission Tunisie 2027", categorie: "Mission et évangélisation", statut: "Idée", priorite: "Normale", responsableId: "m5", equipe: ["m5"], creeLe: Date.now() - 864e5 * 5 });
      store.set("projets_fin/pj1", { projetId: "pj1", cible: { type: "tous", valeur: "" }, montantParMembre: 50000, objectifCollecte: 0, echeanceCollecte: plus(60), promesses: { m1: { montant: 100000, date: plus(-10) } },
        versements: { v1: { membreId: "m0", donateur: "membre", montant: 50000, date: plus(-8), moyen: "Wave", opId: "z1", opMois: plus(-8).slice(0, 7), annule: false } },
        depenses: { d1: { libelle: "Frais de géomètre", ligneId: "l1", categorie: "Prestations et honoraires", montant: 120000, date: plus(-20), moyen: "Espèces", opId: "z2", opMois: plus(-20).slice(0, 7), annule: false } } });
      store.set("offrandes/o2", { type: "Dîme", donateur: "membre", membreId: "m3", montant: 15000, date: plus(-7), moyen: "Orange Money", categorie: "Dîmes", opId: "y2", opMois: plus(-7).slice(0, 7), annule: false, creeLe: Date.now() - 864e5 * 7 });
    }
  }
  // Simulation de Claude (sample) : appelle les outils puis répond en flux
  const texteIA = "**Annonce du prochain rassemblement**\n\nBien-aimés, vous êtes attendus au culte de dimanche.\n- Date : dimanche à 8 h\n- Lieu : Église MADEG\n\nQue Dieu vous bénisse !";
  window.__sampleCalls = 0;
  const sample = Object.assign(async (input, opts = {}) => {
    window.__sampleCalls += 1; window.__lastInput = input;
    if (opts.tools) {
      window.__toolNames = opts.tools.map((t) => t.name);
      const ctl = new AbortController();
      const t = opts.tools.find((x) => x.name === "tableau_de_bord"); if (t) window.__toolOut = JSON.parse(JSON.stringify(await t.execute({}, { signal: ctl.signal })));
      const f = opts.tools.find((x) => x.name === "fiche_membre"); if (f) window.__ficheOut = JSON.parse(JSON.stringify(await f.execute({ membre: "Moussa" }, { signal: ctl.signal })));
    }
    for (let k = 25; k < texteIA.length; k += 25) {
      if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "" };
      if (opts.onText) opts.onText({ text: texteIA.slice(0, k), delta: "" });
      await new Promise((r) => setTimeout(r, 60));
    }
    if (opts.onText) opts.onText({ text: texteIA, delta: "" });
    return { text: texteIA, truncated: false, modelTierApplied: "default" };
  }, {
    json: async () => ({ surtitre: "Conférence internationale", titre: "Autre titre", soustitre: "Le feu du réveil sur les nations", texte: "Venez nombreux, invitez vos proches !", verset: "Il arrivera, dans les derniers jours, dit Dieu, que je répandrai de mon Esprit sur toute chair.", reference: "Actes 2.17" }),
    limits: async () => ({ maxPromptBytes: 262144, tools: { maxCount: 10 } }),
  });
  const caps = MODE === "absent" ? null : { db, user, downloads, assets, sample };
  if (caps) window.claude = { use: (name) => new Promise((r) => setTimeout(() => r(caps[name] || null), 60)) };
})();
