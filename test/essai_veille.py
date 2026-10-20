"""Essais : veille pastorale (voyants cliquables, tendances, filtre par dimension, dimensions modifiables)."""
import json, sqlite3, subprocess, time, os, hashlib, base64
from pathlib import Path
from playwright.sync_api import sync_playwright
ICI = Path(__file__).parent; RAC = ICI.parent
TMP = Path("/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad")
BASE = TMP / "essai-veille.db"
OUT = ICI / "captures"; OUT.mkdir(exist_ok=True)
if BASE.exists(): BASE.unlink()
c = sqlite3.connect(BASE); c.executescript((RAC / "schema.sql").read_text())
def uid(e): return "u_" + base64.urlsafe_b64encode(hashlib.sha256(e.encode()).digest()).decode().rstrip("=")[:22]
now = int(time.time() * 1000)
for email, nom, role, tok in [("infosoldat@gmail.com", "Jérémy Octave GLAZAÏ", "attente", "tok-owner"), ("sec@gmail.com", "Esther Secrétaire", "contributeur", "tok-contrib")]:
    c.execute("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?,?,?,?,?)", (email, uid(email), nom, role, now))
    c.execute("INSERT INTO sessions VALUES (?,?,?)", (tok, email, now + 864e5))
docs = json.loads((TMP / "transfert-essai.json").read_text()); docs = docs.get("docs", docs)
for path, d in docs.items():
    s = path.split("/"); c.execute("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?,?,?,?,1,?)", (path, "/".join(s[:-1]), s[-1], json.dumps(d, ensure_ascii=False), now))
