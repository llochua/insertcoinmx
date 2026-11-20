# Insert Coin MX — sincronización entre dispositivos (QA)

Estado: rama `feat/sync-automatica-segura-20261119`, PR #63 en borrador. **No fusionada a main**.

## Implementado
- Cliente de sincronización vinculado a la sesión de `/qa/registro/`, sin exponer ninguna clave privada.
- Primer respaldo requiere consentimiento explícito en el laboratorio actual.
- Snapshots posteriores usan CAS con revisión esperada; un reintento obsoleto no duplica ni sobrescribe.
- Descarga automática solo cuando el dispositivo no tenía progreso propio o existe una base sincronizada conocida sin cambios locales.
- Si local y nube difieren sin historia compartida o ambos avanzaron: conflicto protegido, sin mezcla automática.
- Restauración fiel de `freeCycle`, `freeUsed`, historial de sobres, cartas, Reta y datos `.ext`. Copia `.bak` antes de sustituir y revierte si el estado normalizado no coincide.
- Si no se puede guardar localmente, no se sube el cambio a la nube.
- La sincronización conserva las colecciones de invitados en navegador.

## Migraciones aplicadas al proyecto conectado
- `sync_player_snapshot_cas_20261119`: RPC CAS autenticada.
- `allow_snapshot_revision_cas`: cambia el CHECK que exigía revisión exactamente 1 por revisión >=1; mantiene el resto de validaciones.
- `restrict_sync_to_lab_accounts`: operación restringida temporalmente a la cuenta que ya tenía snapshot de prueba. No se permite escribir con otras cuentas hasta que exista validación de jugadas desde el servidor y QA completo.

Las migraciones no eliminan usuarios, cartas ni respaldos.

## Pruebas completadas
- SQL dentro de `BEGIN...ROLLBACK`: actualización con revisión correcta, rechazo de revisión obsoleta y revisión real mantenida en 1 después del rollback.
- Aislamiento de cuenta B: no ve el snapshot de A, ni consigue actualizarlo pasando una revisión ajena.
- Roles: `anon` no ejecuta la RPC; `authenticated` solamente funciona si la cuenta está autorizada para el laboratorio.
- Tests Node: mismo progreso y reintentos; nuevo dispositivo vacío; cambios locales/remotos; conflicto; datos inválidos; reversión; recuperación exacta de cuota y extensión.
- CI valida sintaxis del JavaScript del juego y del módulo, además de catálogo/narrativas.

## Pendiente antes de considerar main
1. Prueba real con **dos navegadores o dispositivos**, sobre una vista servida desde el mismo origen con acceso a la sesión de prueba. No confundir Node/SQL con navegador real.
2. Primer respaldo en laboratorio, inicialización del baseline, abrir un sobre en A, comprobar subida y recepción en B sin duplicación; repetir con reconexión y edición concurrente.
3. Validación de jugadas en un backend confiable: actualmente la operación CAS valida forma y revisión, no que cada carta provenga de un sobre legítimo ni que el usuario tenga cuota disponible. **No activar escritura general a usuarios registrados** sin esto.
4. Resolver el procedimiento de revisión de conflictos sin perder los dos estados. Evitar un merge automático por suma o máximo.
5. Revisar los avisos del asesor Supabase: RPC `SECURITY DEFINER` deliberada y acotada a laboratorio, protección contra contraseñas filtradas inactiva y aviso informativo RLS sin política en la tabla privada de lista de prueba.
6. Confirmar QA y autorización explícita antes de fusionar el PR.

## Protección y alcance
- `main` no ha sido modificado por estos cambios.
- No se eliminan cuentas ni colecciones; el reinicio general se pospone hasta antes del lanzamiento oficial.
- Sin nuevos servicios pagos ni ramas de base de datos con costo.
