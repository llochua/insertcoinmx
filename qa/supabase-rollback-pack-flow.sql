-- Insert Coin MX: pruebas SQL reales con usuarios EFÍMEROS y ROLLBACK.
-- Requiere entorno de QA con privilegios administrativos, NO ejecutar en
-- una sesión web de jugador. No crea usuarios duraderos, ni envía correos.
-- No toca ninguna cuenta o colección preexistente. Todas las escrituras son
-- transaccionales y se deshacen antes de terminar.
BEGIN;
DO $qa$
DECLARE
 v_a uuid := pg_catalog.gen_random_uuid();
 v_b uuid := pg_catalog.gen_random_uuid();
 v_request uuid := pg_catalog.gen_random_uuid();
 v_exchange_id uuid := pg_catalog.gen_random_uuid();
 v_created jsonb;
 v_issued jsonb;
 v_retry jsonb;
 v_conflict jsonb;
 v_meta jsonb;
 v_fake jsonb;
 v_extra_pack jsonb;
 v_other jsonb;
 v_exchange jsonb;
 v_exchange_retry jsonb;
 v_rev bigint;
 v_state jsonb;
 v_first_key text;
 v_quantity integer;
 v_total_before bigint;
 v_total_after bigint;
 v_missing integer;
 v_blocked boolean := false;
 v_packs integer := 1;
