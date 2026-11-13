import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ECOLES} from "../src/courriel.js";
import {SDE_OS_31} from "../src/os-v31.js";
import {LOVE_SCHOOL_IDS,LOVE_SCHOOL_PUBLICS} from "../src/love-school.js";
import {ECOLES as ECOLES_OS} from "../src/sde-os.js";
const lire=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Pages publiques Academy : 24 cours, 192 h, 3 niveaux, plus de trace de l'ancien cursus",()=>{
  const acc=lire("public/vitrine/academy.html"),prog=lire("public/vitrine/academy-programme-24.html");
  assert.ok(acc.includes("192 heures"));assert.ok(!acc.includes("Niveau 4"));assert.ok(!/NOUVEAU RÉFÉRENTIEL PROPOSÉ/.test(acc));
  assert.equal((acc.match(/class="niveau-carte/g)||[]).length,3);
  assert.equal((prog.match(/<article class="course"/g)||[]).length,24);
  assert.ok(prog.includes("192 h"));assert.ok(!/soumis à adoption|proposition de référentiel/.test(prog));
  assert.ok(!/<script>/i.test(prog),"script du filtre externalisé (CSP script-src 'self')");
  assert.ok(prog.includes("/vitrine/sde-academy-programme.js"));
  assert.ok(prog.indexOf("sde-premium-public.css")>0&&prog.indexOf("sde-premium-public.css")<prog.indexOf("</head>"));
});

test("Courriels : trois niveaux Academy",()=>{
  assert.deepEqual(Object.keys(ECOLES),["1","2","3"]);
  const h=lire("public/vitrine/courriels.html");assert.ok(h.includes("Niveau III · Commandement"));assert.ok(!h.includes("Mission et Influence"));
});

test("SDE OS : cinq écoles de spécialisation, une par pôle, sur de nouvelles tables",()=>{
  assert.equal(SDE_OS_31.ecoles.length,5);assert.equal(ECOLES_OS.length,5);
  assert.equal(SDE_OS_31.ecoles[0].nom,"Réveil et évangélisation");
  const src=lire("src/os-v31.js")+lire("src/sde-os.js");
  assert.ok(!/osv31_academy|os_parcours/.test(src),"anciennes tables non réutilisées");
  assert.ok(/osv31_ecoles/.test(src)&&/os_ecoles/.test(src));
  assert.ok(src.includes("ecole>5")&&src.includes("int(b.ecole,1,5)"));
});

test("Love School : dix bonus classés LS-01 à LS-10 et filtres par publics sans duplication",()=>{
 const js=lire("public/vitrine/sde-academy-parcours.js");
 const groups=js.match(/const LOVE_GROUPS=\[([\s\S]*?)\n\];/);
 assert.ok(groups,"collections Love School absentes");
 const ids=[...groups[1].matchAll(/ids:\[([^\]]+)\]/g)].flatMap(m=>[...m[1].matchAll(/"LS-\d+"/g)].map(x=>JSON.parse(x[0])));
 assert.deepEqual(ids,LOVE_SCHOOL_IDS,"la vue Tous les cours doit suivre l'ordre officiel");
 assert.equal(new Set(ids).size,10,"chaque cours doit apparaître une seule fois");
 assert.equal(LOVE_SCHOOL_PUBLICS.length,3);
 for(const audience of LOVE_SCHOOL_PUBLICS){
  assert.ok(audience.ids.length>0);
  assert.equal(audience.ids.length,new Set(audience.ids).size,"aucun cours répété dans le parcours "+audience.id);
  assert.ok(audience.ids.every(id=>LOVE_SCHOOL_IDS.includes(id)),"cours de public hors catalogue");
 }
 assert.deepEqual(LOVE_SCHOOL_PUBLICS.map(p=>p.ids.length),[7,8,8],"les parcours se chevauchent volontairement");
});
