"""Illustrations vectorielles (SVG) du site vitrine : pôles et programmes, aux couleurs du mouvement.

Usage : python3 app/illustrations.py   → public/vitrine/illus/*.svg
Chaque image est légère (quelques Ko), nette sur tous les écrans, avec une animation discrète.
"""
from pathlib import Path
import math, random

OUT = Path(__file__).resolve().parent.parent / "public" / "vitrine" / "illus"
OUT.mkdir(parents=True, exist_ok=True)
OR, OR2, NUIT, BRAISE, CREME = "#e2c26a", "#f4dea0", "#0f1e3d", "#e4692c", "#fff6e0"


def svg(nom, w, h, fond, corps, graine=1, braises=24):
    rnd = random.Random(graine)
    etincelles = "".join(
        f'<circle cx="{rnd.uniform(0, w):.0f}" cy="{rnd.uniform(h * .2, h):.0f}" r="{rnd.choice([1.5, 2, 2.5, 3.5])}" fill="{OR2}" opacity="0">'
        f'<animate attributeName="opacity" values="0;{rnd.uniform(.4, .9):.2f};0" dur="{rnd.uniform(3, 6):.1f}s" begin="{rnd.uniform(0, 4):.1f}s" repeatCount="indefinite"/>'
        f'<animate attributeName="cy" from="{rnd.uniform(h * .5, h):.0f}" to="{rnd.uniform(0, h * .4):.0f}" dur="{rnd.uniform(4, 8):.1f}s" begin="{rnd.uniform(0, 4):.1f}s" repeatCount="indefinite"/></circle>'
        for _ in range(braises))
    (OUT / f"{nom}.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" preserveAspectRatio="xMidYMid slice">'
        f'<defs>{fond}<radialGradient id="halo"><stop offset="0" stop-color="{OR}" stop-opacity=".35"/><stop offset="1" stop-color="{OR}" stop-opacity="0"/></radialGradient>'
        f'<linearGradient id="or" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{OR2}"/><stop offset="1" stop-color="#b8901f"/></linearGradient>'
        f'<linearGradient id="feu" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8401c"/><stop offset=".55" stop-color="{BRAISE}"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs>'
        f'<rect width="{w}" height="{h}" fill="url(#bg)"/>{corps}{etincelles}</svg>')


def fond(c1, c2, angle=0):
    return f'<linearGradient id="bg" gradientTransform="rotate({angle} .5 .5)"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'


def flamme(x, y, s, anim=True):
    a = (f'<animateTransform attributeName="transform" type="scale" values="1 1;1.04 .96;.97 1.05;1 1" dur="2.4s" repeatCount="indefinite" additive="sum"/>' if anim else "")
    return (f'<g transform="translate({x} {y}) scale({s})"><g>{a}'
            f'<path d="M0 -120 C 40 -70 70 -40 62 10 C 56 52 28 78 0 80 C -28 78 -56 52 -62 10 C -68 -30 -30 -50 -18 -90 C -10 -60 4 -52 10 -40 C 18 -70 6 -96 0 -120 Z" fill="url(#feu)"/>'
            f'<path d="M0 -40 C 20 -14 32 6 28 30 C 24 52 12 64 0 66 C -12 64 -26 52 -28 30 C -30 10 -14 -6 -8 -24 C -2 -10 6 -8 8 -2 C 12 -18 6 -30 0 -40 Z" fill="#ffe7a8" opacity=".9"/></g></g>')


def personnes(x, y, n, ecart, couleur, s=1.0):
    out = []
    for i in range(n):
        px = x + i * ecart
        h = 1 + (0.12 if i % 2 else 0)
        out.append(f'<g transform="translate({px} {y}) scale({s * h})"><circle cx="0" cy="-58" r="16" fill="{couleur}"/>'
                   f'<path d="M-26 0 C -26 -30 -14 -40 0 -40 C 14 -40 26 -30 26 0 Z" fill="{couleur}"/></g>')
    return "".join(out)


