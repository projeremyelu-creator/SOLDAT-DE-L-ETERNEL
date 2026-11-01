#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage : bash scripts/importer-album-infire.sh /chemin/Album_photo_IN_FIRE_SDE_2024-2026.zip" >&2
  exit 2
fi
archive="$1"
if [[ ! -f "$archive" ]]; then echo "Archive introuvable : $archive" >&2; exit 2; fi
if ! command -v unzip >/dev/null 2>&1; then echo "L'utilitaire unzip est nécessaire." >&2; exit 2; fi
cd "$(dirname "$0")/.."
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT
unzip -qq "$archive" 'vitrine/albums/infire/2025/*.webp' -d "$temp"
source_folder="$temp/vitrine/albums/infire/2025"
destination="public/vitrine/albums/infire/2025"
if [[ "$(find "$source_folder" -maxdepth 1 -type f -name '*.webp' | wc -l)" -ne 20 ]]; then
  echo "Archive incomplète : vingt fichiers WebP attendus." >&2; exit 1
fi
mkdir -p "$destination"
cp "$source_folder"/*.webp "$destination/"
node scripts/verifier-galerie-infire.mjs
echo "Images installées localement. Vérifiez le classement, puis committez les fichiers sur la branche de publication."
