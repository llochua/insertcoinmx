# Integración de Mi perfil y cuentas · revisión previa a `main`

Fecha: 2026-11-20. Estado: **EN VALIDACIÓN, NO PUBLICADO**.

## Base y cambios
- `main` inicial: `92ff0dd022f529975db4b2bd14d7115a3d2d7b43`, que ya contiene la PR #90.
- PR #87: antigua rama de integración, abierta en borrador y divergente; no intentar fusionarla encima sin resolver el solapamiento de `content/auth-account.js` y `content/avatar-profile.js`.
- `index.html` de esta rama deriva de `qa/perfil-integrado/index.html` de PR #90. Solo se retiraron `<base href="/">`, `noindex` y el título de QA, ordenando el charset; se conservó la protección contra mostrar el avatar equivocado antes de confirmar identidad.
- Los módulos `content/auth-account.js` y `content/avatar-profile.js` permanecen tal cual en `main` (incluida la mejora posterior de render de identidad). Los 24 WebP de 12 avatares ya están en `main`.
- No se editan `content/cloud-sync.mjs`, `reta-diaria.js`, `reta.css`, catálogos, cartas, arte, valores de emisión ni SQL.

## Pruebas incluidas
- Unitarias: `node --test qa/profile-auth-unit.test.mjs`.
- Chromium en raíz: `node qa/profile-browsers.mjs` y `node qa/perfil-main-browsers.mjs`.
- Continúan las comprobaciones de catálogos, sobres, probabilidades, restauración, colección y experiencia pública ya configuradas en GitHub Actions.
- El nuevo smoke anónimo de Supabase es lectura/denegación de permisos, sin mutación de datos.
- **QA real aportada por el usuario:** registro, inicio de sesión, recuperación de cinco cartas entre navegadores y persistencia del avatar Jos. Esto no sustituye la ejecución de CI en esta rama ni las pruebas de publicación.

## Seguridad auditada (Supabase)
- Proyecto `insertcoinmx-tcg` activo; tablas públicas de colección con RLS y lectura restringida al propietario. Las tablas `private_sync` tienen RLS y no conceden acceso directo a `anon`/`authenticated`: sus cuatro avisos sin políticas son informativos.
- Cinco RPC `SECURITY DEFINER` accesibles al rol `authenticated`: `ensure_player_snapshot`, `sync_player_snapshot`, `issue_player_pack`, `exchange_duplicate_cards`, `import_guest_collection`. Tienen `search_path` cerrado, verifican `auth.uid()`, y consultan `private_sync.sync_lab_allowlist`. No se habilitarán fuera del laboratorio en esta integración.
- Revisión SQL **solo lectura** del 20 nov: las cinco RPC coinciden en los cuatro controles auditados (sin permiso `anon`, con permiso `authenticated` restringido por función, `auth.uid()` presente y uso de `sync_lab_allowlist`), y todas fijan `search_path` vacío. Se verificó estructura, **no** se intentó suplantación de una cuenta real fuera de la allowlist.
- El esquema permite importar una colección local inicial mediante `import_guest_collection`; antes de abrir altas generales requiere decisión y prueba adicional sobre la confianza del respaldo heredado y el posible abuso de cartas importadas.
- Las claves de navegador son publicables, no `service_role`. No introducir claves secretas en HTML, JavaScript ni CI.
- Aviso pendiente del asesor: **Leaked Password Protection Disabled**. La organización Insert Coin MX está en el plan **Free** y Supabase documenta esta protección como disponible en **Pro o superior**: **no es un interruptor habilitable en el plan actual**. No exigir una contratación para fusionar; antes de abrir registros públicos, verificar en Dashboard las reglas de longitud/complejidad, confirmación de correo y controles de rate limit, que sí forman parte de la estrategia de seguridad. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Confirmar manualmente en Dashboard → Auth → URL Configuration que Site URL y callbacks permitidos son exactamente los dominios de producción y QA requeridos. La cuenta real ya superó una prueba de callback, pero no se ha auditado toda la configuración desde este conector.
- La rama `main` de GitHub no tiene protección activa. Configurar aprobación y checks obligatorios antes de fusionar. No se modificó esa configuración.

