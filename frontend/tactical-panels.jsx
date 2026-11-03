/* SDE · Fusion Commandement / Soldiers Academy.
   Toutes les statistiques proviennent exclusivement des APIs déjà autorisées.
   Le radar est une visualisation de taux et ne géolocalise aucun membre. */
import React from 'react';

const count=value=>value==null||value===''||!Number.isFinite(Number(value))?null:Math.max(0,Math.round(Number(value)));
const percent=value=>value==null||!Number.isFinite(Number(value))?null:Math.max(0,Math.min(100,Math.round(Number(value))));
const fmt=value=>{const n=count(value);return n==null?'—':n.toLocaleString('fr-FR')};
const clean=v=>String(v||'').slice(0,140);
function Action({open,target,children}){return <button type="button" className="sde-tactical-action" onClick={()=>open(target)}>{children}<span aria-hidden="true">↗</span></button>}
function Radar({value,label}){
 const p=percent(value),length=2*Math.PI*59;
 return <div className="sde-tactical-radar" role="img" aria-label={label+': '+(p==null?'non renseigné':p+' %')}>
   <svg viewBox="0 0 160 160" aria-hidden="true">
    <circle cx="80" cy="80" r="75" className="sde-tactical-radar-edge"/>
    <circle cx="80" cy="80" r="59" className="sde-tactical-radar-track"/>
    <circle cx="80" cy="80" r="44" className="sde-tactical-radar-grid"/>
    <circle cx="80" cy="80" r="25" className="sde-tactical-radar-grid"/>
    <path d="M80 0v160M0 80h160" className="sde-tactical-radar-cross"/>
    {p!=null&&<circle cx="80" cy="80" r="59" strokeDasharray={length} strokeDashoffset={length*(1-p/100)} className="sde-tactical-radar-progress"/>}
   </svg>
   <div className="sde-tactical-radar-center"><strong>{p==null?'—':p+' %'}</strong><small>{label}</small></div>
  </div>;
}
function StageMark({done,label,symbol}){
 return <li className={'sde-tactical-stage'+(done?' is-done':'')}>
  <span className="sde-tactical-insignia" aria-hidden="true">{symbol}</span><strong>{label}</strong><small>{done?'Étape atteinte':'À poursuivre'}</small>
 </li>;
}
export function TacticalCommandPanel({dashboard,open}){
 const d=dashboard||{},missions=d.missions||{},ac=d.academie||{};
 const events=Array.isArray(d.frequentation)?d.frequentation.slice(-7):[];
 const max=Math.max(1,...events.map(e=>Math.max(0,Number(e.presents)||0)+Math.max(0,Number(e.retards)||0)));
 const todo=count(missions.tachesTotal),done=count(missions.tachesFaites);
 const taskPercent=todo?percent(100*(done||0)/todo):null;
 const last=d.actualiseLe?new Date(d.actualiseLe).toLocaleString('fr-CI',{timeZone:'Africa/Abidjan',dateStyle:'short',timeStyle:'short'}):'Non renseignée';
 return <section className="sde-tactical sde-tactical-command" aria-label="Terminal tactique des missions et présences">
  <header className="sde-tactical-header"><div><span className="sde-tactical-eyebrow">S.D.E. · TERMINAL DE POINTAGE</span><h2>Poste de commandement <em>& missions</em></h2><p>Indicateurs consolidés du mouvement — aucune géolocalisation ni surveillance individuelle.</p></div><small className="sde-tactical-update">Actualisé le {last}</small></header>
  <div className="sde-tactical-command-grid">
   <article className="sde-tactical-screen">
    <div className="sde-tactical-screen-title"><h3>Radar des présences</h3><span>7 rencontres</span></div>
    <Radar value={d.indicateurs?.presence?.taux} label="Taux de présence"/>
    <div className="sde-tactical-pair"><span><b>{fmt(d.indicateurs?.membresActifs)}</b><small>Membres actifs</small></span><span><b>{events.length}</b><small>Rencontres pointées</small></span></div>
    <Action target="scanner" open={open}>Ouvrir le terminal QR</Action>
   </article>
   <article className="sde-tactical-screen sde-tactical-center">
    <div className="sde-tactical-screen-title"><h3>Tableau des opérations</h3><span>Données enregistrées</span></div>
    <div className="sde-tactical-poles"><div className="sde-tactical-poles-map" role="img" aria-label="Trame tactique décorative, sans localisation de personnes"><span className="sde-tactical-poles-label">SDE</span><span className="sde-tactical-grid-marker" aria-hidden="true"/></div>
      <div className="sde-tactical-poles-metrics"><span><b>{fmt(d.indicateurs?.poles)}</b><small>Pôles du mouvement</small></span><span><b>{fmt(missions.actifs)}</b><small>Missions actives</small></span></div>
    </div>
    <div className="sde-tactical-screen-title"><h3>Évolution des pointages</h3><span>{events.length} rencontres</span></div>
    {events.length?<div className="sde-tactical-bars" role="img" aria-label={events.map(e=>clean(e.date)+': '+fmt((Number(e.presents)||0)+(Number(e.retards)||0))+' présents').join(' ; ')}>
      {events.map((e,i)=>{const n=Math.max(0,Number(e.presents)||0)+Math.max(0,Number(e.retards)||0);return <div className="sde-tactical-bar-column" key={clean(e.date)+'-'+i}><small>{n}</small><span className="sde-tactical-bar"><i style={{height:(n/max*100)+'%'}}/></span><small>{clean(e.date).slice(5)}</small></div>})}</div>:
      <p className="sde-tactical-empty">Aucun pointage disponible. Le graphique apparaîtra après une rencontre enregistrée.</p>}
    <Action target="suivi-poles" open={open}>Suivi des pôles</Action>
   </article>
   <article className="sde-tactical-screen">
    <div className="sde-tactical-screen-title"><h3>Statut des missions</h3><span>Registre SDE</span></div>
    <ul className="sde-tactical-operations">
      <li><span>Missions en cours</span><b>{fmt(missions.actifs)}</b></li>
      <li><span>Missions terminées</span><b>{fmt(missions.termines)}</b></li>
      <li><span>Inscriptions Academy</span><b>{fmt(ac.inscriptions)}</b></li>
      <li><span>Intercessions ouvertes</span><b>{fmt(d.indicateurs?.intercessions)}</b></li>
      <li><span>Demandes d’adhésion</span><b>{fmt(d.indicateurs?.demandesAdhesion)}</b></li>
    </ul>
    <div className="sde-tactical-progress-label"><span>Tâches accomplies</span><strong>{taskPercent==null?'Non renseigné':taskPercent+' %'}</strong></div>
    <div className="sde-tactical-progress" role="progressbar" aria-label="Avancement des tâches de mission" aria-valuemin={0} aria-valuemax={100} aria-valuenow={taskPercent??0} aria-valuetext={taskPercent==null?'Aucune tâche enregistrée':taskPercent+' %'}><i style={{width:(taskPercent??0)+'%'}}/></div>
    <Action target="projets" open={open}>Gérer les missions</Action>
   </article>
  </div>
 </section>;
}
export function TacticalAcademyPanel({academy,open}){
 const d=academy||{},p=d.progression||{},total=count(p.modulesAttendus)||0,done=count(p.modulesSuivis)||0;
 const rate=total?percent(100*done/total):null;
 const courses=Array.isArray(d.formations)?d.formations.slice(0,4):[];
 const validations=Array.isArray(d.prets)?d.prets.length:0;
 return <section className="sde-tactical sde-tactical-academy" aria-label="Soldiers Academy : progression et formation">
  <header className="sde-tactical-header"><div><span className="sde-tactical-eyebrow">S.D.E. · SOLDIERS ACADEMY</span><h2>Dossier de formation <em>& progression</em></h2><p>Parcours pédagogiques, modules suivis et validations des responsables habilités.</p></div></header>
  <div className="sde-tactical-academy-grid">
   <article className="sde-tactical-screen"><div className="sde-tactical-screen-title"><h3>Étapes du parcours</h3><span>État collectif</span></div>
     <ol className="sde-tactical-stages"><StageMark label="Inscription" symbol="Ⅰ" done={(count(p.inscriptions)||0)>0}/><StageMark label="Modules suivis" symbol="Ⅱ" done={done>0}/><StageMark label="Parcours complété" symbol="Ⅲ" done={total>0&&done>=total}/><StageMark label="Certification" symbol="★" done={(count(p.certifies)||0)>0}/></ol>
     <p className="sde-tactical-note">Insignes pédagogiques illustratifs, non assimilés à des grades officiels.</p>
   </article>
   <article className="sde-tactical-screen"><div className="sde-tactical-screen-title"><h3>Entraînement et modules</h3><span>{courses.length} formations affichées</span></div>
     <div className="sde-tactical-course-overview"><Radar value={rate} label="Modules suivis"/><div><b>{done} / {total||'—'}</b><small>Modules enregistrés</small><b>{fmt(p.certifies)}</b><small>Parcours certifiés</small></div></div>
     {courses.length?<ul className="sde-tactical-courses">{courses.map(c=><li key={c.id}><strong>{clean(c.titre)||'Formation'}</strong><small>{fmt(c.inscrits)} inscrit(s) · {fmt(c.certifies)} certifié(s)</small></li>)}</ul>:<p className="sde-tactical-empty">Aucune formation disponible dans ce registre.</p>}
     <Action target="academie" open={open}>Ouvrir les modules</Action>
   </article>
   <article className="sde-tactical-screen"><div className="sde-tactical-screen-title"><h3>Validations</h3><span>Responsables</span></div>
     <div className="sde-tactical-validation">{validations}</div><p>Dossiers prêts à être examinés avant certification.</p><p className="sde-tactical-note">La validation n’est pas automatique.</p>
     <Action target="academie" open={open}>Examiner les dossiers</Action><Action target="scanner" open={open}>Pointage QR</Action>
   </article>
  </div>
 </section>;
}
export function TacticalMemberPanel({academy,nom,matricule,qrSrc,open}){
 const d=academy||{},total=count(d.modulesTotal)||0,done=count(d.modulesFaits)||0,pct=total?percent(100*done/total):null;
 const inscriptions=count(d.formations)||0,certified=count(d.certifie)||0;
 return <section className="sde-tactical sde-tactical-member" aria-label="Ma carte et mon parcours Soldiers Academy">
   <header className="sde-tactical-header"><div><span className="sde-tactical-eyebrow">S.D.E. · DOSSIER PERSONNEL</span><h2>Ma carte <em>& mon parcours</em></h2><p>Mes étapes de formation et ma carte sécurisée pour le pointage.</p></div></header>
   <div className="sde-tactical-member-grid">
    <article className="sde-tactical-screen"><div className="sde-tactical-screen-title"><h3>Étapes de formation</h3><span>Mon avancement</span></div>
     <ol className="sde-tactical-stages"><StageMark label="Inscrit" symbol="Ⅰ" done={inscriptions>0}/><StageMark label="En formation" symbol="Ⅱ" done={done>0}/><StageMark label="Modules terminés" symbol="Ⅲ" done={total>0&&done>=total}/><StageMark label="Certifié" symbol="★" done={certified>0}/></ol>
     <Action target="academie" open={open}>Mon parcours Academy</Action>
    </article>
    <article className="sde-tactical-screen sde-tactical-personal-card"><div className="sde-tactical-screen-title"><h3>Carte de membre</h3><span>Usage personnel</span></div>
     <div className="sde-tactical-dogtag"><span>S.D.E. · SOLDAT DE L’ÉTERNEL</span><strong>{clean(nom)||'Membre SDE'}</strong><small>Matricule : {clean(matricule)||'En attente'}</small></div>
     {qrSrc?<img src={qrSrc} className="sde-tactical-member-qr" alt="Code QR sécurisé de présence personnelle" width="136" height="136"/>:<p className="sde-tactical-empty">Carte QR disponible lorsque le compte est relié à une fiche membre active.</p>}
     <p className="sde-tactical-note">Présenter le QR au responsable. Aucun contrôle biométrique n’est effectué.</p>
     <Action target="carteqr" open={open}>Afficher ma carte QR</Action>
    </article>
    <article className="sde-tactical-screen"><div className="sde-tactical-screen-title"><h3>Progression et intercession</h3><span>Mon espace</span></div>
     <Radar value={pct} label="Modules suivis"/><p>{done} module(s) complété(s) sur {total||'—'}.</p>
     <Action target="academie" open={open}>Poursuivre la formation</Action><Action target="mur" open={open}>Mur de prière</Action>
    </article>
   </div>
 </section>;
}