# ── Pôle 1 : Réveil, évangélisation et missions — le feu qui part vers les nations
arcs = "".join(f'<ellipse cx="600" cy="420" rx="{r}" ry="{r * .32:.0f}" fill="none" stroke="{OR}" stroke-opacity="{.5 - i * .1:.2f}" stroke-width="2" stroke-dasharray="6 10"><animate attributeName="stroke-dashoffset" from="0" to="-160" dur="{8 + i * 3}s" repeatCount="indefinite"/></ellipse>' for i, r in enumerate([260, 360, 460]))
svg("pole-1", 1200, 600, fond("#120a24", "#5a1a0b", 30),
    f'<circle cx="600" cy="330" r="300" fill="url(#halo)"/>{arcs}'
    f'<circle cx="600" cy="430" r="150" fill="#1b2f5b" stroke="{OR}" stroke-width="3"/>'
    + "".join(f'<path d="M{450 + i * 30} 430 Q 600 {300 + i * 8} {750 - i * 30} 430" fill="none" stroke="{OR}" stroke-opacity=".35" stroke-width="2"/>' for i in range(5))
    + f'<path d="M455 430 H745" stroke="{OR}" stroke-opacity=".35" stroke-width="2"/>'
    + flamme(600, 300, 1.25)
    + personnes(330, 560, 4, 52, "#0b0614", 0.9) + personnes(720, 560, 4, 52, "#0b0614", 0.9), graine=11)

# ── Pôle 2 : Impact social et humanitaire — des mains qui portent un cœur
coeur = 'M0 40 C -70 -10 -70 -80 -20 -80 C 0 -80 0 -60 0 -55 C 0 -60 0 -80 20 -80 C 70 -80 70 -10 0 40 Z'
svg("pole-2", 1200, 600, fond("#3a1208", "#b8401c", 20),
    f'<circle cx="600" cy="280" r="280" fill="url(#halo)"/>'
    f'<g transform="translate(600 250) scale(1.9)"><path d="{coeur}" fill="url(#or)"><animateTransform attributeName="transform" type="scale" values="1;1.06;1;1.04;1" dur="1.8s" repeatCount="indefinite"/></path></g>'
    f'<path d="M300 520 C 360 420 470 380 560 400 L 600 410 L 560 450 C 520 470 470 470 430 520 Z" fill="{CREME}" opacity=".92"/>'
    f'<path d="M900 520 C 840 420 730 380 640 400 L 600 410 L 640 450 C 680 470 730 470 770 520 Z" fill="{CREME}" opacity=".92"/>'
    + personnes(140, 560, 3, 60, "#2a0d07", 1) + personnes(940, 560, 3, 60, "#2a0d07", 1), graine=22)

# ── Pôle 3 : Logistique et organisation — engrenages, matériel, sonorisation
def engrenage(x, y, r, dents, couleur, sens):
    pts = []
    for i in range(dents * 2):
        a = math.pi * i / dents
        rr = r if i % 2 == 0 else r * .82
        pts.append(f"{x + rr * math.cos(a):.1f},{y + rr * math.sin(a):.1f}")
    return (f'<g><polygon points="{" ".join(pts)}" fill="{couleur}"/><circle cx="{x}" cy="{y}" r="{r * .38:.0f}" fill="#0b1630"/>'
            f'<animateTransform attributeName="transform" type="rotate" from="0 {x} {y}" to="{360 * sens} {x} {y}" dur="14s" repeatCount="indefinite"/></g>')
svg("pole-3", 1200, 600, fond("#0b1630", "#22396f", 10),
    f'<circle cx="600" cy="300" r="300" fill="url(#halo)"/>'
    + engrenage(470, 300, 120, 12, OR, 1) + engrenage(660, 220, 80, 9, "#b8901f", -1) + engrenage(690, 400, 60, 8, OR2, -1)
    + f'<g transform="translate(860 230)"><rect x="0" y="0" width="120" height="200" rx="14" fill="#1b2f5b" stroke="{OR}" stroke-width="3"/>'
      f'<circle cx="60" cy="60" r="28" fill="none" stroke="{OR}" stroke-width="5"/><circle cx="60" cy="140" r="40" fill="none" stroke="{OR}" stroke-width="5"/><circle cx="60" cy="140" r="12" fill="{OR}"/></g>'
    + "".join(f'<path d="M{1000 + i * 26} {260 + i * 4} q 22 70 0 140" fill="none" stroke="{OR2}" stroke-width="3" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;.8;0" dur="1.8s" begin="{i * .4}s" repeatCount="indefinite"/></path>' for i in range(3))
    + "".join(f'<rect x="{160 + i * 70}" y="{420 - (i % 2) * 70}" width="64" height="64" rx="6" fill="{["#b8901f", "#8a6a12", OR][i % 3]}" opacity=".9"/>' for i in range(3))
    + f'<rect x="160" y="484" width="220" height="10" rx="5" fill="{OR}" opacity=".6"/>', graine=33, braises=14)

