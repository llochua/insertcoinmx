# Selector de avatar · laboratorio Mi perfil

**Rama:** `feat/perfil-selector-avatares-20261120` · laboratorio aislado; no habilitar autenticación ni juego público desde este módulo.

## Implementado
- Acceso desde el avatar y botón «Cambiar avatar» del pasaporte.
- Pantalla dedicada, selección entre 12 personajes, previsualización y estado seleccionado.
- Guardar actualiza la foto de Mi perfil y tarjeta de Inicio; cancelar vuelve sin aplicar cambios.
- Preferencia solo en `sessionStorage['icmx-preview-avatar-20261120']`. Nunca toca `icmx-album2`, cuenta, nube o sobres.
- Control de teclado, estado pulsado accesible, miniaturas lazy 128px y vista grande 320px; mobile 3 columnas, desktop 4.

## Recursos incorporados
Los **24 archivos WebP** originales están subidos a GitHub en `assets/avatars/` con 128 y 320 px; peso total **325 264 bytes**. Su presencia y dimensiones fueron verificadas en el repositorio y por decodificación local.

IDs: moneda, pizza, control, cartucho, bote-tinta, mago, gato-afk, jos, glitch, playera, rasqueta-malla, arcade.

## Pruebas de aceptación
- Las 24 imágenes deben responder 200, ser WebP válido y corresponder a las versiones aprobadas.
- Acceso al perfil → Cambiar avatar → seleccionar → Guardar → perfil e Inicio actualizados.
- Volver sin guardar mantiene la elección anterior.
- Recargar en la misma pestaña conserva la selección de laboratorio; cerrar la sesión de navegación la descarta.
- Probar a 390px y 1200px, navegación con teclado y 320px en pantalla de selección.
- No se realizan solicitudes Supabase ni escrituras en la colección real.
- Ejecutar `node qa/perfil-preview-browsers.mjs` con Playwright y Chromium disponibles; CI lo ejecuta en cada PR que modifica el laboratorio.

**Importante:** el avatar del laboratorio no es todavía persistencia entre dispositivos de un jugador registrado.