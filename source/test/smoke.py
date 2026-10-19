import json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path("/home/claude/sde"); URL = (ROOT / "test" / "page.html").as_uri(); MOCK = (ROOT / "test" / "mock.js").read_text()
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for mode, w in [("owner", 390), ("owner", 1280), ("contrib", 390)]:
        ctx = b.new_context(viewport={"width": w, "height": 844}, locale="fr-FR", timezone_id="Africa/Abidjan")
        ctx.add_init_script(f"window.__MODE = {json.dumps(mode)};\n" + MOCK)
        p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(f"{mode} {w}: {e}"))
        p.route("**/fonts.googleapis.com/**", lambda r: r.abort())
        p.goto(URL); p.wait_for_timeout(600)
        vues = p.evaluate("[...document.querySelectorAll('#nav [data-vue]')].map(e => e.dataset.vue)")
        for v in ["accueil", "membres", "finances", "agenda", "garnisons", "academie", "portevoix", "chambre", "arsenal", "secretariat", "plus"]:
            p.evaluate(f"document.querySelector('#nav [data-vue=\"{v}\"]') ? document.querySelector('#nav [data-vue=\"{v}\"]').click() : null"); p.wait_for_timeout(200)
            sw = p.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            if sw[0] > sw[1]: errs.append(f"débordement {v} {mode} {w}")
            for sel in ['[data-act="voir-op"]', '[data-act="voir-cotis"]', '[data-act="voir-dec"]', '[data-act="voir-membre"]', '[data-act="voir-evt"]']:
                if p.locator(f"#main {sel}").count():
                    p.locator(f"#main {sel}").first.click(); p.wait_for_timeout(200)
                    p.click('#sheet .sheet-h [data-act="fermer"]'); p.wait_for_timeout(100)
                    break
        if mode == "owner" and w == 390:
            p.click('#nav [data-vue="finances"]'); p.wait_for_timeout(200)
            p.click('[data-act="fvue"][data-v="cotisations"]'); p.wait_for_timeout(200)
            p.click('#nav [data-vue="membres"]'); p.wait_for_timeout(200)
            p.click('[data-act="sous"][data-sous="discipline"]'); p.wait_for_timeout(200)
            p.click("#btn-reglages"); p.wait_for_timeout(250)
            print("réglages : programmes présents =", "Programmes de l’Académie" in p.inner_text("#sheet-b"))
        print(mode, w, "vues :", ", ".join(vues))
        ctx.close()
    b.close()
print("\n".join(errs) if errs else "Smoke : aucune erreur, aucun débordement.")
