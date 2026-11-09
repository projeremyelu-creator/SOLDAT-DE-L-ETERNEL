import {finPromotion} from './evenement-phare.js';

/* La fiche publique complète l'agenda interne sans créer d'inscription D1. */
export function agendaVisible(evenements=[],phare,maintenant=Date.now()){
 const internes=Array.isArray(evenements)?evenements.filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')):[];
 if(!phare||!Number.isFinite(Date.parse(phare.debut))||finPromotion(phare.debut)<=maintenant)return internes;
 const nom=String(phare.titreCourt||'').toLocaleLowerCase('fr');
 const dejaPresent=internes.some(e=>e.id===phare.id||(nom&&String(e.titre||'').toLocaleLowerCase('fr').includes(nom)));
 const tous=dejaPresent?internes:[...internes,{
  id:'public-'+phare.id,titre:phare.titre,date:phare.debut.slice(0,10),heure:phare.heure,lieu:phare.lieu,
  source:'programme-public',fiche:phare.fiche
 }];
 return tous.sort((a,b)=>(a.date+' '+(a.heure||'')).localeCompare(b.date+' '+(b.heure||'')));
}
