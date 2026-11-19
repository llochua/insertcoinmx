# Prueba real de registro con GitHub Pages · 19 noviembre 2026

## Decisión
Se usará **GitHub Pages**, sin Cloudflare, Vercel, hosting ni cuentas nuevas.

- Juego publicado: `https://insertcoinmx.com/`. No se modifica `index.html`, los assets, ni la clave `icmx-album2`.
- Prueba acotada: `https://insertcoinmx.com/qa/registro/`.
- El código de prueba se aloja en `qa/registro/index.html`. No copia ni altera el juego completo.
- La página tiene `noindex,nofollow,noarchive` y usa el logo oficial.
- Clave de sesión de test: `icmx-auth-qa-nov2026`, distinta de la futura sesión pública. No lee ni escribe `icmx-album2`.
- Supabase Auth real: registro con correo y contraseña; email **Confirm signup** (Resend + plantilla existente), login y cierre de sesión.

## Única configuración pendiente para el usuario
En [Supabase URL Configuration](https://supabase.com/dashboard/project/ynugqxbtszhsupadqdkz/auth/url-configuration):

1. Dejar **Site URL** en `https://insertcoinmx.com`.
2. En **Redirect URLs**, añadir exactamente `https://insertcoinmx.com/qa/registro/`.
3. Guardar. No borrar la redirección anterior `https://insertcoinmx.com/`.

La página de QA calcula `emailRedirectTo` con `location.origin + location.pathname`, para que la confirmación **regrese a la misma ruta de pruebas**.

## Prueba manual esperada

1. Abrir `https://insertcoinmx.com/qa/registro/` y crear una cuenta de prueba con un correo que reciba mensajes.
2. Comprobar llegada del correo desde `acceso@insertcoinmx.com`, logo y botón **Confirmar mi correo**.
3. Abrir el enlace y verificar que regresa a la misma página de QA, sesión iniciada.
4. Cerrar sesión, iniciar de nuevo con contraseña y recargar para comprobar persistencia.
5. Revisar Supabase → Auth Users para confirmar el correo y el alta. No registrar datos de acceso ni contraseñas en tickets/commits.
6. Confirmar que el sitio principal `https://insertcoinmx.com/` y las cartas locales siguen iguales.

## Alcance y retirada
- La página de QA es **pública** para quien tenga la URL, aunque no aparezca en el menú ni se indexe.
- Las cuentas de prueba son **reales** dentro de Supabase; eliminarlas cuando corresponda.
- Al concluir las pruebas, borrar la carpeta `qa/registro` del `main` si ya no sirve.
- Esta prueba valida correo, confirmación, acceso y sesión. **No valida todavía la pantalla integrada de Mi perfil ni el guardado de cartas en la nube.**
- El código completo de Mi perfil permanece en el PR [#61](https://github.com/llochua/insertcoinmx/pull/61) y no se fusionará hasta probar la integración y la separación de colecciones.

Este flujo no requiere cambios DNS, reconfigurar GitHub Pages ni contratar infraestructura adicional.
