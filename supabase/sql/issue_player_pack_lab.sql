-- Insert Coin MX · emisión AUTORITATIVA de sobres (laboratorio).
-- Todas las escrituras de usuario son transaccionales y por auth.uid().
-- Se requiere el respaldo inicial ya verificado. No agrega ni elimina usuarios.
-- Requiere server_pack_pool.sql previamente aplicado.

CREATE TABLE IF NOT EXISTS private_sync.pack_issues (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid NOT NULL,
  pack_id text NOT NULL,
  cards jsonb NOT NULL,
  kind text NOT NULL CHECK (kind IN ('welcome','daily','extra')),
  snapshot_revision bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,request_id),
  UNIQUE (user_id,pack_id),
  CONSTRAINT pack_issues_five_cards CHECK (
    jsonb_typeof(cards)='array' AND jsonb_array_length(cards)=5
  )
);
REVOKE ALL ON private_sync.pack_issues FROM PUBLIC,anon,authenticated;
ALTER TABLE private_sync.pack_issues ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.issue_player_pack(
  p_request_id uuid,
  p_expected_revision bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  IF v_uid IS NULL
     OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'Se requiere sesión confirmada' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id=v_uid) THEN
    RAISE EXCEPTION 'Función disponible solo en laboratorio' USING ERRCODE='42501';
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
  v_cycle := pg_catalog.floor(pg_catalog.extract(epoch FROM pg_catalog.now()) / 21600)::bigint;
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
  ELSIF v_last_cycle<>v_cycle OR v_free_used<2 THEN
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

REVOKE ALL ON FUNCTION public.issue_player_pack(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_player_pack(uuid,bigint) TO authenticated;
