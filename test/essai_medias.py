"""Essais : médiathèque (envoi par morceaux, miniatures, lecture partielle, visibilité, suppression)."""
import json, sqlite3, subprocess, time, os, hashlib, base64, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ICI = Path(__file__).parent; RAC = ICI.parent
TMP = Path("/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad")
F = TMP / "medias-essai"
BASE = TMP / "essai-medias.db"
OUT = ICI / "captures"; OUT.mkdir(exist_ok=True)
if BASE.exists(): BASE.unlink()
c = sqlite3.connect(BASE); c.executescript((RAC / "schema.sql").read_text())
def uid(e): return "u_" + base64.urlsafe_b64encode(hashlib.sha256(e.encode()).digest()).decode().rstrip("=")[:22]
now = int(time.time() * 1000)
for email, nom, role, tok in [("infosoldat@gmail.com", "Jérémy Octave GLAZAÏ", "attente", "tok-owner"), ("sec@gmail.com", "Esther Secrétaire", "contributeur", "tok-contrib"), ("soldat@gmail.com", "Paul Soldat", "soldat", "tok-soldat")]:
    c.execute("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?,?,?,?,?)", (email, uid(email), nom, role, now))
    c.execute("INSERT INTO sessions VALUES (?,?,?)", (tok, email, now + 864e5))
