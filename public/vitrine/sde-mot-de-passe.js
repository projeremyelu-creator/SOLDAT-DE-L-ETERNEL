/* Changement de mot de passe après la première connexion (mot de passe temporaire). */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const etat=$("mp-etat"),bloc=$("mp-bloc"),connexion=$("mp-connexion"),form=$("mp-form");
 const retour=()=>{const r=new URL(location.href).searchParams.get("retour");return ["/administration","/mon-espace","/administration/academy","/mon-espace/academy","/mon-espace/enseignants","/administration/enseignants"].includes(r)?r:"/mon-espace"};
 const dire=(t,erreur)=>{etat.textContent=t;etat.dataset.etat=erreur?"erreur":""};
 (async()=>{
  try{
   const r=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"});const moi=await r.json();
   if(moi.connecte!==true){connexion.hidden=false;return}
   bloc.hidden=false;
   if(moi.mdpTemporaire)dire("Votre mot de passe actuel est temporaire : choisissez le vôtre pour sécuriser votre compte.");
  }catch(e){dire("Impossible de vérifier votre session. Réessayez.",true)}
 })();
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(form).entries());
  if(d.nouveau!==d.confirmation){dire("Les deux nouveaux mots de passe ne sont pas identiques.",true);return}
  if(d.nouveau===d.ancien){dire("Choisissez un mot de passe différent du mot de passe temporaire.",true);return}
  const bouton=form.querySelector("button[type=submit]");bouton.disabled=true;dire("Enregistrement…");
  try{
   const r=await fetch("/api/mot-de-passe",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({ancien:d.ancien,nouveau:d.nouveau})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok!==true){dire(j.message||"Le mot de passe n’a pas pu être modifié.",true);return}
   form.reset();dire("Mot de passe enregistré. Ouverture de votre espace…");
   setTimeout(()=>location.assign(retour()),900);
  }catch(err){dire("Connexion impossible. Vérifiez votre réseau.",true)}
  finally{bouton.disabled=false}
 });
})();
