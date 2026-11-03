import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import worker from "../src/worker.js";
import {SOLDIERS_ACADEMY_2027 as PROG} from "../src/soldiers-academy-2027.js";
import {soldiersAcademyApi} from "../src/sde-academy-api.js";
import {lienVideo,lienHttps,PORTEES} from "../src/academy-ressources.js";

const ORIGINE="https://mouvement-sde.org";
function monde(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(readFileSync("schema.sql","utf8"));
  // Les tests historiques simulent un apprenant ayant déjà reçu ses validations.
  // Les nouveaux scénarios d'accès utilisent des comptes sans autorisation initiale.
  sql.exec("CREATE TABLE IF NOT EXISTS academy_2027_acces (compte TEXT NOT NULL,cours TEXT NOT NULL,statut TEXT NOT NULL CHECK(statut IN ('en_attente','approuve','refuse','revoque')),demande_le INTEGER NOT NULL,decision_le INTEGER,decideur TEXT,commentaire TEXT NOT NULL DEFAULT '',PRIMARY KEY(compte,cours))");
  for(const c of PROG.courses)
    sql.prepare("INSERT INTO academy_2027_acces(compte,cours,statut,demande_le) VALUES(?,?,'approuve',1)").run("m1",c.id);
  const stmt=(q,args=[])=>({
    bind:(...a)=>stmt(q,a),
    first:async()=>sql.prepare(q).get(...args)??null,
    all:async()=>({results:sql.prepare(q).all(...args)}),
    run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
    _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
  });
  const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec("BEGIN");try{const o=l.map(s=>s._exec());sql.exec("COMMIT");return o}catch(e){sql.exec("ROLLBACK");throw e}}};
  const env={DB,ASSETS:{fetch:async()=>new Response("x")},PROPRIETAIRES:"chef@exemple.test"};
  let n=0;
  const appel=async(chemin,{methode="GET",corps,cookie}={})=>{
    const h={"content-type":"application/json","cf-connecting-ip":"10.2.0."+(++n%200+1)};
    if(cookie)h.cookie=cookie;
    const r=await worker.fetch(new Request(ORIGINE+chemin,{method:methode,headers:h,body:corps===undefined?undefined:JSON.stringify(corps)}),env,{waitUntil(){}});
    let j=null;try{j=await r.clone().json()}catch{}
    return {statut:r.status,json:j,entetes:r.headers,reponse:r};
  };
  return {sql,env,appel};
}
const direction={connecte:true,id:"d1",nom:"Direction",niveau:2};
const prof={connecte:true,id:"f1",nom:"Mme Enseignante",niveau:0};
const autreProf={connecte:true,id:"f2",nom:"M. Coach",niveau:0};
const eleve={connecte:true,id:"m1",nom:"Soldat Test",niveau:0};
async function api(env,user,methode,chemin,corps){
  const r=await soldiersAcademyApi(new Request(ORIGINE+chemin,{method:methode,headers:{"content-type":"application/json"},body:corps===undefined?undefined:JSON.stringify(corps)}),env,user,chemin.split("?")[0]);
  return {statut:r.status,json:await r.json()};
}
const R="/api/soldiers-academy/ressources";
function comptes(sql){
  for(const [e,id,n] of [["prof@exemple.test","f1","Mme Enseignante"],["coach@exemple.test","f2","M. Coach"],["m1@exemple.test","m1","Soldat Test"]])
    sql.prepare("INSERT INTO comptes(email,id,nom,role,cree) VALUES(?,?,?,?,?)").run(e,id,n,"attente",1);
}

test("Liens de vidéo : seuls YouTube et Vimeo en https sont intégrés, les autres adresses sont refusées",()=>{
  assert.deepEqual(lienVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),{fournisseur:"youtube",url:"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"});
  assert.equal(lienVideo("https://youtu.be/dQw4w9WgXcQ?t=5").url,"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(lienVideo("https://www.youtube.com/shorts/dQw4w9WgXcQ").fournisseur,"youtube");
  assert.equal(lienVideo("https://vimeo.com/123456789").url,"https://player.vimeo.com/video/123456789");
  assert.equal(lienVideo("https://vimeo.com/123456789/abcdef1234").url,"https://player.vimeo.com/video/123456789?h=abcdef1234");
  assert.equal(lienVideo("https://player.vimeo.com/video/123456789?h=abcdef1234").url,"https://player.vimeo.com/video/123456789?h=abcdef1234");
  for(const mauvais of ["http://www.youtube.com/watch?v=dQw4w9WgXcQ","javascript:alert(1)","https://evil.example/watch?v=dQw4w9WgXcQ","https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ","https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ","https://www.youtube.com/watch?v=court","","data:text/html,x"])
    assert.equal(lienVideo(mauvais),null,mauvais);
  assert.ok(lienHttps("https://exemple.org/doc.pdf"));
  for(const m of ["http://exemple.org","javascript:alert(1)","https://localhost/x","https://192.168.1.5/x","https://a:b@exemple.org"])assert.equal(lienHttps(m),null,m);
});

test("Désignation : réservée à la direction, avec les cours confiés ; un enseignant ne publie que chez lui",async()=>{
  const {env,sql}=monde();comptes(sql);
  assert.equal((await api(env,eleve,"GET",R+"/gestion")).statut,403,"apprenant sans droit");
  assert.equal((await api(env,eleve,"POST",R,{portee:"GENERAL",type:"note",titre:"Test",texte:"x".repeat(30)})).statut,403);
  assert.equal((await api(env,prof,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:"tous"})).statut,403,"on ne se nomme pas soi-même");
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"inconnu@exemple.test",fonction:"coach",portees:["SA-01"]})).statut,404);
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"pasunrole",portees:["SA-01"]})).statut,400);
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:[]})).statut,400,"au moins un cours");
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01","SA-02","GENERAL","FAUX"]})).statut,201);
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"coach@exemple.test",fonction:"coach",portees:["SA-09"]})).statut,201);
  const g=(await api(env,prof,"GET",R+"/gestion")).json;
  assert.equal(g.fonction,"enseignant");assert.deepEqual(g.autorisees.sort(),["GENERAL","SA-01","SA-02"]);assert.ok(!g.formateurs,"liste d'équipe réservée à la direction");
  const gd=(await api(env,direction,"GET",R+"/gestion")).json;
  assert.equal(gd.fonction,"administrateur");assert.equal(gd.formateurs.length,2);assert.equal(gd.autorisees.length,PORTEES.length);
  /* publication limitée aux cours confiés */
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-03",type:"note",titre:"Hors périmètre",texte:"x".repeat(30)})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"note",titre:"Dans le périmètre",texte:"Voici la leçon complète du jour."})).statut,201);
  assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs/retirer",{compte:"f2"})).json.ok,true);
  assert.equal((await api(env,autreProf,"GET",R+"/gestion")).statut,403,"désignation retirée");
});

