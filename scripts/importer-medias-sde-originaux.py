#!/usr/bin/env python3
"""Prépare pour Cloudflare les dix fichiers envoyés dans la racine GitHub.

L'association image -> rubrique repose sur une signature perceptuelle de chacune
des sept images fournies au cours de la conversation (et non sur son nom WhatsApp).
Les durées validées permettent de reconnaître les trois vidéos, indépendamment de
leurs noms d'origine. En cas d'écart, l'étape échoue AVANT toute publication.
"""
from __future__ import annotations

from itertools import permutations
from pathlib import Path
import base64
import math
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_SRC = [
    "IMG-20261002-WA0024(1).jpg",
    "IMG-20261104-WA0118.jpg",
    "IMG-20261104-WA0121.jpg",
    "IMG-20261104-WA0122.jpg",
    "IMG_20261031_100328_3.jpg",
    "IMG_20261031_122737_350.jpg",
    "file_0000000034d881f489f1574d2a5bc2a1.png",
]
VIDEOS_SRC = [
    "VID-20260924-WA0061.mp4",
    "WA_1793824660474.mp4",
    "gemini_generated_video_56be848c.mp4",
]
# Signature dHash 9x8 (ImageMagick), moyenne RGB de la moitié gauche
# des photos d'origine reçues. Utiliser les deux informations pour séparer
# les maquettes de polos au cadrage identique et aux couleurs différentes.
PHOTOS = {
    "reunion-priere-01": (0x2d8d70b48c9cbeae, (141,129,98)),
    "reunion-priere-02": (0x2f2fcacccdc8cacb, (117,102,73)),
    "reunion-fraternelle": (0x0c2869621e9fd6f6, (124,112,82)),
    "tenues-sde-portees": (0xb4f4889244341c9e, (161,117,69)),
    "action-humanitaire": (0xca640c8c55448918, (138,114,109)),
    "polos-sde-vert-blanc": (0x351343672367675a, (62,54,24)),
    "polos-sde-or-blanc": (0x3533536763676753, (128,87,17)),
}
VIDEOS = {
    "livre-pouvoir-femme": 10.005,
    "archives-rassemblement": 3.5,
    "identite-sde-expansion": 32.74,
}

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def image_signatures(file: Path, converter: str):
    # Ne conserver aucun texte EXIF ni géolocalisation dans les médias exportés.
    gray = run([converter, str(file)+"[0]", "-auto-orient", "-colorspace",
               "Gray", "-resize", "9x8!", "-depth", "8", "gray:-"],
               stdout=subprocess.PIPE).stdout
    if len(gray) != 72:
        raise ValueError("Vignette dHash invalide : " + file.name)
    bits = sum((gray[y*9+x] > gray[y*9+x+1]) << (63-y*8-x)
               for y in range(8) for x in range(8))
    rgb = run([converter, str(file)+"[0]", "-auto-orient", "-crop",
               "50%x100%+0+0", "+repage", "-resize", "1x1!",
               "-depth", "8", "RGB:-"], stdout=subprocess.PIPE).stdout
    if len(rgb) != 3:
        raise ValueError("Moyenne RGB invalide : " + file.name)
    return bits, tuple(rgb)

def score(signature, reference):
    a, rgb_a = signature
    b, rgb_b = reference
    distance = (a^b).bit_count()
    color = math.sqrt(sum((x-y)**2 for x,y in zip(rgb_a, rgb_b)))
    return distance + color / 25, distance, color

def match_photos(converter):
    files = [ROOT/name for name in PHOTOS_SRC]
    if not all(f.is_file() for f in files):
        raise ValueError("Les sept photos originales ne sont pas toutes dans GitHub.")
    signatures = [image_signatures(f,converter) for f in files]
    labels=list(PHOTOS)
    costs=[[score(signatures[i],PHOTOS[label]) for label in labels]
           for i in range(len(files))]
    choices = min(permutations(range(7)), key=lambda combo:
                  sum(costs[i][j][0] for i,j in enumerate(combo)))
    assignment={}
    douteuses=[]
    for i,j in enumerate(choices):
        value,distance,color=costs[i][j]
        label=labels[j]
        print(f"IDENTIFICATION_PHOTO {files[i].name} -> {label} "
              f"dHash={distance}/64 couleur={color:.1f}",flush=True)
        if distance > 19 or color > 105:
            douteuses.append(files[i])
        assignment[label]=files[i]
    if douteuses:
        for file in douteuses:
            thumb=run([converter,str(file)+"[0]","-auto-orient","-thumbnail",
                       "240x240>","-strip","-quality","55","JPEG:-"],
                      stdout=subprocess.PIPE).stdout
            print("SDE_VIGNETTE_DIAGNOSTIC",file.name,
                  base64.b64encode(thumb).decode("ascii"),flush=True)
        raise ValueError("Photos non reconnues avec fiabilité: "+
                         ", ".join(f.name for f in douteuses))
    return assignment

