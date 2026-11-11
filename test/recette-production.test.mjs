import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DOMAINES,CONTROLES,recetteProduction} from '../scripts/recette-production.mjs';

const html=(text,extra={})=>new Response('<!doctype html><title>SDE</title>'+text,{status:200,headers:{'content-type':'text/html; charset=UTF-8',...extra}});
function simulateur({pagePriveExposee=false,lienExterne=false,styleObsolete=false,sessionExposee=false,erreurDomaine=false,marqueObsolete=false,stylePilotageObsolete=false,siteObsolete=false,academyExposee=false,academyCatalogueObsolete=false,academyRetourPerdu=false,academyScriptObsolete=false,loginBandeauObsolete=false}={}){
  const appels=[];
  const fetcher=async(url,opts)=>{
    const u=new URL(url),p=u.pathname;
    appels.push({url,opts});
    if(erreurDomaine&&u.hostname==='app.mouvement-sde.org')throw Error('DNS inaccessible');
    if(p==='/'){
      if(u.hostname==='app.mouvement-sde.org')return new Response(null,{status:302,headers:{location:u.origin+'/connexion?retour=%2Fportail'}});
      return html('<main>Le Mouvement SDE</main>');
    }
    if(p==='/academy-programme-24')
      return html(academyCatalogueObsolete?'<h1>Ancien programme Soldiers Academy 12 cours</h1>':'<h1>Soldiers Academy 24 cours · 192 h</h1>'+Array.from({length:24},(_,i)=>'<article class="course" data-level="'+(Math.floor(i/8)+1)+'"><b>SA-'+String(i+1).padStart(2,'0')+'</b></article>').join(''));
    if(CONTROLES.some(c=>c.path===p&&c.type==='page-moderne'))return html('<link rel="stylesheet" href="/vitrine/sde-shell-public.css">');
    if(CONTROLES.some(c=>c.path===p&&c.type==='page-publique'))return html(siteObsolete?'<main>Page SDE ancienne</main>':'<main>Page SDE</main><link rel="stylesheet" href="/vitrine/sde-sitewide-2026.css?v=20261030global">');
    if(p==='/connexion')return html(
      '<form id="form-connexion">Connexion mot de passe</form><form id="form-inscription">Inscription</form>'+
      (loginBandeauObsolete?'<aside id="sde-event-root"><a href="/programmes#tpa-2026">TPA 2026</a></aside>':''),
      {'cache-control':'no-store','x-robots-tag':'noindex, nofollow'});
    if(['/mon-espace','/administration','/mon-espace/academy','/administration/academy','/mon-espace/enseignants'].includes(p))return pagePriveExposee
      ?html('Contenu confidentiel')
      :new Response(null,{status:302,headers:{'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow',location:(lienExterne?'https://autre-site.example':u.origin)+'/connexion?retour='+encodeURIComponent(academyRetourPerdu&&/\/(academy|enseignants)$/.test(p)?p.replace(/\/(academy|enseignants)$/,''):p)}});
    if(p==='/api/sante')return Response.json({ok:true,assetRevision:(process.env.SDE_EXPECTED_REV||'abcdef123456').slice(0,12)});
    if(p==='/api/soldiers-academy'||p==='/api/soldiers-academy/cours/SA-01'||p==='/api/soldiers-academy/ressources/etat'||p==='/api/soldiers-academy/love-school')
      return Response.json(academyExposee?{ok:true,courses:['private']}: {ok:false,message:'Connexion requise.'},{status:academyExposee?200:401,headers:{'cache-control':'private, no-store'}});
    if(p==='/api/moi')return Response.json({connecte:sessionExposee});
    if(p==='/api/notifications-status')return Response.json({erreur:'refuse'},{status:403});
    if(p==='/vitrine/infire-2026/chronogramme-officiel.pdf')return new Response('%PDF-1.7\n% Simulateur de document officiel',{headers:{'content-type':'application/pdf'}});
    if(p==='/vitrine/sde-academy-parcours.js')return new Response(academyScriptObsolete
      ? 'const obsoleteAcademy = true;'
      : 'function actualiserRessourcesCours(){}; function chargerLoveSchool(){}; const lovePublicActif="tous"; const filtre="data-love-public"; const controle = "data-refresh-course-resources";',
      {headers:{'content-type':'text/javascript'}});
    if(p.endsWith('.js'))return new Response(p.includes('operations-assets')?(marqueObsolete?'const brand="SDE DIGITAL";':'const brand="SDE - MOUVEMENT";'):'const id="sde-direct-tabs";',{headers:{'content-type':'text/javascript'}});
    if(p==='/vitrine/sde-sitewide-2026.css')return new Response(siteObsolete?'.ancien{}':'--sde-forest:#172b25;.sde-further{}@keyframes sde-site-countdown-reveal{}',{headers:{'content-type':'text/css'}});
    if(p.endsWith('.css'))return new Response(p.includes('sde-experience')?(stylePilotageObsolete?'.obsolete{}':'.ref-feature{}@keyframes sde-feature-sheen{}'):(styleObsolete?'.obsolete{}':'#sde-direct-menu-toggle{}'),{headers:{'content-type':'text/css'}});
    throw Error('Route non prévue : '+p);
  };
  return {fetcher,appels};
}

