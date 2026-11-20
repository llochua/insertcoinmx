-- Restricción temporal: la RPC de snapshots aún no autentica el origen
-- de los sobres individualmente, así que NO se habilita a cualquier jugador.
-- Se autoriza exclusivamente la cuenta que ya tenía un respaldo de prueba.
-- No borra ni modifica cuentas, colecciones o snapshots existentes.
CREATE SCHEMA IF NOT EXISTS private_sync;
REVOKE ALL ON SCHEMA private_sync FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private_sync.sync_lab_allowlist (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE private_sync.sync_lab_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.sync_lab_allowlist FROM PUBLIC,anon,authenticated;
INSERT INTO private_sync.sync_lab_allowlist(user_id)
 SELECT user_id FROM public.player_snapshots
 ON CONFLICT DO NOTHING;

-- Insert Coin MX · CAS para player_snapshots
-- Aditivo: no modifica ninguna cuenta, colección, snapshot ni política existente.
-- No otorga UPDATE directo a los navegadores; cualquier actualización pasa
-- por este punto transaccional verificando auth.uid() y revisión esperada.
CREATE OR REPLACE FUNCTION public.sync_player_snapshot(
  p_expected_revision bigint,
  p_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision bigint;
BEGIN
  IF v_user_id IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'Se requiere una sesión confirmada'
      USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Sincronización disponible solo en cuentas de laboratorio'
      USING ERRCODE='42501';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'Revisión inválida' USING ERRCODE='22023';
  END IF;
  IF p_state IS NULL OR pg_catalog.jsonb_typeof(p_state) <> 'object'
     OR p_state->>'app' IS DISTINCT FROM 'insertcoinmx-album'
     OR p_state->>'format' IS DISTINCT FROM '2'
     OR pg_catalog.jsonb_typeof(p_state->'data') <> 'object'
     OR pg_catalog.jsonb_typeof(p_state->'data'->'have') <> 'object'
     OR pg_catalog.jsonb_typeof(p_state->'data'->'rate') <> 'object'
     OR (p_state ? 'ext' AND pg_catalog.jsonb_typeof(p_state->'ext') <> 'object')
     OR pg_catalog.octet_length(p_state::text) > 1048576 THEN
    RAISE EXCEPTION 'Respaldo incompatible' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(p_state->'data'->'have') AS c(k,v)
    WHERE k !~ '^[a-z0-9]{1,40}_[berf]$'
       OR pg_catalog.jsonb_typeof(v) <> 'number'
       OR v::text !~ '^[1-9][0-9]{0,3}$'
       OR (v::text)::integer > 9999
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(p_state->'data'->'rate') AS r(k,v)
    WHERE k !~ '^[a-z0-9]{1,40}$'
       OR v::text !~ '^[0-3]$'
  ) THEN
    RAISE EXCEPTION 'Cartas o calificaciones inválidas' USING ERRCODE='22023';
  END IF;

  IF p_expected_revision = 0 THEN
    INSERT INTO public.player_snapshots(user_id,game_format,state,revision)
    VALUES(v_user_id,2,p_state,1)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING revision INTO v_revision;
    IF v_revision IS NOT NULL THEN
      RETURN pg_catalog.jsonb_build_object('status','created','revision',v_revision);
    END IF;
  ELSE
    UPDATE public.player_snapshots
      SET state=p_state,revision=revision+1,updated_at=pg_catalog.now()
      WHERE user_id=v_user_id AND revision=p_expected_revision
    RETURNING revision INTO v_revision;
    IF v_revision IS NOT NULL THEN
      RETURN pg_catalog.jsonb_build_object('status','updated','revision',v_revision);
    END IF;
  END IF;

  SELECT revision INTO v_revision FROM public.player_snapshots
   WHERE user_id=v_user_id;
  RETURN pg_catalog.jsonb_build_object('status','conflict','revision',v_revision);
END
$function$;

REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_snapshot(bigint,jsonb) TO authenticated;
