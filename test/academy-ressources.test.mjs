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
