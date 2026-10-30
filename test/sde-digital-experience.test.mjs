import {readFileSync,existsSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const read=path=>readFileSync(path,'utf8');
const home=()=>read('public/vitrine/portail.html');

test('Accueil : cinq emblèmes officiels et liens directs fonctionnels',()=>{
 const html=home();
 const pages=['pole-reveil','pole-social','pole-logistique','pole-medias','pole-formation'];
 for(let i=1;i<=5;i++){
  assert.ok(existsSync(`public/vitrine/illus/pole-${i}.webp`),`emblème du pôle ${i}`);
  assert.match(html,new RegExp(`/vitrine/illus/pole-${i}\\.webp`));
  assert.ok(html.includes(`href="/${pages[i-1]}"`),`lien direct ${pages[i-1]}`);
 }
 assert.equal((html.match(/class="sde-pole-officiel-lien"/g)||[]).length,5);
});

test('TPA : date officielle, affiche, programme et partage WhatsApp',()=>{
 const html=home(),agenda=read('public/vitrine/programmes.html');
 assert.ok(html.includes('2026-12-18T20:00:00+00:00'));
 assert.ok(html.includes('tpa-2026.webp'));
 assert.ok(html.includes('Partager sur WhatsApp'));
 assert.ok(html.includes('href="/programmes#agenda"'));
 assert.ok(agenda.includes('Traversée Prophétique Annuelle — TPA 2026'));
 assert.ok(agenda.includes('Google Meet'));
});

test('SEO : schémas JSON-LD vérifiables sur accueil et programmes',()=>{
 for(const path of ['public/vitrine/portail.html','public/vitrine/programmes.html']){
  const html=read(path);
  const json=html.match(/<script id="sde-jsonld-2026" type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/);
  assert.ok(json,`schéma absent : ${path}`);
  const data=JSON.parse(json[1]);
  assert.ok(data['@graph'].some(item=>item['@type']==='Event'&&item.startDate==='2026-12-18T20:00:00+00:00'));
 }
});

test('Deux tableaux de bord : même correctif CSS mobile, sans changement de droits',()=>{
 const css=read('public/vitrine/tableaux-de-bord.css');
 assert.ok(css.includes('grid-template-areas:"brand logout" "links links"'));
 for(const path of ['public/vitrine/tableau-membre.html','public/vitrine/tableau-administration.html']){
  assert.ok(read(path).includes('tableaux-de-bord.css?v=20261030premium'));
  assert.ok(read(path).includes('data-dashboard='));
 }
 const admin=read('public/vitrine/tableau-administration.html');
 assert.ok(admin.includes('data-access="proprietaire" hidden'));
 assert.ok(admin.includes('data-access="admin" hidden'));
});

test('Bandeau public : TPA automatique, aucune date de fin de réunion inventée',()=>{
 const jsx=read('frontend/experience.jsx');
 assert.ok(jsx.includes("tpaState"));
 assert.ok(jsx.includes("href=\"/programmes#agenda\""));
 assert.ok(jsx.includes("Découvrir la TPA"));
 const clock=read('frontend/event-clock.js');
 assert.ok(clock.includes('TPA_START'));
 assert.ok(clock.includes('TPA_PROMOTION_END'));
});
