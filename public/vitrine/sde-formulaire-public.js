/* Formulaire public créé par l'administration (/f/<identifiant>). Aucune donnée n'est conservée dans le navigateur. */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const m=location.pathname.match(/^\/f\/([a-z0-9-]{2,39})$/);
 const etat=$("fp-etat"),form=$("fp-form");
 const dire=(t,erreur)=>{etat.hidden=!t;etat.textContent=t||"";etat.dataset.etat=erreur?"erreur":""};
 if(!m){dire("Adresse de formulaire invalide.",true);return}
 const el=(tag,props={},...enfants)=>{const e=document.createElement(tag);Object.assign(e,props);e.append(...enfants);return e};
 let def=null;
 function champ(f){
  const nom="c_"+f.id,etiquette=f.etiquette+(f.requis?"":" (facultatif)");
  if(f.type==="cases"||f.type==="choix"&&f.options.length<=4||f.type==="oui_non"){
   const options=f.type==="oui_non"?["oui","non"]:f.options,multiple=f.type==="cases";
   const fs=el("fieldset",{className:"nl-themes"},el("legend",{},etiquette));
   options.forEach((o,i)=>{
    const inp=el("input",{type:multiple?"checkbox":"radio",name:nom,value:o,id:nom+"_"+i});
    fs.append(el("label",{className:"check"},inp,document.createTextNode(" "+(f.type==="oui_non"?(o==="oui"?"Oui":"Non"):o))));
   });
   if(f.aide)fs.append(el("small",{},f.aide));
   return fs;
  }
  let inp;
  if(f.type==="texte_long")inp=el("textarea",{rows:5,maxLength:2000});
  else if(f.type==="choix"){inp=el("select",{});inp.append(el("option",{value:""},"— Choisir —"));f.options.forEach(o=>inp.append(el("option",{value:o},o)))}
  else{
   inp=el("input",{});
   inp.type={email:"email",telephone:"tel",nombre:"number",date:"date"}[f.type]||"text";
   if(f.type==="texte")inp.maxLength=300;
   if(f.type==="telephone")inp.autocomplete="tel";
   if(f.type==="email")inp.autocomplete="email";
  }
  inp.name=nom;
  const l=el("label",{},etiquette,inp);
  if(f.aide)l.append(el("small",{},f.aide));
  return l;
 }
 function valeurs(){
  const r={};
  for(const f of def.champs){
   const nom="c_"+f.id;
   if(f.type==="cases")r[f.id]=[...form.querySelectorAll('[name="'+nom+'"]:checked')].map(x=>x.value);
   else if(f.type==="oui_non"||f.type==="choix"&&f.options.length<=4){const x=form.querySelector('[name="'+nom+'"]:checked');r[f.id]=x?x.value:""}
   else r[f.id]=form.elements[nom].value;
  }
  return r;
 }
 (async()=>{
  try{
   const r=await fetch("/api/f/"+m[1],{cache:"no-store"}),j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok)throw new Error(j.message||"Formulaire indisponible.");
   def=j.formulaire;
   document.title=def.titre+" | Mouvement SDE";
   $("fp-titre").textContent=def.titre;$("fp-intro").textContent=def.intro||"";
   def.champs.forEach(f=>form.append(champ(f)));
   form.append(el("div",{className:"nl-piege","aria-hidden":"true"},el("label",{},"Ne pas remplir",el("input",{name:"site",tabIndex:-1,autocomplete:"off"}))));
   const consent=el("input",{type:"checkbox",name:"consentement",required:true});
   form.append(el("label",{className:"check"},consent,document.createTextNode(" J’accepte que mes réponses soient enregistrées par le Mouvement SDE pour traiter ma demande. "),el("a",{href:"/contact#confidentialite"},"Confidentialité"),document.createTextNode(".")));
   form.append(el("button",{type:"submit",className:"hub-btn"},"Envoyer"),el("p",{className:"hub-message",id:"fp-message",role:"status"}));
   $("fp-zone").hidden=false;dire("");
  }catch(e){dire(e.message,true)}
 })();
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  const msg=$("fp-message"),bouton=form.querySelector("button[type=submit]");
  if(!form.elements.consentement.checked){msg.textContent="Veuillez accepter l’enregistrement de vos réponses.";return}
  bouton.disabled=true;msg.textContent="Envoi…";
  try{
   const r=await fetch("/api/f/"+m[1],{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reponses:valeurs(),consentement:true,site:form.elements.site.value})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok)throw new Error(j.message||"Envoi impossible.");
   form.replaceChildren(el("p",{className:"hub-lead",role:"status"},j.message||"Merci !"));
  }catch(e){msg.textContent=e.message;bouton.disabled=false}
 });
})();
