# Génère src/carte_data.js : contours des pays (projection Natural Earth) + noms français.
import json, math, sys
from babel import Locale
iso = {c["alpha_3"]: c["alpha_2"] for c in json.load(open("/usr/share/iso-codes/json/iso_3166-1.json"))["3166-1"]}
fr = Locale("fr").territories
gj = json.load(open("/home/claude/vendor/geo/world.geo.json/countries.geo.json"))
W = 1000.0
XM = 0.8707 * math.pi
S = W / (2 * XM)
def proj(lon, lat):
    l, p = math.radians(lon), math.radians(max(-89.9, min(89.9, lat)))
    p2 = p * p; p4 = p2 * p2
    x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    return (x + XM) * S, -y * S
LAT_MIN, LAT_MAX = -58, 84
y0 = proj(0, LAT_MAX)[1]; y1 = proj(0, LAT_MIN)[1]
H = y1 - y0
def ring(coords):
    pts = []
    last = None
    for lon, lat in coords:
        if lat < LAT_MIN - 2: continue
        x, y = proj(lon, lat); y -= y0
        q = (round(x, 1), round(y, 1))
        if last and abs(q[0] - last[0]) < 0.6 and abs(q[1] - last[1]) < 0.6: continue
        pts.append(q); last = q
    if len(pts) < 3: return ""
    s = "M" + " L".join(f"{a:g} {b:g}" for a, b in pts) + "Z"
    return s
out = []
for f in gj["features"]:
    a3 = f["id"]
    if a3 in ("ATA", "ATF"): continue
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    d = "".join(ring(p[0]) for p in polys)
    if not d: continue
    # point d'ancrage : centre de gravité du plus grand polygone (projeté)
    best = None
    for p in polys:
        pts = [proj(lo, la) for lo, la in p[0]]
        a = cx = cy = 0.0
        for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
            k = x1 * y2 - x2 * y1; a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k
        if a and (best is None or abs(a) > best[0]): best = (abs(a), cx / (3 * a), cy / (3 * a) - y0)
    a2 = iso.get(a3, "")
    nom = fr.get(a2, f["properties"]["name"]) if a2 else f["properties"]["name"]
    if a3 == "CIV": nom = "Côte d’Ivoire"
    out.append([a3, nom.replace("'", "’"), d, round(best[1], 1), round(best[2], 1)])
js = "  /* Contours des pays : world.geo.json (domaine public), projection Natural Earth. */\n  const CARTE_W = %d, CARTE_H = %g, CARTE_Y0 = %r, CARTE_XM = %r, CARTE_S = %r;\n  const PAYS_GEO = %s;\n" % (W, round(H, 1), y0, XM, S, json.dumps(out, ensure_ascii=False, separators=(",", ":")))
open("/home/claude/sde/src/carte_data.js", "w").write(js)
print(len(out), "pays,", len(js.encode()), "octets, H=", H)
