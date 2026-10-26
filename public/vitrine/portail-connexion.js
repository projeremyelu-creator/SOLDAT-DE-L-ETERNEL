/* Authentification unifiée — sessions HTTP-only existantes, aucun secret dans l'URL. */
(() => {
 "use strict";
 const debut = () => {
  const panels=[...document.querySelectorAll(".access-panel")];
  const tabs=[...document.querySelectorAll(".access-tabs [role=tab]")];
  const status=document.getElementById("access-message");
  if(!tabs.length||!status)return;
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
  async function envoyer(form,endpoint){
   const b=Object.fromEntries(new FormData(form).entries());
   const button=form.querySelector("button[type=submit]");button.disabled=true;
   status.dataset.state=""; status.textContent="Vérification en cours…";
   try {
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(b)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true){status.textContent=result.message||"Impossible de poursuivre. Vérifiez les informations.";return}
    status.dataset.state="success";status.textContent="Connexion établie. Ouverture de votre espace…";
    const me=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
    const destination=retour();
    location.assign(destination==="/administration"&&me.niveau<2?"/mon-espace":destination);
   } catch(_){status.textContent="Connexion impossible. Vérifiez votre réseau et réessayez."}
   finally{button.disabled=false}
  }
  for(const [nom,endpoint] of [["connexion","/api/connexion"],["inscription","/api/inscription"],["activation","/api/activation"]]){
   document.getElementById("form-"+nom)?.addEventListener("submit",e=>{e.preventDefault();envoyer(e.currentTarget,endpoint)});
  }
  afficher(mode());
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",debut,{once:true});else debut();
})();