import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DOMAINES,CONTROLES,recetteProduction} from '../scripts/recette-production.mjs';

const html=(text,extra={})=>new Response('<!doctype html><title>SDE</title>'+text,{status:200,headers:{'content-type':'text/html; charset=UTF-8',...extra}});
function simulateur({pagePriveExposee=false,lienExterne=false,styleObsolete=false,sessionExposee=false,erreurDomaine=false}={}){
  const appels=[];
  const fetcher=async(url,opts)=>{
    const u=new URL(url),p=u.pathname;
    appels.push({url,opts});
    if(erreurDomaine&&u.hostname==='app.mouvement-sde.org')throw Error('DNS inaccessible');
    if(p==='/'){
      if(u.hostname==='app.mouvement-sde.org')return new Response(null,{status:302,headers:{location:u.origin+'/connexion?retour=%2Fportail'}});
      return html('<main>Le Mouvement SDE</main>');
    }
    if(p==='/connexion')return html('<form>Connexion mot de passe</form>',{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'});
    if(['/mon-espace','/administration'].includes(p))return pagePriveExposee
      ?html('Contenu confidentiel')
      :new Response(null,{status:302,headers:{location:(lienExterne?'https://autre-site.example':u.origin)+'/connexion?retour='+encodeURIComponent(p)}});
    if(p==='/api/moi')return Response.json({connecte:sessionExposee});
    if(p==='/api/notifications-status')return Response.json({erreur:'refuse'},{status:403});
    if(p.endsWith('.js'))return new Response('const id="sde-direct-tabs";',{headers:{'content-type':'text/javascript'}});
    if(p.endsWith('.css'))return new Response(styleObsolete?'.obsolete{}':'#sde-direct-menu-toggle{}',{headers:{'content-type':'text/css'}});
    throw Error('Route non prévue : '+p);
  };
  return {fetcher,appels};
}

test('Recette production : les deux domaines couvrent huit parcours GET sans authentification',async()=>{
 const f=simulateur(),rapports=[];
 const bilan=await recetteProduction({fetcher:f.fetcher,essais:1,rapport:r=>rapports.push(r)});
 assert.equal(bilan.total,16);
 assert.equal(bilan.reussis,16);
 assert.equal(bilan.ok,true);
 assert.equal(rapports.length,16);
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
 assert.equal(bilan.total,16);
 assert.equal(bilan.reussis,8);
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
