import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const css=readFileSync('public/vitrine/sde-sitewide-2026.css','utf8');
const pages=['portail','programmes','mouvement','projets','rejoindre',
  'ressources','plus','academy','boutique','prieres','missions-humanitaires',
  'soldiers-voice','soldiers-award','pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation','temoignages','404','formulaire'];
const html=page=>readFileSync('public/vitrine/'+page+'.html','utf8');

test('Identité SDE : les 21 pages publiques utilisent toutes le même thème final',()=>{
  for(const page of pages){
    const source=html(page);
    const doc=new JSDOM(source).window.document;
    const links=[...doc.querySelectorAll('head link[rel=stylesheet]')].map(el=>el.getAttribute('href'));
    assert.equal(links.filter(x=>x.includes('sde-sitewide-2026.css')).length,1,page);
    assert.ok(links.at(-1).includes('sde-sitewide-2026.css'),page+' : feuille CSS chargée en dernier');
    assert.match(source,/<body\b/,page+' : contenu existant présent');
    assert.ok(!source.includes('SDE DIGITAL — MILITAIRE PREMIUM'),page);
  }
});
test('Identité SDE : routes publiques réelles couvertes et espaces privés non altérés',()=>{
  const worker=readFileSync('src/worker.js','utf8');
  const mapping={
    '/formulaire':'formulaire','/boutique':'boutique',
    '/mouvement':'mouvement','/programmes':'programmes',
    '/academy':'academy','/enseignements':'ressources',
    '/missions':'projets','/priere':'prieres','/contact':'rejoindre',
    '/temoignages':'temoignages','/soldiers-voice':'soldiers-voice','/soldiers-award':'soldiers-award','/pole-reveil':'pole-reveil','/pole-social':'pole-social','/pole-logistique':'pole-logistique','/pole-medias':'pole-medias','/pole-formation':'pole-formation',
    '/missions-humanitaires':'missions-humanitaires','/rubriques':'plus'
  };
  for(const [route,page] of Object.entries(mapping)){
    assert.ok(worker.includes('"'+route+'": "/vitrine/'+page+'.html"'),route);
    assert.match(html(page),/sde-sitewide-2026\.css/,route);
  }
  assert.ok(worker.includes('assetPortail("/vitrine/portail.html")'));
  assert.ok(!css.includes('.ref-toolbar'),'Styles privés inchangés');
  assert.ok(!css.includes('#sde-operations-nav'),'Navigation admin inchangée');
});
test('Identité SDE : le grand titre des sections ne déborde plus du bandeau de 54px',()=>{
  assert.match(css,/main#contenu>section\.section \.tete-section\{/);
  assert.match(css,/display:flex!important;flex-direction:column!important/);
  assert.match(css,/background-size:auto!important/);
  assert.match(css,/grid-template-rows:none!important/);
  assert.match(css,/\.tete-section::before\{[\s\S]*?content:none!important/);
  assert.match(css,/\.tete-section h2\{[\s\S]*?white-space:normal!important/);
  assert.match(css,/\.tete-section \.chapo\{[\s\S]*?color:#e2e9df!important/);
  assert.match(css,/border:1px solid rgba\(215,181,103,\.66\)!important/);
});
test('Identité SDE : Agenda, Programmes, IN FIRE, parcours et pied de page cohérents',()=>{
  for(const part of ['section#infire','#infire .decompte-cel','.sde-further','.site-footer',
   '.sde-initiative-section','.sde-initiative-card','.m-panel','.m-band']){
    assert.ok(css.includes(part),part);
  }
  assert.match(css,/background:linear-gradient\(135deg,var\(--sde-forest-deep\)/);
  assert.match(css,/background:#fffdf8!important/);
  assert.match(css,/color:#fff8e7!important/);
  assert.match(css,/color:#f1d690!important/);
  assert.match(html('programmes'),/IN FIRE 2026/);
  assert.match(html('programmes'),/Les prochains rendez-vous/);
  assert.match(html('portail'),/SDE - Mouvement/i);
});
test('Identité SDE : formulaires et interactions préservés',()=>{
  for(const page of ['programmes','prieres','rejoindre','formulaire']){
    assert.match(html(page),/<(form|button)\b/i,page);
    assert.match(html(page),/<main\b/i,page);
  }
  assert.match(css,/body\.sde-subpage\[data-sde-page="formulaire"\]/);
  assert.match(css,/\.form-carte :is\(input,textarea,select\)/);
  assert.match(css,/\.sde-initiative-note/);
  assert.match(css,/\.rdv/);
});
test('Identité SDE : mobile lisible et animations désactivables',()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:370px\)/);
  assert.match(css,/font-size:clamp\(1\.45rem,6vw,2rem\)/);
  assert.match(css,/@keyframes sde-site-countdown-reveal/);
  assert.match(css,/@keyframes sde-site-gold-glow/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/body\[data-motion="paused"\]/);
  assert.match(css,/#infire \.decompte-cel\{[\s\S]*?animation:none!important/);
});
