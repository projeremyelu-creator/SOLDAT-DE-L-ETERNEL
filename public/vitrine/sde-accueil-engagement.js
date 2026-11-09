/* Accueil : vidéo respectueuse des préférences, témoignages déjà publiés et prière rapide. */
(()=>{
 'use strict';
 function start(){
  const video=document.querySelector('#presentation-2026 video');
  if(video){
   const sound=document.getElementById('sde-video-ambience');
   let audio=null,oscillators=[];
   const stopSound=()=>{oscillators.forEach(o=>{try{o.stop()}catch{}});oscillators=[];audio?.close?.();audio=null;if(sound){sound.setAttribute('aria-pressed','false');sound.textContent='Activer une ambiance instrumentale';}};
   sound?.addEventListener('click',async()=>{
    if(audio){stopSound();return;}
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){sound.textContent='Ambiance indisponible sur cet appareil';return;}
    try{
     audio=new Audio();await audio.resume();
     const master=audio.createGain();master.gain.value=.035;master.connect(audio.destination);
     // Accord original joué au synthétiseur : aucun fichier ou service audio externe.
     for(const frequency of [146.83,220,293.66,369.99]){
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=.22;
      oscillator.connect(gain);gain.connect(master);oscillator.start();oscillators.push(oscillator);
     }
     sound.setAttribute('aria-pressed','true');sound.textContent='Couper l’ambiance instrumentale';
     if(video.paused)video.play().catch(()=>{});
    }catch{stopSound();sound.textContent='Ambiance indisponible sur cet appareil';}
   });
   video.addEventListener('pause',()=>{if(audio)audio.suspend().catch(()=>{})});
   video.addEventListener('play',()=>{if(audio)audio.resume().catch(()=>{})});
   document.addEventListener('visibilitychange',()=>{if(document.hidden&&audio)audio.suspend().catch(()=>{})});
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   const saveData=navigator.connection?.saveData;
   if(reduced||saveData){video.removeAttribute('autoplay');video.pause();}
   else if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
     if(!entries[0].isIntersecting)video.pause();
     else if(!document.hidden&&video.muted)video.play().catch(()=>{});
    },{threshold:.35});observer.observe(video);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
   }
  }
  const list=document.getElementById('sde-home-testimonials');
  if(list)fetch('/api/temoignages-publics',{credentials:'omit'}).then(r=>r.ok?r.json():null).then(d=>{
   const items=Array.isArray(d?.temoignages)?d.temoignages.slice(0,3):[];
   if(!items.length)return;
   for(const t of items){
    const article=document.createElement('article'),p=document.createElement('p'),by=document.createElement('small');
    article.className='sde-home-testimonial';p.textContent=String(t.texte||'').slice(0,240);by.textContent=String(t.auteur||'Un membre').slice(0,60);
    article.append(p,by);list.append(article);
   }
   list.hidden=false;
   if(items.length>1){
    const controls=document.createElement('div');controls.className='sde-home-testimonial-controls';
    for(const [label,delta] of [['Témoignage précédent',-1],['Témoignage suivant',1]]){
     const button=document.createElement('button');button.type='button';button.textContent=delta<0?'←':'→';button.setAttribute('aria-label',label);
     button.addEventListener('click',()=>list.scrollBy?.({left:delta*list.clientWidth,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));controls.append(button);
    }
    list.after(controls);
   }
  }).catch(()=>{});
  const dialog=document.getElementById('sde-prayer-dialog'),open=document.getElementById('sde-prayer-open'),close=document.getElementById('sde-prayer-close'),form=document.getElementById('sde-home-prayer');
  if(!dialog||!open||!form)return;
  open.addEventListener('click',()=>dialog.showModal());
  close?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!form.reportValidity())return;
   const button=form.querySelector('[type=submit]'),status=document.getElementById('sde-prayer-feedback');
   button.disabled=true;status.textContent='Envoi en cours…';
   try{
    const response=await fetch('/api/priere-anonyme',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({sujet:form.elements.sujet.value,accord:form.elements.accord.checked,website:form.elements.website.value})});
    const d=await response.json().catch(()=>({}));
    if(!response.ok||!d.ok)throw Error(d.message||'L’envoi a échoué. Réessayez.');
    status.textContent=d.message||'Votre sujet a été transmis.';form.reset();
   }catch(error){status.textContent=error.message||'Connexion indisponible. Réessayez.';}
   finally{button.disabled=false;}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
