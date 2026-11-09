import React,{useEffect,useRef,useState} from 'react';

export function ProfilePhoto({account,onSaved}){
 const input=useRef(null),[photo,setPhoto]=useState(account.photo||''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{if(photo||!account.membreId)return;let live=true;fetch('/api/mon-espace',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const id=d?.membre?.photoId;if(live&&!account.photo&&/^[A-Za-z0-9_-]{16,64}$/.test(id||''))setPhoto('/_blob/'+id)}).catch(()=>{});return()=>{live=false}},[]);
 const initials=String(account.nom||'SDE').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 async function upload(event){
  const file=event.target.files?.[0];if(!file)return;
  event.target.value='';setMessage('');setError(false);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){
   setError(true);setMessage('Choisissez une photo JPEG, PNG ou WebP de 5 Mo maximum.');return;
  }
  setBusy(true);
  try{
   const response=await fetch('/api/ma-photo',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':file.type},body:file});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.url)throw Error(result.message||'La photo n’a pas pu être enregistrée.');
   account.photo=result.url;setPhoto(result.url);setMessage('Votre photo de profil est enregistrée.');onSaved?.(result);
  }catch(e){setError(true);setMessage(e.message||'La photo n’a pas pu être enregistrée.');}
  finally{setBusy(false);}
 }
 return <section className="ops-profile-photo" aria-label="Ma photo de profil">
  <div className="ops-profile-avatar">{photo?<img src={photo} alt="Ma photo de profil"/>:<span aria-hidden="true">{initials}</span>}</div>
  <div><strong>Ma photo de profil</strong><p>Elle apparaît sur votre compte et, si votre fiche est liée, sur votre carte de membre.</p>
   <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Choisir ma photo de profil" disabled={busy}/>
   <button type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Envoi en cours…':photo?'Changer ma photo':'Ajouter ma photo'}</button>
   <small>JPEG, PNG ou WebP · 5 Mo maximum</small><p role={error?'alert':'status'} aria-live="polite">{message}</p>
  </div>
 </section>;
}
