-- STAGED: review and test before deploying. No changes to packs or snapshots.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private_community;
REVOKE ALL ON SCHEMA private_community FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private_community.community_design_votes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id text NOT NULL CHECK (design_id ~ '^[a-z0-9]{1,40}$'),
  liked boolean,
  tier smallint CHECK (tier BETWEEN 0 AND 3),
  PRIMARY KEY(user_id,design_id)
);
CREATE TABLE IF NOT EXISTS private_community.community_reta_ballots (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ballot_day date NOT NULL,
  matches jsonb NOT NULL CHECK(jsonb_typeof(matches)='array' AND jsonb_array_length(matches)=7),
  PRIMARY KEY(user_id,ballot_day)
);
ALTER TABLE private_community.community_design_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_community.community_reta_ballots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_community.community_design_votes,private_community.community_reta_ballots FROM PUBLIC,anon,authenticated;
-- Separate gate: staged migration never starts accepting live votes by itself.
INSERT INTO private_sync.beta_access_gate(key,enabled) VALUES ('community_pop',false) ON CONFLICT(key) DO NOTHING;
CREATE OR REPLACE FUNCTION private_community.community_can_vote()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
  RAISE EXCEPTION 'Registered account required' USING ERRCODE='42501';
 END IF;
 IF NOT coalesce((SELECT enabled FROM private_sync.beta_access_gate WHERE key='community_pop'),false)
    AND NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist WHERE user_id=uid) THEN
  RAISE EXCEPTION 'Community voting not enabled' USING ERRCODE='42501';
 END IF;
 RETURN uid;
