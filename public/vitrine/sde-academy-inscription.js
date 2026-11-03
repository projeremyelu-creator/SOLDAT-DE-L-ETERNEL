/* Inscription directe aux cours Soldiers Academy : compte apprenant ouvert à tous (membre ou non). */
(()=>{
"use strict";
const form=document.getElementById("form-inscription-cours");
if(!form)return;
const msg=document.getElementById("ic-message"),btn=document.getElementById("ic-envoyer");
const dire=(t,ok)=>{msg.textContent=t;msg.style.color=ok?"#7fd4a2":"#ff9aa8";};
form.addEventListener("submit",async e=>{
 e.preventDefault();
 const f=new FormData(form),v=n=>String(f.get(n)||"").trim();
 if(!v("prenoms")||!v("nom"))return dire("Indiquez votre nom et vos prénoms.");
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email")))return dire("Adresse e-mail invalide.");
 if(String(f.get("motDePasse")||"").length<8)return dire("Le mot de passe doit compter au moins 8 caractères.");
 if(!form.elements.consentement.checked)return dire("Acceptez l'utilisation de vos données pour le suivi de votre formation.");
 btn.disabled=true;dire("Création de votre compte…",true);
 try{
  const r=await fetch("/api/academy-inscription",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({prenoms:v("prenoms"),nom:v("nom"),email:v("email"),telephone:v("telephone"),pays:v("pays"),ville:v("ville"),motDePasse:String(f.get("motDePasse")),consentement:true})});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok||!d.ok){dire(d.message||d.erreur||"Inscription impossible pour le moment. Réessayez.");btn.disabled=false;return;}
  dire("Compte créé. Ouverture de vos cours…",true);
  location.assign(d.retour||"/mon-espace/academy");
 }catch{dire("Connexion indisponible. Réessayez.");btn.disabled=false;}
});
})();
