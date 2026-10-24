/* Navigation de la vitrine : disclosures, clavier et panneau mobile. */
(() => {
  const header = document.getElementById('entete');
  const nav = document.getElementById('nav-principal');
  const burger = document.getElementById('burger');
  if (!header || !nav || !burger) return;
  const mobile = matchMedia('(max-width: 1024px)');
  const groups = [...nav.querySelectorAll('[data-rubrique]')];
  let previousOverflow = '', background = [];
  const isOpen = () => nav.classList.contains('ouvert');
  function closeGroups() {
    groups.forEach(group => {
      group.classList.remove('ouvert');
      group.querySelector('button').setAttribute('aria-expanded', 'false');
    });
  }
  function setGroup(group, open) {
    closeGroups();
    if (open) {
      group.classList.add('ouvert');
      group.querySelector('button').setAttribute('aria-expanded', 'true');
    }
  }
  function setPanel(open, restoreFocus = false) {
    open = open && mobile.matches;
    if (open === isOpen()) return;
    nav.classList.toggle('ouvert', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-ouvert', open);
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      background = [...document.body.children].filter(el => el !== header && !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName)).map(el => [el, Boolean(el.inert)]);
      background.forEach(([el]) => { el.inert = true; });
      nav.querySelector('a, button')?.focus();
    } else {
      document.body.style.overflow = previousOverflow;
      background.forEach(([el, wasInert]) => { el.inert = wasInert; });
      background = [];
      closeGroups();
      if (restoreFocus) burger.focus();
    }
  }
  groups.forEach((group, i) => {
    const btn = group.querySelector('button'), panel = group.querySelector('.mega-menu');
    if (!panel.id) panel.id = 'navigation-rubrique-' + i;
    btn.setAttribute('aria-controls', panel.id);
    btn.removeAttribute('aria-haspopup');
    btn.addEventListener('click', () => setGroup(group, !group.classList.contains('ouvert')));
    group.addEventListener('focusout', e => {
      if (!mobile.matches && !group.contains(e.relatedTarget)) setGroup(group, false);
    });
  });
  burger.addEventListener('click', () => setPanel(!isOpen(), true));
  header.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    setPanel(false);
    closeGroups();
    if (link.dataset.objet) {
      const select = document.getElementById('f-objet');
      if (select && [...select.options].some(option => option.value === link.dataset.objet)) select.value = link.dataset.objet;
    }
    if (link.hash && link.origin === location.origin && link.pathname === location.pathname) {
      const target = document.getElementById(link.hash.slice(1));
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  });
  document.addEventListener('click', e => { if (!header.contains(e.target)) closeGroups(); });
  header.addEventListener('keydown', e => {
    const group = e.target.closest('[data-rubrique]');
    if (e.key === 'Escape') {
      if (group?.classList.contains('ouvert')) {
        e.preventDefault(); setGroup(group, false); group.querySelector('button').focus();
      } else if (isOpen()) { e.preventDefault(); setPanel(false, true); }
      return;
    }
    if (group && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      const links = [...group.querySelectorAll('.mega-menu a')];
      if (!links.length) return;
      e.preventDefault();
      setGroup(group, true);
      const index = links.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1 : e.key === 'ArrowDown' ? (index + 1) % links.length : (index <= 0 ? links.length - 1 : index - 1);
      links[next].focus();
    }
    if (e.key === 'Tab' && mobile.matches && isOpen()) {
      const visible = el => {
        for (let node = el; node && node !== header; node = node.parentElement) {
          const css = getComputedStyle(node);
          if (node.hidden || css.display === 'none' || css.visibility === 'hidden') return false;
        }
        return !el.disabled && el.tabIndex >= 0;
      };
      const items = [...header.querySelectorAll('a[href], button, [tabindex]')].filter(visible);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const resized = () => { if (!mobile.matches) setPanel(false); };
  if (mobile.addEventListener) mobile.addEventListener('change', resized);
  else mobile.addListener(resized);
})();
