/* Centre métier SDE — composants de navigation vers le moteur existant.
 * Toutes les données viennent de l'API Cloudflare autorisée.
 * Pas de stockage local, aucun contenu confidentiel côté visiteur. */
import React,{useEffect,useMemo,useState} from 'react';
import {RefIcon} from './reference-shell.jsx';
const ADMIN=[
 {group:'Gouvernance',module:'pilotage',title:'Poste de commandement',desc:'Indicateurs, pilotage et dernières activités.',icon:'home'},
 {group:'Gouvernance',module:'gestion',title:'Gouvernance & paramètres',desc:'Responsabilités, circuit de décision et configuration.',icon:'settings'},
 {group:'Membres',module:'annuaire',title:'Registre et fiches des membres',desc:'Annuaire, filtres, parcours et dossiers autorisés.',icon:'members'},
 {group:'Membres',module:'adhesions',title:'Demandes d’adhésion',desc:'Suivi et traitement des nouvelles demandes.',icon:'members'},
 {group:'Membres',module:'anniversaires',title:'Anniversaires & vie fraternelle',desc:'Échéances et communications liées aux membres.',icon:'bell'},
 {group:'Membres',module:'scanner',title:'Pointages et QR',desc:'Scanner, enregistrer et vérifier les présences.',icon:'qr'},
 {group:'Formation',module:'academy-direction',title:'Soldiers Academy',desc:'Parcours, modules, validations et certifications.',icon:'academy'},
 {group:'Formation',module:'arsenal',title:'Bibliothèque des enseignements',desc:'Livres, supports, téléchargement et catégories.',icon:'academy'},
 {group:'Missions',module:'suivi-poles',title:'Pilotage des cinq pôles',desc:'Réveil, Humanitaire, Logistique, Médias et Formation.',icon:'mission'},
 {group:'Missions',module:'projets',title:'Projets et missions',desc:'Actions humanitaires, tâches et responsables.',icon:'mission'},
 {group:'Programmes',module:'rendezvous',title:'Agenda et inscriptions',desc:'Calendrier, événements et confirmations.',icon:'mission'},
 {group:'Programmes',module:'agenda',title:'Gestion des rassemblements',desc:'Programmation, convocations et émargements.',icon:'mission'},
 {group:'Communication',module:'portevoix',title:'Communications',desc:'Annonces, notifications et messages officiels.',icon:'communication'},
 {group:'Communication',module:'mediatheque',title:'Médiathèque',desc:'Photos IN FIRE, vidéos et ressources multimédia.',icon:'academy'},
 {group:'Communication',module:'site-public',title:'Publications du site',desc:'Actualiser le site et mettre la TPA en valeur.',icon:'mission',min:2},
 {group:'Finances',module:'finance-direction',title:'Rapports financiers',desc:'Entrées, dépenses et budgets des missions.',icon:'money',min:2},
 {group:'Finances',module:'finances',title:'Caisse et cotisations',desc:'Opérations, registres et contrôles autorisés.',icon:'money',min:2},
 {group:'Intercession',module:'chambre',title:'Prière et accompagnement',desc:'Suivi des intentions selon le rôle de chacun.',icon:'communication'},
 {group:'Gouvernance',module:'secretariat',title:'Secrétariat et décisions',desc:'Dossiers, communications et décisions internes.',icon:'settings'}
];
const MEMBER=[
 {group:'Mon parcours',module:'espace-soldat',title:'Mon tableau de bord',desc:'Mes prochaines étapes et ma carte de membre.',icon:'home'},
 {group:'Mon parcours',module:'espace',title:'Mon profil et mes informations',desc:'Modifier les coordonnées et consulter ma fiche.',icon:'members'},
 {group:'Mon parcours',module:'carteqr',title:'Ma carte QR',desc:'Carte sécurisée à présenter aux responsables.',icon:'qr'},
 {group:'Mon parcours',module:'contributions',title:'Mes cotisations',desc:'Historique individuel et situation enregistrée.',icon:'money'},
 {group:'Formation',module:'academie',title:'Mes formations',desc:'Modules et progression Soldiers Academy.',icon:'academy'},
 {group:'Formation',module:'parcours',title:'Lecture et prière',desc:'Cheminement spirituel hebdomadaire personnel.',icon:'academy'},
 {group:'Formation',module:'bibliotheque',title:'Bibliothèque',desc:'Livres, enseignements et documents à consulter.',icon:'academy'},
 {group:'Vie communautaire',module:'rendezvous',title:'Agenda et inscriptions',desc:'Événements et confirmation de ma participation.',icon:'mission'},
 {group:'Vie communautaire',module:'priere',title:'Mes intentions de prière',desc:'Déposer et retrouver mes demandes personnelles.',icon:'communication'},
 {group:'Vie communautaire',module:'mur',title:'Mur de prière',desc:'Prier ensemble et soutenir la communauté.',icon:'communication'},
 {group:'Vie communautaire',module:'engagements',title:'Mes missions et engagements',desc:'Actions, tâches et responsabilités confiées.',icon:'mission'},
 {group:'Vie communautaire',module:'mediatheque',title:'Médiathèque du mouvement',desc:'Albums, vidéos, audios et témoignages.',icon:'academy'},
 {group:'Vie communautaire',module:'preferences',title:'Notifications et rappels',desc:'Gérer les préférences de notification.',icon:'bell'}
];
const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function useSummary(direction){
 const [state,setState]=useState({data:null,error:'',loading:true}),[refresh,setRefresh]=useState(0);
 useEffect(()=>{const ctl=new AbortController();setState(s=>({...s,loading:true,error:''}));
 fetch(direction?'/api/tableau-de-bord':'/api/portail-resume',{credentials:'same-origin',cache:'no-store',signal:ctl.signal})
 .then(async res=>{const d=await res.json();if(!res.ok)throw Error(d.message||'Service indisponible');return d})
 .then(data=>setState({data,error:'',loading:false}))
 .catch(e=>{if(!ctl.signal.aborted)setState({data:null,error:e.message||'Données indisponibles',loading:false})});
 return()=>ctl.abort()},[direction,refresh]);
 return {...state,reload:()=>setRefresh(v=>v+1)};
}
export function BusinessMosaic({portal,direction}){
 const account=portal.compte||{},source=useSummary(direction);
 const [query,setQuery]=useState(''),[group,setGroup]=useState('Tous');
 const available=useMemo(()=>((direction?ADMIN:MEMBER).filter(r=>(r.min||0)<=(account.niveau||0))),[direction,account.niveau]);
 const groups=['Tous',...new Set(available.map(r=>r.group))];
 const rows=available.filter(r=>(group==='Tous'||r.group===group)&&fold(r.title+' '+r.desc+' '+r.group).includes(fold(query)));
 const data=source.data||{};
 const numbers=direction?[
  ['Membres actifs',data.indicateurs?.membresActifs],
  ['Présence',data.indicateurs?.presence?.taux==null?null:data.indicateurs.presence.taux+' %'],
  ['Missions actives',data.missions?.actifs],
  ['Inscriptions Academy',data.academie?.inscriptions]
 ]:[
  ['Prochains rendez-vous',data.evenements?.length],
  ['Formations suivies',data.formations?.length],
  ['Mes engagements',data.taches?.length],
  ['Rappels',data.rappels?.length]
 ];
 const go=module=>portal.selectionner(module);
 return <div className={'sde-mosaic '+(direction?'sde-mosaic-command':'sde-mosaic-member')}>
  <section className="sde-mosaic-intro" aria-label="Centre opérationnel du Mouvement SDE">
   <div className="sde-mosaic-intro-copy">
    <p className="sde-mosaic-eyebrow">{direction?'POSTE DE COMMANDEMENT':'MON ESPACE SDE'} · SOLDAT DE L’ÉTERNEL</p>
    <h3>{direction?'Tous les modules. Une seule mission.':'Grandir, servir et impacter.'}</h3>
    <p>{direction?'Coordonnez les équipes, gérez les ressources et suivez chaque action depuis un centre unique.':'Retrouvez votre formation, votre parcours, vos rendez-vous et les services de votre communauté.'}</p>
    <div className="sde-mosaic-hero-actions">
     <button type="button" onClick={()=>go(direction?'pilotage':'espace-soldat')}>Ouvrir mon tableau de bord</button>
     <a href={direction?'/administration/os-v31#gouvernance':'/mon-espace/os-v31#integral'}>Explorer SDE OS v3.1 ↗</a>
    </div>
   </div>
   <div className="sde-mosaic-visual" aria-hidden="true"><img src="/vitrine/logo-96.webp" alt="" width="100" height="100"/><strong>S.D.E.</strong><small>RÉVEILLER · RESTAURER · FORMER · ÉQUIPER · ENVOYER</small></div>
  </section>
  <div className="sde-mosaic-overview" role="group" aria-label="Indicateurs de mon espace">
   {numbers.map(([label,value])=><div className="sde-mosaic-stat" key={label}><span>{label}</span><strong>{source.loading?'…':value==null?'—':value}</strong></div>)}
  </div>
  {source.error&&<p role="alert" className="sde-mosaic-error">Les indicateurs sont indisponibles : {source.error}. Les modules restent accessibles. <button type="button" onClick={source.reload}>Réessayer</button></p>}
  <div className="sde-mosaic-explore">
   <div><p className="sde-mosaic-eyebrow">MODULES MÉTIER CONNECTÉS</p><h3>{direction?'Centre de gestion du mouvement':'Mes services et mon parcours'}</h3></div>
   <label>Rechercher une rubrique<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Membres, finances, programmes…" aria-label="Rechercher une rubrique SDE"/></label>
  </div>
  <div className="sde-mosaic-filters" role="group" aria-label="Catégories des modules">{groups.map(g=><button key={g} type="button" onClick={()=>setGroup(g)} aria-pressed={group===g}>{g}</button>)}</div>
  <div className="sde-mosaic-grid">
   {rows.map((r,i)=><button className="sde-mosaic-module" key={r.module} type="button" onClick={()=>go(r.module)} aria-label={'Ouvrir '+r.title}>
     <span className="sde-mosaic-icon"><RefIcon name={r.icon}/></span>
     <span className="sde-mosaic-category">{r.group}</span>
     <strong>{r.title}</strong><span className="sde-mosaic-description">{r.desc}</span>
     <span className="sde-mosaic-arrow" aria-hidden="true">Accéder au module ↗</span>
   </button>)}
  </div>
  {!rows.length&&<p role="status" className="sde-mosaic-empty">Aucun module ne correspond à votre recherche. Essayez un autre mot.</p>}
  <p className="sde-mosaic-footnote">Les données et autorisations sont vérifiées par le serveur. Aucun chiffre fictif et aucune donnée pastorale confidentielle ne sont exposés ici.</p>
 </div>;
}