c.execute("INSERT INTO docs (path, parent, id, data, version, maj) VALUES ('config/general','config','general',?,1,?)", (json.dumps({"nomCourt": "S.D.E.", "nomOfficiel": "Mouvement Prophético-Apostolique Soldats de l’Éternel"}), now))
c.commit(); c.close()
PORT = 8798
srv = subprocess.Popen(["node", str(RAC / "test/serveur.mjs")], env={**os.environ, "BASE": str(BASE), "PORT": str(PORT)}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(1.5)
URL = f"http://localhost:{PORT}/"
errs = []
def verif(ok, msg):
    print(("OK   " if ok else "ÉCHEC ") + msg)
    if not ok: errs.append(msg)
def sql(q, *a):
    c = sqlite3.connect(BASE); r = c.execute(q, a).fetchall(); c.commit(); c.close(); return r
def http(chemin, tok=None, entetes=None):
    h = dict(entetes or {})
    if tok: h["Cookie"] = "sde_s=" + tok
    try:
        r = urllib.request.urlopen(urllib.request.Request(URL.rstrip("/") + chemin, headers=h)); return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read()
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def ctx_pour(tok=None, w=1280):
            ctx = b.new_context(viewport={"width": w, "height": 844 if w < 600 else 900}, locale="fr-FR", timezone_id="Africa/Abidjan", accept_downloads=True, service_workers="block")
            if tok: ctx.add_cookies([{"name": "sde_s", "value": tok, "domain": "localhost", "path": "/", "httpOnly": True, "secure": False, "sameSite": "Lax"}])
            for pat in ["https://fonts.googleapis.com/**", "https://fonts.gstatic.com/**"]: ctx.route(pat, lambda r: r.abort())
            ctx.route("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", lambda r: r.fulfill(path="/home/claude/vendor/jszip/dist/jszip.min.js", content_type="application/javascript"))
            ctx.route("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", lambda r: r.fulfill(path="/home/claude/vendor/qrgen/js/qrcode.js", content_type="application/javascript"))
            p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"pageerror {e}"))
            p.on("console", lambda m: errs.append(f"console {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
            p.goto(URL); p.wait_for_timeout(2500)
            return ctx, p

        # 1. Contributrice : envoi de tous les types de fichiers
        ctx, p = ctx_pour("tok-contrib")
        verif(p.locator('#nav [data-vue="mediatheque"]').count() == 1, "onglet Médiathèque dans la navigation")
        p.click('#nav [data-vue="mediatheque"]'); p.wait_for_timeout(1200)
        verif("La médiathèque est vide" in p.inner_text("#main"), "médiathèque vide au départ")
        p.click('#main [data-act="med-ajouter"]'); p.wait_for_timeout(500)
        fichiers = ["Culte-du-dimanche.mp4", "Louange.mp3", "IN-FIRE-photo.jpg", "Programme-IN-FIRE.pdf", "Rapport-annuel.docx", "Presentation-vision.pptx", "Budget-2026.xlsx", "Temoignage.webm", "piege.html"]
        p.set_input_files("#med-fichiers", [str(F / n) for n in fichiers]); p.wait_for_timeout(500)
        verif(p.locator(".med-ligne.ko").count() == 1 and "type non accepté" in p.inner_text(".med-ligne.ko"), "fichier HTML refusé avant l’envoi")
        p.fill("#med-c", "IN FIRE"); p.select_option("#med-v", "public"); p.fill("#med-d", "Supports de la conférence")
        p.screenshot(path=str(OUT / "m1-ajout.png"), full_page=False)
        p.click("#f-med [type=submit]"); p.wait_for_timeout(9000)
        rows = sql("SELECT genre, visibilite, categorie, fini, miniature IS NOT NULL FROM medias ORDER BY genre")
        verif(len(rows) == 8 and all(r[3] == 1 and r[1] == "public" and r[2] == "IN FIRE" for r in rows), "8 fichiers envoyés (vidéos MP4 et WebM, audio, photo, PDF, Word, PowerPoint, Excel)")
        verif(any(r[0] == "image" and r[4] for r in rows) and any(r[0] == "video" and r[4] for r in rows), "miniatures générées pour la photo et la vidéo")
        verif(p.locator(".med-carte").count() == 8, "grille de 8 médias")
        p.screenshot(path=str(OUT / "m2-grille.png"), full_page=True)
        # Filtres et recherche
        p.click('[data-act="sous"][data-sous="docs"]'); p.wait_for_timeout(400)
        verif(p.locator(".med-carte").count() == 4, "filtre Documents : PDF, Word, PowerPoint, Excel")
        p.click('[data-act="sous"][data-sous="tout"]'); p.wait_for_timeout(300)
        p.fill("#med-q", "louange"); p.wait_for_timeout(300)
        verif(p.locator(".med-carte").count() == 1, "recherche par titre")
        p.fill("#med-q", ""); p.wait_for_timeout(300)
        # Lecteur vidéo
        p.click('.med-carte.g-video[aria-label*="Temoignage"]'); p.wait_for_timeout(1500)
        ok = p.evaluate("(() => { const v = document.querySelector('#sheet video'); return !!v && v.readyState >= 1 && v.duration > 3; })()")
        verif(ok, "lecteur vidéo : la vidéo se charge et se lit")
        p.screenshot(path=str(OUT / "m3-video.png"), full_page=False)
        p.click('#sheet [data-act="fermer"]'); p.wait_for_timeout(300)
        p.click('.med-carte.g-audio'); p.wait_for_timeout(1500)
        verif(p.evaluate("(() => { const a = document.querySelector('#sheet audio'); return !!a && a.duration > 4; })()"), "lecteur audio MP3")
        p.click('#sheet [data-act="fermer"]'); p.wait_for_timeout(300)
        p.click('.med-carte.g-image'); p.wait_for_timeout(800)
        verif(p.evaluate("document.querySelector('#sheet img.med-photo').naturalWidth") == 1200, "photo affichée en grand")
        p.click('#sheet [data-act="fermer"]'); p.wait_for_timeout(300)
        # Grande vidéo : plusieurs morceaux de 8 Mo
        p.click('#main [data-act="med-ajouter"]'); p.wait_for_timeout(400)
        p.set_input_files("#med-fichiers", str(F / "grande-video.mp4")); p.select_option("#med-v", "membres"); p.fill("#med-c", "Enseignements")
        p.click("#f-med [type=submit]"); p.wait_for_timeout(14000)
        g = sql("SELECT id, morceaux, fini, nom FROM medias WHERE nom = 'grande-video.mp4'")
        verif(len(g) == 1 and g[0][1] == 3 and g[0][2] == 1, "grande vidéo (17 Mo) envoyée en 3 morceaux")
        ctx.close()

        # 2. Lecture partielle (Range) à cheval sur deux morceaux, contenu exact
        gid, _, _, gnom = g[0]
        donnees = (F / "grande-video.mp4").read_bytes()
        a, z = 8 * 1048576 - 100, 8 * 1048576 + 99
        st, h, corps = http(f"/m/{gid}/{gnom}", "tok-soldat", {"Range": f"bytes={a}-{z}"})
        hl = {k.lower(): v for k, v in h.items()}
        verif(st == 206 and corps == donnees[a:z + 1] and hl.get("content-range") == f"bytes {a}-{z}/{len(donnees)}", "lecture partielle exacte entre deux morceaux (206)")
        st, h, corps = http(f"/m/{gid}/{gnom}", "tok-soldat")
        verif(st == 200 and corps == donnees, "téléchargement complet identique au fichier d’origine")

        # 3. Visibilité
        st, _, _ = http(f"/m/{gid}/{gnom}")
        verif(st == 403, "média réservé aux membres : refusé sans connexion")
        st, _, j = http("/api/medias")
        lv = json.loads(j)["medias"]
        verif(len(lv) == 8 and all(m["visibilite"] == "public" for m in lv), "visiteur : seulement les 8 médias publics")
        pid = [m for m in lv if m["genre"] == "pdf"][0]
        st, h, corps = http(f"/m/{pid['id']}/{pid['nom']}")
        verif(st == 200 and {k.lower(): v for k, v in h.items()}["content-type"] == "application/pdf" and corps[:4] == b"%PDF", "PDF public ouvert par tout le monde")
        did = [m for m in lv if m["genre"] == "word"][0]
        st, h, _ = http(f"/m/{did['id']}/{did['nom']}")
        verif("attachment" in {k.lower(): v for k, v in h.items()}["content-disposition"], "Word : proposé en téléchargement")
        sql("UPDATE medias SET visibilite = 'responsables' WHERE nom = 'Budget-2026.xlsx'")
        st, _, j = http("/api/medias", "tok-soldat")
        noms = [m["nom"] for m in json.loads(j)["medias"]]
        verif("grande-video.mp4" in noms and "Budget-2026.xlsx" not in noms, "soldat : médias des membres, pas ceux des responsables")
        st, _, j = http("/api/medias", "tok-soldat")
        verif(json.loads(j)["peutAjouter"] is False, "soldat : ne peut pas ajouter de média")

        # 4. Visiteur sur téléphone
        ctx, p = ctx_pour(None, 390)
        p.click('#nav [data-vue="plus"]') if p.locator('#nav [data-vue="plus"]').count() else None
        p.evaluate("allerA && 0") if False else None
        p.goto(URL + "?r=1#mediatheque"); p.wait_for_timeout(2500)
        verif(p.locator(".med-carte").count() == 7 and p.locator('[data-act="med-ajouter"]').count() == 0, "visiteur : grille publique, sans bouton d’ajout")
        larg = p.evaluate("document.documentElement.scrollWidth")
        verif(larg <= 390, f"téléphone : pas de défilement horizontal ({larg}px)")
        p.screenshot(path=str(OUT / "m4-visiteur-tel.png"), full_page=True)
        ctx.close()

        # 5. Propriétaire : modification et suppression
        ctx, p = ctx_pour("tok-owner")
        p.goto(URL + "?r=2#mediatheque"); p.wait_for_timeout(2500)
        p.click('.med-carte.g-pdf'); p.wait_for_timeout(600)
        p.click('#sheet [data-act="med-modifier"]'); p.wait_for_timeout(400)
        p.fill("#mm-t", "Programme officiel IN FIRE 2026"); p.click("#f-med-modif [type=submit]"); p.wait_for_timeout(1500)
        verif(sql("SELECT titre FROM medias WHERE genre='pdf'")[0][0] == "Programme officiel IN FIRE 2026", "modification du titre")
        p.click('#sheet [data-act="med-suppr"]'); p.wait_for_timeout(200); p.click('#sheet [data-act="med-suppr"]'); p.wait_for_timeout(1500)
        verif(not sql("SELECT 1 FROM medias WHERE genre='pdf'"), "suppression d’un média")
        r = p.evaluate("fetch('/api/medias', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({nom:'x.exe', taille: 10})}).then(r => r.status)")
        verif(r == 400, "serveur : extension non autorisée refusée")
        ctx.close()
        b.close()
finally:
    srv.terminate()
print("\nTout est vert." if not errs else "\nÉCHECS :\n" + "\n".join(errs))
