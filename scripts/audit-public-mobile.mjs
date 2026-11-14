/* Audit réel des pages PUBLIQUES uniquement.
   Ne se connecte pas, n'ouvre aucun dossier personnel et n'effectue aucune écriture API.
   Exécution dans GitHub Actions avec Chromium, captures à consulter par le propriétaire. */
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const domain='https://mouvement-sde.org';
const mobileViewports=[360,390];
const out='audit-mobile-sde';
mkdirSync(out,{recursive:true});
const cases=[
 {path:'/',name:'accueil-360',width:360,height:800},
 {path:'/',name:'accueil-390',width:390,height:844},
 {path:'/programmes',name:'programmes-360',width:360,height:800},
 {path:'/programmes',name:'programmes-768',width:768,height:1024},
 {path:'/programmes',name:'programmes-1600',width:1600,height:900},
 {path:'/programmes',name:'programmes-390',width:390,height:844},
 {path:'/mouvement',name:'mouvement-390',width:390,height:844},
 {path:'/connexion',name:'connexion-360',width:360,height:800},
 {path:'/connexion',name:'connexion-768',width:768,height:1024},
 {path:'/connexion',name:'connexion-1280',width:1280,height:900},
 {path:'/connexion',name:'connexion-1600',width:1600,height:900},
 {path:'/connexion',name:'connexion-390',width:390,height:844},
 {path:'/priere',name:'priere-anonyme-390',width:390,height:844},
 {path:'/soutenir',name:'soutenir-390',width:390,height:844},
 {path:'/transparence',name:'transparence-390',width:390,height:844},
 {path:'/calendrier',name:'calendrier-390',width:390,height:844},
 {path:'/academy',name:'academy-768',width:768,height:1024},
 {path:'/academy',name:'academy-1280',width:1280,height:900},
 {path:'/academy',name:'academy-390',width:390,height:844},
 {path:'/soldier-quest',name:'soldier-quest-390',width:390,height:844},
 {path:'/soldiers-tv',name:'soldiers-tv-390',width:390,height:844},
 {path:'/soldier-quest',name:'soldier-quest-1600',width:1600,height:900},
 {path:'/soldier-quest',name:'soldier-quest-desktop',width:1280,height:900},
 {path:'/soldiers-tv',name:'soldiers-tv-768',width:768,height:1024},
 {path:'/soldiers-tv',name:'soldiers-tv-1600',width:1600,height:900},
 {path:'/soldiers-tv',name:'soldiers-tv-desktop',width:1280,height:900},
 {path:'/vitrine/album-infire.html',name:'galerie-infire-390',width:390,height:844},
 {path:'/',name:'accueil-tablette',width:768,height:1024},
 {path:'/',name:'accueil-960',width:960,height:800},
 {path:'/',name:'accueil-1024',width:1024,height:768},
 {path:'/',name:'accueil-1100',width:1100,height:820},
 {path:'/',name:'accueil-desktop',width:1280,height:900},
 {path:'/programmes',name:'programmes-desktop',width:1280,height:900},
 {path:'/mouvement',name:'mouvement-desktop',width:1280,height:900},
 {path:'/',name:'accueil-1550',width:1550,height:900},
 {path:'/',name:'accueil-1600',width:1600,height:900},
 {path:'/rubriques',name:'rubriques-390',width:390,height:844},
 {path:'/plus',name:'plus-390',width:390,height:844},
 {path:'/contact',name:'contact-390',width:390,height:844},
 {path:'/contact',name:'contact-desktop',width:1280,height:900},
 {path:'/soutenir',name:'soutenir-desktop',width:1280,height:900},
 {path:'/pole-reveil',name:'pole-reveil-390',width:390,height:844},
 {path:'/pole-social',name:'pole-social-390',width:390,height:844},
 {path:'/pole-logistique',name:'pole-logistique-390',width:390,height:844},
 {path:'/pole-medias',name:'pole-medias-390',width:390,height:844},
 {path:'/missions',name:'missions-390',width:390,height:844},
 {path:'/missions-humanitaires',name:'missions-humanitaires-390',width:390,height:844},
 {path:'/gouvernance',name:'gouvernance-390',width:390,height:844},
 {path:'/reseau',name:'reseau-390',width:390,height:844},
 {path:'/communaute',name:'communaute-390',width:390,height:844},
 {path:'/newsletter',name:'newsletter-390',width:390,height:844},
 {path:'/temoignages',name:'temoignages-390',width:390,height:844},
 {path:'/enseignements',name:'enseignements-390',width:390,height:844},
 {path:'/mediatheque',name:'mediatheque-390',width:390,height:844},
 {path:'/formulaire',name:'formulaire-390',width:390,height:844},
 {path:'/rechercher',name:'rechercher-390',width:390,height:844},
 {path:'/soldiers-voice',name:'soldiers-voice-390',width:390,height:844},
 {path:'/boutique',name:'boutique-390',width:390,height:844},
 {path:'/confidentialite',name:'confidentialite-390',width:390,height:844},
 {path:'/soldiers-award',name:'soldiers-award-390',width:390,height:844},
 {path:'/pole-formation',name:'pole-formation-390',width:390,height:844}
];
const poleReferences={
 'pole-reveil-390':'Réveil, évangélisation & missions',
 'pole-social-390':'Impact social & humanitaire',
 'pole-logistique-390':'Logistique & organisation',
 'pole-medias-390':'Communication, médias & digital',
 'pole-formation-390':'Formation & développement intégral'
};
const report={date:new Date().toISOString(),domain,checks:[],issues:[],notes:[]};
const browser=await chromium.launch({headless:true,...(process.env.SDE_CHROME_EXECUTABLE?{executablePath:process.env.SDE_CHROME_EXECUTABLE}:{}),args:['--no-sandbox']});

