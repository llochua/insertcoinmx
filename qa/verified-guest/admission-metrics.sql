-- Candidato independiente de backend-review.sql; no abre compuertas ni limita jugadores.
BEGIN;
CREATE TABLE private_sync.guest_admission_daily (
 utc_day date PRIMARY KEY,
 admitted bigint NOT NULL CHECK (admitted >= 0)
);
ALTER TABLE private_sync.guest_admission_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.guest_admission_daily FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private_sync.record_guest_snapshot_admission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
 v_day date := (pg_catalog.clock_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
 IF EXISTS (SELECT 1 FROM auth.users WHERE id=NEW.user_id AND is_anonymous IS TRUE) THEN
  INSERT INTO private_sync.guest_admission_daily AS d(utc_day,admitted)
  VALUES (v_day,1)
  ON CONFLICT (utc_day) DO UPDATE SET admitted=d.admitted+1;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_sync.record_guest_snapshot_admission() FROM PUBLIC,anon,authenticated;
-- AFTER INSERT: una solicitud idempotente ON CONFLICT DO NOTHING no aumenta el contador.
CREATE TRIGGER record_guest_snapshot_admission AFTER INSERT ON public.player_snapshots
 FOR EACH ROW EXECUTE FUNCTION private_sync.record_guest_snapshot_admission();
COMMIT;
