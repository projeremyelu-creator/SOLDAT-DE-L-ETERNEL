import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const css=readFileSync('public/vitrine/sde-hub.css','utf8');
const page=readFileSync('public/vitrine/calendrier.html','utf8');
test('Calendrier : espace réservé avant le chargement asynchrone',()=>{
 assert.match(css,/\.hub-calendar\{min-height:548px;align-content:start\}/);
 assert.match(css,/@media\(max-width:700px\)\{\.hub-calendar\{min-height:452px\}\}/);
 const doc=new JSDOM(page).window.document;
 const calendar=doc.querySelector('#hub-calendar');
 assert.ok(calendar);
 assert.equal(calendar.getAttribute('aria-live'),'polite');
 assert.match(calendar.querySelector('[role="status"]')?.textContent||'',/Chargement du calendrier/);
 assert.ok(doc.querySelector('#hub-calendar-prev'));
 assert.ok(doc.querySelector('#hub-calendar-next'));
});
