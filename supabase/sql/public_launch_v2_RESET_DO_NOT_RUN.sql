-- Corte de temporada v2 · SOLO en ventana cerrada, después de Auth y QA aprobados.
-- Preserva auth.users, avatares, perfiles, identidades, catálogo y probabilidades.
-- Archiva cartas, sobres, réplicas y señales comunitarias antes de vaciar todo.
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(736511,20261121);
LOCK TABLE public.player_snapshots,public.collection_cards,public.collection_events,
 public.import_receipts,private_sync.pack_issues,private_sync.pack_exchanges,
 private_community.community_design_votes,private_community.community_reta_ballots
 IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM private_sync.beta_access_gate WHERE key='public_beta' AND enabled=false)
    OR EXISTS(SELECT 1 FROM private_sync.beta_access_gate WHERE key='verified_guest' AND enabled=true)
 THEN RAISE EXCEPTION 'Detén la beta y desactiva invitados antes del corte'; END IF;
 IF (SELECT count(*) FROM auth.users)>10
    OR (SELECT count(*) FROM public.player_snapshots)>10
    OR (SELECT count(*) FROM private_sync.pack_issues)>100
 THEN RAISE EXCEPTION 'El número de usuarios cambió; exige revisar el corte'; END IF;
 IF EXISTS(SELECT 1 FROM private_sync.release_archives WHERE release_key='public-2026-launch-v2')
 THEN RAISE EXCEPTION 'La nueva temporada ya tiene archivo'; END IF;
END $guard$;
INSERT INTO private_sync.release_archives(release_key,archived)
SELECT 'public-2026-launch-v2',pg_catalog.jsonb_build_object(
 'snapshots',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.player_snapshots t),
 'cards',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.collection_cards t),
 'events',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.collection_events t),
 'import_receipts',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.import_receipts t),
 'pack_issues',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private_sync.pack_issues t),
 'pack_exchanges',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private_sync.pack_exchanges t),
 'pop_votes',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private_community.community_design_votes t),
 'reta_ballots',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private_community.community_reta_ballots t)
);
DELETE FROM private_community.community_reta_ballots;
DELETE FROM private_community.community_design_votes;
DELETE FROM private_sync.pack_exchanges;
DELETE FROM private_sync.pack_issues;
DELETE FROM public.collection_events;
DELETE FROM public.import_receipts;
DELETE FROM public.collection_cards;
DELETE FROM public.player_snapshots;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.player_snapshots)
    OR EXISTS(SELECT 1 FROM private_sync.pack_issues)
    OR EXISTS(SELECT 1 FROM private_sync.pack_exchanges)
    OR EXISTS(SELECT 1 FROM private_community.community_design_votes)
    OR EXISTS(SELECT 1 FROM private_community.community_reta_ballots)
 THEN RAISE EXCEPTION 'Corte incompleto'; END IF;
END $verify$;
COMMIT;
