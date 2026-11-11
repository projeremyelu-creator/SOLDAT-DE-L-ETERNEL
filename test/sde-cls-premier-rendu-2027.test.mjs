import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const file=p=>readFileSync(p,'utf8');

test('Programmes : la hauteur du shell tablette est réservée avant son montage',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 assert.match(css,/@media\(min-width:701px\) and \(max-width:800px\)/);
 assert.match(css,/data-sde-page="programmes"\]:not\(\.sde-shell-mounted\)>header\.site-header:not\(\.sde-shell-header\)/);
 assert.match(css,/height:73px!important/);
 assert.match(css,/overflow:hidden!important/);
 const page=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 assert.ok(page.querySelector('header.site-header'));
 assert.equal(page.body.getAttribute('data-sde-page'),'programmes');
 assert.ok(page.querySelector('#agenda'));
});
test('Academy : bannière redondante masquée sans supprimer les cours ni la TPA du programme',()=>{
 const css=file('public/vitrine/sde-shell-public.css');
 assert.match(css,/html body\.sde-unifie\.sde-campus-public #sde-event-root\{/);
 assert.match(css,/display:none!important/);
 const a=new JSDOM(file('public/vitrine/academy.html')).window.document;
 assert.ok(a.body.classList.contains('sde-campus-public'));
 assert.ok(a.querySelector('.sa-premium-preview'));
 assert.ok(a.querySelector('.sa-premium-quick a[href="/academy-programme-24"]'));
 const p=new JSDOM(file('public/vitrine/programmes.html')).window.document;
 assert.ok(p.querySelector('#tpa-2026'));
 assert.ok(p.querySelector('.event-clock time[datetime="2026-12-18T20:00:00Z"]'));
});
