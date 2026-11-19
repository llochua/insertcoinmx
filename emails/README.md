# Correo de confirmación — Insert Coin MX

**Estado:** plantilla HTML terminada y guardada. **Aún no está activa en Supabase**; el proveedor SMTP y las pantallas de registro siguen pendientes de conexión.

- Archivo: [confirm-signup.html](./confirm-signup.html)
- Asunto: `Confirma tu correo · Insert Coin MX`
- Remitente deseado: `Insert Coin MX <acceso@insertcoinmx.com>`
- Contenido: plantilla de confirmación de alta (Supabase Auth), en español, sin recursos externos.
- Enlaces de acción y alternativo: `{{ .ConfirmationURL }}`. **No sustituir por una URL fija.**

## Conexión cuando esté habilitado Resend

1. Crear cuenta gratuita en [Resend](https://resend.com/) y registrar el dominio `insertcoinmx.com` en *Domains*.
2. Añadir en el proveedor DNS los registros **exactos** de SPF/DKIM (y los demás registros que indique Resend), verificar y esperar el estado de dominio verificado. No inventar ni sustituir registros existentes sin revisión.
3. Crear API key en Resend. Guardarla únicamente como secreto SMTP dentro del dashboard de Supabase, **nunca en GitHub**.
4. En [Supabase → Authentication → SMTP](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/auth/smtp), activar el proveedor SMTP externo:
   - Host: `smtp.resend.com`
   - Puerto: `465` (SSL) o la opción TLS/587 indicada en el dashboard
   - Usuario: `resend`
   - Contraseña: API key de Resend (no compartirla)
   - Sender email: `acceso@insertcoinmx.com`
   - Sender name: `Insert Coin MX`
5. En [Supabase → Authentication → Email Templates](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/auth/templates), editar **Confirm signup**:
   - Subject: `Confirma tu correo · Insert Coin MX`
   - Body (HTML): copiar el archivo `confirm-signup.html` completo.
6. Revisar `Site URL` y `Redirect URLs` para el callback real del sitio, cuando se implemente autenticación. Mantener confirmación de correo activada.
7. Desactivar **link tracking** del proveedor de correo para evitar modificación de enlaces de confirmación.
8. Probar con una cuenta nueva en Gmail, Outlook y móvil: recepción, diseño, vínculo, redirección, inicio de sesión y persistencia de colección.

## Límites y consideraciones

Resend Free anuncia **3,000 correos/mes y 100 por día** (verificar cambios en [Resend Pricing](https://resend.com/pricing)). Supabase impone sus propios límites de Auth, que se configuran en Authentication → Rate Limits cuando hay SMTP externo; el límite inicial típico es 30 correos/hora.

El diseño está en el repositorio, pero el **correo no se enviará con esta marca** hasta haber verificado DNS, conectado Resend y pegado la plantilla en el dashboard de Supabase. El juego en producción todavía utiliza progreso local, así que **no habilitar el flujo de registro público** antes de conectar sesión, recuperación y sincronización con respaldo.

Documentación: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits).
