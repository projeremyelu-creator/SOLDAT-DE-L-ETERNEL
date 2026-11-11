/* Recette Chromium de la VRAIE coque portail-direct.js avec session simulée.
   Aucune requête réseau de production ni donnée réelle. Captures fictives. */
import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('public'),out='audit-mobile-sde/portail-direct';
mkdirSync(out,{recursive:true});
const domain='https://mouvement-sde.org';
const modes=[
 {mode:'administration',niveau:2},
 {mode:'administration',niveau:1},
 {mode:'mon-espace',niveau:0}
];
const widths=[320,390,768,1280];
const report={type:'coque-reelle-js-css-session-simulee',checks:[],issues:[]};
const icons='<span class="ico" aria-hidden="true">◇</span>';
const keys=['accueil','synthese','membres','garnisons','chambre','agenda','academie','arsenal','espace','finances','scanner','mur','preferences','portevoix'];
const fixture=`<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="stylesheet" href="/vitrine/portail-direct.css">
<link rel="stylesheet" href="/vitrine/sde-mobile-correctifs-20261103.css">
<link rel="stylesheet" href="/vitrine/sde-poste-commandement-v2.css">
<link rel="stylesheet" href="/vitrine/sde-command-v4.css"></head>
<body><header class="hdr"><button id="btn-reglages">Réglages</button><button id="btn-compte">Mon compte</button></header>
<div class="shell"><nav class="nav" id="nav" aria-label="Sections"> ${keys.map((k,i)=>`<button class="nav-btn ${i===0?'on':''}" data-vue="${k}" ${i===0?'aria-current="page"':''} type="button">${k}</button>`).join('')}</nav>
<main id="main" class="main" tabindex="-1"><div class="view">
<div class="sec-head"><h1 class="sec-title">Poste de commandement (recette fictive)</h1></div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
<article class="stat"><div class="stat-l">${icons}Membres</div><strong class="stat-v">33</strong></article>
<article class="stat"><div class="stat-l">${icons}Programmes</div><strong class="stat-v">1</strong></article>
</div></div></main></div>
<script defer src="/vitrine/portail-direct.js"></script>
<script defer src="/vitrine/sde-command-v4.js"></script></body></html>`;
const mime={'.css':'text/css','.js':'application/javascript','.png':'image/png','.html':'text/html'};
const browser=await chromium.launch({headless:true,...(process.env.SDE_CHROME_EXECUTABLE?{executablePath:process.env.SDE_CHROME_EXECUTABLE}:{}),args:['--no-sandbox']});
try{
 for(const mode of modes){
  for(const width of widths){
   const label=mode.mode+'-role'+mode.niveau+'-'+width,context=await browser.newContext({
    viewport:{width,height:width===1280?900:width===768?1024:844},
    isMobile:width<761,hasTouch:width<761,locale:'fr-CI',reducedMotion:'reduce'});
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!==domain){await route.abort();return}
    if(u.pathname==='/administration'||u.pathname==='/mon-espace'){
      await route.fulfill({status:200,contentType:'text/html',body:fixture});return;
    }
    if(u.pathname==='/api/moi'){
      await route.fulfill({status:200,contentType:'application/json',
       body:JSON.stringify({connecte:true,niveau:mode.niveau,libRole:'Compte fictif de recette',membreId:'fictif'})});return;
    }
    const path=resolve(root,'.'+u.pathname);
    if(!path.startsWith(root+'/')){await route.fulfill({status:403});return}
    try{await route.fulfill({status:200,contentType:mime[extname(path)]||'text/plain',body:readFileSync(path)});}
    catch(_){await route.fulfill({status:404,body:'Ressource fictive absente'});}
   });
   const page=await context.newPage();
   const errors=[];page.on('pageerror',err=>errors.push(String(err.message||err).slice(0,150)));
   try{
    const response=await page.goto(domain+'/'+mode.mode,{waitUntil:'load'});
    await page.waitForFunction(()=>!!window.SDEPortal,{timeout:10000});
    await page.waitForTimeout(250);
    const status=await page.evaluate(()=>{
     const elems=[...document.querySelectorAll('#sde-direct-top .sde-direct-header > *')].filter(x=>{
      const c=getComputedStyle(x);return c.display!=='none'&&c.visibility!=='hidden'
     });
     const rects=elems.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}});
     let intersections=0;
     for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
      const a=rects[i],b=rects[j];
      if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>4 &&
         Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>4)intersections++;
     }
     const menu=document.querySelector('#sde-direct-menu-toggle');
     return {viewport:innerWidth,bodyWidth:document.body.scrollWidth,
       docWidth:document.documentElement.scrollWidth,headIntersections:intersections,
       menuAvailable:!!menu&&getComputedStyle(menu).display!=='none',
       navAccessible:!!document.querySelector('#sde-direct-top .sde-direct-head-links'),
       adminLinkHidden:!!document.querySelector('.sde-direct-admin-link')?.hidden,
       adminTabs:document.querySelectorAll('#sde-direct-tabs button[data-module="membres"]').length,
       commandCount:document.querySelectorAll('#sde-command-v4 .sde-command-v4-item').length,
       commandFinances:!!document.querySelector('#sde-command-v4 [data-module="finances"]'),
       mobileBottomCount:document.querySelectorAll('.sde-command-v4-bottom [data-module]').length};
    });
    if(response.status()!==200)throw Error('HTTP');
    if(status.docWidth>width+3||status.bodyWidth>width+3)throw Error('Débordement horizontal '+JSON.stringify(status));
    if(status.headIntersections)throw Error('Chevauchement en-tête '+JSON.stringify(status));
    if(!status.navAccessible)throw Error('Navigation privée absente');
    if(mode.niveau===0&&(!status.adminLinkHidden||status.adminTabs!==0||status.commandCount!==0||status.mobileBottomCount!==0))throw Error('Rôles membre non respectés');
    if(mode.niveau>=1){
     if(status.commandCount<5)throw Error('Modules rapides administrateur indisponibles');
     if(status.commandFinances!==(mode.niveau>=2))throw Error('Visibilité finances non conforme');
     if(status.mobileBottomCount!==5)throw Error('Navigation SDE 5 onglets incomplète');
    }
    if(width<=760){
     if(!status.menuAvailable)throw Error('Menu Rubriques indisponible');
     const menu=page.locator('#sde-direct-menu-toggle');
     await menu.click();
     if(await menu.getAttribute('aria-expanded')!=='true')throw Error('Rubriques inaccessibles');
     const destination=mode.niveau===0?'academie':'membres';
     await page.locator('#sde-direct-tabs button[data-module="'+destination+'"]').click();
     if(await menu.getAttribute('aria-expanded')!=='false')throw Error('Rubriques ne se referment pas');
     const focus=await page.evaluate(()=>document.activeElement?.id);
     if(focus!=='main')throw Error('Le focus ne suit pas la navigation ('+focus+')');
     if(mode.niveau>=1){
      const nav=page.locator('.sde-command-v4-bottom');
      await nav.locator('[data-module="membres"]').click();
      if(new URL(page.url()).searchParams.get('module')!=='membres')
       throw Error('Raccourci membres inopérant');
      await nav.locator('[data-module="plus"]').click();
      if(await menu.getAttribute('aria-expanded')!=='true')throw Error('Onglet Plus inopérant');
      await menu.click();
     }
    }
    if(errors.length)throw Error('Erreurs script : '+errors.join('; '));
    await page.screenshot({path:out+'/'+label+'.png',animations:'disabled'});
    report.checks.push({name:label,viewport:width,overlap:status.headIntersections,overflow:Math.max(status.docWidth,status.bodyWidth)-width});
    console.log('AUDIT_PORTAIL_DIRECT '+JSON.stringify(report.checks.at(-1)));
   }catch(e){report.issues.push({case:label,error:String(e.message||e).slice(0,400)});}
   finally{await context.close();}
  }
 }
}finally{await browser.close();}
writeFileSync(out+'/rapport.json',JSON.stringify(report,null,2));
console.log('BILAN_PORTAIL_DIRECT '+JSON.stringify({tests:report.checks.length,attendus:modes.length*widths.length,erreurs:report.issues}));
if(report.issues.length||report.checks.length!==modes.length*widths.length)process.exitCode=1;
