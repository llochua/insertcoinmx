# Insert Coin MX · Textos de cartas

Este directorio contiene **únicamente la copia de publicación** de los textos. La fuente maestra editorial sigue siendo [Insert Coin MX — Narrativas TCG](https://docs.google.com/spreadsheets/d/1jcwFQ2CMPHHbeujKEdrR9W9F4AjtkXQb9LyXu3DOE1I/edit?gid=1837827556).

## Campos de `card-texts.js`

Cada diseño se identifica por su **ID estable** (columna K). `habilidad` = columna P y `frase` = columna Q; aparecen en la revelación de la **Base**. `holo` = narración sobre cómo lo diseñamos (columna G, solo textos aprobados) y `dorada` = anécdota/curiosidad (columna E, solo textos aprobados). Las variantes Full no incorporan copy adicional en la revelación.

## Actualizaciones

1. Mantener aprobaciones, versiones originales y ediciones exclusivamente en Google Sheets.
2. Al publicar cambios, exportar los campos aprobados al archivo `card-texts.js` conservando cada ID del juego. No editar el catálogo ni las probabilidades para cambiar un texto.
3. Ejecutar `node content/validate.mjs` para validar los 92 IDs, habilidades y frases y confirmar que el archivo de publicación está conectado a `index.html`.
4. Publicar con un commit/PR. Cambiar el parámetro de versión de `card-texts.js?v=...` en `index.html` al actualizar el archivo para evitar caché vieja.

Las narrativas que no estén aprobadas no se publican. **Cambiar Google Sheets no actualiza automáticamente el sitio**: hace falta sincronizar su copia de despliegue. El juego carga los textos mediante un script local antes de inicializarse, evitando solicitudes tardías durante la apertura de sobres.
