import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
test('Compte à rebours IN FIRE : feuille de style chargée, braises et anneaux soumis au calme',()=>{
 assert.match(read('public/vitrine/programmes.html'),/infire-braises\.css\?v=\w+/);
 const css=read('public/vitrine/infire-braises.css');
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.decompte-braises\{display:none\}/);
 assert.match(css,/body\[data-motion="paused"\] \.decompte-braises\{display:none\}/);
 const js=read('public/vitrine/subpage.js');
 assert.match(js,/if\(counter&&!calm\(\)\)/,'les braises ne sont créées qu’en mouvement normal');
 assert.match(js,/if\(!calm\(\)&&el\.animate\)/,'le défilement des chiffres respecte le calme');
 assert.match(js,/IN FIRE 2026 s'est tenue/,'l’état après événement est conservé');
});
