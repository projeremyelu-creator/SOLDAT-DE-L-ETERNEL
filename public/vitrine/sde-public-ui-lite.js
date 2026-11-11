/* Contrôles publics sans framework : animation et bandeau TPA. */
(()=>{
  'use strict';
  const storage={
    get(key,fallback){try{return localStorage.getItem(key)??fallback}catch{return fallback}},
    set(key,value){try{localStorage.setItem(key,value)}catch{}}
  };

  function motion(){
    const slot=document.querySelector('[data-sde-motion-slot]');
    if(!slot)return;
    const reduced=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let paused=reduced||storage.get('sde-motion','on')==='paused';
    const button=document.createElement('button');
    button.type='button';
    button.className='sde-motion-button';
    const render=()=>{
      document.body.dataset.motion=paused?'paused':'on';
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',paused?'Activer les animations':'Mettre les animations en pause');
      button.textContent=paused?'▶':'Ⅱ';
    };
    button.addEventListener('click',()=>{paused=!paused;storage.set('sde-motion',paused?'paused':'on');render()});
    slot.replaceChildren(button);render();
  }

  function eventBanner(){
    const host=document.getElementById('sde-event-root');
    if(!host || host.querySelector(".event-bar-inner.upcoming"))return;
    const inner=document.createElement('div');
    inner.className='event-bar-inner upcoming';
    const main=document.createElement('a');
    main.href='/programmes#tpa-2026';
    const dot=document.createElement('span');dot.className='event-live-dot';dot.setAttribute('aria-hidden','true');
    const strong=document.createElement('strong');strong.append('TPA ');const year=document.createElement('span');year.textContent='2026';strong.append(year);
    const date=document.createElement('span');date.className='event-bar-date';date.textContent='Traversée Prophétique Annuelle · Vendredi 18 décembre · 20h00 · Google Meet';
    main.append(dot,strong,date);
    const action=document.createElement('a');action.className='event-bar-action';action.href='/programmes#tpa-2026';action.textContent='Découvrir la TPA ↗';
    inner.append(main,action);host.replaceChildren(inner);
  }

  function start(){motion();eventBanner()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
