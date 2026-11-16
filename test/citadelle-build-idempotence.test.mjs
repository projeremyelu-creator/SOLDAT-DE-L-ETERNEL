import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Test purement visuel : ni mot de passe, ni session, ni requête vers une API.
const buildSource=readFileSync('scripts/build-experience.mjs','utf8');
const start=buildSource.indexOf('const citadelStylePath =');
const end=buildSource.indexOf('// Les déclinaisons fonctionnelles');
assert.ok(start>=0 && end>start,'L’injecteur Citadelle doit rester identifiable');
const installer=new Function('revision',buildSource.slice(start,end)+'\nreturn installerCitadelleFinale;')('qa2027');

const css=['sde-citadelle-celeste-2027.css','sde-citadelle-reference-v4.css',
 'sde-reference-maquette-2026.css','sde-maquettes-integrales.css'];
const js=['sde-citadelle-celeste-2027.js','sde-citadelle-reference-v4.js',
 'sde-reference-maquette-2026.js','sde-maquettes-integrales.js'];

function verifierRendus(nom,html){
 const premier=installer(html);
 const second=installer(premier);
 const troisieme=installer(second);
 assert.equal(second,premier,nom+': recompilation ne doit pas modifier le DOM');
 assert.equal(troisieme,premier,nom+': troisième compilation identique');
 assert.equal((premier.match(/data-sde-citadel-integral=/g)||[]).length,1);
 for(const file of [...css,...js]){
   assert.equal(premier.split(file).length-1,1,nom+': calque graphique unique '+file);
 }
 assert.equal((premier.match(/data-sde-citadel-fonts=/g)||[]).length,3,
   nom+': ne pas dupliquer les préconnexions et feuilles des polices');
 assert.ok(premier.includes('SDE contenu préservé'),nom+': contenu de la page conservé');
}

test('Site public — montage de la maquette stable après trois builds',()=>{
 verifierRendus('public','<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"></head><body><main>SDE contenu préservé</main></body></html>');
});

test('Portail privé — conserver le head implicite et son script de palette',()=>{
 const native='<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n<script>/* Palette des espaces privés */const sauvegarde="</head>";</script>\n<div class="sde-splash">SDE contenu préservé</div></html>';
 verifierRendus('privé',native);
 const html=installer(native);
 assert.equal((html.match(/<head>/g)||[]).length,1);
 assert.equal((html.match(/<body>/g)||[]).length,1);
 assert.ok(html.includes('/* Palette des espaces privés */'));
 assert.ok(html.indexOf('sde-maquettes-integrales.css')<html.indexOf('/* Palette des espaces privés */'));
});

test('Déclinaisons — le build remplace les anciennes versions compilées',()=>{
 assert.ok(buildSource.includes('integralCSSOriginal.split(declinationMarker)[0]'));
 assert.ok(buildSource.includes("readFileSync(declinationCSSFile,'utf8')"));
 assert.ok(buildSource.includes('if(integralCSSCompiled!==integralCSSOriginal)'));
});

test('Programmes — bandeau TPA disponible sans JS, non affiché au-dessus de la navigation',()=>{
 const page=readFileSync('public/vitrine/programmes.html','utf8');
 const css=readFileSync('public/vitrine/sde-declinaisons-fonctionnelles-2027.css','utf8');
 assert.equal((page.match(/id="sde-event-root"/g)||[]).length,1,
   'Un seul conteneur TPA conservé pour le rendu React et le contenu sans JS');
 assert.ok(page.includes('class="infire-takeover"'));
 assert.ok(page.includes('datetime="2026-12-18T20:00:00Z"'),
   'La date officielle doit être disponible dès le HTML');
 assert.ok(css.includes('body.sde-unifie[data-sde-page="programmes"] > #sde-event-root'));
 assert.ok(css.includes('display:none!important'));
 assert.ok(page.includes('id="tpa-2026"'));
 assert.ok(page.includes('id="agenda"'));
});

