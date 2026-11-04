import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {SOLDIERS_ACADEMY_2027 as PROG} from "../src/soldiers-academy-2027.js";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";

const ORIGINE="https://mouvement-sde.org";
function monde(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(readFileSync("schema.sql","utf8"));
  sql.exec("CREATE TABLE IF NOT EXISTS academy_2027_acces (compte TEXT NOT NULL,cours TEXT NOT NULL,statut TEXT NOT NULL CHECK(statut IN ('en_attente','approuve','refuse','revoque')),demande_le INTEGER NOT NULL,decision_le INTEGER,decideur TEXT,commentaire TEXT NOT NULL DEFAULT '',PRIMARY KEY(compte,cours))");
  for(const c of PROG.courses)sql.prepare("INSERT INTO academy_2027_acces(compte,cours,statut,demande_le) VALUES(?,?,'approuve',1)").run("m1",c.id);
  const stmt=(q,args=[])=>({
    bind:(...a)=>stmt(q,a),
    first:async()=>sql.prepare(q).get(...args)??null,
    all:async()=>({results:sql.prepare(q).all(...args)}),
    run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
    _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
  });
  const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec("BEGIN");try{const o=l.map(s=>s._exec());sql.exec("COMMIT");return o}catch(e){sql.exec("ROLLBACK");throw e}}};
  return {sql,env:{DB,ASSETS:{fetch:async()=>new Response("x")},PROPRIETAIRES:"chef@exemple.test"}};
}
const direction={connecte:true,id:"d1",nom:"Direction",niveau:2};
const prof={connecte:true,id:"f1",nom:"Mme Enseignante",niveau:0};
const autreProf={connecte:true,id:"f2",nom:"M. Coach",niveau:0};
const eleve={connecte:true,id:"m1",nom:"Soldat Test",niveau:0};
const eleve2={connecte:true,id:"m2",nom:"Autre Soldat",niveau:0};
async function api(env,user,methode,chemin,corps){
  const r=await soldiersAcademyApi(new Request(ORIGINE+chemin,{method:methode,headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)}),env,user,chemin.split("?")[0]);
  return {statut:r.status,json:await r.json()};
}
const R="/api/soldiers-academy/ressources",P="/api/soldiers-academy/progression";
const note=(portee,titre,extra={})=>({portee,type:"note",titre,texte:"Contenu pédagogique de la leçon. ".repeat(3),...extra});
async function publier(env,sql,portee,titre,cree,extra){
  const r=await api(env,direction,"POST",R,note(portee,titre,extra));
  assert.equal(r.statut,201,titre);
  sql.prepare("UPDATE academy_2027_ressources SET cree=? WHERE id=?").run(cree,r.json.id);
  return r.json.id;
}
function comptes(sql){
  for(const [e,id,n] of [["prof@exemple.test","f1","Mme Enseignante"],["coach@exemple.test","f2","M. Coach"],["m1@exemple.test","m1","Soldat Test"],["m2@exemple.test","m2","Autre Soldat"]])
    sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run(e,id,n,"attente",1);
}
const niveau2=PROG.courses.find(c=>c.level===2).id;

