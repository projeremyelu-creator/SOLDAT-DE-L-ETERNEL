/* Vérification publique d'une attestation Soldiers Academy (validité, intitulé, date — jamais d'identité). */
(()=>{
"use strict";
const form=document.getElementById("verif"),champ=document.getElementById("code"),zone=document.getElementById("resultat");
function afficher(classe,titre,detail){
 zone.hidden=false;zone.className=classe;zone.replaceChildren();
 const h=document.createElement("h2");h.textContent=titre;zone.append(h);
 for(const t of detail){const p=document.createElement("p");p.textContent=t;if(t.startsWith("Formation interne"))p.className="muted";zone.append(p);}
}
async function verifier(code){
 const c=String(code||"").trim().toUpperCase();
 if(!/^SDE-ACA-2027-(N[123]|PARCOURS)-[A-F0-9]{8}$/.test(c)){afficher("ko","Numéro invalide",["Le numéro doit ressembler à SDE-ACA-2027-N1-1A2B3C4D."]);return;}
 try{
  const r=await fetch("/api/academy-verification?code="+encodeURIComponent(c),{headers:{accept:"application/json"}});
  const d=await r.json();
  if(!r.ok||!d.ok){afficher("ko","Vérification impossible",[d.message||"Réessayez dans un instant."]);return;}
  if(!d.valide){afficher("ko","Document non reconnu",["Aucune attestation ne porte ce numéro. Vérifiez la saisie ou contactez le Mouvement SDE."]);return;}
  afficher("ok","Attestation authentique ✓",[d.intitule,"Délivrée le "+new Date(d.delivreeLe).toLocaleDateString("fr-FR"),"Émetteur : "+d.emetteur,d.mention]);
 }catch{afficher("ko","Vérification impossible",["Connexion indisponible. Réessayez."]);}
}
form.addEventListener("submit",e=>{e.preventDefault();verifier(champ.value);});
const initial=new URLSearchParams(location.search).get("code");
if(initial){champ.value=initial.slice(0,40);verifier(initial);}
})();
