/* Création et suivi des formulaires (administration). */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const etat=$("fo-etat");
 const dire=(t,erreur)=>{etat.textContent=t;etat.dataset.etat=erreur?"erreur":""};
 const el=(tag,props={},...enfants)=>{const e=document.createElement(tag);Object.assign(e,props);e.append(...enfants);return e};
 const api=async(corps,requete)=>{
  const r=await fetch("/api/formulaires"+(requete||""),corps?{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify(corps)}:{credentials:"same-origin",cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw new Error(j.message||"Opération impossible.");
  return j;
 };
 const LIBELLES={texte:"Texte court",texte_long:"Texte long",email:"E-mail",telephone:"Téléphone",nombre:"Nombre",date:"Date",choix:"Choix unique",cases:"Choix multiples",oui_non:"Oui / non"};
 let types=Object.keys(LIBELLES),courant=null;
 const lien=slug=>location.origin+"/f/"+slug;

 async function charger(){
  const j=await api();
  types=j.types||types;
  const ul=$("fo-liste");ul.replaceChildren();
  if(!j.formulaires.length)ul.append(el("li",{},"Aucun formulaire pour l’instant. Partez d’un modèle ci-dessous ou créez le vôtre."));
  for(const f of j.formulaires){
   const li=el("li",{}),t=el("strong",{},f.titre);
   const etatTxt=el("span",{}," — "+(f.actif?"ouvert":"fermé")+" · "+f.reponses+" réponse(s)");
   const a=el("a",{href:lien(f.slug),className:"fo-lien",target:"_blank",rel:"noopener"},lien(f.slug));
   const ligne=el("div",{className:"fo-ligne"});
   const bascule=el("button",{type:"button",className:"hub-btn"},f.actif?"Fermer":"Ouvrir");
   bascule.addEventListener("click",async()=>{
    if(!f.actif&&!confirm("Ouvrir ce formulaire au public ? Toute personne ayant le lien pourra répondre."))return;
    bascule.disabled=true;
    try{await api({action:"activer",slug:f.slug,actif:!f.actif});await charger();dire(f.actif?"Formulaire fermé.":"Formulaire ouvert.")}catch(e){dire(e.message,true);bascule.disabled=false}
   });
   const modifier=el("button",{type:"button",className:"hub-btn"},"Modifier");
   modifier.addEventListener("click",()=>ouvrirEdition(f.slug));
   const reponses=el("button",{type:"button",className:"hub-btn"},"Réponses");
   reponses.addEventListener("click",()=>voirReponses(f.slug));
   ligne.append(bascule,modifier,reponses);
   li.append(t,etatTxt,el("br"),a,ligne);ul.append(li);
  }
  const mod=$("fo-modeles");mod.replaceChildren();
  for(const m of j.modeles){
   const b=el("button",{type:"button",className:"hub-btn"},m.titre);
   b.addEventListener("click",async()=>{b.disabled=true;try{const r=await api({action:"modele",modele:m.cle});await charger();dire("Modèle créé (fermé).");await ouvrirEdition(r.slug)}catch(e){dire(e.message,true)}finally{b.disabled=false}});
   mod.append(b," ");
  }
  const neuf=el("button",{type:"button",className:"hub-btn"},"Formulaire vierge");
  neuf.addEventListener("click",()=>edition({slug:"",titre:"",intro:"",confirmation:"",champs:[{id:"nom",etiquette:"Nom et prénoms",type:"texte",requis:true}]},true));
  mod.append(neuf);
 }
 async function ouvrirEdition(slug){
  try{const j=await api(null,"?slug="+encodeURIComponent(slug));edition(j.formulaire,false)}catch(e){dire(e.message,true)}
 }
 function ligneChamp(f){
  const d=el("div",{className:"fo-champ"});
  const id=el("input",{value:f.id||"",maxLength:30,pattern:"[a-z][a-z0-9_]{0,29}",required:true,name:"id"});
  const et=el("input",{value:f.etiquette||"",maxLength:120,required:true,name:"etiquette"});
  const ty=el("select",{name:"type"});types.forEach(t=>ty.append(el("option",{value:t,selected:t===f.type},LIBELLES[t]||t)));
  const rq=el("input",{type:"checkbox",checked:f.requis!==false,name:"requis"});
  const op=el("textarea",{rows:3,name:"options",value:(f.options||[]).join("\n")});
  const aide=el("input",{value:f.aide||"",maxLength:200,name:"aide"});
  const lop=el("label",{},"Choix proposés (un par ligne)",op);
  const maj=()=>{lop.hidden=!["choix","cases"].includes(ty.value)};ty.addEventListener("change",maj);maj();
  const retirer=el("button",{type:"button",className:"hub-btn"},"Retirer ce champ");
  retirer.addEventListener("click",()=>d.remove());
  d.append(el("label",{},"Intitulé de la question",et),el("label",{},"Type",ty),el("label",{},"Identifiant interne (minuscules, chiffres, _)",id),lop,el("label",{},"Aide (facultatif)",aide),el("label",{className:"cm-case"},rq,document.createTextNode(" Réponse obligatoire")),retirer);
  return d;
 }
 function edition(f,nouveau){
  courant=f;
  $("fo-edition").hidden=false;$("fo-titre-edition").textContent=nouveau?"Nouveau formulaire":"Modifier « "+f.titre+" »";
  const form=$("fo-form");
  form.elements.slug.value=f.slug;form.elements.slug.readOnly=!nouveau;$("fo-slug-apercu").textContent=f.slug;
  form.elements.titre.value=f.titre;form.elements.intro.value=f.intro||"";form.elements.confirmation.value=f.confirmation||"";
  $("fo-champs").replaceChildren(...f.champs.map(ligneChamp));
  $("fo-edition").scrollIntoView({block:"start"});
 }
 function lireFormulaire(){
  const form=$("fo-form");
  const champs=[...$("fo-champs").children].map(d=>{
   const g=n=>d.querySelector('[name="'+n+'"]');
   const f={id:g("id").value.trim(),etiquette:g("etiquette").value.trim(),type:g("type").value,requis:g("requis").checked,aide:g("aide").value.trim()};
   if(["choix","cases"].includes(f.type))f.options=g("options").value.split("\n").map(x=>x.trim()).filter(Boolean);
   return f;
  });
  return {slug:form.elements.slug.value.trim().toLowerCase(),formulaire:{titre:form.elements.titre.value,intro:form.elements.intro.value,confirmation:form.elements.confirmation.value,champs}};
 }
 async function voirReponses(slug){
  try{
   const j=await api(null,"?slug="+encodeURIComponent(slug));
   $("fo-reponses").hidden=false;$("fo-titre-reponses").textContent="Réponses : "+j.formulaire.titre;
   $("fo-total").textContent=j.total+" réponse(s)"+(j.total>j.reponses.length?" (les "+j.reponses.length+" plus récentes sont affichées ; le CSV contient tout)":"");
   $("fo-csv").href="/api/formulaires?slug="+encodeURIComponent(slug)+"&csv=1";
   const t=$("fo-table");t.replaceChildren();
   const tete=el("tr",{},el("th",{},"Date"));j.formulaire.champs.forEach(c=>tete.append(el("th",{},c.etiquette)));
   t.append(el("thead",{},tete));
   const corps=el("tbody",{});
   for(const r of j.reponses){
    const tr=el("tr",{},el("td",{},new Date(r.cree).toLocaleString("fr-FR")));
    for(const c of j.formulaire.champs){const v=r.donnees[c.id];tr.append(el("td",{},Array.isArray(v)?v.join(" ; "):v===undefined?"":String(v)))}
    corps.append(tr);
   }
   t.append(corps);$("fo-reponses").scrollIntoView({block:"start"});
  }catch(e){dire(e.message,true)}
 }
 $("fo-ajouter").addEventListener("click",()=>{
  const n=$("fo-champs").children.length+1;
  $("fo-champs").append(ligneChamp({id:"champ"+n,etiquette:"",type:"texte",requis:true}));
 });
 $("fo-form").elements.slug.addEventListener("input",e=>{$("fo-slug-apercu").textContent=e.target.value});
 $("fo-form").addEventListener("submit",async ev=>{
  ev.preventDefault();
  try{const r=await api({action:"enregistrer",...lireFormulaire()});dire(r.cree?"Formulaire créé. Il est fermé : ouvrez-le quand il est prêt.":"Formulaire enregistré.");$("fo-edition").hidden=true;await charger()}
  catch(e){dire(e.message,true)}
 });
 (async()=>{
  try{
   const moi=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
   if(!moi.connecte||moi.niveau<2){dire("");$("fo-refus").hidden=false;return}
   await charger();dire("");$("fo-bloc").hidden=false;
  }catch(e){dire(e.message||"Chargement impossible.",true)}
 })();
})();
