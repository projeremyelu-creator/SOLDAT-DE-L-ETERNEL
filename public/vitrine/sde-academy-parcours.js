/* Soldiers Academy 2027 : 24 cours, session existante, corrections côté serveur. */
(()=>{
"use strict";
const api="/api/soldiers-academy";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let snapshot=null;
let activeCourse=null;
let gestion=null;
let mainTabs={activer(){}};
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
 if(c.passed)return '<span class="chip ok">Cours validé</span>';
 if(!c.acces?.prerequisNiveau)return '<span class="chip">Niveau précédent requis</span>';
 if(c.acces?.statut==="en_attente")return '<span class="chip pending">Autorisation en attente</span>';
 if(c.acces?.statut==="refuse")return '<span class="chip">Demande refusée</span>';
 if(c.acces?.statut==="revoque")return '<span class="chip">Accès retiré</span>';
 if(!c.acces?.autorise)return '<span class="chip">🔒 Validation préalable</span>';
 if(c.pending?.length)return '<span class="chip pending">Correction en attente</span>';
 return '<span class="chip ok">Accès autorisé</span>';
}
function nbRessources(id){
 const n=Number(snapshot.ressources?.parCours?.[id]||0);
 return n?'<span class="chip type-video">'+n+' ressource'+(n>1?"s":"")+'</span>':"";
}
function renderCatalogue(){
 const n=$("catalogue");
 const headings=["Fondations bibliques et identité","Équipement spirituel et ministériel","Leadership et commandement"];
 n.innerHTML=headings.map((title,i)=>{
   const c=snapshot.courses.filter(x=>x.level===i+1);
   const acquis=c.length>0&&c.every(x=>x.passed);
   return '<div class="level"><div class="level-titre"><span class="insigne'+(acquis?' acquis':'')+'" aria-hidden="true">'+['I','II','III'][i]+'</span><h2>Niveau '+(i+1)+' — '+esc(title)+'</h2></div><span class="chip">'+c.filter(x=>x.passed).length+' / 8 cours validés</span></div><div class="grid">'+
   c.map((x,i)=>'<article class="card '+(x.passed?"passed ":"")+(x.locked?"locked":"")+'" style="--i:'+i+'"><span class="code">'+esc(x.id)+' · 8 h</span><h3>'+esc(x.title)+'</h3>'+statusFor(x)+nbRessources(x.id)+'<small>Quiz : '+esc(scoreText(x.quiz))+' · Travaux : '+esc(scoreText(x.exercises))+'<br>Examen : '+esc(scoreText(x.exam))+' · Présence : '+esc(x.attendance)+' %</small><button type="button" class="button '+(x.acces?.autorise?"primary":"")+'" data-course="'+esc(x.id)+'">'+(x.acces?.autorise?"Ouvrir le cours →":"Voir les conditions d’accès")+'</button></article>').join("")+'</div>';
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
   d.innerHTML='<div class="brevet"><img class="brevet-logo" src="/vitrine/logo-96.png" alt="Logo officiel du Mouvement SDE" width="76" height="76"><div class="eyebrow">Attestation interne · Soldiers Academy</div><h2>'+esc(title)+'</h2><p>Le Mouvement SDE atteste que <strong>'+esc(x.name)+'</strong> a validé '+(level===4?'les 24 cours et le projet intégrateur':'le niveau '+level)+' du parcours pédagogique 2027.</p><p><strong>Référence :</strong> '+esc(x.attestation.code)+'</p><div class="qr" id="certQr" role="img" aria-label="QR code de vérification"></div><p class="muted">Vérification publique : '+esc(location.origin)+'/verifier-attestation</p><p><strong>Date d’enregistrement :</strong> '+esc(new Date(x.attestation.delivree_le).toLocaleDateString("fr-FR"))+'</p><p class="muted">Attestation interne ne valant pas diplôme académique reconnu par l’État. Elle est vérifiable en ligne grâce au numéro ci-dessus.</p><button class="button primary" type="button" id="printCert">Imprimer cette attestation</button></div>';
   d.hidden=false;$("printCert").addEventListener("click",()=>window.print());
   try{if(typeof qrcode==="function"){const q=qrcode(0,"M");q.addData(location.origin+"/verifier-attestation?code="+encodeURIComponent(x.attestation.code));q.make();$("certQr").innerHTML=q.createSvgTag(4,0);}}catch{}
   d.scrollIntoView({behavior:"smooth"});
 }catch(e){alertMessage(e.message);}
}
function progress(){
 const v=snapshot.progress;
 text("statPassed",v.passed+" / 24");text("statPercent",v.percentage+" %");text("statCert",snapshot.certificates.filter(x=>x.niveau<=3).length+" / 3");
 const bar=$("progressBar");bar.setAttribute("aria-valuenow",String(v.passed));requestAnimationFrame(()=>{bar.firstElementChild.style.width=Math.round(v.passed/24*100)+"%";});
 renderCatalogue();renderCertificates();renderAvis();renderProjet();renderCohortes();renderSpecialisations();renderBiblio();$("studentPage").hidden=false;
 window.SDEAcademyDyn?.chargerTableau();
 $("tab-projet").hidden=!snapshot.projet?.ouvert;
 const admin=!!snapshot.admin;$("adminShortcut").hidden=!admin;$("adminPage").hidden=!admin;$("studioShortcut").hidden=!(admin||snapshot.formateur);
}
function vuLe(){try{return Number(localStorage.getItem("sde-academy-biblio-vu"))||0}catch{return 0}}

/* Love School : formation facultative, sans impact sur la note ni le certificat Academy.
   Les modules 18+ se consultent après déclaration explicite de majorité (non vérifiée).
   Aucun âge, quiz sensible ou donnée intime n'est enregistré sur le navigateur ou le serveur. */
let loveSchool=null,loveSelected=null,loveBusy=false,lovePublicActif="tous";
const LOVE_GROUPS=[
 {id:"fondations",title:"01 · Les fondements du cœur",desc:"Identité, amour christocentrique et discernement relationnel.",symbol:"♡",ids:["LS-01","LS-02","LS-03"]},
 {id:"relations",title:"02 · L’art d’aimer et de communiquer",desc:"Respect, gestion des conflits, langages de l’amour et écoute.",symbol:"✧",ids:["LS-04","LS-05","LS-07","LS-08"]},
 {id:"intimite",title:"03 · Engagement et intimité responsable",desc:"Foyer, santé et intimité adulte abordés avec dignité.",symbol:"♥",ids:["LS-06","LS-09","LS-10"]}
];
const loveList=()=>loveSchool?.courses||[];
const LOVE_STATUTS={verrouille:"Verrouillé · validation requise",en_attente:"Demande en attente",approuve:"Accès validé",refuse:"Demande refusée",revoque:"Accès retiré"};
function loveCourseCard(c,i){
 const etat=c.acces?.statut||"verrouille",adulte=!!c.adultOnly;
 const bouton=etat==="approuve"?"Ouvrir le cours":etat==="en_attente"?"Voir ma demande":"Conditions et demande d'accès";
 return '<article class="card love-card '+(adulte?'love-card-adult ':'')+(etat==="approuve"?'love-unlocked':'love-locked')+'" style="--i:'+i+'">'+
 '<span class="code">'+esc(c.id)+' · '+(adulte?'18+':'BONUS')+'</span>'+
 '<h3>'+esc(c.title)+'</h3><p class="muted">'+esc(c.theme)+'</p>'+
 '<span class="love-acces-badge '+(etat==="approuve"?'love-acces-ok':'love-acces-locked')+'">'+(etat==="approuve"?'♡':'🔒')+' '+esc(LOVE_STATUTS[etat]||LOVE_STATUTS.verrouille)+'</span>'+
 '<small>Conditions, objectifs et restrictions consultables avant l’ouverture.</small>'+
 '<button type="button" class="button" data-love-course="'+esc(c.id)+'">'+bouton+'</button></article>';
}
function afficherLoveCatalogue(){
 const cours=loveList(),zone=$("loveSchoolCourses");
 const publics=Array.isArray(loveSchool?.parcours)?loveSchool.parcours:[];
 const parcours=publics.find(p=>p.id===lovePublicActif);
 for(const bouton of document.querySelectorAll("#loveAudienceChoices [data-love-public]")){
   const actif=bouton.dataset.lovePublic===lovePublicActif;
   bouton.setAttribute("aria-pressed",String(actif));
 }
 if(parcours){
   const selection=parcours.ids.map(id=>cours.find(c=>c.id===id)).filter(Boolean);
   zone.innerHTML='<section class="love-collection love-collection-public" aria-labelledby="love-public-title">'+
   '<h4 class="love-collection-title" id="love-public-title"><span aria-hidden="true">'+esc(parcours.symbol)+'</span> '+esc(parcours.title)+'</h4>'+
   '<p>'+esc(parcours.summary)+'</p>'+
   '<div class="grid">'+selection.map((c,i)=>loveCourseCard(c,i)).join("")+'</div></section>';
   text("loveAudienceSummary",selection.length+" cours conseillés · "+parcours.summary+
     (selection.some(c=>c.adultOnly)?" Les modules 18+ nécessitent une déclaration de majorité.":""));
   text("loveStatus","Parcours "+parcours.title+" : "+selection.length+" cours facultatifs, sans modification de votre progression.");
 }else{
   zone.innerHTML=LOVE_GROUPS.map(g=>{
     const selection=g.ids.map(id=>cours.find(c=>c.id===id)).filter(Boolean);
     return '<section class="love-collection" aria-labelledby="love-section-'+esc(g.id)+'"><h4 class="love-collection-title" id="love-section-'+esc(g.id)+'"><span aria-hidden="true">'+g.symbol+'</span> '+esc(g.title)+'</h4><p>'+esc(g.desc)+'</p><div class="grid">'+selection.map((c,j)=>loveCourseCard(c,j)).join("")+'</div></section>';
   }).join("");
   text("loveAudienceSummary","Tous les "+cours.length+" cours bonus sont disponibles. Sélectionnez Singles, Fiancés ou Mariés pour une recommandation adaptée.");
   text("loveStatus",cours.length+" cours bonus facultatifs · aucun effet sur vos attestations ou votre progression Academy.");
 }
}
function afficherLoveCours(id){
 const c=loveList().find(x=>x.id===id);if(!c)return;
 loveSelected=id;
 const zone=$("loveSchoolDetail"),UI=window.SDEAcademyUI;
 const etat=c.acces?.statut||"verrouille";
 const meta='<div class="eyebrow">Love School · '+esc(c.id)+' · '+(c.adultOnly?'18+ · ':'')+'Accès individuel</div>'+
   '<h2>'+esc(c.title)+'</h2><p class="muted">'+esc(c.theme)+'</p>'+
   '<span class="love-acces-badge '+(etat==="approuve"?'love-acces-ok':'love-acces-locked')+'">'+esc(LOVE_STATUTS[etat]||LOVE_STATUTS.verrouille)+'</span>'+
   '<h3>Objectifs pédagogiques</h3><ul>'+((c.objectifs||c.objectives)||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'+
   '<h3>Conditions d’accès</h3><ul>'+(c.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'+
   '<h3>Restrictions et règles de confidentialité</h3><ul>'+(c.restrictions||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>';
 // Aucun contenu pédagogique n'est dans les réponses du catalogue non autorisées.
 if(etat!=="approuve"){
   const enAttente=etat==="en_attente";
   const decision=c.acces?.commentaire?'<p class="muted"><strong>Note du responsable :</strong> '+esc(c.acces.commentaire)+'</p>':"";
   const adulte=c.adultOnly&&!enAttente?'<label class="love-adult-confirm"><input type="checkbox" id="loveAdultCheck"> Je déclare avoir au moins 18 ans et demande l’accès à ce module adulte. Cette déclaration n’est pas une vérification d’âge.</label>':"";
   zone.innerHTML=meta+'<div class="love-adult-note"><strong>🔒 Module verrouillé tant que le professeur, le coach habilité ou l’administration n’a pas validé la demande.</strong>'+
   '<p>La demande concerne uniquement ce module. Elle ne donne aucun accès automatique aux autres cours.</p></div>'+
   decision+adulte+
   (enAttente?'<p class="notice"><strong>Demande transmise.</strong> Votre responsable pédagogique doit décider avant que les leçons et supports puissent s’ouvrir.</p>':
    '<button type="button" class="button primary" data-love-demander="'+esc(c.id)+'">'+(etat==="refuse"||etat==="revoque"?"Envoyer une nouvelle demande":"Demander l’accès à ce cours")+'</button>')+
   '<p class="status" role="status" id="loveRequestStatus" aria-live="polite"></p>'+
   '<div class="actions"><button type="button" class="button" data-love-retour>Retour aux cours</button></div>';
   zone.hidden=false;zone.scrollIntoView({behavior:"smooth",block:"start"});return;
 }
 if(!Array.isArray(c.lessons)){
   if(c.adultOnly){
     zone.innerHTML=meta+'<div class="love-adult-note"><strong>Autorisation pédagogique accordée.</strong><p>Confirmez de nouveau votre majorité avant de consulter ce cours d’intimité adulte. La déclaration ne constitue pas une vérification officielle de l’âge.</p></div>'+
     '<label class="love-adult-confirm"><input type="checkbox" id="loveAdultCheck"> Je déclare avoir au moins 18 ans et souhaite consulter ce cours.</label>'+
     '<div class="actions"><button type="button" class="button primary" data-love-adulte="'+esc(c.id)+'">Ouvrir le module adulte</button><button type="button" class="button" data-love-retour>Retour aux cours</button></div>'+
     '<p class="status" role="status" id="loveAdultStatus" aria-live="polite"></p>';
   }else{
     zone.innerHTML=meta+'<p>Votre accès a été validé. Vous pouvez consulter cet enseignement et ses supports.</p>'+
     '<button type="button" class="button primary" data-love-charger="'+esc(c.id)+'">Charger le cours validé</button>'+
     '<div class="actions"><button type="button" class="button" data-love-retour>Retour aux cours</button></div><p class="status" role="status" id="loveAdultStatus" aria-live="polite"></p>';
   }
   zone.hidden=false;zone.scrollIntoView({behavior:"smooth",block:"start"});return;
 }
 const lecons=c.lessons;
 const chapitres=lecons.map((l,i)=>'<details class="love-lesson"'+(i===0?' open':'')+'><summary>Leçon '+(i+1)+' — '+esc(l.title)+'</summary><p>'+esc(l.body)+'</p><p class="muted"><strong>À méditer :</strong> '+esc(l.reflection)+'</p>'+(c.adultOnly?'':'<button type="button" class="button academy-dyn-lesson-button" aria-pressed="false" data-dyn-cours="'+esc(c.id)+'" data-dyn-termine="'+(i+1)+'">Marquer cette leçon comme étudiée</button><small class="academy-dyn-lesson-status" role="status"></small>')+'</details>').join("");
 const documents=c.ressources?.length?c.ressources.map((r,i)=>UI.ressourceHtml(r,i)).join(""):'<p class="muted">Aucun support complémentaire n’a encore été publié pour ce cours.</p>';
 const quiz=(c.quiz||[]).map((q,i)=>'<fieldset class="love-quiz" data-love-question="'+i+'"><legend>Question '+(i+1)+' — '+esc(q.question)+'</legend>'+
 q.options.map((o,j)=>'<label><input type="radio" name="love-'+esc(c.id)+'-'+i+'" value="'+j+'"> <span>'+esc(o)+'</span></label>').join("")+
 '<button type="button" class="button" data-love-quiz="'+esc(c.id)+'" data-question="'+i+'">Vérifier ma réponse</button><p class="love-feedback" role="status" aria-live="polite"></p></fieldset>').join("");
 const references=(c.references||[]).filter(x=>UI.urlSure(x.url)).map(x=>'<li class="love-reference"><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+'</a></li>').join("");
 zone.innerHTML=meta+(c.adultOnly?'<div class="love-adult-note">Module 18+ : information pédagogique non graphique, sans caractère de conseil médical individuel.</div>':'')+
 '<h3>Passages bibliques</h3><p>'+c.scriptures.map(esc).join(' · ')+'</p>'+
 '<h3>Enseignements autorisés</h3>'+chapitres+
 '<h3>Exercice personnel</h3><p>'+esc(c.practice)+'</p>'+
 '<p class="muted">Aucune réponse intime ni donnée de santé n’est recueillie.</p>'+
 (c.advice?'<div class="love-guide"><p><strong>Conseil pédagogique :</strong> '+esc(c.advice)+'</p></div>':'')+
 (quiz?'<h3>Quiz de compréhension (non noté)</h3><p class="muted">Sans impact sur le cursus officiel.</p>'+quiz:'')+
 (references?'<h3>Sources institutionnelles</h3><ul>'+references+'</ul>':'')+
 '<h3>Supports des enseignants et coachs</h3><div class="stack">'+documents+'</div>'+
 '<section id="academyDynLove" class="academy-dyn-course" aria-label="Activités interactives Love School"></section><div class="actions"><button type="button" class="button" data-love-retour>Retour aux cours</button></div>';
 if(!c.adultOnly)window.SDEAcademyDyn?.chargerCours(c.id);
 zone.hidden=false;zone.scrollIntoView({behavior:"smooth",block:"start"});
}
async function ouvrirLoveCours(id){
 const c=loveList().find(x=>x.id===id);if(!c)return;
 if(c.acces?.statut!=="approuve"||c.adultOnly){afficherLoveCours(id);return;}
 await chargerLoveDetail(id);
}
async function chargerLoveDetail(id){
 text("loveStatus","Vérification de l’autorisation de ce cours…");
 try{
   const r=await request("/love-school/cours/"+encodeURIComponent(id));
   loveSchool.courses=loveList().map(c=>c.id===id?{...c,...r.cours}:c);
   afficherLoveCours(id);afficherLoveCatalogue();
 }catch(e){
   text("loveStatus",e.message||"Cours indisponible.");await chargerLoveSchool({force:true});
 }
}
async function demanderLoveCours(id,bouton){
 const c=loveList().find(x=>x.id===id);if(!c)return;
 const majeur=!!$("loveAdultCheck")?.checked;
 if(c.adultOnly&&!majeur){text("loveRequestStatus","Déclarez votre majorité pour demander ce module 18+.");return;}
 bouton.disabled=true;text("loveRequestStatus","Transmission de votre demande…");
 try{
  const r=await request("/love-school/acces/demander","POST",{cours:id,confirmationMajeur:majeur});
  text("loveStatus",r.message);
  await chargerLoveSchool({force:true});
 }catch(e){text("loveRequestStatus",e.message||"Demande indisponible.");}
 finally{if(bouton.isConnected)bouton.disabled=false;}
}
async function ouvrirLoveAdulte(id,bouton){
 if(!$("loveAdultCheck")?.checked){text("loveAdultStatus","Déclarez votre majorité pour consulter ce module.");return;}
 if(bouton)bouton.disabled=true;
 text("loveAdultStatus","Vérification des droits individuels…");
 try{
  const r=await request("/love-school/cours/"+encodeURIComponent(id),"POST",{confirmationMajeur:true});
  if(r.verificationAge!=="declarative_non_verifiee")throw Error("Confirmation de majorité indisponible.");
  loveSchool.courses=loveList().map(c=>c.id===id?{...c,...r.cours}:c);
  afficherLoveCatalogue();afficherLoveCours(id);
 }catch(e){text("loveAdultStatus",e.message||"Accès refusé.");}
 finally{if(bouton&&bouton.isConnected)bouton.disabled=false;}
}
function verifierLoveQuiz(bouton){
 const id=bouton.dataset.loveQuiz,i=Number(bouton.dataset.question),c=loveList().find(x=>x.id===id);
 const q=c?.quiz?.[i];if(!q)return;
 const field=bouton.closest(".love-quiz"),choix=field?.querySelector('input[type="radio"]:checked'),retour=field?.querySelector(".love-feedback");
 if(!retour)return;
 if(!choix){retour.textContent="Choisissez une réponse pour vous entraîner.";return;}
 retour.textContent=(Number(choix.value)===q.answer?"Bonne réponse. ":"À revoir. ")+q.explanation;
}
async function chargerLoveSchool({force=false}={}){
 if(loveBusy)return;
 if(loveSchool&&!force){afficherLoveCatalogue();return;}
 loveBusy=true;const action=$("refreshLoveSchool");if(action)action.disabled=true;
 text("loveStatus","Chargement de Love School…");
 try{
  const data=await request("/love-school");
  loveSchool=data.ecole;
  afficherLoveCatalogue();
  if(loveSelected)afficherLoveCours(loveSelected);
 }catch(e){text("loveStatus",e.message||"Love School momentanément indisponible.");}
 finally{loveBusy=false;if(action)action.disabled=false;}
}
function basculerLoveAnimations(){
 const pane=$("pane-love"),pause=pane.classList.toggle("love-motion-paused"),bouton=$("loveMotionToggle");
 bouton.setAttribute("aria-pressed",String(pause));
 bouton.textContent=pause?"Reprendre les animations":"Mettre les animations en pause";
}

function renderBiblio(){
 const r=snapshot.ressources||{generales:[],nouveautes:[]};
 const nouv=(r.nouveautes||[]),vu=vuLe(),fraiches=nouv.filter(x=>x.cree>vu);
 const badge=$("badgeBiblio");badge.hidden=!fraiches.length;badge.textContent=String(fraiches.length);
 const UI=window.SDEAcademyUI;
 $("biblioNouveautes").innerHTML=nouv.length?'<h3>Nouveautés des 14 derniers jours</h3><ul class="numbered">'+nouv.map(x=>'<li><span class="chip type-'+esc(x.type)+'">'+esc(UI.TYPES[x.type]||"Ressource")+'</span> '+(snapshot.courses.some(c=>c.id===x.portee)?'<button type="button" class="button" data-course="'+esc(x.portee)+'" data-onglet-cours="ressources">'+esc(x.titre)+' ('+esc(x.portee)+')</button>':esc(x.titre))+' <span class="muted">· '+esc(UI.dateFr(x.cree))+'</span></li>').join("")+'</ul>':'';
 $("biblioGenerale").innerHTML=(r.generales||[]).length?r.generales.map((x,i)=>UI.ressourceHtml(x,i)).join(""):'<div class="vide">La bibliothèque générale est vide pour le moment. Les enseignants et coachs y publient des ressources ouvertes à tous les apprenants.</div>';
}
/* Synchronisation légère des supports publiés, sans recharger les exercices ou les vidéos en cours. */
let syncRessourcesEnCours=false;
async function synchroniserRessources({manuel=false}={}){
  if(syncRessourcesEnCours||!snapshot||(!manuel&&document.hidden))return;
  syncRessourcesEnCours=true;
  const bouton=$("refreshAcademyResources");
  if(bouton&&manuel)bouton.disabled=true;
  try{
    const r=await request("/ressources/etat");
    const next=r.ressources||{generales:[],nouveautes:[],parCours:{}};
    const diff=JSON.stringify(next)!==JSON.stringify(snapshot.ressources||{});
    if(diff){
      snapshot.ressources=next;
      renderBiblio();renderCatalogue();
      text("academySyncStatus","Nouvelles ressources chargées. Pour un cours déjà ouvert, ouvrez l’onglet Ressources et cliquez sur « Actualiser ce cours ».");
    }else if(manuel){text("academySyncStatus","Bibliothèque à jour.");}
  }catch(e){if(manuel)text("academySyncStatus",e.message||"Actualisation indisponible.");}
  finally{syncRessourcesEnCours=false;if(bouton)bouton.disabled=false;}
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
function avantCoursAcademy(c){
 activeCourse=null;
 const panel=$("courseDetail");panel.hidden=false;
 mainTabs.activer("parcours");
 const conditions=(c.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join("");
 const restrictions=(c.restrictions||[]).map(x=>'<li>'+esc(x)+'</li>').join("");
 const statut=c.acces?.statut||"verrouille";
 const niveauOk=!!c.acces?.prerequisNiveau;
 const etat=statut==="en_attente"?"Votre demande est en attente de validation.":statut==="refuse"?"Votre demande a été refusée.":statut==="revoque"?"L'accès à ce cours a été retiré.":"Ce cours est verrouillé jusqu'à la décision d'un formateur habilité.";
 const button=!niveauOk?'<p class="notice">Validez les huit cours du niveau précédent pour demander l’ouverture de ce module.</p>':
   statut==="en_attente"?'<p class="notice">Votre responsable pédagogique examine la demande. Aucune leçon, vidéo ou épreuve n’est disponible pour le moment.</p>':
   '<button type="button" class="button primary" data-sa-demander="'+esc(c.id)+'">'+(statut==="refuse"||statut==="revoque"?"Renouveler la demande":"Demander la validation du cours")+'</button>';
 panel.innerHTML='<div class="eyebrow">Soldiers Academy · '+esc(c.id)+' · Niveau '+esc(c.level)+' · 🔒 Autorisation requise</div>'+
  '<h2>'+esc(c.title)+'</h2><p>'+esc(c.description||"")+'</p>'+
  '<h3>Objectifs du cours</h3><ul>'+((c.objectifs||[]).map(x=>'<li>'+esc(x)+'</li>').join(""))+'</ul>'+
  '<h3>Conditions d’admission</h3><ul>'+conditions+'</ul>'+
  '<h3>Restrictions et règles de protection</h3><ul>'+restrictions+'</ul>'+
  '<p><strong>État :</strong> '+esc(etat)+'</p>'+
  (c.acces?.commentaire?'<p class="muted"><strong>Note pédagogique :</strong> '+esc(c.acces.commentaire)+'</p>':"")+
  button+'<p id="saAccessStatus" role="status" aria-live="polite"></p>'+
  '<div class="actions"><button type="button" class="button" data-sa-retour>Retour aux 24 cours</button></div>';
 panel.scrollIntoView({behavior:"smooth",block:"start"});
}
async function demanderCoursAcademy(id,bouton){
 if(bouton)bouton.disabled=true;
 text("saAccessStatus","Transmission de la demande…");
 try{
  const r=await request("/acces/demander","POST",{cours:id});
  alertMessage(r.message);
  await reload();
  const c=snapshot.courses.find(x=>x.id===id);if(c)avantCoursAcademy(c);
 }catch(e){text("saAccessStatus",e.message||"Demande non transmise.");}
 finally{if(bouton&&bouton.isConnected)bouton.disabled=false;}
}

async function openCourse(id,onglet){
 const entree=snapshot?.courses?.find(x=>x.id===id);
 if(!entree)return;
 if(!entree.acces?.autorise){avantCoursAcademy(entree);return;}
 try{
  alertMessage("Ouverture du cours "+id+"…");
  const d=await request("/cours/"+encodeURIComponent(id));const c=d.course;
  activeCourse=c;const s=snapshot.courses.find(x=>x.id===id);
  const UI=window.SDEAcademyUI,res=d.ressources||[];
  mainTabs.activer("parcours");
  const panel=$("courseDetail");panel.hidden=false;
  const presentation='<p>'+esc(c.purpose)+'</p><p><strong>Lectures bibliques :</strong> '+esc(c.refs)+'</p><h3>Objectifs pédagogiques</h3><ol class="numbered">'+c.goals.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>';
  const lecons=c.units.map((x,i)=>'<details class="lecon"'+(i===0?" open":"")+'><summary><span class="chip">Leçon '+x.number+' · 90 min</span> '+esc(x.title)+'</summary><div class="corps"><p>'+esc(x.body)+'</p><p class="muted"><strong>À lire :</strong> '+esc(x.scriptures)+'</p><button type="button" class="button academy-dyn-lesson-button" aria-pressed="false" data-dyn-cours="'+esc(c.id)+'" data-dyn-termine="'+x.number+'">Marquer cette leçon comme étudiée</button><small class="academy-dyn-lesson-status" role="status"></small></div></details>').join("");
  const ressourcesListe=res.length?'<div class="stack">'+res.map((x,i)=>UI.ressourceHtml(x,i)).join("")+'</div>':'<div class="vide">Aucune ressource pour ce cours pour le moment. Vos enseignants et coachs y ajouteront des vidéos, documents et leçons : elles apparaîtront ici dès leur publication.</div>';
  const ressources='<div class="actions"><button type="button" class="button" data-refresh-course-resources>Actualiser ce cours</button><span id="courseResourcesStatus" role="status" aria-live="polite" class="muted"></span></div><div id="courseResourcesList">'+ressourcesListe+'</div>';
  const suivi='<h3>Suivi des acquis</h3><p>Quiz : '+esc(scoreText(s.quiz))+' · Travaux : '+esc(scoreText(s.exercises))+' · Participation : '+esc(scoreText(s.participation))+' · Examen : '+esc(scoreText(s.exam))+' · Assiduité : '+esc(s.attendance)+' %</p><p><strong>Note finale :</strong> '+esc(scoreText(s.average))+' · '+(s.passed?"Cours validé":"Validation : 70/100 et au moins 80 % de présence")+'</p>'+(s.feedback?.length?'<h3>Retours de correction</h3><ul>'+s.feedback.map(f=>'<li><strong>'+esc(f.type)+' · '+esc(f.score)+'/100</strong> — '+esc(f.commentaire)+'</li>').join('')+'</ul>':'');
  const evals=suivi+renderExerciseForm(c,"quiz",c.quiz,s)+renderExerciseForm(c,"exercises",c.exercises,s)+renderExerciseForm(c,"exam",c.exam,s);
  const onglets=[["presentation","Présentation",presentation],["lecons","Leçons",lecons],["ressources","Ressources"+(res.length?" ("+res.length+")":""),ressources],["evaluations","Évaluations",evals]];
  panel.innerHTML='<div class="eyebrow">'+esc(c.id)+' · Niveau '+c.level+' · 8 heures</div><h2>'+esc(c.title)+'</h2>'+(s.passed?'<span class="chip ok">Cours validé</span>':"")+
   '<section id="academyDynCourse" class="academy-dyn-course" aria-label="Mon suivi de lecture"></section><div class="tabs sub" role="tablist" aria-label="Contenu du cours" id="courseTabs">'+onglets.map(([k,l],i)=>'<button type="button" role="tab" id="tab-c-'+k+'" aria-controls="pane-c-'+k+'" aria-selected="'+(i===0)+'" '+(i===0?"":'tabindex="-1"')+'>'+esc(l)+'</button>').join("")+'</div>'+
   onglets.map(([k,,html],i)=>'<div role="tabpanel" id="pane-c-'+k+'" aria-labelledby="tab-c-'+k+'" '+(i===0?'class="pane"':"hidden")+'>'+html+'</div>').join("")+
   '<section id="academyDynActivities" class="academy-dyn-activities" aria-label="Activités, classes virtuelles et coaching"></section><button class="button" type="button" id="backCourses">← Revenir à la liste</button>';
  const sub=UI.tabs($("courseTabs"));
  if(onglets.some(x=>x[0]===onglet))sub.activer("c-"+onglet);
  $("backCourses").addEventListener("click",()=>{panel.hidden=true;$("catalogue").scrollIntoView({behavior:"smooth"});});
  window.SDEAcademyDyn?.chargerCours(id);
  panel.scrollIntoView({behavior:"smooth",block:"start"});alertMessage("Cours "+id+" ouvert.");
 }catch(e){alertMessage(e.message);}
}
async function actualiserRessourcesCours(button){
  const id=activeCourse?.id;
  if(!id)return;
  button.disabled=true;
  text("courseResourcesStatus","Actualisation des supports…");
  try{
    const d=await request("/cours/"+encodeURIComponent(id));
    if(activeCourse?.id!==id)return;
    const liste=$("courseResourcesList");
    if(!liste)return;
    const res=Array.isArray(d.ressources)?d.ressources:[];
    const UI=window.SDEAcademyUI;
    liste.innerHTML=res.length?'<div class="stack">'+res.map((x,i)=>UI.ressourceHtml(x,i)).join("")+'</div>':'<div class="vide">Aucune ressource publiée pour ce cours.</div>';
    const onglet=$("tab-c-ressources");
    if(onglet)onglet.textContent="Ressources ("+res.length+")";
    text("courseResourcesStatus","Supports à jour : "+res.length+" ressource"+(res.length>1?"s":"")+".");
  }catch(e){text("courseResourcesStatus",e.message||"Actualisation indisponible.");}
  finally{button.disabled=false;}
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
 const saDemande=ev.target.closest("[data-sa-demander]");if(saDemande){await demanderCoursAcademy(saDemande.dataset.saDemander,saDemande);return;}
 const saRetour=ev.target.closest("[data-sa-retour]");if(saRetour){$("courseDetail").hidden=true;$("catalogue").scrollIntoView({behavior:"smooth"});return;}
 const refresh=ev.target.closest("[data-refresh-course-resources]");
 if(refresh){await actualiserRessourcesCours(refresh);return;}
 const publicChoix=ev.target.closest("[data-love-public]");if(publicChoix){
   const id=publicChoix.dataset.lovePublic;
   if(["tous","singles","fiances","maries"].includes(id)){
     lovePublicActif=id;loveSelected=null;
     $("loveSchoolDetail").hidden=true;
     afficherLoveCatalogue();
   }
   return;
 }
 const love=ev.target.closest("[data-love-course]");if(love){mainTabs.activer("love");ouvrirLoveCours(love.dataset.loveCourse);return;}
 const demander=ev.target.closest("[data-love-demander]");if(demander){await demanderLoveCours(demander.dataset.loveDemander,demander);return;}
 const charger=ev.target.closest("[data-love-charger]");if(charger){await chargerLoveDetail(charger.dataset.loveCharger);return;}
 const adult=ev.target.closest("[data-love-adulte]");if(adult){ouvrirLoveAdulte(adult.dataset.loveAdulte,adult);return;}
 const test=ev.target.closest("[data-love-quiz]");if(test){verifierLoveQuiz(test);return;}
 const retour=ev.target.closest("[data-love-retour]");if(retour){loveSelected=null;$("loveSchoolDetail").hidden=true;$("loveSchoolCourses").scrollIntoView({behavior:"smooth"});return;}
 const btn=ev.target.closest("[data-course]");if(btn&&!btn.disabled){openCourse(btn.dataset.course,btn.dataset.ongletCours);return;}
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
  mainTabs=window.SDEAcademyUI.tabs($("mainTabs"),id=>{if(id==="love")chargerLoveSchool();if(id==="biblio"){synchroniserRessources({manuel:true});try{localStorage.setItem("sde-academy-biblio-vu",String(Date.now()))}catch{}$("badgeBiblio").hidden=true;}});
  await reload();alertMessage("Bienvenue dans votre parcours Soldiers Academy 2027.");
  if(location.hash==="#love-school")mainTabs.activer("love");
  if(snapshot.admin)await loadGestion();
 }catch(e){
   alertMessage(e.message+" — connectez-vous à votre espace personnel.");
   $("studentPage").hidden=true;$("adminPage").hidden=true;
 }
$("refreshAcademyResources")?.addEventListener("click",()=>synchroniserRessources({manuel:true}));
$("refreshLoveSchool")?.addEventListener("click",()=>chargerLoveSchool({force:true}));
$("loveMotionToggle")?.addEventListener("click",basculerLoveAnimations);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)synchroniserRessources();});
setInterval(()=>synchroniserRessources(),90000);
})();
})();