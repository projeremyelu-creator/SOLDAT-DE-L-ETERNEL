import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('La compilation SDE conserve l’encodage WebP même sans APT/ImageMagick',()=>{
 const s=read('scripts/optimiser-archives-sde.mjs');
 assert.match(s,/\["magick","convert","ffmpeg"\]/);
 assert.match(s,/scale=960:960:force_original_aspect_ratio=decrease/);
 assert.match(s,/-compression_level/);
 const t=read('scripts/optimiser-affiche-mobile.mjs');
 assert.match(t,/mobilePrebuilt/);
 assert.match(t,/engine='prebuilt'/);
});
test('Les CI SDE vérifient FFmpeg/ImageMagick avant le build et ne dépendent plus d APT',()=>{
 for(const p of ['.github/workflows/deployer.yml','.github/workflows/verifier.yml']){
  const s=read(p);
  assert.match(s,/command -v ffmpeg/);
  assert.match(s,/command -v convert/);
  assert.doesNotMatch(s,/sudo apt-get update/);
  assert.doesNotMatch(s,/apt-get install/);
 }
});
