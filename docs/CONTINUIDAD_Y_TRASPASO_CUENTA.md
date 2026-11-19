# INSERT COIN MX — GUÍA MAESTRA DE CONTINUIDAD Y TRASPASO
Fecha de corte: 19 de noviembre de 2026.
Estado: documento operativo de continuidad. El código y las fuentes originales siguen en sus respectivos repositorios y servicios; este documento **no** es un respaldo de datos de jugadores ni de credenciales.

## 1. Para retomar desde otra cuenta de ChatGPT (leer primero)
Estamos construyendo y reviviendo Insert Coin MX, marca mexicana de playeras de cultura gamer, mediante una experiencia web de colección de cartas, álbum, Tier Lists, Reta, Archivo y participación de la comunidad. El objetivo es reactivar la marca y atraer nueva comunidad con una experiencia divertida y pública, no convertirla en inversión, NFT, especulación o una venta de cartas. La cuenta original de ChatGPT tiene Plus; más adelante se planea cambiar a una cuenta personal, posiblemente contratando Plus ahí. **No asumir que chats, memoria, proyectos, archivos o conectores se transfieren automáticamente entre cuentas.**

### Instrucción breve de reanudación (copiar al abrir un chat nuevo)
«Continuamos el proyecto Insert Coin MX. Antes de proponer cambios, lee esta guía y revisa el repositorio https://github.com/llochua/insertcoinmx, especialmente main, ramas y PR actuales. El usuario espera colaboración como editor de producto, diseño UX/UI y apoyo técnico directo: criterio independiente, avances pequeños y verificables, no burocracia. Conserva las seis etapas del MVP y el progreso de jugadores. Nunca toques main, fusiones ni despliegues sin validación de la rama de pruebas y autorización. Mantén infraestructura adicional en $0 MXN/mes; no contrates ni actives servicios pagos. No generes imágenes sin consentimiento expreso. La narrativa TCG vive en el Google Sheet maestro indicado en este documento. Pregunta solo cuando un dato esencial no pueda determinarse. Confirma estado actual de GitHub antes de modificar archivos.»

## 2. Fuentes canónicas y accesos
- Repositorio GitHub: https://github.com/llochua/insertcoinmx
- Rama pública estable: main. **No es lo mismo que la rama de pruebas.** Verificar SHA y commits actuales al reanudar, porque se sigue trabajando en paralelo.
- Sitio: https://insertcoinmx.com/ (la disponibilidad/despliegue debe comprobarse de nuevo; no asumir que todos los cambios de ramas están publicados).
- Rama compartida para evaluar la Fase 1 visual: fase1-preview
- Enlace preliminar de pruebas: https://raw.githack.com/llochua/insertcoinmx/fase1-preview/index.html ; el origen es diferente del dominio de producción y por ello NO comparte automáticamente su localStorage ni la colección guardada allí.
- Narrativa TCG, **única hoja maestra**: Google Sheets «Insert Coin MX — Narrativas TCG», ID 1jcwFQ2CMPHHbeujKEdrR9W9F4AjtkXQb9LyXu3DOE1I, pestaña «Narrativas TCG», gid 1837827556. URL: https://docs.google.com/spreadsheets/d/1jcwFQ2CMPHHbeujKEdrR9W9F4AjtkXQb9LyXu3DOE1I/edit#gid=1837827556
- En el repositorio existe content/card-texts.js, que es contenido consumible por el juego; **no sustituye ni debe convertirse en un segundo documento maestro de relatos**.
- Supabase: el usuario creó una organización «Insert Coin MX» bajo un plan Free y comenzó a crear su proyecto. **No hay integración confirmada** con ChatGPT ni con el juego a la fecha de corte; el nombre exacto del proyecto, configuración y titularidad requieren revisión en la consola de Supabase. No almacenar contraseñas, secretos ni service_role keys en GitHub, Docs, ChatGPT o archivos de traspaso.

## 3. Reglas de colaboración y protección
- El usuario busca criterio editorial real. Señalar problemas fundamentados, defender decisiones razonadas y reconocer errores; no darle la razón automáticamente. Copy corto, escaneable, claro.
- Para código: mirar el estado más reciente; ramas aisladas; cambios pequeños, reversibles y comprobables; validar en preview antes de integrar; jamás confundir prueba sintáctica con prueba funcional/móvil. No borrar «basura» sin demostrar que está sin uso. No romper catálogo, probabilidades, avance o diseños.
- Conservar todos los avances y contenidos aprobados. Si hay conflicto entre estados locales y de nube, conservar ambas versiones y ofrecer revisión; nunca sumarlas automáticamente ni sobrescribirlas a ciegas.
- No generar ni editar imágenes sin consentimiento expreso. Para cartas de arte: cada gráfica original debe desarrollarse como ilustración completa con composición e intención propias; preservar la identidad del diseño. No reutilizar Space Invaders, fondos azul marino, luces neón, halftone, marcos retrofuturistas, esquemas técnicos ni otros recursos genéricos en piezas sin relación conceptual.
- La marca y su comunidad deben describirse como algo que continúa, no como algo extinto o encerrado en el pasado. La historia y el Archivo se construyen con testimonios, fuentes y autorizaciones reales.
- Costo objetivo **$0 MXN al mes de infraestructura nueva** mientras sea viable; usar servicios gratuitos dentro de sus límites. Antes de introducir pagos, avisar y pedir autorización explícita.
- Evitar órdenes al usuario; colaborar, proponer una mejor opción concreta y ejecutar lo ya aprobado. No inflar el proceso con documentos paralelos innecesarios.

