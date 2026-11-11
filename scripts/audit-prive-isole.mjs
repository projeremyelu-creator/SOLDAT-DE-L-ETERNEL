/* Recette visuelle isolée SDE : comptes et réponses entièrement fictifs.
   Aucune connexion réelle, aucune écriture D1, aucun secret, aucune requête
   vers le site publié. Les styles et scripts sont ceux du dépôt en cours. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';

const root=resolve('public');
const out='audit-mobile-sde/prives';
mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url||'/', 'http://127.0.0.1').pathname;
  const aliases={'/mon-espace':'/vitrine/tableau-membre.html','/administration':'/vitrine/tableau-administration.html'};
  const file=resolve(root,'.'+(aliases[path]||path));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
  try{
    const bytes=await readFile(file);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(bytes);
  }catch(_){res.writeHead(404);res.end('Ressource absente')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const cases=[
  {mode:'membre',niveau:0,width:360,height:800},
  {mode:'membre',niveau:0,width:390,height:844},
  {mode:'membre',niveau:0,width:768,height:1024},
  {mode:'membre',niveau:0,width:1440,height:900},
  {mode:'administration',niveau:1,width:360,height:800},
  {mode:'administration',niveau:1,width:390,height:844},
  {mode:'administration',niveau:2,width:360,height:800},
  {mode:'administration',niveau:2,width:390,height:844},
  {mode:'administration',niveau:3,width:768,height:1024},
  {mode:'administration',niveau:2,width:1440,height:900}
];
const report={type:'audit-isole-sans-donnees-reelles',origin:'localhost',checks:[],issues:[]};
const browser=await chromium.launch({headless:true,...(process.env.SDE_CHROME_EXECUTABLE?{executablePath:process.env.SDE_CHROME_EXECUTABLE}:{}),args:['--no-sandbox']});
function requireOk(ok,code,detail){if(!ok)report.issues.push({code,detail})}
try{
  for(const c of cases){
    const name=c.mode+'-role'+c.niveau+'-'+c.width;
    const context=await browser.newContext({
      viewport:{width:c.width,height:c.height},
      deviceScaleFactor:1,isMobile:c.width<700,hasTouch:c.width<700,
      locale:'fr-CI',reducedMotion:c.width===360?'reduce':'no-preference'
    });
    const page=await context.newPage();
    const requests=[],errors=[];
    page.on('pageerror',error=>errors.push(String(error.message||error).slice(0,240)));
    const account={
      connecte:true,niveau:c.niveau,role:c.niveau===0?'soldat':c.niveau===1?'contributeur':c.niveau===2?'admin':'proprietaire',
      libRole:c.niveau===0?'Soldat':c.niveau===1?'Contributeur':c.niveau===2?'Administrateur':'Propriétaire',
      nom:'Compte de recette',email:'recette@example.invalid'
    };
    const mocked={
      '/api/moi':account,
      '/api/mon-espace':{membre:{nom:'RECETTE',prenoms:'Soldat',matricule:'DEMO-000',email:'recette@example.invalid',telephone:'00000000',statut:'Membre',quartier:'Exemple',situation:''}},
      '/api/mon-historique':{presences:[{titre:'Séance fictive',date:'2026-10-01',etat:'P'}],prieres:[],totalPrieres:0},
      '/api/tableau-de-bord':{total:{membres:3,evenements:2,projets:1,annonces:4}},
      '/api/public':{evenements:[{titre:'Programme de démonstration',date:'2026-12-18',heure:'20:00',lieu:'En ligne'}]}
    };
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==origin){await route.abort();return}
      if(url.pathname.startsWith('/api/')){
        requests.push({path:url.pathname,method:request.method()});
        if(!Object.prototype.hasOwnProperty.call(mocked,url.pathname)&&!['/api/mon-profil','/api/priere'].includes(url.pathname)){
          await route.fulfill({status:404,contentType:'application/json',body:'{"message":"Route fictive non définie"}'});
          return;
        }
        await route.fulfill({status:200,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(mocked[url.pathname]||{ok:true})});
        return;
      }
      await route.continue();
    });
    try{
      const path=c.mode==='membre'?'/mon-espace':'/administration';
      const response=await page.goto(origin+path,{waitUntil:'load',timeout:15000});
      await page.waitForFunction(
        ()=>/chargées depuis votre compte|synthèse actualisées/.test(document.querySelector('#sde-status')?.textContent||''),
        {timeout:12000}
      );
      const geom=await page.evaluate(()=>({
        width:innerWidth,bodyWidth:document.body.scrollWidth,docWidth:document.documentElement.scrollWidth,
        mainWidth:document.querySelector('#espace-principal')?.getBoundingClientRect().width,
        focused:document.activeElement?.id||'',
        h1:document.querySelector('h1')?.textContent,
        status:document.querySelector('#sde-status')?.textContent
      }));
      requireOk(response?.status()===200,'HTTP',name+' HTTP '+response?.status());
      requireOk(geom.docWidth<=geom.width+2&&geom.bodyWidth<=geom.width+2,'DEBORDEMENT',name+' largeur '+geom.docWidth+'/'+geom.bodyWidth+' pour '+geom.width);
      requireOk(geom.mainWidth>240,'CONTENU_ETROIT',name+' colonne principale '+geom.mainWidth);
      const views=c.mode==='membre'?['profil','prieres','formations','notifications','outils']:['membres','programmes','projets','communication','outils'];
      for(const view of views){
        const link=page.locator('.sde-dash-side a[data-view="'+view+'"]');
        requireOk(await link.count()===1,'NAV_LIEN',name+'/'+view+' absent');
        if(await link.count()!==1)continue;
        await link.click({timeout:4500});
        const result=await page.evaluate(section=>({
          hash:location.hash,visible:[...document.querySelectorAll('[data-section]')].filter(x=>!x.hidden).map(x=>x.dataset.section),
          active:document.querySelector('.sde-dash-side a[data-view="'+section+'"]')?.getAttribute('aria-current'),
          focus:document.activeElement?.id
        }),view);
        requireOk(result.hash==='#'+view&&result.visible.length===1&&result.visible[0]===view&&result.active==='page','NAVIGATION',name+'/'+view+' '+JSON.stringify(result));
        requireOk(result.focus==='espace-principal','FOCUS',name+'/'+view+' focus '+result.focus);
      }
      if(c.mode==='membre'){
        requireOk(!requests.some(x=>x.path==='/api/tableau-de-bord'),'DONNEES_ADMIN',name+' : endpoint admin appelé par membre');
        await page.locator('.sde-dash-side a[data-view="prieres"]').click();
        await page.locator('#priere-form textarea[name="sujet"]').fill('Demande fictive isolée');
        await page.locator('#priere-form button[type="submit"]').click();
        await page.waitForFunction(()=>document.querySelector('#priere-feedback')?.dataset.state==='success');
        requireOk(requests.some(x=>x.path==='/api/priere'&&x.method==='POST'),'FORMULAIRE',name+' : simulation prière absente');
      } else {
        const finances=await page.locator('.sde-dash-side a[data-view="finances"]').isVisible();
        const pastoral=await page.locator('.sde-dash-side a[data-view="pastoral"]').isVisible();
        requireOk(finances===(c.niveau>=2)&&pastoral===(c.niveau>=3),'ROLES',name+' : finances '+finances+' pastoral '+pastoral);
        if(c.niveau<2){
          await page.evaluate(()=>{location.hash='#finances'});
          await page.waitForTimeout(100);
          const forbidden=await page.evaluate(()=>({
            hidden:document.querySelector('[data-section="finances"]')?.hidden,
            home:document.querySelector('[data-section="accueil"]')?.hidden
          }));
          requireOk(forbidden.hidden===true&&forbidden.home===false,'ACCES_ANCRE',name+' '+JSON.stringify(forbidden));
        } else {
          await page.locator('.sde-dash-side a[data-view="finances"]').click();
          requireOk(await page.locator('[data-section="finances"]').isVisible(),'FINANCES_ADMIN',name+' : navigation finances');
        }
      }
      await page.evaluate(()=>{location.hash='#accueil'});
      await page.waitForTimeout(80);
      await page.screenshot({path:out+'/'+name+'.png',animations:'disabled'});
      requireOk(errors.length===0,'ERREUR_JS',name+' : '+errors.join('; '));
      report.checks.push({name,mode:c.mode,niveau:c.niveau,width:c.width,status:response.status(),...geom,errors,requests:requests.map(x=>x.method+' '+x.path)});
      console.log('AUDIT_PRIVE '+JSON.stringify({name,viewport:c.width,overflow:Math.max(geom.docWidth,geom.bodyWidth)-geom.width,erreurs:errors.length}));
    }catch(e){
      report.issues.push({code:'EXECUTION',detail:name+': '+String(e.message||e).slice(0,500)});
    }finally{await context.close()}
  }
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
writeFileSync(out+'/rapport.json',JSON.stringify(report,null,2)+'\n');
console.log('BILAN_AUDIT_PRIVE '+JSON.stringify({parcours:report.checks.length,attendus:cases.length,anomalies:report.issues.length,issues:report.issues.slice(0,12)}));
if(report.issues.length||report.checks.length!==cases.length)process.exitCode=1;
