-- Endurecimiento progresivo del formato de snapshots del laboratorio.
-- Conserva Auth, CAS, lista de laboratorio, y política de primer respaldo.
-- No modifica ninguna cuenta, carta ni snapshot al instalarse.
-- Aún requiere emisión de cartas/verificación de eventos en servidor para uso público.
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

  -- Rechazar nombres de objeto peligrosos en cualquier profundidad. La
  -- validación original del importador de navegador los rechaza también.
  IF p_state @? '$.**."__proto__"'
     OR p_state @? '$.**."constructor"'
     OR p_state @? '$.**."prototype"' THEN
    RAISE EXCEPTION 'Respaldo con claves inseguras'
      USING ERRCODE='22023';
  END IF;

  -- Las cuotas, IDs de sobres y cantidades deben tener el mismo formato que
  -- el juego. Aún NO prueba origen legítimo de cada carta: solo forma.
  IF p_state->'data' ? 'welcomeLeft'
     AND (p_state->'data'->'welcomeLeft')::text !~ '^[0-5]
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
 THEN
    RAISE EXCEPTION 'Cuota de bienvenida inválida'
      USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'freeUsed'
     AND (p_state->'data'->'freeUsed')::text !~ '^[0-2]
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
 THEN
    RAISE EXCEPTION 'Cuota del ciclo inválida'
      USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'extra'
     AND (p_state->'data'->'extra')::text !~ '^(0|[1-9][0-9]{0,2})
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
 THEN
    RAISE EXCEPTION 'Sobres extra inválidos'
      USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'freeCycle'
     AND (p_state->'data'->'freeCycle')::text !~ '^(0|[1-9][0-9]{0,8})
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
 THEN
    RAISE EXCEPTION 'Ciclo de sobres inválido'
      USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'test'
     AND p_state->'data'->'test' <> '0'::jsonb THEN
    RAISE EXCEPTION 'El modo de prueba no se puede sincronizar'
      USING ERRCODE='22023';
  END IF;
  IF p_state->'data' ? 'pk' THEN
    IF pg_catalog.jsonb_typeof(p_state->'data'->'pk') <> 'array' THEN
      RAISE EXCEPTION 'Historial de sobres no válido'
        USING ERRCODE='22023';
    END IF;
    IF pg_catalog.jsonb_array_length(p_state->'data'->'pk') > 30
       OR EXISTS(
         SELECT 1 FROM pg_catalog.jsonb_array_elements(p_state->'data'->'pk') AS e(v)
         WHERE pg_catalog.jsonb_typeof(v) <> 'string'
            OR (v #>> '{}') !~ '^[a-z0-9]{6,24}
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

       ) OR EXISTS(
         SELECT 1 FROM (
           SELECT v, count(*) AS n
           FROM pg_catalog.jsonb_array_elements_text(p_state->'data'->'pk') AS t(v)
           GROUP BY v HAVING count(*) > 1
         ) AS duplicated
       ) THEN
      RAISE EXCEPTION 'Historial de sobres duplicado o inválido'
        USING ERRCODE='22023';
    END IF;
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

REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_snapshot(bigint,jsonb) TO authenticated;
