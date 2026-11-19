# Fase 1 — Modelo de jugadores y protección del progreso
Estado: decisión de producto aprobada; integración de cuentas y participación global **pendiente**.
Fecha: 19 de noviembre de 2026.

## Principio
**Todos juegan y participan. Registrarse no desbloquea la diversión; desbloquea persistencia e identidad.**

| Capacidad | Invitado | Registrado |
|---|---|---|
| Sobres, álbum, canje, Reta, Tier y Archivo | Sí | Sí |
| Calificar diseños y aportar a resultados globales | Sí, de forma anónima | Sí, con cuenta |
| Ver rankings | Sí | Sí |
| Progreso en navegador / respaldo manual | Sí | Sí |
| Recuperación en dispositivos y sincronización de colección | No | Sí |
| Nombre y Top Score ligados a un perfil público | No | Sí, con control de privacidad |
| Participar en promociones/regalos | No | Sí, cuando existan y se publiquen sus bases |

Las cuentas no son NFT ni habilitan venta, reventa o valor monetario de cartas.

## Estado técnico observado en main
- `S` y `KEY=icmx-album2` conservan el progreso en `localStorage`; existen respaldo JSON validado, importación y protección básica entre pestañas.
- `STORE.init()` se conecta a una base de datos únicamente si `window.claude` existe; no equivale a tener un backend público de rankings/votos en insertcoinmx.com.
- `S.ini` representa iniciales de Récords, no identidad verificada.
- `S.have`, `S.rate`, `S.duel` y otros campos deben mantenerse compatibles durante la migración.
- La pantalla de perfil de invitado es únicamente presentación y reutiliza los respaldos existentes; no crea cuentas.

## Recomendación de arquitectura
Evaluar Supabase Auth + Postgres + funciones servidoras o una alternativa con capacidades equivalentes. No insertar claves privilegiadas en HTML. El servidor valida permisos y escribe acciones críticas.

**Invitado**
1. Juega de inmediato y su colección se guarda en el navegador.
2. Exporta/importa el respaldo cuando quiera.
3. Puede votar y contribuir a resultados globales; el servidor registra solo el dato mínimo del voto y un identificador anónimo antifraude. No sincroniza ni guarda su colección personal como perfil.
4. Limitación explícita: el identificador por navegador no garantiza una persona = un voto. Añadir rate limits y validación de eventos. Nunca prometer protección perfecta.

**Registrado**
1. Crea cuenta, confirma identidad y elige nombre público independiente de correo.
2. Revisa la colección local antes de vincularla y el sistema crea un respaldo antes de sincronizar.
3. La colección se sincroniza con control de versiones, eventos idempotentes y conciliación segura de cambios.
4. Sus Top Scores pueden aparecer con su nombre público; la participación en promociones es opt-in, con bases/edad/elegibilidad según el evento.

## Entidades mínimas a diseñar
- `profiles`: user_id, public_handle, visibility, created_at.
- `collection_cards`: user_id, card_key, quantity, updated_at. Restricciones únicas por usuario/carta.
- `collection_events`: event_id único, user_id, tipo, fecha, payload validado. Evitar aplicar dos veces la apertura o el canje.
- `public_votes`: diseño/duelo + opción + actor anónimo o user_id; antifraude, auditoría y un voto vigente por criterio.
- `public_scores`: user_id, score validado, fecha; mostrar solo jugadores registrados que hayan aceptado publicar.
- `import_receipts`: user_id, hash de respaldo, estado/fecha. Importar un archivo dos veces no duplica cartas.
- Promociones/regalos futuros: entidad separada, consentimiento explícito y reglas de participación; nunca asociar elegibilidad directamente a azar de sobres o rareza.

## Secuencia de implementación
1. Probar y preservar importación/exportación actual; generar respaldos para pruebas.
2. Levantar backend y auth con ambiente de prueba separado de producción.
3. Publicar API mínima de votos/resultados para invitados y registrados, con deduplicación y límites.
4. Implementar registro voluntario y recuperación de cuenta sin reemplazar automáticamente el progreso local.
5. Migración revisable. Nunca sumar ciegamente dos colecciones ni sobres entre dispositivos; usar eventos e import receipts. Ante conflicto, conservar copia y mostrar resultado antes de aplicar.
6. Habilitar sincronización del progreso y mecanismo de resolución tras reconexión. Revisar partidas, canjes y ventanas de 6 horas bajo reloj de servidor.
7. Conectar Top Scores públicos y preferencias de visibilidad. Premios solamente al tener reglas definidas.

## Criterios de aceptación
- Un invitado puede completar todas las funciones del juego sin cuenta.
- Su voto se agrega una vez a los resultados comunitarios en condiciones normales; se minimiza el abuso desde varias pestañas/dispositivos.
- Cambiar de invitado a registrado nunca borra cartas, calificaciones, retas ni progreso previo.
- Dos dispositivos no multiplican sobres ni duplican canjes.
- Exportar e importar respaldos sigue funcionando.
- Si falla la nube, los cambios locales se mantienen pendientes y hay un estado visible; jamás se muestra «guardado en la nube» sin confirmación.
- Las promociones requieren registro y consentimiento, sin comunicarse como recompensa permanente.
- Pruebas de regresión en móvil y escritorio antes de fusionar.

## Fuera del primer PR de interfaz
No activar login ficticio, no pedir credenciales, no tocar `S` ni `KEY`, no cambiar la probabilidad de sobres, ni afirmar que la agregación de votos globales ya funciona en el sitio público.
