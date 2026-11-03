/* Changement obligatoire côté client ; la protection décisive est dans le Worker. */
(()=>{"use strict";
const start=()=>{
 const form=document.getElementById('sde-first-form'),status=document.getElementById('sde-first-message'),submit=document.getElementById('sde-first-submit');
 const report=(message,success=false)=>{status.textContent=message;status.dataset.state=success?'success':'error'};
 document.getElementById('sde-first-visible').addEventListener('change',e=>{
  for(const input of form.querySelectorAll('input[type=password],input[type=text]'))input.type=e.target.checked?'text':'password';
 });
 document.getElementById('sde-first-logout').addEventListener('click',async()=>{
  try{await fetch('/api/deconnexion',{method:'POST',credentials:'same-origin',cache:'no-store'})}catch{}
  location.assign('/connexion');
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const fd=new FormData(form),ancien=String(fd.get('ancien')||''),nouveau=String(fd.get('nouveau')||'');
  if(nouveau.length<12){report('Le nouveau mot de passe doit compter au moins 12 caractères.');return}
  if(nouveau!==String(fd.get('confirmation')||'')){report('Les mots de passe ne correspondent pas.');return}
  if(nouveau===ancien){report('Le nouveau mot de passe doit être différent du mot de passe provisoire.');return}
  submit.disabled=true;report('Sécurisation de votre compte…');
  try{
   const res=await fetch('/api/mot-de-passe',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:JSON.stringify({ancien,nouveau})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.ok){report(data.message||'Impossible de modifier le mot de passe.');return}
   form.reset();report('Votre mot de passe personnel est enregistré. Ouverture de votre espace…',true);
   const meRes=await fetch('/api/moi',{credentials:'same-origin',cache:'no-store'});
   const me=await meRes.json().catch(()=>({}));
   if(!meRes.ok||!me.connecte||me.premiereConnexion){report('Changement enregistré, mais la session doit être vérifiée. Reconnectez-vous.');return}
   location.assign(me.niveau>=1?'/administration':'/mon-espace');
  }catch{report('Connexion indisponible. Vérifiez votre réseau.')}finally{submit.disabled=false}
 });
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();