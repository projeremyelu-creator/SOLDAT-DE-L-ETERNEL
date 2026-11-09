/* Gate de publication SDE : refuse d'annoncer un déploiement terminé lorsque
 * l'ancienne version est encore servie sur l'un des domaines.
 * Uniquement des GET anonymes et sans données personnelles. */
import {pathToFileURL} from 'node:url';
export const DOMAINES_PUBLICATION=Object.freeze([
 'https://mouvement-sde.org',
 'https://app.mouvement-sde.org'
]);
const SOURCES=Object.freeze([
 ['/api/sante','json'],['/soldier-quest','quest'],['/soldiers-tv','tv']
]);
export function revisionAttendue(env=process.env){
 const rev=String(env.SDE_EXPECTED_REV||env.GITHUB_SHA||'').trim().slice(0,12).toLowerCase();
 if(!/^[a-f0-9]{12}$/.test(rev))throw Error('Révision GitHub attendue absente ou invalide.');
 return rev;
}
export async function verifierDomaine({domaine,rev,fetcher=fetch}){
 const origin=new URL(domaine);
 const result={domaine,rev,ok:false,detail:''};
 for(const [path,type] of SOURCES){
  // Les requêtes sont isolées par révision : un cache de page 404 antérieur
  // ne doit pas passer pour la version active.
  const u=new URL(path,origin);
  u.searchParams.set('_sde_revision',rev);
  let response,body;
  try{
   response=await fetcher(u.toString(),{
    method:'GET',redirect:'manual',cache:'no-store',
    headers:{'cache-control':'no-cache','pragma':'no-cache'},
    signal:AbortSignal.timeout(10000)
   });
   if(response.status!==200){result.detail=path+' : HTTP '+response.status;return result;}
   body=await response.text();
   if(type==='json'){
    const data=JSON.parse(body);
    if(data?.assetRevision!==rev){
     result.detail=path+' : révision '+String(data?.assetRevision||'inconnue').slice(0,20);
     return result;
    }
   }else{
    const id=type==='quest'?'quest-title':'tv-title';
    if(!response.headers.get('content-type')?.includes('text/html')||
       !body.includes('id="'+id+'"')){
     result.detail=path+' : contenu ancien, invalide ou page 404';
     return result;
    }
   }
  }catch(error){
   result.detail=path+' : '+String(error?.message||error).slice(0,100);
   return result;
  }
 }
 // Asset réellement versionné : il ne peut pas être servi par un Worker plus ancien.
 const css=new URL('/_v/'+rev+'/vitrine/sde-digital-universe.css',origin);
 try{
  const response=await fetcher(css.toString(),{
   method:'GET',cache:'no-store',redirect:'manual',
   headers:{'cache-control':'no-cache'},
   signal:AbortSignal.timeout(10000)
  });
  if(response.status!==200||!response.headers.get('content-type')?.includes('text/css')){
   result.detail='CSS de la révision '+rev+' : HTTP '+response.status;return result;
  }
  const body=await response.text();
  if(!body.includes('SDE Digital Universe 2027')){
   result.detail='CSS Digital Universe non publié';return result;
  }
 }catch(error){
  result.detail='CSS : '+String(error?.message||error).slice(0,100);
  return result;
 }
 result.ok=true;result.detail='Pages Quest et TV, Worker et CSS publiés';
 return result;
}
export async function attendrePublication({rev=revisionAttendue(),domaines=DOMAINES_PUBLICATION,
 fetcher=fetch,tempsMaxMs=17*60*1000,intervalleMs=15000,
 attendre=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 rapport=line=>console.log(line),maintenant=()=>Date.now()}={}){
 const debut=maintenant();
 let essais=0,last=[];
 while(true){
  essais++;
  last=await Promise.all(domaines.map(domaine=>verifierDomaine({domaine,rev,fetcher})));
  if(last.every(x=>x.ok)){
   rapport('PUBLICATION_VERIFIEE '+JSON.stringify({revision:rev,essais,domaines:last.map(x=>x.domaine)}));
   return {ok:true,essais,last};
  }
  rapport('PUBLICATION_EN_ATTENTE '+JSON.stringify({
   revision:rev,essais,etat:last.map(x=>({domaine:x.domaine,ok:x.ok,detail:x.detail}))
  }));
  const reste=tempsMaxMs-(maintenant()-debut);
  if(reste<=0)break;
  await attendre(Math.min(intervalleMs,reste));
 }
 rapport('PUBLICATION_ECHEC '+JSON.stringify({revision:rev,essais,etat:last}));
 return {ok:false,essais,last};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await attendrePublication();
  if(!result.ok)process.exitCode=1;
 }catch(error){console.error('PUBLICATION_ECHEC '+String(error.message||error));process.exitCode=1;}
}
