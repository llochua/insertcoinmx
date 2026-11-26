#!/usr/bin/env python3
"""Hoja de capturas de qa/card-variants-browsers.mjs: una por ancho, dinámica y respaldo de cada variante.

Uso: python3 qa/card-variants-sheet.py <id>  →  qa/screenshots/cartas/<id>-320.jpg, -390.jpg, -1280.jpg
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NOMBRES = {"b": "Base", "e": "Holo", "r": "Dorada", "f": "Especial"}


def fuente(tam):
    for ruta in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"):
        if Path(ruta).is_file():
            return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ident = sys.argv[1]
    src = ROOT / ".qa-cartas" / ident
    dst = ROOT / "qa/screenshots/cartas"
    dst.mkdir(parents=True, exist_ok=True)
    f = fuente(26)
    for ancho in (320, 390, 1280):
        tiles = []
        for modo in ("dinamica", "respaldo"):
            for v in "berf":
                png = src / f"{ancho}_{v}_{modo}.png"
                if not png.is_file():
                    continue
                im = Image.open(png).convert("RGB")
                im.thumbnail((10000, 900 if ancho < 1280 else 620))
                t = Image.new("RGB", (im.width, im.height + 40), (18, 15, 26))
                t.paste(im, (0, 40))
                etiqueta = f"{ident} · {ancho}px · {NOMBRES[v]} · {'dinámica' if modo == 'dinamica' else 'respaldo'}"
                ImageDraw.Draw(t).text((8, 6), etiqueta, fill=(255, 212, 0), font=f)
                tiles.append(t)
        hoja = Image.new("RGB", (sum(t.width + 10 for t in tiles), max(t.height for t in tiles)), (0, 0, 0))
        x = 0
        for t in tiles:
            hoja.paste(t, (x, 0))
            x += t.width + 10
        salida = dst / f"{ident}-{ancho}.jpg"
        hoja.save(salida, quality=82)
        print("ok", salida.relative_to(ROOT))


if __name__ == "__main__":
    main()
