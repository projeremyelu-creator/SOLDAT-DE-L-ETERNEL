import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");
const home=read("public/vitrine/portail.html");
const missions=read("public/vitrine/missions-humanitaires.html");
const source=read("public/vitrine/sde-cartes-reelles.js");
const css=read("public/vitrine/sde-cartes-reelles.css");
const worker=read("src/worker.js");
const data=JSON.parse(read("public/vitrine/carte-geographique-sde.json"));

test("Carte réelle : missions géographiques conservées, accueil fidèle à la nouvelle capture",()=>{
 const a=new JSDOM(home).window.document;
 const b=new JSDOM(missions).window.document;
 assert.equal(a.querySelectorAll("[data-sde-real-map]").length,0,"la carte ne masque plus les trois expressions de la page d'accueil");
 assert.ok(a.querySelector('a.sde-2027-pillar-link[href="/missions-humanitaires"]'),"navigation directe vers la vraie carte");
 assert.ok(!a.querySelector('script[src*="sde-cartes-reelles.js"]'),"aucune requête cartographique au chargement de l'accueil");
 const map=b.querySelector("[data-sde-real-map]");
 assert.ok(map);
 assert.equal(b.querySelectorAll("[data-sde-real-map]").length,1);
 assert.ok(map.querySelector("[data-geo-launch]"));
 assert.ok(map.querySelector("[data-geo-map-canvas][hidden]"));
 assert.equal(map.querySelectorAll("[data-geo-view]").length,3);
 assert.equal(map.querySelectorAll("[data-geo-filter]").length,2);
 assert.ok(map.querySelector("[data-geo-status][aria-live='polite']"));
 assert.ok(b.querySelector('link[href*="sde-cartes-reelles.css"]'));
 assert.ok(b.querySelector('script[src*="sde-cartes-reelles.js"]'));
 assert.equal(a.querySelectorAll(".sde-v5-continents").length,0);
 assert.equal(b.querySelectorAll("#v5-mission-light").length,0);
});

test("Les coordonnées sont vraies, vérifiées et ne prétendent pas situer des missions",()=>{
 assert.equal(data.locations.length,1);
 const abidjan=data.locations[0];
 assert.equal(abidjan.id,"abidjan");
 assert.equal(abidjan.kind,"reference");
 assert.equal(abidjan.precision,"city");
 assert.equal(abidjan.latitude,5.34947032165547);
 assert.equal(abidjan.longitude,-4.01813077089814);
 assert.match(abidjan.evidence,/^https:\/\/ungegn\.un\.org\//);
 assert.equal(data.locations.filter(x=>x.kind==="mission").length,0);
 assert.match(abidjan.description,/non l'adresse exacte/);
});

test("Confidentialité : aucun chargement cartographique avant l'action volontaire",async()=>{
 const dom=new JSDOM(missions,{url:"https://mouvement-sde.org/missions-humanitaires",runScripts:"outside-only"});
 const w=dom.window;
 let fetched=0;
 w.fetch=async()=>{fetched++;return {ok:true,json:async()=>data};};
 w.requestAnimationFrame=fn=>fn();
 w.matchMedia=()=>({matches:false});
 w.eval(source);
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 const root=w.document.getElementById("sde-carte-missions");
 assert.ok(root);
 assert.equal(fetched,0);
 assert.equal(w.document.querySelectorAll('script[src*="leaflet@"]').length,0);
 assert.equal(w.document.querySelectorAll('link[href*="leaflet@"]').length,0);
 const view=root.querySelector('[data-geo-view="afrique"]');
 view.click();
 assert.equal(view.getAttribute("aria-pressed"),"true");
 assert.equal(fetched,0,"Changer de vue ne déclenche aucun téléchargement OSM");
 const launch=root.querySelector("[data-geo-launch]");
 launch.click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(fetched,1);
 const script=w.document.querySelector('script[src*="leaflet@1.9.4"]');
 const link=w.document.querySelector('link[href*="leaflet@1.9.4"]');
 assert.ok(script,"Leaflet est demandé au clic");
 assert.ok(link,"La feuille Leaflet est demandée au clic");
 assert.match(script.integrity,/^sha256-/);
 assert.match(link.integrity,/^sha256-/);
 let createdMap,markerCount=0;
 const markerLayer={
  bindPopup(){return this;},
  addTo(){markerCount++;return this;},
  openPopup(){return this;}
 };
 const mapInstance={
  removeLayer(){},
  setView(){return this;},
  flyTo(){return this;},
  invalidateSize(){return this;}
 };
 w.L={
  map(_node,opts){createdMap=opts;return mapInstance;},
  control:{zoom:()=>({addTo:()=>{}})},
  tileLayer:()=>({addTo:()=>{}}),
  marker:()=>markerLayer,
  divIcon:opts=>opts
 };
 script.dispatchEvent(new w.Event("load"));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(createdMap.scrollWheelZoom,false);
 assert.equal(markerCount,1,"Un seul repère Abidjan, aucun faux projet");
 assert.equal(root.querySelectorAll("[data-geo-map-canvas]:not([hidden])").length,1);
 assert.ok(root.querySelector("[data-geo-places] button"));
 root.querySelector('[data-geo-filter="mission"]').click();
 assert.match(root.querySelector("[data-geo-status]").textContent,/Aucune mission/);
 assert.match(root.querySelector("[data-geo-places]").textContent,/Aucune mission/);
 root.querySelector("[data-geo-fullscreen]").click();
 assert.ok(root.classList.contains("sde-geo-expanded"));
 root.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
 assert.ok(!root.classList.contains("sde-geo-expanded"));
 dom.window.close();
});

test("CSP strictement étendue à Leaflet 1.9.4 et aux seules tuiles OSM",()=>{
 assert.equal((worker.match(/cdn\.jsdelivr\.net\/npm\/leaflet@1\.9\.4\/dist\/leaflet\.js/g)||[]).length,2);
 assert.equal((worker.match(/cdn\.jsdelivr\.net\/npm\/leaflet@1\.9\.4\/dist\/leaflet\.css/g)||[]).length,2);
 assert.equal((worker.match(/https:\/\/tile\.openstreetmap\.org/g)||[]).length,2);
 assert.match(source,/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
 assert.match(source,/OpenStreetMap contributors/);
 assert.match(source,/prefers-reduced-motion: reduce/);
 assert.doesNotMatch(source,/navigator\.geolocation/);
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/min-height:44px/);
});
