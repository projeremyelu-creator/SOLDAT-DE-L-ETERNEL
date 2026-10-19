import json, sqlite3, subprocess, time, os, re, hashlib, base64
from pathlib import Path
from playwright.sync_api import sync_playwright
ICI = Path(__file__).parent; RAC = ICI.parent
BASE = "/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad/essai.db"
SQLIMP = "/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad/import1.sql"
OUT = ICI / "captures"; OUT.mkdir(exist_ok=True)
if os.path.exists(BASE): os.remove(BASE)
c = sqlite3.connect(BASE); c.executescript((RAC / "schema.sql").read_text()); c.executescript(Path(SQLIMP).read_text())
def uid(e): return "u_" + base64.urlsafe_b64encode(hashlib.sha256(e.encode()).digest()).decode().rstrip("=")[:22]
now = int(time.time() * 1000)
for email, nom, role, tok in [("infosoldat@gmail.com", "Jérémy Octave GLAZAÏ", "attente", "tok-owner"), ("sec@gmail.com", "Esther Secrétaire", "contributeur", "tok-contrib"), ("nouveau@gmail.com", "Nouveau", "attente", "tok-attente")]:
    c.execute("INSERT INTO comptes (email, id, nom, role, alias, cree) VALUES (?,?,?,?,?,?)", (email, uid(email), nom, role, "u_Pg0NZZPvuRnSFpMpLk1PGg" if role == "attente" and email.startswith("info") else None, now))
    c.execute("INSERT INTO sessions VALUES (?,?,?)", (tok, email, now + 864e5))
