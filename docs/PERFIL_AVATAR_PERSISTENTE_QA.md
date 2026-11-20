# Avatar del jugador · integración con cuenta (QA)

**Alcance:** se prepara sobre `feat/perfil-cuentas-integradas-20261120`; sigue en entorno de prueba. No modificar ni desplegar `main/index.html` hasta validar Auth end-to-end.

## Flujo
1. Inicio y Mi perfil muestran el mismo avatar, con 12 opciones aprobadas.
2. Selección abre una pantalla, permite previsualizar, cancelar sin guardar y guardar explícitamente.
3. Invitado: preferencia cosmética en `localStorage['icmx-avatar-guest-v1']`, independiente de `icmx-album2`.
4. Usuario con sesión validada: preferencia cosmética en `user_metadata.icmx_avatar_id` mediante `auth.updateUser({data:{...}})`.
5. El frontend valida que el ID esté entre los 12 permitidos, y para un cambio de cuenta verifica la sesión y el ID de usuario antes de confirmar.
6. Si falla el servidor o el almacenamiento, no se anuncia éxito ni se reemplaza el avatar anterior.
7. Cambiar de cuenta vuelve a mostrar el avatar de esa cuenta; cerrar sesión restaura el avatar guardado como invitado.

## Seguridad
- `user_metadata` **no** es autorización y nunca debe usarse para controlar sobres, premios, acceso ni RLS. Solo guarda el ID gráfico.
- No se crean tablas, triggers, políticas ni migraciones; no se escriben cartas ni se hace importación de progreso por esta función.
- El archivo de metadatos no contiene URLs arbitrarias ni permite cargar imágenes externas.
- La sincronización de cartas continúa siendo independiente; no altera las condiciones de seguridad de la PR #72.

## Validación
- `node --test qa/profile-auth-unit.test.mjs`: verifica que el avatar se guarda en los metadatos y no toca el álbum.
- `node qa/profile-browsers.mjs`: flujo de invitado y persistencia tras recargar, en Chromium.
- Revisión manual pendiente: entrar con dos cuentas autorizadas distintas, elegir avatar A y B, recargar e iniciar sesión en segundo navegador, y comprobar que no se mezclan.
- PENDIENTE: correo real y seguridad de registro/sync de PR #72 antes de activar el perfil en el juego público.
