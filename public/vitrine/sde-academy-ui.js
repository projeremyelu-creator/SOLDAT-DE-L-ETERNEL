/* Soldiers Academy : briques d'interface partagées (onglets accessibles, affichage des ressources). */
(()=>{
"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPES={video:"Vidéo",fichier:"Document",lien:"Lien",note:"Leçon",exercice:"Exercice"};
const FOURNISSEURS=[/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/,/^https:\/\/player\.vimeo\.com\/video\/\d{6,12}(\?h=[a-f0-9]{6,12})?$/];
const urlSure=u=>/^\/m\/[a-z0-9]{20}\/[^\s"'<>]+$/.test(u||"")||/^https:\/\/[^\s"'<>]+$/.test(u||"");
const dateFr=t=>{try{return new Date(t).toLocaleDateString("fr-FR")}catch{return""}};

/* Onglets (WAI-ARIA) : clic, flèches, Début/Fin ; le panneau actif rejoue l'animation d'entrée. */
function tabs(liste,onChange){
  const btns=[...liste.querySelectorAll('[role="tab"]')];
  const panneau=b=>document.getElementById(b.getAttribute("aria-controls"));
  function activer(b,focus){
    if(!b||b.hidden)return;
    for(const x of btns){
      const on=x===b;
      x.setAttribute("aria-selected",on?"true":"false");x.tabIndex=on?0:-1;
      const p=panneau(x);if(p){if(on){p.hidden=false;p.classList.remove("pane");void p.offsetWidth;p.classList.add("pane")}else p.hidden=true}
    }
    if(focus)b.focus();
    if(onChange)onChange(b.id.replace(/^tab-/,""),b);
  }
  liste.addEventListener("click",e=>{const b=e.target.closest('[role="tab"]');if(b&&liste.contains(b))activer(b,false)});
  liste.addEventListener("keydown",e=>{
    const visibles=btns.filter(x=>!x.hidden),i=visibles.indexOf(document.activeElement);
    if(i<0)return;
    let n=null;
    if(e.key==="ArrowRight")n=visibles[(i+1)%visibles.length];
    else if(e.key==="ArrowLeft")n=visibles[(i-1+visibles.length)%visibles.length];
    else if(e.key==="Home")n=visibles[0];else if(e.key==="End")n=visibles[visibles.length-1];
    if(n){e.preventDefault();activer(n,true)}
  });
  return {activer:id=>activer(btns.find(x=>x.id==="tab-"+id),false)};
}

/* Une ressource pédagogique. Tout texte passe par esc() ; les adresses sont revérifiées côté navigateur. */
function ressourceHtml(r,i=0,{apercu=false,progression=null}={}){
  const type=TYPES[r.type]?r.type:"lien";
  let corps="";
  if(type==="video"){
    if(FOURNISSEURS.some(re=>re.test(r.url||"")))corps='<div class="video"><iframe src="'+esc(r.url)+'" title="'+esc(r.titre)+'" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
    else if(/^\/m\/[a-z0-9]{20}\//.test(r.url||"")){
      corps=r.genre==="audio"?'<audio controls preload="none" src="'+esc(r.url)+'"></audio>':'<video controls preload="metadata" playsinline src="'+esc(r.url)+'"></video>';
    }
  }else if(type==="fichier"||type==="lien"){
    if(urlSure(r.url)){
      const interne=r.url.startsWith("/m/");
      corps='<p><a class="button" href="'+esc(r.url+(interne?"?telecharger":""))+'"'+(interne?' download':' target="_blank" rel="noopener noreferrer"')+'>'+(type==="fichier"?"Télécharger le document":"Ouvrir le lien")+' →</a></p>';
    }
  }else{
    corps='<details class="lecon"><summary>Lire '+(type==="exercice"?"l’exercice":"la leçon")+'</summary><div class="corps"><div class="note-texte">'+esc(r.texte)+'</div></div></details>';
  }
  const fait=!!(progression&&progression.faites&&progression.faites.has(r.id));
  const suivi=progression?'<p class="progres-ligne"><button type="button" class="progres'+(fait?' fait':'')+'" data-progres="'+esc(r.id)+'" aria-pressed="'+(fait?"true":"false")+'"><span class="progres-case" aria-hidden="true">'+(fait?"✓":"")+'</span><span class="progres-texte">'+(fait?"Terminé":"Marquer comme terminé")+'</span></button></p>':"";
  return '<article class="ressource'+(fait?' terminee':'')+'" style="--i:'+i+'"><span class="chip type-'+type+'">'+TYPES[type]+'</span>'+(apercu&&r.publie===false?' <span class="chip brouillon">Brouillon</span>':"")+'<h4>'+esc(r.titre)+'</h4>'+(r.description?'<p>'+esc(r.description)+'</p>':"")+corps+suivi+'<div class="meta">Ajouté le '+esc(dateFr(r.cree))+' par '+esc(r.auteur||"l’équipe pédagogique")+'</div></article>';
}
window.SDEAcademyUI={esc,tabs,ressourceHtml,urlSure,dateFr,TYPES};
})();
