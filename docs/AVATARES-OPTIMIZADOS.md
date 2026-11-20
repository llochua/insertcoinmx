# Avatares Insert Coin MX — primera colección (12)

**Estado:** diseños aprobados y WebP optimizados; recursos binarios listos para incorporar desde paquete externo, todavía **no publicados en esta rama**. No modificar UI/perfiles hasta integrar y probar.

## Lista / IDs
moneda, pizza, control, cartucho, bote-tinta, mago, gato-afk, jos, glitch, playera, rasqueta-malla, arcade.

## Optimización validada
- 2 tamaños: 128 x 128 y 320 x 320 px, formato WebP.
- Peso conjunto de los 24 WebP: 325.264 bytes (reducción de 98,8% vs PNG fuente, 27.336.402 bytes).
- 24 archivos con nombres `<id>-128.webp` y `<id>-320.webp`, carpeta destino propuesta: `assets/avatars/`.
- Fuente: paquete `insertcoinmx-avatares-optimizados.zip` generado el 20 nov 2026; incluye `avatars.json` con variantes y hashes SHA-256.

## Uso recomendado
```html
<img src="assets/avatars/moneda-128.webp"
     srcset="assets/avatars/moneda-128.webp 128w, assets/avatars/moneda-320.webp 320w"
     sizes="(max-width: 600px) 64px, 160px"
     width="160" height="160" alt="Moneda" loading="lazy" decoding="async">
```

- No llevar a despliegue los PNG de 1248 px ni usar PNG full en cada selector.
- Evitar carga de todos los 320px: una imagen visible en perfil; selector lazy y sin precargas masivas.
- No crear registros de perfiles, persistencia ni selección sin revisar arquitectura y pruebas de integración.
- No publicar en main hasta validar las imágenes y UI en rama.
