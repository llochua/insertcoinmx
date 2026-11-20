-- Insert Coin MX · canjear 5 repetidas por un sobre extra (laboratorio).
-- Se comparte la misma cuenta, snapshot y CAS transaccional de issue_player_pack.
-- No permite entregar menos de una copia de cualquier carta.
CREATE TABLE IF NOT EXISTS private_sync.pack_exchanges (
 user_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 snapshot_revision bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
ALTER TABLE private_sync.pack_exchanges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.pack_exchanges FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.exchange_duplicate_cards(
 p_request_id uuid,
 p_expected_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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
 IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
  RAISE EXCEPTION 'Sesión confirmada necesaria' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id=v_uid) THEN
  RAISE EXCEPTION 'Solo disponible en laboratorio' USING ERRCODE='42501';
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
REVOKE ALL ON FUNCTION public.exchange_duplicate_cards(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.exchange_duplicate_cards(uuid,bigint) TO authenticated;
