/* Synthèse Academy d'un seul membre authentifié.
 * Ne retourne ni dossier d'un autre membre, ni notes pastorales ou financières.
 * Conserve les agrégats historiques pour les écrans existants. */
const titre=(v,max=120)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export function memberAcademySummary(formations,memberId){
 const parcours=[];
 let modulesFaits=0,modulesTotal=0,inscriptions=0,certifie=0;
 if(typeof memberId!=='string'||!memberId)return {formations:0,certifie:0,modulesFaits:0,modulesTotal:0,pourcentage:null,parcours};
 for(const {id,data:d={}} of Array.isArray(formations)?formations:[]){
  if(!d||typeof d!=='object'||!d.participants||typeof d.participants!=='object')continue;
  if(!Object.prototype.hasOwnProperty.call(d.participants,memberId))continue;
  const p=d.participants[memberId];
  if(!p||typeof p!=='object'||['Abandon','Retiré'].includes(p.statut))continue;
  const modules=Array.isArray(d.modules)?d.modules.filter(m=>m&&typeof m==='object'&&m.id):[];
  const suivi=m=>!!(p.suivis&&Object.prototype.hasOwnProperty.call(p.suivis,m.id)&&p.suivis[m.id]);
  const faits=modules.filter(suivi).length;
  inscriptions++;if(p.statut==='Certifié')certifie++;
  modulesTotal+=modules.length;modulesFaits+=faits;
  parcours.push({
   id:titre(id,100),
   titre:titre(d.titre)||'Formation SDE',
   statut:titre(p.statut,60)||'Inscrit',
   modulesFaits:faits,
   modulesTotal:modules.length,
   pourcentage:modules.length?Math.round(100*faits/modules.length):null,
   modules:modules.slice(0,24).map(m=>({
    titre:titre(m.titre||m.nom)||'Module de formation',
    suivi:suivi(m)
   }))
  });
 }
 return {formations:inscriptions,certifie,modulesFaits,modulesTotal,pourcentage:modulesTotal?Math.round(100*modulesFaits/modulesTotal):null,parcours:parcours.slice(0,16)};
}
