import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
test('Audit public et privé : navigateur Chrome système préféré sans suppression du fallback Chromium',()=>{
 for(const path of ['.github/workflows/audit-mobile.yml','.github/workflows/audit-espaces-prives-isoles.yml']){
  const s=read(path);
  assert.match(s,/command -v google-chrome/);
  assert.match(s,/SDE_CHROME_EXECUTABLE=/);
  assert.match(s,/npx playwright install --with-deps chromium/);
  assert.match(s,/npm install --no-save --package-lock=false --ignore-scripts playwright@1\.56\.0/);
 }
 for(const path of ['scripts/audit-public-mobile.mjs','scripts/audit-prive-isole.mjs','scripts/audit-portail-direct-isole.mjs']){
  const s=read(path);
  assert.match(s,/process\.env\.SDE_CHROME_EXECUTABLE\?\{executablePath:process\.env\.SDE_CHROME_EXECUTABLE\}/);
  assert.match(s,/--no-sandbox/);
 }
});
test('Déploiement : fixer Ubuntu 24.04 et éviter APT si ImageMagick existe déjà',()=>{
 const s=read('.github/workflows/deployer.yml');
 assert.ok((s.match(/runs-on: ubuntu-24\.04/g)||[]).length===2);
 assert.ok((s.match(/if ! command -v convert/g)||[]).length===2);
 assert.ok((s.match(/convert -version \| head -1/g)||[]).length===2);
 assert.match(s,/group: sde-cloudflare-deploiement-production/);
 assert.match(s,/git ls-remote origin refs\/heads\/main/);
});
