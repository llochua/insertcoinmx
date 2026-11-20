# Insert Coin MX — ruta a la beta

Estado: **preparación técnica, no publicada**. Documento de trabajo de la rama `feat/sync-automatica-segura-20261119` (PR #63). Actualizado 20 noviembre 2026.

## Reglas que no se negocian

- **Nunca** reiniciar, borrar, sustituir o migrar colecciones y cuentas sin autorización expresa del creador.
- **Nunca** fusionar la rama de beta a `main` ni publicar el cambio sin autorización expresa.
- Las colecciones de invitados actuales **no se importan a la beta**. Cuando contenido y mecánicas estén terminados, el creador decidirá cuándo iniciar una colección limpia. No ejecutar el reinicio anticipadamente.
- Eliminar la restricción de laboratorio no es un paso de prueba: es **abrir acceso real**. Se hará solo tras verificar cuentas reales y recibir autorización de lanzamiento.
- No abrir la RPC de importación `import_guest_collection` al público. Acepta inventario local sin origen verificable. Debe continuar restringida o deshabilitarse antes de la beta.
- No crear nuevos proyectos de pago o infraestructura sin acuerdo.

## Fase 1 · Integridad de colección y código — casi cerrada

**Resultado esperado:** sobres, cartas, canjes y guardado sin duplicaciones ni exposición anónima.

**Hecho:** pruebas Chromium en dos navegadores; protección frente a duplicados, conflictos, cambios de cuenta y desconexión; función de emisión autoritativa en Supabase; consulta/descarga de respaldos con múltiples revisiones; catálogo del juego y pool privado de sobres alineados con **386 variantes**; prueba automática para impedir que se desalineen. La rama incorpora los diseños recientes de `main` sin publicar el trabajo de cuentas.

**Cierre:** CI de validación básica, navegador simulado y humo anónimo en verde en el último commit. Revisión de seguridad antes de habilitar público.

## Fase 2 · Dos sesiones reales de Supabase — aprobada (solo lectura)

**Resultado esperado:** una cuenta de laboratorio con correo confirmado entra en dos navegadores independientes, ambos ven la misma colección, sin sobres inventados ni mezcla con otra cuenta.

- Existe prueba manual `qa/live-auth-two-browsers.mjs` y workflow `.github/workflows/qa-live-auth-manual.yml`.
- **Por defecto no modifica inventario.** Requiere credenciales de **cuenta exclusiva de laboratorio** guardadas como secretos `ICMX_QA_EMAIL` y `ICMX_QA_PASSWORD` en GitHub.
- La QA autenticada real está habilitada **solo bajo ejecución manual** de GitHub Actions, con `ICMX_QA_AUTH_TEST_READY=true` y secretos privados, para no hacer logins repetidos en cada commit. Ya existe un resultado aprobado; nuevos despliegues requieren una nueva ejecución de ser necesario.
- Emisión opcional de **un sobre de prueba**, solo con autorización separada del operador, flag manual y la marca `ICMX_QA_CONFIRM_TEST_ACCOUNT=1`. No utilizar cuentas personales.
- **Ejecutado y aprobado:** run #44770831798, nuevo intento del 20 noviembre 2026. Dos sesiones reales de Supabase en navegadores aislados recuperaron la misma colección; cierre de sesión y reingreso mantuvieron las cartas. No se abrió ningún sobre real.

**Cierre:** completado con Auth real en dos navegadores, recuperación tras reingreso y sin mutaciones en inventario. La emisión de un sobre real y su recuperación E2E aún no se probaron en esta sesión (solo se validó su RPC de modo reversible y la emisión con nube simulada).

## Fase 3 · Preparar acceso general sin tocar colecciones — preparada, sin activar

**Resultado esperado:** nueva cuenta comienza con inventario generado exclusivamente por servidor y recuperable en otro dispositivo; cuota, aleatoriedad y canjes protegidos.

- Revisar permisos y funciones públicas. Mantener el bloqueo al endpoint de importación de inventarios invitados.
- **Preparada:** `supabase/sql/prepare_public_beta_CLOSED.sql` instala una compuerta de acceso común **apagada por defecto** para las RPC seguras de alta, abrir sobre, canjear y guardar metadatos; revoca la función de importación invitada. **No se aplicó** a Supabase real. Su activación pública requerirá una acción independiente y autorización expresa.
- Revisar [avisos de seguridad de Supabase](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/advisors/security), especialmente protección de contraseñas filtradas.
- Conservar cualquier cuenta/colección antigua hasta decisión del creador.

**Cierre:** pendiente de prueba de integración con dos usuarios distintos y apertura de sobre E2E en cuenta desechable de QA; no retirar la lista de laboratorio antes de la autorización.

## Fase 4 · Verificación del recorrido visible — pendiente

**Resultado esperado:** registro → confirmar correo → entrar al juego → primer sobre → álbum → salir → recuperar en otro dispositivo.

- Revisar estados de carga, errores de red, salida/entrada, recuperación y cambio de cuenta.
- Revisión visual y de experiencia de usuario con el creador **solo cuando el recorrido técnico esté listo**; no sobrecargarlo con decisiones de infraestructura.
- Realizar una última revisión de catálogo, ilustraciones y mecánicas según las decisiones del creador. No imponer completar todo el Archivo como condición técnica.

**Cierre:** recorrido probado en móvil y escritorio, sin errores que bloqueen jugar.

## Fase 5 · Decisión y publicación — bloqueada hasta autorización

**Resultado esperado:** versión candidata estable, con contenido y reglas que el creador haya aprobado.

- Registrar estado previo y preparar procedimiento reversible/auditable para comenzar de cero **sin ejecutarlo**.
- El creador autoriza explícitamente **por separado** cualquier reinicio y la publicación.
- Solo entonces aplicar el procedimiento aprobado, habilitar acceso general y fusionar a `main`; probar en el dominio público.
- Tras publicar, no volver a reiniciar colecciones automáticamente.

**Estado:** no autorizado. `main` no se modificó desde esta rama. Los usuarios actuales conservan sus colecciones.

## Lectura rápida del estado

- **Terminado o listo para probar:** mecanismo de guardado, emisión, canjes, protección, reconciliación de catálogo, prueba con nube simulada.
- **Bloqueo técnico real:** permisos generales todavía restringidos y revisión de habilitación pública pendiente; validación de emisión E2E con Supabase real no destructiva pendiente de diseñar con una cuenta de QA desechable.
- **Fuera del trabajo técnico hasta decisión:** fecha de lanzamiento, reglas finales de colección, reinicio de jugadores anteriores, aprobación visual/publicación.

## Resultado de prueba autenticada real · 20 noviembre 2026

- **Resultado final: APROBADA.** GitHub Actions run [#44770831798](https://github.com/llochua/insertcoinmx/actions/runs/44770831798) (reintento tras actualizar credenciales privadas).
- Inicio de sesión real en **dos navegadores aislados** y recuperación de la misma colección.
- Cerrar sesión y volver a iniciar sesión conservó el inventario.
- La ejecución fue **solo lectura**: no abrió sobres ni alteró progreso, cuentas ni datos.
- La comprobación de visitante anónimo y las pruebas Chromium con nube simulada también pasaron.
- Esto **no autoriza** a retirar los límites de laboratorio ni a publicar `main`. La fase siguiente es revisar seguridad y preparar la activación pública sin ejecutarla.


## Auditoría de seguridad y preparación cerrada · 20 noviembre 2026

- Se confirmó por SQL que `public.player_snapshots` tiene RLS y política de lectura exclusivamente para el dueño; `anon` no puede leer y `authenticated` **no puede INSERT/UPDATE/DELETE directo**.
- Las cinco RPC públicas usan `SECURITY DEFINER`: los avisos de Supabase sobre ejecución por usuarios registrados son **intencionales en cuatro** (alta, sobres, canje, metadatos), por lo que hay que validar sus comprobaciones internas. La quinta, `import_guest_collection`, debe perder el permiso `EXECUTE` al desplegar la preparación.
- Las cuatro tablas de `private_sync` tienen RLS activo sin políticas para navegadores, intencionalmente (solo acceso privilegiado interno). Supabase lo reporta como aviso informativo.
- Supabase advierte que **Leaked Password Protection está desactivada**. Revisar [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) antes del lanzamiento; no se cambió esa configuración.
- El SQL de preparación se ejecutó **dentro de una transacción que terminó con ROLLBACK**, únicamente para comprobar que compila. Se verificó después: la tabla `private_sync.beta_access_gate` **no existe** (no quedó aplicada); 1 colección existente, 386 variantes y 1 cuenta de laboratorio siguen igual.
- La prueba automática `qa/check-beta-gate.mjs` impide publicar accidentalmente una migración con la compuerta encendida y exige proteger cuatro RPC y cerrar la importación de inventario local.
- **No interpretar la aprobación de la transacción como una auditoría exhaustiva de seguridad ni como beta autorizada**. Falta probar acceso entre dos cuentas, los errores de cuota/condiciones de carrera en Supabase real y el recorrido completo con una cuenta desechable.

- **Nota de estabilidad:** una ejecución posterior del smoke E2E en PR recuperó bien la colección desde dos navegadores, pero agotó el tiempo esperado tras pulsar «Cerrar sesión» en navegador B. La ejecución original completa sí había pasado. No se atribuye automáticamente a un bug del producto: investigar flaqueza de red/cierre de sesión si se reproduce, sin repetir logins en cada commit. La prueba real quedó manual; CI sigue probando lógica con nube simulada y acceso anónimo.