test("Publication et diffusion : l'apprenant voit les ressources de son niveau dès qu'elles sont publiées",async()=>{
  const {env,sql}=monde();comptes(sql);
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:"tous"});
  const vue0=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
  assert.deepEqual(vue0.ressources,{generales:[],nouveautes:[],parCours:{}});assert.equal(vue0.formateur,null);
  const c0=(await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json;assert.deepEqual(c0.ressources,[]);
  /* validations */
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Vidéo",url:"https://evil.example/v.mp4"})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Vidéo",url:"javascript:alert(1)"})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"lien",titre:"Lien",url:"http://exemple.org"})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"note",titre:"Courte",texte:"trop court"})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"inconnu",titre:"Titre"})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-99",type:"note",titre:"Titre",texte:"x".repeat(30)})).statut,400);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"x",url:"https://youtu.be/dQw4w9WgXcQ"})).statut,400,"titre trop court");
  /* publications valides */
  const v=await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Introduction au cours",description:"<b>Bienvenue</b>",url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ"});
  assert.equal(v.statut,201);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"exercice",titre:"Exercice d'entraînement",texte:"1. Lisez Jean 3.\n2. Résumez en trois phrases."})).statut,201);
  assert.equal((await api(env,prof,"POST",R,{portee:"GENERAL",type:"fichier",titre:"Guide de l'apprenant",url:"https://exemple.org/guide.pdf"})).statut,201);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"lien",titre:"Brouillon privé",url:"https://exemple.org/x",publie:false})).statut,201);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-09",type:"note",titre:"Cours du niveau II",texte:"Contenu réservé au niveau suivant."})).statut,201);
  const vue=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
  assert.equal(vue.ressources.parCours["SA-01"],2,"le brouillon n'est pas compté");
  assert.equal(vue.ressources.parCours["SA-09"],undefined,"niveau II encore verrouillé");
  assert.equal(vue.ressources.generales.length,1);assert.equal(vue.ressources.generales[0].titre,"Guide de l'apprenant");
  assert.ok(vue.ressources.nouveautes.length>=2&&!vue.ressources.nouveautes.some(x=>x.titre==="Brouillon privé"));
  const c=(await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json;
  assert.equal(c.ressources.length,2);
  const video=c.ressources.find(x=>x.type==="video");
  assert.equal(video.url,"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");assert.equal(video.genre,"youtube");assert.equal(video.auteur,"Mme Enseignante");
  assert.ok(!JSON.stringify(c.ressources).includes("auteurId"),"aucun identifiant interne exposé aux apprenants");
  assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-09")).statut,403,"cours verrouillé : ressources inaccessibles");
  assert.equal(vue.formateur,null);
  assert.equal((await api(env,prof,"GET","/api/soldiers-academy")).json.formateur,"enseignant");
  /* retrait de publication, modification, suppression */
  const id=v.json.id;
  assert.equal((await api(env,prof,"PATCH",R,{id,publie:false})).json.publie,false);
  assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json.ressources.length,1);
  assert.equal((await api(env,prof,"PATCH",R,{id,publie:true,titre:"Introduction (version 2)"})).json.ok,true);
  assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json.ressources.find(x=>x.id===id).titre,"Introduction (version 2)");
  assert.equal((await api(env,prof,"PATCH",R,{id,url:"https://www.youtube.com/watch?v=aaaaaaaaaaa"})).json.ok,true);
  assert.equal(sql.prepare("SELECT url FROM academy_2027_ressources WHERE id=?").get(id).url,"https://www.youtube-nocookie.com/embed/aaaaaaaaaaa");
  assert.equal((await api(env,prof,"POST",R+"/supprimer",{id})).json.ok,true);
  assert.equal((await api(env,prof,"POST",R+"/supprimer",{id})).statut,404);
  assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json.ressources.length,1);
});

test("Supervision : un enseignant ne touche pas aux ressources d'autrui, la direction supervise tout",async()=>{
  const {env,sql}=monde();comptes(sql);
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01"]});
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"coach@exemple.test",fonction:"coach",portees:["SA-01"]});
  const a=(await api(env,prof,"POST",R,{portee:"SA-01",type:"note",titre:"Leçon de Mme",texte:"Contenu de la leçon rédigé par Mme."})).json.id;
  assert.equal((await api(env,autreProf,"PATCH",R,{id:a,titre:"Détournée"})).statut,403);
  assert.equal((await api(env,autreProf,"POST",R+"/supprimer",{id:a})).statut,403);
  assert.equal((await api(env,direction,"PATCH",R,{id:a,publie:false})).json.ok,true,"la direction peut dépublier");
  const g=(await api(env,direction,"GET",R+"/gestion")).json;
  assert.equal(g.ressources.length,1);assert.equal(g.ressources[0].publie,false);assert.equal(g.ressources[0].auteurId,"f1");
  assert.equal((await api(env,direction,"POST",R+"/supprimer",{id:a})).json.ok,true);
});

