-- Identidad pública verificable para invitados: UUID de Auth y @usuario único.
-- Sin privilegios directos al navegador ni datos personales en el Top 10.
BEGIN;
CREATE TABLE IF NOT EXISTS private_sync.guest_public_identities(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 ini text NOT NULL CHECK(ini ~ '^[A-Z0-9]{3}$'),
 handle text NOT NULL UNIQUE CHECK(handle ~ '^[a-z0-9_]{3,20}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private_sync.guest_public_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_sync.guest_public_identities FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.icmx_register_guest_identity(p_ini text,p_handle text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_ini text;
 v_handle text;
BEGIN
 IF v_uid IS NULL OR NOT private_sync.can_access_game(v_uid)
    OR NOT EXISTS(SELECT 1 FROM auth.users
                  WHERE id=v_uid AND is_anonymous IS TRUE) THEN
  RAISE EXCEPTION 'Invitado no verificado' USING ERRCODE='42501';
 END IF;
 IF p_ini !~ '^[A-Z0-9]{3}$' OR p_handle !~ '^[a-z0-9_]{3,20}$'
    OR p_ini IS NULL OR p_handle IS NULL THEN
  RAISE EXCEPTION 'Identidad arcade inválida' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.player_profiles
           WHERE pg_catalog.lower(public_handle)=p_handle AND user_id<>v_uid) THEN
  RAISE EXCEPTION '@usuario ya registrado' USING ERRCODE='23505';
 END IF;
 INSERT INTO private_sync.guest_public_identities(user_id,ini,handle)
 VALUES(v_uid,p_ini,p_handle)
 ON CONFLICT(user_id) DO NOTHING;
 SELECT ini,handle INTO v_ini,v_handle
 FROM private_sync.guest_public_identities
 WHERE user_id=v_uid;
 IF v_ini IS DISTINCT FROM p_ini OR v_handle IS DISTINCT FROM p_handle THEN
  RAISE EXCEPTION 'La identidad de invitado ya está vinculada' USING ERRCODE='23505';
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','registered','ini',v_ini,'handle',v_handle);
END;
$function$;
REVOKE ALL ON FUNCTION public.icmx_register_guest_identity(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.icmx_register_guest_identity(text,text) TO authenticated;
COMMIT;
