/* Filtre du catalogue des 24 cours par niveau (script externe : CSP script-src 'self'). */
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  const f=b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  document.querySelectorAll('.course').forEach(x=>{x.hidden=f!=='all'&&x.dataset.level!==f;});
}));
