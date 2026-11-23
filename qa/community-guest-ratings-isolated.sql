\set ON_ERROR_STOP on
-- SOLO en PostgreSQL efímero. Nunca usar en el proyecto Supabase de producción.
-- Carga todas las pruebas existentes y después añade un invitado verificado.
\ir community-pop-isolated.sql

-- Simular auth.users de Supabase, manteniendo identidades de pruebas previas.
ALTER TABLE auth.users ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
INSERT INTO auth.users(id,is_anonymous) VALUES
 ('00000000-0000-0000-0000-000000000004',true),
 ('00000000-0000-0000-0000-000000000005',true);
CREATE TABLE private_sync.guest_public_identities(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
INSERT INTO private_sync.guest_public_identities VALUES ('00000000-0000-0000-0000-000000000004');
ALTER TABLE private_sync.beta_access_gate DROP CONSTRAINT beta_access_gate_key_check;
ALTER TABLE private_sync.beta_access_gate ADD CONSTRAINT beta_access_gate_key_check
 CHECK(key IN ('public_beta','verified_guest'));
INSERT INTO private_sync.beta_access_gate(key,enabled) VALUES('verified_guest',true);

\ir ../supabase/sql/guest_rating_pop_STAGED_DO_NOT_RUN.sql

SELECT public.qa_assert((SELECT enabled=false FROM private_community.guest_rating_gate
 WHERE key='guest_rating'),'gate de invitados cerrado al instalar');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
SELECT set_config('request.jwt.claims','{"is_anonymous":true}',false);

-- El gate cerrado impide agregar votos aun con identidad de invitado.
DO $qa$ DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.icmx_community_vote('i','like',1);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: guest gate closed'; END IF;
END $qa$;
RESET ROLE;
UPDATE private_community.guest_rating_gate SET enabled=true WHERE key='guest_rating';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
SELECT set_config('request.jwt.claims','{"is_anonymous":true}',false);
SELECT public.icmx_community_vote('i','like',1);
SELECT public.icmx_community_vote('i','tier',0);
SELECT public.qa_assert((SELECT likes->>'total'='1' AND likes->>'positive'='1'
 AND tiers->>'goty'='1' FROM public.icmx_community_aggregates() WHERE id='i'),
 'guest verified contributes to POP');
SELECT public.icmx_community_vote('i','like',1);
SELECT public.qa_assert((SELECT likes->>'total'='1'
 FROM public.icmx_community_aggregates() WHERE id='i'),
 'guest repeated vote deduplicates');
SELECT public.icmx_community_vote('i','like',0);
SELECT public.qa_assert((SELECT likes->>'total'='1' AND likes->>'positive'='0'
 FROM public.icmx_community_aggregates() WHERE id='i'),
 'guest update replaces vote');
SELECT public.icmx_community_vote('i','tier',NULL);
SELECT public.qa_assert((SELECT tiers->>'goty'='0'
 FROM public.icmx_community_aggregates() WHERE id='i'),
 'guest undo tier removes contribution');
SELECT public.qa_assert(NOT has_table_privilege(current_user,
 'private_community.guest_rating_daily','SELECT'),'guest cannot read usage');
SELECT public.qa_assert(NOT has_table_privilege(current_user,
 'private_community.community_design_votes','INSERT'),'guest cannot insert direct vote');
DO $qa$ DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.icmx_community_reta(
 (now() AT TIME ZONE 'America/Monterrey')::date,
 '[]'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: guest Reta allowed'; END IF;
END $qa$;

-- Se requiere una identidad invitada inscrita, no solo JWT anónimo.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
DO $qa$ DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.icmx_community_vote('i','like',1);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: unverified guest allowed'; END IF;
END $qa$;
RESET ROLE;

-- Límite server-side de 100 escrituras por UID/UTC, sin filtrar datos privados.
UPDATE private_community.guest_rating_daily
 SET writes=100 WHERE user_id='00000000-0000-0000-0000-000000000004';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
SELECT set_config('request.jwt.claims','{"is_anonymous":true}',false);
DO $qa$ DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.icmx_community_vote('i','like',1);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: guest limit bypass'; END IF;
END $qa$;
RESET ROLE;
SELECT public.qa_assert((SELECT likes->>'positive'='0'
 FROM public.icmx_community_aggregates() WHERE id='i'),'rate limit does not mutate vote');

-- Los jugadores registrados siguen votando sin depender del gate de invitados.
UPDATE private_community.guest_rating_gate SET enabled=false WHERE key='guest_rating';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',false);
SELECT public.icmx_community_vote('i','like',1);
SELECT public.qa_assert((SELECT likes->>'positive'='1'
 FROM public.icmx_community_aggregates() WHERE id='i'),'registered unaffected');
RESET ROLE;
