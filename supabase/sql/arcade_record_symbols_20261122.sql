-- Insert Coin MX · 2026-11-22
-- Permite códigos arcade seguros de tres caracteres: letras, números y símbolos ASCII seleccionados.
-- No modifica, reinicia ni elimina identidades o colecciones existentes.
BEGIN;

ALTER TABLE private_sync.guest_public_identities
 DROP CONSTRAINT guest_public_identities_ini_check;
ALTER TABLE private_sync.guest_public_identities
 ADD CONSTRAINT guest_public_identities_ini_check
 CHECK (ini ~ '^[A-Z0-9!?*+.@#$%-]{3}$');

CREATE OR REPLACE FUNCTION public.icmx_player_leaderboards()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_metric text;
 v_rows jsonb;
 v_result jsonb := '{}'::jsonb;
BEGIN
 FOR v_metric IN
  SELECT pg_catalog.unnest(ARRAY['pts','cards','designs','duplicates','ratings']::text[])
 LOOP
  WITH identities AS (
   SELECT s.user_id,s.state,
    CASE WHEN u.is_anonymous IS TRUE THEN g.ini
         WHEN s.state->'data'->>'ini' ~ '^[A-Z0-9!?*+.@#$%-]{3}$'
         THEN s.state->'data'->>'ini'
         ELSE u.raw_user_meta_data->>'icmx_initials' END AS ini,
    CASE
     WHEN u.is_anonymous IS FALSE AND p.is_public IS TRUE
      AND u.email_confirmed_at IS NOT NULL THEN pg_catalog.lower(p.public_handle)
     WHEN u.is_anonymous IS TRUE
      AND EXISTS(SELECT 1 FROM private_sync.beta_access_gate
                 WHERE key='verified_guest' AND enabled)
      THEN g.handle
     ELSE NULL END AS handle
   FROM public.player_snapshots s
   JOIN auth.users u ON u.id=s.user_id
   LEFT JOIN public.player_profiles p ON p.user_id=s.user_id
   LEFT JOIN private_sync.guest_public_identities g ON g.user_id=s.user_id
   WHERE s.game_format=2
     AND s.state->>'app'='insertcoinmx-album'
     AND s.state->>'format'='2'
  ),
  eligible AS (
   SELECT * FROM identities
   WHERE ini ~ '^[A-Z0-9!?*+.@#$%-]{3}$'
     AND handle ~ '^[a-z0-9_]{3,20}$'
  ),
  cards AS (
   SELECT e.user_id,
    pg_catalog.count(*)::integer AS cards,
    pg_catalog.count(DISTINCT pg_catalog.regexp_replace(c.key,'_[berf]$',''))::integer AS designs,
    coalesce(pg_catalog.sum(
     greatest((c.value #>> '{}')::integer-1,0)
    ),0)::integer AS duplicates
   FROM eligible e
   CROSS JOIN LATERAL pg_catalog.jsonb_each(
    coalesce(e.state->'data'->'have','{}'::jsonb)
   ) AS c(key,value)
   WHERE c.key ~ '^[a-z0-9]{1,40}_[berf]$'
    AND c.value::text ~ '^[1-9][0-9]{0,3}$'
    AND EXISTS(SELECT 1 FROM private_sync.pack_pool pool WHERE pool.card_key=c.key)
   GROUP BY e.user_id
  ),
  rated AS (
   SELECT e.user_id,pg_catalog.count(*)::integer AS ratings
   FROM eligible e
   CROSS JOIN LATERAL pg_catalog.jsonb_each(
    coalesce(e.state->'data'->'rate','{}'::jsonb)
   ) AS k(design,level)
   WHERE k.design ~ '^[a-z0-9]{1,40}$'
     AND k.level::text ~ '^[0-3]$'
     AND EXISTS(
      SELECT 1 FROM private_sync.pack_pool pool
      WHERE pg_catalog.left(pool.card_key,pg_catalog.length(pool.card_key)-2)=k.design
     )
   GROUP BY e.user_id
  ),
  earned AS (
   SELECT DISTINCT pi.user_id, card.key
   FROM private_sync.pack_issues pi
   CROSS JOIN LATERAL pg_catalog.jsonb_array_elements_text(pi.cards) AS card(key)
   WHERE card.key ~ '^[a-z0-9]{1,40}_[berf]$'
     AND EXISTS(SELECT 1 FROM private_sync.pack_pool pool WHERE pool.card_key=card.key)
  ),
  points AS (
   SELECT user_id,pg_catalog.sum(
    CASE pg_catalog.right(key,1)
     WHEN 'b' THEN 10 WHEN 'e' THEN 25
     WHEN 'r' THEN 50 WHEN 'f' THEN 100 ELSE 0 END
   )::integer AS pts
   FROM earned GROUP BY user_id
  ),
  metrics AS (
   SELECT e.user_id,e.ini,e.handle,
    coalesce(c.cards,0) AS cards,
    coalesce(c.designs,0) AS designs,
    coalesce(c.duplicates,0) AS duplicates,
    coalesce(r.ratings,0) AS ratings,
    coalesce(p.pts,0) AS pts
   FROM eligible e
   LEFT JOIN cards c ON c.user_id=e.user_id
   LEFT JOIN rated r ON r.user_id=e.user_id
   LEFT JOIN points p ON p.user_id=e.user_id
  )
  SELECT coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
    'ini',t.ini,'handle',t.handle,'score',t.score,
    'mine',t.user_id=auth.uid()
   ) ORDER BY t.score DESC,t.handle,t.user_id
  ),'[]'::jsonb) INTO v_rows
  FROM (
   SELECT m.user_id,m.ini,m.handle,
    CASE v_metric WHEN 'pts' THEN m.pts
     WHEN 'cards' THEN m.cards WHEN 'designs' THEN m.designs
     WHEN 'duplicates' THEN m.duplicates WHEN 'ratings' THEN m.ratings END AS score
   FROM metrics m
   WHERE CASE v_metric WHEN 'pts' THEN m.pts
    WHEN 'cards' THEN m.cards WHEN 'designs' THEN m.designs
    WHEN 'duplicates' THEN m.duplicates WHEN 'ratings' THEN m.ratings END > 0
   ORDER BY score DESC,m.handle,m.user_id
   LIMIT 10
  ) t;
  v_result:=pg_catalog.jsonb_set(v_result,ARRAY[v_metric],v_rows,true);
 END LOOP;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.icmx_register_guest_identity(p_ini text, p_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_ini text;
 v_handle text;
BEGIN
 IF v_uid IS NULL OR NOT private_sync.can_access_game(v_uid)
    OR NOT EXISTS(SELECT 1 FROM auth.users
                  WHERE id=v_uid AND is_anonymous IS TRUE) THEN
  RAISE EXCEPTION 'Invitado no verificado' USING ERRCODE='42501';
 END IF;
 IF p_ini !~ '^[A-Z0-9!?*+.@#$%-]{3}$' OR p_handle !~ '^[a-z0-9_]{3,20}$'
    OR p_ini IS NULL OR p_handle IS NULL THEN
  RAISE EXCEPTION 'Identidad arcade inválida' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.player_profiles
           WHERE pg_catalog.lower(public_handle)=p_handle AND user_id<>v_uid) THEN
  RAISE EXCEPTION '@usuario ya registrado' USING ERRCODE='23505';
 END IF;
 INSERT INTO private_sync.guest_public_identities(user_id,ini,handle)
 VALUES(v_uid,p_ini,p_handle)
 ON CONFLICT(user_id) DO NOTHING;
 SELECT ini,handle INTO v_ini,v_handle
 FROM private_sync.guest_public_identities
 WHERE user_id=v_uid;
 IF v_ini IS DISTINCT FROM p_ini OR v_handle IS DISTINCT FROM p_handle THEN
  RAISE EXCEPTION 'La identidad de invitado ya está vinculada' USING ERRCODE='23505';
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','registered','ini',v_ini,'handle',v_handle);
END;
$function$;

COMMIT;
