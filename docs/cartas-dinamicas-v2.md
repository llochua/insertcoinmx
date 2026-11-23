# Cartas dinámicas 2.0 — piloto controlado

**Estado:** experimental. No fusionar sin aprobación expresa. Rama aislada desde `main`, independiente de PR #135.

## Objetivo

Separar el arte y el acabado visual de los datos para evitar regenerar centenares de WebP
cuando cambian número/total del álbum, valor PTS, POP, nombre, categoría, habilidad o frase.

## Resultado de este primer PR (NO desplegar)

1. `cartas/generar-shells.py` crea archivos **nuevos** en `cs/` y `cs2/` para los
   IDs seleccionados. Deja las cartas existentes en `c/` y `c2/` intactas.
2. `content/card-renderer.js` ofrece `window.ICMX_CARD_RENDERER.create(card, rareza, opciones)`
   y combina cada base sin textos con capas SVG basadas en datos.
3. `qa/cards-dynamic-preview.html` muestra dos versiones lado a lado para pruebas manuales.
4. `qa/card-renderer.test.mjs` valida la numeración, versiones, aliases, bonus y valores.
5. El workflow de validación **incluye** este test y `py_compile`.

Este PR **no cambia index.html ni el juego principal**; no publica ni cambia
cartas de jugadores, claves, colecciones, Supabase, Auth, odds ni estados de rareza.

## Prueba local

Desde la raíz del repo, con Python (numpy, opencv-python, pillow) y Node 22:

```sh
python cartas/generar-shells.py 1up sonic abuket
node --test qa/card-renderer.test.mjs
python -m http.server 8000
```

Abrir `http://localhost:8000/qa/cards-dynamic-preview.html`.

Comparar Base, Holo, Dorada, Full (Sonic/Abuket); nombre largo, habilidad de dos líneas,
PTS de prueba, POP ausente/presente y número cambiante. Cambiar solo campos del formulario:
los WebP bajo `cs/` y `cs2/` NO deben cambiar.

**Las bases binarias de prueba NO se incluyeron en el PR:** deben generarse localmente.
El laboratorio reporta el archivo faltante; no superpone datos sobre los WebP antiguos,
porque estos contienen números y textos ya impresos.

## Propiedad de cada capa

| Componente | Fuente |
|---|---|
| Textura del marco y ventana de arte | `cartas/plantillas` + `cartas/arte/<id>.png` |
| Rareza Dorada | Rampa de oro aprobada en `generar.py` |
| Full | `cartas/full/<id>.jpg`, velo, diseño fijo de la plantilla |
| Categoría (pastilla) | `pastilla_<CATEGORIA>.png`, SVG |
| Nombre/referencia/habilidad/frase | `cartas/catalogo.json` (fuente editorial aprobada: Drive) |
| Número | `numero` + total editorial desde catálogo |
| PTS | Parámetro dinámico validado; por defecto Base 10 / Holo 25 / Dorada 50 / Full 100 |
| POP | Dato comunitario verificable; hasta entonces raya `—` |

NUNCA usar números de índice como identificador persistente. Mantener `id`,
`id_b/e/r/f` y aliases como en producción.

## Bloqueos para activar en el juego

- **Paridad visual obligatoria:** comparar con los WebP aprobados, especialmente tipografías,
  máscaras de etiqueta, alineaciones, resolución móvil, carteles Full y efectos de rareza.
  El uso de SVG para estos datos todavía es experimental, no hay paridad confirmada.
- **Rendimiento:** probar carga diferida de muchas cartas, memoria y 60 fps en móvil medio.
- **Exportación y compartir:** `shareGrid` usa actualmente WebP completos; migrarlo
  a la misma composición exacta (por Canvas o render SVG seguro) antes de activar.
- **Cobertura del juego:** sobres, apertura, álbum, ficha, zoom, ranking, Reta y portada.
- **Datos:** consolidar duplicados entre catálogo, textos aprobados de Drive y DESIGNS;
  no sobrescribir narrativas ni generar textos ficticios.
- **Full y Bonus:** numeración propia, ausencia de Full en ciertas cartas, alias.
- **QA/CI:** requiere GitHub Actions realmente ejecutadas y aprobadas; no basta
  con `action_required` ni un chequeo local.
- **PR #135:** depurar sus regeneraciones innecesarias por separado. La rama de este piloto
  parte de main y **no incorpora** los siete nuevos artes del PR #135.

## Criterio para el siguiente PR

Solo después de pasar la comparativa visual y funcional se conecta el renderizador
a las pantallas reales, con un flag de activación y fallback temporal controlado.
La migración inicial puede generar bases sin textos una sola vez. Después se regeneran
**exclusivamente** los diseños cuyo arte o plantilla gráfica haya cambiado;
el catálogo y los valores NO disparan cambios de WebP.

**No fusionar, no activar y no reiniciar cuentas sin autorización.**