BEGIN
 -- Identidad A: Auth usa filas que existirán SOLO en esta transacción.
 INSERT INTO auth.users(
   id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at,
   raw_app_meta_data,raw_user_meta_data
 ) VALUES(
   v_a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'qa-txn-' || v_a::text || '@example.invalid',
   pg_catalog.now(),pg_catalog.now(),pg_catalog.now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb
 );
 INSERT INTO private_sync.sync_lab_allowlist(user_id) VALUES(v_a);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_a::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',
   pg_catalog.jsonb_build_object('sub',v_a,'role','authenticated','is_anonymous',false)::text,true);
 IF auth.uid() IS DISTINCT FROM v_a THEN
   RAISE EXCEPTION 'El JWT simulado no corresponde a usuario A';
 END IF;

 v_created:=public.ensure_player_snapshot();
 IF v_created->>'status'<>'created'
    OR (v_created->>'revision')::bigint<>1
    OR v_created->'state'->'data'->'have'<>'{}'::jsonb THEN
   RAISE EXCEPTION 'Fallo: alta limpia A: %',v_created->>'status';
 END IF;

 v_issued:=public.issue_player_pack(v_request,1);
 IF v_issued->>'status'<>'issued'
    OR v_issued->>'kind'<>'welcome'
    OR (v_issued->>'revision')::bigint<>2
    OR pg_catalog.jsonb_array_length(v_issued->'cards')<>5
    OR right(v_issued->'cards'->>4,2)<>'_f' THEN
   RAISE EXCEPTION 'Fallo: sobre de bienvenida con Full garantizada';
 END IF;
 SELECT count(*) INTO v_missing
 FROM pg_catalog.jsonb_array_elements_text(v_issued->'cards') AS c(k)
 LEFT JOIN private_sync.pack_pool p ON p.card_key=c.k
 WHERE p.card_key IS NULL;
 IF v_missing<>0 THEN RAISE EXCEPTION 'Fallo: carta fuera del catálogo del servidor'; END IF;
 SELECT coalesce(sum(value::integer),0) INTO v_total_before
 FROM pg_catalog.jsonb_each_text(v_issued->'state'->'data'->'have');
 IF v_total_before<>5 THEN RAISE EXCEPTION 'Fallo: inventario inicial distinto de cinco'; END IF;

 v_retry:=public.issue_player_pack(v_request,1);
 IF v_retry->>'status'<>'duplicate'
    OR v_retry->'cards' IS DISTINCT FROM v_issued->'cards'
    OR (SELECT count(*) FROM private_sync.pack_issues WHERE user_id=v_a)<>1 THEN
   RAISE EXCEPTION 'Fallo: solicitud repetida acuñó cartas de nuevo';
 END IF;
 v_conflict:=public.issue_player_pack(pg_catalog.gen_random_uuid(),1);
 IF v_conflict->>'status'<>'conflict' THEN
   RAISE EXCEPTION 'Fallo: no detecta revisión obsoleta';
 END IF;

 v_fake:=pg_catalog.jsonb_set(v_issued->'state','{data,have,forged_b}','1'::jsonb,true);
 BEGIN
   PERFORM public.sync_player_snapshot(2,v_fake);
 EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked:=true;
 END;
 IF NOT v_blocked THEN RAISE EXCEPTION 'ALERTA: el cliente puede inventar cartas'; END IF;

 v_meta:=public.sync_player_snapshot(2,
   pg_catalog.jsonb_set(v_issued->'state','{data,rate}','{"1up":1}'::jsonb,true));
 IF v_meta->>'status'<>'updated' OR (v_meta->>'revision')::bigint<>3 THEN
   RAISE EXCEPTION 'Fallo: guardado legítimo de metadatos';
 END IF;

 -- Consumir las cinco bienvenidas sin salir de esta transacción.
 LOOP
   SELECT state,revision INTO v_state,v_rev FROM public.player_snapshots WHERE user_id=v_a;
   EXIT WHEN (v_state->'data'->>'welcomeLeft')::integer=0;
   v_issued:=public.issue_player_pack(pg_catalog.gen_random_uuid(),v_rev);
   IF v_issued->>'status'<>'issued' OR v_issued->>'kind'<>'welcome' THEN
     RAISE EXCEPTION 'Fallo: secuencia de bienvenida';
   END IF;
   v_packs:=v_packs+1;
   IF v_packs>5 THEN RAISE EXCEPTION 'Fallo: excedió cinco bienvenidas'; END IF;
 END LOOP;
 IF v_packs<>5 THEN RAISE EXCEPTION 'Fallo: cupo de bienvenida'; END IF;
 SELECT state,revision INTO v_state,v_rev FROM public.player_snapshots WHERE user_id=v_a;
 IF (v_state->'data'->>'freeUsed')::integer<>2
    OR public.issue_player_pack(pg_catalog.gen_random_uuid(),v_rev)->>'status'<>'no_packs' THEN
   RAISE EXCEPTION 'Fallo: cuota de sobres gratis';
 END IF;

 -- Preparar SOLO en esta cuenta efímera cinco copias repetidas. El cliente
 -- NO tiene este privilegio; sirve para ejecutar el camino real de canje.
 SELECT key,value::integer INTO v_first_key,v_quantity
 FROM pg_catalog.jsonb_each_text(v_state->'data'->'have') ORDER BY key LIMIT 1;
 v_fake:=pg_catalog.jsonb_set(v_state,ARRAY['data','have',v_first_key],
   pg_catalog.to_jsonb(v_quantity+5),true);
 UPDATE public.player_snapshots
    SET state=v_fake,revision=revision+1
    WHERE user_id=v_a RETURNING revision INTO v_rev;
 SELECT coalesce(sum(value::integer),0) INTO v_total_before
 FROM pg_catalog.jsonb_each_text(v_fake->'data'->'have');
 v_exchange:=public.exchange_duplicate_cards(v_exchange_id,v_rev);
 IF v_exchange->>'status'<>'exchanged' THEN RAISE EXCEPTION 'Fallo: canje de repetidas'; END IF;
 SELECT coalesce(sum(value::integer),0) INTO v_total_after
 FROM pg_catalog.jsonb_each_text(v_exchange->'state'->'data'->'have');
 IF v_total_before-v_total_after<>5
    OR (v_exchange->'state'->'data'->>'extra')::integer<>1
    OR (v_exchange->'state'->'data'->'have'->>v_first_key)::integer<1 THEN
   RAISE EXCEPTION 'Fallo: canje no descontó cinco repetidas y mantuvo el original';
 END IF;
 v_exchange_retry:=public.exchange_duplicate_cards(v_exchange_id,v_rev);
 IF v_exchange_retry->>'status'<>'duplicate' THEN
   RAISE EXCEPTION 'Fallo: canje repetido no es idempotente';
 END IF;
 v_extra_pack:=public.issue_player_pack(pg_catalog.gen_random_uuid(),
   (v_exchange->>'revision')::bigint);
 IF v_extra_pack->>'status'<>'issued' OR v_extra_pack->>'kind'<>'extra'
    OR (v_extra_pack->'state'->'data'->>'extra')::integer<>0 THEN
   RAISE EXCEPTION 'Fallo: emisión del sobre extra por canje';
 END IF;
 SELECT state,revision INTO v_state,v_rev FROM public.player_snapshots WHERE user_id=v_a;

 -- Identidad B no hereda cartas de la cuenta A.
 INSERT INTO auth.users(
   id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at,
   raw_app_meta_data,raw_user_meta_data
 ) VALUES(
   v_b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'qa-txn-' || v_b::text || '@example.invalid',
   pg_catalog.now(),pg_catalog.now(),pg_catalog.now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb
 );
 INSERT INTO private_sync.sync_lab_allowlist(user_id) VALUES(v_b);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_b::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',
   pg_catalog.jsonb_build_object('sub',v_b,'role','authenticated','is_anonymous',false)::text,true);
 v_other:=public.ensure_player_snapshot();
 IF v_other->>'status'<>'created'
    OR v_other->'state'->'data'->'have'<>'{}'::jsonb THEN
   RAISE EXCEPTION 'Fallo: la cuenta B heredó cartas de A';
 END IF;
 IF (SELECT revision FROM public.player_snapshots WHERE user_id=v_a)<>v_rev
    OR (SELECT state FROM public.player_snapshots WHERE user_id=v_a) IS DISTINCT FROM v_state THEN
   RAISE EXCEPTION 'Fallo: la cuenta B modificó a la cuenta A';
 END IF;
 RAISE NOTICE 'QA SQL APROBADA: alta limpia, 5 bienvenidas, full, idempotencia, CAS, no mint, canje, extra, aislamiento';
END
$qa$;
-- No realizar COMMIT aquí, bajo ninguna circunstancia.
ROLLBACK;

-- Contadores de control POST ROLLBACK, sin exponer identidad ni inventario.
SELECT
 (SELECT count(*) FROM private_sync.pack_issues) AS issues_persisted,
 (SELECT count(*) FROM private_sync.pack_exchanges) AS exchanges_persisted,
 (SELECT count(*) FROM private_sync.sync_lab_allowlist) AS lab_accounts_persisted,
 (SELECT count(*) FROM public.player_snapshots) AS collections_persisted;
