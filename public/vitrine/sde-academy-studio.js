/* Studio Soldiers Academy 2027 — toutes les mutations sont validées par le Worker. */
(()=>{"use strict";
const endpoint="/api/soldiers-academy/contenus";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let studio=null,editing="",draftFile=null;
const status=(id,txt)=>{const n=$(id);if(n)n.textContent=txt;};
async function api(path="",method="GET",data){
 const opt={method,credentials:"same-origin",headers:{accept:"application/json"}};
 if(data!==undefined){opt.headers["content-type"]="application/json";opt.body=JSON.stringify(data);}
 const r=await fetch(endpoint+path,opt);let j;try{j=await r.json()}catch{throw Error("Le serveur a renvoyé une réponse invalide.");}
 if(!r.ok||!j.ok)throw Error(j.message||"Erreur "+r.status);
 return j;
}
const form=()=> $("resourceForm");
const body=()=>{const f=new FormData(form());return {
 courseId:String(f.get("courseId")||""),lesson:Number(f.get("lesson")),kind:String(f.get("kind")),
 title:String(f.get("title")||"").trim(),description:String(f.get("description")||"").trim(),
 text:String(f.get("text")||"").trim(),url:String(f.get("url")||"").trim(),
 published:!!form().elements.published.checked
}};
function showCourses(){
 const choices=(studio.courses||[]).filter(x=>studio.admin||studio.assigned.includes(x.id));
 $("courseSelect").innerHTML=choices.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.id)+' — '+esc(x.title)+'</option>').join("");
 $("staffCourses").innerHTML=(studio.courses||[]).map(x=>'<label><input type="checkbox" name="scope" value="'+esc(x.id)+'"><span>'+esc(x.id)+' — '+esc(x.title)+'</span></label>').join("");
}
function card(r){
 return '<article class="record"><div class="row"><span class="badge '+(r.published?'ok':'')+'">'+(r.published?"Publiée":"Brouillon")+'</span><small>'+esc(r.courseId)+' · '+esc(r.kind)+(r.lesson?' · Leçon '+r.lesson:'')+'</small></div><h3>'+esc(r.title)+'</h3><p>'+esc(r.description||r.text.slice(0,130))+'</p>'+(r.hasFile?'<p>Pièce jointe : <strong>'+esc(r.fileName)+'</strong></p>':"")+
 '<div class="actions"><button class="button" type="button" data-edit="'+esc(r.id)+'">Modifier</button><button class="button" type="button" data-toggle="'+esc(r.id)+'">'+(r.published?"Masquer aux apprenants":"Publier")+'</button><button class="button danger" type="button" data-archive="'+esc(r.id)+'">Archiver</button></div></article>';
}
function draw(){
 if(!studio)return;
 $("studioRole").textContent="Habilitation : "+(studio.admin?"Direction pédagogique":studio.role);
 $("studioCourses").textContent=studio.admin?"Accès à tous les 24 cours du référentiel.":"Cours attribués : "+studio.assigned.join(", ");
 $("staffPanel").hidden=!studio.admin;
 $("studioList").innerHTML=(studio.resources||[]).length?studio.resources.map(card).join(""):'<p class="empty">Aucune ressource créée pour le moment. Ajoutez votre première leçon.</p>';
 if(studio.admin){
  $("staffList").innerHTML=(studio.staff||[]).length?studio.staff.map(s=>'<article class="record"><div class="row"><strong>'+esc(s.name)+'</strong><span class="badge '+(s.active?"ok":"")+'">'+(s.active?"Actif":"Suspendu")+'</span></div><p>'+esc(s.role)+' · '+esc(s.account)+'</p><small>'+esc(s.assigned.join(", "))+'</small><div class="actions"><button type="button" class="button" data-staff-edit="'+esc(s.account)+'">Modifier l’attribution</button></div></article>').join(""):'<p class="empty">Aucun enseignant ni coach habilité.</p>';
 }
}
function resetForm(){
 form().reset();editing="";draftFile=null;$("editorTitle").textContent="Ajouter une ressource pédagogique";$("saveResource").textContent="Enregistrer et publier";status("editorStatus","");
}
function edit(id){
 const r=studio.resources.find(x=>x.id===id);if(!r)return;
 resetForm();editing=r.id;const f=form().elements;
 f.courseId.value=r.courseId;f.lesson.value=String(r.lesson);f.kind.value=r.kind;f.title.value=r.title;f.description.value=r.description;
 f.text.value=r.text;f.url.value=r.url;f.published.checked=r.published;
 $("editorTitle").textContent="Modifier : "+r.title;
 $("saveResource").textContent="Enregistrer les modifications";
 form().scrollIntoView({behavior:"smooth",block:"start"});form().elements.title.focus();
}
async function refresh(){
 studio=await api("/studio");$("studioRoot").hidden=false;$("accessDenied").hidden=true;
 showCourses();draw();status("studioStatus","Studio prêt. Les ressources publiées sont immédiatement visibles dans l'espace apprenant.");
}
async function upload(id,file){
 if(file.size>8*1024*1024)throw Error("Ce fichier dépasse 8 Mo. Pour une vidéo longue, indiquez son lien YouTube, Vimeo ou Google Drive.");
 const types={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",
  mp3:"audio/mpeg",m4a:"audio/mp4",mp4:"video/mp4",
  docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"};
 const ext=file.name.split(".").pop().toLowerCase(),mime=types[ext];
 if(!mime)throw Error("Format non pris en charge : PDF, image, Word, PowerPoint, MP3, M4A ou courte MP4.");
 const r=await fetch(endpoint+"/"+encodeURIComponent(id)+"/fichier",{method:"POST",credentials:"same-origin",headers:{"content-type":mime,"x-sde-filename":encodeURIComponent(file.name)},body:file});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.message||"Impossible d'envoyer ce fichier.");
 return j;
}
form().addEventListener("submit",async ev=>{
 ev.preventDefault();const btn=$("saveResource");btn.disabled=true;
 try{
  const resource=body(),file=form().elements.file.files?.[0]||null;
  if(file&&!["video","audio","document","cours"].includes(resource.kind))throw Error("Sélectionnez Vidéo, Audio ou Document pour envoyer ce fichier.");
  if(file&&file.size>8*1024*1024)throw Error("Taille maximale : 8 Mo.");
  const desiredPublished=resource.published;
  if(file)resource.published=false;
  let id=editing,created=false;
  if(editing){
   await api("/"+encodeURIComponent(id),"PATCH",resource);
  }else{
   const result=await api("","POST",resource);id=result.id;created=true;
  }
  if(file)await upload(id,file);
  if(file&&desiredPublished)await api("/"+encodeURIComponent(id),"PATCH",{published:true});
  resetForm();await refresh();
  status("editorStatus",desiredPublished?"Ressource publiée et visible pour tous les apprenants.":"Brouillon enregistré dans votre studio.");
 }catch(e){status("editorStatus",e.message);}finally{btn.disabled=false;}
});
$("resetResource").addEventListener("click",resetForm);
$("refreshStudio").addEventListener("click",async()=>{try{await refresh()}catch(e){status("studioStatus",e.message)}});
$("checkAllCourses").addEventListener("change",ev=>{$$("staffCourses input[name=scope]").forEach(x=>{x.checked=ev.target.checked;});});
function $$(s){return [...document.querySelectorAll(s)]}
$("staffForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const f=ev.target;const selected=$$("#staffCourses input[name=scope]:checked").map(x=>x.value);
 const payload={account:f.elements.account.value.trim(),role:f.elements.role.value,courses:selected,active:f.elements.active.checked};
 if(payload.active&&!selected.length){status("staffStatus","Sélectionnez au moins un cours.");return}
 const btn=f.querySelector('button[type="submit"]');btn.disabled=true;
 try{
  const r=await api("/equipe","POST",payload);status("staffStatus",r.message+" · "+r.name);
  f.reset();$("checkAllCourses").checked=false;await refresh();
 }catch(e){status("staffStatus",e.message)}finally{btn.disabled=false}
});
document.addEventListener("click",async ev=>{
 const editButton=ev.target.closest("[data-edit]");if(editButton){edit(editButton.dataset.edit);return;}
 const staffButton=ev.target.closest("[data-staff-edit]");
 if(staffButton){
  const r=studio.staff.find(x=>x.account===staffButton.dataset.staffEdit);if(!r)return;
  const f=$("staffForm").elements;f.account.value=r.account;f.role.value=r.role;f.active.checked=r.active;
  $$("#staffCourses input[name=scope]").forEach(x=>{x.checked=r.assigned.includes(x.value);});
  $("staffForm").scrollIntoView({behavior:"smooth"});return;
 }
 const toggle=ev.target.closest("[data-toggle]");
 if(toggle){
  const r=studio.resources.find(x=>x.id===toggle.dataset.toggle);if(!r)return;
  try{await api("/"+r.id,"PATCH",{published:!r.published});await refresh();status("studioStatus",r.published?"Ressource retirée de la bibliothèque des apprenants.":"Ressource publiée pour tous les apprenants.");}
  catch(e){status("studioStatus",e.message);}
  return;
 }
 const archive=ev.target.closest("[data-archive]");
 if(archive){
  const r=studio.resources.find(x=>x.id===archive.dataset.archive);if(!r)return;
  if(!confirm("Archiver cette ressource ? Elle ne sera plus visible des apprenants."))return;
  try{await api("/"+r.id,"DELETE");await refresh();status("studioStatus","Ressource archivée.");}
  catch(e){status("studioStatus",e.message)}
 }
});
(async()=>{
 try{await refresh()}catch(e){
  $("studioRoot").hidden=true;$("accessDenied").hidden=false;
  status("studioStatus",e.message);
 }
})();
})();
