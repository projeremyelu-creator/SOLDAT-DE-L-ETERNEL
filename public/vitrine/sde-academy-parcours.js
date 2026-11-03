/* Soldiers Academy 2027 : 24 cours, session existante, corrections côté serveur. */
(()=>{
"use strict";
const api="/api/soldiers-academy";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let snapshot=null;
let activeCourse=null;
let gestion=null;

let activeTab="cours",publishedResources=[];
const resourceApi="/api/soldiers-academy/contenus";
function activateTab(name){
 activeTab=["cours","ressources","parcours"].includes(name)?name:"cours";
 document.querySelectorAll("[data-academy-panel]").forEach(x=>{x.hidden=x.dataset.academyPanel!==activeTab});
 document.querySelectorAll("[data-academy-tab]").forEach(x=>{const on=x.dataset.academyTab===activeTab;x.setAttribute("aria-selected",String(on));x.tabIndex=on?0:-1;});
}
function embeddedVideo(raw){
 let u;try{u=new URL(raw)}catch{return ""}
 const host=u.hostname.toLowerCase(),p=u.pathname.split("/").filter(Boolean);
 if(["youtube.com","www.youtube.com","m.youtube.com","youtu.be","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host)){
  const id=host==="youtu.be"?p[0]:u.searchParams.get("v")||(["embed","shorts","live"].includes(p[0])?p[1]:"");
  if(/^[A-Za-z0-9_-]{11}$/.test(id||""))return "https://www.youtube-nocookie.com/embed/"+id;
 }
 if(["vimeo.com","www.vimeo.com","player.vimeo.com"].includes(host)){
  const id=p[p.length-1];if(/^\d{6,15}$/.test(id||""))return "https://player.vimeo.com/video/"+id;
 }
 return "";
}
function resourceCard(r){
 const labels={lecon:"Leçon écrite",cours:"Cours complémentaire",video:"Vidéo",audio:"Audio",document:"Document",exercice:"Exercice",lien:"Lien"};
 const emb=r.kind==="video"&&r.url?embeddedVideo(r.url):"";
 const player=r.kind==="video"?(r.hasFile?'<video controls preload="none" src="'+esc(r.fileUrl)+'"></video>':emb?'<iframe class="video-frame" loading="lazy" src="'+esc(emb)+'" referrerpolicy="strict-origin-when-cross-origin" title="'+esc(r.title)+'" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>':""):(r.kind==="audio"&&r.hasFile?'<audio controls preload="none" src="'+esc(r.fileUrl)+'"></audio>':"");
 return '<article class="resource-card '+(r.seen?"seen":"")+'"><div class="row"><span class="resource-badge">'+esc(labels[r.kind]||"Support")+'</span>'+(r.updatedAt>Date.now()-604800000?'<span class="chip pending">Nouveau</span>':"")+'</div><h3>'+esc(r.title)+'</h3><small>'+esc(r.courseId)+(r.lesson?' · Leçon '+esc(r.lesson):" · Complément")+' · '+esc(r.author)+'</small><p>'+esc(r.description)+'</p>'+player+
 (r.text?'<details><summary>Lire les enseignements / consignes</summary><div class="text-lesson">'+esc(r.text)+'</div></details>':"")+
 '<div class="resource-actions">'+(r.hasFile?'<a class="btn" href="'+esc(r.fileUrl)+'" target="_blank" rel="noopener noreferrer">Consulter · '+esc(r.fileName||"Support")+'</a>':"")+
 (r.url?'<a class="btn" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">Ouvrir le lien</a>':"")+
 '<button class="btn" type="button" data-mark-resource="'+esc(r.id)+'" '+(r.seen?"disabled":"")+'>'+(r.seen?"✓ Consultée":"Marquer comme consultée")+'</button></div></article>';
}
function filterResources(){
 const cours=$("resourceCourse")?.value||"",kind=$("resourceKind")?.value||"";
 const items=publishedResources.filter(r=>(!cours||r.courseId===cours)&&(!kind||r.kind===kind));
 $("resourcesCards").innerHTML=items.length?items.map(resourceCard).join(""):'<p class="muted">Aucun support publié pour ce filtre.</p>';
 text("resourceCount",publishedResources.length?"("+publishedResources.length+")":"");
 text("resourcesStatus",publishedResources.length+" ressource(s) publiée(s), "+publishedResources.filter(r=>r.seen).length+" consultée(s).");
}
async function loadResources(){
 try{const r=await fetch(resourceApi,{credentials:"same-origin",cache:"no-store"}),j=await r.json();
  if(!r.ok||!j.ok)throw Error(j.message||"Ressources indisponibles");
  publishedResources=j.resources||[];filterResources();
 }catch(e){text("resourcesStatus",e.message);}
}
async function checkStudio(){
 if(snapshot?.admin){$("studioShortcut").hidden=false;return}
 try{const r=await fetch(resourceApi+"/studio",{credentials:"same-origin",cache:"no-store"});if(r.ok)$("studioShortcut").hidden=false;}catch{}
}
function setupResources(){
 const s=$("resourceCourse");
 if(s)s.innerHTML='<option value="">Tous les cours</option>'+snapshot.courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.id)+' — '+esc(c.title)+'</option>').join("");
 activateTab(activeTab);
}

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
 setupResources();
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
 const mes=new Map((sp.mesInscriptions||[]).map(x=>[x.ecole,x]));
 const etat={demande:'<span class="chip pending">Demande en cours d’examen</span>',acceptee:'<span class="chip ok">Inscrit</span>',refusee:'<span class="chip">Demande non retenue</span>'};
 $("specList").innerHTML=sp.ecoles.map(e=>{
  const m=mes.get(e.code);
  let action="";
  if(m&&m.statut!=="refusee")action=etat[m.statut]+' <button type="button" class="button" data-ecole-retirer="'+esc(e.code)+'">Retirer</button>';
  else if(sp.ouvertes)action=(m?etat.refusee+'<small class="muted"> '+esc(m.commentaire)+'</small><br>':"")+'<form data-ecole-form="'+esc(e.code)+'"><label class="field">Motivation (facultatif)<textarea name="motivation" maxlength="600" placeholder="Pourquoi cette école ?"></textarea></label><button class="button primary" type="submit">S’inscrire à cette école</button></form>';
  else action='<span class="chip">Après les 24 cours</span>';
  return '<article class="card"><span class="code">'+esc(e.code)+' · Pôle '+esc(e.pole)+'</span><h3>'+esc(e.titre)+'</h3><p>'+esc(e.objectif)+'</p><ul>'+e.ateliers.map(a=>'<li>'+esc(a[1])+'</li>').join("")+'</ul><small>Soutenance : '+esc(e.soutenance)+'</small><div>'+action+'</div></article>';
 }).join("");
 $("masterList").innerHTML=sp.masterclass.map(m=>'<article class="card"><span class="code">'+esc(m.code)+'</span><h3>'+esc(m.titre)+'</h3><p>'+esc(m.deroulement)+'</p><small>Livrable : '+esc(m.livrable)+'</small></article>').join("");
}
function renderEcolesAdmin(){
 const n=$("ecolesAdmin");if(!n||!gestion)return;
 const list=gestion.ecolesDemandes||[];
 n.innerHTML=list.length?list.map(d=>'<article class="review"><div class="eyebrow">'+esc(d.ecole)+' · demande du '+esc(new Date(d.demandeLe).toLocaleDateString("fr-FR"))+'</div><h3>'+esc(d.titre)+'</h3><p>Apprenant : <strong>'+esc(d.nom)+'</strong></p>'+(d.motivation?'<div class="correction">'+esc(d.motivation)+'</div>':"")+'<form data-ecole-decision data-compte="'+esc(d.compte)+'" data-ecole="'+esc(d.ecole)+'"><label class="field">Commentaire (obligatoire en cas de refus)<input name="commentaire" maxlength="400"></label><button class="button primary" type="submit" data-statut="acceptee">Accepter</button> <button class="button" type="submit" data-statut="refusee">Refuser</button></form></article>').join(""):'<p class="muted">Aucune demande d’inscription aux écoles.</p>';
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
  activateTab("cours");
  alertMessage("Ouverture du cours "+id+"…");
  const d=await request("/cours/"+encodeURIComponent(id));const c=d.course;
  activeCourse=c;const s=snapshot.courses.find(x=>x.id===id);
  const panel=$("courseDetail");panel.hidden=false;
  panel.innerHTML='<div class="eyebrow">'+esc(c.id)+' · Niveau '+c.level+' · 8 heures</div><h2>'+esc(c.title)+'</h2><p>'+esc(c.purpose)+'</p><p><strong>Lectures bibliques :</strong> '+esc(c.refs)+'</p><h3>Objectifs pédagogiques</h3><ol class="numbered">'+c.goals.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol><h3>Les quatre leçons</h3>'+c.units.map(x=>'<details class="lesson"><summary>Leçon '+x.number+' · '+esc(x.title)+' · 90 minutes</summary><p>'+esc(x.body)+'</p><p class="muted"><strong>À lire :</strong> '+esc(x.scriptures)+'</p></details>').join("")+'<h3>Suivi des acquis</h3><p>Quiz : '+esc(scoreText(s.quiz))+' · Travaux : '+esc(scoreText(s.exercises))+' · Participation : '+esc(scoreText(s.participation))+' · Examen : '+esc(scoreText(s.exam))+' · Assiduité : '+esc(s.attendance)+' %</p><p><strong>Note finale :</strong> '+esc(scoreText(s.average))+' · '+(s.passed?"Cours validé":"Validation : 70/100 et au moins 80 % de présence")+'</p>'+(s.feedback?.length?'<h3>Retours de correction</h3><ul>'+s.feedback.map(f=>'<li><strong>'+esc(f.type)+' · '+esc(f.score)+'/100</strong> — '+esc(f.commentaire)+'</li>').join('')+'</ul>':'')+renderExerciseForm(c,"quiz",c.quiz,s)+renderExerciseForm(c,"exercises",c.exercises,s)+renderExerciseForm(c,"exam",c.exam,s)+'<button class="button" type="button" id="backCourses">← Revenir à la liste</button>';
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
 return '<article class="review"><div class="eyebrow">'+esc(item.cours)+' · '+esc(item.type)+'</div><h3>'+esc(prompts)+'</h3><p>Apprenant : <strong>'+esc(item.nom)+'</strong> · Compte : <code>'+esc(item.compte)+'</code></p><p class="muted">Soumis le '+esc(new Date(item.date_soumission).toLocaleString("fr-FR"))+'</p><details><summary>Lire les réponses à corriger</summary>'+item.reponses.map((a,i)=>'<p class="muted">'+esc(item.aide?.consignes?.[i]||'Réponse '+(i+1))+'</p><div class="correction">'+esc(a)+'</div>').join("")+'</details>'+aideHtml+'<form data-grade="'+esc(item.id)+'"><label class="field">Note sur 100<input type="number" name="score" min="0" max="100" required></label><label class="field">Commentaire du formateur<textarea name="comment" required minlength="3" maxlength="2000" placeholder="Justifiez la note et proposez une piste de progrès"></textarea></label><button class="button primary" type="submit">Valider la correction</button></form></article>';
}
async function loadGestion(){
 try{
  gestion=await request("/gestion");
  $("pendingCopies").innerHTML=gestion.pending.length?gestion.pending.map(reviewHtml).join(""):'<p class="muted">Aucune copie actuellement en attente.</p>';
  renderCohortesAdmin();renderEcolesAdmin();
  $("attendanceCourse").innerHTML=gestion.courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.id)+' — '+esc(c.title)+'</option>').join("");
  $("accountsList").innerHTML=[...new Set(gestion.students.map(x=>x.compte))].map(id=>'<option value="'+esc(id)+'"></option>').join("");
  alertMessage("Tableau des corrections actualisé.","adminStatus");
 }catch(e){alertMessage(e.message,"adminStatus");}
}
async function reload(){
 snapshot=await request("");progress();
}
document.addEventListener("click",async ev=>{
 const tab=ev.target.closest("[data-academy-tab]");if(tab){activateTab(tab.dataset.academyTab);if(tab.dataset.academyTab==="ressources")await loadResources();return;}
 const mark=ev.target.closest("[data-mark-resource]");
 if(mark){mark.disabled=true;try{const r=await fetch(resourceApi+"/"+encodeURIComponent(mark.dataset.markResource)+"/consulte",{method:"POST",credentials:"same-origin"});
  if(!r.ok)throw Error("Impossible d'enregistrer la lecture.");await loadResources();
 }catch(e){text("resourcesStatus",e.message);mark.disabled=false;}return;}
 const btn=ev.target.closest("[data-course]");if(btn&&!btn.disabled){openCourse(btn.dataset.course);return;}
 const act=ev.target.closest("[data-avis-lus],[data-cohorte-rejoindre],[data-cohorte-quitter],[data-cohorte-clore],[data-ecole-retirer]");if(!act)return;
 try{
  if(act.hasAttribute("data-avis-lus"))await request("/avis/lus","POST",{});
  else if(act.dataset.cohorteRejoindre)await request("/cohortes/rejoindre","POST",{id:act.dataset.cohorteRejoindre});
  else if(act.dataset.cohorteQuitter)await request("/cohortes/quitter","POST",{id:act.dataset.cohorteQuitter});
  else if(act.dataset.ecoleRetirer)await request("/ecoles/retirer","POST",{ecole:act.dataset.ecoleRetirer});
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
 if(form.dataset.ecoleForm){
  ev.preventDefault();const btn=form.querySelector("button");btn.disabled=true;
  try{
   await request("/ecoles/inscrire","POST",{ecole:form.dataset.ecoleForm,motivation:form.elements.motivation.value.trim()});
   alertMessage("Votre demande d’inscription a été transmise.");await reload();
  }catch(e){alertMessage(e.message);btn.disabled=false;}
  return;
 }
 if(form.hasAttribute("data-ecole-decision")){
  ev.preventDefault();const btn=ev.submitter||form.querySelector("button"),statut=btn?.dataset.statut;
  try{
   await request("/ecoles/decision","PATCH",{compte:form.dataset.compte,ecole:form.dataset.ecole,statut,commentaire:form.elements.commentaire.value.trim()});
   alertMessage("Décision enregistrée.","adminStatus");await loadGestion();
  }catch(e){alertMessage(e.message,"adminStatus");}
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
  await loadResources();await checkStudio();
  if(snapshot.admin)await loadGestion();
 }catch(e){
   alertMessage(e.message+" — connectez-vous à votre espace personnel.");
   $("studentPage").hidden=true;$("adminPage").hidden=true;
 }
$("refreshResources")?.addEventListener("click",loadResources);
$("resourceCourse")?.addEventListener("change",filterResources);
$("resourceKind")?.addEventListener("change",filterResources);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&snapshot)loadResources()});
setInterval(()=>{if(!document.hidden&&snapshot)loadResources()},90000);
})();
})();