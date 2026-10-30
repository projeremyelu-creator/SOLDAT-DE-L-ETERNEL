// Recette externe en lecture seule : contrôle le véritable Worker déployé.
// Aucune authentification, aucun envoi de formulaire ni aucune écriture D1.
import {pathToFileURL} from 'node:url';

export const DOMAINES = Object.freeze([
  'https://mouvement-sde.org',
  'https://app.mouvement-sde.org'
]);

export const CONTROLES = Object.freeze([
  {path:'/',type:'accueil'},
  {path:'/connexion',type:'html-prive'},
  {path:'/mon-espace',type:'redirection-membre'},
  {path:'/administration',type:'redirection-admin'},
  {path:'/api/moi',type:'session-anonyme'},
  {path:'/api/notifications-status',type:'statut-admin-protege'},
  {path:'/vitrine/portail-direct.js',type:'script'},
  {path:'/vitrine/portail-direct.css',type:'style'},
  {path:'/vitrine/operations-assets/portail-operations.js',type:'marque-application'},
  {path:'/vitrine/sde-experience.css',type:'style-pilotage'},
  {path:'/vitrine/sde-sitewide-2026.css',type:'styles-site'},
  {path:'/formulaire',type:'page-publique'},
  {path:'/boutique',type:'page-publique'},
  {path:'/mouvement',type:'page-publique'},
  {path:'/programmes',type:'page-publique'},
  {path:'/academy',type:'page-publique'},
  {path:'/enseignements',type:'page-publique'},
  {path:'/missions',type:'page-publique'},
  {path:'/priere',type:'page-publique'},
  {path:'/contact',type:'page-publique'},
  {path:'/temoignages',type:'page-publique'},
  {path:'/soldiers-voice',type:'page-publique'},
  {path:'/pole-reveil',type:'page-publique'},
  {path:'/pole-social',type:'page-publique'},
  {path:'/pole-logistique',type:'page-publique'},
  {path:'/pole-medias',type:'page-publique'},
  {path:'/pole-formation',type:'page-publique'},
  {path:'/missions-humanitaires',type:'page-publique'},
  {path:'/rubriques',type:'page-publique'},
]);

