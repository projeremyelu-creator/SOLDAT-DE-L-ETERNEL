/* Afficher uniquement les canaux individuels explicitement confirmés.
 * Un indicateur global ne garantit pas que chaque moyen de paiement est actif. */
(function () {
 "use strict";
 var liste=document.getElementById("pay-liste");
 var note=document.getElementById("pay-note");
 if(liste)liste.hidden=true;
 fetch("/api/sde-demarches/statut",{credentials:"omit"}).then(function(r){return r.ok?r.json():null;}).then(function(d){
  if(!d)return;
  var confirmes=d.paiementsActifs===true&&Array.isArray(d.canauxActifs)?d.canauxActifs.filter(function(x){return typeof x==="string";}):[];
  var ensemble=new Set(confirmes);
  var actifs=0;
  document.querySelectorAll(".pay-etat").forEach(function(el){
   var ok=ensemble.has(el.dataset.canal);
   var li=el.closest("li");
   if(li)li.hidden=!ok;
   el.textContent=ok?"Coordonnées vérifiées":"En préparation";
   el.classList.toggle("actif",ok);
   if(ok)actifs++;
  });
  if(liste)liste.hidden=actifs===0;
  if(note)note.textContent=actifs>0
    ?"Certains canaux sont confirmés. Le secrétariat vous communique les coordonnées exactes après vérification de votre demande."
    :"Le paiement en ligne reste en préparation. Adressez votre demande au secrétariat pour connaître les modalités vérifiées disponibles.";
 }).catch(function(){
  if(liste)liste.hidden=true;
  if(note)note.textContent="Demandez au secrétariat les modalités actuellement vérifiées avant tout transfert.";
 });
})();