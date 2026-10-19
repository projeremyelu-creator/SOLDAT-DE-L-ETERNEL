"""Prépare le fichier de transfert (.json) à partir d'un export de la base Claude (un fichier JSON par document).

Usage : python3 app/transfert.py <dossier d'export> <fichier de sortie>
"""
import json, sys
from pathlib import Path
racine, sortie = Path(sys.argv[1]), Path(sys.argv[2])
docs = {}
for f in sorted(racine.rglob("*.json")):
    rel = f.relative_to(racine).with_suffix("").as_posix()
    if len(rel.split("/")) % 2 == 0:
        d = json.loads(f.read_text())
        if isinstance(d, dict):
            docs[rel] = d
sortie.write_text(json.dumps({"application": "MPA SDE", "format": 1, "docs": docs}, ensure_ascii=False))
print(len(docs), "documents →", sortie)
