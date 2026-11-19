# Insert Coin MX — QA del primer respaldo en Supabase

**19 nov 2026 — fase de prueba; no es la sincronización definitiva.**

## Qué se permite

- En `/qa/registro/`, **solo una cuenta confirmada** puede intentar crear su primer respaldo.
- El usuario debe pulsar **DESCARGAR MI RESPALDO**; el navegador genera un archivo JSON de su progreso, con `data` y `ext` opcional. El usuario confirma explícitamente que el archivo quedó guardado.
- La subida ocurre **solo** al pulsar el segundo botón. Nunca se ejecuta automáticamente al iniciar sesión.
- El sistema comprueba antes de descargar que la cuenta no tenga snapshot; comprueba otra vez justo antes del INSERT.
- El backend usa RLS para permitir `INSERT` únicamente con `auth.uid() = user_id`. No concede `UPDATE` ni `DELETE` al rol `authenticated`.
- La PK `user_id` impide insertar un segundo snapshot en una cuenta. El cliente **no usa upsert**.
- Después de subir se lee el registro y se compara el JSON con lo enviado. Solo si coincide se muestra **respaldo confirmado**.
- Se conserva `localStorage['icmx-album2']` y `localStorage['icmx-album2.ext']` exactamente, sin cambios.
- Si el progreso cambia mientras el usuario prepara el respaldo, se cancela la subida y se solicita empezar de nuevo.

## Base de datos

Tabla existente: `public.player_snapshots`, `user_id` PK + FK a `auth.users`, `state jsonb`, `game_format`, `revision`, `updated_at`.
Se añadieron en QA:
- Permisos de `authenticated`: `SELECT`, `INSERT`.
- Permisos de `anon`: ninguno.
- Política `player_snapshots_insert_own_first`, `WITH CHECK((select auth.uid()) = user_id AND game_format=2 AND revision=1)`.
- `player_snapshots_read_own` se conserva.
- Restricción `player_snapshots_backup_format_v2` para el formato JSON oficial `insertcoinmx-album`, `format:2`, `data.have` y `data.rate` en objetos, `revision:1` y tamaño de JSON máximo de 1 MiB.
- No hay políticas de actualización o eliminación.

## Qué NO hace todavía

- No restaura ni fusiona una colección.
- No sincroniza sobres, calificaciones, retos o cartas después del primer respaldo.
- No reemplaza respaldos anteriores.
- No crea cartas por su cuenta.
- **No hace el borrado general** acordado antes del lanzamiento. Los datos de QA se eliminarán en la fecha de reinicio final que se establezca.

## Pruebas técnicas

- `tests/qa-cloud-backup.test.mjs`: simula flujo sin consentimiento, descarga, primer INSERT, verificación, bloqueo por backup previo y cambio de progreso durante la operación.
- `tests/qa-registration.test.mjs`: comprueba no manipulación de almacenamiento local, uso de public key, activación explícita y restricción de operaciones.
- También se hizo una ejecución de estos casos en memoria con cliente y DOM simulados, sin subir datos reales.

## Próxima validación con jugador

1. En la página de QA, iniciar sesión con la cuenta existente.
2. Pulsar **1 · DESCARGAR MI RESPALDO** y comprobar que se descargó el JSON.
3. Marcar la casilla solo cuando exista el archivo en su dispositivo.
4. Pulsar **2 · GUARDAR EN SUPABASE** una sola vez.
5. Confirmar el mensaje de verificación, consultar que la cuenta tenga un snapshot único y que la colección del juego continúe sin alteraciones.
6. Comprobar que al intentar repetir se bloquee el segundo respaldo.

**No publicar `index.html` del PR #61 ni abrir la sincronización al público todavía.**

## Prueba 2: consultar respaldo desde otro navegador

- Se agregó **VER MI RESPALDO EN LA NUBE** a `/qa/registro/`.
- Para probar en el segundo dispositivo, iniciar sesión con **la misma cuenta**. No es necesario ni recomendable crear otra cuenta.
- Al pulsar el botón, se verifica la identidad con `auth.getUser()`, se consulta `player_snapshots` sujeto a RLS y se valida `user_id`, versión y estructura.
- La pantalla muestra cantidad de **variantes, cartas y calificaciones** directamente desde Supabase.
- El código de consulta no lee ni escribe `localStorage`, no descarga archivos, no restaura ni modifica una sola carta. **La consulta no es todavía una recuperación de progreso.**
- Verificar el caso de un dispositivo sin colección local: debe mostrar el respaldo remoto, pero el juego local continuará vacío hasta que exista restauración manual.
- La prueba con cliente y DOM simulados pasó el caso de respaldo existente, ausencia de respaldo y propietario distinto; sin lecturas ni escrituras locales.
- La restauración vendrá después con confirmación, respaldo previo y reversión segura.
