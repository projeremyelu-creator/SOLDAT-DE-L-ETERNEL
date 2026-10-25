/* Vérification HTTP production : lecture seule, aucun compte ni dossier consulté. */
const host="https://app.mouvement-sde.org";
const tasks=[
 ["/os/","SDE OS v3.1"],
 ["/os/os.css?v=31a","data-paradigme"],
 ["/os/os.js?v=31a","form-eval"],
 ["/os/manifest.webmanifest","SDE OS"],
 ["/os/sw.js","sde-os-shell"],
 ["/","SDE"],
];
let failed=false;
for(const [path,expect] of tasks){
 try{
  const res=await fetch(host+path,{redirect:"follow",headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(20000)});
  const body=await res.text();
  const ok=res.ok&&body.includes(expect);
  console.log(JSON.stringify({path,status:res.status,contains:body.includes(expect),bytes:body.length,result:ok?"OK":"FAIL"}));
  if(!ok)failed=true;
 }catch(error){console.log(JSON.stringify({path,result:"FAIL",error:String(error)}));failed=true;}
}
for(const [path,method] of [["/api/os/bootstrap","GET"],["/api/os/evaluation","GET"]]){
 try{
  const res=await fetch(host+path,{method,redirect:"manual",headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(15000)});
  const body=await res.text();
  const ok=res.status===401&&body.includes("connexion");
  console.log(JSON.stringify({path,status:res.status,anonymousProtection:ok?"OK":"FAIL"}));
  if(!ok)failed=true;
 }catch(error){console.log(JSON.stringify({path,result:"FAIL",error:String(error)}));failed=true;}
}
if(failed){console.error("SDE OS LIVE VERIFICATION INCOMPLETE");process.exitCode=1;}
else console.log("SDE OS v3.1 LIVE VERIFICATION SUCCESS");