test("Fichiers de la médiathèque : rattachement limité à ses propres fichiers, types cohérents",async()=>{
  const {env,sql}=monde();comptes(sql);
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:"tous"});
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"coach@exemple.test",fonction:"coach",portees:"tous"});
  const media=(id,genre,auteur,fini=1)=>sql.prepare("INSERT INTO medias(id,titre,genre,nom,mime,taille,morceau,morceaux,stockage,visibilite,auteur,cree,fini) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,"Titre",genre,genre==="video"?"cours.mp4":"guide.pdf",genre==="video"?"video/mp4":"application/pdf",100,8388608,1,"kv","membres",auteur,1,fini);
  media("aaaaaaaaaaaaaaaaaaaa","video","f1");media("bbbbbbbbbbbbbbbbbbbb","video","f2");media("cccccccccccccccccccc","pdf","f1");media("dddddddddddddddddddd","video","f1",0);
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Cours en vidéo",mediaId:"bbbbbbbbbbbbbbbbbbbb"})).statut,400,"fichier d'un autre");
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Cours en vidéo",mediaId:"cccccccccccccccccccc"})).statut,400,"un PDF n'est pas une vidéo");
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Cours en vidéo",mediaId:"dddddddddddddddddddd"})).statut,400,"envoi non terminé");
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Cours en vidéo",mediaId:"../../etc"})).statut,400);
  const ok=await api(env,prof,"POST",R,{portee:"SA-01",type:"video",titre:"Cours en vidéo",mediaId:"aaaaaaaaaaaaaaaaaaaa"});
  assert.equal(ok.statut,201);
  const r=(await api(env,eleve,"GET","/api/soldiers-academy/cours/SA-01")).json.ressources[0];
  assert.equal(r.url,"/m/aaaaaaaaaaaaaaaaaaaa/cours.mp4");assert.equal(r.genre,"video");
  assert.equal((await api(env,prof,"POST",R,{portee:"SA-01",type:"fichier",titre:"Guide PDF",mediaId:"cccccccccccccccccccc"})).statut,201);
  assert.equal((await api(env,direction,"POST",R,{portee:"SA-02",type:"video",titre:"Vidéo de la direction",mediaId:"bbbbbbbbbbbbbbbbbbbb"})).statut,201,"la direction peut rattacher n'importe quel fichier");
  const sup=await api(env,prof,"POST",R+"/supprimer",{id:ok.json.id});assert.equal(sup.json.media,"aaaaaaaaaaaaaaaaaaaa");
});

test("Médiathèque : un enseignant désigné sans rôle de responsable n'accède qu'à ses propres fichiers, visibles des comptes connectés",async()=>{
  const {env,sql,appel}=monde();
  const BON={prenoms:"Awa",nom:"Koné",email:"awa.kone@exemple.test",telephone:"+225 07 78 68 95 73",pays:"Côte d'Ivoire",ville:"Abidjan",motDePasse:"MotDePasse-2027",consentement:true};
  sql.exec("CREATE TABLE preinscriptions_academy (id INTEGER PRIMARY KEY AUTOINCREMENT,nom TEXT,prenom TEXT,email TEXT,telephone TEXT,date_naissance TEXT,ville TEXT,pays TEXT,niveau_souhaite TEXT,motivation TEXT,experience TEXT,eglise_origine TEXT,statut TEXT DEFAULT 'nouvelle',created_at INTEGER DEFAULT 0)");
  const inscrire=async mail=>(await appel("/api/academy-inscription",{methode:"POST",corps:{...BON,email:mail}})).entetes.get("set-cookie").split(";")[0];
  const cookieProf=await inscrire("prof2@exemple.test"),cookieAutre=await inscrire("autre@exemple.test");
  assert.equal((await appel("/api/medias",{cookie:cookieAutre})).json?.medias?.length??0,0,"apprenant ordinaire : liste publique seulement");
  assert.equal((await appel("/api/medias",{methode:"POST",cookie:cookieAutre,corps:{nom:"cours.mp4",taille:1000}})).statut,403,"apprenant ordinaire : pas de téléversement");
  const id=sql.prepare("SELECT id FROM comptes WHERE email=?").get("prof2@exemple.test").id;
  sql.exec("CREATE TABLE IF NOT EXISTS academy_2027_formateurs (compte TEXT PRIMARY KEY, fonction TEXT NOT NULL, portees TEXT NOT NULL DEFAULT '[]', par TEXT NOT NULL, cree INTEGER NOT NULL)");
  sql.prepare("INSERT INTO academy_2027_formateurs(compte,fonction,portees,par,cree) VALUES(?,?,?,?,?)").run(id,"enseignant",JSON.stringify(["SA-01"]),"d1",1);
  const cree=await appel("/api/medias",{methode:"POST",cookie:cookieProf,corps:{nom:"cours.mp4",taille:1000,titre:"Mon cours",visibilite:"responsables"}});
  assert.equal(cree.statut,200);
  assert.equal(sql.prepare("SELECT visibilite,auteur FROM medias WHERE id=?").get(cree.json.id).visibilite,"membres","visibilité forcée : comptes connectés");
  sql.prepare("INSERT INTO medias(id,titre,genre,nom,mime,taille,morceau,morceaux,stockage,visibilite,auteur,cree,fini) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)").run("eeeeeeeeeeeeeeeeeeee","Interne","pdf","interne.pdf","application/pdf",10,8388608,1,"kv","responsables","autre-admin",1);
  const liste=(await appel("/api/medias",{cookie:cookieProf})).json;
  assert.ok(!liste.medias.some(m=>m.id==="eeeeeeeeeeeeeeeeeeee"),"les fichiers internes des responsables restent invisibles");
  const modif=await appel("/api/medias/eeeeeeeeeeeeeeeeeeee",{methode:"DELETE",cookie:cookieProf});
  assert.equal(modif.statut,403,"impossible de modifier le fichier d'autrui");
  const page=await appel("/mon-espace/enseignants",{cookie:cookieProf});
  assert.equal(page.statut,200);
  assert.match(page.entetes.get("content-security-policy"),/frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com/);
  assert.match(page.entetes.get("content-security-policy"),/script-src 'self'/);
  const acad=await appel("/mon-espace/academy",{cookie:cookieProf});
  assert.match(acad.entetes.get("content-security-policy"),/frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.equal((await appel("/mon-espace/enseignants")).statut,302,"connexion requise");
});

test("Interface : pages, scripts externes (CSP), onglets accessibles et animations respectueuses",()=>{
  const lire=f=>readFileSync(f,"utf8");
  const studio=lire("public/vitrine/academy-enseignants.html"),parcours=lire("public/vitrine/sde-academy-parcours.html");
  const css=lire("public/vitrine/sde-academy-onglets.css"),ui=lire("public/vitrine/sde-academy-ui.js"),js=lire("public/vitrine/sde-academy-parcours.js");
  for(const h of [studio,parcours]){assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(h),"aucun script en ligne (CSP script-src 'self')");assert.ok(!/\son[a-z]+\s*=/i.test(h),"aucun gestionnaire en ligne");}
  for(const id of ["tab-publier","tab-liste","tab-equipe","formRessource","formFormateur","champPortee"])assert.ok(studio.includes('id="'+id+'"'),id);
  for(const id of ["mainTabs","tab-parcours","tab-biblio","tab-cohortes","tab-ecoles","tab-projet","pane-biblio","biblioGenerale","studioShortcut"])assert.ok(parcours.includes('id="'+id+'"'),id);
  assert.ok(parcours.includes('role="tablist"')&&parcours.includes('aria-controls="pane-biblio"'));
  assert.match(ui,/ArrowRight/);assert.match(ui,/ArrowLeft/);assert.match(ui,/Home/);
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/@keyframes paneIn/);
  assert.ok(!/innerHTML\s*=\s*r\.(titre|texte|description)/.test(js+ui),"pas d'injection directe");
  assert.match(ui,/youtube-nocookie\\\.com\\\/embed/,"seuls les lecteurs YouTube/Vimeo sont intégrés");
  assert.match(js,/data-onglet-cours/);
});