## 4. Estado y lógica del juego que no se debe perder
- El catálogo se organiza por diseño y cuatro variantes. Nombres editoriales más recientes: **Base, Holo, Dorada y Arte Especial**. En lógica histórica todavía pueden aparecer claves técnicas comun/holo/dorada/full o sufijos _b/_e/_r/_f: no renombrar identificadores persistidos sin migración verificada.
- Hay arte pendiente, variantes que no salieron comercialmente y diseños bonus; no asumir que toda imagen disponible puede salir en sobres. La exclusión «nunca salieron» fue una corrección importante.
- Sobres: **5 de bienvenida** al jugador nuevo, luego **2 sobres disponibles cada 6 horas**; **5 cartas por sobre**. Hay reglas de rareza y una recompensa especial del primer sobre; verificarlas en código, no inventar cifras. El canje usa **5 copias repetidas** para obtener un sobre extra y debe conservar al menos una copia por carta.
- La colección de invitado se guarda en el navegador: clave histórica icmx-album2 y relacionadas .ext/.bak/.corrupt/.premig. Existe exportación/importación manual de respaldo JSON con validaciones y protección entre pestañas. Esto **no es sincronización ni recuperación en la nube**.
- El código principal es index.html, con datos/narrativas adicionales en content/, catálogo en cartas/ y recursos de Reta. Validación automatizada en .github/workflows/validacion.yml.
- Regla UX aprobada: «ciclo de 6 horas» no debe mostrarse como explicación técnica; usar «Tus próximos 2 sobres» con contador. No poner barra de repetidas fija en el inicio; ofrecer canje contextual en el resumen de sobre y cuando esté disponible. La rama fase1-preview contiene esta iteración.
- La nueva pantalla «Mi perfil» en preview es **base funcional, NO diseño visual final aprobado**. Muestra identidad de invitado, avance, estadísticas y respaldo manual. Debe evolucionar editorial/visualmente más adelante.

## 5. Seis etapas originales del MVP (no saltar ninguna)
1. Proteger progreso y respaldos.
2. Catálogo estable, IDs y alias.
3. Cuatro variantes por diseño.
4. Sobres y probabilidades.
5. Álbum por diseño.
6. Tier Lists y Reta.
Las seis formaron el acuerdo original para una versión estable y publicable. No reinterpretar el objetivo como «publicar sin completar etapas». Método acordado: hacer, jugar, evaluar, corregir y avanzar, sin perfeccionismo innecesario.

## 6. Modelo de usuarios aprobado — Fase 1 de crecimiento
**Todos pueden jugar y participar. El registro aporta continuidad, identidad y beneficios especiales, no acceso a la diversión.**
- Invitado: álbum, sobres, canje, Reta, Tier, Archivo, calificaciones, votos y contribución a resultados globales. Su colección/progreso personal se mantiene local y admite exportación/importación manual. Sin sincronización de colección ni participación en promociones.
- Registrado: todo lo anterior, más recuperación entre dispositivos, cuenta/perfil identificable, récords vinculados a identidad y participación en promociones o regalos **solo cuando existan reglas y dinámica reales**.
- Votos de invitados deben pesar igual que los registrados, con controles de abuso (rate limiting, deduplicación razonable). La identidad anónima por navegador no garantiza una persona = un voto.
- El ranking público no debe exponer correo ni datos personales; preferir alias público con controles de privacidad.
- El paso invitado → registrado debe preservar cartas, avances, retas, calificaciones y respaldos. No duplicar sobres ni canjes. Resolver conflictos mediante revisión y transacciones/idempotencia.
- Supabase Free es el candidato de autenticación/base de datos; **cuenta y tablas aún no están conectadas**. Revisar cuotas vigentes antes de desplegar. No publicar promises de disponibilidad del plan gratuito que no estén verificadas.

## 7. Ramas y pull requests relevantes al corte
Revisar vigencia antes de actuar; GitHub es la fuente de verdad.
- PR #49 (borrador): https://github.com/llochua/insertcoinmx/pull/49 — canje y textos de espera. **Advertencia:** el diseño evolucionó después; la propuesta visual final de prueba está en fase1-preview, no en este PR original.
- PR #50 (borrador): https://github.com/llochua/insertcoinmx/pull/50 — primera vista de perfil invitado y especificación. **Advertencia:** también evolucionó posteriormente en fase1-preview.
- PR #55 (borrador): https://github.com/llochua/insertcoinmx/pull/55 — módulo content/account-sync-plan.mjs de planificación **solo lectura/en memoria** para detectar primer envío, restauración, coincidencia y conflicto de progreso; no implementa registro ni sincronización. Incluye tests node --test content/account-sync-plan.test.mjs y CI. La ejecución conocida de GitHub Actions terminó **success**: https://github.com/llochua/insertcoinmx/actions/runs/44591024887. Una prueba pasada no sustituye la revisión funcional.
- Rama fase1-preview: combinación para probar perfil + canje revisado, sobre una versión de main con nombres de variantes actualizados. **No fusionada**; evitar aplicar PR #49 o #50 sobre ella sin comparar cambios.
- La limpieza CSS de Reta se publicó mediante PR #51, y el flujo de validación por PR #53; comprobar siempre los últimos cambios en main. Existen varias ramas históricas de respaldo que no deben borrarse por su nombre.

