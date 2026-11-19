# Supabase — Fase 1: base de jugadores

**Estado verificado:** 19 de noviembre de 2026.  
**Organización:** Insert Coin MX, plan `free`.  
**Proyecto:** `insertcoinmx-tcg` (ref `ynugqxbtszhsupadqdkz`), región `us-east-1`.  
**Migración aplicada:** `20261119194135_fase1_player_storage_secure_base`.  
**Entorno:** Proyecto conectado, aún **sin ninguna cuenta del juego vinculada**; no se cambió `main` ni se subió progreso de jugadores.

## Qué existe actualmente

1. `public.player_profiles`: un registro por usuario de Supabase Auth; alias de 3 a 20 letras/números/guion bajo, único sin distinguir mayúsculas; `is_public` por defecto falso, fechas de creación y modificación.
2. `public.collection_cards`: `(user_id, card_key)` único, `quantity` entre 1 y 9999, clave de formato `id_[berf]`. La BD todavía no verifica contra el catálogo maestro vigente: debe validarlo la lógica confiable del servidor.
3. `public.player_snapshots`: una instantánea por usuario con `game_format`, `state` JSON, revisión y fecha; tamaño máximo 1 MB. Pendiente validar contenido y controlar conflictos/reescrituras con lógica de servidor.
4. `public.collection_events`: operaciones con `(user_id,event_id)` único; `event_kind` limitado a `pack_opened`, `trade`, `backup_imported`, `rating_updated`, `reta_completed`, `state_adjusted`. Es una tabla futura, no hay API de eventos funcionando.
5. `public.import_receipts`: `(user_id, backup_sha256)` único para evitar volver a importar una misma copia de progreso; faltan el procedimiento seguro de importación y pruebas completas.

Todas las tablas usan referencias a `auth.users(id)` con eliminación en cascada y **RLS habilitada**. Las cinco se comprobaron con `list_tables`.

### Permisos verificados
- Rol `anon`: **sin permisos de tabla** para estas cinco tablas.
- Rol `authenticated`: `SELECT` con `auth.uid() = user_id` para sus propios datos.
- `player_profiles`: adicionalmente `INSERT` y `UPDATE` permitidos solo cuando `user_id = auth.uid()`, con políticas `USING` y `WITH CHECK`.
- Cartas, snapshots, eventos e import receipts: **sin `INSERT/UPDATE/DELETE` del cliente**. Escribir cartas desde navegador sería inseguro hasta desarrollar un servidor que valide jugadas, sobrecargas y migración.
- Se revocó `EXECUTE` a `PUBLIC`, `anon` y `authenticated` sobre `public.rls_auto_enable()`, una función `SECURITY DEFINER` creada por la opción «Enable RLS on new tables automatically». Se verificó que ambos roles de cliente no la pueden ejecutar.
- Análisis de seguridad de Supabase posterior a la migración: **cero avisos/lints**. Eso no reemplaza pruebas reales de acceso con usuarios A/B.

## Próximas tareas (no implementadas)

1. Verificar permisos mediante pruebas de usuario real A/B y sin sesión: aislamiento lectura/escritura de las tablas.
2. Preparar inicio de sesión opcional por correo/Google y configurar correctamente redirección y dominios permitidos. No publicar credenciales privadas en `index.html` o GitHub.
3. Crear la ruta confiable de servidor que valide packs y transacciones, histórico de eventos y migración de respaldo inicial de invitado. No copiar colecciones automáticamente.
4. Resolver conflictos y revisión entre colecciones de distintos dispositivos con idempotencia, sin sumar ciegamente cartas ni sobres.
5. Conectar perfiles, registro, carga y recuperación en una **rama aislada** con pruebas; `main` solo después de QA.
6. Diseñar API de votos de invitados/registrados y resultados públicos con controles de abuso; todavía no existe.
7. Registrar las futuras migraciones versionadas en el repositorio y comprobar compatibilidad contra el esquema real.

## Control de costos y transferencia de cuenta

Se verificó en Supabase el plan `free` de la organización. No se crearon ramas de base de datos ni proyectos adicionales. Es posible volver a conectar la misma organización Supabase desde otra cuenta de ChatGPT con permisos adecuados; ninguna conexión de ChatGPT se transfiere automáticamente.

La migración arriba identificada está registrada **en Supabase**; este archivo documenta el estado, pero no es un volcado SQL íntegro ni copia de la base de datos. Para transferir realmente la cuenta o recuperar la BD, usar la consola y los mecanismos de exportación/migraciones verificados de Supabase, sin exponer secretos.

## Fuentes de referencia
- Documentación RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Seguridad de API: https://supabase.com/docs/guides/database/secure-data
- Plan y cuotas: https://supabase.com/pricing
- GitHub: https://github.com/llochua/insertcoinmx
- Documento de continuidad: `docs/CONTINUIDAD_Y_TRASPASO_CUENTA.md` está pendiente en una rama separada/PR #56.

No afirmar que hay login funcional, nube sincronizada o votos públicos: la base está creada, pero falta la integración y validación de negocio.

## Prueba reversible de aislamiento RLS — 19/11/2026

Se probó el esquema conectado con dos identidades UUID ficticias y cartas de cantidad distinta (2 y 7), utilizando roles PostgreSQL `authenticated` y `anon` con un `request.jwt.claim.sub` simulado. La prueba completa corrió dentro de `BEGIN ... ROLLBACK` y el resultado arrojó **9/9 validaciones aprobadas**:

- Jugador A solamente visualiza sus cartas, perfil y respaldo (3 pruebas).
- Jugador A no puede modificar el perfil de B ni crear el perfil de un tercero (2 pruebas).
- Jugador A no puede insertar cartas arbitrarias (1 prueba).
- Jugador B solamente visualiza sus cartas y perfil (2 pruebas).
- Invitado `anon` no puede consultar cartas privadas (1 prueba).

**Verificación de limpieza posterior:** `auth.users`, `player_profiles`, `collection_cards`, `player_snapshots`, `collection_events` e `import_receipts` quedaron con **0 filas** cada una. El análisis de seguridad retornó **0 advertencias**.

Alcance: prueba de permisos a nivel SQL y RLS con contexto JWT simulado; **no es una prueba de autenticación real desde el navegador**, ni demuestra que los flujos de inicio de sesión, redirect, sincronización de colecciones o protección ante abuso estén terminados.

Siguiente punto técnico: configurar la autenticación opcional, revisar URL de redirección de Supabase y realizar la misma validación con dos sesiones reales. Fuente: https://supabase.com/docs/guides/auth/redirect-urls
