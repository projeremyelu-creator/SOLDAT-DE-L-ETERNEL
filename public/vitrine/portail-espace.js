/* Dans le portail unique, l'application historique est affichée comme espace intégré.
   Toutes ses autorisations restent vérifiées par src/worker.js. */
(() => {
 "use strict";
 if (location.hostname !== "mouvement-sde.org") return;
 if (!["/mon-espace/outils","/administration/outils"].includes(location.pathname)) return;
 function ajouter(){
   if(document.getElementById("sde-espace-entete"))return;
   const nav=document.createElement("nav");
   nav.id="sde-espace-entete";
   nav.setAttribute("aria-label","Navigation du portail SDE");
   nav.innerHTML='<a href="/" class="sde-espace-marque">S.D.E. <small>Site officiel</small></a><a href="/mon-espace">Mon espace</a>';
   if(location.pathname.startsWith("/mon-espace"))nav.querySelector('a[href="/mon-espace"]').setAttribute("aria-current","page");
   document.body.insertBefore(nav,document.body.firstChild);
   const update=async()=>{
     try {
       const r=await fetch("/api/moi",{credentials:"same-origin",cache:"no-store"});
       if(!r.ok)return;
       const user=await r.json();
       if(user.niveau>=1){
         const a=document.createElement("a");a.href="/administration";a.textContent="Administration";
         if(location.pathname.startsWith("/administration"))a.setAttribute("aria-current","page");
         nav.append(a);
       }
     }catch(_){}
   };
   update();
 }
 document.addEventListener("click",e=>{
   const a=e.target.closest?.('a[href^="https://app.mouvement-sde.org"]');
   if(!a)return;
   const url=new URL(a.href),route=url.hash==="#finances"?"/administration":"/mon-espace";
   e.preventDefault();location.assign(route);
 },true);
 const css=document.createElement("style");
 css.textContent='#sde-espace-entete{position:sticky;top:0;z-index:9999;display:flex;align-items:center;gap:18px;padding:9px clamp(14px,4vw,46px);min-height:57px;background:#11182a;border-bottom:2px solid #c8a451;color:#f7f4ed;font:700 14px system-ui,sans-serif;box-sizing:border-box}#sde-espace-entete a{text-decoration:none;color:inherit;padding:6px 4px}#sde-espace-entete a[aria-current="page"]{color:#edd089}#sde-espace-entete .sde-espace-marque{margin-right:auto;color:#edd089;letter-spacing:.1em}#sde-espace-entete small{display:block;font-size:9px;letter-spacing:0;color:#d5d9e3}@media(max-width:450px){#sde-espace-entete{gap:8px;font-size:12px}#sde-espace-entete .sde-espace-marque{letter-spacing:0}}';
 document.head.append(css);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ajouter,{once:true});else ajouter();
})();