test("Confidentialité : chaque enseignant consulte ses propres brouillons, la direction supervise tous",async()=>{
 const {env,sql}=monde();comptes(sql);
 await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01"]});
 await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"coach@exemple.test",fonction:"coach",portees:["SA-01"]});
 const a=await api(env,prof,"POST",R,{portee:"SA-01",type:"note",titre:"Brouillon de l'enseignante",texte:"Contenu de travail réservé à l'enseignante.",publie:false});
 const b=await api(env,autreProf,"POST",R,{portee:"SA-01",type:"note",titre:"Brouillon du coach",texte:"Contenu de travail réservé au coach.",publie:false});
 assert.equal(a.statut,201);assert.equal(b.statut,201);
 const profList=(await api(env,prof,"GET",R+"/gestion")).json.ressources;
 const coachList=(await api(env,autreProf,"GET",R+"/gestion")).json.ressources;
 const adminList=(await api(env,direction,"GET",R+"/gestion")).json.ressources;
 assert.deepEqual(profList.map(x=>x.id),[a.json.id],"l'enseignante ne lit pas le brouillon du coach");
 assert.deepEqual(coachList.map(x=>x.id),[b.json.id],"le coach ne lit pas le brouillon de l'enseignante");
 assert.equal(adminList.length,2,"la direction conserve une vue complète");
});

test("Synchronisation bibliothèque : une publication devient visible sans exposer les cours verrouillés",async()=>{
  const {env,sql}=monde();comptes(sql);
  const p="/api/soldiers-academy/ressources/etat";
  const before=await api(env,eleve,"GET",p);
  assert.equal(before.statut,200);
  assert.deepEqual(before.json.ressources,{generales:[],nouveautes:[],parCours:{}});
  assert.equal((await api(env,{connecte:false,id:null,niveau:0},"GET",p)).statut,401);
  await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01","SA-09","GENERAL"]});
  await api(env,prof,"POST",R,{portee:"SA-01",type:"note",titre:"Leçon supplémentaire",texte:"Explications bibliques complémentaires pour les nouveaux inscrits."});
  await api(env,prof,"POST",R,{portee:"GENERAL",type:"note",titre:"Guide pédagogique",texte:"Principes de participation pour les étudiants."});
  await api(env,prof,"POST",R,{portee:"SA-09",type:"note",titre:"Niveau suivant",texte:"Notions ministérielles réservées aux niveaux supérieurs."});
  const after=(await api(env,eleve,"GET",p)).json.ressources;
  assert.equal(after.parCours["SA-01"],1);
  assert.equal(after.parCours["SA-09"],undefined,"Le niveau verrouillé reste invisible.");
  assert.equal(after.generales.length,1);
  assert.ok(after.nouveautes.some(x=>x.titre==="Leçon supplémentaire"));
  const page=readFileSync(new URL("../public/vitrine/sde-academy-parcours.html",import.meta.url),"utf8");
  const script=readFileSync(new URL("../public/vitrine/sde-academy-parcours.js",import.meta.url),"utf8");
  assert.match(page,/id="refreshAcademyResources"/);
  assert.match(page,/id="academySyncStatus"/);
  assert.match(script,/request\("\/ressources\/etat"\)/);
  assert.match(script,/setInterval\(\(\)=>synchroniserRessources\(\),90000\)/);
  assert.match(script,/document\.hidden/);
});

test("Actualisation des supports du cours ouvert : action visible et non destructive pour les évaluations",()=>{
  const page=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
  const script=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
  assert.ok(script.includes("data-refresh-course-resources"),"bouton du cours");
  assert.ok(script.includes("courseResourcesList"),"panneau dédié");
  const debut=script.indexOf("async function actualiserRessourcesCours");
  const fin=script.indexOf("async function submitCopy");
  assert.ok(debut>=0&&fin>debut,"fonction ciblée accessible");
  const fn=script.slice(debut,fin);
  assert.ok(fn.includes('request("/cours/"+encodeURIComponent(id))'),"relecture authentifiée du cours");
  assert.ok(fn.includes("UI.ressourceHtml"),"rendu des supports actualisés");
  assert.ok(!fn.includes("await reload("),"ni les exercices ni la progression ne sont rechargés");
  assert.ok(page.includes("sde-academy-parcours.js?v="),"script versionné pour les navigateurs");
});


test("Love School : dix cours avec conditions visibles et contenus verrouillés",async()=>{
 const {env,sql}=monde();comptes(sql);
 const anon={connecte:false,id:null,niveau:0};
 assert.equal((await api(env,anon,"GET","/api/soldiers-academy/love-school")).statut,401);
 const result=await api(env,eleve,"GET","/api/soldiers-academy/love-school");
 assert.equal(result.statut,200);
 assert.equal(result.json.ecole.title,"Love School");
 assert.equal(result.json.ecole.nature,"bonus");
 assert.equal(result.json.ecole.certification,false);
 assert.deepEqual(result.json.ecole.courses.map(c=>c.id),["LS-01","LS-02","LS-03","LS-04","LS-05","LS-06","LS-07","LS-08","LS-09","LS-10"]);
 for(const c of result.json.ecole.courses){
  assert.ok(c.title.length>12&&c.objectifs.length>=2&&c.conditions.length>=4&&c.restrictions.length>=4);
  assert.equal(c.acces.statut,"verrouille");
  for(const confidential of ["lessons","quiz","ressources","practice","scriptures"])assert.equal(c[confidential],undefined,confidential+" ne doit pas être livré avant validation");
  assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/love-school/cours/"+c.id)).statut,403,c.id);
 }
 assert.equal(PROG.courses.length,24);
 const main=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
 assert.equal(main.courses.length,24);assert.equal(main.progress.passed,0);
 assert.equal(main.programme.durationHours,192);assert.equal(main.certificates.length,0);
});

