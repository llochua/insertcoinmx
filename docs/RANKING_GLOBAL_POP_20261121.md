# Ranking global POP — primera integración, 21 nov 2026
Estado: rama de revisión. NO migrado a Supabase, NO fusionado, NO publicado.

- Catálogo del servidor comprobado en modo lectura: 104 diseños, 386 variantes elegibles. No se alteraron tablas, packs, perfiles ni snapshots.
- POP es por diseño, no variante. Likes 35%, Tier 35%, Reta 30%, prior neutro de 10 observaciones por canal conforme al motor existente. Sin votos = sin clasificar.
- SQL `supabase/sql/community_pop_STAGED.sql`: tablas privadas, RLS, permisos explícitos, funciones de acceso limitadas, sin escritura de PTS/POP enviado por el cliente. Único voto vigente por cuenta/diseño/canal; última Reta completa por cuenta/día; siete encuentros en cadena, 8 diseños únicos. Datos de laboratorio excluidos del agregado público. Interruptor community_pop apagado al crear.
- El cliente conserva el juego local si la API no responde. La clasificación global no usa votos simulados ni locales. La rama conecta Top 10, insignia POP y acciones de voto para cuentas identificadas. Invitados conservan juego y calificaciones locales; la publicación de invitados necesita identidad verificable y política antiabuso acordada. Likes tienen dos respuestas explícitas y opción de retirar; esto es una propuesta de UI pendiente de validación.
- Reta registra los siete encuentros de partidas nuevas. No se inventan retrospectivamente encuentros de partidas anteriores. Día de voto global fijado a Monterrey en esta versión; validar jugadores internacionales antes de habilitar.
- PTS, récords arcade (cartas/diseños/repetidas/calificadas), inventario y probabilidades NO se modifican. La clasificación global de coleccionistas y recuento de copias/jugadores requieren derivar eventos verificados; no aceptar el inventario arbitrario del navegador.

## Validación antes de publicar
1. Aplicar SQL solo en entorno de prueba autorizado. Verificar que el interruptor esté apagado y que anon no pueda escribir ni leer tablas privadas.
2. Probar dos cuentas distintas: cambiar Tier/Like reemplaza el voto anterior y no incrementa el número; retirarlo elimina su contribución. Una Reta incompleta o con repetidos se rechaza; una partida completa reemplaza otra del mismo día. Probar rechazos de identificadores ajenos al catálogo. Verificar que el agregado solo expone id y conteos.
3. Probar el ranking y las cuatro variantes en móvil/escritorio. Verificar offline, sin votos, empates, accesibilidad, sesión y cambio de cuenta. Validar reinicio diario en distintas zonas e informar errores de publicación de Tier/Reta.
4. Revisar asesores de seguridad, permisos/grants y protección antiabuso. Decidir tratamiento de votación de invitados con identidad verificada.
5. Solo después de aprobación, aplicar la migración, activar el interruptor y fusionar/publicar. No realizar reset de colección.
