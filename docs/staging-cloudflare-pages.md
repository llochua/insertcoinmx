# Staging aislado para probar registro — Cloudflare Pages

**Estado:** preparación en GitHub completa; el proyecto Pages debe crearse y conectarse desde el dashboard de Cloudflare. **No hay URL desplegada/verificada todavía.** El PR [#61](https://github.com/llochua/insertcoinmx/pull/61) sigue en borrador.

## Motivo

El sitio público `https://insertcoinmx.com/` sigue usando `main` y guarda progreso en `localStorage`. Para probar el registro con Supabase sin mezclar colecciones ni alterar el juego en producción, usar un **dominio de pruebas distinto** con su propio origen y almacenamiento.

## Implementación ya lista

- Código: rama `feat/fase1-registro-confirmacion-20261119`.
- Autenticación: `content/auth-account.js`, llamada `supabase.auth.signUp` con correo y contraseña.
- Confirmación: `emailRedirectTo: location.origin + '/'`. En staging regresa al dominio `pages.dev`; en producción regresa a `insertcoinmx.com`.
- Las pantallas permiten jugar como invitado; no envían ninguna colección a Supabase.
- El repositorio contiene 1,208 archivos y ninguno supera el máximo individual de 25 MiB de Cloudflare Pages Free (revisión GitHub de esta rama, 19 nov 2026).

## Crear staging en Cloudflare Pages

1. Abrir [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Autorizar GitHub y seleccionar **`llochua/insertcoinmx`**. Se puede limitar el acceso de la integración a este repositorio.
3. Nombre sugerido del proyecto: `insertcoinmx-auth-staging` (Cloudflare dirá si está disponible).
4. **Production branch de este nuevo proyecto**: seleccionar **`feat/fase1-registro-confirmacion-20261119`**, NO `main`. Este ajuste solo afecta el proyecto de staging de Cloudflare.
5. Framework preset: **None** (sin framework); Build command: **vacío** (o `exit 0` si la interfaz lo exige); Build output directory: **`.`** (raíz del repositorio).
6. Seleccionar **Save and Deploy**. Copiar la **URL real** que devuelva Cloudflare, normalmente un subdominio `*.pages.dev`. No necesita dominio personalizado ni modificar DNS de `insertcoinmx.com`.

## Autorizar el regreso desde el correo de confirmación

1. Abrir [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/auth/url-configuration).
2. Conservar Site URL de producción: `https://insertcoinmx.com`.
3. Agregar en Redirect URLs **la URL exacta de staging**, con barra final, por ejemplo `https://TU-PROYECTO.pages.dev/`. **No copiar el ejemplo literalmente; usar el URL real que creó Cloudflare.**
4. Confirmar que la plantilla **Confirm signup** aún utiliza `{{ .ConfirmationURL }}`.
5. Probar registro con una **cuenta de prueba nueva**, verificar correo recibido en Resend, hacer clic y confirmar que vuelve al mismo dominio `pages.dev` y mantiene la sesión. La cuenta de test es real en el proyecto Supabase; eliminarla manualmente si ya no se necesita.

## Precauciones

- Nunca utilizar dominios proxy de terceros para recibir los tokens de confirmación.
- Nunca subir SMTP/Resend API key ni Supabase secret/service_role al repositorio. La clave `sb_publishable_...` es pública por diseño.
- Por ser otro origen, **staging no muestra las cartas que el usuario tenga almacenadas en `insertcoinmx.com`**, y eso es intencional.
- **No publicar el PR de registro en `main`** hasta completar pruebas de correo real, sesión, recuperación de contraseña, separación y migración de datos por usuario.
- Un proyecto de staging público requiere evitar difusión de su URL antes de completar revisión y limpiar cuentas de prueba si fuera necesario.
- No agregar cambios DNS ni conectar el dominio principal a Cloudflare Pages.

Documentación: [Cloudflare Pages — Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [Cloudflare Pages — build config](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Supabase — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
