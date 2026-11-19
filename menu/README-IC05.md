# IC-05 — Arte del menú (revisión 19 nov 2026)

Esta rama se basa en `main` y mantiene su navegación y estado de colección. No publicar ni fusionar hasta la revisión visual en móvil.

## Estado editorial
- `menu/final/sobres.webp`: pendiente de sustituir el sobre inventado por el sobre oficial Insert Coin MX. Composición flotante y brillos aprobada conceptualmente.
- `menu/final/album.webp`: pendiente de quitar el invader y usar cinco ilustraciones reales seleccionadas sin problemas de copy. Conservar composición.
- `menu/final/reta.webp`: **versión elegida por el usuario el 19 nov 2026**, aceptada como mejorable pero suficiente para utilizar. Composición: dos playeras y VS central. El archivo visual exportado está pendiente de subir al repositorio; no sustituirlo por exploraciones previas.
- `menu/final/tier.webp`: ilustración aprobada en conversación, pendiente de cargar al repositorio.
- `menu/final/records.webp`: ilustración aprobada en conversación, pendiente de cargar al repositorio.

## Integración preparada
`index.html` carga recursos de `menu/final/` cuando existen y revierte a las imágenes del menú actual cuando faltan. Desactiva foil/glare para ilustraciones editoriales. El menú conserva su diseño en abanico, títulos, badges, bloqueo, rutas y gestos.

## Criterios
- Formato vertical 480 × 670, sin textos de títulos duplicados dentro de las imágenes.
- La ilustración se reconoce sin leer el nombre de la sección.
- Referencias visuales = calidad y desarrollo artístico, **nunca** copiar universos o motivos.
- Evitar Space Invaders decorativos, estilos gamer genéricos, estampados inventados y elementos sin función narrativa.
- Mantener el recorte seguro inferior para el degradado y copy del menú.

## Pendiente técnico
Exportar las cinco imágenes aprobadas a webp y subirlas a las rutas exactas anteriores. Comprobar rendimiento, cambios de selección, responsividad y sin roturas ni accesibilidad regresiva antes de integrar a `main`.
