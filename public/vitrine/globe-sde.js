/* SDE — globe terrestre interactif de la page « Le mouvement ».
   Amélioration progressive : la carte SVG reste en place sans JavaScript ; ce script la remplace
   par un globe en canvas (aucune bibliothèque, aucune requête réseau).
   Les points sont lus dans le HTML existant (.pin), donc le texte reste modifiable à un seul endroit.
   Le contenu lu est inséré avec textContent, jamais avec innerHTML.
   Fond de carte : Natural Earth / johan/world.geo.json (domaine public), réduit à une grille de points de 2°. */
(function () {
  "use strict";

  var host = document.querySelector("#presence .carte-monde");
  if (!host) return;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;

  var MASK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8Af/AAAAAAAAAAAAAAAAAAAAAAAA//////+AAAAAAAADgAAAAAAAAAAAAN//////4AA/AAAAAB8AAAAAAAAAABwAz4f///wAAYAAAEAAPgAAAAAAAAAAPivwAf//wAAAAADgAf/4AHAAAAAAAH8338AP//gAAAAAMBD///8DAAAADwACfw3/gP//gAAA4AMHf//////wAAf////79jwH/+AAAP/gA//////////8P//////h+H/gAAAf/7///////////M///////n8D8A+AB+/P///////////AP/////4g4D4AAAH5/////////////Af/////gHgA4AAAP5///////////PwAHgP///gH0AAAAAH4//////////yMAADQB///8H+AAAAGC5/////////8A8AAAAA////v/gAAAPCj/////////wA4AAAAAf///v/wAAAbv///////////AwAAAAAP/////wAAAH////////////AAAAAAAH////8YAAAD///////////9AAAAAAAD////8EAAAB///////////9AAAAAAAD////+AAAAB//5ff//////4AAAAAAAD////gAAAAf5vwPP//////jAAAAAAAD////AAAAAfif//v/////+CAAAAAAAD///+AAAAAfALf/n////+MCAAAAAAAB///8AAAAAOeRP///////mOAAAAAAAB///8AAAAAH+AA///////E8AAAAAAAAf//wAAAAAf/gB///////hgAAAAAAAAP//gAAAAAf/7////////gAAAAAAAAAP/owAAAAA/////f/////gAAAAAAAAAF/AQAAAAB///+/v/////AAAAAAAAAAC+AAAAAAD/////03////AAAAAAAAAAAeAQAAAAD////f/D///8gAAAAAAAAAAfGEAAAAH////v/B/z/QAAAAAAAAAAAPMBgAAAD////v+A/h+gAAAAAAAAAAAH8AAAAAD////34A+B/AgAAAAAAAAAAAfAAAAAH////3wAcAfggAAAAAAAAAAADAAAAAH////+AAcAfgQAAAAAAAAAAABDwAAAD////9wAMATAYAAAAAAAAAAAA//AAAB/////gAOAQAYAAAAAAAAAAAAH/gAAA/////gACAIAIAAAAAAAAAAAAH/8AAAfH///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAcOAAAAAAAAAAAAAP/+AAAAB//8AAAAc+gAAAAAAAAAAAAP//gAAAD//4AAAAMeggAAAAAAAAAAAP//8AAAB//wAAAAGdg+AAAAAAAAAAAf///AAAA//wAAAACAAPkAAAAAAAAAAP///gAAA//wAAAABwAHwAAAAAAAAAAP///gAAA//wAAAAAAIDYAAAAAAAAAAH///AAAAf/wAAAAAAAAAAAAAAAAAAAH//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//xgAAAAAPxgAAAAAAAAAAA//+AAAA//zgAAAAAf/gAAAAAAAAAAAf/8AAAA//DgAAAAAf/wAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/4AAAAf/DAAAAAH//8AAAAAAAAAAAf/AAAAAf+CAAAAAH//8AAAAAAAAAAA//AAAAAf+AAAAAAH//+AAAAAAAAAAA//AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAH//+AAAAAAAAAAA/8AAAAAHwAAAAAAD4f8AAAAAAAAAAA/wAAAAAAAAAAAAACAH8AAAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB/AAAAAAAAAAAAAAAAAAAGAAAAAAAAB+AAAAAAAAAAAAAAAAAwAMAAAAAAAAB8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAABwAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  var GW = 180, GH = 90;
  var RAD = Math.PI / 180;
  var COORDS = {
    "cote d'ivoire": [5.36, -4.01], "tunisie": [36.81, 10.18], "burkina faso": [12.37, -1.52],
    "italie": [41.9, 12.5], "canada": [46.34, -72.54], "etats-unis": [38.9, -77.04]
  };
  /* position de l'étiquette (t haut, b bas, r droite, l gauche) pour éviter les chevauchements */
  var LABEL = { CI: "b", BF: "r", TN: "r", IT: "t", CA: "t", US: "l" };
  var GOLD = "226,194,106", PALE = "164,182,238";

  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function vec(lat, lon) {
    var cp = Math.cos(lat * RAD);
    return [cp * Math.cos(lon * RAD), cp * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- Points SDE (lus dans le HTML) ---------- */
  var pins = [];
  Array.prototype.forEach.call(host.querySelectorAll(".pin"), function (g) {
    var nom = g.getAttribute("data-pays") || "";
    var c = COORDS[norm(nom)];
    if (!c) return;
    var tag = g.getAttribute("data-tag") || "";
    pins.push({
      nom: nom, info: g.getAttribute("data-info") || "", tag: tag, contact: g.getAttribute("data-tel") || "",
      code: (g.querySelector("text") || {}).textContent || nom.slice(0, 2).toUpperCase(),
      lat: c[0], lon: c[1], v: vec(c[0], c[1]), siege: /si[eè]ge/i.test(tag), sx: 0, sy: 0, vis: false
    });
  });
  if (pins.length < 2) return;
  var hq = 0;
  pins.forEach(function (p, i) { if (p.siege) hq = i; });

  /* ---------- Fond de carte : grille de points ---------- */
  var bin = atob(MASK), land = [];
  for (var i = 0; i < GW * GH; i++) {
    if ((bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) {
      var lat = 90 - (Math.floor(i / GW) + 0.5) * 2, lon = -180 + ((i % GW) + 0.5) * 2;
      var v = vec(lat, lon), zone = false;
      for (var k = 0; k < pins.length; k++) {
        var d = v[0] * pins[k].v[0] + v[1] * pins[k].v[1] + v[2] * pins[k].v[2];
        if (d > Math.cos(4.2 * RAD)) { zone = true; break; }
      }
      /* « scintillement » déterministe : phase et vitesse propres à chaque point */
      var h = Math.sin(i * 12.9898) * 43758.5453; h -= Math.floor(h);
      land.push({ x: v[0], y: v[1], z: v[2], zone: zone, ph: h * 6.283, sp: 0.8 + h * 2.4, star: h > 0.93 });
    }
  }

  /* ---------- Arcs reliant chaque point au siège ---------- */
  var ARC_N = 56;
  var arcs = [];
  pins.forEach(function (p, idx) {
    if (idx === hq) return;
    var a = pins[hq].v, b = p.v;
    var dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    var om = Math.acos(dot), so = Math.sin(om), pts = [];
    var lift = 0.06 + 0.2 * (om / Math.PI);
    for (var s = 0; s <= ARC_N; s++) {
      var t = s / ARC_N;
      var f1 = so ? Math.sin((1 - t) * om) / so : 1 - t, f2 = so ? Math.sin(t * om) / so : t;
      var alt = 1 + lift * Math.sin(Math.PI * t);
      pts.push([(f1 * a[0] + f2 * b[0]) * alt, (f1 * a[1] + f2 * b[1]) * alt, (f1 * a[2] + f2 * b[2]) * alt]);
    }
    arcs.push({ pin: idx, pts: pts, off: (idx * 0.37) % 1, speed: 0.00014 + 0.00004 * (idx % 3) });
  });

  /* ---------- Interface ---------- */
  var box = document.createElement("div");
  box.className = "globe-sde";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Globe terrestre interactif : " + pins.length + " points SDE reliés au siège d'" + (pins[hq].info.split("·")[1] || "Abidjan").trim().split(",")[0] + ". Les points sont aussi listés sous la carte.");
  box.appendChild(canvas);

  var info = document.createElement("div");
  info.className = "globe-info";
  info.hidden = true;
  box.appendChild(info);

  var aide = document.createElement("p");
  aide.className = "globe-aide";
  aide.textContent = "Faites glisser pour tourner · touchez un point";
  box.appendChild(aide);

  var ctl = document.createElement("div");
  ctl.className = "globe-ctl";
  function bouton(label, texte) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", label); b.title = label; b.textContent = texte;
    ctl.appendChild(b); return b;
  }
  var bPause = bouton("Mettre la rotation en pause", "❚❚");
  var bHome = bouton("Recentrer le globe", "◎");
  box.appendChild(ctl);

  var live = document.createElement("p");
  live.className = "globe-live"; live.setAttribute("aria-live", "polite");
  box.appendChild(live);

  host.insertBefore(box, host.firstChild);
  host.classList.add("globe-actif");

  /* ---------- État ---------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var paused = !!reduced;
  var bodyPaused = function () { return document.body && document.body.getAttribute("data-motion") === "paused"; };
  var W = 0, H = 0, dpr = 1;
  var lon0 = -30 + 160, lat0 = 18, tLon = -30, tLat = 18;     /* introduction : le globe arrive en tournant */
  var dir = -1, vLon = 0, vLat = 0, dragging = false, lastX = 0, lastY = 0, lastMove = 0;
  var sel = -1, hover = -1, visible = true, running = false, intro = 0, t0 = 0, userTouched = 0;
  var stars = [];
  for (var q = 0; q < 90; q++) {
    var hh = Math.sin((q + 1) * 78.233) * 43758.5453; hh -= Math.floor(hh);
    var h2 = Math.sin((q + 1) * 39.346) * 24634.6345; h2 -= Math.floor(h2);
    stars.push({ x: hh, y: h2, r: 0.4 + hh * 1.1, ph: h2 * 6.283, sp: 0.6 + hh * 2 });
  }

  function size() {
    var r = box.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(200, r.width); H = Math.max(200, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }

  /* ---------- Projection ---------- */
  var cl = 1, sl = 0, cpp = 1, spp = 0, R = 100, cx = 0, cy = 0;
  function prepare() {
    cl = Math.cos(lon0 * RAD); sl = Math.sin(lon0 * RAD);
    cpp = Math.cos(lat0 * RAD); spp = Math.sin(lat0 * RAD);
    R = Math.min(W, H) * 0.405; cx = W / 2; cy = H / 2;
  }
  /* renvoie [x, y, profondeur] ; la profondeur > 0 = face visible */
  function proj(X, Y, Z, out) {
    var x1 = X * cl + Y * sl, y1 = -X * sl + Y * cl;
    var dep = x1 * cpp + Z * spp, up = -x1 * spp + Z * cpp;
    out[0] = cx + R * y1; out[1] = cy - R * up; out[2] = dep;
    out[3] = y1 * y1 + up * up;
    return out;
  }
  var o = [0, 0, 0, 0], o2 = [0, 0, 0, 0];

  /* ---------- Dessin ---------- */
  function dimmed(i) { var f = sel >= 0 ? sel : hover; return f >= 0 && f !== i && f !== hq; }
  function draw(now) {
    var t = now - t0, still = reduced || paused || bodyPaused();
    prepare();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* étoiles scintillantes */
    var i, p, tw;
    for (i = 0; i < stars.length; i++) {
      p = stars[i];
      tw = still ? 0.6 : 0.5 + 0.5 * Math.sin(t * 0.0016 * p.sp + p.ph);
      ctx.globalAlpha = 0.15 + 0.7 * tw * tw;
      ctx.fillStyle = i % 5 === 0 ? "rgb(" + GOLD + ")" : "#cfd8f5";
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* halo atmosphérique */
    var g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.32);
    g.addColorStop(0, "rgba(226,194,106,.34)"); g.addColorStop(0.35, "rgba(120,96,200,.16)"); g.addColorStop(1, "rgba(20,30,70,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.32, 0, 6.283); ctx.fill();

    /* sphère */
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#1d3160"); g.addColorStop(0.6, "#0e1a38"); g.addColorStop(1, "#070c1c");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(226,194,106,.5)"; ctx.lineWidth = 1; ctx.stroke();

    /* méridiens et parallèles */
    ctx.lineWidth = 0.6; ctx.strokeStyle = "rgba(164,182,238,.11)";
    var la, lo, st, started;
    for (lo = -180; lo < 180; lo += 30) {
      started = false; ctx.beginPath();
      for (la = -88; la <= 88; la += 4) {
        var vv = vec(la, lo); proj(vv[0], vv[1], vv[2], o);
        if (o[2] > 0) { if (!started) { ctx.moveTo(o[0], o[1]); started = true; } else ctx.lineTo(o[0], o[1]); } else started = false;
      }
      ctx.stroke();
    }
    for (la = -60; la <= 60; la += 30) {
      started = false; ctx.beginPath();
      for (lo = -180; lo <= 180; lo += 6) {
        var v2 = vec(la, lo); proj(v2[0], v2[1], v2[2], o);
        if (o[2] > 0) { if (!started) { ctx.moveTo(o[0], o[1]); started = true; } else ctx.lineTo(o[0], o[1]); } else started = false;
      }
      ctx.stroke();
    }

    /* continents en points qui scintillent */
    var unit = R / 88;
    for (i = 0; i < land.length; i++) {
      p = land[i];
      proj(p.x, p.y, p.z, o);
      var dep = o[2];
      if (dep <= 0.03) continue;
      var limb = Math.sqrt(dep);
      var f = still ? 1 : 0.86 + 0.14 * Math.sin(t * 0.0011 * p.sp + p.ph);
      var a = (p.zone ? 0.95 : 0.3 + 0.5 * limb) * f;
      var sz = unit * (0.85 + 0.55 * limb) * (p.zone ? 1.25 : 1);
      var glint = 0;
      if (p.star && !still) {
        glint = Math.pow(0.5 + 0.5 * Math.sin(t * 0.0021 * p.sp + p.ph * 3), 14);
        a = Math.min(1, a + glint * 0.8); sz *= 1 + glint * 0.5;
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.zone || glint > 0.35 ? "rgb(" + GOLD + ")" : "rgb(" + PALE + ")";
      ctx.fillRect(o[0] - sz / 2, o[1] - sz / 2, sz, sz);
      if (glint > 0.45) {
        ctx.globalAlpha = glint * 0.8; ctx.fillStyle = "#fff6d4";
        var arm = Math.min(5, sz * 2);
        ctx.fillRect(o[0] - arm, o[1] - 0.4, arm * 2, 0.8);
        ctx.fillRect(o[0] - 0.4, o[1] - arm, 0.8, arm * 2);
      }
    }
    ctx.globalAlpha = 1;

    /* ondes émises par le siège */
    var hp = pins[hq];
    if (!still) {
      for (var w = 0; w < 2; w++) {
        var ph = ((t * 0.00033) + w * 0.5) % 1, rho = ph * 0.42;
        var cs = Math.cos(rho), sn = Math.sin(rho), lat1 = hp.lat * RAD, lon1 = hp.lon * RAD;
        ctx.strokeStyle = "rgba(" + GOLD + "," + (0.55 * (1 - ph)).toFixed(3) + ")"; ctx.lineWidth = 1.4; ctx.beginPath();
        started = false;
        for (var th = 0; th <= 6.35; th += 0.2) {
          var lat2 = Math.asin(Math.sin(lat1) * cs + Math.cos(lat1) * sn * Math.cos(th));
          var lon2 = lon1 + Math.atan2(Math.sin(th) * sn * Math.cos(lat1), cs - Math.sin(lat1) * Math.sin(lat2));
          var c2 = Math.cos(lat2); proj(c2 * Math.cos(lon2), c2 * Math.sin(lon2), Math.sin(lat2), o);
          if (o[2] > 0) { if (!started) { ctx.moveTo(o[0], o[1]); started = true; } else ctx.lineTo(o[0], o[1]); } else started = false;
        }
        ctx.stroke();
      }
    }

    /* arcs lumineux et comètes */
    var focus = sel >= 0 ? sel : hover;
    for (var ai = 0; ai < arcs.length; ai++) {
      var arc = arcs[ai], on = focus === arc.pin || focus === hq, dim = focus >= 0 && !on;
      var base = dim ? 0.12 : on ? 0.95 : 0.55;
      var prev = null;
      for (var s = 0; s <= ARC_N; s++) {
        var pt = arc.pts[s]; proj(pt[0], pt[1], pt[2], o);
        var vis = o[2] > 0 || o[3] > 1;
        if (prev && vis && prev[2]) {
          var env = Math.sin(Math.PI * s / ARC_N);
          ctx.strokeStyle = "rgba(" + GOLD + "," + (base * (0.25 + 0.75 * env)).toFixed(3) + ")";
          ctx.lineWidth = (on ? 2.3 : 1.4) * (0.6 + 0.4 * env);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(o[0], o[1]); ctx.stroke();
        }
        prev = [o[0], o[1], vis];
      }
      var prog = still ? 0.5 : ((t * arc.speed * (on ? 2.2 : 1)) + arc.off) % 1;
      for (var tr = 9; tr >= 0; tr--) {
        var idx = Math.floor((prog - tr * 0.012 + 1) % 1 * ARC_N), cp2 = arc.pts[clamp(idx, 0, ARC_N)];
        proj(cp2[0], cp2[1], cp2[2], o2);
        if (!(o2[2] > 0 || o2[3] > 1)) continue;
        var k = 1 - tr / 10;
        ctx.globalAlpha = (dim ? 0.2 : 1) * k * k;
        if (tr === 0) {
          var gg = ctx.createRadialGradient(o2[0], o2[1], 0, o2[0], o2[1], 11);
          gg.addColorStop(0, "rgba(255,244,205,.95)"); gg.addColorStop(0.3, "rgba(" + GOLD + ",.5)"); gg.addColorStop(1, "rgba(" + GOLD + ",0)");
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(o2[0], o2[1], 11, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = tr === 0 ? "#fff6d4" : "rgb(" + GOLD + ")";
        ctx.beginPath(); ctx.arc(o2[0], o2[1], tr === 0 ? 2.4 : 1.6 * k + 0.4, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* points SDE */
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    for (i = 0; i < pins.length; i++) {
      p = pins[i]; proj(p.v[0], p.v[1], p.v[2], o);
      p.sx = o[0]; p.sy = o[1]; p.vis = o[2] > 0.06;
      if (!p.vis) continue;
      /* braises : s'élèvent de chaque point (le siège en émet le plus) ; sans état, calculées depuis le temps */
      if (!still) {
        var nb = p.siege ? (W < 520 ? 8 : 15) : (W < 520 ? 3 : 6), rise = R * (p.siege ? 0.42 : 0.26);
        for (var e = 0; e < nb; e++) {
          var pe = ((t * (0.00018 + (e % 3) * 0.00005)) + e / nb + i * 0.137) % 1;
          var ex = p.sx + Math.sin(e * 12.9898 + i * 4.1) * (4 + pe * 16) + Math.sin(pe * 6 + e) * 2.5;
          var ey = p.sy - 4 - pe * rise;
          var ra = Math.pow(1 - pe, 1.5) * (dimmed(i) ? 0.35 : 0.95);
          ctx.globalAlpha = ra;
          ctx.fillStyle = e % 9 === 4 && pe < 0.4 ? "rgb(214,64,70)" : e % 2 ? "rgb(" + GOLD + ")" : "#fff1c2";
          ctx.beginPath(); ctx.arc(ex, ey, 0.7 + (1 - pe) * (p.siege ? 1.9 : 1.4), 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      var act = i === sel || i === hover, rr = (p.siege ? 6.5 : 4.6) + (act ? 2 : 0);
      var cyc = still ? 0.4 : ((t * 0.0007) + i * 0.17) % 1;
      ctx.strokeStyle = "rgba(" + GOLD + "," + (0.7 * (1 - cyc)).toFixed(3) + ")"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, rr + cyc * (p.siege ? 24 : 17), 0, 6.283); ctx.stroke();
      var glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, rr * 3.2);
      glow.addColorStop(0, "rgba(" + GOLD + ",.6)"); glow.addColorStop(1, "rgba(" + GOLD + ",0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.sx, p.sy, rr * 3.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = p.siege ? "#fff1c2" : "rgb(" + GOLD + ")";
      ctx.strokeStyle = "#0a1224"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, rr, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.font = "700 " + (act ? 14 : 12) + "px 'Saira Condensed', 'Arial Narrow', sans-serif";
      var lp = LABEL[p.code] || "t", lx = p.sx, ly = p.sy - rr - 7;
      if (lp === "b") ly = p.sy + rr + 15; else if (lp === "r") { lx = p.sx + rr + 7; ly = p.sy + 4; ctx.textAlign = "left"; } else if (lp === "l") { lx = p.sx - rr - 7; ly = p.sy + 4; ctx.textAlign = "right"; }
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(7,12,28,.9)"; ctx.strokeText(p.code, lx, ly);
      ctx.fillStyle = "#fff"; ctx.fillText(p.code, lx, ly); ctx.textAlign = "center";
    }
    placeInfo();
  }

  /* ---------- Fiche d'un point ---------- */
  function contactNode(c) {
    if (!c) return null;
    var a = document.createElement("a");
    if (c.indexOf("@") > -1) a.href = "mailto:" + c;
    else if (/^[+\d\s().-]{7,}$/.test(c)) a.href = "tel:" + c.replace(/[^\d+]/g, "");
    else { var s = document.createElement("span"); s.textContent = c; return s; }
    a.textContent = c; return a;
  }
  function showInfo(i) {
    var p = pins[i];
    info.textContent = "";
    var b = document.createElement("b"); b.textContent = p.nom; info.appendChild(b);
    var m = document.createElement("small"); m.textContent = p.info; info.appendChild(m);
    var tg = document.createElement("span"); tg.className = "globe-tag"; tg.textContent = p.tag; info.appendChild(tg);
    var cn = contactNode(p.contact);
    if (cn) { var wrap = document.createElement("span"); wrap.className = "globe-contact"; wrap.appendChild(cn); info.appendChild(wrap); }
    info.hidden = false;
    live.textContent = p.nom + " : " + p.info + ", " + p.tag;
  }
  function placeInfo() {
    var i = sel >= 0 ? sel : hover;
    if (i < 0 || !pins[i].vis) { if (!info.hidden && i < 0) info.hidden = true; if (i >= 0) info.style.opacity = "0"; return; }
    var iw = info.offsetWidth || 220, ih = info.offsetHeight || 90;
    var x = clamp(pins[i].sx, iw / 2 + 8, W - iw / 2 - 8);
    var below = pins[i].sy - ih - 26 < 6;
    info.style.left = x + "px";
    info.style.top = (below ? pins[i].sy + 22 : pins[i].sy - 18) + "px";
    info.style.transform = below ? "translate(-50%,0)" : "translate(-50%,-100%)";
    info.style.opacity = "1";
  }

  /* ---------- Sélection ---------- */
  function select(i, fromList) {
    sel = i; userTouched = performance.now();
    if (i < 0) { info.hidden = true; live.textContent = ""; highlightList(-1); wake(); return; }
    tLon = pins[i].lon; tLat = clamp(pins[i].lat * 0.8 + 6, 8, 40);
    vLon = vLat = 0; showInfo(i); highlightList(i); aide.classList.add("cache");
    if (fromList && host.getBoundingClientRect) {
      var r = box.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) box.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }
    wake();
  }
  function reset() { sel = -1; info.hidden = true; live.textContent = ""; highlightList(-1); tLon = -30; tLat = 18; vLon = vLat = 0; userTouched = 0; wake(); }

  var cards = Array.prototype.slice.call(document.querySelectorAll("#presence .points .point"));
  function highlightList(i) { cards.forEach(function (c, k) { c.classList.toggle("point-actif", k === i); }); }
  cards.forEach(function (c, k) {
    if (k >= pins.length) return;
    c.classList.add("point-interactif"); c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
    c.addEventListener("click", function () { select(sel === k ? -1 : k, true); });
    c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(sel === k ? -1 : k, true); } });
  });

  /* ---------- Interactions ---------- */
  function pick(x, y) {
    var best = -1, bd = 22 * 22;
    pins.forEach(function (p, i) {
      if (!p.vis) return;
      var d = (p.sx - x) * (p.sx - x) + (p.sy - y) * (p.sy - y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  var downX = 0, downY = 0, moved = 0;
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0; lastX = downX = e.clientX; lastY = downY = e.clientY; lastMove = performance.now(); vLon = vLat = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
    canvas.classList.add("saisi"); aide.classList.add("cache"); wake();
  });
  canvas.addEventListener("pointermove", function (e) {
    var l = local(e);
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY, n = performance.now(), dt = Math.max(1, n - lastMove);
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 5) { lon0 -= dx * 0.32; lat0 = clamp(lat0 + dy * 0.28, -55, 65); tLon = lon0; tLat = lat0; vLon = -dx * 0.32 / dt * 16; vLat = dy * 0.28 / dt * 16; if (sel >= 0 && moved > 12) { sel = -1; info.hidden = true; highlightList(-1); } }
      lastX = e.clientX; lastY = e.clientY; lastMove = n; userTouched = n; wake();
    } else {
      var h = pick(l[0], l[1]);
      if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? "pointer" : ""; if (h >= 0 && sel < 0) showInfo(h); else if (h < 0 && sel < 0) info.hidden = true; wake(); }
    }
  });
  function lacher(e) {
    if (!dragging) return;
    dragging = false; canvas.classList.remove("saisi");
    if (moved <= 5) { var l = local(e), h = pick(l[0], l[1]); select(h >= 0 ? (h === sel ? -1 : h) : -1); }
    userTouched = performance.now(); wake();
  }
  canvas.addEventListener("pointerup", lacher);
  canvas.addEventListener("pointercancel", function () { dragging = false; canvas.classList.remove("saisi"); });
  canvas.addEventListener("pointerleave", function () { if (!dragging && hover >= 0) { hover = -1; if (sel < 0) info.hidden = true; wake(); } });
  box.addEventListener("keydown", function (e) {
    if (e.key === "Escape") reset();
    else if (e.key === "ArrowLeft") { lon0 += 8; tLon = lon0; wake(); }
    else if (e.key === "ArrowRight") { lon0 -= 8; tLon = lon0; wake(); }
  });
  bPause.addEventListener("click", function () {
    paused = !paused; bPause.textContent = paused ? "▶" : "❚❚";
    bPause.setAttribute("aria-label", paused ? "Reprendre la rotation" : "Mettre la rotation en pause");
    bPause.title = bPause.getAttribute("aria-label"); bPause.setAttribute("aria-pressed", paused ? "true" : "false"); wake();
  });
  bHome.addEventListener("click", reset);

  /* ---------- Boucle d'animation ---------- */
  function animated() { return !(reduced || paused || bodyPaused()); }
  function step(now, dt) {
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2600);
      lon0 = tLon + (1 - ease(intro)) * 160 * (sel >= 0 ? 0 : 1);
      if (sel < 0 && !dragging) { /* l'arrivée se termine sur la vue d'ensemble */ }
    }
    if (!dragging) {
      if (Math.abs(vLon) > 0.01 || Math.abs(vLat) > 0.01) {
        lon0 += vLon; lat0 = clamp(lat0 + vLat, -55, 65); vLon *= 0.94; vLat *= 0.94; tLon = lon0; tLat = lat0;
      } else if (sel >= 0) {
        var dl = ((tLon - lon0 + 540) % 360) - 180;
        lon0 += dl * Math.min(1, dt * 0.007); lat0 += (tLat - lat0) * Math.min(1, dt * 0.007);
      } else if (animated() && intro >= 1 && now - userTouched > 3000) {
        if (lon0 > 25) dir = -1; else if (lon0 < -85) dir = 1;
        lon0 += dir * dt * 0.0042; tLon = lon0;
        lat0 += (18 - lat0) * Math.min(1, dt * 0.0012); tLat = lat0;
      } else if (intro >= 1 && !animated() && Math.abs(tLon - lon0) > 0.05) {
        lon0 += (((tLon - lon0 + 540) % 360) - 180) * Math.min(1, dt * 0.007); lat0 += (tLat - lat0) * Math.min(1, dt * 0.007);
      }
    }
  }
  var last = 0;
  function loop(now) {
    running = false;
    if (!visible || document.hidden) return;
    var dt = Math.min(60, last ? now - last : 16); last = now;
    if (!t0) t0 = now;
    if (reduced && intro < 1) { intro = 1; lon0 = tLon; lat0 = tLat; }
    step(now, dt); draw(now);
    var busy = animated() || dragging || intro < 1 || Math.abs(vLon) > 0.01 || Math.abs(vLat) > 0.01 ||
      (sel >= 0 && (Math.abs(((tLon - lon0 + 540) % 360) - 180) > 0.05 || Math.abs(tLat - lat0) > 0.05)) ||
      (!animated() && Math.abs(((tLon - lon0 + 540) % 360) - 180) > 0.05);
    if (busy) schedule(); else last = 0;
  }
  function schedule() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function wake() { schedule(); }

  size();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { last = 0; wake(); } }).observe(box);
  }
  if ("ResizeObserver" in window) new ResizeObserver(function () { size(); wake(); }).observe(box);
  else window.addEventListener("resize", function () { size(); wake(); });
  document.addEventListener("visibilitychange", function () { last = 0; wake(); });
  if ("MutationObserver" in window && document.body) new MutationObserver(wake).observe(document.body, { attributes: true, attributeFilter: ["data-motion"] });
  if (reduced) { intro = 1; lon0 = tLon; lat0 = tLat; bPause.textContent = "▶"; bPause.setAttribute("aria-pressed", "true"); bPause.setAttribute("aria-label", "Reprendre la rotation"); bPause.title = "Reprendre la rotation"; }
  wake();
})();
