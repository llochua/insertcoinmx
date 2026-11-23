-- Insert Coin MX / Ranking global de jugadores, separado del ranking POP de diseños.
-- Lectura pública segura: SOLO nombres arcade saneados y puntuaciones agregadas.
-- Ningún usuario ni navegador puede enviar puntuaciones al RPC.
-- El inventario y las calificaciones proceden del snapshot con economía protegida.
-- PTS procede exclusivamente de sobres emitidos en servidor (historial de variantes).
-- IC-AUTH-03 / IC-RANK-01: no incluir Auth anónimo, incluso si verified_guest está habilitado.
-- PREPARADO PARA REVISIÓN: no aplicar al Supabase de producción sin autorización.
BEGIN;
CREATE OR REPLACE FUNCTION public.icmx_player_leaderboards()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    CASE WHEN s.state->'data'->>'ini' ~ '^[A-Z0-9!?*+.@#$%-]{3}
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
REVOKE ALL ON FUNCTION public.icmx_player_leaderboards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.icmx_player_leaderboards() TO anon,authenticated;
COMMIT;

         THEN s.state->'data'->>'ini'
         ELSE u.raw_user_meta_data->>'icmx_initials' END AS ini,
    pg_catalog.lower(p.public_handle) AS handle
   FROM public.player_snapshots s
   JOIN auth.users u ON u.id=s.user_id
   JOIN public.player_profiles p ON p.user_id=s.user_id
   WHERE s.game_format=2
     AND s.state->>'app'='insertcoinmx-album'
     AND s.state->>'format'='2'
     -- Solo cuentas permanentes con correo confirmado y perfil público.
     -- Un invitado verificado puede coleccionar/opinar, nunca ocupar un ranking.
     AND u.is_anonymous IS FALSE
     AND u.email_confirmed_at IS NOT NULL
     AND p.is_public IS TRUE
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
REVOKE ALL ON FUNCTION public.icmx_player_leaderboards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.icmx_player_leaderboards() TO anon,authenticated;
COMMIT;
