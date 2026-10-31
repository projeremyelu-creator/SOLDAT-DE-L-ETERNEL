/* Audit réel des pages PUBLIQUES uniquement.
   Ne se connecte pas, n'ouvre aucun dossier personnel et n'effectue aucune écriture API.
   Exécution dans GitHub Actions avec Chromium, captures à consulter par le propriétaire. */
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const domain='https://mouvement-sde.org';
const out='audit-mobile-sde';
mkdirSync(out,{recursive:true});
const cases=[
 {path:'/',name:'accueil-360',width:360,height:800},
 {path:'/',name:'accueil-390',width:390,height:844},
 {path:'/programmes',name:'programmes-390',width:390,height:844},
 {path:'/mouvement',name:'mouvement-390',width:390,height:844},
 {path:'/',name:'accueil-tablette',width:768,height:1024},
 {path:'/',name:'accueil-1024',width:1024,height:768},
 {path:'/',name:'accueil-desktop',width:1280,height:900},
 {path:'/programmes',name:'programmes-desktop',width:1280,height:900},
 {path:'/mouvement',name:'mouvement-desktop',width:1280,height:900},
 {path:'/',name:'accueil-1550',width:1550,height:900},
 {path:'/',name:'accueil-1600',width:1600,height:900}
];
const report={date:new Date().toISOString(),domain,checks:[],issues:[],notes:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});

