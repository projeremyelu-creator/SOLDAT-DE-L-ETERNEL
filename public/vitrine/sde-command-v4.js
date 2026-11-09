/* SDE DIGITAL 4.0 : raccourcis métier du vrai portail de direction.
 * Réutilise le routeur natif et les permissions déjà appliquées par le Worker.
 * Pas de chiffres d'activité simulés ni de récupération de données sensibles. */
(() => {
 'use strict';
 if(location.pathname!=='/administration')return;
 const CATEGORIES={
  cmd:'Commandement',spi:'Spiritualité',mis:'Missions'
 };
 const SHORTCUTS=[
  {id:'membres',label:'Membres SDE',cat:'cmd',num:'01'},
  {id:'scanner',label:'Pointages & QR',cat:'cmd',num:'02'},
  {id:'finances',label:'Finances',cat:'cmd',num:'03',level:2},
  {id:'garnisons',label:'Pôles & missions',cat:'mis',num:'04'},
  {id:'academie',label:'Soldiers Academy',cat:'spi',num:'05'},
  {id:'portevoix',label:'Communications',cat:'cmd',num:'06'},
  {id:'chambre',label:'Intercession',cat:'spi',num:'07'},
  {id:'agenda',label:'Agenda',cat:'cmd',num:'08'}
 ];
 let mounted=false;
 const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const allowed=(record,level)=>level>=1&&(!record.level||level>=record.level);
 function mount(){
  if(mounted)return;
  const portal=window.SDEPortal,level=Number(portal?.compte?.niveau||0);
  const intro=document.querySelector('#sde-direct-top .sde-direct-intro');
  const native=document.querySelector('#nav'),toggle=document.querySelector('#sde-direct-menu-toggle');
  if(!portal?.compte?.connecte||level<1||!intro||!native||!toggle)return;
  mounted=true;
  const panel=el('section','sde-command-v4');
  panel.id='sde-command-v4';panel.setAttribute('aria-labelledby','sde-command-v4-title');
  const titleRow=el('div','sde-command-v4-heading');
  const titles=el('div','sde-command-v4-heading-text');
  const kicker=el('p','sde-command-v4-kicker','POSTE DE COMMANDEMENT · ACTIONS DIRECTES');
  const title=el('h2','sde-command-v4-title','Piloter le mouvement');title.id='sde-command-v4-title';
  titles.append(kicker,title);
  const summary=el('p','sde-command-v4-summary');
  summary.setAttribute('role','status');
  titleRow.append(titles,summary);
  const shortcuts=el('div','sde-command-v4-grid');
  shortcuts.setAttribute('role','group');shortcuts.setAttribute('aria-label','Ouvrir un module administratif');
  const insights=el('section','sde-command-v4-insights');
  insights.setAttribute('aria-label','Indicateurs de direction issus du serveur');
  insights.hidden=true;
  panel.append(titleRow,insights,shortcuts);
  // Pas de chiffres décoratifs : les agrégats sont chargés uniquement pour
  // un compte autorisé, depuis l'API sécurisée du même domaine.
  const chargerIndicateurs=async()=>{
   try{
    const response=await fetch('/api/tableau-de-bord',{
     credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}
    });
    if(!response.ok)return;
    const data=await response.json();
    const i=data?.indicateurs||{};
    const cards=[
     ['Membres actifs',i.membresActifs,'Comptes du registre'],
     ['Taux de présence',i.presence?.taux,'Sur les présences renseignées','%'],
     ['Intentions en prière',i.intercessions,'Requêtes non clôturées'],
     ['Événements enregistrés',data?.total?.evenements,'Agenda du mouvement']
    ];
    // Un zéro de la base est réel ; une valeur manquante n'est jamais inventée.
    if(!cards.every(entry=>Number.isFinite(entry[1])))return;
    insights.replaceChildren();
    for(const [libelle,valeur,detail,suffixe=''] of cards){
      const card=el('article','sde-command-v4-insight');
      card.append(el('span','',libelle),el('strong','',String(valeur)+suffixe),el('small','',detail));
      insights.append(card);
    }
    insights.hidden=false;
   }catch(_){/* Les modules restent utilisables si l'API de métriques est indisponible. */}
  };
  void chargerIndicateurs();
  const introActions=intro.querySelector('.sde-spirit-actions');
  if(introActions)introActions.after(panel);else intro.append(panel);

  const bottom=el('nav','sde-command-v4-bottom');
  bottom.setAttribute('aria-label','Navigation rapide du commandement');
  document.body.append(bottom);
  let lastSignature='';
  const buttons=new Map();
  const targets=()=>{
   const list=[...native.querySelectorAll('button[data-vue]')].filter(b=>!b.disabled).map(b=>b.dataset.vue);
   return SHORTCUTS.filter(s=>allowed(s,level)&&list.includes(s.id));
  };
  function choose(module){
   if(!portal.selectionner||!allowed(SHORTCUTS.find(x=>x.id===module)||{},level))return;
   portal.selectionner(module,{userInitiated:true});
  }
  function updateActive(module){
   for(const button of buttons.values()){
    if(button.dataset.module===module)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
   }
   for(const button of bottom.querySelectorAll('[data-module]')){
    if(button.dataset.module===module)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
   }
  }
  // Les mêmes cinq actions, désormais identifiables par leur icône et leur
  // libellé, sans créer une seconde barre ni contourner les droits serveur.
  const symboles={
   accueil:['M3 10 12 3l9 7','M5 9v12h5v-7h4v7h5V9'],
   membres:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8','M22 21v-2a4 4 0 0 0-3-3.87'],
   agenda:['M4 5h16v16H4z','M4 10h16','M8 3v4','M16 3v4'],
   finances:['M3 6h18v14H3z','M3 10h18','M7 16h4'],
   garnisons:['M3 7h18v14H3z','M9 7V4h6v3','M3 13h18'],
   plus:['M4 4h6v6H4z','M14 4h6v6h-6z','M4 14h6v6H4z','M14 14h6v6h-6z']
  };
  function icone(id){
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
   for(const d of symboles[id]||symboles.plus){
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);svg.append(path);
   }
   return svg;
  }
  function bottomItem(id,label){
   const button=el('button','sde-command-v4-bottom-item');
   button.type='button';button.dataset.module=id;
   button.setAttribute('aria-label',id==='plus'?'Afficher toutes les rubriques':'Ouvrir '+label);
   button.append(icone(id),el('span','sde-command-v4-bottom-label',label));
   if(id==='plus'){
    button.setAttribute('aria-controls',toggle.id);
    button.setAttribute('aria-expanded',toggle.getAttribute('aria-expanded')||'false');
    const update=()=>button.setAttribute('aria-expanded',toggle.getAttribute('aria-expanded')||'false');
    toggle.addEventListener('click',update);
    button.addEventListener('click',()=>{
     toggle.click();
     update();
     if(toggle.getAttribute('aria-expanded')==='true')toggle.scrollIntoView?.({block:'nearest'});
    });
   }else button.addEventListener('click',()=>choose(id));
   return button;
  }
  function render(){
   const available=targets();
   const signature=available.map(s=>s.id).join('|');
   if(signature===lastSignature)return;
   lastSignature=signature;buttons.clear();shortcuts.replaceChildren();
   for(const item of available){
    const button=el('button','sde-command-v4-item');
    button.type='button';button.dataset.module=item.id;button.dataset.category=item.cat;
    button.setAttribute('aria-label','Ouvrir '+item.label);
    const number=el('span','sde-command-v4-number',item.num);
    const label=el('strong','sde-command-v4-label',item.label);
    const category=el('small','sde-command-v4-category',CATEGORIES[item.cat]);
    button.append(number,label,category);
    button.addEventListener('click',()=>choose(item.id));
    shortcuts.append(button);buttons.set(item.id,button);
   }
   summary.textContent=available.length+' accès directs selon votre rôle';
   bottom.replaceChildren();
   const tabs=[['accueil','Accueil'],['membres','Membres'],['agenda','Agenda'],
     [level>=2?'finances':'garnisons',level>=2?'Finances':'Pôles'],['plus','Plus']];
   for(const [id,label] of tabs){
    if(id!=='plus'&&id!=='accueil'&&!available.some(s=>s.id===id))continue;
    bottom.append(bottomItem(id,label));
   }
   updateActive(new URL(location.href).searchParams.get('module')||'accueil');
  }
  document.addEventListener('sde:modules',render);
  document.addEventListener('sde:navigate',event=>updateActive(event.detail?.module||''));
  render();
 }
 document.addEventListener('sde:ready',mount);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();