test('Recette production : les deux domaines couvrent tous les parcours GET sans authentification',async()=>{
 const f=simulateur(),rapports=[];
 const bilan=await recetteProduction({fetcher:f.fetcher,essais:1,rapport:r=>rapports.push(r)});
 assert.equal(bilan.total,DOMAINES.length*CONTROLES.length);
 assert.equal(bilan.reussis,DOMAINES.length*CONTROLES.length);
 assert.equal(bilan.ok,true);
 assert.equal(rapports.length,DOMAINES.length*CONTROLES.length);
 assert.ok(f.appels.every(a=>a.opts.method==='GET'&&a.opts.redirect==='manual'&&!a.opts.headers.cookie));
 assert.ok(f.appels.some(a=>a.url==='https://mouvement-sde.org/'));
 assert.ok(f.appels.some(a=>a.url==='https://app.mouvement-sde.org/administration'));
});

test('Recette production : toute fuite de page privée ou redirection externe échoue',async()=>{
 for(const param of [{pagePriveExposee:true},{lienExterne:true}]){
   const f=simulateur(param);
   const bilan=await recetteProduction({fetcher:f.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type==='redirection-membre'),essais:1});
   assert.equal(bilan.ok,false);
   assert.equal(bilan.reussis,0);
 }
});

test('Recette production : CSS obsolète et session anonyme connectée échouent',async()=>{
 for(const param of [{styleObsolete:true,type:'style'},{sessionExposee:true,type:'session-anonyme'}]){
   const f=simulateur(param);
   const bilan=await recetteProduction({fetcher:f.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type===param.type),essais:1});
   assert.equal(bilan.ok,false);
   assert.equal(bilan.reussis,0);
 }
});

test('Recette production : une panne d’un domaine est signalée sans masquer l’autre',async()=>{
 const f=simulateur({erreurDomaine:true});
 const bilan=await recetteProduction({fetcher:f.fetcher,essais:1});
 assert.equal(bilan.total,DOMAINES.length*CONTROLES.length);
 assert.equal(bilan.reussis,CONTROLES.length);
 assert.equal(bilan.ok,false);
 assert.ok(bilan.resultats.some(r=>r.domaine===DOMAINES[1]&&!r.ok&&r.erreur.includes('DNS')));
});

test('Recette production : les erreurs réseau transitoires sont réessayées',async()=>{
 const f=simulateur();let first=true,delais=[];
 const fetcher=async(...args)=>{if(first){first=false;throw Error('Timeout réseau')}return f.fetcher(...args)};
 const bilan=await recetteProduction({fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.slice(0,1),essais:2,attente:async ms=>delais.push(ms)});
 assert.equal(bilan.ok,true);
 assert.deepEqual(delais,[1000]);
});

test('Recette production : bandeau obsolète et anciens styles d’événement détectés',async()=>{
 for(const [param,type] of [[{marqueObsolete:true},'marque-application'],[{stylePilotageObsolete:true},'style-pilotage']]){
   const f=simulateur(param);
   const bilan=await recetteProduction({fetcher:f.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type===type),essais:1});
   assert.equal(bilan.ok,false);
   assert.equal(bilan.reussis,0);
 }
});

