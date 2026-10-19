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
