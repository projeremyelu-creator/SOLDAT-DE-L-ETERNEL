/* Livres et enseignements publiés depuis l'Arsenal administratif. */
(() => {
  "use strict";
  const typeLabel={livre:"Livre",video:"Enseignement vidéo",audio:"Enseignement audio",document:"Document",image:"Image",lien:"Lien"};
  const icon={livre:"📖",video:"🎬",audio:"🎧",document:"📄",image:"🖼️",lien:"🔗"};
  const filterType=type=>type==="document"?"document":type==="video"||type==="audio"?"predication":"enseignement";
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el};
  async function init(){
    const grid=document.getElementById("ressources-grille"),count=document.getElementById("res-compteur");
    if(!grid||!count)return;
    try{
      const response=await fetch("/api/ressources-publiques",{credentials:"omit",cache:"no-store"});
      const result=await response.json();if(!response.ok||!Array.isArray(result.ressources)||!result.ressources.length)return;
      grid.replaceChildren();
      for(const resource of result.ressources){
        const card=node("article",undefined,"ressource-carte revele");card.dataset.type=filterType(resource.type);
        const type=node("div",undefined,"res-type"),ico=node("span",icon[resource.type]||"📚","res-icone");ico.setAttribute("aria-hidden","true");type.append(ico,document.createTextNode(typeLabel[resource.type]||"Ressource"));
        card.append(type,node("h3",resource.titre));
        if(resource.auteur)card.append(node("p",resource.auteur,"res-auteur"));
        if(resource.description)card.append(node("p",resource.description,"res-description"));
        const meta=node("p",undefined,"res-meta");for(const value of [resource.theme,resource.annee].filter(Boolean))meta.append(node("span",value));card.append(meta);
        const actions=node("div",undefined,"res-actions");
        if(resource.telechargement){const a=node("a","Télécharger","res-download");a.href=resource.telechargement;a.setAttribute("download","");actions.append(a)}
        if(resource.lien){const a=node("a","Ouvrir l’enseignement","res-open");a.href=resource.lien;a.target="_blank";a.rel="noopener";actions.append(a)}
        if(actions.childElementCount)card.append(actions);
        grid.append(card);
      }
      count.textContent=result.ressources.length+" ressource"+(result.ressources.length>1?"s":"")+" disponible"+(result.ressources.length>1?"s":"");
    }catch(_){/* Le catalogue statique reste visible si le réseau est indisponible. */}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
