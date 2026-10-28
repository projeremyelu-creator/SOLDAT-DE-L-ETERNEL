// Ancien horaire importé : l’affiche officielle fixe IN FIRE 2026 à 08 h 30.
export const publishedEventTime=e=>e.date==='2026-10-31'&&/in\s*fire/i.test(e.titre||'')&&(!e.heure||e.heure==='08:00')?'08:30':String(e.heure||'').slice(0,5);
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
export async function rsvpBackup(env){await ensure(env);return (await env.DB.prepare('SELECT * FROM portail_inscriptions_evenements').all()).results||[]}
async function ensure(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS portail_inscriptions_evenements(evenement TEXT NOT NULL,compte TEXT NOT NULL,membre TEXT,participe INTEGER NOT NULL,maj INTEGER NOT NULL,PRIMARY KEY(evenement,compte))').run()}
export async function eventRsvpApi(req,env,u){
 if(new URL(req.url).pathname!=='/api/mes-evenements')return null;
 if(!u.connecte)return reply({message:'Connectez-vous pour retrouver vos événements.'},401);
 await ensure(env);const today=new Date().toISOString().slice(0,10);
 if(req.method==='GET'){
  const rows=(await env.DB.prepare("SELECT d.id,d.data,COALESCE(r.participe,0) AS participe FROM docs d LEFT JOIN portail_inscriptions_evenements r ON r.evenement=d.id AND r.compte=? WHERE d.parent='evenements'").bind(u.id).all()).results||[];
  return reply({evenements:rows.map(r=>({...JSON.parse(r.data),id:r.id,inscrit:!!r.participe})).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')&&e.date>=today&&(u.niveau>=1||e.prive!==true)).sort((a,b)=>(a.date+(a.heure||'')).localeCompare(b.date+(b.heure||''))).slice(0,30).map(e=>({id:e.id,titre:String(e.titre||'Rencontre').slice(0,160),date:e.date,heure:publishedEventTime(e),lieu:String(e.lieu||'').slice(0,200),description:String(e.description||'').slice(0,800),inscrit:e.inscrit}))});
 }
 if(req.method!=='POST')return reply({message:'Méthode refusée.'},405);
 const b=await req.json();if(typeof b.evenement!=='string'||!/^[\w-]{1,128}$/.test(b.evenement)||typeof b.participe!=='boolean')return reply({message:'Choisissez une rencontre et confirmez votre participation.'},400);
 const row=await env.DB.prepare("SELECT data FROM docs WHERE path=?").bind('evenements/'+b.evenement).first();const e=row?JSON.parse(row.data):null;
 if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')||e.date<today||(e.prive===true&&u.niveau<1))return reply({message:'Cette rencontre n’est pas disponible.'},404);
 await env.DB.prepare('INSERT INTO portail_inscriptions_evenements(evenement,compte,membre,participe,maj) VALUES(?,?,?,?,?) ON CONFLICT(evenement,compte) DO UPDATE SET membre=excluded.membre,participe=excluded.participe,maj=excluded.maj').bind(b.evenement,u.id,u.membreId,b.participe?1:0,Date.now()).run();
 return reply({ok:true,inscrit:b.participe});
}
