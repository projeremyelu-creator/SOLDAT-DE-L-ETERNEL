// Vérification rapide avant publication : chaque script de l'application et du site
// doit être du JavaScript valide. Une seule faute (ex. guillemets typographiques ‘…’
// à la place de '…') suffit à bloquer tout le poste de commandement.
// Usage : node test/verifier.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const pages = ["public/index.html", "public/vitrine/index.html", "public/offline.html"];
let erreurs = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(html))) {
    n += 1;
    if (/type="application\/(ld\+)?json"/.test(m[1])) { try { JSON.parse(m[2]); } catch (e) { erreurs += 1; console.error(`✗ ${page} · données JSON n°${n} : ${e.message}`); } continue; }
    try { new vm.Script(m[2], { filename: `${page}#script${n}` }); }
    catch (e) {
      erreurs += 1;
      const ligne = html.slice(0, m.index).split("\n").length + (Number((e.stack.match(/:(\d+)\n/) || [])[1]) || 1) - 1;
      console.error(`✗ ${page} · script n°${n}, vers la ligne ${ligne} : ${e.message}`);
    }
  }
  console.log(`✓ ${page} : ${n} script(s) lu(s)`);
}
for (const f of ["src/worker.js", "public/sw.js", "public/vitrine/navigation.js", "public/vitrine/motion.js"]) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); console.log(`✓ ${f}`); }
  catch (e) { erreurs += 1; console.error(`✗ ${f} :\n${String(e.stderr)}`); }
}
if (erreurs) { console.error(`\n${erreurs} erreur(s) : ne pas publier.`); process.exit(1); }
console.log("\nTout est valide.");
