/* Inscription à la lettre SDE : double confirmation par e-mail, désinscription en un clic. */
(()=>{
 "use strict";
 const form=document.getElementById("nl-form"),etat=document.getElementById("nl-etat"),msg=document.getElementById("nl-message");
 const textes={
  confirme:["Votre inscription est confirmée. Merci et bienvenue !",false],
  desabonne:["Vous êtes désinscrit : vous ne recevrez plus nos messages.",false],
  invalide:["Ce lien n’est plus valable. Vous pouvez vous réinscrire ci-dessous.",true]
 };
 const e=new URL(location.href).searchParams.get("etat");
 if(etat&&textes[e]){etat.textContent=textes[e][0];etat.hidden=false;if(textes[e][1])etat.dataset.etat="erreur"}
 if(!form)return;
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  const d=new FormData(form),themes=d.getAll("themes");
  if(!themes.length){msg.textContent="Choisissez au moins un type de message.";return}
  const bouton=form.querySelector("button[type=submit]");bouton.disabled=true;msg.textContent="Envoi…";
  try{
   const r=await fetch("/api/newsletter",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify({nom:d.get("nom"),email:d.get("email"),themes,consentement:d.get("consentement")==="on",site:d.get("site")})});
   const j=await r.json().catch(()=>({}));
   msg.textContent=j.message||(r.ok?"Merci !":"Inscription impossible pour le moment.");
   if(r.ok&&j.ok)form.reset();
  }catch(err){msg.textContent="Connexion impossible. Vérifiez votre réseau."}
  finally{bouton.disabled=false}
 });
})();
