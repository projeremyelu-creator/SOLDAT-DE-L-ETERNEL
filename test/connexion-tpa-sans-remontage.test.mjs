import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('Connexion sans bandeau TPA ni navigation publique et sans remontage React',()=>{
 const html=readFileSync('public/vitrine/connexion-unifiee.html','utf8');
 const jsx=readFileSync('frontend/experience.jsx','utf8');
 const dom=new JSDOM(html),doc=dom.window.document;
 assert.equal(doc.body.classList.contains('sde-reference-login'),true);
 assert.equal(doc.querySelector('#sde-event-root'),null);
 assert.equal(doc.querySelector('header.site-header,.sde-auth-nav,.site-menu'),null);
 assert.equal(doc.querySelector('script[src*="sde-experience.js"]'),null);
 assert.ok(doc.querySelector('script[src*="portail-connexion.js"]'));
 assert.ok(doc.querySelector('#form-connexion'));
 assert.ok(doc.querySelector('#form-inscription'));
 assert.match(jsx,/if\(event&&!document\.body\.classList\.contains\('sde-reference-login'\)\)createRoot\(event\)\.render\(<EventBanner\/>\)/);
 dom.window.close();
});
test('Date TPA accessible sur la page Programmes sans Javascript',()=>{
 const d=new JSDOM(readFileSync('public/vitrine/programmes.html','utf8'));
 const clock=d.window.document.querySelector('#sde-event-root .event-clock');
 assert.ok(clock);
 assert.ok(clock.querySelector('time[datetime="2026-12-18T20:00:00Z"]'));
 assert.doesNotMatch(clock.textContent,/--/);
 d.window.close();
});
