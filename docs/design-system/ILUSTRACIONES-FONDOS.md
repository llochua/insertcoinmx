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


## Estándar universal de fondos por píxeles · LAB (23 nov. 2026)

**Regla única, aplicable a cualquier diseño:** leer la ilustración que se está mostrando, detectar el color predominante de sus esquinas y perímetro, y aplicar ese mismo color al fondo de toda la pantalla. El dibujo mantiene intactos su tamaño, encuadre, archivo y proporciones. El fondo no se configura por nombre de carta.

**Implementación aislada en LAB:** \`qa/design-system/index.html\` usa \`bgFromArtwork(img)\` (muestreo de 48×60, predominancia en el borde y mediana robusta) y \`resolveArtworkBackground(d,D)\` (cambio de \`--bg\`, color de la escena y sincronización con la capa de arte al cargarse el archivo). La caché \`AUTO_BG_COLORS\` guarda resultados detectados para el siguiente fotograma; no es una lista editada a mano. Cuando falla la carga o el muestreo, el estado queda registrado para QA. No existe un \`if\` para un diseño concreto.

El diseño original de \`main\` se mantiene para la geometría y las variantes de carta. Base, Holo y Dorada usan el mismo detector. Las capas de foil de Holo/Dorada siguen transparentes y la variante Full conserva su fondo inmersivo original. No se duplica la imagen, no se usa \`cover\` para recortar el arte de origen y no se genera una imagen de fondo mediante un segundo canvas de 9-slice.

**Motivo:** la paridad de código con \`main\` por sí sola no resolvió los cortes de color detectados por el usuario. Por eso LAB tiene una única mejora de fondo, protegida por un contrato que exige que el resto de la presentación permanezca como en \`main\`. Los arreglos específicos previos (por ID y por variante) se descartan.

**Validación:** \`qa/design-system-browsers.mjs\` debe cargar realmente los archivos de todo el catálogo disponible y comprobar en el navegador que el fondo renderizado coincide con el resultado de analizar los píxeles de cada ilustración; probar Base, Holo y Dorada; conservar capturas de casos difíciles; seguir validando la independencia de los datos de Lab y las resoluciones móviles.

**Alcance:** solo ramas LAB asociadas a PR #130 y PR #137. Nunca se modifica o fusiona \`main\` sin autorización explícita.