test("Love School : supports et quiz protégés jusqu'à décision d'un responsable habilité",async()=>{
 const {env,sql}=monde();comptes(sql);
 assert.equal((await api(env,prof,"POST",R,{portee:"LS-01",type:"note",titre:"Ébauche bonus",texte:"Travail pédagogique de réflexion."})).statut,403);
 assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["LS-01"]})).statut,201);
 const gestion=(await api(env,prof,"GET",R+"/gestion")).json;
 assert.ok(gestion.cours.some(c=>c.id==="LS-01"&&c.bonus));
 assert.deepEqual(gestion.autorisees,["LS-01"]);
 assert.equal((await api(env,prof,"POST",R,{portee:"LS-02",type:"note",titre:"Cours non confié",texte:"Contenu qui ne doit pas être publié."})).statut,400);
 const pub=await api(env,prof,"POST",R,{portee:"LS-01",type:"note",titre:"Fiche d'amour",texte:"La bienveillance et le respect sont essentiels."});
 const draft=await api(env,prof,"POST",R,{portee:"LS-01",type:"note",titre:"Brouillon privé",texte:"Brouillon interne pédagogique pour les formateurs.",publie:false});
 assert.equal(pub.statut,201);assert.equal(draft.statut,201);
 const nonApprouve=(await api(env,eleve,"GET","/api/soldiers-academy/love-school")).json;
 assert.ok(!JSON.stringify(nonApprouve).includes("Fiche d'amour"));
 assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/love-school/cours/LS-01")).statut,403);
 const demande=await api(env,eleve,"POST","/api/soldiers-academy/love-school/acces/demander",{cours:"LS-01"});
 assert.equal(demande.statut,201);
 assert.equal((await api(env,eleve,"GET","/api/soldiers-academy/love-school/cours/LS-01")).statut,403);
 assert.equal((await api(env,prof,"PATCH","/api/soldiers-academy/love-school/acces/decision",{cours:"LS-02",compte:"m1",decision:"approuve"})).statut,403,"professeur ne peut valider un cours non confié");
 const decision=await api(env,prof,"PATCH","/api/soldiers-academy/love-school/acces/decision",{cours:"LS-01",compte:"m1",decision:"approuve"});
 assert.equal(decision.statut,200);
 const cours=(await api(env,eleve,"GET","/api/soldiers-academy/love-school/cours/LS-01")).json.cours;
 assert.equal(cours.ressources.length,1);assert.equal(cours.ressources[0].titre,"Fiche d'amour");
 assert.ok(cours.lessons.length>=2);
 assert.ok(!JSON.stringify(cours).includes("Brouillon privé"));
 assert.ok(!JSON.stringify(cours).includes("auteurId"));
 const main=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
 assert.equal(main.courses.length,24);
 assert.equal(main.ressources.parCours["LS-01"],undefined,"Les supports Love School restent hors du cursus principal");
 assert.equal(main.progress.passed,0);
});

test("Love School : onglet interactif, affichage accessible et studio des enseignants",()=>{
 const html=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
 const js=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 const studio=readFileSync("public/vitrine/sde-academy-enseignants.js","utf8");
 const css=readFileSync("public/vitrine/sde-academy-onglets.css","utf8");
 for(const id of ["tab-love","pane-love","loveSchoolCourses","loveSchoolDetail","refreshLoveSchool","loveStatus"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-controls="pane-love"'));
 assert.match(html,/Love School · Bonus/);
 assert.match(js,/request\("\/love-school"\)/);
 assert.match(js,/data-love-course/);
 assert.match(js,/UI\.ressourceHtml/);
 assert.match(js,/location\.hash==="#love-school"/);
 assert.match(studio,/Love School · bonus/);
 assert.match(css,/\.love-hero/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});


test("Love School LS-07 à LS-10 : leçons complètes, exercices, quiz et sources médicales",async()=>{
 const {LOVE_SCHOOL,LOVE_SCHOOL_ADULT_IDS}=await import("../src/love-school.js");
 assert.equal(LOVE_SCHOOL.courses.length,10);
 assert.deepEqual(LOVE_SCHOOL_ADULT_IDS,["LS-09","LS-10"]);
 for(const id of ["LS-07","LS-08","LS-09","LS-10"]){
  const cours=LOVE_SCHOOL.courses.find(c=>c.id===id);
  assert.ok(cours.scriptures.length>=3);
  assert.ok(cours.objectives.length>=4);
  assert.ok(cours.lessons.length>=4);
  assert.ok(cours.lessons.every(l=>l.body.length>=170&&l.reflection.length>=30));
  assert.ok(cours.practice.length>100);
  assert.ok(cours.quiz.length>=3&&cours.quiz.every(q=>q.options.length===3&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3&&q.explanation.length>25));
 }
 const sante=LOVE_SCHOOL.courses.find(x=>x.id==="LS-10");
 assert.ok(sante.references.some(x=>x.url.startsWith("https://www.who.int/")));
 assert.ok(sante.references.some(x=>x.url.startsWith("https://www.cdc.gov/")));
});

test("Love School : cours 18+ réservés aux accès validés et à la déclaration de majorité",async()=>{
 const {env,sql}=monde();comptes(sql);
 const uri="/api/soldiers-academy/love-school/cours/LS-09";
 assert.equal((await api(env,eleve,"GET",uri)).statut,403);
 assert.equal((await api(env,eleve,"POST",uri,{confirmationMajeur:true})).statut,403);
 assert.equal((await api(env,eleve,"POST","/api/soldiers-academy/love-school/acces/demander",{cours:"LS-09"})).statut,403);
 assert.equal((await api(env,{connecte:false,id:null,niveau:0},"POST",uri,{confirmationMajeur:true})).statut,401);
 const avant=await api(env,eleve,"GET","/api/soldiers-academy/love-school");
 assert.equal(avant.statut,200);assert.equal(avant.json.ecole.courses.length,10);
 assert.ok(!JSON.stringify(avant).includes("Grandes familles de positions et confort"));
 assert.ok(!JSON.stringify(avant).includes("IST, contraception et décisions éclairées"));
 const demande=await api(env,eleve,"POST","/api/soldiers-academy/love-school/acces/demander",{cours:"LS-09",confirmationMajeur:true});
 assert.equal(demande.statut,201);
 assert.equal((await api(env,eleve,"POST",uri,{confirmationMajeur:true})).statut,403,"toujours verrouillé en attente");
 const valid=await api(env,direction,"PATCH","/api/soldiers-academy/love-school/acces/decision",{cours:"LS-09",compte:"m1",decision:"approuve"});
 assert.equal(valid.statut,200);
 assert.equal((await api(env,eleve,"GET",uri)).statut,403,"le GET ne divulgue pas le module adulte");
 assert.equal((await api(env,eleve,"POST",uri,{confirmationMajeur:false})).statut,403);
 assert.equal((await api(env,eleve,"POST",uri,{confirmationMajeur:"oui"})).statut,403);
 const adulte=await api(env,eleve,"POST",uri,{confirmationMajeur:true});
 assert.equal(adulte.statut,200);assert.equal(adulte.json.verificationAge,"declarative_non_verifiee");
 assert.ok(adulte.json.cours.lessons.length>=4&&adulte.json.cours.quiz.length>=3);
 const apres=await api(env,eleve,"GET","/api/soldiers-academy/love-school");
 assert.ok(!apres.json.ecole.courses.find(x=>x.id==="LS-09").lessons,"La déclaration et l'accès n'exposent pas les cours au GET standard");
});

test("Love School : notes sensibles invisibles hors du cours autorisé",async()=>{
 const {env,sql}=monde();comptes(sql);
 assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["LS-09","LS-10"]})).statut,201);
 const r1=await api(env,prof,"POST",R,{portee:"LS-09",type:"note",titre:"Ressource confidentielle d'intimité",texte:"Contenu réservé aux cours adultes et aux apprenants ayant confirmé leur majorité."});
 const r2=await api(env,prof,"POST",R,{portee:"LS-10",type:"note",titre:"Santé sexuelle approfondie",texte:"Présentation des principes de prévention des risques et du consentement."});
 assert.equal(r1.statut,201);assert.equal(r2.statut,201);
 const accueil=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
 const etat=(await api(env,eleve,"GET",R+"/etat")).json;
 const normal=(await api(env,eleve,"GET","/api/soldiers-academy/love-school")).json;
 for(const data of [accueil,etat,normal]){
  assert.ok(!JSON.stringify(data).includes("Ressource confidentielle d'intimité"));
  assert.ok(!JSON.stringify(data).includes("Santé sexuelle approfondie"));
 }
 assert.equal(accueil.ressources.parCours["LS-09"],undefined);
 assert.equal(etat.ressources.parCours["LS-10"],undefined);
 await api(env,eleve,"POST","/api/soldiers-academy/love-school/acces/demander",{cours:"LS-09",confirmationMajeur:true});
 await api(env,eleve,"POST","/api/soldiers-academy/love-school/acces/demander",{cours:"LS-10",confirmationMajeur:true});
 for(const id of ["LS-09","LS-10"])assert.equal((await api(env,direction,"PATCH","/api/soldiers-academy/love-school/acces/decision",{cours:id,compte:"m1",decision:"approuve"})).statut,200);
 const adultes=await Promise.all(["LS-09","LS-10"].map(id=>api(env,eleve,"POST","/api/soldiers-academy/love-school/cours/"+id,{confirmationMajeur:true})));
 assert.equal(adultes[0].json.cours.ressources[0].titre,"Ressource confidentielle d'intimité");
 assert.equal(adultes[1].json.cours.ressources[0].titre,"Santé sexuelle approfondie");
 const after=(await api(env,eleve,"GET","/api/soldiers-academy")).json;
 assert.equal(after.progress.passed,0);assert.equal(after.programme.durationHours,192);assert.equal(after.courses.length,24);
});

