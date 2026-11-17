/* SDE — Grades et Distinctions.
 * Stockage isolé dans de nouvelles tables D1. Ne modifie ni comptes, ni rôles,
 * ni matricules, ni documents métier existants. Toute attribution est tracée.
 */
const GRADES = [
  {code:"recrue_iii",label:"Recrue III",points:0,days:0,academy:0,bonus:0},
  {code:"recrue_ii",label:"Recrue II",points:100,days:30,academy:0,bonus:5},
  {code:"recrue_i",label:"Recrue I",points:250,days:30,academy:0,bonus:10},
  {code:"sergent_iii",label:"Sergent III",points:450,days:60,academy:1,bonus:20},
  {code:"sergent_ii",label:"Sergent II",points:700,days:90,academy:1,bonus:25},
  {code:"sergent_i",label:"Sergent I",points:1000,days:90,academy:2,bonus:30},
  {code:"capitaine_iii",label:"Capitaine III",points:1400,days:120,academy:3,bonus:40}
];
const CATEGORIES = {
  formation:{cap:100,period:"month",activities:{
    formation_module:30,formation_path:60,certification:20,teaching:20
  }},
  spiritual:{cap:60,period:"month",activities:{
    spiritual_collective:10,fasting_prayer:10,intercession:10,teaching_preparation:20
  }},
  rev:{cap:100,period:"month",activities:{
    evangelism_mission:25,evangelism_organize:20,evangelism_campaign:15,mission_report_rev:10
  }},
  ish:{cap:100,period:"month",activities:{
    humanitarian_mission:25,social_action:25,solidarity:15,impact_report:10
  }},
  lo:{cap:80,period:"month",activities:{
    logistics_mission:15,coordination_activity:25,operations_management:20,org_report:10
  }},
  cmr:{cap:80,period:"month",activities:{
    media_production:15,event_coverage:20,communication_campaign:20,communication_report:10
  }},
  leadership:{cap:80,period:"month",activities:{
    team_leadership:30,coordination_meeting:20,problem_resolution:20,skill_transfer:20
  }},
  fidelity:{cap:40,period:"month",activities:{
    monthly_commitment:20,mission_commitment:10,pole_regular:10
  }},
  mentorship:{cap:60,period:"quarter",activities:{
    mentoring_member:20,mentoring_followup:20,quarterly_report:20
  }}
};
const DISTINCTIONS = [
  {code:"fidelite",label:"Médaille de fidélité"},
  {code:"humanitaire",label:"Médaille de service humanitaire"},
  {code:"academique",label:"Médaille d'excellence académique"},
  {code:"leadership",label:"Médaille de leadership"},
  {code:"merite",label:"Médaille de mérite exceptionnel"},
  {code:"institutionnelle",label:"Médaille de contribution institutionnelle"}
];
const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
const err=(message,status=400)=>json({ok:false,message},status);
const txt=(v,n=500)=>String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n);
const now=()=>Date.now();
const roleLevel=u=>Number(u?.niveau||0);
const memberRef=u=>String(u?.membreId||u?.id||"");
const currentPeriod=(kind,t= new Date())=>{
  const y=t.getUTCFullYear(),m=t.getUTCMonth()+1;
  return kind==="quarter"?y+"-T"+(Math.floor((m-1)/3)+1):y+"-"+String(m).padStart(2,"0");
};
async function init(env){
  const ddl=[
    "CREATE TABLE IF NOT EXISTS sde_grade_progress (member_ref TEXT PRIMARY KEY, account_id TEXT NOT NULL, matricule TEXT, grade_code TEXT NOT NULL DEFAULT 'recrue_iii', grade_since INTEGER NOT NULL, points_total INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS sde_grade_points (id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL, category TEXT NOT NULL, activity_code TEXT NOT NULL, points INTEGER NOT NULL, description TEXT NOT NULL, evidence_ref TEXT, submitted_by TEXT NOT NULL, validated_by TEXT, status TEXT NOT NULL DEFAULT 'pending', period_key TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, reviewed_at INTEGER)",
    "CREATE INDEX IF NOT EXISTS idx_sde_grade_points_member ON sde_grade_points(member_ref,status,created_at)",
    "CREATE INDEX IF NOT EXISTS idx_sde_grade_points_period ON sde_grade_points(member_ref,category,period_key,status)",
    "CREATE TABLE IF NOT EXISTS sde_grade_promotions (id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL, from_grade TEXT NOT NULL, to_grade TEXT NOT NULL, points_snapshot INTEGER NOT NULL, academy_level INTEGER NOT NULL DEFAULT 0, grade_since_snapshot INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', submitted_at INTEGER NOT NULL, reviewed_by TEXT, decision_reason TEXT, decision_at INTEGER)",
    "CREATE INDEX IF NOT EXISTS idx_sde_grade_promotions_status ON sde_grade_promotions(status,submitted_at)",
    "CREATE TABLE IF NOT EXISTS sde_grade_directoire (account_id TEXT PRIMARY KEY, added_by TEXT NOT NULL, added_at INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS sde_grade_awards (id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL, distinction_code TEXT NOT NULL, reason TEXT NOT NULL, awarded_by TEXT NOT NULL, awarded_at INTEGER NOT NULL)"
  ];
  for(const q of ddl)await env.DB.prepare(q).run();
}
function gradeIndex(code){return GRADES.findIndex(g=>g.code===code);}
async function ensureProgress(env,u){
  const ref=memberRef(u);if(!ref)throw new Error("member_ref_missing");
  const t=now();
  await env.DB.prepare("INSERT OR IGNORE INTO sde_grade_progress(member_ref,account_id,matricule,grade_code,grade_since,points_total,created_at,updated_at) VALUES(?,?,?,'recrue_iii',?,0,?,?)")
    .bind(ref,String(u.id),txt(u.matricule,40)||null,t,t,t).run();
  return await env.DB.prepare("SELECT * FROM sde_grade_progress WHERE member_ref=?").bind(ref).first();
}
async function academyLevel(env,accountId){
  try{
    const r=await env.DB.prepare("SELECT COALESCE(MAX(niveau),0) AS niveau FROM academy_2027_attestations WHERE compte=?").bind(String(accountId)).first();
    return Number(r?.niveau||0);
  }catch{return 0;}
}
async function isDirectoire(env,u){
  return !!(await env.DB.prepare("SELECT account_id FROM sde_grade_directoire WHERE account_id=?").bind(String(u.id)).first());
}
async function totals(env,ref){
  const r=await env.DB.prepare("SELECT COALESCE(SUM(points),0) AS total FROM sde_grade_points WHERE member_ref=? AND status='approved'").bind(ref).first();
  return Number(r?.total||0);
}
async function profile(env,u){
  const p=await ensureProgress(env,u),total=await totals(env,p.member_ref);
  const i=Math.max(0,gradeIndex(p.grade_code)),current=GRADES[i],next=GRADES[i+1]||null;
  const academy=await academyLevel(env,u.id);
  const history=(await env.DB.prepare("SELECT id,category,activity_code,points,description,status,created_at,reviewed_at FROM sde_grade_points WHERE member_ref=? ORDER BY created_at DESC LIMIT 100").bind(p.member_ref).all()).results||[];
  const awards=(await env.DB.prepare("SELECT distinction_code,reason,awarded_at FROM sde_grade_awards WHERE member_ref=? ORDER BY awarded_at DESC").bind(p.member_ref).all()).results||[];
  const pending=(await env.DB.prepare("SELECT id,to_grade,submitted_at FROM sde_grade_promotions WHERE member_ref=? AND status='pending' ORDER BY submitted_at DESC LIMIT 1").bind(p.member_ref).first());
  const remaining=next?Math.max(0,next.points-total):0;
  return {memberRef:p.member_ref,matricule:p.matricule||u.matricule||"",grade:current,nextGrade:next,totalPoints:total,remainingPoints:remaining,progressPercent:next?Math.min(100,Math.round(total/next.points*100)):100,gradeSince:p.grade_since,academyLevel:academy,pendingPromotion:pending,history,distinctions:awards};
}
async function eligible(env,u,p){
  const i=gradeIndex(p.grade_code),next=GRADES[i+1];
  if(!next)return {ok:false,reason:"Le grade supérieur défini est déjà atteint."};
  const total=await totals(env,p.member_ref),level=await academyLevel(env,u.id);
  if(total<next.points)return {ok:false,reason:"Seuil de points non atteint.",missingPoints:next.points-total};
  const days=Math.floor((now()-Number(p.grade_since))/86400000);
  if(days<next.days)return {ok:false,reason:"Ancienneté insuffisante.",missingDays:next.days-days};
  if(level<next.academy)return {ok:false,reason:"Formation Soldiers Academy requise.",requiredAcademyLevel:next.academy,currentAcademyLevel:level};
  const pending=await env.DB.prepare("SELECT id FROM sde_grade_promotions WHERE member_ref=? AND status='pending' LIMIT 1").bind(p.member_ref).first();
  if(pending)return {ok:false,reason:"Un dossier de promotion est déjà en attente."};
  return {ok:true,next,total,level};
}
export async function gradesApi(req,env,u,path){
  if(!path.startsWith("/api/grades"))return null;
  if(!u?.connecte||!u.id)return err("Connexion requise.",401);
  if(!env?.DB)return err("Base de données indisponible.",503);
  try{
    await init(env);
    if(path==="/api/grades/catalog"&&req.method==="GET")
      return json({ok:true,grades:GRADES,categories:Object.entries(CATEGORIES).map(([code,c])=>({code,cap:c.cap,period:c.period,activities:Object.entries(c.activities).map(([activity,points])=>({activity,points}))})),distinctions:DISTINCTIONS});
    if(path==="/api/grades/me"&&req.method==="GET")
      return json({ok:true,profile:await profile(env,u)});
    if(path==="/api/grades/points"&&req.method==="POST"){
      if(roleLevel(u)<1)return err("Soumission réservée aux responsables de pôle habilités.",403);
      const b=await req.json(),accountId=txt(b.accountId,160),category=txt(b.category,40),activity=txt(b.activity,80);
      const cat=CATEGORIES[category],points=cat?.activities?.[activity];
      const evidenceRef=txt(b.evidenceRef,500);
      if(!accountId||!Number.isInteger(points)||evidenceRef.length<3)return err("Membre, catégorie, activité et preuve justificative obligatoires.");
      const account=await env.DB.prepare("SELECT id,membreId,matricule FROM comptes WHERE id=?").bind(accountId).first();
      if(!account)return err("Compte membre introuvable.",404);
      const ref=String(account.membreId||account.id),t=now(),key=txt(b.idempotencyKey,100)||crypto.randomUUID();
      const period=currentPeriod(cat.period);
      await env.DB.prepare("INSERT OR IGNORE INTO sde_grade_progress(member_ref,account_id,matricule,grade_code,grade_since,points_total,created_at,updated_at) VALUES(?,?,?,'recrue_iii',?,0,?,?)")
        .bind(ref,account.id,account.matricule||null,t,t,t).run();
      const id=crypto.randomUUID();
      const result=await env.DB.prepare("INSERT OR IGNORE INTO sde_grade_points(id,member_ref,account_id,category,activity_code,points,description,evidence_ref,submitted_by,status,period_key,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,'pending',?,?,?)")
        .bind(id,ref,account.id,category,activity,points,txt(b.description,500),evidenceRef,String(u.id),period,key,t).run();
      if(result.meta?.changes===0)return err("Cette demande existe déjà ou n'a pas pu être enregistrée.",409);
      return json({ok:true,id,status:"pending",points,message:"Contribution transmise pour validation."},201);
    }
    const pointReview=path.match(/^\/api\/grades\/points\/([A-Za-z0-9-]+)\/review$/);
    if(pointReview&&req.method==="PATCH"){
      if(roleLevel(u)<1)return err("Accès réservé aux responsables habilités.",403);
      const b=await req.json(),decision=b.decision;
      if(!["approve","reject"].includes(decision))return err("Décision invalide.");
      const id=pointReview[1],row=await env.DB.prepare("SELECT * FROM sde_grade_points WHERE id=?").bind(id).first();
      if(!row)return err("Contribution introuvable.",404);
      if(row.submitted_by===String(u.id))return err("Vous ne pouvez pas valider votre propre contribution.",403);
      const cat=CATEGORIES[row.category];if(!cat)return err("Catégorie inconnue.",409);
      const t=now();
      if(decision==="reject"){
        const r=await env.DB.prepare("UPDATE sde_grade_points SET status='rejected',validated_by=?,reviewed_at=? WHERE id=? AND status='pending'").bind(String(u.id),t,id).run();
        if(!r.meta?.changes)return err("Cette demande a déjà été traitée.",409);
        return json({ok:true,status:"rejected"});
      }
      const r=await env.DB.prepare("UPDATE sde_grade_points SET status='approved',validated_by=?,reviewed_at=? WHERE id=? AND status='pending' AND (SELECT COALESCE(SUM(points),0) FROM sde_grade_points p WHERE p.member_ref=sde_grade_points.member_ref AND p.category=sde_grade_points.category AND p.period_key=sde_grade_points.period_key AND p.status='approved') + points <= ?")
        .bind(String(u.id),t,id,cat.cap).run();
      if(!r.meta?.changes)return err("Plafond de points atteint ou demande déjà traitée.",409);
      const total=await totals(env,row.member_ref);
      await env.DB.prepare("UPDATE sde_grade_progress SET points_total=?,updated_at=? WHERE member_ref=?").bind(total,t,row.member_ref).run();
      return json({ok:true,status:"approved",totalPoints:total});
    }
    if(path==="/api/grades/promotion"&&req.method==="POST"){
      const p=await ensureProgress(env,u),check=await eligible(env,u,p);
      if(!check.ok)return err(check.reason,409);
      const id=crypto.randomUUID(),t=now();
      await env.DB.prepare("INSERT INTO sde_grade_promotions(id,member_ref,account_id,from_grade,to_grade,points_snapshot,academy_level,grade_since_snapshot,status,submitted_at) VALUES(?,?,?,?,?,?,?,?,'pending',?)")
        .bind(id,p.member_ref,String(u.id),p.grade_code,check.next.code,check.total,check.level,p.grade_since,t).run();
      return json({ok:true,id,status:"pending",grade:check.next.label,message:"Dossier transmis au Directoire."},201);
    }
    if(path==="/api/grades/directoire"&&req.method==="GET"){
      if(!(await isDirectoire(env,u)))return err("Accès réservé au Directoire.",403);
      const rows=(await env.DB.prepare("SELECT p.*,g.nom AS member_name,c.matricule AS account_matricule FROM sde_grade_promotions p LEFT JOIN comptes c ON c.id=p.account_id LEFT JOIN docs d ON d.id=p.member_ref AND d.parent='membres' LEFT JOIN comptes g ON g.id=p.account_id ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END,p.submitted_at DESC LIMIT 200").all()).results||[];
      const clean=rows.map(r=>({...r,memberName:txt(r.member_name,120)||"Membre SDE",matricule:txt(r.account_matricule,40)}));
      return json({ok:true,promotions:clean});
    }
    const decision=path.match(/^\/api\/grades\/promotion\/([A-Za-z0-9-]+)\/decision$/);
    if(decision&&req.method==="PATCH"){
      if(!(await isDirectoire(env,u)))return err("Accès réservé au Directoire.",403);
      const b=await req.json(),choice=b.decision,reason=txt(b.reason,1000);
      if(!["approve","reject","defer"].includes(choice)||reason.length<3)return err("Décision et motif obligatoires.");
      const id=decision[1],row=await env.DB.prepare("SELECT * FROM sde_grade_promotions WHERE id=?").bind(id).first();
      if(!row)return err("Dossier introuvable.",404);
      if(row.status!=="pending")return err("Dossier déjà traité.",409);
      if(choice==="approve"){
        const g=GRADES.find(x=>x.code===row.to_grade);
        if(!g)return err("Grade cible inconnu.",409);
        const total=await totals(env,row.member_ref),days=Math.floor((now()-Number(row.grade_since_snapshot))/86400000),level=await academyLevel(env,row.account_id);
        if(total<g.points||days<g.days||level<g.academy)return err("Les conditions ont changé depuis la demande. Réexamen nécessaire.",409);
        const updated=await env.DB.prepare("UPDATE sde_grade_promotions SET status='approved',reviewed_by=?,decision_reason=?,decision_at=? WHERE id=? AND status='pending'").bind(String(u.id),reason,now(),id).run();
        if(!updated.meta?.changes)return err("Dossier déjà traité.",409);
        await env.DB.prepare("UPDATE sde_grade_progress SET grade_code=?,grade_since=?,points_total=?,updated_at=? WHERE member_ref=?")
          .bind(g.code,now(),total,now(),row.member_ref).run();
        return json({ok:true,status:"approved",grade:g.label});
      }
      const status=choice==="defer"?"deferred":"rejected";
      const r=await env.DB.prepare("UPDATE sde_grade_promotions SET status=?,reviewed_by=?,decision_reason=?,decision_at=? WHERE id=? AND status='pending'").bind(status,String(u.id),reason,now(),id).run();
      return json({ok:true,status});
    }
    if(path==="/api/grades/directoire/config"&&req.method==="PUT"){
      if(roleLevel(u)<3)return err("Configuration réservée au propriétaire.",403);
      const b=await req.json(),ids=Array.isArray(b.accountIds)?[...new Set(b.accountIds.map(x=>txt(x,160)).filter(Boolean))]:null;
      if(!ids||ids.length>100)return err("Liste de comptes invalide.");
      for(const id of ids){const exists=await env.DB.prepare("SELECT id FROM comptes WHERE id=?").bind(id).first();if(!exists)return err("Compte Directoire introuvable : "+id,404);}
      const statements=[env.DB.prepare("DELETE FROM sde_grade_directoire")];
      for(const id of ids)statements.push(env.DB.prepare("INSERT INTO sde_grade_directoire(account_id,added_by,added_at) VALUES(?,?,?)").bind(id,String(u.id),now()));
      await env.DB.batch(statements);
      return json({ok:true,count:ids.length});
    }
    if(path==="/api/grades/awards"&&req.method==="POST"){
      if(!(await isDirectoire(env,u)))return err("Attribution réservée au Directoire.",403);
      const b=await req.json(),accountId=txt(b.accountId,160),code=txt(b.distinction,60),reason=txt(b.reason,1000);
      if(!accountId||!DISTINCTIONS.some(d=>d.code===code)||reason.length<10)return err("Membre, distinction ou justification invalide.");
      const account=await env.DB.prepare("SELECT id,membreId FROM comptes WHERE id=?").bind(accountId).first();
      if(!account)return err("Compte membre introuvable.",404);
      await env.DB.prepare("INSERT INTO sde_grade_awards(id,member_ref,account_id,distinction_code,reason,awarded_by,awarded_at) VALUES(?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(),String(account.membreId||account.id),account.id,code,reason,String(u.id),now()).run();
      return json({ok:true,message:"Distinction attribuée."},201);
    }
    if(path==="/api/grades/points/queue"&&req.method==="GET"){
      if(roleLevel(u)<1)return err("Accès réservé aux responsables.",403);
      const rows=(await env.DB.prepare("SELECT id,member_ref,account_id,category,activity_code,points,description,evidence_ref,submitted_by,created_at FROM sde_grade_points WHERE status='pending' ORDER BY created_at ASC LIMIT 200").all()).results||[];
      return json({ok:true,queue:rows});
    }
    return err("Route Grades et Distinctions introuvable.",404);
  }catch(e){
    return err("Service Grades et Distinctions temporairement indisponible.",500);
  }
}
