# Plan de migración a sistema de diseño

**Estado:** fase 1 y 2A implementadas en rama independiente; **`main` y producción siguen sin cambios**. Validación visual, cierre de fase 2 y fases 3–4 pendientes.

## Regla de arte existente y protegida

- [x] Documentar **DS-ART-01**: los fondos sólidos de cada imagen se extienden al escenario completo sin bordes ni degradados; el color se toma del archivo y no de una paleta global.
- [x] Implementar lector compartido de bordes y fondo plano en revelación y resumen (**solo en rama de PR #130**).
- [x] Añadir pruebas unitarias y prueba Chromium móvil de continuidad del color (**verificar su resultado CI antes de aceptar**).
- [ ] Aprobar capturas visuales de diferentes ilustraciones y variantes en móvil y escritorio antes de fusionar.

Referencia obligatoria: [DS-ART-01 · Ilustraciones y fondos](ILUSTRACIONES-FONDOS.md).

## Orden recomendado

### Fase 0 — Congelar la referencia y aprobar especificación

- [x] Auditoría estática de la interfaz del snapshot de `main` (22-11-2026).
- [x] Propuesta de tokens, iconografía, componentes y excepciones documentadas.
- [ ] Revisar visualmente el aspecto actual en pantalla móvil y escritorio.
- [ ] Aprobar ejemplos de 3 íconos piloto (Volver, Editar, Métrica Diseños) y 3 botones (primario/secundario/solo ícono).
- [ ] Medir accesibilidad y contraste en las superficies reales, no solo sobre los hexadecimales.

**Salida:** lenguaje visual aprobado. No generar íconos/ilustraciones visuales sin validación explícita.

### Fase 1 — Iconografía (P0, bajo riesgo funcional)

- [x] Consolidar el SVG de volver usado en las cabeceras; sustituir `←` en `#avatarSelect` (**implementado en rama**).
- [x] Sustituir `✦`, `▣`, `★` de métricas de Perfil por pictogramas semánticos (**implementado en rama**).
- [x] Consolidar `✎` de editar avatar y eliminar fuente visual duplicada a nivel código (**revisión visual pendiente**).
- [x] Normalizar chevron y descargar del respaldo manual (**implementado en rama**).
- [x] Definir sprite local reutilizable y contrato de nombres (**implementado en rama**); [ ] pruebas de carga en navegador real.
- [x] Mantener reacciones emoji como lenguaje de votación; no modificar arte de cartas ni rarezas.

**Salida provisional:** íconos de Perfil, respaldo y navegación migrados en código, pero **no declarar fase aprobada** hasta revisar la apariencia y el funcionamiento en móvil y escritorio.

### Fase 2 — Fundamentos y componentes (P1)

- [x] Crear `content/design-tokens.css` con aliases hacia `--y`, `--ink`, `--dim` para una transición sin ruptura (**implementado en rama**).
- [x] Primera consolidación de objetivos de `IconButton` y cabeceras (44 px, dibujo de 20/24 px) en CSS compartido; [ ] ampliar catálogo y validar responsive.
- [x] Introducir contrato `.ic-button` y variantes semánticas sobre `.btn`, `.big`, `.mgo`, `.profile-action`, `.avatar-save`, `.ux-primary` (**migración inicial en rama**). [ ] Eliminar duplicados heredados después del QA.
- [ ] Definir y aplicar escala de tipografía y espacios, verificando textos de 6–9 px que transmitan información necesaria.
- [x] Contrato `.ic-segment` sobre Home, Álbum, acceso y `.ic-surface` sobre paneles de cuenta/Perfil (**en rama**). [ ] Resto de tarjetas UI, modales, feedback, contadores y estados bloqueados.
- [ ] Extraer gradualmente CSS por capas y reducir `!important`; **no** aplicar reemplazo masivo que afecte layout de las cartas.
- [ ] Definir estados `hover`, `pressed`, `focus-visible`, `disabled`, `selected`, `loading` y `prefers-reduced-motion`.

**Salida:** instancias nuevas usan el mismo componente, tokens y criterio de estados.

### Fase 3 — Migración por pantallas (P1/P2)

Orden sugerido, empezando por los patrones más compartidos:

1. Cabeceras y acciones comunes de Home, Sobres, Álbum, Tier, Reta, Récords y Perfil.
2. Perfil, selección de avatar y acceso: métricas, controles, campos y respaldo.
3. Sobres, resumen, ficha/zoom: botones, cambios de estado, calificaciones, narrativa.
4. Reta y Tier: CTA, bloqueos y filtros; preservar mecánicas y gestos.
5. Récords y ranking global: tablas, jerarquías, estados de carga/vacíos.
6. Onboarding y avisos generales.

**Salida por pantalla:** comparación antes/después, mobile y desktop, sin alterar progresión ni flujos.

### Fase 4 — Control de calidad y mantenimiento

- [ ] Generar inventario de componentes e íconos usados (fuente de verdad).
- [ ] Incorporar revisión automática sencilla: detectar glifos operativos, colores hardcodeados nuevos, botones icon-only sin nombre, y `style=` de presentación fija.
- [ ] Documentar motivos de excepción (arte/rareza/emojis de reacción) para evitar falsos positivos.
- [ ] Revisar que cada PR tenga capturas o registro de pruebas de estados; actualizar documentación en el mismo cambio.
- [ ] Fusionar a `main` solo por entregas pequeñas y verificables.

Ver [Catálogo de componentes](COMPONENTES.md) y [registro Fase 2A](IMPLEMENTACION-FASE-2.md).

## Matriz de QA obligatoria

| Grupo | Comprobación |
| --- | --- |
| Viewports | 320, 360, 390, 430, 768 y 1024 px; alturas pequeñas, apaisado y safe areas; comprobar además DS-ART-01 en revelación y resumen |
| Entrada | Touch, mouse, teclado, foco, zoom de texto; sin controles fuera de área |
| Estados | Normal, seleccionado, bloqueado, deshabilitado, cargando, vacío y error |
| Reta | 5/8 → faltan 3, 7/8 → falta 1, 8/8 → se permite jugar; con/sin sobres y reloj |
| Sobres | Abrir, rasgar, revelar, resumen, cerrar/volver, disponibilidad y contador |
| Cuenta | Invitado/registrado, registro, inicio/cierre de sesión, recuperación y avatar |
| Datos | Colección y ranking no se reinician ni sobrescriben por un cambio visual |
| Contenido | Holo/Full/Dorada, valor POP y puntos siguen en su ubicación sin parches |
| Accesibilidad | Foco visible, nombres accesibles, objetivo táctil, contraste, movimiento reducido |
| Regresión | Tier drag/selección, reacción/voto, Récords, respaldo y sincronización |

## Definición de terminado

Una migración está completa **solo si**: (1) usa el contrato del sistema; (2) conserva el comportamiento anterior; (3) no duplica íconos o estilos locales; (4) pasa controles móvil/escritorio y accesibilidad; (5) actualiza el inventario documental; (6) está revisada antes de `main`.

## Riesgos y protección

- **CSS acumulado:** una regla genérica puede mover el arte o romper breakpoints. Usar cambios acotados con capturas de referencia.
- **Pérdida de identidad:** no reemplazar pixel art, cartas, CRT o reacciones por iconos genéricos.
- **Flujos sensibles:** Auth, restauración, cloud sync, puntos, ranking y apertura de sobres nunca deben tocarse en tareas solo visuales.
- **Falsa sensación de cierre:** la auditoría estática no sustituye una sesión visual ni pruebas en móvil real.
