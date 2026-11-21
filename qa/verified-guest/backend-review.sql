-- BORRADOR DE MIGRACIÓN: ejecutar solo en entorno desechable de QA.
-- El interruptor verified_guest permanece apagado. No habilitar Auth anónimo
-- en producción hasta configurar protección antibots y validar conversión de identidad.
-- Las cuatro RPC conservan el motor, CAS, idempotencia, cuotas y restricciones de economía existentes.
BEGIN;
-- La restricción anterior solo admitía public_beta. Ampliar explícitamente,
-- sin cambiar ni reiniciar el estado de la compuerta ya existente.
ALTER TABLE private_sync.beta_access_gate DROP CONSTRAINT beta_access_gate_key_check;
ALTER TABLE private_sync.beta_access_gate ADD CONSTRAINT beta_access_gate_key_check
 CHECK (key IN ('public_beta','verified_guest'));
INSERT INTO private_sync.beta_access_gate(key,enabled)
VALUES ('verified_guest',false) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION private_sync.can_access_game(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
 SELECT p_user_id IS NOT NULL AND p_user_id=auth.uid() AND (
   private_sync.can_access_beta(p_user_id)
   OR (
     coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
     AND EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id AND is_anonymous IS TRUE)
     AND EXISTS (SELECT 1 FROM private_sync.beta_access_gate WHERE key='public_beta' AND enabled)
     AND EXISTS (SELECT 1 FROM private_sync.beta_access_gate WHERE key='verified_guest' AND enabled)
   )
 );
$$;
REVOKE ALL ON FUNCTION private_sync.can_access_game(uuid) FROM PUBLIC, anon, authenticated;

-- El invitado solo tiene acceso a SU snapshot; no publica perfil.
-- Las políticas restrictivas se combinan con las de propiedad existentes.
CREATE POLICY verified_guest_no_profile_insert ON public.player_profiles
 AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
