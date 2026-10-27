/* Accueils, parcours et rappels : même session et même routeur SDE. */
(()=>{
 'use strict';
 const custom=new Set(['synthese','parcours','preferences','gestion']);
 const readings=[['Jean 15.1-8','Demeurer en Christ','Confier sa journée à Jésus.'],['Jean 15.9-17','Marcher dans son amour','Prier pour sa famille et ses relations.'],['Psaume 23','Se laisser conduire','Présenter ses besoins et recevoir la paix.'],['Matthieu 6.5-15','Apprendre à prier','Intercéder pour les membres du mouvement.'],['Éphésiens 6.10-18','Persévérer dans la foi','Prier pour les responsables et les nations.'],['Romains 12.1-8','Servir avec ses dons','Discerner une action concrète de service.'],['Actes 2.42-47','Grandir en communauté','Remercier Dieu et prier pour les rencontres.']];
 let portal=null,panel=null,current='',serial=0,summary=null,menuMedia=null;
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
 function stateTitle(module){const labels={synthese:portal?.compte.niveau>=1&&location.pathname==='/administration'?'Accueil de la direction':'Mon accueil',parcours:'Lecture et prière',preferences:'Mes rappels',gestion:'Centre de contrôle'};return labels[module]||module}
 function setActive(module,title){const titleNode=document.getElementById('sde-current-module');if(titleNode)titleNode.textContent=title||stateTitle(module);if(menuMedia?.matches){document.getElementById('sde-direct-tabs').hidden=true;document.getElementById('sde-menu-toggle')?.setAttribute('aria-expanded','false')}for(const b of document.querySelectorAll('#sde-mobile-nav [data-plus-module]')){if(b.dataset.plusModule===module)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
 function calendar(event){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date))return feedback('La date de cette rencontre est indisponible.',true);
  const escape=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const date=event.date.replace(/-/g,''),timed=/^\d{2}:\d{2}$/.test(event.heure||'');
  const dt=timed?'DTSTART:'+date+'T'+event.heure.replace(':','')+'00Z':'DTSTART;VALUE=DATE:'+date;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SDE//Portail//FR','BEGIN:VEVENT','UID:'+escape(event.id)+'@mouvement-sde.org','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),dt,'SUMMARY:'+escape(event.titre),'LOCATION:'+escape(event.lieu),'BEGIN:VALARM','TRIGGER:-P'+(summary?.preferences?.delai||1)+'D','ACTION:DISPLAY','DESCRIPTION:Rappel SDE','END:VALARM','END:VEVENT','END:VCALENDAR'];
  const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rencontre-sde.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Ouvrez le fichier dans votre calendrier pour enregistrer la rencontre et son rappel.');
 }
 function renderHome(data,totals){
  heading(stateTitle('synthese'));panel.append(note('Shalom '+(data.nom||portal.compte.nom||'')+'. Retrouvez votre prochaine rencontre et votre parcours personnel.'));
  if(!data.ficheLiee)panel.append(note('Votre compte est actif. Contactez le secrétariat pour le relier à votre fiche membre et retrouver vos informations personnelles.'));
  const grid=node('div',undefined,'sde-plus-grid');
  const events=box('Prochaines rencontres');events.append(list(data.evenements||[],'Aucune rencontre annoncée pour le moment.',(li,e)=>{li.append(node('strong',e.titre),note([e.date,e.heure,e.lieu].filter(Boolean).join(' · ')));const actions=node('div',undefined,'sde-plus-actions');actions.append(route('Voir l’agenda','agenda'),button('Ajouter au calendrier',()=>calendar(e)));li.append(actions)}));grid.append(events);
  const formations=box('Ma formation');formations.append(list(data.formations||[],'Aucune formation liée à votre fiche. Découvrez Soldiers Academy.',(li,f)=>{li.append(node('strong',f.titre),note(f.statut||'Parcours en cours'));if(f.total){const p=node('progress');p.max=f.total;p.value=f.faits;p.setAttribute('aria-label',f.faits+' modules suivis sur '+f.total);li.append(p,note(f.faits+' / '+f.total+' modules suivis'))}}));formations.append(route('Ouvrir Soldiers Academy','academie'));grid.append(formations);
  const reminders=box('Mes rappels');reminders.append(list(data.rappels||[],'Aucun rappel selon vos préférences.',(li,r)=>li.append(route(r.titre,r.module),note(r.date))));reminders.append(route('Régler mes rappels','preferences'));grid.append(reminders);
  const annonces=box('Annonces et témoignages');annonces.append(list(data.annonces||[],'Aucune annonce publiée.',(li,a)=>li.append(node('strong',a.titre),note(a.texte))));annonces.append(route('Voir les annonces','portevoix'));grid.append(annonces);
  const spirit=box('Grandir et servir');spirit.append(note('Un temps de lecture, de prière et une action de service chaque jour.'),route('Mon parcours de la semaine','parcours'),route('Bibliothèque et enseignements','arsenal'));grid.append(spirit);
  if(totals){const count=box('Le mouvement en un regard');for(const [k,label]of [['membres','membres'],['evenements','rencontres'],['projets','projets'],['annonces','annonces']])count.append(note(Number(totals[k]||0)+' '+label));count.append(route('Ouvrir le centre de contrôle','gestion'));grid.prepend(count)}
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
  const token=++serial;current=module;panel.hidden=false;panel.replaceChildren(node('p','Chargement de votre espace…','sde-plus-loading'));panel.setAttribute('aria-busy','true');
  try{
   let data;if(module==='synthese'){data=await api('/api/portail-resume');let totals=null;if(location.pathname==='/administration'&&portal.compte.niveau>=1)totals=(await api('/api/tableau-de-bord')).total;if(serial!==token)return;summary=data;panel.replaceChildren();renderHome(data,totals)}
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
 document.addEventListener('sde:navigate',event=>{const m=event.detail.module;setActive(m,event.detail.titre);if(!isCustom(m)&&panel){++serial;current=m;panel.hidden=true}});
 if(window.SDEPortal)ready({detail:window.SDEPortal});
})();
