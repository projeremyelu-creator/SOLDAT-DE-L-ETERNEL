import {dashboardMetrics,dashboardAttendance} from './dashboard-metrics.js';
const response=(d,status=200)=>Response.json(d,{status,headers:{'cache-control':'private, no-store'}});
const fail=(message,status=400)=>response({message},status);
const str=(v,n=160)=>String(v||'').slice(0,n);
const amount=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):0;
const budget=d=>Object.values(d.lignes||{}).reduce((s,l)=>s+amount(l?.montant),0)||amount(d.budget);
export async function operationsApi(req,env,u,{list,audit}){
 const path=new URL(req.url).pathname;if(!['/api/pilotage-academy','/api/pilotage-finances','/api/budget-validation','/api/annuaire-portail','/api/bibliotheque-portail'].includes(path))return null;
 if(!u.connecte)return fail('Connectez-vous pour accéder au portail.',401);
 if(u.niveau<(path==='/api/bibliotheque-portail'?0:['/api/pilotage-academy','/api/annuaire-portail'].includes(path)?1:2))return fail('Accès réservé aux responsables habilités.',403);
 if(path==='/api/annuaire-portail'||path==='/api/bibliotheque-portail'){
  if(req.method!=='GET')return fail('GET uniquement.',405);
  if(path==='/api/bibliotheque-portail'){
   const rows=await list('ressources');
   return response({ressources:rows.map(({id,data:d})=>({id,titre:str(d.titre||'Ressource'),auteur:str(d.auteur),type:str(d.type,30),theme:str(d.theme),description:str(d.description,500),fichier:/^[\w-]+$/.test(d.fichierId||'')?'/_blob/'+d.fichierId:'',mime:str(d.fichierType,80),lien:/^https?:\/\//i.test(d.lien||'')?str(d.lien,1500):''}))});
  }
  const [members,forms,events,garrisons]=await Promise.all(['membres','formations','evenements','garnisons'].map(list));
  const recent=events.filter(e=>e.data.date<=new Date().toISOString().slice(0,10)&&e.data.presents&&Object.values(e.data.presents).some(v=>[true,false,'retard','excuse'].includes(v))).sort((a,b)=>String(b.data.date).localeCompare(String(a.data.date))).slice(0,7);
  return response({membres:members.map(m=>({id:m.id,nom:str([m.data.prenoms,m.data.nom].filter(Boolean).join(' ')||'Membre'),matricule:str(m.data.matricule,60),fonction:str(m.data.fonction),pole:str(m.data.pole),statut:str(m.data.statut),actif:m.data.actif!==false,presence:dashboardAttendance(recent,[m],garrisons).taux,formations:forms.filter(f=>f.data.participants?.[m.id]&&!['Abandon','Retiré'].includes(f.data.participants[m.id].statut)).map(f=>({titre:str(f.data.titre),certifie:f.data.participants[m.id].statut==='Certifié'}))}))});
 }
 if(path==='/api/budget-validation'){
  if(req.method!=='POST')return fail('POST uniquement.',405);
  const b=await req.json();if(typeof b.projet!=='string'||!/^[\w-]{1,128}$/.test(b.projet))return fail('Projet invalide.');
  const row=await env.DB.prepare('SELECT data,version FROM docs WHERE path=?').bind('projets/'+b.projet).first();if(!row)return fail('Projet introuvable.',404);
  const d=JSON.parse(row.data),n=budget(d);if(!n||b.montant!==n)return fail('Le budget a changé ou n’est pas renseigné. Actualisez avant validation.',409);
  const validation={montant:n,par:u.id,le:Date.now()};
  const result=await env.DB.batch([env.DB.prepare("UPDATE docs SET data=json_set(data,'$.validationBudget',json(?)),version=version+1,maj=? WHERE path=? AND version=?").bind(JSON.stringify(validation),Date.now(),'projets/'+b.projet,row.version),env.DB.prepare("INSERT INTO revs(parent,rev) VALUES('projets',1) ON CONFLICT(parent) DO UPDATE SET rev=rev+1")]);
  if(!result[0]?.meta?.changes)return fail('Le projet a changé. Actualisez avant validation.',409);
  await audit('projets','validation_budget');return response({ok:true});
 }
 if(req.method!=='GET')return fail('GET uniquement.',405);
 if(path==='/api/pilotage-academy'){
  const [forms,members,events,garrisons]=await Promise.all(['formations','membres','evenements','garnisons'].map(list));
  const names=new Map(members.filter(m=>m.data.actif!==false).map(m=>[m.id,[m.data.prenoms,m.data.nom].filter(Boolean).join(' ')||'Membre'])),prets=[];
  const formations=forms.map(({id,data:d})=>{const modules=Array.isArray(d.modules)?d.modules.filter(m=>m?.id):[];let suivis=0,inscrits=0,certifies=0;
   for(const [mid,p]of Object.entries(d.participants||{})){if(!p||typeof p!=='object'||['Abandon','Retiré'].includes(p.statut))continue;inscrits++;const faits=modules.filter(m=>p.suivis?.[m.id]).length;suivis+=faits;if(p.statut==='Certifié')certifies++;else if(names.has(mid)&&modules.length&&faits===modules.length)prets.push({formation:id,membre:mid,nom:str(names.get(mid)),titre:str(d.titre),faits,total:modules.length})}
   return {id,titre:str(d.titre||'Formation'),inscrits,certifies,faits:suivis,total:modules.length*inscrits};
  });
  return response({formations,prets,progression:dashboardMetrics([],forms).academie,assiduite:dashboardAttendance(events.filter(e=>e.data.type==='Formation'),members,garrisons),actualiseLe:Date.now()});
 }
 const now=new Date(),months=Array.from({length:12},(_,i)=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11+i,1)).toISOString().slice(0,7));
 const since=months[0]+'-01',today=now.toISOString().slice(0,10);
 const [projects,offerings,members,raw]=await Promise.all([list('projets'),list('offrandes'),list('membres'),env.DB.prepare("SELECT data FROM docs WHERE parent GLOB 'finances/????-??/ops'").all()]);
 const valid=d=>!d.annule&&/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')&&d.date>=since&&d.date<=today;
 const ops=(raw.results||[]).map(r=>JSON.parse(r.data)).filter(d=>valid(d)&&['E','S'].includes(d.sens));
 const mensuel=months.map(m=>({mois:m,entrees:ops.filter(d=>d.date.startsWith(m)&&d.sens==='E').reduce((n,d)=>n+amount(d.montant),0),sorties:ops.filter(d=>d.date.startsWith(m)&&d.sens==='S').reduce((n,d)=>n+amount(d.montant),0)}));
 const groups=new Map(),poles=new Map(),memberPoles=new Map(members.map(m=>[m.id,m.data.pole]));
 for(const {data:d}of offerings.filter(o=>valid(o.data))){const type=str(d.type||'Offrande'),pole=str(d.pole||memberPoles.get(d.membreId)||'Sans pôle renseigné');groups.set(type,(groups.get(type)||0)+amount(d.montant));poles.set(pole,(poles.get(pole)||0)+amount(d.montant))}
 const projets=projects.map(({id,data:d})=>{const tasks=Object.values(d.taches||{}).filter(t=>t&&typeof t==='object'),team=new Set([...(Array.isArray(d.equipe)?d.equipe:[]),d.responsableId].filter(Boolean));const engaged=new Set(tasks.filter(t=>['En cours','Fait'].includes(t.statut)&&team.has(t.responsableId)).map(t=>t.responsableId));const n=budget(d);return {id,titre:str(d.titre||'Mission'),statut:str(d.statut||'En préparation'),budget:n,valide:!!d.validationBudget&&d.validationBudget.montant===n,depense:ops.filter(o=>o.sens==='S'&&o.projet?.id===id).reduce((s,o)=>s+amount(o.montant),0),equipe:team.size,engages:engaged.size,faits:tasks.filter(t=>t.statut==='Fait').length,total:tasks.length}});
 return response({devise:'XOF',depuis:since,jusquau:today,mensuel,avecOperations:ops.length>0,entrees:mensuel.reduce((s,m)=>s+m.entrees,0),sorties:mensuel.reduce((s,m)=>s+m.sorties,0),offrandes:[...groups].map(([titre,montant])=>({titre,montant})),poles:[...poles].map(([titre,montant])=>({titre,montant})),projets,actualiseLe:Date.now()});
}
