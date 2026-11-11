import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('La compilation SDE conserve l’encodage WebP même sans APT/ImageMagick',()=>{
 const s=read('scripts/optimiser-archives-sde.mjs');
 assert.match(s,/\["magick","convert","ffmpeg","chrome"\]/);
 assert.match(s,/scripts\/encoder-webp-chrome.mjs/);
 assert.match(s,/scale=960:960:force_original_aspect_ratio=decrease/);
 assert.match(s,/-compression_level/);
 const t=read('scripts/optimiser-affiche-mobile.mjs');
 assert.match(t,/mobilePrebuilt/);
 assert.match(t,/engine='prebuilt'/);
 assert.match(t,/scripts\/encoder-webp-chrome.mjs/);
});
test('Les CI SDE vérifient FFmpeg/ImageMagick avant le build et ne dépendent plus d APT',()=>{
 for(const p of ['.github/workflows/deployer.yml','.github/workflows/verifier.yml']){
  const s=read(p);
  assert.match(s,/command -v ffmpeg/);
  assert.match(s,/command -v convert/);
  assert.match(s,/command -v google-chrome/);
  assert.doesNotMatch(s,/sudo apt-get update/);
  assert.doesNotMatch(s,/apt-get install/);
 }
});

test('Encodeur CDP Chrome : sortie WebP vérifiée sans navigateur réseau',()=>{
 const s=read('scripts/encoder-webp-chrome.mjs');
 assert.match(s,/Page.setDocumentContent/);
 assert.match(s,/Page.captureScreenshot/);
 assert.match(s,/format:'webp'/);
 assert.match(s,/data:image|data:/);
 assert.match(s,/WebSocket/);
 assert.match(s,/readFileSync\(input\)/);
});

test('Les archives JPEG déjà compressées bénéficient de paliers de secours plus petits',()=>{
 const s=read('scripts/optimiser-archives-sde.mjs');
 assert.match(s,/ARCHIVE_WEBP_SECOURS/);
 assert.match(s,/\[720,60\],\[600,52\],\[480,45\],\[400,38\],\[320,32\]/);
 assert.match(s,/bytes<inputSize/);
 assert.match(s,/rmSync\(tmp,\{force:true\}\)/);
 assert.match(s,/renameSync\(tmp,output\)/);
});
