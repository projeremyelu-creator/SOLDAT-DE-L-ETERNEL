/* Navigation publique unique SDE : une seule arborescence, header, bas de page et tiroir.
 * Aucune information privée. Les liens partagent les routes publiques existantes. */
(() => {
 "use strict";
 const groups=[
  {title:"Le Mouvement",links:[
   ["/mouvement","Notre histoire & vision"],["/gouvernance","Gouvernance & leadership"],
   ["/mouvement#poles","Nos cinq pôles d’action"],["/reseau","Réseau international"],
   ["/transparence","Transparence & engagements"]]},
  {title:"Programmes & Agenda",links:[
   ["/programmes#agenda","Calendrier général"],["/programmes#tpa-2026","Traversée Prophétique annuelle"],
   ["/album-infire","IN FIRE — Conférence et albums"],["/programmes","ALEPH 12 et programmes"],
   ["/academy","Soldiers Academy"]]},
  {title:"Missions & Impact",links:[
   ["/missions-humanitaires","Actions humanitaires"],["/pole-reveil","REV — Réveil & évangélisation"],
   ["/pole-social","ISH — Impact social"],["/pole-logistique","LO — Logistique"],
   ["/pole-medias","CMR — Communication & médias"],["/pole-formation","FDE — Formation"],
   ["/missions","Projets du mouvement"]]},
  {title:"Ressources & Vie",links:[
   ["/enseignements","Enseignements & messages"],["/soldiers-voice","Soldiers Voice"],
   ["/priere","Prières & intercession"],["/temoignages","Témoignages"],
   ["/album-infire","Galerie & médias"],["/newsletter","Newsletter"],
   ["/communaute","Communauté"]]}
 ];
 const make=(tag,cls,txt)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;return e;
 };
 function link(path,label,cls){
  const a=make("a",cls,label);a.href=path;
  if((location.pathname==="/"&&path==="/")||(path!=="/"&&location.pathname===path.split("#")[0]&&!path.includes("#")))a.setAttribute("aria-current","page");
  return a;
 }
 const paths={accueil:"M3 9.5 12 3l9 6.5V21h-6v-7H9v7H3z",agenda:"M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",rejoindre:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a8 8 0 0 1 16 0v2M20 5v6M17 8h6",soutenir:"M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z",menu:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",recherche:"M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 5 5",portail:"M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3"};
 function icon(type){
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.8");
  svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");svg.setAttribute("aria-hidden","true");
  const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",paths[type]);svg.append(p);return svg;
 }
 function menuGroup(g,cls){
  const d=make("details",cls),sum=make("summary","",g.title),panel=make("div","sde-shell-submenu");
  d.append(sum);for(const [href,label] of g.links)panel.append(link(href,label));d.append(panel);return d;
 }
 function header(){
  const h=make("header","site-header sde-shell-header");
  h.setAttribute("role","banner");
  const row=make("div","sde-shell-head-inner");
  const brand=link("/","","sde-shell-brand");brand.setAttribute("aria-label","SDE — Retour à l’accueil");
  const img=document.createElement("img");img.src="/vitrine/logo-96.webp";img.alt="";img.width=42;img.height=42;
  const title=make("span","sde-shell-brand-title");title.append(make("b","", "S.D.E"),make("small","","Soldats de l’Éternel"));brand.append(img,title);
  const nav=make("nav","sde-shell-mega");nav.setAttribute("aria-label","Navigation principale");
  for(const group of groups)nav.append(menuGroup(group,"sde-shell-mega-group"));
  const donation=link("/soutenir","Soutenir","sde-shell-donate");nav.append(donation);
  const actions=make("div","sde-shell-head-actions");
  const search=link("/rechercher","","sde-shell-search");search.setAttribute("aria-label","Rechercher");search.append(icon("recherche"));
  const join=link("/contact#rejoindre","Nous rejoindre","sde-shell-join");
  const portal=link("/portail","Mon Portail S.D.E","sde-shell-portal");portal.prepend(icon("portail"));
  actions.append(search,join,portal);row.append(brand,nav,actions);h.append(row);
  const details=[...nav.querySelectorAll("details")];
  details.forEach(d=>d.addEventListener("toggle",()=>{if(d.open)details.forEach(x=>{if(x!==d)x.open=false;});}));
  document.addEventListener("pointerdown",e=>{if(!nav.contains(e.target))details.forEach(x=>x.open=false);});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")details.forEach(x=>x.open=false);});
  return h;
 }
 function footer(){
  const f=make("footer","site-footer sde-shell-footer");
  f.innerHTML='<div class="sde-shell-footer-grid"><div><a class="sde-shell-footer-brand" href="/"><img src="/vitrine/logo-96.webp" alt="" width="44" height="44"><strong>S.D.E · Le Réveil Spirituel des Nations</strong></a><p>Discipline · Unité · Impact</p><p>Cocody Deux-Plateaux, Abidjan, Côte d’Ivoire</p><p><a href="mailto:infosoldat@gmail.com">infosoldat@gmail.com</a></p><p class="sde-shell-social"><a href="https://www.tiktok.com/@mouvement.sde" target="_blank" rel="noopener noreferrer">TikTok</a><a href="https://www.facebook.com/share/1GkJmWSyqj/" target="_blank" rel="noopener noreferrer">Facebook</a><a href="https://whatsapp.com/channel/0029Vb7BYdL3WHTVwJ0bwC0G" target="_blank" rel="noopener noreferrer">WhatsApp</a></p></div><nav aria-label="Le Mouvement"><h2>Le Mouvement</h2><a href="/mouvement">Notre histoire & vision</a><a href="/mouvement#poles">Les 5 pôles</a><a href="/gouvernance">Gouvernance & leadership</a><a href="/reseau">Réseau international</a><a href="/transparence">Transparence</a></nav><nav aria-label="Vie et programmes"><h2>Vie & programmes</h2><a href="/programmes#agenda">Calendrier général</a><a href="/programmes#tpa-2026">TPA 2026</a><a href="/album-infire">IN FIRE</a><a href="/academy">Soldiers Academy</a><a href="/soldiers-voice">Soldiers Voice</a></nav><nav aria-label="Agir et espace membre"><h2>Agir & espace membre</h2><a href="/contact#rejoindre">Nous rejoindre</a><a href="/soutenir">Soutenir la mission</a><a href="/priere">Confier une prière</a><a href="/portail">Mon Portail S.D.E</a><form method="post" class="sde-shell-newsletter"><label for="sde-shell-news-email">Newsletter SDE</label><input id="sde-shell-news-email" name="email" type="email" maxlength="180" autocomplete="email" placeholder="Votre adresse e-mail" required><label class="sde-shell-consent"><input type="checkbox" name="consentement" required><span>Je consens à recevoir les nouvelles SDE.</span></label><p class="sde-privacy-note">Informations utilisées pour cette inscription. <a href="/confidentialite">Confidentialité</a>.</p><button type="submit">Recevoir les nouvelles</button><p class="sde-shell-newsletter-state" role="status" aria-live="polite"></p></form><a href="/newsletter">Gérer mes abonnements</a></nav></div><div class="sde-shell-subfooter"><span>© 2026 Mouvement Prophético-Apostolique Soldats de l’Éternel</span><nav aria-label="Informations légales"><a href="/confidentialite">Confidentialité</a><a href="/gouvernance">Gouvernance</a><a href="/contact">Contact</a></nav></div>';
  const form=f.querySelector(".sde-shell-newsletter");
  form?.addEventListener("submit",async event=>{
   event.preventDefault();
   if(!form.reportValidity())return;
   const email=form.elements.email.value.trim();
   const status=form.querySelector(".sde-shell-newsletter-state");
   const button=form.querySelector('button[type="submit"]');
   button.disabled=true;status.textContent="Inscription en cours…";
   try{
    const response=await fetch("/api/newsletter",{
     method:"POST",headers:{"content-type":"application/json"},
     credentials:"same-origin",cache:"no-store",
     body:JSON.stringify({nom:"",email,themes:["hebdo"],consentement:true,site:""})
    });
    const data=await response.json().catch(()=>({}));
    status.textContent=data.message||(response.ok&&data.ok===true
      ?"Un e-mail de confirmation vous sera envoyé.":"Impossible de finaliser votre demande.");
    if(response.ok&&data.ok===true)form.reset();
   }catch(_){status.textContent="Connexion impossible. Réessayez depuis la page Newsletter."}
   finally{button.disabled=false}
  });
  return f;
 }
 function drawer(){
  const overlay=make("div","sde-shell-overlay");overlay.hidden=true;
  const bg=make("button","sde-shell-backdrop");bg.type="button";bg.setAttribute("aria-label","Fermer le menu");
  const aside=make("aside","sde-shell-drawer");aside.setAttribute("role","dialog");aside.setAttribute("aria-modal","true");aside.setAttribute("aria-labelledby","sde-shell-drawer-title");
  const heading=make("div","sde-shell-drawer-head");
  const h=make("h2","", "Toutes les rubriques");h.id="sde-shell-drawer-title";
  const close=make("button","sde-shell-close","Fermer ×");close.type="button";
  heading.append(h,close);
  const search=make("input","sde-shell-filter");search.type="search";search.placeholder="Chercher une rubrique…";search.setAttribute("aria-label","Chercher une rubrique");
  const quick=make("div","sde-shell-quick");
  quick.append(link("/portail","Connexion — Mon Portail S.D.E","sde-shell-quick-portal"),link("/priere","Confier un sujet de prière","sde-shell-quick-prayer"));
  const content=make("div","sde-shell-drawer-groups");
  for(const group of groups)content.append(menuGroup(group,"sde-shell-drawer-group"));
  const noResult=make("p","sde-shell-no-results","Aucune rubrique trouvée.");noResult.hidden=true;
  aside.append(heading,search,quick,content,noResult);overlay.append(bg,aside);
  const tab=make("nav","sde-public-bottom-nav sde-shell-bottom");tab.setAttribute("aria-label","Navigation mobile SDE");
  const entries=[["accueil","Accueil","/"],["agenda","Agenda","/programmes#agenda"],["rejoindre","Rejoindre","/contact#rejoindre"],["soutenir","Soutenir","/soutenir"]];
  for(const [key,label,href] of entries){
   const a=link(href,"","sde-shell-bottom-item");a.append(icon(key),make("span","",label));tab.append(a);
  }
  const toggle=make("button","sde-shell-bottom-item sde-shell-open");toggle.type="button";toggle.append(icon("menu"),make("span","","Menu"));
  toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","sde-shell-overlay");tab.append(toggle);overlay.id="sde-shell-overlay";
  let lastFocus=null;
  const open=()=>{
   lastFocus=document.activeElement;overlay.hidden=false;toggle.setAttribute("aria-expanded","true");
   document.body.classList.add("sde-shell-drawer-open");search.focus();
  };
  const dismiss=()=>{
   overlay.hidden=true;toggle.setAttribute("aria-expanded","false");
   document.body.classList.remove("sde-shell-drawer-open");
   if(lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
  };
  toggle.addEventListener("click",()=>overlay.hidden?open():dismiss());
  close.addEventListener("click",dismiss);bg.addEventListener("click",dismiss);
  overlay.addEventListener("click",e=>{if(e.target.closest("a"))dismiss();});
  overlay.addEventListener("keydown",e=>{
   if(e.key==="Escape"){e.preventDefault();dismiss();return;}
   if(e.key!=="Tab")return;
   const focusable=[...aside.querySelectorAll('a,button,summary,input')].filter(el=>el.getClientRects().length>0&&!el.disabled);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  search.addEventListener("input",()=>{
   const q=search.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();let count=0;
   for(const d of content.querySelectorAll("details")){
    let found=0;
    for(const a of d.querySelectorAll("a")){
     const t=a.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
     const visible=!q||t.includes(q)||d.querySelector("summary").textContent.toLowerCase().includes(q);
     a.hidden=!visible;if(visible)found++;
    }
    d.hidden=!found;if(q&&found)d.open=true;count+=found;
   }
   noResult.hidden=count>0;
  });
  return {overlay,tab};
 }
 function start(){
  if(document.body.classList.contains("sde-reference-login")||/^\/(mon-espace|administration)(\/|$)/.test(location.pathname))return;
  const old=document.querySelector("header.site-header,header.sde-hub-head") || (location.pathname==="/album-infire"?document.querySelector("body > header"):null);
  if(!old||document.querySelector(".sde-shell-header"))return;
  old.replaceWith(header());
  const oldFoot=document.querySelector("footer.site-footer,footer.hub-footer") || (location.pathname==="/album-infire"?document.querySelector("body > footer"):null);
  if(oldFoot)oldFoot.replaceWith(footer());
  const bottom=drawer();
  document.querySelectorAll(".sde-global-nav,.sde-public-bottom-nav,.sde-standalone-bottom,.nav-mobile,.sde-bottom-nav,.sde-rail").forEach(el=>el.remove());
  document.body.append(bottom.overlay,bottom.tab);
  document.body.classList.add("sde-shell-mounted");
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();