function verifierReponse(origine,controle,reponse,corps) {
  const type=(reponse.headers.get('content-type')||'').toLowerCase();
  const status=reponse.status;
  const lieu=reponse.headers.get('location');
  const erreur=message=>{throw Error(message+' (HTTP '+status+')')};

  if(controle.type==='accueil') {
    if(origine==='https://app.mouvement-sde.org') {
      if(status!==302)erreur('Le portail application doit rediriger un visiteur');
      const dest=new URL(lieu||'',origine);
      if(dest.origin!==origine||dest.pathname!=='/connexion')erreur('Redirection application inattendue');
    }else{
      if(status!==200||!type.includes('text/html'))erreur('Accueil public inaccessible ou non HTML');
      if(!/S\.?D\.?E\.?|Soldat De l[’']Éternel/i.test(corps))erreur('Accueil public inattendu');
    }
    return;
  }
  if(controle.type==='redirection-membre'||controle.type==='redirection-admin') {
    if(status!==302)erreur('Un visiteur non connecté ne doit pas lire la page privée');
    const dest=new URL(lieu||'',origine);
    const route=controle.type==='redirection-membre'?'/mon-espace':'/administration';
    if(dest.origin!==origine||dest.pathname!=='/connexion'||dest.searchParams.get('retour')!==route)
      erreur('Redirection privée incorrecte ou vers un autre domaine');
    return;
  }
  if(controle.type==='statut-admin-protege') {
    if(status!==403)erreur('Le statut des notifications doit être réservé au propriétaire');
    return;
  }
  if(controle.type==='session-anonyme') {
    if(status!==200||!type.includes('application/json'))erreur('API de session indisponible');
    let data;try{data=JSON.parse(corps)}catch{erreur('Réponse session non JSON')}
    if(data.connecte!==false)erreur('Session anonyme reconnue comme connectée');
    return;
  }
  if(status!==200)erreur('Ressource inaccessible');
  if(controle.type==='html-prive'){
    if(!type.includes('text/html'))erreur('Page connexion non HTML');
    if(!/connexion|mot de passe/i.test(corps))erreur('Formulaire de connexion introuvable');
    if(!/no-store/.test(reponse.headers.get('cache-control')||''))erreur('Formulaire de connexion mis en cache');
    if(!/noindex/i.test(reponse.headers.get('x-robots-tag')||''))erreur('Formulaire de connexion indexable');
  }
  if(controle.type==='marque-application'){
    if(!/javascript/i.test(type))erreur('Interface privée non servie en JavaScript');
    if(!corps.includes('SDE - MOUVEMENT'))erreur('Ancien bandeau détecté : la marque institutionnelle est absente du bundle');
  }
  if(controle.type==='style-pilotage'){
    if(!type.includes('text/css'))erreur('Styles du pilotage inaccessibles');
    if(!corps.includes('sde-feature-sheen')||!corps.includes('ref-feature'))
      erreur('Styles de contraste et animations du pilotage absents');
  }
  if(controle.type==='page-publique'){
    if(!type.includes('text/html'))erreur('Page publique non HTML');
    if(!corps.includes('/vitrine/sde-sitewide-2026.css'))erreur('Thème public global absent sur la page');
  }
  if(controle.type==='styles-site'){
    if(!type.includes('text/css'))erreur('Thème SDE global non servi');
    if(!corps.includes('--sde-forest')||!corps.includes('sde-further')||!corps.includes('sde-site-countdown-reveal'))
      erreur('Thème vert-or ou animations manquants');
  }
  if(controle.type==='script'){
    if(!/javascript/i.test(type))erreur('Script privé sans type JavaScript');
    if(!corps.includes('sde-direct-tabs'))erreur('Script de navigation SDE absent');
  }
  if(controle.type==='style'){
    if(!type.includes('text/css'))erreur('Feuille de style absente');
    if(!corps.includes('sde-direct-menu-toggle'))erreur('Navigation mobile compacte absente');
  }
}

export async function recetteProduction({fetcher=fetch,domaines=DOMAINES,controles=CONTROLES,essais=3,timeoutMs=12000,attente=ms=>new Promise(r=>setTimeout(r,ms)),rapport=()=>{}}={}) {
  const resultats=[];
  for(const origine of domaines){
    for(const controle of controles){
      // Le site charge les bundles via /_v/<sha>/ : vérifier le même actif
      // que celui réellement chargé par les navigateurs, pas une ancienne
      // réponse du cache Cloudflare sur l'URL non versionnée.
      const rev=String(process.env.SDE_EXPECTED_REV||'').replace(/[^a-f0-9]/gi,'').slice(0,12);
      const controleVersionne=rev&&['marque-application','style-pilotage'].includes(controle.type);
      const chemin=controleVersionne?'/_v/'+rev+controle.path:controle.path;
      const url=origine+chemin;
      let detail='';
      let reussi=false;
      for(let i=0;i<essais&&!reussi;i++){
        try{
          const response=await fetcher(url,{
            method:'GET',redirect:'manual',cache:'no-store',
            signal:AbortSignal.timeout(timeoutMs),
            headers:{'accept':'text/html, application/json, text/css, text/javascript, */*'}
          });
          const corps=controle.type==='redirection-membre'||controle.type==='redirection-admin'||(controle.type==='accueil'&&origine==='https://app.mouvement-sde.org')||controle.type==='statut-admin-protege'?'':await response.text();
          verifierReponse(origine,controle,response,corps);
          reussi=true;
        }catch(error){
          detail=String(error?.message||error).slice(0,240);
          if(i+1<essais)await attente(1000*(i+1));
        }
      }
      const resultat={domaine:origine,path:chemin,controle:controle.type,ok:reussi,...(!reussi?{erreur:detail}:{})};
      resultats.push(resultat);rapport(resultat);
    }
  }
  return {ok:resultats.every(r=>r.ok),reussis:resultats.filter(r=>r.ok).length,total:resultats.length,resultats};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const bilan=await recetteProduction({rapport:r=>console.log((r.ok?'OK  ':'ÉCHEC ')+r.domaine+r.path+(r.ok?'':' : '+r.erreur))});
  console.log('Bilan recette production SDE : '+bilan.reussis+'/'+bilan.total+' contrôles réussis');
  if(!bilan.ok)process.exitCode=1;
}
