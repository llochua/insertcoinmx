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


## Estándar de ilustraciones · LAB utiliza el motor original de main (23 nov. 2026)

**Fuente de verdad:** \`index.html\` de \`main\`. LAB no tiene un segundo motor de ilustraciones y no debe modificar la imagen original, encuadrarla distinto, ni extender sus bordes mediante otro canvas o un 9-slice.

El mismo código de \`main\` para \`dcol\`, \`hasCol\`, \`artBox\`, \`bgFromArtwork\` y \`resolveArtworkBackground\` se utiliza en \`qa/design-system/index.html\`, junto con el CSS original del escenario. El flujo \`showCard\` llama a \`resolveArtworkBackground(d,D)\`, exactamente como \`main\`.

El estándar de \`main\` usa \`RBG\` e \`ICOL\` para colores existentes y \`AUTO_BG_IDS\` para diseños cuyos colores se miden a partir del borde del archivo. **Cobertura comprobada: 126 entradas del catálogo fuente, ninguna sin resolver.** Esto describe la cobertura de código, no cuántas cartas están publicadas en el álbum.

Se retiraron de LAB los experimentos \`solidArtworkBackground\`, \`extendArtworkEdges\`, \`art-edge-extended\`, canvas de 9-slice, reglas CSS para forzar opacidad de la imagen y excepciones por diseño. No restaurarlos como parches independientes: cualquier cambio futuro del motor de arte debe verificarse primero en \`main\`, coordinarse y conservar la paridad.

**QA obligatorio** (\`qa/design-system-browsers.mjs\`): carga el \`index.html\` real de \`origin/main\`, compara las regiones fuente de arte con LAB, abre las cartas en ambos navegadores a 1280×900 y compara fondo calculado y píxeles exteriores de versiones Base. También comprueba Holo y Dorada (el foil animado no es píxel-estable) y la cobertura completa del catálogo. Hay capturas comparativas y pruebas móviles 320/390 px.

**Alcance:** esta restauración afecta solo a las dos ramas del laboratorio (PR #130 y PR #137). \`main\` no se modifica. Cualquier publicación sigue requiriendo revisión visual y aprobación explícita.
