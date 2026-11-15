/* SDE Digital — sept écrans de référence du 14 novembre 2026.
 * Les données affichées proviennent de la session et des API SDE existantes.
 * Aucune valeur de démonstration n'est substituée aux données réelles.
 * Les panneaux historiques restent accessibles dans leur rubrique.
 */
(() => {
 "use strict";
 const $=(sel,root=document)=>root.querySelector(sel);
 const el=(tag,cls,text)=>{
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(text!==undefined)node.textContent=String(text);
   return node;
 };
 const link=(text,href,cls)=>{
   const a=el("a",cls,text);a.href=href;return a;
 };
 const safeJson=async(url)=>{
   const response=await fetch(url,{credentials:"same-origin",cache:"no-store",headers:{accept:"application/json"}});
   if(!response.ok)throw new Error("Données indisponibles");
   return response.json();
 };
 const labelDate=(s,opts={day:"2-digit",month:"short"})=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return String(s||"");
   return new Intl.DateTimeFormat("fr-FR",{timeZone:"UTC",...opts}).format(new Date(s+"T12:00:00Z"));
 };
 const toName=(m,c)=>{
   const name=[m?.prenoms,m?.nom].filter(Boolean).join(" ").trim();
   return name||c?.nom||"Soldat de l’Éternel";
 };
 function photoFromMember(m){
   const id=String(m?.photoId||"");
   return /^[a-zA-Z0-9_-]{8,80}$/.test(id)?"/_blob/"+encodeURIComponent(id):"/vitrine/logo-96.png";
 }
 function setPhoto(img,m){
   img.src=photoFromMember(m);
   img.alt="Photo du profil membre";
   img.loading="lazy";img.decoding="async";
   img.addEventListener("error",()=>{if(!img.src.endsWith("/vitrine/logo-96.png"))img.src="/vitrine/logo-96.png"},{once:true});
 }
 function subNav(side,view,title,icon){
   if(!side||side.querySelector('[data-view="'+view+'"]'))return;
   const a=link(icon+"  "+title,"#"+view,"sde-px-side-link");a.dataset.view=view;
   const all=side.querySelector("nav");
   if(all){const last=all.querySelector('[data-view="outils"]');last?last.before(a):all.append(a);}
 }
 function publicAccueil(){
   const body=document.body;
   if(!body.classList.contains("sde-2027-reference")||!body.classList.contains("sde-premium-home"))return;
   const hero=$(".ap-hero");
   if(!hero||$(".sde-px-missionline"))return;
   const band=el("div","sde-px-missionline");
   band.append(el("span","sde-px-rule"),el("span","","Notre Devise & Notre Mission"),el("span","sde-px-rule"));
   const steps=el("strong","","Rassembler · Former · Réveiller · Restaurer · Équiper · Envoyer");
   const box=el("section","sde-px-mission-hero");
   box.setAttribute("aria-label","Six axes de mission SDE");
   box.append(band,steps);
   hero.insertAdjacentElement("afterend",box);
   const heading=$("#titre-accueil",hero);
   if(heading&&!heading.dataset.pxTitle){
     heading.dataset.pxTitle="2026";
     const first=el("span","sde-px-title-first","SOLDATS");
     const second=el("span","sde-px-title-gold","DE L’ÉTERNEL");
     heading.replaceChildren(first,document.createTextNode(" "),second);
   }
 }
 function makeQuickGrid(){
   const wrap=el("section","sde-px-quick");
   const h=el("h2","","Mes actions rapides");
   wrap.append(h);
   const grid=el("div","sde-px-quick-grid");
   for(const [icon,title,view] of [
     ["🎓","Poursuivre ma formation","formations"],
     ["▦","Mon agenda","agenda"],
     ["♧","Participer à l’intercession","prieres"],
     ["▤","Rapport de mission","outils"]
   ]){
     const a=link("", "#"+view,"sde-px-action");
     a.dataset.view=view;
     a.append(el("span","sde-px-action-icon",icon),el("span","",title));
     grid.append(a);
   }
   wrap.append(grid);return wrap;
 }
 function makeEventPanel(){
   const wrap=el("section","sde-px-deadlines");
   const head=el("div","sde-px-panel-head");
   head.append(el("h2","","Prochaines échéances"),link("Voir tout ›","#agenda","sde-px-inline-link"));
   head.lastChild.dataset.view="agenda";
   const ul=el("ul","sde-px-deadline-list");
   ul.id="sde-px-deadline-list";
   ul.append(el("li","sde-px-empty","Chargement de l’agenda…"));
   wrap.append(head,ul);return wrap;
 }
 function refreshEvents(items){
   const ul=$("#sde-px-deadline-list");
   if(!ul)return;
   ul.replaceChildren();
   const sorted=(Array.isArray(items)?items:[]).filter(x=>x?.date&&x?.titre).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
   if(!sorted.length){ul.append(el("li","sde-px-empty","Aucun événement publié dans l’agenda. Consultez les programmes."));return;}
   for(const item of sorted.slice(0,4)){
     const li=el("li","sde-px-deadline");
     const date=el("span","sde-px-date-square");
     date.append(el("strong","",String(item.date).slice(-2)),el("small","",labelDate(item.date,{month:"short"})));
     const summary=el("span","sde-px-date-copy");
     summary.append(el("strong","",item.titre),el("small","",[item.lieu,item.heure].filter(Boolean).join(" · ")));
     li.append(date,summary);
     ul.append(li);
   }
 }
 function makeProgress(){
   const wrap=el("section","sde-px-progress");
   const label=el("p","sde-px-kicker","MON TABLEAU DE BORD");
   const heading=el("h2","","Mon parcours SDE");
   const progress=el("div","sde-px-progress-panel");
   const ring=el("div","sde-px-progress-ring");
   ring.id="sde-px-ring";ring.append(el("strong","","—"));
   const text=el("div","sde-px-progress-copy");
   text.append(el("h3","","Ma progression de formation"),el("p","sde-px-progress-label","Chargement du parcours…"));
   const meter=el("progress","sde-px-progress-bar");meter.id="sde-px-meter";meter.max=100;meter.value=0;
   meter.setAttribute("aria-label","Progression de formation");
   text.append(meter);
   const action=link("Continuer →","#formations","sde-px-progress-continue");action.dataset.view="formations";
   progress.append(ring,text,action);
   const stats=el("div","sde-px-learning-stats");stats.id="sde-px-learning-stats";
   const next=el("div","sde-px-next");
   next.append(el("h3","","Ma prochaine étape"),el("p","sde-px-next-label","Votre parcours apparaît ici après synchronisation."));
   const nextLink=link("▶","#formations","sde-px-play");nextLink.dataset.view="formations";next.append(nextLink);
   wrap.append(label,heading,progress,stats,next);
   return wrap;
 }
 function putLearningStats(rows){
   const grid=$("#sde-px-learning-stats");if(!grid)return;
   grid.replaceChildren();
   for(const [icon,value,label] of rows){
     const a=el("div","sde-px-learning-stat");
     a.append(el("span","sde-px-stat-icon",icon),el("strong","",value??"—"),el("small","",label));
     grid.append(a);
   }
 }
 function updateProgress(data,history){
   const total=Number(data?.modulesTotal);
   const complete=Number(data?.modulesFaits);
   const rate=typeof data?.pourcentage==="number"?data.pourcentage:
     total>0?Math.round(complete/total*100):null;
   const ring=$("#sde-px-ring"),meter=$("#sde-px-meter"),l=$(".sde-px-progress-label");
   if(ring){ring.style.setProperty("--pct",rate===null?0:Math.min(100,Math.max(0,rate)));$("strong",ring).textContent=rate===null?"—":rate+"%";}
   if(meter)meter.value=rate===null?0:Math.min(100,Math.max(0,rate));
   if(l)l.textContent=Number.isFinite(total)&&total>0?complete+" / "+total+" modules validés":"Aucune formation commencée";
   const following=(data?.parcours||[]).flatMap(p=>(p?.modules||[]).filter(m=>!m.suivi).map(m=>m.titre)).find(Boolean);
   const next=$(".sde-px-next-label");if(next)next.textContent=following||"Explorer les formations et les prochains modules disponibles.";
   const presences=Array.isArray(history?.presences)?history.presences.filter(x=>x.etat==="P"||x.etat==="R").length:null;
   putLearningStats([
    ["🎓",data?.formations??"—","Formations en cours"],
    ["✓",Number.isFinite(complete)?complete:"—","Modules validés"],
    ["◎","—","Missions réalisées"],
    ["▦",presences??"—","Présences"]
   ]);
 }
 function makeProfile(){
   const section=$('section[data-section="profil"]');
   if(!section||$(".sde-px-profile-cover",section))return;
   const card=el("section","sde-px-profile-cover");
   const top=el("div","sde-px-profile-top");
   top.append(link("←","#accueil","sde-px-back"),el("strong","","Mon profil"));
   const avatar=el("img","sde-px-avatar");
   avatar.id="sde-px-avatar";setPhoto(avatar,{});
   const name=el("h2","sde-px-profile-name","Mon profil SDE");name.id="sde-px-profile-name";
   const role=el("div","sde-px-role","Membre SDE");role.id="sde-px-profile-role";
   const context=el("p","sde-px-profile-meta","Discipline · Unité · Impact");context.id="sde-px-profile-meta";
   const active=el("span","sde-px-active","✓  Espace sécurisé");
   const facts=el("div","sde-px-profile-facts");
   for(const [label,id] of [["Matricule","px-fact-matricule"],["Pôle","px-fact-pole"],["Membre depuis","px-fact-adhesion"]]){
     const fact=el("div","","");
     fact.append(el("small","",label),el("strong","—"));fact.lastChild.id=id;facts.append(fact);
   }
   card.append(top,avatar,name,role,context,active,facts);
   const menu=el("div","sde-px-profile-menu");
   for(const [icon,label,href] of [
     ["♙","Mes informations","#profil"],
     ["🎓","Ma formation","#formations"],
     ["◎","Mes engagements","#presences"],
     ["▤","Mes documents","#outils"]]){
     const a=link("",href,"sde-px-profile-menu-item");
     a.dataset.view=href.slice(1);
     a.append(el("span","",icon),el("strong","",label),el("span","","›"));
     menu.append(a);
   }
   card.append(menu);
   section.prepend(card);
 }
 function updateProfile(data,compte){
   const m=data?.membre||{};
   const img=$("#sde-px-avatar");if(img)setPhoto(img,m);
   const set=(id,txt)=>{const n=$("#"+id);if(n)n.textContent=txt||"—";};
   set("sde-px-profile-name",toName(m,compte));
   set("sde-px-profile-role",m.fonction||compte?.libRole||"Membre SDE");
   set("sde-px-profile-meta",m.statut||"Membre du mouvement");
   set("px-fact-matricule",m.matricule);
   set("px-fact-pole",m.pole);
   set("px-fact-adhesion",m.adhesion?labelDate(m.adhesion,{month:"short",year:"numeric"}):"—");
   const h=$("#sde-px-member-greeting");
   if(h)h.textContent="Bienvenue, "+toName(m,compte);
   const barName=$("#sde-px-userbar-name"),barPhoto=$("#sde-px-userbar-photo");
   if(barName)barName.textContent=toName(m,compte);
   if(barPhoto)setPhoto(barPhoto,m);
 }
 function makeCalendar(){
   const section=el("section","sde-px-screen sde-px-calendar");
   section.dataset.section="agenda";section.hidden=true;section.setAttribute("aria-label","Calendrier et agenda du mouvement");
   const head=el("div","sde-px-screen-head");
   head.append(link("←","#accueil","sde-px-back"),el("h2","","Agenda du Mouvement"));
   const bar=el("div","sde-px-monthbar");
   const prev=el("button","sde-px-monthbtn","‹");prev.type="button";prev.dataset.month="-1";prev.setAttribute("aria-label","Mois précédent");
   const month=el("strong","", "Décembre 2026");month.id="sde-px-month-name";
   const next=el("button","sde-px-monthbtn","›");next.type="button";next.dataset.month="1";next.setAttribute("aria-label","Mois suivant");
   bar.append(prev,month,next);
   const grid=el("div","sde-px-calendar-grid");grid.id="sde-px-calendar-grid";
   const events=el("div","sde-px-event-list");events.id="sde-px-agenda-events";
   events.append(el("p","sde-px-empty","Chargement des événements…"));
   section.append(head,bar,grid,events);
   return section;
 }
 function makeNews(){
   const section=el("section","sde-px-screen sde-px-news");
   section.dataset.section="actualites";section.hidden=true;section.setAttribute("aria-label","Actualités et vie du mouvement");
   const head=el("div","sde-px-screen-head");
   head.append(link("←","#accueil","sde-px-back"),el("h2","","Actualités & Vie du Mouvement"));
   const tabs=el("div","sde-px-news-tabs");
   for(const [key,label] of [["tout","Toutes"],["annonce","Annonces"],["evenement","Programmes"],["mission","Missions"]]){
     const b=el("button","sde-px-news-filter",label);b.type="button";b.dataset.filter=key;b.setAttribute("aria-pressed",key==="tout"?"true":"false");tabs.append(b);
   }
   const feed=el("div","sde-px-news-feed");feed.id="sde-px-news-feed";
   feed.append(el("p","sde-px-empty","Chargement des actualités…"));
   section.append(head,tabs,feed);return section;
 }
 function makeMemberCover(){
   const section=$('section[data-section="accueil"]');
   if(!section||$(".sde-px-member-cover",section))return;
   const cover=el("section","sde-px-member-cover");
   const kicker=el("span","sde-px-cover-kicker","MOUVEMENT S.D.E.");
   const h=el("h2","","MON ESPACE SOLDAT");
   const p=el("p","","Formation · Édification · Engagement");
   cover.append(kicker,h,p);
   const welcome=el("div","sde-px-welcome");
   welcome.append(el("span","sde-px-welcome-kicker","SDE DIGITAL · ESPACE PERSONNEL"),el("strong","sde-px-greeting","Bienvenue dans votre espace"));
   welcome.lastChild.id="sde-px-member-greeting";
   const stat=$(".sde-dash-metrics",section);
   if(stat){stat.before(cover);cover.before(welcome);}
   else section.prepend(welcome,cover);
   const mobileNav=el("nav","sde-px-mobile-shortnav");
   mobileNav.setAttribute("aria-label","Raccourcis des maquettes SDE");
   for(const [title,view] of [["Profil","profil"],["Agenda","agenda"],["Actualités","actualites"],["Parcours","parcours"]]){
     const a=link(title,"#"+view);a.dataset.view=view;mobileNav.append(a);
   }
   cover.after(mobileNav);
   const row=el("div","sde-px-dashboard-row");
   row.append(makeQuickGrid(),makeEventPanel());
   const existing=$(".sdu-member-universe",section)||$(".sde-dash-two",section);
   existing?existing.before(row):section.append(row);
   const sectionProgress=el("section","sde-px-screen sde-px-parcours");
   sectionProgress.dataset.section="parcours";sectionProgress.hidden=true;
   sectionProgress.setAttribute("aria-label","Mon tableau de bord personnel");
   const progressHeading=el("div","sde-px-screen-head");
   progressHeading.append(link("←","#accueil","sde-px-back"),el("h2","","Mon Tableau de Bord"));
   sectionProgress.append(progressHeading,makeProgress());
   section.after(sectionProgress);
   const preview=el("a","sde-px-parcours-preview","📊  Voir mon tableau de bord personnel et ma progression →");
   preview.href="#parcours";preview.dataset.view="parcours";
   row.after(preview);
   for(const selector of [".sdu-member-universe",".sde-dash-two"]){
     const old=$(selector,section);
     if(old&&!old.closest("details")){
       const details=el("details","sde-px-legacy");
       const summary=el("summary","","Explorer les autres services SDE");
       old.before(details);details.append(summary,old);
     }
   }
 }
 function renderCalendar(items){
   const grid=$("#sde-px-calendar-grid"),list=$("#sde-px-agenda-events"),month=$("#sde-px-month-name");
   if(!grid||!list)return;
   const now=new Date();
   // La maquette de référence montre décembre 2026, prochain mois des programmes de fin d'année.
   let year=now.getUTCFullYear(),mo=now.getUTCMonth();
   if(year===2026&&mo<=11){mo=11;}
   const events=(Array.isArray(items)?items:[]).filter(x=>x?.date&&x?.titre);
   const update=()=>{
     const first=new Date(Date.UTC(year,mo,1)),offset=(first.getUTCDay()+6)%7;
     const days=new Date(Date.UTC(year,mo+1,0)).getUTCDate();
     month.textContent=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"}).format(first).replace(/^./,c=>c.toUpperCase());
     grid.replaceChildren();
     for(const d of ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"])grid.append(el("span","sde-px-daylabel",d));
     for(let i=0;i<offset;i++)grid.append(el("span","sde-px-emptyday",""));
     const daysWithEvents=new Set(events.filter(e=>e.date.startsWith(year+"-"+String(mo+1).padStart(2,"0"))).map(e=>Number(e.date.slice(-2))));
     for(let day=1;day<=days;day++){
       const b=el("button","sde-px-day"+(daysWithEvents.has(day)?" has-event":""),day);
       b.type="button";b.dataset.day=String(day);
       const iso=[year,String(mo+1).padStart(2,"0"),String(day).padStart(2,"0")].join("-");
       if(iso===new Date().toISOString().slice(0,10))b.classList.add("is-today");
       b.addEventListener("click",()=>{for(const n of grid.querySelectorAll("button"))n.classList.remove("is-selected");b.classList.add("is-selected");renderList(iso);});
       grid.append(b);
     }
     renderList();
   };
   const renderList=(selected)=>{
     list.replaceChildren();
     const monthPrefix=year+"-"+String(mo+1).padStart(2,"0");
     const show=events.filter(e=>selected?e.date===selected:e.date.startsWith(monthPrefix));
     if(!show.length){list.append(el("p","sde-px-empty",selected?"Aucun événement prévu ce jour.":"Aucun événement publié pour ce mois."));}
     for(const item of show.sort((a,b)=>(a.date+a.heure).localeCompare(b.date+b.heure))){
       const line=el("article","sde-px-calendar-event");
       const date=el("div","sde-px-event-badge");date.append(el("strong","",item.date.slice(-2)),el("small","",labelDate(item.date,{month:"short"})));
       const copy=el("div","sde-px-event-copy");copy.append(el("h3","",item.titre),el("p","",[item.heure,item.lieu].filter(Boolean).join(" · ")));
       line.append(date,copy);list.append(line);
     }
     list.append(link("Consulter les programmes →","/programmes","sde-px-aux-link"));
   };
   for(const b of document.querySelectorAll("[data-month]"))b.addEventListener("click",()=>{
     mo+=Number(b.dataset.month);
     if(mo<0){mo=11;year--}if(mo>11){mo=0;year++}update();
   });
   update();
 }
 function renderNews(data){
   const feed=$("#sde-px-news-feed");if(!feed)return;
   const records=[
     ...(Array.isArray(data?.annonces)?data.annonces:[]),
     ...(Array.isArray(data?.evenements)?data.evenements:[])
   ].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
   function show(type){
     feed.replaceChildren();
     const chosen=type==="tout"?records:records.filter(x=>x.type===type||(type==="mission"&&/mission|humanitaire/i.test(x.categorie||x.titre||"")));
     if(!chosen.length){
       const note=el("p","sde-px-empty","Aucune publication récente disponible pour cette rubrique.");
       feed.append(note);
       if(type==="tout"){
         for(const [title,detail,href,photo] of [
           ["IN FIRE — Archives du mouvement","Retrouvez les images et programmes publiés de 2024 à 2026.","/album-infire","/vitrine/illus/infire-banniere.webp"],
           ["Soldiers Academy","Parcourez les enseignements et les formations disponibles.","/academy","/vitrine/illus/livre-academy.webp"]
         ]){
           const card=el("article","sde-px-news-card sde-px-resource");
           const visual=el("div","sde-px-news-image");
           visual.style.backgroundImage="linear-gradient(180deg,rgba(7,13,42,.03),rgba(10,10,45,.5)),url('"+photo+"')";
           visual.append(el("span","sde-px-news-tag","Ressource SDE"));
           const content=el("div","sde-px-news-content");
           content.append(el("h3","",title),el("p","",detail),link("Découvrir →",href,"sde-px-aux-link"));
           card.append(visual,content);feed.append(card);
         }
       }
     }
     for(const item of chosen.slice(0,20)){
       const article=el("article","sde-px-news-card");
       const cover=el("div","sde-px-news-image "+(item.type==="annonce"?"is-annonce":"is-evenement"));
       const label=el("span","sde-px-news-tag",item.categorie||(item.type==="annonce"?"Actualité SDE":"Programme"));
       cover.append(label);
       const content=el("div","sde-px-news-content");
       content.append(el("h3","",item.titre||"Actualité SDE"));
       if(item.contenu)content.append(el("p","",item.contenu));
       if(item.lieu||item.heure)content.append(el("small","",[item.heure,item.lieu].filter(Boolean).join(" · ")));
       const foot=el("div","sde-px-news-foot");
       foot.append(el("time","",labelDate(item.date,{day:"numeric",month:"short",year:"numeric"})));
       foot.append(link("En savoir plus",item.type==="evenement"?"/programmes":"/communaute","sde-px-aux-link"));
       content.append(foot);article.append(cover,content);feed.append(article);
     }
   }
   for(const button of document.querySelectorAll(".sde-px-news-filter"))button.addEventListener("click",()=>{
     document.querySelectorAll(".sde-px-news-filter").forEach(n=>n.setAttribute("aria-pressed",String(n===button)));
     show(button.dataset.filter);
   });
   show("tout");
 }
 function mountMember(){
   if(document.body.dataset.dashboard!=="membre")return;
   const main=$(".sde-dash-main"),side=$(".sde-dash-side");
   if(!main||$("#sde-px-calendar-grid"))return;
   const header=$(".sde-dash-header-inner");
   if(header&&!$("#sde-px-userbar")){
     const bar=el("div","sde-px-userbar");bar.id="sde-px-userbar";
     const avatar=el("img","sde-px-userbar-photo");avatar.id="sde-px-userbar-photo";
     setPhoto(avatar,{});
     const copy=el("div","sde-px-userbar-copy");
     copy.append(el("strong","","Mon compte SDE"),el("small","","Espace membre sécurisé"));
     copy.firstChild.id="sde-px-userbar-name";
     const news=link("✉","#actualites","sde-px-userbar-news");
     news.dataset.view="actualites";news.setAttribute("aria-label","Consulter les actualités");
     bar.append(avatar,copy,news);
     const nav=header.querySelector("nav");
     if(nav)header.insertBefore(bar,nav);
     else header.append(bar);
   }
   subNav(side,"agenda","Événements & Agenda","▦");
   subNav(side,"actualites","Fil d’actualités","☷");
   subNav(side,"parcours","Mon tableau de bord","▤");
   makeMemberCover();makeProfile();
   main.append(makeCalendar(),makeNews());
   // Après connexion, seul le compte authentifié peut alimenter ces nouveaux écrans.
   (async()=>{
     const auth=await safeJson("/api/moi").catch(()=>null);
     if(!auth?.connecte)return;
     const [profile,academy,news,history]=await Promise.allSettled([
       safeJson("/api/mon-espace"),safeJson("/api/mon-parcours-academy"),safeJson("/api/actualites"),safeJson("/api/mon-historique")
     ]);
     if(profile.status==="fulfilled")updateProfile(profile.value,auth);
     if(academy.status==="fulfilled")updateProgress(academy.value,history.status==="fulfilled"?history.value:null);
     else updateProgress(null,history.status==="fulfilled"?history.value:null);
     const records=news.status==="fulfilled"?news.value:{annonces:[],evenements:[]};
     refreshEvents(records.evenements);
     renderCalendar(records.evenements);
     renderNews(records);
   })();
 }
 function mountAdmin(){
   if(document.body.dataset.dashboard!=="administration")return;
   const head=$(".sde-dash-heading");
   if(head&&!$(".sde-px-admin-kicker",head))head.prepend(el("span","sde-px-admin-kicker","SDE DIGITAL · POSTE DE COMMANDEMENT"));
 }
 function start(){publicAccueil();mountMember();mountAdmin();}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();