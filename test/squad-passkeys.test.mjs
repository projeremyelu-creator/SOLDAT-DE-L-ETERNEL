import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';
import worker from '../src/worker.js';
import {notifierSquad,PUSH_INTERVALLE} from '../src/squad-chat.js';
import {b64u,lireAuthData,signatureDerVersBrute} from '../src/passkeys.js';

const ORIGINE='https://mouvement-sde.org',RP='mouvement-sde.org';
function monde(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync('schema.sql','utf8'));
 const stmt=(q,args=[])=>({
  bind:(...a)=>stmt(q,a),
  first:async()=>sql.prepare(q).get(...args)??null,
  all:async()=>({results:sql.prepare(q).all(...args)}),
  run:async()=>{const r=sql.prepare(q).run(...args);return {meta:{changes:r.changes}}},
  _exec:()=>{if(/^\s*(SELECT|WITH)/i.test(q))return {results:sql.prepare(q).all(...args),meta:{}};const r=sql.prepare(q).run(...args);return {results:[],meta:{changes:r.changes}}}
 });
 const DB={prepare:q=>stmt(q),batch:async l=>{sql.exec('BEGIN');try{const o=l.map(s=>s._exec());sql.exec('COMMIT');return o}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={DB,ASSETS:{fetch:async()=>new Response('x')},PROPRIETAIRES:'chef@exemple.test'};
 const compte=(id,nom,role='soldat',email=id+'@exemple.test',matricule='M-'+id)=>{
  sql.prepare('INSERT INTO comptes(email,id,nom,role,cree,matricule) VALUES(?,?,?,?,?,?)').run(email,id,nom,role,Date.now(),matricule);
  const jeton='jeton-'+id;sql.prepare('INSERT INTO sessions(jeton,email,expire) VALUES(?,?,?)').run(jeton,email,Date.now()+864e5);return jeton;
 };
 let n=0;
 const appel=async(chemin,{methode='GET',jeton,corps,ip}={})=>{
  const h={'content-type':'application/json','cf-connecting-ip':ip||'10.0.0.'+(++n%200+1)};
  if(jeton)h.cookie='sde_s='+jeton;
  const r=await worker.fetch(new Request(ORIGINE+chemin,{method:methode,headers:h,body:corps===undefined?undefined:JSON.stringify(corps)}),env,{waitUntil(){}});
  let j=null;try{j=await r.clone().json()}catch{}
  return {statut:r.status,json:j,entetes:r.headers};
 };
 return {sql,env,compte,appel};
}
const sha=d=>crypto.createHash('sha256').update(d).digest();

/* ───────── chat Squad ───────── */
test('Chat Squad : seule l’administration crée une Squad et gère ses membres',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin SDE','admin'),alice=w.compte('alice','Alice K.'),bob=w.compte('bob','Bob T.'),chef=w.compte('chef','Chef SDE','soldat','chef@exemple.test');
 assert.equal((await w.appel('/api/squads')).statut,401,'connexion obligatoire');
 assert.equal((await w.appel('/api/squads',{methode:'POST',jeton:alice,corps:{nom:'Squad Alpha'}})).statut,403);
 assert.equal((await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'ab'}})).statut,400);
 assert.equal((await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'Squad Alpha',pole:'XYZ'}})).statut,400);
 const cree=await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'Squad Alpha',description:'Louange',pole:'CMR'}});
 assert.equal(cree.statut,200);const id=cree.json.id;
 // l'administration cherche des comptes et ajoute
 const q=await w.appel('/api/squads/comptes?q=ali',{jeton:admin});
 assert.deepEqual(q.json.comptes.map(c=>c.nom),['Alice K.']);
 assert.ok(!JSON.stringify(q.json).includes('@'),'jamais d’e-mail dans la recherche');
 assert.equal((await w.appel('/api/squads/comptes?q=ali',{jeton:alice})).statut,403);
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:alice,corps:{compte:'alice'}})).statut,404,'un non-membre ne voit même pas la Squad');
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:'alice'}})).statut,200);
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:'chef',role:'responsable'}})).statut,200);
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:'chef',role:'roi'}})).statut,400);
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:'inconnu'}})).statut,404);
 assert.equal((await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:alice,corps:{compte:'bob'}})).statut,403,'un simple membre ne gère pas les membres');
 // bob n'est pas membre : la Squad n'existe pas pour lui
 assert.deepEqual((await w.appel('/api/squads',{jeton:bob})).json.squads,[]);
 for(const [m,c] of [['GET',`/api/squads/${id}`],['GET',`/api/squads/${id}/messages`]])assert.equal((await w.appel(c,{methode:m,jeton:bob})).statut,404);
 assert.equal((await w.appel(`/api/squads/${id}/messages`,{methode:'POST',jeton:bob,corps:{texte:'coucou'}})).statut,404);
 const liste=(await w.appel('/api/squads',{jeton:alice})).json;
 assert.equal(liste.squads.length,1);assert.equal(liste.squads[0].droit,'membre');assert.equal(liste.squads[0].membres,2);assert.equal(liste.peutCreer,false);
});

