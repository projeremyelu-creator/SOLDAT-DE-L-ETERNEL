/* SDE OS v3.1 — navigation SPA sur MPA/PWA existantes. Aucune donnée de membre en localStorage. */
(() => {
"use strict";
const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const views=["tableau","integral","fractures","gouvernance","academy","poles"];
const names={tableau:["Poste de commandement","Une vision, cinq pôles, un Soldat Intégral."],
integral:["Mon Soldat Intégral","Une croissance volontaire sur les sept dimensions officielles."],
fractures:["Fractures et préjugés","Des indicateurs déclaratifs, jamais un diagnostic de personne."],
gouvernance:["Directoire Général","Gouvernance, traçabilité et responsabilité partagée."],
academy:["Soldiers Academy","Former, équiper, accompagner et envoyer."],
poles:["Les cinq pôles","L'organisation opérationnelle du mouvement."]};
const colors=["#bd8b3b","#641d2d","#556346","#4e7ca4","#8d6db1"];
const state={data:null,admin:false,history:[],enrolled:[],route:"tableau",trend:null,decisions:[]};
const api=async(action,payload={})=>{
 const response=await fetch("/api/os-v31",{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},body:JSON.stringify({action,...payload})});
 let result;try{result=await response.json();}catch{throw Error("Le serveur SDE ne répond pas correctement.");}
 if(!response.ok||!result.ok)throw Error(result.message||"Action refusée");
 return result;
};
const node=(tag,klass,text)=>{
 const element=document.createElement(tag);if(klass)element.className=klass;
 if(text!==undefined)element.textContent=text;return element;
};
const feedback=(selector,message,error=false)=>{
 const el=$(selector);if(!el)return;el.textContent=message;el.dataset.status=error?"error":"success";
};
const setRoute=(page,push=true)=>{
 if(!views.includes(page))page="tableau";
 state.route=page;
 $$(".workspace-view").forEach(s=>s.classList.toggle("active",s.id==="view-"+page));
 $$("[data-route]").forEach(a=>{
  const current=a.dataset.route===page;
  a.classList.toggle("is-active",current);
  if(current)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
 });
 $("#view-title").textContent=names[page][0];$("#view-subtitle").textContent=names[page][1];
 if(push&&location.hash!=="#"+page)history.replaceState(null,"","#"+page);
 $("#contenu").focus({preventScroll:true});
 scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
 if(page==="fractures"&&state.admin&&state.trend===null)loadTrend();
 if(page==="gouvernance"&&state.admin)loadDecisions();
};
const getRoute=()=>location.hash.slice(1).trim();
const installNav=()=>{
 document.addEventListener("click",event=>{
  const target=event.target.closest("[data-route]");
  if(!target)return;
  event.preventDefault();
  setRoute(target.dataset.route);
  closeDialog();
 });
 window.addEventListener("hashchange",()=>setRoute(getRoute(),false));
 const collapse=$("#side-collapse");collapse?.addEventListener("click",()=>{
  document.body.classList.toggle("sidebar-compact");
  collapse.setAttribute("aria-label",document.body.classList.contains("sidebar-compact")?"Déployer le menu latéral":"Réduire le menu latéral");
 });
 $$(".nav-pop").forEach(btn=>btn.addEventListener("click",()=>{
  const grp=btn.parentElement;
  const open=grp.dataset.open!=="true";
  $$(".nav-group").forEach(x=>{x.dataset.open="false";x.querySelector("button")?.setAttribute("aria-expanded","false");});
  grp.dataset.open=String(open);btn.setAttribute("aria-expanded",String(open));
 }));
 document.addEventListener("click",event=>{
  if(!event.target.closest(".nav-group"))$$(".nav-group").forEach(x=>{
   x.dataset.open="false";x.querySelector("button")?.setAttribute("aria-expanded","false");
  });
 });
 const dialogs=$("#command-dialog");
 const show=()=>{
  if(!dialogs.open){dialogs.showModal();$("#command-search").value="";filterCommands();$("#command-search").focus();}
 };
 $("#command-open").addEventListener("click",show);
 $("#bottom-more").addEventListener("click",show);
 $("#bento-menu-open").addEventListener("click",show);
 $("#command-close").addEventListener("click",closeDialog);
 dialogs.addEventListener("click",event=>{if(event.target===dialogs)closeDialog();});
 $("#command-search").addEventListener("input",filterCommands);
 document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();show();}
 });
 $$(".view-pills button").forEach(button=>button.addEventListener("click",()=>{
  const name=button.dataset.presentationValue;
  document.body.dataset.presentation=name;
  $$(".view-pills button").forEach(b=>{const active=b===button;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));});
 }));
 $("#theme-toggle").addEventListener("click",()=>{
  const html=document.documentElement;
  html.dataset.theme=html.dataset.theme==="dark"?"light":"dark";
  $("meta[name=theme-color]").content=html.dataset.theme==="dark"?"#0b1324":"#101a33";
 });
 $("#refresh-decisions").addEventListener("click",loadDecisions);
};
function closeDialog(){const d=$("#command-dialog");if(d.open)d.close();}
function filterCommands(){
 const search=$("#command-search").value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const box=$("#command-links");box.replaceChildren();
 for(const page of views){
  const name=names[page][0];
  const normalized=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(search&&!normalized.includes(search))continue;
  const b=node("button","",name);b.type="button";b.dataset.route=page;b.append(node("span","","↗"));box.append(b);
 }
 if(!box.children.length)box.append(node("p","","Aucun module correspondant."));
}
const makeDimension=(label,detail)=>{
 const div=node("div","dimension-item");
 div.append(node("span","",label),node("b","",detail||"SDE"));
 return div;
};
function ratingField(label,key,index,low,high){
 const wrap=node("div","rating-field");
 const id="rating-"+key+"-"+index;
 const l=node("label","",label);l.htmlFor=id;
 const sel=node("select");sel.id=id;sel.name=key+"-"+index;sel.required=true;
 const initial=node("option","","Choisir une valeur");initial.value="";sel.append(initial);
 for(let i=0;i<=4;i++){const o=node("option","",String(i)+" — "+(i===0?low:i===4?high:"niveau "+i));o.value=String(i);sel.append(o);}
 wrap.append(l,sel);return wrap;
}
function decorate(){
 const base=state.data.referentiel;
 $("#seven-dimensions").replaceChildren(...base.integral.map((t,i)=>makeDimension((i+1)+". "+t,"Dimension "+(i+1))));
 $("#wellbeing-dimensions").replaceChildren(...base.bienEtre.map((t,i)=>makeDimension((i+1)+". "+t,"Repère libre")));
 $("#seven-fields").replaceChildren(...base.integral.map((s,i)=>ratingField(s,"integral",i,"Très difficile","Très favorable")));
 $("#wellbeing-fields").replaceChildren(...base.bienEtre.map((s,i)=>ratingField(s,"bienetre",i,"Difficile","Favorable")));
 $("#fracture-fields").replaceChildren(...base.fractures.map((s,i)=>ratingField(s,"fracture",i,"Aucun obstacle","Obstacle fort")));
 $("#prejuges-field").replaceChildren(ratingField(base.prejuges,"prejuges",0,"Aucun obstacle","Obstacle fort"));
 $("#fracture-explainer").replaceChildren(...base.fractures.map((f,i)=>{
  const card=node("div","fracture-card");card.append(node("strong","",String(i+1).padStart(2,"0")+" / "+f),
   node("small","","Extrait du chapitre 4.1 · Raison d'être"));return card;
 }));
 $("#poles-list").replaceChildren(...base.poles.map(p=>{
  const card=node("article","pole-card");card.append(node("span","pole-number",String(p.n).padStart(2,"0")),
   node("h3","",p.nom),node("p","",p.mandat));return card;
 }));
 $("#academy-schools").replaceChildren(...base.ecoles.map(e=>{
  const card=node("article","academy-card");card.append(node("span","level","0"+e.n),node("h3","",e.nom),node("p","",e.contenu));
  const button=node("button","",state.enrolled.includes(e.n)?"Intérêt enregistré ✓":"Manifester mon intérêt ↗");
  button.type="button";
  button.addEventListener("click",async()=>{
   button.disabled=true;
   try{await api("inscription_ecole",{ecole:e.n});state.enrolled.push(e.n);button.textContent="Intérêt enregistré ✓";await refreshOverview();}
   catch(error){button.textContent="Erreur : "+error.message;}finally{button.disabled=false;}
  });
  card.append(button);return card;
 }));
 $("#identity-name").textContent=state.data.profil.nom||"Soldat SDE";
 $("#identity-role").textContent=state.data.role||"Compte connecté";
 $$(".admin-stat").forEach(e=>e.hidden=!state.admin);
 $("#governance-private").hidden=!state.admin;
 $("#governance-locked").hidden=state.admin;
 updateOverview();
}
function updateOverview(){
 const d=state.data;
 $("#stat-checkins").textContent=d.mesBilans;
 $("#stat-school").textContent=String(state.enrolled.length)+" / 4";
 $("#stat-pending").textContent=state.admin?d.decisionsEnAttente:"—";
}
async function refreshOverview(){
 try{
  const latest=await api("tableau");
  state.data=latest;state.enrolled=(latest.mesEcoles||[]).map(x=>x.ecole);
  updateOverview();
 }catch(_){ /* le statut est chargé à la prochaine navigation */ }
}
function values(prefix,n){
 const result=[];
 for(let i=0;i<n;i++){
  const input=$("#rating-"+prefix+"-"+i);
  if(!input||input.value==="")return null;
  result.push(Number(input.value));
 }
 return result;
}
function registerBalance(){
 $("#balance-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const dimensions=values("integral",7),bienEtre=values("bienetre",4),fractures=values("fracture",4);
  const p=values("prejuges",1);
  if(!dimensions||!bienEtre||!fractures||!p||!$("#consent-checkin").checked){
   feedback("#balance-feedback","Répondez à toutes les questions et confirmez votre consentement.",true);return;
  }
  const btn=$("#submit-checkin");btn.disabled=true;
  feedback("#balance-feedback","Enregistrement en cours…");
  try{
   await api("enregistrer_bilan",{dimensions,bienEtre,fractures,prejuges:p[0],consentement:true});
   feedback("#balance-feedback","Votre bilan a été enregistré dans votre espace personnel.");
   $("#consent-checkin").checked=false;await loadMyHistory();await refreshOverview();
  }catch(error){feedback("#balance-feedback",error.message,true);}
  finally{btn.disabled=false;}
 });
 $("#delete-checkins").addEventListener("click",async()=>{
  if(!confirm("Supprimer définitivement toutes vos auto-évaluations personnelles SDE OS ?"))return;
  try{await api("supprimer_mes_bilans");feedback("#balance-feedback","Vos bilans SDE OS ont été supprimés.");await loadMyHistory();await refreshOverview();}
  catch(error){feedback("#balance-feedback",error.message,true);}
 });
}
async function loadMyHistory(){
 const el=$("#my-history");
 try{
  const result=await api("mes_bilans");state.history=result.bilans||[];
  el.replaceChildren();
  if(!state.history.length){el.append(node("p","hint","Aucun bilan enregistré. Vos premières données apparaîtront après votre auto-évaluation volontaire."));return;}
  for(const h of state.history){
   const card=node("div","history-item");
   card.append(node("strong","",h.mois),node("span","","Dimensions déclarées : "+h.dimensions.join(" · ")),
    node("small","","Réservé à votre compte"));el.append(card);
  }
  const thisMonth=new Date().toISOString().slice(0,7);
  const latest=state.history.find(h=>h.mois===thisMonth);
  if(latest){
   for(const [key,list] of [["integral",latest.dimensions],["bienetre",latest.bienEtre],["fracture",latest.fractures],["prejuges",[latest.prejuges]]])
    list.forEach((v,i)=>{const select=$("#rating-"+key+"-"+i);if(select)select.value=String(v);});
  }
 }catch(error){el.textContent="Historique indisponible : "+error.message;}
}
function drawChart(data){
 const root=$("#trend-chart"),table=$("#trend-table"),legend=$("#trend-legend");
 root.replaceChildren();table.replaceChildren();legend.replaceChildren();
 if(!data.length){root.append(node("p","hint","Données collectives insuffisantes : au moins 5 réponses distinctes sont nécessaires dans un même mois."));return;}
 const labels=[...state.data.referentiel.fractures,"Préjugés perçus"];
 labels.forEach((t,i)=>{const item=node("span","trend-key");const mark=node("i");mark.style.background=colors[i];item.append(mark,node("span","",t));legend.append(item);});
 const width=760,height=315,left=40,right=20,top=25,bottom=45;
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 "+width+" "+height);
 svg.setAttribute("aria-hidden","true");
 const element=(tag,attrs)=>{
  const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));
  svg.append(el);return el;
 };
 const plotW=width-left-right,plotH=height-top-bottom;
 for(let v=0;v<=4;v++){
  const y=top+(4-v)*plotH/4;
  element("line",{x1:left,y1:y,x2:width-right,y2:y,stroke:"currentColor","stroke-opacity":".16","stroke-dasharray":"3 5"});
  const txt=element("text",{x:15,y:y+4,fill:"currentColor","font-size":12});txt.textContent=String(v);
 }
 data.forEach((d,j)=>{
  const x=left+j*plotW/Math.max(1,data.length-1);
  const txt=element("text",{x,y:height-10,fill:"currentColor","text-anchor":"middle","font-size":11});
  txt.textContent=d.mois.slice(5)+"/"+d.mois.slice(2,4);
 });
 for(let i=0;i<5;i++){
  const points=data.map((d,j)=>{
   const val=Math.max(0,Math.min(4,Number(d.series[i])||0));
   return [left+j*plotW/Math.max(1,data.length-1),top+(4-val)*plotH/4];
  });
  element("polyline",{points:points.map(p=>p.join(",")).join(" "),stroke:colors[i],"stroke-width":3,fill:"none","stroke-linecap":"round","stroke-linejoin":"round"});
  points.forEach(([x,y])=>element("circle",{cx:x,cy:y,r:4,fill:colors[i]}));
 }
 root.append(svg);
 const tab=node("table");const head=node("thead");const tr=node("tr");
 ["Mois","Réponses",...labels].forEach(x=>tr.append(node("th","",x)));head.append(tr);tab.append(head);
 const tbody=node("tbody");data.forEach(d=>{const row=node("tr");
  [d.mois,d.participants,...d.series].forEach(x=>row.append(node("td","",String(x))));tbody.append(row);
 });tab.append(tbody);table.append(tab);
}
async function loadTrend(){
 const root=$("#trend-chart");
 if(!state.admin){root.replaceChildren(node("p","hint","Réservé aux responsables habilités. Vos bilans personnels restent disponibles dans « Soldat Intégral »."));return;}
 try{const r=await api("tendance");state.trend=r.tendance||[];drawChart(state.trend);}
 catch(error){root.replaceChildren(node("p","hint","Tendances indisponibles : "+error.message));}
}
function decisionUI(item){
 const card=node("article","decision-item");
 const top=node("div","decision-top");
 top.append(node("b","",item.titre),node("span","decision-badge",item.statut.replaceAll("_"," ")));
 card.append(top,node("p","hint",item.type.toUpperCase()+" · "+item.details));
 if(item.statut==="en_attente"){
  const actions=node("div","decision-actions");
  if(item.estAuteur)actions.append(node("span","hint","Votre propre proposition requiert un autre responsable."));
  else for(const [choice,label]of [["approuve","Approuver"],["rejete","Refuser"]]){
   const button=node("button","",label);button.type="button";button.dataset.choice=choice;
   button.addEventListener("click",async()=>{
    if(!confirm("Confirmer la décision : "+label.toLowerCase()+" ?"))return;
    button.disabled=true;
    try{await api("examiner_decision",{id:item.id,decision:choice});await loadDecisions();await refreshOverview();}
    catch(error){alert(error.message);button.disabled=false;}
   });actions.append(button);
  }
  card.append(actions);
 }
 return card;
}
async function loadDecisions(){
 const root=$("#decision-list");
 if(!state.admin)return;
 root.replaceChildren(node("p","hint","Chargement du registre…"));
 try{const r=await api("decisions");state.decisions=r.decisions||[];
  root.replaceChildren(...(state.decisions.length?state.decisions.map(decisionUI):[node("p","hint","Aucune proposition à examiner.")]));
 }catch(error){root.replaceChildren(node("p","hint","Registre indisponible : "+error.message));}
}
function registerGovernance(){
 $("#decision-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;const data=new FormData(form);
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{
   await api("proposer_decision",{type:data.get("type"),titre:data.get("titre"),details:data.get("details")});
   feedback("#decision-feedback","Proposition enregistrée. Elle attend une validation indépendante.");
   form.reset();await loadDecisions();await refreshOverview();
  }catch(error){feedback("#decision-feedback",error.message,true);}
  finally{button.disabled=false;}
 });
}
async function start(){
 installNav();filterCommands();registerBalance();registerGovernance();
 try{
  const result=await api("tableau");
  state.data=result;state.admin=!!result.admin;
  state.enrolled=(result.mesEcoles||[]).map(x=>x.ecole);
  $("#session-state").hidden=true;$("#workspace-content").hidden=false;
  decorate();setRoute(getRoute(),false);await loadMyHistory();
 }catch(error){
  $("#session-state").replaceChildren(node("h2","","Accès privé SDE"));
  $("#session-state").append(node("p","",error.message));
  const link=node("a","primary-button","Se connecter à SDE ↗");
  link.href="https://app.mouvement-sde.org/#connexion";$("#session-state").append(link);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
