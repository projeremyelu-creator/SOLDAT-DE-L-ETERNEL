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
/* Même périmètre que le registre natif : actifs, date d'adhésion et garnison.
 * Une absence non cochée compte après le début du pointage ; les excuses sont exclues.
 */
export function dashboardAttendance(events=[],members=[],garrisons=[],today=new Date().toISOString().slice(0,10)){
 const groups=new Map(garrisons.map(g=>[g.id,g.data||{}]));
 const within=(member,gid)=>{let id=member.garnisonId;const seen=new Set();while(id&&!seen.has(id)){if(id===gid)return true;seen.add(id);id=groups.get(id)?.parentId}return false};
 const recent=events.map(e=>e.data||{}).filter(e=>typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&e.date<=today&&e.presents&&typeof e.presents==='object'&&!Array.isArray(e.presents)&&Object.values(e.presents).some(v=>[true,false,'retard','excuse'].includes(v))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
 let presents=0,renseignes=0;
 for(const e of recent)for(const {id,data:m={}}of members){
  if(m.actif===false||(m.adhesion&&m.adhesion>e.date))continue;
  const state=e.presents[id];
  if(e.garnisonId&&groups.has(e.garnisonId)&&state===undefined&&!within(m,e.garnisonId))continue;
  if(e.garnisonId&&groups.has(e.garnisonId)&&state===null&&!within(m,e.garnisonId))continue;
  if(state==='excuse')continue;renseignes++;
  if(state===true||state==='retard')presents++;
 }
 return {presents,renseignes,taux:renseignes?Math.round(100*presents/renseignes):null};
}
