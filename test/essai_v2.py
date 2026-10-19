"""Essais : site vitrine, vignettes de partage et Éliézer hébergé (avec une fausse API Claude)."""
import json, sqlite3, subprocess, time, os, hashlib, base64, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ICI = Path(__file__).parent; RAC = ICI.parent
TMP = Path("/tmp/claude-0/-home-claude/e03f26e4-5127-532c-ad3a-717268f914a7/scratchpad")
BASE, JOURNAL = TMP / "essai2.db", TMP / "ia-journal.jsonl"
OUT = ICI / "captures"; OUT.mkdir(exist_ok=True)
for f in (BASE, JOURNAL):
    if f.exists(): f.unlink()
c = sqlite3.connect(BASE); c.executescript((RAC / "schema.sql").read_text())
def uid(e): return "u_" + base64.urlsafe_b64encode(hashlib.sha256(e.encode()).digest()).decode().rstrip("=")[:22]
now = int(time.time() * 1000)
for email, nom, role, tok in [("infosoldat@gmail.com", "Jérémy Octave GLAZAÏ", "attente", "tok-owner"), ("sec@gmail.com", "Esther Secrétaire", "contributeur", "tok-contrib"), ("nouveau@gmail.com", "Nouveau", "attente", "tok-attente")]:
    c.execute("INSERT INTO comptes (email, id, nom, role, cree) VALUES (?,?,?,?,?)", (email, uid(email), nom, role, now))
    c.execute("INSERT INTO sessions VALUES (?,?,?)", (tok, email, now + 864e5))
docs = json.loads((TMP / "transfert-essai.json").read_text())
docs = docs.get("docs", docs)
docs["evenements/culte-test"] = {"titre": "Culte de réveil", "type": "Culte", "date": "2026-11-15", "heure": "09:00", "lieu": "Siège, Cocody Deux-Plateaux", "description": "Ouvert à tous."}
docs["evenements/reunion-privee"] = {"titre": "Réunion des responsables", "type": "Réunion", "date": "2026-11-16", "heure": "18:00", "lieu": "Bureau"}
for path, d in docs.items():
    s = path.split("/"); c.execute("INSERT INTO docs (path, parent, id, data, version, maj) VALUES (?,?,?,?,1,?)", (path, "/".join(s[:-1]), s[-1], json.dumps(d, ensure_ascii=False), now))
c.commit(); c.close()
PORT = 8793
srv = subprocess.Popen(["node", str(RAC / "test/serveur.mjs")], env={**os.environ, "BASE": str(BASE), "PORT": str(PORT), "FAUX_IA": "1", "IA_JOURNAL": str(JOURNAL)}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(1.5)
errs = []
def verif(ok, msg):
    print(("OK   " if ok else "ÉCHEC ") + msg)
    if not ok: errs.append(msg)
def get(path, host):
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}", headers={"Host": host})
    class Pas(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k): return None
    try:
        r = urllib.request.build_opener(Pas).open(req); return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), ""
