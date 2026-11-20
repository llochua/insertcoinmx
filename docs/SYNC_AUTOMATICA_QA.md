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

## Ampliación de QA: Supabase real e integridad de respaldos
- Se integraron en la rama los dos commits que habían llegado a main: artes especiales de Frieza Infinito y Robogodín, además de IMGV. No se alteraron identificadores persistidos.
- Smoke test real de Supabase contra API con clave publicable y **sin sesión**: Auth rechaza perfil, PostgREST no entrega colecciones ajenas y la RPC no admite sincronización. Ejecución automatizada en `qa/supabase-live-anon.mjs` (no crea cuentas ni escribe datos).
- Migración aplicada `guard_snapshot_payload_lab`: la función CAS del laboratorio rechaza nombres JSON inseguros (incluidos anidados), cuotas fuera de rango, modo de prueba, historial de sobres demasiado largo, malformado o repetido.
- SQL dentro de `BEGIN ... ROLLBACK`: actualización válida; seis variantes de respaldo inválido rechazadas; CAS obsoleto rechazado. Tras `ROLLBACK`: 2 cuentas, 1 snapshot y revisión 1.
- **Límite de seguridad:** los checks de estructura NO validan origen legítimo de cartas, resultado probabilístico, canjes ni elegibilidad real de sobres. Se mantiene la RPC restringida a la cuenta de laboratorio y el PR en borrador.
- No existen credenciales de sesiones A/B aportadas al runner: no se afirma haber probado dos sesiones reales de Supabase.

## Apertura autoritativa y canjes · laboratorio (20 noviembre 2026)
- El catálogo de sobres se guarda en `private_sync.pack_pool`: **354 variantes**, extraídas de `DESIGNS` y excluyendo diseños `bx` que no salen en sobres (86 Base, 97 Holo, 97 Dorada, 74 Full). Es una versión estática que deberá mantenerse alineada con el catálogo al añadir/quitar diseños.
- `public.issue_player_pack(request_id, expected_revision)`: Supabase decide cinco cartas, la cuota disponible, la recompensa Full del primer sobre y la revisión. Bloquea snapshot por usuario y registra cada emisión en `private_sync.pack_issues`; reintentar el mismo UUID retorna la emisión anterior.
- `public.exchange_duplicate_cards(request_id, expected_revision)`: consume exactamente cinco repetidas, conserva al menos una unidad de cada carta, incrementa un sobre extra y registra el canje idempotente en `private_sync.pack_exchanges`.
- La RPC de snapshot `sync_player_snapshot` ahora rechaza cambios directos a `have`, `pk`, `fg`, `last`, `extra`, `welcomeLeft`, `freeDay`, `freeUsed`, `freeCycle`, `test` y `ext` al actualizar una revisión ya existente. Sigue aceptando campos sociales/editoriales; solo los endpoints de juego escriben cartas/cuotas.
- En `index.html`, cuentas detectadas usan RPC para sobres y canjes. Invitados conservan el modo local. UUIDs pendientes se guardan en localStorage por cuenta: una interrupción de red no puede duplicar el resultado.
- SQL reversible comprobado: primer sobre con Full; cinco bienvenidas consumidas; sexto rechazado; misma petición repetida; CAS obsoleto rechazado; canje exacto de cinco duplicadas; obtención de sobre extra; intento de modificar cartas/cuotas vía sincronización rechazado; cuenta fuera del laboratorio rechazada.
- **Todas las pruebas SQL mutadoras fueron realizadas bajo `BEGIN ... ROLLBACK`**. Estado verificado después: dos cuentas, un snapshot con revisión 1, cero emisiones y cero canjes persistidos.
- **Límites pendientes:** la aceptación inicial de respaldos antiguos solo está permitida en la cuenta de laboratorio; no es una ruta aprobada para crear cuentas públicas con cartas verificadas. La validación antifraude para migrar colecciones preexistentes necesita política explícita. Los canjes y las cuotas están protegidos para snapshots existentes, pero siguen pendientes pruebas con dos sesiones reales de Supabase Auth, controles de UX completos para respuestas de error y revisión de seguridad antes de ampliar la lista permitida.

## Alta segura de colecciones vacías · laboratorio
- Se incorporaron a la rama los cambios de `main` del 20/nov: siete ilustraciones, `IMGV 20261120b` y fondo continuo de Evilexes. La rama ya no está detrás de `main`.
- Migración aplicada `ensure_player_snapshot_lab_20261119`: la RPC `ensure_player_snapshot()` no acepta cartas, cuotas ni estado del cliente; verifica Auth y correo confirmado, exige lista de laboratorio, crea exclusivamente un snapshot vacío en revisión 1 y usa `ON CONFLICT DO NOTHING`.
- SQL reversible con cuenta existente: dos invocaciones no modifican su snapshot. Con la segunda cuenta temporalmente autorizada dentro de la transacción: inicialización nueva, repetición idempotente, primera apertura con Full y nueva inicialización que conserva el progreso. Se ejecutó `ROLLBACK`; lista de laboratorio, cuentas y respaldos sin cambios.
- `content/cloud-sync.mjs` inicia automáticamente el snapshot **solo** cuando no hay progreso local ni remoto; no intenta migrar una colección local existente. Si hay progreso local sin snapshot remoto, se mantiene el estado de respaldo inicial pendiente para no perder ni inventar cartas.
- Sigue pendiente la política de migración de colecciones antiguas y prueba de sesiones Auth reales en dos dispositivos. No ampliar lista de laboratorio ni fusionar hasta cerrar esas validaciones.

## Cierre de dos riesgos críticos · 20 noviembre 2026
- `close_untrusted_initial_upload.sql` aplicada: `sync_player_snapshot` ya no acepta `expected_revision=0` ni crea snapshots. El alta se realiza exclusivamente mediante `ensure_player_snapshot()`, que crea un inventario vacío del lado del servidor.
- SQL con `BEGIN/ROLLBACK`: rechazo de alta con 999 cartas inventadas, rechazo de inventario falsificado en una revisión existente y actualización legítima de un campo editorial aceptada. Al terminar, dos usuarios, un snapshot en revisión 1, cero emisiones y cero canjes persistidos.
- Protección de cambio de cuenta: como el álbum del navegador aún usa un almacenamiento local compartido, `cloud-sync.mjs` asocia el dispositivo a la primera cuenta sincronizada y bloquea operaciones de nube cuando cambia el UID. No borra ni migra automáticamente ninguna colección. La prueba Chromium verifica que no cambian el álbum local ni los snapshots de ninguna de las dos cuentas.
- **Limitación consciente:** para permitir cambiar entre varias cuentas en un mismo dispositivo será necesario particionar el almacenamiento local por UID y diseñar una transición segura. Por ahora se prefiere bloquear a mezclar cartas.

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
