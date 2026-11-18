#!/usr/bin/env python3
"""Generador de cartas de Insert Coin MX.

Lee cartas/catalogo.json (copia de la hoja "Narrativas TCG") y arma, para cada diseño,
sus tres versiones (común, holo y dorada) sobre las plantillas de cartas/plantillas/.

Uso (desde la raíz del repo):
    python3 cartas/generar.py                 # todas las cartas + actualiza index.html
    python3 cartas/generar.py --solo sonic god  # solo esos ids
    python3 cartas/generar.py --sin-web       # no toca index.html
    python3 cartas/generar.py --muestra       # además guarda cartas/muestra.jpg (hoja de contacto)

Salida:  c2/ (960×1340), c/ (480×670), d/ (640×800, solo si falta) y DESIGNS en index.html.
Detalles del sistema: cartas/SISTEMA.md
"""
import argparse, json, os, re, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(RAIZ, 'cartas')
PL = os.path.join(C, 'plantillas')

# ---------------------------------------------------------------- medidas (px a 960×1340)
VENTANA = (60, 252, 900, 824)          # x0, y0, x1, y1 del arte
MARGEN_ARTE = 0.06                     # aire alrededor del diseño dentro de la ventana
FUENTES = {
    'nombre': (os.path.join(RAIZ, 'f/AvenirNextLTPro-Bold.otf'), 60.0),
    'ref':    (os.path.join(RAIZ, 'f/AvenirNextLTPro-Bold.otf'), 49.2),
    'linea':  (os.path.join(C, 'fuentes/Carlito-Regular.ttf'), 29.8),
    'frase':  (os.path.join(C, 'fuentes/Carlito-Italic.ttf'), 25.8),
    'numero': (os.path.join(RAIZ, 'f/AvenirNextLTPro-Bold.otf'), 23.4),
}
#            x, tope de mayúsculas, ancho máximo
CAJA = {
    'nombre': (84, 152, 455),
    'ref':    (193, 926, 590),
    'ref2':   (193, 982, 590),
    'linea':  (86, 999, 800),
    'linea2': (86, 1053, 800),         # cuando la referencia ocupa 2 renglones
    'frase':  (75, 1132, 620),
    'numero': (148, 1250, 200),
}
BAJA_2RENGLONES = 28                   # ícono y "— GOTY" bajan esto con referencia de 2 renglones
ICONO_CENTRO = (125.5, 929.5)
ETIQUETAS = {'habilidad': (186, 884), 'goty': (790, 900)}
PASTILLA_POS = (50, 48)
TINTA = {'comun': (25, 18, 0), 'holo': (19, 17, 17), 'dorada': (25, 18, 3)}
LETRA = {'comun': 'b', 'holo': 'e', 'dorada': 'r'}
RAREZAS = ('comun', 'holo', 'dorada')
JPG_CALIDAD = 92


def cargar_plantillas():
    T = {}
    for r in RAREZAS:
        T['marco_' + r] = np.asarray(Image.open(os.path.join(PL, f'marco_{r}.png')).convert('RGB')).astype(np.float32)
    T['icono'] = np.asarray(Image.open(os.path.join(PL, 'icono.png'))).astype(np.float32)
    for k in ('habilidad', 'goty'):
        T[k] = np.asarray(Image.open(os.path.join(PL, f'etiqueta_{k}.png'))).astype(np.float32) / 255
    T['pastillas'] = {}
    for f in os.listdir(PL):
        if f.startswith('pastilla_'):
            T['pastillas'][f[9:-4]] = np.asarray(Image.open(os.path.join(PL, f))).astype(np.float32)
    T['oro'] = np.array(json.load(open(os.path.join(PL, 'rampa_oro.json'))), np.float32)
    return T


def pegar_alfa(img, rgba_o_alfa, x, y, color=None):
    """Compone una capa RGBA, o una máscara alfa con un color, en (x, y)."""
    if color is None:
        rgb, a = rgba_o_alfa[..., :3], rgba_o_alfa[..., 3:] / 255
    else:
        a = rgba_o_alfa[..., None]; rgb = np.array(color, np.float32)
    h, w = a.shape[:2]
    reg = img[y:y + h, x:x + w]
    img[y:y + h, x:x + w] = reg * (1 - a) + rgb * a


def ancho(ttf, tam, txt):
    b = ImageFont.truetype(ttf, tam).getbbox(txt)
    return b[2] - b[0]


