"""Construit la version hébergée (Cloudflare) de MPA SDE à partir de la version Claude.

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
# Nom de l’application : MPA SDE
js = js.replace("S.D.E. DIGITAL", "MPA SDE")
rep("  /* ════════════════════════ Démarrage", (APP / "m9_heberge.js").read_text() + (APP / "m10_mediatheque.js").read_text() + "\n  /* ════════════════════════ Démarrage")
# Médiathèque : nouvel onglet après l’Arsenal
rep('    { id: "arsenal", ico: "i-shelf", court: "Arsenal", long: "Arsenal", desc: "Médias et bibliothèque" },\n', '    { id: "arsenal", ico: "i-shelf", court: "Arsenal", long: "Arsenal", desc: "Médias et bibliothèque" },\n    { id: "mediatheque", ico: "i-play", court: "Médias", long: "Médiathèque", desc: "Vidéos, audios, photos et documents" },\n')
rep('''    else if (S.etat === "pret" && S.peutEcrire === false) html = `<div class="banner info"><span>Accès en lecture : vous consultez l’agenda, les annonces et l’Arsenal.</span></div>`;''',
    '''    else if (S.etat === "pret" && S.peutEcrire === false) html = moiH().connecte
      ? `<div class="banner info"><span>${moiH().role === "attente" ? `Bienvenue ${esc(moiH().nom || moiH().email)} : votre compte attend qu’un administrateur vous attribue un rôle.` : moiH().role === "soldat" ? `Shalom ${esc(String(moiH().nom || "").split(/\\s+/)[0])} ! Votre espace soldat, l’agenda et les annonces vous attendent.` : "Accès en lecture : agenda, annonces et espace soldat."}</span></div>`
      : `<div class="banner info"><span>Soldat du mouvement ? <button class="link banner-l" type="button" data-act="inscription">Créez votre compte</button> et recevez votre matricule, ou <button class="link banner-l" type="button" data-act="connexion">connectez-vous</button>.</span></div>`;''')
rep('Les données du mouvement s’affichent uniquement dans Claude, pour une personne connectée qui a accès à cette application.', 'Le serveur du mouvement ne répond pas pour le moment. Vérifiez la connexion puis rechargez la page.')
rep('s’afficheront ici dès que l’application sera ouverte dans Claude par une personne connectée qui y a accès.', 's’afficheront ici dès que le serveur du mouvement répondra.')
rep('.includes(o.id) ? accesRegistre() : o.id === "finances"', '.includes(o.id) ? accesRegistre() : o.id === "assistant" ? !!S.sample : o.id === "finances"')
js = js.replace(" et connectez-vous à Claude si c’est demandé", "")
# Éliézer passe par le serveur du mouvement (route /api/ia) : textes adaptés
rep("Éliézer n’est pas autorisé pour cette application. Autorisez l’accès à Claude dans le menu des permissions de l’application.", "Éliézer est réservé aux responsables connectés (contributeurs et administrateurs).")
rep("reconnectez-vous à Claude puis réessayez", "reconnectez-vous avec Google puis réessayez")
rep("L’assistant n’est pas disponible ici. Il fonctionne dans Claude, pour les personnes qui ont autorisé l’application à utiliser Claude.", "Éliézer est réservé aux responsables connectés. Connectez-vous avec Google ; s’il reste indisponible, il n’est pas encore activé sur le serveur du mouvement.")
rep("Disponible dans Claude", "Réservé aux responsables")
# Appellation des leaders : « Serviteur de DIEU » (sans titre d’apôtre)
rep('placeholder="Apôtre Jérémy Octave GLAZAÏ…"', 'placeholder="Jérémy Octave GLAZAÏ, serviteur de DIEU…"')
rep("Le leader du mouvement est l’Apôtre Jérémy Octave GLAZAÏ (« Jérémy l’Élu »)", "Le leader du mouvement est Jérémy Octave GLAZAÏ (« Jérémy l’Élu »), serviteur de DIEU, qui le conduit avec son épouse, Amy Berté GLAZAÏ, servante de DIEU. N’emploie pas pour eux les titres d’apôtre ou de prophétesse")
# Comptes : résumé publié pour chaque compte relié à une fiche, requête de prière directe
rep("    planifierSynchro();\n", "    planifierSynchro(); planifierSynchroComptes();\n")
rep('"Votre requête part par WhatsApp vers la direction, qui la confie aux intercesseurs."', '(moiH().membreId ? "Votre requête rejoint la Chambre Haute, où les intercesseurs prient pour vous. Confidentielle, elle part par WhatsApp vers la direction." : "Votre requête part par WhatsApp vers la direction, qui la confie aux intercesseurs.")')
js = js.replace("<b>Ajouter à l’écran d’accueil</b> (ou <b>Installer l’application</b>)", "<b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>)")

pont = (APP / "pont.js").read_text()
html = src[:debut] + js + src[fin:]
html = html.replace("<title>S.D.E. DIGITAL</title>", "<title>MPA SDE</title>")
tete = f'''<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f1e3d">
<meta name="description" content="Application de gestion du Mouvement Prophético-Apostolique Soldats de l’Éternel.">
<link rel="icon" type="image/png" href="/icone-192.png">
<link rel="apple-touch-icon" href="/icone-192.png">
<link rel="canonical" href="https://app.mouvement-sde.org/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Soldats de l’Éternel">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="https://app.mouvement-sde.org/">
<meta property="og:title" content="MPA SDE · Poste de commandement">
<meta property="og:description" content="Agenda, annonces et espace soldat du Mouvement Prophético-Apostolique Soldats de l’Éternel.">
<meta property="og:image" content="https://app.mouvement-sde.org/og-app.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Logo S.D.E. et verset d’Ézéchiel 37.10">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">
<style>.hdr-compte .hdr-ini{{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e2c26a;color:#1a1405;font-weight:700;font-size:.8rem}} .gsi-w{{min-height:48px;margin:14px 0}} .banner-l{{color:inherit;font-weight:700}} .compte-h{{margin-bottom:16px}} .inp-sm{{padding:4px 8px;min-height:36px;width:auto}} .cnx-onglets{{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--surface-2,rgba(127,127,127,.12));margin:0 0 16px}} .cnx-o{{flex:1;border:0;background:transparent;border-radius:999px;padding:10px 6px;font:inherit;font-weight:700;font-size:.9rem;color:inherit;cursor:pointer;min-height:44px}} .cnx-o.on{{background:#0f1e3d;color:#fff}} .cnx-voir{{margin:-4px 0 6px}} .esp-compte{{margin-bottom:12px}} .esp-ou{{margin:14px 0 8px}} .cpt-fiche{{margin-top:6px;max-width:100%}} .cpt-row .row-main{{min-width:0}} .cpt-code{{margin-bottom:14px}} .med-outils{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}} .med-outils .inp{{flex:1 1 200px;width:auto}} .med-grille{{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))}} @media (max-width:600px){{.med-grille{{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}} .med-t{{font-size:14px}} .med-type{{font-size:10px}}}} .med-carte{{display:flex;flex-direction:column;gap:4px;text-align:left;padding:0 0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;overflow:hidden;min-width:0}} .med-carte:hover{{border-color:var(--line-strong);box-shadow:var(--shadow)}} .med-carte .chip{{align-self:flex-start;margin:4px 12px 0}} .med-vis{{position:relative;display:grid;place-items:center;aspect-ratio:16/10;background:var(--surface-2);overflow:hidden}} .med-vis img{{width:100%;height:100%;object-fit:cover}} .med-ico{{display:grid;place-items:center;gap:4px;color:var(--muted)}} .med-ico svg{{width:38px;height:38px}} .med-ico b{{font-size:12px;letter-spacing:.08em;text-transform:uppercase}} .g-video .med-vis{{background:#1b2f5b}} .g-audio .med-vis{{background:#3a2a5c}} .g-pdf .med-vis{{background:#fbe5e1}} .g-word .med-vis{{background:#e2ebfa}} .g-powerpoint .med-vis{{background:#fbe8dc}} .g-excel .med-vis{{background:#e0f1e6}} .g-video .med-ico,.g-audio .med-ico{{color:#e2c26a}} .g-pdf .med-ico{{color:#b42318}} .g-word .med-ico{{color:#1f5bb5}} .g-powerpoint .med-ico{{color:#c0562a}} .g-excel .med-ico{{color:#23704d}} .med-play{{position:absolute;inset:auto auto 10px 10px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.6);color:#fff}} .med-play svg{{width:18px;height:18px}} .med-type{{position:absolute;top:8px;right:8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:rgba(0,0,0,.6);color:#fff;border-radius:6px;padding:2px 7px}} .med-t{{padding:8px 12px 0;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}} .med-m{{padding:0 12px;font-size:12.5px;color:var(--muted)}} .med-lecteur{{width:100%;max-height:70vh;border-radius:10px;background:#000}} .med-photo{{display:block;max-width:100%;max-height:72vh;margin:0 auto;border-radius:10px}} .med-pdf{{width:100%;height:70vh;border:1px solid var(--line);border-radius:10px;background:#fff}} .med-audio{{display:grid;gap:12px;justify-items:center;padding:12px;background:var(--surface-2);border-radius:12px}} .med-audio img{{max-width:240px;border-radius:10px}} .med-audio audio{{width:100%}} .med-doc{{display:flex;gap:16px;align-items:center;padding:16px;background:var(--surface-2);border-radius:12px}} .med-doc .med-ico{{width:84px;height:84px;border-radius:12px;background:var(--surface)}} .med-desc{{margin:12px 0 4px;white-space:normal}} .med-nav{{justify-content:center;align-items:center;margin-top:10px}} .med-espace{{margin-top:16px}} .meter{{height:8px;border-radius:999px;background:var(--track);overflow:hidden;margin-bottom:6px}} .meter i{{display:block;height:100%;background:var(--meter)}} .med-depot{{display:grid;justify-items:center;gap:6px;text-align:center;padding:22px 16px;border:2px dashed var(--line-strong);border-radius:12px;cursor:pointer;background:var(--surface-2)}} .med-depot svg{{width:30px;height:30px}} .med-choix{{display:grid;gap:8px;margin:12px 0}} .med-ligne{{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px}} .med-ligne.ko{{opacity:.7;border-color:var(--danger)}} .med-ligne-i svg{{width:22px;height:22px;color:var(--muted)}} .med-ligne-c{{display:grid;gap:4px;flex:1;min-width:0}} .med-ligne-c .inp{{width:100%}} .med-ligne-c small{{color:var(--muted);overflow-wrap:anywhere}} .med-barre{{height:6px;border-radius:999px;background:var(--track);overflow:hidden}} .med-barre i{{display:block;height:100%;width:0;background:var(--ok);transition:width .3s}} .ko{{color:var(--danger)}} .vy-tend{{display:inline-block;font-size:10px;margin-left:5px;vertical-align:1px}} .vy-tend.up{{color:var(--ok)}} .vy-tend.down{{color:var(--danger)}} .vr-niveaux{{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:12px 0}} .vr-n{{display:grid;justify-items:center;gap:6px;padding:14px 8px;border:2px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;min-height:84px}} .vr-n:hover{{border-color:var(--line-strong);transform:translateY(-1px)}} .vr-n.on{{border-color:var(--ink);box-shadow:var(--shadow)}} .vr-n .led{{margin:0}} .vr-n b{{font-size:14px}} .vr-n.g.on{{background:var(--ok-soft)}} .vr-n.y.on{{background:var(--warn-soft)}} .vr-n.o.on{{background:#fde7d6}} .vr-n.r.on{{background:var(--danger-soft)}} .vr-courbe{{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}} .vr-courbe span{{display:grid;justify-items:center;gap:2px}} .vr-courbe small{{font-size:11px;color:var(--muted)}} .vw-resume{{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0 0 12px}} @media (max-width:640px){{.vw-resume{{grid-template-columns:repeat(3,minmax(0,1fr))}}}} .vw-c{{display:grid;justify-items:center;gap:2px;padding:10px 6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-align:center}} .vw-c b{{font-size:22px;line-height:1.1}} .vw-c span{{font-size:12px;color:var(--muted)}} .vw-c .led{{margin:0}} .vw-dims{{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 12px}} .vw-dims .chip-btn b{{margin-left:4px}} .vw-dims .vw-a b{{color:var(--danger)}} .vw-q{{flex:1 1 180px;width:auto;min-width:0}} .vw-on{{background:var(--warn-soft)}} .vw-cell{{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:36px;padding:4px;border:1px solid transparent;border-radius:8px;background:none;cursor:pointer}} .vw-cell:hover{{border-color:var(--line-strong);background:var(--surface-2)}} .vw-cell .led{{margin:0}} .dv-row{{gap:10px;align-items:center}} .dv-row .inp{{flex:1}}</style>
<script>{pont}</script>
<script>if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {{}}));</script>
'''
i = html.index("</title>") + len("</title>")
html = html[:i] + "\n" + tete + html[i:]
# Squelette de document : Claude l'ajoute à la publication, ici il faut l'écrire (encodage UTF-8 indispensable pour les accents)
html = '<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + html
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
    "name": "MPA SDE", "short_name": "MPA SDE", "lang": "fr", "start_url": "/", "scope": "/", "display": "standalone",
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