function issue(label,description,critical=false){
 report.issues.push({label,description,critical});
 console.log((critical?'ERREUR':'OBSERVATION')+' '+label+': '+description);
}
try{
 for(const c of cases){
  const ctx=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:1,isMobile:c.width<700,hasTouch:c.width<700,colorScheme:'light',locale:'fr-CI'});
  const page=await ctx.newPage();
  await page.addInitScript(() => {
   window.__sdeLabMetrics={lcp:0,cls:0};
   try {
    new PerformanceObserver(list=>{
     const entries=list.getEntries();
     if(entries.length)window.__sdeLabMetrics.lcp=Math.round(entries.at(-1).startTime);
    }).observe({type:'largest-contentful-paint',buffered:true});
   } catch (_) {}
   try {
    new PerformanceObserver(list=>{
     for(const entry of list.getEntries())
      if(!entry.hadRecentInput)window.__sdeLabMetrics.cls+=entry.value;
    }).observe({type:'layout-shift',buffered:true});
   } catch (_) {}
  });

  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error.message||error).slice(0,250)));
  try{
   const response=await page.goto(domain+c.path,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(1700);
   if(c.path==='/'){
    const images=await page.locator('.sde-pole-officiel-lien img, img.sde-event-poster').all();
    for(const img of images){
     await img.evaluate(el=>{el.loading='eager';});
    }
    await page.waitForTimeout(900);
    await page.evaluate(()=>scrollTo(0,0));
   }
   const view=await page.evaluate(()=>{
    const toRect=el=>{
     if(!el)return null;
     const r=el.getBoundingClientRect();
     return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const intersects=(a,b)=>!!(a&&b&&a.left<b.right-2&&a.right>b.left+2&&a.top<b.bottom-2&&a.bottom>b.top+2);
    const brand=toRect(document.querySelector('.site-brand'));
    const portal=toRect(document.querySelector('.site-access-top'));
    const burger=toRect(document.querySelector('.site-burger'));
    const logo=toRect(document.querySelector('.site-logo'));
    const quote=document.querySelector('.m-verset p');
    const quoteBg=document.querySelector('.m-verset');
    const cssColor=quote?getComputedStyle(quote).color:null;
    const cssBg=quoteBg?getComputedStyle(quoteBg).backgroundColor:null;
    function ratio(fg,bg){
     const col=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);
      if(!m)return null;
      const x=m[1].split(/[ ,/]+/).map(Number);
      if(x.length<3||x.slice(0,3).some(v=>!Number.isFinite(v)))return null;
      return x.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
     };
     const a=col(fg),b=col(bg);if(!a||!b)return null;
     const L=x=>.2126*x[0]+.7152*x[1]+.0722*x[2];
     return Math.round(((Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05))*100)/100;
    }
    const overflowElements=[...document.querySelectorAll('body *')].map(el=>{
      const r=el.getBoundingClientRect();const style=getComputedStyle(el);
      return {tag:el.tagName.toLowerCase(),id:el.id||'',classes:String(el.className||'').slice(0,95),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),position:style.position};
    }).filter(x=>x.right>innerWidth+12&&x.width>24&&x.left<innerWidth).sort((a,b)=>b.right-a.right).slice(0,15);
    const poleLinks=[...document.querySelectorAll('a.sde-pole-officiel-lien')];
    const posters=[...document.querySelectorAll('img.sde-event-poster')];
    return {
     title:document.title,
     viewport:innerWidth,
     bodyWidth:document.body.scrollWidth,
     documentWidth:document.documentElement.scrollWidth,
     overflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth,document.body.scrollWidth-innerWidth),
     overflowElements,
     logoPresent:!!(logo&&logo.width>10),
     brandPortalOverlap:intersects(brand,portal),
     brandBurgerOverlap:intersects(brand,burger),
     quoteContrast:ratio(cssColor,cssBg),quoteTextColor:cssColor,quoteBgColor:cssBg,
     poleLinks:poleLinks.length,
     brokenPoleImages:poleLinks.filter(a=>{let i=a.querySelector('img');return !i||!i.complete||i.naturalWidth===0}).length,
     tpaPosters:posters.length,
     tpaPosterLoaded:posters.every(i=>i.complete&&i.naturalWidth>0),
     heading:document.querySelector('h1')?.textContent?.trim().slice(0,95)||'',
     loadMs:Math.round(performance.getEntriesByType('navigation')[0]?.duration||0),
     // Mesures de laboratoire Chromium : indicatives, non assimilables aux données utilisateurs.
     labMetrics:{
       lcpMs:window.__sdeLabMetrics?.lcp||null,
       cls:Math.round((window.__sdeLabMetrics?.cls||0)*1000)/1000,
       fcpMs:Math.round(performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')?.startTime||0)||null,
       resources:performance.getEntriesByType('resource').length,
       transferKB:Math.round(performance.getEntriesByType('resource').reduce((n,x)=>n+(x.transferSize||0),0)/1024)
     }
    };
   });
   const row={...c,status:response?.status()||0,url:page.url(),...view,pageErrors};
   report.checks.push(row);
   const screenshot=join(out,c.name+'.png');
   await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
   // INTERACTIONS_NAVI : le menu et le changement de thème doivent fonctionner sur un vrai téléphone.
   if(c.name==='accueil-390'){
    try{
     const burger=page.locator('.site-header .site-burger').first();
     if(await burger.count()!==1)issue(c.name,'bouton du menu mobile absent',true);
     else{
      await burger.click({timeout:4000});
      const opened=await burger.getAttribute('aria-expanded');
      const menuOpen=await page.locator('.site-header .site-menu').first().getAttribute('data-open');
      if(opened!=='true'||menuOpen!=='true')issue(c.name,'le menu ne s’ouvre pas correctement',true);
      await page.keyboard.press('Escape');
      const closed=await burger.getAttribute('aria-expanded');
      const menuClosed=await page.locator('.site-header .site-menu').first().getAttribute('data-open');
      if(closed!=='false'||menuClosed!=='false')issue(c.name,'le menu ne se ferme pas avec Échap',true);
      report.notes.push({test:'menu-mobile',opened,menuOpen,closed,menuClosed});
     }
     const toggle=page.locator('.site-header .site-theme-toggle').first();
     if(await toggle.count()!==1)issue(c.name,'commande de thème absente',true);
     else{
      const themeBefore=await page.locator('html').getAttribute('data-theme');
      await toggle.click({timeout:4000});
      const themeAfter=await page.locator('html').getAttribute('data-theme');
      if(themeAfter===themeBefore || !['light','dark'].includes(themeAfter))issue(c.name,'bouton clair/sombre sans changement réel',true);
      report.notes.push({test:'theme-mobile',before:themeBefore,after:themeAfter});
     }
    }catch(e){issue(c.name,'interaction mobile en échec : '+String(e.message||e).slice(0,240),true);}
   }
   if(row.status!==200)issue(c.name,'HTTP '+row.status,true);
   if(row.overflowX>16)issue(c.name,'débordement horizontal de '+row.overflowX+' px',true);
   if(c.width<700&&row.brandPortalOverlap)issue(c.name,'le nom chevauche le bouton du portail',true);
   if(c.width<700&&row.brandBurgerOverlap)issue(c.name,'le nom chevauche le menu',true);
   if(c.path==='/'&&row.quoteContrast!==null&&row.quoteContrast<4.5)issue(c.name,'contraste du verset '+row.quoteContrast+':1',true);
   if(c.path==='/'&&(row.poleLinks!==5||row.brokenPoleImages>0))issue(c.name,'cartes/emblèmes pôles manquants ou images indisponibles',true);
   if(c.path==='/'&&(!row.tpaPosters||!row.tpaPosterLoaded))issue(c.name,'affiche TPA absente ou non chargée',true);
   if(row.pageErrors.length)issue(c.name,row.pageErrors.slice(0,3).join(' | '));
   console.log('AUDIT '+c.name+' '+JSON.stringify(row));
  } catch(error){
   issue(c.name,String(error.message||error).slice(0,500),true);
  } finally{await ctx.close();}
 }
 // Requêtes de vérification en lecture seule : jamais de connexion ou d'écriture.
 for(const path of ['/api/moi','/api/notifications-status','/api/vapid-public-key']){
  try{
   const response=await fetch(domain+path,{redirect:'manual',signal:AbortSignal.timeout(12000)});
   report.notes.push({path,status:response.status,cacheControl:response.headers.get('cache-control')||null});
   if(path==='/api/vapid-public-key'){
    const config=await response.json();
    const active=response.status===200&&typeof config?.key==='string'&&/^[A-Za-z0-9_-]{80,100}$/.test(config.key);
    report.notes.push({test:'VAPID_ACTIF',active});
    console.log('VAPID_ACTIF '+(active?'oui':'non'));
    if(!active)issue(path,'clés VAPID manquantes après publication',true);
   }
   if(path==='/api/notifications-status'&&response.status!==403)
    issue(path,'statut de configuration sensible non protégé : HTTP '+response.status,true);
  }catch(e){issue(path,'vérification indisponible : '+String(e.message||e).slice(0,130));}
 }
}finally{await browser.close();}
writeFileSync(join(out,'rapport.json'),JSON.stringify(report,null,2)+'\n');
const critical=report.issues.filter(x=>x.critical);
console.log('BILAN_MOBILE '+JSON.stringify({pages:report.checks.length,observations:report.issues.length,critiques:critical.length}));
if(critical.length)process.exitCode=1;
