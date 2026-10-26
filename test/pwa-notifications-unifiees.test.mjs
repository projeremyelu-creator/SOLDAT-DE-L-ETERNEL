import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const src=readFileSync("public/sw-public.js","utf8");
function fixture() {
 const handlers={};
 const notifications=[];
 const opened=[];
 const windows=[];
 const sw={
  location:{origin:"https://mouvement-sde.org"},
  registration:{showNotification:async(title,options)=>{notifications.push({title,options});}},
  clients:{
   matchAll:async()=>windows,
   openWindow:async(url)=>{opened.push(url);return {url};}
  },
  addEventListener:(name,callback)=>{handlers[name]=callback},
  skipWaiting:async()=>{}
 };
 vm.runInNewContext(src,{self:sw,URL});
 async function push(data) {
  let work=Promise.resolve();
  handlers.push({data:{json:()=>data},waitUntil:p=>{work=Promise.resolve(p)}});
  await work;
  return notifications.at(-1);
 }
 async function click(url) {
  let work=Promise.resolve();
  let closed=false;
  handlers.notificationclick({
   notification:{data:{url},close:()=>{closed=true}},
   waitUntil:p=>{work=Promise.resolve(p)}
  });
  await work;
  return closed;
 }
 return {handlers,notifications,opened,windows,push,click};
}
test("PWA unifiée : notifications internes avec destination protégée",async()=>{
 const o=fixture();
 const info=await o.push({title:"Programme SDE",body:"Rendez-vous",url:"/programmes"});
 assert.equal(info.title,"Programme SDE");
 assert.equal(info.options.data.url,"/programmes");
 assert.equal(await o.click(info.options.data.url),true);
 assert.equal(o.opened.at(-1),"/programmes");
});
test("PWA unifiée : liens externes ou API interdits dans les notifications",async()=>{
 const o=fixture();
 const a=await o.push({title:"Erreur",url:"https://exemple-malicious.test/paiement"});
 assert.equal(a.options.data.url,"/");
 const b=await o.push({title:"Erreur",url:"/api/moi"});
 assert.equal(b.options.data.url,"/");
 const c=await o.push({title:"Ancien portail",url:"https://app.mouvement-sde.org/#connexion"});
 assert.equal(c.options.data.url,"/mon-espace");
});
test("PWA unifiée : SDE OS renvoie à la route privée du même site",async()=>{
 const o=fixture();
 const info=await o.push({url:"/os-v31/#integral"});
 assert.equal(info.options.data.url,"/mon-espace/os-v31#integral");
 await o.click(info.options.data.url);
 assert.equal(o.opened.at(-1),"/mon-espace/os-v31#integral");
});
test("PWA unifiée : l'espace privé et les API sont exclus du cache de pages",()=>{
 const selection=src.slice(src.indexOf("const PAGES"),src.indexOf("const OFFLINE"));
 for(const route of ["/mon-espace","/administration","/connexion","/mon-espace/outils","/administration/os-v31"])
  assert.ok(!selection.includes('"'+route+'"'));
 const pont=readFileSync("public/vitrine/portail-espace.js","utf8");
 assert.match(pont,/serviceWorker.register\("\/sw-public.js"/);
 assert.ok(!pont.includes('serviceWorker.register("/sw.js"'));
});
