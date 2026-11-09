/* SDE · Expérience interactive publique : aucun état ni référence de demande fictifs. */
(()=>{"use strict";
const $=(q,root=document)=>root.querySelector(q);
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
const svg=(tag,attrs)=>{const x=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,String(v));return x;};
const reduced=()=>document.documentElement.dataset.motion==="reduced"||document.body.dataset.motion==="paused"||!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const poles=[
 {key:"REV",name:"Réveil et Évangélisation",desc:"Prière, intercession et annonce de l’Évangile au service des nations.",acts:["Intercession","Évangélisation","Missions spirituelles"],url:"/pole-reveil",color:"#D8B4FE",x:200,y:55,short:"RÉVEIL"},
 {key:"ISH",name:"Impact Social et Humanitaire",desc:"Aide concrète aux veuves, aux orphelins et aux personnes en situation de vulnérabilité.",acts:["Solidarité","Accompagnement social","Actions humanitaires"],url:"/pole-social",color:"#86EFAC",x:338,y:155,short:"SOCIAL"},
 {key:"LO",name:"Logistique et Organisation",desc:"Accueil, coordination et organisation des événements et missions du mouvement.",acts:["Accueil et protocole","Régie technique","Coordination terrain"],url:"/pole-logistique",color:"#93C5FD",x:285,y:317,short:"LOGISTIQUE"},
 {key:"CMR",name:"Communication, Médias et Relations Extérieures",desc:"Création des supports, diffusion et rayonnement de l’information du mouvement.",acts:["Design et vidéo","Médias numériques","Relations extérieures"],url:"/pole-medias",color:"#FDE68A",x:115,y:317,short:"MÉDIAS"},
 {key:"FDE",name:"Formation, Développement et Entrepreneuriat",desc:"Soldiers Academy, formation et développement des compétences pour servir.",acts:["Formation biblique","Leadership","Entrepreneuriat"],url:"/pole-formation",color:"#67E8F9",x:62,y:155,short:"ACADEMY"}
];
const years={
 "2026":{title:"2026 · Structurer, réveiller et digitaliser",status:"Phase de fondation · bilan en cours",desc:"Structuration des cinq pôles, développement du portail numérique et organisation des rassemblements. Les réalisations sont suivies dans les bilans officiels.",verbs:"Réveiller · Restaurer · Organiser",progress:0,cards:[
  ["Rassemblements","IN FIRE & TPA 2026","Conférence IN FIRE et Traversée Prophétique Annuelle du 18 décembre 2026."],
  ["Gouvernance","Portail & cinq pôles","Déploiement des outils d’adhésion et organisation des responsabilités."],
  ["Réseau","Six pays mentionnés","Relations et contacts internationaux : implantations locales à confirmer individuellement."]]},
 "2027":{title:"2027 · Former et intensifier l’impact",status:"Objectifs projetés pour 2027",desc:"Développer Soldiers Academy, renforcer les missions sociales et préparer les prochaines grandes rencontres. Ces jalons représentent des objectifs, non des réalisations déjà acquises.",verbs:"Former · Équiper · Servir",progress:.5,cards:[
  ["Pôle FDE","Soldiers Academy","Développer les parcours de formation et leurs validations."],
  ["Pôle ISH","Missions humanitaires","Structurer les projets de soutien aux personnes vulnérables et leur suivi."],
  ["Soldiers Voice","Rayonnement numérique","Enrichir et diffuser les enseignements et temps de louange."]]},
 "2028":{title:"2028 · Équiper et envoyer vers les nations",status:"Horizon stratégique 2028",desc:"Approfondir la formation des leaders et envisager de nouveaux points d’ancrage internationaux après validation des moyens, des personnes et des autorisations nécessaires.",verbs:"Équiper · Envoyer · Impacter",progress:1,cards:[
  ["Expansion","Nouveaux relais envisagés","Étudier des implantations et partenariats en fonction des besoins vérifiés."],
  ["Leadership","Équipement des responsables","Préparer des équipes à l’encadrement et au déploiement des missions."],
  ["Communion","Convergence internationale","Développer les rencontres et les coopérations intercommunautaires."]]}
};
function contact(){
 const cards=[...document.querySelectorAll(".parcours-rejoindre [data-sde-intent]")],form=$("#form-rejoindre"),obj=$("#f-objet");
 if(!cards.length||!form||!obj)return;
 const map={decouvrir:"Découvrir le mouvement",participer:"Traversée Prophétique Annuelle — TPA 2026",servir:"Servir dans un pôle",former:"Soldiers Academy"};
 const labels={decouvrir:"Découvrir le mouvement",participer:"Participer à un programme",servir:"Servir dans un pôle",former:"Se former avec Soldiers Academy"};
 const hints={decouvrir:"Que souhaitez-vous découvrir ?",participer:"Précisez le programme ou la date qui vous intéresse.",servir:"Quels dons ou compétences aimeriez-vous mettre au service ?",former:"Quelle formation vous intéresse ?"};
 const status=make("p","sde-intent-status","Choisissez votre parcours pour adapter le formulaire.");
 cards[0].parentElement.insertAdjacentElement("afterend",status);
 const select=key=>{
  if(!(key in map))return;
  const option=[...obj.options].find(x=>x.value===map[key]||x.textContent===map[key]);
  if(option)obj.value=option.value;
  obj.dispatchEvent(new Event("change",{bubbles:true}));
  for(const c of cards){if(c.dataset.sdeIntent===key)c.setAttribute("aria-current","true");else c.removeAttribute("aria-current");}
  status.textContent="Parcours sélectionné : "+labels[key];
  const msg=$("#f-msg");if(msg)msg.placeholder=hints[key];
  const area=$("#f-adhesion"),pole=$("#f-pole");
  if(area&&key==="servir"){
   area.hidden=false;
   const legend=$(".legende",area);if(legend)legend.textContent="Choisissez votre pôle d’intérêt pour servir.";
   pole.required=true;
   const choices=["REV","ISH","LO","CMR","FDE"];const keyPole=new URLSearchParams(location.search).get("pole");
   if(choices.includes(keyPole))pole.selectedIndex=choices.indexOf(keyPole)+1;
   ["f-programme","f-motivation"].forEach(id=>{$("#"+id)?.closest(".champ")?.setAttribute("hidden","");const el=$("#"+id);if(el)el.required=false;});
  }else if(area&&key!=="servir"){
   ["f-programme","f-motivation"].forEach(id=>{$("#"+id)?.closest(".champ")?.removeAttribute("hidden");});
  }
 };
 cards.forEach(c=>c.addEventListener("click",e=>{
  e.preventDefault();select(c.dataset.sdeIntent);
  $("#f-rejoindre")?.scrollIntoView({behavior:reduced()?"instant":"smooth",block:"start"});
  $("#f-nom")?.focus({preventScroll:true});
 }));
 const qp=new URLSearchParams(location.search);const intent=qp.get("intent");
 if(intent&&map[intent])select(intent);
 else if(!qp.has("objet"))select("decouvrir");
 // Le numéro de suivi est produit uniquement par /api/engager, jamais côté navigateur.
 form.addEventListener("submit",e=>{
  if(obj.value==="Servir dans un pôle"&&!$("#f-pole")?.value){
   e.preventDefault();e.stopImmediatePropagation();const error=$("#f-erreur");
   if(error){error.hidden=false;error.textContent="Choisissez le pôle dans lequel vous souhaitez servir.";}
   $("#f-pole")?.focus();
  }
 },true);
}
function compass(){
 const grid=$("#poles-accueil .ap-poles");
 if(!grid||$("#sde-compass"))return;
 const container=make("section","sde-compass-layout");container.id="sde-compass";
 container.setAttribute("aria-label","Boussole interactive des cinq pôles");
 const graphic=make("div","sde-compass-graphic");
 const drawing=svg("svg",{viewBox:"0 0 400 400",role:"group","aria-label":"Sélectionnez un des cinq pôles autour du centre SDE"});
 const defs=svg("defs"),grad=svg("linearGradient",{id:"sde-compass-gradient",x1:"0%",y1:"0%",x2:"100%",y2:"100%"});
 for(const [offset,color] of [["0%","#F3E5AB"],["50%","#D4AF37"],["100%","#997A15"]])grad.append(svg("stop",{offset,"stop-color":color}));
 defs.append(grad);drawing.append(defs);
 drawing.append(svg("circle",{cx:200,cy:200,r:145,fill:"none",stroke:"url(#sde-compass-gradient)","stroke-width":1.3,"stroke-dasharray":"4 7",opacity:.53,class:"sde-compass-orbit"}));
 drawing.append(svg("circle",{cx:200,cy:200,r:94,fill:"none",stroke:"rgba(255,255,255,.12)"}));
 const lines={};const nodes={};
 for(const p of poles){const line=svg("line",{x1:200,y1:200,x2:p.x,y2:p.y,"stroke-width":2,stroke:"#D4AF37",opacity:.28});drawing.append(line);lines[p.key]=line;}
 drawing.append(svg("circle",{cx:200,cy:200,r:43,fill:"#0F111A",stroke:"#D4AF37","stroke-width":2.5}));
 const center=svg("text",{x:200,y:196,"text-anchor":"middle",fill:"#F3E5AB","font-size":15,"font-weight":800,"letter-spacing":2});
 center.textContent="S.D.E";drawing.append(center);
 const small=svg("text",{x:200,y:212,"text-anchor":"middle",fill:"#94A3B8","font-size":9});
 small.textContent="ÉZÉCHIEL 37";drawing.append(small);
 const info=make("div","sde-compass-details");
 const badge=make("span","sde-compass-badge"),title=make("h3",""),description=make("p","");
 const list=make("ul","sde-pole-preview-list");
 const links=make("div","sde-compass-actions");
 const complete=make("a","sde-compass-cta","Découvrir ce pôle"),join=make("a","","Rejoindre l’équipe");
 links.append(complete,join);info.append(badge,title,description,list,links);
 const select=key=>{
  const p=poles.find(x=>x.key===key);if(!p)return;
  container.dataset.activePole=key;
  badge.textContent="Pôle "+(poles.indexOf(p)+1)+" · "+key;
  badge.style.color=p.color;
  title.textContent=p.name;description.textContent=p.desc;
  list.replaceChildren(...p.acts.map(x=>make("li","",x)));
  complete.href=p.url;join.href="/contact?objet="+encodeURIComponent("Servir dans un pôle")+"&intent=servir&pole="+key+"#rejoindre";
  for(const x of poles){
   const chosen=x.key===key;
   const node=nodes[x.key],circle=$("circle",node);
   circle.setAttribute("stroke",chosen?"#D4AF37":"rgba(243,229,171,.34)");
   circle.setAttribute("stroke-width",chosen?3:1.6);
   circle.setAttribute("fill",chosen?"#232038":"#0F111A");
   node.setAttribute("aria-pressed",String(chosen));
   lines[x.key].setAttribute("opacity",chosen?.95:.25);
   lines[x.key].setAttribute("stroke",chosen?p.color:"#D4AF37");
  }
 };
 for(const p of poles){
  const g=svg("g",{role:"button",tabindex:0,"aria-label":"Découvrir "+p.key+" : "+p.name,"data-pole":p.key});
  g.classList.add("sde-compass-node");
  const c=svg("circle",{cx:p.x,cy:p.y,r:28,fill:"#0F111A",stroke:"rgba(243,229,171,.4)","stroke-width":1.6});
  const t=svg("text",{x:p.x,y:p.y-1,"text-anchor":"middle",fill:"#F8FAFC","font-size":12,"font-weight":800});t.textContent=p.key;
  const subt=svg("text",{x:p.x,y:p.y+13,"text-anchor":"middle",fill:p.color,"font-size":7.3,"font-weight":700});subt.textContent=p.short;
  g.append(c,t,subt);drawing.append(g);nodes[p.key]=g;
  g.addEventListener("click",()=>select(p.key));
  g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(p.key);}});
  g.addEventListener("mouseenter",()=>select(p.key));
  const card=grid.querySelector('a[href="'+p.url+'"]')?.closest(".m-pole");
  if(card){
   const quick=make("button","sde-compass-quick","Aperçu rapide de "+p.key);quick.type="button";
   quick.addEventListener("click",()=>{
    select(p.key);container.scrollIntoView({behavior:reduced()?"instant":"smooth",block:"nearest"});g.focus({preventScroll:true});
   });card.append(quick);
  }
 }
 graphic.append(drawing);container.append(graphic,info);grid.insertAdjacentElement("afterend",container);select("REV");
}
function network(){
 const map=$("#hub-map-svg"),figure=map?.closest("figure");
 if(!figure||$("#sde-network-map"))return;
 const countries=[
  {key:"CI",name:"Côte d’Ivoire",desc:"Siège du mouvement à Abidjan (Cocody Deux-Plateaux).",x:405,y:239,color:"#D4AF37"},
  {key:"BF",name:"Burkina Faso",desc:"Pays mentionné dans le réseau SDE. Responsable et activités locales à confirmer.",x:409,y:206,color:"#F3E5AB"},
  {key:"TN",name:"Tunisie",desc:"Pays mentionné dans le réseau SDE. Implantation et rencontres locales à confirmer.",x:433,y:143,color:"#F3E5AB"},
  {key:"IT",name:"Italie",desc:"Pays mentionné dans le réseau SDE. Représentation locale à confirmer.",x:461,y:116,color:"#F3E5AB"},
  {key:"CA",name:"Canada",desc:"Pays mentionné dans le réseau SDE. Représentation locale à confirmer.",x:227,y:94,color:"#F3E5AB"},
  {key:"US",name:"États-Unis",desc:"Pays mentionné dans le réseau SDE. Représentation locale à confirmer.",x:216,y:154,color:"#F3E5AB"}
 ];
 const block=make("div","sde-network-visual");block.id="sde-network-map";
 const illustration=svg("svg",{viewBox:"0 0 800 380",role:"group","aria-label":"Connexions illustratives d’Abidjan vers les cinq autres pays mentionnés, sans adresse exacte"});
 const defs=svg("defs"),gradient=svg("linearGradient",{id:"sde-network-gradient",x1:"0%",x2:"100%",y1:"0%",y2:"0%"});
 gradient.append(svg("stop",{offset:"0%","stop-color":"#D4AF37"}),svg("stop",{offset:"100%","stop-color":"#F3E5AB","stop-opacity":.35}));defs.append(gradient);illustration.append(defs);
 for(const x of [160,320,480,640])illustration.append(svg("line",{x1:x,y1:0,x2:x,y2:380,stroke:"rgba(255,255,255,.045)"}));
 for(const y of [95,190,285])illustration.append(svg("line",{x1:0,y1:y,x2:800,y2:y,stroke:"rgba(255,255,255,.045)"}));
 for(const p of countries.slice(1)){
  illustration.append(svg("path",{d:"M405 239 Q"+((405+p.x)/2)+" "+(Math.min(239,p.y)-38)+" "+p.x+" "+p.y,
  fill:"none",stroke:"url(#sde-network-gradient)","stroke-width":1.8,"stroke-dasharray":"5 5",class:"sde-network-link"}));
 }
 const nodes={};
 for(const c of countries){
  const g=svg("g",{role:"button",tabindex:0,"aria-label":"Explorer "+c.name,"data-code":c.key});
  g.classList.add("sde-network-node");
  g.append(svg("circle",{cx:c.x,cy:c.y,r:c.key==="CI"?10:7,fill:c.color}));
  const text=svg("text",{x:c.x+11,y:c.y-12,fill:"#E9EDF6","font-size":12,"font-weight":650});text.textContent=c.key==="CI"?"ABIDJAN — SIÈGE":c.name;
  g.append(text);illustration.append(g);nodes[c.key]=g;
 }
 const info=make("div","sde-network-info");
 const name=make("h3",""),desc=make("p","");
 const help=make("p","sde-network-note","Repères schématiques, sans géolocalisation personnelle. Aucun relais local n’est annoncé comme officiellement confirmé sans vérification.");
 const action=make("a","sde-compass-cta","Contacter le réseau SDE");action.href="/contact#rejoindre";
 info.append(name,desc,help,action);block.append(illustration,info);
 figure.insertAdjacentElement("beforebegin",block);
 document.body.classList.add("sde-network-enhanced");
 const select=key=>{
  const c=countries.find(x=>x.key===key);if(!c)return;
  name.textContent=c.name;desc.textContent=c.desc;
  for(const x of countries)nodes[x.key].setAttribute("aria-pressed",String(x.key===key));
 };
 for(const c of countries){
  nodes[c.key].addEventListener("click",()=>select(c.key));
  nodes[c.key].addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(c.key);}});
  document.querySelector('[data-country-choice="'+c.name+'"]')?.addEventListener("click",()=>select(c.key));
 }
 select("CI");
}
function roadmap(){
 const root=$("#roadmap-sde");if(!root)return;
 const buttons=[...root.querySelectorAll("[data-sde-year]")],bar=$("#sde-roadmap-progress");
 const status=$("#rm-status"),title=$("#rm-title"),desc=$("#rm-desc"),verbs=$("#rm-verbs"),milestones=$("#rm-milestones");
 if(!buttons.length||!bar||!title)return;
 const choose=year=>{
  const data=years[year];if(!data)return;
  bar.style.transform="scaleX("+data.progress+")";
  status.textContent=data.status;title.textContent=data.title;desc.textContent=data.desc;verbs.textContent=data.verbs;
  milestones.replaceChildren(...data.cards.map(([tag,heading,body])=>{
   const article=make("article","sde-roadmap-milestone");
   article.append(make("span","sde-roadmap-milestone-tag",tag),make("h4","",heading),make("p","",body));
   return article;
  }));
  for(const b of buttons)b.setAttribute("aria-pressed",String(b.dataset.sdeYear===year));
 };
 buttons.forEach((b,i)=>{b.addEventListener("click",()=>choose(b.dataset.sdeYear));
  b.addEventListener("keydown",e=>{
   const change=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
   if(!change)return;e.preventDefault();const next=buttons[(i+change+buttons.length)%buttons.length];next.click();next.focus();
  });
 });choose("2026");
}
function calendar(){
 const base=$("#ap-next-register")?.closest(".ap-next");
 if(!base||$("#sde-tpa-calendar"))return;
 const wrap=make("div","sde-quick-calendar");wrap.id="sde-tpa-calendar";
 const t="Traversée Prophétique Annuelle — TPA 2026";
 const body="Vendredi 18 décembre 2026 à 20h00 GMT (Abidjan). Google Meet : lien communiqué par les organisateurs. Durée indicative d'une heure, à ajuster. Voir mouvement-sde.org/programmes#tpa-2026";
 const google=make("a","","Google Agenda");google.href="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(t)+"&dates=20261218T200000Z/20261218T210000Z&details="+encodeURIComponent(body);
 google.target="_blank";google.rel="noopener noreferrer";
 const ics=make("a","","Rappel iPhone / .ics");ics.href="/vitrine/tpa-2026-rappel.ics";ics.download="tpa-2026-rappel.ics";
 const share=make("a","","Partager sur WhatsApp");share.href="https://wa.me/?text="+encodeURIComponent(t+" le 18 décembre 2026 à 20h (Abidjan). Informations : https://mouvement-sde.org/programmes#tpa-2026");
 share.target="_blank";share.rel="noopener noreferrer";
 wrap.append(google,ics,share);
 const tgt=$(".ap-next-actions",base);
 if(tgt){tgt.insertAdjacentElement("afterend",wrap);wrap.insertAdjacentElement("afterend",make("small","sde-quick-calendar-note","Le fichier .ics prévoit un rappel 30 min avant. Durée indicative ; aucun lien privé Meet n’est exposé."));}
}
function reveal(){
 const nodes=[...document.querySelectorAll("#poles-accueil .m-pole,#programmes-accueil .ap-card,.sde-premium-pillar")];
 nodes.forEach((n,i)=>{n.classList.add("card-sde-interactive","reveal-on-scroll");if(i%3)n.classList.add("delay-"+i%3+"00");});
 document.querySelectorAll(".ap-galerie img").forEach(n=>n.classList.add("img-zoom-slow"));
 if(!nodes.length||reduced()||!("IntersectionObserver" in window))return;
 const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add("is-visible");entry.target.classList.remove("sde-reveal-pending");obs.unobserve(entry.target);}
 }),{threshold:.06,rootMargin:"0px 0px 110px 0px"});
 nodes.forEach(n=>obs.observe(n));
 // Activé uniquement pour les éléments hors écran au premier rendu.
 for(const n of nodes)if(n.getBoundingClientRect().top>innerHeight+80)n.classList.add("sde-reveal-pending");
 document.body.classList.add("sde-reveal-ready");
}
function start(){contact();compass();network();roadmap();calendar();reveal();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();