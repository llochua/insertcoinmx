-- Seguridad: deshabilitar la creación mediante RPC de respaldo genérico.
-- Las colecciones nuevas se inicializan exclusivamente con ensure_player_snapshot.
-- No modifica registros existentes.
-- Guardas de laboratorio, no reescribe filas ni amplía permisos
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
  v_prior_state jsonb;
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
  -- No aceptar el alta con un respaldo suministrado por el cliente.
  -- Solo ensure_player_snapshot() crea colecciones iniciales sin cartas.
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'Alta inicial solo mediante ensure_player_snapshot'
      USING ERRCODE='42501';
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


  -- Rechazar claves maliciosas recursivamente y cuotas inconsistentes.
  IF p_state @? '$.**."__proto__"'
    OR p_state @? '$.**."constructor"'
    OR p_state @? '$.**."prototype"' THEN
    RAISE EXCEPTION 'Clave JSON insegura' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'welcomeLeft'
     AND (p_state->'data'->'welcomeLeft')::text !~ '^[0-5]$' THEN
    RAISE EXCEPTION 'Cuota de bienvenida inválida' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'freeUsed'
     AND (p_state->'data'->'freeUsed')::text !~ '^[0-2]$' THEN
    RAISE EXCEPTION 'Cuota diaria inválida' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'extra'
     AND (p_state->'data'->'extra')::text !~ '^(0|[1-9][0-9]{0,2})$' THEN
    RAISE EXCEPTION 'Sobres extra inválidos' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'freeCycle'
     AND (p_state->'data'->'freeCycle')::text !~ '^(0|[1-9][0-9]{0,8})$' THEN
    RAISE EXCEPTION 'Ciclo inválido' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'test'
     AND p_state->'data'->'test' <> '0'::jsonb THEN
    RAISE EXCEPTION 'Modo de prueba no sincronizable' USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'pk' THEN
    IF pg_catalog.jsonb_typeof(p_state->'data'->'pk') <> 'array' THEN
      RAISE EXCEPTION 'Historial de sobres inválido' USING ERRCODE='22023';
    END IF;
    IF pg_catalog.jsonb_array_length(p_state->'data'->'pk') > 30
      OR EXISTS(
        SELECT 1 FROM pg_catalog.jsonb_array_elements(p_state->'data'->'pk') AS e(v)
        WHERE pg_catalog.jsonb_typeof(v) <> 'string'
           OR (v #>> '{}') !~ '^[a-z0-9]{6,24}$'
      ) OR EXISTS(
        SELECT 1 FROM pg_catalog.jsonb_array_elements_text(p_state->'data'->'pk') AS p(id)
        GROUP BY p.id HAVING count(*) > 1
      ) THEN
      RAISE EXCEPTION 'Sobres duplicados o malformados' USING ERRCODE='22023';
    END IF;
  END IF;

  -- Impedir que el antiguo respaldo CAS se convierta en un endpoint para
  -- fabricarse cartas, sobres, cuotas o canjes. Solo issue_player_pack y
  -- exchange_duplicate_cards podrán escribir estos campos del snapshot.
  IF p_expected_revision > 0 THEN
    SELECT state INTO v_prior_state FROM public.player_snapshots
     WHERE user_id=v_user_id FOR UPDATE;
    IF v_prior_state IS NOT NULL AND (
      p_state->'data'->'have' IS DISTINCT FROM v_prior_state->'data'->'have'
      OR p_state->'data'->'pk' IS DISTINCT FROM v_prior_state->'data'->'pk'
      OR p_state->'data'->'fg' IS DISTINCT FROM v_prior_state->'data'->'fg'
      OR p_state->'data'->'last' IS DISTINCT FROM v_prior_state->'data'->'last'
      OR p_state->'data'->'extra' IS DISTINCT FROM v_prior_state->'data'->'extra'
      OR p_state->'data'->'welcomeLeft' IS DISTINCT FROM v_prior_state->'data'->'welcomeLeft'
      OR p_state->'data'->'freeDay' IS DISTINCT FROM v_prior_state->'data'->'freeDay'
      OR p_state->'data'->'freeUsed' IS DISTINCT FROM v_prior_state->'data'->'freeUsed'
      OR p_state->'data'->'freeCycle' IS DISTINCT FROM v_prior_state->'data'->'freeCycle'
      OR p_state->'data'->'test' IS DISTINCT FROM v_prior_state->'data'->'test'
      OR p_state->'ext' IS DISTINCT FROM v_prior_state->'ext'
    ) THEN
      RAISE EXCEPTION 'Cartas y cuotas son controladas por el servidor'
        USING ERRCODE='42501';
    END IF;
  END IF;

  -- Solamente se actualizan snapshots existentes, nunca se insertan.
  UPDATE public.player_snapshots
     SET state=p_state, revision=revision+1, updated_at=pg_catalog.now()
   WHERE user_id=v_user_id AND revision=p_expected_revision
  RETURNING revision INTO v_revision;
  IF v_revision IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object('status','updated','revision',v_revision);
  END IF;

  SELECT revision INTO v_revision FROM public.player_snapshots
   WHERE user_id=v_user_id;
  RETURN pg_catalog.jsonb_build_object('status','conflict','revision',v_revision);
END
$function$;

REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_snapshot(bigint,jsonb) TO authenticated;
