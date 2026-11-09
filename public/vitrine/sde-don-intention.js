/* Parcours non transactionnel : l'utilisateur choisit une préférence, puis contacte le secrétariat. */
(()=>{
 'use strict';
 const labels={wave:'Wave',orange:'Orange Money',mtn:'MTN MoMo',moov:'Moov Money',carte:'Carte bancaire'};
 const money=new Intl.NumberFormat('fr-FR');
 function start(){
  const buttons=[...document.querySelectorAll('[data-sde-montant]')];
  const custom=document.getElementById('sde-don-libre');
  const canal=document.getElementById('sde-don-canal');
  const summary=document.getElementById('sde-don-resume');
  const follow=document.getElementById('sde-don-continuer');
  if(buttons.length&&custom&&canal&&summary&&follow){
   let amount=10000;
   const render=()=>{
    const value=Number.isSafeInteger(amount)&&amount>0&&amount<=100000000?amount:null;
    const chosen=labels[canal.value]||'À confirmer';
    summary.textContent=value?'Intention : '+money.format(value)+' FCFA · '+chosen:'Renseignez un montant positif pour préparer votre contribution.';
    const params=new URLSearchParams();
    if(value)params.set('montant',String(value));
    if(labels[canal.value])params.set('canal',canal.value);
    follow.href='/soutenir'+(params.size?'?'+params.toString():'')+'#formulaire';
    follow.textContent=value?'Préparer ma contribution →':'Choisir les modalités de contribution →';
   };
   for(const button of buttons){
    button.addEventListener('click',()=>{
     amount=Number(button.dataset.sdeMontant);
     custom.value='';
     buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
     render();
    });
   }
   custom.addEventListener('input',()=>{
    amount=Number(custom.value);
    buttons.forEach(b=>b.setAttribute('aria-pressed','false'));
    render();
   });
   canal.addEventListener('change',render);render();
  }
  const params=new URLSearchParams(location.search);
  if(location.pathname==='/soutenir'&&params.has('montant')){
   const amount=Number(params.get('montant'));
   const channel=labels[params.get('canal')]||'à confirmer';
   const note=document.querySelector('.hub-note');
   if(note&&Number.isSafeInteger(amount)&&amount>0&&amount<=100000000){
    const el=document.createElement('p');
    el.className='sde-contribution-resume';el.setAttribute('role','status');
    el.textContent='Votre intention : '+money.format(amount)+' FCFA · '+channel+'. Aucun paiement n’a été effectué. Utilisez le formulaire ci-dessous pour demander les coordonnées vérifiées.';
    note.after(el);
   }
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
