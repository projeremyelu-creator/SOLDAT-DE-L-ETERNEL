"""Essais : inscription libre par e-mail, matricule à 6 chiffres, connexion, codes d'activation, liaison à une fiche."""
import json, sqlite3, subprocess, time, os, hashlib, base64, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ICI = Path(__file__).parent; RAC = ICI.parent
TMP = Path("/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad")
BASE = TMP / "essai-comptes.db"
OUT = ICI / "captures"; OUT.mkdir(exist_ok=True)
if BASE.exists(): BASE.unlink()
c = sqlite3.connect(BASE); c.executescript((RAC / "schema.sql").read_text())
def uid(e): return "u_" + base64.urlsafe_b64encode(hashlib.sha256(e.encode()).digest()).decode().rstrip("=")[:22]
now = int(time.time() * 1000)
c.execute("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?,?,?,?,?)", ("infosoldat@gmail.com", uid("infosoldat@gmail.com"), "Jérémy Octave GLAZAÏ", "attente", now))
c.execute("INSERT INTO sessions VALUES (?,?,?)", ("tok-owner", "infosoldat@gmail.com", now + 864e5))
docs = json.loads((TMP / "transfert-essai.json").read_text()); docs = docs.get("docs", docs)
for path, d in docs.items():
    s = path.split("/"); c.execute("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?,?,?,?,1,?)", (path, "/".join(s[:-1]), s[-1], json.dumps(d, ensure_ascii=False), now))
