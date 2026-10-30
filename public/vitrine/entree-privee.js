/* Une transition courte lors de l'entrée ; la destination conserve l'authentification existante. */
document.querySelectorAll('[data-transition]').forEach(link=>link.addEventListener('click',event=>{
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 event.preventDefault();document.body.classList.add('is-transitioning');
 setTimeout(()=>location.assign(link.href),550);
}));
