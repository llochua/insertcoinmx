\set ON_ERROR_STOP on
-- Disposable Supabase only. Reproduce production's existing gate constraint,
-- ownership policies, pool, pack ledger and RPCs before applying candidate.
CREATE SCHEMA private_sync;
REVOKE ALL ON SCHEMA private_sync FROM PUBLIC, anon, authenticated;
CREATE TABLE private_sync.sync_lab_allowlist(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
ALTER TABLE private_sync.sync_lab_allowlist ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.player_snapshots(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 game_format integer NOT NULL DEFAULT 2 CHECK(game_format=2),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.player_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_snapshots FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.player_snapshots TO authenticated;
CREATE POLICY player_snapshots_read_own ON public.player_snapshots
 FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE TABLE public.player_profiles(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 public_handle text UNIQUE, is_public boolean NOT NULL DEFAULT false
);
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.player_profiles TO authenticated;
CREATE POLICY player_profiles_read_own ON public.player_profiles FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY player_profiles_insert_own ON public.player_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY player_profiles_update_own ON public.player_profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
\ir ../../supabase/sql/server_pack_pool.sql
\ir ../../supabase/sql/issue_player_pack_lab.sql
\ir ../../supabase/sql/exchange_duplicates_lab.sql
\ir ../../supabase/sql/import_guest_collection_lab.sql
\ir ../../supabase/sql/prepare_public_beta_CLOSED.sql
UPDATE private_sync.beta_access_gate SET enabled=true WHERE key='public_beta';
\ir backend-review.sql
\ir admission-limit.sql
-- Seed 98 admissions to exercise production limit with just two real guest accounts.
INSERT INTO private_sync.guest_admission_daily VALUES ((clock_timestamp() AT TIME ZONE 'UTC')::date,98);
NOTIFY pgrst,'reload schema';
