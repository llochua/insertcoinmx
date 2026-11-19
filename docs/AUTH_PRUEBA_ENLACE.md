# Fase 1 · Acceso experimental a cuentas (solo pruebas)

**Fecha:** 19 de noviembre de 2026.  
**Supabase:** organización Insert Coin MX, plan Free; proyecto `insertcoinmx-tcg`; ref `ynugqxbtszhsupadqdkz`.  
**GitHub:** rama `feat/fase1-auth-enlace-20261119` creada a partir de `fase1-preview`, no de `main`. No desplegar en el dominio público sin validación.

## Qué hace
- Añade en «Mi perfil» un formulario de correo.
- Solicita un enlace a Supabase Auth mediante `signInWithOtp` (con la plantilla predeterminada de **Magic Link**, no un código de seis dígitos).
- Permite sesión y cierre de sesión; muestra el correo autenticado. Usa `getUser()` para verificar cuenta.
- No toca el progreso local (`icmx-album2`); no restaura, sincroniza, sube ni mezcla colecciones, puntuaciones o sobres.
- No usa claves secretas: solo la **publishable key**, apta para clientes públicos con seguridad RLS.

## Paso manual imprescindible en Supabase
El conector actual de Supabase no incluye una acción para configurar las URLs de redirección de Auth; se necesita hacerlo desde el Dashboard.

1. En https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/auth/url-configuration, dentro de **Redirect URLs**, añadir exactamente:
   `https://raw.githack.com/llochua/insertcoinmx/feat/fase1-auth-enlace-20261119/index.html?auth=callback`
2. Guardar. No cambiar `Site URL` de producción solo para esta prueba.
3. Abrir `https://raw.githack.com/llochua/insertcoinmx/feat/fase1-auth-enlace-20261119/index.html` en un navegador de pruebas. Entrar en **Mi perfil**.
4. Probar únicamente con correo que sea miembro del equipo de esta organización Supabase, ya que el SMTP predeterminado de Supabase Free **solo entrega a correos autorizados y hasta 2 correos/hora**.
5. Clic en «Enviar enlace», abrir el mensaje en el mismo navegador; confirmar que el perfil muestra la sesión. Cerrar sesión y verificar que el álbum y las cartas siguen sin cambios.
6. Antes de publicar, eliminar la URL de prueba del allowlist y elegir un dominio controlado por Insert Coin MX.

**Precaución:** raw.githack.com es un servidor de previsualización de terceros. Solo usar cuentas/correos de prueba y **nunca** hacer la prueba con datos privados de jugadores. La prueba final debe ser desde un origen de confianza de Insert Coin MX o localhost autorizado.

## Advertencias verificadas en 2026
- La plataforma Free nueva con SMTP incluido **no permite modificar plantillas de email**, así que la plantilla por defecto envía un **enlace**, no un OTP de seis dígitos diseñado por nosotros.
- Este SMTP no es válido para usuarios del público general sin SMTP externo. Para mantener $0, analizar proveedor SMTP gratuito sujeto a cuotas o acceso OAuth con Google (sujeto a configuración y revisión de condiciones vigentes).
- No desactivar confirmación de correo para «hacerlo funcionar»: permitiría suplantar direcciones sin verificar.
- Sin registro de eventos ni escritura de cartas en la nube todavía. Los visitantes siguen jugando como invitados.
- La prueba sintáctica de JavaScript y la revisión de datos no sustituyen E2E real. Faltan navegador móvil y dos cuentas reales.

## Documentación oficial
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