## 8. Próximos trabajos, orden sugerido
A. Proteger y validar el estado en GitHub/preview con casos reales: nuevo invitado, progreso existente, exportar/importar, canje de 5 repetidas, actualización de sobres y ausencia de pérdida de cartas. No asumir que «pasa sintaxis» equivale a «funciona en celular».
B. Conectar Supabase con la cuenta adecuada y revisar titularidad del proyecto, Free y región. Separar entorno de pruebas y producción antes de almacenar datos reales. Nunca dejar llaves de administrador en archivos públicos.
C. Esquema mínimo con perfiles, colecciones y eventos; RLS y políticas de lectura/escritura verificadas por pruebas de usuario A/B. Despliegue con migraciones y rollback documentados.
D. Implementar alta/acceso opcional, recuperación y primer respaldo de invitado con confirmación explícita; sin romper almacenamiento local. No copiar la colección a la nube por el simple hecho de entrar al perfil.
E. Sincronización con eventos idempotentes y verificación en dos dispositivos; no usar mezcla ingenua por máximos o sumas.
F. API pública de votos/resultados para invitados y registrados, con validaciones contra abuso; los resultados globales no están garantizados por el STORE de claude.use('db') existente.
G. Diseñar finalmente el perfil de coleccionista cuando sus capacidades reales estén disponibles, manteniendo el criterio de no sobrecargar la interfaz.
H. Continuar narrativa TCG desde el Sheet maestro y el Archivo sin crear fuentes paralelas.

## 9. Transferencia a la cuenta personal de ChatGPT
- El repositorio GitHub y sus commits no pertenecen a una sesión de ChatGPT. Mantener acceso desde una identidad de GitHub que el usuario controle y verificar permisos antes de dejar cuentas laborales.
- El proyecto de Supabase pertenece a una organización de Supabase. Antes del cambio, verificar que el usuario conserva su titularidad; si se creó bajo identidad laboral, revisar la opción de transferencia entre organizaciones y exportaciones del servicio.
- GitHub y Supabase deberán conectarse de nuevo desde ChatGPT personal; una conexión OAuth de la cuenta actual no se traslada automáticamente.
- Conversaciones, memoria, ajustes de cuenta Plus y proyectos de ChatGPT no se fusionan automáticamente. Compartir el proyecto de ChatGPT cuando los permisos lo permitan y exportar datos de la cuenta como respaldo **no equivale a trasladar memoria y conectores**.
- El Google Sheet maestro puede necesitar compartir acceso con la cuenta personal; verificar permisos de edición antes de abandonar la cuenta de trabajo. No mover ni duplicar el Sheet sin una razón concreta.
- Conservar copia portátil de esta guía fuera de ChatGPT; puede almacenarse como Markdown o PDF en un lugar controlado por el usuario. Una copia de esta guía **no sustituye** exportar datos o snapshots reales de Supabase cuando existan.
- No guardar tokens de GitHub, contraseñas, claves de Supabase, datos personales de jugadores, ni secretos en este documento.

## 10. Lista de verificación de salida — completar al cambiar de cuenta
- [ ] La cuenta personal tiene acceso al repositorio y permisos adecuados.
- [ ] La cuenta personal puede abrir y editar la hoja maestra de narrativas.
- [ ] Se verificó el propietario y el acceso al proyecto de Supabase.
- [ ] Se compartió o exportó el contexto de ChatGPT que realmente se quiera conservar.
- [ ] Se guardó una copia de este documento en un espacio personal y se confirmó que abre.
- [ ] Se conectaron GitHub y Supabase desde la nueva cuenta de ChatGPT.
- [ ] Se compararon main, ramas y PR actuales antes de continuar programando.
- [ ] Se comprobó que el dominio, hosting y cualquier otro servicio externo siguen bajo control del usuario.
- [ ] Se revisó el plan de ChatGPT y los cargos de cualquier servicio antes de pagar o cambiar de suscripción.

## 11. Nota de estado y cautelas
Esta guía recoge acuerdos y estado comprobado al 19/11/2026. Las ramas, hashes, revisiones, enlaces de previews, cuotas gratuitas, requisitos de GitHub/Supabase y permisos de cuentas pueden cambiar. Volver a verificarlos antes de tomar decisiones. El propósito es restaurar contexto y reducir pérdidas, no reemplazar al código ni la documentación técnica viva.
