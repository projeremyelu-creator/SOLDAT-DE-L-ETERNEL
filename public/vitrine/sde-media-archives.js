/* Archives médias SDE — affichage conditionnel des ressources publiées.
 * Aucun fichier introuvable, aucune date/identité/stock inventé.
 * Publier les médias binaires aux chemins exacts pour activer les cartes.
 */
(()=>{"use strict";
const root="/vitrine/media/";
const photo=(id,title,alt,description)=>({type:"image",src:root+"archives-2027/"+id+".webp",title,alt,description});
const clip=(id,title,description)=>({type:"video",src:root+"videos-2027/"+id+".mp4",poster:root+"videos-2027/"+id+".jpg",title,description});
const views={
 "/priere":{
  selector:".sde-initiative-lead",title:"Nos rencontres en images",label:"Prière et vie fraternelle",
  intro:"Archives de rencontres de prière et de communion. Les dates et les personnes ne sont pas identifiées ici.",
  items:[
   photo("reunion-priere-01","Temps de prière autour de la table","Plusieurs participants réunis autour d’une table, certains recueillis","Rencontre de prière et d'échange."),
   photo("reunion-priere-02","Recueillement et intercession","Participants en prière, mains jointes ou levées, dans une salle","Moment de recueillement partagé."),
   photo("reunion-fraternelle","Rencontre fraternelle","Participants assis autour d'une table dans une salle","Archive de la vie communautaire.")
  ]
 },
 "/missions-humanitaires":{
  selector:".sde-initiative-lead",title:"La solidarité sur le terrain",label:"Pôle ISH · Impact social et humanitaire",
  intro:"Une archive visuelle d'une remise de produits ; lieu et date de la scène non précisés.",
  items:[photo("action-humanitaire","Remise de produits et de denrées","Trois personnes devant un local et des lots de produits emballés","Action de soutien matériel photographiée.")]
 },
 "/boutique":{
  selector:".merch-section",title:"Les polos et tenues SDE",label:"Identité et tenues officielles",
  intro:"Photographie de tenues portées et propositions graphiques. Les visuels conceptuels ne garantissent ni stock ni prix.",
  items:[
   photo("tenues-sde-portees","Tenues SDE portées","Deux femmes portent des vêtements jaunes avec un emblème SDE","Photographie de tenues aux couleurs du mouvement."),
   photo("polos-sde-vert-blanc","Projet de polos vert militaire et blanc","Maquettes de polos vert militaire et blanc portant un emblème SDE","Maquette illustrative, disponibilité à confirmer."),
   photo("polos-sde-or-blanc","Projet de polos or et blanc","Maquettes de polos jaune or et blanc avec un emblème SDE","Maquette illustrative, disponibilité à confirmer.")
  ]
 },
 "/soldiers-tv":{
  selector:"#a-la-une",title:"Nouvelles vidéos des archives SDE",label:"Soldiers TV · Médiathèque",
  intro:"Ces trois vidéos ont été transmises pour diffusion. Aucun direct, audience ou date d'événement n'est simulé.",
  items:[
   clip("identite-sde-expansion","SDE — Expansion et Conquête Divine","Animation de présentation institutionnelle du mouvement."),
   clip("livre-pouvoir-femme","Le Pouvoir de la Femme — présentation du livre","Animation présentant la couverture d'un livre."),
   clip("archives-rassemblement","Archive d'un rassemblement","Courte vidéo d'une rencontre en intérieur, lieu et date non précisés.")
  ]
 },
 "/":{
  selector:"#digital-universe",title:"SDE en mouvement",label:"Notre identité",
  intro:"Une animation de présentation de la vision du mouvement.",
  items:[clip("identite-sde-expansion","SDE — Expansion et Conquête Divine","Présentation visuelle du mouvement Soldat De l'Éternel.")]
 }
};
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
async function available(src,type){
 try{
  const r=await fetch(src,{method:"HEAD",cache:"no-store",credentials:"same-origin"});
  const contentType=r.headers.get("content-type")||"";
  return r.ok&&contentType.toLowerCase().includes(type==="video"?"video/":"image/");
 }catch{return false;}
}
function card(item){
 const fig=make("figure","sde-archive-card");
 let m;
 if(item.type==="image"){
  const a=make("a","sde-archive-photo-link");a.href=item.src;a.target="_blank";a.rel="noopener noreferrer";
  a.setAttribute("aria-label","Ouvrir l'image en grand : "+item.title);
  m=make("img");m.src=item.src;m.alt=item.alt;m.loading="lazy";m.decoding="async";a.append(m);fig.append(a);
 }else{
  m=make("video");m.controls=true;m.preload="metadata";m.playsInline=true;m.poster=item.poster;
  m.setAttribute("aria-label",item.title);m.src=item.src;fig.append(m);
 }
 const caption=make("figcaption");caption.append(make("strong","",item.title));
 caption.append(make("span","",item.description));
 fig.append(caption);return fig;
}
async function start(){
 const entry=views[location.pathname];if(!entry)return;
 const anchor=document.querySelector(entry.selector);
 if(!anchor||document.querySelector(".sde-archive-gallery"))return;
 const statuses=await Promise.all(entry.items.map(item=>available(item.src,item.type)));
 const items=entry.items.filter((_,i)=>statuses[i]);
 if(!items.length)return;
 const section=make("section","sde-archive-gallery");
 section.setAttribute("aria-label",entry.title);
 const inner=make("div","sde-archive-inner");
 const eyebrow=make("p","sde-archive-eyebrow",entry.label);
 const title=make("h2","",entry.title);
 const intro=make("p","sde-archive-intro",entry.intro);
 const grid=make("div","sde-archive-grid");
 for(const item of items)grid.append(card(item));
 inner.append(eyebrow,title,intro,grid);
 if(location.pathname==="/boutique"){
  inner.append(make("p","sde-archive-note","Pour connaître les modèles réellement disponibles, contactez le secrétariat. Aucune vente n'est effectuée depuis cette galerie."));
 }
 section.append(inner);
 anchor.insertAdjacentElement("afterend",section);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