c.commit(); c.close()
srv = subprocess.Popen(["node", str(RAC / "test/serveur.mjs")], env={**os.environ, "BASE": BASE, "PORT": "8791"}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(1.5)
URL = "http://localhost:8791/"
errs = []
def verif(ok, msg):
    print(("OK   " if ok else "ÉCHEC ") + msg)
    if not ok: errs.append(msg)
def sql(q, *a):
    c = sqlite3.connect(BASE); r = c.execute(q, a).fetchall(); c.close(); return r
def ctx_pour(b, tok=None, w=390):
    ctx = b.new_context(viewport={"width": w, "height": 844 if w < 600 else 900}, locale="fr-FR", timezone_id="Africa/Abidjan", accept_downloads=True, service_workers="block")
    if tok: ctx.add_cookies([{"name": "sde_s", "value": tok, "domain": "localhost", "path": "/", "httpOnly": True, "secure": True, "sameSite": "Lax"}])
    ctx.route("https://accounts.google.com/**", lambda r: r.abort())
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", lambda r: r.fulfill(path="/home/claude/vendor/jszip/dist/jszip.min.js", content_type="application/javascript"))
    ctx.route("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", lambda r: r.fulfill(path="/home/claude/vendor/qrgen/js/qrcode.js", content_type="application/javascript"))
    p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"pageerror {e}"))
    p.on("console", lambda m: errs.append(f"console {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
    p.goto(URL); p.wait_for_timeout(2500)
    return ctx, p
def txt(p, s="body"): return p.inner_text(s).replace("\xa0", " ").replace(" ", " ")
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        # Visiteur
        ctx, p = ctx_pour(b)
        t = txt(p)
        verif("Se connecter avec Google" in t and p.locator('#nav [data-vue="espace"]').count() == 1 and p.locator('#nav [data-vue="membres"]').count() == 0, "visiteur : bannière de connexion, Mon espace, pas de registre")
        verif("IN FIRE 2026" in t.upper() or "IN FIRE" in t.upper(), "visiteur : agenda public visible")
        p.screenshot(path=str(OUT / "01-visiteur.png"), full_page=True)
        p.click('.banner [data-act="connexion"]'); p.wait_for_timeout(800)
        verif("CONNEXION DES RESPONSABLES" in txt(p, "#sheet").upper(), "feuille de connexion Google")
        ctx.close()
        # Propriétaire
        ctx, p = ctx_pour(b, "tok-owner", 1280)
        t = txt(p)
        verif("32" in txt(p, ".acc-hero") and p.locator('#nav [data-vue="finances"]').count() == 1, "propriétaire : 32 soldats, finances visibles")
        p.screenshot(path=str(OUT / "02-proprietaire.png"), full_page=True)
        p.click('#nav [data-vue="membres"]'); p.wait_for_timeout(600)
        verif("BERTÉ" in txt(p, "#main").upper(), "registre chargé depuis la base")
        # Contributeur en parallèle
        ctx2, p2 = ctx_pour(b, "tok-contrib", 390)
        verif(p2.locator('#nav [data-vue="finances"]').count() == 0 and p2.locator('#nav [data-vue="membres"]').count() >= 0, "contributeur : pas de finances")
        r = p2.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({op:'query', path:'cotisations'})}).then(r => r.json())")
        verif(r.get("docs") == [], "contributeur : cotisations illisibles côté serveur")
        r = p2.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({op:'set', path:'config/general', data:{x:1}})}).then(r => r.status)")
        verif(r == 403, "contributeur : réglages protégés (403)")
        # Écriture propriétaire → visible chez le contributeur
        p.wait_for_timeout(300)
        p.evaluate("window.claude.use('db').then(db => db.collection('annonces').doc('test-sync').set({titre:'Essai de synchronisation', texte:'Bonjour', creeLe: Date.now(), epingle: true}))")
        p2.wait_for_timeout(6000)
        p2.click('#nav [data-vue="accueil"]'); p2.wait_for_timeout(500)
        verif("Essai de synchronisation" in txt(p2, "#main"), "synchronisation : l’annonce apparaît chez le contributeur")
        verif(sql("SELECT count(*) FROM docs WHERE path='annonces/test-sync'")[0][0] == 1, "annonce enregistrée dans la base")
        ctx2.close()
        # Comptes
        p.click("#btn-compte"); p.wait_for_timeout(500)
        verif("infosoldat@gmail.com" in txt(p, "#sheet") and "PROPRIÉTAIRE" in txt(p, "#sheet").upper(), "bouton Mon compte dans l’en-tête")
        p.click('#sheet [data-act="comptes"]'); p.wait_for_timeout(1500)
        verif("sec@gmail.com" in txt(p, "#sheet") and "PROPRIÉTAIRE" in txt(p, "#sheet").upper(), "feuille Comptes et accès")
        p.screenshot(path=str(OUT / "03-comptes.png"), full_page=True)
        p.fill("#cp-email", "tresorier@gmail.com"); p.fill("#cp-nom", "Trésorier"); p.select_option("#cp-role", "admin")
        p.click('#f-compte [type=submit]'); p.wait_for_timeout(1200)
        verif(sql("SELECT role FROM comptes WHERE email='tresorier@gmail.com'") == [("admin",)], "compte ajouté avec le rôle administrateur")
        sel = p.locator('select[data-compte="sec@gmail.com"]'); sel.select_option("lecture"); p.wait_for_timeout(1200)
        verif(sql("SELECT role FROM comptes WHERE email='sec@gmail.com'") == [("lecture",)], "rôle modifié depuis la liste")
        p.click('#sheet .sheet-h [data-act="fermer"]'); p.wait_for_timeout(300)
        # Espace soldat : créer un code
        p.goto(URL + "#membres"); p.wait_for_timeout(2500)
        p.click('[data-act="voir-membre"][data-id="sde-0001"]'); p.wait_for_timeout(600)
        p.click('#sheet [data-act="esp-creer"]'); p.wait_for_timeout(3500)
        code = json.loads(sql("SELECT data FROM docs WHERE path='acces/sde-0001'")[0][0])["code"]
        verif(bool(re.match(r"^[2-9A-Z]{4}-[2-9A-Z]{4}$", code)), "code d’espace soldat créé : " + code)
        p.click('#sheet .sheet-h [data-act="fermer"]'); p.wait_for_timeout(300)
        # Sauvegarde Excel → vrai téléchargement
        p.goto(URL); p.wait_for_timeout(2500)
        with p.expect_download(timeout=20000) as dl:
            p.evaluate("document.querySelector('[data-act=\"sauvegarde-excel\"]').click()")
        verif(dl.value.suggested_filename.endswith(".xlsx"), "téléchargement Excel : " + dl.value.suggested_filename)
        ctx.close()
        # Soldat anonyme avec son code
        ctx, p = ctx_pour(b)
        p.click('#nav [data-vue="espace"]'); p.wait_for_timeout(300)
        p.fill("#esp-code", code); p.click('#f-esp [type=submit]'); p.wait_for_timeout(5000)
        verif("BERTÉ" in txt(p, "#main").upper() and "MES PRÉSENCES" in txt(p, "#main").upper(), "soldat sans compte : espace ouvert avec son code")
        p.screenshot(path=str(OUT / "04-espace-soldat.png"), full_page=True)
        r = p.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({op:'query', path:'espace'})}).then(r => r.json())")
        verif(r.get("docs") == [], "visiteur : impossible de lister les espaces chiffrés")
        r = p.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({op:'query', path:'membres'})}).then(r => r.json())")
        verif(r.get("docs") == [], "visiteur : registre illisible côté serveur")
        r = p.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json', 'origin':'https://pirate.example'}, body: JSON.stringify({op:'get', path:'config/general'})}).then(r => r.status)")
        ctx.close()
        # En attente
        ctx, p = ctx_pour(b, "tok-attente")
        verif("attend qu’un administrateur" in txt(p), "compte en attente : message d’attente")
        ctx.close(); b.close()
finally:
    srv.terminate()
print("\n".join(errs) if errs else "\nTout est vert.")
