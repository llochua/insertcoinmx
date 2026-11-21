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
- El esquema permite importar una colección local inicial mediante `import_guest_collection`; antes de abrir altas generales requiere decisión y prueba adicional sobre la confianza del respaldo heredado y el posible abuso de cartas importadas.
- Las claves de navegador son publicables, no `service_role`. No introducir claves secretas en HTML, JavaScript ni CI.
- Aviso pendiente del asesor: **Leaked Password Protection Disabled**. Ver: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Confirmar manualmente en Dashboard → Auth → URL Configuration que Site URL y callbacks permitidos son exactamente los dominios de producción y QA requeridos. La cuenta real ya superó una prueba de callback, pero no se ha auditado toda la configuración desde este conector.
- La rama `main` de GitHub no tiene protección activa. Configurar aprobación y checks obligatorios antes de fusionar. No se modificó esa configuración.

## Criterios para dejar el borrador
1. `validacion.yml` y `qa-sync-browsers.yml` en verde con nuevo `index.html`, y comprobar que el smoke anónimo sigue bloqueando acceso no autorizado.
2. Comprobar en el diff que `openPack`, pesos de rareza, emisión, `applyPack`, lógica de colección, Récords y Reta no sufrieron modificaciones.
3. Registro + correo + ingreso + cierre + segundo navegador en el dominio objetivo; comprobación de 5 cartas recuperadas y avatar Jos sin desajuste inicial.
4. Confirmar que una cuenta no incluida en la allowlist no recibe falsa confirmación de respaldo, y que sigue siendo posible jugar como invitado sin pérdida de datos.
5. Resolver la configuración de contraseña filtrada, revisar la estrategia de importación inicial antes de abrir el servicio, y confirmar protecciones de rama.
6. Autorización explícita para publicar. **No fusionar automáticamente**.

## Retorno seguro
No hay migraciones ni cambios de Supabase. Si fallan las pruebas, cerrar el PR de integración conserva `main` y la colección real intactos. No fusionar #87 por separado.
