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
 {path:'/connexion',name:'connexion-390',width:390,height:844},
 {path:'/priere',name:'priere-anonyme-390',width:390,height:844},
 {path:'/soutenir',name:'soutenir-390',width:390,height:844},
 {path:'/transparence',name:'transparence-390',width:390,height:844},
 {path:'/calendrier',name:'calendrier-390',width:390,height:844},
 {path:'/academy',name:'academy-390',width:390,height:844},
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
 {path:'/pole-reveil',name:'pole-reveil-390',width:390,height:844},
 {path:'/pole-social',name:'pole-social-390',width:390,height:844},
 {path:'/pole-logistique',name:'pole-logistique-390',width:390,height:844},
 {path:'/pole-medias',name:'pole-medias-390',width:390,height:844},
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
   const screenshot=join(out,c.name+'.png');
   await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
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
   // Parcours d'authentification en lecture seule : sélection du bon espace,
   // sans identifier d'utilisateur ni soumettre aucun formulaire.
   if(c.name==='connexion-390'){
    try{
     const tpa=page.locator('#sde-event-root a[href="/programmes#tpa-2026"]');
     if(await tpa.count()<1){
      const detail=await page.evaluate(()=>({bodyClass:document.body.className,
       banner:document.getElementById('sde-event-root')?.outerHTML.slice(0,850)||'élément absent',
       scriptReact:!!document.querySelector('script[src*="sde-experience.js"]')}));
      issue(c.name,'bannière TPA 2026 absente sur la connexion : '+JSON.stringify(detail).slice(0,950),true);
     }
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
     report.notes.push({test:'connexion-choix-membre-admin',url:page.url(),tpa:await tpa.count()});
    }catch(e){issue(c.name,'sélection des deux espaces indisponible : '+String(e.message||e).slice(0,200),true);}
   }
   // Vérification réelle du menu compact sur écran intermédiaire et de l'accès aux rubriques.
   if(c.name==='accueil-1024'){
    try{
     const burger=page.locator('.site-header .site-burger');
     await burger.click({timeout:4000});
     const beforeResize=await burger.getAttribute('aria-expanded');
     await page.setViewportSize({width:1280,height:900});
     await page.waitForTimeout(150);
     const afterResize=await burger.getAttribute('aria-expanded');
     const rubriques=page.locator('.site-header .site-menu a[href="/rubriques"]');
     if(beforeResize!=='true'||afterResize!=='true')
      issue(c.name,'le menu compact se referme entre 1024 et 1280 px',true);
     if(await rubriques.count()!==1)issue(c.name,'entrée Toutes les rubriques absente',true);
     else{
      await rubriques.click({timeout:4000});
      await page.waitForURL(url=>url.pathname==='/rubriques',{timeout:10000});
      report.notes.push({test:'rubriques-menu-compact',beforeResize,afterResize,finalUrl:page.url()});
     }
    }catch(error){
     issue(c.name,'navigation Rubriques sur ordinateur compact indisponible : '+String(error.message||error).slice(0,300),true);
    }
   }
   if(c.name==='plus-390'&&new URL(page.url()).pathname!=='/rubriques')
    issue(c.name,'/plus doit rediriger vers /rubriques',true);
   if(Object.hasOwn(poleReferences,c.name)){
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
       ||await form.locator('a[href="/confidentialite"]').count()!==1)
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
   if(['accueil-390','connexion-390','accueil-desktop'].includes(c.name)){
    try{
     const motion=await page.evaluate(async()=>{
      const header=document.querySelector('.site-header');
      const wrapper=document.querySelector('.site-access-top');
      const cta=document.querySelector('.site-portal-cta');
      if(!header||!wrapper||!cta)return {missing:true};
      const headerStyle=getComputedStyle(header),wrapStyle=getComputedStyle(wrapper),ctaStyle=getComputedStyle(cta);
      const initialHeader=header.getBoundingClientRect().top;
      const initialCTA=cta.getBoundingClientRect().top;
      document.documentElement.style.scrollBehavior='auto';
      const amount=Math.min(360,Math.max(0,document.documentElement.scrollHeight-innerHeight-12));
      window.scrollTo(0,amount);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return {
       position:headerStyle.position,
       accessPosition:wrapStyle.position,
       ctaPosition:ctaStyle.position,
       animation:ctaStyle.animationName,
       transform:ctaStyle.transform,
       scrollY:Math.round(window.scrollY),
       headerMoved:Math.round(header.getBoundingClientRect().top-initialHeader),
       ctaMoved:Math.round(cta.getBoundingClientRect().top-initialCTA)
      };
     });
     report.notes.push({test:'portail-stable',screen:c.name,...motion});
     if(motion.missing)issue(c.name,'bouton Mon Portail S.D.E absent',true);
     else{
      if(['sticky','fixed'].includes(motion.position))issue(c.name,'en-tête encore flottant : '+motion.position,true);
      if(motion.accessPosition!=='static'||motion.ctaPosition!=='static')issue(c.name,'bouton non ancré dans le flux normal',true);
      if(motion.animation!=='none'||motion.transform!=='none')issue(c.name,'bouton encore animé ou transformé',true);
      if(motion.scrollY>=90&&Math.abs(motion.headerMoved+motion.scrollY)>8)
       issue(c.name,'l’en-tête se déplace indépendamment du document',true);
      if(motion.scrollY>=90&&Math.abs(motion.headerMoved-motion.ctaMoved)>8)
       issue(c.name,'le bouton ballotte par rapport à son en-tête',true);
     }
     await page.evaluate(()=>scrollTo(0,0));
    }catch(error){
     issue(c.name,'vérification de stabilité indisponible : '+String(error.message||error).slice(0,240),true);
    }
   }
   if(c.path==='/'&&c.width>=960&&c.width<=1100&&row.heroIntroHeight!==300)
    issue(c.name,'hauteur de la réserve tablette : '+row.heroIntroHeight+' px au lieu de 300 px',true);
   if(c.path==='/'&&c.width>=1101&&row.heroIntroHeight!==260)
    issue(c.name,'hauteur du bloc accueil instable : '+row.heroIntroHeight+' px au lieu de 260 px',true);
   if(row.status!==200)issue(c.name,'HTTP '+row.status,true);
   if(row.overflowX>16)issue(c.name,'débordement horizontal de '+row.overflowX+' px',true);
   if(row.labMetrics?.cls>0.10)
    issue(c.name,'décalage de mise en page CLS de laboratoire '+row.labMetrics.cls+' (cible 0,10)');
   if(c.width<700&&row.brandPortalOverlap)issue(c.name,'le nom chevauche le bouton du portail',true);
   if(c.width<700&&row.brandBurgerOverlap)issue(c.name,'le nom chevauche le menu',true);
   if(c.path==='/'&&row.quoteContrast!==null&&row.quoteContrast<4.5)issue(c.name,'contraste du verset '+row.quoteContrast+':1',true);
   if(c.path==='/'&&(row.poleLinks!==5||row.brokenPoleImages>0))issue(c.name,'cartes/emblèmes pôles manquants ou images indisponibles',true);
   if(c.path==='/'&&(!row.tpaPosters||!row.tpaPosterLoaded))issue(c.name,'affiche TPA absente ou non chargée',true);
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
