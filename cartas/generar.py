#!/usr/bin/env python3
"""Generador de cartas de Insert Coin MX.

Lee cartas/catalogo.json (copia de la hoja "Narrativas TCG") y arma, para cada diseño,
sus tres versiones (común, holo y dorada) sobre las plantillas de cartas/plantillas/,
y su Full si existe la ilustración en cartas/full/<id>.jpg.

Uso (desde la raíz del repo):
    python3 cartas/generar.py                 # todas las cartas + actualiza index.html
    python3 cartas/generar.py --solo sonic god  # solo esos ids
    python3 cartas/generar.py --sin-web       # no toca index.html
    python3 cartas/generar.py --muestra       # además guarda cartas/muestra.jpg (hoja de contacto)
    python3 cartas/generar.py --fulls         # solo las Full (ilustración completa, de cartas/full/<id>.jpg)

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
    'linea':  (os.path.join(C, 'fuentes/Carlito-Regular.ttf'), 37.2),   # +25 % (19 nov): se lee en celular
    'frase':  (os.path.join(C, 'fuentes/Carlito-Italic.ttf'), 29.7),    # +15 % (19 nov)
    'numero': (os.path.join(RAIZ, 'f/AvenirNextLTPro-Bold.otf'), 23.4),
}
#            x, tope de mayúsculas, ancho máximo
CAJA = {
    'nombre': (84, 152, 455),
    'ref':    (193, 926, 590),
    'ref2':   (193, 982, 590),
    'linea':  (86, 999, 800),
    'linea2': (86, 1045, 800),         # cuando la referencia ocupa 2 renglones
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
    T['full_marca'] = np.asarray(Image.open(os.path.join(PL, 'full_marca.png'))).astype(np.float32)
    T['full_moneda'] = np.asarray(Image.open(os.path.join(PL, 'full_moneda.png'))).astype(np.float32)
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


def texto(img, clave, caja, txt, tinta, tam=None, k=4, dy=0):
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
    x0, y0 = int(round(x)) - 8, int(round(tope + dy)) - 8
    a = a[:img.shape[0] - y0, :img.shape[1] - x0]
    pegar_alfa(img, a, x0, y0, tinta)


INTERLINEA_LINEA = 1.2                 # habilidad en 2 renglones: separación = tamaño × esto


def texto_habilidad(img, caja, txt, tinta):
    """Habilidad: 1 renglón si cabe; si no, 2 renglones parejos (solo sin referencia de 2 renglones).
    Si aun así no cabe, se achica como cualquier texto."""
    ttf, base = FUENTES['linea']
    maxw = CAJA[caja][2]
    if not txt or ancho(ttf, base, txt) <= maxw or caja == 'linea2':
        return texto(img, 'linea', caja, txt, tinta)
    pal = txt.split()
    cortes = [(' '.join(pal[:i]), ' '.join(pal[i:])) for i in range(1, len(pal))]
    a, b = min(cortes, key=lambda c: max(ancho(ttf, base, c[0]), ancho(ttf, base, c[1])))
    tam = base
    while max(ancho(ttf, tam, a), ancho(ttf, tam, b)) > maxw and tam > base * 0.55:
        tam -= 0.5
    texto(img, 'linea', caja, a, tinta, tam=tam)
    texto(img, 'linea', caja, b, tinta, tam=tam, dy=tam * INTERLINEA_LINEA)


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
    texto_habilidad(out, 'linea2' if r2 else 'linea', d['linea'], tinta)
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



# ---------------------------------------------------------------- Full (ilustración completa)
# Fuente: cartas/full/<id>.jpg (la ilustración tal cual, vertical 2:3). Si existe, el diseño tiene Full.
FULL_DIR = os.path.join(C, 'full')
F_TINTA = (20, 18, 24)                 # tinta de pastilla, pestaña y frase
F_AMARILLO = (255, 210, 31)
F_BLANCO = (255, 255, 255)
F_ESQUINA = (9, 9, 11)                 # color fuera de la esquina redonda
F_RADIO = 44
F_ENCUADRE = 0.30                      # si sobra alto, se recorta 30 % arriba / 70 % abajo (el héroe va arriba)
# velo oscuro para que el texto se lea sobre cualquier ilustración: (y, opacidad)
F_VELO = [(700, 0.0), (860, 0.50), (1000, 0.84), (1120, 0.92), (1340, 0.95)]
F_VELO_COLOR = (12, 10, 22)
FT = {  # fuente, tamaño
    'nombre': ('f/AvenirNextLTPro-Bold.otf', 64), 'valor': ('f/AvenirNextLTPro-Bold.otf', 78),
    'etq':    ('f/AvenirNextLTPro-Demi.otf', 21), 'ref':   ('f/AvenirNextLTPro-Bold.otf', 38),
    'goty':   ('f/AvenirNextLTPro-Bold.otf', 38), 'frase': ('cartas/fuentes/Carlito-Regular.ttf', 30),
    'pie':    ('f/AvenirNextLTPro-Bold.otf', 23.4),
}


def escribir(img, clave, txt, x, tope, color, maxw=9999, align='l', alfa=1.0, track=0, k=4):
    """Texto libre: x es la orilla izquierda (align l), derecha (r) o el centro (c); tope = tope de mayúsculas."""
    if not txt:
        return 0
    ttf, base = FT[clave]; ttf = os.path.join(RAIZ, ttf); tam = base
    def mide(t):
        f = ImageFont.truetype(ttf, t)
        return sum(f.getlength(ch) for ch in txt) + track * (len(txt) - 1) if track else f.getlength(txt)
    while mide(tam) > maxw and tam > base * 0.55:
        tam -= 0.5
    w = mide(tam)
    f = ImageFont.truetype(ttf, tam * k); cap = f.getbbox('H')
    W, H = int(w * k + 80 * k), int(tam * k * 2.2)
    A = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(A)
    cx = 8 * k
    for ch in (txt if track else [txt]):
        dr.text((cx, -cap[1] + 8 * k), ch, font=f, fill=255)
        cx += f.getlength(ch) + track * k
    a = np.asarray(A.resize((W // k, H // k), Image.LANCZOS)).astype(np.float32) / 255 * alfa
    x0 = x if align == 'l' else (x - w if align == 'r' else x - w / 2)
    x0, y0 = int(round(x0)) - 8, int(round(tope)) - 8
    a = a[:img.shape[0] - y0, :img.shape[1] - x0]
    pegar_alfa(img, a, x0, y0, color)
    return w


def estrella(img, cx, cy, r, color, puntas=5):
    """Estrella rellena (★) dibujada, para no depender de que la fuente tenga el glifo."""
    k = 4; S = int(r * 2 + 4) * k
    A = Image.new('L', (S, S), 0); pts = []
    for i in range(puntas * 2):
        ang = -np.pi / 2 + i * np.pi / puntas
        rr = r if i % 2 == 0 else (r * 0.45 if puntas == 5 else r * 0.2)
        pts.append((S / 2 + rr * k * np.cos(ang), S / 2 + rr * k * np.sin(ang)))
    ImageDraw.Draw(A).polygon(pts, fill=255)
    a = np.asarray(A.resize((S // k, S // k), Image.LANCZOS)).astype(np.float32) / 255
    pegar_alfa(img, a, int(round(cx - S / k / 2)), int(round(cy - S / k / 2)), color)


def cubrir(im, W, H, sesgo):
    """Escala la ilustración para llenar W×H y recorta lo que sobra (arriba/abajo según sesgo)."""
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2; y = int((im.height - H) * sesgo)
    return im.crop((x, y, x + W, y + H))


def carta_full(T, d, total):
    W, H = 960, 1340
    ilu = Image.open(os.path.join(FULL_DIR, d['id'] + '.jpg')).convert('RGB')
    out = np.asarray(cubrir(ilu, W, H, F_ENCUADRE)).astype(np.float32)
    # velo inferior
    ys, vs = zip(*F_VELO)
    v = np.interp(np.arange(H), ys, vs).astype(np.float32)[:, None, None]
    out = out * (1 - v) + np.array(F_VELO_COLOR, np.float32) * v
    # arriba: pestaña de marca y pastilla de categoría
    pegar_alfa(out, T['full_marca'], 0, 0)
    pegar_alfa(out, T['pastillas'][d['categoria']], 32, 30)
    # nombre y valor
    escribir(out, 'nombre', d['nombre'], 48, 922, F_BLANCO, maxw=590)
    escribir(out, 'etq', 'VALOR', 910, 892, F_BLANCO, align='r', alfa=0.7, track=4)
    wv = escribir(out, 'valor', '100', 910, 932, F_BLANCO, align='r')
    mo = T['full_moneda']; pegar_alfa(out, mo, int(910 - wv - 14 - mo.shape[1]), int(932 + 28 - mo.shape[0] / 2))
    # habilidad
    hab = T['habilidad']
    pegar_alfa(out, hab * 0.72, 48, 1006, F_BLANCO)
    estrella(out, 62, 1064, 15, F_AMARILLO, puntas=4)
    ref = (d['ref'] + ' ' + d.get('ref2', '')).strip()
    escribir(out, 'ref', ref, 84, 1050, F_AMARILLO, maxw=560)
    escribir(out, 'goty', '— GOTY', 910, 1050, F_AMARILLO, align='r')
    # frase en pastilla amarilla
    k = 4; x0, y0, x1, y1 = 48, 1116, 912, 1200
    A = Image.new('L', ((x1 - x0) * k, (y1 - y0) * k), 0); B = A.copy()
    ImageDraw.Draw(A).rounded_rectangle((0, 0, A.width - 1, A.height - 1), 20 * k, fill=255)
    ImageDraw.Draw(B).rounded_rectangle((3 * k, 3 * k, B.width - 1 - 3 * k, B.height - 1 - 3 * k), 17 * k, fill=255)
    a = np.asarray(A.resize((x1 - x0, y1 - y0), Image.LANCZOS)).astype(np.float32) / 255
    b = np.asarray(B.resize((x1 - x0, y1 - y0), Image.LANCZOS)).astype(np.float32) / 255
    pegar_alfa(out, a, x0, y0, F_TINTA); pegar_alfa(out, b, x0, y0, (245, 206, 46))
    escribir(out, 'frase', d['frase'], 78, 1145, F_TINTA, maxw=800)
    # pie
    num = 'F%02d/%02d' % (int(d['full'][1:]), total) if d['tipo'] == 'Álbum' else 'BONUS'
    escribir(out, 'pie', 'Carta ' + num, 48, 1262, F_BLANCO)
    wi = ImageFont.truetype(os.path.join(RAIZ, FT['pie'][0]), FT['pie'][1]).getlength('Ilustración')
    cx = 480 + 28; escribir(out, 'pie', 'Ilustración', cx, 1262, F_BLANCO, align='c')
    for i in range(2):
        estrella(out, cx - wi / 2 - 46 + i * 24, 1274, 11, F_AMARILLO)
    escribir(out, 'pie', 'Valor –', 912, 1262, F_BLANCO, align='r')
    # esquinas redondas
    M = Image.new('L', (W * 2, H * 2), 0)
    ImageDraw.Draw(M).rounded_rectangle((0, 0, W * 2 - 1, H * 2 - 1), F_RADIO * 2, fill=255)
    m = np.asarray(M.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    out = out * m + np.array(F_ESQUINA, np.float32) * (1 - m)
    return np.clip(out, 0, 255).astype(np.uint8)


def clave_full(d, viejas_fk):
    """Nombre de archivo de la Full: F_<id>, salvo los que ya tenían otro (F_worldwarrior, F_zodiaco)."""
    return viejas_fk.get(d['id']) or 'F_' + d['id']


def leer_fk():
    src = open(os.path.join(RAIZ, 'index.html'), encoding='utf8').read()
    return {m.group(1): m.group(2) for m in re.finditer(r"\{id:'([a-z0-9]+)'[^}]*fk:'([A-Za-z0-9_]+)'", src)}


def numerar_fulls(cat):
    """Las Full conservan su número; las nuevas (con ilustración y sin número) toman los siguientes, por id."""
    hay = {os.path.splitext(f)[0] for f in os.listdir(FULL_DIR)} if os.path.isdir(FULL_DIR) else set()
    usados = [int(d['full'][1:]) for d in cat if d.get('full')]
    n = max(usados or [0]); nuevos = []
    for d in sorted(cat, key=lambda x: x['id']):
        if d['id'] in hay and not d.get('full'):
            n += 1; d['full'] = 'F%02d' % n; nuevos.append(d['id'])
    return nuevos


def guardar_full(img, ilu_path, fk):
    Image.fromarray(img).save(os.path.join(RAIZ, 'c2', fk + '.jpg'), quality=JPG_CALIDAD)
    Image.fromarray(cv2.resize(img, (480, 670), interpolation=cv2.INTER_AREA)).save(
        os.path.join(RAIZ, 'c', fk + '.jpg'), quality=JPG_CALIDAD)
    cubrir(Image.open(ilu_path).convert('RGB'), 600, 900, 0.5).save(
        os.path.join(RAIZ, 'fa', fk[2:] + '.jpg'), quality=90)


# ---------------------------------------------------------------- index.html
def actualizar_web(cat):
    p = os.path.join(RAIZ, 'index.html')
    src = open(p, encoding='utf8').read()
    i0 = src.index('const DESIGNS=['); i1 = src.index('];', i0) + 2
    viejas = {m.group(1): m.group(0) for m in re.finditer(r"\{id:'([a-z0-9]+)'[^}]*\}", src[i0:i1])}
    lineas = []
    for d in sorted(cat, key=lambda x: x['id']):
        vieja = viejas.get(d['id'], '')
        extra = ''.join(re.findall(r",(?:fk|al|cm):(?:\[[^\]]*\]|'[^']*'|[0-9]+)", vieja))
        ex = ''.join(LETRA[r] for r in RAREZAS if r != d['version_original'])
        no = int(d['numero'].split('/')[0]) if d['tipo'] == 'Álbum' else 0
        bx = ',bx:1' if d['tipo'] != 'Álbum' else ''
        if d.get('full'):
            extra = ',f:%d' % int(d['full'][1:]) + extra
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
    # Nuevos diseños: publicar también el color real del fondo para el escenario
    # inmersivo. Respeta las paletas de RBG e ICOL ya ajustadas manualmente y
    # deja intactos los diseños antiguos que deliberadamente usan fondo neutro.
    m_bg = re.search(r'const RBG=(\\{.*?\\});', src)
    m_icol = re.search(r'const ICOL=(\\{.*?\\});', src)
    if m_bg:
        fondos = json.loads(m_bg.group(1))
        colores_previos = json.loads(m_icol.group(1)) if m_icol else {}
        for d in cat:
            ident = d['id']
            if ident in viejas or ident in fondos or ident in colores_previos:
                continue
            path_arte = os.path.join(RAIZ, 'd', ident + '.jpg')
            if not os.path.isfile(path_arte):
                continue
            arte = np.asarray(Image.open(path_arte).convert('RGB')).astype(np.float32)
            color = np.rint(fondo_de(arte)).astype(np.uint8)
            fondos[ident] = '#' + ''.join(f'{int(c):02x}' for c in color)
        src = src[:m_bg.start(1)] + json.dumps(fondos, separators=(',', ':')) + src[m_bg.end(1):]
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
    ap.add_argument('--fulls', action='store_true', help='solo las Full')
    a = ap.parse_args()
    cat = json.load(open(os.path.join(C, 'catalogo.json'), encoding='utf8'))
    T = cargar_plantillas()
    sel = [d for d in cat if not a.solo or d['id'] in a.solo]
    x0, y0, x1, y1 = VENTANA
    nuevos = numerar_fulls(cat)
    if nuevos:
        json.dump(cat, open(os.path.join(C, 'catalogo.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print('Full nuevas:', ', '.join(nuevos))
    total_f = sum(1 for d in cat if d.get('full') and d['tipo'] == 'Álbum')
    fks = leer_fk()
    # si se agregó una Full, cambia el total (/NN): se rehacen todas las Full
    sel_f = [d for d in cat if d.get('full') and os.path.exists(os.path.join(FULL_DIR, d['id'] + '.jpg'))
             and (not a.solo or d['id'] in a.solo or nuevos)]
    if a.fulls:
        sel = []
    for d in sel_f:
        guardar_full(carta_full(T, d, total_f), os.path.join(FULL_DIR, d['id'] + '.jpg'), clave_full(d, fks))
        print('ok full', d['id'])
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
