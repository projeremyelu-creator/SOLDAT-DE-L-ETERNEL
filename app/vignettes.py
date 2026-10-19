"""Vignettes de partage (WhatsApp, Facebook, X…) et logo du site vitrine.

Usage : python3 app/vignettes.py   (après app/build_heberge.py, qui extrait le logo)
Produit public/og-sde.png, public/og-app.png et public/vitrine/logo.png.
"""
import base64, io, math, random, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = Path(__file__).resolve().parent.parent
POL = RACINE / "app" / "polices"
PUB = RACINE / "public"
W, H = 1200, 630
NUIT, NUIT2 = (15, 30, 61), (6, 11, 26)
OR, OR_CLAIR, BLANC, GRIS = (226, 194, 106), (244, 222, 160), (246, 244, 238), (186, 196, 218)

html = (PUB / "index.html").read_text()
m = re.search(r'url\("data:image/png;base64,([A-Za-z0-9+/=]+)"\)', html)
LOGO = Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert("RGBA")
(PUB / "vitrine").mkdir(exist_ok=True)
l = LOGO.copy(); l.thumbnail((512, 512), Image.LANCZOS); l.save(PUB / "vitrine" / "logo.png", optimize=True)

def police(nom, t): return ImageFont.truetype(str(POL / nom), t)

def fond():
    img = Image.new("RGB", (W, H), NUIT2)
    px = img.load()
    cx, cy = W * 0.28, H * 0.45
    for y in range(H):
        for x in range(W):
            d = min(1, math.hypot((x - cx) / W, (y - cy) / H) * 1.6)
            px[x, y] = tuple(int(NUIT[i] * (1 - d) + NUIT2[i] * d) for i in range(3))
    # lueur dorée derrière le logo
    halo = Image.new("L", (W, H), 0)
    ImageDraw.Draw(halo).ellipse((cx - 250, cy - 250, cx + 250, cy + 250), fill=70)
    halo = halo.filter(ImageFilter.GaussianBlur(90))
    img = Image.composite(Image.new("RGB", (W, H), (120, 92, 30)), img, halo)
    # braises (souffle d'Ézéchiel 37)
    rnd = random.Random(37)
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    for _ in range(170):
        x, y, r = rnd.uniform(0, W), rnd.uniform(0, H), rnd.choice([1, 1, 1.5, 2, 2.5, 3.5])
        a = rnd.randint(40, 190)
        d.ellipse((x - r, y - r, x + r, y + r), fill=OR_CLAIR + (a,))
    flou = calque.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img.convert("RGBA"), flou)
    # bande dorée basse
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 8, W, H), fill=OR)
    return img

def texte_large(d, xy, txt, f, fill, largeur):
    """Écrit en réduisant la taille si le texte dépasse la largeur disponible."""
    t = f.size
    while d.textlength(txt, font=f) > largeur and t > 20:
        t -= 2; f = police(Path(f.path).name, t)
    d.text(xy, txt, font=f, fill=fill)
    return f

def lignes(d, txt, f, largeur):
    mots, out, cur = txt.split(), [], ""
    for w in mots:
        essai = (cur + " " + w).strip()
        if d.textlength(essai, font=f) <= largeur: cur = essai
        else: out.append(cur); cur = w
    out.append(cur)
    return out

def vignette(nom, sur_titre, titre, sous_titre, verset, ref, pied):
    img = fond()
    lg = LOGO.copy(); lg.thumbnail((330, 330), Image.LANCZOS)
    img.alpha_composite(lg, (70, (H - lg.height) // 2 - 10))
    d = ImageDraw.Draw(img)
    x, larg = 450, W - 450 - 60
    y = 118
    texte_large(d, (x, y), sur_titre, police("SairaCondensed-SemiBold.ttf", 30), OR, larg)
    y += 46
    f = texte_large(d, (x, y), titre, police("SairaCondensed-Bold.ttf", 92), BLANC, larg)
    y += f.size + 6
    if sous_titre:
        texte_large(d, (x, y), sous_titre, police("SairaCondensed-SemiBold.ttf", 40), OR_CLAIR, larg)
        y += 58
    d.line((x, y + 8, x + 90, y + 8), fill=OR, width=3)
    y += 30
    fv = police("AtkinsonHyperlegible-Italic.ttf", 31)
    for li in lignes(d, f"« {verset} »", fv, larg):
        d.text((x, y), li, font=fv, fill=GRIS); y += 42
    d.text((x, y + 4), ref, font=police("AtkinsonHyperlegible-Bold.ttf", 25), fill=OR)
    fp = police("SairaCondensed-SemiBold.ttf", 30)
    d.text((W - 60 - d.textlength(pied, font=fp), H - 62), pied, font=fp, fill=OR_CLAIR)
    img.convert("RGB").save(PUB / nom, "PNG", optimize=True)
    print("ok", nom)

vignette("og-sde.png", "MOUVEMENT PROPHÉTICO-APOSTOLIQUE", "SOLDATS DE L’ÉTERNEL", "Réveiller · Restaurer · Former · Équiper · Envoyer",
         "Esprit, viens des quatre vents, souffle sur ces morts, et qu’ils revivent !", "Ézéchiel 37.9", "mouvement-sde.org")
vignette("og-app.png", "SOLDATS DE L’ÉTERNEL", "S.D.E. DIGITAL", "Poste de commandement du mouvement",
         "Et l’esprit entra en eux, et ils reprirent vie, et ils se tinrent sur leurs pieds : c’était une armée nombreuse, très nombreuse.", "Ézéchiel 37.10", "app.mouvement-sde.org")
