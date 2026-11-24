# Catálogo de componentes UI · v0.2

**Estado:** implementación parcial en la rama `docs/design-system-audit-2026-11-22` (PR #130); no publicado en `main`. Los estilos especiales arcade y su lógica original siguen intactos.

## Fuentes de verdad

- `content/design-tokens.css`: color semántico, tipografía, espaciado, radios, alturas y foco.
- `content/ui-system.css`: catálogo compartido de íconos y objetivos táctiles.
- `content/ui-components.css`: patrones opt-in para botones, campos, segmentos y superficies.
- `index.html`: instancias existentes de componentes y sus estados.

**Orden obligatorio:** tokens → iconografía → componentes. Se carga después del CSS heredado para permitir una migración sin ruptura.

## Button / `.ic-button`

| Variante `data-ui-variant` | Semántica | Instancias migradas |
| --- | --- | --- |
| `primary` | Acción protagonista | Abrir sobre, CTA Inicio, compartir Tier, crear cuenta, guardar avatar, siguiente onboarding, acción primaria de diálogo |
| `secondary` | Acción alternativa | Iniciar sesión, cerrar sesión, respaldos, acción secundaria de diálogo |
| `ghost` | Navegar o recuperar sin competir con CTA | Volver a acceso/perfil, recuperar contraseña |

**Contrato:** `min-height:44px`, `box-sizing:border-box`, foco visible, disabled sin cursor activo. La pintura propia de `.mgo`, `.big`, `.profile-action` y `.ux-primary` se conserva durante esta migración. **No convertir la cuenta regresiva de sobres a botón amarillo activo:** su estado de espera es funcional.

**Compatibilidad:** clases anteriores siguen presentes. Los `id`, manejadores de eventos y condiciones de bloqueo no cambian.

## Field / `.ic-field`

Se aplica únicamente a seis inputs de registro/identidad: récord de 3 caracteres, usuario, correo, contraseña, edición de récord y edición de usuario. **No** se aplica al selector de archivos, la importación de respaldo ni al arte de cartas.

| Estado | Regla |
| --- | --- |
| Default | `min-height:46px`, superficie oscura, borde suave y 15px de lectura |
| Focus | anillo amarillo visible |
| Invalid | borde de error si `aria-invalid=true`; no pintar rojo un campo requerido antes de interactuar |
| Disabled | opacidad reducida, cursor deshabilitado |
| Especial | Campo de récord conserva tipografía PX y reglas de 3 caracteres |

## Segment / `.ic-segment`

| Grupo | Selección | Presentación preservada |
| --- | --- | --- |
| Home (menú de 5 modos) | `aria-pressed` actualizado dinámicamente | La pastilla seleccionada mantiene su estética |
| Álbum (categorías) | `aria-pressed` nuevo + clase `.on` existente | Selección blanca sobre fondo oscuro |
| Cuenta (crear/iniciar sesión) | `aria-pressed` existente | Activo amarillo/selección tenue según la pantalla |

**Contrato común:** área táctil mínima de 44 px de altura, `focus-visible`, estados `selected` y `disabled`. No forzar un color de selección universal; la semántica sí es la misma.

## Surface / `.ic-surface`

Clase estructural sin fondo impuesto: `box-sizing:border-box`, `min-width:0`, respeto a `hidden`. Se aplicó a identidad/perfil, resumen de progreso, bienvenida de cuenta, panel Auth y diálogo UX. **No** es una tarjeta de colección ni una superficie para parchar el arte.

## Tokens aprobados provisionalmente

| Grupo | Nombres | Valores propuestos |
| --- | --- | --- |
| Color | `--ic-color-accent`, `--ic-color-text`, `--ic-color-muted` | `--y`, `--ink`, `--dim` existentes |
| Espaciado | `--ic-space-1/2/3/4/6/8` | 4 / 8 / 12 / 16 / 24 / 32 px |
| Radios | `--ic-radius-sm/md/lg/pill` | 8 / 10 / 16 / 999 px |
| Tipografía | `--ic-font-ui`, `--ic-font-display` | Avenir / pixel decorativa |
| Controles | `--ic-control-height`, `--ic-input-height` | 44 / 46 px |
| Foco | `--ic-focus-ring`, `--ic-focus-color` | 2 px amarillo |

**No declarar terminada la normalización CSS**: quedan numerosos tamaños y colores heredados fuera del contrato, identificados en `AUDITORIA.md`.

## Estados que deben revisarse con capturas

- Botones primary, secondary y ghost: default, hover, pressed, focus, disabled; CTA “próximos sobres”.
- Inputs: vacío, con valor, error, foco, contraseña/teclado virtual, código de récord especial.
- Segmentos: seleccionado, no seleccionado, deshabilitado, teclado y desplazamiento horizontal en 320 px.
- Superficies: altura corta, scroll interno, diálogo con teclado visible, foco sin corte.
- Áreas con riesgo de saturación: cinco pestañas del Home, Reta y pantalla de acceso en 320–390 px.

## Regla para nuevas pantallas

1. Elegir componente y variante semántica.
2. Usar sus tokens, estado y etiqueta accesible.
3. Mantener la ilustración separada de la UI.
4. Si existe una excepción visual necesaria, anotarla aquí y probarla.
5. No modificar `main` sin QA móvil/escritorio.
