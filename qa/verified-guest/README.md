# Invitado verificable — beta controlada sin proveedor externo

## Invariantes

- Mismo UUID al registrar correo y contraseña. El servidor controla todas las cartas y cuotas.
- No se importan archivos locales como cartas verificadas; invitado no publica perfil ni votos comunitarios.
- No se reinicia la bienvenida cuando se pierde una sesión vinculada.
- Correo existente y progreso local previo requieren recuperación explícita; no fusionar ni sobrescribir automáticamente.

## Estado de producción (21 nov 2026)

La primera migración backend-review.sql fue aplicada como verified_guest_progress_preparation_closed_20261121 después de seis checks verdes. public_beta sigue habilitado; verified_guest sigue false. Se verificó que la huella de snapshots, el número de sobres y perfiles no cambiaron. La segunda migración admission-limit.sql es candidata, no aplicada aún.

## Beta sin CAPTCHA

- Supabase Auth: habilitar sesiones anónimas y vinculación manual solo al preparar activación; confirmar email, verificar URLs y entrega real de correos. Configurar 10 altas anónimas por IP/hora en Auth > Rate Limits.
- admission-limit.sql limita nuevas partidas de invitado a 100 por día UTC. Contador transaccional privado sin permisos cliente; serializa admisiones y conserva partidas existentes. Este cupo no limita la creación directa de identidades Auth: se necesita también el límite por IP. No es equivalente a CAPTCHA; revisar métricas y detener admisión si aparece abuso.
- ICMX_VERIFIED_GUEST_PLAY permanece false por defecto; ICMX_CAPTCHA_ENABLED es independiente, false por defecto. El diálogo Turnstile queda disponible para una futura fase, no se carga sin habilitarlo. Nunca almacenar secretos en el repo.
- La prueba local utiliza SDK real sin token, verifica acceso con compuerta cerrada, cuota global, emisión idempotente, aislamiento, confirmación por correo y segundo navegador. El límite se ejercita con 98 admisiones sembradas y dos invitados reales. QA independiente no prueba configuración del hosting.
- Revisar políticas/RPC restantes para JWT anónimos, correo existente, archivos invitados antiguos, sesión perdida, Web Locks y confirmación vencida. Mantener el PR #117 de recuperación. Lanzamiento global bloqueado hasta resolver compatibilidad de progreso previo y cuentas existentes.
- Activar frontend y servidor coordinadamente solo tras validación y comprobación de ajustes Auth. Si se desactiva, no permitir acuñación local para colecciones vinculadas.
