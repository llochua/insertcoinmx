# Insert Coin MX — Registro maestro de decisiones (v0.2)

**Corte revisado:** 23 de noviembre de 2026. **Estado actual de `main` verificado:** `7513a4362fa4df70b1cf06e0515ae3fa6c6f796c` (PR #131 fusionado). **Baseline original de auditoría:** `b9e5e3de89ab306bc261cff74787247697d387f2` (PR #130).  
**Estado de este registro:** **BORRADOR DE CONSOLIDACIÓN PARA REVISIÓN DEL CREADOR**. No es autorización de publicación ni reemplaza las aprobaciones originales.  
**Fuentes de control:** decisiones explícitas del creador en conversaciones del proyecto; auditoría [PR #130](https://github.com/llochua/insertcoinmx/pull/130); archivos y workflows de `main` al corte.  
**Alcance:** documentar, no modificar el juego, sus ilustraciones, cuentas, colecciones, SQL, Auth, reglas productivas o despliegue.

**Criterio de corte:** la Fase 1 se cerró administrativamente y el [PR #131](https://github.com/llochua/insertcoinmx/pull/131) fue fusionado con autorización expresa. El nuevo commit solo introdujo workflows, una plantilla de PR y documentación. `index.html` y `cartas/catalogo.json` conservan sus blob SHA anteriores (`c4e1cdcb9204bab07af8f766c43785ed6a4bbafc` y `9f6d30cfba657a2c7a5139caa6322eb42a99ffb8`). La auditoría del backend en el PR #130 fue una **fotografía de su fecha**; no equivale a una nueva inspección en vivo de Supabase.

> **Regla esencial:** `APROBADO` es una decisión de producto, `IMPLEMENTADO` es un hecho de código y `VALIDADO` es evidencia de QA. Nunca usarlos como sinónimos. Ningún PR verde convierte una propuesta visual en aprobada.

## 0. Cómo leer y mantener el registro

### Estado de decisión (autoridad de producto)

- **APROBADA:** la regla fue acordada explícitamente con el creador y debe conservarse. Si una regla antigua y otra posterior se contradicen, se documenta la sustitución y prevalece el acuerdo posterior.
- **CRITERIO VIGENTE:** comportamiento comprobado en `main` o en backend, útil como baseline técnica, pero no se deduce automáticamente aprobación creativa.
- **POR DEFINIR:** hay una intención o propuesta, pero no existe decisión suficiente sobre alcance, diseño o reglas.
- **HISTÓRICA / SUSTITUIDA:** documentación anterior que no describe el estado actual o fue reemplazada. Se conserva para trazabilidad.

### Estado de ejecución (evidencia técnica, independiente)

- **EN MAIN:** existe en el commit auditado; puede faltar validación visual o E2E.
- **PARCIAL / DISCREPANCIA:** parte existe, pero contradice una regla aprobada o falta completar el flujo.
- **SOLO EN PR / LAB:** aislado del juego publicado; no equivale a publicado.
- **NO ACREDITADO:** la auditoría no encontró implementación completa comprobable.
- **PROCEDIMIENTO PENDIENTE:** requiere operación o aprobación expresa; no ejecutar solo por estar documentado.

**Confianza:** `CODIGO` = lectura de `main`, `CI` = check ejecutado sobre un SHA, `AUDITORIA` = resultado histórico de verificación, `CONVERSACION` = decisión del creador recogida en el proyecto. Las decisiones de conversación sin enlace externo deben conservar su fecha y no convertirse en falsos PR o commits de evidencia.

### Sustituciones históricas que deben respetarse

| Acuerdo anterior | Criterio que prevalece | Justificación y límite |
| --- | --- | --- |
| **19-nov:** se discutió incluir invitados en los rankings globales. | **21-nov: IC-AUTH-03 e IC-RANK-01**, solo registrados ocupan posiciones globales. | La decisión posterior sustituye la anterior. El SQL actual es una discrepancia pendiente, no una nueva aprobación de invitados. |
| **21-nov:** referencias a «tres iniciales». | **22-nov: IC-AUTH-02**, exactamente tres caracteres arcade; pueden ser letras, números o símbolos admitidos. | No obligar a que correspondan al nombre real ni volver a pedirlos en Récords. |
| **17-nov:** se habló de dos sobres diarios. | **IC-PACK-01:** el juego en `main` hoy entrega dos por ciclo de seis horas. | Registrar el comportamiento vigente; no afirmar que el cambio de calendario fue una aprobación creativa independiente. |
| **19-nov:** Archivo como parte de la propuesta editorial. | **IC-ARCH-01:** Archivo pausado; su alcance final está por definir. | Un prototipo o una idea editorial no equivale a una sección final aprobada. |

**Límite de trazabilidad:** el acuerdo conceptual «PTS del jugador vs. POP del diseño» sí fue aceptado; los valores 10/25/50/100, pesos 35/35/30, prior de 10 y fórmula de Tier tienen evidencia **en código y documentos técnicos**, pero no queda acreditada aprobación literal de cada parámetro numérico. Conservarlos mientras se ratifican; no cambiarlos silenciosamente.

## 1. Propósito, identidad y reglas de trabajo

| ID | Decisión o criterio | Decisión | Ejecución / evidencia |
| --- | --- | --- | --- |
| IC-GOV-01 | Insert Coin MX es para **jugar, coleccionar, descubrir ilustraciones, competir amistosamente y crear comunidad**; no es un NFT, inversión ni mercado de compraventa. | **APROBADA** (conversación 2026-11-19) | Criterio de producto; no inferir economía real del valor POP. |
| IC-GOV-02 | **No fusionar, reiniciar, borrar, migrar datos productivos ni publicar cambios sin autorización específica del creador.** La autorización de un trabajo no autoriza otra operación. | **APROBADA** (2026-11-20 a 23) | Regla operativa vigente; no depende del estado técnico de un PR. |
| IC-GOV-03 | `main` es la referencia vigente del juego; laboratorios, ramas y previews son **aislados**. Si un LAB presenta una regresión que `main` no tiene, se corrige el LAB. | **APROBADA** (2026-11-22) | `main` auditado; PR #130 continúa en borrador. Ver [DS-ART-01](https://github.com/llochua/insertcoinmx/blob/docs/design-system-audit-2026-11-22/docs/design-system/ILUSTRACIONES-FONDOS.md). |
| IC-GOV-04 | El juego y la cuenta real no son instrumentos de QA mutadora: usar sesiones, datos y bases **desechables**; producción solo lectura salvo permiso específico. | **APROBADA** | Workflows de QA y auditoría #130. |
| IC-GOV-05 | Cada cambio nuevo debe relacionarse con un ID de decisión, indicar qué se preserva y mostrar pruebas; un cambio visual necesita **comparación real de capturas y aprobación visual**. | **APROBADA COMO REGLA DE PROCESO** | **EN MAIN** la plantilla y checks del [PR #131 fusionado](https://github.com/llochua/insertcoinmx/pull/131). [Ruleset activo](https://github.com/llochua/insertcoinmx/settings/rules/27900704); la revisión/aprobación visual es una obligación de proceso, **no una aprobación automática de GitHub**. |

## 2. Ilustraciones, cartas y sobres

| ID | Decisión o criterio | Decisión | Ejecución / evidencia |
| --- | --- | --- | --- |
| IC-ART-01 | Las ilustraciones **tienen fondo sólido, no transparente**. La vista debe extender el **mismo color sólido del propio archivo** hasta llenar el área, sin cortes, parches, recuadros ni degradados sustitutos. Conservar proporción y composición. | **APROBADA ANTES DEL PR #130** | Referencia: sistema actual de fondos de `main`. Revisión estática del LAB restaurada, pero falta paridad visual final. [Regla DS-ART-01](https://github.com/llochua/insertcoinmx/blob/docs/design-system-audit-2026-11-22/docs/design-system/ILUSTRACIONES-FONDOS.md). |
| IC-ART-02 | No regenerar ni retocar cartas, fondos, rarezas, efectos, materiales y avatares por una migración de botones o sistema de diseño. | **APROBADA** | PR #130 mantiene el sistema visual de `main` y no tiene aprobación para merge. |
| IC-ART-03 | Los diseños y variantes son conceptos distintos: un mismo diseño puede tener **Base, Holo, Dorada y Full**; no mezclar rareza, valoración comunitaria y puntuación del coleccionista. | **APROBADA** | **EN MAIN.** Catálogo y [motor de valor](MOTOR_PUNTOS_VALOR_COMUNITARIO_20261120.md). |
| IC-ART-04 | Inventario actual de referencia: **126 diseños**: 104 del Álbum y 22 Bonus. **74 escenas Full**. El pool normal tiene **386 variantes elegibles** de 104 diseños. | **CRITERIO VIGENTE / INVENTARIO TÉCNICO**, no aprobación individual de cada arte | Confirmado en auditoría #130. El campo `estado: "Propuesta · revisar"` de `cartas/catalogo.json` es desactualizado; NO usarlo para revocar artes aprobados. |
| IC-ART-05 | `cartas/catalogo.json` y las fuentes/plantillas son los insumos del arte; las imágenes `c/` y `c2/` son salidas generadas. Nunca parchear una carta ya renderizada como sustituto de corregir su fuente. | **CRITERIO VIGENTE** | Flujo técnico registrado en auditoría #130. |
| IC-ART-06 | Las ilustraciones nuevas siguen una **proporción vertical 2:3**, respetando el referente aprobado de Gato Samurái. No recortar retroactivamente artes existentes para forzarla. | **APROBADA** (conversación 2026-11-17) | **CRITERIO DE PRODUCCIÓN**; la auditoría no verificó las dimensiones individuales de todos los archivos. |
| IC-ART-07 | Cada ilustración conserva **concepto y composición propios**: evitar repetición de emociones, poses, marcos, motivos genéricos o adornos de relleno; no insertar el logotipo en cada ilustración. | **APROBADA** (2026-11-17/20) | **NORMA CREATIVA**, no un cambio masivo autorizado a las ilustraciones existentes. |
| IC-PACK-01 | **5 sobres de bienvenida**, luego **2 sobres cada 6 horas**, **5 cartas por sobre**; comunicar claramente la cuenta regresiva cuando no haya sobres. | **CRITERIO OPERATIVO VIGENTE**, no ratificación de cada detalle de calendario | **EN MAIN**, auditado 2026-11-22. La referencia anterior a «2 sobres diarios» es histórica. El usuario señaló que comunicar el ciclo técnico de seis horas puede ser confuso; mantener el reloj claro para el jugador. |
| IC-PACK-02 | El primer sobre de bienvenida incorpora **Full garantizada** y el canje de **5 cartas repetidas por un sobre extra** debe conservar una unidad de cada carta. | **CRITERIO VIGENTE** | **EN MAIN/BACKEND** según auditoría y pruebas SQL de rollback descritas en [plan beta histórico](BETA_PLAN.md). |
| IC-PACK-03 | Los packs y canjes vinculados a cuenta son **autoritativos del servidor**, idempotentes; el navegador no puede inventar cartas o cuotas ni duplicarlas tras un reintento. | **APROBADA COMO POLÍTICA DE INTEGRIDAD** | **EN MAIN** (cliente) y backend auditado; CI de sincronización y catálogo. |
| IC-PACK-04 | Los Bonus están fuera de sobres normales. **Cómo se obtendrán, qué premios físicos existirán y con qué reglas** sigue pendiente: no prometer acceso ni canje. | **PARCIAL: exclusión técnica vigente; método POR DEFINIR** | 22 Bonus en catálogo, no incluidos en pool; premios sin flujo acreditado. |

## 3. Cuentas, invitados, progreso y lanzamiento

| ID | Decisión o criterio | Decisión | Ejecución / evidencia |
| --- | --- | --- | --- |
| IC-AUTH-01 | Al entrar debe ser claro elegir **Iniciar sesión / Crear cuenta / Invitado**. Crear cuenta usa su pantalla propia; no obliga a ir a Perfil. | **APROBADA** (2026-11-21) | **EN MAIN**, auditoría de acceso. |
| IC-AUTH-02 | El récord arcade usa **exactamente tres caracteres elegidos por el jugador** (letras, números o símbolos válidos), no necesariamente iniciales; no volver a pedirlos innecesariamente al abrir Récords. No usar nombres de ejemplo personales. | **APROBADA** (ajuste explícito del 2026-11-22) | **EN MAIN** según auditoría. Sustituye la mención antigua a «iniciales». |
| IC-AUTH-03 | El invitado puede jugar y coleccionar con experiencia casi completa; **rankings globales y premios/beneficios exclusivos requieren registro**. | **APROBADA** (decisión posterior del 2026-11-21; sustituye la postura del 19-nov) | **PARCIAL / DISCREPANCIA**: la consulta SQL de ranking puede incluir Auth anónimo verificado; aún no se ha corregido. Ver hallazgo A2 del PR #130. |
| IC-AUTH-04 | Invitado puede **calificar y opinar**: esas señales también deben servir para evaluar diseños; sin permitir votos fraudulentos o arbitrarios. No confundir tener opinión local con publicar POP global. | **APROBADA COMO OBJETIVO** (2026-11-21) | **PARCIAL / DISCREPANCIA**: hoy el invitado califica localmente, pero el backend impide sus votos globales. Ver A3 del PR #130. |
| IC-AUTH-05 | Una cuenta registrada conserva identidad, progreso válido y avatar; debe poder recuperar su colección al iniciar sesión en otro navegador sin mezclar cuentas. | **APROBADA** (2026-11-20/21) | **EN MAIN** por lógica y pruebas; no implica E2E Auth real en cada SHA. [QA sync](SYNC_AUTOMATICA_QA.md) es histórico. |
| IC-AUTH-06 | Registro, confirmación de correo, iniciar/cerrar sesión y recuperar contraseña forman parte del flujo. El correo sigue el estilo arcade y usa la identidad visual oficial. | **APROBADA** (2026-11-19/21) | **EN MAIN** a nivel de cliente; SMTP/plantilla efectiva requieren revisión independiente de la configuración real. |
| IC-AUTH-07 | **12 avatares seleccionables** con los archivos actualmente incluidos, guardado/cancelación y persistencia según tipo de cuenta. La presencia de un avatar en `main` no prueba la aprobación visual individual de todas sus ilustraciones; no regenerarlos en una migración de UI. | **APROBADA** (2026-11-20) | **EN MAIN**: 12 avatares, 24 WebP optimizados. [Inventario de avatares](PERFIL_AVATARES_QA.md) describe además un LAB antiguo, no el estado actual de publicación. |
| IC-SYNC-01 | Evitar pérdida, duplicación o mezcla de colecciones: restaurar con verificación, revisiones CAS, conflictos seguros y respaldo antes de sustituir datos. | **APROBADA COMO POLÍTICA DE INTEGRIDAD** | **EN MAIN** y CI; pruebas E2E reales dependen de contexto y cuenta de QA, no se afirman permanentemente. |
| IC-LAUNCH-01 | **Próxima nueva edición**: jugadores comienzan sus **colecciones en cero** al lanzamiento coordinado; se **conservan cuentas, identidades, nombres y avatares**. No importar colecciones antiguas arbitrarias. | **APROBADA PARA UN LANZAMIENTO FUTURO** (2026-11-20/21) | **PROCEDIMIENTO PENDIENTE**; `release-reset.js` sigue `data-active="false"` en `main`. SQL de reinicio es `STAGED`. |
| IC-LAUNCH-02 | **No ejecutar ahora** el reinicio local ni el del servidor, ni activar una nueva epoch o migración. Requiere autorización separada de lanzamiento y reinicio, pruebas y respaldos. | **APROBADA / BLOQUEO VIGENTE** | **NO EJECUTADO** al corte; prueba de no reinicio en CI. [Reset test](https://github.com/llochua/insertcoinmx/blob/main/qa/release-reset.test.mjs). |

## 4. Jugabilidad, valoración y rankings

| ID | Decisión o criterio | Decisión | Ejecución / evidencia |
| --- | --- | --- | --- |
| IC-RETA-01 | Reta se desbloquea con **8 diseños distintos**, no con ocho copias o variantes repetidas; contiene **7 enfrentamientos**. | **APROBADA** | **EN MAIN**, test móvil sobre 5, 7 y 8 diseños en [workflow](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/qa-reta-unlock-mobile.yml). |
| IC-RETA-02 | La pantalla bloqueada muestra el **progreso real**: 5/8 → «Tienes 5 de 8 diseños. Te faltan 3 para jugar tu primera Reta»; 7/8 → «Te falta 1 para jugar tu primera Reta». Con sobres: **«Abrir un sobre»**; sin sobres: **«Ver mi álbum»** y cuenta regresiva de los próximos dos. | **APROBADA** (2026-11-22) | **EN MAIN**, Chromium a 320/390px (SHA base auditado). |
| IC-TIER-01 | Tier con categorías **GOTY / GENIAL / OK / MMM**, desbloqueado al reunir **20 variantes**. | **CRITERIO VIGENTE** | **EN MAIN** según auditoría. |
| IC-RECORD-01 | Récords distinguen cartas/variantes, diseños, repetidas, calificadas y puntos; identidad arcade registrada automáticamente, sin doble captura de tres caracteres. | **APROBADA** (2026-11-21) | **EN MAIN** a nivel cliente; datos del ranking global se validan por separado. |
| IC-PTS-01 | **PTS son puntos del coleccionista**, otorgados una sola vez por variante nueva, no por duplicados, y el canje no debe borrar los puntos ganados. El motor actual usa Base **10**, Holo **25**, Dorada **50** y Full **100**. | **CONCEPTO APROBADO** (2026-11-21); **cifras actuales = parámetros técnicos por ratificar** | **EN MAIN** el algoritmo y sus constantes; verificar fuente de emisiones para rankings. [Motor de puntos](MOTOR_PUNTOS_VALOR_COMUNITARIO_20261120.md) y `content/community-value.mjs`. No cambiar estos números sin nueva decisión. |
| IC-POP-01 | **POP es popularidad del diseño**, común a sus variantes, no dinero ni puntos del jugador. El motor usa **35 % Likes, 35 % Tier, 30 % Reta** como ponderación inicial. | **CONCEPTO APROBADO** (2026-11-21); **pesos actuales = parámetros técnicos por ratificar** | **EN MAIN / backend condicionado**, ver `content/community-value.mjs` y [Motor](MOTOR_PUNTOS_VALOR_COMUNITARIO_20261120.md). No sustituir estos pesos sin validación. |
| IC-POP-02 | **Sin participaciones = «Sin clasificar»**; no atribuir falsamente un POP de 500. El prior técnico de 10 votos neutrales y la ponderación detallada de cada Tier son **parámetros iniciales ajustables**, no preferencias creativas inmutables. | **REGLA VIGENTE / PARÁMETROS TÉCNICOS** | **EN MAIN** según auditoría; requieren validación con datos reales antes de declararlos definitivos. |
| IC-RANK-01 | Distinguir **Ranking Global de Diseños (POP)** del **ranking de coleccionistas (PTS/récords)**; jugadores invitados no ocupan posiciones públicas hasta registrarse. | **APROBADA** (2026-11-21) | **PARCIAL / DISCREPANCIA** por elegibilidad anónima del SQL de leaderboard. No cambiar SQL en esta fase. |

## 5. Narrativas, Archivo y experiencia visual

| ID | Decisión o criterio | Decisión | Ejecución / evidencia |
| --- | --- | --- | --- |
| IC-STORY-01 | Las **Dorada** comunican datos/anécdotas; las **Holo**, la composición y origen del diseño. Los textos editoriales publicados se nutren de la hoja maestra de Drive; no inventar historias para llenar huecos. | **APROBADA** (2026-11-18/19) | **EN MAIN**: `content/card-texts.js`, ver auditoría #130. |
| IC-STORY-02 | **Full Art** debe destacar la ilustración y el relato; la Holo puede enlazar hacia «Así se diseñó →» cuando corresponde. Mantener jerarquía narrativa sin tapar ni mutilar arte. | **CRITERIO APROBADO COMO PROPUESTA DE EXPERIENCIA** (2026-11-22) | **VALIDACIÓN VISUAL AÚN NECESARIA** para cambios posteriores; no inferir que toda propuesta de laboratorio llegó a `main`. |
| IC-STORY-03 | En sobres, la revelación puede presentar la **ilustración a pantalla completa** con **degradado inferior para legibilidad de texto editorial** y narrativa en la ficha. Ese degradado funcional no reemplaza el color sólido del arte definido en IC-ART-01. | **APROBADA COMO DIRECCIÓN UX** (2026-11-19) | **VALIDACIÓN VISUAL POR PANTALLA PENDIENTE**: confirmar que no tapa arte ni crea fondos distintos al aprobado. |
| IC-UX-01 | En revelación de sobres, tocar el fondo puede ocultar/recuperar la carta flotante sin perder la composición; gesto horizontal para navegar; controles secundarios discretos; cierre con **X** cuando corresponda. | **APROBADA** (2026-11-18) | **IMPLEMENTACIÓN PARCIAL/HISTÓRICA**: IC-01 documentado en rama y commit anterior; comprobar paridad real antes de describir toda la experiencia como validada. |
| IC-UX-02 | Selección activa clara, controles reconocibles y sistema de componentes reutilizable, **sin aplanar la identidad arcade ni alterar efectos de cartas**. | **APROBADA COMO DIRECCIÓN** | **SOLO EN PR/LAB** para Design System v0.2 (#130), aún sin aprobación visual de fusión. |
| IC-UX-03 | El logotipo de Insert Coin MX aparece **solo donde aporta función o sentido**: en Sobres tiene sentido como empaque; **no repetirlo por defecto** en Álbum, Reta, Tier o Récords. | **APROBADA** (2026-11-19) | **CRITERIO VISUAL**; su cumplimiento en todas las vistas no está acreditado por la auditoría estática. |
| IC-ARCH-01 | El **Archivo** se concibe como memoria de piezas: información, documentos, fotografías/anécdotas y procedencia. **La iniciativa está en pausa** y las fuentes/autorías y su alcance final no están ratificados. | **INTENCIÓN EDITORIAL / POR DEFINIR** (2026-11-19) | **NO ACREDITADO** como flujo final publicado. Un prototipo UX no equivale a una aprobación. No imponerlo como requisito para completar el álbum. |
| IC-PREMIOS-01 | Premios físicos, ventajas exclusivas y método de entrega de Bonus son **ideas a diseñar**, no funcionalidades que deban anunciarse como existentes. | **POR DEFINIR** | **NO ACREDITADO** como sistema completo; conservar prioridad de identidad registrada si en el futuro se implementan premios. |

## 6. Discrepancias y seguimiento (NO son autorización de implementación)

**Estado al corte:** 8 entradas registradas; **1 resuelta (INC-03)** y **7 abiertas o pendientes de comprobación**. La existencia de una incidencia no autoriza cambiar SQL, UI, datos ni permisos.

| ID | Gravedad | Contradicción o deuda | Acción futura que necesita decisión/QA |
| --- | --- | --- | --- |
| INC-01 | **ALTA** | Decisión IC-AUTH-03 / IC-RANK-01 vs SQL de `icmx_player_leaderboards`: usuarios de Auth anónimo verificado potencialmente elegibles. | Diseñar filtro servidor para ranking público solo registrado; probar dos identidades, resultado vacío y ranking sin progreso ajeno. **No tocar SQL ahora.** |
| INC-02 | **ALTA** | Decisión IC-AUTH-04 vs el rechazo actual de votos anónimos por `community_can_vote()`. | Definir canal de opinión invitada verificable, límites antiabuso y qué agrega a POP; test de duplicados. **No habilitar voto anónimo arbitrario.** |
| INC-03 | **RESUELTA (23-nov-2026)** | `main` carecía de protección obligatoria en la auditoría del 22-nov. | **CERRADA:** GitHub reporta `protected:true`; ruleset #27900704 activo, PR requerido, cuatro checks obligatorios, rama al día, conversaciones resueltas, bloqueo de borrado/force push y bypass vacío. [PR #131 fusionado](https://github.com/llochua/insertcoinmx/pull/131). |
| INC-04 | **ALTA** | Fuente de verdad de aprobaciones de artes no coincide con `estado: "Propuesta · revisar"` en las 126 filas del catálogo. | Crear inventario de aprobación arte por ID con referencia al creador. **No degradar aprobaciones ni modificar catálogos solo por la etiqueta.** |
| INC-05 | **MEDIA** | PR #130 y algunos LAB no tienen confirmación visual de paridad con el juego publicado. | Capturas mismo diseño, variante y tamaño en `main`/LAB; corregir exclusivamente LAB cuando `main` esté bien. |
| INC-06 | **MEDIA** | Documentos `BETA_PLAN.md`, `RANKING_GLOBAL_POP_20261121.md`, `SYNC_AUTOMATICA_QA.md` y algunos READMEs conservan estados históricos. | Añadir avisos de fecha y enlaces al registro. **No borrar historia ni asumir que «no publicado» sigue vigente.** |
| INC-07 | **MEDIA** | QA Auth real, configuración SMTP/callbacks y pruebas visuales completas no corren automáticamente en cada SHA. | Establecer pruebas con cuentas desechables autorizadas; verificar Dashboard y sin tocar inventarios reales. |
| INC-08 | **PENDIENTE** | Obtención de Bonus, premios, extensión del Archivo y detalles de UI de POP requieren especificación. | Mantener como pendientes, no anunciar como implementados. |

## 7. Protección técnica vigente y alcance de la autorización

El [ruleset #27900704](https://github.com/llochua/insertcoinmx/settings/rules/27900704) está **activo** y apunta a la rama predeterminada `main`. Exige Pull Request, ramas al día, conversaciones resueltas y cuatro checks de GitHub Actions:

1. `Main · conservación sin reinicio` — conserva dominio, catálogo, módulos críticos y el reset apagado; bloquea bajas accidentales de assets.
2. `Catálogo, integridad de imágenes y UI` — tests de código, catálogo, integridad y recursos.
3. `Chromium · 5, 7 y 8 diseños (390px y 320px)` — Reta bloqueada/desbloqueada en móvil.
4. `Chromium · dos sesiones · nube simulada` — prueba de sincronización simulada, **no** Auth real.

Además, impide borrado y force push de la rama. La lista de bypass está vacía y el umbral de aprobaciones formales de GitHub está en **0** (único mantenedor); **por eso ninguna regla automática sustituye la autorización personal explícita del creador para fusionar**. Los checks automáticos pueden ser insuficientes para declarar aprobadas ilustraciones, diseños, accesibilidad, correos reales o economía del servidor.

**Advertencia de integración del PR #132:** se creó antes de fusionar #131, por lo que su rama está **detrás de `main`**. Antes de fusionarlo será necesario actualizarla sobre el `main` protegido y ejecutar los cuatro checks con el resultado vigente. Esta documentación **no ejecuta ni autoriza** esa actualización ni ninguna fusión.

## 8. Precedencia de fuentes y prohibiciones de reinterpretación

1. **Última instrucción explícita del creador** para esa decisión.
2. Aprobación anterior documentada del creador, si no fue sustituida.
3. **Estado real de `main` y backend verificado**, para responder «qué existe» (no para decidir «qué le gusta»).
4. Evidencia de CI **vinculada a commit/SHA**, para responder «qué se probó».
5. Documento de auditoría de fecha determinada.
6. Prototipos, LAB, ramas antiguas, comentarios de código y documentos históricos (nunca prevalecen sobre lo anterior).

**Casos que no se deben reabrir por accidente:**
- El fondo de una ilustración no es transparente: debe prolongarse su color sólido, no taparse con degradados o parches.
- 8 diseños distintos para Reta no equivalen a 8 cartas o 8 variantes.
- 3 caracteres de récord no son necesariamente «iniciales».
- Invitado puede coleccionar y opinar, pero no debe aparecer en ranking global sin registro.
- PTS del coleccionista y POP comunitario no son el mismo número ni tienen valor monetario.
- «Nueva edición desde cero» es una **decisión futura de producto**, no un permiso de ejecutar el reinicio hoy.
- Tener un PR, un test verde o un archivo con la palabra «aprobado» no autoriza una fusión.

## 9. Protocolo para agregar o modificar una decisión

Cada entrada nueva debe registrar como mínimo:

```text
ID: IC-<AREA>-NN
Decisión literal y alcance:
Fecha de aprobación:
Fuente (conversación, comentario, PR, captura):
Estado de decisión: APROBADA | CRITERIO VIGENTE | POR DEFINIR | HISTÓRICA
Estado técnico: EN MAIN | PARCIAL | SOLO EN PR/LAB | NO ACREDITADO | PROCEDIMIENTO PENDIENTE
Evidencia exacta (archivo, SHA, check y/o imagen):
Impacto en arte, datos, cuentas, sobres y juego:
Qué reemplaza (IDs anteriores, si aplica):
Aprobación explícita del creador para el cambio de estado:
```

**Flujo:** recuperar fuentes → comparar contra `main` → redactar/actualizar ID → señalar discrepancias → validar con el creador → en otra rama implementar únicamente lo autorizado → QA y capturas → solicitar autorización de merge. **No actualizar el estado `APROBADA` por inferencia ni borrarlo porque un LAB sea diferente.**

## 10. Referencias verificables y vigencia

- [Auditoría de main (PR #130, 22-nov-2026)](https://github.com/llochua/insertcoinmx/blob/docs/design-system-audit-2026-11-22/docs/design-system/AUDITORIA_MAIN_2026-11-22.md) — fotografía del código, backend y CI; no certifica todas las pantallas.
- [Regla sólida de fondos DS-ART-01](https://github.com/llochua/insertcoinmx/blob/docs/design-system-audit-2026-11-22/docs/design-system/ILUSTRACIONES-FONDOS.md) — restauración del LAB, paridad visual pendiente.
- [PR #131 — Fase 1 protección de main](https://github.com/llochua/insertcoinmx/pull/131) — **fusionado** con autorización; commit `7513a4362fa4df70b1cf06e0515ae3fa6c6f796c`, reglas vigentes en [GitHub Settings](https://github.com/llochua/insertcoinmx/settings/rules/27900704).
- [Workflow de preservación incorporado](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/main-safety.yml) — comprobaciones no destructivas en los PR a `main`.
- [SQL de leaderboard registrado](https://github.com/llochua/insertcoinmx/blob/main/supabase/sql/player_global_leaderboards_STAGED.sql) y [cliente de votos](https://github.com/llochua/insertcoinmx/blob/main/content/auth-account.js) — evidencias de las discrepancias INC-01/INC-02; el nombre del archivo SQL no basta para afirmar cuándo se aplicó al servidor real.
- [Motor PTS/POP](MOTOR_PUNTOS_VALOR_COMUNITARIO_20261120.md), [Perfil/cuentas](PERFIL_CUENTAS_INTEGRACION_20261120.md), [Ranking POP histórico](RANKING_GLOBAL_POP_20261121.md), [Plan beta histórico](BETA_PLAN.md).
- [Catálogo en main](https://github.com/llochua/insertcoinmx/blob/main/cartas/catalogo.json), [Validación](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/validacion.yml), [Reta móvil](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/qa-reta-unlock-mobile.yml).
- Conversaciones de producto del 18 al 23 de noviembre de 2026: acuerdos sobre sobres/gestos, narrativas, identidad, invitado, ranking, lanzamiento, fondos y QA. Cuando no existe URL pública verificable se identifica la conversación por fecha, **sin inventar un enlace**.

### Estado de Fase 2 y control de revisión

**Historial mínimo:** v0.1 creó el inventario inicial sobre `b9e5e3de89ab`; v0.2 incorpora el estado verificado tras la fusión del PR #131, agrega acuerdos visuales omitidos, diferencia parámetros técnicos de aprobaciones literales y registra sustituciones históricas, además de separar cierre de una incidencia de las siete aún abiertas. Ninguna de estas modificaciones documentales es autorización de cambios a la lógica del juego.

**Revisión previa a publicación del registro:** confirmar con el creador los acuerdos editoriales cuyo origen es conversacional (no un commit), especialmente experiencia de Archivo, relatos, gestos y premios; no interpretarlos como evidencia de una función completa. Comprobar que la próxima actualización de la rama no introduzca archivos de ejecución y que pase los checks obligatorios.

**v0.2 revisada, aún en PR #132 para validación del creador.** Se corrigió el corte de Fase 1 y se inventariaron 42 decisiones/criterios y 8 observaciones (1 resuelta). No declarar el conjunto definitivamente ratificado por la sola creación del archivo. Los hallazgos `INC-*` son para planificación posterior, no órdenes de implementación. **No se modifican producción, cuentas, colecciones ni ilustraciones.**