CREATE POLICY verified_guest_no_profile_update ON public.player_profiles
 AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
 WITH CHECK (NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
CREATE OR REPLACE FUNCTION public.ensure_player_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_state jsonb;
  v_revision bigint;
  v_created boolean := false;
BEGIN
  IF NOT private_sync.can_access_game(v_uid) THEN
    RAISE EXCEPTION 'Sesión de juego no autorizada' USING ERRCODE='42501';
  END IF;
  -- can_access_game comprueba el estado real de Auth y el acceso habilitado.

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
$function$;

CREATE OR REPLACE FUNCTION public.exchange_duplicate_cards(p_request_id uuid, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_state jsonb;
 v_data jsonb;
 v_have jsonb;
 v_rev bigint;
 v_extra integer;
 v_need integer:=5;
 v_qty integer;
 v_take integer;
 v_key text;
BEGIN
 IF NOT private_sync.can_access_game(v_uid) THEN
    RAISE EXCEPTION 'Sesión de juego no autorizada' USING ERRCODE='42501';
  END IF;
 IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<1 THEN
  RAISE EXCEPTION 'Solicitud inválida' USING ERRCODE='22023';
 END IF;
 SELECT state,revision INTO v_state,v_rev FROM public.player_snapshots
  WHERE user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('status','no_snapshot');
 END IF;
 IF EXISTS(SELECT 1 FROM private_sync.pack_exchanges
  WHERE user_id=v_uid AND request_id=p_request_id) THEN
  RETURN pg_catalog.jsonb_build_object('status','duplicate','state',v_state,'revision',v_rev);
 END IF;
 IF v_rev<>p_expected_revision THEN
  RETURN pg_catalog.jsonb_build_object('status','conflict','revision',v_rev);
 END IF;
 v_data:=v_state->'data';
 v_have:=v_data->'have';
 IF pg_catalog.jsonb_typeof(v_have)<>'object'
   OR v_data->>'test' IS DISTINCT FROM '0' THEN
  RAISE EXCEPTION 'Progreso no compatible' USING ERRCODE='22023';
 END IF;
 v_extra:=COALESCE((v_data->>'extra')::integer,0);
 IF v_extra>=999 THEN
  RETURN pg_catalog.jsonb_build_object('status','extra_limit','revision',v_rev);
 END IF;
 FOR v_key,v_qty IN SELECT key,value::integer FROM pg_catalog.jsonb_each_text(v_have)
  ORDER BY key LOOP
   v_take:=LEAST(v_need,GREATEST(v_qty-1,0));
   IF v_take>0 THEN
    v_have:=pg_catalog.jsonb_set(v_have,ARRAY[v_key],pg_catalog.to_jsonb(v_qty-v_take));
    v_need:=v_need-v_take;
   END IF;
   EXIT WHEN v_need=0;
 END LOOP;
 IF v_need>0 THEN
  RETURN pg_catalog.jsonb_build_object('status','not_enough_duplicates','revision',v_rev);
 END IF;
 v_data:=pg_catalog.jsonb_set(v_data,'{have}',v_have);
 v_data:=pg_catalog.jsonb_set(v_data,'{extra}',pg_catalog.to_jsonb(v_extra+1),true);
 v_state:=pg_catalog.jsonb_set(v_state,'{data}',v_data);
 UPDATE public.player_snapshots SET state=v_state,revision=revision+1,
  updated_at=pg_catalog.now() WHERE user_id=v_uid RETURNING revision INTO v_rev;
 INSERT INTO private_sync.pack_exchanges(user_id,request_id,snapshot_revision)
  VALUES(v_uid,p_request_id,v_rev);
 RETURN pg_catalog.jsonb_build_object('status','exchanged',
  'state',v_state,'revision',v_rev);
END
$function$;

CREATE OR REPLACE FUNCTION public.issue_player_pack(p_request_id uuid, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_state jsonb;
  v_data jsonb;
  v_have jsonb;
  v_pk jsonb;
  v_cards jsonb := '[]'::jsonb;
  v_rev bigint;
  v_previous private_sync.pack_issues%ROWTYPE;
  v_kind text;
  v_card text;
  v_variant text;
  v_id text;
  v_today text;
  v_cycle bigint;
  v_last_cycle bigint;
  v_welcome integer;
  v_free_used integer;
  v_extra integer;
  v_first boolean;
  v_roll double precision;
  v_count integer;
  v_i integer;
BEGIN
  IF NOT private_sync.can_access_game(v_uid) THEN
    RAISE EXCEPTION 'Sesión de juego no autorizada' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_expected_revision IS NULL
     OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023';
  END IF;

  -- Bloqueo por usuario: el segundo dispositivo espera, luego observa
  -- la nueva revisión y no consume otra cuota con un estado obsoleto.
  SELECT state,revision INTO v_state,v_rev
    FROM public.player_snapshots WHERE user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status','no_snapshot');
  END IF;

  -- La misma solicitud conserva siempre las mismas cinco cartas.
  -- También es seguro reintentar después de perder la respuesta HTTP.
  SELECT * INTO v_previous FROM private_sync.pack_issues
    WHERE user_id=v_uid AND request_id=p_request_id;
  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status','duplicate',
      'pack_id',v_previous.pack_id,
      'kind',v_previous.kind,
      'cards',v_previous.cards,
      'revision',v_rev,
      'state',v_state
    );
  END IF;

  IF v_rev <> p_expected_revision THEN
    RETURN pg_catalog.jsonb_build_object('status','conflict','revision',v_rev);
  END IF;
  IF v_state->>'app' IS DISTINCT FROM 'insertcoinmx-album'
    OR v_state->>'format' IS DISTINCT FROM '2'
    OR pg_catalog.jsonb_typeof(v_state->'data'->'have') <> 'object'
    OR pg_catalog.jsonb_typeof(v_state->'data'->'rate') <> 'object'
    OR COALESCE(v_state->'data'->>'test','0') <> '0' THEN
    RAISE EXCEPTION 'Snapshot no compatible' USING ERRCODE='22023';
  END IF;

  v_data := v_state->'data';
  v_have := v_data->'have';
  v_pk := COALESCE(v_data->'pk','[]'::jsonb);
  IF pg_catalog.jsonb_typeof(v_pk) <> 'array' THEN
    RAISE EXCEPTION 'Historial inválido' USING ERRCODE='22023';
  END IF;
  v_cycle := pg_catalog.floor(extract(epoch FROM pg_catalog.now()) / 21600)::bigint;
  v_today := pg_catalog.to_char(pg_catalog.timezone('America/Monterrey', pg_catalog.now()),'YYYY-MM-DD');
  v_last_cycle := COALESCE((v_data->>'freeCycle')::bigint,-1);
  v_welcome := COALESCE((v_data->>'welcomeLeft')::integer,
    CASE WHEN v_have='{}'::jsonb AND v_pk='[]'::jsonb THEN 5 ELSE 0 END);
  v_free_used := COALESCE((v_data->>'freeUsed')::integer,0);
  v_extra := COALESCE((v_data->>'extra')::integer,0);
  IF v_welcome NOT BETWEEN 0 AND 5
     OR v_free_used NOT BETWEEN 0 AND 2
     OR v_extra NOT BETWEEN 0 AND 999 THEN
    RAISE EXCEPTION 'Cuota inválida' USING ERRCODE='22023';
  END IF;

  v_first := COALESCE(v_data->>'fg','0') <> '1'
    AND v_have='{}'::jsonb
    AND v_pk='[]'::jsonb
    AND COALESCE(v_data->>'last','')='';

  IF v_welcome>0 THEN
    v_kind:='welcome';
  ELSIF v_last_cycle<v_cycle OR (v_last_cycle=v_cycle AND v_free_used<2) THEN
    v_kind:='daily';
  ELSIF v_extra>0 THEN
    v_kind:='extra';
  ELSE
    RETURN pg_catalog.jsonb_build_object(
      'status','no_packs','revision',v_rev,'state',v_state);
  END IF;

  -- 3 Base, 4º Base en 70% / especial 30%, 5º especial.
  -- Probabilidad de especiales: Holo 17 / Dorada 6.6 / Full 2.4.
  -- En el primer sobre de un jugador nuevo, el 5º es Full.
  FOR v_i IN 1..5 LOOP
    IF v_i<=3 OR (v_i=4 AND pg_catalog.random()>=0.30) THEN
      v_variant:='b';
    ELSIF v_i=5 AND v_first THEN
      v_variant:='f';
    ELSE
      v_roll := pg_catalog.random() * 26;
      v_variant := CASE WHEN v_roll<17 THEN 'e'
                        WHEN v_roll<23.6 THEN 'r'
                        ELSE 'f' END;
    END IF;
    SELECT card_key INTO v_card FROM private_sync.pack_pool
      WHERE variant=v_variant
      ORDER BY pg_catalog.random() LIMIT 1;
    IF v_card IS NULL THEN
      RAISE EXCEPTION 'Pool incompleto: %',v_variant USING ERRCODE='22023';
    END IF;
    v_count := COALESCE((v_have->>v_card)::integer,0)+1;
    IF v_count>9999 THEN
      RAISE EXCEPTION 'Cantidad de carta fuera de rango' USING ERRCODE='22023';
    END IF;
    v_have := pg_catalog.jsonb_set(v_have,ARRAY[v_card],pg_catalog.to_jsonb(v_count),true);
    v_cards := v_cards || pg_catalog.jsonb_build_array(v_card);
  END LOOP;

  v_id := pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),1,16);
  v_pk := v_pk || pg_catalog.jsonb_build_array(v_id);
  IF pg_catalog.jsonb_array_length(v_pk)>30 THEN
    SELECT pg_catalog.jsonb_agg(value ORDER BY ordinality) INTO v_pk
      FROM pg_catalog.jsonb_array_elements(v_pk) WITH ORDINALITY AS t(value,ordinality)
      WHERE ordinality > pg_catalog.jsonb_array_length(v_pk)-30;
  END IF;

  v_data := pg_catalog.jsonb_set(v_data,'{have}',v_have,true);
  v_data := pg_catalog.jsonb_set(v_data,'{pk}',v_pk,true);
  v_data := pg_catalog.jsonb_set(v_data,'{fg}','1'::jsonb,true);
  v_data := pg_catalog.jsonb_set(v_data,'{last}',pg_catalog.to_jsonb(v_today),true);
  IF v_kind='welcome' THEN
    v_welcome:=v_welcome-1;
    v_data:=pg_catalog.jsonb_set(v_data,'{welcomeLeft}',pg_catalog.to_jsonb(v_welcome),true);
    IF v_welcome=0 THEN
      -- La última bienvenida cierra el cupo del ciclo actual.
      v_data:=pg_catalog.jsonb_set(v_data,'{freeDay}',pg_catalog.to_jsonb(v_today),true);
      v_data:=pg_catalog.jsonb_set(v_data,'{freeCycle}',pg_catalog.to_jsonb(v_cycle),true);
      v_data:=pg_catalog.jsonb_set(v_data,'{freeUsed}','2'::jsonb,true);
    END IF;
  ELSIF v_kind='daily' THEN
    v_data:=pg_catalog.jsonb_set(v_data,'{freeCycle}',pg_catalog.to_jsonb(v_cycle),true);
    v_data:=pg_catalog.jsonb_set(v_data,'{freeUsed}',
      pg_catalog.to_jsonb(CASE WHEN v_last_cycle=v_cycle THEN v_free_used+1 ELSE 1 END),true);
    v_data:=pg_catalog.jsonb_set(v_data,'{freeDay}',pg_catalog.to_jsonb(v_today),true);
  ELSE
    v_data:=pg_catalog.jsonb_set(v_data,'{extra}',pg_catalog.to_jsonb(v_extra-1),true);
  END IF;
  v_state:=pg_catalog.jsonb_set(v_state,'{data}',v_data,true);

  UPDATE public.player_snapshots
     SET state=v_state,revision=revision+1,updated_at=pg_catalog.now()
   WHERE user_id=v_uid RETURNING revision INTO v_rev;
  INSERT INTO private_sync.pack_issues(user_id,request_id,pack_id,cards,kind,snapshot_revision)
    VALUES(v_uid,p_request_id,v_id,v_cards,v_kind,v_rev);
  RETURN pg_catalog.jsonb_build_object(
    'status','issued','pack_id',v_id,'kind',v_kind,
    'cards',v_cards,'revision',v_rev,'state',v_state
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.sync_player_snapshot(p_expected_revision bigint, p_state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision bigint;
  v_prior_state jsonb;
BEGIN
  IF NOT private_sync.can_access_game(v_user_id) THEN
    RAISE EXCEPTION 'Sesión de juego no autorizada' USING ERRCODE='42501';
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
-- No se otorga ejecución a una solicitud sin usuario Auth.
REVOKE ALL ON FUNCTION public.ensure_player_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_player_snapshot() TO authenticated;
REVOKE ALL ON FUNCTION public.issue_player_pack(uuid,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_player_pack(uuid,bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.exchange_duplicate_cards(uuid,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exchange_duplicate_cards(uuid,bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_player_snapshot(bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_player_snapshot(bigint,jsonb) TO authenticated;
COMMIT;
