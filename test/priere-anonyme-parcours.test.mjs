import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {fixture} from "./helpers/d1.mjs";

const data={sujet:"Prions pour la paix de notre quartier",categorie:"Famille",accord:true,website:""};

test("API : recevoir une intention sans compte ni coordonnées personnelles",async()=>{
 const f=fixture();
 try{
  const r=await f.call("/api/priere-anonyme",null,"POST",data);
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.ok,true);
  const records=f.sql.prepare("SELECT path,data FROM docs WHERE parent='prieres'").all();
  assert.equal(records.length,1);
  const saved=JSON.parse(records[0].data);
  assert.equal(saved.sujet,data.sujet);
  assert.equal(saved.source,"public-anonyme");
  assert.equal(saved.anonyme,true);
  assert.equal(saved.pour,"Anonyme");
  for(const name of ["nom","email","telephone","ip","pourId","creePar"]){
   assert.equal(Object.hasOwn(saved,name),false,name+" ne doit pas être enregistré");
  }
  assert.equal((await f.call("/api/priere-anonyme",null,"GET")).status,404,"Seuls les POST créent un sujet");
 }finally{f.close()}
});

test("API : refuser textes vides, objets, absence de consentement et dépassement de 600 caractères",async()=>{
 const cases=[
  {sujet:"",accord:true},
  {sujet:"   ",accord:true},
  {sujet:{texte:"secret"},accord:true},
  {sujet:"X".repeat(601),accord:true},
  {sujet:"Besoin de prière",accord:false},
  {sujet:"Besoin de prière",accord:true,categorie:{nom:"Divers"}},
 ];
 for(const body of cases){
  const f=fixture();
  try{
   const r=await f.call("/api/priere-anonyme",null,"POST",body);
   assert.equal(r.status,400,JSON.stringify(body).slice(0,80)+": "+JSON.stringify(r.body));
   assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM docs WHERE parent='prieres'").get().n,0);
  }finally{f.close()}
 }
});

test("API : le piège anti-robot n'écrit pas de sujet",async()=>{
 const f=fixture();
 try{
  const response=await f.call("/api/priere-anonyme",null,"POST",{...data,website:"https://exemple.org"});
  assert.equal(response.status,200);
  assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM docs WHERE parent='prieres'").get().n,0);
 }finally{f.close()}
});

test("Interface : erreur réseau ou refus serveur visible et nouvelle tentative possible",async()=>{
 const dom=new JSDOM(readFileSync("public/vitrine/prieres.html","utf8"),{
  url:"https://mouvement-sde.org/priere",runScripts:"outside-only",pretendToBeVisual:true
 });
 try{
  const w=dom.window,d=w.document,requests=[];
  w.fetch=async(url,options)=>{
   requests.push({url,body:JSON.parse(options.body)});
   if(requests.length===1)return{ok:false,json:async()=>({message:"Réessayez plus tard."})};
   return{ok:true,json:async()=>({ok:true,message:"Votre sujet a été reçu anonymement."})};
  };
  w.eval(readFileSync("public/vitrine/initiatives.js","utf8"));
  d.dispatchEvent(new w.Event("DOMContentLoaded"));
  const form=d.querySelector("[data-sde-anonymous-prayer]");
  const submit=form.querySelector('[type="submit"]');
  const status=form.querySelector(".sde-form-feedback");
  assert.equal(form.querySelector('[name="nom"],[name="email"],[name="contact"]'),null);
  form.elements.sujet.value="Sujet fictif de vérification";
  form.elements.accord.checked=true;
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,"/api/priere-anonyme");
  assert.deepEqual(Object.keys(requests[0].body).sort(),["accord","categorie","sujet","website"]);
  assert.equal(status.dataset.state,"error");
  assert.equal(submit.disabled,false);
  form.dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(requests.length,2);
  assert.equal(status.dataset.state,"ok");
  assert.equal(form.elements.sujet.value,"");
  assert.equal(submit.disabled,false);
 }finally{dom.window.close()}
});
