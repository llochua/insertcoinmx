# Insert Coin MX — Fase 1 · Cuentas y avance hacia respaldo de colección

**Actualizado el 19 de noviembre de 2026.** Las pruebas de correo y acceso se completaron con una cuenta real, mediante la página de QA alojada en GitHub Pages. La integración completa de Mi perfil permanece en el PR [#61](https://github.com/llochua/insertcoinmx/pull/61), en borrador.

## Comprobado

- Resend + Supabase envían el correo **Confirm signup** de Insert Coin MX.
- El usuario confirmó el registro y el regreso de autenticación a `/qa/registro/`, con sesión activa y correo confirmado.
- El usuario informó que pudo **cerrar e iniciar sesión de nuevo**.
- Las pruebas automatizadas de GitHub cubren el formulario y su aislamiento del progreso local; sus resultados no reemplazan las pruebas de navegador.
- La ruta **`/qa/registro/`** está publicada en `main` como herramienta aislada de QA. **No se ha publicado el nuevo `index.html` de Mi perfil.**
- Existe una función de diagnóstico **voluntario y de solo lectura** en QA para contar variantes y copias en `localStorage['icmx-album2']`. No envía ni modifica el progreso.

## Auditoría del guardado antes de habilitar sincronización

**App actual (main):**

- La partida viva se almacena como JSON en `localStorage['icmx-album2']`.
- La clave `icmx-album2.ext` conserva cartas y datos no reconocidos por la versión actual del catálogo.
- La exportación existente usa `buildBackup()`, cuyo JSON contiene `app:'insertcoinmx-album'`, `format:2`, `exportedAt`, `data` y opcionalmente `ext`.
- `validateBackup()` impone validaciones, incluyendo límite de un megabyte.
- La importación actual **reemplaza** el progreso, con copia previa en `icmx-album2.bak` y reversión local ante error. **No** debe invocarse automáticamente al iniciar sesión.

**Supabase (consultado en el mismo proyecto):**

- Tablas `player_profiles`, `player_snapshots`, `collection_cards`, `collection_events`, `import_receipts` creadas con RLS.
- Por ahora, `authenticated` tiene acceso **SELECT** a `player_snapshots`, `collection_cards`, `collection_events` e `import_receipts` y solo puede insertar/actualizar `player_profiles`.
- **Todavía no hay permiso de escritura de progreso, ni se ha realizado una carga real de colección.** No cambiar políticas sin una estrategia de seguridad y una prueba de recuperación.

## Política de importación inicial que se recomienda implementar después

1. Seguir permitiendo jugar como invitado; vincular la cuenta no debe iniciar la importación por sí solo.
2. Identificar al usuario con Supabase Auth y mostrar al jugador un **resumen local, cuenta de destino y estado de nube**.
3. Antes de subir, generar y conservar un respaldo **local descargable** usando el formato oficial de `buildBackup()`. Un error de exportación bloquea el intento; el usuario puede recuperarlo sin depender del servidor.
4. **Primera subida solamente**: si la cuenta no tiene snapshot, insertar uno bajo el `user_id` autenticado con RLS `WITH CHECK ((select auth.uid()) = user_id)`. No conceder permisos generales de `UPDATE` en esta etapa.
5. Si hay snapshot existente, **detenerse y comparar**; nunca ejecutar `upsert` ni reemplazarlo en automático. El mismo criterio aplica al regresar con otro dispositivo o cuenta.
6. Confirmar la escritura con lectura posterior de la misma fila, validando el contenido. Solo entonces mostrar **respaldo guardado**.
7. Preservar `icmx-album2` y `icmx-album2.ext` exactamente como están; nunca borrar ni reescribir al enviar el respaldo.
8. Antes de habilitar restauraciones o sincronización bidireccional: diseñar conflictos, cantidades repetidas, packs, reloj, logros, datos desconocidos y protección entre usuarios/dispositivos; probarlo con datos artificiales y después con una cuenta de prueba.

## Estado real

- **Cuentas / confirmación / login:** comprobados.
- **Inspección de colección local:** disponible en QA, sin subir datos.
- **Copia en Supabase:** todavía NO implementada.
- **Sincronización entre dispositivos:** todavía NO implementada.
- **Mi perfil integrado en el juego:** aislado en PR #61, todavía NO publicado.

Infraestructura: solo GitHub Pages + Supabase + Resend. No Cloudflare ni otras cuentas.
