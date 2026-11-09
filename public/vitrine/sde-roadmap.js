/* Objectifs éditoriaux : aucune étape future n'est présentée comme déjà accomplie. */
(function(){
 "use strict";
 var section=document.getElementById("roadmap-sde");
 if(!section)return;
 var roadmap={
  "2026":{progress:0,status:"Phase actuelle · 2026",title:"2026 · Structurer, réveiller et digitaliser",desc:"Structurer les cinq pôles, développer le portail des membres et ancrer les grands rendez-vous du mouvement.",verbs:"Réveiller · Restaurer · Organiser",cards:[
   ["Rassemblements","IN FIRE & TPA 2026","IN FIRE et Traversée Prophétique Annuelle, prévue le 18 décembre 2026."],
   ["Gouvernance","Portail & cinq pôles","Développer les cartes de membre et la coordination des pôles REV, ISH, LO, CMR et FDE."],
   ["Réseau","Liens entre les nations","Renforcer les échanges entre Abidjan et les membres présents dans d’autres pays."]]},
  "2027":{progress:300,status:"Cap envisagé · 2027",title:"2027 · Former les disciples et intensifier l’impact",desc:"Développer les promotions de la Soldiers Academy, les missions humanitaires et préparer IN FIRE 2027.",verbs:"Former · Équiper · Servir",cards:[
   ["Pôle FDE","Soldiers Academy","Former de nouvelles cohortes aux fondements bibliques, au leadership et à l’entrepreneuriat."],
   ["Pôle ISH","Missions humanitaires","Organiser le soutien aux veuves, orphelins et familles vulnérables, avec un suivi transparent."],
   ["Pôle CMR","Soldiers Voice","Développer la diffusion des enseignements, des vidéos et des temps de louange."]]},
  "2028":{progress:600,status:"Horizon envisagé · 2028",title:"2028 · Équiper et envoyer vers les nations",desc:"Étendre les liens internationaux, accompagner des cellules d’intercession et préparer des responsables à servir localement.",verbs:"Équiper · Envoyer · Servir les nations",cards:[
   ["Expansion","Nouveaux relais","Étudier de nouveaux points d’ancrage en Afrique, en Europe et en Amérique."],
   ["Leadership","Envoi de responsables","Accompagner des personnes formées par la Soldiers Academy dans les pôles locaux."],
   ["Convergence","Rencontres internationales","Préparer des rencontres qui réunissent les cinq pôles autour de la prière et du service."]]}
 };
 var buttons=Array.from(section.querySelectorAll("[data-roadmap-year]"));
 var line=section.querySelector("#roadmap-progress-line");
 var status=section.querySelector("#rm-status"),title=section.querySelector("#rm-title"),desc=section.querySelector("#rm-desc"),verbs=section.querySelector("#rm-verbs"),milestones=section.querySelector("#rm-milestones");
 function select(year){
  var data=roadmap[year];if(!data)return;
  line.setAttribute("x2",String(data.progress));
  status.textContent=data.status;title.textContent=data.title;desc.textContent=data.desc;verbs.textContent=data.verbs;
  milestones.replaceChildren(...data.cards.map(function(card){
   var article=document.createElement("article"),tag=document.createElement("span"),heading=document.createElement("h4"),body=document.createElement("p");
   tag.textContent=card[0];heading.textContent=card[1];body.textContent=card[2];article.append(tag,heading,body);return article;
  }));
  buttons.forEach(function(button){var active=button.dataset.roadmapYear===year;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));});
 }
 buttons.forEach(function(button){button.addEventListener("click",function(){select(button.dataset.roadmapYear);});});
})();