# ── Pôle 4 : Communication, médias et digital — téléphone, lecture, ondes
ondes = "".join(f'<circle cx="600" cy="300" r="{120 + i * 70}" fill="none" stroke="{OR}" stroke-width="2.5" opacity="0"><animate attributeName="r" from="140" to="520" dur="4s" begin="{i * 1.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="4s" begin="{i * 1.3}s" repeatCount="indefinite"/></circle>' for i in range(3))
svg("pole-4", 1200, 600, fond("#140b2e", "#1b2f5b", 25),
    f'<circle cx="600" cy="300" r="300" fill="url(#halo)"/>{ondes}'
    f'<rect x="500" y="110" width="200" height="380" rx="30" fill="#0b1630" stroke="{OR}" stroke-width="4"/>'
    f'<rect x="518" y="150" width="164" height="290" rx="10" fill="#22396f"/>'
    f'<circle cx="600" cy="295" r="46" fill="url(#or)"/><path d="M588 272 L 622 295 L 588 318 Z" fill="#0b1630"/>'
    f'<rect x="540" y="400" width="120" height="8" rx="4" fill="{OR}" opacity=".6"/><rect x="540" y="400" width="60" height="8" rx="4" fill="{OR}"><animate attributeName="width" values="10;120;10" dur="6s" repeatCount="indefinite"/></rect>'
    f'<g transform="translate(250 250) rotate(-12)"><path d="M0 20 L 90 -30 L 90 110 L 0 60 Z" fill="url(#or)"/><rect x="-36" y="18" width="40" height="44" rx="6" fill="{OR2}"/></g>'
    f'<g transform="translate(860 200)"><rect width="150" height="100" rx="16" fill="{CREME}" opacity=".95"/><path d="M30 100 L 20 130 L 60 100 Z" fill="{CREME}" opacity=".95"/><rect x="24" y="28" width="100" height="10" rx="5" fill="#b8901f"/><rect x="24" y="52" width="70" height="10" rx="5" fill="#b8901f" opacity=".6"/></g>', graine=44)

# ── Pôle 5 : Formation et développement intégral — livre ouvert, lumière, toque
rayons = "".join(f'<path d="M600 300 L {600 + 520 * math.cos(math.radians(a)):.0f} {300 - 520 * math.sin(math.radians(a)):.0f}" stroke="{OR}" stroke-opacity=".18" stroke-width="16"/>' for a in range(20, 170, 15))
svg("pole-5", 1200, 600, fond("#0b2a22", "#0f1e3d", 15),
    f'<circle cx="600" cy="300" r="320" fill="url(#halo)"/><g>{rayons}<animateTransform attributeName="transform" type="rotate" values="-3 600 300;3 600 300;-3 600 300" dur="10s" repeatCount="indefinite"/></g>'
    f'<path d="M600 360 C 520 320 420 320 340 350 L 340 480 C 420 450 520 450 600 490 Z" fill="{CREME}"/>'
    f'<path d="M600 360 C 680 320 780 320 860 350 L 860 480 C 780 450 680 450 600 490 Z" fill="#f2e6c4"/>'
    + "".join(f'<path d="M{380 + 0} {380 + i * 22} C 450 {365 + i * 22} 520 {368 + i * 22} 580 {390 + i * 22}" stroke="#b8901f" stroke-opacity=".5" stroke-width="3" fill="none"/>' for i in range(4))
    + "".join(f'<path d="M620 {390 + i * 22} C 680 {368 + i * 22} 750 {365 + i * 22} 820 {380 + i * 22}" stroke="#b8901f" stroke-opacity=".5" stroke-width="3" fill="none"/>' for i in range(4))
    + f'<g transform="translate(600 210)"><path d="M-120 0 L 0 -50 L 120 0 L 0 50 Z" fill="url(#or)"/><path d="M-70 22 L -70 70 C -40 92 40 92 70 70 L 70 22 L 0 50 Z" fill="#b8901f"/>'
      f'<path d="M110 4 L 110 70" stroke="{OR2}" stroke-width="4"/><circle cx="110" cy="76" r="8" fill="{OR2}"/>'
      f'<animateTransform attributeName="transform" type="translate" values="600 210;600 200;600 210" dur="4s" repeatCount="indefinite"/></g>', graine=55)

