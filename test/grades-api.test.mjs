import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {gradesApi} from "../src/grades-api.js";

function world(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(`
    CREATE TABLE comptes(email TEXT PRIMARY KEY,id TEXT NOT NULL,nom TEXT,role TEXT NOT NULL DEFAULT 'attente',membreId TEXT,matricule TEXT);
    CREATE TABLE docs(path TEXT PRIMARY KEY,parent TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,maj INTEGER NOT NULL);
  `);
  const statement=(query,args=[])=>({
    bind(...values){return statement(query,values);},
    async first(){return sql.prepare(query).get(...args)||null;},
    async all(){return {results:sql.prepare(query).all(...args)};},
    async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(r.changes||0)}};}
  });
  const DB={
    prepare:q=>statement(q),
    async batch(items){
      sql.exec("BEGIN");
      try{const out=[];for(const item of items){const q=item;out.push(await q.run());}sql.exec("COMMIT");return out;}
      catch(e){sql.exec("ROLLBACK");throw e;}
    }
  };
  const account=(id,role="soldat",memberId=null)=>{
    sql.prepare("INSERT INTO comptes(email,id,nom,role,membreId,matricule) VALUES(?,?,?,?,?,?)")
      .run(id+"@sde.test",id,"Membre "+id,role,memberId,"SDE-"+id);
    return {connecte:true,id,nom:"Membre "+id,niveau:({soldat:0,contributeur:1,admin:2,proprietaire:3}[role]||0),role,membreId,matricule:"SDE-"+id};
  };
  return {sql,env:{DB},account};
}
const req=(method="GET",body)=>new Request("https://app.mouvement-sde.org/api/grades/me",{method,headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
async function call(env,user,path,method="GET",body){
  const r=await gradesApi(req(method,body),env,user,path);
  return {status:r.status,data:await r.json()};
}

test("Grades SDE : authentification, catalogue et progression personnelle",async()=>{
  const w=world(),member=w.account("m1");
  assert.equal((await call(w.env,{connecte:false},"/api/grades/me")).status,401);
  const c=await call(w.env,member,"/api/grades/catalog");
  assert.equal(c.status,200);
  assert.deepEqual(c.data.grades.map(x=>x.points),[0,100,250,450,700,1000,1400]);
  const p=await call(w.env,member,"/api/grades/me");
  assert.equal(p.status,200);
  assert.equal(p.data.profile.grade.code,"recrue_iii");
  assert.equal(p.data.profile.totalPoints,0);
});

test("Points : preuve obligatoire, attribution en attente et validation sans auto-validation",async()=>{
  const w=world(),submitter=w.account("leader","contributeur"),validator=w.account("validator","contributeur"),member=w.account("m1");
  const missing=await call(w.env,submitter,"/api/grades/points","POST",{accountId:member.id,category:"rev",activity:"evangelism_mission"});
  assert.equal(missing.status,400);
  const created=await call(w.env,submitter,"/api/grades/points","POST",{accountId:member.id,category:"rev",activity:"evangelism_mission",description:"Mission terrain validée",evidenceRef:"rapport:REV-2026-001",idempotencyKey:"rev-001"});
  assert.equal(created.status,201);
  assert.equal((await call(w.env,member,"/api/grades/me")).data.profile.totalPoints,0);
  const own=await call(w.env,submitter,"/api/grades/points/"+created.data.id+"/review","PATCH",{decision:"approve"});
  assert.equal(own.status,403);
  const approved=await call(w.env,validator,"/api/grades/points/"+created.data.id+"/review","PATCH",{decision:"approve"});
  assert.equal(approved.status,200);
  assert.equal(approved.data.totalPoints,25);
  const duplicate=await call(w.env,submitter,"/api/grades/points","POST",{accountId:member.id,category:"rev",activity:"evangelism_mission",description:"Mission terrain validée",evidenceRef:"rapport:REV-2026-001",idempotencyKey:"rev-001"});
  assert.equal(duplicate.status,409);
});

test("Promotion : seuils et ancienneté contrôlés, décision réservée au Directoire",async()=>{
  const w=world(),member=w.account("m1"),owner=w.account("owner","proprietaire"),directoire=w.account("dir");
  await call(w.env,member,"/api/grades/me");
  const ref=member.id;
  const old=Date.now()-45*86400000;
  await w.env.DB.prepare("UPDATE sde_grade_progress SET grade_since=? WHERE member_ref=?").bind(old,ref).run();
  await w.env.DB.prepare("INSERT INTO sde_grade_points(id,member_ref,account_id,category,activity_code,points,description,evidence_ref,submitted_by,status,period_key,idempotency_key,created_at) VALUES('p1',? ,?,'rev','evangelism_mission',100,'Mission validée','rapport:test','leader','approved','2026-11','seed-1',?)")
    .bind(ref,member.id,old).run();
  const submit=await call(w.env,member,"/api/grades/promotion","POST",{});
  assert.equal(submit.status,201);
  const denied=await call(w.env,directoire,"/api/grades/promotion/"+submit.data.id+"/decision","PATCH",{decision:"approve",reason:"Décision"});
  assert.equal(denied.status,403);
  const config=await call(w.env,owner,"/api/grades/directoire/config","PUT",{accountIds:[directoire.id]});
  assert.equal(config.status,200);
  const approved=await call(w.env,directoire,"/api/grades/promotion/"+submit.data.id+"/decision","PATCH",{decision:"approve",reason:"Dossier vérifié et conditions remplies."});
  assert.equal(approved.status,200);
  const profile=await call(w.env,member,"/api/grades/me");
  assert.equal(profile.data.profile.grade.code,"recrue_ii");
});

test("Distinction : attribution réservée au Directoire et visible dans le parcours",async()=>{
  const w=world(),owner=w.account("owner","proprietaire"),member=w.account("m1");
  await call(w.env,owner,"/api/grades/directoire/config","PUT",{accountIds:[owner.id]});
  const denied=await call(w.env,member,"/api/grades/awards","POST",{accountId:member.id,distinction:"fidelite",reason:"Engagement fidèle et documenté durant la période."});
  assert.equal(denied.status,403);
  const awarded=await call(w.env,owner,"/api/grades/awards","POST",{accountId:member.id,distinction:"fidelite",reason:"Engagement fidèle et documenté durant la période."});
  assert.equal(awarded.status,201);
  const profile=await call(w.env,member,"/api/grades/me");
  assert.equal(profile.data.profile.distinctions[0].distinction_code,"fidelite");
});
