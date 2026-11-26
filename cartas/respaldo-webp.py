#!/usr/bin/env python3
"""Pasa los PNG de .respaldo/ (salida de cartas/respaldo-dinamico.mjs) a c2/ (960x1340) y c/ (480x670)
y actualiza las huellas de salida en cartas/arte-manifest.json. No toca ilustraciones ni bases cs/cs2.

Uso: python3 cartas/respaldo-webp.py <id> [<id> ...]
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "cartas"))
import qa  # noqa: E402

CALIDAD = 90  # igual que WEBP_CALIDAD de generar.py


def main():
    ids = sys.argv[1:]
    if not ids:
        sys.exit(__doc__)
    catalogo = {d["id"]: d for d in json.load(open(ROOT / "cartas/catalogo.json", encoding="utf8"))}
    html = (ROOT / "index.html").read_text(encoding="utf8")
    raw = (ROOT / "cartas/arte-manifest.json").read_text(encoding="utf8")
    manifest = json.loads(raw)
    for ident in ids:
        d = catalogo[ident]
        claves = [ident if r == d["version_original"] else ident + "_" + qa.LETRAS[r] for r in qa.LETRAS]
        if d.get("full"):
            claves.append("F_" + ident)
        for clave in claves:
            png = ROOT / ".respaldo" / (clave + ".png")
            im = Image.open(png).convert("RGB")
            if im.size != (960, 1340):
                sys.exit(f"{png}: tamaño {im.size}, se esperaba 960x1340")
            im.save(ROOT / "c2" / (clave + ".webp"), quality=CALIDAD, method=6)
            chica = cv2.resize(np.asarray(im), (480, 670), interpolation=cv2.INTER_AREA)
            Image.fromarray(chica).save(ROOT / "c" / (clave + ".webp"), quality=CALIDAD, method=6)
            print("ok", clave)
        entrada = manifest["designs"].setdefault(ident, {})
        entrada["outputs"] = {o: qa.sha(ROOT / o) for o in sorted(qa.outputs(d, html))}
        entrada["sources"] = {s: qa.sha(ROOT / s) for s in qa.sources(d)}
    texto = json.dumps(manifest, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else "")
    (ROOT / "cartas/arte-manifest.json").write_text(texto, encoding="utf8")


if __name__ == "__main__":
    main()
