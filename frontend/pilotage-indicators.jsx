/* Indicateurs de Pilotage SDE : les valeurs proviennent exclusivement
   de /api/tableau-de-bord. Aucun delta, pourcentage ou historique inventé.
   Les cartes affichent un détail lisible et ouvrent le module autorisé. */
import React,{useEffect,useRef,useState} from 'react';

export const INDICATEURS_PILOTAGE=[
 {id:'membres',titre:'Membres actifs',champ:'membresActifs',icon:'members',module:'annuaire',action:'Consulter l’annuaire',explication:'Membres actuellement actifs dans le registre SDE. Les fiches individuelles restent dans l’espace autorisé.'},
 {id:'adhesions',titre:'Demandes en attente',champ:'demandesAdhesion',icon:'urgent',module:'adhesions',action:'Examiner les demandes',explication:'Demandes d’adhésion en attente de traitement par les responsables habilités.'},
 {id:'poles',titre:'Pôles de mission',champ:'poles',icon:'mission',module:'garnisons',action:'Voir les pôles',explication:'Pôles de mission référencés dans le système de gestion SDE.'},
 {id:'programmes',titre:'Programmes publiés',champ:'programmesPublies',icon:'academy',module:'programmes',action:'Voir les programmes',explication:'Programmes publiés dans l’agenda du Mouvement SDE.'}
];

function Counter({value,Num}){
 const previous=useRef(value),[changed,setChanged]=useState(false);
 useEffect(()=>{
  const old=previous.current;
  previous.current=value;
  if(old===value)return;
  setChanged(true);
  const timer=setTimeout(()=>setChanged(false),950);
  return()=>clearTimeout(timer);
 },[value]);
 return <strong className={'ref-kpi-number'+(changed?' is-updated':'')}><Num value={value}/></strong>;
}
export function PilotageIndicators({indicateurs,Num,RefIcon,onOpen}){
 const [selected,setSelected]=useState(null);
 const items=INDICATEURS_PILOTAGE.map(item=>({
  ...item,value:indicateurs?.[item.champ]??null
 }));
 const active=items.find(item=>item.id===selected);
 return <>
  <div className="ops-kpis ref-kpis-live" role="group" aria-label="Indicateurs en temps réel du poste de commandement">
   {items.map((item,i)=><section key={item.id} className={'ops-card ref-kpi ref-kpi-interactive'+(selected===item.id?' is-selected':'')} style={{'--i':i}}>
    <RefIcon name={item.icon}/>
    <Counter value={item.value} Num={Num}/>
    <h3>{item.titre}</h3>
    {item.id==='adhesions'&&Number(item.value)>0&&<span className="ref-kpi-alert">À suivre</span>}
    <span className="ref-kpi-hint" aria-hidden="true">{selected===item.id?'Masquer':'Détails'} <span>↗</span></span>
    <button type="button" className="ref-kpi-go" aria-controls="ref-kpi-fiche"
     aria-expanded={selected===item.id} aria-label={'Afficher les détails : '+item.titre}
     onClick={()=>setSelected(current=>current===item.id?null:item.id)}/>
   </section>)}
  </div>
  <section id="ref-kpi-fiche" className="ref-kpi-fiche" hidden={!active}
   role="region" aria-label={active?'Détails de l’indicateur '+active.titre:'Détails des indicateurs'}>
   {active&&<>
    <div className="ref-kpi-fiche-heading">
     <div><span className="ref-kpi-fiche-eyebrow">INDICATEUR SDE · DONNÉES DU REGISTRE</span><h3>{active.titre}</h3></div>
     <span className="ref-kpi-fiche-value"><Num value={active.value}/></span>
    </div>
    <p>{active.explication}</p>
    <div className="ref-kpi-fiche-actions">
     <button type="button" className="ref-kpi-fiche-open" onClick={()=>onOpen(active.module)}>{active.action} <span aria-hidden="true">↗</span></button>
     <button type="button" className="ref-kpi-fiche-close" onClick={()=>setSelected(null)}>Fermer</button>
    </div>
   </>}
  </section>
 </>;
}
