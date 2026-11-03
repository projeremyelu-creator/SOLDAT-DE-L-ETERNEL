/* Fiche centrale du programme phare : /vitrine/evenement-phare.json est la seule
   source de vérité (accueil, Programmes, agenda, tableau de bord). Les valeurs
   ci-dessous ne servent que de secours si la fiche est injoignable ou invalide. */
export const PHARE_DEFAUT={
 id:'tpa-2026',
 titre:'Traversée Prophétique Annuelle — TPA 2026',
 titreCourt:'TPA 2026',
 debut:'2026-12-18T20:00:00+00:00',
 dateLibelle:'Vendredi 18 décembre 2026',
 heure:'20h00',
 lieu:'En ligne · Google Meet',
 description:'Un temps de prière, de consécration et de communion pour terminer l’année dans la foi.',
 affiche:'/vitrine/illus/tpa-2026.webp',
 fiche:'/programmes#tpa-2026'
};
const texte=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max;
const cheminLocal=(v,prefixe)=>typeof v==='string'&&v.startsWith(prefixe)&&!v.startsWith('//')&&!v.includes('..')&&v.length<=300;
/* Ne retient que les champs valides : une réponse inattendue n'écrase jamais le secours. */
export function pharePublie(donnees,base=PHARE_DEFAUT){
 if(!donnees||typeof donnees!=='object'||Array.isArray(donnees))return base;
 const r={...base};
 for(const [k,max] of [['titre',200],['titreCourt',60],['dateLibelle',80],['heure',30],['lieu',120],['description',400]])
  if(texte(donnees[k],max))r[k]=donnees[k].trim();
 if(typeof donnees.debut==='string'&&Number.isFinite(Date.parse(donnees.debut)))r.debut=donnees.debut;
 if(cheminLocal(donnees.affiche,'/vitrine/'))r.affiche=donnees.affiche;
 if(cheminLocal(donnees.fiche,'/'))r.fiche=donnees.fiche;
 return r;
}
/* La promotion s'efface à minuit (UTC, heure d'Abidjan) du jour de l'événement. */
export function finPromotion(debut){
 const d=new Date(Date.parse(debut));
 return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1);
}
