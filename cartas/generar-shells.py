#!/usr/bin/env python3
"""Genera SOLO la base gráfica sin datos. No modifica c/, c2/, d/, fa/ ni index.html.

Uso: python cartas/generar-shells.py 1up sonic
     python cartas/generar-shells.py --all  # migración inicial explícita
Salidas: cs/ (480x670) y cs2/ (960x1340). Idempotente por bytes.
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
import generar as g

ROOT = Path(__file__).resolve().parent.parent
CATALOGO = ROOT / "cartas/catalogo.json"
BASE = ROOT / "cartas/full"
VERSIONES = ("comun", "holo", "dorada")


def imagen_base(d, rareza, plantillas):
    """Marco aprobado + arte original. SIN categoría, título, texto, POP, PTS ni número."""
    salida = plantillas["marco_" + rareza].copy()
    arte = g.leer_arte(d["id"])
    x0, y0, x1, y1 = g.VENTANA
    dibujo = g.acomodar_arte(arte, x1-x0, y1-y0, g.MARGEN_ARTE)
    salida[y0:y1, x0:x1] = g.dorar(dibujo, plantillas["oro"]) if rareza == "dorada" else dibujo
    return np.clip(salida, 0, 255).astype(np.uint8)


def imagen_full(d, plantillas):
    """Preserva ilustración, velo, marca, pastilla de frase y estrellas, sin datos impresos."""
    w, h = 960, 1340
    arte = Image.open(BASE / (d["id"] + ".jpg")).convert("RGB")
    salida = np.asarray(g.cubrir(arte, w, h, g.F_ENCUADRE)).astype(np.float32)
    ys, valores = zip(*g.F_VELO)
    coef = np.interp(np.arange(h), ys, valores).astype(np.float32)[:, None, None]
    salida = salida * (1 - coef) + np.array(g.F_VELO_COLOR, np.float32) * coef
    g.pegar_alfa(salida, plantillas["full_marca"], 0, 0)

    # Etiquetas, iconos y texto de habilidad se colocan dinámicamente.
    k = 4
    x0, y0, x1, y1 = 48, 1116, 912, 1200
    a = Image.new("L", ((x1-x0)*k, (y1-y0)*k), 0)
    b = a.copy()
    ImageDraw.Draw(a).rounded_rectangle((0, 0, a.width-1, a.height-1), radius=20*k, fill=255)
    ImageDraw.Draw(b).rounded_rectangle((3*k, 3*k, b.width-1-3*k, b.height-1-3*k), radius=17*k, fill=255)
    g.pegar_alfa(salida, np.asarray(a.resize((x1-x0, y1-y0), Image.Resampling.LANCZOS)).astype(np.float32)/255, x0, y0, g.F_TINTA)
    g.pegar_alfa(salida, np.asarray(b.resize((x1-x0, y1-y0), Image.Resampling.LANCZOS)).astype(np.float32)/255, x0, y0, (245, 206, 46))
    # No dibujar estrellas junto a la rareza: forman parte de la capa de datos.
    mascara = Image.new("L", (w*2, h*2), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, w*2-1, h*2-1), radius=g.F_RADIO*2, fill=255)
    alpha = np.asarray(mascara.resize((w, h), Image.Resampling.LANCZOS)).astype(np.float32)[..., None]/255
    return np.clip(salida*alpha, 0, 255).astype(np.uint8)


def nombre_version(d, rareza):
    """IDs existentes y alias originales jamás cambian."""
    return d["id"] if d["version_original"] == rareza else d["id"] + "_" + g.LETRA[rareza]


def escribir_si_cambia(path, imagen):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp.webp")
    Image.fromarray(imagen).save(tmp, quality=90, method=6)
    data = tmp.read_bytes()
    tmp.unlink()
    if path.is_file() and path.read_bytes() == data:
        return False
    path.write_bytes(data)
    return True


def procesar(d, plantillas):
    count = 0
    for rareza in VERSIONES:
        nombre = nombre_version(d, rareza)
        carta = imagen_base(d, rareza, plantillas)
        count += int(escribir_si_cambia(ROOT / "cs2" / (nombre + ".webp"), carta))
        reducida = cv2.resize(carta, (480, 670), interpolation=cv2.INTER_AREA)
        count += int(escribir_si_cambia(ROOT / "cs" / (nombre + ".webp"), reducida))
    if d.get("full") and (BASE / (d["id"] + ".jpg")).exists():
        nombre = "F_" + d["id"]
        # Respetar aliases de Full; lectura canónica desde index actual.
        nombre = g.leer_fk().get(d["id"], nombre)
        carta = imagen_full(d, plantillas)
        count += int(escribir_si_cambia(ROOT / "cs2" / (nombre + ".webp"), carta))
        count += int(escribir_si_cambia(ROOT / "cs" / (nombre + ".webp"),
                                      cv2.resize(carta, (480, 670), interpolation=cv2.INTER_AREA)))
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*", help="IDs puntuales, no nombres")
    parser.add_argument("--all", action="store_true", help="Única migración inicial")
    args = parser.parse_args()
    if args.all == bool(args.ids):
        parser.error("Usa IDs específicos O --all; nunca ambos")
    catalogo = {d["id"]: d for d in json.loads(CATALOGO.read_text(encoding="utf8"))}
    ids = list(catalogo) if args.all else list(dict.fromkeys(args.ids))
    invalidos = set(ids) - set(catalogo)
    if invalidos:
        parser.error("IDs desconocidos: " + ", ".join(sorted(invalidos)))
    plantillas = g.cargar_plantillas()
    archivos = sum(procesar(catalogo[ident], plantillas) for ident in ids)
    print(f"OK: {len(ids)} diseños revisados, {archivos} archivos nuevos o modificados en cs/ y cs2/")
    print("Sin tocar imágenes anteriores, progreso, index.html o catálogo.")


if __name__ == "__main__":
    main()