def texto(img, clave, caja, txt, tinta, tam=None, k=4):
    """Escribe txt con la fuente de `clave` en la caja; lo achica si no cabe."""
    if not txt:
        return
    ttf, base = FUENTES[clave]
    x, tope, maxw = CAJA[caja]
    tam = tam or base
    while ancho(ttf, tam, txt) > maxw and tam > base * 0.55:
        tam -= 0.5
    f = ImageFont.truetype(ttf, tam * k)
    cap = f.getbbox('H'); b = f.getbbox(txt)
    W, H = b[2] + 40 * k, int(tam * k * 2.2)
    A = Image.new('L', (W, H), 0)
    ImageDraw.Draw(A).text((-b[0] + 8 * k, -cap[1] + 8 * k), txt, font=f, fill=255)
    a = np.asarray(A.resize((W // k, H // k), Image.LANCZOS)).astype(np.float32) / 255
    x0, y0 = int(round(x)) - 8, int(round(tope)) - 8
    a = a[:img.shape[0] - y0, :img.shape[1] - x0]
    pegar_alfa(img, a, x0, y0, tinta)


def partir_ref(ref, ref2):
    """Referencia en 1 o 2 renglones. Si no cabe en uno, se parte en el último espacio que quepa."""
    if ref2:
        return ref, ref2
    ttf, tam = FUENTES['ref']
    if ancho(ttf, tam, ref) <= CAJA['ref'][2]:
        return ref, ''
    if ' × ' in ref:                                   # se prefiere partir en el cruce: "A ×" / "B"
        a, b = ref.split(' × ', 1)
        if ancho(ttf, tam, a + ' ×') <= CAJA['ref'][2]:
            return a + ' ×', b
    pal = ref.split(' ')
    for i in range(len(pal) - 1, 0, -1):
        a, b = ' '.join(pal[:i]), ' '.join(pal[i:])
        if ancho(ttf, tam, a) <= CAJA['ref'][2]:
            return a, b
    return ref, ''


def fondo_de(arte):
    borde = np.concatenate([arte[:6].reshape(-1, 3), arte[-6:].reshape(-1, 3),
                            arte[:, :6].reshape(-1, 3), arte[:, -6:].reshape(-1, 3)])
    return np.median(borde, 0)


def acomodar_arte(arte, W, H, margen):
    """Recorta el diseño a su contenido y lo centra en W×H con el color de fondo del diseño."""
    bg = fondo_de(arte)
    m = np.linalg.norm(arte - bg, axis=2) > 30
    ys, xs = np.where(m)
    if len(xs) == 0:
        ys, xs = np.array([0, arte.shape[0] - 1]), np.array([0, arte.shape[1] - 1])
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    s = min(W * (1 - 2 * margen) / (x1 - x0), H * (1 - 2 * margen) / (y1 - y0))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    M = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
    return cv2.warpAffine(arte, M, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=bg.tolist())


def dorar(w, lut):
    """Mapa de luminancia → rampa de oro (sacada de las doradas originales)."""
    k = np.clip(w @ np.array([.299, .587, .114], np.float32), 0, 255)
    i = np.floor(k).astype(int); f = (k - i)[..., None]; j = np.minimum(i + 1, 255)
    return lut[i] * (1 - f) + lut[j] * f


def leer_arte(cid):
    a = Image.open(os.path.join(C, 'arte', cid + '.png')).convert('RGBA')
    fondo = Image.new('RGBA', a.size, (255, 255, 255, 255)); fondo.alpha_composite(a)
    return np.asarray(fondo.convert('RGB')).astype(np.float32)


def carta(T, d, rareza, ventana_arte):
    out = T['marco_' + rareza].copy()
    tinta = TINTA[rareza]
    # pastilla de categoría
    pegar_alfa(out, T['pastillas'][d['categoria']], *PASTILLA_POS)
    # nombre
    texto(out, 'nombre', 'nombre', d['nombre'], tinta)
    # caja de habilidad
    r1, r2 = partir_ref(d['ref'], d.get('ref2', ''))
    baja = BAJA_2RENGLONES if r2 else 0
    pegar_alfa(out, T['habilidad'], *ETIQUETAS['habilidad'], tinta)
    gx, gy = ETIQUETAS['goty']; pegar_alfa(out, T['goty'], gx, gy + baja, tinta)
    ic = T['icono']; h = ic.shape[0]
    pegar_alfa(out, ic, int(round(ICONO_CENTRO[0] - h / 2)), int(round(ICONO_CENTRO[1] + baja - h / 2)))
    texto(out, 'ref', 'ref', r1, tinta)
    if r2:
        texto(out, 'ref', 'ref2', r2, tinta, tam=None)
    texto(out, 'linea', 'linea2' if r2 else 'linea', d['linea'], tinta)
    texto(out, 'frase', 'frase', d['frase'], tinta)
    texto(out, 'numero', 'numero', d['numero'] if d['tipo'] == 'Álbum' else 'BONUS', tinta)
    # arte
    x0, y0, x1, y1 = VENTANA
    out[y0:y1, x0:x1] = dorar(ventana_arte, T['oro']) if rareza == 'dorada' else ventana_arte
    return np.clip(out, 0, 255).astype(np.uint8)


def archivo(d, rareza):
    """id.jpg es la versión original del diseño (así se conserva el progreso guardado); las otras llevan _letra."""
    return d['id'] if rareza == d['version_original'] else d['id'] + '_' + LETRA[rareza]


def guardar(img, d, rareza):
    n = archivo(d, rareza)
    Image.fromarray(img).save(os.path.join(RAIZ, 'c2', n + '.jpg'), quality=JPG_CALIDAD)
    Image.fromarray(cv2.resize(img, (480, 670), interpolation=cv2.INTER_AREA)).save(
        os.path.join(RAIZ, 'c', n + '.jpg'), quality=JPG_CALIDAD)


def guardar_d(arte, cid):
    p = os.path.join(RAIZ, 'd', cid + '.jpg')
    if not os.path.exists(p):
        Image.fromarray(np.clip(acomodar_arte(arte, 640, 800, 0.08), 0, 255).astype(np.uint8)).save(p, quality=90)


# ---------------------------------------------------------------- index.html
def actualizar_web(cat):
    p = os.path.join(RAIZ, 'index.html')
    src = open(p, encoding='utf8').read()
    i0 = src.index('const DESIGNS=['); i1 = src.index('];', i0) + 2
    viejas = {m.group(1): m.group(0) for m in re.finditer(r"\{id:'([a-z0-9]+)'[^}]*\}", src[i0:i1])}
    lineas = []
    for d in sorted(cat, key=lambda x: x['id']):
        vieja = viejas.get(d['id'], '')
        extra = ''.join(re.findall(r",(?:f|fk|al|cm):(?:\[[^\]]*\]|'[^']*'|[0-9]+)", vieja))
        ex = ''.join(LETRA[r] for r in RAREZAS if r != d['version_original'])
        no = int(d['numero'].split('/')[0]) if d['tipo'] == 'Álbum' else 0
        bx = ',bx:1' if d['tipo'] != 'Álbum' else ''
        if d['full'] and ',f:' not in extra:
            extra += ',f:%d' % int(d['full'][1:])
        n = d['nombre'].replace('\\', '\\\\').replace('"', '\\"')
        lineas.append("{id:'%s'%s,ex:'%s',n:\"%s\",cat:'%s',r:'%s',no:%d%s}" %
                      (d['id'], bx, ex, n, d['categoria'], d['version_original'], no, extra))
    nuevo = 'const DESIGNS=[\n' + ',\n'.join(lineas) + '];'
    src = src[:i0] + nuevo + src[i1:]
    # ABOX: caja del contenido de d/<id>.jpg (la usan el Tier y las Retas para encuadrar el arte)
    m = re.search(r'const ABOX=(\{.*?\});', src)
    if m:
        abox = json.loads(m.group(1))
        for d in cat:
            if d['id'] not in abox:
                a = np.asarray(Image.open(os.path.join(RAIZ, 'd', d['id'] + '.jpg')).convert('RGB')).astype(np.float32)
                ys, xs = np.where(np.linalg.norm(a - fondo_de(a), axis=2) > 30)
                h, w = a.shape[:2]
                abox[d['id']] = [round(xs.min() / w, 3), round(ys.min() / h, 3), round((xs.max() + 1) / w, 3), round((ys.max() + 1) / h, 3)]
        src = src[:m.start(1)] + json.dumps(abox, separators=(',', ':')) + src[m.end(1):]
    open(p, 'w', encoding='utf8').write(src)


def muestra(cat):
    W, H = 240, 335
    ids = [d for d in cat]
    filas = (len(ids) * 3 + 8) // 9
    sh = Image.new('RGB', (W * 9, H * filas), 'white')
    for k, d in enumerate(ids):
        for j, r in enumerate(RAREZAS):
            n = k * 3 + j
            im = Image.open(os.path.join(RAIZ, 'c', archivo(d, r) + '.jpg')).resize((W, H))
            sh.paste(im, ((n % 9) * W, (n // 9) * H))
    sh.save(os.path.join(C, 'muestra.jpg'), quality=82)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', nargs='*')
    ap.add_argument('--sin-web', action='store_true')
    ap.add_argument('--muestra', action='store_true')
    a = ap.parse_args()
    cat = json.load(open(os.path.join(C, 'catalogo.json'), encoding='utf8'))
    T = cargar_plantillas()
    sel = [d for d in cat if not a.solo or d['id'] in a.solo]
    x0, y0, x1, y1 = VENTANA
    for d in sel:
        arte = leer_arte(d['id'])
        w = acomodar_arte(arte, x1 - x0, y1 - y0, MARGEN_ARTE)
        for r in RAREZAS:
            guardar(carta(T, d, r, w), d, r)
        guardar_d(arte, d['id'])
        print('ok', d['id'])
    if not a.sin_web:
        actualizar_web(cat)
    if a.muestra:
        muestra(cat)


if __name__ == '__main__':
    main()
