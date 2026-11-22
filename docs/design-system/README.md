# Insert Coin MX — Sistema de diseño

**Versión:** 0.1 · **Fecha:** 22 de noviembre de 2026  
**Estado:** propuesta documentada a partir de auditoría estática de `main`. **Todavía no está aplicada a la interfaz.**  
**Alcance:** El Álbum (inicio, sobres, álbum, Tier, Reta, Récords, perfil, acceso, avatares, onboarding, fichas y modales).

## Propósito

Unificar la interfaz sin borrar la personalidad arcade-retro ni alterar el arte de las cartas. Una misma acción debe verse y comportarse igual en todas las pantallas. Este documento distingue **lo observado** de **las decisiones propuestas**; las reglas propuestas se convierten en definitivas cuando se aprueben visualmente y se apliquen en código.

**Principios**

1. **Juego antes que decoración:** el contenido, las cartas y la progresión son protagonistas.
2. **Una acción, un patrón:** volver, cerrar, compartir, editar, sonido, confirmar y cancelar tienen representaciones reutilizables.
3. **Iconografía real y coherente:** no usar caracteres tipográficos como sustitutos de íconos de interfaz.
4. **Retro legible:** la tipografía pixel es identidad; el texto funcional debe ser fácil de leer en móvil.
5. **Acceso primero:** controles táctiles, foco visible, etiquetas accesibles y respeto a movimiento reducido.
6. **Cambios seguros:** migrar un componente a la vez, sin reescribir lógica de colección, Auth, nube o ranking.

## Capas del sistema

| Capa | Qué incluye | Regla |
| --- | --- | --- |
| **Identidad / arte** | Logo, moneda, cartas, sobre, avatares, efectos holo y dorado, elementos CRT | No convertir en íconos funcionales ni alterar ilustraciones |
| **Iconografía UI** | Flechas, cerrar, editar, búsqueda, compartir, sonido, descarga y métricas | SVG con la misma retícula, peso, tamaño y semántica |
| **Componentes** | Botones, encabezados, pestañas, progreso, tarjetas, diálogos, estados vacíos | Variantes y estados compartidos; no versiones nuevas por pantalla |

## Fundamentos visuales

Los siguientes valores parten de colores y fuentes **ya presentes**. Los nombres `--ic-*` son una **propuesta de normalización**, no variables actualmente conectadas en producción.

| Token propuesto | Valor | Uso recomendado |
| --- | --- | --- |
| `--ic-accent` | `#FFD400` | CTA principal, foco, selección, recompensa |
| `--ic-bg` | `#07060B` | Fondo exterior |
| `--ic-surface` | `#120F1A` | Superficie de panel |
| `--ic-surface-raised` | `#15112E` | Tarjetas o elementos elevados |
| `--ic-text` | `#F3F1FF` | Texto principal |
| `--ic-text-muted` | `#8B88B8` | Texto secundario, **verificar contraste antes de usar en cuerpo** |
| `--ic-danger` | `#E8323C` | Destructivo/error solo si se valida su uso semántico |

**Variables actuales observadas:** `--y`, `--ink`, `--dim` en `index.html:45`. Se mantendrán como alias durante la migración. Holo, dorado, cyan y magenta del arte no deben reutilizarse libremente como estados de interfaz.

### Tipografía

- **PX / ps2p.ttf:** titular arcade, cifras especiales y textos decorativos breves.
- **AV / Avenir Next LT Pro:** textos de interacción, botones, formularios, lecturas y descripciones.
- **AVK / Avenir Black:** énfasis editorial puntual; no se introduce una cuarta familia.
- **Escala propuesta:** 24/20 para títulos de pantalla; 16 para subtítulos; 14–16 para lectura y formularios; 12–14 para etiquetas de control; 10–12 PX solo para metadatos no esenciales. No usar 6–9 px como único tamaño de información esencial.
- Evitar mayúsculas pixeladas en párrafos de ayuda o error. Mantener legibles nombres de cartas y cuentas.

