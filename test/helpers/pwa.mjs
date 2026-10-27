import {JSDOM} from 'jsdom';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
export async function checkPublicRegistration(){
 for(const [host,expected]of [['mouvement-sde.org',1],['app.mouvement-sde.org',0],['example.org',0]]){
  const dom=new JSDOM('<body></body>',{url:'https://'+host+'/',runScripts:'outside-only'});try{const calls=[];Object.defineProperty(dom.window.document,'readyState',{value:'complete',configurable:true});Object.defineProperty(dom.window.navigator,'serviceWorker',{value:{getRegistrations:async()=>[],register:async(path,opts)=>{calls.push({path,scope:opts.scope})},ready:new Promise(()=>{})}});dom.window.eval(readFileSync('public/vitrine/pwa-public.js','utf8'));await new Promise(r=>setTimeout(r,0));assert.equal(calls.length,expected,host);if(expected)assert.deepEqual(calls,[{path:'/sw-public.js',scope:'/'}])}finally{dom.window.close()}}
}
