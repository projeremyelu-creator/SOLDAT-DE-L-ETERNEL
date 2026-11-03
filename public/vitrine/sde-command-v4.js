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
  if(level>=2){
   const comptes=el('a','sde-command-v4-accounts','Créer les accès membres');
   comptes.href='/comptes-membres';
   comptes.setAttribute('aria-label','Ouvrir la gestion des fiches et mots de passe provisoires des membres');
   titleRow.append(comptes);
  }
  const shortcuts=el('div','sde-command-v4-grid');
  shortcuts.setAttribute('role','group');shortcuts.setAttribute('aria-label','Ouvrir un module administratif');
  panel.append(titleRow,shortcuts);
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
  function bottomItem(id,label){
   const button=el('button','sde-command-v4-bottom-item',label);
   button.type='button';
   button.dataset.module=id;
   if(id==='plus'){
    button.setAttribute('aria-controls',toggle.id);
    button.addEventListener('click',()=>{
     toggle.click();
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
