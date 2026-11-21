# Insert Coin MX · motor de puntos y valor comunitario · primera entrega

**Estado:** implementado y probado como módulo matemático aislado. **Todavía NO se muestran estos puntos en el sitio ni se reciben votos públicos en Supabase.** Las colecciones de la edición \`public-2026-launch-v1\` permanecen intactas. No implica otro reinicio.

## Dos cifras distintas

1. **Puntos del coleccionista (PTS)**: acumulación permanente por primera obtención de una variante válida, independientemente de posteriores canjes de repetidas. Base \`b\` = 10; Especial/Holo \`e\` = 25; Rara/Dorada \`r\` = 50; Full Illustration \`f\` = 100. Las repetidas no aumentan el puntaje. El servidor debe reconocer únicamente cartas que realmente entregó, no el conteo que un navegador envíe.
2. **Valor comunitario del diseño (POP)**: índice dinámico **0–1000 puntos de popularidad**, común a las cuatro variantes de un mismo diseño. No representa pesos, compraventa, NFT, cotización ni rareza individual. Su posición se calcula en el **Ranking Global de Diseños**. Se diferencia de los Récords de jugadores, que hoy miden variantes distintas.

## Propuesta matemática v1 (ajustable tras revisar casos reales)

| Señal | Peso global | Dato que entrega backend | Normalización |
|---|---:|---|---|
| Likes | 35 % | \`positive\`, \`total\` | \`positive/total\` |
| Tier Lists | 35 % | Cantidad por nivel \`goty\`, \`genial\`, \`ok\`, \`mmm\` | GOTY 1; GENIAL .75; OK .40; MMM 0 |
| Reta | 30 % | \`wins\`, \`matches\` | \`wins/matches\` |

**Suavizado para impedir rankings inflados con un único voto:** cada canal agrega un antecedente de 10 votos neutrales (50/100):

\`\`\`
canal = (suma_de_calificaciones + 10*0.5) / (votos_reales + 10)
POP = round(1000 * (0.35*likes + 0.35*tiers + 0.30*reta))
\`\`\`

Los canales que aún no tienen participaciones contribuyen con 0.5 neutral; **si ninguno tiene participaciones, POP es nulo y se muestra «SIN CLASIFICAR»**, no 500. En igualdad de POP se comparte posición; se ordena de forma determinista para mostrar resultados estables.

*Los pesos 35/35/30 y los puntos 10/25/50/100 corresponden a la propuesta acordada. La ponderación interna de niveles de Tier y el parámetro de suavizado (=10) son decisiones técnicas iniciales, sujetas a prueba con datos comunitarios. No son cotizaciones reales.*

## Contrato de entrada del motor

\`content/community-value.mjs\` exporta funciones puras:

- \`collectionPoints(earnedKeys, validCardKeys)\` calcula puntos desde un **historial de variantes obtenidas**; no desde el inventario mutable. \`validCardKeys\` es una lista permitida proveniente del catálogo verificado y excluye bonus.
- \`awardDiscoveries(previousEarned, newCards, validCardKeys)\` devuelve el historial acumulado y las variantes que dieron puntos por primera vez, sin decrementar puntos cuando un duplicado sale del inventario.
- \`scoreDesign({likes,tiers,reta})\` recibe agregados comprobados y devuelve \`score\`, \`status\`, conteo de interacciones y canales.
- \`rankDesigns([{id,likes,tiers,reta}])\` calcula clasificación global, lugar empatado cuando corresponde y \`null\` en diseños sin participaciones.

El módulo **no escribe en Supabase**, no altera probabilidades de sobres, no modifica el álbum y no acepta datos del navegador como autoridad para el ranking.

## Siguiente integración segura (pendiente)

1. **Historial de puntos auténtico**: derivar variantes descubiertas a partir de emisiones verificadas en \`private_sync.pack_issues\` y cualquier flujo autorizado nuevo; conservar puntos históricos aunque se canjeen repetidas. Los jugadores sin sesión tendrán una vista **provisional local**, pero no podrán publicar puntos arbitrarios en el ranking.
2. **Votación verificable en Supabase**: separar un like binario por diseño de la calificación de Tier Lists que hoy se almacena como \`S.rate\` (GOTY/GENIAL/OK/MMM). Reta hoy usa \`S.reta2\` para la secuencia de siete enfrentamientos y el usuario puede reiniciar el día: enviar al servidor **solo la última partida completada y sus encuentros definitivos**, reemplazando resultados anteriores del mismo día.
3. **Identidades**: para cuentas, una calificación vigente por usuario y diseño; un like por usuario/diseño; resultados de Reta únicos por usuario/día/encuentro. Para invitados, prever identidad anónima verificable y límites anti-abuso. Las visitas anónimas hoy no tienen una identidad global confiable: **no publicar votos guest arbitrarios** hasta probar y fijar protección contra duplicados.
4. **Lecturas públicas seguras**: los clientes reciben solamente agregados por diseño, no correos, identidades ni eventos de otros usuarios. Nunca permitir INSERT/UPDATE directo de un «valor POP» suministrado por el cliente; el servidor calcula agregados. Las reglas de autenticación/RLS deben aprobar pruebas de usuarios distintos.
5. **Interfaz**: PTS y puesto de coleccionista en Mi perfil; POP, su desglose y posición en el detalle de cada diseño; pantalla **Ranking Global de Diseños** con «Sin clasificar», tendencias y filtros futuros. Las cuatro variantes de un mismo diseño comparten POP, pero otorgan puntos distintos al coleccionista.

## Regresiones obligatorias

\`node --test qa/community-value.test.mjs\` valida primeras obtenciones, repetidas, ausencia de registros ficticios, ponderaciones, poca muestra, orden global, empate y rechazo de agregados imposibles. Pruebas automáticas se ejecutan en el workflow \`.github/workflows/validacion.yml\`. **Ninguna colección debe reiniciarse para integrar esta capacidad.**
