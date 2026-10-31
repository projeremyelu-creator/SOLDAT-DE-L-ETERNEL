/* SDE — demandes publiques : volontariat, soutien, implantation et signalements.
   Les montants promis ne sont JAMAIS comptabilisés comme dons encaissés.
   Les signalements restent réservés au propriétaire, et ne sont jamais
   présentés dans un répertoire public. */
const reply=(x,status=200)=>Response.json(x,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
const fail=(message,status=400)=>reply({ok:false,message},status);
const kinds=new Set(['soutien','implantation','newsletter','intercession','signalement']);
const trim=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const emailOk=x=>!x||(/^[^\s@<>]{1,80}@[^\s@<>]{1,120}\.[^\s@<>]{2,30}$/.test(x)&&x.length<=180);
const countries=new Set(['Côte d’Ivoire','Tunisie','Burkina Faso','Italie','Canada','États-Unis','Autre']);
const types={soutien:'Demande de renseignements pour un don',implantation:'Demande d’ouverture de point SDE',newsletter:'Intérêt pour la newsletter',intercession:'Demande de créneau de prière',signalement:'Signalement confidentiel'};
export function publicCountries(){return Array.from(countries).filter(c=>c!=='Autre');}
async function ensure(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS sde_demarches (id TEXT PRIMARY KEY, type TEXT NOT NULL, nom TEXT, email TEXT, pays TEXT, ville TEXT, message TEXT NOT NULL, details TEXT NOT NULL, consentement INTEGER NOT NULL, statut TEXT NOT NULL, cree INTEGER NOT NULL)').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS sde_demarches_par_type ON sde_demarches(type,cree)').run();
}
function normalize(body){
 const type=trim(body?.type,30),nom=trim(body?.nom,100),email=trim(body?.email,180).toLowerCase(),pays=trim(body?.pays,60),ville=trim(body?.ville,100);
 const message=trim(body?.message,1400),projet=trim(body?.projet,60),creneau=trim(body?.creneau,80);
 const somme=Number(body?.montant||0);
 if(!kinds.has(type))return {error:'Type de demande invalide.'};
 if(!emailOk(email))return {error:'Adresse e-mail invalide.'};
 if(body?.consentement!==true)return {error:'Votre consentement est nécessaire pour transmettre cette demande.'};
 if(body?.site_web||body?.siteWeb)return {error:'Envoi refusé.'};
 if(type!=='signalement'&&!email)return {error:'Une adresse e-mail de contact est nécessaire.'};
 if(type==='implantation'&&(!pays||!ville||message.length<20))return {error:'Indiquez votre pays, votre ville et votre projet (20 caractères minimum).'};
 if(type==='intercession'&&(!pays||!creneau))return {error:'Indiquez le pays et le créneau souhaité.'};
 if(type==='signalement'&&message.length<20)return {error:'Précisez le signalement (20 caractères minimum).'};
 if(type==='soutien'&&(!['in-fire-2027','missions-humanitaires','soldiers-academy','general'].includes(projet)||!Number.isSafeInteger(somme)||somme<0||somme>100000000))return {error:'Projet ou montant indicatif invalide.'};
 if(type==='newsletter'&&!email)return {error:'E-mail nécessaire.'};
 if(type!=='newsletter'&&type!=='intercession'&&message.length<8)return {error:'Merci de préciser votre demande.'};
 if(!countries.has(pays)&&pays)return {error:'Pays invalide.'};
 return {type,nom,email,pays,ville,message:message||'Demande de contact',details:JSON.stringify({projet:type==='soutien'?projet:null,montantIndicatif:type==='soutien'?somme:null,creneau:type==='intercession'?creneau:null}),consentement:1,statut:type==='newsletter'?'en_attente_confirmation':'a_traiter'};
}
export async function sdeExpansionApi(req,env,u){
 const path=new URL(req.url).pathname;
 if(!path.startsWith('/api/sde-demarches'))return null;
 if(path==='/api/sde-demarches/statut'&&req.method==='GET')return reply({
  paiementsActifs:false,devise:'XOF',canaux:['Orange Money','MTN MoMo','Moov Money','Virement bancaire','Carte bancaire'],
  projets:[{id:'in-fire-2027',titre:'IN FIRE 2027'},{id:'missions-humanitaires',titre:'Missions humanitaires'},{id:'soldiers-academy',titre:'Soldiers Academy'}],
  pays:publicCountries(),montantsConfirmesDisponibles:false
 });
 if(path==='/api/sde-demarches/demandes'&&req.method==='GET'){
  if(!u?.connecte||u.niveau<2)return fail('Accès réservé à l’administration.',403);
  await ensure(env);
  const type=new URL(req.url).searchParams.get('type')||'';
  if(type==='signalement'&&u.niveau<3)return fail('Signalements réservés au propriétaire.',403);
  if(type&&!kinds.has(type))return fail('Type invalide.');
  const rows=type?
   await env.DB.prepare('SELECT * FROM sde_demarches WHERE type=? ORDER BY cree DESC LIMIT 100').bind(type).all():
   await env.DB.prepare("SELECT id,type,nom,email,pays,ville,statut,cree FROM sde_demarches WHERE type<>'signalement' ORDER BY cree DESC LIMIT 100").all();
  return reply({demandes:rows.results||[]});
 }
 if(path!=='/api/sde-demarches'||req.method!=='POST')return fail('Méthode refusée.',405);
 // Le navigateur légitime fournit Origin. Interdire les envois cross-site.
 const origin=req.headers.get('origin')||'';
 if(origin&&!['https://mouvement-sde.org','https://app.mouvement-sde.org'].includes(origin))return fail('Origine refusée.',403);
 if(Number(req.headers.get('content-length')||0)>8000)return fail('Demande trop volumineuse.',413);
 const type=req.headers.get('content-type')||'';
 if(!type.includes('application/json'))return fail('Format JSON attendu.',415);
 let body;try{body=await req.json()}catch{return fail('Données invalides.')}
 const v=normalize(body);if(v.error)return fail(v.error);
 await ensure(env);
 const id=crypto.randomUUID();
 await env.DB.prepare('INSERT INTO sde_demarches(id,type,nom,email,pays,ville,message,details,consentement,statut,cree) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
  .bind(id,v.type,v.nom,v.email,v.pays,v.ville,v.message,v.details,1,v.statut,Date.now()).run();
 return reply({ok:true,reference:id,statut:v.statut,paiementEffectue:false,message:v.type==='newsletter'?'Demande enregistrée. Votre inscription devra être confirmée par e-mail.':'Demande enregistrée. Aucun paiement n’a été effectué.'},201);
}
