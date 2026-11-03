/* Soldiers Academy — interface de progression authentifiée.
   Les réponses des quiz sont corrigées exclusivement par le serveur. */
(() => {
  "use strict";
  let catalogue=null, active="m01";
  const $=s=>document.querySelector(s);
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=t=>t?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(t)):"—";
  const notice=message=>{const target=$("#message");target.textContent=message;target.dataset.show="true";target.focus?.();};
  async function request(path,options){
    const res=await fetch(path,{credentials:"same-origin",cache:"no-store",headers:{"accept":"application/json",...(options?.body?{"content-type":"application/json"}:{})},...options});
    if(res.status===401){location.assign("/connexion?retour="+encodeURIComponent(location.pathname));throw Error("Connexion expirée");}
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false)throw Error(data.message||"Service indisponible.");
    return data;
  }
  async function reload(){
    catalogue=await request("/api/soldiers-academy");
    const r=catalogue.resume;
    $("#pourcentage").textContent=r.pourcentage+" %";
    $("#barre").style.width=r.pourcentage+"%";
    $(".track").setAttribute("aria-valuenow",String(r.pourcentage));
    $("#resume").textContent=r.valides+" module"+(r.valides>1?"s":"")+" sur 12 validé"+(r.valides>1?"s":"")+" · "+r.niveauxValides+" niveau"+(r.niveauxValides>1?"x":"")+" attesté"+(r.niveauxValides>1?"s":"");
    $("#lien-admin").hidden=!catalogue.gestion;
    renderNav();
    if(active.startsWith("exam-")&&catalogue.niveaux.some(l=>l.id===Number(active.slice(5))&&l.examenDisponible))showExam(Number(active.slice(5)));
    else {if(!catalogue.modules.some(m=>m.id===active&&!m.verrouille))active=catalogue.modules.find(m=>!m.verrouille)?.id||"m01";showModule(active);}
  }
  function renderNav(){
    $("#navigation").innerHTML=catalogue.niveaux.map(l=>{
      const items=catalogue.modules.filter(m=>m.niveau===l.id);
      return '<section class="level"><div class="level-heading"><span>Niveau '+l.id+'</span><span class="tag '+(l.valide?"ok":l.verrouille?"lock":"")+'">'+(l.valide?"Attesté":l.verrouille?"Verrouillé":"Ouvert")+'</span></div>'+
       '<strong>'+escapeHtml(l.titre)+'</strong><small>'+escapeHtml(l.sousTitre)+'</small>'+
       items.map(m=>'<button type="button" class="module-btn" data-open="'+m.id+'" aria-current="'+String(active===m.id)+'" '+(m.verrouille?"disabled":"")+'><span><b>'+String(m.numero).padStart(2,"0")+'</b> · '+escapeHtml(m.titre)+'</span><span aria-label="'+(m.progression.valide?"Validé":"À faire")+'">'+(m.progression.valide?"✓":m.verrouille?"🔒":"○")+'</span></button>').join("")+
       (l.examenDisponible?'<button type="button" class="btn secondary" style="margin-top:9px;width:100%;font-size:.8rem" data-exam="'+l.id+'">Évaluation de niveau '+l.id+'</button>':"")+
       (l.valide?'<button type="button" class="btn secondary" style="margin-top:9px;width:100%;font-size:.8rem" data-cert="'+l.id+'">Voir mon attestation</button>':"")+
       '</section>';
    }).join("");
  }
  function quizForm(questions,mode,id){
    const formId=mode==="module"?"quiz-form":"examen-form";
    const attr=mode==="module"?'data-module="'+id+'"':'data-niveau="'+id+'"';
    return '<form id="'+formId+'" '+attr+'>'+questions.map((q,index)=>
      '<fieldset class="question"><legend>'+(index+1)+'. '+escapeHtml(q.question)+'</legend>'+
      q.choix.map((choix,n)=>'<label><input required type="radio" name="q'+index+'" value="'+n+'"><span>'+escapeHtml(choix)+'</span></label>').join("")+
      '</fieldset>').join("")+'<button class="btn" type="submit">Valider mes réponses</button></form>';
  }
  const list=arr=>'<ul>'+arr.map(x=>'<li>'+escapeHtml(x)+'</li>').join("")+'</ul>';
  function showModule(id){
    const m=catalogue.modules.find(x=>x.id===id);if(!m)return;
    active=id;renderNav();
    if(m.verrouille){$("#contenu").innerHTML='<h2>Niveau verrouillé</h2><p>Validez les modules et l’évaluation du niveau précédent pour poursuivre.</p>';return;}
    const pr=m.progression;
    const state=(pr.exercice?.statut||"non remis");
    let h='<p class="eyebrow">Niveau '+m.niveau+' · Module '+String(m.numero).padStart(2,"0")+'</p><h2>'+escapeHtml(m.titre)+'</h2>'+
      '<div class="details"><span>Durée indicative : '+Math.round(m.dureeMinutes/30)/2+' heures</span><span>Quiz : au moins '+m.validation.quizMinimum+' %</span><span>Exercice : validation par un formateur</span></div>'+
      '<section class="card"><h3>Objectifs pédagogiques</h3>'+list(m.objectifs)+'<h3>Passages bibliques à méditer</h3>'+list(m.references)+'</section>'+
      '<h2>Leçon écrite</h2>'+m.chapitres.map((ch,i)=>'<section class="chapter"><h3>Chapitre '+(i+1)+' — '+escapeHtml(ch.titre)+'</h3><p>'+escapeHtml(ch.contenu)+'</p></section>').join("")+
      '<section class="card"><h3>Supports complémentaires</h3><p class="muted">'+(m.medias.audio||m.medias.video?"Supports associés à ce module.":"Aucun fichier audio ou vidéo n’a encore été ajouté à ce module. La leçon écrite est disponible.")+'</p></section>'+
      '<section class="card"><h3>Exercices pratiques</h3>'+m.exercices.map((ex,i)=>'<div class="chapter"><h3>Exercice '+(i+1)+' · '+escapeHtml(ex.titre)+'</h3><p>'+escapeHtml(ex.consigne)+'</p><p><strong>Livrable :</strong> '+escapeHtml(ex.livrable)+'</p><strong>Critères :</strong>'+list(ex.criteres)+'</div>').join("")+
      '<p class="notice">Remettez une synthèse écrite de votre travail (80 à 3 000 caractères). N’incluez pas d’informations confidentielles sur des tiers. Un responsable habilité doit valider votre exercice.</p>'+
      '<div class="details"><span>Statut : '+escapeHtml(state)+'</span><span>Quiz : '+(pr.score===null?"non passé":pr.score+" %")+'</span><span>Module : '+(pr.valide?"validé":"en cours")+'</span></div>'+
      (pr.exercice?.commentaire?'<p class="feedback"><strong>Retour du formateur :</strong> '+escapeHtml(pr.exercice.commentaire)+'</p>':"")+
      (!pr.valide?'<form id="exercice-form" data-module="'+m.id+'"><label class="field"><strong>Mon travail pratique</strong><textarea required minlength="80" maxlength="3000" name="texte" placeholder="Décrivez votre démarche, vos résultats et les références bibliques mobilisées…">'+escapeHtml(pr.exercice?.texte||"")+'</textarea></label><button class="btn secondary" type="submit">'+(state==="soumis"?"Actualiser mon dépôt":"Envoyer au formateur")+'</button></form>':'<p class="statline">Exercice validé par votre formateur.</p>')+'</section>'+
      '<section class="card"><h3>Quiz de validation · 5 questions</h3><p>Vous devez obtenir au moins 80 % (4 bonnes réponses sur 5). La correction est enregistrée dans votre dossier de formation.</p>'+
      '<div id="resultat-quiz" class="feedback"></div>'+quizForm(m.quiz,"module",m.id)+'</section>'+
      '<section class="card"><h3>Critères de validation du module</h3>'+list(["Lire et comprendre les trois chapitres.","Réussir le quiz à 80 % minimum.","Remettre le travail demandé et obtenir la validation d'un responsable.","Après validation des trois modules du niveau, réussir son évaluation finale à 80 % minimum."])+'</section>';
    $("#contenu").innerHTML=h;
  }
  function showExam(n){
    const l=catalogue.niveaux.find(x=>x.id===n);
    if(!l||!l.examenDisponible){notice("Évaluation non disponible : terminez les trois modules du niveau.");return;}
    active="exam-"+n;renderNav();
    $("#contenu").innerHTML='<p class="eyebrow">Soldiers Academy · Évaluation de niveau</p><h2>Niveau '+n+' — '+escapeHtml(l.titre)+'</h2><p>Les trois modules sont validés. Réussissez cette évaluation à 80 % pour débloquer le niveau suivant et recevoir votre attestation pédagogique.</p><div id="resultat-examen" class="feedback"></div>'+quizForm(l.examen,"niveau",n);
  }
  function scoreResult(target,res){
    $(target).innerHTML='<strong>Résultat : '+res.score+' %</strong><p>'+res.detail.map(d=>(d.juste?"✓":"✗")+' Question '+d.question+' — '+escapeHtml(d.explication)).join('<br>')+'</p>';
  }
  function answers(form){
    const n=form.querySelectorAll(".question").length;
    const rep=[];for(let i=0;i<n;i++){const input=form.querySelector('input[name="q'+i+'"]:checked');if(!input)throw Error("Répondez à toutes les questions.");rep.push(Number(input.value))}
    return rep;
  }
  function displayCert(n){
    const l=catalogue.niveaux.find(x=>x.id===n);
    if(!l?.valide||!l.progression?.attestation)return notice("Aucune attestation n’a été délivrée pour ce niveau.");
    const name=escapeHtml(catalogue.nom),num=escapeHtml(l.progression.attestation),issued=fmt(l.progression.delivreeLe);
    $("#impression").innerHTML='<div class="certificate"><div class="seal">✦ SDE ✦</div><p>Le Mouvement Prophético-Apostolique Soldat de l’Éternel</p><h2>Attestation pédagogique de validation</h2><p>Cette attestation confirme que <strong>'+name+'</strong> a validé les connaissances et exercices du <strong>niveau '+n+' — '+escapeHtml(l.titre)+'</strong> du parcours Soldiers Academy.</p><p><strong>Référence :</strong> '+num+'<br><strong>Délivrée le :</strong> '+issued+'</p><p style="font-size:.8rem">Validation pédagogique numérique ; une signature autorisée est requise pour toute certification institutionnelle officielle.</p></div>';
    window.print();
  }
  async function adminQueue(){
    if(!catalogue?.gestion)return;
    const root=$("#admin-review"),holder=$("#reviews");root.hidden=false;holder.innerHTML="<p>Chargement des exercices à corriger…</p>";
    try{
      const r=await request("/api/soldiers-academy/corrections");
      if(!r.demandes.length){holder.innerHTML='<p class="statline">Aucun exercice en attente de validation.</p>';return}
      holder.innerHTML=r.demandes.map(d=>'<article class="review"><h3>'+escapeHtml(d.nom)+' · '+escapeHtml(d.titre)+'</h3><p class="muted">Déposé le '+fmt(d.soumisLe)+' · Quiz : '+(d.quizScore??"—")+' %</p><blockquote>'+escapeHtml(d.texte)+'</blockquote><form data-review-compte="'+escapeHtml(d.compte)+'" data-review-module="'+escapeHtml(d.moduleId)+'"><label class="field">Retour du formateur<textarea name="commentaire" maxlength="600" placeholder="Appréciation du travail ou amélioration nécessaire…"></textarea></label><div class="actions"><button class="btn" type="submit" name="statut" value="valide">Valider l’exercice</button><button class="btn secondary" type="submit" name="statut" value="a_revoir">Demander une révision</button></div></form></article>').join("");
    }catch(e){holder.textContent=e.message}
  }
  document.addEventListener("click",e=>{
    const open=e.target.closest("[data-open]");if(open){showModule(open.dataset.open);$("#contenu").scrollIntoView({block:"start",behavior:"smooth"});return}
    const exam=e.target.closest("[data-exam]");if(exam){showExam(Number(exam.dataset.exam));$("#contenu").scrollIntoView({block:"start",behavior:"smooth"});return}
    const cert=e.target.closest("[data-cert]");if(cert)displayCert(Number(cert.dataset.cert));
  });
  document.addEventListener("submit",async e=>{
    const f=e.target;
    if(!f.matches("#quiz-form,#examen-form,#exercice-form,[data-review-compte]"))return;
    e.preventDefault();
    const buttons=[...f.querySelectorAll("button")];buttons.forEach(b=>b.disabled=true);
    try{
      if(f.id==="quiz-form"){
        const module=f.dataset.module;
        const data=await request("/api/soldiers-academy/quiz",{method:"POST",body:JSON.stringify({moduleId:module,reponses:answers(f)})});
        await reload();scoreResult("#resultat-quiz",data);notice(data.quizReussi?"Quiz réussi. Remettez votre exercice pour validation.":"Quiz enregistré. Un score de 80 % est requis.");
      }else if(f.id==="exercice-form"){
        const data=await request("/api/soldiers-academy/exercice",{method:"POST",body:JSON.stringify({moduleId:f.dataset.module,texte:f.elements.texte.value})});
        await reload();notice(data.message);
      }else if(f.id==="examen-form"){
        const data=await request("/api/soldiers-academy/examen",{method:"POST",body:JSON.stringify({niveau:Number(f.dataset.niveau),reponses:answers(f)})});
        await reload();if($("#resultat-examen"))scoreResult("#resultat-examen",data);notice(data.examenReussi?"Niveau attesté ! Le niveau suivant est désormais débloqué.":"Note insuffisante. Révisez les leçons et recommencez.");
      }else{
        const statut=e.submitter?.value||"valide", commentaire=f.elements.commentaire.value;
        const data=await request("/api/soldiers-academy/correction",{method:"PATCH",body:JSON.stringify({compte:f.dataset.reviewCompte,moduleId:f.dataset.reviewModule,statut,commentaire})});
        await adminQueue();notice(data.statut==="valide"?"Exercice validé.":"Révision demandée au participant.");
      }
    }catch(err){notice(err.message||"Une erreur est survenue.");}
    finally{buttons.forEach(b=>b.disabled=false)}
  });
  reload().then(adminQueue).catch(err=>{$("#contenu").innerHTML='<div class="notice"><h2>Parcours temporairement indisponible</h2><p>'+escapeHtml(err.message)+'</p><p><a href="/mon-espace">Retour à mon espace</a></p></div>';});
})();
