-- Ajuste de compatibilidad para revisiones posteriores al respaldo inicial.
-- No toca filas de usuarios. Conserva estructura, formato y límite de 1 MB.
-- El CHECK de fase 1 exigía revision = 1, válido para primera carga pero
-- incompatible con el compare-and-swap del módulo de sincronización.
ALTER TABLE public.player_snapshots
  DROP CONSTRAINT player_snapshots_backup_format_v2;

ALTER TABLE public.player_snapshots
  ADD CONSTRAINT player_snapshots_backup_format_v2
  CHECK (
    game_format = 2
    AND revision >= 1
    AND state @> '{"app":"insertcoinmx-album","format":2}'::jsonb
    AND jsonb_typeof(state->'data') = 'object'
    AND jsonb_typeof(state->'data'->'have') = 'object'
    AND jsonb_typeof(state->'data'->'rate') = 'object'
    AND (NOT (state ? 'ext') OR jsonb_typeof(state->'ext') = 'object')
    AND octet_length(state::text) <= 1048576
  );
