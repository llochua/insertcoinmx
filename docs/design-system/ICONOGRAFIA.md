# Iconografía UI — contrato v0.1

**Estado:** contrato propuesto y primera librería implementada en rama de auditoría (16 símbolos SVG inline). **Aún requiere aprobación y pruebas visuales, no está en `main`.**

## Tres cosas distintas

- **Ícono UI:** dibujo que representa una acción/objeto de la interfaz (volver, cerrar, sonido, editar, compartir, métricas). Debe ser SVG reproducible, con accesibilidad y geometría consistente.
- **Arte / símbolo arcade:** moneda, logo, carta, joystick decorativo, rarezas, estrellas de recompensa y recursos CRT. Mantienen su identidad propia; no se normalizan al mismo trazo.
- **Reacción / instrucción:** emojis de calificación o una mano de tutorial. Son lenguaje expresivo y requieren una regla específica. No reutilizarlos como botones generales.

Por lo anterior, **30 etiquetas SVG en `index.html` no equivalen a 30 íconos de UI**.

## Construcción propuesta

| Propiedad | Regla |
| --- | --- |
| Retícula | SVG con `viewBox="0 0 24 24"` |
| Trazos | `fill="none"`, `stroke="currentColor"`, `stroke-width="2"` por defecto |
| Remates | `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Tamaños ópticos | 16 px compacto; 20 px regular; 24 px destacado |
| Botón que lo contiene | Objetivo táctil mínimo 44×44 px |
| Color | Hereda `currentColor`; acento amarillo o texto según estado |
| Accesibilidad | SVG decorativo `aria-hidden="true"`; el botón aporta `aria-label` |
| Dependencias | Preferir catálogo SVG local; no introducir biblioteca externa solo para unos íconos |
| Doble representación | Prohibido tener al mismo tiempo glifo y pseudo-elemento para la misma acción |

**Implementación actual en la rama:** un único bloque de `<symbol id="ic-icon-*">` en el inicio del `<body>` de `index.html`. Los controles reutilizan `<use href="#ic-icon-*">`, con geometría común en `content/ui-system.css`. Puede extraerse a `assets/ui/icons.svg` en una fase posterior si se valida compatibilidad del hosting.

## Inventario funcional

La implementación inicial ya convierte los glifos principales de Perfil/Avatar/Respaldo y los controles de cabecera, sonido, compartir y Reta. El inventario indica el **origen detectado antes de la migración**; ver [registro de cambios](IMPLEMENTACION-FASE-1.md).

| Nombre semántico | Dónde aparece | Situación actual | Acción propuesta |
| --- | --- | --- | --- |
| `arrow-left` | Header de Sobres/Álbum/Tier/Reta/Récords/Perfil, selector avatar | SVG 16 + carácter `←` | Único activo 24 con mismo tamaño visual en headers |
| `close` | Ficha, zoom, respaldo | SVG, ya parcialmente compartido | Mantener dibujo y convertirlo en componente |
| `volume-on/off` | Headers, zoom, portada | SVG alternados por JS | Un solo icon button toggle |
| `chevron-right` | Tarjeta de perfil | SVG | Reutilizar en affordances equivalentes |
| `chevron-down` | Respaldo desplegable | Carácter `⌄` | SVG que rote según estado |
| `edit` | Cambiar avatar | Carácter `✎` | SVG único en badge |
| `download` | Respaldo | Carácter `↓` | Ícono semántico distinto de expandir |
| `refresh` | Reta: cambiar retadores | SVG | Homologar a retícula y grosor |
| `share` | Compartir diseño / Tier | Texto y SVG según contexto | Misma pictografía donde se requiera |
| `search` | Búsquedas / vista de carta | SVG | Reutilizar sin redibujar |
| `shield-check` | Protege colección | SVG de 1.8 px | Normalizar trazo y escala |
| `designs` | Métrica Diseños | `✦` | Proponer SVG tipo colección/galería |
| `duplicates` | Métrica Repetidas | `▣` | Proponer SVG de cartas superpuestas |
| `ratings` | Métrica Calificados | `★` | Proponer SVG de reseña/evaluación; conservar estrellas artísticas fuera de UI |
| `point-gesture` | Tutorial rasgar sobre | `👆` | Ilustración instructiva consistente, **no** ícono universal |

**No confundir:** `★` en “COMPLETO” o una rareza del juego puede seguir siendo símbolo editorial; el problema es usarlo como sustituto de iconografía de métricas sin contrato.

## Estados y comportamiento

- **Default:** trazo y opacidad consistente.
- **Hover/pressed:** feedback visible, sin cambiar el significado del ícono.
- **Selected/toggle:** fondo/borde y estado programático, no solo cambio de ícono.
- **Disabled:** contraste y explicación contextual cuando sea necesario.
- **Focus:** contorno visible de 2 px con offset, incluso en controles solo con ícono.
- **Loading:** si la acción espera, deshabilitar reactivaciones y anunciar el estado; no usar íconos ambiguos.

## Ejemplo de integración (implementado en rama)

```html
<button class="ic-icon-button" type="button" aria-label="Volver al álbum">
  <svg class="ic-icon" viewBox="0 0 24 24" aria-hidden="true">
    <use href="#ic-icon-back"></use>
  </svg>
</button>
```

El sprite está inline para no depender de una petición externa; falta validarlo visualmente en el hosting de preproducción antes de fusionarlo.

## Lista de control para aceptar un ícono nuevo

1. Tiene significado inequívoco y no duplica otro nombre del catálogo.
2. Sigue geometría, trazo y espacio óptico del sistema.
3. No proviene de un carácter Unicode o emoji por conveniencia.
4. Funciona en blanco, amarillo, deshabilitado y con teclado.
5. Está validado en 320–430 px y ampliación de interfaz.
6. No tapa ni altera los artes de cartas o avatares.

**Regla de revisión:** excepciones decorativas se documentan; no se corrigen automáticamente como si fueran errores.
