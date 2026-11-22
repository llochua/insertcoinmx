# Implementación Fase 1 — iconografía y controles compartidos

**Fecha:** 22-11-2026  
**Rama:** `docs/design-system-audit-2026-11-22`  
**PR:** [#130](https://github.com/llochua/insertcoinmx/pull/130) (borrador, aún no fusionada)  
**Alcance:** código y documentación; no incluye revisión visual del sitio en un dispositivo real.

## Entregado

1. **Catálogo de 16 íconos SVG:** se define una sola vez como símbolos `#ic-icon-*` inline en `index.html`. Referencias mediante `<use>`. Iconos: `back`, `next`, `close`, `edit`, `download`, `chevron-down`, `designs`, `duplicates`, `ratings`, `volume-on`, `volume-off`, `zoom-out`, `zoom-in`, `refresh`, `user`, `share`.
2. **Navegación:** seis cabeceras de Sobres, Álbum, Tier, Reta, Récords y Perfil usan el mismo símbolo de volver. También se sustituyen los glifos Unicode de volver en Avatar, acceso a cuenta y onboarding.
3. **Perfil:** `✦`, `▣` y `★` de métricas pasan a íconos semánticos; editar avatar deja de usar `✎` y se elimina el pseudo-elemento redundante. Respaldo emplea SVG para descargar y desplegar.
4. **Controles compartidos:** sonido y silencio reutilizan símbolos; se conservan `aria-pressed`, nombres accesibles y comportamiento actual. Se unifica la geometría de controles táctiles a 44×44 px en `content/ui-system.css`, preservando el estilo de cada pantalla.
5. **Acciones existentes:** el botón de Reta mantiene su acción de refresh; compartir, ampliar y cerrar usan el catálogo sin reemplazar la lógica de juego.
6. **Diferencias intencionales:** `zoom-out` del zoom se conserva como icono semántico distinto de `close`; los emojis de calificación y los símbolos de rareza **no** se sustituyen.
7. **Verificación automatizable:** `scripts/check-ui-icons.mjs` comprueba referencias, símbolos, ausencia de glifos funcionales, enlaces y analiza sintácticamente los scripts clásicos inline de `index.html`. El workflow `.github/workflows/ui-system-contract.yml` está preparado para ejecutarlo en PRs.

## Archivos de ejecución

- `index.html`: sprite SVG y reutilización por referencia.
- `content/ui-system.css`: tokens puente, estilos de iconos, objetivos táctiles compartidos, cabecera compacta de Reta.
- `scripts/check-ui-icons.mjs`: contrato estático sin dependencias.
- `.github/workflows/ui-system-contract.yml`: check automático selectivo.
- `docs/design-system/*`: documentación y prioridades actualizadas.

## Verificaciones realizadas en código antes del commit

- Se verificó existencia de **16 símbolos con nombres distintos**.
- Se verificaron referencias SVG a nombres registrados.
- Se verificó que desaparecieron los glifos funcionales de métricas, volver y editar avatar en las áreas intervenidas.
- Se verificó que los módulos de Auth, avatares, valor de cartas y elegibilidad de Reta mantienen sus referencias.
- `main` no recibió ningún cambio.
- No se modificaron imágenes, sprites de carta, datos de colección, Supabase, premios ni lógica de ranking.

## Pendiente antes de fusionar a main

- [ ] Ejecución exitosa del workflow de contrato en GitHub Actions. El script se agregó pero la auditoría de código no constituye por sí misma una ejecución real.
- [ ] Validación en móvil (320, 360, 390 y 430 px), con especial atención a la cabecera compacta de Reta, sonido, avatar y Respaldo.
- [ ] Validación en escritorio, interacción mouse/teclado, foco y uso de <use> SVG.
- [ ] Revisión visual del aspecto de los 16 pictogramas frente al estilo arcade.
- [ ] Verificar que el tamaño táctil de 44 px no cause saturación en cabeceras y overlays.
- [ ] Verificar manualmente completar Reta, revelar sobre, abrir ficha/zoom, abrir Perfil, descargar respaldo y cambiar avatar.
- [ ] Aprobar y fusionar PR #130.

**Interpretación correcta:** la implementación de código está hecha **en rama**; **no significa que ya esté publicada, aprobada visualmente ni terminada toda la estandarización**. Los botones de todas las pantallas, tokens avanzados, componentes de formulario y limpieza de CSS se abordarán en fases posteriores.