test("Progression : calcul par cours, par niveau, bibliothèque générale et bouton « Reprendre »",async()=>{
  const {env,sql}=monde();comptes(sql);
  const a=await publier(env,sql,"SA-01","Leçon A",1000);
  const b=await publier(env,sql,"SA-01","Leçon B",2000);
  const c=await publier(env,sql,"SA-02","Leçon C",3000);
  const g=await publier(env,sql,"GENERAL","Guide général",4000);
  let d=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
  assert.equal(d.progression.total.total,4);assert.equal(d.progression.total.fait,0);
  assert.deepEqual(d.progression.cours["SA-01"],{fait:0,total:2});
  assert.deepEqual(d.progression.generale,{fait:0,total:1});
  assert.equal(d.progression.niveaux[1].total,3);
  assert.equal(d.progression.reprendre.id,a,"on reprend à la première leçon publiée, dans l'ordre chronologique");
  assert.equal(d.progression.reprendre.portee,"SA-01");

  let r=await api(env,eleve,"POST",P,{ressource:a,fait:true});
  assert.equal(r.statut,200);assert.deepEqual(r.json.progression.cours["SA-01"],{fait:1,total:2});
  assert.equal(r.json.progression.reprendre.id,b,"la reprise avance à la leçon suivante");
  r=await api(env,eleve,"POST",P,{ressource:a,fait:true});
  assert.equal(r.json.progression.total.fait,1,"marquer deux fois ne compte qu'une fois");
  await api(env,eleve,"POST",P,{ressource:b,fait:true});
  r=await api(env,eleve,"POST",P,{ressource:g,fait:true});
  assert.equal(r.json.progression.reprendre.id,c,"après SA-01, on passe au cours suivant");
  assert.deepEqual(r.json.progression.generale,{fait:1,total:1});
  assert.equal(r.json.progression.total.pourcentage,75);
  r=await api(env,eleve,"POST",P,{ressource:c,fait:true});
  assert.equal(r.json.progression.reprendre,null,"tout est terminé");
  assert.equal(r.json.progression.total.pourcentage,100);
  r=await api(env,eleve,"POST",P,{ressource:b,fait:false});
  assert.deepEqual(r.json.progression.cours["SA-01"],{fait:1,total:2});assert.equal(r.json.progression.reprendre.id,b,"on peut remettre une leçon à faire");

  const cours=(await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json;
  assert.deepEqual(cours.progression,{fait:1,total:2});assert.ok(cours.faites.includes(a)&&!cours.faites.includes(b));
  const etat=(await api(env,eleve,"GET",R+"/etat")).json;
  assert.equal(etat.progression.total.fait,3);
});

test("Progression : strictement personnelle, limitée aux ressources visibles et jamais pour Love School",async()=>{
  const {env,sql}=monde();comptes(sql);
  const g=await publier(env,sql,"GENERAL","Guide général",1000);
  const brouillon=await publier(env,sql,"SA-01","Brouillon",2000,{publie:false});
  const n2=await publier(env,sql,niveau2,"Cours du niveau 2",3000);
  const love=await publier(env,sql,"LS-01","Support Love School",4000);
  await api(env,eleve,"POST",P,{ressource:g,fait:true});
  const autre=(await api(env,eleve2,"GET","/api/soldiers-academy")).json;
  assert.equal(autre.progression.total.fait,0,"la progression d'un apprenant n'apparaît pas chez un autre");
  assert.equal((await api(env,eleve2,"POST",P,{ressource:g,fait:true})).statut,200,"la bibliothèque générale est ouverte à tous");
  for(const [id,raison] of [[brouillon,"brouillon"],[n2,"niveau 2 non ouvert"],[love,"Love School"],["abcdef123456","inconnue"]]){
    const r=await api(env,eleve,"POST",P,{ressource:id,fait:true});
    assert.equal(r.statut,403,raison);
  }
  assert.equal((await api(env,eleve,"POST",P,{ressource:"../x",fait:true})).statut,400);
  assert.equal((await api(env,eleve,"POST",P,{ressource:g})).statut,400,"état obligatoire");
  assert.equal((await api(env,eleve,"POST",P,{ressource:g,fait:"oui"})).statut,400);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM academy_2027_progres WHERE ressource IN (?,?,?)").get(brouillon,n2,love).n,0,"rien d'enregistré pour ces ressources");
  const sans=await soldiersAcademyApi(new Request(ORIGINE+P,{method:"POST",body:"{}"}),env,{connecte:false},P);
  assert.equal(sans.status,401);
});

test("Studio : l'enseignant voit combien d'apprenants ont terminé ses ressources, sans noms et sans voir celles des autres",async()=>{
  const {env,sql}=monde();comptes(sql);
  await api(env,eleve,"GET",R+"/etat");
  for(const [id,f] of [["f1","enseignant"],["f2","coach"]])
    sql.prepare("INSERT INTO academy_2027_formateurs(compte,fonction,portees,par,cree) VALUES(?,?,?,?,?)").run(id,f,JSON.stringify(["SA-01","GENERAL"]),"d1",1);
  const mienne=(await api(env,prof,"POST",R,note("SA-01","Ma leçon"))).json.id;
  const autre=(await api(env,autreProf,"POST",R,note("SA-01","Leçon du coach"))).json.id;
  await api(env,eleve,"POST",P,{ressource:mienne,fait:true});
  await api(env,eleve2,"POST",P,{ressource:mienne,fait:false});
  const gestion=(await api(env,prof,"GET",R+"/gestion")).json;
  assert.equal(gestion.termines[mienne],1);
  assert.equal(gestion.termines[autre],undefined,"pas de données sur les ressources d'un autre enseignant");
  assert.ok(!JSON.stringify(gestion.termines).includes("m1"),"aucun identifiant d'apprenant");
  const sup=(await api(env,direction,"GET",R+"/gestion")).json;
  assert.equal(sup.termines[mienne],1,"la direction supervise toutes les ressources");
});

test("Interface : cases « terminé » accessibles, barres de progression, reprise et suivi enseignant",()=>{
  const lire=f=>readFileSync(f,"utf8");
  const ui=lire("public/vitrine/sde-academy-ui.js"),js=lire("public/vitrine/sde-academy-parcours.js"),css=lire("public/vitrine/sde-academy-onglets.css"),html=lire("public/vitrine/sde-academy-parcours.html"),ens=lire("public/vitrine/sde-academy-enseignants.js");
  assert.ok(ui.includes('data-progres=')&&ui.includes('aria-pressed='),"bouton à bascule accessible");
  assert.ok(ui.includes("progression=null"),"le Studio affiche les ressources sans case de progression");
  assert.ok(js.includes('role="progressbar"')&&js.includes("aria-valuenow"),"barres de progression sémantiques");
  assert.ok(js.includes("Reprendre là où j’en suis")&&js.includes('data-onglet-cours="ressources"'));
  assert.ok(js.includes('request("/progression","POST"'));
  assert.ok(js.includes("Repère personnel : il ne remplace pas les évaluations officielles."),"la progression ne se confond pas avec les notes");
  assert.ok(html.includes('id="reprendre"')&&html.includes('id="biblioProgres"'));
  assert.ok(css.includes(".reprendre{")&&css.includes(".progres.fait")&&css.includes("prefers-reduced-motion"));
  assert.ok(css.includes("min-height:44px"),"cible tactile de 44 px");
  assert.ok(!/love/i.test(lire("src/academy-progression.js").split("*/")[1]),"le module de progression ne traite pas Love School");
  assert.ok(ens.includes("suiviTermines")&&ens.includes("Leçons terminées par les apprenants"));
  for(const f of ["sde-academy-parcours.html","academy-enseignants.html"])assert.ok(lire("public/vitrine/"+f).includes("20271104-progression"),f+" : versions de cache");
});
