/*
 * Recette authentifiée SDE en lecture seule, explicitement déclenchée.
 * Utiliser UNIQUEMENT deux comptes de test dédiés, sans données personnelles.
 * Aucun mot de passe, nom, contenu de page ou cookie dans les rapports.
 * Aucune capture persistée.
 */
import {chromium} from 'playwright';
import {lectureDeRecetteAutorisee} from './recette-lecture-seule.mjs';

const base='https://mouvement-sde.org';
const accounts=[
 {type:'membre',path:'/mon-espace',login:process.env.SDE_QA_MEMBER_LOGIN,password:process.env.SDE_QA_MEMBER_PASSWORD},
 {type:'administrateur',path:'/administration',login:process.env.SDE_QA_ADMIN_LOGIN,password:process.env.SDE_QA_ADMIN_PASSWORD}
];
for(const a of accounts) {
 if(!a.login||!a.password)throw Error('Comptes de recette manquants : renseigner les secrets SDE_QA_MEMBER_* et SDE_QA_ADMIN_* dans GitHub Actions');
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report=[];
const fiches=[];
try{
 for(const account of accounts){
  const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-CI'});
  const page=await context.newPage();
  const blocked=[];
  // Rien ne doit être transmis vers un autre domaine depuis une session QA.
  // Seuls le login et les lectures du Worker peuvent traverser ce pare-feu.
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==base){blocked.push('ressource externe');await route.abort();return}
   const permitted=lectureDeRecetteAutorisee({
     method:req.method(),pathname:u.pathname,body:req.postData()
   });
   if(permitted)return route.continue();
   blocked.push(req.method()+' '+u.pathname);
   await route.fulfill({status:403,contentType:'application/json',
     body:'{"message":"Action interdite en recette lecture seule"}'});
  });
  try{
   await page.goto(base+'/connexion?retour='+encodeURIComponent(account.path),{waitUntil:'domcontentloaded',timeout:30000});
   const loginForm=page.locator('#form-connexion');
   await loginForm.locator('input[name="email"]').fill(account.login);
   await loginForm.locator('input[name="motDePasse"]').fill(account.password);
   await Promise.all([
    page.waitForURL(u=>u.origin===base&&u.pathname===account.path,{timeout:30000}),
    loginForm.locator('button[type="submit"]').click()
   ]);
   await page.locator('main#main').waitFor({state:'attached',timeout:20000});
   await page.locator('#sde-direct-top').waitFor({state:'attached',timeout:20000});
   for(const width of [360,390,768,1280,1600]){
    await page.setViewportSize({width,height:width===360?800:width===390?844:width===768?1024:900});
    await page.waitForTimeout(450);
    const data=await page.evaluate(()=>{
      const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      const head=document.querySelector('#sde-direct-top .sde-direct-header');
      const items=[...(head?.children||[])].filter(el=>getComputedStyle(el).display!=='none').map(rect).filter(Boolean);
      const pairs=[];
      for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
       const a=items[i],b=items[j];
       const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left);
       const height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
       if(overlap>5&&height>5)pairs.push([i,j]);
      }
      const menu=document.querySelector('#sde-direct-menu-toggle');
      const css=getComputedStyle(menu);
      return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
       headingPresent:!!document.querySelector('main#main h1, main#main .sec-title, #sde-direct-top .sde-direct-title'),
       toolbarPresent:!!head,headerOverlaps:pairs,
       menuVisible:!!menu&&css.display!=='none'&&menu.getBoundingClientRect().width>0};
    });
    if(!data.headingPresent||!data.toolbarPresent)throw Error('Interface '+account.type+' incomplète ('+width+'px)');
    if(data.bodyWidth>width+3||data.documentWidth>width+3)throw Error('Débordement '+account.type+' ('+width+'px)');
    if(data.headerOverlaps.length)throw Error('Chevauchement en-tête '+account.type+' ('+width+'px)');
    if(width<=390&&data.menuVisible){
     await page.locator('#sde-direct-menu-toggle').click();
     if(await page.locator('#sde-direct-menu-toggle').getAttribute('aria-expanded')!=='true')
      throw Error('Rubriques privées inaccessibles pour '+account.type);
     await page.locator('#sde-direct-menu-toggle').click();
    }
    // Capture en mémoire : confirmer que Chromium dessine la page, sans disque ni artifact.
    const image=await page.screenshot({animations:'disabled',fullPage:false});
    if(image.length<10000)throw Error('Rendu incomplet pour '+account.type);
    report.push({role:account.type,width,overflow:Math.max(data.bodyWidth,data.documentWidth)-width,
      headerOverlaps:data.headerOverlaps.length,rendered:true});
   }

   // Ouvrir une vraie fiche via la navigation utilisateur, sans capturer son contenu.
   // Les assertions se limitent aux dimensions des blocs et des commandes.
   if(account.type==='administrateur'){
    await page.setViewportSize({width:390,height:844});
    const accesRegistre=page.locator('.sde-command-v4-bottom [data-module="membres"]');
    await accesRegistre.waitFor({state:'visible',timeout:15000});
    await accesRegistre.click();
    const premiereFiche=page.locator('#main .sde-member-register [data-act="voir-membre"]').first();
    await premiereFiche.waitFor({state:'visible',timeout:20000});
    await premiereFiche.click();
    const fiche=page.locator('#sheet .sde-member-profile');
    await fiche.waitFor({state:'visible',timeout:12000});
    for(const width of [360,390,768,1280,1600]){
     await page.setViewportSize({width,height:width===360?800:width===390?844:width===768?1024:900});
     await page.waitForTimeout(300);
     const dimensions=await fiche.evaluate(el=>{
      const sheet=el.closest('#sheet');
      const pane=sheet?.querySelector('.sheet-b');
      if(!pane)return {ouverte:false,debordement:0,blocsHorsCadre:0,ciblesTropPetites:0};
      const limite=pane.getBoundingClientRect();
      const blocs=[...el.querySelectorAll('.ident,.kv,.sde-member-phone,.actions')];
      const blocsHorsCadre=blocs.filter(node=>{
       const rect=node.getBoundingClientRect();
       return rect.left<limite.left-4||rect.right>limite.right+4;
      }).length;
      const cibles=[...el.querySelectorAll('.sde-member-phone .inline-actions .btn')];
      const ciblesTropPetites=cibles.filter(node=>node.getBoundingClientRect().height<43.5).length;
      return {ouverte:!sheet.hidden,debordement:Math.max(0,el.scrollWidth-el.clientWidth),
       blocsHorsCadre,ciblesTropPetites};
     });
     if(!dimensions.ouverte||dimensions.debordement>4||dimensions.blocsHorsCadre)
      throw Error('Fiche individuelle mal cadrée sur '+width+'px');
     if(dimensions.ciblesTropPetites)
      throw Error('Actions téléphoniques trop petites sur '+width+'px');
     fiches.push({width,ouverte:true,debordement:dimensions.debordement,ciblesTropPetites:0});
    }
    // Aucun nom, téléphone, identifiant, cookie ou visuel privé dans le rapport.
    console.log('RECETTE_FICHE '+JSON.stringify({tailles:fiches.map(x=>x.width),erreurs:0}));
   }

   // Vérifier la restriction entre les deux espaces avec le cookie actif, sans écrire.
   const forbidden=await context.request.get(base+'/administration',{maxRedirects:0});
   if(account.type==='membre'&&forbidden.status()!==403)
    throw Error('Le compte membre a reçu un statut inattendu sur Administration : '+forbidden.status());
   if(account.type==='administrateur'&&forbidden.status()!==200)
    throw Error('Administration inaccessible pour le compte de recette : '+forbidden.status());
   console.log('RECETTE_AUTH '+JSON.stringify({role:account.type,viewports:[360,390,768,1280,1600],writesBlocked:blocked.length}));
  }finally{await context.close();}
 }
}finally{await browser.close();}
if(report.length!==10||fiches.length!==5)throw Error('Recette authentifiée ou fiches incomplètes');
console.log('BILAN_RECETTE_AUTH '+JSON.stringify({parcours:report.length,fiches:fiches.length,erreurs:0,details:report}));
