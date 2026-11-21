-- Evita que una cuenta registrada e invitado verificado usen el mismo @handle.
-- Serializa las altas en las DOS tablas; no expone el esquema privado al cliente.
BEGIN;
CREATE OR REPLACE FUNCTION private_sync.guard_public_handle_collision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $trigger$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(736511,20261122);
 IF TG_TABLE_SCHEMA='public' THEN
  IF NEW.public_handle IS NOT NULL AND EXISTS(
   SELECT 1 FROM private_sync.guest_public_identities g
   WHERE g.handle=pg_catalog.lower(NEW.public_handle) AND g.user_id<>NEW.user_id
  ) THEN
   RAISE EXCEPTION 'Nombre arcade ocupado por un invitado' USING ERRCODE='23505';
  END IF;
 ELSIF TG_TABLE_SCHEMA='private_sync' THEN
  IF EXISTS(
   SELECT 1 FROM public.player_profiles p
   WHERE pg_catalog.lower(p.public_handle)=NEW.handle AND p.user_id<>NEW.user_id
  ) THEN
   RAISE EXCEPTION 'Nombre arcade ocupado por una cuenta' USING ERRCODE='23505';
  END IF;
 ELSE
  RAISE EXCEPTION 'Tabla de identidad no autorizada' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$trigger$;
REVOKE ALL ON FUNCTION private_sync.guard_public_handle_collision() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS icmx_account_handle_global_guard ON public.player_profiles;
CREATE TRIGGER icmx_account_handle_global_guard
BEFORE INSERT OR UPDATE OF public_handle ON public.player_profiles
FOR EACH ROW EXECUTE FUNCTION private_sync.guard_public_handle_collision();
DROP TRIGGER IF EXISTS icmx_guest_handle_global_guard ON private_sync.guest_public_identities;
CREATE TRIGGER icmx_guest_handle_global_guard
BEFORE INSERT OR UPDATE OF handle ON private_sync.guest_public_identities
FOR EACH ROW EXECUTE FUNCTION private_sync.guard_public_handle_collision();
COMMIT;