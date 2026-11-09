import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(path,'utf8');
const home=read('public/vitrine/portail.html');
const soutien=read('public/vitrine/soutenir.html');
const source=read('public/vitrine/sde-don-intention.js');
const tpa=JSON.parse(read('public/vitrine/evenement-phare.json'));

test('Maquette SDE : Hero immersif et fiche TPA unique, routes réelles préservées',()=>{
 const dom=new JSDOM(home),d=dom.window.document;
 assert.equal(d.querySelectorAll('.ap-hero .sde-tpa-hero-card').length,1);
 assert.equal(d.querySelectorAll('body > .sde-shell-event').length,0);
 assert.equal(d.querySelectorAll('#ap-countdown').length,1);
 assert.equal(d.querySelector('.sde-tpa-hero-card time')?.getAttribute('datetime'),tpa.debut);
 assert.equal(d.querySelector('.sde-shell-event-register')?.getAttribute('href'),tpa.inscription);
 assert.equal(d.querySelector('#sde-tpa-calendar')?.getAttribute('target'),'_blank');
 assert.ok(d.querySelector('.ap-hero .ap-actions a[href="/contact#rejoindre"]'));
 assert.ok(d.querySelector('a[href="/portail"]'));
 assert.equal(d.querySelectorAll('.sde-pole-talents').length,5);
 assert.equal(d.querySelectorAll('.sde-pole-officiel-lien img').length,5);
 assert.ok(d.querySelector('.sde-member-demo em')?.textContent.includes('Aucun QR actif'));
 assert.equal(d.querySelectorAll('a[href="/login"]').length,0);
 assert.equal(d.querySelectorAll('a[href^="mailto:contact@mouvement-sde.org"]').length,0);
 dom.window.close();
});

test('Maquette SDE : image existante sous double voile, désactivée sur smartphone',()=>{
 const css=read('public/vitrine/sde-maquette-hero.css');
 assert.ok(existsSync('public/vitrine/photos/hero-sde-1280.webp'),'image existante');
 assert.match(css,/radial-gradient\(circle at 50% 35%/);
 assert.match(css,/linear-gradient\(to bottom/);
 assert.match(css,/hero-sde-1280\.webp/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/\.ap-hero-bg\{background-image:none!important/);
 assert.match(home,/sde-maquette-hero\.css/);
});

test('Maquette SDE : montant et canal s’actualisent sans paiement fictif',()=>{
 const dom=new JSDOM(home,{url:'https://mouvement-sde.org/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const choices=[...d.querySelectorAll('[data-sde-montant]')];
 assert.equal(choices.length,3);
 choices[2].click();
 assert.equal(choices[2].getAttribute('aria-pressed'),'true');
 assert.match(d.querySelector('#sde-don-resume').textContent,/25.000 FCFA/);
 const canal=d.querySelector('#sde-don-canal');
 canal.value='orange';canal.dispatchEvent(new w.Event('change',{bubbles:true}));
 const url=new URL(d.querySelector('#sde-don-continuer').href);
 assert.equal(url.pathname,'/soutenir');
 assert.equal(url.searchParams.get('montant'),'25000');
 assert.equal(url.searchParams.get('canal'),'orange');
 assert.equal(url.hash,'#formulaire');
 assert.match(d.querySelector('.sde-don-disclaimer').textContent,/Aucun paiement direct/);
 const libre=d.querySelector('#sde-don-libre');libre.value='7250';libre.dispatchEvent(new w.Event('input'));
 assert.equal(new URL(d.querySelector('#sde-don-continuer').href).searchParams.get('montant'),'7250');
 assert.equal(choices.filter(b=>b.getAttribute('aria-pressed')==='true').length,0);
 dom.window.close();
});

test('Maquette SDE : la page Soutenir confirme seulement une intention',()=>{
 const dom=new JSDOM(soutien,{url:'https://mouvement-sde.org/soutenir?montant=25000&canal=wave#formulaire',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const recap=d.querySelector('.sde-contribution-resume');
 assert.ok(recap);
 assert.match(recap.textContent,/25.000 FCFA/);
 assert.match(recap.textContent,/Aucun paiement n’a été effectué/);
 assert.match(d.querySelector('.hub-note').textContent,/Paiement en ligne en préparation/);
 dom.window.close();
});

test('Maquette SDE : calendrier Google synchronisé avec le fichier événement phare',async()=>{
 const dom=new JSDOM(home,{url:'https://mouvement-sde.org/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.fetch=async url=>String(url).includes('evenement-phare.json')
  ?{ok:true,json:async()=>tpa}:{ok:false};
 w.eval(read('public/vitrine/sde-accueil-premium.js'));
 await new Promise(resolve=>setTimeout(resolve,30));
 const url=new URL(d.querySelector('#sde-tpa-calendar').href);
 assert.equal(url.hostname,'calendar.google.com');
 assert.equal(url.searchParams.get('action'),'TEMPLATE');
 assert.equal(url.searchParams.get('dates').split('/')[0],'20261218T200000Z');
 assert.match(url.searchParams.get('details'),/indicative/);
 assert.match(d.querySelector('#ap-countdown').textContent,/jours \d+ h \d+ min \d+ s/);
 dom.window.close();
});

test('Maquette SDE : titre et texte du Hero réservés à 1 100 px sans figer le mobile',()=>{
 const css=read('public/vitrine/sde-maquette-hero.css');
 const beginning=css.indexOf('@media(min-width:1051px) and (max-width:1199px)');
 assert.ok(beginning>=0,'réservation tablette/grand écran présente');
 const stable=css.slice(beginning,css.indexOf('@media(max-width:960px)',beginning));
 assert.match(stable,/\.ap-hero \.ap-hero-copy h1\{/);
 assert.match(stable,/font-size:clamp\(2\.625rem,4\.2vw,3rem\)!important/);
 assert.match(stable,/min-height:2\.4em!important/);
 assert.match(stable,/\.ap-hero-copy \.ap-lead\{/);
 assert.match(stable,/min-height:calc\(1\.65em \* 4\)!important/);
 assert.doesNotMatch(css.slice(css.indexOf('@media(max-width:960px)')),/min-height:2\.4em!important/,'le petit écran garde un titre à hauteur naturelle');
});
