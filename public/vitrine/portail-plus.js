/* Accueils, parcours et rappels : même session et même routeur SDE. */
(()=>{
 'use strict';
 const custom=new Set(['synthese','parcours','preferences','gestion','engagements','contributions']);
 const readings=[['Jean 15.1-8','Demeurer en Christ','Confier sa journée à Jésus.'],['Jean 15.9-17','Marcher dans son amour','Prier pour sa famille et ses relations.'],['Psaume 23','Se laisser conduire','Présenter ses besoins et recevoir la paix.'],['Matthieu 6.5-15','Apprendre à prier','Intercéder pour les membres du mouvement.'],['Éphésiens 6.10-18','Persévérer dans la foi','Prier pour les responsables et les nations.'],['Romains 12.1-8','Servir avec ses dons','Discerner une action concrète de service.'],['Actes 2.42-47','Grandir en communauté','Remercier Dieu et prier pour les rencontres.']];
 let portal=null,panel=null,current='',serial=0,summary=null,menuMedia=null,countdownTimer=null;
 const isCustom=m=>custom.has(m)||(m==='academie'&&location.pathname==='/mon-espace');
 const node=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e};
 const button=(txt,action,cls='sde-plus-button')=>{const b=node('button',txt,cls);b.type='button';b.addEventListener('click',action);return b};
 const route=(txt,module)=>{const b=button(txt,()=>portal.selectionner(module));b.dataset.plusModule=module;return b};
 const note=txt=>node('p',txt,'sde-plus-note');
 function feedback(message,error=false){const e=document.getElementById('sde-plus-feedback');if(e){e.textContent=message;e.dataset.error=String(error)}}
 async function api(path,method='GET',body){const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||(r.status===401?'Votre session a expiré. Reconnectez-vous.':'Le service est indisponible. Réessayez.'));return d}
 function box(title){const c=node('section',undefined,'sde-plus-card');c.append(node('h3',title));return c}
 function list(items,empty,render){const ul=node('ul',undefined,'sde-plus-list');if(!items.length)ul.append(node('li',empty));else for(const item of items){const li=node('li');render(li,item);ul.append(li)}return ul}
 function status(){const f=node('p','','sde-plus-feedback');f.id='sde-plus-feedback';f.setAttribute('role','status');f.setAttribute('aria-live','polite');return f}
 function heading(text){const h=node('h2',text);h.tabIndex=-1;panel.append(h);return h}
 function stateTitle(module){const labels={synthese:portal?.compte.niveau>=1&&location.pathname==='/administration'?'Accueil de la direction':'Mon accueil',engagements:'Mes engagements',contributions:'Dons & Dîmes',parcours:'Lecture et prière',preferences:'Mes rappels',gestion:'Centre de contrôle'};return labels[module]||module}
 function setActive(module,title){const titleNode=document.getElementById('sde-current-module');if(titleNode)titleNode.textContent=title||stateTitle(module);if(menuMedia?.matches){document.getElementById('sde-direct-tabs').hidden=true;document.getElementById('sde-menu-toggle')?.setAttribute('aria-expanded','false')}for(const b of document.querySelectorAll('#sde-mobile-nav [data-plus-module]')){if(b.dataset.plusModule===module)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
 function calendar(event){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date))return feedback('La date de cette rencontre est indisponible.',true);
  const escape=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const date=event.date.replace(/-/g,''),timed=/^\d{2}:\d{2}$/.test(event.heure||'');
  const dt=timed?'DTSTART:'+date+'T'+event.heure.replace(':','')+'00Z':'DTSTART;VALUE=DATE:'+date;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SDE//Portail//FR','BEGIN:VEVENT','UID:'+escape(event.id)+'@mouvement-sde.org','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),dt,'SUMMARY:'+escape(event.titre),'LOCATION:'+escape(event.lieu),'BEGIN:VALARM','TRIGGER:-P'+(summary?.preferences?.delai||1)+'D','ACTION:DISPLAY','DESCRIPTION:Rappel SDE','END:VALARM','END:VEVENT','END:VCALENDAR'];
  const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rencontre-sde.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Ouvrez le fichier dans votre calendrier pour enregistrer la rencontre et son rappel.');
 }
 function pictogram(name){
  const paths={card:'M3 5h18v14H3zM7 9h3v3H7zM14 9h4M14 13h4M7 16h11',calendar:'M5 5h14v16H5zM8 2v6M16 2v6M5 10h14M8 14h2M14 14h2',prayer:'m7 3-3 7 8 11 8-11-3-7M12 4v12M7 10l5 6 5-6',book:'M12 5C8 2 5 3 2 4v16c3-2 6-2 10 0 4-2 7-2 10 0V4c-3-1-6-2-10 1v15',service:'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',gift:'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C2 8 6 0 12 8c6-8 10 0 0 0',qr:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z'};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.card);svg.append(path);return svg;
 }
 function personalTab(tab){
  portal.selectionner('espace');
  const select=()=>{const id=tab==='carte'?'sde-personal-card':'sde-personal-presences';const target=document.getElementById(id);if(!target)return false;target.focus({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'auto'});return true};
  if(select())return;
  const main=document.getElementById('main');if(!main)return;
  const observer=new MutationObserver(()=>{if(new URL(location.href).searchParams.get('module')!=='espace'){observer.disconnect();return}if(select())observer.disconnect()});
  observer.observe(main,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),2500);
 }
 function renderMemberWelcome(data){
  const welcome=node('section',undefined,'member-welcome');
  const hello=node('div',undefined,'member-greeting');hello.append(node('p','Bienvenue dans votre espace','dashboard-eyebrow'),node('h2',data.nom||portal.compte.nom||'Mon parcours SDE'),note('Grandir dans la foi. Marcher ensemble. Servir les nations.'));
  const initials=String(data.nom||portal.compte.nom||'SDE').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();hello.prepend(node('span',initials,'member-avatar'));welcome.append(hello);
  const card=button('',()=>portal.selectionner('carteqr'));card.dataset.plusModule='carteqr';card.className='member-card-preview';card.setAttribute('aria-label','Afficher ma carte de membre et mon QR Code officiel');
  const brand=node('span',undefined,'member-card-brand'),logo=document.createElement('img');logo.src='/vitrine/logo-96.png';logo.alt='';logo.width=34;logo.height=34;brand.append(logo,node('span','MOUVEMENT S.D.E.'));
  const identity=node('span',undefined,'member-card-identity');identity.append(node('strong',data.nom||portal.compte.nom||'Mon profil'),node('span',data.matricule||portal.compte.matricule||'Retrouver mon matricule'));
  const qr=node('span',undefined,'member-card-qr');qr.append(pictogram('qr'),node('span','Afficher mon QR Code'));
  card.append(brand,identity,qr,node('small','Ma carte de membre · Ouvrir →'));welcome.append(card);panel.append(welcome);
  const tiles=node('nav',undefined,'member-quick-grid');tiles.setAttribute('aria-label','Les essentiels de mon espace');
  for(const [label,module,icon,tab]of [['Ma Carte','carteqr','card'],['Mes Présences','espace','calendar','presences'],['Intercessions','mur','prayer'],['Bibliothèque','bibliotheque','book'],['Mes Engagements','engagements','service'],['Dons & Dîmes','contributions','gift']]){
   const b=tab?button('',()=>personalTab(tab)):route('',module);b.dataset.plusModule=module;b.className='member-quick-tile';b.append(pictogram(icon),node('span',label));tiles.append(b);
  }
  panel.append(tiles);
 }
 function ratio(done,total,label){
  const block=node('div',undefined,'dashboard-progress');
  const valid=Number(total)>0;const caption=valid?Number(done||0)+' / '+Number(total)+' '+label:'Aucune donnée de progression';block.append(note(caption));
  if(valid){const p=node('progress');p.max=Number(total);p.value=Math.max(0,Math.min(Number(done)||0,p.max));p.setAttribute('aria-label',caption);block.append(p)}
  return block;
 }
 function renderCommand(data,dashboard){
  heading('Le mouvement en un regard');
  const refresh=button('Actualiser les indicateurs',()=>open('synthese'));refresh.dataset.dashboardRefresh='';
  const updated=dashboard.actualiseLe?new Date(dashboard.actualiseLe).toLocaleString('fr-CI',{timeZone:'Africa/Abidjan'}):'à l’ouverture';
  panel.append(note('Votre poste de commandement · Actualisé '+updated),refresh);
  const kpis=node('div',undefined,'command-kpis'),k=dashboard.indicateurs||{};
  const entries=[['Membres actifs',k.membresActifs,'membres','Fiches non archivées'],['Taux de présence',k.presence?.taux===null?null:k.presence?.taux===undefined?undefined:k.presence.taux+' %','agenda','7 derniers événements pointés · actifs concernés, retards inclus, excuses exclues'],['Missions en cours',dashboard.missions?.actifs,'projets','Projets en préparation, en cours ou suspendus'],['Intercessions en cours',k.intercessions,'chambre','Requêtes non confidentielles']];
  for(const [title,value,module,detail]of entries){const c=route('',module);c.className='command-kpi';c.append(node('span',title),node('strong',value===undefined||value===null?'—':String(value)),node('small',detail));kpis.append(c)}
  panel.append(kpis);
  const overview=node('div',undefined,'command-overview'),chart=box('Fréquentation');chart.classList.add('command-chart');chart.append(note('Personnes présentes et en retard aux sept derniers événements pointés.'));
  const points=Array.isArray(dashboard.frequentation)?dashboard.frequentation:[];
  if(!points.length)chart.append(node('p','Aucun pointage exploitable pour le moment.','dashboard-empty'));
  else{
   const bars=node('ul',undefined,'command-bars'),max=Math.max(1,...points.map(x=>Number(x.presents||0)+Number(x.retards||0)));
   const detail=node('p','Sélectionnez une barre pour consulter le détail du pointage.','command-chart-detail');detail.setAttribute('role','status');
   for(const p of points){const n=Number(p.presents||0)+Number(p.retards||0),li=node('li');const value=node('strong',String(n));const track=node('span',undefined,'command-bar-track'),bar=node('span',undefined,'command-bar');bar.style.height=Math.max(0,Math.min(100,n/max*100))+'%';track.append(bar);const date=node('time',String(p.date).slice(8,10)+'/'+String(p.date).slice(5,7));date.dateTime=p.date;
    const label=p.date+' · '+p.titre+' : '+n+' présences, dont '+Number(p.retards||0)+' retards · '+Number(p.absents||0)+' absences marquées · '+Number(p.excuses||0)+' excuses';
    const choose=button('',()=>{for(const b of bars.querySelectorAll('button'))b.setAttribute('aria-pressed','false');choose.setAttribute('aria-pressed','true');detail.textContent=label},'command-bar-button');choose.setAttribute('aria-label',label);choose.setAttribute('aria-pressed','false');choose.append(value,track,date);li.append(choose);bars.append(li)}
   chart.append(detail);
   chart.append(bars);
  }
  chart.append(route('Ouvrir les pointages','agenda'));overview.append(chart);
  const academy=box('Soldiers Academy');academy.classList.add('command-academy');
  const a=dashboard.academie||{};academy.append(note(a.inscriptions===undefined?'Les indicateurs de formation apparaîtront avec les premières données.':a.inscriptions+' inscription(s) · '+a.certifies+' parcours certifié(s)'),ratio(a.modulesSuivis,a.modulesAttendus,'modules suivis'),route('Voir les formations','academie'));overview.append(academy);
  const missions=box('Missions et projets');missions.classList.add('command-missions');const m=dashboard.missions||{};
  missions.append(note(m.actifs===undefined?'Retrouvez les projets et leurs étapes.':m.actifs+' projet(s) actif(s) · '+m.termines+' terminé(s)'),ratio(m.tachesFaites,m.tachesTotal,'tâches terminées'),route('Suivre les missions','projets'));overview.append(missions);panel.append(overview);
  const follow=node('div',undefined,'sde-plus-grid');
  const urgent=box('Demandes urgentes');urgent.append(note(Number(dashboard.urgencesTotal||0)+' requête(s) non confidentielle(s) en attente d’intercession.'));
  urgent.append(list(dashboard.urgences||[],'Aucune requête urgente en cours.',(li,r)=>li.append(node('strong','Requête urgente'),note(r.date||'Date non renseignée'))),route('Ouvrir les demandes','chambre'));follow.append(urgent);
  const activity=box('Dernières mises à jour');activity.append(note('Métadonnées des dossiers enregistrés. Actualisez pour obtenir les dernières activités.'));
  const names={membres:'Fiche membre',evenements:'Rencontre et pointage',projets:'Projet ou mission',formations:'Formation',annonces:'Annonce'};
  activity.append(list(dashboard.activites||[],'Aucune mise à jour enregistrée.',(li,r)=>li.append(node('strong',names[r.rubrique]||'Dossier'),note(new Date(r.cree).toLocaleString('fr-CI',{timeZone:'Africa/Abidjan'})))));follow.append(activity);panel.append(follow);

 }
 function renderNextEvent(events){
  const now=Date.now(),today=new Date(now).toISOString().slice(0,10);
  const upcoming=(events||[]).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date)).map(e=>({...e,start:/^([01]\d|2[0-3]):[0-5]\d$/.test(e.heure||'')?Date.parse(e.date+'T'+e.heure+':00Z'):null})).filter(e=>e.start===null?e.date>=today:e.start>now).sort((a,b)=>(a.date+(a.heure||'')).localeCompare(b.date+(b.heure||'')));
  const e=upcoming[0];if(!e)return;
  const next=box('Mon prochain rendez-vous');next.classList.add('member-next-event');next.append(node('strong',e.titre),note([e.date,e.heure,e.lieu].filter(Boolean).join(' · ')));
  if(e.start!==null){const timer=node('p','','member-countdown');timer.setAttribute('aria-label','Temps restant avant la rencontre');next.append(timer);
   const update=()=>{const seconds=Math.max(0,Math.floor((e.start-Date.now())/1000));timer.textContent=seconds?Math.floor(seconds/86400)+' j · '+String(Math.floor(seconds/3600)%24).padStart(2,'0')+' h · '+String(Math.floor(seconds/60)%60).padStart(2,'0')+' min · '+String(seconds%60).padStart(2,'0')+' s':'La rencontre a commencé. Consultez l’agenda.';if(!seconds){clearInterval(countdownTimer);countdownTimer=null}};
   countdownTimer=setInterval(update,1000);update();
  }
  next.append(route('Voir mon agenda','rendezvous'),button('Ajouter au calendrier',()=>calendar(e)));panel.append(next);
 }
 function renderEngagements(data){
  heading('Mes engagements');const e=data.engagements||{};
  panel.append(note('Vos informations de service et vos tâches attribuées par les responsables.'));
  const profile=box('Mon service');profile.append(list([e.pole&&'Pôle : '+e.pole,e.fonction&&'Fonction : '+e.fonction,e.garnison&&'Garnison : '+e.garnison].filter(Boolean),'Aucun service renseigné sur votre fiche.',(li,t)=>li.append(node('strong',t))));panel.append(profile);
  const tasks=box('Mes tâches à suivre');tasks.append(list(data.taches||[],'Aucune tâche en attente attribuée à votre fiche.',(li,t)=>li.append(node('strong',t.titre),note(t.date?'Échéance : '+t.date:'Sans échéance renseignée'))));panel.append(tasks,note('Contactez votre responsable pour rejoindre un pôle ou mettre à jour un engagement.'),route('Retour à mon accueil','synthese'));
 }
 function renderContributions(data){
  heading('Dons & Dîmes');panel.append(note('Retrouvez les cotisations enregistrées sur votre fiche. Pour un don ou une dîme, contactez le trésorier afin de connaître le canal officiel.'));
  const money=(n,c)=>{try{return new Intl.NumberFormat('fr-CI',{style:'currency',currency:c}).format(Number(n)||0)}catch{return String(n)+' '+c}};
  const totals=box('Mes versements enregistrés');const amounts=Object.entries(data.totaux||{XOF:data.totalPaye||0});for(const [currency,value]of amounts)totals.append(node('strong',money(value,currency)));if(!amounts.length)totals.append(note('Aucun versement enregistré.'));panel.append(totals);
  const ledger=box('Historique de mes cotisations');ledger.append(list(data.cotisations||[],'Aucune cotisation enregistrée sur votre fiche.',(li,c)=>li.append(node('strong',c.mois+' · '+money(c.montant,c.devise||'XOF')),note([c.statut==='paye'?'Enregistrée comme payée':'En attente',c.date].filter(Boolean).join(' · ')))));panel.append(ledger,note('Un versement manquant ou incorrect ? Demandez une vérification à la trésorerie.'),route('Retour à mon accueil','synthese'));
 }
 function renderHome(data,dashboard){
  const direction=location.pathname==='/administration';
  panel.classList.add('maquette-dashboard');document.body.dataset.sdeDashboard=direction?'direction':'member';
  if(direction)renderCommand(data,dashboard||{});else {renderMemberWelcome(data);renderNextEvent(data.evenements)}
  if(!data.ficheLiee&&!direction)panel.append(note('Votre compte est actif. Contactez le secrétariat pour le relier à votre fiche membre et retrouver vos informations personnelles.'));
  const grid=node('div',undefined,'sde-plus-grid');
  const events=box('Prochaines rencontres');events.classList.add('dashboard-agenda');events.append(list(data.evenements||[],'Aucune rencontre annoncée pour le moment.',(li,e)=>{li.append(node('strong',e.titre),note([e.date,e.heure,e.lieu].filter(Boolean).join(' · ')));const actions=node('div',undefined,'sde-plus-actions');actions.append(route('Voir l’agenda','agenda'),button('Ajouter au calendrier',()=>calendar(e)));li.append(actions)}));grid.append(events);
  if(!direction){const formations=box('Soldiers Academy');formations.classList.add('member-academy');formations.append(list(data.formations||[],'Aucune formation liée à votre fiche. Découvrez Soldiers Academy.',(li,f)=>{li.append(node('strong',f.titre),note(f.statut||'Parcours en cours'),ratio(f.faits,f.total,'modules suivis'));const next=(f.modules||[]).filter(m=>!m.suivi).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))[0];if(next)li.append(note('Prochain module : '+next.titre+(next.date?' · '+next.date:'')))}));formations.append(route('Poursuivre ma formation','academie'));grid.prepend(formations)}
  const annonces=box('La vie du mouvement');annonces.append(list(data.annonces||[],'Aucune annonce publiée.',(li,a)=>li.append(node('strong',a.titre),note(a.texte))));annonces.append(route('Voir les annonces','portevoix'));grid.append(annonces);
  const reminders=box('Mes rappels');reminders.append(list(data.rappels||[],'Aucun rappel selon vos préférences.',(li,r)=>li.append(route(r.titre,r.module),note(r.date))));reminders.append(route('Régler mes rappels','preferences'));grid.append(reminders);
  if(direction){const tools=box('Accès de la direction');for(const [title,module]of [['Membres','membres'],['Pointages','agenda'],['Pôles','garnisons'],['Décisions','secretariat'],...(portal.compte.niveau>=2?[['Finances','finances']]:[])])tools.append(route(title,module));grid.append(tools)}
  panel.append(grid,status());
 }
 async function renderCourse(data,token){
  heading('Lecture et prière');panel.append(note('Parcours proposé pour la semaine du '+data.parcours.semaine+'. Vos cases cochées sont personnelles. Elles ne constituent pas une évaluation de votre foi.'));
  const progress=node('progress');progress.max=7;progress.value=data.parcours.lectures.length;progress.setAttribute('aria-label','Lectures suivies cette semaine');panel.append(progress,note(data.parcours.lectures.length+' lectures suivies sur 7'));
  const grid=node('div',undefined,'sde-plus-reading-grid');
  for(const [i,[ref,title,prayer]]of readings.entries()){
   const c=box(['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i]);c.append(node('strong',ref),note(title),note(prayer));
   for(const [key,label]of [['lectures','J’ai lu ce passage'],['prieres','J’ai pris un temps de prière']]){
    const l=node('label',undefined,'sde-plus-check'),input=document.createElement('input');input.type='checkbox';input.checked=data.parcours[key].includes(i);if(key==='lectures')input.dataset.lecture=String(i);else input.dataset.priere=String(i);l.append(input,document.createTextNode(label));c.append(l);
    input.addEventListener('change',async()=>{
     const boxes=[...grid.querySelectorAll('input')];for(const b of boxes)b.disabled=true;
     const body={semaine:data.parcours.semaine,lectures:[...grid.querySelectorAll('[data-lecture]:checked')].map(b=>Number(b.dataset.lecture)),prieres:[...grid.querySelectorAll('[data-priere]:checked')].map(b=>Number(b.dataset.priere))};
     try{const result=await api('/api/mon-parcours-spirituel','PATCH',body);data.parcours=result.parcours;summary=null;if(current==='parcours'&&serial===token){progress.value=result.parcours.lectures.length;feedback('Votre progression personnelle est enregistrée.')}}catch(e){input.checked=!input.checked;if(current==='parcours'&&serial===token)feedback(e.message,true)}finally{for(const b of boxes)b.disabled=false}
    });
   }
   grid.append(c);
  }
  panel.append(grid,status());
  const testimony=box('Partager un témoignage');testimony.append(note('Le texte et votre nom seront transmis aux responsables habilités. La publication dans les annonces nécessite leur validation. Évitez d’y inclure des informations privées concernant d’autres personnes.'));
  const form=node('form',undefined,'sde-plus-form');form.id='sde-plus-testimony';const label=node('label','Mon témoignage');const textarea=node('textarea');textarea.name='texte';textarea.required=true;textarea.maxLength=2000;textarea.rows=4;label.append(textarea);const consent=node('label',undefined,'sde-plus-check'),check=node('input');check.type='checkbox';check.name='consentement';check.required=true;consent.append(check,document.createTextNode('J’autorise la publication de ce texte et de mon nom après validation.'));const send=node('button','Soumettre mon témoignage','sde-plus-button');send.type='submit';form.append(label,consent,send);testimony.append(form);
  const previous=node('div');testimony.append(previous);panel.append(testimony);
  const showPrevious=async()=>{const result=await api('/api/temoignages-personnels');if(serial!==token)return;previous.replaceChildren(list(result.temoignages||[],'Aucun témoignage soumis.',(li,t)=>li.append(node('strong',t.statut==='publie'?'Publié':t.statut==='refuse'?'Non retenu':'En attente de validation'),note(t.texte))))};
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;send.disabled=true;try{await api('/api/temoignages-personnels','POST',{texte:textarea.value,consentement:check.checked});form.reset();feedback('Votre témoignage a été transmis pour validation.');await showPrevious()}catch(err){feedback(err.message,true)}finally{send.disabled=false}});
  try{await showPrevious()}catch(e){if(serial===token)previous.append(note(e.message))}
 }
 function renderAcademy(data){
  heading('Mes formations — Soldiers Academy');panel.append(note('Retrouvez vos formations et les modules suivis. La progression est renseignée par les responsables de formation ; les attestations restent soumises à leur validation.'));
  const grid=node('div',undefined,'sde-plus-grid');
  if(!(data.formations||[]).length)panel.append(note('Aucune formation liée à votre fiche. Contactez votre responsable pour connaître les prochaines inscriptions.'));
  for(const f of data.formations||[]){const c=box(f.titre);c.append(note(f.statut||'Inscrit'));if(f.total){const p=node('progress');p.max=f.total;p.value=f.faits;p.setAttribute('aria-label',f.faits+' modules suivis sur '+f.total);c.append(p,note(f.faits+' modules suivis sur '+f.total))}c.append(list(f.modules||[],'Le programme détaillé sera communiqué par votre formateur.',(li,m)=>li.append(node('strong',m.titre),note((m.suivi?'Suivi':'À suivre')+(m.date?' · '+m.date:'')))));grid.append(c)}
  panel.append(grid,route('Mon parcours de lecture et de prière','parcours'));
 }
 function renderPreferences(data){
  heading('Mes rappels');panel.append(note('Choisissez les rappels affichés dans votre accueil. Les choix sont enregistrés dans votre compte et retrouvés sur vos appareils.'));
  const form=node('form',undefined,'sde-plus-form');form.id='sde-plus-preferences';
  for(const [key,title]of [['rencontres','Rencontres, programmes et événements'],['formations','Mes formations'],['cotisations','Mes cotisations'],['taches','Mes tâches de projet'],['lecture','Ma lecture biblique du jour']]){const label=node('label',undefined,'sde-plus-check'),b=node('input');b.type='checkbox';b.name=key;b.checked=data.preferences[key]!==false;label.append(b,document.createTextNode(title));form.append(label)}
  const label=node('label','Me rappeler les échéances dans les prochains'),select=node('select');select.name='delai';for(const n of [1,3,7]){const o=node('option',n+' jour'+(n>1?'s':''));o.value=String(n);o.selected=data.preferences.delai===n;select.append(o)}label.append(select);form.append(label);const save=node('button','Enregistrer mes choix','sde-plus-button');save.type='submit';form.append(save);panel.append(form,status(),note('Pour recevoir ces rappels lorsque le site est fermé, activez « Notifications sur cet appareil » dans les Réglages. Le son et la vibration suivent les réglages de votre téléphone. Vous pouvez aussi ajouter une rencontre au calendrier.'));
  form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;const b={};for(const k of ['rencontres','formations','cotisations','taches','lecture'])b[k]=form.elements[k].checked;b.delai=Number(select.value);try{await api('/api/mes-preferences','PATCH',b);summary=null;if(form.isConnected)feedback('Vos préférences de rappel sont enregistrées. Les notifications utilisent le son système et la vibration autorisés par votre téléphone.')}catch(err){if(form.isConnected)feedback(err.message,true)}finally{save.disabled=false}});
  const privacy=box('Vos données et vos accès');privacy.append(note('Votre lecture et vos préférences appartiennent à votre compte. Vos prières d’intercession sont destinées aux responsables habilités. Pour un accompagnement sensible, choisissez « Leader uniquement » avant l’envoi.'),route('Mon profil et ma carte','espace'));panel.append(privacy);
 }
 async function renderManagement(token){
  heading('Centre de contrôle');panel.append(note('Les outils affichés dépendent de votre rôle. Les modifications de données et de comptes sont consignées sans recopier leur contenu dans le journal.'));
  const grid=node('div',undefined,'sde-plus-grid');const shortcuts=box('Pilotage direct');for(const [label,module]of [['Membres et fiches','membres'],['Pôles et garnisons','garnisons'],['Projets et missions','projets'],['Agenda et présences','agenda'],['Secrétariat et décisions','secretariat'],['Intercession','chambre'],['Soldiers Academy','academie']])shortcuts.append(route(label,module));if(portal.compte.niveau>=2)shortcuts.append(route('Finances et cotisations','finances'));grid.append(shortcuts);panel.append(grid,status());
  const moderation=box('Témoignages à valider');grid.append(moderation);
  const stories=await api('/api/temoignages-validation');if(serial!==token)return;
  moderation.append(list((stories.temoignages||[]).filter(x=>x.statut==='en_attente'),'Aucun témoignage en attente.',(li,t)=>{li.append(node('strong',t.auteur),note(t.texte));for(const [label,statut]of [['Publier dans les annonces','publie'],['Ne pas publier','refuse']])li.append(button(label,async()=>{try{await api('/api/temoignages-validation','PATCH',{id:t.id,statut});if(serial===token){li.remove();feedback('Décision enregistrée.')}}catch(e){feedback(e.message,true)}}))}));
  if(portal.compte.niveau<2)return;
  const [recoveries,audit]=await Promise.all([api('/api/recuperations'),api('/api/journal-administratif')]);if(serial!==token)return;
  const recovery=box('Demandes de récupération');recovery.append(note('Vérifiez l’identité avant de remettre un code. Le bouton « Comptes et accès » ouvre l’outil existant de gestion des comptes ; aucune réinitialisation n’est déclenchée ici.'));
  recovery.append(button('Ouvrir Comptes et accès',()=>{(document.getElementById('btn-compte')||document.getElementById('btn-reglages'))?.click();setTimeout(()=>{const target=document.querySelector('[data-act="comptes"]');if(target)target.click();else feedback('Dans Réglages, choisissez « Comptes et accès ».')},0)}));
  recovery.append(list((recoveries.demandes||[]).filter(r=>r.statut==='en_attente'),'Aucune demande en attente.',(li,r)=>{li.append(node('strong',r.email),note(new Date(r.cree).toLocaleDateString('fr-CI')));li.append(button('Marquer comme traitée',async()=>{try{await api('/api/recuperations','PATCH',{id:r.id,statut:'traitee'});if(serial===token){li.remove();feedback('Demande marquée comme traitée.')}}catch(e){feedback(e.message,true)}}))}));grid.append(recovery);
  const journal=box('Journal administratif');journal.append(note('Dernières actions enregistrées depuis cette mise à jour. Les montants, sujets de prière et notes pastorales sont exclus de ce journal.'));
  journal.append(list(audit.actions||[],'Aucune action enregistrée pour le moment.',(li,a)=>li.append(node('strong',[a.rubrique,a.operation].join(' · ')),note([a.nom||'Responsable',new Date(a.cree).toLocaleString('fr-CI',{timeZone:'Africa/Abidjan'})].join(' · ')))));grid.append(journal);
 }
 async function open(module){
  clearInterval(countdownTimer);countdownTimer=null;const token=++serial;current=module;panel.classList.remove('maquette-dashboard');delete document.body.dataset.sdeDashboard;panel.hidden=false;panel.replaceChildren(node('p','Chargement de votre espace…','sde-plus-loading'));panel.setAttribute('aria-busy','true');
  try{
   let data;if(module==='synthese'){data=await api('/api/portail-resume');let totals=null;if(location.pathname==='/administration'&&portal.compte.niveau>=1)totals=await api('/api/tableau-de-bord');if(serial!==token)return;summary=data;panel.replaceChildren();renderHome(data,totals)}
   else if(module==='engagements'){data=await api('/api/portail-resume');if(serial!==token)return;panel.replaceChildren();renderEngagements(data)}
   else if(module==='contributions'){if(!portal.compte.membreId){panel.replaceChildren();heading('Dons & Dîmes');panel.append(note('Contactez le secrétariat pour relier votre compte à votre fiche membre.'),route('Retour à mon accueil','synthese'))}else{data=await api('/api/mes-cotisations');if(serial!==token)return;panel.replaceChildren();renderContributions(data)}}
   else if(module==='parcours'){data=await api('/api/mon-parcours-spirituel');if(serial!==token)return;panel.replaceChildren();await renderCourse(data,token)}
   else if(module==='academie'){data=await api('/api/portail-resume');if(serial!==token)return;panel.replaceChildren();renderAcademy(data)}
   else if(module==='preferences'){data=await api('/api/mes-preferences');if(serial!==token)return;panel.replaceChildren();renderPreferences(data)}
   else {panel.replaceChildren();await renderManagement(token)}
  }catch(e){if(serial===token){const retry=button('Réessayer',()=>open(module));retry.dataset.plusRetry='';panel.replaceChildren(node('h2','Connexion au service indisponible'),note(e.message),retry);const a=node('a','Me reconnecter');a.href='/connexion?retour='+encodeURIComponent(location.pathname);panel.append(a)}}
  finally{if(serial===token)panel.removeAttribute('aria-busy')}
 }
 function ready(event){
  if(portal)return;portal=event.detail;if(!portal?.compte?.connecte)return;
  const main=document.getElementById('main');panel=node('section',undefined,'sde-plus-panel');panel.id='sde-plus-panel';panel.hidden=true;main.parentElement.insertBefore(panel,main);
  const bar=node('div',undefined,'sde-current-bar');const h=node('p','Mon accueil');h.id='sde-current-module';h.setAttribute('aria-live','polite');bar.append(h,route('Accueil','synthese'));main.parentElement.insertBefore(bar,panel);
  const nav=document.getElementById('sde-direct-tabs'),wrap=node('div',undefined,'sde-plus-search');const label=node('label','Rechercher une rubrique'),input=node('input');input.id='sde-module-search';input.type='search';input.placeholder='Prière, formation, membres…';label.append(input);wrap.append(label);nav.prepend(wrap);
  const fold=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const searchStatus=node('span','','sde-plus-search-status');searchStatus.setAttribute('role','status');wrap.append(searchStatus);
  const filter=()=>{let visible=0;for(const b of nav.querySelectorAll('[data-module]')){b.hidden=!fold(b.textContent+' '+b.dataset.module+(b.dataset.module==='academie'?' formation':'')).includes(fold(input.value.trim()));if(!b.hidden)visible++}searchStatus.textContent=input.value.trim()?(visible?visible+' rubrique(s) trouvée(s)':'Aucune rubrique trouvée.'):''};input.addEventListener('input',filter);document.addEventListener('sde:modules',filter);
  menuMedia=window.matchMedia?.('(max-width:760px)');const toggle=button('Toutes les rubriques',()=>{nav.hidden=!nav.hidden;toggle.setAttribute('aria-expanded',String(!nav.hidden));if(!nav.hidden)input.focus()},'sde-plus-button sde-menu-toggle');toggle.id='sde-menu-toggle';toggle.setAttribute('aria-controls','sde-direct-tabs');toggle.setAttribute('aria-expanded',String(!menuMedia?.matches));bar.append(toggle);if(menuMedia?.matches)nav.hidden=true;menuMedia?.addEventListener('change',()=>{nav.hidden=menuMedia.matches;toggle.setAttribute('aria-expanded',String(!nav.hidden))});
  const mobile=node('nav',undefined,'sde-mobile-nav');mobile.id='sde-mobile-nav';mobile.setAttribute('aria-label','Accès rapides de mon espace');for(const [label,module]of [['Accueil','synthese'],[location.pathname==='/administration'?'Pilotage':'Prière',location.pathname==='/administration'?'gestion':'priere'],['Parcours','parcours'],['Rappels','preferences']])mobile.append(route(label,module));document.body.append(mobile);
  const module=new URL(location.href).searchParams.get('module');if(!module)portal.selectionner('synthese');else if(isCustom(module))portal.selectionner(module);
 }
 document.addEventListener('sde:ready',ready);
 document.addEventListener('sde:open',event=>{const m=event.detail.module;if(portal&&isCustom(m)&&(m!=='gestion'||portal.compte.niveau>=1)){event.preventDefault();void open(m)}});
 document.addEventListener('sde:navigate',event=>{const m=event.detail.module;setActive(m,event.detail.titre);if(!isCustom(m)&&panel){clearInterval(countdownTimer);countdownTimer=null;++serial;current=m;panel.hidden=true;delete document.body.dataset.sdeDashboard}});
 if(window.SDEPortal)ready({detail:window.SDEPortal});
})();
