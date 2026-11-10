/* Studio de publication SDE : interface admin, API /api/medias existante.
 * Aucun secret dans le navigateur. Les permissions sont vérifiées par le Worker.
 * Une ressource n'est visible publiquement que si un admin choisit "public".
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const TYPES=/\.(jpe?g|png|webp|gif|heic|mp4|m4v|mov|webm|mp3|m4a|aac|wav|ogg|pdf|docx?|pptx?|ppsx?|xlsx?|csv)$/i;
const CATS=["Soldiers TV","Prières et intercession","Missions humanitaires","Tenues SDE","Enseignements et documents","IN FIRE","Soldiers Voice","Témoignages"];
const state={medias:[],queue:[],espace:null,running:false,stop:false};
const format=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(n/1048576)+" Mo";
const tag=(name,cls,text)=>{const el=document.createElement(name);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const message=(text,error=false)=>{const el=$("auth-status");el.textContent=text;el.className="status "+(error?"error":"ok");};
async function request(path,opt={}){
 const r=await fetch(path,{credentials:"same-origin",cache:"no-store",...opt});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.erreur)throw Error(data.message||"L'opération n'a pas abouti (HTTP "+r.status+").");
 return data;
}
const post=(path,data)=>request(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
const url=m=>"/m/"+m.id+"/"+encodeURIComponent(m.nom);
function updateQuota(){
 const e=state.espace;
 $("quota").textContent=e
  ?"Stockage "+(e.stockage==="r2"?"Cloudflare R2":"Cloudflare KV")+" · "+format(e.utilise)+" utilisés sur "+format(e.total)+" · "+format(e.fichierMax)+" maximum par fichier."
  :"Espace indisponible : vérifiez la connexion au serveur.";
}
async function load(){
 const data=await request("/api/medias");
 state.medias=Array.isArray(data.medias)?data.medias:[];
 state.espace=data.espace||null;
 updateQuota();renderList();validateQueue();
}
function setQueue(files){
 if(state.running)return;
 state.queue=Array.from(files||[]);
 const box=$("selected-files");box.replaceChildren();
 const max=state.espace?.fichierMax||0;
 for(let i=0;i<state.queue.length;i++){
  const f=state.queue[i];
  const article=tag("div","file-selected");
  const label=tag("label","", "Titre de "+f.name);
  const title=tag("input","name-input");
  title.id="title-"+i;title.maxLength=160;
  title.value=f.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim().slice(0,160);
  label.htmlFor=title.id;label.append(title);
  const typeOk=TYPES.test(f.name),sizeOk=f.size>0&&(!max||f.size<=max);
  const error=!typeOk?"Format interdit":!sizeOk?"Fichier vide ou trop volumineux":"";
  article.append(label,tag("small","",f.name+" · "+format(f.size)+(error?" · "+error:"")));
  if(error)article.classList.add("error");
  box.append(article);
 }
 validateQueue();
}
function validateQueue(){
 const invalid=state.queue.some(f=>!TYPES.test(f.name)||f.size<=0||(state.espace&&f.size>state.espace.fichierMax));
 const publicChosen=$("media-visibility").value==="public";
 $("publication-consent").hidden=!publicChosen;
 const confirmed=!publicChosen||$("rights-confirm").checked;
 $("upload-button").disabled=state.running||!state.espace||!state.queue.length||invalid||!confirmed;
 $("upload-button").textContent=state.running?"Envoi en cours…":"Envoyer "+state.queue.length+" fichier"+(state.queue.length>1?"s":"");
}
function mediaCategory(m){return String(m.categorie||"")||"Sans rubrique";}
function renderList(){
 const list=$("library-list");list.replaceChildren();
 const filter=$("filter-files").value.toLocaleLowerCase("fr");
 const matches=state.medias.filter(m=>[m.titre,m.description,m.nom,m.categorie].join(" ").toLocaleLowerCase("fr").includes(filter));
 if(!matches.length){list.append(tag("p","help","Aucun fichier correspondant."));return;}
 for(const m of matches){
  const card=tag("article","media-card");
  const title=tag("h3","",m.titre||m.nom);
  const meta=tag("small","",mediaCategory(m)+" · "+format(m.taille)+" · "+(m.visibilite==="public"?"Public":m.visibilite==="responsables"?"Responsables":"Membres"));
  card.append(title,meta);
  if(m.genre==="image"){
   const img=tag("img");img.loading="lazy";img.alt=m.titre||m.nom;img.src=url(m);card.append(img);
  }
  if(m.genre==="video"){
   const video=tag("video");video.controls=true;video.preload="none";video.playsInline=true;video.setAttribute("aria-label",m.titre||m.nom);video.src=url(m);card.append(video);
  }
  const link=tag("a","",m.genre==="image"||m.genre==="video"?"Voir le fichier":"Ouvrir / télécharger");
  link.href=url(m);link.target="_blank";link.rel="noopener noreferrer";card.append(link);
  if(m.gerer){
   const catLabel=tag("label","label","Rubrique");
   const cat=tag("select");
   for(const c of CATS){const o=tag("option","",c);o.value=c;if(c===m.categorie)o.selected=true;cat.append(o);}
   if(!CATS.includes(m.categorie||"")){const o=tag("option","",m.categorie||"Sans rubrique");o.value=m.categorie||"";o.selected=true;cat.prepend(o);}
   catLabel.append(cat);
   const visLabel=tag("label","label","Visibilité");
   const vis=tag("select");
   for(const [id,label] of [["membres","Membres privés"],["responsables","Responsables privés"],["public","Public sur le site"]]){
    const o=tag("option","",label);o.value=id;if(id===m.visibilite)o.selected=true;vis.append(o);
   }
   visLabel.append(vis);
   const actions=tag("div","card-actions");
   const save=tag("button","secondary","Enregistrer");
   save.type="button";
   save.addEventListener("click",async()=>{
    if(vis.value==="public"&&m.visibilite!=="public"&&!confirm("Avez-vous les droits de diffusion pour publier ce fichier sur le site SDE ?"))return;
    save.disabled=true;
    try{await post("/api/medias/"+m.id,{titre:m.titre,description:m.description||"",categorie:cat.value,visibilite:vis.value});
     message("Publication enregistrée.");await load();
    }catch(e){message(e.message,true);}finally{save.disabled=false;}
   });
   const del=tag("button","secondary danger","Supprimer");
   del.type="button";
   del.addEventListener("click",async()=>{
    if(!confirm("Supprimer définitivement « "+m.titre+" » et son fichier du stockage SDE ?"))return;
    del.disabled=true;
    try{await request("/api/medias/"+m.id,{method:"DELETE"});message("Fichier supprimé.");await load();}
    catch(e){message(e.message,true);}finally{del.disabled=false;}
   });
   actions.append(save,del);
   card.append(catLabel,visLabel,actions);
  }
  list.append(card);
 }
}
function logEntry(file){
 const el=tag("div","upload-entry");
 const name=tag("strong","",file.name);
 const line=tag("small","","Préparation…");
 const progress=tag("progress");progress.max=100;progress.value=0;
 el.append(name,line,progress);$("upload-log").append(el);
 return {set(value,msg){progress.value=Math.max(0,Math.min(100,value));line.textContent=msg;},
  done(){el.classList.add("complete");progress.value=100;line.textContent="Fichier enregistré."},
  error(msg){el.classList.add("error");line.textContent=msg;}};
}
async function sendFile(file,index,metadata){
 let id=null;
 const entry=logEntry(file);
 try{
  const title=$("title-"+index)?.value.trim().slice(0,160)||file.name.replace(/\.[^.]+$/,"");
  const start=await post("/api/medias",{nom:file.name,taille:file.size,titre:title,description:metadata.description,
   categorie:metadata.categorie,visibilite:metadata.visibilite});
  id=start.id;
  const chunkSize=start.morceau;
  if(!/^[a-z0-9]{20}$/.test(id)||!Number.isSafeInteger(chunkSize)||chunkSize<=0||!Number.isSafeInteger(start.morceaux))throw Error("Initialisation incorrecte.");
  for(let chunk=0;chunk<start.morceaux;chunk++){
   const body=file.slice(chunk*chunkSize,Math.min(file.size,(chunk+1)*chunkSize));
   let ok=false,lastError="";
   for(let attempt=0;attempt<3;attempt++){
    try{
     const r=await request("/api/medias/"+id+"/"+chunk,{method:"PUT",body});
     if(r.ok){ok=true;break;}
    }catch(e){lastError=e.message;}
   }
   if(!ok)throw Error(lastError||"Morceau refusé, réessayez.");
   const percent=Math.round((chunk+1)/start.morceaux*100);
   entry.set(percent,percent+" % · "+format(Math.min(file.size,(chunk+1)*chunkSize))+" envoyés");
  }
  await request("/api/medias/"+id+"/fin",{method:"POST"});
  entry.done();return true;
 }catch(e){
  entry.error("Échec : "+e.message);
  if(id)await request("/api/medias/"+id,{method:"DELETE"}).catch(()=>{});
  return false;
 }
}
async function upload(ev){
 ev.preventDefault();
 if(state.running||$("upload-button").disabled)return;
 const files=state.queue.slice();
 const metadata={categorie:$("media-category").value,visibilite:$("media-visibility").value,
  description:$("media-description").value.trim().slice(0,2000)};
 if(metadata.visibilite==="public"&&!$("rights-confirm").checked){message("Confirmez les droits de diffusion avant de publier.",true);return;}
 state.running=true;state.stop=false;validateQueue();$("abort-button").hidden=false;
 $("upload-log").replaceChildren();
 let succeeded=0;
 for(let i=0;i<files.length;i++){
  if(state.stop)break;
  const ok=await sendFile(files[i],i,metadata);if(ok)succeeded++;
 }
 state.running=false;$("abort-button").hidden=true;
 const complete=succeeded===files.length;
 message(succeeded+" fichier(s) enregistré(s) sur "+files.length+(complete?".":". Vérifiez les erreurs ou relancez les fichiers restants."),!complete);
 if(complete){$("media-files").value="";state.queue=[];$("selected-files").replaceChildren();}
 try{await load();}catch(e){message(e.message,true);}
 validateQueue();
}
async function start(){
 try{
  const me=await request("/api/moi");
  if(!me.connecte||Number(me.niveau)<2){message("Accès réservé aux administrateurs autorisés.",true);return;}
  $("studio").hidden=false;
  message("Connecté comme "+(me.nom||"administrateur")+" · Publication sécurisée activée.");
  await load();
 }catch(e){message("Accès indisponible : "+e.message,true);}
}
$("media-files").addEventListener("change",ev=>setQueue(ev.target.files));
const drop=$("dropzone");
drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("media-files").click();}});
for(const name of ["dragenter","dragover"])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add("drag");});
for(const name of ["dragleave","drop"])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove("drag");});
drop.addEventListener("drop",e=>setQueue(e.dataTransfer?.files));
$("media-visibility").addEventListener("change",()=>{if($("media-visibility").value!=="public")$("rights-confirm").checked=false;validateQueue();});
$("rights-confirm").addEventListener("change",validateQueue);
$("upload-form").addEventListener("submit",upload);
$("abort-button").addEventListener("click",()=>{$("abort-button").disabled=true;state.stop=true;message("Arrêt demandé après le fichier en cours.");});
$("reload").addEventListener("click",()=>load().catch(e=>message(e.message,true)));
$("filter-files").addEventListener("input",renderList);
start();
})();