import React,{useState} from 'react';
const options=[['in-fire-2027','IN FIRE 2027'],['missions-humanitaires','Missions humanitaires'],['soldiers-academy','Soldiers Academy']];
async function submit(path,body){
 const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const result=await r.json();if(!r.ok)throw Error(result.message||'Refus serveur');return result;
}
export function FinancementsPublies({compte}){
 const [projet,setProjet]=useState(options[0][0]),[objectif,setObjectif]=useState(''),[encaisse,setEncaisse]=useState(''),[reference,setReference]=useState(''),[publie,setPublie]=useState(false),[periode,setPeriode]=useState('2026-Q4'),[rapport,setRapport]=useState(''),[rapportRef,setRapportRef]=useState(''),[rapportPublic,setRapportPublic]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 if(compte.niveau<3)return null;
 async function save(event,kind){
  event.preventDefault();setBusy(true);setMessage('Vérification de la demande…');
  try{
   const payload=kind==='projet'?{projet,objectif:Number(objectif),encaisse:Number(encaisse),reference,publie}:{periode,texte:rapport,reference:rapportRef,publie:rapportPublic};
   const r=await submit(kind==='projet'?'/api/sde-financements':'/api/sde-bilans',payload);
   setMessage(r.publie?'Données publiées après validation.':'Brouillon privé enregistré.');
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 const field={maxWidth:'100%',padding:'9px',border:'1px solid #927a4c',borderRadius:'6px',background:'#fdf9f1',color:'#172439'};
 return <section className="ops-card sde-finance-published" aria-label="Publication financière publique" style={{marginTop:20,padding:20}}>
 <h3>Publication des collectes et bilans</h3><p>Propriétaire uniquement. Ne publiez que les montants réellement encaissés et rapprochés. Les engagements annoncés ne sont pas des recettes.</p>
 <form onSubmit={e=>save(e,'projet')} style={{display:'grid',gap:12,maxWidth:650}}>
 <label>Campagne<select style={field} value={projet} onChange={e=>setProjet(e.target.value)}>{options.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
 <label>Objectif XOF<input style={field} type="number" min="1" max="1000000000" required value={objectif} onChange={e=>setObjectif(e.target.value)}/></label>
 <label>Total encaissé et rapproché XOF<input style={field} type="number" min="0" max="1000000000" required value={encaisse} onChange={e=>setEncaisse(e.target.value)}/></label>
 <label>Référence comptable interne<input style={field} required minLength={8} maxLength={160} value={reference} onChange={e=>setReference(e.target.value)}/></label>
 <label><input type="checkbox" checked={publie} onChange={e=>setPublie(e.target.checked)}/> Publier les montants confirmés</label>
 <button type="submit" disabled={busy}>Enregistrer la campagne</button></form>
 <h4 style={{marginTop:28}}>Rapport trimestriel vérifié</h4>
 <form onSubmit={e=>save(e,'bilan')} style={{display:'grid',gap:12,maxWidth:650}}>
 <label>Trimestre (ex. 2026-Q4)<input style={field} required pattern="20[0-9]{2}-Q[1-4]" value={periode} onChange={e=>setPeriode(e.target.value)}/></label>
 <label>Compte rendu publiable<textarea style={field} required minLength={40} maxLength={3500} rows={5} value={rapport} onChange={e=>setRapport(e.target.value)} /></label>
 <label>Référence de validation interne<input style={field} required minLength={8} maxLength={160} value={rapportRef} onChange={e=>setRapportRef(e.target.value)}/></label>
 <label><input type="checkbox" checked={rapportPublic} onChange={e=>setRapportPublic(e.target.checked)}/> Publier le bilan</label>
 <button type="submit" disabled={busy}>Enregistrer le bilan</button></form>
 <p role="status">{message}</p><p><a href="/soutenir" target="_blank" rel="noopener noreferrer">Consulter les cagnottes publiques →</a></p>
 </section>;
}
