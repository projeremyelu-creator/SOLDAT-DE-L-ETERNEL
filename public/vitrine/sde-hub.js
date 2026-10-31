/* SDE — interactions publiques, sans divulgation de profils ni paiement simulé. */
(()=>{'use strict';
 const qs=(s)=>document.querySelector(s);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const status=(el,txt,err=false)=>{if(!el)return;el.textContent=txt;el.dataset.error=String(err);};
 const form=qs('[data-sde-form]');
 if(form)form.addEventListener('submit',async e=>{
  e.preventDefault();const out=form.querySelector('.hub-message'),button=form.querySelector('button[type=submit]');
  const data=Object.fromEntries(new FormData(form).entries());
  data.consentement=!!form.querySelector('[name=consentement]:checked');
  data.montant=data.montant===''?0:Number(data.montant||0);
  status(out,'Envoi sécurisé de votre demande…');
  button.disabled=true;
  try{
   const r=await fetch('/api/sde-demarches',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});
   const v=await r.json();
   if(!r.ok)throw Error(v.message||'Envoi refusé');
   status(out,v.message+' Référence : '+v.reference);
   form.reset();
  }catch(x){status(out,String(x.message||x),true)}
  finally{button.disabled=false}
 });
 const countries=[['Côte d’Ivoire',-5.35,7.54],['Tunisie',9.54,34.0],['Burkina Faso',-1.56,12.23],['Italie',12.56,42.83],['Canada',-106.35,56.13],['États-Unis',-98.58,39.83]];
 const map=qs('#hub-map-svg');
 if(map){
  const toXY=([name,lng,lat])=>[Math.round((lng+180)/360*950+25),Math.round((90-lat)/180*410+26)];
  const parts=countries.map((row,i)=>{const [x,y]=toXY(row);return '<g tabindex="0" role="button" aria-label="'+escape(row[0])+'" data-country="'+escape(row[0])+'" style="cursor:pointer"><circle class="pin" cx="'+x+'" cy="'+y+'" r="10"/><text x="'+(x+13)+'" y="'+(y-10)+'" fill="#f9edc5" font-size="15" stroke="#132c42" stroke-width="2" paint-order="stroke">'+escape(row[0])+'</text></g>';});
  map.innerHTML='<title>Localisation illustrative des six pays SDE</title><desc>Repères approximatifs à l’échelle des pays, sans localisation de responsables ou d’adresses.</desc><rect x="0" y="0" width="1000" height="460" rx="20" fill="#123b55"/><path d="M65 112 L145 65 242 70 292 142 240 220 160 236 115 187 Z M275 245 L342 208 367 318 317 424 284 335 Z M464 98 L581 62 688 73 779 99 891 142 909 201 822 224 737 189 680 247 610 200 552 160 500 182 Z M480 212 L561 204 626 257 573 375 521 346 Z" fill="#316b64" stroke="#77a692" stroke-width="3"/>'+parts.join('');
  const label=qs('#hub-map-label');
  const choose=name=>{if(label)label.textContent=name+' — représentation du pays. Adresse, responsable et prochain rendez-vous : informations à confirmer avant publication.';qs('[name=pays]')&&(qs('[name=pays]').value=name)};
  map.querySelectorAll('[data-country]').forEach(el=>{el.addEventListener('click',()=>choose(el.dataset.country));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(el.dataset.country)}})});
  document.querySelectorAll('[data-country-choice]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-country-choice]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));choose(b.dataset.countryChoice)}));
 }
 const calendar=qs('#hub-calendar');
 if(calendar){
  const date=new Date(),month=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1)),title=qs('#hub-calendar-title');
  let events=[];
  const load=async()=>{
   try{const r=await fetch('/api/public');if(!r.ok)throw Error('');const d=await r.json();events=(d.evenements||[]).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&x.prive!==true)}catch{events=[]}
   if(Date.now()<Date.parse('2026-12-19T00:00:00Z')&&!events.some(e=>e.date==='2026-12-18'&&/TPA|traversée/i.test(e.titre)))events.push({date:'2026-12-18',titre:'TPA 2026',lien:'/programmes#tpa-2026'});
   draw();
  };
  const draw=()=>{
   const y=month.getUTCFullYear(),m=month.getUTCMonth(),days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),offset=(month.getUTCDay()+6)%7;
   title.textContent=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(month);
   let html=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(s=>'<div class="dow">'+s+'</div>').join('');
   for(let i=0;i<offset;i++)html+='<div class="day outside" aria-hidden="true"></div>';
   for(let d=1;d<=days;d++){
    const key=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const items=events.filter(e=>e.date===key);
    html+='<div class="day"><strong>'+d+'</strong>'+items.map(e=>'<span class="event"><a href="'+(e.lien||'/programmes')+'">'+escape(e.titre||'Rencontre')+'</a></span>').join('')+'</div>';
   }calendar.innerHTML=html;
  };
  qs('#hub-calendar-prev')?.addEventListener('click',()=>{month.setUTCMonth(month.getUTCMonth()-1);draw()});
  qs('#hub-calendar-next')?.addEventListener('click',()=>{month.setUTCMonth(month.getUTCMonth()+1);draw()});
  load();
 }
 const search=qs('#hub-search');
 if(search){
  const links=[['Le Mouvement','/mouvement','Vision histoire leadership'],['Soutenir le mouvement','/soutenir','Orange MTN Moov dons projets'],['Transparence','/transparence','Dons budget gouvernance'],['Soldiers Academy','/academy','Formation disciple leader prophétique'],['Enseignements','/enseignements','Livres audio ressources'],['Missions humanitaires','/missions-humanitaires','Social veuves orphelins'],['Prière','/priere','Intercession'],['Communauté','/communaute','Prière et intercession'],['Agenda','/calendrier','TPA rencontres'],['Réseau international','/reseau','Pays ville'],['Gouvernance','/gouvernance','Charte confidentialité signalement'],['Newsletter','/newsletter','Courriel']];
  let docs=[];fetch('/api/ressources-publiques').then(r=>r.ok?r.json():{ressources:[]}).then(d=>{docs=(d.ressources||[]).map(x=>[x.titre,'/enseignements',x.theme+' '+x.description]);render()}).catch(()=>{});
  const results=qs('#hub-search-results');
  const render=()=>{const q=search.value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');const data=[...links,...docs].filter(x=>!q||x.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)).slice(0,35);
    results.innerHTML=data.map(x=>'<article><h3><a href="'+x[1]+'">'+escape(x[0])+'</a></h3><small>'+escape(x[2])+'</small></article>').join('')||'<p>Aucun résultat public. Les données des membres ne sont pas indexées.</p>';
  };search.addEventListener('input',render);render();
 }
 // Afficher seulement les chiffres publiés par le propriétaire.
 if(location.pathname==='/soutenir'){
   fetch('/api/sde-financements').then(r=>r.json()).then(d=>{
     for(const item of d.projets||[]){
       if(!item.donneesVerifiees||!item.objectif)continue;
       const card=document.querySelector('[data-projet="'+item.id+'"]')?.closest('.hub-card');
       if(!card)continue;
       const ratio=Math.min(100,Math.round(item.encaisse/item.objectif*100));
       const number=n=>new Intl.NumberFormat('fr-CI').format(n)+' FCFA';
       const label=card.querySelector('.hub-status');
       if(label)label.textContent='Confirmé : '+number(item.encaisse)+' / '+number(item.objectif);
       const bar=card.querySelector('.hub-progress>span');
       if(bar)bar.style.width=ratio+'%';
     }
   }).catch(()=>{});
   document.querySelectorAll('[data-projet]').forEach(link=>link.addEventListener('click',()=>{
     const list=qs('select[name=projet]');if(list)list.value=link.dataset.projet;
   }));
 }
 const translation={
  en:{'Découvrir et servir ensemble':'Discover and serve together','Soutenir le mouvement':'Support the movement','Réseau SDE':'SDE Network','Gouvernance et confiance':'Governance and trust','Recevoir les nouvelles':'Get updates'},
  it:{'Découvrir et servir ensemble':'Scoprire e servire insieme','Soutenir le mouvement':'Sostieni il movimento','Réseau SDE':'Rete SDE','Gouvernance et confiance':'Governance e fiducia','Recevoir les nouvelles':'Ricevi notizie'}
 };
 const lang=qs('[data-current-lang]');const setLang=x=>{document.documentElement.lang=x;document.querySelectorAll('[data-i18n]').forEach(e=>{if(!e.dataset.fr)e.dataset.fr=e.textContent;e.textContent=translation[x]?.[e.dataset.fr]||e.dataset.fr});document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===x)));try{localStorage.setItem('sde-hub-lang',x)}catch{}};
 document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
 try{setLang(['fr','en','it'].includes(localStorage.getItem('sde-hub-lang'))?localStorage.getItem('sde-hub-lang'):'fr')}catch{setLang('fr')}
 const th=qs('[data-theme-toggle]');th?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;try{localStorage.setItem('sde-hub-theme',next)}catch{};th.setAttribute('aria-label',next==='light'?'Activer le mode sombre':'Activer le mode clair')});
 try{document.documentElement.dataset.theme=localStorage.getItem('sde-hub-theme')==='light'?'light':'dark'}catch{}
})();