## Criterios para dejar el borrador
1. `validacion.yml` y `qa-sync-browsers.yml` en verde con nuevo `index.html`, y comprobar que el smoke anónimo sigue bloqueando acceso no autorizado.
   La verificación `qa/check-profile-gameplay-invariants.mjs` compara contra el ancestro común de `main`, bloquea cambios fuera del perfil y exige igualdad byte a byte en diez regiones críticas: catálogo, cuotas, aplicación de sobres, canjes, probabilidades, emisión, álbum, Tier, Reta y Récords.
2. Comprobar en el diff que `openPack`, pesos de rareza, emisión, `applyPack`, lógica de colección, Récords y Reta no sufrieron modificaciones.
3. Registro + correo + ingreso + cierre + segundo navegador en el dominio objetivo; comprobación de 5 cartas recuperadas y avatar Jos sin desajuste inicial.
4. Confirmar que una cuenta no incluida en la allowlist no recibe falsa confirmación de respaldo, y que sigue siendo posible jugar como invitado sin pérdida de datos.
5. En el plan Free, revisar los controles alternativos de contraseñas y autenticación; la protección de contraseñas filtradas exige Pro o superior. Revisar la estrategia de importación inicial antes de abrir el servicio y confirmar protecciones de rama.
6. Autorización explícita para publicar. **No fusionar automáticamente**.

## Retorno seguro
No hay migraciones ni cambios de Supabase. Si fallan las pruebas, cerrar el PR de integración conserva `main` y la colección real intactos. No fusionar #87 por separado.


## Decisión aprobada: nueva colección desde cero

**20 de noviembre de 2026**: al lanzar el perfil y las cuentas, **todos los jugadores inician nuevamente con cero cartas**, incluyendo las aproximadamente 3–4 personas que jugaron la versión previa y las cuentas de QA. No se importan colecciones viejas ni se migran cartas; todos reciben las reglas de bienvenida vigentes (5 sobres). Se conservan el acceso a cuentas y las preferencias cosméticas como el avatar, porque no representan progreso del álbum.

### Preparado en la PR, deliberadamente desactivado

- `content/release-reset.js` se carga **antes** de leer el progreso local en la raíz, pero el HTML conserva `data-active="false"`. Al activar `data-active="true"` *durante el despliegue coordinado*, elimina **una sola vez por edición** el álbum anterior, datos pendientes, respaldos internos y rastros de sincronización local. **No borra** sesiones Auth, cuenta, avatar ni otras preferencias.
- El marcador `icmx-game-epoch` evita reinicios en posteriores recargas. La prueba `qa/release-reset.test.mjs` verifica preservación de identidad, idempotencia y ausencia de impacto mientras esté desactivado.
- Con la edición activa, los respaldos manuales exportados incluyen `edition` y la importación de respaldos anteriores sin esa edición queda rechazada; un respaldo generado después del estreno sí podrá recuperarse.
- La migración de beta preparada `supabase/sql/prepare_public_beta_CLOSED.sql` mantiene la compuerta pública APAGADA y revoca el acceso a `import_guest_collection`; todavía **no está instalada**.

### Requisitos de publicación, en orden

1. Respaldar el estado de Supabase **para recuperación operativa**, no para restaurar cartas a jugadores. Aprobar y verificar un reinicio transaccional de las tablas de progreso, emisión, eventos y canjes, conservando identidades de `auth.users`, avatares en `user_metadata` y catálogo/bolsa de sobres. **No ejecutado aún**.
2. Preparar y validar la compuerta de beta cerrada. El acceso público y la revocación de importación heredada son cambios independientes del reinicio de cuentas.
3. Activar `data-active="true"` solo en la versión candidata de lanzamiento, cuando el servidor ya tenga el nuevo estado limpio. Repetir toda la batería CI y la prueba real de dos sesiones contra esa versión.
4. Mantener `main` y el sitio público intactos hasta completar esas verificaciones y recibir autorización para fusionar y publicar.

**Advertencia operativa:** activar solo el reinicio local NO es suficiente: una cuenta autenticada podría recuperar cartas del servidor antiguo. Tampoco basta con borrar datos de Supabase: el navegador seguiría enseñando cartas viejas hasta abrir la nueva versión. Ambos lados deben cambiarse coordinadamente.
