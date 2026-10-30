import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {infireState,tpaState} from './event-clock.js';

const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
async function api(path,method='GET',body){
 const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.message||'Le service est momentanément indisponible.');
 return data;
}
function Icon({name}){
 const paths={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',calendar:'M5 5h14v16H5zM8 2v6M16 2v6M5 10h14',members:'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',money:'M12 2v20M17 5H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H5',book:'M12 5C8 2 4 3 2 4v16c3-2 6-2 10 0 4-2 7-2 10 0V4c-3-1-6-2-10 1v15',prayer:'M8 3 5 9v5l7 8 7-8V9l-3-6M12 4v12M8 9l4 7 4-7',more:'M4 6h16M4 12h16M4 18h16',focus:'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',pause:'M8 4v16M16 4v16',play:'m7 4 14 8-14 8Z',lock:'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3'};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.more}/></svg>;
}
function EventBanner(){
 const [state,setState]=useState(()=>({infire:infireState(),tpa:tpaState()}));
 useEffect(()=>{const id=setInterval(()=>setState({infire:infireState(),tpa:tpaState()}),1000);return()=>clearInterval(id)},[]);
 const infire=state.infire;
 const tpa=state.tpa;
 if(infire.phase==='finished'&&tpa.phase!=='hidden'){
  const upcoming=tpa.phase==='upcoming';
  return <div className={'event-bar-inner '+(upcoming?'upcoming':'ongoing')}>
   <a href="/programmes#agenda"><span className="event-live-dot" aria-hidden="true"/><strong>TPA <span>2026</span></strong><span className="event-bar-date">Traversée Prophétique Annuelle · Vendredi 18 décembre · 20h00 · Google Meet</span></a>
   {upcoming&&<div className="event-clock" aria-label="Temps restant avant la Traversée Prophétique Annuelle" aria-live="off">{[['days','j'],['hours','h'],['minutes','min'],['seconds','s']].map(([key,label])=><span key={key}><b>{String(tpa[key]).padStart(2,'0')}</b><small>{label}</small></span>)}</div>}
   <a className="event-bar-action" href="/programmes#agenda">Découvrir la TPA <span aria-hidden="true">↗</span></a>
  </div>;
 }
 const upcoming=infire.phase==='upcoming';
 return <div className={'event-bar-inner '+infire.phase}>
  <a href="/programmes#infire"><span className="event-live-dot" aria-hidden="true"/><strong>IN FIRE <span>2026</span></strong><span className="event-bar-date">{infire.phase==='finished'?'Merci pour ces temps de communion':infire.phase==='ongoing'?'La conférence a commencé · Rejoignez-nous':'31 octobre · 08:30 · Abidjan'}</span></a>
  {upcoming&&<div className="event-clock" aria-label="Temps restant avant IN FIRE" aria-live="off">{[['days','j'],['hours','h'],['minutes','min'],['seconds','s']].map(([key,label])=><span key={key}><b>{String(infire[key]).padStart(2,'0')}</b><small>{label}</small></span>)}</div>}
  <a className="event-bar-action" href={infire.phase==='finished'?'/enseignements':'/programmes#infire'}>{infire.phase==='finished'?'Poursuivre le parcours':'Je participe'} <span aria-hidden="true">↗</span></a>
 </div>;
}
function EventHero(){
 const [state,setState]=useState(()=>infireState());
 useEffect(()=>{const id=setInterval(()=>setState(infireState()),1000);return()=>clearInterval(id)},[]);
 const active=state.phase!=='finished';
 useEffect(()=>{const hero=document.querySelector('.home-hero');hero?.classList.toggle('event-hero-active',active);return()=>hero?.classList.remove('event-hero-active')},[active]);
 if(!active)return <><p className="eyebrow">Mouvement Prophético-Apostolique · Abidjan et les nations</p><h1>Une génération <em>enracinée en Jésus-Christ</em>, prête à servir.</h1><p className="lead">Plus que des membres, des disciples. Nous nous rassemblons autour de Jésus, de la prière, de la formation et du service pour un impact durable.</p><div className="hero-actions"><a className="action gold" href="/contact#rejoindre">Rejoindre le mouvement →</a><a className="action ghost" href="/programmes">Voir les programmes</a></div><a className="subtle-link" href="/mouvement">Découvrir notre vision</a></>;
 return <><h1 className="hero-event-title"><span>IN FIRE ’26 –</span><strong>Le grand réveil</strong></h1><p className="hero-event-date"><time dateTime="2026-10-31T08:30:00Z">31 octobre 2026</time></p>
 {state.phase==='upcoming'?<div className="hero-countdown hero-calendar-countdown" aria-label={`IN FIRE dans ${Math.max(0, Math.ceil((Date.parse('2026-10-31T00:00:00Z') - Date.parse(new Date().toISOString().slice(0,10)+'T00:00:00Z')) / 86400000))} jours`}><b>J</b><span aria-hidden="true">–</span><b>{String(Math.max(0, Math.ceil((Date.parse('2026-10-31T00:00:00Z') - Date.parse(new Date().toISOString().slice(0,10)+'T00:00:00Z')) / 86400000))).padStart(2,'0')}</b></div>:<p className="hero-event-live">La conférence a commencé. Rejoignez-nous.</p>}
 <p className="hero-mission-line">Réveiller · Restaurer · Former · Équiper · Envoyer</p><div className="hero-actions"><a className="action gold" href="/programmes#infire">S’inscrire / Rejoindre</a></div><p className="hero-event-place">Accueil dès 08 h 00 · Entrée libre · Église MADEG · Cocody Deux-Plateaux Agban, Abidjan</p></>;
}
function MotionControl(){
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const [paused,setPaused]=useState(()=>reduced||read('sde-motion','on')==='paused');
 useEffect(()=>{document.body.dataset.motion=paused?'paused':'on';write('sde-motion',paused?'paused':'on')},[paused]);
 return <button className="sde-motion-button" type="button" aria-label={paused?'Activer les animations':'Mettre les animations en pause'} aria-pressed={paused} onClick={()=>setPaused(!paused)}><Icon name={paused?'play':'pause'}/></button>;
}
function FocusControl({allowed=true}){
 const [focus,setFocus]=useState(false);
 const [dark,setDark]=useState(()=>document.documentElement.dataset.theme!=='light');
 useEffect(()=>{document.body.classList.toggle('sde-focus-mode',focus);return()=>document.body.classList.remove('sde-focus-mode')},[focus]);
 useEffect(()=>{if(!allowed)setFocus(false)},[allowed]);
 useEffect(()=>{const key=e=>{if(e.key==='Escape')setFocus(false)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[]);
 if(!allowed&&!focus)return null;
 return <div className="sde-reader-tools" aria-label="Confort de lecture"><button type="button" onClick={()=>{if(!focus)setDark(document.documentElement.dataset.theme!=='light');setFocus(!focus)}} aria-pressed={focus}><Icon name="focus"/>{focus?'Quitter le mode Focus':'Mode Focus'}</button>{focus&&<button type="button" onClick={()=>{const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';write('sde-theme',next?'dark':'light')}}><Icon name="moon"/>{dark?'Lecture claire':'Lecture sombre'}</button>}</div>;
}
function PrayerWall(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[feedback,setFeedback]=useState(''),[mine,setMine]=useState(false);
 const load=async()=>{try{setData(await api('/api/mur-priere'));setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[]);
 const act=async(key,path,method='POST',body={})=>{setBusy(key);setFeedback('');try{await api(path,method,body);await load();return true}catch(e){setFeedback(e.message);return false}finally{setBusy('')}};
 async function submit(e){e.preventDefault();const form=e.currentTarget;const body={sujet:form.elements.sujet.value,anonyme:form.elements.anonyme.checked,consentement:form.elements.consentement.checked,urgent:form.elements.urgent.checked};if(await act('submit','/api/mur-priere','POST',body)){form.reset();setFeedback('Votre sujet est transmis pour validation. Il apparaîtra sur le mur après accord d’un responsable.')}}
 return <div className="wall-content"><div className="wall-heading"><span className="premium-kicker">Communion fraternelle</span><h2>Le mur de prière</h2><p>Portons nos sujets ensemble, dans la foi en Jésus-Christ.</p></div>
 {error&&<div role="alert" className="wall-message">{error} <button onClick={load}>Réessayer</button></div>}
 {data?.notifications?.length>0&&<aside className="wall-notices"><h3>Votre communauté vous accompagne</h3>{data.notifications.map(n=><p key={n.priere}>{n.total} {n.total>1?'membres prient':'membre prie'} avec vous pour l’un de vos sujets.{!n.lu&&<strong> · Nouveau</strong>}</p>)}<button onClick={()=>act('read','/api/mur-priere/notifications/lues')} disabled={!!busy}>Marquer comme lu</button></aside>}
 <nav className="wall-filter" aria-label="Parcourir les prières et témoignages"><button aria-pressed={!mine} onClick={()=>setMine(false)}>Intercessions</button><button aria-pressed={mine} onClick={()=>setMine(true)}>Mes requêtes</button><button onClick={()=>window.SDEPortal?.selectionner('portevoix')}>Témoignages du mouvement</button><button onClick={()=>window.SDEPortal?.selectionner('parcours')}>Partager un témoignage</button></nav><form onSubmit={submit} className="wall-form"><h3>Confier un sujet à la communauté</h3><p>Les sujets sont visibles uniquement par les membres connectés, après validation. Pour un sujet confidentiel réservé au leader, utilisez « Mes prières ».</p>
  <label>Mon sujet<textarea name="sujet" minLength={3} maxLength={600} rows={4} required placeholder="Votre sujet, en quelques mots…"/></label>
  <label className="wall-check"><input type="checkbox" name="urgent"/>Signaler ce sujet comme urgent aux intercesseurs</label><label className="wall-check"><input type="checkbox" name="anonyme" defaultChecked/>Afficher « Anonyme » à la place de mon nom</label>
  <label className="wall-check"><input type="checkbox" name="consentement" required/>J’accepte que ce sujet soit partagé avec les membres après validation. J’évite les informations personnelles d’autres personnes.</label>
  <button type="submit" disabled={!!busy}>{busy==='submit'?'Transmission…':'Soumettre mon sujet'}</button>
 </form><p role="status" aria-live="polite" className="wall-message">{feedback}</p>
 {!data&&!error&&<p role="status">Chargement du mur…</p>}
 {data?.prieres.length===0&&<div className="wall-empty"><Icon name="prayer"/><p>Le mur accueille vos sujets de prière. Les premières publications apparaîtront après validation.</p></div>}
 <div className="wall-grid grid gap-4 md:grid-cols-2">{data?.prieres.filter(p=>!mine||p.mien).map(p=><article className={'wall-card'+(p.urgent?' wall-urgent':'')} key={p.id}><div className="wall-card-meta"><strong>{p.auteur}</strong><time dateTime={new Date(p.cree).toISOString()}>{new Intl.DateTimeFormat('fr-CI',{day:'numeric',month:'long',timeZone:'Africa/Abidjan'}).format(new Date(p.cree))}</time></div><p className="wall-subject">{p.urgent&&<span className="wall-urgent-label">Intercession urgente</span>}{p.sujet}</p>
 {p.statut==='en_attente'?<><span className="wall-pending">En attente de validation</span>{data.moderateur&&<div className="wall-moderate"><button disabled={!!busy} onClick={()=>act(p.id,'/api/mur-priere/'+p.id+'/moderation','POST',{statut:'publie'})}>Valider la publication</button><button disabled={!!busy} onClick={()=>act(p.id,'/api/mur-priere/'+p.id+'/moderation','POST',{statut:'refuse'})}>Ne pas publier</button></div>}</>:<div className="wall-card-actions"><span>{p.total} {p.total>1?'personnes prient':'personne prie'} pour cela</span>{!p.mien&&<button disabled={!!busy||p.jePrie} onClick={()=>act(p.id,'/api/mur-priere/'+p.id+'/prier')}><Icon name="prayer"/>{p.jePrie?'Je prie avec vous':'Je prie pour cela'}</button>}</div>}
 {p.mien&&<button className="wall-withdraw" disabled={!!busy} onClick={()=>act(p.id,'/api/mur-priere/'+p.id,'DELETE')}>Retirer mon sujet du mur</button>}</article>)}</div>
 </div>;
}
function PrivateExperience({portal}){
 const [module,setModule]=useState(()=>new URL(location.href).searchParams.get('module')||'espace');
 const [tools,setTools]=useState(false),[wall,setWall]=useState(false);
 useEffect(()=>{
  const opening=e=>{if(e.detail?.module==='mur'){e.preventDefault();setWall(true)}else setWall(false)};
  const navigate=e=>{setModule(e.detail.module);setTools(false)};
  document.addEventListener('sde:open',opening);document.addEventListener('sde:navigate',navigate);
  if(new URL(location.href).searchParams.get('module')==='mur')portal.selectionner('mur');
  return()=>{document.removeEventListener('sde:open',opening);document.removeEventListener('sde:navigate',navigate)};
 },[portal]);
 useEffect(()=>{document.body.dataset.sdeTools=String(tools);return()=>{delete document.body.dataset.sdeTools}},[tools]);
 const open=name=>{setTools(false);portal.selectionner(name)};
 const direction=location.pathname==='/administration';
 const nav=direction?[
  ['synthese','Accueil','home'],['membres','Membres','members'],['agenda','Agenda','calendar'],
  ...(portal.compte.niveau>=2?[['finances','Finances','money']]:[['projets','Pôles','book']])
 ]:[['synthese','Accueil','home'],['agenda','Agenda','calendar'],['academie','Academy','book'],['mur','Prière','prayer']];
 const shell=document.querySelector('.shell');
 return <><FocusControl allowed={['academie','arsenal','parcours','mediatheque','bibliotheque'].includes(module)}/>
  <nav className="sde-bottom-nav" aria-label="Navigation mobile privée">{nav.map(([key,label,icon])=><button type="button" key={key} aria-label={label} onClick={()=>open(key)} aria-current={module===key&&!tools?'page':undefined}><Icon name={icon}/><span>{label}</span></button>)}<button type="button" aria-label={tools?'Fermer les rubriques':'Plus de rubriques'} aria-current={tools?'page':undefined} aria-expanded={tools} aria-controls="sde-direct-tabs" onClick={()=>setTools(!tools)}><Icon name="more"/><span>{tools?'Fermer':'Plus'}</span></button></nav>
  {shell&&createPortal(<section id="sde-wall-panel" className="sde-wall-panel" hidden={!wall} aria-label="Mur de prière communautaire">{wall&&<PrayerWall/>}</section>,shell)}
 </>;
}
function MediaDock(){
 const [media,setMedia]=useState(null),[open,setOpen]=useState(false);
 const dialog=useRef(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button,video[controls]')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus?.()}},[open]);
 useEffect(()=>{let active=true;fetch('/vitrine/promo-media.json',{credentials:'omit'}).then(r=>r.ok?r.json():null).then(m=>{if(active&&m?.video?.startsWith('/vitrine/'))setMedia(m)}).catch(()=>{});return()=>{active=false}},[]);
 if(!media)return null;
 return <><button className="sde-media-launch" type="button" onClick={()=>setOpen(true)}><Icon name="play"/>Le teaser IN FIRE</button>{open&&<div className="sde-media-modal" role="dialog" aria-modal="true" aria-label="Teaser IN FIRE" onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}><div className="sde-media-box" ref={dialog}><button autoFocus onClick={()=>setOpen(false)} className="sde-media-close">Fermer ×</button><video tabIndex={0} controls playsInline preload="metadata" poster="/vitrine/infire-2026/affiche-officielle.png"><source src={media.video} type="video/mp4"/></video><p>IN FIRE 2026 · 31 octobre · 08 h 30 · Église MADEG, Abidjan</p></div></div>}</>;
}
function App(){
 const [portal,setPortal]=useState(()=>window.SDEPortal||null);
 useEffect(()=>{const ready=e=>setPortal(e.detail);document.addEventListener('sde:ready',ready);return()=>document.removeEventListener('sde:ready',ready)},[]);
 const header=document.querySelector('.site-header-inner');
 const event=document.getElementById('sde-event-root');
 const publicReader=location.pathname==='/academy'||location.pathname==='/enseignements'||document.body.dataset.sdePage==='academy';
 return <>{header&&createPortal(<MotionControl/>,header)}{portal?<PrivateExperience portal={portal}/>:publicReader&&<FocusControl/>}{document.querySelector('.home-hero')&&<MediaDock/>}</>;
}
function start(){const hero=document.querySelector('.home-hero-content');if(hero)createRoot(hero).render(<EventHero/>);const event=document.getElementById('sde-event-root');if(event)createRoot(event).render(<EventBanner/>);const host=document.createElement('div');host.id='sde-experience-root';document.body.append(host);createRoot(host).render(<App/>)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