test("Love School : nouveau design animé contrôlable et textes exacts accessibles",()=>{
 const html=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
 const script=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 const css=readFileSync("public/vitrine/sde-academy-onglets.css","utf8");
 for(const text of ["Aimer avec sagesse. Communiquer avec douceur. Construire avec vérité.","Explorer les cours","Dix cours bonus Love School","Mettre les animations en pause","Je déclare avoir au moins 18 ans"]){
  assert.ok((html+script).includes(text),text);
 }
 for(const phrase of ["Les fondements du cœur","L’art d’aimer et de communiquer","Engagement et intimité responsable","Vérifier ma réponse","ouvrirLoveAdulte","love-motion-paused"]){
  assert.ok((script+css).includes(phrase),phrase);
 }
 assert.match(html,/id="loveMotionToggle" aria-pressed="false"/);
 assert.match(css,/@keyframes loveFloat/);
 assert.match(css,/@keyframes loveBeat/);
 assert.match(css,/@keyframes loveSheen/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});


test("Love School : répartir les dix cours entre Singles, Fiancés et Mariés",async()=>{
 const {LOVE_SCHOOL,LOVE_SCHOOL_PUBLICS}=await import("../src/love-school.js");
 const IDs=new Set(LOVE_SCHOOL.courses.map(c=>c.id));
 assert.equal(IDs.size,10);
 assert.deepEqual(LOVE_SCHOOL_PUBLICS.map(p=>p.id),["singles","fiances","maries"]);
 assert.deepEqual(LOVE_SCHOOL_PUBLICS.map(p=>p.ids.length),[7,8,8]);
 const singles=LOVE_SCHOOL_PUBLICS[0].ids;
 const fiances=LOVE_SCHOOL_PUBLICS[1].ids;
 const maries=LOVE_SCHOOL_PUBLICS[2].ids;
 assert.deepEqual(singles,["LS-01","LS-02","LS-03","LS-04","LS-05","LS-07","LS-08"]);
 assert.deepEqual(fiances,["LS-01","LS-03","LS-04","LS-05","LS-06","LS-07","LS-08","LS-10"]);
 assert.deepEqual(maries,["LS-01","LS-04","LS-05","LS-06","LS-07","LS-08","LS-09","LS-10"]);
 for(const p of LOVE_SCHOOL_PUBLICS){
  assert.ok(p.title.includes("—")&&p.summary.length>40);
  assert.equal(new Set(p.ids).size,p.ids.length,"Pas de cours en double dans le même parcours");
  assert.ok(p.ids.every(id=>IDs.has(id)),"Tous les cours recommandés existent dans Love School");
 }
 assert.ok(!singles.includes("LS-09")&&!singles.includes("LS-10"),"L'intimité adulte ne fait pas partie du parcours Singles");
 assert.ok(fiances.includes("LS-10")&&!fiances.includes("LS-09"),"Les fiancés reçoivent une préparation santé adulte, les positions sont proposées aux mariés");
 assert.ok(maries.includes("LS-09")&&maries.includes("LS-10"),"Les mariés ont accès au parcours d'intimité sur déclaration de majorité");
});

test("Love School : API recommande les parcours sans enregistrer de situation matrimoniale",async()=>{
 const {env,sql}=monde();comptes(sql);
 const response=await api(env,eleve,"GET","/api/soldiers-academy/love-school");
 assert.equal(response.statut,200);
 const parcours=response.json.ecole.parcours;
 assert.equal(parcours.length,3);
 assert.ok(parcours[0].title.startsWith("Singles"));
 assert.ok(parcours[1].title.startsWith("Fiancés"));
 assert.ok(parcours[2].title.startsWith("Mariés"));
 assert.equal(response.json.ecole.courses.length,10);
 assert.ok(!response.json.ecole.courses.find(c=>c.id==="LS-09").lessons,"Le filtre n'ouvre pas les cours adultes");
 const normal=await api(env,eleve,"GET","/api/soldiers-academy");
 assert.equal(normal.json.courses.length,24);
 assert.equal(normal.json.programme.durationHours,192);
 assert.equal(normal.json.progress.passed,0);
 assert.equal(normal.json.certificates.length,0);
});

test("Love School : commandes de filtres accessibles et sélection temporaire sur mobile",()=>{
 const html=readFileSync("public/vitrine/sde-academy-parcours.html","utf8");
 const js=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 const css=readFileSync("public/vitrine/sde-academy-onglets.css","utf8");
 for(const id of ["tous","singles","fiances","maries"]){
  assert.ok(html.includes('data-love-public="'+id+'"'),"Bouton du parcours "+id);
 }
 assert.ok(html.includes('id="loveAudienceChoices" role="group"'));
 assert.ok(html.includes('id="loveAudienceSummary" aria-live="polite"'));
 assert.ok(html.includes('aria-pressed="true"'));
 assert.match(html,/Ce choix reste libre et n'enregistre aucune information/);
 assert.match(js,/lovePublicActif="tous"/);
 assert.match(js,/bouton\.setAttribute\("aria-pressed"/);
 assert.match(js,/parcours\.ids\.map/);
 assert.match(js,/loveSelected=null/);
 assert.match(css,/\.love-audience-choices/);
 assert.match(css,/\.love-audience-choice\[aria-pressed="true"\]/);
 assert.match(css,/@media\(max-width:480px\)/);
 const section=js.slice(js.indexOf("let loveSchool="),js.indexOf("function renderBiblio()"));
 assert.ok(!section.includes('localStorage.setItem'),"Le choix Singles, Fiancés, Mariés n'est pas sauvegardé");
});


test("Soldiers Academy : 24 fiches admission avec objectifs, conditions et restrictions visibles sans contenu",async()=>{
 const {env,sql}=monde();comptes(sql);
 const nouveau={connecte:true,id:"m2",nom:"Nouvel apprenant",niveau:0};
 const r=await api(env,nouveau,"GET","/api/soldiers-academy");
 assert.equal(r.statut,200);
 assert.equal(r.json.courses.length,24);
 assert.equal(r.json.programme.durationHours,192);
 assert.equal(r.json.progress.passed,0);
 for(const c of r.json.courses){
  assert.equal(c.acces.statut,"verrouille");
  assert.ok(c.locked,c.id+" verrouillé tant que le coach n'a pas validé");
  assert.ok(c.objectifs.length>=3,c.id+" objectifs");
  assert.ok(c.conditions.length>=5,c.id+" conditions");
  assert.ok(c.restrictions.length>=5,c.id+" restrictions");
  assert.ok(c.description.length>=50,c.id+" présentation");
  assert.ok(!("units" in c)&&!("quiz" in c&&Array.isArray(c.quiz)),c.id+" ne divulgue pas de leçons ni d'évaluations");
  assert.equal((await api(env,nouveau,"GET","/api/soldiers-academy/cours/"+c.id)).statut,403,c.id+" inaccessible en direct");
 }
 assert.equal((await api(env,nouveau,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"quiz",answers:Array(5).fill("Réponse argumentée de validation préalable")})).statut,403);
 assert.equal((await api(env,nouveau,"POST","/api/soldiers-academy/acces/demander",{cours:"SA-09"})).statut,403,"niveau II reste subordonné à la validation du niveau I");
});

test("Soldiers Academy : approbation nominative, périmètre enseignant et révocation réels",async()=>{
 const {env,sql}=monde();comptes(sql);
 const nouveau={connecte:true,id:"m2",nom:"Nouvel apprenant",niveau:0},url="/api/soldiers-academy/acces";
 const req=await api(env,nouveau,"POST",url+"/demander",{cours:"SA-01"});
 assert.equal(req.statut,201);assert.equal(req.json.statut,"en_attente");
 assert.equal((await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-01")).statut,403);
 const metadata=(await api(env,nouveau,"GET","/api/soldiers-academy")).json.courses[0];
 assert.equal(metadata.acces.statut,"en_attente");assert.equal(metadata.locked,true);
 assert.equal((await api(env,nouveau,"GET",url+"/gestion")).statut,403);
 assert.equal((await api(env,prof,"GET",url+"/gestion")).statut,403);
 assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"enseignant",portees:["SA-01"]})).statut,201);
 assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"coach@exemple.test",fonction:"coach",portees:["SA-02"]})).statut,201);
 const queue=(await api(env,prof,"GET",url+"/gestion")).json;
 assert.ok(queue.demandes.some(x=>x.cours==="SA-01"&&x.compte==="m2"));
 assert.deepEqual(queue.autorisees,["SA-01"]);
 assert.equal((await api(env,autreProf,"PATCH",url+"/decision",{cours:"SA-01",compte:"m2",decision:"approuve"})).statut,403,"coach non affecté");
 assert.equal((await api(env,prof,"PATCH",url+"/decision",{cours:"SA-01",compte:"f1",decision:"approuve"})).statut,403,"l'enseignant ne valide pas son compte");
 assert.equal((await api(env,prof,"PATCH",url+"/decision",{cours:"SA-01",compte:"m2",decision:"approuve",commentaire:"Les conditions ont été lues."})).statut,200);
 const unlocked=(await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-01")).json;
 assert.ok(unlocked.course.units.length>=4&&unlocked.course.quiz.length>=5);
 assert.equal((await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-02")).statut,403,"un module validé ne donne pas accès au suivant");
 const submitted=await api(env,nouveau,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"quiz",answers:Array(5).fill("Réponse argumentée de validation pédagogique.")});
 assert.equal(submitted.statut,201,JSON.stringify(submitted.json));
 assert.equal((await api(env,prof,"PATCH",url+"/decision",{cours:"SA-01",compte:"m2",decision:"revoque"})).statut,200);
 assert.equal((await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-01")).statut,403,"lecture bloquée après révocation");
 assert.equal((await api(env,nouveau,"POST","/api/soldiers-academy/soumettre",{courseId:"SA-01",type:"exam",answers:Array(3).fill("Réponse argumentative de contrôle.")})).statut,403,"l'examen est aussi bloqué");
 assert.equal((await api(env,nouveau,"POST",url+"/demander",{cours:"SA-01"})).statut,201,"réinscription possible");
});

test("Soldiers Academy : les ressources des cours et niveaux verrouillés ne traversent aucun endpoint",async()=>{
 const {env,sql}=monde();comptes(sql);
 const nouveau={connecte:true,id:"m2",nom:"Nouvel apprenant",niveau:0};
 assert.equal((await api(env,direction,"POST","/api/soldiers-academy/formateurs",{compte:"prof@exemple.test",fonction:"coach",portees:["SA-01","SA-02","N1"]})).statut,201);
 for(const p of ["SA-01","SA-02","N1"]){
  const r=await api(env,prof,"POST",R,{portee:p,type:"note",titre:"Support "+p,texte:"Enseignement supplémentaire réservé aux apprenants du niveau."});
  assert.equal(r.statut,201);
 }
 let accueil=(await api(env,nouveau,"GET","/api/soldiers-academy")).json;
 assert.ok(!JSON.stringify(accueil).includes("Support SA-01"));
 assert.deepEqual(accueil.ressources.parCours,{});
 assert.equal((await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-01")).statut,403);
 assert.equal((await api(env,nouveau,"GET",R+"/etat")).json.ressources.parCours["SA-01"],undefined);
 await api(env,nouveau,"POST","/api/soldiers-academy/acces/demander",{cours:"SA-01"});
 await api(env,prof,"PATCH","/api/soldiers-academy/acces/decision",{cours:"SA-01",compte:"m2",decision:"approuve"});
 const cours=(await api(env,nouveau,"GET","/api/soldiers-academy/cours/SA-01")).json;
 assert.equal(cours.ressources.length,1);assert.equal(cours.ressources[0].titre,"Support SA-01");
 accueil=(await api(env,nouveau,"GET","/api/soldiers-academy")).json;
 assert.equal(accueil.ressources.parCours["SA-01"],1);
 assert.equal(accueil.ressources.parCours["SA-02"],undefined);
 assert.ok(!JSON.stringify(accueil).includes("Support N1"),"ressource de niveau reste cachée tant que les 8 cours ne sont pas autorisés");
 assert.equal(accueil.progress.passed,0);
});

test("Soldiers Academy : acquis antérieurs conservés sans nouvelle demande et progression non effacée",async()=>{
 const {env,sql}=monde();comptes(sql);
 const ancien={connecte:true,id:"m2",nom:"Ancien apprenant",niveau:0};
 await api(env,ancien,"GET","/api/soldiers-academy");
 sql.prepare("INSERT INTO academy_2027_submissions(id,compte,cours,type,reponses,statut,score,date_soumission) VALUES(?,?,?,'quiz','[]','note',90,1)").run("ancien_quiz","m2","SA-01");
 let r=await api(env,ancien,"GET","/api/soldiers-academy");
 assert.equal(r.json.courses[0].acces.statut,"approuve");
 assert.equal(r.json.courses[0].acces.anterieurementCommence,true);
 assert.equal((await api(env,ancien,"GET","/api/soldiers-academy/cours/SA-01")).statut,200);
 assert.equal(r.json.progress.passed,0,"une ancienne note ne dispense pas des critères d'évaluation");
 assert.equal(r.json.certificates.length,0);
});

test("Studio Academy : file de validation commune aux 34 cours avec refus et commentaires sécurisés",()=>{
 const html=readFileSync("public/vitrine/academy-enseignants.html","utf8");
 const js=readFileSync("public/vitrine/sde-academy-enseignants.js","utf8");
 const espace=readFileSync("public/vitrine/sde-academy-parcours.js","utf8");
 const route=readFileSync("src/sde-academy-api.js","utf8");
 for(const id of ["tab-validations","pane-validations","loveDemandes","loveValiderActualiser","loveValidationBadge"])assert.ok(html.includes('id="'+id+'"'));
 assert.match(js,/\/acces\/gestion/);
 assert.match(js,/\/love-school\/acces\/gestion/);
 assert.match(js,/data-acces-source/);
 assert.match(js,/\/acces\/decision/);
 assert.match(js,/\/love-school\/acces\/decision/);
 assert.match(espace,/avantCoursAcademy/);
 assert.match(espace,/data-sa-demander/);
 assert.match(espace,/data-love-demander/);
 assert.match(espace,/Objectifs du cours/);
 assert.match(espace,/Restrictions et règles de protection/);
 assert.match(route,/academyAutorise\(env,account,c/);
});

test("Identité Soldiers Academy : bleu nuit, or, violet, insignes de niveau, brevet imprimable, Love School préservée",()=>{
  const lire=f=>readFileSync(f,"utf8");
  const css=lire("public/vitrine/sde-academy-identite.css"),parcours=lire("public/vitrine/sde-academy-parcours.html"),studio=lire("public/vitrine/academy-enseignants.html"),js=lire("public/vitrine/sde-academy-parcours.js");
  for(const [nom,h] of [["parcours",parcours],["studio",studio]]){
    assert.ok(h.indexOf("sde-academy-onglets.css")>0&&h.indexOf("sde-academy-onglets.css")<h.indexOf("sde-academy-identite.css"),nom+" : l'identité se charge après la base");
  }
  for(const couleur of ["#6B4FA0","#D4AF37","#071525"])assert.ok(css.includes(couleur),couleur);
  assert.match(css,/\.insigne/);assert.match(css,/\.brevet/);assert.match(css,/@media print/);
  assert.match(css,/#tab-love\[aria-selected=true\]/,"l'onglet Love School garde son accent bordeaux");
  assert.ok(!/\.love-/.test(css),"aucune règle ne modifie les composants propres à la Love School");
  assert.match(js,/class="insigne/);assert.match(js,/\['I','II','III'\]/);assert.match(js,/class="brevet"/);assert.match(js,/logo-96\.png/);
  assert.ok(parcours.includes("Ézéchiel 37.10"),"le verset de base figure dans l'espace");
});
