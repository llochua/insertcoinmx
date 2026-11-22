# DS-ART-01 · Fondo continuo de ilustraciones

**Estado:** REGLA DE PRODUCTO VIGENTE, acordada previamente. No es una propuesta de rediseño ni una preferencia nueva. La implementación correctiva existe en el PR #130; **no está fusionada a `main`**.

## Principio no negociable

**TODAS las ilustraciones de Insert Coin MX tienen un fondo sólido integrado en el archivo original.** En la pantalla de revelación, vista completa de ilustración y módulo protagonista del resumen, se debe **leer ese mismo color desde el borde del archivo mostrado y extenderlo como un único color plano en todo el escenario**.

Nunca reconstruir el fondo de la ilustración con una paleta inventada ni aplicarle un fondo distinto por rareza, categoría, pantalla o lugar del código.

### Ejemplo

Si `d/gatosamurai.webp` tiene un fondo sólido azul, toda el área exterior al arte dentro del escenario debe ser exactamente ese azul. Las cartas y los controles flotan sobre el escenario, pero el jugador no debe reconocer el rectángulo original de la imagen.

## Orden de verdad

1. **Fuente primaria obligatoria:** píxeles del borde de la imagen cargada realmente (WebP/JPG), no del retrato de la carta pequeña ni de la ilustración del menú.
2. **Caché por archivo de imagen:** `d/id.webp` y `fa/Full.webp` pueden tener fondos diferentes aunque correspondan al mismo diseño. No cachear solo por ID de diseño.
3. **Valor preexistente `RBG/ICOL`:** únicamente respaldo temporal mientras carga la imagen o si la lectura de píxeles falla. Nunca anteponer el valor manual al color medido.
4. **Error de carga:** el juego continúa usable; no bloquear una carta por una imagen ausente. Los colores de respaldo deben revisarse como defectos visuales cuando se recupera la imagen.
5. **Cambio de carta:** ignorar respuestas de cargas antiguas mediante identidad de diseño/archivo. No mostrar la imagen nueva sobre el color anterior durante la lectura.

## Geometría y presentación

- El contenedor `.disc.dx:not(.cov)` cubre el **100 % del viewport** (`position:fixed; inset:0`). Su `background-color` debe ser el color leído de la ilustración y `background-image:none`.
- En el resumen, el bloque `.rs2 .rh.dx` repite la misma regla con el **mismo archivo fuente** que está mostrando.
- El arte nunca es transparente. No añadir un rectángulo detrás de `.dx-art` / `.ab` ni incluir una caja `neu` como solución permanente.
- No introducir **degradados de fondo**, manchas oscuras, halos, viñetas, imágenes desenfocadas ni fondo radial para extender la ilustración. Esto incluye la antigua excepción `.dx.v-r` de Dorada.
- Los efectos de colección / holo / gold pertenecen al diseño de la carta y a los sellos. Un material de rareza no debe teñir todo el lienzo de color sólido.
- `.dx-fade` es una capa de **legibilidad del texto**, independiente del color de fondo del escenario; si llega a causar un corte visible con la ilustración, debe corregirse como un problema separado.
- Los encuadres `ABOX` pueden recortar el centro para dar peso al diseño, pero el fondo exterior y el del archivo debe ser continuo.
- Para una Full con arte cinematográfico, la imagen visible conserva su composición `cover`; el color de fondo auxiliar se toma del archivo Full correspondiente, nunca del Base.

## Implementación compartida (una sola fuente de código)

- `content/artwork-background.js`: muestrea la franja exterior de la imagen real, agrupa pequeñas variaciones de compresión y devuelve un RGB **tomado de los píxeles de la imagen** (no promedio inventado).
- `content/artwork-background.css`: fondo plano, cierre de la antigua excepción Dorada, ocultación temporal del arte hasta resolver el color y exclusión de material que tiñe toda la escena.
- `index.html`: `dcol(id,src)` prioriza `AUTO_BG_COLORS[src]`; `resolveArtworkBackground` actualiza `--bg` en la revelación y resumen.
- `qa/design-system/index.html`: la misma implementación, sin cuenta/Sync; permite probar con sobres ilimitados.
- `scripts/check-artwork-background.mjs`: chequeos estáticos y pruebas unitarias de color con muestras sintéticas.
- `qa/design-system-browsers.mjs`: prueba de Chromium para las variantes Base, Holo, Dorada y Full, además del resumen en móvil 320 y 390 px; conserva capturas.

## Criterios de aceptación obligatorios

- [ ] Imagen y superficie exterior **coinciden en RGB**, sin costura, bordes ni cambios de tono visibles.
- [ ] Fondo plano cubre el viewport en revelación y el área protagonista del resumen.
- [ ] Cambiar entre diseño, variante y carta no conserva el color del anterior.
- [ ] Base / Holo / Dorada / Full leen el archivo que efectivamente muestran.
- [ ] Resultados consistentes a 320, 360, 390, 430, 768 y 1024 px.
- [ ] Todas las pruebas CI pasan, y se aprueban capturas reales antes de fusionar.

> **Regla de mantenimiento:** un PR que modifique la revelación, el resumen, `artOf`, `ABOX`, el encuadre o los estilos `.dx` debe comprobar DS-ART-01. No se acepta introducir una nueva lista manual de colores o un parche individual para una ilustración.
