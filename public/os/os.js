/* SDE OS v3.1 — client interactif, jamais de données personnelles dans le stockage navigateur. */
const views={
 accueil:"Votre espace de commandement",integral:"Le Soldat intégral",
 barometre:"Courbe des fractures & préjugés",academy:"Soldiers Academy",
 directoire:"Directoire Général",poles:"Les cinq pôles stratégiques",finances:"Gouvernance financière"
};
const captions={
 spirituelle:"Vie spirituelle",personnelle:"Identitaire & personnelle",familiale:"Familiale & relationnelle",
 professionnelle:"Vie professionnelle",economique:"Dimension économique",sociale:"Engagement social",
 missionnaire:"Dimension missionnaire",sante_spirituelle:"Ressenti spirituel",sante_physique:"Ressenti physique",
 sante_emotionnelle:"Ressenti émotionnel",sante_financiere:"Ressenti financier",
 caractere:"Caractère & cohérence",service:"Connaissance sans service",
 vie_integrale:"Foi & vie quotidienne",redevabilite:"Redevabilité & protection",
 prejuges:"Préjugés perçus"
};
const fractureText={
 caractere:"Spiritualité sans transformation durable du caractère",
 service:"Connaissance biblique sans mise en service",
 vie_integrale:"Vie d'Église dissociée de la famille, du travail et de l'économie",
 redevabilite:"Autorité spirituelle sans redevabilité ni protection",
 prejuges:"Préjugés ou exclusions ressentis (indicateur complémentaire)"
};
const governance=[
 ["Co-visionnaire, Secrétariat Général","Amy GLAZAÏ"],
 ["Trésorerie Générale","Amy GLAZAÏ"],
 ["Secrétariat Général Adjoint","Danielle MORIBA"],
 ["Communication et Relations Extérieures","Annabelle KOFFI"],
 ["Organisation & Mobilisation","À confirmer"],
 ["Intégration & Suivi des Membres","À confirmer"]
];
const descriptions=[
 "Gagner, réveiller, accompagner et envoyer.",
 "Aimer en actes, protéger la dignité et servir les vulnérables.",
 "Servir avec ordre, sécurité, préparation et excellence.",
 "Porter la vision, produire, documenter et connecter.",
 "Former le Soldat et développer ses capacités intégrales."
];
const schoolDetails=[
 "Identité en Christ, Bible, prière, culture SDE et fondations de la foi.",
 "Relations, caractère, émotions, discipline, famille et gestion personnelle.",
 "Leadership serviteur, éthique, communication, projet et redevabilité.",
 "Mission, évangélisation, entrepreneuriat, carrière et influence responsable."
];
const keys=[["caractere","#c49c52"],["service","#77587c"],["vie_integrale","#53736a"],["redevabilite","#b05f63"],["prejuges","#536ca0"]];
const $=(sel,root=document)=>root.querySelector(sel);
const $all=(sel,root=document)=>[...root.querySelectorAll(sel)];
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;
};
const svg=(name,attrs={})=>{
 const node=document.createElementNS("http://www.w3.org/2000/svg",name);
 for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
 return node;
};
let state=null,authenticated=false,current="accueil";
const app=$("#app");
const trace=message=>{const notice=$("#alert");notice.hidden=false;notice.classList.remove("error");notice.textContent=message;};
const fail=message=>{const notice=$("#alert");notice.hidden=false;notice.classList.add("error");notice.textContent=message;};
const clearAlert=()=>{$("#alert").hidden=true;};
async function request(route,method="GET",payload){
 const settings={method,credentials:"same-origin",headers:{accept:"application/json"}};
 if(payload!==undefined){settings.headers["content-type"]="application/json";settings.body=JSON.stringify(payload);}
 const res=await fetch("/api/os/"+route,settings);
 const body=await res.json().catch(()=>null);
 if(!res.ok||!body?.ok)throw new Error(body?.message||"Connexion indisponible.");
 return body;
}
function goto(view){
 if(!views[view])view="accueil";
 current=view;clearAlert();
 for(const name of Object.keys(views))$("#view-"+name).hidden=name!==view;
 $all("[data-go]").forEach(item=>{
  const active=item.dataset.go===view;
  item.classList.toggle("active",active);
  if(active)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");
 });
 $all(".mobile-tabs button").forEach(item=>{
  const active=item.dataset.go===view||(item.id==="mobile-more"&&["poles","directoire","finances"].includes(view));
  item.classList.toggle("active",active);
 });
 $("#view-title").textContent=views[view];$("#breadcrumb").textContent="SDE OS / "+views[view];
 if(location.hash!=="#"+view)history.replaceState(null,"","#"+view);
 $("#more-overlay").hidden=true;
 $all(".mega details").forEach(d=>d.open=false);
 window.scrollTo({top:0,behavior:"instant"});
}
function makeRange(key,group,text=undefined){
 const wrap=el("div","range-field");
 const label=el("label","",text||captions[key]||key);
 label.htmlFor=group+"-"+key;
 const output=el("output","", "3 / 5");output.htmlFor=label.htmlFor;
 const input=el("input");input.type="range";input.name=key;input.id=label.htmlFor;input.min="1";input.max="5";input.step="1";input.value="3";
 input.setAttribute("aria-valuetext","3 sur 5");
 input.addEventListener("input",()=>{output.textContent=input.value+" / 5";input.setAttribute("aria-valuetext",input.value+" sur 5");});
 wrap.append(label,output,input);return wrap;
}
function fillStatic(){
 for(const key of state.dimensions)$("#eval-fields").append(makeRange(key,"eval"));
 for(const key of state.bienEtre)$("#wellness-fields").append(makeRange(key,"wellness"));
 for(const key of state.fractures)$("#fracture-fields").append(makeRange(key,"fractures",fractureText[key]));
 for(const [idx,pole] of state.poles.entries()){
  const option=el("option","",String(idx+1)+" · "+pole);option.value=String(idx+1);
  $("#action-pole").append(option);
  $("#finance-pole").append(option.cloneNode(true));
 }
 const org=$("#governance-list");org.replaceChildren();
 for(const [role,holder] of governance){
  const box=el("div","org-card"),b=el("b","",role),s=el("span","",holder);box.append(b,s);org.append(box);
 }
 const poles=$("#poles-list");poles.replaceChildren();
 state.poles.forEach((name,i)=>{
  const card=el("article","pole-card");
  const number=el("span","pole-number","PÔLE "+String(i+1).padStart(2,"0"));
  const title=el("h3","",name);
  const desc=el("p","",descriptions[i]);
  card.append(number,title,desc);poles.append(card);
 });
}
function polygonPoints(scores,cx,cy,r){
 return scores.map((value,i)=>{
  const angle=2*Math.PI*i/scores.length-Math.PI/2;
  const distance=r*value/5;
  return [cx+Math.cos(angle)*distance,cy+Math.sin(angle)*distance].join(",");
 }).join(" ");
}
function drawRadar(){
 const dest=$("#radar");dest.replaceChildren();
 const evaluations=state.evaluations;
 if(!evaluations?.length){
  dest.append(el("p","subtle","Aucun bilan enregistré. Votre radar apparaîtra après la première auto-évaluation."));
  return;
 }
 const last=evaluations[0], dims=state.dimensions;
 const graphic=svg("svg",{viewBox:"0 0 430 360",role:"img","aria-label":"Radar des sept dimensions de votre dernier bilan"});
 const cx=210,cy=173,r=116;
 for(let level=1;level<=5;level++){
  graphic.append(svg("polygon",{points:polygonPoints(dims.map(()=>level),cx,cy,r),fill:"none",stroke:"#c9ccda","stroke-opacity":.5,"stroke-width":1}));
 }
 dims.forEach((key,i)=>{
  const angle=2*Math.PI*i/dims.length-Math.PI/2;
  graphic.append(svg("line",{x1:cx,y1:cy,x2:cx+Math.cos(angle)*r,y2:cy+Math.sin(angle)*r,stroke:"#d3d6e1"}));
  const label=svg("text",{x:cx+Math.cos(angle)*(r+34),y:cy+Math.sin(angle)*(r+29)+4,"text-anchor":"middle","font-size":"11",fill:"#8993a7"});
  const short=key==="professionnelle"?"Profession":key==="personnelle"?"Personnel":key==="missionnaire"?"Mission":key==="economique"?"Économie":key==="spirituelle"?"Spirituel":key==="familiale"?"Famille":"Social";
  label.textContent=short;graphic.append(label);
 });
 graphic.append(svg("polygon",{points:polygonPoints(dims.map(key=>Number(last[key])),cx,cy,r),fill:"#c3a260", "fill-opacity":.25,stroke:"#be9654","stroke-width":2.7}));
 for(const key of dims){
  const value=Number(last[key]);if(!Number.isFinite(value))return;
 }
 dest.append(graphic);
 $("#eval-empty").textContent="Dernier bilan : "+new Date(last.date).toLocaleDateString("fr-FR")+". Échelle subjective de 1 à 5.";
}
function renderHistory(){
 const dest=$("#eval-history");dest.replaceChildren();
 if(!state.evaluations.length){dest.append(el("p","subtle","Aucun bilan enregistré."));return;}
 const table=el("table","data-table"),thead=el("thead"),tr=el("tr");
 for(const name of ["Date","Moyenne déclarée","Action"])tr.append(el("th","",name));
 thead.append(tr);const tbody=el("tbody");
 for(const item of state.evaluations){
  const row=el("tr");row.append(el("td","",new Date(item.date).toLocaleString("fr-FR")));
  const avg=(state.dimensions.reduce((n,key)=>n+Number(item[key]||0),0)/7).toFixed(1);
  row.append(el("td","",avg+" / 5"));
  const td=el("td"),button=el("button","","Supprimer");button.type="button";button.dataset.deleteEvaluation=item.id;
  td.append(button);row.append(td);tbody.append(row);
 }
 table.append(thead,tbody);dest.append(table);
}
function drawTrend(){
 const dest=$("#fracture-chart");dest.replaceChildren();
 const periods=state.barometre||[];
 if(periods.length<1){dest.append(el("p","subtle","Aucune période avec au moins cinq réponses. Le graphique n'affiche pas de données fictives."));$("#fracture-note").textContent="Les contributions individuelles restent privées et le baromètre collectif n'est calculé qu'à partir de cinq réponses pour un même mois.";return;}
 const graphic=svg("svg",{viewBox:"0 0 640 340",role:"img","aria-label":"Courbe mensuelle des fractures et préjugés agrégés"});
 const left=52,right=615,top=28,bottom=290;
 for(let n=1;n<=5;n++){
  const y=bottom-(n-1)*(bottom-top)/4;
  graphic.append(svg("line",{x1:left,x2:right,y1:y,y2:y,stroke:"#d2d7df","stroke-dasharray":"4 6"}));
  const text=svg("text",{x:left-15,y:y+4,"text-anchor":"end","font-size":"12",fill:"#8891a5"});text.textContent=String(n);graphic.append(text);
 }
 periods.forEach((point,i)=>{
  const x=periods.length===1?left+(right-left)/2:left+i*(right-left)/(periods.length-1);
  const text=svg("text",{x,y:315,"text-anchor":"middle","font-size":"11",fill:"#8391a7"});text.textContent=point.periode;graphic.append(text);
 });
 for(const [key,color] of keys){
  const points=periods.map((point,i)=>{
   const x=periods.length===1?left+(right-left)/2:left+i*(right-left)/(periods.length-1);
   const y=bottom-(Number(point[key])-1)*(bottom-top)/4;
   return [x,y];
  });
  if(points.length>=2)graphic.append(svg("polyline",{points:points.map(p=>p.join(",")).join(" "),fill:"none",stroke:color,"stroke-width":3,"stroke-linecap":"round","stroke-linejoin":"round"}));
  for(const [x,y] of points)graphic.append(svg("circle",{cx:x,cy:y,r:5,fill:color,stroke:"#fff","stroke-width":2}));
 }
 dest.append(graphic);
 $("#fracture-note").textContent=periods.length+" période(s) éligible(s), au moins cinq participants distincts par mois. Des scores élevés indiquent davantage de fractures perçues ; aucun résultat ne constitue une mesure scientifique des préjugés.";
}
function renderAcademy(){
 const dest=$("#schools");dest.replaceChildren();
 state.ecoles.forEach((label,i)=>{
  const level=i+1;
  const card=el("article","school"),n=el("span","school-number","ÉCOLE "+String(level).padStart(2,"0"));
  const title=el("h3","",label),desc=el("p","",schoolDetails[i]);
  const controls=el("div","school-actions"),hint=el("label","","Mon avancement personnel");
  const select=el("select","school-status");select.dataset.school=String(level);select.setAttribute("aria-label","Progression de l'école "+level);
  const current=state.parcours.find(x=>Number(x.ecole)===level)?.statut||"a_decouvrir";
  for(const [key,name] of [["a_decouvrir","À découvrir"],["en_cours","En cours"],["parcourue","Parcourue (auto-déclarée)"]]){
   const option=el("option","",name);option.value=key;if(current===key)option.selected=true;select.append(option);
  }
  controls.append(hint,select);card.append(n,title,desc,controls);dest.append(card);
 });
}
function renderActions(){
 const dest=$("#actions-list");dest.replaceChildren();
 if(!state.peutGerer){$("#pole-workspace").hidden=true;return;}
 const table=el("table","data-table"),head=el("tr");
 for(const h of ["Pôle","Action","Échéance","État"])head.append(el("th","",h));
 const thead=el("thead");thead.append(head);const tbody=el("tbody");
 for(const action of state.actions){
  const tr=el("tr");
  tr.append(el("td","",String(action.pole)));
  tr.append(el("td","",action.titre));
  tr.append(el("td","",action.echeance||"—"));
  const td=el("td"),select=el("select");
  select.dataset.actionId=action.id;
  for(const [k,v] of [["a_faire","À faire"],["en_cours","En cours"],["termine","Terminé"]]){
   const op=el("option","",v);op.value=k;if(action.statut===k)op.selected=true;select.append(op);
  }
  td.append(select);tr.append(td);tbody.append(tr);
 }
 table.append(thead,tbody);
 dest.append(state.actions.length?table:el("p","subtle","Aucune action enregistrée. Créez un premier plan opérationnel."));
}
function renderFinances(){
 const dest=$("#finance-list");dest.replaceChildren();
 if(!state.peutGerer){$("#finance-workspace").hidden=true;return;}
 const table=el("table","data-table"),head=el("tr");
 for(const h of ["Objet","Montant FCFA","État","Action autorisée"])head.append(el("th","",h));
 const thead=el("thead");thead.append(head);const tbody=el("tbody");
 for(const item of state.validations){
  const tr=el("tr");
  tr.append(el("td","",item.objet+" · Pôle "+item.pole));
  tr.append(el("td","",new Intl.NumberFormat("fr-FR").format(item.montant)));
  const labels={soumis:"En attente d'autorisation",autorise:"Autorisé",execute:"Exécution déclarée · à contrôler",verifie:"Contrôlé"};
  tr.append(el("td","",labels[item.etat]||item.etat));
  const td=el("td");
  const options={soumis:["authoriser","Autoriser"],autorise:["executer","Documenter l'exécution"],execute:["controler","Contrôler"]};
  const step=options[item.etat];
  if(step){
   const actor=state.profil?.id;
   const refused=(step[0]==="authoriser"&&item.demandeur===actor)||
    (step[0]==="executer"&&item.autoriseur===actor)||
    (step[0]==="controler"&&item.executeur===actor);
   if(!refused){
    const btn=el("button","",step[1]);btn.dataset.financeId=item.id;btn.dataset.financeStep=step[0];
    td.append(btn);
   }else td.append(el("span","subtle","Autre responsable requis"));
  }else td.append(el("span","subtle","Validé"));
  tr.append(td);tbody.append(tr);
 }
 table.append(thead,tbody);
 dest.append(state.validations.length?table:el("p","subtle","Aucune opération suivie pour le moment. Aucun paiement n'est effectué par SDE OS."));
}
function refreshViews(){
 $("#nb-eval").textContent=String(state.evaluations.length).padStart(2,"0");
 drawRadar();renderHistory();drawTrend();renderAcademy();renderActions();renderFinances();
}
async function reload(){
 const result=await request("bootstrap");state=result;state.profil.id=result.profil.id;
 refreshViews();
}
async function handle(action,success){
 try{clearAlert();await action();await reload();trace(success);}catch(e){fail(e.message||"Opération non disponible.");}
}
async function start(){
 // Réglages visuels uniquement dans localStorage. Jamais de donnée médicale ou dossier de membre.
 const preference=localStorage.getItem("sde-os-theme");
 document.documentElement.dataset.theme=preference==="light"?"light":"dark";
 const layout=localStorage.getItem("sde-os-paradigme");
 if(["commandement","bento","focus","immersif"].includes(layout)){
  app.dataset.paradigme=layout;$("#paradigm-select").value=layout;
 }
 const first=location.hash.slice(1);if(views[first])current=first;
 $all("[data-go]").forEach(button=>button.addEventListener("click",()=>goto(button.dataset.go)));
 $("#theme-button").addEventListener("click",()=>{
  const theme=document.documentElement.dataset.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=theme;localStorage.setItem("sde-os-theme",theme);
 });
 $("#paradigm-select").addEventListener("change",event=>{
  const value=event.target.value;app.dataset.paradigme=value;localStorage.setItem("sde-os-paradigme",value);
 });
 $("#menu-collapse").addEventListener("click",()=>app.dataset.collapsed=app.dataset.collapsed==="true"?"false":"true");
 $("#mobile-more").addEventListener("click",()=>{$("#more-overlay").hidden=false;});
 $("#more-close").addEventListener("click",()=>{$("#more-overlay").hidden=true;});
 $("#more-overlay").addEventListener("click",e=>{if(e.target.id==="more-overlay")e.currentTarget.hidden=true;});
 $("#search-open").addEventListener("click",openSearch);
 $("#command-close").addEventListener("click",closeSearch);
 $("#command-input").addEventListener("input",renderSearch);
 document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openSearch();}
  if(event.key==="Escape"){$("#more-overlay").hidden=true;}
 });
 window.addEventListener("hashchange",()=>goto(location.hash.slice(1)));
 const previous=$(".mega");
 previous?.addEventListener("toggle",()=>{});
 $("#form-eval").addEventListener("submit",async event=>{
  event.preventDefault();const f=event.currentTarget;const p={consentement:f.elements.consentement.checked};
  for(const key of state.dimensions)p[key]=Number(f.elements[key].value);
  for(const key of state.bienEtre)p[key]=Number(f.elements[key].value);
  await handle(()=>request("evaluation","POST",p),"Votre bilan personnel a été enregistré. Il n'est visible que dans votre compte.");
  f.reset();$all("output",f).forEach(o=>o.textContent="3 / 5");
 });
 $("#form-fractures").addEventListener("submit",async event=>{
  event.preventDefault();const f=event.currentTarget;const p={consentement:f.elements.consentement.checked};
  for(const key of state.fractures)p[key]=Number(f.elements[key].value);
  await handle(()=>request("barometre","POST",p),"Votre contribution a été enregistrée. La courbe nécessite cinq réponses distinctes.");
  f.elements.consentement.checked=false;
 });
 $("#schools").addEventListener("change",async e=>{
  const select=e.target.closest("select[data-school]");if(!select)return;
  await handle(()=>request("parcours","POST",{ecole:Number(select.dataset.school),statut:select.value}),"Votre progression personnelle a été actualisée.");
 });
 $("#eval-history").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-delete-evaluation]");if(!btn)return;
  if(!confirm("Supprimer définitivement cette auto-évaluation personnelle ?"))return;
  await handle(()=>request("evaluation?id="+encodeURIComponent(btn.dataset.deleteEvaluation),"DELETE"),"Bilan supprimé.");
 });
 $("#form-action").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget;
  await handle(()=>request("actions","POST",{titre:f.elements.titre.value,pole:Number(f.elements.pole.value),echeance:f.elements.echeance.value}),"Action créée dans le registre des pôles.");
  f.reset();
 });
 $("#actions-list").addEventListener("change",async e=>{
  const select=e.target.closest("[data-action-id]");if(!select)return;
  await handle(()=>request("actions","PATCH",{id:select.dataset.actionId,statut:select.value}),"État de l'action mis à jour.");
 });
 $("#form-finance").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget;
  await handle(()=>request("finances","POST",{objet:f.elements.objet.value,montant:Number(f.elements.montant.value),pole:Number(f.elements.pole.value)}),"Demande de validation créée. L'autorisation nécessite un autre responsable.");
  f.reset();
 });
 $("#finance-list").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-finance-step]");if(!btn)return;
  const step=btn.dataset.financeStep;
  let reference="";
  if(step==="executer"){const answer=prompt("Référence de la pièce justifiant une exécution effectuée hors SDE OS :");
   if(!answer?.trim())return;reference=answer.trim();}
  else if(!confirm("Confirmer l'étape « "+btn.textContent+" » en votre nom ?"))return;
  await handle(()=>request("finances","PATCH",{id:btn.dataset.financeId,etape:step,reference}),"Validation enregistrée et journalisée.");
 });
 try{
  const result=await request("bootstrap");state=result;authenticated=true;
  $("#busy").hidden=true;
  $("#avatar").textContent=String(state.profil.nom||"SDE").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  state.profil.id=result.profil.id;
  fillStatic();refreshViews();goto(current);
 }catch(e){
  $("#busy").textContent="Connexion SDE requise. Ouvrez d'abord votre compte membre, puis revenez dans SDE OS.";
  const anchor=el("a","public-link","Ouvrir la connexion SDE ↗");
  anchor.href="/#connexion";anchor.style.marginLeft="12px";$("#busy").append(anchor);
  // Aucune donnée confidentielle n'est chargée hors session authentifiée.
 }
}
function openSearch(){
 const dialog=$("#command-dialog");
 if(!dialog.open)dialog.showModal();
 $("#command-input").value="";renderSearch();$("#command-input").focus();
}
function closeSearch(){if($("#command-dialog").open)$("#command-dialog").close();}
function renderSearch(){
 const text=$("#command-input").value.toLocaleLowerCase("fr").trim();
 const dest=$("#command-results");dest.replaceChildren();
 for(const [id,title] of Object.entries(views)){
  if(text&&!title.toLocaleLowerCase("fr").includes(text))continue;
  const btn=el("button","",title);btn.type="button";
  btn.addEventListener("click",()=>{closeSearch();goto(id);});
  dest.append(btn);
 }
 if(!dest.children.length)dest.append(el("p","subtle","Aucun espace correspondant."));
}
document.addEventListener("DOMContentLoaded",start,{once:true});