test('Recette production : feuille globale ou pages non actualisées détectées',async()=>{
 const f=simulateur({siteObsolete:true});
 const kinds=['styles-site','page-publique'];
 for(const type of kinds){
   const bilan=await recetteProduction({fetcher:f.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type===type).slice(0,1),essais:1});
   assert.equal(bilan.reussis,0);
   assert.equal(bilan.ok,false);
 }
});

test('Recette production : cibler les fichiers versionnés de Cloudflare',async()=>{
 const avant=process.env.SDE_EXPECTED_REV;
 try{
  process.env.SDE_EXPECTED_REV='abcdef1234567890';
  const f=simulateur();
  const kinds=['marque-application','style-pilotage'];
  const bilan=await recetteProduction({
   fetcher:f.fetcher,domaines:[DOMAINES[0]],
   controles:CONTROLES.filter(x=>kinds.includes(x.type)),
   essais:1
  });
  assert.equal(bilan.ok,true);
  assert.equal(bilan.total,2);
  assert.ok(f.appels.every(x=>new URL(x.url).pathname.startsWith('/_v/abcdef123456/')));
 }finally{
  if(avant===undefined)delete process.env.SDE_EXPECTED_REV;
  else process.env.SDE_EXPECTED_REV=avant;
 }
});

test('Recette Academy 2027 : catalogue 24 cours et protection des sessions sur les deux domaines',async()=>{
 const f=simulateur(),kinds=['academy-public','academy-redirection-membre','academy-redirection-admin','academy-api-protegee'];
 const checks=CONTROLES.filter(x=>kinds.includes(x.type));
 assert.equal(checks.length,8);
 const bilan=await recetteProduction({fetcher:f.fetcher,controles:checks,essais:1});
 assert.equal(bilan.ok,true);
 assert.equal(bilan.total,16);
 assert.ok(f.appels.every(x=>x.opts.method==='GET'&&x.opts.redirect==='manual'&&!x.opts.headers.cookie));
});
test('Recette Academy 2027 : refus de fuite, de catalogue ancien et de perte de retour direct',async()=>{
 const tests=[
   [{academyExposee:true},'academy-api-protegee'],
   [{academyCatalogueObsolete:true},'academy-public'],
   [{academyRetourPerdu:true},'academy-redirection-membre'],
   [{academyRetourPerdu:true},'academy-redirection-admin']
 ];
 for(const [options,type] of tests){
   const f=simulateur(options);
   const b=await recetteProduction({fetcher:f.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type===type),essais:1});
   assert.equal(b.ok,false,'Une régression '+type+' ne doit pas réussir');
   assert.equal(b.reussis,0);
 }
});

test('Recette Academy : studio et publication des supports, version effective du script sur les deux domaines',async()=>{
 const f=simulateur();
 const controle=CONTROLES.filter(c=>c.type==='academy-script'||c.path==='/mon-espace/enseignants'||c.path==='/api/soldiers-academy/ressources/etat'||c.path==='/api/soldiers-academy/love-school');
 assert.equal(controle.length,4);
 const bilan=await recetteProduction({fetcher:f.fetcher,controles:controle,essais:1});
 assert.equal(bilan.total,8);
 assert.equal(bilan.ok,true);
 const ancien=simulateur({academyScriptObsolete:true});
 const ref=await recetteProduction({fetcher:ancien.fetcher,domaines:[DOMAINES[0]],controles:CONTROLES.filter(c=>c.type==='academy-script'),essais:1});
 assert.equal(ref.ok,false,'Un ancien script Academy en production ne doit pas être validé.');
});

test('Recette production : le bandeau TPA et les menus publics restent exclus du formulaire de connexion',async()=>{
 const controls=CONTROLES.filter(c=>c.type==='html-prive');
 const current=await recetteProduction({fetcher:simulateur().fetcher,domaines:[DOMAINES[0]],controles:controls,essais:1});
 assert.equal(current.ok,true);
 const old=await recetteProduction({fetcher:simulateur({loginBandeauObsolete:true}).fetcher,
  domaines:[DOMAINES[0]],controles:controls,essais:1});
 assert.equal(old.ok,false);
 assert.match(old.resultats[0].erreur,/navigation publique|bandeau/i);
});
