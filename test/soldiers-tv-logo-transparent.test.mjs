import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inflateSync} from "node:zlib";

const img=readFileSync("public/vitrine/logo-soldiers-tv.png");
const str=b=>b.toString("ascii");
const uint32=i=>img.readUInt32BE(i);
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const x of b)c=(crcTable[(c^x)&255]^(c>>>8))>>>0;return(c^0xffffffff)>>>0;};
test("Le monogramme Soldiers TV est un PNG transparent intègre et décodable",()=>{
 assert.equal(img.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 const chunks=[];let i=8;
 while(i+12<=img.length){
  const len=uint32(i),type=str(img.subarray(i+4,i+8));
  assert.ok(i+len+12<=img.length,"PNG tronqué");
  assert.equal(crc(img.subarray(i+4,i+8+len)),uint32(i+8+len),"CRC PNG "+type);
  chunks.push({type,data:img.subarray(i+8,i+8+len)});i+=12+len;
  if(type==="IEND")break;
 }
 const ihdr=chunks.find(c=>c.type==="IHDR");
 assert.ok(ihdr,"En-tête PNG");
 assert.equal(ihdr.data.readUInt32BE(0),320);
 assert.equal(ihdr.data.readUInt32BE(4),320);
 assert.ok(chunks.some(c=>c.type==="tRNS"),"transparence conservée");
 const idat=Buffer.concat(chunks.filter(c=>c.type==="IDAT").map(c=>c.data));
 const pixels=inflateSync(idat);
 assert.ok(pixels.length>102000,"Données des pixels non corrompues");
});
test("Soldiers TV affiche son logo officiel sans retirer la marque SDE mère",()=>{
 const html=readFileSync("public/vitrine/soldiers-tv.html","utf8");
 assert.match(html,/class="stv-brand-panel"/);
 assert.match(html,/src="\/vitrine\/logo-soldiers-tv\.png"/);
 assert.match(html,/type="image\/png" href="\/vitrine\/logo-soldiers-tv\.png"/);
 assert.match(html,/logo-soldiers-tv\.png"><\/meta>|logo-soldiers-tv\.png">/);
 assert.match(html,/href="\/vitrine\/soldiers-tv-brand\.css/);
 assert.match(html,/Soldiers TV<\/h1>/);
 assert.match(html,/sde-shell-public\.js/);
 const css=readFileSync("public/vitrine/soldiers-tv-brand.css","utf8");
 assert.match(css,/background:#fffdf8/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/opacity:1!important;visibility:visible!important/);
});
