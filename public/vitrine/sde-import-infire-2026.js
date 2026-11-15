/* SDE Digital · Import guidé IN FIRE 2026
 * Lecture locale d'une archive ZIP préparée. Aucune publication sans consentement.
 * Exploite les API existantes du Studio SDE et respecte les droits serveur.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const state={archive:null,files:[],existing:[],limit:null,running:false,stop:false};
const manifestName="catalogue-a-importer.json";
const UPPER_LIMIT=35*1024*1024;
const num=n=>new Intl.NumberFormat("fr-FR").format(n);
function status(message,error=false){const e=$("etat");e.textContent=message;e.dataset.error=String(error);}
function create(tag,cls,value){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x;}
async function request(path,options={}){
 const r=await fetch(path,{credentials:"same-origin",cache:"no-store",...options});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.erreur)throw Error(j.message||"Erreur HTTP "+r.status);
 return j;
}
async function post(path,value){return request(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(value)});}
// ZIP standard (central directory). Ignore tous les chemins autres que les médias attendus.
function indexZip(input){
 const dv=new DataView(input),bytes=new Uint8Array(input),dec=new TextDecoder("utf-8",{fatal:true});
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}
 }
 if(eocd<0)throw Error("Archive ZIP invalide : répertoire final introuvable.");
 const count=dv.getUint16(eocd+10,true),offset=dv.getUint32(eocd+16,true);
 if(count<8||count>200||offset>=bytes.length)throw Error("Archive ZIP non conforme.");
 const table=new Map();let at=offset;
 for(let i=0;i<count;i++){
  if(at+46>bytes.length||dv.getUint32(at,true)!==0x02014b50)throw Error("Archive ZIP endommagée.");
  const method=dv.getUint16(at+10,true),compressed=dv.getUint32(at+20,true),size=dv.getUint32(at+24,true);
  const len=dv.getUint16(at+28,true),extra=dv.getUint16(at+30,true),comment=dv.getUint16(at+32,true);
  const header=dv.getUint32(at+42,true);
  if(size>UPPER_LIMIT||compressed>UPPER_LIMIT||len>300||at+46+len+extra+comment>bytes.length)throw Error("Entrée ZIP disproportionnée.");
  const name=dec.decode(bytes.subarray(at+46,at+46+len));
  if(name.includes("..")||name.startsWith("/")||name.includes("\\"))throw Error("Archive avec chemin non autorisé.");
  if(table.has(name))throw Error("Le ZIP contient un nom de fichier dupliqué.");
  table.set(name,{method,compressed,size,header});
  at+=46+len+extra+comment;
 }
 return {dv,bytes,table};
}
async function unzip(zip,name){
 const e=zip.table.get(name);if(!e)throw Error("Fichier attendu manquant dans l'archive : "+name);
 const {dv,bytes}=zip;
 if(e.header+30>bytes.length||dv.getUint32(e.header,true)!==0x04034b50)throw Error("En-tête ZIP invalide.");
 const start=e.header+30+dv.getUint16(e.header+26,true)+dv.getUint16(e.header+28,true);
 if(start+e.compressed>bytes.length)throw Error("Fichier ZIP tronqué.");
 const packed=bytes.subarray(start,start+e.compressed);
 let unpacked;
 if(e.method===0)unpacked=packed.slice();
 else if(e.method===8){
  if(typeof DecompressionStream!=="function")throw Error("Ce navigateur ne prend pas en charge les archives ZIP. Utilisez une version récente de Chrome ou Edge.");
  const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  unpacked=new Uint8Array(await new Response(stream).arrayBuffer());
 }else throw Error("Mode de compression ZIP non reconnu.");
 if(unpacked.length!==e.size)throw Error("Fichier ZIP incomplet : "+name);
 return unpacked;
}
function planned(manifest){
 if(!Array.isArray(manifest?.photos)||!Array.isArray(manifest?.videos)||!manifest.autre_photo)throw Error("Le manifeste de l'archive est incomplet.");
 if(manifest.photos.length!==4||manifest.videos.length!==3)throw Error("L'archive doit comprendre 4 photos et 3 clips IN FIRE.");
 const items=[];
 function add(url,title,alt,cat){
  if(typeof url!=="string"||typeof title!=="string"||typeof alt!=="string")throw Error("Métadonnées invalides.");
  const pattern=cat==="IN FIRE"?/^\/vitrine\/albums\/infire\/2026\/infire-2026-(?:0[1-4]|video-0[1-3])\.(?:webp|mp4)$/:
   /^\/vitrine\/photos\/tenues-sde-membres-2026\.webp$/;
  if(!pattern.test(url))throw Error("Chemin média non autorisé : "+url);
  items.push({path:"public"+url,nom:url.split("/").pop(),titre:cat==="IN FIRE"?"IN FIRE 2026 · "+title:title,
   description:cat==="IN FIRE"?"IN FIRE 2026 — "+alt:alt,categorie:cat,mime:url.endsWith(".webp")?"image/webp":"video/mp4"});
 }
 for(const p of manifest.photos)add(p.image,p.titre,p.alt,"IN FIRE");
 for(const v of manifest.videos)add(v.video,v.titre,v.alt,"IN FIRE");
 add(manifest.autre_photo.image,manifest.autre_photo.titre,"Photographie de membres portant les tenues du Mouvement SDE ; événement non précisé.","Tenues SDE");
 if(new Set(items.map(x=>x.path)).size!==8)throw Error("Fichiers dupliqués dans le manifeste.");
 return items;
}
// États observés dans la médiathèque publique, jamais des valeurs de la maquette.
const expectedInFire=new Set([
 "infire-2026-01.webp","infire-2026-02.webp","infire-2026-03.webp","infire-2026-04.webp",
 "infire-2026-video-01.mp4","infire-2026-video-02.mp4","infire-2026-video-03.mp4"
]);
const expectedTenues="tenues-sde-membres-2026.webp";
function publicationStatus(items){
 const list=Array.isArray(items)?items:[];
 const namesInFire=new Set(list.filter(x=>x?.visibilite==="public"&&x.categorie==="IN FIRE"&&expectedInFire.has(x.nom)).map(x=>x.nom));
 const tenues=list.some(x=>x?.visibilite==="public"&&x.categorie==="Tenues SDE"&&x.nom===expectedTenues);
 const done=namesInFire.size+Number(tenues);
 const box=$("etat-publication");
 if(box){
  box.hidden=false;
  box.textContent="Publications réellement visibles : "+namesInFire.size+"/7 médias IN FIRE 2026, "+Number(tenues)+"/1 photo Tenues SDE — total "+done+"/8.";
 }
 state.existing=list;
 return {done,infire:namesInFire.size,tenues:Number(tenues)};
}
function render(){
 const list=$("liste");list.replaceChildren();
 for(const x of state.files){
  const li=create("li","asset");
  li.dataset.name=x.nom;
  const name=create("strong","",x.titre),detail=create("span","",x.categorie+" · "+(x.size/1048576).toFixed(2)+" Mo");
  const stateText=create("small","asset-status","Prêt à publier");
  li.append(name,detail,stateText);list.append(li);
 }
 $("resume").textContent=state.files.length?state.files.length+" médias préparés : 4 photos et 3 vidéos IN FIRE 2026, 1 photo Tenues SDE.":"Aucune archive analysée.";
 $("publier").disabled=!state.files.length||!$("droits").checked||state.running;
}
function note(name,msg,bad=false){
 const li=Array.from($("liste").children).find(x=>x.dataset.name===name);
 const e=li?.querySelector(".asset-status");if(e){e.textContent=msg;e.dataset.error=String(bad);}
}
async function analyse(file){
 state.files=[];render();
 if(!file){status("Sélectionnez une archive ZIP.");return;}
 if(!/\.zip$/i.test(file.name)||file.size>12*1024*1024||file.size<1000)throw Error("Choisissez l'archive ZIP IN FIRE 2026 fournie (12 Mo maximum).");
 const raw=await file.arrayBuffer(),zip=indexZip(raw);
 const manifestBytes=await unzip(zip,manifestName);
 const data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(manifestBytes));
 const entries=planned(data);
 let total=0;
 for(const entry of entries){
  const bytes=await unzip(zip,entry.path);
  const min=entry.mime==="image/webp"?3000:20000;
  if(bytes.byteLength<min)throw Error("Média incomplet : "+entry.nom);
  const fileOut=new File([bytes],entry.nom,{type:entry.mime,lastModified:Date.now()});
  total+=fileOut.size;
  state.files.push({...entry,file:fileOut,size:fileOut.size});
 }
 if(total>UPPER_LIMIT)throw Error("Archive trop importante pour cet import.");
 state.archive=file.name;render();status("Archive analysée. Publication non commencée : cochez la confirmation des droits à l'image.");
}
async function envoyer(item){
 let id=null;
 try{
  const init=await post("/api/medias",{nom:item.nom,taille:item.size,titre:item.titre,description:item.description,categorie:item.categorie,visibilite:"public"});
  id=init.id;
  if(!/^[a-z0-9]{20}$/.test(id)||!Number.isSafeInteger(init.morceau)||init.morceau<=0||!Number.isSafeInteger(init.morceaux))throw Error("Session de transfert invalide.");
  for(let n=0;n<init.morceaux;n++){
   const body=item.file.slice(n*init.morceau,Math.min(item.size,(n+1)*init.morceau));
   let done=false,lastError;
   for(let retry=0;retry<3;retry++){
    try{const part=await request("/api/medias/"+id+"/"+n,{method:"PUT",body});if(part.ok){done=true;break;}}
    catch(e){lastError=e;}
   }
   if(!done)throw lastError||Error("Morceau "+n+" refusé.");
   note(item.nom,Math.round((n+1)*100/init.morceaux)+" % envoyés");
  }
  await request("/api/medias/"+id+"/fin",{method:"POST"});
  note(item.nom,"Publié et vérifié par le serveur.");
  return {ok:true,id};
 }catch(e){
  note(item.nom,"Échec : "+e.message,true);
  if(id)await request("/api/medias/"+id,{method:"DELETE"}).catch(()=>{});
  return {ok:false};
 }
}
async function upload(){
 if(state.running||!state.files.length||!$("droits").checked)return;
 state.running=true;state.stop=false;$("publier").disabled=true;$("arreter").hidden=false;
 $("droits").disabled=true;
 let existing;
 try{
  const me=await request("/api/moi");
  if(!me.connecte||Number(me.niveau)<2)throw Error("Session administrateur expirée.");
  const data=await request("/api/medias");
  existing=Array.isArray(data.medias)?data.medias:[];
  publicationStatus(existing);
  state.limit=data.espace||state.limit;
  if(!state.limit)throw Error("Impossible de vérifier l'espace de stockage.");
 }catch(e){state.running=false;$("publier").disabled=false;$("arreter").hidden=true;$("droits").disabled=false;status(e.message,true);return;}
 let success=0,skipped=0,errors=0;
 for(const item of state.files){
  if(state.stop)break;
  if(existing.some(x=>x.nom===item.nom&&x.categorie===item.categorie&&x.visibilite==="public")){
   note(item.nom,"Déjà publié : aucun doublon créé.");skipped++;continue;
  }
  if(item.size>state.limit.fichierMax){note(item.nom,"Fichier au-dessus du quota unitaire.",true);errors++;continue;}
  status("Publication "+item.nom+"…");
  const r=await envoyer(item);
  if(r.ok){success++;existing.push({nom:item.nom,categorie:item.categorie,visibilite:"public"});}
  else errors++;
 }
 state.running=false;$("arreter").hidden=true;$("arreter").disabled=false;
 $("droits").disabled=false;$("publier").disabled=!state.files.length||!$("droits").checked;
 const suffix=state.stop?" (interrompu volontairement)":"";
 status(num(success)+" nouveaux médias publiés ; "+num(skipped)+" déjà présents ; "+num(errors)+" échec(s)."+suffix,errors>0);
 // Vérifier après transfert que les huit fichiers sont effectivement publics.
 const verified=await request("/api/medias").then(data=>publicationStatus(data.medias)).catch(()=>null);
 if(errors===0&&!state.stop&&verified?.done===8)$("confirmation").hidden=false;
 else if(!verified)status("Import terminé : impossible de confirmer la liste publique. Actualisez la page pour vérifier.",true);
 else if(!state.stop&&verified.done<8)status("Import terminé, mais "+(8-verified.done)+" média(s) attendu(s) restent à publier. Réessayez uniquement les fichiers manquants.",true);
}
async function start(){
 try{
  const me=await request("/api/moi");
  if(!me.connecte||Number(me.niveau)<2)throw Error("Accès réservé aux administrateurs connectés.");
  const data=await request("/api/medias");
  state.limit=data.espace||null;
  publicationStatus(data.medias);
  if(!state.limit)throw Error("Quota de la médiathèque indisponible.");
  $("connecte").hidden=false;
  status("Connecté à la médiathèque SDE. Vous pouvez sélectionner l'archive.");
 }catch(e){status(e.message,true);}
}
$("zip").addEventListener("change",async e=>{try{await analyse(e.target.files?.[0]);}catch(err){state.files=[];render();status("Archive refusée : "+err.message,true);}});
$("droits").addEventListener("change",render);
$("publier").addEventListener("click",upload);
$("arreter").addEventListener("click",()=>{state.stop=true;$("arreter").disabled=true;status("Arrêt demandé après le fichier en cours.");});
start();
})();