END; $$;
CREATE OR REPLACE FUNCTION private_community.community_design_valid(p_design text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT p_design ~ '^[a-z0-9]{1,40}$' AND EXISTS(
 SELECT 1 FROM private_sync.pack_pool WHERE card_key=p_design||'_'||variant);
$$;
CREATE OR REPLACE FUNCTION private_community.community_cast_design(p_design text,p_channel text,p_value integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private_community.community_can_vote();
BEGIN
 IF NOT coalesce(private_community.community_design_valid(p_design),false) THEN RAISE EXCEPTION 'Unknown design'; END IF;
 IF p_channel='like' AND (p_value IS NULL OR p_value IN (0,1)) THEN
  INSERT INTO private_community.community_design_votes(user_id,design_id,liked)
   VALUES(uid,p_design,CASE WHEN p_value IS NULL THEN NULL ELSE p_value=1 END)
   ON CONFLICT(user_id,design_id) DO UPDATE SET liked=excluded.liked;
 ELSIF p_channel='tier' AND (p_value IS NULL OR p_value BETWEEN 0 AND 3) THEN
  INSERT INTO private_community.community_design_votes(user_id,design_id,tier)
   VALUES(uid,p_design,p_value)
   ON CONFLICT(user_id,design_id) DO UPDATE SET tier=excluded.tier;
 ELSE RAISE EXCEPTION 'Invalid vote'; END IF;
END; $$;
-- A complete ballot is seven consecutive champion-vs-new-challenger matches.
-- The server derives results, never accepts wins, POP or points from the client.
-- The canonical day for global ballots is Mexico (Monterrey).
CREATE OR REPLACE FUNCTION private_community.community_cast_reta(p_day date,p_matches jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private_community.community_can_vote(); m jsonb; winner text; loser text;
 champion text; seen text[]:=ARRAY[]::text[]; n int:=0; today date:=(now() AT TIME ZONE 'America/Monterrey')::date;
BEGIN
 IF p_day IS DISTINCT FROM today THEN RAISE EXCEPTION 'Ballot day does not match global day'; END IF;
 IF p_matches IS NULL OR jsonb_typeof(p_matches)<>'array' OR jsonb_array_length(p_matches)<>7 THEN RAISE EXCEPTION 'Seven matches required'; END IF;
 FOR m IN SELECT value FROM jsonb_array_elements(p_matches) LOOP
  winner:=m->>'winner'; loser:=m->>'loser';
  IF winner IS NULL OR loser IS NULL OR winner=loser
     OR NOT coalesce(private_community.community_design_valid(winner),false)
     OR NOT coalesce(private_community.community_design_valid(loser),false) THEN RAISE EXCEPTION 'Invalid match'; END IF;
  IF n=0 THEN seen:=ARRAY[winner,loser];
  ELSIF winner=champion AND NOT(loser=ANY(seen)) THEN seen:=array_append(seen,loser);
  ELSIF loser=champion AND NOT(winner=ANY(seen)) THEN seen:=array_append(seen,winner);
  ELSE RAISE EXCEPTION 'Invalid match sequence'; END IF;
  champion:=winner; n:=n+1;
 END LOOP;
 INSERT INTO private_community.community_reta_ballots(user_id,ballot_day,matches) VALUES(uid,p_day,p_matches)
 ON CONFLICT(user_id,ballot_day) DO UPDATE SET matches=excluded.matches;
END; $$;
CREATE OR REPLACE FUNCTION private_community.community_aggregates()
RETURNS TABLE(id text,likes jsonb,tiers jsonb,reta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH eligible AS (
   SELECT DISTINCT regexp_replace(card_key,'_[berf]$','') AS design FROM private_sync.pack_pool
   WHERE card_key ~ '^[a-z0-9]{1,40}_[berf]$'
 ), votes AS (
   SELECT design_id,
    count(*) FILTER(WHERE liked=true) positive,
    count(liked) total,
    count(*) FILTER(WHERE tier=0) goty,
    count(*) FILTER(WHERE tier=1) genial,
    count(*) FILTER(WHERE tier=2) ok,
    count(*) FILTER(WHERE tier=3) mmm
   FROM private_community.community_design_votes
   WHERE NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist l WHERE l.user_id=community_design_votes.user_id)
   GROUP BY design_id
 ), outcomes AS (
   SELECT m.value->>'winner' design_id,1 win FROM private_community.community_reta_ballots b
   CROSS JOIN LATERAL jsonb_array_elements(b.matches) m
   WHERE NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist l WHERE l.user_id=b.user_id)
   UNION ALL
   SELECT m.value->>'loser',0 FROM private_community.community_reta_ballots b
   CROSS JOIN LATERAL jsonb_array_elements(b.matches) m
   WHERE NOT EXISTS(SELECT 1 FROM private_sync.sync_lab_allowlist l WHERE l.user_id=b.user_id)
 ), rr AS (SELECT design_id,sum(win) wins,count(*) matches FROM outcomes GROUP BY design_id)
 SELECT e.design,
 jsonb_build_object('positive',coalesce(v.positive,0),'total',coalesce(v.total,0)),
 jsonb_build_object('goty',coalesce(v.goty,0),'genial',coalesce(v.genial,0),'ok',coalesce(v.ok,0),'mmm',coalesce(v.mmm,0)),
 jsonb_build_object('wins',coalesce(rr.wins,0),'matches',coalesce(rr.matches,0))
 FROM eligible e LEFT JOIN votes v ON v.design_id=e.design LEFT JOIN rr ON rr.design_id=e.design
 WHERE coalesce((SELECT enabled FROM private_sync.beta_access_gate WHERE key='community_pop'),false);
$$;
-- Public RPC wrappers are invokers; only narrow internal functions have elevated access.
CREATE OR REPLACE FUNCTION public.icmx_community_aggregates()
RETURNS TABLE(id text,likes jsonb,tiers jsonb,reta jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT * FROM private_community.community_aggregates();
$$;
CREATE OR REPLACE FUNCTION public.icmx_community_vote(p_design text,p_channel text,p_value integer)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private_community.community_cast_design(p_design,p_channel,p_value);
$$;
CREATE OR REPLACE FUNCTION public.icmx_community_reta(p_day date,p_matches jsonb)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private_community.community_cast_reta(p_day,p_matches);
$$;
REVOKE ALL ON FUNCTION private_community.community_can_vote(),private_community.community_design_valid(text),private_community.community_cast_design(text,text,integer),private_community.community_cast_reta(date,jsonb),private_community.community_aggregates() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.icmx_community_aggregates(),public.icmx_community_vote(text,text,integer),public.icmx_community_reta(date,jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private_community TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private_community.community_aggregates(),public.icmx_community_aggregates() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private_community.community_cast_design(text,text,integer),private_community.community_cast_reta(date,jsonb),public.icmx_community_vote(text,text,integer),public.icmx_community_reta(date,jsonb) TO authenticated;
COMMIT;
