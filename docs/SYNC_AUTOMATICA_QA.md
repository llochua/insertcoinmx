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
- **Prueba end-to-end en Chromium real con nube simulada**, ejecutando el juego de esta rama en dos contextos aislados:
  - B restauró la colección sin duplicar cartas.
  - Apertura real de sobre en A: cinco cartas nuevas recibidas también en B, con cuota e historial intactos.
  - Reintento: no se incrementó la revisión remota dos veces.
  - Desconexión: B guardó localmente, subió al reconectarse y A recibió el cambio.
  - Dos sobres abiertos en paralelo: cada dispositivo guardó cinco cartas, solo uno se confirmó en la nube y el segundo quedó bloqueado como conflicto sin perderse.
  - Tercer usuario de prueba: no recibió colección ajena.
  - Sin errores JavaScript en los tres contextos.
  - Evidencia: https://github.com/llochua/insertcoinmx/actions/runs/44663141911 (éxito).
  - **Límite**: servidor y sesiones simulados, sin usar Supabase real ni cuentas reales.

## Pendiente antes de considerar main
1. **Prueba con Supabase real y sesiones autenticadas**: dos navegadores con el mismo origen; recuperación, apertura, reintento y conflicto. Chromium con nube simulada ya pasó, pero no sustituye esta prueba.
2. **Validación de jugadas en servidor**: la RPC de laboratorio comprueba revisión/formato, pero todavía no que las cartas provengan de sobres legítimos ni que la cuota esté disponible. No habilitar escritura general.
3. Resolución consciente de conflictos sin sumar cantidades automáticamente ni perder ninguno de los dos estados.
4. Revisar avisos del asesor Supabase: función SECURITY DEFINER deliberada de laboratorio, contraseñas filtradas y aviso informativo RLS de lista privada.
5. main recibió commits paralelos; reconciliar antes de cualquier fusión preservando las ilustraciones recientes.
6. QA final y autorización explícita antes de publicar.

## Protección y alcance
- `main` no ha sido modificado por estos cambios.
- No se eliminan cuentas ni colecciones; el reinicio general se pospone hasta antes del lanzamiento oficial.
- Sin nuevos servicios pagos ni ramas de base de datos con costo.
