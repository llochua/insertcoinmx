# DS-ART-01 · Continuidad del fondo sólido de ilustraciones

**Regla histórica de Insert Coin MX.** Ya estaba definida antes del PR #130. No es una propuesta nueva ni autoriza rediseñar arte, revelaciones o materiales de rareza.

## La regla

- Todas las ilustraciones del juego cuentan con un fondo sólido integrado; no son ilustraciones transparentes.
- El fondo del escenario debe prolongar visualmente el **mismo color sólido del archivo original** hasta los límites del espacio de presentación, sin cortes ni recuadros detrás de la imagen.
- El arte conserva sus proporciones y composición; nunca se reemplaza ni se recorta arbitrariamente para disimular cortes.
- No insertar un degradado genérico como sustituto del color del archivo; los efectos narrativos y de legibilidad existentes se evalúan **separadamente** y no se cambian sin aprobación.
- Esta regla aplica a revelación, vistas de ilustración y resumen, con el tratamiento correspondiente a cada variante.

## Estado del código después de la revisión del laboratorio (22 nov. 2026)

**Importante:** la implementación de fondos de `main` es la referencia aprobada, según la experiencia reportada en el juego publicado. Al investigar el PR #130 se comprobó que su código original de color y presentación era **idéntico** al de `main` antes de experimentar con otra detección de color.

El intento de reescribir el muestreo de color y ocultar/eliminar overlays en la rama de pruebas provocó una discrepancia visual en el laboratorio. **Se revirtió íntegramente** de `index.html`, `qa/design-system/index.html`, scripts y CSS del PR. No se fusionó ningún cambio relacionado con los fondos a `main`.

Se conservan las funciones originales `dcol`, `bgFromArtwork`, `resolveArtworkBackground`, `ABOX` y las reglas visuales originales de `.disc.dx`, `.dx-art`, `.dx-fade` y `.rh`, tal como están en `main`. No agregar nuevos mecanismos mientras la comparación visual con `main` no demuestre una necesidad real.

## Contrato de cambios futuros

1. Hacer una captura de la misma carta y variante en `main` y en la rama de prueba, a la misma resolución.
2. Si `main` se ve bien y el laboratorio no, **corregir exclusivamente el laboratorio**; no asumir un bug del juego publicado.
3. Verificar **visualmente**, no solo por propiedad CSS: que el arte aparece, que no hay cortes entre la imagen y el fondo, que el texto no genera manchas y que se muestran Base/Holo/Dorada/Full y resumen.
4. Evitar pruebas engañosas: una coincidencia de RGB en el contenedor no garantiza la continuidad de los píxeles realmente renderizados.
5. No introducir transformaciones globales de arte o ajustes de color por capricho del sistema de componentes.
6. No fusionar al `main` sin revisión y aprobación visual. Si surge un hallazgo real, documentar **qué imagen y qué pantalla**, con capturas.

**Fuentes del sistema:** `index.html` (referencia del juego), `qa/design-system/index.html` (copia aislada, puede quedar desactualizada), `docs/design-system/README.md`.

## Estado de validación

- [x] Confirmado por comparación de contenido: el código de fondos del PR #130 **anterior al experimento** coincide con el de `main`.
- [x] Retirado del PR el experimento de muestreo, el CSS que ocultaba arte y la eliminación de degradados.
- [ ] Comparación visual directa de `main` y laboratorio para las mismas ilustraciones, además de validación del enlace externo.
- [ ] Aprobación final del usuario antes de fusionar el sistema de diseño.


## Estándar universal del fondo full · LAB (23 nov. 2026)

**Alcance: todos los diseños, sin excepciones por nombre.** La ilustración conserva su tamaño, proporciones y posición; el fondo original se extiende a todo el escenario. No es válido que el arte quede dentro de un rectángulo con un color distinto detrás.

Implementación en \`qa/design-system/index.html\`:
- Al cargarse la imagen, toma los píxeles del perímetro realmente visible del archivo.
- Construye el fondo de todo el escenario por extensión de los cuatro bordes y las esquinas (9-slice). Un fondo plano se vuelve un color continuo; un fondo con degradado mantiene su continuidad; no se usa \`cover\` para ampliar o recortar la imagen original.
- Opera sobre **Base, Holo y Dorada para cualquier ID**; Full usa su arte inmersivo original. El diseño no se rasteriza de nuevo y su \`img\` original permanece encima.
- El proceso no depende de \`AUTO_BG_IDS\`, \`ICOL\`, \`RBG\`, \`ABOX\` ni colores asignados manualmente para elegir el fondo. El encuadre existente de \`ABOX\` se respeta sin alterar la imagen.
- Al cambiar de carta o de dimensiones de pantalla se recalcula el fondo; también en la vista ampliada.
- Este cambio queda **únicamente en la copia aislada de LAB**. \`main\` no se modifica.

**Prueba de regresión:** \`qa/design-system-browsers.mjs\` comprueba el fondo generado frente a los píxeles de la imagen en Sonic, Recojo Cartón, Karma, Evil Exes y Robogodín, en móvil, y conserva capturas. No se aceptan soluciones por diseño ni por captura aislada.

**Estado:** implementación enviada a LAB; aprobación de apariencia sujeta a revisar capturas y resultados del navegador.
