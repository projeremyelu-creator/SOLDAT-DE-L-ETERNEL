import React,{useEffect,useState} from 'react';
/* Écran « Contenu du site » : l'administration renouvelle elle-même les textes publics
   (coordonnées, programmes, bannière). Les données vont dans la rubrique `site`
   (écriture réservée aux administrateurs) et sont lues par /api/site. */
const IMAGES=[['','Sans image'],['/vitrine/illus/prog-traversee.svg','Traversée'],['/vitrine/illus/prog-infire.svg','IN FIRE'],['/vitrine/illus/prog-academy.svg','Academy'],['/vitrine/illus/prog-holytalk.svg','Holy Talk'],['/vitrine/illus/prog-missions.svg','Missions'],['/vitrine/illus/prog-brunch.svg','Holy Brunch'],['/vitrine/illus/prog-aleph12.svg','ALEPH 12'],['/vitrine/illus/prog-humanitaire.svg','Humanitaire']];
/* Programmes actuellement écrits dans la page : point de départ pour ne rien retaper. */
export const PROGRAMMES_ACTUELS=[
 {titre:'Traversée Prophétique Mensuelle',rythme:'Chaque mois',texte:'Un temps de prière et de consécration pour entrer dans le mois avec Dieu.',libelle:'Participer',lien:'',image:IMAGES[1][0],feu:false},
 {titre:'IN FIRE',rythme:'Chaque année',texte:'La conférence internationale pour le réveil spirituel des nations.',libelle:'Voir l’édition 2026',lien:'#infire',image:IMAGES[2][0],feu:true},
 {titre:'Soldiers Academy',rythme:'Parcours',texte:'Un parcours pour former des disciples solides et des leaders au service du Royaume.',libelle:'Se préinscrire',lien:'/academy',image:IMAGES[3][0],feu:false},
 {titre:'Holy Talk & Holy Day',rythme:'Partage et célébration',texte:'Des espaces d’échange sur la foi et la vie, et des journées de célébration.',libelle:'Participer',lien:'',image:IMAGES[4][0],feu:false},
 {titre:'Missions et actions solidaires',rythme:'Sur le terrain',texte:'Évangélisation, visites et soutien concret aux personnes dans le besoin.',libelle:'S’engager',lien:'',image:IMAGES[5][0],feu:false},
 {titre:'Holy Brunch',rythme:'Communion fraternelle',texte:'Un moment convivial pour se rencontrer, partager un repas et fortifier les liens.',libelle:'Participer',lien:'',image:IMAGES[6][0],feu:false},
 {titre:'ALEPH 12',rythme:'Début d’année',texte:'12 jours de prière et de jeûne : déclarations et orientations prophétiques pour posséder et recommander l’année à Dieu.',libelle:'Participer',lien:'',image:IMAGES[7][0],feu:true},
 {titre:'Missions humanitaires',rythme:'Sur le terrain · Daloa et Cocody',texte:'Dons à l’orphelinat Tomorrow Hope de Daloa et soutien aux femmes veuves à Abidjan Cocody.',libelle:'S’engager',lien:'',image:IMAGES[8][0],feu:false}
];
const lienValide=l=>!l||/^(\/(?!\/)|#|https:\/\/)/.test(l);
const EMAIL=/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const emailsDe=t=>[...new Set(String(t||'').split(/[\s,;]+/).map(a=>a.trim().toLowerCase()).filter(a=>EMAIL.test(a)))].slice(0,10);
export function verifier({contact,programmes,banniere,secretariat}){
 const erreurs=[];
 if(contact.email&&!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(contact.email))erreurs.push('L’adresse e-mail de contact n’est pas valide.');
 if(contact.telephone&&!/^[+\d][\d\s().-]{5,}$/.test(contact.telephone))erreurs.push('Le numéro de téléphone n’est pas valide (chiffres, espaces et + uniquement).');
 programmes.forEach((p,i)=>{if(!p.titre.trim())erreurs.push('Programme '+(i+1)+' : le titre est obligatoire.');if(!lienValide(p.lien.trim()))erreurs.push('Programme '+(i+1)+' : le lien doit commencer par /, # ou https://.')});
 if(programmes.length>20)erreurs.push('Vingt programmes au maximum.');
 if(!lienValide(banniere.lien.trim()))erreurs.push('Bannière : le lien doit commencer par /, # ou https://.');
 const adresses=emailsDe(secretariat?.emails);
 if(secretariat?.actif&&!adresses.length)erreurs.push('Secrétariat : indiquez au moins une adresse e-mail valide, ou désactivez l’accès.');
 if(secretariat&&String(secretariat.emails||'').split(/[\s,;]+/).filter(Boolean).some(a=>!EMAIL.test(a)))erreurs.push('Secrétariat : une des adresses n’est pas valide.');
 return erreurs;
}
async function db(body){const r=await fetch('/api/db',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Le service est indisponible. Réessayez.');return d}
const lire=async(nom,rubrique='site')=>{const r=await db({op:'get',path:rubrique+'/'+nom});return r.exists?r.data:{}};
const complet=p=>({titre:p.titre||'',rythme:p.rythme||'',texte:p.texte||'',libelle:p.libelle||'',lien:p.lien||'',image:p.image||'',feu:p.feu===true});
function Field({label,hint,children}){return <label className="site-ed-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function SitePublic(){
 const [etat,setEtat]=useState('chargement'),[contact,setContact]=useState({email:'',telephone:''}),[programmes,setProgrammes]=useState([]),[banniere,setBanniere]=useState({texte:'',lien:'',actif:true}),[secr,setSecr]=useState({actif:false,emails:''}),[erreurs,setErreurs]=useState([]),[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false),[modifie,setModifie]=useState(false);
 useEffect(()=>{let vivant=true;Promise.all([lire('contact'),lire('programmes'),lire('banniere'),lire('secretariat','reglages_site')]).then(([c,p,b,sc])=>{if(!vivant)return;setSecr({actif:sc.actif===true,emails:(Array.isArray(sc.emails)?sc.emails:[]).join('\n')});setContact({email:c.email||'',telephone:c.telephone||''});setProgrammes((Array.isArray(p.liste)?p.liste:[]).map(complet));setBanniere({texte:b.texte||'',lien:b.lien||'',actif:b.actif!==false});setEtat('pret')}).catch(e=>{if(vivant){setMessage(e.message);setEtat('erreur')}});return()=>{vivant=false}},[]);
 useEffect(()=>{if(!modifie)return;const avant=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',avant);return()=>window.removeEventListener('beforeunload',avant)},[modifie]);
 const touche=f=>(...a)=>{setModifie(true);setMessage('');f(...a)};
 const champProg=(i,k,v)=>touche(()=>setProgrammes(l=>l.map((p,j)=>j===i?{...p,[k]:v}:p)))();
 const deplacer=(i,s)=>touche(()=>setProgrammes(l=>{const j=i+s;if(j<0||j>=l.length)return l;const n=[...l];[n[i],n[j]]=[n[j],n[i]];return n}))();
 const retirer=i=>{if(window.confirm('Retirer ce programme de la page publique ?'))touche(()=>setProgrammes(l=>l.filter((_,j)=>j!==i)))()};
 const ajouter=()=>touche(()=>setProgrammes(l=>[...l,complet({libelle:'Participer'})]))();
 const importer=()=>touche(()=>setProgrammes(PROGRAMMES_ACTUELS.map(complet)))();
 async function publier(){
  const nettoye={contact:{email:contact.email.trim(),telephone:contact.telephone.trim()},programmes:programmes.map(p=>({...p,titre:p.titre.trim(),lien:p.lien.trim()})),banniere:{...banniere,texte:banniere.texte.trim(),lien:banniere.lien.trim()},secretariat:secr};
  const e=verifier(nettoye);setErreurs(e);if(e.length){setMessage('');return}
  setOccupe(true);setMessage('');
  try{
   await db({op:'set',path:'site/contact',data:nettoye.contact});
   await db({op:'set',path:'site/programmes',data:{liste:nettoye.programmes,maj:Date.now()}});
   await db({op:'set',path:'site/banniere',data:nettoye.banniere});
   await db({op:'set',path:'reglages_site/secretariat',data:{actif:secr.actif,emails:emailsDe(secr.emails)}});
   setModifie(false);setMessage('✓ Publié. Les pages publiques se mettent à jour d’ici 5 minutes au plus.');
  }catch(err){setMessage(err.message)}finally{setOccupe(false)}
 }
 if(etat==='chargement')return <div role="status" className="ops-skeleton" aria-label="Chargement"><i/><i/><i/></div>;
 if(etat==='erreur')return <div role="alert" className="ops-notice">{message}</div>;
 return <div className="site-ed">
  <p className="ops-muted">Ce que vous écrivez ici remplace le texte des pages publiques <strong>Programmes</strong> et <strong>Contact</strong>. Un champ laissé vide ou une liste de programmes vide laisse la page telle qu’elle est aujourd’hui. Réservé aux administrateurs.</p>
  {erreurs.length>0&&<div role="alert" className="ops-notice"><strong>À corriger avant de publier :</strong><ul>{erreurs.map(e=><li key={e}>{e}</li>)}</ul></div>}
  <section className="ops-card"><h3>Coordonnées de contact</h3><div className="site-ed-grid">
   <Field label="Adresse e-mail" hint="Affichée sur la page Contact et utilisée pour le message de secours (ex. contact@mouvement-sde.org une fois la boîte créée chez l’hébergeur du domaine)."><input type="email" value={contact.email} maxLength={120} onChange={e=>touche(setContact)({...contact,email:e.target.value})}/></Field>
   <Field label="Téléphone et WhatsApp"><input type="tel" value={contact.telephone} maxLength={40} onChange={e=>touche(setContact)({...contact,telephone:e.target.value})} placeholder="+225 …"/></Field>
  </div></section>
  <section className="ops-card"><h3>Bannière d’annonce</h3><div className="site-ed-grid">
   <Field label="Message" hint="Bandeau en haut des pages Programmes et Contact (200 caractères)."><input value={banniere.texte} maxLength={200} onChange={e=>touche(setBanniere)({...banniere,texte:e.target.value})}/></Field>
   <Field label="Lien (facultatif)"><input value={banniere.lien} maxLength={300} onChange={e=>touche(setBanniere)({...banniere,lien:e.target.value})} placeholder="/programmes#infire"/></Field>
  </div><label className="site-ed-check"><input type="checkbox" checked={banniere.actif} onChange={e=>touche(setBanniere)({...banniere,actif:e.target.checked})}/> Afficher la bannière</label></section>
  <section className="ops-card"><h3>Demandes reçues : accès du secrétariat</h3>
   <p className="ops-muted">Par défaut, seuls les propriétaires voient les demandes du formulaire de contact. Vous pouvez donner cet accès à des membres du secrétariat : chacun doit se connecter avec le compte portant l’adresse indiquée, et reçoit un e-mail à chaque nouvelle demande, dès son arrivée.</p>
   <label className="site-ed-check"><input type="checkbox" checked={secr.actif} onChange={e=>touche(setSecr)({...secr,actif:e.target.checked})}/> Donner accès au secrétariat</label>
   <Field label="Adresses e-mail du secrétariat (une par ligne, dix au maximum)"><textarea rows={3} value={secr.emails} disabled={!secr.actif} onChange={e=>touche(setSecr)({...secr,emails:e.target.value})} placeholder="secretaire@exemple.org"/></Field>
  </section>
  <section className="ops-card"><h3>Programmes ({programmes.length})</h3>
   {!programmes.length&&<div className="ref-empty-state"><strong>Aucun programme publié ici</strong><p>La page publique affiche ses programmes d’origine. Importez-les pour les modifier.</p><button type="button" className="ref-small-action" onClick={importer}>Importer les programmes actuels</button></div>}
   <ol className="site-ed-list">{programmes.map((p,i)=><li key={i} className="site-ed-prog">
    <div className="site-ed-bar"><strong>{p.titre||'Nouveau programme'}</strong><span>
     <button type="button" onClick={()=>deplacer(i,-1)} disabled={i===0} aria-label={'Monter '+(p.titre||'le programme')}>↑</button>
     <button type="button" onClick={()=>deplacer(i,1)} disabled={i===programmes.length-1} aria-label={'Descendre '+(p.titre||'le programme')}>↓</button>
     <button type="button" onClick={()=>retirer(i)} aria-label={'Retirer '+(p.titre||'le programme')}>Retirer</button></span></div>
    <div className="site-ed-grid">
     <Field label="Titre"><input value={p.titre} maxLength={120} onChange={e=>champProg(i,'titre',e.target.value)}/></Field>
     <Field label="Rythme ou période"><input value={p.rythme} maxLength={80} onChange={e=>champProg(i,'rythme',e.target.value)} placeholder="Chaque mois"/></Field>
     <Field label="Texte de présentation"><textarea rows={3} value={p.texte} maxLength={400} onChange={e=>champProg(i,'texte',e.target.value)}/></Field>
     <Field label="Texte du bouton"><input value={p.libelle} maxLength={40} onChange={e=>champProg(i,'libelle',e.target.value)} placeholder="Participer"/></Field>
     <Field label="Lien du bouton" hint="Vide = ouvre le formulaire Contact avec ce programme présélectionné."><input value={p.lien} maxLength={300} onChange={e=>champProg(i,'lien',e.target.value)} placeholder="/academy"/></Field>
     <Field label="Illustration"><select value={p.image} onChange={e=>champProg(i,'image',e.target.value)}>{IMAGES.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></Field>
    </div>
    <label className="site-ed-check"><input type="checkbox" checked={p.feu} onChange={e=>champProg(i,'feu',e.target.checked)}/> Mettre en avant (carte « feu »)</label>
   </li>)}</ol>
   <div className="site-ed-actions"><button type="button" className="ref-small-action" onClick={ajouter} disabled={programmes.length>=20}>+ Ajouter un programme</button>{programmes.length>0&&<button type="button" className="ref-small-action" onClick={()=>{if(window.confirm('Vider la liste ? La page publique reprendra ses programmes d’origine après publication.'))touche(setProgrammes)([])}}>Revenir aux programmes d’origine</button>}</div>
  </section>
  <div className="site-ed-publish"><button type="button" className="ref-small-action site-ed-go" onClick={publier} disabled={occupe||!modifie}>{occupe?'Publication…':'Publier sur le site'}</button><a href="/programmes" target="_blank" rel="noopener">Voir la page Programmes</a><a href="/contact" target="_blank" rel="noopener">Voir la page Contact</a><p role="status">{message}</p></div>
 </div>;
}
