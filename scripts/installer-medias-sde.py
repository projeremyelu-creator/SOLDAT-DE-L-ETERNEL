#!/usr/bin/env python3
"""Publie les ressources binaires SDE 2027 depuis une archive unique contrôlée.

L'archive attendue est le ZIP préparé et transmis le 9 novembre 2026.
Sans archive, ne modifier aucune ressource: les galeries restent cachées.
Avec archive, vérifier l'empreinte SHA-256, les noms et les tailles AVANT
d'extraire, afin de rejeter tout remplacement ou chemin malveillant.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "Medias_SDE_2027_prets_pour_site.zip"
SHA256 = "c039c5a548f1f79ca4d144895c43162ff7e0f0b7c2ca04bc87642adb12ecac38"
PREFIXES = ("public/vitrine/media/archives-2027/", "public/vitrine/media/videos-2027/")
EXPECTED = frozenset({
    "reunion-fraternelle.webp",
    "polos-sde-or-blanc.webp",
    "polos-sde-or-blanc-mini.webp",
    "tenues-sde-portees-mini.webp",
    "tenues-sde-portees.webp",
    "reunion-priere-02.webp",
    "reunion-priere-01.webp",
    "reunion-priere-01-mini.webp",
    "action-humanitaire.webp",
    "action-humanitaire-mini.webp",
    "polos-sde-vert-blanc-mini.webp",
    "polos-sde-vert-blanc.webp",
    "reunion-priere-02-mini.webp",
    "reunion-fraternelle-mini.webp",
    "identite-sde-expansion.mp4",
    "livre-pouvoir-femme.jpg",
    "archives-rassemblement.jpg",
    "livre-pouvoir-femme.mp4",
    "archives-rassemblement.mp4",
    "identite-sde-expansion.jpg",
})

def main() -> int:
    if not ARCHIVE.is_file():
        # Les dix objets Git originaux sont déjà placés dans public par leurs SHA ;
        # ne pas reconvertir ces fichiers ou réclamer une archive qui n'a jamais été envoyée.
        images = ["reunion-priere-01.jpg","reunion-priere-02.jpg","reunion-fraternelle.jpg",
                  "action-humanitaire.jpg","tenues-sde-portees.jpg",
                  "polos-sde-or-blanc.jpg","polos-sde-vert-blanc.png"]
        videos = ["livre-pouvoir-femme.mp4","archives-rassemblement.mp4",
                  "identite-sde-expansion.mp4"]
        photo_path = ROOT / "public" / "vitrine" / "media" / "archives-2027"
        video_path = ROOT / "public" / "vitrine" / "media" / "videos-2027"
        if all((photo_path / name).is_file() for name in images) and all((video_path / name).is_file() for name in videos):
            print("MEDIAS_SDE_INSTALLES_DIRECTS: 7 images et 3 vidéos déjà présentes dans les ressources publiques Cloudflare.")
            return 0
        # Les originaux ont été directement envoyés à la racine GitHub.
        # Les reconnaître et les convertir plutôt que réclamer à nouveau le ZIP.
        sources = [
            "IMG-20261002-WA0024(1).jpg", "IMG-20261104-WA0118.jpg",
            "IMG-20261104-WA0121.jpg", "IMG-20261104-WA0122.jpg",
            "IMG_20261031_100328_3.jpg", "IMG_20261031_122737_350.jpg",
            "file_0000000034d881f489f1574d2a5bc2a1.png",
            "VID-20260924-WA0061.mp4", "WA_1793824660474.mp4",
            "gemini_generated_video_56be848c.mp4",
        ]
        if all((ROOT / name).is_file() for name in sources):
            subprocess.run([sys.executable, str(ROOT / "scripts" / "importer-medias-sde-originaux.py")], check=True)
            return 0
        print("MEDIAS_SDE_EN_ATTENTE: archive et originaux non téléversés dans le dépôt; aucune photo ou vidéo annoncée publiée.")
        return 0
    if ARCHIVE.stat().st_size > 25 * 1024 * 1024:
        raise ValueError("L'archive dépasse 25 Mo.")
    digest = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    if digest != SHA256:
        raise ValueError("Archive inattendue: empreinte SHA-256 incorrecte.")
    with zipfile.ZipFile(ARCHIVE) as z:
        items = [m for m in z.infolist() if not m.is_dir()]
        candidates = [m for m in items if m.filename.startswith(PREFIXES)]
        extras = {m.filename for m in items} - {m.filename for m in candidates}
        if extras != {"LIRE-AVANT-PUBLICATION.md", "catalogue-medias-sde.json"}:
            raise ValueError("Archive modifiée: fichiers supplémentaires ou manquants.")
        if len(candidates) != len(EXPECTED):
            raise ValueError(f"Nombre incorrect de médias: {len(candidates)}.")
        names = [Path(m.filename).name for m in candidates]
        if set(names) != EXPECTED or len(names) != len(EXPECTED):
            raise ValueError("Contenu incomplet ou noms incorrects.")
        if sum(m.file_size for m in candidates) > 18 * 1024 * 1024:
            raise ValueError("Taille totale décompressée excessive.")
        for m in candidates:
            path = ROOT / m.filename
            if not path.resolve().is_relative_to(ROOT / "public" / "vitrine" / "media"):
                raise ValueError("Chemin de média invalide.")
            if m.file_size > 12 * 1024 * 1024:
                raise ValueError("Média dépassant 12 Mo.")
        # Tous les contrôles terminés: extraire uniquement les 20 fichiers autorisés.
        for m in candidates:
            target = ROOT / m.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            staged = target.with_name(target.name + ".sde-tmp")
            try:
                with z.open(m) as src, staged.open("wb") as dest:
                    while chunk := src.read(512 * 1024):
                        dest.write(chunk)
                os.replace(staged, target)
            finally:
                staged.unlink(missing_ok=True)
        print(f"MEDIAS_SDE_INSTALLES: {len(candidates)} fichiers vérifiés, prêts pour Cloudflare.")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("MEDIAS_SDE_ERREUR:", exc, file=sys.stderr)
        sys.exit(1)
