#!/usr/bin/env python3
"""Control de calidad de cartas. Sin modificar archivos.

Uso:
  python cartas/qa.py --all
  python cartas/qa.py --ids sonic evilexes
  python cartas/qa.py --changed --base <sha-main>

Los checks duros detectan archivos faltantes, tamaños incorrectos y fuentes
desincronizadas del manifiesto. Los bordes con gradientes generan AVISOS:
no son motivo para recortar ni para alterar la ilustración.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from statistics import median

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CAT = ROOT / "cartas/catalogo.json"
MANIFEST = ROOT / "cartas/arte-manifest.json"
DIM = {"c": (480, 670), "c2": (960, 1340), "d": (640, 800),
       "fa": (600, 900)}
LETRAS = {"comun": "b", "holo": "e", "dorada": "r"}


def sha(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(131072), b""):
            digest.update(chunk)
    return digest.hexdigest()


def outputs(d, html):
    ident = d["id"]
    names = []
    for rareza in LETRAS:
        name = ident if rareza == d["version_original"] else ident + "_" + LETRAS[rareza]
        for directory in ("c", "c2"):
            names.append(f"{directory}/{name}.jpg")
    names.append(f"d/{ident}.jpg")
    full = ROOT / f"cartas/full/{ident}.jpg"
    if full.is_file() and d.get("full"):
        match = re.search(r"\{id:'" + re.escape(ident) + r"'[^\n]*?fk:'([^']+)'", html)
        fk = match.group(1) if match else "F_" + ident
        names += [f"c/{fk}.jpg", f"c2/{fk}.jpg", f"fa/{fk[2:]}.jpg"]
    return names


def sources(d):
    ident = d["id"]
    files = [f"cartas/arte/{ident}.png"]
    if (ROOT / f"cartas/full/{ident}.jpg").is_file():
        files.append(f"cartas/full/{ident}.jpg")
    return files


def changed_paths(base):
    if base:
        cmd = ["git", "diff", "--name-only", f"{base}...HEAD"]
    else:
        cmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]
    try:
        return set(subprocess.check_output(cmd, cwd=ROOT, text=True).splitlines())
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise RuntimeError("No fue posible leer la diferencia Git: " + str(exc))


def changed_ids(paths, catalog):
    ids = set()
    special = {"cartas/catalogo.json", "cartas/generar.py"}
    if any(p in special or p.startswith("cartas/plantillas/") for p in paths):
        return set(catalog)
    for path in paths:
        m = re.fullmatch(r"cartas/(?:arte|full)/([a-z0-9]+)\.(?:png|jpg)", path)
        if m:
            ids.add(m.group(1))
            continue
        m = re.fullmatch(r"d/([a-z0-9]+)\.jpg", path)
        if m:
            ids.add(m.group(1))
            continue
        m = re.fullmatch(r"c2?/([a-z0-9]+)(?:_[er])?\.jpg", path)
        if m:
            ids.add(m.group(1))
    return ids


def gradiente_bordes(path):
    """Desviación por canal entre bordes del JPG (solo diagnóstico)."""
    with Image.open(path) as img:
        im = img.convert("RGB").resize((32, 40))
        p = im.load()
        bordes = []
        for coords in (
            [(x, y) for x in range(32) for y in range(2)],
            [(x, y) for x in range(32) for y in (38, 39)],
            [(x, y) for x in range(2) for y in range(40)],
            [(x, y) for x in (30, 31) for y in range(40)]
        ):
            bordes.append([median([p[x, y][c] for x, y in coords]) for c in range(3)])
    return round(max(abs(a-b) for a in bordes for b in bordes), 1)


def check_image(relative, errors):
    path = ROOT / relative
    if not path.is_file():
        errors.append("Falta " + relative)
        return False
    directory = relative.split("/", 1)[0]
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            if directory in DIM and img.size != DIM[directory]:
                errors.append(f"{relative}: mide {img.size}, se espera {DIM[directory]}")
    except Exception as exc:
        errors.append(f"{relative}: imagen inválida ({exc})")
        return False
    return True


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true")
    group.add_argument("--ids", nargs="+")
    group.add_argument("--changed", action="store_true")
    parser.add_argument("--base", help="SHA de la rama base para --changed")
    args = parser.parse_args()

    catalog = {d["id"]: d for d in json.loads(CAT.read_text(encoding="utf8"))}
    html = (ROOT / "index.html").read_text(encoding="utf8")
    entries = json.loads(MANIFEST.read_text(encoding="utf8")).get("designs", {}) if MANIFEST.is_file() else {}
    paths = changed_paths(args.base) if args.changed else set()
    ids = (set(catalog) if args.all else
           set(args.ids) if args.ids else changed_ids(paths, catalog))
    errors, warnings = [], []
    # Invariantes compartidas en lugar de hacks por ID.
    for pattern in (".dx-art-ambient", "--ic-art-image", ".dx-flat-art>img",
                    'class="ic-close dx-leave"'):
        if pattern not in html:
            errors.append("Falta el tratamiento visual común: " + pattern)
    if not ids <= catalog.keys():
        errors.append("IDs desconocidos: " + ", ".join(sorted(ids - catalog.keys())))
    touched_src = {
        m.group(1) for p in paths
        if (m := re.fullmatch(r"cartas/(?:arte|full)/([a-z0-9]+)\.(?:png|jpg)", p))
    }
    for ident in sorted(ids & catalog.keys()):
        d = catalog[ident]
        if d.get("version_original") not in LETRAS:
            errors.append(ident + ": versión original inválida")
            continue
        expected = sources(d) + outputs(d, html)
        present = {p for p in expected if check_image(p, errors)}
        entry = entries.get(ident)
        if ident in touched_src and not entry:
            errors.append(ident + ": arte nuevo/reemplazado sin manifiesto; falta ejecutar actualizar.py")
        if entry:
            for kind in ("sources", "outputs"):
                recorded = entry.get(kind, {})
                for p, digest in recorded.items():
                    if p not in expected:
                        errors.append(ident + ": ruta obsoleta en manifiesto: " + p)
                    elif p in present and sha(ROOT / p) != digest:
                        errors.append(ident + ": arte o carta desincronizada: " + p)
            if ident in touched_src and not all(p in entry.get("sources", {}) for p in sources(d)):
                errors.append(ident + ": manifiesto incompleto para una fuente modificada")
        if (ROOT / f"d/{ident}.jpg").is_file():
            delta = gradiente_bordes(ROOT / f"d/{ident}.jpg")
            if delta > 35:
                warnings.append(f"{ident}: orillas con diferencia de color {delta}; revisar integración visual")
    print(f"QA arte: {len(ids)} diseños revisados; {len(warnings)} avisos; {len(errors)} errores.")
    for warning in warnings[:15]:
        print("AVISO:", warning)
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
