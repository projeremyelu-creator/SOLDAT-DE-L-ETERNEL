import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const file=path=>readFileSync(path,'utf8');

test('SDE OS 4.0 : contrôles du menu réservés avant hydratation',()=>{
 const accueil=file('public/vitrine/portail.html');
 assert.match(accueil,/class="site-theme-toggle"[^>]*>/);
 assert.match(accueil,/data-sde-motion-slot="true"/);
 const js=file('public/vitrine/portail-unifie.js');
 assert.match(js,/header\.querySelector\("\.site-theme-toggle"\) \|\| document\.createElement\("button"\)/);
 assert.match(js,/const start=\(\)=>\{navigation\(\);theme\(\);agenda\(\)\}/);
 const react=file('frontend/experience.jsx');
 assert.ok(react.includes("document.querySelector('[data-sde-motion-slot]')"));
 const css=file('public/vitrine/sde-sitewide-2026.css');
 assert.ok(css.includes('min-height:76px'));
 assert.ok(css.includes('grid-column:4!important'));
});

test('Le centre de publication reste réservé à la direction autorisée',()=>{
 const a=file('public/vitrine/tableau-administration.html');
 assert.match(a,/<a href="#publications"[^>]*data-access="admin" hidden/);
 assert.match(a,/<section data-section="publications" data-access="admin" hidden>/);
 for(const module of ['site-public','agenda','portevoix','arsenal'])
  assert.ok(a.includes('/administration/outils?module='+module));
 const protectedApi=file('public/vitrine/tableaux-de-bord.js');
 assert.ok(protectedApi.includes('compte?.niveau>=2'));
 assert.ok(protectedApi.includes('configureRoles()'));
 const direct=file('public/vitrine/portail-direct.js');
 assert.ok(direct.includes('site-public'));
 assert.ok(direct.includes('compte?.niveau>=2'));
});

test('Les fonctions personnelles restent directes et privées',()=>{
 const m=file('public/vitrine/tableau-membre.html');
 assert.ok(m.includes('data-view="notifications"'));
 assert.ok(m.includes('data-section="notifications" hidden'));
 for(const name of ['preferences','rendezvous','carteqr','contributions'])
  assert.ok(m.includes('/mon-espace/outils?module='+name));
 assert.ok(!m.includes('data-section="publications"'));
});

test('Le diagnostic de stabilité signale les sauts CLS du site public',()=>{
 const script=file('scripts/audit-public-mobile.mjs');
 assert.ok(script.includes('shiftSources'));
 assert.ok(script.includes("row.labMetrics?.cls>0.10"));
 assert.ok(script.includes("brandPortalOverlap"));
});
