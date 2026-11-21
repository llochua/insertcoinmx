\set ON_ERROR_STOP on
-- Only in the disposable, local Supabase instance created by CI.
CREATE SCHEMA private_sync;
CREATE TABLE private_sync.beta_access_gate(key text PRIMARY KEY,enabled boolean NOT NULL);
CREATE TABLE private_sync.sync_lab_allowlist(user_id uuid PRIMARY KEY);
CREATE TABLE private_sync.pack_pool(card_key text PRIMARY KEY,variant text NOT NULL);
INSERT INTO private_sync.pack_pool
SELECT d||'_'||v,v FROM unnest(ARRAY['abuket','arcade','1up','aku','b','c','d','e']) d CROSS JOIN unnest(ARRAY['b','e','r','f']) v;
\ir ../supabase/sql/community_pop_STAGED.sql
NOTIFY pgrst,'reload schema';
