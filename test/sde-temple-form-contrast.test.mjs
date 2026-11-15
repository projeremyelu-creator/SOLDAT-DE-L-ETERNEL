import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('public/vitrine/sde-maquettes-integrales.css','utf8');
const page=readFileSync('public/vitrine/prieres.html','utf8');
const scope='body.sde-pixel-temple.sde-shell-mounted main#contenu';

function luminance(hex){
 const rgb=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255);
 const c=rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function ratio(a,b){
 const [x,y]=[luminance(a),luminance(b)].sort((m,n)=>n-m);
 return (x+.05)/(y+.05);
}

test('Temple Vivant : formulaires ivoire lisibles WCAG AA',()=>{
 assert.ok(css.includes('SDE-2026-TEMPLE-FORM-CONTRAST'));
 assert.ok(css.includes(scope));
 for(const [ink,paper] of [
  ['302438','fffaf7'], // labels et explications
  ['221b2b','ffffff'], // champs et valeurs
  ['5a4e5c','ffffff'], // espaces réservés
  ['482b65','fffaf7'], // liens
  ['ffffff','4b2d65'], // bouton violet
  ['175632','fffaf7'], // succès
  ['8d2332','fffaf7']  // erreur
 ])assert.ok(ratio(ink,paper)>=4.5,ink+' sur '+paper);
 assert.ok(page.includes('data-sde-anonymous-prayer'));
 assert.ok(page.includes('data-sde-contact="prieres"'));
 assert.ok(page.includes('data-sde-page="prieres"'));
});
