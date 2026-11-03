/* Création des comptes des membres (administration). Les mots de passe temporaires ne vivent
   que dans cette page : rien n'est stocké dans le navigateur. */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const etat=$("cm-etat"),bloc=$("cm-bloc"),refus=$("cm-refus");
 let crees=[];
 const dire=(t,erreur)=>{etat.textContent=t;etat.dataset.etat=erreur?"erreur":""};
 const cellule=t=>{const td=document.createElement("td");td.textContent=t;return td};
 const post=async corps=>{
  const r=await fetch("/api/comptes/membres",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify(corps)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw new Error(j.message||"Opération impossible.");
  return j;
 };
 const ignores=liste=>{
  const zone=$("cm-ignores"),ul=$("cm-ignores-liste");ul.replaceChildren();
  const groupes=new Map();
  for(const i of liste||[]){const g=groupes.get(i.raison)||[];g.push(i.nom);groupes.set(i.raison,g)}
  for(const [raison,noms] of groupes){const li=document.createElement("li");li.textContent=noms.length+" fiche(s) — "+raison+" : "+noms.slice(0,12).join(", ")+(noms.length>12?"…":"");ul.append(li)}
  zone.hidden=groupes.size===0;
 };
 const csvCase=v=>{let s=String(v??"");if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 (async()=>{
  try{
   const moi=await (await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"})).json();
   if(moi.connecte!==true||moi.niveau<2){etat.hidden=true;refus.hidden=false;return}
   etat.textContent="";bloc.hidden=false;
  }catch(e){dire("Impossible de vérifier vos droits. Réessayez.",true)}
 })();
 $("cm-apercu").addEventListener("click",async()=>{
  dire("Analyse de la liste des membres…");
  try{
   const j=await post({simuler:true});
   const r=$("cm-resume");r.hidden=false;
   r.textContent=j.acreer+" compte(s) seraient créés sur "+j.total+" fiche(s) de la liste.";
   $("cm-creer").hidden=j.acreer===0;ignores(j.ignores);
   dire(j.acreer?"Aperçu prêt : rien n’a encore été créé.":"Aucun compte à créer pour le moment.");
  }catch(e){dire(e.message,true)}
 });
 $("cm-creer").addEventListener("submit",async e=>{
  e.preventDefault();
  const bouton=$("cm-lancer");bouton.disabled=true;$("cm-apercu").disabled=true;crees=[];$("cm-lignes").replaceChildren();
  try{
   for(let tour=0;tour<80;tour++){
    dire("Création des comptes… "+crees.length+" déjà créés");
    const j=await post({simuler:false});
    for(const c of j.crees){
     crees.push(c);const tr=document.createElement("tr");
     tr.append(cellule(c.nom),cellule(c.matricule),cellule(c.email||"Connexion par matricule"),cellule(c.motDePasse));$("cm-lignes").append(tr);
    }
    $("cm-resultat").hidden=false;$("cm-compte").textContent=crees.length+" compte(s) créé(s). Ces mots de passe ne seront plus affichés : téléchargez la liste maintenant.";
    if(tour===0)ignores(j.ignores);
    if(!j.crees.length||!j.restants)break;
   }
   dire("Terminé : "+crees.length+" compte(s) créé(s).");
   $("cm-creer").hidden=true;
  }catch(err){dire(err.message+" Les comptes déjà créés restent valables : téléchargez la liste affichée.",true)}
  finally{bouton.disabled=false;$("cm-apercu").disabled=false}
 });
 $("cm-csv").addEventListener("click",()=>{
  const lignes=[["Nom","Matricule","E-mail","Mot de passe temporaire (14 jours)"],...crees.map(c=>[c.nom,c.matricule,c.email,c.motDePasse])];
  const blob=new Blob(["﻿"+lignes.map(l=>l.map(csvCase).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="comptes-membres-sde.csv";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 });
 $("cm-imprimer").addEventListener("click",()=>window.print());
})();
