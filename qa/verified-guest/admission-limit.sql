-- Segunda migración, independiente de backend-review.sql.
-- No crea invitados ni abre compuertas. Límite de nuevas partidas, no de registros Auth.
BEGIN;
CREATE TABLE private_sync.guest_admission_daily (
 utc_day date PRIMARY KEY,
 admitted integer NOT NULL CHECK (admitted BETWEEN 0 AND 100)
);
ALTER TABLE private_sync.guest_admission_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.guest_admission_daily FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private_sync.limit_guest_snapshot_admission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
 v_day date := (pg_catalog.clock_timestamp() AT TIME ZONE 'UTC')::date;
 v_count integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=NEW.user_id AND is_anonymous IS TRUE) THEN
  RETURN NEW;
 END IF;
 -- Serializar solo admisiones de invitado, también con solicitudes paralelas.
 PERFORM pg_catalog.pg_advisory_xact_lock(6901121);
 -- ensure_player_snapshot ejecuta INSERT ON CONFLICT incluso para una partida existente.
 IF EXISTS (SELECT 1 FROM public.player_snapshots WHERE user_id=NEW.user_id) THEN
  RETURN NEW;
 END IF;
 INSERT INTO private_sync.guest_admission_daily AS d(utc_day,admitted)
 VALUES (v_day,1)
 ON CONFLICT (utc_day) DO UPDATE SET admitted=d.admitted+1
 WHERE d.admitted<100
 RETURNING admitted INTO v_count;
 IF v_count IS NULL THEN
  RAISE EXCEPTION 'guest_daily_admission_limit' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_sync.limit_guest_snapshot_admission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER limit_guest_snapshot_admission BEFORE INSERT ON public.player_snapshots
 FOR EACH ROW EXECUTE FUNCTION private_sync.limit_guest_snapshot_admission();
COMMIT;
