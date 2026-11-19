# Insert Coin MX — Fase 1 · Registro por correo

**Estado (19 nov 2026):** interfaz y conexión a Supabase preparadas en rama; **no publicada en main, sin prueba de extremo a extremo**.

## Entregado

- Acceso a **Mi perfil** desde el encabezado del Home, reutilizando la identidad del juego.
- Resumen de colección, porcentaje de avance y respaldo manual (sin cambiar el formato de los datos).
- Módulos **Crear cuenta / Iniciar sesión / Cerrar sesión** con correo y contraseña.
- Registro con `supabase.auth.signUp`, redirección a `https://insertcoinmx.com/` y plantilla **Confirm signup**.
- Inicio con `signInWithPassword`, persistencia de sesión, `onAuthStateChange`, reconocimiento del regreso desde el correo y cierre de sesión local.
- SDK CDN de `@supabase/supabase-js` fijado a `2.95.3`, public key exclusivamente.
- Fallo aislado: si no carga el SDK o Supabase, la navegación al juego y el progreso local siguen funcionando.

## Estado de servicios

- Proyecto Supabase: `insertcoinmx-tcg`, activo, con tablas de perfiles y colección y RLS habilitado (consulta de noviembre).
- El usuario confirmó haber verificado `insertcoinmx.com` en Resend, configurado SMTP, pegado el HTML de confirmación y actualizado Site URL / Redirect URLs.
- **No se ha probado desde la app** el envío real, confirmación de correo, devolución al sitio ni persistencia de sesión.
- No almacenar API keys privadas de Resend ni `service_role` en el repositorio.
- Aviso Supabase Security Advisor: `auth_leaked_password_protection` (WARN). Revisar si se puede habilitar protección de contraseñas filtradas antes de abrir registros al público.

## Límites deliberados

- **NO** se sincronizan `S`, `localStorage['icmx-album2']`, cartas, sobres, calificaciones ni histórico.
- Un inicio de sesión **NO** equivale a respaldo en la nube. Los jugadores pueden seguir como invitados.
- Cerrar sesión **NO** borra el progreso local; en dispositivo compartido seguirá disponible. Será necesario diseñar la separación y migración segura de colecciones antes de lanzar esta función públicamente.
- No hemos modificado la base de datos ni sus políticas en este paso.
- Falta implementar la recuperación de contraseña y preparar su correo de recuperación con la identidad Insert Coin MX.

## Verificación previa al lanzamiento

1. Revisar que **Email provider** y **Confirm email** estén habilitados en Authentication.
2. En una copia desplegada segura, probar registro nuevo con contraseña de al menos ocho caracteres.
3. Verificar que Resend envíe **Confirm signup** desde `acceso@insertcoinmx.com` y que el logotipo se muestre en Gmail/Outlook.
4. Pulsar el botón del correo y revisar sesión redirigida a `https://insertcoinmx.com/`.
5. Probar login, logout y retorno de sesión tras recargar.
6. Antes/después de cada prueba, validar que las cartas y el backup local no cambian.
7. Repetir desde un segundo dispositivo y documentar que no hay sincronización todavía.
8. Probar diseño móvil y errores de conexión/rate limits.
9. Implementar migración y aislamiento de progreso por usuario, después pruebas de seguridad y regresión.
10. Solo con validación, fusionar a `main` y activar públicamente las cuentas.

Referencias:
- [Plantilla de confirmación](../emails/confirm-signup.html)
- [Documentación de registro por contraseña de Supabase](https://supabase.com/docs/guides/auth/passwords)
- [Plantillas de correo de Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)
