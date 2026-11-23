# Insert Coin MX · Fase 3 — Invitados pueden opinar, sin entrar a rankings (INC-01 / INC-02)

**Corte:** 23-nov-2026. **Estado:** diseño técnico y SQL de candidato **NO DESPLEGADO**. No ejecutar scripts en la base productiva, activar flags, editar datos de jugadores ni fusionar ramas sin permiso expreso.

## Intención de producto aprobada

- **IC-AUTH-03 / IC-RANK-01:** los invitados juegan y coleccionan, pero **no aparecen** en las cinco clasificaciones públicas de jugadores (PTS, cartas, diseños, repetidas, calificaciones) ni reciben premios exclusivos.
- **IC-AUTH-04:** los invitados **pueden calificar/opinar**, y sus valoraciones verificadas deben contribuir a la popularidad del diseño (**POP**).
- **IC-POP-01:** POP pertenece al diseño, no al jugador. No convertir el voto invitado en PTS, dinero o premios.

## Qué encontramos en Supabase (solo lectura)

La función activa `public.icmx_player_leaderboards()` tenía una rama explícita para `auth.users.is_anonymous=true`, condicionada por `verified_guest`. El 23-nov los gates `verified_guest`, `public_beta` y `community_pop` estaban habilitados. No había snapshots de invitados elegibles en ese corte; se comprobó **riesgo lógico, no inclusión material observada**.

La función `private_community.community_can_vote()` rechaza a todos los `is_anonymous`, aun cuando tengan un UUID y sesión real. El cliente `content/auth-account.js` también impide sus votos de servidor. Sus elecciones locales no constituyen votos POP globales.

## INC-01: propuesta de corrección independiente

[PR #133](https://github.com/llochua/insertcoinmx/pull/133) restringe el **CTE identities** del SQL de ranking a usuarios **NO anónimos**, correo confirmado y perfil público. Es una propuesta en `supabase/sql/player_global_leaderboards_STAGED.sql`, **no un cambio aplicado al servidor**. Mantiene los cinco rankings, top 10, tres caracteres arcade y puntuaciones servidor.

## INC-02: candidato de backend (este PR)

`supabase/sql/guest_rating_pop_STAGED_DO_NOT_RUN.sql` solo prepara:

1. Un **gate independiente** `private_community.guest_rating_gate`, creado **apagado**; el gate ya activo `community_pop` no autoriza por sí mismo votar a los invitados.
2. Verificación doble de identidad: token Auth `is_anonymous` y registro `auth.users.is_anonymous`; además se exige una identidad invitada inscrita y los gates `public_beta` / `verified_guest`.
3. **Máximo 100 escrituras de valoraciones por UID invitado y día UTC**, de forma atómica en una tabla privada; un Like y un Tier consumen dos escrituras. **La limitación por UID no bloquea identidades múltiples**.
4. Un solo Like y un Tier por UID y diseño (se conserva el upsert existente), con sustitución y retiro sin sumar votos duplicados.
5. `Reta` **continúa reservada a cuentas registradas**, porque el helper `community_can_vote()` no se abre. Los invitados tampoco ganan PTS ni posiciones de ranking por opinar.
6. **No hay acceso directo** a tablas de votos, contadores, identidades ni datos privados. El RPC público conserva su firma.

**Falta la integración de cliente**: todavía `index.html` y `content/auth-account.js` bloquean el envío desde invitados. No declararlo funcional en UI hasta conectar y probar sesión verificada, cambio de cuenta, offline, votos nuevos, retiro y errores en móvil.

## Bloqueos de seguridad antes de abrir el gate

La autenticación anónima usa el rol PostgreSQL `authenticated`; ese rol **no prueba** que una cuenta es permanente. Se comprueba el estado del usuario **en el servidor** y no se confía en campos editables de `user_metadata`.

Crear múltiples usuarios invitados permite inflar POP aunque haya una escritura por UID/diseño. **Antes de activar** `guest_rating_gate`, verificar y probar obligatoriamente:

- CAPTCHA/Turnstile **en Supabase Auth**, con token válido en el flujo de registro anónimo. El cliente solo tiene un hook condicional, no prueba que la protección esté habilitada.
- Limitaciones efectivas por IP de creación de identidades y límites de abuso definidos en Supabase; revisar falsos positivos e identidad perdida.
- Monitorizar creación de usuarios, ritmo de votos, múltiples cuentas y anomalías POP sin publicar datos privados.
- Politica de moderación, reversión de votos fraudulentos y quién puede desactivar inmediatamente el gate.
- Aprobación explícita del peso relativo de votos invitados si se propone distinto al voto registrado; por defecto el motor no introduce una segunda fórmula ni cambia los pesos 35/35/30.
- Probar migración de invitado a cuenta registrada con el **mismo UID**: sus votos no deben duplicarse. No importar valoraciones locales antiguas sin una identidad y consentimiento verificados.

**La existencia del script o el check verde no autoriza ponerlo en producción.**

## Matriz de pruebas

| Caso | Esperado |
| --- | --- |
| Invitado verificado, gate cerrado | RPC rechaza voto |
| Invitado sin inscripción verificada, gate abierto en base desechable | RPC rechaza voto |
| Invitado verificado y gate abierto en base desechable | Like/Tier contribuyen a agregados POP |
| Mismo invitado vota dos veces por diseño | Se sustituye; nunca suma dos identidades |
| Invitado retira la calificación | Se descuenta el voto, no el de otros usuarios |
| Invitado excede 100 escrituras UTC/día | Se rechaza sin mutar votos |
| Invitado intenta votar en Reta | Se rechaza |
| Cuenta registrada vota con gate invitado apagado | Sigue funcionando |
| Cuenta invitada consulta o escribe tablas privadas | Denegado |
| Cuenta invitada entra a rankings de jugadores | Denegado por SQL de INC-01, no por la UI |
| Usuario se registra a partir del mismo UID | No se duplica identidad ni valoración |
| CAPTCHA deshabilitado | No abrir gate en producción |

Los casos del backend se ejecutan en PostgreSQL **desechable** mediante `qa/community-guest-ratings-isolated.sql`; las pruebas E2E de CAPTCHA y conversión de identidad quedan pendientes.

## Implementación por etapas, siempre con autorización nueva

1. Revisar y fusionar únicamente **fuentes staged** de las dos propuestas, después de QA y aprobación. Fusionar un archivo SQL no lo aplica a Supabase.
2. Validar con una base aislada que reproduce la estructura real, y revisar asesores de seguridad.
3. Auditar CAPTCHA, controles de admisión y monitorización del proyecto Supabase antes de ejecutar scripts con autorización específica.
4. Integrar el envío de Like y Tier en la interfaz de invitado con flag apagado y pruebas de dos sesiones, sin alterar arte ni gameplay.
5. Desplegar con bandera apagada, activar sólo cuando se autorice y vigilar métricas/reversión.

**No habilitar auto-merge, no borrar progreso, no cambiar reglas de sobres ni reiniciar edición.**
