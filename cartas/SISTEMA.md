# Sistema de cartas · Insert Coin MX

Cada carta se **genera a partir de datos**. Nadie edita imágenes de carta a mano: se cambia el dato o
la plantilla y se vuelve a correr el generador.

```
Hoja "Narrativas TCG" (Drive)  →  cartas/catalogo.json  →  cartas/generar.py  →  c/ c2/ d/ + index.html
         textos                       copia en git             plantillas + arte
```

## 1. Fuente de verdad: la hoja

Hoja de Google: **Insert Coin MX — Narrativas TCG**, pestaña *Narrativas TCG*. Una fila = un diseño.

| Columna | Qué es | Regla |
|---|---|---|
| Diseño | Nombre del diseño = nombre en la carta | Corto. Más de ~16 caracteres se achica |
| Imagen | Miniatura (fórmula, sale de `d/`) | No editar |
| Diseñado por | Jos o Mago | Lista |
| ID del juego (interno) | id del diseño (`fck`, `abuket`…) | **Nunca cambiar** (el progreso de los jugadores lo usa) |
| Categoría | GAMER · ANIME · PELÍCULAS · CARICATURAS · OTROS | Una de esas cinco |
| Número | `001/076`… o `Bonus` | Lo calcula el sistema (alfabético por id) |
| Habilidad · referencia | Franquicia o referencia (negritas) | ≤ 24 caracteres en un renglón |
| Habilidad · referencia (2ª línea) | Opcional, si la referencia es larga | Si va vacía y no cabe, se parte sola en el «×» |
| Habilidad · línea | Qué es el diseño, en concreto, sin chiste | ≤ 54 caracteres |
| Frase en carta | El guiño, en itálica | ≤ 46 caracteres |
| Tipo | `Álbum` o `Bonus · nunca producida` | Bonus = no sale en sobres normales, sin número |
| Full | Número de la ilustración completa (`F01`…`F42`) | Solo si existe |
| Arte | Archivo en `E:\icmx\fichas\` | `diseños/` o `nunca salieron/` |
| Estado carta | Propuesta · revisar / Aprobada | Control editorial |

Voz de los textos: la **línea** es la habilidad: lo que la carta hace, como efecto de juego de cartas de mentira, empieza con verbo y no repite el chiste de la frase; la **frase** guiña
(nostalgia, humor mexicano). Sin datos históricos inventados: si no estamos seguros, no va.
Las columnas de narrativa (Dorada = curiosidad, Holo = concepto) son para la vista de lectura del
juego, no para el frente de la carta.

## 2. Estructura de la carta (960 × 1340 px)

```
┌──────────────────────────────────────────┐
│ (CATEGORÍA)          ◢■ ● INSERT COIN MX │  pastilla 50,48 · pestaña fija
│ ┌──────────────────────┬───────────────┐ │
│ │ Nombre               │ VALOR ● 100   │ │  nombre x84, tope 152, Avenir Next Bold 60, máx 455 px
│ └──────────────────────┴───────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │  ventana del arte 60,252 → 900,824 (840×572)
│ │              ARTE                    │ │  el diseño se recorta a su contenido y se centra
│ │                                      │ │  con 6 % de aire, sobre su propio color de fondo
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ (✦) HABILIDAD ESPECIAL            —  │ │  ícono centro 125.5,929.5 · etiqueta 186,884
│ │     Referencia                   GOTY│ │  ref x193, tope 926, Avenir Next Bold 49.2
│ │ Habilidad (efecto de juego)          │ │  línea x86, tope 999, Lato (Carlito) 37.2; si no cabe, 2 renglones (interlínea 1.2)
│ └──────────────────────────────────────┘ │  con referencia de 2 renglones: 2º renglón tope 982,
│ ┌──────────────────────────────┬───────┐ │  línea tope 1045 (1 renglón), ícono y GOTY bajan 28 px
│ │ Frase en itálica             │ ▚▚▚▚  │ │  frase x75, tope 1132, Lato Italic 29.7, máx 620 px
│ └──────────────────────────────┴───────┘ │
│ [Carta 001/076 │ ● Común │ Valor –]      │  número x148, tope 1250, Avenir Next Bold 23.4
└──────────────────────────────────────────┘
```

Si un texto no cabe en su ancho máximo, el generador baja el tamaño (hasta 55 %). Mejor acortar el texto.

## 3. Rarezas (las tres versiones de cada diseño)

| Versión | Letra | Marco | Arte | Tinta |
|---|---|---|---|---|
| Común ● | `b` | `marco_comun.png`: amarillo, borde crema | a color, tal cual | #191200 |
| Holo ★ | `e` | `marco_holo.png`: todo iridiscente con cuadros | a color, tal cual | #131111 |
| Dorada ★★★ | `r` | `marco_dorada.png`: oro cepillado | **dorado**: luminancia → `rampa_oro.json` | #191203 |
| Full ★★ | `f` | `cartas/full/<id>.jpg` a sangre + velo oscuro abajo (ver §5b) | ilustración completa | blanco / amarillo |

Los marcos, pastillas, ícono, etiquetas y la rampa de oro están en `cartas/plantillas/`. Se sacaron
del acabado aprobado de las cartas (18 nov 2026). Para cambiar el look de una rareza se edita
su `marco_*.png` y se regenera todo.

## 4. Archivos que produce

- `c2/<archivo>.jpg`: 960×1340 (sobre, carta ampliada, menú) · `c/<archivo>.jpg`: 480×670 (álbum)
- `<archivo>` = `id` para la **versión original** del diseño y `id_<letra>` para las otras dos.
  La versión original (`version_original` en el catálogo) es la que tenía el diseño cuando era de una
  sola rareza: así el progreso guardado sigue apuntando a la misma carta. No se cambia.
- `d/<id>.jpg`: 640×800, arte del diseño para Tier y Retas (solo se crea si falta).
- `index.html`: reescribe `DESIGNS` (nombre, categoría, número, `r`, `ex`, `bx`, `f`) y agrega a `ABOX`
  los diseños nuevos. Lo demás del juego no se toca.

## 5. Agregar un diseño nuevo

**Proceso fijo** (Jos lo definió el 19 nov). Cuando dice "subí diseños nuevos" (a
`E:\icmx\fichas\diseños\` o `nunca salieron\`):

**A. Detectar**
1. Listar la carpeta y comparar contra `catalogo.json` (y mtime) para ver diseños nuevos y diseños
   existentes con arte reemplazado. Revisar los diseños en una hoja de contacto antes de escribir.

**B. Cartas (repo)**
2. Copiar el arte a `cartas/arte/<id>.png`. Arte reemplazado: borrar `d/<id>.jpg` y su entrada en `ABOX`
   de index.html antes de regenerar (el generador solo crea `d/` si falta).
3. Si el diseño no tiene fila en la hoja, Claude redacta nombre, categoría, referencia, línea y frase a
   partir del diseño (sin inventar datos históricos) y los agrega al catálogo; también `habilidad` y
   `frase` en `content/card-texts.js` (el validador exige que coincida con DESIGNS) y sube el `?v=` del script.
4. `python3 cartas/generar.py` completo (cambia el total `/NNN` y renumera todo) y `node content/validate.mjs`.
5. Rama aparte + PR. **No fusionar a main sin autorización de Jos** (este flujo no está autorizado como el de las Full).
6. Mostrar a Jos la hoja de contacto de las cartas nuevas.

**C. Hoja "Narrativas TCG" (Drive)** — las filas nuevas deben quedar idénticas a las existentes:
7. Escribir cada fila: Diseño, miniatura (B), K id, L categoría, M número, N/O referencia, P línea,
   Q frase, R tipo, T arte, U `Propuesta · revisar`. **Sin notas en la columna J** ni ninguna marca que
   las distinga de las demás.
8. Miniatura (B): `=IMAGE("https://raw.githubusercontent.com/llochua/insertcoinmx/<rama>/d/"&K<fila>&".jpg")`
   apuntando a la rama donde ya existe `d/<id>.jpg` (comprobar que responde 200). Al publicar en main,
   cambiarla a la ruta normal. Arte reemplazado: actualizar también su miniatura.
9. Formato: copiar el formato de una fila normal del **álbum** (no de una bonus: esas tienen fondo
   rosa en A:C). Alto de fila **120 px** como todas.
10. Listas desplegables (el formato copiado NO las trae): aplicar `setDataValidation` a C (Diseñado por:
    Jos / Mago) y H:I (Estado dorada / holo: Pendiente / En revisión / Aprobado) en las filas del álbum.
11. Reescribir la columna M (Número) de todas las filas con la nueva numeración.
12. Ordenar A2:AA por Número y luego por ID: el álbum queda 001→NNN (alfabético por ID, igual que las
    cartas) y las "nunca salieron" (Bonus) al fondo, también alfabéticas. Verificar que las miniaturas
    sigan correspondiendo a su fila.
13. Lo que sale de Jos se deja vacío y se le pide: Diseñado por, relato original y concepto (D, F).

Cambiar un texto: corregir la hoja → catálogo → `python3 cartas/generar.py --solo <id>`.

## 5b. Full (ilustración completa)

La Full también se genera. **La fuente es la ilustración**: `cartas/full/<id>.jpg` (vertical 2:3, sin texto).
Si ese archivo existe, el diseño tiene Full.

Actualizar o agregar Full:
1. Guarda la ilustración en `E:\icmx\fichas\fullillustrations\` con el **id del diseño** como nombre
   (`arcade.png`). Excepciones ya registradas: `evilexcess`→evilexes, `finishhim`→fatality,
   `worldwarrior`→theworldwarrior, `zodiaco`→zodiac.
2. Pídele a Claude "actualiza las Full" (o cópiala a `cartas/full/<id>.jpg`, máx. 1024 px de ancho).
3. `python3 cartas/generar.py --fulls`.

- Número: las Full conservan su `F##`; una nueva toma el siguiente (por id) y se guarda en el catálogo.
  Al cambiar el total (`/49`) se rehacen todas solas.
