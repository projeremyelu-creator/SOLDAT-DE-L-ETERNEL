/* Studio pédagogique vivant : QCM publiables, classes Meet, coaching privé et pilotage agrégé. */
(()=>{
"use strict";
const api="/api/soldiers-academy/dynamique",$=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const format=d=>{try{return new Date(d).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}catch{return String(d||"")}};
const status=(id,m)=>{if($(id))$(id).textContent=m||""};
let ST=null;
async function req(p,method="GET",payload){
 const opts={method,credentials:"same-origin",headers:{accept:"application/json"}};
 if(payload!==undefined){opts.headers["content-type"]="application/json";opts.body=JSON.stringify(payload)}
 const response=await fetch(api+p,opts),j=await response.json().catch(()=>({}));
 if(!response.ok||j.ok===false)throw Error(j.message||"Échec de la requête ("+response.status+").");
 return j;
}
function choices(){
 const list=(ST?.cours||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.id+" · "+c.title)+'</option>').join("");
 for(const id of ["dynQuizCourse","dynMeetCourse"]){const n=$(id);if(n){const previous=n.value;n.innerHTML=list;if([...n.options].some(x=>x.value===previous))n.value=previous}}
}
function renderActivites(){
 const root=$("dynStudioActivites");if(!root||!ST)return;
 root.innerHTML=ST.activites.length?ST.activites.slice(0,30).map(x=>
 '<article class="academy-dyn-studio-card"><strong>'+esc(x.cours)+' · '+esc(x.question)+'</strong><p class="muted">Publié : '+esc(format(x.publication))+' · '+esc(x.choix.length)+' propositions</p><details><summary>Vérifier le contenu publié</summary><ol>'+x.choix.map(v=>'<li>'+esc(v)+'</li>').join("")+'</ol><p>'+esc(x.explication)+'</p></details></article>'
 ).join(""):'<p class="muted">Aucune activité interactive publiée pour les cours confiés.</p>';
}
function renderSeances(){
 const root=$("dynStudioSeances");if(!root||!ST)return;
 root.innerHTML=ST.seances.length?ST.seances.slice(0,30).map(x=>
 '<article class="academy-dyn-studio-card"><strong>'+esc(x.cours)+' · '+esc(x.titre)+'</strong><p class="muted">'+esc(format(x.debut))+' · '+esc(x.duree)+' min'+(x.annule?' · Annulée':'')+'</p>'+
 (x.annule?'':('<div class="actions"><a class="button" href="'+esc(x.lien)+'" target="_blank" rel="noopener noreferrer">Ouvrir Google Meet</a>'+
 '<button class="button" type="button" data-dyn-annuler="'+esc(x.id)+'">Annuler cette séance</button></div>'))+'</article>'
 ).join(""):'<p class="muted">Aucune séance programmée.</p>';
}
function renderMessages(){
 const root=$("dynStudioMessages");if(!root||!ST)return;
 root.innerHTML=ST.questions.length?ST.questions.slice(0,35).map(q=>
 '<article class="academy-dyn-studio-card"><span class="eyebrow">'+esc(q.cours)+' · '+esc(format(q.cree))+'</span><p><strong>Question pédagogique privée :</strong> '+esc(q.question)+'</p>'+
 (q.repondu?'<p class="muted">Réponse déjà transmise : '+esc(q.reponse)+'</p>':'<span class="chip pending">En attente</span>')+
 '<form data-dyn-studio-reponse="'+esc(q.id)+'"><label class="field">Réponse à cet apprenant (privée)<textarea name="reponse" minlength="10" maxlength="800" required rows="3">'+esc(q.reponse||"")+'</textarea></label>'+
 '<button class="button primary" type="submit">'+(q.repondu?"Mettre à jour la réponse":"Répondre")+'</button><p class="status" role="status" aria-live="polite"></p></form></article>'
 ).join(""):'<p class="muted">Aucune question pédagogique reçue sur vos cours.</p>';
}
async function pilotage(){
 if(!$("dynPilotage")||!ST)return;
 try{
  const p=await req("/pilotage"),x=p.indicateurs;
  $("dynPilotage").hidden=false;
  $("dynPilotageMetrics").innerHTML=[
   [x.apprenantsActifs,"Apprenants actifs en lecture"],[x.leconsEtudiees,"Leçons étudiées"],
   [x.quizTentes,"Activités tentées"],[x.quizReussis,"Activités réussies"],
   [x.questionsEnAttente,"Questions sans réponse"],[x.seancesAVenir,"Classes à venir"],
   [x.demandesEnAttente,"Demandes d'accès en attente"]
  ].map(([n,label])=>'<div class="academy-dyn-kpi"><strong>'+esc(n)+'</strong><span>'+esc(label)+'</span></div>').join("");
  status("dynPilotageStatus","Indicateurs calculés à partir des opérations réellement enregistrées. Aucune donnée privée individuelle n’est affichée.");
 }catch(e){if(e.message.includes("403")||e.message.includes("Réservé"))$("dynPilotage").hidden=true;else status("dynPilotageStatus",e.message)}
}
async function charger(){
 ST=await req("/studio");choices();renderActivites();renderSeances();renderMessages();
 status("dynStudioStatus","Studio dynamique prêt : "+ST.cours.length+" cours confiés · "+ST.statistiques.questionsEnAttente+" question(s) à traiter.");
 await pilotage();
}
$("dynStudioRefresh")?.addEventListener("click",()=>charger().catch(e=>status("dynStudioStatus",e.message)));
$("dynFormQuiz")?.addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,btn=form.querySelector('button[type="submit"]');
 const choix=[form.elements.choix1,form.elements.choix2,form.elements.choix3,form.elements.choix4].map(x=>x.value.trim()).filter(Boolean);
 const data={cours:form.elements.cours.value,question:form.elements.question.value.trim(),choix,
 reponse:Number(form.elements.reponse.value),explication:form.elements.explication.value.trim()};
 if(form.elements.publication.value)data.publication=new Date(form.elements.publication.value).toISOString();
 btn.disabled=true;
 try{const r=await req("/studio/quiz","POST",data);status("dynQuizStatus",r.message);form.reset();await charger()}
 catch(e){status("dynQuizStatus",e.message)}finally{btn.disabled=false}
});
$("dynFormMeet")?.addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,btn=form.querySelector('button[type="submit"]');
 const data={cours:form.elements.cours.value,titre:form.elements.titre.value.trim(),debut:new Date(form.elements.debut.value).toISOString(),
 duree:Number(form.elements.duree.value),lien:form.elements.lien.value.trim()};
 btn.disabled=true;
 try{const r=await req("/studio/seance","POST",data);status("dynMeetStatus",r.message);form.reset();await charger()}
 catch(e){status("dynMeetStatus",e.message)}finally{btn.disabled=false}
});
document.addEventListener("click",async ev=>{
 const b=ev.target.closest("[data-dyn-annuler]");if(!b)return;
 if(!window.confirm("Annuler cette séance programmée ?"))return;
 b.disabled=true;
 try{const r=await req("/studio/annuler","POST",{id:b.dataset.dynAnnuler});status("dynStudioStatus",r.message);await charger()}
 catch(e){status("dynStudioStatus",e.message)}finally{b.disabled=false}
});
document.addEventListener("submit",async ev=>{
 const f=ev.target;if(!(f instanceof HTMLFormElement)||!f.dataset.dynStudioReponse)return;
 ev.preventDefault();const btn=f.querySelector('button[type="submit"]'),status=f.querySelector(".status");
 btn.disabled=true;
 try{const r=await req("/studio/repondre","POST",{id:f.dataset.dynStudioReponse,reponse:f.elements.reponse.value.trim()});status.textContent=r.message;await charger()}
 catch(e){status.textContent=e.message}finally{btn.disabled=false}
});
charger().catch(e=>status("dynStudioStatus",e.message+" — espace réservé à l'équipe pédagogique autorisée."));
})();
