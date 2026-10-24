/* La préférence système reste prioritaire ; aucun stockage n'est indispensable. */
(() => {
  const root = document.documentElement, btn = document.getElementById('btn-motion');
  if (!btn) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem('sde-motion') === 'paused'; } catch (_) {}
  function apply() {
    const reduced = media.matches || paused;
    root.dataset.motion = reduced ? 'reduced' : 'full';
    btn.setAttribute('aria-pressed', String(reduced));
    btn.disabled = media.matches;
    const label = media.matches ? 'Animations réduites selon votre appareil' : reduced ? 'Reprendre les animations' : 'Mettre les animations en pause';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.querySelector('[data-motion-icon]').textContent = reduced ? '▶' : 'Ⅱ';
    document.dispatchEvent(new CustomEvent('sde-motion-change', { detail: { reduced } }));
  }
  btn.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('sde-motion', paused ? 'paused' : 'auto'); } catch (_) {}
    apply();
  });
  if (media.addEventListener) media.addEventListener('change', apply);
  else media.addListener(apply);
  apply();
})();
