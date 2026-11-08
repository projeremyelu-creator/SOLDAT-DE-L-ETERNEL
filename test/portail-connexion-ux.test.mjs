import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
const pause=()=>new Promise(r=>setTimeout(r,15));
function ui(handler){const dom=new JSDOM(readFileSync('public/vitrine/connexion-unifiee.html','utf8'),{url:'https://mouvement-sde.org/connexion?retour=%2Fadministration',runScripts:'outside-only'});const w=dom.window,calls=[];w.fetch=async(path,opts)=>{calls.push({path,opts});return handler?handler(path,opts):{ok:true,json:async()=>({ok:true})}};w.eval(readFileSync('public/vitrine/portail-connexion.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));return {dom,w,d:w.document,calls}}
test('Connexion : chaque mot de passe peut être affiché puis masqué sans soumettre le formulaire',()=>{const c=ui();try{const input=c.d.querySelector('#form-connexion input[name=motDePasse]');const b=c.d.querySelector('#form-connexion .access-password-toggle');assert.ok(b);assert.equal(b.type,'button');b.click();assert.equal(input.type,'text');assert.equal(b.getAttribute('aria-pressed'),'true');b.click();assert.equal(input.type,'password');assert.equal(c.calls.length,0)}finally{c.dom.window.close()}});
test('Récupération : formulaire accessible et demande envoyée au serveur sans mot de passe',async()=>{const c=ui();try{c.d.getElementById('access-forgot').click();assert.equal(c.d.getElementById('panel-recuperation').hidden,false);const f=c.d.getElementById('form-recuperation');f.querySelector('input').value='alice@example.org';f.dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.equal(c.calls[0].path,'/api/recuperation');assert.deepEqual(JSON.parse(c.calls[0].opts.body),{email:'alice@example.org'});assert.match(c.d.getElementById('access-message').textContent,/demande|secrétariat/);assert.equal(c.calls.length,1)}finally{c.dom.window.close()}});
test('Connexion : une panne réseau affiche une erreur et permet un nouvel essai',async()=>{const c=ui(()=>{throw Error('offline')});try{const f=c.d.getElementById('form-connexion');f.elements.email.value='alice@example.org';f.elements.motDePasse.value='test';f.dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.match(c.d.getElementById('access-message').textContent,/impossible|réseau/i);assert.equal(f.querySelector('[type=submit]').disabled,false)}finally{c.dom.window.close()}});
test('Connexion : une session non confirmée ne provoque pas de redirection silencieuse',async()=>{const c=ui(path=>({ok:true,json:async()=>path==='/api/moi'?{connecte:false,niveau:0}:{ok:true}}));try{const f=c.d.getElementById('form-connexion');f.elements.email.value='alice@example.org';f.elements.motDePasse.value='test';f.dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.match(c.d.getElementById('access-message').textContent,/confirmée|session/i);assert.equal(c.w.location.pathname,'/connexion')}finally{c.dom.window.close()}});
test('Compatibilité : connexion aux anciens comptes et huit caractères pour les nouveaux mots de passe',()=>{const c=ui();try{const signin=c.d.querySelector('#form-connexion input[name=motDePasse]');signin.value='1234';assert.equal(signin.hasAttribute('minlength'),false);assert.equal(signin.checkValidity(),true);const signup=c.d.querySelector('#form-inscription input[name=motDePasse]');signup.value='1234';assert.equal(signup.minLength,8);const activation=c.d.querySelector('#form-activation input[name=motDePasse]');assert.equal(activation.minLength,8)}finally{c.dom.window.close()}});


test('Maquette 03+04 : les quatre modes du portail demeurent accessibles avec cible membre ou direction',()=>{
 const c=ui();try{
  const tabs=[...c.d.querySelectorAll('.access-tabs [role="tab"]')];
  assert.deepEqual(tabs.map(t=>t.dataset.mode),['connexion','inscription','activation','recuperation']);
  const targets=c.d.querySelectorAll('[data-access-target]');
  assert.equal(targets.length,2);
  assert.equal(tabs[0].tabIndex,0);
  assert.equal(tabs[1].tabIndex,-1);
  tabs[1].click();
  assert.equal(tabs[1].getAttribute('aria-selected'),'true');
  assert.equal(c.d.getElementById('panel-inscription').hidden,false);
  assert.equal(c.d.getElementById('panel-connexion').hidden,true);
  tabs[1].dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  assert.equal(c.d.getElementById('panel-recuperation').hidden,false);
  assert.equal(c.d.activeElement,tabs[3]);
  tabs[3].dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  assert.equal(c.d.getElementById('panel-connexion').hidden,false);
  assert.equal(c.d.activeElement,tabs[0]);
  c.d.getElementById('access-forgot').click();
  assert.equal(c.d.getElementById('panel-recuperation').hidden,false);
  assert.equal(c.d.activeElement,tabs[3]);
 }finally{c.dom.window.close()}
});
test('Maquette 03+04 : mise en page mobile à hauteur naturelle et formulaires visibles',()=>{
 const css=readFileSync('frontend/reference.css','utf8');
 const entry=readFileSync('frontend/experience.css','utf8');
 const html=readFileSync('public/vitrine/connexion-unifiee.html','utf8');
 assert.ok(entry.includes('@import "./reference.css"'));
 assert.ok(html.includes('sde-reference-login'));
 assert.match(css,/Fidélité 03\+04 · portail d'entrée/);
 assert.match(css,/body\.sde-reference-login \.access-shell\{[\s\S]*?min-height:100svh!important/);
 assert.match(css,/body\.sde-reference-login \.access-tabs\{[\s\S]*?display:grid!important/);
 assert.match(css,/body\.sde-reference-login \.access-password-toggle\{[\s\S]*?position:static!important/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});


test('Connexion dégradée : quatre onglets restent accessibles même sans la feuille React',()=>{
 const html=readFileSync('public/vitrine/connexion-unifiee.html','utf8');
 const dom=new JSDOM(html,{url:'https://mouvement-sde.org/connexion',runScripts:'outside-only',pretendToBeVisual:true});
 try{
  const d=dom.window.document,css=d.getElementById('sde-auth-critical-css');
  assert.ok(css,'Style de secours chargé indépendamment du bundle');
  assert.ok(css.textContent.includes('html body.sde-reference-login .access-tabs{'));
  assert.match(css.textContent,/display:grid!important/);
  assert.match(css.textContent,/@media\(max-width:680px\)/);
  assert.match(css.textContent,/html body\.sde-reference-login \.access-content\{/);
  assert.match(css.textContent,/html body\.sde-reference-login \.access-panel\[hidden\]/);
  const tabs=d.querySelectorAll('.access-tabs [role="tab"]');
  assert.equal(tabs.length,4);
  const styles=[...d.querySelectorAll('head style')];
  assert.equal(styles.at(-1),css,'Le style de secours est prioritaire en cascade');
  const scripts=[...d.querySelectorAll('script[src]')];
  assert.ok(scripts.some(x=>x.src.includes('/vitrine/portail-connexion.js')),'L'+'authentification existante est conservée');
 }finally{dom.window.close()}
});


test('Inscription membre : deux mots de passe identiques et consentement explicite sont demandés',()=>{
 const c=ui();try{
  const form=c.d.getElementById('form-inscription');
  assert.ok(form.querySelector('[name="confirmationMotDePasse"][required]'));
  assert.ok(form.querySelector('[name="consentement"][type="checkbox"][required]'));
  const tabs=[...c.d.querySelectorAll('.access-tabs [role="tab"]')];
  assert.equal(tabs.length,4,'Les fonctions d’activation et de récupération restent accessibles');
  assert.equal(c.d.querySelector('[data-access-target="/mon-espace"]').getAttribute('aria-pressed'),'false');
  c.d.querySelector('[data-access-target="/mon-espace"]').click();
  assert.equal(c.d.querySelector('[data-access-target="/mon-espace"]').getAttribute('aria-pressed'),'true');
  c.d.querySelector('[data-goto="inscription"]').click();
  assert.equal(c.d.getElementById('panel-inscription').hidden,false);
 }finally{c.dom.window.close()}
});

test('Inscription membre : mots de passe différents = aucune requête API',async()=>{
 const c=ui();try{
  const form=c.d.getElementById('form-inscription');
  form.elements.nom.value='Nouveau';form.elements.prenoms.value='Soldat';
  form.elements.email.value='nouveau@example.org';
  form.elements.motDePasse.value='unMotDePasseLong123';
  form.elements.confirmationMotDePasse.value='unMotDePasseDifferent123';
  form.elements.consentement.checked=true;
  form.dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));
  await pause();
  assert.equal(c.calls.length,0);
  assert.match(c.d.getElementById('access-message').textContent,/même mot de passe/);
 }finally{c.dom.window.close()}
});

test('Inscription membre : requête sans confirmation du secret et création de session contrôlée',async()=>{
 const c=ui(path=>({ok:true,json:async()=>path==='/api/moi'?{connecte:true,niveau:0}:{ok:true,matricule:'123456'}}));try{
  const form=c.d.getElementById('form-inscription');
  form.elements.nom.value='Nouveau';form.elements.prenoms.value='Soldat';
  form.elements.email.value='nouveau@example.org';
  form.elements.motDePasse.value='unMotDePasseLong123';
  form.elements.confirmationMotDePasse.value='unMotDePasseLong123';
  form.elements.consentement.checked=true;
  form.dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));
  await pause();
  assert.equal(c.calls[0].path,'/api/inscription');
  assert.equal(c.calls[0].opts.method,'POST');
  assert.equal(c.calls[0].opts.credentials,'same-origin');
  const payload=JSON.parse(c.calls[0].opts.body);
  assert.equal(payload.confirmationMotDePasse,undefined);
  assert.equal(payload.motDePasse,'unMotDePasseLong123');
  assert.equal(payload.consentement,'oui');
  assert.equal(c.calls[1].path,'/api/moi');
  assert.match(c.d.getElementById('access-message').textContent,/compte membre est créé/);
 }finally{c.dom.window.close()}
});
