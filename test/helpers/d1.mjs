import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../../src/worker.js';
export function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('schema.sql','utf8'));
 const stmt=(q,args=[])=>({bind:(...a)=>stmt(q,a),first:async()=>sql.prepare(q).get(...args)??null,all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>({meta:{changes:sql.prepare(q).run(...args).changes}}),exec:()=>/^\s*(SELECT|WITH)/i.test(q)?{results:sql.prepare(q).all(...args)}:{meta:{changes:sql.prepare(q).run(...args).changes}}});
 const env={PROPRIETAIRES:'owner@example.org',DB:{prepare:q=>stmt(q),batch:async list=>{sql.exec('BEGIN');try{const r=list.map(s=>s.exec());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}},ASSETS:{fetch:async()=>new Response('asset')}};
 const pending=[];
 const ctx={waitUntil:p=>pending.push(p)};
 function account(id,role='soldat',member=id){sql.prepare('INSERT INTO comptes(email,id,nom,role,membreId) VALUES(?,?,?,?,?)').run(id+'@example.org',id,'Compte '+id,role,member);sql.prepare('INSERT INTO sessions(jeton,email,expire) VALUES(?,?,?)').run(id,id+'@example.org',Date.now()+3600000)}
 function doc(path,data){const parts=path.split('/');sql.prepare('INSERT INTO docs(path,parent,id,data,maj) VALUES(?,?,?,?,?)').run(path,parts.slice(0,-1).join('/'),parts.at(-1),JSON.stringify(data),Date.now())}
 async function call(path,id=null,method='GET',data){const r=await worker.fetch(new Request('https://mouvement-sde.org'+path,{method,headers:{...(id?{cookie:'sde_s='+id}:{}),'content-type':'application/json',origin:'https://mouvement-sde.org'},...(data!==undefined?{body:JSON.stringify(data)}:{})}),env,ctx);const body=await r.json();await Promise.allSettled(pending.splice(0));return {status:r.status,body,headers:r.headers}}
 return {sql,env,call,account,doc,close:()=>sql.close()};
}