- Encuadre: llena 960×1340; si sobra alto se recorta 30 % arriba / 70 % abajo (el héroe va arriba).
- Velo: oscurece desde y=700 hasta 95 % abajo, para que nombre, habilidad y frase se lean con cualquier
  ilustración. Valores en `F_VELO` de `generar.py`.
- Capas: `plantillas/full_marca.png` (pestaña INSERT COIN MX), pastilla de categoría, nombre blanco,
  VALOR + moneda blanca (`full_moneda.png`) + 100, HABILIDAD ESPECIAL, ✦ referencia y — GOTY en amarillo,
  frase en pastilla amarilla, pie `Carta F02/49 · ★★ Ilustración · Valor –`.
- Salida: `c2/F_<id>.jpg`, `c/F_<id>.jpg` y `fa/<id>.jpg` (600×900, ilustración limpia).
  Los nombres viejos se respetan (`F_worldwarrior`, `F_zodiaco`, por `fk` en `DESIGNS`).

## 6. Requisitos

Python 3 con `numpy`, `opencv-python` y `Pillow`. Fuentes: Avenir Next LT Pro (`f/`, de Jos) y Carlito
(`cartas/fuentes/`, licencia OFL, mismas formas que Lato).


## Caché de imágenes (IMGV)

Las imágenes de cartas se piden con `?v=IMGV` (constante en index.html). Cada vez que se **reemplaza** un
arte existente (Arte Especial actualizado, diseño con arte nuevo), subir `IMGV` (p. ej. `20261120a` → `20261120b`)
en el mismo commit; si no, los navegadores siguen mostrando la imagen vieja.
