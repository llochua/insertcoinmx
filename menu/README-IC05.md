# IC-05 — Ilustraciones del menú (19 nov 2026)

**Estado:** los cinco recursos gráficos están cargados e integrados en código en la rama de revisión `design/ic-05-menu-ilustraciones-final-20261119`. **No fusionado a `main` ni validado visualmente en navegador.**

## Imágenes elegidas por el usuario
- `menu/final/sobres.webp` — última ilustración del sobre negro con amarillo. El usuario decidió dejarla así, sin más correcciones.
- `menu/final/album.webp` — ilustración **anterior** del álbum abierto, recuperada sin rehacerla. El usuario eligió mantenerla a pesar del invader y los diseños de relleno previamente señalados; no sustituirla por las exploraciones posteriores.
- `menu/final/reta.webp` — dos playeras frente a frente con un gran VS central; versión aceptada como mejorable, pero suficiente para usar.
- `menu/final/tier.webp` — ranking escalonado de cartas, aprobada.
- `menu/final/records.webp` — máquina arcade con récords y trofeo, aprobada.

Archivos WebP: **480 × 670 píxeles** cada uno. Fuentes originales conservadas en el historial de generación/Library; no reinterpretar los diseños sin nueva autorización.

## Integración en esta rama
`index.html` usa los archivos de `menu/final/` en el menú de cinco opciones. Incluye fallback a las imágenes actuales si un recurso no carga. Desactiva foil/glare sobre el arte editorial, sin reemplazar el abanico, sus textos, estados de bloqueo ni navegación.

## Comprobaciones pendientes antes de fusionar
- Revisión visual en móvil (recorte, degradado, legibilidad y selección).
- Verificar que el recurso final aparece en cada opción del abanico y no se activa fallback.
- Comprobar que las cinco rutas funcionan, sin errores de consola ni regresiones en navegación y estado de colección.
- Fusionar a `main` **solo** tras confirmación.

## Principios editoriales
Las referencias representan calidad ilustrativa, no obligan a repetir estética o motivos. Cada sección comunica su función. No añadir Space Invaders, adornos, personajes ni estampados por defecto. Respetar las versiones concretas elegidas por el usuario, incluso si son mejorables.
