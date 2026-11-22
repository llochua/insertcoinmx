# Registro de implementación — Fase 2A

**Fecha:** 22 de noviembre de 2026 · **Rama:** `docs/design-system-audit-2026-11-22` · **PR:** [#130](https://github.com/llochua/insertcoinmx/pull/130)

## Alcance entregado

1. `content/design-tokens.css`: tokens semánticos para color, radios, tipografía, espaciado, foco y alturas de controles.
2. `content/ui-components.css`: contrato visual opt-in para `.ic-button`, `.ic-field`, `.ic-segment` y `.ic-surface`.
3. `index.html`: clases semánticas incorporadas a instancias existentes sin cambiar `id`, funciones, formularios ni acciones.
4. Formularios de acceso y Perfil: los 6 campos de usuario/contraseña/identidad comparten base; el input file de respaldos queda separado.
5. Pestañas: Home, Álbum y Acceso comparten área táctil y foco; el Álbum ahora expresa `aria-pressed` al regenerar la selección.
6. Botones: Inicio, Abrir, Compartir Tier, Perfil, Avatar, Onboarding y diálogos llevan variante semántica; se conserva el render especial del juego.
7. Paneles del Perfil, cuenta y diálogo UX usan `.ic-surface` sin alterar gradientes o el arte.
8. `scripts/check-ui-components.mjs` y el workflow de `.github/workflows/ui-system-contract.yml` verifican el contrato en el PR.

## No se cambió

- Ninguna imagen, carta, sticker, emoji de reacción, rareza o valor comunitario.
- Ninguna lógica de Auth, Supabase, sincronización, punto, ranking, sobre o juego.
- Ningún selector basado en ID usado por el motor del juego.
- Ningún comportamiento de disabled, acciones de CTA o cuenta regresiva.

## Verificaciones estáticas previas al commit

- Reemplazos buscados por patrón exacto (30 categorías de modificación, incluidas las 6 entradas).
- Se comprobó la carga de CSS en orden tokens → iconografía → componentes.
- Los seis campos auth usan `ic-field`; importaciones de respaldo no.
- El Álbum incorpora `aria-pressed` en cada pestaña generada; Home y Auth conservan su actualización.
- Los módulos funcionales siguen referenciados.

## Pendiente para declarar concluida la Fase 2

- [ ] La comprobación CI del contrato de componentes debe reportar éxito después del último commit.
- [ ] Probar diseño renderizado en móviles de 320/360/390/430 px y escritorio.
- [ ] Comprobar que las pestañas de Home de 44 px no desplazan el CTA en pantallas de poca altura.
- [ ] Evaluar contraste real de texto/placeholder y foco en formularios.
- [ ] Revisar estados de error, teclado virtual, tabulación y envío de formularios.
- [ ] Consolidar el resto de botones/componente de tarjeta sin sobrescribir CSS existente.
- [ ] Continuar normalización gradual de `!important`, fuentes y radios en etapas posteriores.
- [ ] Aprobación visual antes de fusionar PR #130.

**Estado real:** Fase 2A implementada en rama, sujeta a validación visual. **No está en producción**.
