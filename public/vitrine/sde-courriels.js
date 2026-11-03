/* Pilotage des courriels automatiques (administration). */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const etat=$("co-etat");
 const dire=(t,erreur)=>{etat.textContent=t;etat.dataset.etat=erreur?"erreur":""};
 const api=async(corps)=>{
  const r=await fetch("/api/courriels",corps?{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify(corps)}:{credentials:"same-origin",cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw new Error(j.message||"Opération impossible.");
  return j;
 };
 const li=(t)=>{const e=document.createElement("li");e.textContent=t;return e};
 function afficher(j){
  $("co-config").textContent=j.configure?"L’envoi est configuré (Resend).":"L’envoi n’est pas encore configuré : il manque "+j.manque.join(", ")+". Rien ne part tant que ce n’est pas fait.";
  const a=j.abonnes,u=$("co-abonnes");u.replaceChildren(li(a.actifs+" abonné(s) confirmé(s)"),li(a.enAttente+" en attente de confirmation"),li(a.desabonnes+" désinscrit(s)"));
  const s=$("co-scenarios");s.replaceChildren();
  for(const [cle,libelle] of Object.entries(j.libelles)){
   const e=document.createElement("li"),l=document.createElement("label"),c=document.createElement("input");
   c.type="checkbox";c.checked=!!j.scenarios[cle];c.dataset.cle=cle;
   l.append(c,document.createTextNode(" "+libelle+" — "+(a.parTheme[cle]||0)+" destinataire(s)"));
   c.addEventListener("change",async()=>{
    c.disabled=true;
    try{const r=await api({scenarios:{[cle]:c.checked}});dire(c.checked?"Scénario activé.":"Scénario désactivé.");c.checked=!!r.scenarios[cle]}
    catch(err){c.checked=!c.checked;dire(err.message,true)}
    finally{c.disabled=false}
   });
   e.append(l);s.append(e);
  }
  const v=$("co-envois");v.replaceChildren();
  if(!j.envois.length)v.append(li("Aucun envoi pour le moment."));
  for(const x of j.envois)v.append(li(x.cle+" — "+x.total+" destinataire(s) — "+new Date(x.envoye).toLocaleString("fr-FR")));
 }
 (async()=>{
  try{
   const moi=await (await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})).json();
   if(moi.connecte!==true||moi.niveau<2){etat.hidden=true;$("co-refus").hidden=false;return}
   afficher(await api());$("co-bloc").hidden=false;etat.textContent="";
  }catch(err){dire(err.message||"Chargement impossible.",true)}
 })();
 $("co-apercu").addEventListener("click",async()=>{
  const z=$("co-apercu-zone");z.replaceChildren();z.hidden=false;
  try{
   const j=await api({apercu:true});
   if(!j.apercu){z.textContent="Rien à annoncer pour le moment : aucun rassemblement public à venir ni annonce récente. La lettre ne serait pas envoyée.";return}
   const h=document.createElement("h3");h.textContent=j.apercu.titre;z.append(h);
   for(const b of j.apercu.blocs){const t=document.createElement("h4");t.textContent=b.titre;const ul=document.createElement("ul");ul.className="em-points";for(const l of b.lignes)ul.append(li(l.t+(l.d?" — "+l.d:"")));z.append(t,ul)}
  }catch(err){z.textContent=err.message}
 });
 $("co-test").addEventListener("click",async()=>{
  const b=$("co-test");b.disabled=true;dire("Envoi du test…");
  try{const j=await api({test:true});dire(j.message)}catch(err){dire(err.message,true)}finally{b.disabled=false}
 });
})();
