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
   toggle.setAttribute("aria-controls",input.id);toggle.setAttribute("aria-pressed","false");
   toggle.addEventListener("click",()=>{const visible=input.type==="password";input.type=visible?"text":"password";toggle.setAttribute("aria-pressed",String(visible));toggle.textContent=visible?"Masquer le mot de passe":"Afficher le mot de passe";});
   input.parentElement.insertAdjacentElement("afterend",toggle);
  }
  const mode=()=>new URL(location.href).searchParams.get("mode")||"connexion";
  const retour=()=>new URL(location.href).searchParams.get("retour")==="/administration"?"/administration":"/mon-espace";
  function afficher(nom){
   const selected=tabs.some(x=>x.dataset.mode===nom)?nom:"connexion";
   for(const p of panels)p.hidden=p.id!=="panel-"+selected;
   for(const t of tabs)t.setAttribute("aria-selected",String(t.dataset.mode===selected));
   status.textContent=""; status.dataset.state="";
  }
  for(const tab of tabs){tab.addEventListener("click",()=>{afficher(tab.dataset.mode);tab.focus()});tab.addEventListener("keydown",event=>{
   if(event.key==="ArrowRight"||event.key==="ArrowLeft"){
     event.preventDefault();const index=tabs.indexOf(tab),next=tabs[(index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length];afficher(next.dataset.mode);next.focus();
   }
  })}
  /* Lien "Mot de passe oublié ?" sous le formulaire de connexion */
  for(const btn of document.querySelectorAll("[data-goto]")){
   btn.addEventListener("click",()=>{afficher(btn.dataset.goto)});
  }
  async function envoyer(form,endpoint){
   if(!form.reportValidity())return;
   const b=Object.fromEntries(new FormData(form).entries());
   const button=form.querySelector("button[type=submit]");button.disabled=true;
   status.dataset.state=""; status.textContent="Vérification en cours…";
   try {
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(b)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true){status.textContent=result.message||"Impossible de poursuivre. Vérifiez les informations.";return}
    if(endpoint==="/api/recuperation"){
     status.dataset.state="success";status.textContent=result.message||"Votre demande a été enregistrée auprès du secrétariat.";return;
    }
    status.dataset.state="success";status.textContent="Connexion établie. Ouverture de votre espace…";
    const confirmation=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"});
    const me=await confirmation.json();
    if(!confirmation.ok||me.connecte!==true){status.dataset.state="";status.textContent="Votre session n'a pas pu être confirmée. Réessayez de vous connecter.";return}
    const destination=retour();
    if(destination==="/administration"&&me.niveau<1){
     status.replaceChildren(document.createTextNode("Votre compte est connecté, mais l'administration est réservée aux responsables habilités. "));
     const lien=document.createElement("a");lien.href="/mon-espace";lien.textContent="Ouvrir mon espace membre";status.append(lien);return;
    }
    location.assign(destination);
   } catch(_){status.textContent="Connexion impossible. Vérifiez votre réseau et réessayez."}
   finally{button.disabled=false}
  }
  for(const [nom,endpoint] of [["connexion","/api/connexion"],["inscription","/api/inscription"],["activation","/api/activation"],["recuperation","/api/recuperation"]]){
   document.getElementById("form-"+nom)?.addEventListener("submit",e=>{e.preventDefault();envoyer(e.currentTarget,endpoint)});
  }
  afficher(mode());
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",debut,{once:true});else debut();
})();
