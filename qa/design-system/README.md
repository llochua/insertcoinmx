# Laboratorio de sistema de diseño · Insert Coin MX

**Objetivo:** revisar en navegador el juego real de la rama del sistema de diseño, sin cuenta personal, sin conexión a nube y sin publicar rankings.

## Acceso

- Archivo: `qa/design-system/index.html`.
- URL de prueba sugerida para la versión del PR: `https://raw.githack.com/llochua/insertcoinmx/<SHA-DEL-PR>/qa/design-system/index.html` (sustituir SHA por la versión que se quiere revisar).
- Abre directamente el **Home**. No requiere correo, contraseña ni Supabase Auth.
- Identidad simulada: código `LAB`, usuario local `@lab_player`; no es una cuenta registrada real.
- Sobres ilimitados solo en esta copia. El archivo `index.html` de producción mantiene `PRUEBA=false`.

## Controles visibles

Toca **LAB · ∞ SOBRES** (arriba a la izquierda) para desplegar controles:

| Acción | Qué hace |
| --- | --- |
| Inicio | Vuelve al menú real |
| Abrir un sobre | Entra a la pantalla real de sobres, sin cuota |
| Reta · 5 diseños | Coloca cinco diseños distintos ficticios, muestra la Reta bloqueada |
| Reta · 7 diseños | Coloca siete diseños y muestra la Reta bloqueada |
| Reta · 8 diseños | Coloca ocho diseños y abre el juego de Reta |
| Perfil / Álbum | Visualiza los componentes reales y el progreso del laboratorio |
| Reiniciar LAB | Borra **solo** claves locales del laboratorio, nunca la colección real |

La colección abierta en el laboratorio persiste **en este mismo navegador/origen**. Se puede reiniciar sin afectar otras partidas.

## Aislamiento

- Progreso: `icmx-ui-lab-progress-v1` (incluye extensiones, respaldos y control de escritura).
- Handle: `icmx-ui-lab-handle-v1`.
- Avatar: `icmx-lab-design-avatar-v1` (copia local de `avatar-profile.js`).
- Ranking local: `icmx-ui-lab-ranking-v1`.
- Audio: `icmx-ui-lab-sound-v1`.
- El LAB **no importa** `auth-account.js`, `cloud-sync.mjs`, `player-ranking.mjs` ni `community-ranking.mjs`.
- El LAB no carga Google Analytics y no inicializa el almacenamiento `claude`.
- Crear cuenta / Iniciar sesión en Perfil son **demostraciones de presentación**, no envían credenciales.
- El código se copió desde el `index.html` de la rama del diseño para que las pantallas sean las reales. La razón de mantenerlo como copia es que **no debe activarse un query param de sobres ilimitados en producción**.

## Importante

Este laboratorio **es público si se publica su ruta**. No se debe utilizar para información sensible, credenciales ni premios reales. Un visitante podría alterar su almacenamiento local, pero no puede enviar resultados al ranking público desde esta copia.

## QA

Workflow: `.github/workflows/qa-ui-lab-mobile.yml` con Chromium móvil 390px/320px. Verifica 5/7/8 diseños, apertura ilimitada, avatar independiente, claves originales intactas y ausencia de solicitudes a Supabase. Guarda capturas en GitHub Actions.

**La existencia de un archivo QA no demuestra que su URL esté ya accesible ni que sus pruebas hayan terminado**; revisar los resultados del workflow y probar el enlace real antes de aprobar PR #130.

## Mantenimiento

Este es un **snapshot** del juego de producción `71912062a13942a5d49e2534a83011c8f5e3bf22` (PR #143, motor optimizado). El LAB mantiene sus controles y claves aisladas. El comparador es auxiliar; Álbum, Ficha, Zoom y Sobres usan el mismo motor de producción. Las opciones experimentales del sistema de diseño permanecen en el historial del PR #130; no se superponen a esta versión estable. En adelante, después de cambiar el código de producción, debe recrearse desde la rama (manteniendo los bloqueos de Auth/nube/analytics) o se quedará desfasado. No utilizar `qa/design-system/index.html` como base de producción.
