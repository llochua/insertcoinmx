# QA · Fusión conservadora de colecciones (19 de noviembre de 2026)

**Estado:** diseño y prueba de archivo externo; no activado en el juego. No modifica el snapshot inmutable de Supabase ni el progreso del navegador.

## Motivo y fuentes

Se compararon dos respaldos exportados por el usuario en el mismo hilo. No se copian aquí los archivos, porque contienen progreso individual.

- Respaldo en Supabase: 47 variantes en el JSON, 50 copias, 33 calificaciones, 12 IDs de sobre y revisión 74.
- Exportación local posterior: 50 variantes en el JSON, 50 copias, 33 calificaciones, 13 IDs de sobre y revisión 76.
- La exportación local contiene tres variantes ausentes de la nube: `levelup_b`, `invader_e`, `tokyo3_e`.
- La nube tiene una copia adicional de `x_b`, `gatosamurai_b` y `theworldwarrior_b`.
- Las calificaciones, la Reta, el campeón y las iniciales coinciden. Los 12 IDs de sobre de Supabase están incluidos en los 13 del respaldo posterior.

**Nota de conteo:** la interfaz principal excluye las cartas bonus al calcular «cartas distintas»; el número de claves `data.have` incluye también esas variantes. No se deben usar como si fueran la misma métrica.

## Regla adoptada solamente para este par de respaldos

1. Verificar `app: insertcoinmx-album`, `format: 2`, `data.have`, `data.rate`, revisiones, IDs y límites numéricos. Rechazar JSON sospechoso o mal formado.
2. Confirmar que el archivo local tiene fecha y revisión posteriores y que su historial de sobres contiene todo el historial de la nube.
3. Confirmar que **no hay conflicto** en calificaciones, Reta ni otros datos de progreso ajenos a la colección (salvo los contadores conocidos vinculados con el sobre nuevo).
4. Para cada variante, usar **`max(copiasNube, copiasLocal)`**, nunca sumar. Esta operación conserva las cantidades observadas en ambos respaldos sin duplicar las copias compartidas.
5. Conservar el resto de datos del respaldo local más reciente (`pk`, `rev`, `extra`, `freeUsed`, `freeCycle`, Reta, etc.), sin crear sobres ni reiniciar contadores.
6. Si algún supuesto no se cumple, **cancelar y revisar manualmente**, no fusionar a ciegas.
7. Crear un archivo JSON de propuesta que el juego pueda revisar con su importador existente. El usuario decide expresamente si lo importa. El juego genera una copia `.bak` antes de cualquier reemplazo y vuelve al estado previo si falla la escritura.

## Resultado esperado de la propuesta QA

- **50 variantes** de carta en `data.have`, **53 copias** en total.
- **33 calificaciones**.
- **13 IDs** de sobre preservados.
- Se mantienen las tres variantes nuevas y las tres copias extras que estaba guardando la nube.
- **El snapshot original en Supabase NO se reemplaza.** Es una copia histórica y de solo primera inserción.

## Límites importantes

Este método **no es una solución general de sincronización**. Un `max` por variante puede subcontar dos sobres independientes obtenidos en dispositivos desconectados. Para sincronizar en vivo harán falta eventos o identificadores únicos por adjudicación, reglas de conflicto y protección contra repeticiones. La propuesta solo es válida después de comprobar el historial y la ausencia de conflictos en estos dos respaldos.

Los JSON personales quedan **fuera de GitHub**; solo se documentan el razonamiento y las verificaciones. No se realiza el reinicio global acordado para antes del lanzamiento.
