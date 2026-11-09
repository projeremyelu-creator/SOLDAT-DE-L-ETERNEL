import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

test("La feuille de route conserve ses jalons sans JavaScript et bascule entre les années",()=>{
 const html=readFileSync("public/vitrine/portail.html","utf8");
 const js=readFileSync("public/vitrine/sde-roadmap.js","utf8");
 const dom=new JSDOM(html,{url:"https://mouvement-sde.org/",runScripts:"outside-only"});
 try{
  const {window:w}=dom,doc=w.document;
  const section=doc.querySelector("#roadmap-sde");
  assert.ok(section);
  assert.ok(doc.querySelector("#presentation-2026").compareDocumentPosition(section)&w.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(section.querySelectorAll("#rm-milestones article").length,3);
  assert.equal(section.querySelectorAll("[data-roadmap-year]").length,3);
  assert.match(html,/sde-roadmap\.css\?v=/);
  assert.match(html,/sde-roadmap\.js\?v=/);
  w.eval(js);
  for(const [year,x2,term] of [["2027","300","Soldiers Academy"],["2028","600","Nouveaux relais"],["2026","0","IN FIRE & TPA 2026"]]){
   section.querySelector(`[data-roadmap-year="${year}"]`).click();
   assert.equal(section.querySelector("#roadmap-progress-line").getAttribute("x2"),x2);
   assert.match(section.querySelector("#rm-title").textContent,new RegExp(year));
   assert.match(section.querySelector("#rm-milestones").textContent,new RegExp(term));
   assert.equal(section.querySelectorAll("#rm-milestones article").length,3);
   assert.equal(section.querySelectorAll('[aria-pressed="true"]').length,1);
  }
  assert.match(section.querySelector(".sde-roadmap-note").textContent,/objectifs/);
 }finally{dom.window.close();}
});
