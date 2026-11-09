/* Diagnostic public en lecture seule des versions Cloudflare. Aucun secret ni donnée membre. */
import {pathToFileURL} from 'node:url';
export const urls = [
 'https://sde.projeremyelu.workers.dev/api/sante',
 'https://sde.projeremyelu.workers.dev/soldier-quest',
 'https://mouvement-sde.org/api/sante',
 'https://mouvement-sde.org/api/sante?controle=revision-149d9548dce4',
 'https://mouvement-sde.org/soldier-quest',
 'https://mouvement-sde.org/soldier-quest?controle=revision-149d9548dce4',
 'https://mouvement-sde.org/soldiers-tv?controle=revision-149d9548dce4',
 'https://mouvement-sde.org/vitrine/soldier-quest.html',
 'https://mouvement-sde.org/_v/149d9548dce4/vitrine/sde-digital-universe.css',
 'https://app.mouvement-sde.org/api/sante'
];
export async function probe(url,fetcher=fetch){
 try {
  const response=await fetcher(url,{
   headers:{'cache-control':'no-cache','pragma':'no-cache','user-agent':'SDE-Public-Routing-Diagnostic/1.0'},
   redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)
  });
  const body=await response.text();
  let revision='';
  try{revision=String(JSON.parse(body)?.assetRevision||'')}catch{
   revision=(body.match(/\/_v\/([a-f0-9]{12})\//)||[])[1]||'';
  }
  return {url,status:response.status,revision,location:response.headers.get('location'),
   cache:response.headers.get('cf-cache-status'),age:response.headers.get('age'),
   contentType:response.headers.get('content-type'),cdnRay:response.headers.get('cf-ray')?.slice(0,16),
   title:(body.match(/<title[^>]*>([^<]*)/i)||[])[1]||'',length:body.length};
 }catch(error){return{url,error:String(error?.message||error).slice(0,150)}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const url of urls)console.log('DIAGNOSTIC_PUBLIC '+JSON.stringify(await probe(url)));
}