test('Academy — note de confidentialité lisible sur le fond ivoire',()=>{
 const source=readFileSync('public/vitrine/sde-declinaisons-fonctionnelles-2027.css','utf8');
 const rule=source.match(/\.sde-2027-campus-notice\{[^}]+\}/)?.[0];
 assert.ok(rule,'La note de confidentialité garde une règle dédiée');
 const fg=rule.match(/(?:^|;)color:(#[0-9a-fA-F]{6})!important/)?.[1];
 assert.ok(fg,'Couleur calculable de la note');
 const luminance=(hex)=>{
  const colors=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const [r,g,b]=colors.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return r*.2126+g*.7152+b*.0722;
 };
 const a=luminance(fg),b=luminance('#f7f4ed');
 const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(ratio>=4.5,'La note doit atteindre WCAG AA sur ivoire, ratio='+ratio.toFixed(2));
});


test('Carte TPA — conserver la photo approuvée et cacher le bouton dessiné',()=>{
 const css=readFileSync('public/vitrine/sde-maquettes-integrales.css','utf8');
 const rule=css.match(/html\[data-sde-citadel-integral\] body\.sde-pixel-citadel main#contenu \.sde-pixel-feature-event::after\{[^}]+\}/)?.[0];
 assert.ok(rule,'L’illustration originale de la carte TPA doit rester identifiée');
 assert.ok(rule.includes('/vitrine/maquettes/citadelle-celeste-sde.png'),
   'La photo de la maquette originale doit rester dans la carte');
 assert.ok(rule.includes('mask-image:linear-gradient(to bottom'),
   'Le faux bouton pré-dessiné doit être masqué en bas, sans changer la photo');
 assert.ok(!rule.includes('/vitrine/photos/intercession-vignette.webp'),
   'Ne pas remplacer le visuel approuvé par une photographie étrangère');
});

test('Galerie IN FIRE — même navigation et photos originales sur toutes ses URL',()=>{
 const shell=readFileSync('public/vitrine/sde-shell-public.js','utf8');
 const album=readFileSync('public/vitrine/album-infire.html','utf8');
 assert.ok(shell.includes('const albumRoute=') && shell.includes('"/vitrine/album-infire"') && shell.includes('"/vitrine/album-infire.html"'),
   'La galerie autonome doit installer le shell commun sur la route HTML directe');
 assert.ok(album.includes('id="sde-infire-clarte"'),'Le contraste de la couverture est protégé');
 assert.ok(album.includes('/vitrine/logo-sde.webp'),'Le vrai logo officiel est conservé');
 assert.ok(album.split('/vitrine/albums/infire/2025/').length-1>=20,
   'Les 10 photographies et leurs vignettes doivent rester intactes');
 assert.equal(album.split('sde-public-media.js').length-1,1,
   'Ne pas charger deux fois le script de médiathèque');
});


test('Soldiers TV — textes sur ivoire et onglets sur bleu nuit contrastés',()=>{
 const css=readFileSync('public/vitrine/sde-declinaisons-fonctionnelles-2027.css','utf8');
 assert.ok(css.includes('Soldiers TV — contraste contrôlé'));
 const lum=hex=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
   .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 };
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const fg of ['#14233b','#293951','#805713']){
  assert.ok(contrast(fg,'#faf7f0')>=4.5,'Le titre, le paragraphe et le surtitre doivent être lisibles');
  assert.ok(css.includes(fg),'Le contraste ivoire doit être conservé dans la charte');
 }
 assert.ok(contrast('#f6e9d2','#08152e')>=4.5,'Les onglets non actifs doivent être lisibles');
});


test('Test CLS tablette Programmes — même hauteur avant et après remplacement du header',()=>{
 const css=readFileSync('public/vitrine/sde-shell-public.css','utf8');
 const marker='/* CLS tablette Programmes — réserver 66 px avant le remplacement du header. */';
 const suite=css.slice(css.lastIndexOf(marker));
 assert.ok(suite.startsWith(marker),'La correction tablette doit rester en dernière couche CSS');
 const ancien=suite.match(/>header\.site-header:not\(\.sde-shell-header\)\{([^}]+)\}/)?.[1];
 const inner=suite.match(/>header\.site-header \.site-header-inner\{([^}]+)\}/)?.[1];
 assert.ok(ancien&&inner,'La coque d’attente doit réserver sa géométrie');
 for(const [texte,hauteur] of [[ancien,66],[inner,65]]){
   for(const propriete of ['height','min-height','max-height']){
     assert.ok(texte.includes(propriete+':'+hauteur+'px!important'),
       'Préserver '+propriete+' = '+hauteur+'px à 768px');
   }
 }
});


test('Programmes tablette — en-tête stable à 66 px avant et après le montage',()=>{
 const css=readFileSync('public/vitrine/sde-shell-public.css','utf8');
 // La réservation finale pour 701–800 px prévaut sur les anciennes variantes.
 const scope=css.slice(css.indexOf('/* Réserves a'));
 const pattern=/@media\(min-width:701px\) and \(max-width:800px\)\{\s*html body\.sde-unifie\[data-sde-page="programmes"\]:not\(\.sde-shell-mounted\)>header\.site-header:not\(\.sde-shell-header\)\{([^}]+)\}\s*html body\.sde-unifie\[data-sde-page="programmes"\]:not\(\.sde-shell-mounted\)>header\.site-header \.site-header-inner\{([^}]+)\}/g;
 const matches=[...scope.matchAll(pattern)];
 assert.ok(matches.length>=1,'Le CSS de réservation tablette doit être présent');
 const [outer,inner]=matches.at(-1).slice(1);
 for(const declaration of ['height:66px!important','min-height:66px!important','max-height:66px!important'])
  assert.ok(outer.includes(declaration),'La hauteur externe avant montage correspond au shell');
 for(const declaration of ['height:65px!important','min-height:65px!important','max-height:65px!important'])
  assert.ok(inner.includes(declaration),'La hauteur interne avant montage correspond au shell');
});


test('Programmes tablette — boutons fixes malgré le chargement des polices',()=>{
 const css=readFileSync('public/vitrine/sde-declinaisons-fonctionnelles-2027.css','utf8');
 const marker='/* Programmes tablette — éviter le déplacement horizontal des CTA';
 assert.ok(css.includes(marker),'Les largeurs stables à 768px doivent être appliquées');
 const scope=css.slice(css.indexOf(marker));
 for(const width of ['width:355px!important','width:198px!important','width:148px!important'])
  assert.ok(scope.includes(width),'Dimension réservée manquante : '+width);
 assert.ok(scope.includes('flex-wrap:nowrap!important'),'Empêcher un passage à la ligne à 768px');
});
