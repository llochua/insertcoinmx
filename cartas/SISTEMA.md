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

Voz de los textos: la **línea** describe (qué ves y qué tiene de especial); la **frase** guiña
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
│ │ Línea descriptiva                    │ │  línea x86, tope 999, Lato (Carlito) 29.8
│ └──────────────────────────────────────┘ │  con referencia de 2 renglones: 2º renglón tope 982,
│ ┌──────────────────────────────┬───────┐ │  línea tope 1053, ícono y GOTY bajan 28 px
│ │ Frase en itálica             │ ▚▚▚▚  │ │  frase x75, tope 1132, Lato Italic 25.8, máx 620 px
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
| Full ★★ | `f` | ilustración completa aparte (`fa/`, `c/F_*.jpg`) | — | — |

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

## 5. Agregar un diseño nuevo (3 pasos)

1. Pon el arte en `E:\icmx\fichas\diseños\` (o `nunca salieron\`) y cópialo a `cartas/arte/<id>.png`.
   Fondo plano y parejo en las orillas: de ahí se toma el color para rellenar la ventana.
2. Agrega su fila en la hoja (id nuevo, minúsculas y números) y pasa la hoja al catálogo:
   exporta la pestaña a CSV y corre `python3 cartas/hoja_a_catalogo.py archivo.csv`
   (o pídele a Claude que sincronice la hoja).
3. `python3 cartas/generar.py --muestra` y revisa `cartas/muestra.jpg`.

Cambiar un texto: corregir la hoja → paso 2 → `python3 cartas/generar.py --solo <id>`.

Agregar un diseño cambia el total (`/076`): corre el generador completo para renumerar todas.

## 6. Requisitos

Python 3 con `numpy`, `opencv-python` y `Pillow`. Fuentes: Avenir Next LT Pro (`f/`, de Jos) y Carlito
(`cartas/fuentes/`, licencia OFL, mismas formas que Lato).
