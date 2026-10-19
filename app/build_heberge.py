"""Construit la version hébergée (Cloudflare) de S.D.E. DIGITAL à partir de la version Claude.

Usage : python3 app/build_heberge.py <chemin de sde-gestion.html>
Produit public/index.html, public/sw.js, public/manifest.webmanifest et les icônes.
"""
import base64, io, json, re, sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
APP = RACINE / "app"
PUB = RACINE / "public"
URL_APP = "https://app.mouvement-sde.org"
ANCIEN = "https://claude.ai/artifact/GoENFgrqfSdyNhanWp5iaR"

src = Path(sys.argv[1] if len(sys.argv) > 1 else RACINE / "source" / "version-claude.html").read_text()
debut = src.rindex("<script>") + len("<script>")
fin = src.rindex("</script>")
js = src[debut:fin]

def rep(a, b, n=1):
    global js
    assert js.count(a) == n, (a[:80], js.count(a))
    js = js.replace(a, b)

js = js.replace(ANCIEN, URL_APP)
rep("  /* ════════════════════════ Démarrage", (APP / "m9_heberge.js").read_text() + "\n  /* ════════════════════════ Démarrage")
rep('''    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda, les annonces et l’Arsenal.</span></div>`;''',
    '''    else if (S.etat === "pret" && S.peutEcrire === false) html = moiH().connecte
      ? `<div class="banner info"><span>${moiH().role === "attente" ? `Bienvenue ${esc(moiH().nom || moiH().email)} : votre compte attend qu’un administrateur vous attribue un rôle.` : "Accès en lecture : agenda, annonces et espace soldat."}</span></div>`
      : `<div class="banner info"><span>Agenda, annonces et espace soldat. Responsable du mouvement ? <button class="link banner-l" type="button" data-act="connexion">Se connecter avec Google</button></span></div>`;''')
rep('Les données du mouvement s’affichent uniquement dans Claude, pour une personne connectée qui a accès à cette application.', 'Le serveur du mouvement ne répond pas pour le moment. Vérifiez la connexion puis rechargez la page.')
rep('s’afficheront ici dès que l’application sera ouverte dans Claude par une personne connectée qui y a accès.', 's’afficheront ici dès que le serveur du mouvement répondra.')
rep('.includes(o.id) ? accesRegistre() : o.id === "finances"', '.includes(o.id) ? accesRegistre() : o.id === "assistant" ? !!S.sample : o.id === "finances"')
js = js.replace(" et connectez-vous à Claude si c’est demandé", "")
js = js.replace("<b>Ajouter à l’écran d’accueil</b> (ou <b>Installer l’application</b>)", "<b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>)")

pont = (APP / "pont.js").read_text()
html = src[:debut] + js + src[fin:]
tete = f'''<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f1e3d">
<meta name="description" content="Application de gestion du Mouvement Prophético-Apostolique Soldats de l’Éternel.">
<link rel="icon" type="image/png" href="/icone-192.png">
<link rel="apple-touch-icon" href="/icone-192.png">
<style>.hdr-compte .hdr-ini{{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e2c26a;color:#1a1405;font-weight:700;font-size:.8rem}} .gsi-w{{min-height:48px;margin:14px 0}} .banner-l{{color:inherit;font-weight:700}} .compte-h{{margin-bottom:16px}} .inp-sm{{padding:4px 8px;min-height:36px;width:auto}}</style>
<script>{pont}</script>
<script>if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {{}}));</script>
'''
i = html.index("</title>") + len("</title>")
html = html[:i] + "\n" + tete + html[i:]
PUB.mkdir(exist_ok=True)
(PUB / "index.html").write_text(html)

# Icônes à partir du logo intégré
m = re.search(r'url\("data:image/png;base64,([A-Za-z0-9+/=]+)"\)', html)
from PIL import Image
logo = Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert("RGBA")
for t in (192, 512):
    fond = Image.new("RGBA", (t, t), (15, 30, 61, 255))
    l = logo.resize((int(t * 0.78), int(t * 0.78)), Image.LANCZOS)
    fond.alpha_composite(l, ((t - l.width) // 2, (t - l.height) // 2))
    fond.convert("RGB").save(PUB / f"icone-{t}.png", optimize=True)
(PUB / "manifest.webmanifest").write_text(json.dumps({
    "name": "S.D.E. DIGITAL", "short_name": "S.D.E.", "lang": "fr", "start_url": "/", "scope": "/", "display": "standalone",
    "background_color": "#0f1e3d", "theme_color": "#0f1e3d",
    "description": "Gestion du Mouvement Prophético-Apostolique Soldats de l’Éternel",
    "icons": [{"src": "/icone-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/icone-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "/icone-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
}, ensure_ascii=False, indent=1))
version = base64.b32encode(__import__("hashlib").sha256(html.encode()).digest()[:5]).decode().lower()
(PUB / "sw.js").write_text(f'''/* Service worker : garde l'application sur l'appareil pour l'ouvrir même sans réseau. */
const CACHE = "sde-{version}";
const FICHIERS = ["/", "/manifest.webmanifest", "/icone-192.png", "/icone-512.png"];
self.addEventListener("install", (e) => {{ e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", (e) => {{ e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", (e) => {{
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/_blob/")) return;
  if (e.request.mode === "navigate") {{
    e.respondWith(fetch(e.request).then((r) => {{ const c = r.clone(); caches.open(CACHE).then((k) => k.put("/", c)); return r; }}).catch(() => caches.match("/")));
    return;
  }}
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
}});
''')
print("ok", len(html), version)
