# Insert Coin MX — Auditoría de estado real de `main`

**Corte auditado:** 22 de noviembre de 2026 · commit `b9e5e3de89ab306bc261cff74787247697d387f2`. **Lectura exclusivamente**, sin cambios de producción, cuentas, colecciones, SQL o configuración. El documento se guarda en una **rama de auditoría / PR #130 en borrador**, NO en `main`.

## Método y grados de certeza

- **CONFIRMADO EN CÓDIGO**: existe en `main` y se pudo leer su implementación, pero eso no certifica la experiencia visual o el backend.
- **CONFIRMADO EN CI**: el workflow indicado pasó sobre el SHA indicado; no extrapolar a escenarios que ese workflow no cubre.
- **CONFIRMADO EN SUPABASE**: comprobación SQL de solo lectura en el proyecto vinculado; describe su estado al momento de la consulta, no decisiones futuras.
- **CRITERIO HISTÓRICO / APROBADO EN PRODUCTO**: acuerdo previamente definido que no debe reabrirse como si fuera una propuesta. Confirmación final de diseño visual solo por el creador.
- **PENDIENTE DE COMPROBACIÓN**: existe algo de soporte o intención, pero no hay prueba end-to-end o autorización suficiente.

La presencia de un archivo SQL llamado `STAGED`, un PR abierto o un documento que diga «no implementado» **no prevalece** sobre el estado actual del código ni del servidor. Tampoco un test de CSS prueba que una ilustración se vea bien.

## 1. Infraestructura y edición

