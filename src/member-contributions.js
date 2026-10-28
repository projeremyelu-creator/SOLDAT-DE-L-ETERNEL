/* Lecture personnelle du registre natif annuel et des anciennes lignes mensuelles. */
export function memberContributions(records,memberId){
 const rows=[];
 const amount=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
 for(const {id,data:d={}} of records){
  if(!memberId||d.membreId!==memberId)continue;
  if(d.mois&&typeof d.mois==='object'&&!Array.isArray(d.mois)){
   if(!/^\d{4}$/.test(String(d.annee)))continue;
   for(const [month,p]of Object.entries(d.mois)){
    if(!p||typeof p!=='object'||!/^\d{1,2}$/.test(month)||Number(month)<1||Number(month)>12)continue;
    rows.push({id:id+'-'+month,mois:d.annee+'-'+String(Number(month)).padStart(2,'0'),montant:amount(p.montant),devise:'XOF',statut:'paye',date:String(p.date||'').slice(0,10)});
   }
  }else if(/^\d{4}-\d{2}$/.test(String(d.mois||''))){
   rows.push({id,mois:d.mois,montant:amount(d.montant),devise:String(d.devise||'XOF').slice(0,3),statut:d.statut==='paye'?'paye':'en_attente',date:String(d.date||'').slice(0,10)});
  }
 }
 rows.sort((a,b)=>b.mois.localeCompare(a.mois)||b.date.localeCompare(a.date));
 const totaux={};for(const row of rows)if(row.statut==='paye')totaux[row.devise]=(totaux[row.devise]||0)+row.montant;
 return {cotisations:rows.slice(0,120),totalPaye:totaux.XOF||0,devise:'XOF',totaux};
}
