/* Organigramme SDE — sélection sans données privées, accessible au clavier. */
(()=> {
  "use strict";
  function initialiser(){
    const organigramme=document.querySelector('#organigramme .organigramme');
    const panneau=document.getElementById('sde-org-detail');
    if(!organigramme||!panneau)return;
    const cartes=[...organigramme.querySelectorAll('[data-org-node]')];
    const choisir=(carte)=>{
      for(const item of cartes)item.setAttribute('aria-pressed',item===carte?'true':'false');
      const titre=carte.querySelector('h4')?.textContent?.trim()||'Organisation';
      const description=carte.querySelector('p')?.textContent?.trim()||'';
      panneau.replaceChildren();
      const label=document.createElement('strong');
      label.textContent=titre+' — ';
      panneau.append(label,document.createTextNode(description));
    };
    for(const carte of cartes){
      const titre=carte.querySelector('h4')?.textContent?.trim()||'Organisation';
      carte.setAttribute('aria-label','Découvrir le rôle : '+titre);
      carte.addEventListener('click',()=>choisir(carte));
      carte.addEventListener('keydown',(event)=>{
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          choisir(carte);
        }
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialiser,{once:true});
  else initialiser();
})();
