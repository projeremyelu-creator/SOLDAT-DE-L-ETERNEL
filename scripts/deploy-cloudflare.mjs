import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const credential=/^[A-Za-z0-9_-]{20,200}$/;
export function deploymentEnvironment(source){
 const env={...source};const raw=String(source.CLOUDFLARE_API_TOKEN||'').trim();
 if(raw){
  // Accepter un jeton brut ou le champ Bearer d'une commande de vérification copiée.
  // Le texte copié n'est jamais exécuté ; plusieurs jetons distincts sont refusés.
  const candidates=new Set(raw.split(/\r?\n/).map(s=>s.trim()).filter(s=>credential.test(s)));
  for(const match of raw.matchAll(/\bBearer\s+([A-Za-z0-9_-]{20,200})(?=[\s"'\\]|$)/gi))candidates.add(match[1]);
  if(candidates.size!==1)throw Error('Identifiant Cloudflare invalide ou ambigu. Enregistrez uniquement le jeton API.');
  env.CLOUDFLARE_API_TOKEN=[...candidates][0];delete env.CLOUDFLARE_API_KEY;delete env.CLOUDFLARE_EMAIL;
 }else{
  delete env.CLOUDFLARE_API_TOKEN;
  const key=String(source.CLOUDFLARE_API_KEY||'').trim(),email=String(source.CLOUDFLARE_EMAIL||'').trim();
  if(!credential.test(key)||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('Identifiant Cloudflare absent ou invalide. Configurez un jeton API ou la clé globale et son e-mail.');
  env.CLOUDFLARE_API_KEY=key;env.CLOUDFLARE_EMAIL=email;
 }
 const account=String(source.CLOUDFLARE_ACCOUNT_ID||'').trim();
 const accounts=[...new Set(account.match(/(?<![a-zA-Z0-9])[a-f0-9]{32}(?![a-zA-Z0-9])/gi)||[])];
 if(accounts.length>1)throw Error('Plusieurs identifiants de compte Cloudflare : indiquez un compte unique.');
 if(accounts.length===1)env.CLOUDFLARE_ACCOUNT_ID=accounts[0];else delete env.CLOUDFLARE_ACCOUNT_ID;
 // Sans identifiant reconnu, Wrangler ne choisit automatiquement qu'un compte unique.
 // Plusieurs comptes disponibles en CI provoquent une erreur, jamais un choix arbitraire.
 return env;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const env=deploymentEnvironment(process.env);
  // Masquer également la valeur extraite : le secret GitHub peut être une commande entière.
  if(process.env.GITHUB_ACTIONS==='true')for(const key of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY'])if(env[key])console.log('::add-mask::'+env[key]);
  const result=spawnSync('npx',['--yes','wrangler@4.154.0','deploy'],{env,stdio:'inherit'});
  if(result.error)throw Error('Impossible de démarrer le déploiement Cloudflare.');
  process.exitCode=result.status??1;
 }catch(error){console.error(error.message);process.exitCode=1}
}
