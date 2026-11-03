/* Chat Squad — messagerie texte par Squad. Tout le contenu est inséré avec textContent. */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const POLES={REV:"Réveil et évangélisation",ISH:"Impact social et humanitaire",LO:"Logistique et organisation",CMR:"Communication, médias et relations extérieures",FDE:"Formation, développement et entrepreneuriat"};
 const RAFRAICHIR_MS=8000;
 let squad=null,droit=null,dernier=0,minuteur=null,plusAncien=0,peutGerer=false;
 async function api(chemin,methode="GET",corps){
  const r=await fetch(chemin,{method:methode,credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.message||"Le service est indisponible. Réessayez.");e.statut=r.status;throw e}
  return d;
 }
 const el=(tag,props={},...enfants)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==="class")n.className=v;else if(k==="text")n.textContent=v;else if(k.startsWith("on"))n.addEventListener(k.slice(2),v);else n.setAttribute(k,v)}for(const e of enfants)if(e)n.append(e);return n};
 const etat=(t,erreur=false)=>{const n=$("sq-etat");n.textContent=t;n.dataset.etat=erreur?"erreur":""};
 const heure=ms=>new Date(ms).toLocaleString("fr-CI",{timeZone:"Africa/Abidjan",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
 const montrer=(...ids)=>{for(const id of ["sq-connexion","sq-liste","sq-fil","sq-admin"])$(id).hidden=!ids.includes(id)};
 /* ───── liste ───── */
 async function liste(){
  arreter();squad=null;
  try{
   const d=await api("/api/squads");
   etat("");
   const ul=$("sq-cartes");ul.replaceChildren();
   for(const s of d.squads){
    const nb=s.nonLus>0?el("span",{class:"sq-nonlus",text:String(s.nonLus),"aria-label":s.nonLus+" message(s) non lu(s)"}):null;
    const bouton=el("button",{type:"button",onclick:()=>ouvrir(s.id)},
     el("strong",{text:s.nom}),
     el("span",{class:"sq-meta",text:[s.pole?POLES[s.pole]||s.pole:"Squad transversale",s.membres+" membre"+(s.membres>1?"s":""),s.statut==="archive"?"archivée":""].filter(Boolean).join(" · ")}),
     s.description?el("span",{class:"sq-meta",text:s.description}):null,nb);
    ul.append(el("li",{class:"sq-carte"},bouton));
   }
   $("sq-vide").hidden=d.squads.length>0;
   montrer("sq-liste",...(d.peutCreer?["sq-admin"]:[]));
  }catch(e){
   if(e.statut===401){etat("");montrer("sq-connexion");return}
   etat(e.message,true);montrer();
  }
 }
 /* ───── fil de discussion ───── */
 function ligneMessage(m){
  const li=el("li",{class:"sq-msg"+(m.moi?" sq-moi":""),"data-id":m.id});
  const tete=el("div",{class:"sq-msg-tete"},el("strong",{text:m.moi?"Moi":m.nom}),el("time",{datetime:new Date(m.cree).toISOString(),text:heure(m.cree)}));
  if(m.retirable){
   const b=el("button",{type:"button",class:"sq-retirer",text:"Retirer"});
   b.addEventListener("click",async()=>{
    if(b.dataset.confirme!=="1"){b.dataset.confirme="1";b.textContent="Confirmer le retrait";return}
    b.disabled=true;
    try{await api("/api/squads/"+squad+"/messages/"+m.id,"DELETE");li.remove()}catch(e){etat(e.message,true);b.disabled=false}
   });
   tete.append(b);
  }
  li.append(tete,el("p",{class:"sq-texte",text:m.texte}));
  return li;
 }
 const bas=()=>{const z=$("sq-messages");z.scrollTop=z.scrollHeight};
 async function charger(){
  const d=await api("/api/squads/"+squad+"/messages");
  const z=$("sq-messages");z.replaceChildren(...d.messages.map(ligneMessage));
  dernier=d.messages.length?d.messages[d.messages.length-1].cree:0;
  plusAncien=d.messages.length?d.messages[0].cree:0;
  $("sq-anciens").hidden=!d.plus;bas();
  api("/api/squads/"+squad+"/lu","POST").catch(()=>{});
 }
 async function nouveaux(){
  if(!squad||document.hidden)return;
  try{
   const d=await api("/api/squads/"+squad+"/messages?apres="+dernier);
   if(d.messages.length){
    const z=$("sq-messages"),colle=z.scrollTop+z.clientHeight>=z.scrollHeight-40;
    for(const m of d.messages)if(!z.querySelector('[data-id="'+m.id+'"]'))z.append(ligneMessage(m));
    dernier=d.messages[d.messages.length-1].cree;
    if(colle)bas();
    api("/api/squads/"+squad+"/lu","POST").catch(()=>{});
   }
  }catch(e){if(e.statut===404||e.statut===401)liste()}
 }
 const arreter=()=>{if(minuteur){clearInterval(minuteur);minuteur=null}};
 async function ouvrir(id){
  try{
   etat("Ouverture de la Squad…");
   squad=id;
   const d=await api("/api/squads/"+id);
   droit=d.squad.droit;peutGerer=d.peutGerer;
   $("sq-fil-titre").textContent=d.squad.nom;
   $("sq-fil-desc").textContent=[d.squad.pole?POLES[d.squad.pole]||d.squad.pole:"",d.squad.description].filter(Boolean).join(" — ");
   const archive=d.squad.statut!=="actif";
   $("sq-envoi").hidden=archive;$("sq-archive").hidden=!archive;
   $("sq-gestion").hidden=!peutGerer;
   if(peutGerer){membres(d.membres);$("sq-archiver").textContent=archive?"Réactiver cette Squad":"Archiver cette Squad";$("sq-archiver").dataset.statut=archive?"actif":"archive"}
   await charger();
   etat("");montrer("sq-fil");$("sq-fil-titre").focus();
   arreter();minuteur=setInterval(nouveaux,RAFRAICHIR_MS);
  }catch(e){etat(e.message,true);squad=null}
 }
 function membres(liste){
  const ul=$("sq-membres");ul.replaceChildren();
  for(const m of liste){
   const b=el("button",{type:"button",class:"sq-retirer",text:"Retirer",onclick:async()=>{try{await api("/api/squads/"+squad+"/membres/"+m.compte,"DELETE");const d=await api("/api/squads/"+squad);membres(d.membres)}catch(e){etat(e.message,true)}}});
   ul.append(el("li",{},el("span",{text:m.nom+(m.role==="responsable"?" — responsable":"")}),b));
  }
 }
 $("sq-retour").addEventListener("click",liste);
 $("sq-anciens").addEventListener("click",async()=>{
  try{
   const d=await api("/api/squads/"+squad+"/messages?avant="+plusAncien);
   if(!d.messages.length){$("sq-anciens").hidden=true;return}
   const z=$("sq-messages"),h=z.scrollHeight;
   z.prepend(...d.messages.map(ligneMessage));plusAncien=d.messages[0].cree;$("sq-anciens").hidden=!d.plus;
   z.scrollTop=z.scrollHeight-h;
  }catch(e){etat(e.message,true)}
 });
 const texte=$("sq-texte");
 texte.addEventListener("input",()=>{$("sq-compteur").textContent=texte.value.length+" / 1000"});
 texte.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("sq-envoi").requestSubmit()}});
 $("sq-envoi").addEventListener("submit",async e=>{
  e.preventDefault();
  const valeur=texte.value.trim();if(!valeur)return;
  const bouton=$("sq-envoyer");bouton.disabled=true;
  try{await api("/api/squads/"+squad+"/messages","POST",{texte:valeur});texte.value="";$("sq-compteur").textContent="0 / 1000";etat("");await nouveaux();bas()}
  catch(err){etat(err.message,true)}finally{bouton.disabled=false;texte.focus()}
 });
 $("sq-ajout").addEventListener("submit",async e=>{
  e.preventDefault();
  const q=$("sq-recherche").value.trim();if(q.length<2)return;
  try{
   const d=await api("/api/squads/comptes?q="+encodeURIComponent(q));
   const ul=$("sq-resultats");ul.replaceChildren();
   if(!d.comptes.length){ul.append(el("li",{},el("span",{text:"Aucun membre trouvé."})));return}
   for(const c of d.comptes){
    const ajouter=role=>async()=>{try{await api("/api/squads/"+squad+"/membres","PUT",{compte:c.id,role});const s=await api("/api/squads/"+squad);membres(s.membres);ul.replaceChildren();$("sq-recherche").value="";etat(c.nom+" a été ajouté(e).")}catch(err){etat(err.message,true)}};
    ul.append(el("li",{},el("span",{text:c.nom+(c.matricule?" · "+c.matricule:"")}),el("span",{},el("button",{type:"button",class:"sq-retirer",text:"Ajouter",onclick:ajouter("membre")}),el("button",{type:"button",class:"sq-retirer",text:"Ajouter comme responsable",onclick:ajouter("responsable")}))));
   }
  }catch(err){etat(err.message,true)}
 });
 $("sq-archiver").addEventListener("click",async()=>{
  try{await api("/api/squads/"+squad,"PATCH",{statut:$("sq-archiver").dataset.statut});await ouvrir(squad)}catch(e){etat(e.message,true)}
 });
 $("sq-creer").addEventListener("submit",async e=>{
  e.preventDefault();
  const formulaire=e.currentTarget,f=new FormData(formulaire);
  try{const r=await api("/api/squads","POST",{nom:f.get("nom"),pole:f.get("pole"),description:f.get("description")});formulaire.reset();await ouvrir(r.id);etat("Squad créée. Ajoutez maintenant ses membres.")}catch(err){etat(err.message,true)}
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)nouveaux()});
 liste();
})();