# Routage des domaines
st, h, corps = get("/", "mouvement-sde.org")
verif(st == 200 and "IN FIRE" in corps and "Ézéchiel 37" in corps and 'href="https://app.mouvement-sde.org/#espace"' in corps, "mouvement-sde.org : site vitrine servi")
verif('content="https://mouvement-sde.org/og-sde.png"' in corps and "summary_large_image" in corps and "sdedigital.org" not in corps, "vitrine : vignette de partage 1200×630")
st, h, _ = get("/membres?x=1", "mouvement-sde.org")
verif(st == 301 and {k.lower(): v for k, v in h.items()}.get("location") == "https://app.mouvement-sde.org/membres?x=1", "mouvement-sde.org : autres chemins → application")
st, h, _ = get("/", "www.mouvement-sde.org")
verif(st == 301 and {k.lower(): v for k, v in h.items()}.get("location") == "https://mouvement-sde.org/", "www → mouvement-sde.org")
st, h, _ = get("/og-sde.png", "mouvement-sde.org")
verif(st == 200 and {k.lower(): v for k, v in h.items()}.get("content-type") == "image/png", "image de partage accessible")
st, h, corps = get("/api/public", "mouvement-sde.org")
j = json.loads(corps); titres = [e["titre"] for e in j["evenements"]]
verif("Culte de réveil" in titres and "Réunion des responsables" not in titres and all("presences" not in e for e in j["evenements"]), "agenda public : cultes et conférences seulement, sans données internes")
st, h, corps = get("/", "app.mouvement-sde.org")
verif(st == 200 and 'og-app.png' in corps and 'noindex' in corps, "application : vignette dédiée, non indexée")
st, h, corps = get("/api/moi", "app.mouvement-sde.org")
verif(json.loads(corps)["ia"] is False, "visiteur : Éliézer non proposé")
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=[f"--host-resolver-rules=MAP mouvement-sde.org 127.0.0.1:{PORT}, MAP app.mouvement-sde.org 127.0.0.1:{PORT}"])
        def ctx_pour(url, tok=None, w=390):
            ctx = b.new_context(viewport={"width": w, "height": 844 if w < 600 else 900}, locale="fr-FR", timezone_id="Africa/Abidjan", accept_downloads=True, service_workers="block")
            if tok: ctx.add_cookies([{"name": "sde_s", "value": tok, "domain": "app.mouvement-sde.org", "path": "/", "httpOnly": True, "secure": False, "sameSite": "Lax"}])
            for pat in ["https://accounts.google.com/**", "https://fonts.googleapis.com/**", "https://fonts.gstatic.com/**"]: ctx.route(pat, lambda r: r.abort())
            ctx.route("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", lambda r: r.fulfill(path="/home/claude/vendor/jszip/dist/jszip.min.js", content_type="application/javascript"))
            ctx.route("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", lambda r: r.fulfill(path="/home/claude/vendor/qrgen/js/qrcode.js", content_type="application/javascript"))
            p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"pageerror {e}"))
            p.on("console", lambda m: errs.append(f"console {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
            p.goto(url); p.wait_for_timeout(2500)
            return ctx, p
        # Vitrine sur téléphone
        ctx, p = ctx_pour("http://mouvement-sde.org/")
        verif(p.locator("#agenda").is_visible() and "Culte de réveil" in p.inner_text("#agenda") and "Réunion des responsables" not in p.inner_text("body"), "vitrine : agenda en direct affiché")
        p.screenshot(path=str(OUT / "v2-vitrine-tel.png"), full_page=True)
        with p.expect_download() as dl: p.click('#infire [data-ics="infire"]')
        ics = Path(dl.value.path()).read_text()
        verif("DTSTART:20261031T080000Z" in ics and "IN FIRE 2026" in ics, "IN FIRE : ajout à l’agenda (.ics)")
        larg = p.evaluate("document.documentElement.scrollWidth")
        verif(larg <= 390, f"vitrine : pas de défilement horizontal ({larg}px)")
        ctx.close()
        ctx, p = ctx_pour("http://mouvement-sde.org/", w=1280)
        p.screenshot(path=str(OUT / "v2-vitrine-pc.png"), full_page=False)
        ctx.close()
        # Contributeur : Éliézer avec outils
        ctx, p = ctx_pour("http://app.mouvement-sde.org/", "tok-contrib", 1280)
        verif(p.locator('#nav [data-vue="assistant"]').count() == 1, "contributeur : onglet Éliézer visible")
        p.click('#nav [data-vue="assistant"]'); p.wait_for_timeout(600)
        p.fill("#ia-q", "Quel est le prochain rendez-vous ?"); p.keyboard.press("Enter")
        p.wait_for_timeout(3000)
        t = p.inner_text("#ia-fil")
        verif("Prochain rendez-vous : IN FIRE 2026" in t, "Éliézer : consulte l’agenda (outil) et répond")
        p.screenshot(path=str(OUT / "v2-eliezer.png"), full_page=False)
        appels = [json.loads(l) for l in JOURNAL.read_text().splitlines()]
        verif(len(appels) == 2 and appels[0]["key"] == "cle-essai" and "agenda" in appels[0]["tools"] and appels[1]["messages"][-1]["content"][0]["type"] == "tool_result", "relais : clé côté serveur, boucle outil → résultat")
        verif("finances" not in appels[0]["tools"], "contributeur : outil finances non transmis")
        verif(appels[0]["model"] == "claude-sonnet-5-5", "modèle par défaut")
        # Rédaction d'affiche (JSON, modèle rapide)
        r = p.evaluate("window.claude.use('sample').then(s => s.json('Propose un texte', {modelTier:'quick'}))")
        verif(r.get("surtitre") == "Grande soirée", "Éliézer : réponse JSON (affiches)")
        verif(json.loads(JOURNAL.read_text().splitlines()[-1])["model"] == "claude-haiku-5-5", "modèle rapide pour les affiches")
        ctx.close()
        # Compte en attente : pas d'accès
        ctx, p = ctx_pour("http://app.mouvement-sde.org/", "tok-attente", 390)
        r = p.evaluate("fetch('/api/ia', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({messages:[{role:'user', content:'x'}]})}).then(r => r.status)")
        verif(r == 403 and p.locator('#nav [data-vue="assistant"]').count() == 0, "compte en attente : Éliézer refusé (403)")
        ctx.close()
        # Lien direct vers l'espace soldat
        ctx, p = ctx_pour("http://app.mouvement-sde.org/#espace")
        verif("code" in p.inner_text("#main").lower(), "lien #espace : ouvre l’espace soldat")
        ctx.close()
        b.close()
finally:
    srv.terminate()
print("\nTout est vert." if not errs else "\nÉCHECS :\n" + "\n".join(errs))