test('Chat Squad : messages, non-lus, retrait par l’auteur ou le responsable, archivage',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin SDE','admin'),alice=w.compte('alice','Alice K.'),paul=w.compte('paul','Paul D.'),chef=w.compte('chef','Chef SDE'),lect=w.compte('lect','Lecteur','lecture');
 const id=(await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'Squad Bravo'}})).json.id;
 for(const [c,r] of [['alice','membre'],['paul','membre'],['chef','responsable'],['lect','membre']])await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:c,role:r}});
 const poster=(jeton,texte)=>w.appel(`/api/squads/${id}/messages`,{methode:'POST',jeton,corps:{texte}});
 assert.equal((await poster(alice,'')).statut,400);
 assert.equal((await poster(alice,'x'.repeat(1001))).statut,400);
 assert.equal((await poster(lect,'bonjour')).statut,403,'compte en lecture seule');
 const m1=await poster(alice,'  Shalom <b>à tous</b> !\r\n\r\n\r\n\r\nMerci  ');assert.equal(m1.statut,200);
 await new Promise(r=>setTimeout(r,3));
 const m2=await poster(paul,'Amen');assert.equal(m2.statut,200);
 const fil=(await w.appel(`/api/squads/${id}/messages`,{jeton:alice})).json;
 assert.deepEqual(fil.messages.map(m=>m.texte),['Shalom <b>à tous</b> !\n\nMerci','Amen'],'texte conservé tel quel (échappé à l’affichage), ordre chronologique');
 assert.equal(fil.messages[0].moi,true);assert.equal(fil.messages[1].moi,false);
 assert.equal(fil.messages[0].retirable,true);assert.equal(fil.messages[1].retirable,false);
 // non-lus : Alice a écrit puis lu ; Paul a écrit -> 1 non lu pour Alice
 assert.equal((await w.appel('/api/squads',{jeton:alice})).json.squads[0].nonLus,1);
 await w.appel(`/api/squads/${id}/lu`,{methode:'POST',jeton:alice});
 assert.equal((await w.appel('/api/squads',{jeton:alice})).json.squads[0].nonLus,0);
 // nouveaux messages seulement
 const apres=(await w.appel(`/api/squads/${id}/messages?apres=${fil.messages[0].cree}`,{jeton:alice})).json;
 assert.deepEqual(apres.messages.map(m=>m.texte),['Amen']);
 // retrait
 assert.equal((await w.appel(`/api/squads/${id}/messages/${fil.messages[0].id}`,{methode:'DELETE',jeton:paul})).statut,403,'on ne retire pas le message d’un autre');
 assert.equal((await w.appel(`/api/squads/${id}/messages/${fil.messages[0].id}`,{methode:'DELETE',jeton:chef})).statut,200,'le responsable modère');
 assert.equal((await w.appel(`/api/squads/${id}/messages/${fil.messages[1].id}`,{methode:'DELETE',jeton:paul})).statut,200,'l’auteur retire le sien');
 assert.deepEqual((await w.appel(`/api/squads/${id}/messages`,{jeton:alice})).json.messages,[]);
 assert.equal((await w.appel(`/api/squads/${id}/messages/${fil.messages[1].id}`,{methode:'DELETE',jeton:paul})).statut,404,'déjà retiré');
 // le texte retiré reste en base (traçabilité) mais n'est plus servi
 assert.equal(w.sql.prepare("SELECT COUNT(*) n FROM sde_squad_messages WHERE statut='retire' AND retire_par IS NOT NULL").get().n,2);
 // archivage : lecture seule
 assert.equal((await w.appel(`/api/squads/${id}`,{methode:'PATCH',jeton:alice,corps:{statut:'archive'}})).statut,403);
 assert.equal((await w.appel(`/api/squads/${id}`,{methode:'PATCH',jeton:admin,corps:{statut:'archive'}})).statut,200);
 assert.equal((await poster(alice,'encore')).statut,409);
 assert.equal((await w.appel(`/api/squads/${id}/messages`,{jeton:alice})).statut,200,'toujours consultable');
});

test('Chat Squad : anti-abus (cadence) et identifiants invalides',async()=>{
 const w=monde();const admin=w.compte('adm','Admin SDE','admin'),alice=w.compte('alice','Alice K.');
 const id=(await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'Squad Delta'}})).json.id;
 await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:'alice'}});
 let dernier=0;for(let i=0;i<45;i++)dernier=(await w.appel(`/api/squads/${id}/messages`,{methode:'POST',jeton:alice,corps:{texte:'m'+i},ip:'9.9.9.9'})).statut;
 assert.equal(dernier,429,'au-delà de 40 messages par fenêtre, refus');
 assert.equal((await w.appel('/api/squads/../../etc',{jeton:alice})).statut,404);
 assert.equal((await w.appel("/api/squads/x'--/messages",{jeton:alice})).statut,404);
});

