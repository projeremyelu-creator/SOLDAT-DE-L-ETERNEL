/* Studio enseignants et coachs : publication de ressources visibles dans l'espace de chaque apprenant. */
(()=>{
"use strict";
const UI=window.SDEAcademyUI,esc=UI.esc;
const api="/api/soldiers-academy";
const $=id=>document.getElementById(id);
let G=null,edition=null,onglets=null;
const dire=(m,id="status")=>{const n=$(id);if(n)n.textContent=m||""};
async function appel(chemin,methode="GET",charge){
  const o={method:methode,credentials:"same-origin",headers:{accept:"application/json"}};
  if(charge!==undefined){o.headers["content-type"]="application/json";o.body=JSON.stringify(charge)}
  const r=await fetch(api+chemin,o);let d;try{d=await r.json()}catch{throw Error("Réponse serveur non reconnue.")}
  if(!r.ok||d.ok===false)throw Error(d.message||"Erreur ("+r.status+")");
  return d;
}
const libellePortee=p=>{
  if(p==="GENERAL")return "Bibliothèque générale (tous les apprenants)";
  if(/^N[123]$/.test(p))return "Niveau "+["I","II","III"][Number(p[1])-1]+" — tous les cours du niveau";
  const c=G.cours.find(x=>x.id===p);return c?c.id+" — "+c.title:p;
};
function optionsPortees(){
  const ok=new Set(G.autorisees);
  const groupes=[["Général",["GENERAL"]],["Niveaux",["N1","N2","N3"]],["Cours du tronc commun",G.cours.filter(c=>!c.bonus).map(c=>c.id)],["Love School · bonus",G.cours.filter(c=>c.bonus).map(c=>c.id)]];
  return groupes.map(([t,l])=>{const o=l.filter(x=>ok.has(x));return o.length?'<optgroup label="'+esc(t)+'">'+o.map(x=>'<option value="'+esc(x)+'">'+esc(libellePortee(x))+'</option>').join("")+'</optgroup>':""}).join("");
}
function typeUI(){
  const t=$("champType").value;
  const texte=t==="note"||t==="exercice";
  $("blocTexte").hidden=!texte;$("blocLien").hidden=texte;
  $("blocFichier").hidden=texte||t==="lien";
  $("aideLien").textContent=t==="video"?"Liens YouTube et Vimeo acceptés : la vidéo se lit directement dans l’espace de l’apprenant.":"Adresse web complète commençant par https://";
  $("libFichier").textContent=t==="video"?"Ou téléversez un fichier vidéo ou audio (MP4, WebM, MP3…)":"Ou téléversez un document (PDF, Word, PowerPoint, Excel)";
  $("champFichier").accept=t==="video"?".mp4,.m4v,.mov,.webm,.mp3,.m4a,.aac,.wav,.ogg":".pdf,.doc,.docx,.ppt,.pptx,.pps,.ppsx,.xls,.xlsx,.csv";
  $("champUrl").placeholder=t==="video"?"https://www.youtube.com/watch?v=…":"https://";
}
function metriques(){
  const mine=G.ressources.filter(r=>G.fonction==="administrateur"||r.auteurId===G.moi);
  const pub=mine.filter(r=>r.publie).length;
  $("studioMetrics").innerHTML=[[G.fonction==="administrateur"?"Direction":G.fonction==="coach"?"Coach":"Enseignant","Votre fonction"],[mine.length,"Ressources déposées"],[pub,"Visibles des apprenants"],[G.autorisees.length,"Cours et portées confiés"]]
    .map(([a,b])=>'<div class="metric"><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div>').join("");
}
function liste(){
  const admin=G.fonction==="administrateur";
  const l=G.ressources.filter(r=>admin||r.auteurId===G.moi);
  $("titreListe").textContent=admin?"Toutes les publications (supervision)":"Mes publications";
  $("tab-liste").textContent=admin?"Supervision":"Mes publications";
  $("listeRessources").innerHTML=l.length?l.map((r,i)=>{
    const peut=admin||(r.auteurId===G.moi&&G.autorisees.includes(r.portee));
    return '<div>'+UI.ressourceHtml(r,i,{apercu:true})+'<p class="muted">Destination : '+esc(libellePortee(r.portee))+(admin?' · Auteur : '+esc(r.auteur):"")+'</p>'+
      (peut?'<div class="actions"><button type="button" class="button" data-modifier="'+esc(r.id)+'">Modifier</button><button type="button" class="button" data-publier="'+esc(r.id)+'" data-etat="'+(r.publie?"1":"0")+'">'+(r.publie?"Retirer de la publication":"Publier")+'</button><button type="button" class="button" data-supprimer="'+esc(r.id)+'">Supprimer</button></div>':"")+'</div>';
  }).join(""):'<div class="vide">Aucune ressource pour le moment. Utilisez l’onglet « Publier » pour ajouter votre première vidéo ou leçon.</div>';
}
function equipe(){
  if(G.fonction!=="administrateur")return;
  $("tab-equipe").hidden=false;
  $("choixPortees").innerHTML=["GENERAL","N1","N2","N3",...G.cours.map(c=>c.id)].map(p=>'<label class="check"><input type="checkbox" name="portee" value="'+esc(p)+'"> '+esc(libellePortee(p))+'</label>').join("");
  const f=G.formateurs||[];
  $("listeEquipe").innerHTML=f.length?f.map(x=>'<article class="review"><div class="eyebrow">'+esc(x.fonction)+'</div><h3>'+esc(x.nom)+'</h3><p class="muted">'+esc(x.email)+' · '+esc(x.portees.length)+' cours/portées confiés</p><details><summary>Voir les cours confiés</summary><p>'+x.portees.map(p=>esc(libellePortee(p))).join("<br>")+'</p></details><button type="button" class="button" data-retirer="'+esc(x.compte)+'">Retirer la désignation</button></article>').join(""):'<div class="vide">Aucun enseignant ni coach désigné pour l’instant.</div>';
}

/* Un seul centre de validation : 24 cours officiels + 10 modules Love School. */
async function chargerValidations(){
 const portees=G?.autorisees||[],admin=G?.fonction==="administrateur";
 const besoinSA=admin||portees.some(p=>/^SA-\d{2}$/.test(p)||/^N[123]$/.test(p));
 const besoinLove=admin||portees.some(p=>/^LS-(?:0[1-9]|10)$/.test(p));
 const collect=[];
 if(besoinSA)collect.push(appel("/acces/gestion").then(data=>({source:"academy",...data})));
 if(besoinLove)collect.push(appel("/love-school/acces/gestion").then(data=>({source:"love",...data})));
 if(!collect.length){$("loveDemandes").innerHTML='<div class="vide">Aucun cours confié à cette équipe.</div>';return;}
 const resultat=await Promise.allSettled(collect),data=resultat.filter(x=>x.status==="fulfilled").map(x=>x.value);
 const erreurs=resultat.filter(x=>x.status==="rejected").map(x=>x.reason?.message||"Erreur de récupération");
 if(!data.length)throw Error(erreurs.join(" · "));
 const demandes=data.flatMap(g=>(g.demandes||[]).map(d=>({...d,source:g.source}))).sort((a,b)=>(a.statut==="en_attente"?0:1)-(b.statut==="en_attente"?0:1)||b.demandeLe-a.demandeLe);
 const titres=Object.fromEntries(data.flatMap(x=>x.cours||[]).map(c=>[c.id,c.title]));
 const enAttente=demandes.filter(d=>d.statut==="en_attente");
 const badge=$("loveValidationBadge");badge.hidden=!enAttente.length;badge.textContent=String(enAttente.length);
 $("loveDemandes").innerHTML=demandes.length?demandes.map(d=>{
  const etat=d.statut==="en_attente"?"À examiner":d.statut==="approuve"?"Cours ouvert":d.statut==="refuse"?"Demande refusée":"Accès retiré";
  const prefix='data-acces-source="'+esc(d.source)+'" data-compte="'+esc(d.compte)+'" data-cours="'+esc(d.cours)+'"';
  const actions=d.statut==="en_attente"?
    '<div class="actions"><button type="button" class="button primary" data-love-decision="approuve" '+prefix+'>Valider et ouvrir le cours</button>'+
    '<button type="button" class="button" data-love-decision="refuse" '+prefix+'>Refuser la demande</button></div>':
    d.statut==="approuve"?'<div class="actions"><button type="button" class="button" data-love-decision="revoque" '+prefix+'>Retirer l’accès au cours</button></div>':'';
  return '<article class="review love-decision-card"><div class="eyebrow">'+(d.source==="academy"?"Soldiers Academy · ":"Love School · ")+esc(d.cours)+' · '+esc(etat)+'</div>'+
   '<h3>'+esc(titres[d.cours]||d.cours)+'</h3>'+
   '<p><strong>Apprenant :</strong> '+esc(d.nom)+' <span class="muted">'+esc(d.email)+'</span></p>'+
   '<p class="muted">Demande : '+esc(UI.dateFr(d.demandeLe))+(d.decisionLe?' · Décision : '+esc(UI.dateFr(d.decisionLe)):'')+'</p>'+
   (d.commentaire?'<p class="muted">Commentaire : '+esc(d.commentaire)+'</p>':'')+
   (actions?'<label class="field">Commentaire facultatif (sans donnée pastorale, médicale ou intime)<textarea maxlength="400" rows="2" data-love-note placeholder="Décision ou consigne pédagogique"></textarea></label>'+actions:'')+'</article>';
 }).join(""):'<div class="vide">Aucune demande d’accès pour les cours qui vous ont été confiés.</div>';
 $("loveValidationStatus").textContent=enAttente.length+" demande(s) en attente sur "+demandes.length+" dossier(s)."+
  (erreurs.length?" Une source n'a pas été chargée : "+erreurs.join(" · "):"");
}
function rendreValidationVisible(){
 const autorise=G?.fonction==="administrateur"||(G?.autorisees||[]).some(p=>/^(?:LS-(?:0[1-9]|10)|SA-\d{2}|N[123])$/.test(p));
 $("tab-validations").hidden=!autorise;
 if(!autorise)return;
 chargerValidations().catch(e=>dire(e.message||"Impossible de charger les demandes.","loveValidationStatus"));
}

async function charger(){
  G=await appel("/ressources/gestion");
  $("champPortee").innerHTML=optionsPortees();
  typeUI();metriques();liste();equipe();rendreValidationVisible();
  $("studio").hidden=false;
}
/* ── Téléversement par morceaux dans la médiathèque (visibilité : comptes connectés) ── */
async function televerser(fichier,titre){
  const etat=m=>dire(m,"etatUpload"),barre=$("barUpload"),i=barre.firstElementChild;
  barre.hidden=false;i.style.width="0%";
  let r=await fetch("/api/medias",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({titre,nom:fichier.name,taille:fichier.size,visibilite:"membres",categorie:"Soldiers Academy"})});
  let d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.message||"Le fichier est refusé par la médiathèque.");
  const id=d.id,morceau=d.morceau;
  for(let k=0;k<d.morceaux;k++){
    let essai=0;
    for(;;){
      try{
        r=await fetch("/api/medias/"+id+"/"+k,{method:"PUT",credentials:"same-origin",body:fichier.slice(k*morceau,Math.min(fichier.size,(k+1)*morceau))});
        if(!r.ok)throw Error((await r.json().catch(()=>({}))).message||"Envoi interrompu.");
        break;
      }catch(e){
        essai++;
        if(essai>=4){await fetch("/api/medias/"+id,{method:"DELETE",credentials:"same-origin"}).catch(()=>{});throw e}
        etat("Réseau instable, nouvel essai ("+essai+"/3)…");await new Promise(s=>setTimeout(s,1500*essai));
      }
    }
    i.style.width=Math.round((k+1)/d.morceaux*100)+"%";etat("Envoi : "+Math.round((k+1)/d.morceaux*100)+" %");
  }
  r=await fetch("/api/medias/"+id+"/fin",{method:"POST",credentials:"same-origin"});
  d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.message||"Envoi incomplet.");
  etat("Fichier envoyé.");
  return id;
}
function remettreFormulaire(){
  edition=null;$("formRessource").reset();$("champPublie").checked=true;
  $("titreForm").textContent="Nouvelle ressource";$("btnPublier").textContent="Publier";$("btnAnnuler").hidden=true;
  $("champPortee").disabled=false;$("champType").disabled=false;$("barUpload").hidden=true;dire("","etatUpload");typeUI();
}
$("champType").addEventListener("change",typeUI);
$("btnAnnuler").addEventListener("click",remettreFormulaire);
$("formRessource").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=e.currentTarget,btn=$("btnPublier");btn.disabled=true;
  try{
    const type=$("champType").value,fichier=$("champFichier").files[0];
    const charge={titre:f.elements.titre.value.trim(),description:f.elements.description.value.trim(),publie:$("champPublie").checked};
    if(type==="note"||type==="exercice")charge.texte=f.elements.texte.value;
    else{
      const url=f.elements.url.value.trim();
      if(fichier){dire("Envoi du fichier…");charge.mediaId=await televerser(fichier,charge.titre)}
      else if(url)charge.url=url;
      else if(!edition)throw Error(type==="lien"?"Indiquez l’adresse du lien.":"Collez un lien ou choisissez un fichier.");
    }
    if(edition){
      charge.id=edition.id;
      if(!charge.mediaId&&edition.media&&!charge.url){/* conserve le fichier déjà téléversé */}
      await appel("/ressources","PATCH",charge);dire("Ressource mise à jour.");
    }else{
      charge.portee=$("champPortee").value;charge.type=type;
      const r=await appel("/ressources","POST",charge);dire(r.message);
    }
    remettreFormulaire();await charger();onglets.activer("liste");
  }catch(err){dire(err.message)}finally{btn.disabled=false}
});
document.addEventListener("click",async e=>{
  const decision=e.target.closest("[data-love-decision]");
  if(decision){
    decision.disabled=true;
    const note=decision.closest(".love-decision-card")?.querySelector("[data-love-note]")?.value||"";
    try{
      const route=decision.dataset.accesSource==="academy"?"/acces/decision":"/love-school/acces/decision";
      const d=await appel(route,"PATCH",{
        compte:decision.dataset.compte,cours:decision.dataset.cours,decision:decision.dataset.loveDecision,commentaire:note
      });
      dire(d.message||"Décision enregistrée.","loveValidationStatus");
      await chargerValidations();
    }catch(err){dire(err.message||"Décision refusée.","loveValidationStatus")}
    finally{if(decision.isConnected)decision.disabled=false}
    return;
  }
  const b=e.target.closest("[data-modifier],[data-publier],[data-supprimer],[data-retirer]");if(!b)return;
  try{
    if(b.dataset.modifier){
      const r=G.ressources.find(x=>x.id===b.dataset.modifier);if(!r)return;
      edition=r;onglets.activer("publier");
      $("champPortee").value=r.portee;$("champType").value=r.type;typeUI();
      $("champPortee").disabled=true;$("champType").disabled=true;
      const f=$("formRessource");f.elements.titre.value=r.titre;f.elements.description.value=r.description||"";
      f.elements.texte.value=r.texte||"";f.elements.url.value=r.media?"":(r.genre==="youtube"||r.genre==="vimeo"?"":r.url||"");
      $("champPublie").checked=!!r.publie;$("titreForm").textContent="Modifier la ressource";$("btnPublier").textContent="Enregistrer";$("btnAnnuler").hidden=false;
      dire(r.media?"Fichier déjà téléversé : laissez les champs lien/fichier vides pour le conserver.":(r.genre==="youtube"||r.genre==="vimeo"?"Collez de nouveau le lien de la vidéo pour la remplacer, ou laissez vide pour la conserver.":""),"etatUpload");
      f.scrollIntoView({behavior:"smooth"});
    }else if(b.dataset.publier){
      await appel("/ressources","PATCH",{id:b.dataset.publier,publie:b.dataset.etat!=="1"});await charger();dire(b.dataset.etat==="1"?"Ressource retirée de la publication.":"Ressource publiée : visible des apprenants.");
    }else if(b.dataset.supprimer){
      if(!confirm("Supprimer définitivement cette ressource ? Les apprenants ne la verront plus."))return;
      const r=await appel("/ressources/supprimer","POST",{id:b.dataset.supprimer});
      if(r.media)await fetch("/api/medias/"+r.media,{method:"DELETE",credentials:"same-origin"}).catch(()=>{});
      await charger();dire("Ressource supprimée.");
    }else if(b.dataset.retirer){
      if(!confirm("Retirer la désignation de cette personne ? Ses ressources déjà publiées restent visibles."))return;
      await appel("/formateurs/retirer","POST",{compte:b.dataset.retirer});await charger();dire("Désignation retirée.");
    }
  }catch(err){dire(err.message)}
});
$("loveValiderActualiser").addEventListener("click",()=>chargerValidations().catch(e=>dire(e.message,"loveValidationStatus")));
$("toutesPortees").addEventListener("change",e=>{for(const c of document.querySelectorAll('#choixPortees input'))c.checked=e.target.checked});
$("formFormateur").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget;
  try{
    const tous=$("toutesPortees").checked;
    const portees=tous?"tous":[...f.querySelectorAll('#choixPortees input:checked')].map(x=>x.value);
    const r=await appel("/formateurs","POST",{compte:f.elements.compte.value.trim(),fonction:f.elements.fonction.value,portees});
    f.reset();dire(r.message);await charger();
  }catch(err){dire(err.message)}
});
(async()=>{
  onglets=UI.tabs($("studioTabs"));
  try{await charger();dire("Studio prêt. Ce que vous publiez est visible immédiatement des apprenants concernés.")}
  catch(e){dire(e.message+" — connectez-vous avec un compte d’enseignant ou de coach désigné par la direction pédagogique.")}
})();
})();
