/* Academy dynamique · tableau apprenant, reprise de lecture, quiz interactifs, classes, coaching. */
(()=>{
 "use strict";
 const api="/api/soldiers-academy/dynamique",$=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=t=>{try{return new Date(t).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}catch{return ""}};
 let actif="",donnees=null,charge=false;
 async function request(path,method="GET",body){
  const o={method,credentials:"same-origin",headers:{accept:"application/json"}};
  if(body!==undefined){o.headers["content-type"]="application/json";o.body=JSON.stringify(body)}
  const r=await fetch(api+path,o);const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok===false)throw Error(j.message||"Accès indisponible ("+r.status+").");
  return j;
 }
 const status=(id,msg)=>{const n=$(id);if(n)n.textContent=msg||""};
 const cardSession=s=>'<article class="academy-dyn-session"><div><strong>'+esc(s.titre)+'</strong><p class="muted">'+esc(s.cours)+' · '+esc(fmt(s.debut))+' · '+esc(s.duree)+' minutes</p></div><a class="button" href="'+esc(s.lien)+'" target="_blank" rel="noopener noreferrer">Rejoindre la classe</a></article>';
 async function chargerTableau(){
  const zone=$("academyDynDashboard");if(!zone||charge)return;
  charge=true;
  try{
   const data=await request("/tableau"),r=data.resume||{};
   const p=r.leconsDisponibles?Math.min(100,Math.round((r.leconsEtudiees||0)*100/r.leconsDisponibles)):0;
   zone.innerHTML='<div class="academy-dyn-head"><div><span class="eyebrow">Mon parcours vivant</span><h2>Votre tableau de bord pédagogique</h2><p class="muted">Progression de lecture, activités d’entraînement et prochaines classes. Vos évaluations officielles restent indépendantes.</p></div>'+
    (r.reprendre?'<button type="button" class="button primary" data-course="'+esc(r.reprendre)+'">Reprendre '+esc(r.reprendre)+'</button>':'<span class="chip">Demandez votre premier accès</span>')+'</div>'+
    '<div class="academy-dyn-metrics">'+[
      [r.coursAutorises||0,"Cours autorisés"],[r.leconsEtudiees||0,"Leçons étudiées"],[r.activitesReussies||0,"Activités réussies"],[r.demandesEnAttente||0,"Accès en attente"]
    ].map(([n,label])=>'<div class="academy-dyn-kpi"><strong>'+esc(n)+'</strong><span>'+esc(label)+'</span></div>').join("")+'</div>'+
    '<div class="academy-dyn-progress"><div><strong>Progression de lecture</strong><span>'+esc(p)+' % des leçons actuellement accessibles</span></div><div class="bar" role="progressbar" aria-label="Leçons étudiées" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+esc(p)+'"><i style="width:'+p+'%"></i></div></div>'+
    '<h3>Prochaines classes virtuelles</h3>'+(data.seances?.length?'<div class="academy-dyn-stack">'+data.seances.slice(0,5).map(cardSession).join("")+'</div>':'<p class="muted">Aucune classe programmée sur vos cours autorisés.</p>');
  }catch(e){zone.innerHTML='<p class="muted">Tableau dynamique indisponible : '+esc(e.message)+'</p>'}
  finally{charge=false}
 }
 function leconsTerminees(){
  const rows=donnees?.lecons||[];return rows.filter(x=>x.terminee).length;
 }
 function refreshLecture(){
  const zone=$("academyDynCourse");if(!zone||!donnees)return;
  const n=leconsTerminees(),total=donnees.totalLecons||0;
  const p=total?Math.round(n*100/total):0;
  const compteur=zone.querySelector("[data-dyn-course-progress]");
  if(compteur)compteur.textContent=n+" / "+total+" leçons étudiées ("+p+" %)";
  const barre=zone.querySelector("[data-dyn-course-bar]");
  if(barre){barre.setAttribute("aria-valuenow",String(n));barre.firstElementChild.style.width=p+"%"}
  for(const btn of document.querySelectorAll('[data-dyn-termine]')){
   if(btn.dataset.dynCours!==actif)continue;
   const num=Number(btn.dataset.dynTermine),done=(donnees.lecons||[]).find(x=>x.numero===num)?.terminee===true;
   btn.setAttribute("aria-pressed",String(done));btn.textContent=done?"✓ Leçon étudiée · modifier":"Marquer cette leçon comme étudiée";
  }
 }
 function renderActivites(quiz,essais){
  if(!quiz?.length)return '<p class="muted">Aucune activité QCM publiée pour ce cours. Le professeur peut en ajouter depuis le Studio.</p>';
  const m=new Map((essais||[]).map(x=>[x.quiz,x]));
  return quiz.map(q=>{
   const e=m.get(q.id);
   return '<form class="academy-dyn-quiz" data-dyn-quiz="'+esc(q.id)+'"><fieldset><legend>'+esc(q.question)+'</legend>'+
    q.choix.map((choice,i)=>'<label><input required type="radio" name="choix" value="'+i+'"'+(e?.choix===i?' checked':'')+'> '+esc(choice)+'</label>').join("")+
    '</fieldset><div class="actions"><button type="submit" class="button primary">Vérifier ma réponse</button>'+(e?'<span class="chip '+(e.reussi?'ok':'')+'">Dernière tentative : '+(e.reussi?'réussie':'à revoir')+'</span>':'')+'</div>'+
    '<p class="status" role="status" aria-live="polite"></p></form>';
  }).join("");
 }
 function renderQuestions(rows){
  return (rows||[]).map(q=>'<article class="academy-dyn-message"><p><strong>Votre question :</strong> '+esc(q.question)+'</p><small class="muted">'+esc(fmt(q.cree))+'</small>'+
   (q.repondu?'<p><strong>Réponse de l’équipe pédagogique :</strong> '+esc(q.reponse)+'</p>':'<span class="chip pending">Réponse en attente</span>')+'</article>').join("");
 }
 function renderCours(id){
  const zone=id.startsWith("LS-")?$("academyDynLove"):$("academyDynCourse");
  if(!zone||!donnees)return;
  if(!id.startsWith("LS-")){
   zone.innerHTML='<div class="academy-dyn-head"><div><span class="eyebrow">Lecture interactive</span><h3>Votre progression dans ce cours</h3><p class="muted" data-dyn-course-progress></p></div></div>'+
    '<div class="bar" data-dyn-course-bar role="progressbar" aria-label="Leçons étudiées" aria-valuemin="0" aria-valuemax="'+esc(donnees.totalLecons)+'" aria-valuenow="0"><i style="width:0%"></i></div>'+
    '<p class="muted">Cochez chaque leçon après l’avoir étudiée. Ce suivi personnel ne remplace pas les corrections, l’assiduité ni la validation officielle.</p>';
  }else{
   zone.innerHTML='<h3>Avancement dans le module</h3><p class="muted" data-dyn-course-progress></p>'+
    '<div class="bar" data-dyn-course-bar role="progressbar" aria-label="Leçons étudiées" aria-valuemin="0" aria-valuemax="'+esc(donnees.totalLecons)+'" aria-valuenow="0"><i style="width:0%"></i></div>';
  }
  refreshLecture();
  const enPlus='<section class="academy-dyn-interactions"><h3>Entraînement interactif</h3><p class="muted">Activités formatives, sans effet sur la note finale.</p>'+renderActivites(donnees.quiz,donnees.essais)+
   '<h3>Classes virtuelles du cours</h3>'+(donnees.seances.length?donnees.seances.map(cardSession).join(""):'<p class="muted">Aucune séance à venir.</p>')+
   '<h3>Questions à votre coach</h3><p class="muted">Vos questions et les réponses sont privées : vous seul et les enseignants habilités de ce cours peuvent les consulter. N’envoyez pas de données pastorales, médicales ou intimes.</p>'+
   '<form data-dyn-question="'+esc(id)+'"><label class="field">Question pédagogique<textarea name="question" required minlength="10" maxlength="600" rows="3" placeholder="Que souhaitez-vous approfondir dans cette leçon ?"></textarea></label><button class="button primary" type="submit">Poser ma question</button><p class="status" role="status" aria-live="polite"></p></form>'+
   '<div class="academy-dyn-stack">'+renderQuestions(donnees.questions)+'</div></section>';
  if(id.startsWith("LS-"))zone.insertAdjacentHTML("beforeend",enPlus);
  else $("academyDynActivities")?.replaceChildren(); // parent réservé aux activités du cours
  if(!id.startsWith("LS-")){$("academyDynActivities").innerHTML=enPlus}
 }
 async function chargerCours(id){
  if(id.startsWith("LS-")&&["LS-09","LS-10"].includes(id))return;
  actif=id;donnees=null;
  const zone=id.startsWith("LS-")?$("academyDynLove"):$("academyDynCourse");
  if(!zone)return;
  zone.innerHTML='<p class="muted">Chargement des activités et de votre progression…</p>';
  try{
   const d=await request("/cours?id="+encodeURIComponent(id));
   if(actif!==id)return;donnees=d;renderCours(id);
  }catch(e){zone.innerHTML='<p class="muted">'+esc(e.message)+'</p>'}
 }
 document.addEventListener("click",async ev=>{
  const b=ev.target.closest("[data-dyn-termine]");if(!b||!donnees||b.dataset.dynCours!==actif)return;
  b.disabled=true;
  const num=Number(b.dataset.dynTermine),before=donnees.lecons.find(x=>x.numero===num),terminee=!before?.terminee;
  try{
   await request("/lecon","POST",{cours:actif,lecon:num,terminee});
   if(before)before.terminee=terminee;else donnees.lecons.push({numero:num,terminee});
   refreshLecture();chargerTableau();
  }catch(e){const elt=b.closest("details")?.querySelector(".academy-dyn-lesson-status");if(elt)elt.textContent=e.message;else window.alert(e.message)}
  finally{b.disabled=false}
 });
 document.addEventListener("submit",async ev=>{
  const f=ev.target;if(!(f instanceof HTMLFormElement))return;
  if(f.dataset.dynQuiz){
   ev.preventDefault();
   const selected=f.querySelector('input[name="choix"]:checked'),status=f.querySelector(".status");
   if(!selected){status.textContent="Choisissez une réponse.";return}
   const btn=f.querySelector('button[type="submit"]');btn.disabled=true;
   try{
    const r=await request("/quiz/repondre","POST",{id:f.dataset.dynQuiz,choix:Number(selected.value)});
    status.textContent=r.message+" "+r.explication;
    if(!donnees.essais)donnees.essais=[];
    const old=donnees.essais.find(x=>x.quiz===r.id);
    if(old){old.reussi=r.reussi;old.choix=Number(selected.value)}
    else donnees.essais.push({quiz:r.id,reussi:r.reussi,choix:Number(selected.value)});
    await chargerTableau();
   }catch(e){status.textContent=e.message}finally{btn.disabled=false}return;
  }
  if(f.dataset.dynQuestion){
   ev.preventDefault();const btn=f.querySelector("button[type=submit]"),status=f.querySelector(".status");
   btn.disabled=true;
   try{
    const question=f.elements.question.value.trim();
    const r=await request("/question","POST",{cours:f.dataset.dynQuestion,question});
    status.textContent=r.message;await chargerCours(f.dataset.dynQuestion);
   }catch(e){status.textContent=e.message}finally{btn.disabled=false}
  }
 });
 window.SDEAcademyDyn={chargerTableau,chargerCours,refreshLecture};
})();
