-- Insert Coin MX · corte de colección para lanzamiento público
-- EJECUTAR SOLO DESPUÉS DE APROBAR LA PUBLICACIÓN Y CON LA BETA CERRADA.
-- Preserva auth.users (cuentas), user_metadata (avatares), player_profiles,
-- private_sync.pack_pool (catálogo/probabilidades) y la allowlist de laboratorio.
-- Genera un archivo de recuperación accesible solamente por el administrador.
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(736511, 20261120);
LOCK TABLE public.player_snapshots, public.collection_cards,
 public.collection_events, public.import_receipts,
 private_sync.pack_issues, private_sync.pack_exchanges
 IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM private_sync.beta_access_gate
               WHERE key='public_beta' AND enabled=false)
 THEN RAISE EXCEPTION 'No reiniciar mientras la beta esté abierta'; END IF;
 IF (SELECT count(*) FROM auth.users)>10 OR
    (SELECT count(*) FROM public.player_snapshots)>10 OR
    (SELECT count(*) FROM private_sync.pack_issues)>100
 THEN RAISE EXCEPTION 'El volumen cambió; requiere nueva revisión antes del reset'; END IF;
 IF (SELECT count(*) FROM private_sync.pack_pool)<>386
 THEN RAISE EXCEPTION 'El pool del servidor cambió; no se tocará nada'; END IF;
END
$guard$;
CREATE TABLE IF NOT EXISTS private_sync.release_archives(
 release_key text PRIMARY KEY,
 archived_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
 archived jsonb NOT NULL
);
ALTER TABLE private_sync.release_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.release_archives FROM PUBLIC, anon, authenticated;
DO $guard$
BEGIN
 IF EXISTS(SELECT 1 FROM private_sync.release_archives
           WHERE release_key='public-2026-launch-v1')
 THEN RAISE EXCEPTION 'Este reinicio ya fue aplicado anteriormente'; END IF;
END
$guard$;
INSERT INTO private_sync.release_archives(release_key,archived)
SELECT 'public-2026-launch-v1',
 pg_catalog.jsonb_build_object(
  'snapshots',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM public.player_snapshots t),
  'cards',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM public.collection_cards t),
  'events',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM public.collection_events t),
  'import_receipts',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM public.import_receipts t),
  'pack_issues',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM private_sync.pack_issues t),
  'pack_exchanges',(SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),
                '[]'::jsonb) FROM private_sync.pack_exchanges t)
 );
DELETE FROM private_sync.pack_exchanges;
DELETE FROM private_sync.pack_issues;
DELETE FROM public.collection_events;
DELETE FROM public.import_receipts;
DELETE FROM public.collection_cards;
DELETE FROM public.player_snapshots;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.player_snapshots)<>0 OR
    (SELECT count(*) FROM public.collection_cards)<>0 OR
    (SELECT count(*) FROM public.collection_events)<>0 OR
    (SELECT count(*) FROM public.import_receipts)<>0 OR
    (SELECT count(*) FROM private_sync.pack_issues)<>0 OR
    (SELECT count(*) FROM private_sync.pack_exchanges)<>0
 THEN RAISE EXCEPTION 'El progreso no quedó totalmente limpio'; END IF;
 IF (SELECT count(*) FROM private_sync.pack_pool)<>386
 THEN RAISE EXCEPTION 'El pool del servidor cambió durante el reinicio'; END IF;
END
$verify$;
COMMIT;