# ── Programmes (bandeaux plus petits)
def bandeau(nom, c1, c2, motif, graine):
    svg(nom, 600, 260, fond(c1, c2, 20), f'<circle cx="300" cy="140" r="170" fill="url(#halo)"/>{motif}', graine=graine, braises=10)

lune = f'<circle cx="300" cy="120" r="60" fill="url(#or)"/><circle cx="326" cy="104" r="56" fill="#0f1e3d"/>'
chemin = "".join(f'<circle cx="{80 + i * 55}" cy="{215 - abs(i - 4) * 6}" r="5" fill="{OR}" opacity="{.3 + i * .07:.2f}"/>' for i in range(9))
bandeau("prog-traversee", "#0f1e3d", "#22396f", lune + chemin, 61)
bandeau("prog-infire", "#2a0d07", "#b8401c", flamme(300, 160, .9), 62)
bouclier = f'<path d="M300 40 L 380 70 L 380 140 C 380 190 340 220 300 235 C 260 220 220 190 220 140 L 220 70 Z" fill="url(#or)"/><path d="M300 80 L 300 200 M 250 120 L 350 120" stroke="#0f1e3d" stroke-width="12" stroke-linecap="round"/>'
bandeau("prog-academy", "#0b2a22", "#0f1e3d", bouclier, 63)
bulles = f'<g><rect x="170" y="60" width="170" height="90" rx="20" fill="{CREME}"/><path d="M200 150 L 190 180 L 230 150 Z" fill="{CREME}"/><rect x="195" y="88" width="110" height="10" rx="5" fill="#b8901f"/><rect x="195" y="112" width="70" height="10" rx="5" fill="#b8901f" opacity=".6"/></g><g><rect x="280" y="120" width="160" height="80" rx="20" fill="url(#or)"/><path d="M410 200 L 420 228 L 384 200 Z" fill="#b8901f"/><circle cx="330" cy="160" r="7" fill="#0f1e3d"/><circle cx="360" cy="160" r="7" fill="#0f1e3d"/><circle cx="390" cy="160" r="7" fill="#0f1e3d"/></g>'
bandeau("prog-holytalk", "#140b2e", "#3a2a5c", bulles, 64)
globe = f'<circle cx="300" cy="130" r="80" fill="#1b2f5b" stroke="{OR}" stroke-width="4"/><ellipse cx="300" cy="130" rx="36" ry="80" fill="none" stroke="{OR}" stroke-width="3"/><path d="M220 130 H380 M235 90 H365 M235 170 H365" stroke="{OR}" stroke-width="3"/>' + personnes(170, 245, 2, 40, "#0b0614", .7) + personnes(400, 245, 2, 40, "#0b0614", .7)
bandeau("prog-missions", "#3a1208", "#8b3a3a", globe, 65)
tasse = f'<path d="M230 110 H350 V170 C 350 200 330 215 290 215 C 250 215 230 200 230 170 Z" fill="url(#or)"/><path d="M350 125 C 395 125 395 180 350 180" fill="none" stroke="{OR}" stroke-width="10"/><rect x="190" y="220" width="220" height="10" rx="5" fill="{OR}" opacity=".6"/>' + "".join(f'<path d="M{262 + i * 28} 95 c -12 -18 12 -28 0 -48" fill="none" stroke="{OR2}" stroke-width="5" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;.8;0" dur="3s" begin="{i * .7}s" repeatCount="indefinite"/></path>' for i in range(3))
bandeau("prog-brunch", "#2a1a08", "#6b3d10", tasse, 66)
print("ok", sorted(p.name for p in OUT.iterdir()))