def match_videos():
    files=[ROOT/name for name in VIDEOS_SRC]
    if not all(f.is_file() for f in files):
        raise ValueError("Les trois vidéos originales ne sont pas toutes dans GitHub.")
    durations=[]
    for f in files:
        p=run(["ffprobe","-v","error","-show_entries","format=duration",
              "-of","default=noprint_wrappers=1:nokey=1",str(f)],
              stdout=subprocess.PIPE,text=True)
        durations.append(float(p.stdout.strip()))
    labels=list(VIDEOS)
    choices=min(permutations(range(3)),key=lambda perm:
                sum(abs(durations[i]-VIDEOS[labels[j]]) for i,j in enumerate(perm)))
    assignment={}
    for i,j in enumerate(choices):
        expected=VIDEOS[labels[j]]
        print(f"IDENTIFICATION_VIDEO {files[i].name} -> {labels[j]} "
              f"durée={durations[i]:.2f}s attendu={expected:.2f}s",flush=True)
        if abs(durations[i]-expected)>1.1:
            raise ValueError("Vidéo non reconnue par sa durée : "+files[i].name)
        assignment[labels[j]]=files[i]
    return assignment

def convert_photos(assignment,converter):
    folder=ROOT/"public"/"vitrine"/"media"/"archives-2027"
    folder.mkdir(parents=True,exist_ok=True)
    for name,src in assignment.items():
        for small in (False,True):
            dest=folder/(name+("-mini" if small else "")+".webp")
            limit="640x640>" if small else "1600x1600>"
            quality="70" if small else "79"
            run([converter,str(src)+"[0]","-auto-orient","-strip",
                 "-resize",limit,"-quality",quality,str(dest)],
                stdout=subprocess.DEVNULL)
            if dest.stat().st_size < 1000 or dest.stat().st_size>4*1024*1024:
                raise ValueError("Image convertie invalide : "+dest.name)

def convert_videos(assignment):
    folder=ROOT/"public"/"vitrine"/"media"/"videos-2027"
    folder.mkdir(parents=True,exist_ok=True)
    for name,src in assignment.items():
        target=folder/(name+".mp4")
        run(["ffmpeg","-hide_banner","-loglevel","error","-y",
             "-i",str(src),"-map","0:v:0","-map","0:a:0?",
             "-vf","scale=1280:-2:force_original_aspect_ratio=decrease",
             "-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast",
             "-crf","27","-maxrate","2400k","-bufsize","4800k",
             "-c:a","aac","-b:a","128k","-movflags","+faststart",
             str(target)])
        if target.stat().st_size < 10000 or target.stat().st_size>25*1024*1024:
            raise ValueError("Vidéo MP4 exportée invalide : "+target.name)
        poster=folder/(name+".jpg")
        run(["ffmpeg","-hide_banner","-loglevel","error","-y",
             "-ss","1.0","-i",str(target),"-frames:v","1",
             "-vf","scale=960:-2","-q:v","4",str(poster)])
        if not poster.is_file() or poster.stat().st_size<2000:
            raise ValueError("Affiche vidéo manquante : "+poster.name)

def main():
    if not all((ROOT/name).is_file() for name in PHOTOS_SRC+VIDEOS_SRC):
        print("MEDIAS_SDE_SOURCES_ABSENTES: dix originaux introuvables ; "
              "aucune association ni publication forcée.")
        return 0
    converter=shutil.which("magick") or shutil.which("convert")
    if not converter or not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ImageMagick et FFmpeg doivent être installés avant cet import.")
    images=match_photos(converter)
    videos=match_videos()
    # La correspondance complète est validée avant toute extraction/conversion.
    convert_photos(images,converter)
    convert_videos(videos)
    print("MEDIAS_SDE_INSTALLES_ORIGINAUX: 7 photos et 3 vidéos "
          "optimisées, 7 miniatures et 3 affiches, prêts pour Cloudflare.",flush=True)
    return 0

if __name__=="__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("MEDIAS_SDE_ERREUR_ORIGINAUX:",str(exc),file=sys.stderr)
        sys.exit(1)
