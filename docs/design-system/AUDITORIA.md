# Auditoría de consistencia visual — 2026-11-22

**Repositorio:** `llochua/insertcoinmx` · **Rama examinada:** `main`  
**Método:** revisión estática de código HTML/CSS/JS del repositorio, no prueba visual/renderizada.  
**Referencia principal:** `index.html` SHA `c4e1cdcb9204bab07af8f766c43785ed6a4bbafc`. Archivos adicionales leídos: `content/community-value-ui.css`, `content/card-value-overlay.js`, `content/auth-account.js`, `content/avatar-profile.js`.

## Inventario técnico observado

| Medida en `index.html` | Resultado | Interpretación |
| --- | ---: | --- |
| Líneas | 4 342 | HTML, CSS y JS están fuertemente concentrados |
| Bloques `style` | 2 | Aproximadamente 186 780 caracteres de CSS embebido |
| Botones en markup | 95 | No implica 95 componentes distintos; falta catálogo canónico |
| SVG en markup | 30 | **No todos son íconos**: hay texturas decorativas y arte de respaldo |
| Atributos `style=` | 23 | Diferenciar estilos funcionales dinámicos de decisiones visuales fijas |
| Apariciones de `!important` | 359 | Indicio de acumulación de sobrescrituras y deuda de especificidad |
| Declaraciones `@keyframes` | 60 | Requiere consolidar y verificar reducción de movimiento |
| Apariciones de `#FFD400` en CSS embebido | 163 | Hay repetición de valores donde podrían emplearse tokens |

Estas cifras son conteos léxicos; no son un análisis de CSS computado ni indicadores de fallas visuales por sí solos.

## Hallazgos prioritarios

| ID | Prioridad | Hallazgo comprobado | Evidencia / lugar | Corrección |
| --- | --- | --- | --- | --- |
| I-01 | **P0** | Métricas de Perfil usan caracteres `✦`, `▣`, `★` como iconografía de UI | `index.html:2031–2034` | Sustituir por íconos SVG semánticos de diseños, repetidas y calificadas |
| I-02 | **P0** | Editar avatar usa `✎` como glifo, tanto en CSS como en markup | `index.html:1647, 2005` | Un solo ícono `edit` en el badge del avatar; quitar render duplicado |
| I-03 | **P0** | La misma función Volver mezcla SVG con carácter `←` | `index.html:1923, 1942, 1949, 1954, 1958, 2001` frente a `2108` | `IconButton/back` reutilizado, con un solo SVG y objetivo táctil estable |
| I-04 | **P1** | Respaldo manual usa flecha `↓` y chevron `⌄` como sustitutos de SVG | `index.html:2083` | Separar acción descargar de indicador desplegable; SVG de iconografía UI |
| I-05 | **P1** | Tamaños de controles relacionados no normalizados: `.sound-toggle` 36 px, `.vback` 38 px, `.ic-close` 44 px | `index.html:1199, 478, 1068` | Objetivo táctil mínimo 44 px y dibujo interno escalado |
| I-06 | **P1** | Botones primarios se definen por varias clases y estilos específicos: `.btn`, `.big`, `.mgo`, `.profile-action`, `.avatar-save`, `.ux-primary` | `index.html:56, 58, 437, 481, 483, 1495, 1668, 1188` | API única de botón con variantes + estados |
| I-07 | **P1** | Hay estilos de `.profile-action` con alturas 45, 43 y 39 px | `index.html:1495, 1596, 1782` | Definir talla y excepción por densidad; probar objetivo táctil efectivo |
| I-08 | **P1** | Solo se declaran tres tokens raíz globales (`--y`, `--ink`, `--dim`), mientras muchos colores/tamaños quedan directos | `index.html:45`; CSS restante | Tokens semánticos y aliases de transición |
| I-09 | **P1** | Escala textual amplia, incluyendo etiquetas de 6–9 px; riesgo de lectura móvil, aún sin prueba visual | CSS de `index.html` | Auditoría pantalla por pantalla de legibilidad, zoom y contraste |
| I-10 | **P1** | Numerosas sobrescrituras `!important` y reglas de interfaz agregadas a lo largo del archivo | `index.html`, estilos iniciales y secciones posteriores | Extraer capas y reducir especificidad gradualmente |
| I-11 | **P2** | El onboarding de apertura de sobre usa `👆` para gesto táctil | `index.html:1929` | Tratarlo como **ilustración/instrucción**, no como ícono del sistema; revisar consistencia |
| I-12 | **Excepción aceptable** | La calificación de diseños usa reacciones emoji deliberadas | `index.html:1381–1389, 3563` | Conservar semántica de reacción; no sustituir automáticamente por pictogramas UI |
| I-13 | **Excepción aceptable** | Algunas estrellas, SVG y CSS corresponden a rareza, efectos holo, textura y arte de carta | `index.html:718–743, 2365, 3309` | Mantener en la capa artística, no contarlas como deuda iconográfica por defecto |
| I-14 | **P2** | Estilos adicionales aislados para valor comunitario | `content/community-value-ui.css` | Documentar superficie/card overlay y conectar tokens sin tapar el arte |

**Cuidado:** `I-02` requiere inspeccionar el resultado renderizado antes de eliminar el pseudo-elemento; el código contiene dos fuentes posibles para el símbolo, pero no se afirma que ambos sean visibles simultáneamente.

## Cobertura por experiencia

| Área | Qué debe revisarse en fase visual | Estado |
| --- | --- | --- |
| Portada / Home | Tarjetas de navegación, pestañas, perfil, sonido, CTA y reloj | Estática completada; visual pendiente |
| Sobres | Volver, sonido, gesto rasgar, CTA, resumen, narrativas y error | Estática completada; visual pendiente |
| Álbum / ficha / zoom | Navegación, cierres, ampliación, calificación, valor POP y variantes | Estática completada; visual pendiente |
| Tier | Encabezado, compartir, chips, estados seleccionados y drag | Estática completada; visual pendiente |
| Reta | Encabezado, reroll, estados bloqueados, progreso 0–8 y acciones | Estática completada; visual pendiente |
| Récords | Jerarquía de métricas, tablero, avatar/ranking y estados vacíos | Estática completada; visual pendiente |
| Mi perfil | Avatar, métricas, cuenta, respaldo, CTA, ayuda y progreso | Hallazgos concretos I-01, I-02, I-04, I-07 |
| Acceso / registro / avatares | Volver, navegación, estados de formulario y selector | Hallazgo I-03; visual pendiente |
| Onboarding / modales | Cierre, paso anterior, puntos, botones y foco | Estática completada; visual pendiente |

## Riesgo principal

La deuda no parece ser “falta de estilo”; es **falta de una fuente de verdad**. Cada ajuste local puede añadir otro valor de radio, tamaño, botón o ícono; las siguientes mejoras quedan expuestas a regresiones, sobre todo en pantallas pequeñas. La solución es consolidar patrones, no hacer una sustitución masiva de CSS ni retocar ilustraciones.

## Límites de esta auditoría

No se inspeccionó el sitio desplegado en navegador ni se corrieron pruebas en móvil, capturas, contrastes calculados, lector de pantalla o flujos end-to-end. Por tanto **no** se certifica apariencia, alineación, contraste real ni funcionamiento responsivo. Las mediciones se refieren al snapshot consultado de `main`; cambios posteriores requieren revalidación.

## Salida

El contrato inicial se describe en [README](README.md) e [ICONOGRAFIA](ICONOGRAFIA.md); el trabajo pendiente, prioridades y aceptación están en [PLAN-MIGRACION](PLAN-MIGRACION.md).
