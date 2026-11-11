/* Encodeur WebP de secours SDE : navigateur Chrome/Chromium préinstallé.
   Aucun réseau, aucun paquet APT, aucune donnée utilisateur. Entrées : médias
   publics du dépôt ; conversion en local via CDP Page.captureScreenshot. */
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const [input,output,wArg='960',hArg='960',qualityArg='72']=process.argv.slice(2);
if(!input||!output||!existsSync(input))throw Error('Usage : input output [maxWidth] [maxHeight] [quality]');
const chrome=[process.env.SDE_CHROME_EXECUTABLE,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
 .find(p=>p&&existsSync(p));
if(!chrome)throw Error('Google Chrome / Chromium absent');
const original=readFileSync(input);
if(original.length>16*1024*1024)throw Error('Image trop grande');
const mime=/\.png$/i.test(input)?'image/png':/\.webp$/i.test(input)?'image/webp':'image/jpeg';
const dir=mkdtempSync(join(tmpdir(),'sde-webp-'));
const profile=join(dir,'profile');
const markup='<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}img{display:block}</style></head><body><img src="data:'+
 mime+';base64,'+original.toString('base64')+'"></body></html>';
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--no-first-run','--user-data-dir='+profile,'--remote-debugging-port=0','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let socket;
try{
 let port=0;
 for(let i=0;i<100;i++){
  const file=join(profile,'DevToolsActivePort');
  if(existsSync(file)){port=Number(readFileSync(file,'utf8').split('\n')[0]);break;}
  if(child.exitCode!==null)throw Error('Chrome a quitté : '+child.exitCode);
  await sleep(125);
 }
 if(!port)throw Error('Délai de lancement Chrome dépassé');
 let page;
 for(let i=0;i<40;i++){
  try{
   const response=await fetch('http://127.0.0.1:'+port+'/json/list');
   page=(await response.json()).find(p=>p.type==='page'&&p.webSocketDebuggerUrl);
   if(page)break;
  }catch{}
  await sleep(100);
 }
 if(!page)throw Error('Aucune page Chrome disponible');
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{
  socket.addEventListener('open',ok,{once:true});
  socket.addEventListener('error',fail,{once:true});
 });
 let serial=0;
 const inflight=new Map();
 socket.addEventListener('message',e=>{
  const msg=JSON.parse(e.data);
  if(!msg.id||!inflight.has(msg.id))return;
  const pending=inflight.get(msg.id);
  inflight.delete(msg.id);
  msg.error?pending.reject(Error(msg.error.message)):pending.resolve(msg.result);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;
  inflight.set(id,{resolve,reject});
  socket.send(JSON.stringify({id,method,params}));
 });
 await send('Page.enable');
 await send('Runtime.enable');
 const nav=await send('Page.navigate',{url:'about:blank'});
 await send('Page.setDocumentContent',{frameId:nav.frameId,html:markup});
 let dimensions;
 for(let i=0;i<70;i++){
  const reply=await send('Runtime.evaluate',{
   expression:"(()=>{const image=document.querySelector('img');return image&&image.complete&&image.naturalWidth?{width:image.naturalWidth,height:image.naturalHeight}:null})()",
   returnByValue:true
  });
  dimensions=reply.result?.value;
  if(dimensions)break;
  await sleep(100);
 }
 if(!dimensions)throw Error('Impossible de décoder l’image');
 const factor=Math.min(1,Number(wArg)/dimensions.width,Number(hArg)/dimensions.height);
 const width=Math.max(1,Math.round(dimensions.width*factor));
 const height=Math.max(1,Math.round(dimensions.height*factor));
 if(!Number.isFinite(factor)||width>2000||height>2000)throw Error('Dimensions invalides');
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
 await send('Runtime.evaluate',{
  expression:"(()=>{const image=document.querySelector('img');image.width="+width+";image.height="+height+";return true})()",
  returnByValue:true
 });
 await sleep(160);
 const response=await send('Page.captureScreenshot',{
  format:'webp',quality:Number(qualityArg),captureBeyondViewport:false,fromSurface:true
 });
 const data=Buffer.from(response.data,'base64');
 if(data.length<1000||data.subarray(0,4).toString()!=='RIFF'||data.subarray(8,12).toString()!=='WEBP')
  throw Error('Encodage WebP invalide');
 writeFileSync(output,data);
 console.log('SDE_CHROME_WEBP '+JSON.stringify({width,height,bytes:data.length}));
}finally{
 try{socket?.close()}catch{}
 child.kill('SIGKILL');
 try{rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}
}