/* ───────── passkeys : authentificateur simulé avec de vraies clés P-256 ───────── */
function authentificateur(){
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'P-256'});
 const credId=crypto.randomBytes(32);let compteur=0;
 const spki=publicKey.export({type:'spki',format:'der'});
 const client=(type,defi,origine=ORIGINE)=>Buffer.from(JSON.stringify({type,challenge:defi,origin:origine,crossOrigin:false}));
 return {
  id:b64u.enc(credId),spki,
  creer(options,{rp=RP,drapeaux=0x45,origine=ORIGINE}={}){
   const cose=Buffer.alloc(77,7),aaguid=Buffer.alloc(16),lg=Buffer.alloc(2);lg.writeUInt16BE(credId.length);
   const cpt=Buffer.alloc(4);
   const authData=Buffer.concat([sha(rp),Buffer.from([drapeaux]),cpt,aaguid,lg,credId,cose]);
   return {defi:options.challenge,id:b64u.enc(credId),clientDataJSON:b64u.enc(client('webauthn.create',options.challenge,origine)),authenticatorData:b64u.enc(authData),publicKey:b64u.enc(spki),algo:-7,nom:'Téléphone de test'};
  },
  signer(options,{rp=RP,drapeaux=0x05,origine=ORIGINE,cle=privateKey,fixerCompteur}={}){
   compteur=fixerCompteur??compteur+1;
   const cpt=Buffer.alloc(4);cpt.writeUInt32BE(compteur);
   const authData=Buffer.concat([sha(rp),Buffer.from([drapeaux]),cpt]);
   const cd=client('webauthn.get',options.challenge,origine);
   const signature=crypto.sign('sha256',Buffer.concat([authData,sha(cd)]),cle);
   return {defi:options.challenge,id:b64u.enc(credId),clientDataJSON:b64u.enc(cd),authenticatorData:b64u.enc(authData),signature:b64u.enc(signature)};
  }
 };
}
test('Passkeys : primitives (authData, signature DER, clé RS256 refusée si invalide)',async()=>{
 const a=authentificateur();
 const opt={challenge:b64u.enc(crypto.randomBytes(32))};
 const cr=a.creer(opt);
 const ad=lireAuthData(b64u.dec(cr.authenticatorData));
 assert.ok(ad.presence&&ad.verification&&ad.attesté);assert.equal(b64u.enc(ad.credentialId),a.id);assert.equal(ad.compteur,0);
 assert.throws(()=>lireAuthData(new Uint8Array(10)));
 const der=crypto.sign('sha256',Buffer.from('x'),crypto.generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey);
 assert.equal(signatureDerVersBrute(der).length,64);
 assert.throws(()=>signatureDerVersBrute(new Uint8Array([1,2,3])));
});

