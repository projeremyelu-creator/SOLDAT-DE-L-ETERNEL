import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("L'import de l'archive SDE est vérifié et ajouté aux deux jobs Cloudflare",()=>{
 const workflow=read(".github/workflows/deployer.yml");
 const python=read("scripts/installer-medias-sde.py");
 assert.equal((workflow.match(/python3 scripts\/installer-medias-sde\.py/g)||[]).length,2);
 assert.match(python,/c039c5a548f1f79ca4d144895c43162ff7e0f0b7c2ca04bc87642adb12ecac38/);
 assert.match(python,/hashlib\.sha256/);
 assert.match(python,/sum\(m\.file_size for m in candidates\)/);
 assert.match(python,/len\(candidates\) != len\(EXPECTED\)/);
 assert.match(python,/MEDIAS_SDE_EN_ATTENTE/);
 assert.match(python,/MEDIAS_SDE_INSTALLES/);
});
test("Le contrôle de publication vérifie images et vidéos sur les deux domaines",()=>{
 const workflow=read(".github/workflows/deployer.yml");
 const verifier=read("scripts/verifier-medias-sde-publies.mjs");
 assert.match(workflow,/node scripts\/verifier-medias-sde-publies\.mjs/);
 assert.match(verifier,/https:\/\/mouvement-sde\.org/);
 assert.match(verifier,/https:\/\/app\.mouvement-sde\.org/);
 assert.match(verifier,/method:"HEAD"/);
 assert.match(verifier,/status===200/);
 assert.match(verifier,/MEDIAS_SDE_PUBLICATION_VERIFIEE/);
 assert.match(verifier,/MEDIAS_SDE_PUBLICATION_ECHEC/);
});
test("Si le ZIP n'a pas encore été téléversé, le pipeline ne déclare pas de médias présents",()=>{
 const py=read("scripts/installer-medias-sde.py");
 assert.match(py,/if not ARCHIVE\.is_file\(\):/);
 assert.match(py,/return 0/);
 assert.ok(existsSync("docs/publication-medias-sde-2027.md"));
});
