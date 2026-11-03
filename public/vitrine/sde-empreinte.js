/* Empreinte / Face ID (WebAuthn) — gestion des appareils. Aucune donnée biométrique ne transite. */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const dec=s=>{const p=s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0)).buffer};
 const enc=buf=>{let s="";for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
 async function api(chemin,methode="GET",corps){
  const r=await fetch(chemin,{method:methode,credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.message||"Le service est indisponible. Réessayez.");e.statut=r.status;throw e}
  return d;
 }
 const etat=(t,erreur=false)=>{const n=$("em-etat");n.textContent=t;n.dataset.etat=erreur?"erreur":""};
 const date=ms=>new Date(ms).toLocaleDateString("fr-CI",{timeZone:"Africa/Abidjan",day:"2-digit",month:"long",year:"numeric"});
 const compatible=()=>!!(window.PublicKeyCredential&&navigator.credentials&&navigator.credentials.create);
 async function liste(){
  const d=await api("/api/passkeys");
  const ul=$("em-liste");ul.replaceChildren();
  for(const p of d.passkeys){
   const li=document.createElement("li"),texte=document.createElement("span"),b=document.createElement("button");
   texte.textContent=p.nom+" · ajouté le "+date(p.cree)+(p.derniere?" · utilisé le "+date(p.derniere):"");
   b.type="button";b.className="sq-retirer";b.textContent="Retirer";
   b.addEventListener("click",async()=>{
    if(b.dataset.confirme!=="1"){b.dataset.confirme="1";b.textContent="Confirmer le retrait";return}
    b.disabled=true;
    try{await api("/api/passkeys/"+p.id,"DELETE");etat("Appareil retiré.");await liste()}catch(e){etat(e.message,true);b.disabled=false}
   });
   li.append(texte,b);ul.append(li);
  }
  $("em-vide").hidden=d.passkeys.length>0;
  $("em-bouton").disabled=d.passkeys.length>=d.max;
  return d;
 }
 async function activer(nom){
  const {publicKey}=await api("/api/passkeys/creation/options","POST",{});
  const options={...publicKey,challenge:dec(publicKey.challenge),user:{...publicKey.user,id:dec(publicKey.user.id)},excludeCredentials:(publicKey.excludeCredentials||[]).map(c=>({...c,id:dec(c.id)}))};
  const cred=await navigator.credentials.create({publicKey:options});
  const r=cred.response;
  await api("/api/passkeys/creation","POST",{defi:publicKey.challenge,id:enc(cred.rawId),clientDataJSON:enc(r.clientDataJSON),authenticatorData:enc(r.getAuthenticatorData()),publicKey:enc(r.getPublicKey()),algo:r.getPublicKeyAlgorithm(),nom});
 }
 async function debut(){
  try{
   await liste();
   $("em-gestion").hidden=false;
   if(!compatible()){$("em-activer").hidden=true;etat("Cet appareil ou ce navigateur ne permet pas l’empreinte ou Face ID. Essayez avec un téléphone récent.",true);return}
   etat("");
  }catch(e){
   if(e.statut===401){etat("");$("em-connexion").hidden=false;return}
   etat(e.message,true);
  }
 }
 $("em-activer").addEventListener("submit",async e=>{
  e.preventDefault();
  const bouton=$("em-bouton");bouton.disabled=true;
  try{
   etat("Touchez le capteur ou regardez l’écran quand votre appareil vous le demande…");
   await activer(String(new FormData(e.currentTarget).get("nom")||"").trim().slice(0,40)||"Cet appareil");
   await liste();etat("Empreinte activée sur cet appareil. Vous pouvez maintenant vous connecter avec elle.");
  }catch(err){
   etat(err&&err.name==="NotAllowedError"?"L’opération a été annulée. Vous pouvez réessayer.":err&&err.name==="InvalidStateError"?"Cet appareil est déjà enregistré.":(err.message||"L’activation a échoué."),true);
   bouton.disabled=false;
  }
 });
 debut();
})();
