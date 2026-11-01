import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const lire=p=>readFileSync(p,"utf8");
const poles=[
  {file:"pole-reveil",num:1,sigle:"REV",nom:"Réveil et évangélisation"},
  {file:"pole-social",num:2,sigle:"ISH",nom:"Impact social et humanitaire"},
  {file:"pole-logistique",num:3,sigle:"LO",nom:"Logistique et organisation"},
  {file:"pole-medias",num:4,sigle:"CMR",nom:"Communication, médias et relations extérieures"},
  {file:"pole-formation",num:5,sigle:"FDE",nom:"Formation, développement et entrepreneuriat"}
];
const valeursHistoriques=[
 "Réveil, évangélisation & missions",
 "Impact social & humanitaire",
 "Logistique & organisation",
 "Communication, médias & digital",
 "Formation & développement intégral"
];
test("Les cinq fiches présentent leurs sigles et dénominations officiels",()=>{
  for(const pole of poles){
    const dom=new JSDOM(lire("public/vitrine/"+pole.file+".html"));
    const doc=dom.window.document;
    assert.ok(doc.title.toLowerCase().includes(pole.nom.toLowerCase()),pole.file);
    assert.ok((doc.querySelector("h1")?.textContent||"").toLowerCase().includes(pole.nom.toLowerCase()));
    assert.ok((doc.querySelector(".sde-intro .sde-kicker")?.textContent||"").includes(pole.sigle));
    assert.ok(doc.querySelector('a[href="/mouvement#poles"]'));
    dom.window.close();
  }
});
test("Les noms publics des pôles sont alignés avec la page de présentation",()=>{
  for(const file of ["mouvement","index"]){
    const dom=new JSDOM(lire("public/vitrine/"+file+".html"));
    const doc=dom.window.document;
    for(const pole of poles){
      const carte=doc.querySelector('a[data-pole="'+pole.num+'"] .pole-titre');
      assert.ok(carte,"Carte "+pole.sigle+" sur "+file);
      assert.ok(carte.textContent.toLowerCase().includes(pole.nom.toLowerCase()),pole.sigle);
    }
    dom.window.close();
  }
});
test("Le formulaire affiche les noms officiels en conservant les valeurs historiques de l'API",()=>{
  const doc=new JSDOM(lire("public/vitrine/rejoindre.html")).window.document;
  const options=[...doc.querySelectorAll("#f-pole option")].slice(1);
  assert.equal(options.length,5);
  for(let i=0;i<5;i++){
    assert.equal(options[i].value,valeursHistoriques[i]);
    assert.ok(options[i].textContent.includes(poles[i].sigle));
    assert.ok(options[i].textContent.toLowerCase().includes(poles[i].nom.toLowerCase()));
  }
  const backend=lire("src/worker.js");
  for(const ancienne of valeursHistoriques)assert.ok(backend.includes(ancienne),"L'API conserve le pôle "+ancienne);
});