### Espaciado, forma y elevación

- Escala propuesta de espaciado: **4 / 8 / 12 / 16 / 24 / 32 px**.
- Radios semánticos propuestos: **8** (chips/campos), **12** (botones/tarjetas), **16** (diálogos), **999** (controles redondos).
- Evitar sombras decorativas distintas para el mismo componente. La estética arcade de profundidad y CRT se preserva en la capa de marca/arte.
- Los iconos conservan una caja óptica definida, sin aumentar la zona visual para simular un objetivo táctil.

## Reglas de componentes (propuestas)

| Componente | Variantes | Estados obligatorios | Criterio |
| --- | --- | --- | --- |
| `Button` | primary, secondary, ghost, destructive, icon-only | default, hover (puntero), pressed, focus, disabled, loading | Objetivo táctil >=44×44 px; texto consistente |
| `IconButton` | back, close, sound, share, edit, search, refresh | mismos + `aria-pressed` para toggle | SVG interno 20/24 px; `aria-label` descriptivo |
| `ScreenHeader` | con o sin acción final | normal, foco | Misma posición de volver/título/acciones |
| `Tabs/Segmented` | simple, scrollable | selected, default, disabled, focus | Estado seleccionado visible y programático |
| `CardTile` | bloqueada, obtenida, nueva, completada | default, focus, selected, disabled | Nunca colocar parches sobre el arte |
| `Progress` | lineal, circular, cuenta regresiva | activo, completo, en espera | Datos reales y unidades explícitas |
| `Dialog/Sheet` | confirmación, información, detalle | abierto, cierre, error | Cerrar de 44 px; foco administrado |
| `Feedback` | toast, error, aviso, estado vacío | neutral, éxito, alerta, error | No comunicar significado solo con color |
| `RatingReaction` | emoticones deliberados | selected, default, focus | Excepción: son **reacciones**, no íconos de navegación |

### Comportamiento y accesibilidad

- Área activable **mínimo 44×44 px** (aunque el dibujo sea 20 px).
- `focus-visible`: contorno amarillo de 2 px, desplazamiento de 3 px; no depender exclusivamente del hover.
- Íconos decorativos: `aria-hidden="true"`. Botones sin texto visible: `aria-label`.
- Estados activados: `aria-pressed`, `aria-selected` o roles correctos según el componente.
- Controles deshabilitados deben indicar por qué y qué hacer después cuando el contexto lo requiera (ejemplo: Reta con menos de 8 diseños).
- `prefers-reduced-motion` reduce animaciones no esenciales.
- Verificar contraste con contenido y estados reales antes de cerrar cada migración.

### Diseño adaptable

Referencias de QA: 320, 360, 390, 430, 768 y 1024 px; también dispositivos de poca altura, orientación horizontal, zona segura superior/inferior y teclado virtual. El criterio no es solo que “quepa”: debe poder tocarse, leerse y comprenderse.

## Gobierno de diseño

1. **Un solo origen de tokens:** archivo CSS específico a crear; eliminar gradualmente valores sueltos, no a ciegas.
2. **Un solo catálogo de íconos:** sprite/componente SVG local y nombres semánticos; no caracteres sustitutivos.
3. **Un solo patrón por interacción:** pantalla nueva consume componentes existentes; las excepciones se documentan.
4. **Antes de fusionar:** revisión de estado móvil/escritorio, teclado, foco, datos y capturas comparativas.
5. **Excepciones:** registrar motivo, alcance y fecha de revisión; las ilustraciones y reacciones se juzgan por reglas distintas de los íconos UI.

## Documentos relacionados

- [Auditoría y hallazgos](AUDITORIA.md)
- [Contrato de iconografía](ICONOGRAFIA.md)
- [Plan de migración y criterios de aceptación](PLAN-MIGRACION.md)

> Este paquete es documentación inicial trazable. **No certifica que la interfaz actual ya cumpla estas reglas ni sustituye pruebas en navegadores reales.**