c.commit(); c.close()
PORT = 8801
srv = subprocess.Popen(["node", str(RAC / "test/serveur.mjs")], env={**os.environ, "BASE": str(BASE), "PORT": str(PORT)}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(1.5)
URL = f"http://localhost:{PORT}/"
errs = []
def verif(ok, msg):
    print(("OK   " if ok else "ÉCHEC ") + msg)
    if not ok: errs.append(msg)
def sql(q, *a):
    c = sqlite3.connect(BASE); r = c.execute(q, a).fetchall(); c.commit(); c.close(); return r
def suivi(mid):
    r = sql("SELECT data FROM docs WHERE path=?", "suivi/" + mid)
    return json.loads(r[0][0]) if r else {}
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def ctx_pour(tok=None, w=1280):
            ctx = b.new_context(viewport={"width": w, "height": 844 if w < 600 else 900}, locale="fr-FR", timezone_id="Africa/Abidjan", service_workers="block")
            if tok: ctx.add_cookies([{"name": "sde_s", "value": tok, "domain": "localhost", "path": "/", "httpOnly": True, "secure": False, "sameSite": "Lax"}])
            for pat in ["https://fonts.googleapis.com/**", "https://fonts.gstatic.com/**"]: ctx.route(pat, lambda r: r.abort())
            ctx.route("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", lambda r: r.fulfill(path="/home/claude/vendor/jszip/dist/jszip.min.js", content_type="application/javascript"))
            ctx.route("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", lambda r: r.fulfill(path="/home/claude/vendor/qrgen/js/qrcode.js", content_type="application/javascript"))
            p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"pageerror {e}"))
            p.on("console", lambda m: errs.append(f"console {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
            p.goto(URL); p.wait_for_timeout(3000)
            return ctx, p
        ctx, p = ctx_pour("tok-owner")
        p.click('[data-act="aller-veille"]'); p.wait_for_timeout(1200)
        entetes = p.eval_on_selector_all(".vy-table thead th", "l => l.map(x => x.getAttribute('title') || x.textContent)")
        verif(all(x in entetes for x in ["Santé physique", "Moral et émotionnel", "Vie spirituelle", "Situation financière", "Vie professionnelle ou études", "Famille et couple", "Relations et intégration"]), "tableau : 7 dimensions de veille (physique, moral, spirituel, financier, professionnel, famille, relations)")
        verif(p.locator(".vw-resume .vw-c").count() == 5 and p.locator(".vw-dims .chip-btn").count() == 7, "résumé par état et par dimension")
        # 1. Un toucher sur un voyant → niveau enregistré
        cell = p.locator('.vw-cell[data-k="moral"]').first
        mid = cell.get_attribute("data-id")
        cell.click(); p.wait_for_timeout(500)
        p.fill("#vr-note", "Deuil dans la famille, à visiter")
        p.screenshot(path=str(OUT / "v-rapide.png"))
        p.click('.vr-n[data-n="3"]'); p.wait_for_timeout(1500)
        s1 = suivi(mid)
        verif(s1.get("moral", {}).get("n") == 3 and "Deuil" in s1["moral"]["note"] and len(s1.get("historique", {})) == 1, "voyant Moral passé à « Difficile » en un toucher, avec l’observation")
        verif(p.locator('.vw-dims .chip-btn[data-k="moral"] b').inner_text() == "1", "compteur de difficultés de la dimension Moral")
        # 2. Amélioration → flèche de tendance
        p.locator(f'.vw-cell[data-id="{mid}"][data-k="moral"]').click(); p.wait_for_timeout(500)
        p.click('.vr-n[data-n="2"]'); p.wait_for_timeout(1500)
        verif(p.locator(f'.vw-cell[data-id="{mid}"][data-k="moral"] .vy-tend.up').count() == 1, "tendance : flèche « en mieux » après amélioration")
        p.locator(f'.vw-cell[data-id="{mid}"][data-k="financier"]').click(); p.wait_for_timeout(400)
        p.click('.vr-n[data-n="4"]'); p.wait_for_timeout(1500)
        verif(suivi(mid)["financier"]["n"] == 4 and suivi(mid)["moral"]["n"] == 2, "deuxième dimension enregistrée sans effacer la première")
        # 3. Filtre par dimension
        p.click('.vw-dims .chip-btn[data-k="financier"]'); p.wait_for_timeout(500)
        verif(p.locator(".vy-table tbody tr").count() == 1, "filtre « Situation financière » : seul le membre en difficulté")
        p.click('.vw-dims [data-act="veille-dim"][data-k=""]'); p.wait_for_timeout(400)
        p.screenshot(path=str(OUT / "v-tableau.png"), full_page=True)
        # 4. Depuis la fiche membre
        p.click(f'.vy-table [data-act="voir-membre"][data-id="{mid}"]'); p.wait_for_timeout(1200)
        verif(p.locator('#sheet .vy-t.edit[data-act="veille-niveau"]').count() == 7, "fiche membre : 7 voyants de veille cliquables")
        p.click('#sheet .vy-t[data-k="professionnel"]'); p.wait_for_timeout(500)
        p.click('.vr-n[data-n="1"]'); p.wait_for_timeout(1800)
        verif(p.locator("#sheet .voyants").count() == 1 and suivi(mid)["professionnel"]["n"] == 1, "retour à la fiche après l’enregistrement rapide")
        p.screenshot(path=str(OUT / "v-fiche.png"))
        p.click('#sheet [data-act="fermer"]'); p.wait_for_timeout(400)
        # 5. Dimensions modifiables
        p.click('[data-act="veille-dims"]'); p.wait_for_timeout(500)
        p.uncheck('input[name="actif_6"]'); p.fill("#dv-nouv", "Logement"); p.click("#f-dims-veille [type=submit]"); p.wait_for_timeout(1800)
        cfgd = json.loads(sql("SELECT data FROM docs WHERE path='config/general'")[0][0])["veilleDims"]
        entetes = p.eval_on_selector_all(".vy-table thead th", "l => l.map(x => x.getAttribute('title') || x.textContent)")
        verif(any(d["l"] == "Logement" for d in cfgd) and "Logement" in entetes and "Relations et intégration" not in entetes, "dimension ajoutée (Logement) et dimension masquée")
        # 6. Recherche
        p.fill("#vw-q", "zzzz"); p.wait_for_timeout(400)
        verif("Aucun membre" in p.inner_text("#main"), "recherche d’un membre dans la veille")
        ctx.close()
        # 7. Contributeur : la veille reste confidentielle
        ctx, p = ctx_pour("tok-contrib")
        r = p.evaluate("fetch('/api/db', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({op:'query', path:'suivi'})}).then(r => r.json())")
        verif(r.get("docs") == [] and p.locator('[data-act="aller-veille"]').count() == 0, "contributeur : aucune donnée de veille")
        ctx.close()
        b.close()
finally:
    srv.terminate()
print("\nTout est vert." if not errs else "\nÉCHECS :\n" + "\n".join(errs))
