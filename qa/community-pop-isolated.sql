\set ON_ERROR_STOP on
-- Only run in an ephemeral PostgreSQL database; never against the live project.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
CREATE SCHEMA private_sync;
CREATE TABLE private_sync.beta_access_gate(key text PRIMARY KEY,enabled boolean NOT NULL);
CREATE TABLE private_sync.sync_lab_allowlist(user_id uuid PRIMARY KEY);
CREATE TABLE private_sync.pack_pool(card_key text PRIMARY KEY,variant text NOT NULL);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
INSERT INTO private_sync.pack_pool SELECT d||'_'||v,v FROM unnest(ARRAY['a','b','c','d','e','f','g','h','i']) d CROSS JOIN unnest(ARRAY['b','e','r','f']) v;
\ir ../supabase/sql/community_pop_STAGED.sql

CREATE FUNCTION public.qa_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END$$;

SELECT public.qa_assert(NOT (SELECT enabled FROM private_sync.beta_access_gate WHERE key='community_pop'),'migration gate off');
SET ROLE anon;
SELECT public.qa_assert((SELECT count(*) FROM public.icmx_community_aggregates())=0,'closed ranking empty');
SELECT public.qa_assert(NOT has_function_privilege(current_user,'public.icmx_community_vote(text,text,integer)','EXECUTE'),'anon cannot vote');
SELECT public.qa_assert(NOT has_table_privilege(current_user,'private_community.community_design_votes','SELECT'),'anon cannot read identities');
RESET ROLE;
UPDATE private_sync.beta_access_gate SET enabled=true WHERE key='community_pop';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',false);
SELECT public.qa_assert(NOT has_table_privilege(current_user,'private_community.community_design_votes','INSERT'),'authenticated cannot insert direct votes');
SELECT public.icmx_community_vote('a','like',1);
SELECT public.icmx_community_vote('a','like',1);
SELECT public.icmx_community_vote('a','tier',0);
SELECT public.qa_assert((SELECT likes->>'total'='1' AND tiers->>'goty'='1' FROM public.icmx_community_aggregates() WHERE id='a'),'same account does not duplicate vote');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.icmx_community_vote('a','like',0);
SELECT public.icmx_community_vote('a','tier',1);
SELECT public.qa_assert((SELECT likes->>'total'='2' AND likes->>'positive'='1' AND tiers->>'genial'='1' FROM public.icmx_community_aggregates() WHERE id='a'),'two identities contribute independently');
SELECT public.icmx_community_vote('a','like',1);
SELECT public.icmx_community_vote('a','tier',3);
SELECT public.qa_assert((SELECT likes->>'total'='2' AND likes->>'positive'='2' AND tiers->>'genial'='0' AND tiers->>'mmm'='1' FROM public.icmx_community_aggregates() WHERE id='a'),'changing votes replaces prior values');
SELECT public.icmx_community_vote('a','like',NULL);
SELECT public.icmx_community_vote('a','tier',NULL);
SELECT public.qa_assert((SELECT likes->>'total'='1' AND tiers->>'mmm'='0' FROM public.icmx_community_aggregates() WHERE id='a'),'withdrawal removes only own contribution');
DO $$BEGIN
 BEGIN PERFORM public.icmx_community_vote('unknown','like',1); RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='unknown accepted'; EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN PERFORM public.icmx_community_reta((now() AT TIME ZONE 'America/Monterrey')::date,'[]'); RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='incomplete accepted'; EXCEPTION WHEN raise_exception THEN NULL; END;
END$$;
SELECT public.icmx_community_reta((now() AT TIME ZONE 'America/Monterrey')::date,'[{"winner":"a","loser":"b"},{"winner":"a","loser":"c"},{"winner":"a","loser":"d"},{"winner":"a","loser":"e"},{"winner":"a","loser":"f"},{"winner":"a","loser":"g"},{"winner":"a","loser":"h"}]');
SELECT public.qa_assert((SELECT reta->>'wins'='7' AND reta->>'matches'='7' FROM public.icmx_community_aggregates() WHERE id='a'),'complete Reta counted');
SELECT public.icmx_community_reta((now() AT TIME ZONE 'America/Monterrey')::date,'[{"winner":"b","loser":"a"},{"winner":"b","loser":"c"},{"winner":"b","loser":"d"},{"winner":"b","loser":"e"},{"winner":"b","loser":"f"},{"winner":"b","loser":"g"},{"winner":"b","loser":"h"}]');
SELECT public.qa_assert((SELECT reta->>'wins'='0' AND reta->>'matches'='1' FROM public.icmx_community_aggregates() WHERE id='a'),'last completed Reta replaces daily result');
SELECT public.qa_assert((SELECT reta->>'wins'='7' AND reta->>'matches'='7' FROM public.icmx_community_aggregates() WHERE id='b'),'replacement winner counted');
SELECT set_config('request.jwt.claims','{"is_anonymous":true}',false);
DO $$BEGIN
 BEGIN PERFORM public.icmx_community_vote('a','like',1); RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='anonymous accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
INSERT INTO private_sync.sync_lab_allowlist VALUES ('00000000-0000-0000-0000-000000000003');
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
SELECT public.icmx_community_vote('a','like',1);
SELECT public.qa_assert((SELECT likes->>'total'='1' FROM public.icmx_community_aggregates() WHERE id='a'),'lab votes excluded');
RESET ROLE;
SET ROLE anon;
SELECT public.qa_assert((SELECT count(*) FROM public.icmx_community_aggregates())=9,'public read includes catalog with no personal fields');
RESET ROLE;
