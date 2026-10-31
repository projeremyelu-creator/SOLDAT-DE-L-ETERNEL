/* SDE : publication contrôlée des collectes. Sans données confirmées
   par la direction, ne jamais afficher de pourcentage ou de recette fictive. */
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const error=(message,status=400)=>json({ok:false,message},status);
const PROJECTS={ 'in-fire-2027':'IN FIRE 2027','missions-humanitaires':'Missions humanitaires','soldiers-academy':'Soldiers Academy' };
async function ensure(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_financements(projet TEXT PRIMARY KEY,objectif INTEGER NOT NULL,encaisse INTEGER NOT NULL,reference TEXT NOT NULL,publie INTEGER NOT NULL,maj INTEGER NOT NULL,acteur TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_financements_audit(id TEXT PRIMARY KEY,projet TEXT NOT NULL,objectif INTEGER NOT NULL,encaisse INTEGER NOT NULL,reference TEXT NOT NULL,acteur TEXT NOT NULL,maj INTEGER NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_bilans_trimestriels(periode TEXT PRIMARY KEY,texte TEXT NOT NULL,reference TEXT NOT NULL,valideLe INTEGER NOT NULL,validePar TEXT NOT NULL,publie INTEGER NOT NULL)').run();
}
export async function financesPubliques(req,env,u){
 const path=new URL(req.url).pathname;
 if(!['/api/sde-financements','/api/sde-bilans'].includes(path))return null;
 if(!['GET','POST'].includes(req.method))return error('Méthode non autorisée.',405);
 await ensure(env);
 if(req.method==='GET'){
  if(path==='/api/sde-financements'){
   const r=await env.DB.prepare('SELECT projet,objectif,encaisse,maj FROM sde_financements WHERE publie=1').all();
   const rows=new Map((r.results||[]).map(x=>[x.projet,x]));
   return json({devise:'XOF',projets:Object.entries(PROJECTS).map(([id,titre])=>{
    const x=rows.get(id);
    return {id,titre,donneesVerifiees:!!x,objectif:x?.objectif??null,encaisse:x?.encaisse??null,actualiseLe:x?.maj??null};
   })});
  }
  const result=await env.DB.prepare('SELECT periode,texte,valideLe FROM sde_bilans_trimestriels WHERE publie=1 ORDER BY periode DESC LIMIT 12').all();
  return json({rapports:result.results||[]});
 }
 if(!u?.connecte||u.niveau<3)return error('Publication financière réservée au propriétaire.',403);
 if((req.headers.get('content-type')||'').indexOf('application/json')<0)return error('JSON attendu.',415);
 let b;try{const raw=await req.text();if(raw.length>4500)return error('Données trop volumineuses.',413);b=JSON.parse(raw);}catch{return error('Données invalides.')}
 if(path==='/api/sde-financements'){
  const projet=String(b?.projet||''),objectif=Number(b?.objectif),encaisse=Number(b?.encaisse),reference=String(b?.reference||'').trim().slice(0,160),publie=b?.publie===true;
  if(!Object.hasOwn(PROJECTS,projet))return error('Projet inconnu.');
  if(!Number.isSafeInteger(objectif)||objectif<=0||objectif>1000000000||!Number.isSafeInteger(encaisse)||encaisse<0||encaisse>1000000000)return error('Montants XOF invalides.');
  if(reference.length<8)return error('Une référence de rapprochement comptable est obligatoire.');
  const now=Date.now();
  await env.DB.prepare('INSERT INTO sde_financements(projet,objectif,encaisse,reference,publie,maj,acteur) VALUES(?,?,?,?,?,?,?) ON CONFLICT(projet) DO UPDATE SET objectif=excluded.objectif,encaisse=excluded.encaisse,reference=excluded.reference,publie=excluded.publie,maj=excluded.maj,acteur=excluded.acteur').bind(projet,objectif,encaisse,reference,publie?1:0,now,u.id).run();
  await env.DB.prepare('INSERT INTO sde_financements_audit(id,projet,objectif,encaisse,reference,acteur,maj) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),projet,objectif,encaisse,reference,u.id,now).run();
  return json({ok:true,publie});
 }
 const periode=String(b?.periode||''),texte=String(b?.texte||'').trim(),reference=String(b?.reference||'').trim(),publie=b?.publie===true;
 if(!/^20\d\d-Q[1-4]$/.test(periode)||texte.length<40||texte.length>3500||reference.length<8||reference.length>160)return error('Bilan trimestriel incomplet ou invalide.');
 await env.DB.prepare('INSERT INTO sde_bilans_trimestriels(periode,texte,reference,valideLe,validePar,publie) VALUES(?,?,?,?,?,?) ON CONFLICT(periode) DO UPDATE SET texte=excluded.texte,reference=excluded.reference,valideLe=excluded.valideLe,validePar=excluded.validePar,publie=excluded.publie').bind(periode,texte,reference,Date.now(),u.id,publie?1:0).run();
 return json({ok:true,publie});
}
