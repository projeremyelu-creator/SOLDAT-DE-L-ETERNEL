/* Connexion par empreinte / Face ID. Le bouton n'apparaît que si l'appareil sait le faire ;
   l'empreinte reste sur l'appareil, le serveur ne vérifie qu'une signature. */
(()=>{
 "use strict";
 const dec=s=>{const p=s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0)).buffer};
 const enc=buf=>{let s="";for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
 const debut=()=>{
  const form=document.getElementById("form-connexion"),statut=document.getElementById("access-message");
  if(!form||!statut||!window.PublicKeyCredential||!navigator.credentials||!navigator.credentials.get)return;
  const zone=document.createElement("div");zone.className="access-empreinte";
  const bouton=document.createElement("button");bouton.type="button";bouton.className="access-empreinte-bouton";
  bouton.textContent="Se connecter avec mon empreinte ou Face ID";
  const aide=document.createElement("small");aide.textContent="Disponible après activation dans votre espace membre. Votre empreinte reste sur votre appareil.";
  zone.append(bouton,aide);form.insertAdjacentElement("afterend",zone);
  const retour=()=>{const r=new URL(location.href).searchParams.get("retour");return ["/administration","/mon-espace"].includes(r)?r:"/portail"};
  const post=async(chemin,corps)=>{const r=await fetch(chemin,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify(corps||{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.message||"Connexion impossible."),{statut:r.status});return d};
  bouton.addEventListener("click",async()=>{
   bouton.disabled=true;statut.dataset.state="";statut.textContent="Touchez le capteur ou regardez l’écran quand votre appareil vous le demande…";
   try{
    const {publicKey}=await post("/api/passkeys/connexion/options");
    const cred=await navigator.credentials.get({publicKey:{...publicKey,challenge:dec(publicKey.challenge)}});
    const r=cred.response;
    await post("/api/passkeys/connexion",{defi:publicKey.challenge,id:enc(cred.rawId),clientDataJSON:enc(r.clientDataJSON),authenticatorData:enc(r.authenticatorData),signature:enc(r.signature)});
    const moi=await (await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})).json();
    if(moi.connecte!==true){statut.textContent="Votre session n’a pas pu être confirmée. Réessayez.";return}
    const destination=retour();
    if(destination==="/administration"&&moi.niveau<1){location.assign("/mon-espace");return}
    location.assign(destination);
   }catch(e){
    statut.textContent=e&&e.name==="NotAllowedError"?"Opération annulée. Vous pouvez réessayer ou utiliser votre mot de passe.":(e&&e.message)||"Connexion par empreinte impossible. Utilisez votre matricule et votre mot de passe.";
   }finally{bouton.disabled=false}
  });
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",debut,{once:true});else debut();
})();
