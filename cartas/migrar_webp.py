#!/usr/bin/env python3
"""Migrar derivados JPG a WebP, conservando originales en cartas/arte y cartas/full.

Uso: python cartas/migrar_webp.py
Idempotente. No cambia IDs, dimensiones ni el historial Git.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = {"c": 90, "c2": 90, "d": 88, "fa": 88}
MANIFEST = ROOT / "cartas/arte-manifest.json"
REPORT = ROOT / "cartas/reporte-webp.md"
PREVIEW = ROOT / "cartas/revision-webp.jpg"
SAMPLES = ("gatosamurai", "hyrule", "shenzalcoatl", "evilexes", "gamepop", "mapa")


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(131072), b""):
            h.update(block)
    return h.hexdigest()


def psnr(original: Image.Image, optimized: Image.Image) -> float:
    difference = ImageChops.difference(original, optimized)
    rms_values = ImageStat.Stat(difference).rms
    rms = math.sqrt(sum(value * value for value in rms_values) / len(rms_values))
    return 99.0 if rms == 0 else 20 * math.log10(255 / rms)


def contact_sheet(pairs: dict[str, tuple[Image.Image, Image.Image, int, int]]) -> None:
    if not pairs:
        return
    tile_w, tile_h, gap, title_h = 250, 375, 16, 40
    height = len(pairs) * (tile_h + title_h + gap) + gap
    sheet = Image.new("RGB", (2 * tile_w + 3 * gap, height), "#171522")
    draw = ImageDraw.Draw(sheet)
    for row, (name, (left, right, before, after)) in enumerate(pairs.items()):
        y = gap + row * (tile_h + title_h + gap)
        draw.text((gap, y), name + "  |  JPG " + str(before // 1024) +
                  " KB / WebP " + str(after // 1024) + " KB", fill="white")
        for col, img in enumerate((left, right)):
            small = ImageOps.contain(img, (tile_w, tile_h), Image.Resampling.LANCZOS)
            x = gap + col * (tile_w + gap)
            sheet.paste(small, (x + (tile_w - small.width) // 2,
                                y + title_h + (tile_h - small.height) // 2))
    sheet.save(PREVIEW, quality=88, optimize=True)


def main() -> None:
    rows = []
    pairs = {}
    total_before = total_after = 0
    converted = 0
    minimum_psnr = 99.0

    for folder, quality in FOLDERS.items():
        directory = ROOT / folder
        if not directory.is_dir():
            raise RuntimeError("Falta directorio " + str(directory))
        files = sorted(directory.glob("*.jpg"))
        before_folder = after_folder = 0
        for jpg in files:
            webp = jpg.with_suffix(".webp")
            before = jpg.stat().st_size
            with Image.open(jpg) as opened:
                source = opened.convert("RGB")
                source.save(webp, "WEBP", quality=quality, method=6)
                with Image.open(webp) as checked:
                    checked.load()
                    if checked.size != source.size or checked.format != "WEBP":
                        raise RuntimeError("WebP inválido: " + str(webp))
                    optimized = checked.convert("RGB")
                    fidelity = psnr(source, optimized)
                    minimum_psnr = min(minimum_psnr, fidelity)
                    if fidelity < 31.0:
                        raise RuntimeError("Calidad insuficiente " +
                                           str(round(fidelity, 1)) + " dB: " + str(jpg))
                    if folder == "fa" and jpg.stem in SAMPLES:
                        pairs[jpg.stem] = (source.copy(), optimized.copy(),
                                           before, webp.stat().st_size)
            after = webp.stat().st_size
            jpg.unlink()  # El JPG generado se borra solo tras verificar el WebP.
            before_folder += before
            after_folder += after
            converted += 1
        rows.append((folder, len(files), before_folder, after_folder))
        total_before += before_folder
        total_after += after_folder

    if MANIFEST.exists():
        state = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for entry in state.get("designs", {}).values():
            updated = {}
            for rel in entry.get("outputs", {}):
                new_rel = str(Path(rel).with_suffix(".webp"))
                if not (ROOT / new_rel).is_file():
                    raise RuntimeError("Falta salida del manifiesto: " + new_rel)
                updated[new_rel] = digest(ROOT / new_rel)
            entry["outputs"] = updated
        MANIFEST.write_text(json.dumps(state, indent=2,
                                       ensure_ascii=False, sort_keys=True) + "\n",
                            encoding="utf-8")

    lines = ["# Migración WebP — Insert Coin MX", "",
             "Se conservaron las ilustraciones originales en cartas/full y cartas/arte.",
             "", "| Carpeta | Archivos | Antes | Después | Reducción |",
             "|---|---:|---:|---:|---:|"]
    for folder, count, before, after in rows:
        pct = 100 * (before - after) / before if before else 0
        lines.append("| " + folder + " | " + str(count) + " | " +
                     str(round(before / 1048576, 2)) + " MB | " +
                     str(round(after / 1048576, 2)) + " MB | " +
                     str(round(pct, 1)) + "% |")
    pct = 100 * (total_before - total_after) / total_before if total_before else 0
    lines += ["", "**Total:** " + str(converted) + " archivos, " +
              str(round(total_before / 1048576, 2)) + " MB a " +
              str(round(total_after / 1048576, 2)) + " MB (" +
              str(round(pct, 1)) + "% de reducción).",
              "", "PSNR mínimo frente al JPG generado: " +
              str(round(minimum_psnr, 1)) + " dB.",
              "Esta métrica no reemplaza la revisión visual de letras, bordes y gradientes.",
              "El ahorro visible no elimina los archivos del historial histórico Git.", ""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    contact_sheet(pairs)
    print("\n".join(lines))


if __name__ == "__main__":
    main()
