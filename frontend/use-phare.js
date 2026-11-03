import {useEffect,useState} from 'react';
import {PHARE_DEFAUT,pharePublie} from './evenement-phare.js';
/* Lit la fiche centrale ; le secours reste affiché si la requête échoue. */
export function usePhare(){
 const [phare,setPhare]=useState(PHARE_DEFAUT);
 useEffect(()=>{
  let actif=true;
  (async()=>{
   try{
    const r=await fetch('/vitrine/evenement-phare.json',{cache:'no-cache'});
    if(!r||!r.ok)return;
    const d=await r.json();
    if(actif)setPhare(pharePublie(d));
   }catch(_){/* secours conservé */}
  })();
  return()=>{actif=false};
 },[]);
 return phare;
}
