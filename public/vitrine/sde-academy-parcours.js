/* Soldiers Academy 2027 : 24 cours, session existante, corrections côté serveur. */
(()=>{
"use strict";
const api="/api/soldiers-academy";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let snapshot=null;
let activeCourse=null;
let gestion=null;
const text=(id,v)=>{const n=$(id);if(n)n.textContent=String(v??"");};
function alertMessage(message,id="status"){text(id,message);}
async function request(path,method="GET",payload){
 const opts={method,credentials:"same-origin",headers:{"accept":"application/json"}};
 if(payload!==undefined){opts.headers["content-type"]="application/json";opts.body=JSON.stringify(payload);}
 const r=await fetch(api+path,opts);
 let data;try{data=await r.json()}catch{throw Error("Réponse serveur non reconnue.")}
 if(!r.ok||!data.ok)throw Error(data.message||"Erreur de requête ("+r.status+")");
 return data;
}
function scoreText(value){return value===null||value===undefined?"À évaluer":value+"/100";}
function statusFor(c){
 if(c.passed)return '<span class="chip ok">Validé</span>';
 if(c.locked)return '<span class="chip">Niveau verrouillé</span>';
 if(c.pending?.length)return '<span class="chip pending">Correction en attente</span>';
 return '<span class="chip">En formation</span>';
}
function renderCatalogue(){
 const n=$("catalogue");
 const headings=["Fondations bibliques et identité","Équipement spirituel et ministériel","Leadership et commandement"];
 n.innerHTML=headings.map((title,i)=>{
   const c=snapshot.courses.filter(x=>x.level===i+1);
   return '<div class="level"><h2>Niveau '+(i+1)+' — '+esc(title)+'</h2><span class="chip">'+c.filter(x=>x.passed).length+' / 8 cours validés</span></div><div class="grid">'+
   c.map(x=>'<article class="card '+(x.passed?"passed ":"")+(x.locked?"locked":"")+'"><span class="code">'+esc(x.id)+' · 8 h</span><h3>'+esc(x.title)+'</h3>'+statusFor(x)+'<small>Quiz : '+esc(scoreText(x.quiz))+' · Travaux : '+esc(scoreText(x.exercises))+'<br>Examen : '+esc(scoreText(x.exam))+' · Présence : '+esc(x.attendance)+' %</small><button type="button" class="button '+(x.passed?"":"primary")+'" data-course="'+esc(x.id)+'" '+(x.locked?"disabled":"")+'>'+(x.locked?"Niveau précédent requis":"Ouvrir le cours →")+'</button></article>').join("")+'</div>';
 }).join("");
}
function renderCertificates(){
 const n=$("certificates");n.innerHTML="";
 for(const x of snapshot.certificates){
  const btn=document.createElement("button");btn.className="button";btn.textContent="Attestation · Niveau "+x.niveau;
  btn.addEventListener("click",()=>showCertificate(x.niveau));n.appendChild(btn);
 }
}
async function showCertificate(level){
 try{
   const x=await request("/attestation?niveau="+encodeURIComponent(level));
   const d=$("courseDetail");
   const title=x.level?.title||"Niveau "+level;
   d.innerHTML='<div class="eyebrow">Attestation interne · Soldiers Academy</div><h2>'+esc(title)+'</h2><p>Le Mouvement SDE atteste que <strong>'+esc(x.name)+'</strong> a validé le niveau '+level+' du parcours pédagogique 2027.</p><p><strong>Référence :</strong> '+esc(x.attestation.code)+'</p><p><strong>Date d’enregistrement :</strong> '+esc(new Date(x.attestation.delivree_le).toLocaleDateString("fr-FR"))+'</p><p class="muted">Attestation interne ne valant pas diplôme académique reconnu par l’État. Sous réserve de validation institutionnelle du programme.</p><button class="button primary" type="button" id="printCert">Imprimer cette attestation</button>';
   d.hidden=false;$("printCert").addEventListener("click",()=>window.print());d.scrollIntoView({behavior:"smooth"});
 }catch(e){alertMessage(e.message);}
}
function progress(){
 const v=snapshot.progress;
 text("statPassed",v.passed+" / 24");text("statPercent",v.percentage+" %");text("statCert",snapshot.certificates.length+" / 3");
 $("progressBar").value=v.passed;
 renderCatalogue();renderCertificates();$("studentPage").hidden=false;
 const admin=!!snapshot.admin;$("adminShortcut").hidden=!admin;$("adminPage").hidden=!admin;
}
function questionLabel(item,index,kind){
 const title=kind==="quiz"?item.question:kind==="exercises"?item.instruction:item.task;
 return '<label class="field"><strong>'+(index+1)+'. '+esc(title)+'</strong>'+(item.points?" <span class=\"muted\">("+item.points+" points)</span>":"")+'<textarea required minlength="12" maxlength="8000" name="answer'+index+'" placeholder="Rédigez une réponse argumentée et respectueuse…" aria-label="Réponse '+(index+1)+'"></textarea></label>';
}
function renderExerciseForm(course,kind,items,existing){
 const names={quiz:"Questionnaire biblique",exercises:"Travaux pratiques",exam:"Examen final"};
 const inProgress=existing.pending?.some(x=>x.type===kind);
 return '<form class="exam-form" data-submit="'+esc(kind)+'" data-course-id="'+esc(course.id)+'"><h3>'+names[kind]+'</h3><p class="muted">Répondez à toutes les questions. Le résultat est attribué après correction par un responsable habilité.</p>'+items.map((p,i)=>questionLabel(p,i,kind)).join("")+'<button class="button primary" type="submit" '+(inProgress?"disabled":"")+'>'+(inProgress?"Copie en attente de correction":"Remettre cette épreuve")+'</button></form>';
}
async function openCourse(id){
 try{
  alertMessage("Ouverture du cours "+id+"…");
  const d=await request("/cours/"+encodeURIComponent(id));const c=d.course;
  activeCourse=c;const s=snapshot.courses.find(x=>x.id===id);
  const panel=$("courseDetail");panel.hidden=false;
  panel.innerHTML='<div class="eyebrow">'+esc(c.id)+' · Niveau '+c.level+' · 8 heures</div><h2>'+esc(c.title)+'</h2><p>'+esc(c.purpose)+'</p><p><strong>Lectures bibliques :</strong> '+esc(c.refs)+'</p><h3>Objectifs pédagogiques</h3><ol class="numbered">'+c.goals.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol><h3>Les quatre leçons</h3>'+c.units.map(x=>'<div class="lesson"><div class="eyebrow">Leçon '+x.number+' · 90 minutes</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p><p class="muted"><strong>À lire :</strong> '+esc(x.scriptures)+'</p></div>').join("")+'<h3>Suivi des acquis</h3><p>Quiz : '+esc(scoreText(s.quiz))+' · Travaux : '+esc(scoreText(s.exercises))+' · Participation : '+esc(scoreText(s.participation))+' · Examen : '+esc(scoreText(s.exam))+' · Assiduité : '+esc(s.attendance)+' %</p><p><strong>Note finale :</strong> '+esc(scoreText(s.average))+' · '+(s.passed?"Cours validé":"Validation : 70/100 et au moins 80 % de présence")+'</p>'+renderExerciseForm(c,"quiz",c.quiz,s)+renderExerciseForm(c,"exercises",c.exercises,s)+renderExerciseForm(c,"exam",c.exam,s)+'<button class="button" type="button" id="backCourses">← Revenir à la liste</button>';
  $("backCourses").addEventListener("click",()=>{panel.hidden=true;$("catalogue").scrollIntoView({behavior:"smooth"});});
  panel.scrollIntoView({behavior:"smooth",block:"start"});alertMessage("Cours "+id+" ouvert.");
 }catch(e){alertMessage(e.message);}
}
async function submitCopy(form){
 const id=form.dataset.courseId,type=form.dataset.submit;
 if(!activeCourse||activeCourse.id!==id)return;
 const prompts=activeCourse[type];const answers=prompts.map((_,i)=>form.elements["answer"+i].value.trim());
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;
 try{
   await request("/soumettre","POST",{courseId:id,type,answers});
   alertMessage("Votre copie a été remise pour correction.");
   await reload();await openCourse(id);
 }catch(e){alertMessage(e.message);btn.disabled=false;}
}
function reviewHtml(item){
 const course=gestion.courses.find(x=>x.id===item.cours);
 let prompts=course?course.title:"Cours";
 return '<article class="review"><div class="eyebrow">'+esc(item.cours)+' · '+esc(item.type)+'</div><h3>'+esc(prompts)+'</h3><p>Apprenant : <strong>'+esc(item.nom)+'</strong> · Compte : <code>'+esc(item.compte)+'</code></p><p class="muted">Soumis le '+esc(new Date(item.date_soumission).toLocaleString("fr-FR"))+'</p><details><summary>Lire les réponses à corriger</summary>'+item.reponses.map((a,i)=>'<p class="muted">Réponse '+(i+1)+'</p><div class="correction">'+esc(a)+'</div>').join("")+'</details><form data-grade="'+esc(item.id)+'"><label class="field">Note sur 100<input type="number" name="score" min="0" max="100" required></label><label class="field">Commentaire du formateur<textarea name="comment" required minlength="3" maxlength="2000" placeholder="Justifiez la note et proposez une piste de progrès"></textarea></label><button class="button primary" type="submit">Valider la correction</button></form></article>';
}
async function loadGestion(){
 try{
  gestion=await request("/gestion");
  $("pendingCopies").innerHTML=gestion.pending.length?gestion.pending.map(reviewHtml).join(""):'<p class="muted">Aucune copie actuellement en attente.</p>';
  $("attendanceCourse").innerHTML=gestion.courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.id)+' — '+esc(c.title)+'</option>').join("");
  $("accountsList").innerHTML=[...new Set(gestion.students.map(x=>x.compte))].map(id=>'<option value="'+esc(id)+'"></option>').join("");
  alertMessage("Tableau des corrections actualisé.","adminStatus");
 }catch(e){alertMessage(e.message,"adminStatus");}
}
async function reload(){
 snapshot=await request("");progress();
}
document.addEventListener("click",ev=>{const btn=ev.target.closest("[data-course]");if(btn&&!btn.disabled)openCourse(btn.dataset.course);});
document.addEventListener("submit",async ev=>{
 const form=ev.target;if(!(form instanceof HTMLFormElement))return;
 if(form.dataset.submit){ev.preventDefault();await submitCopy(form);return;}
 if(form.dataset.grade){
  ev.preventDefault();const btn=form.querySelector("button");btn.disabled=true;
  try{
   await request("/noter","PATCH",{id:form.dataset.grade,score:Number(form.elements.score.value),comment:form.elements.comment.value});
   alertMessage("Copie notée.","adminStatus");await reload();await loadGestion();
  }catch(e){alertMessage(e.message,"adminStatus");btn.disabled=false;}
  return;
 }
 if(form.id==="attendanceForm"){
  ev.preventDefault();const b=new FormData(form),btn=form.querySelector("button");btn.disabled=true;
  try{
   await request("/assiduite","PATCH",{compte:b.get("compte"),courseId:b.get("courseId"),attendance:Number(b.get("attendance")),participation:Number(b.get("participation"))});
   alertMessage("Présence et participation enregistrées.","adminStatus");await reload();await loadGestion();
  }catch(e){alertMessage(e.message,"adminStatus");}finally{btn.disabled=false;}
 }
});
(async()=>{
 try{
  await reload();alertMessage("Bienvenue dans votre parcours Soldiers Academy 2027.");
  if(snapshot.admin)await loadGestion();
 }catch(e){
   alertMessage(e.message+" — connectez-vous à votre espace personnel.");
   $("studentPage").hidden=true;$("adminPage").hidden=true;
 }
})();
})();