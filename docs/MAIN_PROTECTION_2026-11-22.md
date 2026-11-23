# Fase 1 — Blindar `main` (Insert Coin MX)

**Repositorio:** `llochua/insertcoinmx`  
**Baseline de producción preservada:** `main@b9e5e3de89ab306bc261cff74787247697d387f2` (2026-11-22)  
**Auditoría original:** PR #130, `docs/design-system/AUDITORIA_MAIN_2026-11-22.md`  
**Estado administrativo:** PENDIENTE hasta que el propietario configure la regla en Settings. Un workflow en verde NO protege la rama por sí solo.

## Alcance y prohibiciones

- Esta fase **no cambia `index.html`, CSS, cartas, recursos, scripts del juego, SQL ni datos de usuarios**.
- No fusionar ni cerrar el PR #130 como efecto de esta fase; sigue siendo el laboratorio de diseño en borrador.
- No activar `content/release-reset.js`, cambiar `data-active="false"`, reiniciar colecciones, correr migraciones destructivas, modificar Supabase ni regenerar ilustraciones.
- No activar auto-merge ni publicar ramas de pruebas.
- Solo el propietario autoriza el botón final de merge, después de inspeccionar capturas y diferencias cuando afecten UI/arte.
- La referencia de fondos sólidos/continuidad del color es el producto en `main`, no el laboratorio del PR #130.

## Verificaciones automáticas preparadas en esta rama

1. **`Main · conservación sin reinicio`**: prueba el reinicio desactivado, conserva el dominio, el catálogo de 126 diseños como mínimo, los módulos fundamentales y no admite eliminación accidental de assets publicados.
2. **`Catálogo, integridad de imágenes y UI`**: validación actual de cartas, imágenes, JS, tests unitarios y sincronización.
3. **`Chromium · 5, 7 y 8 diseños (390px y 320px)`**: Reta móvil, progreso y CTA.
4. **`Chromium · dos sesiones · nube simulada`**: preservación/sincronización entre sesiones simuladas.

Los workflows de Reta y sincronización pasan a correr en **todos** los PR hacia `main`, sin filtros por archivos. Sus otras pruebas de UI continúan ejecutándose, pero no es necesario hacer obligatorias cada una de ellas inicialmente. Los tests de Supabase local operan en entornos desechables; la validación real de Auth con credenciales continúa siendo manual y no se ejecuta sobre cuentas personales.

## Activación administrativa (no ejecutable con la conexión GitHub actual)

1. Abrir [Settings → Branches](https://github.com/llochua/insertcoinmx/settings/branches) del repositorio, con la cuenta propietaria.
2. Crear una **Branch protection rule** para el patrón exacto `main`.
3. Activar **Require a pull request before merging**. No marcar aprobación de 1 reviewer si solo hay un mantenedor: GitHub no permite aprobar tu propio PR. Cuando exista un revisor independiente, configurar 1 aprobación y descartar aprobaciones obsoletas.
4. Activar **Require status checks to pass before merging** y **Require branches to be up to date before merging**. Seleccionar exactamente los cuatro nombres de jobs anteriores (después de que corran al menos una vez).
5. Activar **Require conversation resolution before merging**.
6. **Desactivar force pushes** y **desactivar deletion** de la rama.
7. Activar **Do not allow bypassing the above settings** o equivalente para incluir administradores. No agregar excepciones de bypass.
8. Guardar la regla. No marcar despliegue de GitHub Pages como check previo obligatorio: la publicación de Pages ocurre al integrar en `main`, así que podría bloquear permanentemente el merge.

**Verificación de activación:** `GET /repos/llochua/insertcoinmx/branches/main` debe devolver `protected:true`; un PR de prueba debe mostrar bloqueado el merge si un check requerido falla. No probar con pushes forzados, deletes ni cambios a producción.

## Proceso obligatorio para nuevos cambios

1. Rama desde `main` actual, un alcance por PR. No usar `main` como laboratorio.
2. Documentar qué decisión aprobada se implementa y qué NO se toca.
3. Ejecutar los checks; si hay cambios visuales, incluir capturas de móvil y escritorio, comparadas con `main`, y obtener autorización visual del propietario.
4. Nunca usar cuentas personales o colecciones reales en pruebas de mutación; el navegador y las bases locales deben ser descartables. Las comprobaciones contra Supabase de producción son de solo lectura.
5. Con checks aprobados, revisar el diff y solicitar autorización explícita para fusionar. **Sin permiso, dejar el PR abierto.**
6. Tras una fusión autorizada: revisar el despliegue de Pages y hacer humo manual en `https://insertcoinmx.com/` sin consumir sobres de la cuenta real.

## Estado comprobado antes de activar reglas

- `main` está **sin protección** (`protected:false`) y sin rulesets.
- El commit `b9e5e3de89ab` pasó validación de cartas, Reta móvil y jobs de Pages según GitHub Actions.
- La disponibilidad del dominio desde una sesión externa y una prueba visual real de la interfaz **no quedan acreditadas por el éxito del deploy**; son controles posteriores independientes.
- El código y las colecciones se mantienen intactos hasta que se apruebe la fusión de la rama de seguridad.
