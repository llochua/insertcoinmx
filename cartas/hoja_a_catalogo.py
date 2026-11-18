#!/usr/bin/env python3
"""Convierte la hoja "Narrativas TCG" (exportada como CSV) en cartas/catalogo.json.

En Google Sheets: Archivo → Descargar → Valores separados por comas (.csv), con la pestaña
"Narrativas TCG" abierta. Luego:

    python3 cartas/hoja_a_catalogo.py ruta/al/archivo.csv
    python3 cartas/generar.py

Se conserva `version_original` de cada diseño (no se edita en la hoja: protege el progreso guardado).
"""
import csv, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(RAIZ, 'cartas', 'catalogo.json')
COL = {  # columna de la hoja → campo del catálogo
    'ID del juego (interno)': 'id', 'Diseño': 'nombre', 'Diseñado por': 'disenado_por',
    'Categoría': 'categoria', 'Número': 'numero', 'Habilidad · referencia': 'ref',
    'Habilidad · referencia (2ª línea)': 'ref2', 'Habilidad · línea': 'linea',
    'Frase en carta': 'frase', 'Tipo': 'tipo', 'Full': 'full',
    'Arte (archivo en E:\\icmx\\fichas)': 'arte', 'Estado carta': 'estado',
}


def main(ruta):
    previo = {d['id']: d for d in json.load(open(CAT, encoding='utf8'))} if os.path.exists(CAT) else {}
    filas = list(csv.DictReader(open(ruta, encoding='utf8')))
    cat = []
    for f in filas:
        d = {campo: (f.get(col) or '').strip() for col, campo in COL.items()}
        if not d['id']:
            continue
        d['version_original'] = previo.get(d['id'], {}).get('version_original', 'comun')
        if not d['full']:                        # número de Full: si la hoja no lo trae, se conserva
            d['full'] = previo.get(d['id'], {}).get('full', '')
        cat.append(d)
    # numeración: álbum en orden alfabético por id
    album = sorted(d['id'] for d in cat if d['tipo'] == 'Álbum')
    for d in cat:
        d['numero'] = '%03d/%03d' % (album.index(d['id']) + 1, len(album)) if d['tipo'] == 'Álbum' else 'Bonus'
    json.dump(cat, open(CAT, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(len(cat), 'diseños ·', len(album), 'en el álbum')


if __name__ == '__main__':
    main(sys.argv[1])
