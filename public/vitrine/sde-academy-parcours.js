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
  const btn=document.createElement("button");btn.className="button";btn.textContent=x.niveau===4?"Certificat de parcours":"Attestation · Niveau "+x.niveau;
  btn.addEventListener("click",()=>showCertificate(x.niveau));n.appendChild(btn);
 }
}
async function showCertificate(level){
 try{
   const x=await request("/attestation?niveau="+encodeURIComponent(level));
   const d=$("courseDetail");
   const title=x.level?.title||"Niveau "+level;
   d.innerHTML='<div class="eyebrow">Attestation interne · Soldiers Academy</div><h2>'+esc(title)+'</h2><p>Le Mouvement SDE atteste que <strong>'+esc(x.name)+'</strong> a validé '+(level===4?'les 24 cours et le projet intégrateur':'le niveau '+level)+' du parcours pédagogique 2027.</p><p><strong>Référence :</strong> '+esc(x.attestation.code)+'</p><div class="qr" id="certQr" role="img" aria-label="QR code de vérification"></div><p class="muted">Vérification publique : '+esc(location.origin)+'/verifier-attestation</p><p><strong>Date d’enregistrement :</strong> '+esc(new Date(x.attestation.delivree_le).toLocaleDateString("fr-FR"))+'</p><p class="muted">Attestation interne ne valant pas diplôme académique reconnu par l’État. Elle est vérifiable en ligne grâce au numéro ci-dessus.</p><button class="button primary" type="button" id="printCert">Imprimer cette attestation</button>';
   d.hidden=false;$("printCert").addEventListener("click",()=>window.print());
   try{if(typeof qrcode==="function"){const q=qrcode(0,"M");q.addData(location.origin+"/verifier-attestation?code="+encodeURIComponent(x.attestation.code));q.make();$("certQr").innerHTML=q.createSvgTag(4,0);}}catch{}
   d.scrollIntoView({behavior:"smooth"});
 }catch(e){alertMessage(e.message);}
}
function progress(){
 const v=snapshot.progress;
 text("statPassed",v.passed+" / 24");text("statPercent",v.percentage+" %");text("statCert",snapshot.certificates.filter(x=>x.niveau<=3).length+" / 3");
 $("progressBar").value=v.passed;
 renderCatalogue();renderCertificates();renderAvis();renderProjet();renderCohortes();renderSpecialisations();$("studentPage").hidden=false;
 const admin=!!snapshot.admin;$("adminShortcut").hidden=!admin;$("adminPage").hidden=!admin;
}
function renderAvis(){
 const n=$("avis"),list=snapshot.avis||[];
 if(!list.length){n.hidden=true;n.innerHTML="";return;}
 n.hidden=false;
 n.innerHTML='<strong>Nouveautés</strong>'+list.map(a=>'<p>'+esc(new Date(a.cree).toLocaleDateString("fr-FR"))+' — '+esc(a.texte)+'</p>').join("")+'<button type="button" class="button" data-avis-lus>Marquer comme lu</button>';
}
function renderProjet(){
 const n=$("projetSection"),p=snapshot.projet;
 if(!p||!p.ouvert){n.hidden=true;n.innerHTML="";return;}
 n.hidden=false;
 let corps="";
 if(p.acquis)corps='<p><span class="chip ok">Projet validé</span> Note : '+esc(p.meilleur)+'/100.'+(snapshot.parcoursComplet?" Votre certificat de parcours est disponible ci-dessus.":"")+'</p>';
 else if(p.enAttente)corps='<p><span class="chip pending">Correction en attente</span> Remis le '+esc(new Date(p.soumisLe).toLocaleDateString("fr-FR"))+'. La soutenance (12 min + 8 min de questions) est fixée par la direction pédagogique.</p>';
 else corps=(p.dernier?'<p class="muted">Dernière note : '+esc(p.dernier.score)+'/100 — '+esc(p.dernier.commentaire)+' Vous pouvez remettre une version améliorée.</p>':"")+
  '<form id="projetForm"><p class="muted">Projet de service réellement utile à un pôle SDE. Rédigez chaque partie (40 caractères minimum).</p>'+
  p.criteres.map((c,i)=>'<label class="field"><strong>'+(i+1)+'. '+esc(c.libelle)+'</strong> <span class="muted">('+esc(c.points)+' points)</span><textarea required minlength="40" maxlength="8000" name="partie'+i+'" aria-label="'+esc(c.libelle)+'"></textarea></label>').join("")+
  '<button class="button primary" type="submit">Remettre mon projet</button></form>';
 n.innerHTML='<div class="eyebrow">Projet intégrateur</div><h2 id="projetTitre">Projet de fin de parcours</h2>'+corps;
}
function renderCohortes(){
 const n=$("cohortesList"),list=snapshot.cohortes||[];
 if(!list.length){n.innerHTML='<p class="muted">Aucune cohorte ouverte pour le moment. La direction pédagogique les annonce ici.</p>';return;}
 n.innerHTML=list.map(c=>'<article class="review"><div class="eyebrow">Niveau '+esc(c.niveau)+' · '+esc(c.debut)+' → '+esc(c.fin)+'</div><h3>'+esc(c.nom)+'</h3><p class="muted">'+esc(c.effectif)+' inscrit(s)</p><details><summary>Calendrier des 8 semaines</summary>'+c.semaines.map(w=>'<div class="week"><b>Semaine '+esc(w.semaine)+' · '+esc(w.du.slice(5))+'</b><span>'+esc(w.cours)+' — '+esc(w.titre)+'</span></div>').join("")+'</details>'+
  (c.inscrit?'<button type="button" class="button" data-cohorte-quitter="'+esc(c.id)+'">Quitter la cohorte</button> <span class="chip ok">Inscrit</span>':(c.peutRejoindre?'<button type="button" class="button primary" data-cohorte-rejoindre="'+esc(c.id)+'">Rejoindre</button>':'<span class="chip">Niveau verrouillé</span>'))+'</article>').join("");
}
function renderSpecialisations(){
 const sp=snapshot.specialisations;if(!sp)return;
 text("specNote",sp.ouvertes?"Les 24 cours sont validés : vous pouvez choisir votre école de spécialisation auprès de la direction pédagogique.":"Accessibles après la validation des 24 cours du tronc commun.");
 $("specList").innerHTML=sp.ecoles.map(e=>'<article class="card"><span class="code">'+esc(e.code)+' · Pôle '+esc(e.pole)+'</span><h3>'+esc(e.titre)+'</h3><p>'+esc(e.objectif)+'</p><ul>'+e.ateliers.map(a=>'<li>'+esc(a[1])+'</li>').join("")+'</ul><small>Soutenance : '+esc(e.soutenance)+'</small></article>').join("");
 $("masterList").innerHTML=sp.masterclass.map(m=>'<article class="card"><span class="code">'+esc(m.code)+'</span><h3>'+esc(m.titre)+'</h3><p>'+esc(m.deroulement)+'</p><small>Livrable : '+esc(m.livrable)+'</small></article>').join("");
}
function renderCohortesAdmin(){
 const n=$("cohortesAdmin");if(!n||!gestion)return;
 const list=gestion.cohortes||[];
 n.innerHTML=list.length?list.map(c=>'<article class="review"><div class="eyebrow">Niveau '+esc(c.niveau)+' · début '+esc(c.debut)+' · '+(c.statut==="ouverte"?"ouverte":"close")+'</div><h3>'+esc(c.nom)+'</h3><p>'+esc(c.membres.length)+' inscrit(s) : '+(c.membres.map(m=>esc(m.nom)).join(", ")||"aucun")+'</p>'+(c.statut==="ouverte"?'<button type="button" class="button" data-cohorte-clore="'+esc(c.id)+'">Clore la cohorte</button>':"")+'</article>').join(""):'<p class="muted">Aucune cohorte créée.</p>';
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
 let prompts=item.cours==="PROJET"?"Projet intégrateur":course?course.title:"Cours";
 const aide=item.aide||{};
 const aideHtml=(aide.bareme||aide.corriges)?'<div class="help"><strong>Aide à la correction (réservée aux formateurs)</strong>'+(aide.bareme?'<p>'+esc(aide.bareme)+'</p>':"")+(aide.corriges?'<ol>'+aide.corriges.map((c,i)=>'<li>'+(aide.consignes&&aide.consignes[i]?'<em>'+esc(aide.consignes[i])+'</em><br>':"")+'Attendu : '+esc(c)+'</li>').join("")+'</ol>':(aide.consignes&&aide.consignes.length?'<ol>'+aide.consignes.map(c=>'<li>'+esc(c)+'</li>').join("")+'</ol>':""))+'</div>':"";
 return '<article class="review"><div class="eyebrow">'+esc(item.cours)+' · '+esc(item.type)+'</div><h3>'+esc(prompts)+'</h3><p>Apprenant : <strong>'+esc(item.nom)+'</strong> · Compte : <code>'+esc(item.compte)+'</code></p><p class="muted">Soumis le '+esc(new Date(item.date_soumission).toLocaleString("fr-FR"))+'</p><details><summary>Lire les réponses à corriger</summary>'+item.reponses.map((a,i)=>'<p class="muted">Réponse '+(i+1)+'</p><div class="correction">'+esc(a)+'</div>').join("")+'</details>'+aideHtml+'<form data-grade="'+esc(item.id)+'"><label class="field">Note sur 100<input type="number" name="score" min="0" max="100" required></label><label class="field">Commentaire du formateur<textarea name="comment" required minlength="3" maxlength="2000" placeholder="Justifiez la note et proposez une piste de progrès"></textarea></label><button class="button primary" type="submit">Valider la correction</button></form></article>';
}
async function loadGestion(){
 try{
  gestion=await request("/gestion");
  $("pendingCopies").innerHTML=gestion.pending.length?gestion.pending.map(reviewHtml).join(""):'<p class="muted">Aucune copie actuellement en attente.</p>';
  renderCohortesAdmin();
  $("attendanceCourse").innerHTML=gestion.courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.id)+' — '+esc(c.title)+'</option>').join("");
  $("accountsList").innerHTML=[...new Set(gestion.students.map(x=>x.compte))].map(id=>'<option value="'+esc(id)+'"></option>').join("");
  alertMessage("Tableau des corrections actualisé.","adminStatus");
 }catch(e){alertMessage(e.message,"adminStatus");}
}
async function reload(){
 snapshot=await request("");progress();
}
document.addEventListener("click",async ev=>{
 const btn=ev.target.closest("[data-course]");if(btn&&!btn.disabled){openCourse(btn.dataset.course);return;}
 const act=ev.target.closest("[data-avis-lus],[data-cohorte-rejoindre],[data-cohorte-quitter],[data-cohorte-clore]");if(!act)return;
 try{
  if(act.hasAttribute("data-avis-lus"))await request("/avis/lus","POST",{});
  else if(act.dataset.cohorteRejoindre)await request("/cohortes/rejoindre","POST",{id:act.dataset.cohorteRejoindre});
  else if(act.dataset.cohorteQuitter)await request("/cohortes/quitter","POST",{id:act.dataset.cohorteQuitter});
  else if(act.dataset.cohorteClore){await request("/cohortes/clore","PATCH",{id:act.dataset.cohorteClore});await loadGestion();}
  await reload();
 }catch(e){alertMessage(e.message);}
});
document.addEventListener("submit",async ev=>{
 const form=ev.target;if(!(form instanceof HTMLFormElement))return;
 if(form.dataset.submit){ev.preventDefault();await submitCopy(form);return;}
 if(form.id==="projetForm"){
  ev.preventDefault();const btn=form.querySelector("button");btn.disabled=true;
  try{
   await request("/soumettre","POST",{courseId:"PROJET",type:"projet",answers:snapshot.projet.criteres.map((_,i)=>form.elements["partie"+i].value.trim())});
   alertMessage("Votre projet a été remis pour correction.");await reload();
  }catch(e){alertMessage(e.message);btn.disabled=false;}
  return;
 }
 if(form.id==="cohorteForm"){
  ev.preventDefault();const b=new FormData(form),btn=form.querySelector("button");btn.disabled=true;
  try{
   await request("/cohortes","POST",{nom:b.get("nom"),niveau:Number(b.get("niveau")),debut:b.get("debut")});
   alertMessage("Cohorte créée.","adminStatus");form.reset();await reload();await loadGestion();
  }catch(e){alertMessage(e.message,"adminStatus");}finally{btn.disabled=false;}
  return;
 }
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