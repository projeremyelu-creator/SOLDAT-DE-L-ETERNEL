import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const html = readFileSync('public/vitrine/index.html', 'utf8');
function page(mobile = true, systemReduced = false, blockedStorage = false) {
  const dom = new JSDOM(html, { url: 'https://mouvement-sde.org/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const queries = new Map();
  // jsdom has no responsive layout engine: align CSS visibility with the media fixture.
  if (mobile) { const style = w.document.createElement("style"); style.textContent = ".burger { display: flex !important; }"; w.document.head.append(style); }
  w.matchMedia = query => {
    if (!queries.has(query)) queries.set(query, { matches: query.includes('1024') ? mobile : systemReduced, listeners: [], addEventListener(_, fn) { this.listeners.push(fn); }, addListener(fn) { this.listeners.push(fn); } });
    return queries.get(query);
  };
  if (blockedStorage) Object.defineProperty(w, 'localStorage', { get() { throw new Error('storage unavailable'); } });
  const navPath = 'public/vitrine/navigation.js';
  const navCode = readFileSync(navPath, 'utf8');
  w.eval(navCode);
  const motionPath = 'public/vitrine/motion.js';
  w.eval(readFileSync(motionPath, 'utf8'));
  return { w, d: w.document, queries, close: () => w.close() };
}
const click = (p, sel) => { const el = p.d.querySelector(sel); assert.ok(el, `missing ${sel}`); el.click(); return el; };
test('mobile: lock background, expose member link, Escape closes and restores burger focus', () => {
  const p = page();
  const burger = click(p, '#burger');
  assert.equal(p.d.body.style.overflow, 'hidden');
  assert.ok(p.d.querySelector('#nav-principal a[href="/connexion"]'));
  assert.equal(p.d.querySelector('main').inert, true);
  p.d.activeElement.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(burger.getAttribute('aria-expanded'), 'false');
  assert.equal(burger.getAttribute('aria-label'), 'Ouvrir le menu');
  assert.equal(p.d.activeElement, burger);
  assert.equal(p.d.body.style.overflow, '');
  assert.equal(p.d.querySelector('main').inert, false);
  p.close();
});
test('desktop: ArrowDown opens submenu, Escape returns focus to trigger', () => {
  const p = page(false);
  const btn = p.d.querySelector('[data-rubrique] > button'); btn.focus();
  btn.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(p.d.activeElement, btn.parentElement.querySelector('a'));
  p.d.activeElement.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(p.d.activeElement, btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.ok(p.d.getElementById(btn.getAttribute('aria-controls')));
  p.close();
});
test('resizing to desktop releases background and restores previous inert state', () => {
  const p = page(); click(p, '#burger');
  const media = p.queries.get('(max-width: 1024px)'); media.matches = false; media.listeners.forEach(fn => fn(media));
  assert.equal(p.d.body.style.overflow, '');
  assert.equal(p.d.querySelector('main').inert, false);
  assert.equal(p.d.querySelector('#burger').getAttribute('aria-expanded'), 'false');
  p.close();
});
test('following a mobile section link closes menu and focuses its destination', () => {
  const p = page(); click(p, '#burger'); click(p, '[data-rubrique] > button');
  click(p, '#nav-principal a[href="#histoire"]');
  assert.equal(p.d.body.style.overflow, '');
  assert.equal(p.d.activeElement.id, 'histoire');
  assert.equal(p.d.querySelector('#burger').getAttribute('aria-label'), 'Ouvrir le menu');
  p.close();
});
test('pause is announced, saved and broadcast; can resume without page reload', () => {
  const p = page(); const events = [];
  p.d.addEventListener('sde-motion-change', e => events.push(e.detail.reduced));
  const btn = click(p, '#btn-motion');
  assert.equal(p.d.documentElement.dataset.motion, 'reduced');
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  assert.equal(p.w.localStorage.getItem('sde-motion'), 'paused');
  btn.click();
  assert.equal(p.d.documentElement.dataset.motion, 'full');
  assert.deepEqual(events, [true, false]);
  p.close();
});
test('system reduced motion is enforced and updates live even with blocked storage', () => {
  const p = page(true, true, true);
  assert.equal(p.d.documentElement.dataset.motion, 'reduced');
  assert.equal(p.d.querySelector('#btn-motion').disabled, true);
  const media = p.queries.get('(prefers-reduced-motion: reduce)'); media.matches = false; media.listeners.forEach(fn => fn(media));
  assert.equal(p.d.documentElement.dataset.motion, 'full');
  assert.equal(p.d.querySelector('#btn-motion').disabled, false);
  click(p, '#btn-motion');
  assert.equal(p.d.documentElement.dataset.motion, 'reduced');
  p.close();
});
test('mobile: Tab loops inside header and Escape closes only the expanded submenu first', () => {
  const p = page(); click(p, '#burger');
  const burger = p.d.getElementById('burger'); burger.focus();
  const tab = new p.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  burger.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(p.d.activeElement, p.d.querySelector('#entete a'));
  const btn = click(p, '[data-rubrique] > button');
  btn.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(burger.getAttribute('aria-expanded'), 'true');
  assert.equal(p.d.activeElement, btn);
  p.close();
});
test('existing canvas and verse autoplay stop on pause and hidden document, resume when allowed', () => {
  const p = page(false);
  const frames = new Map(), intervals = new Map(); let next = 0;
  p.w.requestAnimationFrame = fn => { frames.set(++next, fn); return next; };
  p.w.cancelAnimationFrame = id => frames.delete(id);
  p.w.setInterval = fn => { intervals.set(++next, fn); return next; };
  p.w.clearInterval = id => intervals.delete(id);
  const ctx = { clearRect(){}, drawImage(){}, fillRect(){}, createRadialGradient(){ return { addColorStop(){} }; } };
  p.w.HTMLCanvasElement.prototype.getContext = () => ctx;
  p.w.fetch = async () => ({ ok: true, json: async () => ({evenements:[]}) });
  const executable = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function boucle'));
  assert.ok(executable);
  p.w.eval(executable);
  assert.ok(frames.size > 0);
  const runningIntervals = intervals.size;
  click(p, '#btn-motion');
  assert.equal(frames.size, 0);
  assert.equal(intervals.size, runningIntervals - 1);
  click(p, '#btn-motion'); assert.equal(frames.size, 1);
  Object.defineProperty(p.d, 'hidden', { configurable: true, value: true });
  p.d.dispatchEvent(new p.w.Event('visibilitychange'));
  assert.equal(frames.size, 0);
  Object.defineProperty(p.d, 'hidden', { configurable: true, value: false });
  p.d.dispatchEvent(new p.w.Event('visibilitychange'));
  assert.equal(frames.size, 1);
  p.close();
});
test('prayer destination selects the prayer form option without submitting anything', () => {
  const p = page(); click(p, '#burger'); click(p, '[data-rubrique="engager"] > button');
  click(p, '#nav-principal [data-objet="Demande de prière"]');
  assert.equal(p.d.querySelector('#f-objet').value, 'Demande de prière');
  p.close();
});
test('mobile brand link returns to home and releases panel background', () => {
  const p = page(); click(p, '#burger'); click(p, '#entete .marque');
  assert.equal(p.d.querySelector('#burger').getAttribute('aria-expanded'), 'false');
  assert.equal(p.d.querySelector('main').inert, false);
  assert.equal(p.d.body.style.overflow, '');
  assert.equal(p.d.activeElement.id, 'accueil');
  p.close();
});
test('latest Academy page remains reachable from Resources, programme and training path', () => {
  const p = page(false);
  const academy = p.d.querySelector('[data-rubrique="ressources"] a[href="/vitrine/academy.html"]') || p.d.querySelector('[data-rubrique="grandir"] a[href="/vitrine/academy.html"]');
  assert.ok(academy, 'Navigation must retain the Academy registration page');
  assert.ok([...p.d.querySelectorAll('#programmes a[href="/vitrine/academy.html"]')].length);
  assert.ok([...p.d.querySelectorAll('#rejoindre a[href="/vitrine/academy.html"]')].length);
  p.close();
});
