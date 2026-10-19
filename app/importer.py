"""Transforme un export de la base Claude (un fichier JSON par document) en SQL pour D1.

Usage : python3 app/importer.py <dossier d'export> > import.sql
Chaque fichier <dossier>/<collection>/<...>/<id>.json devient une ligne de la table docs.
"""
import json, sys, time
from pathlib import Path

racine = Path(sys.argv[1])
maj = int(time.time() * 1000)
q = lambda s: "'" + str(s).replace("'", "''") + "'"
lignes = []
for f in sorted(racine.rglob("*.json")):
    rel = f.relative_to(racine).with_suffix("").as_posix()
    segs = rel.split("/")
    if len(segs) % 2:  # un document a un nombre pair de segments
        continue
    data = json.loads(f.read_text())
    if not isinstance(data, dict):
        continue
    lignes.append(f"INSERT OR REPLACE INTO docs (path, parent, id, data, version, maj) VALUES ({q(rel)}, {q('/'.join(segs[:-1]))}, {q(segs[-1])}, {q(json.dumps(data, ensure_ascii=False, separators=(',', ':')))}, 1, {maj});")
parents = sorted({"/".join(l.split("'")[3:4]) for l in lignes})
print("\n".join(lignes))
print("UPDATE revs SET rev = rev + 1;")
print(f"-- {len(lignes)} documents", file=sys.stderr)
