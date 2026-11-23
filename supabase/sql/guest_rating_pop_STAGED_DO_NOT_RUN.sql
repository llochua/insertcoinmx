-- Insert Coin MX / INC-02 · votos invitados hacia POP (PREPARACIÓN CERRADA).
-- No ejecutar en Supabase de producción sin consentimiento específico.
-- Requiere community_pop_STAGED.sql ya instalado.
-- Gate adicional independiente, FALSE por defecto: no abre votos de invitados al aplicar.
BEGIN;

CREATE TABLE IF NOT EXISTS private_community.guest_rating_gate (
  key text PRIMARY KEY CHECK (key='guest_rating'),
  enabled boolean NOT NULL DEFAULT false
);
ALTER TABLE private_community.guest_rating_gate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_community.guest_rating_gate FROM PUBLIC,anon,authenticated;
INSERT INTO private_community.guest_rating_gate(key,enabled)
VALUES ('guest_rating',false) ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS private_community.guest_rating_daily (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  utc_day date NOT NULL,
  writes integer NOT NULL CHECK(writes BETWEEN 1 AND 100),
  PRIMARY KEY (user_id,utc_day)
);
ALTER TABLE private_community.guest_rating_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_community.guest_rating_daily FROM PUBLIC,anon,authenticated;

-- NO basta con el rol PostgreSQL authenticated: los invitados también lo usan.
-- Verificar JWT, estado server-side Auth, identidad invitada y tres gates.
CREATE OR REPLACE FUNCTION private_community.community_guest_can_rate()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $body$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL
    OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) IS NOT TRUE
    OR NOT EXISTS (SELECT 1 FROM auth.users u
                   WHERE u.id=v_uid AND u.is_anonymous IS TRUE)
    OR NOT EXISTS (SELECT 1 FROM private_sync.guest_public_identities g WHERE g.user_id=v_uid)
 THEN
  RAISE EXCEPTION 'Verified guest identity required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM private_sync.beta_access_gate
                WHERE key='public_beta' AND enabled)
    OR NOT EXISTS (SELECT 1 FROM private_sync.beta_access_gate
                   WHERE key='verified_guest' AND enabled)
    OR NOT EXISTS (SELECT 1 FROM private_community.release_gate
                   WHERE key='community_pop' AND enabled)
    OR NOT EXISTS (SELECT 1 FROM private_community.guest_rating_gate
                   WHERE key='guest_rating' AND enabled)
 THEN
  RAISE EXCEPTION 'Guest community ratings not enabled' USING ERRCODE='42501';
 END IF;
 RETURN v_uid;
END; $body$;

-- Limite de escrituras por identidad invitada y día UTC; cada canal consume 1.
-- No reemplaza CAPTCHA ni los límites de inscripción por IP: personas pueden
-- crear varios UID. JAMÁS encender el gate hasta comprobar esas defensas.
CREATE OR REPLACE FUNCTION private_community.community_guest_rating_budget(p_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $body$
DECLARE v_writes integer;
BEGIN
 INSERT INTO private_community.guest_rating_daily AS daily (user_id,utc_day,writes)
 VALUES (p_uid,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(user_id,utc_day) DO UPDATE
  SET writes=daily.writes+1
  WHERE daily.writes<100
 RETURNING writes INTO v_writes;
 IF v_writes IS NULL THEN
  RAISE EXCEPTION 'Guest rating limit reached' USING ERRCODE='42501';
 END IF;
END; $body$;

-- Solo likes y Tier: no abrir Reta, PTS, premios o rankings públicos a invitados.
-- Reemplaza el cast del diseño y deja community_can_vote() (para Reta) intacta.
CREATE OR REPLACE FUNCTION private_community.community_cast_design(
 p_design text,p_channel text,p_value integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $body$
DECLARE
 v_uid uuid:=auth.uid();
 v_anonymous boolean;
BEGIN
 IF v_uid IS NULL THEN
  RAISE EXCEPTION 'Account session required' USING ERRCODE='42501';
 END IF;
 SELECT u.is_anonymous INTO v_anonymous FROM auth.users u WHERE u.id=v_uid;
 IF v_anonymous IS TRUE THEN
  v_uid:=private_community.community_guest_can_rate();
 ELSE
  v_uid:=private_community.community_can_vote();
 END IF;

 IF NOT coalesce(private_community.community_design_valid(p_design),false) THEN
  RAISE EXCEPTION 'Unknown design';
 END IF;
 IF NOT ((p_channel='like' AND (p_value IS NULL OR p_value IN (0,1)))
      OR (p_channel='tier' AND (p_value IS NULL OR p_value BETWEEN 0 AND 3))) THEN
  RAISE EXCEPTION 'Invalid vote';
 END IF;
 IF v_anonymous IS TRUE THEN
  PERFORM private_community.community_guest_rating_budget(v_uid);
 END IF;

 IF p_channel='like' THEN
  INSERT INTO private_community.community_design_votes(user_id,design_id,liked)
  VALUES(v_uid,p_design,CASE WHEN p_value IS NULL THEN NULL ELSE p_value=1 END)
  ON CONFLICT(user_id,design_id) DO UPDATE SET liked=excluded.liked;
 ELSE
  INSERT INTO private_community.community_design_votes(user_id,design_id,tier)
  VALUES(v_uid,p_design,p_value)
  ON CONFLICT(user_id,design_id) DO UPDATE SET tier=excluded.tier;
 END IF;
END; $body$;

-- Sin APIs directas a tablas de votos, identidades ni contadores de invitado.
REVOKE ALL ON FUNCTION private_community.community_guest_can_rate(),
 private_community.community_guest_rating_budget(uuid) FROM PUBLIC,anon,authenticated;
-- El wrapper public.icmx_community_vote existente conserva su firma y permisos.
-- private_community.community_cast_reta sigue exigiendo cuenta registrada.
COMMIT;
