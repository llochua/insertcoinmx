# Mi perfil y cuentas visibles · PR #72 (laboratorio)

Fecha: 20 de noviembre de 2026. Esta guía pertenece a la rama `feat/perfil-cuentas-integradas-20261120`, no a `main`.

## Recuperado de las propuestas
- PR #50: Mi perfil accesible desde Inicio, contadores de cartas y respaldo manual; invitados pueden jugar.
- PR #61: pantalla de perfil con progreso, formularios de registro/inicio/cierre y correo de confirmación.
- PR #63: protección de colecciones, emisión/canje desde servidor para cuentas autorizadas y sincronización conservadora.

## Experiencia implementada en la rama
- Icono de perfil visible en la cabecera de Inicio.
- Primer ingreso: en la última pantalla de bienvenida se propone **CREAR MI CUENTA**, manteniendo **SEGUIR COMO INVITADO**.
- Mi perfil: resumen de colección, diseños, repetidas, calificaciones; botones de respaldo manual.
- Registro/login por correo y contraseña en el mismo perfil; acceso por correo puede volver al perfil.
- Estado real de nube dentro del perfil; no equivale a respaldo hasta confirmar `synced`.
- Sesión Supabase compartida por Auth y el sincronizador, con `storageKey` `icmx-auth-qa-nov2026`.
- Vinculación inicial solo explícita y permitida a cuentas de laboratorio.

## Lo que NO se hizo
- No se fusionó a `main`, no se cambió `CNAME`, ni se abrió la beta.
- No se ejecutaron migraciones SQL ni reinicios/borrados de colecciones o cuentas.
- No se habilitó el acceso general a sobres de servidor ni a importaciones de invitados.
- No hay todavía una URL pública de vista previa verificada ni un recorrido real de correo y Auth de esta interfaz comprobado end-to-end.
- Una cuenta recién registrada puede no pertenecer a la allowlist de laboratorio. Hasta autorizar el lanzamiento, no se promete que pueda jugar con sobres sincronizados.

## Criterios de aceptación pendientes antes de fusionar
1. Despliegue de staging aislado y URL de callback permitida por Supabase.
2. Confirmar registro real y correo, iniciar y cerrar sesión, recuperación después de recarga.
3. Con cuenta de laboratorio, verificar `NUBE AL DÍA`, abrir un sobre E2E y recuperar en un segundo navegador.
4. Con cuenta no autorizada, verificar aviso comprensible y que nunca se borren ni mezclen colecciones.
5. Revisar UI responsiva en móvil y escritorio, accesibilidad del onboarding y ausencia de regresiones.
6. Decisión expresa del creador para fusionar a `main`. **No abrir beta ni reiniciar colecciones.**

## Pruebas automáticas
- `qa/profile-browsers.mjs`: bienvenida, acceso desde Inicio, perfil y estado de nube sin modificar cartas.
- `qa/sync-two-browsers.mjs`: nube simulada con conflictos, reintentos, sobres y recuperación.
- Workflow `validacion.yml`: sintaxis, catálogo y seguridad beta.