async function activer(w,jeton,a){
 const o=(await w.appel('/api/passkeys/creation/options',{methode:'POST',jeton})).json;
 assert.equal(o.publicKey.authenticatorSelection.userVerification,'required');assert.equal(o.publicKey.attestation,'none');assert.equal(o.publicKey.rp.id,RP);
 return w.appel('/api/passkeys/creation',{methode:'POST',jeton,corps:a.creer(o.publicKey)});
}
test('Passkeys : activation, liste, connexion sans mot de passe et retrait',async()=>{
 const w=monde();const alice=w.compte('alice','Alice K.');const a=authentificateur();
 assert.equal((await w.appel('/api/passkeys')).statut,401);
 assert.equal((await w.appel('/api/passkeys/creation/options',{methode:'POST'})).statut,401);
 const ok=await activer(w,alice,a);assert.equal(ok.statut,200);assert.equal(ok.json.ok,true);
 const liste=(await w.appel('/api/passkeys',{jeton:alice})).json;
 assert.equal(liste.passkeys.length,1);assert.equal(liste.passkeys[0].nom,'Téléphone de test');
 assert.deepEqual(Object.keys(liste.passkeys[0]).sort(),['cree','derniere','id','nom'],'seuls les champs autorisés sont renvoyés, jamais une clé cryptographique');
 const stocke=w.sql.prepare('SELECT * FROM sde_passkeys').get();
 assert.equal(stocke.email,'alice@exemple.test');assert.equal(stocke.cle,b64u.enc(a.spki),'seule la clé publique est conservée');
 // connexion publique
 const o=(await w.appel('/api/passkeys/connexion/options',{methode:'POST'})).json.publicKey;
 assert.equal(o.userVerification,'required');
 const c=await w.appel('/api/passkeys/connexion',{methode:'POST',corps:a.signer(o)});
 assert.equal(c.statut,200);
 const cookie=c.entetes.get('set-cookie');assert.match(cookie,/sde_s=[^;]+;.*HttpOnly.*Secure/);
 const moi=await w.appel('/api/moi',{jeton:cookie.match(/sde_s=([^;]+)/)[1]});
 assert.equal(moi.json.connecte,true);assert.equal(moi.json.email,'alice@exemple.test');
 // rejeu du même défi refusé
 const rejeu=a.signer(o,{fixerCompteur:50});
 assert.equal((await w.appel('/api/passkeys/connexion',{methode:'POST',corps:rejeu})).statut,401,'défi à usage unique');
 // retrait
 assert.equal((await w.appel('/api/passkeys/'+a.id,{methode:'DELETE',jeton:w.compte('mallory','Mallory')})).statut,404,'on ne retire pas la clé d’autrui');
 assert.equal((await w.appel('/api/passkeys/'+a.id,{methode:'DELETE',jeton:alice})).statut,200);
 const o2=(await w.appel('/api/passkeys/connexion/options',{methode:'POST'})).json.publicKey;
 assert.equal((await w.appel('/api/passkeys/connexion',{methode:'POST',corps:a.signer(o2,{fixerCompteur:99})})).statut,401,'clé retirée = connexion refusée');
});
test('Passkeys : signatures et contextes invalides refusés',async()=>{
 const w=monde();const alice=w.compte('alice','Alice K.');const a=authentificateur();
 await activer(w,alice,a);
 const connexion=async(opts,corps)=>{const o=(await w.appel('/api/passkeys/connexion/options',{methode:'POST'})).json.publicKey;return (await w.appel('/api/passkeys/connexion',{methode:'POST',corps:corps(o)})).statut};
 assert.equal(await connexion({},o=>a.signer(o,{cle:crypto.generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey})),401,'mauvaise clé privée');
 assert.equal(await connexion({},o=>a.signer(o,{rp:'evil.example'})),401,'mauvais domaine (anti-hameçonnage)');
 assert.equal(await connexion({},o=>a.signer(o,{origine:'https://evil.example'})),401,'mauvaise origine');
 assert.equal(await connexion({},o=>a.signer(o,{drapeaux:0x01})),401,'vérification utilisateur (empreinte) absente');
 assert.equal(await connexion({},o=>a.signer(o,{drapeaux:0x04})),401,'présence utilisateur absente');
 assert.equal(await connexion({},o=>({...a.signer(o),defi:'autre'})),401,'défi inconnu');
 assert.equal(await connexion({},o=>({...a.signer(o),id:'A'.repeat(43)})),401,'clé inconnue');
 assert.equal(await connexion({},o=>({...a.signer(o),signature:'AAAA'})),401,'signature corrompue');
 assert.equal(await connexion({},()=>null),401);
 assert.equal(await connexion({},o=>a.signer(o,{fixerCompteur:7})),200,'signature correcte acceptée');
 assert.equal(await connexion({},o=>a.signer(o,{fixerCompteur:7})),401,'compteur qui ne progresse pas = clonage suspecté');
 // création : mauvais domaine, vérification absente, défi d'un autre compte
 const b=w.compte('bob','Bob T.'),a2=authentificateur();
 const o=(await w.appel('/api/passkeys/creation/options',{methode:'POST',jeton:b})).json.publicKey;
 assert.equal((await w.appel('/api/passkeys/creation',{methode:'POST',jeton:b,corps:a2.creer(o,{rp:'evil.example'})})).statut,400);
 const o2=(await w.appel('/api/passkeys/creation/options',{methode:'POST',jeton:b})).json.publicKey;
 assert.equal((await w.appel('/api/passkeys/creation',{methode:'POST',jeton:b,corps:a2.creer(o2,{drapeaux:0x41})})).statut,400,'sans vérification utilisateur');
 const o3=(await w.appel('/api/passkeys/creation/options',{methode:'POST',jeton:b})).json.publicKey;
 assert.equal((await w.appel('/api/passkeys/creation',{methode:'POST',jeton:alice,corps:a2.creer(o3)})).statut,400,'le défi d’un autre compte ne sert pas');
});
test('Passkeys : maximum de 5 appareils par compte',async()=>{
 const w=monde();const alice=w.compte('alice','Alice K.');
 for(let i=0;i<5;i++)assert.equal((await activer(w,alice,authentificateur())).statut,200);
 assert.equal((await w.appel('/api/passkeys/creation/options',{methode:'POST',jeton:alice})).statut,409);
});

