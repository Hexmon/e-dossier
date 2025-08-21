-- 0010_auth_exclude_and_checks.sql
-- Hardening + integrity: partial uniques (soft-delete aware), range constraints,
-- EXCLUDE rules, scope consistency checks, token rotation self-FK, and helper triggers.

-- ===== Extensions =====
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION zero_uuid() RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- Reattach updated_at triggers (idempotent)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_appt_updated_at ON appointments;
CREATE TRIGGER trg_appt_updated_at
BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_del_updated_at ON delegations;
CREATE TRIGGER trg_del_updated_at
BEFORE UPDATE ON delegations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== USERS: partial unique indexes (ignore soft-deleted rows) =====
DROP INDEX IF EXISTS uq_users_username;
DROP INDEX IF EXISTS uq_users_email;
DROP INDEX IF EXISTS uq_users_phone;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_active
  ON users (lower(username))
  WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_active
  ON users (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone_active
  ON users (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_email_shape,
  ADD  CONSTRAINT users_email_shape
  CHECK (email IS NULL OR position('@' IN email) > 1);

-- ===== REFRESH TOKENS: order check + self-FK + better index predicate =====
ALTER TABLE refresh_tokens
  DROP CONSTRAINT IF EXISTS rt_time_order,
  ADD  CONSTRAINT rt_time_order CHECK (issued_at < expires_at);

ALTER TABLE refresh_tokens
  DROP CONSTRAINT IF EXISTS refresh_tokens_replaced_by_jti_fkey,
  ADD  CONSTRAINT refresh_tokens_replaced_by_jti_fkey
  FOREIGN KEY (replaced_by_jti) REFERENCES refresh_tokens(jti) ON DELETE SET NULL;

-- NOTE: avoid volatile now() in index predicates; place it in the query instead
DROP INDEX IF EXISTS ix_rt_user_active;
CREATE INDEX ix_rt_user_active
  ON refresh_tokens (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_refresh_replaced_by
  ON refresh_tokens(replaced_by_jti);

-- ===== APPOINTMENTS: generated range, checks, scope consistency, EXCLUDEs =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='valid_during'
  ) THEN
    ALTER TABLE appointments
      ADD COLUMN valid_during tstzrange
      GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;
  END IF;
END$$;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_time_order,
  ADD  CONSTRAINT appt_time_order
  CHECK (ends_at IS NULL OR starts_at < ends_at);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_scope_consistency,
  ADD  CONSTRAINT appt_scope_consistency
  CHECK (
    (scope_type = 'GLOBAL'  AND scope_id IS NULL) OR
    (scope_type = 'PLATOON' AND scope_id IS NOT NULL)
  );

-- One PRIMARY holder per (position, scope) over time (includes Platoon Commander)
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_slot_unique;
ALTER TABLE appointments
  ADD  CONSTRAINT appt_slot_unique
  EXCLUDE USING gist (
    position WITH =,
    scope_type WITH =,
    (COALESCE(scope_id, zero_uuid())) WITH =,
    valid_during WITH &&
  )
  WHERE (
    assignment = 'PRIMARY'
    AND deleted_at IS NULL
    AND position IN ('COMMANDANT','DEPUTY_COMMANDANT','HOAT','DEPUTY_SECRETARY','PLATOON_COMMANDER')
  )
  DEFERRABLE INITIALLY IMMEDIATE;

-- Prevent the same user overlapping themselves in same (position,scope)
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_user_self_no_overlap;
ALTER TABLE appointments
  ADD  CONSTRAINT appt_user_self_no_overlap
  EXCLUDE USING gist (
    user_id WITH =,
    position WITH =,
    scope_type WITH =,
    (COALESCE(scope_id, zero_uuid())) WITH =,
    valid_during WITH &&
  )
  WHERE (assignment = 'PRIMARY' AND deleted_at IS NULL)
  DEFERRABLE INITIALLY IMMEDIATE;

-- Handy indexes
CREATE INDEX IF NOT EXISTS ix_appt_user_active
  ON appointments (user_id)
  WHERE ends_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_appt_scope
  ON appointments (position, scope_type, scope_id)
  WHERE deleted_at IS NULL;

-- ===== DELEGATIONS: generated range, checks, scope consistency, EXCLUDE =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='delegations' AND column_name='valid_during'
  ) THEN
    ALTER TABLE delegations
      ADD COLUMN valid_during tstzrange
      GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;
  END IF;
END$$;

ALTER TABLE delegations
  DROP CONSTRAINT IF EXISTS del_time_order,
  ADD  CONSTRAINT del_time_order
  CHECK (ends_at IS NULL OR starts_at < ends_at);

ALTER TABLE delegations
  DROP CONSTRAINT IF EXISTS del_grantor_ne_grantee,
  ADD  CONSTRAINT del_grantor_ne
