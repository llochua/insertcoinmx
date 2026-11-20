-- Importación única de progreso invitado, con consentimiento implícito al vincular
-- la cuenta durante la beta. Nunca reemplaza una colección que ya jugó en nube.
-- Primera etapa restringida al laboratorio; migración pública separada.
CREATE OR REPLACE FUNCTION public.import_guest_collection(p_state jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_old jsonb;
 v_revision bigint;
 v_new_revision bigint;
BEGIN
 IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
   OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_uid AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Se requiere cuenta con correo confirmado' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id=v_uid) THEN
  RAISE EXCEPTION 'Importación disponible solo en laboratorio' USING ERRCODE='42501';
 END IF;
 IF p_state IS NULL OR pg_catalog.jsonb_typeof(p_state)<>'object'
   OR p_state->>'app' IS DISTINCT FROM 'insertcoinmx-album'
   OR p_state->>'format' IS DISTINCT FROM '2'
   OR pg_catalog.jsonb_typeof(p_state->'data')<>'object'
   OR pg_catalog.jsonb_typeof(p_state->'data'->'have')<>'object'
   OR pg_catalog.jsonb_typeof(p_state->'data'->'rate')<>'object'
   OR (p_state ? 'ext' AND pg_catalog.jsonb_typeof(p_state->'ext')<>'object')
   OR pg_catalog.octet_length(p_state::text)>1048576 THEN
  RAISE EXCEPTION 'Colección incompatible' USING ERRCODE='22023';
 END IF;
 IF EXISTS(
  SELECT 1 FROM pg_catalog.jsonb_each(p_state->'data'->'have') AS c(k,v)
  WHERE k !~ '^[a-z0-9]{1,40}_[berf]$'
    OR v::text !~ '^[1-9][0-9]{0,3}$'
 ) OR EXISTS(
  SELECT 1 FROM pg_catalog.jsonb_each(p_state->'data'->'rate') AS r(k,v)
  WHERE k !~ '^[a-z0-9]{1,40}$'
    OR v::text !~ '^[0-3]$'
 ) OR COALESCE((p_state->'data'->>'test')::text,'0') <> '0' THEN
  RAISE EXCEPTION 'Cartas o calificaciones incompatibles' USING ERRCODE='22023';
 END IF;
 IF (p_state->'data' ? 'pk' AND (
   pg_catalog.jsonb_typeof(p_state->'data'->'pk')<>'array'
   OR pg_catalog.jsonb_array_length(p_state->'data'->'pk')>30
 )) OR (p_state->'data' ? 'welcomeLeft' AND (p_state->'data'->>'welcomeLeft') !~ '^[0-5]$')
    OR (p_state->'data' ? 'freeUsed' AND (p_state->'data'->>'freeUsed') !~ '^[0-2]$')
    OR (p_state->'data' ? 'extra' AND (p_state->'data'->>'extra') !~ '^(0|[1-9][0-9]{0,2})$') THEN
  RAISE EXCEPTION 'Cuotas incompatibles' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM pg_catalog.jsonb_each(p_state->'data'->'have'))>2000 THEN
  RAISE EXCEPTION 'Demasiadas variantes' USING ERRCODE='22023';
 END IF;

 SELECT state,revision INTO v_old,v_revision
 FROM public.player_snapshots WHERE user_id=v_uid FOR UPDATE;
 IF FOUND THEN
  -- Cuenta inicializada pero sin ninguna jugada: la colección invitada puede
  -- sustituir SOLO esa ficha vacía. Si hubo actividad real, conflicto.
  IF v_revision=1
    AND v_old->'data'->'have'='{}'::jsonb
    AND v_old->'data'->'rate'='{}'::jsonb
    AND v_old->'data'->'pk'='[]'::jsonb
    AND v_old->'data'->>'welcomeLeft'='5'
    AND v_old->'data'->>'fg'='0'
    AND NOT EXISTS(SELECT 1 FROM private_sync.pack_issues WHERE user_id=v_uid)
    AND NOT EXISTS(SELECT 1 FROM private_sync.pack_exchanges WHERE user_id=v_uid) THEN
   UPDATE public.player_snapshots
     SET state=p_state,revision=revision+1,updated_at=pg_catalog.now()
    WHERE user_id=v_uid AND revision=v_revision
    RETURNING revision INTO v_new_revision;
   RETURN pg_catalog.jsonb_build_object('status','imported','state',p_state,'revision',v_new_revision);
  END IF;
  RETURN pg_catalog.jsonb_build_object('status','conflict','state',v_old,'revision',v_revision);
 END IF;
 INSERT INTO public.player_snapshots(user_id,game_format,revision,state)
 VALUES(v_uid,2,1,p_state) ON CONFLICT (user_id) DO NOTHING
 RETURNING revision INTO v_new_revision;
 IF v_new_revision IS NOT NULL THEN
  RETURN pg_catalog.jsonb_build_object('status','imported','state',p_state,'revision',v_new_revision);
 END IF;
 SELECT state,revision INTO v_old,v_revision FROM public.player_snapshots WHERE user_id=v_uid;
 RETURN pg_catalog.jsonb_build_object('status','conflict','state',v_old,'revision',v_revision);
END
$function$;

REVOKE ALL ON FUNCTION public.import_guest_collection(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_guest_collection(jsonb) TO authenticated;