test('Empreinte et QR de présence : preuve de 10 minutes, QR court et marqué « identité confirmée »',async()=>{
 const w=monde();const alice=w.compte('alice','Alice K.');const a=authentificateur();
 w.sql.prepare("UPDATE comptes SET membreId='m1' WHERE id='alice'").run();
 w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES('membres/m1','membres','m1',?,1,1)").run(JSON.stringify({nom:'KONE',prenoms:'Alice',matricule:'M-alice',actif:true}));
 const sans=(await w.appel('/api/ma-carte-qr',{jeton:alice})).json;
 assert.equal(sans.identiteConfirmee,false);
 assert.ok(sans.expire>Date.now()+6*864e5,'sans empreinte : QR valable 7 jours comme avant');
 assert.equal((await w.appel('/api/passkeys/presence/options',{methode:'POST',jeton:alice})).statut,409,'activation requise');
 await activer(w,alice,a);
 const o=(await w.appel('/api/passkeys/presence/options',{methode:'POST',jeton:alice})).json.publicKey;
 assert.equal(o.allowCredentials[0].id,a.id);
 assert.equal((await w.appel('/api/passkeys/presence',{methode:'POST',jeton:alice,corps:a.signer(o,{cle:crypto.generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey})})).statut,401);
 const o2=(await w.appel('/api/passkeys/presence/options',{methode:'POST',jeton:alice})).json.publicKey;
 const p=await w.appel('/api/passkeys/presence',{methode:'POST',jeton:alice,corps:a.signer(o2,{fixerCompteur:10})});
 assert.equal(p.statut,200);assert.ok(p.json.preuve.length>=30);
 const sur=(await w.appel('/api/ma-carte-qr?preuve='+p.json.preuve,{jeton:alice})).json;
 assert.equal(sur.identiteConfirmee,true);
 assert.ok(sur.expire<=Date.now()+10*60000+1000,'QR confirmé : 10 minutes maximum');
 // la preuve est personnelle
 const bob=w.compte('bob','Bob T.');w.sql.prepare("UPDATE comptes SET membreId='m2' WHERE id='bob'").run();
 w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES('membres/m2','membres','m2',?,1,1)").run(JSON.stringify({nom:'T',prenoms:'Bob',actif:true}));
 assert.equal((await w.appel('/api/ma-carte-qr?preuve='+p.json.preuve,{jeton:bob})).json.identiteConfirmee,false,'preuve d’un autre compte refusée');
 assert.equal((await w.appel('/api/ma-carte-qr?preuve=nimporte-quoi-nimporte-quoi',{jeton:alice})).json.identiteConfirmee,false);
 // le pointage reconnaît la mention
 const resp=w.compte('resp','Responsable','contributeur');
 const today=new Date().toISOString().slice(0,10);
 w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES('evenements/e1','evenements','e1',?,1,1)").run(JSON.stringify({date:today,titre:'Culte'}));
 const scan=await w.appel('/api/pointage-qr',{methode:'POST',jeton:resp,corps:{evenement:'e1',code:sur.code}});
 assert.equal(scan.statut,200);assert.equal(scan.json.identiteConfirmee,true);
});

/* ───────── façade ───────── */
test('Façade : modules Squad et empreinte raccordés au Worker sans toucher aux autres routes',()=>{
 const src=readFileSync('src/worker.js','utf8');
 assert.ok(src.includes('squadChatApi(req,env,u')&&src.includes('passkeysApi(req,env,u'));
 assert.ok(src.indexOf('squadChatApi(req,env,u')<src.indexOf('const portail=await portalApi'),'avant le portail, comme le mur de prière');
 const pk=readFileSync('src/passkeys.js','utf8');
 assert.ok(/userVerification:'required'/.test(pk)&&!/attestation:'direct'/.test(pk));
 assert.doesNotMatch(pk,/empreinte digitale|photo|visage.*stock/i,'aucune promesse de stockage biométrique');
});

