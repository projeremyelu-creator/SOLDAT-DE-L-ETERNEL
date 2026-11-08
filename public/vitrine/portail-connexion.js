/* Authentification unifiée — sessions HTTP-only existantes, aucun secret dans l'URL. */
(() => {
 "use strict";
 const debut = () => {
  const panels=[...document.querySelectorAll(".access-panel")];
  const tabs=[...document.querySelectorAll(".access-tabs [role=tab]")];
  const status=document.getElementById("access-message");
  if(!tabs.length||!status)return;
  for(const [i,input] of [...document.querySelectorAll('input[type="password"]')].entries()){
   input.id=input.id||"access-password-"+i;
   const toggle=document.createElement("button");toggle.type="button";
   toggle.className="access-password-toggle";toggle.textContent="Afficher le mot de passe";
   // Surface tactile accessible, même si une ancienne règle CSS est en cache.
   toggle.style.setProperty("min-height","44px","important");
   toggle.style.setProperty("height","44px","important");
   toggle.setAttribute("aria-controls",input.id);toggle.setAttribute("aria-pressed","false");
   toggle.addEventListener("click",()=>{const visible=input.type==="password";input.type=visible?"text":"password";toggle.setAttribute("aria-pressed",String(visible));toggle.textContent=visible?"Masquer le mot de passe":"Afficher le mot de passe";});
   input.parentElement.insertAdjacentElement("afterend",toggle);
  }
  const mode=()=>new URL(location.href).searchParams.get("mode")||"connexion";
  const retour=()=>{const r=new URL(location.href).searchParams.get("retour");return ["/administration","/mon-espace","/administration/academy","/mon-espace/academy","/mon-espace/enseignants","/administration/enseignants"].includes(r)?r:"/portail";};
  function afficher(nom){
   const selected=tabs.some(x=>x.dataset.mode===nom)?nom:"connexion";
   for(const p of panels)p.hidden=p.id!=="panel-"+selected;
   for(const t of tabs){
    const active=t.dataset.mode===selected;
    t.setAttribute("aria-selected",String(active));
    t.tabIndex=active?0:-1;
   }
   status.textContent=""; status.dataset.state="";
  }
  for(const tab of tabs){tab.addEventListener("click",()=>{afficher(tab.dataset.mode);tab.focus()});tab.addEventListener("keydown",event=>{
   if(["ArrowRight","ArrowLeft","Home","End"].includes(event.key)){
     event.preventDefault();
     const index=tabs.indexOf(tab);
     const next=event.key==="Home"?tabs[0]:event.key==="End"?tabs[tabs.length-1]:
       tabs[(index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length];
     afficher(next.dataset.mode);next.focus();
   }
  })}
  /* Lien "Mot de passe oublié ?" sous le formulaire de connexion */
  for(const btn of document.querySelectorAll("[data-goto]")){
   btn.addEventListener("click",()=>{afficher(btn.dataset.goto);tabs.find(t=>t.dataset.mode===btn.dataset.goto)?.focus()});
  }
  const inscription=document.getElementById("form-inscription");
  const mdpInscription=inscription?.elements.motDePasse;
  const confirmationMdp=inscription?.elements.confirmationMotDePasse;
  const aideMdp=document.getElementById("access-password-guidance");
  const actualiserMdp=()=>{
   if(!mdpInscription||!aideMdp)return;
   const valeur=mdpInscription.value;
   aideMdp.textContent=!valeur?"Utilisez au moins 8 caractères et choisissez un mot de passe unique.":
     valeur.length<8?"Encore "+(8-valeur.length)+" caractère(s) pour atteindre le minimum.":
     "Longueur minimale atteinte. Un mot de passe long et unique est recommandé.";
   if(confirmationMdp?.value)confirmationMdp.setCustomValidity(confirmationMdp.value===valeur?"":"Les mots de passe ne correspondent pas.");
  };
  mdpInscription?.addEventListener("input",actualiserMdp);
  confirmationMdp?.addEventListener("input",actualiserMdp);
  async function envoyer(form,endpoint){
   if(endpoint==="/api/inscription"){
    actualiserMdp();
    if(confirmationMdp?.value!==mdpInscription?.value){
     confirmationMdp?.setCustomValidity("Les mots de passe ne correspondent pas.");
     status.dataset.state="";status.textContent="Veuillez saisir le même mot de passe dans les deux champs.";
     confirmationMdp?.focus();return;
    }
    confirmationMdp?.setCustomValidity("");
   }
   if(!form.reportValidity())return;
   const b=Object.fromEntries(new FormData(form).entries());
   delete b.confirmationMotDePasse;
   const button=form.querySelector("button[type=submit]");button.disabled=true;
   status.dataset.state=""; status.textContent="Vérification en cours…";
   try {
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(b)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true){status.textContent=result.message||"Impossible de poursuivre. Vérifiez les informations.";return}
    if(endpoint==="/api/recuperation"){
     status.dataset.state="success";status.textContent=result.message||"Votre demande a été enregistrée auprès du secrétariat.";return;
    }
    const nouveauMembre=endpoint==="/api/inscription";
    status.dataset.state="success";
    status.textContent=nouveauMembre?"Votre compte membre est créé"+(result.matricule?" (matricule : "+result.matricule+")":"")+". Ouverture de votre espace…":"Connexion établie. Ouverture de votre espace…";
    const confirmation=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"});
    const me=await confirmation.json();
    if(!confirmation.ok||me.connecte!==true){status.dataset.state="";status.textContent="Votre session n'a pas pu être confirmée. Réessayez de vous connecter.";return}
    const destination=nouveauMembre?"/mon-espace":retour();
    if(destination.startsWith("/administration")&&me.niveau<1){
     status.replaceChildren(document.createTextNode("Votre compte est connecté, mais l'administration est réservée aux responsables habilités. "));
     const lien=document.createElement("a");lien.href="/mon-espace";lien.textContent="Ouvrir mon espace membre";status.append(lien);return;
    }
    if(me.mdpTemporaire===true||result.changerMotDePasse===true){location.assign("/mot-de-passe?retour="+encodeURIComponent(destination));return}
    location.assign(destination);
   } catch(_){status.textContent="Connexion impossible. Vérifiez votre réseau et réessayez."}
   finally{button.disabled=false}
  }
  for(const [nom,endpoint] of [["connexion","/api/connexion"],["inscription","/api/inscription"],["activation","/api/activation"],["recuperation","/api/recuperation"]]){
   document.getElementById("form-"+nom)?.addEventListener("submit",e=>{e.preventDefault();envoyer(e.currentTarget,endpoint)});
  }
  const targets=[...document.querySelectorAll('[data-access-target]')];
  const selectTarget=target=>{for(const b of targets)b.setAttribute('aria-pressed',String(b.dataset.accessTarget===target))};
  const initialTarget=new URL(location.href).searchParams.get('retour');selectTarget(initialTarget?.startsWith('/administration')?'/administration':'/mon-espace');
  for(const button of targets)button.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('retour',button.dataset.accessTarget);history.replaceState({},'',url);selectTarget(button.dataset.accessTarget);afficher('connexion')});
  afficher(mode());
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",debut,{once:true});else debut();
})();