c.commit(); c.close()
ANCIEN = next((k.split("/")[1], v) for k, v in docs.items() if k.startswith("membres/") and k.count("/") == 1 and v.get("matricule") == "SDE-CI-013")
PORT = 8796
srv = subprocess.Popen(["node", str(RAC / "test/serveur.mjs")], env={**os.environ, "BASE": str(BASE), "PORT": str(PORT)}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(1.5)
URL = f"http://localhost:{PORT}/"
errs = []
def verif(ok, msg):
    print(("OK   " if ok else "ÉCHEC ") + msg)
    if not ok: errs.append(msg)
def sql(q, *a):
    c = sqlite3.connect(BASE); r = c.execute(q, a).fetchall(); c.commit(); c.close(); return r
def txt(p, s="body"): return p.inner_text(s).replace("\xa0", " ").replace(" ", " ")
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def ctx_pour(tok=None, w=390, url=URL):
            ctx = b.new_context(viewport={"width": w, "height": 844 if w < 600 else 900}, locale="fr-FR", timezone_id="Africa/Abidjan", accept_downloads=True, service_workers="block")
            if tok: ctx.add_cookies([{"name": "sde_s", "value": tok, "domain": "localhost", "path": "/", "httpOnly": True, "secure": False, "sameSite": "Lax"}])
            for pat in ["https://accounts.google.com/**", "https://fonts.googleapis.com/**", "https://fonts.gstatic.com/**"]: ctx.route(pat, lambda r: r.abort())
            ctx.route("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", lambda r: r.fulfill(path="/home/claude/vendor/jszip/dist/jszip.min.js", content_type="application/javascript"))
            ctx.route("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", lambda r: r.fulfill(path="/home/claude/vendor/qrgen/js/qrcode.js", content_type="application/javascript"))
            p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"pageerror {e}"))
            p.on("console", lambda m: errs.append(f"console {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
            p.goto(url); p.wait_for_timeout(2500)
            return ctx, p
        def api(p, chemin, corps=None):
            return p.evaluate("([c, b]) => fetch(c, b ? {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(b)} : {}).then(async r => ({s: r.status, j: await r.json().catch(() => ({}))}))", [chemin, corps])

        # 1. Inscription d'un nouveau soldat depuis le téléphone
        ctx, p = ctx_pour()
        verif("Créez votre compte" in txt(p, ".banner"), "visiteur : invitation à créer son compte")
        p.click('.banner [data-act="inscription"]'); p.wait_for_timeout(600)
        p.fill("#ci-prenoms", "Grâce Esther"); p.fill("#ci-nom", "Kouassi"); p.fill("#ci-tel", "07 11 22 33 44")
        p.fill("#cx-email", "grace.kouassi@exemple.ci"); p.fill("#ci-mdp", "Victoire2026"); p.fill("#ci-mdp2", "Victoire2027")
        p.click("#f-cnx [type=submit]"); p.wait_for_timeout(500)
        verif("identiques" in txt(p, "#f-err"), "inscription : mots de passe différents refusés")
        p.fill("#ci-mdp2", "Victoire2026"); p.click("#f-cnx [type=submit]")
        p.wait_for_load_state("load"); p.wait_for_timeout(3500)
        row = sql("SELECT role, matricule, membreId, mdp FROM comptes WHERE email='grace.kouassi@exemple.ci'")
        verif(len(row) == 1 and row[0][0] == "soldat" and re.fullmatch(r"\d{6}", row[0][1] or "") and row[0][3].startswith("pbkdf2$") and "Victoire" not in row[0][3], "inscription : compte Soldat, matricule à 6 chiffres, mot de passe haché")
        MAT, MID = row[0][1], row[0][2]
        fiche = json.loads(sql("SELECT data FROM docs WHERE path=?", "membres/" + MID)[0][0])
        verif(fiche["matricule"] == MAT and fiche["nom"] == "KOUASSI" and fiche["source"] == "inscription" and fiche["statut"] == "Nouveau venu", "fiche de membre créée automatiquement au registre")
        t = txt(p, "#main")
        verif(MAT in t and "Bienvenue" in t and "KOUASSI Grâce Esther" in t, "espace soldat ouvert aussitôt avec le matricule")
        verif(p.evaluate("document.querySelector('#esp-recto') && document.querySelector('#esp-recto').width > 300"), "carte de membre dessinée")
        p.screenshot(path=str(OUT / "c1-espace-nouveau.png"), full_page=True)
        r = api(p, "/api/db", {"op": "query", "path": "membres"})
        verif(r["j"].get("docs") == [], "soldat : registre des autres membres illisible")
        r = api(p, "/api/db", {"op": "set", "path": "membres/" + MID, "data": {"matricule": "000001"}})
        verif(r["s"] == 403, "soldat : ne peut pas modifier sa fiche ni son matricule")
        # Requête de prière
        p.fill("#esp-sujet", "Pour ma famille et mon travail"); p.click("#f-esp-priere [type=submit]"); p.wait_for_timeout(1200)
        pr = [json.loads(x[0]) for x in sql("SELECT data FROM docs WHERE parent='prieres'")]
        verif(any(x.get("pourId") == MID and x.get("source") == "espace" for x in pr), "requête de prière enregistrée dans la Chambre Haute")
        # Doublons et adresses réservées
        r = api(p, "/api/inscription", {"email": "grace.kouassi@exemple.ci", "motDePasse": "autrechose1", "prenoms": "X", "nom": "Y"})
        verif(r["s"] == 409, "inscription : adresse déjà utilisée refusée")
        r = api(p, "/api/inscription", {"email": "infosoldat@gmail.com", "motDePasse": "autrechose1", "prenoms": "X", "nom": "Y"})
        verif(r["s"] == 409, "inscription : adresse du propriétaire réservée")
        # Déconnexion puis connexion
        p.click("#btn-compte"); p.wait_for_timeout(400); p.click('#sheet [data-act="deconnexion"]'); p.wait_for_timeout(2500)
        p.click('.banner [data-act="connexion"]'); p.wait_for_timeout(500)
        p.fill("#cx-email", "grace.kouassi@exemple.ci"); p.fill("#cx-mdp", "mauvais-mdp"); p.click("#f-cnx [type=submit]"); p.wait_for_timeout(800)
        verif("incorrect" in txt(p, "#f-err"), "connexion : mauvais mot de passe refusé")
        p.fill("#cx-mdp", "Victoire2026"); p.click("#f-cnx [type=submit]"); p.wait_for_load_state("load"); p.wait_for_timeout(2500)
        verif(p.evaluate("window.SDE.moi.matricule") == MAT, "connexion : retour dans son compte")
        ctx.close()

        # 2. Freins contre les essais répétés
        ctx, p = ctx_pour()
        for _ in range(8): api(p, "/api/connexion", {"email": "grace.kouassi@exemple.ci", "motDePasse": "x" * 9})
        r = api(p, "/api/connexion", {"email": "grace.kouassi@exemple.ci", "motDePasse": "Victoire2026"})
        verif(r["s"] == 429, "8 essais manqués : compte freiné un quart d’heure")
        sql("DELETE FROM tentatives")
        ctx.close()

        # 3. Propriétaire : responsable avec code d'activation, liaison à une fiche, résumé publié
        ctx, p = ctx_pour("tok-owner", 1280)
        p.click("#btn-compte"); p.wait_for_timeout(400); p.click('#sheet [data-act="comptes"]'); p.wait_for_timeout(1500)
        p.fill("#cp-email", "tresorier@exemple.ci"); p.fill("#cp-nom", "Paul Trésorier"); p.select_option("#cp-role", "contributeur")
        p.click("#f-compte [type=submit]"); p.wait_for_timeout(1500)
        code = re.search(r"[2-9A-Z]{4}-[2-9A-Z]{4}", txt(p, ".cpt-code")).group(0)
        verif(bool(code) and "Envoyer par WhatsApp" in txt(p, ".cpt-code"), "responsable ajouté : code d’activation affiché une fois")
        p.screenshot(path=str(OUT / "c2-comptes.png"), full_page=False)
        sel = f'select[data-fiche="grace.kouassi@exemple.ci"]'
        p.select_option(sel, ANCIEN[0]); p.wait_for_timeout(1800)
        row = sql("SELECT matricule, membreId FROM comptes WHERE email='grace.kouassi@exemple.ci'")[0]
        verif(row == ("SDE-CI-013", ANCIEN[0]) and not sql("SELECT 1 FROM docs WHERE path=?", "membres/" + MID), "liaison : l’ancienne membre garde SDE-CI-013, la fiche automatique est retirée")
        p.wait_for_timeout(7000)
        em = sql("SELECT data FROM docs WHERE path=?", "espace_membre/" + ANCIEN[0])
        verif(len(em) == 1 and json.loads(em[0][0])["resume"]["m"]["matricule"] == "SDE-CI-013", "résumé (présences, cotisations) publié pour le compte relié")
        ctx.close()

        # 4. Activation par le responsable
        ctx, p = ctx_pour()
        p.click('.banner [data-act="connexion"]'); p.wait_for_timeout(500)
        p.click('[data-act="cnx-mode"][data-m="activation"]'); p.wait_for_timeout(300)
        p.fill("#cx-email", "tresorier@exemple.ci"); p.fill("#ca-code", code.lower().replace("-", " ")); p.fill("#ca-mdp", "Tresor-2026"); p.fill("#ca-mdp2", "Tresor-2026")
        p.click("#f-cnx [type=submit]"); p.wait_for_load_state("load"); p.wait_for_timeout(3000)
        verif(p.evaluate("window.SDE.moi.role") == "contributeur" and p.locator('#nav [data-vue="membres"]').count() == 1, "activation : le responsable choisit son mot de passe et accède au registre")
        r = api(p, "/api/activation", {"email": "tresorier@exemple.ci", "code": code, "motDePasse": "Autre-2026x"})
        verif(r["s"] == 401, "code d’activation à usage unique")
        ctx.close()

        # 5. Ancienne membre reliée : son espace montre SDE-CI-013 et les données publiées
        ctx, p = ctx_pour()
        r = api(p, "/api/connexion", {"email": "grace.kouassi@exemple.ci", "motDePasse": "Victoire2026"})
        verif(r["s"] == 200, "connexion de l’ancienne membre (" + str(r) + ")")
        p.goto(URL + "?r=1#espace"); p.wait_for_timeout(3500)
        t = txt(p, "#main")
        verif("SDE-CI-013" in t and "mises à jour" in t and "Bienvenue" not in t, "espace relié : ancien matricule et résumé du secrétariat")
        p.screenshot(path=str(OUT / "c3-espace-relie.png"), full_page=True)
        # Changement de mot de passe
        p.click("#btn-compte"); p.wait_for_timeout(400); p.click('#sheet [data-act="mot-de-passe"]'); p.wait_for_timeout(400)
        p.fill("#cm-ancien", "Victoire2026"); p.fill("#cm-nouveau", "Shalom-2027"); p.fill("#cm-nouveau2", "Shalom-2027"); p.click("#f-mdp [type=submit]"); p.wait_for_timeout(1200)
        r = api(p, "/api/connexion", {"email": "grace.kouassi@exemple.ci", "motDePasse": "Shalom-2027"})
        verif(r["s"] == 200, "changement de mot de passe")
        ctx.close()

        # 6. Mot de passe oublié : nouveau code par l'administrateur
        ctx, p = ctx_pour("tok-owner", 1280)
        r = api(p, "/api/comptes", {"email": "grace.kouassi@exemple.ci", "reinitialiser": True})
        code2 = r["j"].get("code", "")
        r2 = api(p, "/api/connexion", {"email": "grace.kouassi@exemple.ci", "motDePasse": "Shalom-2027"})
        r3 = api(p, "/api/activation", {"email": "grace.kouassi@exemple.ci", "code": code2, "motDePasse": "Nouveau-2028"})
        verif(bool(code2) and r2["s"] == 401 and r3["s"] == 200, "réinitialisation : l’ancien mot de passe tombe, le nouveau code fonctionne")
        ctx.close()
        b.close()
finally:
    srv.terminate()
print("\nTout est vert." if not errs else "\nÉCHECS :\n" + "\n".join(errs))