function issue(label,description,critical=false){
 report.issues.push({label,description,critical});
 console.log((critical?'ERREUR':'OBSERVATION')+' '+label+': '+description);
}
try{
 for(const c of cases){
  const ctx=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:1,isMobile:c.width<700,hasTouch:c.width<700,colorScheme:'light',locale:'fr-CI'});
  const page=await ctx.newPage();
  await page.addInitScript(() => {
   window.__sdeLabMetrics={lcp:0,cls:0,shifts:[]};
   try {
    new PerformanceObserver(list=>{
     const entries=list.getEntries();
     if(entries.length)window.__sdeLabMetrics.lcp=Math.round(entries.at(-1).startTime);
    }).observe({type:'largest-contentful-paint',buffered:true});
   } catch (_) {}
   try {
    new PerformanceObserver(list=>{
     for(const entry of list.getEntries()){
      if(entry.hadRecentInput)continue;
      window.__sdeLabMetrics.cls+=entry.value;
      if(window.__sdeLabMetrics.shifts.length<12){
       const moved=(entry.sources||[]).slice(0,4).map(s=>{
        const el=s.node;
        const tag=typeof el?.tagName==='string'?el.tagName.toLowerCase():'unknown';
        return {element:tag+(el?.id?'#'+el.id:'')+(typeof el?.className==='string'&&el.className?'.'+el.className.trim().replace(/\s+/g,'.').slice(0,90):''),
         previousTop:Math.round(s.previousRect?.top||0),currentTop:Math.round(s.currentRect?.top||0)};
       });
       window.__sdeLabMetrics.shifts.push({value:Math.round(entry.value*10000)/10000,moved});
      }
     }
    }).observe({type:'layout-shift',buffered:true});
   } catch (_) {}
  });

  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error.message||error).slice(0,250)));
  try{
   const response=await page.goto(domain+c.path,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(1700);
   // Vérification matérielle de la refonte : présence du nouveau DOM ET de la
   // feuille CSS réellement chargée sur le domaine (pas seulement dans GitHub).
   if(['/', '/academy', '/connexion'].includes(c.path)){
    const visible=await page.evaluate(()=>{
     const css=[...document.styleSheets].some(s=>(s.href||'').includes('sde-citadelle-celeste-2027.css'));
     const marker=document.querySelector('[data-sde-visible-revision="citadelle-2027-v2"]');
     const style=marker?getComputedStyle(marker):null;
     const rect=marker?.getBoundingClientRect();
     const visual=!!(marker&&style&&style.display!=='none'&&style.visibility!=='hidden'&&rect.width>200&&rect.height>25);
     const home=location.pathname==='/';
     const cards=home?document.querySelectorAll('.sde-citadelle-quicknav-items a').length:0;
     const title=home?document.querySelector('.sde-vision-wordmark')?.textContent?.trim():null;
     return {css,visual,cards,title,
      version:marker?.dataset.sdeVisibleRevision||null,
      computedBackground:style?.backgroundColor||null};
    });
    report.notes.push({page:c.name,relaunch:visible});
    console.log('RECEPTION CITADELLE '+c.name+' '+JSON.stringify(visible));
    if(!visible.css||!visible.visual||(c.path==='/'&&(visible.cards!==4||!visible.title?.includes('SOLDATS DE L’ÉTERNEL')))){
     issue(c.name,'La refonte Citadelle 2027 ne se voit pas sur la page publiée (CSS/DOM/dimensions).',true);
    }
   }
   // Recette visuelle : vérifier les COULEURS CALCULÉES, et non seulement
   // la présence des classes ou la réussite du déploiement.
   if(['/academy','/connexion','/'].includes(c.path)){
    const visualQA=await page.evaluate(()=>{
     const rgb=s=>{
      const m=String(s).match(/rgba?\(([^)]+)\)/);
      return m?m[1].split(/[ ,/]+/).slice(0,3).map(Number):null;
     };
     const lum=s=>{
      const arr=rgb(s);if(!arr||arr.length!==3||arr.some(v=>!Number.isFinite(v)))return null;
      const v=arr.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});
      return .2126*v[0]+.7152*v[1]+.0722*v[2];
     };
     const ratio=(a,b)=>{
      const x=lum(a),y=lum(b);
      return x===null||y===null?null:Math.round((Math.max(x,y)+.05)/(Math.min(x,y)+.05)*100)/100;
     };
     if(location.pathname==='/academy'){
      const strong=document.querySelector('.sa-premium-grid .sa-premium-card summary strong');
      const card=strong?.closest('.sa-premium-card');
      return {kind:'academy-card',found:!!(strong&&card),
       contrast:strong&&card?ratio(getComputedStyle(strong).color,getComputedStyle(card).backgroundColor):null,
       fg:strong?getComputedStyle(strong).color:null,bg:card?getComputedStyle(card).backgroundColor:null,
       focusBottom:document.querySelector('.sde-reader-tools')?.getBoundingClientRect().bottom||null,
       previewTop:document.querySelector('.sa-premium-preview')?.getBoundingClientRect().top||null,
       navTop:document.querySelector('.sde-shell-bottom')?.getBoundingClientRect().top||null};
     }
     if(location.pathname==='/connexion'){
      const selected=document.querySelector('.ref-access-targets button[aria-pressed="true"]');
      return {kind:'login-target',found:!!selected,
       contrast:selected?ratio(getComputedStyle(selected).color,getComputedStyle(selected).backgroundColor):null,
       fg:selected?getComputedStyle(selected).color:null,bg:selected?getComputedStyle(selected).backgroundColor:null};
     }
     const label=document.querySelector('.sde-shell-portal .sde-shell-portal-label');
     const parent=label?.closest('a');
     const rect=label?.getBoundingClientRect();
     return {kind:'portal-label',found:!!label,
      labelWidth:rect?.width||0,visible:!!(label&&parent&&rect.width>12&&getComputedStyle(label).visibility!=='hidden'),
      text:label?.textContent||''};
    });
    report.notes.push({page:c.name,visualQA});
    console.log('CONTRASTE_NAV_SDE '+c.name+' '+JSON.stringify(visualQA));
    if(visualQA.kind!=='portal-label' && (!visualQA.found||visualQA.contrast===null||visualQA.contrast<4.5)){
     issue(c.name,'Contraste illisible dans '+visualQA.kind+' : '+String(visualQA.contrast),true);
    }
    if(c.path==='/academy' && c.width<700 &&
       visualQA.focusBottom!==null&&visualQA.navTop!==null&&visualQA.focusBottom>visualQA.navTop+2){
     issue(c.name,'Bouton Mode Focus superposé à la barre mobile',true);
    }
    if(c.path==='/academy' && c.width<700 &&
       visualQA.previewTop!==null&&visualQA.focusBottom!==null&&visualQA.focusBottom>visualQA.previewTop+2){
     issue(c.name,'Bouton Mode Focus superposé à la couverture Academy',true);
    }
    if(c.path==='/' && c.width<900 && !visualQA.visible){
     issue(c.name,'Libellé Portail absent de la barre mobile',true);
    }
   }
   if(c.path==='/'){
    const images=await page.locator('.sde-pole-officiel-lien img, img.sde-event-poster, .ap-poster-media img').all();
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
    const brand=toRect(document.querySelector('.sde-shell-brand,.site-brand'));
    const portal=toRect(document.querySelector('.sde-shell-portal,.site-access-top'));
    const burger=toRect(document.querySelector('.sde-shell-open,.site-burger'));
    const logo=toRect(document.querySelector('.sde-shell-brand img,.site-logo'));
    const quote=document.querySelector('.ap-verset p, .m-verset p');
    const quoteBg=document.querySelector('.ap-verset, .m-verset');
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
    const posters=[...document.querySelectorAll('img.sde-event-poster, .ap-poster-media img')];
    return {
     title:document.title,
     viewport:innerWidth,
     bodyWidth:document.body.scrollWidth,
     documentWidth:document.documentElement.scrollWidth,
     overflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth,document.body.scrollWidth-innerWidth),
     overflowElements,
     touchTargets:innerWidth<=390?[...document.querySelectorAll('button,[role="button"],nav a,form input:not([type="hidden"]),form select,form textarea,form a')]
      .filter(el=>{
       const s=getComputedStyle(el),r=el.getBoundingClientRect();
       // Honeypots hors écran : pas de cible utilisable par un visiteur.
       if(el.closest('.hidden-bot,[aria-hidden="true"]')||s.display==='none'||s.visibility==='hidden'
          ||Number(s.opacity)===0||r.width<=0||r.height<=0||r.right<=0||r.left>=innerWidth)return false;
       // La zone cliquable d'une case cochable inclut son label associé.
       if(el.matches('input[type="checkbox"],input[type="radio"]')&&el.labels?.length){
        if([...el.labels].some(label=>{const lr=label.getBoundingClientRect();return lr.width>=44&&lr.height>=44}))return false;
       }
       return r.width<44||r.height<44;
      })
      .slice(0,20).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),id:el.id||'',label:(el.textContent||el.getAttribute('aria-label')||el.getAttribute('name')||'').trim().slice(0,55),width:Math.round(r.width),height:Math.round(r.height)}}):[],
     logoPresent:!!(logo&&logo.width>10),
     brandPortalOverlap:intersects(brand,portal),
     brandBurgerOverlap:intersects(brand,burger),
     quoteContrast:ratio(cssColor,cssBg),quoteTextColor:cssColor,quoteBgColor:cssBg,
     homepageTextContrast:(()=>{
      const nodes=[...document.querySelectorAll('#ap-next-title,#ap-upcoming-title,.ap-mission strong,.ap-mission span,.ap-panel h3')];
      return nodes.map(el=>{
       const parent=el.closest('.ap-next,.ap-upcoming,.ap-mission,.ap-panel');
       const style=getComputedStyle(el);
       const fill=style.webkitTextFillColor;
       const fg=fill&&fill.toLowerCase()!=='currentcolor'?fill:style.color;
       const bg=parent?getComputedStyle(parent).backgroundColor:'';
       return {label:el.textContent.trim().slice(0,65),ratio:ratio(fg,bg),fg,bg};
      });
     })(),
     heroBgMobile:document.querySelector('.ap-hero-bg')?getComputedStyle(document.querySelector('.ap-hero-bg')).backgroundImage:null,
     posterImageSource:document.querySelector('.ap-poster-media img')?.currentSrc||null,
     poleCardsContrast:(()=>{
      if(!document.body.classList.contains('sde-pole'))return null;
      const texts=[...document.querySelectorAll('#contenu .sde-initiative-card :is(h3,h4,p,li,small,strong)')];
      return texts.map(el=>{
       const card=el.closest('.sde-initiative-card');
       const style=getComputedStyle(el);
       const fill=style.webkitTextFillColor;
       const color=fill&&fill.toLowerCase()!=='currentcolor'?fill:style.color;
       const background=getComputedStyle(card).backgroundColor;
       return {text:(el.textContent||'').trim().slice(0,55),contrast:ratio(color,background),color,bg:background};
      });
     })(),
     poleLinks:poleLinks.length,
     brokenPoleImages:poleLinks.filter(a=>{let i=a.querySelector('img');return !i||!i.complete||i.naturalWidth===0}).length,
     tpaPosters:posters.length,
     tpaCompact:!!(document.querySelector('.sde-shell-event a[href="/programmes#tpa-2026"]')&&document.querySelector('#prochain-rendez-vous[data-evenement="tpa-2026"]')),
     tpaCompactVisible:!!document.querySelector('.sde-shell-event')&&getComputedStyle(document.querySelector('.sde-shell-event')).display!=='none',
     tpaPosterLoaded:posters.every(i=>i.complete&&i.naturalWidth>0),
     publicPoleForm:(()=>{const f=document.querySelector('form[data-pole-engager]');return f?{
       reference:f.dataset.poleReference||'',
       hasPrivacy:!!f.querySelector('a[href="/confidentialite"]'),
       hasName:!!f.querySelector('input[name="nom"]'),
       hasContact:!!f.querySelector('input[name="contact"]'),
       hasConsent:!!f.querySelector('input[name="accord"][required]'),
       hasFeedback:!!f.querySelector('.sde-form-feedback'),
       imageAvailable:!![...document.querySelectorAll('img.sde-pole-img')].find(img=>img.complete&&img.naturalWidth>0)
      }:null;})(),
     heroIntroHeight:document.querySelector(".iv-intro")?Math.round(document.querySelector(".iv-intro").getBoundingClientRect().height):null,
     premiumHome:!!document.querySelector('.ap-hero'),
     premiumHeroHeight:document.querySelector('.ap-hero-inner')?Math.round(document.querySelector('.ap-hero-inner').getBoundingClientRect().height):null,
     heading:document.querySelector('h1')?.textContent?.trim().slice(0,95)||'',
     loadMs:Math.round(performance.getEntriesByType('navigation')[0]?.duration||0),
     // Mesures de laboratoire Chromium : indicatives, non assimilables aux données utilisateurs.
     labMetrics:{
       lcpMs:window.__sdeLabMetrics?.lcp||null,
       cls:Math.round((window.__sdeLabMetrics?.cls||0)*1000)/1000,
       shiftSources:window.__sdeLabMetrics?.shifts||[],
       fcpMs:Math.round(performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')?.startTime||0)||null,
       resources:performance.getEntriesByType('resource').length,
       transferKB:Math.round(performance.getEntriesByType('resource').reduce((n,x)=>n+(x.transferSize||0),0)/1024)
     }
    };
   });
   const row={...c,status:response?.status()||0,url:page.url(),...view,pageErrors};
   report.checks.push(row);
   if(c.path==='/mouvement'){
    // Recette visible de l'ordre doctrinal et des couleurs réellement calculées.
    // Aucun accès privé, aucune écriture et aucun secret de membre.
    const doctrine=await page.evaluate(()=>{
     const title=document.querySelector('#titre-axes')?.textContent.trim()||'';
     const lis=[...document.querySelectorAll('#axes .six-axes > li')];
     // Contraste WCAG calculé : plusieurs teintes foncées sont autorisées sur ivoire.
     const rgb=value=>{
      const match=String(value||'').match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/);
      return match ? match.slice(1,4).map(Number) : null;
     };
     const luminance=values=>{
      const [r,g,b]=values.map(x=>{const n=x/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});
      return 0.2126*r+0.7152*g+0.0722*b;
     };
     const ratio=(a,b)=>{
      if(!a||!b)return null;
      const x=luminance(a),y=luminance(b);
      return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
     };
     const items=lis.map(el=>{
      const h=el.querySelector('h3'),p=el.querySelector('p');
      const hs=h?getComputedStyle(h):null,li=getComputedStyle(el);
      const rect=el.getBoundingClientRect();
      const bg=li.backgroundImage;
      const stops=[...bg.matchAll(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)]
       .map(match=>match.slice(1,4).map(Number));
      if(!stops.length){const plain=rgb(li.backgroundColor);if(plain)stops.push(plain);}
      const foregrounds=[h,p].filter(Boolean).map(node=>rgb(getComputedStyle(node).color));
      const all=foregrounds.flatMap(fg=>stops.map(stop=>ratio(fg,stop))).filter(x=>x!==null);
      return {
       name:h?.textContent.trim()||'',subtitle:p?.textContent.trim()||'',
       fg:hs?.color||'',opacity:li.opacity,visibility:li.visibility,
       width:Math.round(rect.width),bg,contrastMin:all.length?Math.min(...all):null
      };
     });
     return {title,items,css:!!document.querySelector('link[href*="sde-citadelle-celeste-2027.css"]')};
    });
    report.notes.push({page:c.name,doctrine});
    console.log('SIX_AXES_SDE '+c.name+' '+JSON.stringify(doctrine));
    const names=['Rassembler et Unir','Former','Réveiller','Restaurer','Équiper','Envoyer'];
    const subtitles=['','Enraciner dans la Parole',"Ranimer la flamme de l'Esprit",
     'Guérir, relever, rétablir','Armer pour le combat','Partir vers les nations'];
    if(!doctrine.css||doctrine.title!=='Six axes pour former un soldat'||
       JSON.stringify(doctrine.items.map(x=>x.name))!==JSON.stringify(names)||
       JSON.stringify(doctrine.items.map(x=>x.subtitle))!==JSON.stringify(subtitles)||
       doctrine.items.some(x=>x.contrastMin===null||x.contrastMin<4.5||x.visibility!=='visible'||Number(x.opacity)<.99||x.width<120)){
      issue(c.name,'Doctrine des six axes illisible, dans le désordre ou absente sur le vrai site : '+JSON.stringify(doctrine).slice(0,700),true);
    }
    await page.locator('#axes').scrollIntoViewIfNeeded();
   }
   const screenshot=join(out,c.name+'.png');
   await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
   
   // Contrôler dans le navigateur les couleurs calculées après cascade CSS
   // sur les surfaces les plus sensibles, sans envoyer de formulaire réel.
   if(['soutenir-390','soutenir-desktop','contact-390','contact-desktop'].includes(c.name)||c.width===390){
    const contrasts=await page.evaluate(()=>{
     const rgb=c=>{const m=String(c||'').match(/rgba?\(([^)]+)\)/);if(!m)return null;
      const x=m[1].split(/[ ,/]+/).map(Number);return x.length>=3&&x.slice(0,3).every(Number.isFinite)?x.slice(0,3):null;};
     const lum=x=>x.reduce((v,z,i)=>{let c=z/255;c=c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
      return v+c*[.2126,.7152,.0722][i];},0);
     const ratio=(fg,bg)=>{const a=rgb(fg),b=rgb(bg);if(!a||!b)return null;
      const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);};
     const check=(name,foreground,background,pseudo)=>{
      const node=document.querySelector(foreground),surface=document.querySelector(background);
      if(!node||!surface)return {name,missing:true};
      const style=getComputedStyle(node,pseudo||null),fill=style.webkitTextFillColor;
      const color=fill&&fill.toLowerCase()!=='currentcolor'?fill:style.color;
      const bg=getComputedStyle(surface).backgroundColor;
      return {name,color,bg,ratio:ratio(color,bg)};
     };
     const checks=[];
     if(document.querySelector('main .sde-privacy-note')){
      checks.push(check('notice-collecte','main .sde-privacy-note','main .sde-privacy-note'));
      if(document.querySelector('main .sde-privacy-note a'))
       checks.push(check('lien-notice','main .sde-privacy-note a','main .sde-privacy-note'));
     }
     if(location.pathname==='/soutenir'){
      const form='.hub-main #formulaire .hub-form';
      checks.push(
       check('libelle-montant',form+' label:has(input[name="montant"])',form),
       check('libelle-message',form+' label:has(textarea[name="message"])',form),
       check('consentement',form+' label.check',form),
       check('saisie-montant',form+' input[name="montant"]',form+' input[name="montant"]'),
       check('indication-montant',form+' input[name="montant"]',form+' input[name="montant"]','::placeholder'),
       check('indication-message',form+' textarea[name="message"]',form+' textarea[name="message"]','::placeholder')
      );
     }
     if(location.pathname==='/contact'){
      const section='#confidentialite',card=section+' .confidentialite';
      checks.push(
       check('titre-confidentialite',section+' .tete-section h2',section),
       check('sous-titre-confidentialite',card+' h3',card),
       check('paragraphe-confidentialite',card+' p',card),
       check('lien-confidentialite',card+' p a',card)
      );
     }
     return checks;
    });
    const failed=contrasts.filter(x=>x.missing||x.ratio===null||x.ratio<4.5);
    report.notes.push({test:'lecture-surfaces',page:c.name,contrasts});
    console.log('LISIBILITE_SDE '+c.name+' '+JSON.stringify({tested:contrasts.length,failed}));
    if(failed.length)issue(c.name,'contraste inférieur à WCAG AA : '+JSON.stringify(failed.slice(0,5)),true);
   }
   // Portail SDE : valider publiquement les parcours sans aucune connexion ni écriture.
   if(c.name==='connexion-390'){
    try{
     await page.locator('#sde-splash').waitFor({state:'hidden',timeout:8000}).catch(()=>{});
     const tabs=page.locator('.access-tabs [role="tab"]');
     if(await tabs.count()!==4)issue(c.name,'les quatre modes du portail sont incomplets',true);
     else{
      for(const name of ['connexion','inscription','activation','recuperation']){
       if(!(await page.locator('#tab-'+name).isVisible()))
        issue(c.name,'onglet '+name+' inaccessible visuellement',true);
      }
      await page.locator('#tab-inscription').click({timeout:4500});
      if(!(await page.locator('#panel-inscription').isVisible()))
       issue(c.name,'formulaire inscription non accessible',true);
      await page.locator('#tab-activation').click({timeout:4500});
      if(!(await page.locator('#panel-activation').isVisible()))
       issue(c.name,'activation de compte non accessible',true);
      await page.locator('#tab-recuperation').click({timeout:4500});
      if(!(await page.locator('#panel-recuperation').isVisible()))
       issue(c.name,'récupération de compte non accessible',true);
      await page.locator('#tab-connexion').click({timeout:4500});
      if(!(await page.locator('#panel-connexion').isVisible()))
       issue(c.name,'connexion non accessible après navigation',true);
      const targets=page.locator('[data-access-target]');
      if(await targets.count()!==2)issue(c.name,'cibles membre et administration absentes',true);
     }
    }catch(e){issue(c.name,'parcours de connexion inaccessible : '+String(e?.message||e).slice(0,140),true)}
   }
   // Galerie IN FIRE : images, onglets et fermeture au clavier sur téléphone.
   // Les années 2024 et 2026 restent vides tant que le classement n'a pas été confirmé.
   if(c.name==='galerie-infire-390'){
    try{
     const gallery=page.locator('#gallery .item');
     const tabs=page.locator('[role="tab"][data-year]');
     if(await tabs.count()!==3)issue(c.name,'onglets 2024, 2025 et 2026 manquants',true);
     if(await gallery.count()!==10)issue(c.name,'la galerie par défaut ne contient pas 10 photos',true);
     const first=gallery.first().locator('button');
     if(await first.count()===1){
      await first.click({timeout:5000});
      if(!await page.locator('#modal').evaluate(el=>el.classList.contains('open')))issue(c.name,'agrandissement des photos inopérant',true);
      await page.keyboard.press('Escape');
      if(await page.locator('#modal').evaluate(el=>el.classList.contains('open')))issue(c.name,'fermeture clavier de la photo inopérante',true);
     }
     await page.locator('[data-year="2024"]').click();
     if(await gallery.count()!==0 || await page.locator('#empty').isHidden())issue(c.name,'l’année 2024 ne présente pas son état vide',true);
     await page.locator('[data-year="2026"]').click();
     if(await gallery.count()!==0 || await page.locator('#empty').isHidden())issue(c.name,'l’année 2026 ne présente pas son état vide',true);
     await page.locator('[data-year="2025"]').click();
     if(await gallery.count()!==10)issue(c.name,'retour à 2025 sans photographies',true);
     report.notes.push({test:'galerie-infire-mobile',photos:await gallery.count(),annees:await tabs.count()});
    }catch(e){issue(c.name,'parcours galerie mobile indisponible : '+String(e.message||e).slice(0,220),true)}
   }
   // Préinscription Academy : vérifier le cycle erreur / succès sans aucun envoi réel.
   // Interception de toutes les requêtes POST de cette action, avec identités fictives.
   if(c.name==='academy-390'){
    try{
     const form=page.locator('#formulaire');
     if(await form.count()!==1)issue(c.name,'formulaire de préinscription introuvable',true);
     else{
      const requests=[];
      await page.route('**/api/preinscription-academy',async route=>{
       const payload=route.request().postData()||'';
       requests.push({method:route.request().method(),synthetic:payload.includes('academy-test@example.invalid')});
       const first=requests.length===1;
       await route.fulfill({status:first?422:200,contentType:'application/json',
        body:JSON.stringify(first?{erreur:'validation',message:'Essai contrôlé : corriger le formulaire.'}:{ok:true,message:'Préinscription fictive validée.'})});
      });
      await form.locator('input[name="nom"]').fill('AcademyTest');
      await form.locator('input[name="prenom"]').fill('Fictif');
      await form.locator('input[name="email"]').fill('academy-test@example.invalid');
      await form.locator('input[name="telephone"]').fill('0000000000');
      await form.locator('textarea[name="motivation"]').fill('Test de navigation fictif sans données personnelles.');
      await form.locator('input[name="accord"]').check();
      const send=form.locator('#btnEnvoyer');
      await send.click({timeout:6000});
      await page.waitForFunction(()=>document.getElementById('toast')?.textContent.includes('Essai contrôlé'),null,{timeout:6000});
      if(await send.isDisabled())issue(c.name,'bouton bloqué après retour d’erreur simulé',true);
      await send.click({timeout:6000});
      await page.waitForFunction(()=>document.getElementById('zoneSucces')?.style.display==='block',null,{timeout:6000});
      if(requests.length!==2||requests.some(x=>x.method!=='POST'||!x.synthetic))issue(c.name,'soumissions fictives non interceptées ou mal formées',true);
      report.notes.push({test:'academy-preinscription-simulee-sans-ecriture',requests:requests.length,success:await page.locator('#zoneSucces').isVisible()});
      await page.unroute('**/api/preinscription-academy');
     }
    }catch(e){issue(c.name,'parcours préinscription inopérant : '+String(e.message||e).slice(0,240),true)}
   }
   // Navigation mobile réelle : tiroir, cinq accordéons, recherche, fermeture clavier.
   if(c.name==='accueil-390'){
    try{
     const open=page.locator('.sde-shell-open'),overlay=page.locator('#sde-shell-overlay');
     if(await open.count()!==1||!(await open.isVisible()))issue(c.name,'bouton du menu mobile SDE absent',true);
     else{
      await open.click({timeout:4000});
      if((await open.getAttribute('aria-expanded'))!=='true'||!(await overlay.isVisible()))
       issue(c.name,'tiroir SDE ne s’ouvre pas',true);
      const groups=page.locator('.sde-shell-drawer-group');
      if(await groups.count()!==5)issue(c.name,'le tiroir ne propose pas cinq catégories',true);
      const sections=await groups.locator(':scope > summary').allTextContents();
      if(sections.map(x=>x.trim()).join('|')!==['Le Mouvement','Programmes & Agenda','Missions & Impact','Médias & Ressources','S’engager'].join('|'))
       issue(c.name,'titres des cinq rubriques mobiles incohérents : '+sections.join(' | '),true);
      await overlay.locator('.sde-shell-filter').fill('formation',{timeout:4000});
      const found=await overlay.locator('.sde-shell-submenu a:not([hidden])').count();
      if(found===0)issue(c.name,'recherche de rubriques inopérante',true);
      await page.keyboard.press('Escape');
      if((await open.getAttribute('aria-expanded'))!=='false'||await overlay.isVisible())
       issue(c.name,'Échap ne ferme pas le tiroir',true);
      report.notes.push({test:'menu-mobile-unifie',families:await groups.count(),searchResults:found});
     }
     if(await page.locator('.sde-shell-header .sde-shell-portal[href="/portail"]').count()!==1)
      issue(c.name,'accès direct au Portail S.D.E absent',true);
    }catch(error){issue(c.name,'navigation mobile en échec : '+String(error.message||error).slice(0,240),true);}
   }
   // Prière anonyme : simuler deux réponses sans aucune écriture vers la vraie API.
   // page.route intercepte la requête AVANT qu'elle quitte Chromium.
   if(c.name==='priere-anonyme-390'){
    try{
     const form=page.locator('form[data-sde-anonymous-prayer]');
     if(await form.count()!==1)issue(c.name,'formulaire anonyme absent',true);
     else{
      const requests=[];
      await page.route('**/api/priere-anonyme',async route=>{
       const payload=route.request().postDataJSON();
       requests.push(payload);
       const first=requests.length===1;
       await route.fulfill({
        status:first?429:200,contentType:'application/json',
        body:JSON.stringify(first?{erreur:'rate_limited',message:'Réessayez plus tard.'}:{ok:true,message:'Votre sujet fictif a été reçu anonymement.'})
       });
      });
      const fields=await form.locator('input[name="nom"],input[name="email"],input[name="contact"]').count();
      if(fields>0)issue(c.name,'le formulaire anonyme demande une identité',true);
      await form.locator('textarea[name="sujet"]').fill('Vérification fictive sans donnée personnelle');
      await form.locator('input[name="accord"]').check();
      const submit=form.locator('button[type="submit"]');
      const feedback=form.locator('.sde-form-feedback');
      await submit.click({timeout:6000});
      await page.waitForFunction(()=>document.querySelector('[data-sde-anonymous-prayer] .sde-form-feedback')?.dataset.state==='error',{timeout:6000});
      const errorText=await feedback.innerText();
      if(!errorText.includes('Réessayez plus tard'))issue(c.name,'erreur API invisible après refus simulé',true);
      if(await submit.isDisabled())issue(c.name,'bouton bloqué après erreur simulée',true);
      await submit.click({timeout:6000});
      await page.waitForFunction(()=>document.querySelector('[data-sde-anonymous-prayer] .sde-form-feedback')?.dataset.state==='ok',{timeout:6000});
      if(requests.length!==2||requests.some(x=>x.accord!==true||!x.sujet||x.nom||x.email||x.telephone))
       issue(c.name,'envoi simulé incorrect ou des informations personnelles figurent dans le corps',true);
      if((await form.locator('textarea[name="sujet"]').inputValue())!=='')
       issue(c.name,'le formulaire ne se réinitialise pas après confirmation simulée',true);
      report.notes.push({test:'priere-anonyme-simulee-sans-ecriture',requests:requests.length,errorText,finalState:await feedback.getAttribute('data-state')});
      await page.unroute('**/api/priere-anonyme');
     }
    }catch(e){issue(c.name,'parcours anonyme simulé échoué : '+String(e.message||e).slice(0,240),true);}
   }
   // Connexion sans distractions : formulaire visible, accès membre et administration préservés.
   if(c.name==='connexion-390'){
    try{
     const visible=await page.evaluate(()=>{
      const shown=selector=>[...document.querySelectorAll(selector)].some(el=>{
       const css=getComputedStyle(el),rect=el.getBoundingClientRect();
       return css.display!=='none'&&css.visibility!=='hidden'&&
        css.opacity!=='0'&&rect.width>1&&rect.height>1;
      });
      return {header:shown('.site-header'),reference:shown('.ref-login-art')};
     });
     // Un élément complètement absent du HTML est conforme, au même titre qu'un élément masqué.
     if(visible.header||visible.reference)
      issue(c.name,'barre publique ou image de maquette visible pendant la connexion',true);
     if(await page.locator('.access-back[href="/"]').count()!==1)
      issue(c.name,'lien de retour au site absent',true);
     const member=page.locator('[data-access-target="/mon-espace"]');
     const admin=page.locator('[data-access-target="/administration"]');
     if(await member.getAttribute('aria-pressed')!=='true'||await admin.getAttribute('aria-pressed')!=='false')
      issue(c.name,'entrée membre non présélectionnée',true);
     await admin.click({timeout:5000});
     if(new URL(page.url()).searchParams.get('retour')!=='/administration'||await admin.getAttribute('aria-pressed')!=='true')
      issue(c.name,'lien d’accès administrateur ne sélectionne pas le bon retour',true);
     await member.click({timeout:5000});
     if(new URL(page.url()).searchParams.get('retour')!=='/mon-espace'||await member.getAttribute('aria-pressed')!=='true')
      issue(c.name,'lien d’accès membre ne sélectionne pas le bon retour',true);
     report.notes.push({test:'connexion-sans-distraction',url:page.url(),...visible});
    }catch(e){issue(c.name,'sélection membre/administrateur indisponible : '+String(e.message||e).slice(0,220),true);}
   }
   // 801–1120px : la navigation principale s'ouvre via Rubriques.
   // Au-delà de 1120px : les cinq catégories passent en méga-menu.
   if(c.name==='accueil-1024'){
    try{
     const header=page.locator('.sde-shell-header');
     const groups=header.locator('.sde-shell-mega-group');
     const compact=header.locator('.sde-shell-rubriques');
     const overlay=page.locator('#sde-shell-overlay');
     const expected=['Le Mouvement','Programmes & Agenda','Missions & Impact','Médias & Ressources','S’engager'];
     if(await groups.count()!==5)issue(c.name,'le méga-menu ne contient plus cinq catégories',true);
     if(!(await compact.isVisible()))issue(c.name,'bouton Rubriques masqué à 1024px',true);
     else{
      await compact.click({timeout:4000});
      if(!(await overlay.isVisible())||(await compact.getAttribute('aria-expanded'))!=='true')
       issue(c.name,'le bouton Rubriques ne déploie pas le tiroir',true);
      const titles=await overlay.locator('.sde-shell-drawer-group > summary').allTextContents();
      if(titles.map(x=>x.trim()).join('|')!==expected.join('|'))
       issue(c.name,'catégories du tiroir compact incohérentes : '+titles.join(' | '),true);
      await overlay.locator('.sde-shell-filter').fill('formation',{timeout:4000});
      if(await overlay.locator('.sde-shell-submenu a:not([hidden])').count()===0)
       issue(c.name,'recherche Rubriques inactive à 1024px',true);
      await page.keyboard.press('Escape');
      if(await overlay.isVisible()||(await compact.getAttribute('aria-expanded'))!=='false')
       issue(c.name,'Échap ne ferme pas Rubriques à 1024px',true);
     }
     await page.setViewportSize({width:1280,height:900});
     await page.waitForTimeout(150);
     const first=groups.first().locator('summary');
     if(!(await first.isVisible()))issue(c.name,'le méga-menu ne réapparaît pas à 1280px',true);
     else{
      const titles=await groups.locator(':scope > summary').allTextContents();
      if(titles.map(x=>x.trim()).join('|')!==expected.join('|'))
       issue(c.name,'titres du méga-menu desktop incohérents : '+titles.join(' | '),true);
      await first.click({timeout:4000});
      if(!(await groups.first().evaluate(el=>el.open)))
       issue(c.name,'le méga-menu Le Mouvement ne s’ouvre pas',true);
     }
     if(await groups.last().locator('a[href="/soutenir"]').count()!==1)
      issue(c.name,'lien Soutenir absent du menu S’engager',true);
     if(await header.locator('.sde-shell-portal[href="/portail"]').count()!==1)
      issue(c.name,'entrée portail absente du header',true);
     report.notes.push({test:'rubriques-compactes-et-mega-desktop',menus:await groups.count(),visible:await header.isVisible()});
    }catch(error){issue(c.name,'navigation responsive indisponible : '+String(error.message||error).slice(0,300),true);}
   }
   if(c.name==='plus-390'&&new URL(page.url()).pathname!=='/rubriques')
    issue(c.name,'/plus doit rediriger vers /rubriques',true);
   if(Object.hasOwn(poleReferences,c.name)){
    const contrast=row.poleCardsContrast;
    if(!contrast||contrast.length<5)issue(c.name,'le contrôle de contraste des cartes n’a pas pu être effectué',true);
    else{
     const illisibles=contrast.filter(x=>x.contrast===null||x.contrast<4.5);
     const minimum=Math.min(...contrast.map(x=>x.contrast||0));
     report.notes.push({test:'contraste-cartes-poles',page:c.name,items:contrast.length,minRatio:minimum,examples:contrast.slice(0,2)});
     console.log('CONTRASTE_POLE '+c.name+' '+JSON.stringify({items:contrast.length,minRatio:minimum,illusibles:illisibles.slice(0,3)}));
     if(illisibles.length)issue(c.name,'texte trop pâle sur les cartes ivoire : '+JSON.stringify(illisibles.slice(0,3)),true);
    }
    const f=row.publicPoleForm;
    const ref=poleReferences[c.name];
    if(!f||f.reference!==ref||!f.hasPrivacy||!f.hasName||!f.hasContact||!f.hasConsent||!f.hasFeedback||!f.imageAvailable)
     issue(c.name,'formulaire public pôle incomplet, référence erronée ou emblème indisponible : '+JSON.stringify(f),true);
   }
   // Vérifications des pages de contribution, sans aucun paiement ni POST réel.
   if(c.name==='soutenir-390'){
    const note=await page.locator('.hub-note').first().innerText();
    const form=page.locator('form[data-sde-form]');
    if(!note.includes('Paiement en ligne en préparation')||await form.count()!==1)
     issue(c.name,'les modalités de contribution ou la demande de contact sont absentes',true);
    if(await form.locator('[name="consentement"][required]').count()!==1
       ||await form.locator('a[href="/confidentialite"]').count()<1)
     issue(c.name,'consentement ou confidentialité absent du formulaire de soutien',true);
    if(await page.locator('[data-projet]').count()!==3)
     issue(c.name,'trois collectes distinctes non accessibles',true);
    report.notes.push({test:'soutien-sans-paiement',note:note.slice(0,110)});
   }
   if(c.name==='transparence-390'){
    if(await page.locator('a[href="/confidentialite"]').count()<1)
     issue(c.name,'lien direct vers la confidentialité absent',true);
    if(await page.getByRole('heading',{name:'Bilans trimestriels',exact:true}).count()!==1)
     issue(c.name,'rubrique des bilans trimestriels absente',true);
    report.notes.push({test:'transparence-sans-faux-montants',heading:true});
   }
   if(c.name==='calendrier-390'){
    try{
     const name=page.locator('#hub-calendar-title');
     const before=await name.innerText();
     await page.locator('#hub-calendar-next').click({timeout:5000});
     const after=await name.innerText();
     if(before===after||await page.locator('#hub-calendar .day').count()<28)
      issue(c.name,'navigation du calendrier inactive',true);
     if(await page.locator('a[href="/programmes#tpa-2026"]').count()<1)
      issue(c.name,'lien officiel de la TPA absent',true);
     report.notes.push({test:'calendrier-navigation',before,after});
    }catch(e){issue(c.name,'calendrier indisponible : '+String(e.message||e).slice(0,190),true);}
   }
   // Le portail doit rester dans le flux de la page, sans bouger ni
   // rebondir indépendamment de l'en-tête pendant le défilement.
   // Le nouveau header est volontairement sticky : son bouton doit rester ancré,
   // sans translation indépendante, plutôt que forcer le style statique historique.
   if(['accueil-390','connexion-390','accueil-desktop'].includes(c.name)){
    try{
     const measure=await page.evaluate(async()=>{
      if(location.pathname==='/connexion'){
       const form=document.querySelector('#form-connexion');
       return {login:true,visible:!!form&&getComputedStyle(form).display!=='none'};
      }
      const header=document.querySelector('.sde-shell-header');
      const portal=header?.querySelector('.sde-shell-portal');
      if(!header||!portal)return {missing:true};
      const hs=getComputedStyle(header),ps=getComputedStyle(portal);
      const rect=portal.getBoundingClientRect();
      const top=header.getBoundingClientRect().top;
      const amount=Math.min(360,Math.max(0,document.documentElement.scrollHeight-innerHeight-12));
      scrollTo(0,amount);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return {
       position:hs.position,portalPosition:ps.position,animation:ps.animationName,
       portalWidth:rect.width,portalHeight:rect.height,
       headerShift:header.getBoundingClientRect().top-top,
       portalShift:portal.getBoundingClientRect().top-rect.top,
       scrolled:window.scrollY
      };
     });
     report.notes.push({test:'portail-stable-unifie',screen:c.name,...measure});
     if(measure.login){
      if(!measure.visible)issue(c.name,'formulaire de connexion masqué',true);
     }else if(measure.missing)issue(c.name,'portail absent du header partagé',true);
     else{
      if(measure.portalWidth<44||measure.portalHeight<40)
       issue(c.name,'cible portail inférieure à 44 px',true);
      if(measure.animation!=='none')issue(c.name,'bouton portail animé automatiquement',true);
      if(Math.abs(measure.headerShift-measure.portalShift)>8)
       issue(c.name,'bouton du portail déplacé indépendamment de l’en-tête',true);
      if(measure.position==='sticky'&&Math.abs(measure.headerShift)>8)
       issue(c.name,'en-tête sticky instable au défilement',true);
     }
     await page.evaluate(()=>scrollTo(0,0));
    }catch(error){issue(c.name,'vérification stabilité indisponible : '+String(error.message||error).slice(0,240),true);}
   }
   if(c.path==='/'&&!row.premiumHome&&c.width>=960&&c.width<=1100&&row.heroIntroHeight!==300)
    issue(c.name,'hauteur de la réserve tablette : '+row.heroIntroHeight+' px au lieu de 300 px',true);
   if(c.path==='/'&&!row.premiumHome&&c.width>=1101&&row.heroIntroHeight!==260)
    issue(c.name,'hauteur du bloc accueil instable : '+row.heroIntroHeight+' px au lieu de 260 px',true);
   if(c.path==='/'&&row.premiumHome&&(!(row.premiumHeroHeight>=280)))
    issue(c.name,'hauteur du nouvel accueil premium insuffisante : '+row.premiumHeroHeight+' px',true);
   if(row.status!==200)issue(c.name,'HTTP '+row.status,true);
   if(c.path==='/connexion'){
    const isolated=await page.evaluate(()=>{
     const visible=selector=>[...document.querySelectorAll(selector)].some(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&r.width>1&&r.height>1;
     });
     return {nav:visible('.site-header,.sde-auth-nav,.sde-shell-bottom,.sde-public-bottom-nav'),
      event:visible('.infire-takeover,#sde-event-root'),animations:visible('.sde-ambiance-ctl')};
    });
    if(isolated.nav||isolated.event||isolated.animations)
     issue(c.name,'connexion non isolée : '+JSON.stringify(isolated),true);
   }
   if(c.path==='/programmes'&&await page.locator('.event-clock').count()){
    const clock=(await page.locator('.event-clock').textContent())||'';
    if(clock.includes('--')||(!clock.includes('jours')&&!clock.includes('18 décembre')))
     issue(c.name,'compte à rebours TPA vide ou date lisible absente',true);
   }
   if(c.path==='/academy'&&(await page.locator('.sa-premium-quick a').count())<3)
    issue(c.name,'liens de parcours Academy absents',true);
   if(c.path==='/soldiers-tv'&&(await page.locator('.sdu-playlist-item').count())<2)
    issue(c.name,'playlist vidéo interactive absente',true);
   if(c.path==='/soldier-quest'&&(await page.locator('[data-sdu-filter-group]').count())<1)
    issue(c.name,'filtres de missions Soldier Quest absents',true);

   if(row.overflowX>16)issue(c.name,'débordement horizontal de '+row.overflowX+' px',true);
   if(mobileViewports.includes(c.width)&&row.touchTargets?.length)
    issue(c.name,'zones tactiles inférieures à 44 px : '+JSON.stringify(row.touchTargets.slice(0,6)),true);
   if(row.labMetrics?.cls>0.10)
    issue(c.name,'décalage de mise en page CLS de laboratoire '+row.labMetrics.cls+' (cible 0,10)',c.name==='mediatheque-390'||c.name==='accueil-tablette'||c.name==='mouvement-desktop');
   if(c.path==='/'&&c.width<=390&&row.premiumHeroHeight>1150)
    issue(c.name,'accueil trop haut sur smartphone : '+row.premiumHeroHeight+' px (objectif 1150 px)');
   if(c.width<700&&row.brandPortalOverlap)issue(c.name,'le nom chevauche le bouton du portail',true);
   if(c.width<700&&row.brandBurgerOverlap)issue(c.name,'le nom chevauche le menu',true);
   if(c.path==='/'&&row.quoteContrast!==null&&row.quoteContrast<4.5)issue(c.name,'contraste du verset '+row.quoteContrast+':1',true);
   if(c.path==='/'){
    const ratios=row.homepageTextContrast||[];
    const insuffisants=ratios.filter(x=>x.ratio===null||x.ratio<4.5);
    if(ratios.length<5||insuffisants.length)
     issue(c.name,'contraste des cartes de l’accueil inférieur à 4,5:1 : '+JSON.stringify(insuffisants.slice(0,4)),true);
    if(c.width<=860&&(!String(row.heroBgMobile||'').includes('hero-sde-640.webp')||String(row.heroBgMobile||'').includes('hero-sde-1280.webp')))
     issue(c.name,'la photo optimisée de la Citadelle doit être visible sans télécharger le grand fichier : '+row.heroBgMobile,true);
    if(c.width<=860&&row.posterImageSource!==null)
     issue(c.name,'l’accueil mobile charge inutilement une grande affiche TPA',true);
    report.notes.push({test:'pagespeed-cards',page:c.name,count:ratios.length,minRatio:Math.min(...ratios.map(x=>x.ratio||0)),poster:row.posterImageSource,heroBackground:row.heroBgMobile});
   }
   if(c.path==='/'&&(row.poleLinks!==5||row.brokenPoleImages>0))issue(c.name,'cartes/emblèmes pôles manquants ou images indisponibles',true);
   if(c.path==='/'&&(!row.tpaCompact||!row.tpaCompactVisible||row.tpaPosters!==0))issue(c.name,'bandeau TPA compact absent, caché ou doublé par une affiche',true);
   if(row.pageErrors.length)issue(c.name,row.pageErrors.slice(0,3).join(' | '),c.name==='academy-390');
   console.log('AUDIT '+c.name+' '+JSON.stringify(row));
  } catch(error){
   issue(c.name,String(error.message||error).slice(0,500),true);
  } finally{await ctx.close();}
 }
 // Navigation privée anonyme : uniquement des requêtes GET sans cookie.
 // Chaque entrée doit rediriger vers le formulaire sécurisé, jamais livrer
 // une application privée ou une donnée personnelle à un visiteur anonyme.
 for(const [path,retour] of [['/portail','/portail'],['/mon-espace','/mon-espace'],['/administration','/administration']]){
  try{
   const res=await fetch(domain+path,{redirect:'manual',signal:AbortSignal.timeout(12000)});
   const loc=res.headers.get('location')||'';
   const parsed=new URL(loc,domain);
   const valid=res.status===302&&parsed.origin===domain&&parsed.pathname==='/connexion'&&parsed.searchParams.get('retour')===retour;
   report.notes.push({test:'acces-prive-anonyme',path,status:res.status,location:loc,redirectValid:valid});
   if(!valid)issue(path,'redirection anonyme non conforme : HTTP '+res.status+' vers '+loc.slice(0,160),true);
   if(!/no-store/.test(res.headers.get('cache-control')||''))issue(path,'redirection privée mise en cache',true);
  }catch(e){issue(path,'protection de l’accès privé indisponible : '+String(e.message||e).slice(0,180),true)}
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
