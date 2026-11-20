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

## Fase 2 · Dos sesiones reales de Supabase — preparada, pendiente de ejecutar

**Resultado esperado:** una cuenta de laboratorio con correo confirmado entra en dos navegadores independientes, ambos ven la misma colección, sin sobres inventados ni mezcla con otra cuenta.

- Existe prueba manual `qa/live-auth-two-browsers.mjs` y workflow `.github/workflows/qa-live-auth-manual.yml`.
- **Por defecto no modifica inventario.** Requiere credenciales de **cuenta exclusiva de laboratorio** guardadas como secretos `ICMX_QA_EMAIL` y `ICMX_QA_PASSWORD` en GitHub.
- En la rama, la prueba autenticada de PR **se marca pendiente/saltada** hasta que la variable de repositorio `ICMX_QA_AUTH_TEST_READY=true` habilite su ejecución. Sin esa variable no debe contarse como prueba real superada.
- Emisión opcional de **un sobre de prueba**, solo con autorización separada del operador, flag manual y la marca `ICMX_QA_CONFIRM_TEST_ACCOUNT=1`. No utilizar cuentas personales.
- Sin credenciales no afirmar que esta prueba autenticada pasó; no crear usuarios ni cambiar contraseñas para saltarla.

**Cierre:** informe de ejecución exitoso con Auth real, y comprobación de recuperación desde un segundo navegador.

## Fase 3 · Preparar acceso general sin tocar colecciones — pendiente

**Resultado esperado:** nueva cuenta comienza con inventario generado exclusivamente por servidor y recuperable en otro dispositivo; cuota, aleatoriedad y canjes protegidos.

- Revisar permisos y funciones públicas. Mantener el bloqueo al endpoint de importación de inventarios invitados.
- Preparar y revisar una migración de activación para las RPC seguras: alta, abrir sobre, canjear y guardar metadatos. **No aplicar hasta autorización de beta.**
- Revisar [avisos de seguridad de Supabase](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/advisors/security), especialmente protección de contraseñas filtradas.
- Conservar cualquier cuenta/colección antigua hasta decisión del creador.

**Cierre:** validación de acceso de dos usuarios distintos y aislamiento, sin permitir escribir cartas arbitrarias.

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
- **Bloqueo técnico real:** prueba autenticada con cuenta de laboratorio; permisos generales todavía restringidos.
- **Fuera del trabajo técnico hasta decisión:** fecha de lanzamiento, reglas finales de colección, reinicio de jugadores anteriores, aprobación visual/publicación.
