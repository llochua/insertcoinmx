#!/usr/bin/env python3
"""Actualización profesional de artes de Insert Coin MX.

Uso desde la raíz del repo:
  python cartas/actualizar.py sonic evilexes
  python cartas/actualizar.py --pendientes

Un solo comando: regenera tres rarezas, Full si existe, d/, ABOX, paleta,
manifiesto de hashes, versión de caché y una hoja de contacto de revisión.
No hace commit, no toca Drive y nunca fusiona a main.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from qa import ROOT, CAT, MANIFEST, outputs, sources, sha

PREVIEW = ROOT / "cartas/muestra-cambios.jpg"
REPORT = ROOT / "cartas/reporte-calidad.md"


def signature(d):
    return {p: sha(ROOT / p) for p in sources(d) if (ROOT / p).is_file()}


def preview(ids, cat, html):
    # Hoja de contacto: una fila por diseño, tres cartas y nombres legibles.
    w, h, header, gutter = 220, 307, 34, 14
    sheet = Image.new("RGB", (3*w+4*gutter, len(ids)*(h+header+gutter)+gutter), "#181625")
    dr = ImageDraw.Draw(sheet)
    for row, ident in enumerate(ids):
        item = cat[ident]
        y = gutter+row*(h+header+gutter)
        dr.text((gutter, y), f"{item['nombre']} ({ident})  |  Base / Holo / Dorada", fill="#ffffff")
        files = outputs(item, html)[:6]
        # outputs: c(base), c2(base), c(holo), c2(holo), c(dorada), c2(dorada)
        for n, path in enumerate(files[::2]):
            with Image.open(ROOT / path) as im:
                sheet.paste(im.convert("RGB").resize((w, h), Image.Resampling.LANCZOS),
                            (gutter+n*(w+gutter), y+header))
    sheet.save(PREVIEW, quality=85)


def run(ids, catalog):
    args = [sys.executable, str(ROOT / "cartas/generar.py"), "--solo", *ids, "--regenerar-arte"]
    subprocess.run(args, check=True, cwd=ROOT)
    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf8")
    if not re.search(r"const IMGV='[^']+'", html):
        raise RuntimeError("No se encontró la versión de caché IMGV")
    manifest = json.loads(MANIFEST.read_text(encoding="utf8")) if MANIFEST.exists() else {"version": 1, "designs": {}}
    entries = manifest.setdefault("designs", {})
    for ident in ids:
        d = catalog[ident]
        files = outputs(d, html)
        for p in files:
            if not (ROOT / p).is_file():
                raise RuntimeError(ident + ": no se generó " + p)
        entries[ident] = {
            "sources": signature(d),
            "outputs": {p: sha(ROOT / p) for p in files}
        }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf8")
    # Un hash estable evita que el navegador enseñe una ilustración anterior.
    all_sources = {ident: entry["sources"] for ident, entry in sorted(entries.items())}
    token = hashlib.sha256(json.dumps(all_sources, sort_keys=True).encode()).hexdigest()[:12]
    html = re.sub(r"const IMGV='[^']+'", f"const IMGV='a{token}'", html, count=1)
    html_path.write_text(html, encoding="utf8")
    preview(ids, catalog, html)
    REPORT.write_text(
        "# Revisión de artes\n\n"
        + "Diseños procesados: " + ", ".join(ids) + "\n\n"
        + "Se han regenerado las rarezas, encuadres, color de fondo y caché.\n\n"
        + "La hoja de contacto muestra las tres versiones por diseño.\n"
        + "Este control automático no sustituye la revisión de composición visual en móvil y escritorio.\n",
        encoding="utf8"
    )
    subprocess.run([sys.executable, str(ROOT / "cartas/qa.py"), "--ids", *ids], check=True, cwd=ROOT)
    print("Listo: ", ", ".join(ids))
    print("Vista previa:", PREVIEW.relative_to(ROOT))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ids", nargs="*", help="IDs de diseños a generar")
    parser.add_argument("--pendientes", action="store_true",
                        help="reprocesa solo fuentes nuevas o con hash distinto")
    args = parser.parse_args()
    catalog = {d["id"]: d for d in json.loads(CAT.read_text(encoding="utf8"))}
    entries = json.loads(MANIFEST.read_text(encoding="utf8")).get("designs", {}) if MANIFEST.exists() else {}
    if args.pendientes:
        selected = [ident for ident, d in catalog.items()
                    if signature(d) != entries.get(ident, {}).get("sources", {})]
    else:
        selected = args.ids
    invalid = set(selected) - catalog.keys()
    if invalid:
        parser.error("IDs fuera del catálogo: " + ", ".join(sorted(invalid)))
    # El manifiesto aún no tiene histórico completo: --pendientes incorpora todos
    # los diseños sin registro; los IDs explícitos son más rápidos para un lote.
    selected = list(dict.fromkeys(selected))
    if not selected:
        print("No hay fuentes nuevas ni cambios pendientes.")
        return
    for ident in selected:
        if not (ROOT / f"cartas/arte/{ident}.png").is_file():
            parser.error("Falta cartas/arte/" + ident + ".png")
    run(selected, catalog)


if __name__ == "__main__":
    main()
