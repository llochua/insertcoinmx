# Invitado verificable — etapa de integración (no producción)

## Invariantes

- La identidad anónima de Auth y la cuenta convertida tienen el mismo UUID.
- El servidor genera sobres y canjes; el cliente no puede incrementar cantidades, cambiar cuotas ni editar historial económico.
- No se modifica la colección al vincular un correo, verificarlo o establecer una contraseña.
- Invitado no publica perfil ni votos comunitarios. No se amplía la función can_access_beta: solo se agrega can_access_game para las cuatro RPC económicas y de snapshot.
- Guardar archivos anteriores sigue siendo posible; nunca se importan como cartas verificadas.
- Correos existentes no reemplazan la sesión de invitado. La vinculación con una cuenta existente requiere otro flujo de revisión, explícito y verificable.
- Las cuentas anteriores siguen con los permisos actuales mientras verified_guest está apagado.

## Activación controlada

1. El archivo backend-review.sql es SQL de revisión, no una migración aplicada. Probar en Supabase local/desechable contra las migraciones existentes y generar la migración definitiva con la CLI. No ejecutar en producción todavía.
2. Configurar Auth anónimo, vinculación de identidad, confirmación de cambio de correo, URLs autorizadas, protección CAPTCHA/Turnstile y límites de solicitudes. No exponer claves privadas o secretas. Auditar otras RPC/políticas accesibles con el rol authenticated.
3. El frontend permanece desactivado por defecto (ICMX_VERIFIED_GUEST_PLAY !== true). Para QA habilitarlo antes de ejecutar el script de index y proporcionar icmxGuestCaptcha(), que devuelve un token CAPTCHA válido. Si no hay token, la partida verificada no se inicia; no se emiten sobres localmente cuando está habilitado.
4. El flag de servidor verified_guest debe permanecer false hasta terminar la validación del entorno. No confundirlo con public_beta.
5. Activar frontend y backend coordinadamente. Si se desactiva la característica, las colecciones verificadas conservan su vínculo y no pueden acuñar cartas localmente.
6. Probar con un invitado real en entorno aislado: primera apertura, cinco sobres iniciales, reconexión, mismo request_id tras pérdida de respuesta, canje, calificaciones, confirmar correo, establecer contraseña, segundo navegador, privacidad de otros UUID y rechazo de modificar cantidades/cuotas. Asegurar que no pierde carta ni vuelve a recibir bienvenida.
7. Probar email ya registrado, confirmación vencida, recarga durante registro, cierre de pestaña, almacenamiento lleno, falta de CAPTCHA, doble pestaña, navegador sin Web Locks. Comprobar que no se generan nuevas identidades si hay vínculo local sin sesión.
8. Proteger y conservar colecciones invitadas antiguas de forma independiente; no certificarlas automáticamente. Mantener accesible la recuperación del PR #117. Si el registro global no puede completar esta transición sin una decisión del jugador, el lanzamiento de la funcionalidad queda bloqueado.

## Validación

Los tests existentes incorporan una simulación del SDK y nuevas pruebas de UID, conversión y primer sobre de invitado. No sustituyen la prueba con Supabase Auth real, confirmación de email y CAPTCHA. No se debe aprobar el PR por CI general únicamente.
