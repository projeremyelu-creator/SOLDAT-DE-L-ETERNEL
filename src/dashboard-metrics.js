/* Agrégats de pilotage : aucune identité, note privée ou donnée financière. */
const values=v=>v&&typeof v==='object'?Object.values(v).filter(x=>x&&typeof x==='object'):[];
export function dashboardMetrics(events=[],formations=[],projects=[],today=new Date().toISOString().slice(0,10)){
 const frequentation=events.map(e=>e.data||{}).filter(d=>typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&d.date<=today&&d.presents&&typeof d.presents==='object'&&!Array.isArray(d.presents)&&Object.values(d.presents).some(v=>[true,false,'retard','excuse'].includes(v))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).reverse().map(d=>{
  const rows=Object.values(d.presents);
  return {date:d.date,titre:String(d.titre||'Rencontre').slice(0,140),presents:rows.filter(v=>v===true).length,retards:rows.filter(v=>v==='retard').length,absents:rows.filter(v=>v===false).length,excuses:rows.filter(v=>v==='excuse').length};
 });
 const academie={inscriptions:0,certifies:0,modulesSuivis:0,modulesAttendus:0};
 for(const {data:d={}} of formations){
  const modules=Array.isArray(d.modules)?d.modules.filter(m=>m&&m.id):[];
  for(const p of values(d.participants).filter(p=>!['Retiré','Abandon'].includes(p.statut))){
   academie.inscriptions++;if(p.statut==='Certifié')academie.certifies++;
   academie.modulesAttendus+=modules.length;academie.modulesSuivis+=modules.filter(m=>p.suivis?.[m.id]).length;
  }
 }
 const missions={actifs:0,termines:0,tachesFaites:0,tachesTotal:0};
 for(const {data:d={}} of projects){
  if(['En préparation','En cours','Suspendu'].includes(d.statut||'En préparation'))missions.actifs++;
  if(d.statut==='Terminé')missions.termines++;
  if(d.statut==='Abandonné')continue;
  const tasks=values(d.taches);missions.tachesTotal+=tasks.length;missions.tachesFaites+=tasks.filter(t=>t.statut==='Fait').length;
 }
 return {frequentation,academie,missions};
}