/* ───────── pages et scripts ───────── */
test('Pages Squads et Empreinte : thème hub, privées, sans script en ligne ni innerHTML',()=>{
 for(const [page,script] of [['squads','sde-squads.js'],['empreinte','sde-empreinte.js']]){
  const h=readFileSync(`public/vitrine/${page}.html`,'utf8'),js=readFileSync(`public/vitrine/${script}`,'utf8');
  assert.match(h,/<meta name="robots" content="noindex, nofollow">/,page+' : jamais indexée');
  assert.ok(h.indexOf('/vitrine/sde-premium-public.css')<h.indexOf('</head>'));
  const feuilles=[...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(feuilles.some(f=>f.includes('sde-fusion.css')),page+' : charte Fusion présente');
  assert.ok(feuilles.at(-1).includes(page==='squads'?'sde-shell-public.css':'sde-fusion.css'),page+' : dernière feuille attendue');
  assert.ok(h.includes(`/vitrine/${script}`));
  assert.doesNotMatch(h,/<script(?![^>]*\bsrc=)[^>]*>/,page+' : aucun script en ligne (CSP)');
  assert.doesNotMatch(h,/\son(click|load|error|submit)=/i);
  assert.equal((h.match(/<h1[\s>]/g)||[]).length,1);
  assert.ok(h.includes('tiktok.com/@mouvement.sde')&&h.includes('facebook.com/share/1GkJmWSyqj'));
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|document\.write|eval\(/,script+' : contenu inséré en texte seulement');
 }
 const w=readFileSync('src/worker.js','utf8');
 assert.ok(w.includes('"/squads": "/vitrine/squads.html"')&&w.includes('"/empreinte": "/vitrine/empreinte.html"'));
 const css=readFileSync('public/vitrine/sde-espace-prive.css','utf8');
 for(const k of ['--fam:#5b21b6','#1b2f6b','prefers-reduced-motion','max-width:620px','[hidden]{display:none!important}'])assert.ok(css.includes(k),k);
});
test('Connexion par empreinte : bouton ajouté par script seulement si l’appareil sait le faire',()=>{
 const h=readFileSync('public/vitrine/connexion-unifiee.html','utf8'),js=readFileSync('public/vitrine/sde-connexion-empreinte.js','utf8');
 assert.ok(h.includes('sde-connexion-empreinte.js')&&h.includes('sde-connexion-empreinte.css'));
 assert.doesNotMatch(h,/Se connecter avec mon empreinte/,'rien de statique : le bouton n’existe que si WebAuthn est disponible');
 assert.ok(js.includes('window.PublicKeyCredential'));
 assert.ok(js.includes('/api/passkeys/connexion/options')&&js.includes('/api/passkeys/connexion'));
 assert.doesNotMatch(js,/innerHTML|eval\(/);
 assert.ok(js.includes('["/administration","/mon-espace"].includes(r)'),'même liste blanche de retour que la connexion classique');
});
test('Portail : cartes Squads et Empreinte, QR confirmé, message de pointage',()=>{
 const mosaic=readFileSync('frontend/business-mosaic.jsx','utf8'),ops=readFileSync('frontend/operations.jsx','utf8'),cli=readFileSync('frontend/webauthn-client.js','utf8');
 assert.ok(mosaic.includes("module:'squads',href:'/squads'")&&mosaic.includes("module:'empreinte',href:'/empreinte'"));
 assert.ok(mosaic.includes('r.href?location.assign(r.href):go(r.module)'));
 assert.ok(ops.includes("'/api/ma-carte-qr'+(preuve?'?preuve='+encodeURIComponent(preuve):'')"));
 assert.ok(ops.includes('empreinteDisponible()')&&ops.includes('Identité confirmée par empreinte'));
 assert.ok(ops.includes("(r.identiteConfirmee?' · identité confirmée par empreinte':'')"));
 assert.ok(cli.includes('sessionStorage')&&!cli.includes('localStorage'),'la preuve ne vit que dans l’onglet');
 assert.ok(!/preuve=/.test(cli.replace(/\/\*[\s\S]*?\*\//g,'')),'la preuve n’est jamais mise dans une URL par le client');
});
test('Confidentialité : information sur les messages de Squad et la clé d’appareil',()=>{
 const h=readFileSync('public/vitrine/confidentialite.html','utf8');
 assert.ok(h.includes('id="squads-empreinte"'));
 assert.match(h,/ni votre empreinte ni votre visage/);
 assert.match(h,/visibles par ses membres, ses responsables et l'administration/);
});

test('Chat Squad : notification discrète aux autres membres, une fois par tranche de 5 minutes',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin SDE','admin'),alice=w.compte('alice','Alice K.'),paul=w.compte('paul','Paul D.');w.compte('hors','Hors Squad');
 const id=(await w.appel('/api/squads',{methode:'POST',jeton:admin,corps:{nom:'Squad Notif'}})).json.id;
 for(const c of ['alice','paul'])await w.appel(`/api/squads/${id}/membres`,{methode:'PUT',jeton:admin,corps:{compte:c}});
 await w.env.DB.prepare('CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT,auth TEXT,cree INTEGER,PRIMARY KEY(userId,endpoint))').run();
 for(const c of ['alice','paul','hors'])w.sql.prepare('INSERT INTO push_subs(userId,endpoint,p256dh,auth,cree) VALUES(?,?,?,?,?)').run(c,'https://push.exemple/'+c,'k','a',1);
 const envPush={...w.env,VAPID_PUBLIC_KEY:'pub',VAPID_PRIVATE_KEY:'priv'};
 const envoyes=[];const send=async(sub,payload)=>{envoyes.push({userId:sub.userId,payload});return{ok:true}};
 assert.equal((await notifierSquad(w.env,id,'alice',{send})).sent,0,'sans clés VAPID, rien ne part');
 const r1=await notifierSquad(envPush,id,'alice',{send,now:1e9});
 assert.equal(r1.sent,1);assert.deepEqual(envoyes.map(e=>e.userId),['paul'],'ni l’auteur, ni un non-membre');
 const note=envoyes[0].payload;
 assert.equal(note.url,'/squads');assert.equal(note.body,'Nouveau message dans votre Squad.');
 assert.ok(!JSON.stringify(note).includes('Alice'),'ni le nom de l’auteur ni le texte du message');
 assert.equal((await notifierSquad(envPush,id,'alice',{send,now:1e9+1000})).sent,0,'au plus une fois par tranche');
 assert.equal((await notifierSquad(envPush,id,'alice',{send,now:1e9+PUSH_INTERVALLE+1})).sent,1,'de nouveau après 5 minutes');
 // abonnement expiré : supprimé
 const expire=async()=>({ok:false,reason:'expired'});
 await notifierSquad(envPush,id,'adm',{send:expire,now:2e9});
 assert.equal(w.sql.prepare("SELECT COUNT(*) AS n FROM push_subs WHERE userId='alice'").get().n,0);
 // l'envoi d'un message n'échoue jamais à cause des notifications
 assert.equal((await w.appel(`/api/squads/${id}/messages`,{methode:'POST',jeton:paul,corps:{texte:'Bonjour'}})).statut,200);
});

/* ───────── comptes des membres : mot de passe temporaire unique ───────── */
test('Comptes des membres : aperçu, création, mot de passe temporaire unique à changer, expiration',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin SDE','admin'),simple=w.compte('simple','Simple Soldat');
 const fiche=(id,d)=>w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES(?,?,?,?,1,?)").run('membres/'+id,'membres',id,JSON.stringify(d),Date.now());
 fiche('f1',{nom:'KONE',prenoms:'Awa',email:'Awa.Kone@Exemple.test',telephone:'0102030405',actif:true});
 fiche('f2',{nom:'TRAORE',prenoms:'Moussa',email:'moussa@exemple.test',matricule:'SDE-0002',actif:true});
 fiche('f3',{nom:'SANS',prenoms:'Mail',email:'',actif:true});
 fiche('f4',{nom:'ANCIEN',prenoms:'Inactif',email:'inactif@exemple.test',actif:false});
 fiche('f5',{nom:'DOUBLON',prenoms:'Awa',email:'awa.kone@exemple.test',actif:true});
 fiche('f6',{nom:'DEJA',prenoms:'Simple',email:'simple@exemple.test',actif:true});
 const creer=(jeton,simuler)=>w.appel('/api/comptes/membres',{methode:'POST',jeton,corps:{simuler}});
 assert.equal((await creer(undefined,true)).statut,403);
 assert.equal((await creer(simple,true)).statut,403,'réservé aux administrateurs');
 const ap=await creer(admin,true);
 assert.equal(ap.statut,200);assert.equal(ap.json.simulation,true);assert.equal(ap.json.acreer,2);assert.equal(ap.json.total,6);
 assert.equal(w.sql.prepare("SELECT COUNT(*) AS n FROM comptes WHERE email LIKE '%kone%' OR email LIKE 'moussa%'").get().n,0,'l’aperçu n’écrit rien');
 const raisons=ap.json.ignores.map(i=>i.raison).join('|');
 for(const r of ['inactive','absente ou invalide','en double','existe déjà'])assert.ok(raisons.includes(r),r);
 const reel=await creer(admin,false);
 assert.equal(reel.statut,200);assert.equal(reel.json.crees.length,2);assert.equal(reel.json.restants,0);
 const [a,m]=reel.json.crees;
 assert.match(a.motDePasse,/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
 assert.notEqual(a.motDePasse,m.motDePasse,'un mot de passe différent par membre');
 assert.equal(m.matricule,'SDE-0002','le matricule de la fiche est conservé');
 assert.match(a.matricule,/^\d{6}$/);
 const compte=w.sql.prepare('SELECT * FROM comptes WHERE email=?').get('awa.kone@exemple.test');
 assert.equal(compte.role,'soldat');assert.equal(compte.membreId,'f1');assert.ok(!compte.mdp.includes(a.motDePasse),'seule l’empreinte est conservée');
 const f1=JSON.parse(w.sql.prepare("SELECT data FROM docs WHERE path='membres/f1'").get().data);
 assert.equal(f1.compteId,compte.id);assert.equal(f1.matricule,a.matricule);
 assert.equal((await creer(admin,false)).json.crees.length,0,'rien à recréer');
 // connexion avec le matricule et le mot de passe temporaire
 const co=await w.appel('/api/connexion',{methode:'POST',corps:{email:a.matricule,motDePasse:a.motDePasse}});
 assert.equal(co.statut,200);assert.equal(co.json.changerMotDePasse,true);
 const cookie=co.entetes.get('set-cookie').match(/sde_s=([^;]+)/)[1];
 assert.equal((await w.appel('/api/moi',{jeton:cookie})).json.mdpTemporaire,true);
 const ch=await w.appel('/api/mot-de-passe',{methode:'POST',jeton:cookie,corps:{ancien:a.motDePasse,nouveau:'Mon-Propre-Mot-2026'}});
 assert.equal(ch.statut,200);
 assert.equal((await w.appel('/api/moi',{jeton:cookie})).json.mdpTemporaire,false);
 assert.equal((await w.appel('/api/connexion',{methode:'POST',corps:{email:a.matricule,motDePasse:a.motDePasse}})).statut,401,'l’ancien mot de passe temporaire ne marche plus');
 const co2=await w.appel('/api/connexion',{methode:'POST',corps:{email:a.matricule,motDePasse:'Mon-Propre-Mot-2026'}});
 assert.equal(co2.statut,200);assert.equal(co2.json.changerMotDePasse,false);
 // expiration du mot de passe temporaire de l'autre membre
 w.sql.prepare('UPDATE comptes_mdp_temp SET expire=? WHERE email=?').run(Date.now()-1000,'moussa@exemple.test');
 const exp=await w.appel('/api/connexion',{methode:'POST',corps:{email:'SDE-0002',motDePasse:m.motDePasse}});
 assert.equal(exp.statut,401);assert.match(exp.json.message||'',/expiré/);
});

test('Comptes des membres : pages, route, redirection et pas de mot de passe commun',()=>{
 const worker_=readFileSync('src/worker.js','utf8'),mod=readFileSync('src/comptes-membres.js','utf8'),login=readFileSync('public/vitrine/portail-connexion.js','utf8');
 assert.match(worker_,/"\/mot-de-passe": "\/vitrine\/mot-de-passe\.html"/);assert.match(worker_,/"\/comptes-membres": "\/vitrine\/comptes-membres\.html"/);
 assert.match(login,/\/mot-de-passe\?retour=/,'la connexion renvoie vers le changement du mot de passe temporaire');
 assert.ok(!/1991/.test(mod),'aucun mot de passe commun codé en dur');
 for(const [page,script] of [['mot-de-passe','sde-mot-de-passe.js'],['comptes-membres','sde-comptes-membres.js']]){
  const h=readFileSync(`public/vitrine/${page}.html`,'utf8');
  assert.match(h,/noindex/);assert.ok(h.includes(script));assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(h),'pas de script en ligne (CSP)');
  assert.ok(h.includes('sde-premium-public.css')||h.includes('sde-fusion.css'));
 }
});

test('Comptes des membres : option « sans e-mail », connexion par matricule seulement',async()=>{
 const w=monde();
 const admin=w.compte('adm','Admin SDE','admin');
 const fiche=(id,d)=>w.sql.prepare("INSERT INTO docs(path,parent,id,data,version,maj) VALUES(?,?,?,?,1,?)").run('membres/'+id,'membres',id,JSON.stringify(d),Date.now());
 fiche('g1',{nom:'DONGO',prenoms:'Fian Simon',email:'',actif:true});
 fiche('g2',{nom:'MORIBA',prenoms:'Danielle',email:'pas-un-mail',matricule:'002.SDE.CIV',actif:true});
 fiche('g3',{nom:'AVEC',prenoms:'Mail',email:'avec@exemple.test',actif:true});
 const creer=(simuler,sansEmail)=>w.appel('/api/comptes/membres',{methode:'POST',jeton:admin,corps:{simuler,sansEmail}});
 const sans=await creer(true,false);
 assert.equal(sans.json.acreer,1,'par défaut, les fiches sans e-mail restent ignorées');
 const ap=await creer(true,true);
 assert.equal(ap.json.acreer,3);assert.equal(ap.json.sansEmail,2);
 assert.ok(ap.json.apercu.every(a=>!a.email.includes('invalid')),'l’identifiant interne n’est jamais montré');
 const r=await creer(false,true);
 assert.equal(r.json.crees.length,3);
 const dongo=r.json.crees.find(c=>c.nom.includes('DONGO')),moriba=r.json.crees.find(c=>c.nom.includes('MORIBA'));
 assert.equal(dongo.email,'');assert.equal(moriba.matricule,'002.SDE.CIV');
 const interne=w.sql.prepare('SELECT email,membreId FROM comptes WHERE matricule=?').get('002.SDE.CIV');
 assert.equal(interne.email,'002.sde.civ@membre.sde.invalid');assert.equal(interne.membreId,'g2');
 const fg=JSON.parse(w.sql.prepare("SELECT data FROM docs WHERE path='membres/g2'").get().data);
 assert.equal(fg.email,'pas-un-mail','la fiche garde sa valeur, sans adresse fictive');assert.ok(fg.compteId);
 const co=await w.appel('/api/connexion',{methode:'POST',corps:{email:dongo.matricule,motDePasse:dongo.motDePasse}});
 assert.equal(co.statut,200);assert.equal(co.json.changerMotDePasse,true);
 const cookie=co.entetes.get('set-cookie').match(/sde_s=([^;]+)/)[1];
 const moi=(await w.appel('/api/moi',{jeton:cookie})).json;
 assert.equal(moi.connecte,true);assert.equal(moi.email,'','aucune adresse fictive affichée');assert.equal(moi.mdpTemporaire,true);
 assert.equal((await creer(false,true)).json.crees.length,0,'rien à recréer');
});
