import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
test("SDE Grades : intégration visuelle dans les deux espaces",async()=>{
 const [member,admin,css,js,worker]=await Promise.all([
  read("public/vitrine/tableau-membre.html"),read("public/vitrine/tableau-administration.html"),
  read("public/vitrine/sde-grades.css"),read("public/vitrine/sde-grades.js"),read("src/worker.js")
 ]);
 for(const [html,mode] of [[member,"member"],[admin,"directoire"]]){
  assert.match(html,/data-section="grades"/);
  assert.match(html,new RegExp('data-sde-grades data-mode="'+mode+'"'));
  assert.match(html,/sde-grades\.css/);assert.match(html,/sde-grades\.js/);
  assert.match(html,/data-view="grades"/);
 }
 assert.match(member,/sde-grade-history/);assert.match(member,/data-grade-promotion/);assert.match(member,/data-grade-contribution/);assert.match(member,/data-grade-category/);
 assert.match(admin,/sde-grade-promotions/);assert.match(admin,/sde-grade-queue/);
 assert.match(js,/\/api\/grades\/me/);assert.match(js,/\/api\/grades\/directoire/);
 assert.match(js,/data-grade-contribution/);assert.ok(js.includes('api("/api/grades/points"'));assert.ok(js.includes('api("/api/grades/catalog"'));assert.match(css,/sde-grades-hero/);
 assert.match(worker,/gradesApi\(req, env, u, p\)/);
});