| Aspecto | Estado observado | Evidencia |
| --- | --- | --- |
| Código publicado | `main` en GitHub; repositorio público con GitHub Pages | GitHub `main`, `CNAME`, API de Pages |
| Último commit revisado | `b9e5e3de89ab` | [Commit](https://github.com/llochua/insertcoinmx/commit/b9e5e3de89ab306bc261cff74787247697d387f2) |
| GitHub Pages | Deploy exitoso para ese SHA | [GitHub Actions](https://github.com/llochua/insertcoinmx/actions?query=branch%3Amain) |
| Validación cartas + JS | Éxito en ese SHA | [Validación](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/validacion.yml) |
| Reta 320 y 390 px | Prueba exitosa 5, 7 y 8 diseños | [Workflow Reta](https://github.com/llochua/insertcoinmx/blob/main/.github/workflows/qa-reta-unlock-mobile.yml) |
| Protección de `main` | **DESACTIVADA**. No hay comprobaciones de estado obligatorias | GitHub API: `branches/main` → `protected:false`, `required_status_checks.enforcement_level=off` |
| Reinicio de progreso | **NO se ejecuta al cargar**; `data-active="false"` | [index.html](https://github.com/llochua/insertcoinmx/blob/main/index.html), [release-reset.js](https://github.com/llochua/insertcoinmx/blob/main/content/release-reset.js) |
| SDK Supabase | Dependencia Supabase-js fijada en `2.95.3` | [auth-account.js](https://github.com/llochua/insertcoinmx/blob/main/content/auth-account.js) |

`main` no debe confundirse con el laboratorio `qa/design-system` del PR #130 ni con los PR antiguos. La prueba de fondos del PR se restauró a las funciones y CSS que estaban en `main`.

## 2. Inventario real de producto

| Módulo | Estado en main | Lo que ya existe y debe preservarse |
| --- | --- | --- |
| Catálogo | **Implementado** | 126 diseños en `cartas/catalogo.json`: 104 del Álbum y 22 Bonus no producibles en sobres normales. 74 escenas Full. |
| Variantes | **Implementado** | Base, Holo, Dorada, Full; 386 variantes elegibles en el pool real de Supabase. |
| Recursos de cartas | **Implementado** | 126 ilustraciones WebP (`d/`), 452 imágenes pequeñas (`c/`) y 452 grandes (`c2/`), 74 Full (`fa/`). Las 66 cartas de Bonus se incluyen en los assets, pero no en el pool elegible. |
| Sobres | **Implementado** | 5 sobres de bienvenida; después 2 cada 6 h; cada sobre contiene 5 cartas. Canje de 5 repetidas por un extra; emisión desde servidor para sesiones vinculadas. `PRUEBA=false` en producción. |
| Progreso / guardado | **Implementado** | `localStorage` con backup, adopción entre pestañas, rev/sync, guardado con recuperación y RPC de snapshot; mecanismos para evitar sobres duplicados por reintento. |
| Inicio de sesión / creación | **Implementado** | Inicio/cuenta/invitado; formulario de creación separado; Supabase Auth, confirmación y recuperación de contraseña. |
| Invitado verificado | **Implementado** | Identidad arcade y handle, Auth anónimo y emisión desde servidor; mantener restricciones antiabuso. |
| Avatares | **Implementado** | 12 personajes con tamaños optimizados, selección y persistencia local o en metadatos de cuenta. |
| Reta | **Implementado** | Se desbloquea con 8 diseños **distintos**; 7 enfrentamientos; interfaz para 5, 7 y 8 diseños; CTA contextual a sobres/álbum; reloj de 2 sobres. |
| Tier | **Implementado** | Categorías GOTY, GENIAL, OK, MMM; desbloqueo a 20 variantes. |
| Récord arcade | **Implementado** | Tres caracteres (no necesariamente iniciales), letras/números/símbolos permitidos. Tableros por cartas, puntos, diseños, repetidas y calificadas. |
| POP y PTS | **Implementado / condicionado por backend** | PTS por variantes 10/25/50/100; POP por diseño con 35 % Likes, 35 % Tier y 30 % Reta. Los POP sin votos se muestran sin clasificar, no con una puntuación inventada. |
| Relatos editoriales | **Implementado** | Holo / Dorada y orden de calificaciones; `card-texts.js` es copia de publicación de la hoja maestra de Drive. |
| Exportación/recuperación | **Implementado** | Descargas de respaldo, verificación y tratamiento de conflictos; no borrar colecciones sin consentimiento. |
| Premios o beneficios exclusivos | **No acreditado como módulo completo** | Hay decisiones de producto sobre exclusividad del registro; no dar por implementados canjes/recompensas sin un flujo backend y QA propio. |

**No interpretar «Implementado» como «aprobado visualmente».** Los estilos, fondos del arte y jerarquía requieren preservar las decisiones y comparar resultados si se modifican.

## 3. Estado real de Supabase: NO depender de documentos viejos

Consultas SQL **solo lectura** mostraron:

| Control real | Resultado |
| --- | --- |
| Proyecto conectado | `ACTIVE_HEALTHY` |
| `private_sync.beta_access_gate` `public_beta` | **enabled = true** |
| `private_sync.beta_access_gate` `verified_guest` | **enabled = true** |
| `private_community.release_gate` `community_pop` | **enabled = true** |
| `private_sync.pack_pool` | 386 variantes, 104 diseños elegibles |
| `private_community.community_design_votes` | 24 filas registradas en la consulta |
| `private_community.community_reta_ballots` | 1 papeleta registrada en la consulta |
| `public.player_snapshots` | 1 fila registrada en la consulta |
| `public.import_guest_collection` | `EXECUTE` = false para `anon` y `authenticated` |
| Tablas de juego inspeccionadas | RLS activado en todas las tablas `public` y privadas revisadas |

**Implicación:** los documentos `docs/BETA_PLAN.md`, `docs/RANKING_GLOBAL_POP_20261121.md`, `docs/SYNC_AUTOMATICA_QA.md` y `emails/README.md` contienen estados históricos o de ramas antiguas. No son un diagnóstico operativo actual. Tener las compuertas habilitadas no demuestra que todos los flujos estén aprobados ni implica ejecutar un reset.

## 4. Hallazgos priorizados

### A1 — Alta · `main` sin protección (confirmado)

La rama pública permite cambios sin checks obligatorios. **Acción recomendada:** configurar protección de rama (requerir PR, pruebas de cartas, Reta y seguridad de sincronización, al menos una revisión) **con autorización**, sin cambiar el juego. Esto reduciría el riesgo de que un experimento se publique por error.

### A2 — Alta · El ranking del servidor puede incluir invitados verificados (confirmado)

La definición real y el archivo [`player_global_leaderboards_STAGED.sql`](../../supabase/sql/player_global_leaderboards_STAGED.sql) incluyen `auth.users.is_anonymous = true` en la selección elegible cuando existe identidad de invitado y `verified_guest` está activado. **No existe un filtro de elegibilidad que excluya a todos los anónimos antes del Top 10**. Aunque el código cliente diferencia ranking global de récord local provisional, el SQL permitiría aparecer a un invitado con puntaje y snapshot. La consulta de solo lectura confirma **0 snapshots anónimos y 1 snapshot registrado** en este momento: **no hay evidencia de un invitado publicado ahora**, pero la lógica permitiría su entrada cuando exista. Contradice la decisión de producto: **para aparecer en rankings globales hay que registrarse**.

**Acción recomendada:** especificar y validar la regla antes de modificar SQL: invitados ven sus propios récords locales, pero `icmx_player_leaderboards` publica solo cuentas registradas y verificadas; conservar identidad/colección de invitado al convertirla en cuenta.

### A3 — Alta · La opinión de invitados no alimenta actualmente POP global (confirmado)

En [`auth-account.js`](../../content/auth-account.js) `icmxCommunityRequest` exige cuenta no anónima para escribir votos y en `private_community.community_can_vote()` se rechaza `is_anonymous=true`. La calificación de invitado se conserva localmente. Esto **no cumple todavía el objetivo de producto de usar la opinión de invitados para el estudio de mercado**, aunque evita votos no verificables.

**Acción recomendada:** diseñar un canal separado de señales de invitados con identidad verificable, límites y protección antiabuso; no permitir votos anónimos arbitrarios ni mezclar su contribución con los rankings personales.

### A4 — Alta · Documentación y estados editoriales desactualizados

- En `cartas/catalogo.json`, las **126 filas** siguen marcadas `Propuesta · revisar`; esto no prueba falta de aprobación, demuestra que el campo **no refleja confiablemente la aprobación vigente**.
- `content/README.md` describe «92 IDs» cuando el catálogo actual contiene 126. El validador real sí compara los IDs dinámicamente y el CI pasa.
- `emails/README.md` afirma que Auth/correo no están conectados, pese a que el código de alta/recuperación existe y han sido usados; revisar configuración de plantillas desde Supabase antes de declararlas activas o inactivas.
- Los documentos de fases antiguas siguen usando expresiones «NO PUBLICADO», pero las compuertas efectivas ya están habilitadas.

**Acción:** este informe es el registro operativo de fecha concreta. Hacer un inventario `DECISIONES_APROBADAS.md` y marcar documentos anteriores como «HISTÓRICO», nunca borrarlos ni tratarlos como órdenes de trabajo.

### A5 — Media-alta · QA de cuenta real y rankings no se repite en cada publicación

El último `main` pasó **Validación de cartas y artes**, **Reta móvil** y **GitHub Pages**. Los workflows de sincronización entre navegadores, POP/Supabase local y Auth real son principalmente disparados por PR o manualmente; un éxito aislado no demuestra que hayan pasado **sobre cada SHA de `main`**.

**Acción:** diseñar matriz de regresión y controles de fusión con pruebas automáticas no destructivas. Para Auth real, usar solo una cuenta desechable autorizada, nunca consumir sobres de cuentas personales.

### A6 — Media · Avisos Supabase necesitan clasificación, no parches automáticos

El asesor de seguridad mostró:
- Aviso `anon_security_definer_function_executable`: `public.icmx_player_leaderboards()` usa `SECURITY DEFINER` y es accesible por `anon`. Parece un endpoint de lectura pública del Top 10 (retorna códigos, handles, puntos y bandera `mine`), pero conviene revisar su contrato y permisos, no asumir una fuga.
- Seis funciones `SECURITY DEFINER` invocables por autenticados, coherentes con operaciones controladas de sobres/snapshot; revisar validación interna de `auth.uid()`.
- Avisos de políticas para usuarios Auth anónimos; comprobar predicados de propietario. Las 11 tablas privadas con RLS sin políticas propias se administran a través de RPC y no demuestran por sí mismas una brecha.
- `Leaked Password Protection Disabled` reportado por el asesor; revisar capacidades del plan y medidas compensatorias.

No se ha confirmado una filtración ni se ha cambiado ningún permiso. Referencia de seguridad: [Supabase Advisors](https://supabase.com/docs/guides/database/database-advisors) y [SECURITY DEFINER expuesto](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

### A7 — Media · Complejidad monolítica y deuda de laboratorios

`index.html` concentra aproximadamente **4,342 líneas / 383 KB** de HTML, CSS y JavaScript. Las funciones y los estilos de arte están relacionados con flujos de sobres, Auth, Tier, Reta, etc. Un refactor visual masivo puede cambiar comportamiento indirectamente. Los laboratorios antiguos pueden quedarse desfasados.

**Acción:** por pantalla/componente, comprobar paridad con `main`; los laboratorios usan identidad y datos aislados. El PR #130 contiene una prueba adicional que compara literalmente zonas de arte entre `main`, PR y LAB, **todavía no fusionada**.

### A8 — Media · Callback de Auth sigue en ruta de QA

`content/auth-account.js` usa `location.origin+'/qa/registro/'` para redirecciones de confirmación y recuperación. El usuario ha probado estos flujos; **no es un bug confirmado**, pero el nombre y el acoplamiento a una ruta de laboratorio son deuda de navegación. La allowlist completa de redirecciones requiere inspección de Dashboard; no se modifica sin una migración deliberada.

### A9 — Media · 28 PR abiertos (25 en borrador)

Muchos corresponden a experimentos o versiones históricas de diseño/Reta/Auth. No significa que falten en `main`; puede haber versiones posteriores publicadas por otros PRs. **Acción:** inventariar y etiquetar como «superseded / histórico / activo», sin fusionar por antigüedad, sin cerrar ni eliminar sin revisión.

## 5. Baselines de arte que no se deben reabrir

- Los fondos de las ilustraciones son **sólidos** y prolongan el mismo color del archivo en la revelación y resumen. Ya es una decisión anterior; no es una propuesta de este PR.
- La versión de `main` es la referencia a respetar. El experimento del PR #130 que introdujo diferencias visuales fue revertido; se conserva una protección de paridad en la rama (no en `main`).
- No generar ni editar artes, avatares, rarezas, efectos o layouts de cartas durante un refactor de botones e iconos.
- Los artes editoriales se generan desde `cartas/catalogo.json`, plantillas y fuentes; los textos maestros están en la hoja de Drive. `c/` y `c2/` son salidas generadas; nunca parchear a mano una carta.
- Confirmar en capturas y con aprobación del usuario antes de promover cambios visuales. Si el LAB difiere de `main`, primero revisar el LAB.

## 6. Qué sí tiene pruebas y qué falta validar

**Confirmado en CI sobre el SHA auditado:** validación de catálogo/arte, sintaxis/tests básicos; Reta bloqueada y desbloqueada en 320/390 px; despliegue de Pages. **Confirmado por lectura de código y SQL:** funciones mencionadas, compuertas, pool, permisos, RLS y contador de registros.

**No demostrado por esta auditoría:** pixel-perfect de todas las pantallas (y de 126 diseños), comparación en escritorio de todos los modales, carga del CDN externo de previews, rendimiento con cientos de usuarios, recuperación de Auth real reciente en dos dispositivos, disponibilidad de SMTP en distintos proveedores, antifraude bajo ataque, configuración de redirect allowlist completa o aprobación visual explícita de cada arte.

No convertir una prueba parcial en la frase «todo validado».

## 7. Orden propuesto sin tocar producción

1. **Definir y aprobar el registro de decisiones:** separar `APROBADO`, `IMPLEMENTADO`, `EN PRUEBAS`, `HISTÓRICO` y `PENDIENTE`; adjuntar fuente y fecha de revisión. Este archivo inicia el inventario, pero no reemplaza la aprobación del usuario.
2. **Proteger `main`** con checks obligatorios y revisión (cambio de GitHub Settings pendiente de consentimiento específico).
3. **Alinear reglas de rankings/invitados:** resolver A2 y A3 desde el contrato de producto, revisar SQL en entorno de prueba y tomar captura E2E antes de aplicar.
4. **Actualizar estado de documentación y arte editorial** sin regenerar cartas ni modificar gráficos.
5. **Extender QA real y de paridad** y limitar el PR #130 al sistema de UI que pueda comprobarse sin tocar el arte.

**Regla para futuras intervenciones:** primero comparar con `main`, luego identificar la decisión aprobada y la evidencia; solo después proponer modificaciones. Ningún cambio pasa de «En pruebas» a «Aprobado» por tener CI verde.
