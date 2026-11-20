-- Inicio seguro de una colección para cuentas recién verificadas.
-- No recibe cartas ni estados del cliente. Nunca modifica un respaldo existente.
-- Restringida a las cuentas de laboratorio hasta aprobar el lanzamiento.
CREATE OR REPLACE FUNCTION public.ensure_player_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_state jsonb;
  v_revision bigint;
  v_created boolean := false;
BEGIN
  IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'Se requiere sesión confirmada'
      USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id=v_uid
  ) THEN
    RAISE EXCEPTION 'Alta de colección disponible solo en laboratorio'
      USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM auth.users
      WHERE id=v_uid AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'El correo debe estar confirmado'
      USING ERRCODE='42501';
  END IF;

  INSERT INTO public.player_snapshots(user_id,game_format,revision,state)
  VALUES(v_uid,2,1,pg_catalog.jsonb_build_object(
    'app','insertcoinmx-album','format',2,
    'data',pg_catalog.jsonb_build_object(
      'have','{}'::jsonb,
      'rate','{}'::jsonb,
      'pk','[]'::jsonb,
      'fg',0,
      'ini','',
      'seen',0,
      'last','',
      'extra',0,
      'test',0,
      'champ','',
      'welcomeLeft',5,
      'freeDay','',
      'freeUsed',0,
      'freeCycle',0,
      'rev',0,
      'sv',2,
      'mv',2
    )
  ))
  ON CONFLICT (user_id) DO NOTHING
  RETURNING state,revision INTO v_state,v_revision;
  v_created := FOUND;
  IF NOT v_created THEN
    SELECT state,revision INTO v_state,v_revision
      FROM public.player_snapshots WHERE user_id=v_uid;
  END IF;
  IF v_state IS NULL OR v_revision IS NULL THEN
    RAISE EXCEPTION 'No se pudo verificar la colección'
      USING ERRCODE='23514';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'status',CASE WHEN v_created THEN 'created' ELSE 'existing' END,
    'state',v_state,
    'revision',v_revision
  );
END
$fn$;

REVOKE ALL ON FUNCTION public.ensure_player_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_player_snapshot() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_player_snapshot() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_player_snapshot() TO authenticated;
