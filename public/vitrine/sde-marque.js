/* Ambiance animée partagée : étoiles scintillantes et braises dorées qui montent.
   S'arrête avec « mouvement réduit », la pause (bouton ou body[data-motion=paused]) et quand l'onglet est caché. */
(function () {
  "use strict";
  if (window.__sdeAmbiance) return;
  window.__sdeAmbiance = true;
  var KEY = "sde-motion", GOLD = "212,175,55", PALE = "255,244,214", RED = "214,64,70";
  var mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  var userPaused = stored() === "paused";
  function still() { return (mq && mq.matches) || userPaused || document.body.getAttribute("data-motion") === "paused" || document.documentElement.getAttribute("data-motion") === "reduced"; }
  var canvas = document.createElement("canvas");
  canvas.className = "sde-ambiance"; canvas.setAttribute("aria-hidden", "true");
  var ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;
  document.body.prepend(canvas);
  var W = 0, H = 0, dpr = 1, stars = [], embers = [], raf = 0, last = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build() {
    var n = Math.round(Math.min(W * H / 9000, 160)), m = W < 600 ? 22 : 46;
    stars = []; embers = [];
    for (var i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.random(), r: rnd(.4, 1.3), sp: rnd(.6, 1.6), ph: rnd(0, 6.28), g: i % 6 === 0 });
    for (var j = 0; j < m; j++) embers.push(ember(true));
  }
  function ember(init) { return { x: Math.random(), y: init ? Math.random() : 1.02, v: rnd(.018, .05), r: rnd(.7, 2), dr: rnd(-.02, .02), ph: rnd(0, 6.28), c: Math.random() < .08 ? RED : Math.random() < .5 ? GOLD : PALE }; }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  function draw(now) {
    var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    var calm = still(), t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], tw = calm ? .6 : .5 + .5 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = .1 + .55 * tw * tw;
      ctx.fillStyle = s.g ? "rgb(" + GOLD + ")" : "#cfd8f5";
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
    }
    if (!calm) {
      for (var k = 0; k < embers.length; k++) {
        var e = embers[k];
        e.y -= e.v * dt; e.x += Math.sin(t * .7 + e.ph) * .00012;
        if (e.y < -.02) embers[k] = e = ember(false);
        var life = Math.max(0, Math.min(1, e.y)), a = Math.pow(life, .8) * .75;
        ctx.globalAlpha = a; ctx.fillStyle = "rgb(" + e.c + ")";
        ctx.beginPath(); ctx.arc(e.x * W, e.y * H, e.r * (.5 + life * .7), 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    draw(now);
    if (!still() && document.documentElement.getAttribute("data-theme") !== "light") raf = requestAnimationFrame(loop);
  }
  function wake() { last = 0; if (typeof label === "function") label(); if (!raf) raf = requestAnimationFrame(loop); }
  size();
  window.addEventListener("resize", function () { size(); wake(); });
  document.addEventListener("visibilitychange", wake);
  if (mq && mq.addEventListener) mq.addEventListener("change", wake);
  new MutationObserver(wake).observe(document.body, { attributes: true, attributeFilter: ["data-motion"] });
  new MutationObserver(wake).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
  /* Bouton Animations : même choix de pause que sur le site public. */
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "sde-ambiance-ctl";
  function label() { var p = still(); btn.textContent = p ? "▶ Animations" : "❚❚ Animations"; btn.setAttribute("aria-pressed", String(p)); btn.setAttribute("aria-label", p ? "Reprendre les animations" : "Mettre les animations en pause"); }
  btn.addEventListener("click", function () {
    userPaused = !userPaused;
    try { localStorage.setItem(KEY, userPaused ? "paused" : "on"); } catch (e) {}
    label(); wake();
  });
  label(); document.body.append(btn); wake();
})();
