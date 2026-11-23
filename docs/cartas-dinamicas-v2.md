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
   Mantiene POP dentro de su espacio, renderiza el pie completo sin textos impresos,
   usa un rayo vectorial para habilidad y rarezas Base 0 / Holo 1 / Dorada 2 / Full 3 estrellas.
3. `content/card-data-adapter.js` mapea los IDs y variantes persistentes del juego
   al catálogo editorial; separa POP comunitario (nunca inventado) y PTS por rareza,
   ofrece numeración abierta `089/???` cuando se solicita sin cambiar datos ni IDs.
4. El **LAB ya existente** de sobres ilimitados se usa para comparar cartas desde el PR #137, sin crear otro laboratorio.
5. `qa/card-renderer.test.mjs` y `qa/card-data-adapter.test.mjs` validan
   los ID, numeración, variantes, Bonus, POP, PTS y catálogo completo.
6. La validación de CI **incluye** ambas pruebas y `py_compile`.

Este PR **no cambia index.html ni el juego principal**; no publica ni cambia
cartas de jugadores, claves, colecciones, Supabase, Auth, odds ni estados de rareza.

## Prueba local

Desde la raíz del repo, con Python (numpy, opencv-python, pillow) y Node 22:

```sh
python cartas/generar-shells.py 1up sonic abuket
node --test qa/card-renderer.test.mjs qa/card-data-adapter.test.mjs
python -m http.server 8000
```

Para comparación visual, abrir el **LAB original** del PR #137 (rama `feature/cartas-dinamicas-en-lab`),
menú `LAB · ∞ SOBRES` → `Comparar cartas dinámicas`. Ahí están las 22 bases de muestra.
No se crea una segunda pantalla de prueba independiente. Los WebP antiguos no se modifican.

**Las bases binarias de muestra se mantienen únicamente en el PR del LAB (#137)**;
este PR técnico contiene el generador y el motor, sin archivos WebP nuevos.

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

## Revisión de salida antes de integrar en producción

- [x] Diseño aprobado visualmente para Base en LAB (POP puede quedar un poco alto; tolerancia aceptada).
- [x] Holo 1 estrella / Dorada 2 / Full 3. Habilidad = rayo, no estrellas.
- [x] Pie dinámico sin textos antiguos impresos ni parches de valor/número.
- [x] Tests de LAB: sobres infinitos, Reta, aislamiento de cuentas y comparador móvil/escritorio.
- [x] Adaptador de 126 diseños y 452 variantes del catálogo de main, sin cambios a IDs.
- [ ] Evaluación visual final de las cuatro variantes por el editor (incluyendo Full y tamaño móvil).
- [ ] Prueba de rendimiento de álbum completo en dispositivos de gama media.
- [ ] Migrar funciones reales (sobres, zoom, fichas, álbum, ranking y Reta) bajo flag y fallback.
- [ ] Migrar **compartir/exportar PNG**; `shareGrid` aún depende de WebP antiguos.
- [ ] Generar las bases del catálogo completo **una sola vez**, verificando la fuente de cada arte y sin alterar los WebP anteriores.
- [ ] Conciliar el catálogo de main con los 5 diseños adicionales del PR #135 **sin fusionar por accidente**.
- [ ] Aprobar y ejecutar PR de integración solo con autorización explícita.

El LAB de PR #137 contiene 22 bases de ejemplo, no toda la biblioteca. **No anunciar migración terminada** hasta que cada punto pendiente tenga verificación.
