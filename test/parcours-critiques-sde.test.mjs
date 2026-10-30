import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {fixture} from './helpers/d1.mjs';

const context={waitUntil(){}};

test('Le formulaire Bilan 2026 est servi via son URL publique (et référencé)',async()=>{
  const f=fixture();try{
    const vus=[];
    f.env.ASSETS.fetch=async request=>{
      const path=new URL(request.url).pathname;
      vus.push(path);
      return new Response(path==='/vitrine/formulaire.html'?readFileSync('public/vitrine/formulaire.html','utf8'):'asset',{
        status:200,headers:{'content-type':'text/html; charset=utf-8'}
      });
    };
    const r=await f.request('/formulaire');
    assert.equal(r.status,200);
    assert.ok(vus.includes('/vitrine/formulaire.html'),JSON.stringify(vus));
    assert.match(await r.text(),/Bilan 2026 & Projets 2027/);
    assert.match(readFileSync('public/sitemap.xml','utf8'),/https:\/\/mouvement-sde.org\/formulaire/);
  }finally{f.close()}
});

test('Création de compte : le mode inscription survit aux redirections des deux espaces',async()=>{
  const f=fixture();try{
    const r=await f.request('/mon-espace?mode=inscription');
    assert.equal(r.status,302);
    const destination=new URL(r.headers.get('location'));
    assert.equal(destination.pathname,'/connexion');
    assert.equal(destination.searchParams.get('retour'),'/mon-espace');
    assert.equal(destination.searchParams.get('mode'),'inscription');
    const admin=await f.request('/administration?mode=activation');
    assert.equal(new URL(admin.headers.get('location')).searchParams.get('mode'),'activation');
    const invalide=await f.request('/mon-espace?mode=https://example.org');
    assert.equal(new URL(invalide.headers.get('location')).searchParams.has('mode'),false);
    const app=await worker.fetch(new Request('https://app.mouvement-sde.org/mon-espace?mode=inscription'),f.env,context);
    assert.equal(new URL(app.headers.get('location')).hostname,'app.mouvement-sde.org');
    assert.equal(new URL(app.headers.get('location')).searchParams.get('mode'),'inscription');
  }finally{f.close()}
});

test('Contrôle des rôles : membre autorisé, administration réservée et session requise',async()=>{
  const f=fixture();try{
    f.account('alice','soldat');f.account('olivier','contributeur');f.account('direction','admin');
    assert.equal((await f.request('/mon-espace')).status,302);
    assert.equal((await f.request('/mon-espace','alice')).status,200);
    assert.equal((await f.request('/administration','alice')).status,403);
    assert.equal((await f.request('/administration','olivier')).status,200);
    assert.equal((await f.request('/administration','direction')).status,200);
    assert.equal((await f.call('/api/moi','alice')).body.connecte,true);
    assert.equal((await f.call('/api/moi')).body.connecte,false);
  }finally{f.close()}
});

test('Les POST publics rejettent une origine étrangère avant de toucher aux données',async()=>{
  const f=fixture();try{
    for(const path of ['/api/engager','/api/formulaire','/api/preinscription-academy']){
      const r=await worker.fetch(new Request('https://mouvement-sde.org'+path,{
        method:'POST',headers:{origin:'https://autre-site.example','content-type':'application/json'},
        body:'{}'
      }),f.env,context);
      assert.equal(r.status,403,path);
    }
  }finally{f.close()}
});

test('Inscription et connexion par matricule : persistance SQLite, session et espace membre',async()=>{
  const f=fixture();try{
    const password='MotDePasse-Test-2026!';
    const created=await f.request('/api/inscription',null,'POST',{
      nom:'TEST',prenoms:'Awa',email:'awa.parcours@example.org',motDePasse:password,
      telephone:'+2250700000000'
    });
    assert.equal(created.status,200,await created.clone().text());
    const data=await created.json();
    assert.match(data.matricule,/^[0-9]{6}$/);
    assert.ok(f.sql.prepare('SELECT email FROM comptes WHERE matricule=?').get(data.matricule));
    const cookie=created.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('sde_s='));
    const request=path=>worker.fetch(new Request('https://mouvement-sde.org'+path,{headers:{cookie}}),f.env,context);
    const me=await (await request('/api/moi')).json();
    assert.equal(me.connecte,true);
    assert.equal(me.role,'soldat');
    assert.equal((await request('/mon-espace')).status,200);
    assert.equal((await request('/administration')).status,403);
    const logout=await worker.fetch(new Request('https://mouvement-sde.org/api/deconnexion',{
      method:'POST',headers:{cookie,origin:'https://mouvement-sde.org'}
    }),f.env,context);
    assert.equal(logout.status,200);
    const signin=await f.request('/api/connexion',null,'POST',{email:data.matricule,motDePasse:password});
    assert.equal(signin.status,200,await signin.clone().text());
    assert.ok(signin.headers.get('set-cookie')?.includes('sde_s='));
  }finally{f.close()}
});
